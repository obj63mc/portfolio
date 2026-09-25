#!/usr/bin/env python3
"""Exact tile map for fixing the overworld master.

  python3 tiles.py slice    cut base.png into square tiles (tiles/t-<name>.png), the same tiles of marked.png,
                            a repaint mask per tile filled from the red loops (white = repaint) and a prompt per tile
  python3 tiles.py stitch   paste every tiles/t-<name>-model.png back with ImageMagick, only inside its mask, onto the
                            round's base into stitched.png, prove every pixel outside the masks is unchanged, and refresh
                            every tiles/t-<name>-out.png as that tile cut from stitched.png (mark the next round on those)
  python3 tiles.py detect-master <png>   find the red loops drawn on a copy of the whole stitched master (any size)
  python3 tiles.py detect <git-ref>      find the red loops drawn since <git-ref> on tiles/*-out.png and *-marked.png,
                            fill each one and save it in master pixels under rounds/detected/ (see rounds/detected.json)
  python3 tiles.py check    after a stitch: every footpath or road of the round's base that reaches a repaint boundary
                            must continue inside it in the result; prints each dead end (a road cut or stepped at a
                            boundary) so the mask can be widened to a junction, the tile enlarged, or the tile rerun
  python3 tiles.py prepare rounds/round-N.json   cut this round's tiles from its base (the previous stitched.png), build
                            each tile's mask from the assigned loops, extra rectangles and the lake band, draw the mask
                            outline in red as the tile's -marked.png, and write its prompt

Every pixel operation is ImageMagick; this file only decides rectangles and writes masks. No model touches the stitch.
"""
import json, os, shutil, subprocess, sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); T = f'{D}/tiles'
BASE, MARKED = f'{D}/base.png', f'{D}/marked.png'
def magick(*args): subprocess.run(['magick', '-define', 'png:exclude-chunks=date,time', *[str(a) for a in args]], check=True)  # no timestamps: a re-slice is byte-identical

# Square 512 windows: columns at 0, 500, 1000, 1471 and rows at 0, 281 cover 1983 x 793 with small overlaps so
# every marked defect fits inside one tile with margin. The lake loop needs the whole lake, so it gets one 3:2 tile.
TILES = [
 {'name': 'c0r0', 'rect': [0, 0, 512, 512],      'loops': [0, 1, 2, 3]},
 {'name': 'c0r1', 'rect': [0, 281, 512, 512],    'loops': []},
 {'name': 'c1r0', 'rect': [500, 0, 512, 512],    'loops': [4], 'extra': [[575, 245, 725, 320]]},
 {'name': 'c1r1', 'rect': [500, 281, 512, 512],  'loops': [5, 6]},
 {'name': 'c2r0', 'rect': [1000, 0, 512, 512],   'loops': [8, 9], 'extra': [[1100, 30, 1200, 112]]},  # the Ferris wheel's lower half sits outside the loop
 {'name': 'c2r1', 'rect': [1000, 281, 512, 512], 'loops': [7]},
 {'name': 'c3r0', 'rect': [1471, 0, 512, 512],   'loops': [10, 12, 13, 15]},
 {'name': 'c3r1', 'rect': [1471, 281, 512, 512], 'loops': [11, 14]},
 {'name': 'lake', 'rect': [250, 281, 768, 512],  'loops': [], 'band': 'lake'},
]
PRE = ("Edit this tile of a flat-colour isometric illustrated city map. Repaint ONLY the transparent (masked) areas; every other pixel "
       "stays exactly as in the input, same framing, scale, camera, palette and line weight. Image 2 is the same tile with the defects "
       "circled in red by the art director, for reference only: never draw red marks. Do not add signs or lettering. Where something is "
       "removed, continue the surrounding lawn, footpath, road or water so it matches the neighbouring pixels. Objects cut by the tile edge "
       "stay cut, the tile is part of a larger image.\n")
FIXES = {
 'c0r0': ["Far-left loop at the image edge: a blurred, broken tree. Remove it; plain lawn.",
          "Loop around the MAPLEWOOD sign: keep the sign board, lettering and posts crisp. A building is smeared into the sign's lower right; remove that building entirely, lawn and the cream path beneath.",
          "Loop above the storefront row: a tree cut into a bush. Remove the tree completely; lawn and the footpath continue through.",
          "Loop right of the sign, left of the church steps: a small house. Remove it; lawn, keep the paths."],
 'c1r0': ["Loop around the CENTRAL WEST END sign: redraw the sign board crisply, a clean brown board with white lettering and two dark posts, including its left end which is currently blurred. Remove the translucent ghost structure (a faint glass building) below and left of the sign, over its whole footprint; lawn and the existing paths."],
 'c1r1': ["Upper loop, south of the church steps: a cut-off tree stands in front of a small brick house. Delete the tree entirely: no tree, bush or shadow remains anywhere in this loop, only lawn, the footpath and the house drawn whole.",
          "Lower loop, north of the lake and south of the big factory: the cluster of trees is blurred and cut. Remove every cut or blurred tree; keep at most two whole, crisp trees on plain lawn."],
 'c2r0': ["Small loop near the top: the Ferris wheel. Remove it; a plain mid-rise brick building or trees in the same skyline row.",
          "Loop at the west end of the steel arch bridge: the bridge deck floats above the buildings and does not reach the land, a boat is cut off and the buildings are jumbled. Redraw so the bridge's west end rests on a stone abutment on the riverbank and the deck continues as a street between whole brick warehouses; remove the cut-off boat; keep the riverbank line where it is."],
 'c2r1': ["Loop around the ballpark: redraw the stadium as one solid oval with a complete outer brick wall on every side; its north (back) wall currently dissolves into a tree. No tree overlaps it; lawn around it.",
          "Loop on the riverbank east of the stadium: the trees are cut off and the shoreline is jagged. Remove the cut trees; a clean smooth riverbank with lawn and at most two whole trees set back from the water.",
          "Large loop south of the stadium down to the riverfront: too many factories and shops. Keep the tall brick brewery with its chimney and about half of the buildings, spaced apart on lawn; remove the rest, especially anything cut off or overlapping. Keep the cream roads and the picnic table."],
 'c3r0': ["Loop above the bridge on the far bank: a rectangular notch of water bites into the land. Fill it so the far bank's lawn and shoreline continue smoothly; keep the grain elevator.",
          "Two loops on the bridge's east half: building fragments are cut into the deck and trusses. Remove them; the deck, railings, steel arches and stone piers continue unbroken to the far bank.",
          "Tall loop below the bridge, left of the river, east of the Arch: this strip of riverbank is cut off and leads nowhere. Redraw it as one continuous bank: the lawn joins the Arch grounds and the cream riverfront walk runs the full height of the loop along the water's edge, continuing out of the loop at the top and the bottom without a hard cut."],
 'c3r1': ["Tall loop at the right edge, east of the large brick office building: cut-off buildings and churches. Remove them all; lawn, a few whole small houses and trees in the same style as the rest of the town.",
          "Small loop on the riverbank, north-west of that building, below the bridge: the shoreline has a stepped cut. Smooth the bank so lawn, shore path and water's edge run continuously from the bridge pier down to the wharf."],
 'lake': ["The masked band is the shore zone around the lake. Draw one continuous cream footpath running all the way around the lake, a constant short distance from the shore, joining the existing segments (the bottom straight, the west side by the small shop, the east side by the pavilion) into a single closed loop with no gaps, the same width and colour as the other footpaths. It passes behind the CARONDELET PARK sign and in front of the pavilion. Remove any tree or shrub standing on the path line. Keep the sign, the pavilion, the pier, benches, picnic tables, the island and every building exactly as they are."],
}

def loop_fill(stroke, k):
    """Fill the interior of every closed red loop in a stroke image (L, already dilated by k)."""
    W, H = stroke.size; sp = stroke.load(); seen = set(); out = []
    for y in range(H):
        for x in range(W):
            if sp[x, y] and (x, y) not in seen:
                q = deque([(x, y)]); seen.add((x, y)); c = []
                while q:
                    cx, cy = q.popleft(); c.append((cx, cy))
                    for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= n[0] < W and 0 <= n[1] < H and sp[n] and n not in seen: seen.add(n); q.append(n)
                if len(c) > 300: out.append(c)
    fills = []
    for c in out:
        xs = [p[0] for p in c]; ys = [p[1] for p in c]
        x0, y0, x1, y1 = max(0, min(xs) - 2), max(0, min(ys) - 2), min(W - 1, max(xs) + 2), min(H - 1, max(ys) + 2)
        edge = (min(xs) <= 0, max(xs) >= W - 1, min(ys) <= 0, max(ys) >= H - 1)
        wall = lambda x, y: sp[x, y] != 0 or (edge[0] and x == 0) or (edge[1] and x == W - 1) or (edge[2] and y == 0) or (edge[3] and y == H - 1)
        outside = set(); q = deque()
        for x in range(x0, x1 + 1):
            for y in (y0, y1):
                if not wall(x, y): outside.add((x, y)); q.append((x, y))
        for y in range(y0, y1 + 1):
            for x in (x0, x1):
                if not wall(x, y): outside.add((x, y)); q.append((x, y))
        while q:
            x, y = q.popleft()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if x0 <= n[0] <= x1 and y0 <= n[1] <= y1 and not wall(*n) and n not in outside: outside.add(n); q.append(n)
        f = Image.new('L', (W, H), 0); fp = f.load()
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if (x, y) not in outside: fp[x, y] = 255
        fills.append(f.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k + 4)))  # stroke centre, then 2 px past it
    return fills

def red_strokes(now, prev):
    """Pixels of `now` that are pure red and differ from `prev` (an earlier version of the same image)."""
    W, H = now.size; a, b = now.load(), prev.load(); st = Image.new('L', (W, H), 0); sp = st.load()
    for y in range(H):
        for x in range(W):
            r, g, bl = a[x, y]
            if r > 170 and g < 110 and bl < 110 and r - g > 90 and sum(abs(p - q) for p, q in zip(a[x, y], b[x, y])) > 120: sp[x, y] = 255
    return st

LAWN = lambda c: c[0] > 140 and c[1] > c[0] + 10 and c[1] > c[2] + 90
LAWN_DEEP = lambda c: c[0] > 105 and c[1] > c[0] + 10 and c[1] > c[2] + 60  # lawn including its shaded patches
PATH = lambda c: c[0] > 195 and c[1] > 180 and c[2] > 120 and c[0] > c[2] + 40
GREY = lambda c: abs(c[0] - c[1]) < 22 and abs(c[1] - c[2]) < 28 and c[0] > 110
WATER = lambda c: c[2] > 150 and c[1] > 150 and c[0] < 130
HARD = lambda c: PATH(c) or GREY(c) or WATER(c)  # footpath, road, water: never lawn, never tree

def clone_fill(img, rep, box, rows, cell=28):
    """Refill the pixels of `rep` (L mask) with real lawn, cloned by translation. The region is worked in `cell` px
    cells; each cell takes the translation whose source is (almost) all untouched lawn and whose colours match best
    along the cell's border, then the cell is tone-shifted to the lawn beside it, so the lawn's own gradient and
    grain carry through without a tonal step. A cell with no usable translation gets the row's lawn colour."""
    W, H = img.size; src = img.copy(); sp = src.load(); rp = rep.load(); x0, y0, x1, y1 = box
    pts_all = [(x, y) for y in range(max(0, y0), min(H, y1)) for x in range(max(0, x0), min(W, x1)) if rp[x, y]]
    if not pts_all: return
    fill = img.copy(); fp = fill.load(); cloned = 0; flat = 0
    cells = {}
    for p_ in pts_all: cells.setdefault((p_[0] // cell, p_[1] // cell), []).append(p_)
    for key, pts in cells.items():
        border = [(x, y) for (x, y) in pts if any(0 <= x + dx < W and 0 <= y + dy < H and not rp[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        ring = [(x + dx, y + dy) for (x, y) in border for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)) if 0 <= x + dx < W and 0 <= y + dy < H and not rp[x + dx, y + dy] and LAWN_DEEP(sp[x + dx, y + dy])]
        if not ring:  # an interior cell: borrow the ring of the whole region nearby
            cx, cy = key[0] * cell + cell // 2, key[1] * cell + cell // 2
            ring = [(x, y) for y in range(max(0, cy - 60), min(H, cy + 60), 3) for x in range(max(0, cx - 60), min(W, cx + 60), 3) if not rp[x, y] and LAWN_DEEP(sp[x, y])]
        best = None; sample = pts[::3]
        for dy in range(-120, 121, 2):
            for dx in range(-120, 121, 2):
                if abs(dx) < 4 and abs(dy) < 4: continue
                bad = 0; lim = max(1, len(sample) // 50)
                for (x, y) in sample:
                    sx, sy = x + dx, y + dy
                    if not (0 <= sx < W and 0 <= sy < H) or rp[sx, sy] or not LAWN_DEEP(sp[sx, sy]):
                        bad += 1
                        if bad > lim: break
                if bad > lim: continue
                err = 0; cnt = 0
                for (x, y) in ring[::2]:
                    sx, sy = x + dx, y + dy
                    if 0 <= sx < W and 0 <= sy < H and LAWN_DEEP(sp[sx, sy]): err += sum(abs(a_ - b_) for a_, b_ in zip(sp[x, y], sp[sx, sy])); cnt += 1
                if cnt and (best is None or err / cnt < best[0]): best = (err / cnt, dx, dy)
        if best is None:
            for (x, y) in pts:
                if y in rows: fp[x, y] = rows[y]; flat += 1
            continue
        _, dx, dy = best; vals = []
        for (x, y) in pts:
            sx, sy = x + dx, y + dy
            if 0 <= sx < W and 0 <= sy < H and not rp[sx, sy] and LAWN_DEEP(sp[sx, sy]): fp[x, y] = sp[sx, sy]; vals.append(fp[x, y])
            elif y in rows: fp[x, y] = rows[y]
        if ring and vals:
            rm = [sum(sp[p_][i] for p_ in ring) / len(ring) for i in range(3)]; bm = [sum(v[i] for v in vals) / len(vals) for i in range(3)]
            shift = [max(-25, min(25, rm[i] - bm[i])) for i in range(3)]
            for (x, y) in pts: fp[x, y] = tuple(max(0, min(255, int(round(fp[x, y][i] + shift[i])))) for i in range(3))
        cloned += len(pts)
    img.paste(fill, (0, 0), rep.filter(ImageFilter.GaussianBlur(1.0))); print(f'   refill: cloned lawn in {len(cells)} cells ({cloned} px), flat {flat} px')

def propagate_fill(img, rep, box, rows):
    W, H = img.size; px = img.load(); x0, y0, x1, y1 = box
    pad = 40; bx = (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))
    crop = img.crop(bx); rc = rep.crop(bx); cw, ch = crop.size; cp, rcp = crop.load(), rc.load()
    keep = Image.new('L', (cw, ch), 0); kp = keep.load()
    for y in range(ch):
        for x in range(cw):
            if not rcp[x, y] and LAWN_DEEP(cp[x, y]): kp[x, y] = 255
    prem = Image.composite(crop, Image.new('RGB', (cw, ch), (0, 0, 0)), keep); pp = prem.load()
    fill = crop.copy(); fp = fill.load(); todo = {(x, y) for y in range(ch) for x in range(cw) if rcp[x, y]}
    for _ in range(40):
        pb = prem.filter(ImageFilter.GaussianBlur(5)).load(); kb = keep.filter(ImageFilter.GaussianBlur(5)).load(); done = []
        for x, y in todo:
            k = kb[x, y]
            if k > 60:
                c = tuple(min(255, int(round(v * 255 / k))) for v in pb[x, y]); fp[x, y] = c; done.append((x, y, c))
        if not done: break
        for x, y, c in done: todo.discard((x, y)); pp[x, y] = c; kp[x, y] = 255
    for x, y in todo:
        if y + bx[1] in rows: fp[x, y] = rows[y + bx[1]]
    img.paste(fill, bx, rc.filter(ImageFilter.GaussianBlur(1.5)))

def lawn_fill(img, loop, reach=24, min_px=8, ghost=None, force=False, ghost_only=False):
    """Delete the tree(s) inside one loop. Every tree-like pixel inside the loop goes (not lawn, footpath, road or water;
    with `ghost` set, also lawn-like pixels that far from the loop's surrounding lawn colour and not next to a footpath,
    road or water: the ghost of a half-transparent tree), in blobs of at least `min_px`. A strict-tree blob that reaches
    out of the loop goes whole when it lies mostly inside the loop grown by 8 px (trunks, shadows), up to `reach` px out;
    a neighbouring tree that merely overlaps the loop is cut at the loop's edge and otherwise left alone. The replaced
    pixels take a normalized blur of the untouched lawn around them, so the local shading carries through.
    Returns the mask of replaced pixels."""
    W, H = img.size; px = img.load(); lp = loop.load(); b = loop.getbbox()
    rep = Image.new('L', (W, H), 0); rp = rep.load()
    if not b: return rep
    x0, y0, x1, y1 = max(0, b[0] - reach), max(0, b[1] - reach), min(W, b[2] + reach), min(H, b[3] + reach)
    rows = {}
    for y in range(y0, y1):
        s_ = sorted((px[x, y] for x in range(max(0, x0 - 150), min(W, x1 + 150)) if not lp[x, y] and LAWN(px[x, y])), key=sum)
        if s_: rows[y] = s_[len(s_) // 2]
    hard = Image.new('L', (W, H), 0); hp = hard.load()
    for y in range(max(0, y0 - 3), min(H, y1 + 3)):
        for x in range(max(0, x0 - 3), min(W, x1 + 3)):
            if HARD(px[x, y]): hp[x, y] = 255
    nearhard = hard.filter(ImageFilter.MaxFilter(5)).load()
    strict = lambda x, y: not HARD(px[x, y]) and not LAWN_DEEP(px[x, y])  # canopy and trunk, not shaded lawn
    def inside_class(x, y):  # 2: tree-like (any dark pixel), 1: ghost (lawn-like but far from the surrounding lawn), 0: keep
        c = px[x, y]
        if force: return 0 if WATER(c) else 2  # a forced loop: everything but water is refilled as lawn
        if HARD(c): return 0
        if not LAWN(c): return 2
        return 1 if ghost is not None and not nearhard[x, y] and y in rows and sum(abs(c[i] - rows[y][i]) for i in range(3)) > ghost else 0
    def blobs(test, window):
        wx0, wy0, wx1, wy1 = window; seen = set()
        for y in range(wy0, wy1):
            for x in range(wx0, wx1):
                if (x, y) in seen or not test(x, y): continue
                q = deque([(x, y)]); seen.add((x, y)); blob = []
                while q:
                    cx, cy = q.popleft(); blob.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if wx0 <= nx < wx1 and wy0 <= ny < wy1 and (nx, ny) not in seen and test(nx, ny): seen.add((nx, ny)); q.append((nx, ny))
                yield blob
    n = 0
    for cls in ((1,) if ghost_only else (1, 2)):  # ghost and tree blobs never merge, so a ghost beside a neighbouring tree goes alone
        for blob in blobs(lambda x, y: lp[x, y] and inside_class(x, y) == cls, (b[0], b[1], b[2], b[3])):  # inside the loop
            if len(blob) < min_px: continue
            for p_ in blob: rp[p_] = 255
            n += len(blob)
    grown = loop.filter(ImageFilter.MaxFilter(17)).load(); wide = (max(0, b[0] - 80), max(0, b[1] - 80), min(W, b[2] + 80), min(H, b[3] + 80))
    for blob in ([] if ghost_only else blobs(strict, wide)):  # strict-tree blobs seen whole
        inside = sum(1 for p_ in blob if grown[p_])
        if (any(rp[p_] for p_ in blob) or (len(blob) <= 400 and inside)) and inside * 2 >= len(blob):
            for p_ in blob:  # the rest of a tree the loop mostly covers, and small remnants at its edge
                if x0 <= p_[0] < x1 and y0 <= p_[1] < y1 and not rp[p_]: rp[p_] = 255; n += 1
        elif inside and len(blob) > 400:  # a neighbouring tree the loop merely overlaps: give its pixels back, no cut
            for p_ in blob:
                if rp[p_]: rp[p_] = 0; n -= 1
    if not n: print('   lawn fill: nothing tree-like inside the loop'); return rep
    rep = rep.filter(ImageFilter.MaxFilter(5))  # two pixels over the edge: anti-aliased rims and a ghost's halo go too
    if not force: rep.paste(0, (0, 0), hard.filter(ImageFilter.MaxFilter(3)))  # never a footpath, road or water, nor their edge pixels (a forced loop clears everything but lawn)
    rp = rep.load()
    clone_fill(img, rep, (x0, y0, x1, y1), rows)
    print('   lawn fill: replaced', n, 'pixels'); return rep

def check():
    """Dead-end roads: a base path/road pixel in the 3 px ring outside the repaint areas whose road continued inside
    them in the base but does not in the result (within 5 px). Clusters of 4 px or more are printed; a cream wall or
    a shrub's rim can trip the colour test, so read each one at 6x before acting."""
    tm = json.load(open(f'{D}/tilemap.json')); base = Image.open(f"{D}/{tm['base']}").convert('RGB'); out = Image.open(f'{D}/stitched.png').convert('RGB')
    W, H = base.size; union = Image.new('L', (W, H), 0)
    for t in tm['tiles']:
        x, y, w, h = t['rect']; union.paste(255, (x, y), Image.open(f"{T}/t-{t['name']}-mask.png").convert('L'))
    for kind in ('lawnfill', 'ghostfill', 'cleanup'):
        if os.path.exists(f'{T}/{kind}.png'): union.paste(255, (0, 0), Image.open(f'{T}/{kind}.png').convert('L').filter(ImageFilter.MaxFilter(9)))
    up, op = union.load(), union.filter(ImageFilter.MaxFilter(7)).load(); bp, sp = base.load(), out.load()
    def cont(px, x, y):
        return any(up[x + dx, y + dy] and HARD(px[x + dx, y + dy]) for dy in range(-5, 6) for dx in range(-5, 6) if 0 <= x + dx < W and 0 <= y + dy < H)
    bad = {(x, y) for y in range(H) for x in range(W) if op[x, y] and not up[x, y] and HARD(bp[x, y]) and cont(bp, x, y) and not cont(sp, x, y)}
    seen = set(); clusters = []
    for p in sorted(bad):
        if p in seen: continue
        q = deque([p]); seen.add(p); c = []
        while q:
            cx, cy = q.popleft(); c.append((cx, cy))
            for dx in range(-3, 4):
                for dy in range(-3, 4):
                    n = (cx + dx, cy + dy)
                    if n in bad and n not in seen: seen.add(n); q.append(n)
        if len(c) >= 4: clusters.append(c)
    clusters.sort(key=len, reverse=True); print('dead-end road pixels at repaint boundaries:', len(bad), 'in', len(clusters), 'clusters of 4 px or more')
    for c in clusters:
        xs = [p[0] for p in c]; ys = [p[1] for p in c]; print('  ', len(c), 'px at', (min(xs), min(ys), max(xs), max(ys)))
    return clusters

def water_fill(img, loop):
    """Delete whatever stands in the water inside one loop: every non-water pixel becomes the median water colour
    of the loop's surroundings (the water is flat). Returns the mask of replaced pixels."""
    W, H = img.size; px = img.load(); lp = loop.load(); b = loop.getbbox(); rep = Image.new('L', (W, H), 0); rp = rep.load()
    if not b: return rep
    ring = [px[x, y] for y in range(max(0, b[1] - 30), min(H, b[3] + 30)) for x in range(max(0, b[0] - 30), min(W, b[2] + 30)) if not lp[x, y] and WATER(px[x, y])]
    if not ring: print('   water fill: no water around the loop'); return rep
    ring.sort(key=sum); c = ring[len(ring) // 2]; n = 0
    for y in range(b[1], b[3]):
        for x in range(b[0], b[2]):
            if lp[x, y] and not WATER(px[x, y]): rp[x, y] = 255; n += 1
    rep = rep.filter(ImageFilter.MaxFilter(5)); img.paste(Image.new('RGB', (W, H), c), (0, 0), rep.filter(ImageFilter.GaussianBlur(1.0)))
    print('   water fill: replaced', n, 'pixels'); return rep

def shore_fill(img, loop, grow=22, protect=None):
    """Rebuild a single smooth shoreline inside one loop (grown by `grow` px, footpaths excluded). The water region
    is taken from the image and smoothed (4.5 px blur, thresholded); the whole land strip in the loop is relaid as
    cloned lawn; then the rim (2 px, the lake's own sand colour) and the water are painted over it with soft alphas
    from the blurred masks, so both edges are anti-aliased. Returns the mask of replaced pixels."""
    W, H = img.size; px = img.load(); b0 = loop.getbbox(); rep = Image.new('L', (W, H), 0)
    if not b0: return rep
    loop = loop.filter(ImageFilter.MaxFilter(2 * grow + 1))
    if protect: loop.paste(0, (0, 0), protect)
    lp = loop.load(); b = loop.getbbox()
    wx0, wy0, wx1, wy1 = max(0, b[0] - 40), max(0, b[1] - 40), min(W, b[2] + 40), min(H, b[3] + 40)
    water = Image.new('L', (W, H), 0); wp = water.load(); wcol = []
    for y in range(wy0, wy1):
        for x in range(wx0, wx1):
            if WATER(px[x, y]): wp[x, y] = 255; wcol.append(px[x, y])
    if not wcol: print('   shore fill: no water near the loop'); return rep
    wcol.sort(key=sum); wc = wcol[len(wcol) // 2]
    ringc = [px[x, y] for y in range(wy0, wy1) for x in range(wx0, wx1) if not lp[x, y] and PATH(px[x, y]) and any(0 <= x + dx < W and 0 <= y + dy < H and wp[x + dx, y + dy] for dx in (-3, 0, 3) for dy in (-3, 0, 3))]
    ringc.sort(key=sum); rim = ringc[len(ringc) // 2] if ringc else (248, 236, 180)
    core = water.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(4.5)).point(lambda v: 255 if v > 127 else 0)
    soft_w = core.filter(ImageFilter.GaussianBlur(1.0)).load(); soft_r = core.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.0)).load(); cp = core.load()
    rows = {}
    for y in range(b[1], b[3]):
        s_ = sorted((px[x, y] for x in range(max(0, b[0] - 150), min(W, b[2] + 150)) if not lp[x, y] and LAWN(px[x, y])), key=sum)
        if s_: rows[y] = s_[len(s_) // 2]
    land = Image.new('L', (W, H), 0); ldp = land.load(); n = 0
    for y in range(b[1], b[3]):
        for x in range(b[0], b[2]):
            if lp[x, y] and not PATH(px[x, y]) and (not cp[x, y] or soft_r[x, y] < 250): ldp[x, y] = 255; n += 1
    clone_fill(img, land, (b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2), rows); px = img.load()
    out = img.copy(); op = out.load(); touched = Image.new('L', (W, H), 0); tp = touched.load()
    for y in range(b[1], b[3]):
        for x in range(b[0], b[2]):
            if not lp[x, y] or PATH(px[x, y]): continue
            ar = soft_r[x, y] / 255.0; aw = soft_w[x, y] / 255.0
            if ar <= 0.02: continue
            c = px[x, y]; c = tuple(c[i] * (1 - ar) + rim[i] * ar for i in range(3)); c = tuple(int(round(c[i] * (1 - aw) + wc[i] * aw)) for i in range(3))
            op[x, y] = c; tp[x, y] = 255
    img.paste(out, (0, 0), touched); rep.paste(255, (0, 0), touched); rep.paste(255, (0, 0), land)
    print('   shore fill: strip relaid', n, 'px; water', wc, 'rim', rim); return rep

def stamp(img, src, dst, feather=1.0):
    """Clone a tree: copy the non-lawn pixels of the `src` rectangle (x0, y0, x1, y1) onto the same-size rectangle at
    `dst` (x, y of its top left), so a deleted tree can be replaced by a crisp one from elsewhere on the same map."""
    x0, y0, x1, y1 = src; crop = img.crop(src); cp = crop.load(); m = Image.new('L', crop.size, 0); mp = m.load()
    for y in range(crop.height):
        for x in range(crop.width):
            if not LAWN(cp[x, y]) and not PATH(cp[x, y]) and not WATER(cp[x, y]): mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    img.paste(crop, tuple(dst), m.filter(ImageFilter.GaussianBlur(feather)))
    out = Image.new('L', img.size, 0); out.paste(m, tuple(dst)); print('   stamp:', src, '->', dst); return out

def components(mask):
    """Each separate loop of a mask as its own full-size mask."""
    W, H = mask.size; mp = mask.load(); seen = set(); out = []
    for y in range(H):
        for x in range(W):
            if mp[x, y] and (x, y) not in seen:
                q = deque([(x, y)]); seen.add((x, y)); one = Image.new('L', (W, H), 0); op = one.load()
                while q:
                    cx, cy = q.popleft(); op[cx, cy] = 255
                    for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= n[0] < W and 0 <= n[1] < H and mp[n] and n not in seen: seen.add(n); q.append(n)
                out.append(one)
    return out

def detect_master(marked):
    """New loops drawn on a copy of the round's base (stitched.png at full size), saved like detect()."""
    os.makedirs(f'{D}/rounds/detected', exist_ok=True)
    now = Image.open(marked).convert('RGB'); prev = Image.open(f'{D}/stitched.png').convert('RGB')
    if now.size != prev.size: now = now.resize(prev.size, Image.LANCZOS)
    found = []
    for f in loop_fill(red_strokes(now, prev).filter(ImageFilter.MaxFilter(7)), 7):
        i = len(found); f.save(f'{D}/rounds/detected/{i}.png'); b = f.getbbox()
        found.append({'id': i, 'from': os.path.basename(marked), 'bbox': b, 'px': f.histogram()[255]}); print(i, found[-1])
    json.dump(found, open(f'{D}/rounds/detected.json', 'w'), indent=1)

def detect(ref):
    """New loops drawn since git ref on the out and marked tiles, saved as master-size masks."""
    os.makedirs(f'{D}/rounds/detected', exist_ok=True); tiles = {t['name']: t for t in json.load(open(f'{D}/tilemap.json'))}
    found = []
    for name, t in tiles.items():
        for kind in ('out', 'marked'):
            path = f'{T}/t-{name}-{kind}.png'
            if not os.path.exists(path): continue
            r = subprocess.run(['git', 'show', f'{ref}:art/sources/overworld-fix/tiles/t-{name}-{kind}.png'], capture_output=True, cwd=D)
            if r.returncode: continue
            open('/tmp/prev.png', 'wb').write(r.stdout)
            now = Image.open(path).convert('RGB'); prev = Image.open('/tmp/prev.png').convert('RGB')
            if prev.size != now.size: prev = prev.resize(now.size)
            k = 9 if now.width > 1000 else 5
            x, y, w, h = t['rect']; sx, sy = w / now.width, h / now.height
            for f in loop_fill(red_strokes(now, prev).filter(ImageFilter.MaxFilter(k)), k):
                m = Image.new('L', (1983, 793), 0); m.paste(f.resize((w, h), Image.BILINEAR).point(lambda v: 255 if v > 127 else 0), (x, y))
                i = len(found); m.save(f'{D}/rounds/detected/{i}.png'); b = m.getbbox()
                found.append({'id': i, 'from': f't-{name}-{kind}.png', 'bbox': b, 'px': m.histogram()[255]}); print(i, found[-1])
    json.dump(found, open(f'{D}/rounds/detected.json', 'w'), indent=1)

def prepare(spec_path):
    spec = json.load(open(spec_path)); table = []
    for kind in ('lawnfill', 'ghostfill', 'cleanup', 'waterfill', 'forcefill', 'blurfill', 'shorefill'):  # loops handled without a model: tree-like pixels become lawn (see lawn_fill)
        m = Image.new('L', (1983, 793), 0)
        for i in spec.get(kind, []): m.paste(255, (0, 0), Image.open(f'{D}/rounds/detected/{i}.png').convert('L'))
        d = ImageDraw.Draw(m)
        for r in spec.get(kind + 'Extra', []): d.rectangle(r, fill=255)
        for poly in spec.get(kind + 'Polygons', []): d.polygon([tuple(p_) for p_ in poly], fill=255)
        for r in spec.get(kind + 'Protect', []): d.rectangle(r, fill=0)
        m.save(f'{T}/{kind}.png')
        if kind == 'shorefill':  # the shore strip grows past the loop, so its protection is kept as its own mask
            pm = Image.new('L', (1983, 793), 0); dp = ImageDraw.Draw(pm)
            for r in spec.get('shorefillProtect', []): dp.rectangle(r, fill=255)
            pm.save(f'{T}/shorefill-protect.png')
    if spec['base'] == 'stitched.png':  # a round starts from the previous result: keep that base aside, stitch overwrites stitched.png
        spec['base'] = f"rounds/base-{spec['round']}.png"; shutil.copy(f'{D}/stitched.png', f"{D}/{spec['base']}")
        json.dump(spec, open(spec_path, 'w'), indent=1); open(spec_path, 'a').write('\n')
    base = f"{D}/{spec['base']}"
    for name, t in spec['tiles'].items():
        x, y, w, h = t['rect']
        before = lambda f: open(f, 'rb').read() if os.path.exists(f) else None
        old_crop, old_prompt = before(f'{T}/t-{name}.png'), before(f'{T}/t-{name}-prompt.txt')
        magick(base, '-crop', f'{w}x{h}+{x}+{y}', '+repage', f'{T}/t-{name}.png')
        mask = Image.new('L', (1983, 793), 0)
        for i in t.get('loops', []):
            if any(i in spec.get(k, []) for k in ('lawnfill', 'ghostfill', 'waterfill', 'forcefill', 'blurfill', 'shorefill')): continue
            mask.paste(255, (0, 0), Image.open(f'{D}/rounds/detected/{i}.png').convert('L'))
        d = ImageDraw.Draw(mask)
        for r in t.get('extra', []): d.rectangle(r, fill=255)
        for poly in t.get('polygons', []): d.polygon([tuple(p) for p in poly], fill=255)
        for c in t.get('corridors', []):  # extend the area along a footpath of the base, from a seed to its junction, so no join falls mid-path
            bx0, by0, bx1, by1 = c['box']; bimg = Image.open(base).convert('RGB'); bpx = bimg.load(); seen = set(); q = deque([tuple(c['seed'])])
            while q:
                cx, cy = q.popleft()
                if (cx, cy) in seen or not (bx0 <= cx < bx1 and by0 <= cy < by1) or not PATH(bpx[cx, cy]): continue
                seen.add((cx, cy)); q.extend(((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)))
            cm = Image.new('L', (1983, 793), 0); cp = cm.load()
            for p_ in seen: cp[p_] = 255
            mask.paste(255, (0, 0), cm.filter(ImageFilter.MaxFilter(2 * c.get('pad', 6) + 1))); print(name, 'corridor from', c['seed'], len(seen), 'path px')
        mask = mask.crop((x, y, x + w, y + h))
        if t.get('band'): mask.paste(255, (0, 0), lake_band({'rect': t['rect']}, base, t['band']['inner'], t['band']['outer']))
        dm = ImageDraw.Draw(mask)
        for r in t.get('protect', []): dm.rectangle((r[0] - x, r[1] - y, r[2] - x, r[3] - y), fill=0)
        mask.save(f'{T}/t-{name}-mask.png')
        tile = Image.open(f'{T}/t-{name}.png').convert('RGB')  # the marked reference: this round's mask outlined in red
        outline = mask.filter(ImageFilter.MaxFilter(5)); inner = mask.filter(ImageFilter.MinFilter(3))
        ring = Image.new('L', mask.size, 0); rp = ring.load(); op, ip = outline.load(), inner.load()
        for yy in range(mask.height):
            for xx in range(mask.width):
                if op[xx, yy] and not ip[xx, yy]: rp[xx, yy] = 255
        tile.paste((230, 20, 20), (0, 0), ring); tile.save(f'{T}/t-{name}-marked.png')
        prompt = PRE + '\n'.join(f'{i + 1}. {s}' for i, s in enumerate(t['fixes']))
        open(f'{T}/t-{name}-prompt.txt', 'w').write(prompt + '\n')
        table.append({'name': name, 'rect': t['rect'], 'loops': t.get('loops', []), 'repaintPx': mask.histogram()[255], 'edit': True, **({'keepBaseWater': True} if t.get('keepBaseWater') else {})})
        if os.path.exists(f'{T}/t-{name}-out.png'): os.remove(f'{T}/t-{name}-out.png')
        changed = before(f'{T}/t-{name}.png') != old_crop or before(f'{T}/t-{name}-prompt.txt') != old_prompt
        if changed and os.path.exists(f'{T}/t-{name}-model.png'): os.remove(f'{T}/t-{name}-model.png'); print(name, 'crop or prompt changed: model output dropped')
        print(name, t['rect'], 'repaint px', mask.histogram()[255])
    json.dump({'round': spec['round'], 'base': spec['base'], 'tiles': table, 'stamps': spec.get('stamps', []), 'paints': spec.get('paints', []), 'restore': spec.get('restore', []), 'blurThreshold': spec.get('blurThreshold', 28)}, open(f'{D}/tilemap.json', 'w'), indent=1)

def loops():
    """Filled red loops from marked.png, in base pixels, as a list of full-size L masks (sorted by x)."""
    m = Image.open(MARKED).convert('RGB'); b = Image.open(BASE).convert('RGB'); W, H = m.size; mp, bp = m.load(), b.load()
    red = {(x, y) for y in range(H) for x in range(W) if mp[x, y][0] > 170 and mp[x, y][1] < 110 and mp[x, y][2] < 110
           and mp[x, y][0] - mp[x, y][1] > 90 and sum(abs(a - c) for a, c in zip(mp[x, y], bp[x, y])) > 120}
    stroke = Image.new('L', (W, H), 0); sp = stroke.load()
    for x, y in red: sp[x, y] = 255
    stroke = stroke.filter(ImageFilter.MaxFilter(13))  # join broken strokes, close gaps up to ~12 px
    sp = stroke.load(); seen = set(); comps = []
    for y in range(H):
        for x in range(W):
            if sp[x, y] and (x, y) not in seen:
                q = deque([(x, y)]); seen.add((x, y)); c = []
                while q:
                    cx, cy = q.popleft(); c.append((cx, cy))
                    for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= n[0] < W and 0 <= n[1] < H and sp[n] and n not in seen: seen.add(n); q.append(n)
                if len(c) > 400: comps.append(c)
    comps.sort(key=lambda c: min(x for x, y in c))
    out = []
    for c in comps:
        xs = [x for x, y in c]; ys = [y for x, y in c]
        x0, y0, x1, y1 = max(0, min(xs) - 2), max(0, min(ys) - 2), min(W - 1, max(xs) + 2), min(H - 1, max(ys) + 2)
        edge = {'l': min(xs) <= 0, 'r': max(xs) >= W - 1, 't': min(ys) <= 0, 'b': max(ys) >= H - 1}
        wall = lambda x, y: sp[x, y] != 0 or (edge['l'] and x == 0) or (edge['r'] and x == W - 1) or (edge['t'] and y == 0) or (edge['b'] and y == H - 1)
        outside = set(); q = deque()
        for x in range(x0, x1 + 1):
            for y in (y0, y1):
                if not wall(x, y): outside.add((x, y)); q.append((x, y))
        for y in range(y0, y1 + 1):
            for x in (x0, x1):
                if not wall(x, y): outside.add((x, y)); q.append((x, y))
        while q:
            x, y = q.popleft()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if x0 <= n[0] <= x1 and y0 <= n[1] <= y1 and not wall(*n) and n not in outside: outside.add(n); q.append(n)
        f = Image.new('L', (W, H), 0); fp = f.load()
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if (x, y) not in outside: fp[x, y] = 255
        out.append(f.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(13)))  # back to the stroke's centre, then 2 px past it
        print(f'loop {len(out) - 1}: x {min(xs)}-{max(xs)} y {min(ys)}-{max(ys)}')
    return out

ROUND1_LAKE_PROTECT = [(160, 405, 345, 478), (548, 325, 700, 430), (25, 318, 105, 372), (30, 382, 80, 408), (488, 464, 535, 494), (642, 466, 695, 498),
                       (710, 452, 768, 508), (135, 232, 335, 292), (348, 228, 422, 272), (480, 256, 520, 300)]  # tile pixels of the 250,281 lake tile

def lake_band(tile, base=BASE, inner=7, outer=40, protect=()):
    """Shore zone from `inner` to `outer` px outside the lake in this tile (negative inner reaches into the water),
    minus `protect` rectangles in tile pixels (a round spec protects in master pixels instead, in prepare)."""
    x, y, w, h = tile['rect']; im = Image.open(base).convert('RGB').crop((x, y, x + w, y + h)); W, H = im.size; p = im.load()
    water = Image.new('L', (W, H), 0); wp = water.load()
    for yy in range(H):
        for xx in range(W):
            r, g, b = p[xx, yy]
            if b > 150 and g > 150 and r < 130 and b > r + 60: wp[xx, yy] = 255
    seen = set(); best = []
    for yy in range(H):
        for xx in range(W):
            if wp[xx, yy] and (xx, yy) not in seen:
                q = deque([(xx, yy)]); seen.add((xx, yy)); c = []
                while q:
                    cx, cy = q.popleft(); c.append((cx, cy))
                    for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= n[0] < W and 0 <= n[1] < H and wp[n] and n not in seen: seen.add(n); q.append(n)
                if len(c) > len(best): best = c
    lake = Image.new('L', (W, H), 0); lp = lake.load()
    for c in best: lp[c] = 255
    lake = lake.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)); lp = lake.load()
    outside = set(); q = deque([(xx, yy) for xx in range(W) for yy in (0, H - 1) if not lp[xx, yy]] + [(xx, yy) for yy in range(H) for xx in (0, W - 1) if not lp[xx, yy]])
    outside.update(q)
    while q:
        xx, yy = q.popleft()
        for n in ((xx + 1, yy), (xx - 1, yy), (xx, yy + 1), (xx, yy - 1)):
            if 0 <= n[0] < W and 0 <= n[1] < H and not lp[n] and n not in outside: outside.add(n); q.append(n)
    filled = Image.new('L', (W, H), 255); fp = filled.load()
    for c in outside: fp[c] = 0
    grow = lambda img, n: img.filter(ImageFilter.MaxFilter(2 * n + 1)) if n > 0 else img.filter(ImageFilter.MinFilter(2 * -n + 1)) if n < 0 else img
    o = filled
    for _ in range(outer // 20): o = grow(o, 20)
    o = grow(o, outer % 20); i = grow(filled, inner)
    band = Image.new('L', (W, H), 0); bp = band.load(); op, ip = o.load(), i.load()
    for yy in range(H):
        for xx in range(W):
            if op[xx, yy] and not ip[xx, yy]: bp[xx, yy] = 255
    d = ImageDraw.Draw(band)
    for r in protect: d.rectangle(r, fill=0)
    return band

def slice_tiles():
    os.makedirs(T, exist_ok=True); L = loops(); table = []
    for t in TILES:
        x, y, w, h = t['rect']; n = t['name']
        magick(BASE, '-crop', f'{w}x{h}+{x}+{y}', '+repage', f'{T}/t-{n}.png')
        magick(MARKED, '-crop', f'{w}x{h}+{x}+{y}', '+repage', f'{T}/t-{n}-marked.png')
        mask = Image.new('L', (1983, 793), 0)
        for i in t['loops']: mask.paste(255, (0, 0), L[i])
        d = ImageDraw.Draw(mask)
        for r in t.get('extra', []): d.rectangle(r, fill=255)
        mask = mask.crop((x, y, x + w, y + h))
        if t.get('band') == 'lake': mask.paste(255, (0, 0), lake_band(t, protect=ROUND1_LAKE_PROTECT))
        mask.save(f'{T}/t-{n}-mask.png')
        prompt = PRE + '\n'.join(f'{i + 1}. {s}' for i, s in enumerate(FIXES.get(n, []))) if FIXES.get(n) else ''
        if prompt: open(f'{T}/t-{n}-prompt.txt', 'w').write(prompt + '\n')
        table.append({**t, 'repaintPx': mask.histogram()[255], 'edit': bool(prompt)})
        print(n, t['rect'], 'repaint px', mask.histogram()[255])
    json.dump({'round': 1, 'base': 'base.png', 'tiles': table}, open(f'{D}/tilemap.json', 'w'), indent=1)

def stitch():
    tm = json.load(open(f'{D}/tilemap.json')); base = f"{D}/{tm['base']}"; layers = []
    for t in tm['tiles']:
        x, y, w, h = t['rect']; n = t['name']; out = f'{T}/t-{n}-model.png'
        if not os.path.exists(out): print(n, 'no model output, base kept'); continue
        bm = Image.open(base).convert('RGB').crop((x, y, x + w, y + h)); mm = Image.open(out).convert('RGB').resize((w, h), Image.LANCZOS)
        km = Image.open(f'{T}/t-{n}-mask.png').convert('L').filter(ImageFilter.MaxFilter(9)).load(); bp_, mp_ = bm.load(), mm.load()
        diff = [sum(abs(a - b) for a, b in zip(bp_[xx, yy], mp_[xx, yy])) for yy in range(0, h, 2) for xx in range(0, w, 2) if not km[xx, yy]]
        drift = sum(diff) / max(1, len(diff)) / 3
        if drift > 14: print(n, f'REJECTED: the model output is misaligned with the tile (mean drift {drift:.1f} outside the mask); rerun it'); continue
        print(n, f'aligned (drift {drift:.1f})')
        layer = f'{T}/.layer-{n}.png'  # the model's pixels, alpha = mask (1 px feather), on a transparent full-size canvas
        maskfile = f'{T}/t-{n}-mask.png'
        if t.get('keepBaseWater'):  # flat water: where base and model are both water, keep the base so no retinted box shows
            bm = Image.open(base).convert('RGB').crop((x, y, x + w, y + h)); mm = Image.open(out).convert('RGB').resize((w, h), Image.LANCZOS)
            mk = Image.open(maskfile).convert('L'); bp, mp, kp = bm.load(), mm.load(), mk.load()
            for yy in range(h):
                for xx in range(w):
                    if kp[xx, yy] and WATER(bp[xx, yy]) and WATER(mp[xx, yy]): kp[xx, yy] = 0
            mk = mk.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)); maskfile = f'{T}/.mask-{n}.png'; mk.save(maskfile)
        magick('-size', '1983x793', 'xc:none', '(', out, '-filter', 'Lanczos', '-resize', f'{w}x{h}!', '(', maskfile, '-blur', '0x0.7', ')',
               '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')', '-geometry', f'+{x}+{y}', '-compose', 'Over', '-composite', layer)
        if maskfile != f'{T}/t-{n}-mask.png': os.remove(maskfile)
        layers.append(layer); print(n, 'pasted inside its mask')
    magick(base, *layers, '-flatten', '-alpha', 'off', f'{D}/stitched.png')
    for l in layers: os.remove(l)
    union = Image.new('L', (1983, 793), 0)
    for t in tm['tiles']:
        x, y, w, h = t['rect']; union.paste(255, (x, y), Image.open(f"{T}/t-{t['name']}-mask.png").convert('L').filter(ImageFilter.MaxFilter(5)))
    if tm.get('restore'):
        img = Image.open(f'{D}/stitched.png').convert('RGB'); bimg = Image.open(base).convert('RGB')
        for r in tm['restore']: img.paste(bimg.crop(tuple(r)), (r[0], r[1])); print('restored base', r)
        img.save(f'{D}/stitched.png')
    for kind in ('lawnfill', 'ghostfill', 'waterfill', 'forcefill', 'blurfill', 'shorefill', 'cleanup'):  # cleanup last: it tidies what the other fills and pastes leave
        if os.path.exists(f'{T}/{kind}.png'):
            m = Image.open(f'{T}/{kind}.png').convert('L'); img = Image.open(f'{D}/stitched.png').convert('RGB'); print(kind + ':')
            for loop in components(m):
                fill = water_fill(img, loop) if kind == 'waterfill' else shore_fill(img, loop, protect=Image.open(f'{T}/shorefill-protect.png').convert('L') if os.path.exists(f'{T}/shorefill-protect.png') else None) if kind == 'shorefill' else lawn_fill(img, loop, ghost=45 if kind == 'ghostfill' else tm.get('blurThreshold', 28) if kind == 'blurfill' else None, force=kind == 'forcefill', ghost_only=kind == 'blurfill')
                union.paste(255, (0, 0), fill.filter(ImageFilter.MaxFilter(9)))
            img.save(f'{D}/stitched.png')
    if tm.get('paints'):  # flat repaint: a rectangle takes the colour at a sample point (a roof, a wall), 0.5 px feather
        img = Image.open(f'{D}/stitched.png').convert('RGB'); print('paints:')
        for pt in tm['paints']:
            x0, y0, x1, y1 = pt['rect']; c = tuple(pt['color']) if pt.get('color') else img.getpixel(tuple(pt['from'])); m = Image.new('L', img.size, 0); ImageDraw.Draw(m).rectangle((x0, y0, x1 - 1, y1 - 1), fill=255)
            img.paste(Image.new('RGB', img.size, c), (0, 0), m.filter(ImageFilter.GaussianBlur(0.5))); union.paste(255, (0, 0), m.filter(ImageFilter.MaxFilter(5))); print('   paint', pt['rect'], c)
        img.save(f'{D}/stitched.png')
    if tm.get('stamps'):
        img = Image.open(f'{D}/stitched.png').convert('RGB'); print('stamps:')
        for st in tm['stamps']: union.paste(255, (0, 0), stamp(img, tuple(st['src']), tuple(st['dst'])).filter(ImageFilter.MaxFilter(7)))
        img.save(f'{D}/stitched.png')
    # proof: outside the union of masks and lawn fills, stitched.png equals the round's base pixel for pixel
    union.save(f'{T}/.union.png')
    magick(base, '-alpha', 'off', '(', f'{D}/stitched.png', '-alpha', 'off', ')', '-compose', 'Difference', '-composite', '-threshold', '0', '(', f'{T}/.union.png', '-negate', ')', '-compose', 'Multiply', '-composite', '-format', '%[fx:mean*w*h]', '-write', 'info:/tmp/ae.txt', 'null:')
    os.remove(f'{T}/.union.png'); print('pixels changed outside the masks:', open('/tmp/ae.txt').read().strip())
    done = set()
    for t in tm['tiles']:  # what each tile looks like in the result: mark the next round on these
        x, y, w, h = t['rect']; magick(f'{D}/stitched.png', '-crop', f'{w}x{h}+{x}+{y}', '+repage', f"{T}/t-{t['name']}-out.png"); done.add(t['name'])
    for t in TILES:  # the standard grid too, so no tile's -out.png is ever stale
        if t['name'] in done: continue
        x, y, w, h = t['rect']; magick(f'{D}/stitched.png', '-crop', f'{w}x{h}+{x}+{y}', '+repage', f"{T}/t-{t['name']}-out.png")

if __name__ == '__main__':
    {'slice': slice_tiles, 'stitch': stitch, 'check': check, 'detect': lambda: detect(sys.argv[2]), 'detect-master': lambda: detect_master(sys.argv[2]), 'prepare': lambda: prepare(sys.argv[2])}[sys.argv[1]]()
