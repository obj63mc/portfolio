#!/usr/bin/env python3
"""The café's measured mattes, traced from the installed 4x master's own pixels (2026-10-01).

  uv run --with pillow --with numpy --with opencv-python-headless python3 art/sources/bread-co-fix/rounds/mattes.py [--preview <dir>] [--manifest] [--scene]

Each cut-out is a list of parts, in 4x px of art/generated/bread-co/bread-co-master/image.webp (6688 x 3764):
  key   a loose polygon round the object and seed points on what stands behind it (carpet, its shadow, tile, wall, the
        table top): a pixel inside the loose polygon is the object's unless its colour is within `tol` (CIE Lab) of a seed's,
        or of a `ramp` between two seeds (a cast shadow), or of an `edge` seed in a region joined to the polygon's border.
        `pick` keeps only the parts those points stand on.
        Holes larger than `hole` px (60: pinholes only) stay holes (the floor between a chair's legs); `solid` fills them all
        (a laptop's screen). A speck under 3000 px is dropped.
  poly  a hand-measured polygon, where colour cannot tell the object from what is behind it (the stand's clear frame,
        the counter against the back shelves).
The parts' masks are joined into ONE polygon, as a registration mask must be: holes and separate parts are joined to
the outer contour by zero-width slits. --preview writes each cut-out over a checkerboard and its polygon over the plate.
--manifest writes the cut-outs' entries into art/manifest.json (registration rect, mask and size, 1:1 with the 4x master).
--scene prints each walk-behind unit's convex hull in world px, for src/lib/scenes/bread-co.ts.
"""
import json, os, sys
import numpy as np
import cv2

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
MASTER = f'{ROOT}/art/generated/bread-co/bread-co-master/image.webp'
WORLD = (2845, 1600)  # the scene; the 6688 x 3764 master is not quite its shape, so x and y scale apart (0.42539 and 0.42508)
PROMPT = ('Extract the original object pixels from the approved composition using the measured crop matte. Preserve the composition '
          'coordinate system and all interior color pixels. The matte is normalized to the registration crop; no image-generation call '
          'is needed for this derivative.')

# What stands behind the furniture: seed points, 4x px, each read back with --seeds before it was trusted. The carpet is
# (137, 144, 106), the shadow the furniture casts on it (111, 121, 87), 24 apart in Lab, so at tol 14 the two keys overlap
# along the shadow's soft edge; the checkerboard's tan is (222, 184, 140) and its cream (252, 226, 186). The upscale's pale
# fringe beside a leg is within 11 of the carpet, so it goes with the floor.
CARPET = [(2700, 3000), (600, 3400), (5400, 3300), (2600, 2700),   # carpet
          (3300, 3660), (4700, 3640), (3500, 3600)]                # the shadow under a table set
# A chair seat's highlight and the clipboard's paper are the tile's colours too, so tile is keyed out only where it is
# joined to the loose polygon's edge (the strip runs along its top), never as an island inside the furniture.
TILE = [(2600, 2330), (3050, 2290), (900, 2330), (2450, 2390),     # tan
        (2200, 2330), (2900, 2420), (1250, 2290)]                  # cream

# The laptop table's top, where the usability test is laid out. Behind the laptop, the cup, the clipboard and the pencil
# are the carpet and tile (above the table's far edge), the table's own wood, (203, 127, 70), its dark rim, and the
# shadows the four cast on the wood: a ramp from the wood to (150, 92, 43) at a shadow's core, keyed as a line in Lab
# (and a quarter past its dark end), so a shadow stays on the table and a glow follows the object alone. Each seed was
# read back as a flat patch before it was used.
WOOD, SHADE, RIM = (3560, 2900), (4262, 2718), [(4000, 3010), (3600, 2975)]
TABLETOP = {'loose': [(3400, 2340), (4690, 2340), (4690, 3010), (3400, 3010)], 'seeds': CARPET + RIM + [(4580, 2769), (3500, 2774), (4199, 2968)],
            'ramp': [(WOOD, SHADE, 1.25)], 'edge': TILE, 'tol': 12, 'solid': True}

# Behind the ATM: the yellow back wall, (246, 184, 71), the baseboard's two browns either side of it and the tile it stands on.
ATM_BG = [(1250, 1128), (992, 1500), (1492, 1500), (992, 2085), (1492, 2085), (1100, 2222), (1400, 2224), (1492, 2176)]

CUTS = {
    # The ATM: every colour of it is a grey, a teal or the screen's cyan, none near the wall's, so a plain key, made solid.
    # Its right side is one upright edge at x 1471 (pixel profiles at seven heights): what the key leaves right of it, the
    # baseboard's darker end and a pale band on the wall above it, is cut away by hand; opening by 5 px drops the upscale's
    # light fringe under its foot.
    'bread-co-atm': {'kind': 'prop', 'parts': [{'loose': [(985, 1125), (1500, 1125), (1500, 2230), (985, 2230)], 'seeds': ATM_BG, 'tol': 12, 'solid': True, 'open': 5,
                                                'minus': [[(1473, 1125), (1501, 1125), (1501, 2231), (1473, 2231)]]}]},
    # The scan-to-pay stand: its clear frame shows the shelves behind it, so its outline is by hand, each edge found on a
    # pixel profile (frame x 4057 to 4359, top 1271, the base's lip down to 1656 and out to 4047 and 4368).
    'bread-co-venmo-stand': {'kind': 'prop', 'parts': [{'poly': [
        (4057, 1271), (4360, 1271), (4360, 1638), (4368, 1644), (4368, 1656), (4072, 1657), (4055, 1650), (4047, 1645), (4047, 1639), (4057, 1637)]}]},
    # The ux-laptop prop, four cut-outs drawn as one layer (Prop.art): each a single contour, so no slit runs between them.
    'bread-co-ux-laptop': {'kind': 'prop', 'parts': [{**TABLETOP, 'pick': [(3700, 2560), (3800, 2817)]}]},
    # The cup and saucer, solid: the carpet seen through the handle goes with it, since a hole there would need a slit
    # across the handle. Opened by 5 px, which drops the nubs of shadow edge the ramp leaves on the saucer's rim; the
    # sliver of the table's far edge caught in the notch between the handle's foot and the saucer is cut away by hand.
    'bread-co-ux-cup': {'kind': 'prop', 'parts': [{**TABLETOP, 'pick': [(4169, 2648)], 'open': 5,
                                                   'minus': [[(4261, 2662), (4300, 2662), (4300, 2671), (4261, 2671)]]}]},
    # The clipboard by hand: its slate board and the shadow under it are too close in tone for a key (the keyed matte kept
    # a fringe of shadow along two edges). Read off 4x crops gridded every 20 px, then trimmed of any bare wood inside it.
    'bread-co-ux-clipboard': {'kind': 'prop', 'parts': [{'poly': [
        (4052, 2926), (4058, 2916), (4140, 2828), (4212, 2757), (4222, 2750), (4280, 2756), (4289, 2747), (4330, 2751), (4338, 2740), (4360, 2734),
        (4374, 2738), (4378, 2748), (4374, 2757), (4410, 2763), (4412, 2771), (4487, 2781), (4495, 2786), (4496, 2794), (4463, 2853), (4428, 2902),
        (4380, 2957), (4368, 2969), (4357, 2971), (4327, 2970), (4180, 2954), (4060, 2939), (4053, 2933)], 'trim': [WOOD, (4580, 2769)], 'solid': True}]},
    # The pencil beside the clipboard is not cut out: its dark tip and cap run into its own shadow, and the keyed matte lost
    # both ends. It stays painted on the table, in the plate and in the table's matte.
    # The order counter with what stands on it: the pastry case, the register and the scan-to-pay stand. Walk-behind
    # scenery, the venmo-stand prop's unit. By hand: its top runs against the racks, oven and back counter, whose frames are
    # its own near-black. Every straight edge is from pixel profiles (22 columns, 16 rows): the body's left edge x 1614, the
    # slab from 1605 to the booth's end panel at 4896, which stands in front of the counter's right end, the kick's foot
    # from y 2244 at x 1800 down to 2280 at x 4500 and up its angled ends; the case's corners and the register are read
    # off crops gridded every 20 px, to about 3 px.
    'bread-co-counter': {'kind': 'scenery', 'parts': [{'poly': [
        (1605, 1622), (1670, 1620), (1670, 1424), (1700, 1361), (1716, 1318), (1762, 1290), (1765, 1267),          # the case's sloped left glass
        (2400, 1277), (3300, 1290), (3452, 1292), (3476, 1312), (3487, 1345), (3487, 1630),                        # its top bar and curved right end
        (3556, 1622), (3560, 1575), (3580, 1556), (3600, 1548), (3610, 1519), (3671, 1362), (3983, 1366), (3997, 1378),  # the register: base, then screen
        (3933, 1528), (3940, 1560), (3977, 1575), (3977, 1622), (3990, 1622), (4047, 1639),
        (4057, 1637), (4057, 1271), (4360, 1271), (4360, 1626),                                                   # the stand
        (4500, 1626), (4700, 1629), (4850, 1650), (4896, 1650), (4893, 1900), (4890, 2150),                        # the slab's back edge, the booth's panel
        (4858, 2200), (4780, 2240), (4716, 2262), (4675, 2275), (4560, 2281), (4500, 2280), (4200, 2277), (3990, 2271), (3800, 2268),
        (3440, 2263), (3000, 2258), (2400, 2250), (1900, 2245), (1800, 2244), (1758, 2241), (1700, 2219), (1640, 2192), (1631, 2187),
        (1631, 2131), (1614, 2124), (1614, 1680), (1605, 1668)]}]},
    # The left café table, its two chairs and the sprig on it: walk-behind scenery.
    'bread-co-table-left': {'kind': 'scenery', 'parts': [
        {'loose': [(790, 2290), (2410, 2290), (2410, 3300), (790, 3300)], 'seeds': CARPET, 'edge': TILE, 'tol': 14},
        # The sprig's pot is the tile's own cream, and its rim stands against the tile: by hand, up into the soil's green.
        {'poly': [(1553, 2456), (1562, 2442), (1662, 2442), (1670, 2456), (1668, 2540), (1650, 2552), (1610, 2558), (1562, 2550), (1557, 2540)]}]},
    # The laptop table and its two chairs, with what stands on it: walk-behind scenery, the ux-laptop prop's unit.
    'bread-co-table-laptop': {'kind': 'scenery', 'parts': [
        {'loose': [(2910, 2350), (5180, 2350), (5180, 3720), (2910, 3720)], 'seeds': CARPET, 'edge': TILE, 'tol': 14}]},
}


def patch(lab, p, r=4):
    x, y = p
    return np.median(lab[y - r:y + r + 1, x - r:x + r + 1].reshape(-1, 3), axis=0)


def near(sub, lab, seeds, tol):
    out = np.zeros(sub.shape[:2], bool)
    for s in seeds: out |= np.linalg.norm(sub - patch(lab, s).astype(np.float32), axis=2) < tol
    return out


def keyed(lab, loose, seeds, tol, hole=60, solid=False, grain=3000, edge=(), ramp=(), pick=()):
    h, w = lab.shape[:2]
    inside = np.zeros((h, w), np.uint8); cv2.fillPoly(inside, [np.array(loose, np.int32)], 1)
    x0, y0, bw, bh = cv2.boundingRect(np.array(loose, np.int32))
    sub = lab[y0:y0 + bh, x0:x0 + bw].astype(np.float32)
    bg = near(sub, lab, seeds, tol)
    for pa, pb, reach in ramp:  # a shadow on a flat surface: any colour on the line from the surface's to the shadow's
        A, B = patch(lab, pa).astype(np.float32), patch(lab, pb).astype(np.float32); d = B - A
        t = np.clip(((sub - A) * d).sum(2) / float((d * d).sum()), 0, reach)
        bg |= np.linalg.norm(sub - (A + t[..., None] * d), axis=2) < tol
    if edge:  # these colours are background only in a region that reaches the box's border
        e = (near(sub, lab, edge, tol) | bg).astype(np.uint8)
        n, lbl = cv2.connectedComponents(e, connectivity=4)
        border = set(lbl[0]) | set(lbl[-1]) | set(lbl[:, 0]) | set(lbl[:, -1])
        bg |= np.isin(lbl, [i for i in border if i]) & (e > 0)
    obj = (inside[y0:y0 + bh, x0:x0 + bw] > 0) & ~bg
    obj = cv2.morphologyEx(obj.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lbl, st, _ = cv2.connectedComponentsWithStats(obj, connectivity=8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < grain: obj[lbl == i] = 0
    if pick:  # only the parts these points stand on
        n, lbl = cv2.connectedComponents(obj, connectivity=8); keep = {int(lbl[y - y0, x - x0]) for x, y in pick}
        assert 0 not in keep, f'a pick point is not on an object: {[(q, int(lbl[q[1] - y0, q[0] - x0])) for q in pick]}'
        obj = np.isin(lbl, list(keep)).astype(np.uint8)
    inv = (1 - obj).astype(np.uint8)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    for i in range(1, n):  # a hole is a background component that does not touch the box's border
        x, y, ww, hh, area = st[i]
        if x > 0 and y > 0 and x + ww < bw and y + hh < bh and (solid or area < hole): obj[lbl == i] = 1
    out = np.zeros((h, w), np.uint8); out[y0:y0 + bh, x0:x0 + bw] = obj
    return out


def traced(mask, eps=2.0):
    """The mask's outer contours and their holes, simplified, as lists of (x, y)."""
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    outers, holes = [], {}
    for i, c in enumerate(cs):
        if cv2.contourArea(c) < 40: continue
        pts = [tuple(map(int, p[0])) for p in cv2.approxPolyDP(c, eps, True)]
        if len(pts) < 3: continue
        if hier[0][i][3] < 0: outers.append((i, pts))
        else: holes.setdefault(hier[0][i][3], []).append(pts)
    return outers, holes


def area2(p):
    return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))


def spliced(ring, other):
    """`other` joined into `ring` by a zero-width slit between their nearest vertices."""
    a = np.array(ring, np.float64)[:, None, :]; b = np.array(other, np.float64)[None, :, :]
    i, j = np.unravel_index(np.argmin(((a - b) ** 2).sum(2)), (len(ring), len(other)))
    return ring[:i + 1] + other[j:] + other[:j + 1] + ring[i:]


def polygon(mask):
    outers, holes = traced(mask)
    rings = []
    for i, o in sorted(outers, key=lambda t: -abs(area2(t[1]))):
        if area2(o) < 0: o = o[::-1]
        for hpts in holes.get(i, []):
            if area2(hpts) > 0: hpts = hpts[::-1]  # a hole runs the other way round
            o = spliced(o, hpts)
        rings.append(o)
    ring = rings[0]
    for o in rings[1:]: ring = spliced(ring, o)  # a separate part: out along a slit and back
    return ring


def build(img, lab, cut):
    mask = np.zeros(img.shape[:2], np.uint8)
    for part in cut['parts']:
        if 'poly' in part:
            m = np.zeros_like(mask); cv2.fillPoly(m, [np.array(part['poly'], np.int32)], 1)
            if part.get('trim'):  # a hand polygon gives up what is plainly the surface it lies on, then is made whole again
                m &= ~near(lab.astype(np.float32), lab, part['trim'], 8).astype(np.uint8) & 1
                m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
                n, lbl, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
                m = (lbl == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
                if part.get('solid'):
                    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); m = np.zeros_like(m); cv2.fillPoly(m, cs, 1)
            mask |= m
        else:
            m = keyed(lab, part['loose'], part['seeds'], part.get('tol', 14), part.get('hole', 60), part.get('solid', False), part.get('grain', 3000), part.get('edge', ()), part.get('ramp', ()), part.get('pick', ()))
            for cutout in part.get('minus', []): cv2.fillPoly(m, [np.array(cutout, np.int32)], 0)
            if part.get('open'):
                k = part['open']; m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
                n, lbl, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
                m = (lbl == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
            mask |= m
    return mask


def entry(cid, cut, mask, k):
    """Its manifest entry: `k` is (world px per 4x px in x, in y), which differ, as in scripts/art/generate.ts's own crop."""
    kx, ky = k
    ring = polygon(mask)
    xs, ys = [p[0] for p in ring], [p[1] for p in ring]
    x0, y0, x1, y1 = min(xs) - 2, min(ys) - 2, max(xs) + 3, max(ys) + 3
    w, h = x1 - x0, y1 - y0
    rect = {'x': round(x0 * kx, 2), 'y': round(y0 * ky, 2), 'w': round(w * kx, 2), 'h': round(h * ky, 2)}
    # The pipeline cuts the crop at round(world * master px per world px), each axis by its own scale: it must land back on
    # these integers, so the crop is 1:1 with the master and nothing is resampled.
    assert (round(rect['x'] / kx), round(rect['y'] / ky), round(rect['w'] / kx), round(rect['h'] / ky)) == (x0, y0, w, h), cid
    return {'id': cid, 'scene': 'bread-co', 'kind': cut['kind'], 'prompt': PROMPT, 'size': f'{w}x{h}', 'references': [], 'dependsOn': ['bread-co-master'],
            'registration': {'asset': 'bread-co-master', 'rect': rect, 'mask': [[round((x - x0) / w, 4), round((y - y0) / h, 4)] for x, y in ring]},
            'deriveFrom': 'bread-co-master'}, ring, (x0, y0, w, h)


def main():
    img = cv2.imread(MASTER); assert img is not None and img.shape[1] == 6688, MASTER
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB); k = (WORLD[0] / img.shape[1], WORLD[1] / img.shape[0])
    only = [a for a in sys.argv[1:] if not a.startswith('--') and a in CUTS]
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    if '--seeds' in sys.argv:  # where every seed sits and the colour it reads: look before trusting a key
        out = sys.argv[sys.argv.index('--seeds') + 1]; small = cv2.resize(img, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA)
        for i, sd in enumerate(FLOOR):
            L, A, B = patch(lab, sd); b, g, r = img[sd[1], sd[0]]
            spread = float(np.abs(lab[sd[1] - 4:sd[1] + 5, sd[0] - 4:sd[0] + 5].reshape(-1, 3).astype(np.float32) - [L, A, B]).max())
            print(f'seed {i} {sd}: rgb ({r},{g},{b}) lab ({L:.0f},{A:.0f},{B:.0f}) patch spread {spread:.0f}')
            c = (sd[0] // 4, sd[1] // 4); cv2.circle(small, c, 7, (255, 0, 255), 2); cv2.putText(small, str(i), (c[0] + 9, c[1] + 5), cv2.FONT_HERSHEY_SIMPLEX, .5, (255, 0, 255), 1)
        cv2.imwrite(out, small[520:941]); return
    entries = []
    for cid, cut in CUTS.items():
        if only and cid not in only: continue
        mask = build(img, lab, cut); e, ring, (x0, y0, w, h) = entry(cid, cut, mask, k); entries.append(e)
        # What the pipeline will cut: the polygon, filled. Its difference from the traced mask is the simplification's error.
        poly = np.zeros_like(mask); cv2.fillPoly(poly, [np.array(ring, np.int32)], 1)
        outers, holes = traced(mask); odd = []
        for v in holes.values():
            for hp in v:
                hm = np.zeros_like(mask); cv2.fillPoly(hm, [np.array(hp, np.int32)], 1); hm = cv2.erode(hm, np.ones((5, 5), np.uint8)) if hm.sum() > 400 else hm
                col = np.median(lab[hm > 0].reshape(-1, 3), axis=0).astype(np.float32)
                if min(np.linalg.norm(col - patch(lab, sd)) for sd in CARPET) > 16: odd.append((int(np.mean([q[0] for q in hp])), int(np.mean([q[1] for q in hp])), col.astype(int).tolist()))
        print(f"  {len(outers)} part(s), {sum(len(v) for v in holes.values())} hole(s)" + (f"; NOT FLOOR-COLOURED: {odd}" if odd else ", every one the floor's colour"))
        if cut['kind'] == 'scenery': assert not odd, f'{cid}: a hole in the matte is not floor'
        print(f"{cid}: {cut['kind']}, {len(ring)} points, crop {w}x{h} at ({x0},{y0}) 4x px, world {e['registration']['rect']}, "
              f"mask {int(mask.sum())} px, polygon differs by {int((poly != mask).sum())} px")
        if preview:
            os.makedirs(preview, exist_ok=True); pad = 30
            X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(img.shape[1], x0 + w + pad), min(img.shape[0], y0 + h + pad)
            crop = img[Y0:Y1, X0:X1]; m = poly[Y0:Y1, X0:X1].astype(bool)
            yy, xx = np.mgrid[Y0:Y1, X0:X1]; dark = ((xx // 24 + yy // 24) % 2 == 0)[..., None]
            check = np.where(dark, np.array([40, 0, 40], np.uint8), np.array([200, 0, 200], np.uint8)).astype(np.uint8)  # magenta: nothing in the room
            cv2.imwrite(f'{preview}/{cid}-checker.png', np.where(m[..., None], crop, check))
            over = crop.copy(); cv2.polylines(over, [np.array(ring, np.int32) - [X0, Y0]], True, (255, 0, 255), 2)
            cv2.imwrite(f'{preview}/{cid}-outline.png', over)
        if '--scene' in sys.argv and cut['kind'] == 'scenery':
            # A table set's outline is its convex hull, so a cursor keeps its side until it steps off the whole piece; the
            # counter's is its own polygon, as the Side Project bar's counters are.
            pts = np.array(ring, np.int32); out = cv2.approxPolyDP(pts if cid == 'bread-co-counter' else cv2.convexHull(pts), 10 if cid == 'bread-co-counter' else 6, True)
            print('  outline, world px:', ', '.join(f'{{ x: {round(q[0][0] * k[0])}, y: {round(q[0][1] * k[1])} }}' for q in out))
    if '--manifest' in sys.argv:
        path = f'{ROOT}/art/manifest.json'; m = json.load(open(path)); ids = {e['id'] for e in entries}
        at = next(i for i, a in enumerate(m['assets']) if a['id'] == 'bread-co-master')
        m['assets'] = [a for a in m['assets'][:at] if a['id'] not in ids] + entries + [a for a in m['assets'][at:] if a['id'] not in ids]
        open(path, 'w').write(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
        print(f'manifest: {len(entries)} cut-outs written before bread-co-master')


if __name__ == '__main__':
    main()
