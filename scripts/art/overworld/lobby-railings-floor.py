#!/usr/bin/env python3
"""Relay the Moosylvania lobby's railing infill and the office floors beneath the loft by construction (lobby round five).

  SCENE=moosylvania python3 scripts/art/overworld/tiles.py prepare rounds/round-5.json
  python3 scripts/art/overworld/lobby-railings-floor.py     writes tiles/t-<name>-model.png and the decal SVGs
  SCENE=moosylvania python3 scripts/art/overworld/tiles.py stitch

Joe (2026-10-01): the loft railing's mesh came out of the 4x upscale a wobbly grid with blobs, the stair railings' infill a
crackle of veins and a chain of orange blobs, and the floor of the two offices beneath the loft a smear of ghosted planks.
The native master draws all three too fine or too soft for the upscaler, so each is relaid here:

- On the native master (the round's model tiles) the old infill is painted out: the loft floor behind the loft railing, and
  behind each stair railing whatever stands beyond it (the wall, the floor, or the treads carried on along their own slope).
  The office floors are relaid as flat planks in the hall floor's own direction and tones.
- The infill itself is too fine for the native master, so it is a decal (decals.json), drawn here in native px as flat
  polygons and composited onto the 4x upscale by install-master.sh: straight rails, evenly spaced posts and balusters.

The stairs' handrails, stringers and newel posts keep their pixels and every tread its place (only its back edge is drawn
straight), so the stair cut-outs' mattes still fit. The loft railing keeps its end posts, top rail and slab; its five
intermediate posts, unevenly spaced in the master, are painted out and redrawn at even spacing (Joe: evenly spaced posts).
`--preview <dir>` writes the whole edited master to <dir>/native.png instead of the tiles (the decals are still written).
"""
import json, math, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter
D = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'art', 'sources', 'moosylvania-fix'))
spec = json.load(open(f'{D}/rounds/round-5.json'))
img = Image.open(f"{D}/{spec['base']}").convert('RGB'); px = img.load(); W, H = img.size  # the round's base, edited in place
base = img.copy(); bpx = base.load()

NAVY = '#0b1c30'       # the railings' steel in shade, as the upscale draws the loft's rails
lerp = lambda a, b, t: tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
median = lambda cs: tuple(sorted(c[i] for c in cs)[len(cs) // 2] for i in range(3))

class Decal:
    """Flat filled polygons in native px; ImageMagick's own SVG renderer ignores strokes, so a line is a thin polygon."""
    def __init__(self, name, box, about): self.name, self.box, self.about, self.out = name, box, about, []
    def poly(self, pts, fill=NAVY): self.out.append(f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in pts)}" fill="{fill}"/>')
    def rect(self, x0, y0, x1, y1, fill=NAVY): self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill)
    def line(self, pts, width, fill=NAVY):
        """A polyline as one strip, offset half the width to each side of every vertex."""
        left, right = [], []
        for i, (x, y) in enumerate(pts):
            (ax, ay), (bx, by) = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]; n = math.hypot(bx - ax, by - ay) or 1
            ox, oy = -(by - ay) / n * width / 2, (bx - ax) / n * width / 2
            left.append((x + ox, y + oy)); right.append((x - ox, y - oy))
        self.poly(left + right[::-1], fill)
    def save(self):
        x, y, w, h = self.box
        open(f'{D}/{self.name}.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w * 4}" height="{h * 4}">\n<!-- {self.about} -->\n' + '\n'.join(self.out) + '\n</svg>\n')
        print(f'wrote {self.name}.svg: {len(self.out)} polygons; decals.json centre [{x + w / 2}, {y + h / 2}], height {h}')

# ---- The loft railing: between its two end posts, under its top rail --------------------------------------------------
# Measured on the native master: the end posts' inner faces at x 280.6 and 603.5 (centres 278.6 and 605.4), the top rail's
# underside at y 485.2, the old sub-rail 489.3 to 490.9, the bottom rail 520.2 to 522.3, the slab's lit lip from 524.3.
LOFT_X, LOFT_POSTS, BAYS, POST_W = (281, 604), (278.6, 605.4), 6, 2.8
OLD_POSTS = [(317, 318), (374, 376), (439, 441), (506, 507), (564, 565)]  # the master's own, unevenly spaced: painted out
SUB, BOTTOM, LIP = (489.3, 490.9), (520.2, 522.3), 526.8
BALUSTERS, BALUSTER_W, ROWS = 11, 0.75, 0  # balusters to a bay and their width; ROWS > 0 adds that many mesh rows across them (0: plain balusters, which read cleaner at the size the site draws them)

def loft():
    x0, x1 = LOFT_X
    def across(y, ok):  # a row of the base with every column that fails `ok` eased between its neighbours that pass
        row = [bpx[x, y] for x in range(x0, x1)]; good = [k for k, c in enumerate(row) if ok(k + x0, c)]
        for k in range(len(row)):
            if k in good: continue
            l = max((g for g in good if g < k), default=None); r = min((g for g in good if g > k), default=None)
            row[k] = row[r] if l is None else row[l] if r is None else lerp(row[l], row[r], (k - l) / (r - l))
        return row
    post = lambda x, c: not any(a - 2 <= x <= b + 2 for a, b in OLD_POSTS)
    for y in (485, 524, 525, 526, 527):  # the old posts leave the top rail's underside and the slab's lip
        for k, c in enumerate(across(y, post)): px[k + x0, y] = c
    # Behind the infill is the loft floor, one flat tone: the median of the floor just above the top rail. The strip under
    # the bottom rail, the slab's edge, keeps its own paler tone, flat too.
    floor = lambda x, c: sum(c) > 520 and post(x, c)
    top = median([bpx[x, y] for y in (476, 477, 478, 479) for x in range(x0, x1)]); low = median(across(523, floor))
    for x in range(x0, x1):
        for y in range(486, 524): px[x, y] = low if y == 523 else top
    d = Decal('loft-railing', (279, 484, 326, 43), "The loft railing's infill between its end posts, in native lobby px (art/sources/moosylvania-fix/stitched.png): a decal composited onto the 4x upscale by install-master.sh (decals.json), since the master's 5 px mesh came out of the upscale a wobbly grid with blobs. Round five paints the old posts and mesh out underneath. Written by scripts/art/overworld/lobby-railings-floor.py.")
    step = (LOFT_POSTS[1] - LOFT_POSTS[0]) / BAYS; posts = [LOFT_POSTS[0] + i * step for i in range(BAYS + 1)]
    for a, b in zip(posts, posts[1:]):
        l, r = a + POST_W / 2, b - POST_W / 2
        for i in range(1, BALUSTERS + 1): xx = l + (r - l) * i / (BALUSTERS + 1); d.rect(xx - BALUSTER_W / 2, SUB[1] - 0.2, xx + BALUSTER_W / 2, BOTTOM[0] + 0.2)
        for j in range(1, ROWS): yy = SUB[1] + (BOTTOM[0] - SUB[1]) * j / ROWS; d.rect(l, yy - BALUSTER_W / 2, r, yy + BALUSTER_W / 2)
    d.rect(280.2, SUB[0], 603.9, SUB[1]); d.rect(280.2, BOTTOM[0], 603.9, BOTTOM[1])
    for p in posts[1:-1]: d.rect(p - POST_W / 2, 484.4, p + POST_W / 2, LIP)
    d.save()

# ---- The stair railings ------------------------------------------------------------------------------------------------
# Each stair has four runs of infill: the outer railing's upper run against the wall (a), the inner railing's upper run in
# front of the treads (b), the outer railing's lower run in front of the treads (c) and the inner railing's lower run over
# the hall floor (d). Between them each railing turns edge-on to the camera and shows no infill. A run is the opening
# between the handrail's underside (T) and the stringer's top face (B), both read off the 4x upscale along rows and columns
# of the master, in native px. A baluster is vertical in this camera, so both are taken as y over x.
def curve(pts):
    """A measured edge as y over x: Catmull-Rom through its points, then straight between the dense samples."""
    pts = sorted(pts); out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for k in range(8):
            t = k / 8; out.append(tuple(0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    out.append(pts[-1]); out.sort(); return out
def eased(pts, passes=3):
    """A measured edge with its wobble eased out: each point drawn towards its neighbours, the ends held."""
    pts = sorted(pts)
    for _ in range(passes): pts = [pts[0]] + [tuple((a[j] + 2 * b[j] + c[j]) / 4 for j in (0, 1)) for a, b, c in zip(pts, pts[1:], pts[2:])] + [pts[-1]]
    return pts
def at(c, x, axis=0):
    """y at x on a curve (axis 0), or x at y (axis 1); the end value beyond its ends."""
    o = 1 - axis; c = c if axis == 0 else sorted(c, key=lambda p: p[1])
    if x <= c[0][axis]: return c[0][o]
    for a, b in zip(c, c[1:]):
        if x <= b[axis]: return a[o] + (b[o] - a[o]) * (x - a[axis]) / ((b[axis] - a[axis]) or 1)
    return c[-1][o]
def sample(x, y):
    """The master as it stands, the treads' back edges already relaid, at a fractional point."""
    x = min(max(x, 0), W - 1.001); y = min(max(y, 0), H - 1.001); x0, y0 = int(x), int(y); fx, fy = x - x0, y - y0
    return lerp(lerp(px[x0, y0], px[x0 + 1, y0], fx), lerp(px[x0, y0 + 1], px[x0 + 1, y0 + 1], fx), fy)
def patch(box): return median([bpx[x, y] for x in range(box[0], box[2]) for y in range(box[1], box[3])])
def paint(poly, colour):
    """Fill a polygon of the master with colour(x, y), by coverage at its edge."""
    xs, ys = [q[0] for q in poly], [q[1] for q in poly]; x0, y0, x1, y1 = int(min(xs)) - 1, int(min(ys)) - 1, int(max(xs)) + 2, int(max(ys)) + 2; Z = 4
    m = Image.new('L', ((x1 - x0) * Z, (y1 - y0) * Z), 0); ImageDraw.Draw(m).polygon([((x - x0) * Z, (y - y0) * Z) for x, y in poly], fill=255)
    m = m.resize((x1 - x0, y1 - y0), Image.BOX).load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if m[x - x0, y - y0]: px[x, y] = lerp(px[x, y], colour(x + 0.5, y + 0.5), m[x - x0, y - y0] / 255)

PITCH, SUB_W = 4.3, 1.3  # the loft's baluster pitch, closed up where a run climbs steeply; a sub-rail's thickness
def run(d, T, B, x, colour, sub=(0.14, 0.12)):
    """One run of infill: the old infill painted out on the master with colour(x, y), then the run drawn on the decal."""
    x0, x1 = x; t, b = curve(T), curve(B)
    paint(t + b[::-1], colour)
    T, B = curve(eased(T)), curve(eased(B))  # the master's edges wobble by half a pixel; the drawn rails run smooth
    top = lambda u: at(T, u) + sub[0] * (at(B, u) - at(T, u)); low = lambda u: at(B, u) - sub[1] * (at(B, u) - at(T, u))
    us = [x0 + (x1 - x0) * i / 200 for i in range(201)]
    u = x0 + 1.6
    while u < x1 - 1.2:  # balusters first, the two sub-rails over their ends
        d.rect(u - BALUSTER_W / 2, top(u), u + BALUSTER_W / 2, low(u))
        u += max(2.2, PITCH / (1 + 0.3 * abs(at(T, u + 1) - at(T, u - 1)) / 2))
    for j in range(1, ROWS): d.line([(v, top(v) + (low(v) - top(v)) * j / ROWS) for v in us], BALUSTER_W)
    d.line([(v, top(v)) for v in us], SUB_W); d.line([(v, low(v)) for v in us], SUB_W)

def treads(T, side, reach, slope, post=None):
    """Behind a railing that stands in front of the treads: each tread and riser carried on along its own slope from just
    beyond the handrail (`reach` px past the opening's edge, to the left for side -1), or beyond the newel post."""
    T = curve(T)
    def colour(x, y):
        s = at(slope, y); xs = at(T, y, 1) + side * reach
        xs = at(T, y - s * (x - xs), 1) + side * reach
        if post and y - s * (x - xs) > post[0]: xs = post[1]
        return sample(xs, y - s * (x - xs))
    return colour

VP = (438.0, -100.0)  # where the hall floor's plank seams meet, fitted to seams tracked on the good floor beside both stairs
def planks(top):
    """Behind a railing that stands over the hall floor: each plank carried down its own line, towards the planks'
    vanishing point, from above the handrail's top edge, measured like T."""
    top = curve(top)
    def colour(x, y):
        along = lambda ys: VP[0] + (x - VP[0]) * (ys - VP[1]) / (y - VP[1]); ys = at(top, x) - 6  # 6 rows up: 3 px clear of a handrail this steep
        for _ in range(6): ys = (ys + at(top, along(ys)) - 6) / 2
        return sample(along(ys), ys)
    return colour
def bay(d, rail, low, xs):
    """The short bay at a stair's top, between the master's own second rail and bottom rail: balusters only."""
    rail, low = curve(rail), curve(low)
    for u in xs: d.rect(u - BALUSTER_W / 2, at(rail, u), u + BALUSTER_W / 2, at(low, u))

def back_edges(zone):
    """Between a stair's stringers: every tread's back edge, where the riser above meets it, relaid as one straight line.
    The master draws a pale sliver along part of each back edge, no two the same length, and the edge itself wanders a
    pixel up and down, which the upscale turns into ragged, stepped edges. The line is fitted to the whole edge, and
    under it each column gets the tread's own two shaded rows."""
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(zone, fill=255); x0, y0, x1, y1 = m.getbbox(); m = m.load()
    steel = lambda c: c[2] >= c[0] - 8 and sum(c) < 300
    tread = lambda c: c[0] - c[2] >= 75 and c[2] <= 105 and c[0] > 150
    tracks, edges = [], {}  # one track per tread, a column each: x, the edge, the tread's first row; and every edge by column
    for x in range(x0, x1):
        for y in range(y0 + 1, y1):
            if not (m[x, y] and steel(bpx[x, y - 1]) and not steel(bpx[x, y])): continue
            k = next((k for k in range(6) if tread(bpx[x, y + k])), None)
            if k is None: continue
            top = y + k; navy, wood = bpx[x, y - 1], bpx[x, top + 1]  # the edge to a fraction of a row, from the blended row above the tread; half a row under a sliver
            sliver = any(c[2] > 125 and sum(c) > 420 for c in (bpx[x, i] for i in range(y, top)))
            e = [x, top - (0.5 if sliver else sum(min(1.0, max(0.0, (bpx[x, i][0] - navy[0]) / max(1, wood[0] - navy[0]))) for i in range(y, top))), top]
            edges.setdefault(x, []).append(e[1])
            t = next((t for t in tracks if 0 < x - t[-1][0] <= 3 and abs(top - t[-1][2]) <= 2), None)
            t.append(e) if t else tracks.append([e])
    n = 0
    for t in tracks:
        if len(t) < 12: continue
        pts = [(x, y) for x, y, _ in t]
        for _ in range(3):  # least squares, twice dropping the columns a pixel or more off the line
            k = len(pts); sx = sum(q[0] for q in pts); sy = sum(q[1] for q in pts); sxx = sum(q[0] ** 2 for q in pts); sxy = sum(q[0] * q[1] for q in pts)
            slope = (k * sxy - sx * sy) / ((k * sxx - sx * sx) or 1); cut = (sy - slope * sx) / k
            keep = [q for q in pts if abs(q[1] - (cut + slope * q[0])) < 1]; pts = keep if len(keep) >= 8 else pts
        s1, s2 = (median([bpx[x, top + d] for x, _, top in t]) for d in (0, 1))  # the tread's two shaded rows under the riser
        # The line runs over a corner the master draws a few pixels high, and stops where the tread's end tapers away below it.
        near = lambda x: any(-4 <= y - (cut + slope * x) <= 1.5 for y in edges.get(x, []))
        xa, xb = t[0][0], t[-1][0]
        while any(near(xa - k) for k in (1, 2, 3)): xa -= 1
        while any(near(xb + k) for k in (1, 2, 3)): xb += 1
        while not near(xa): xa += 1
        while not near(xb): xb -= 1
        for x in range(xa, xb + 1):
            line = cut + slope * x; ease = max(0, 1 - min(x - xa, xb - x) / 4)  # over its last four columns the line eases onto the master's own edge
            if ease: line += ease * (min(edges.get(x, [line]), key=lambda y: abs(y - line)) - line)
            top = int(line); f = line - top  # the tread's first row is `top`, covered above the line
            riser = [c for c in (bpx[x, y] for y in range(top - 8, top - 2)) if steel(c)]; wood = bpx[x, top + 4]
            if len(riser) < 2 or not tread(wood): continue  # a rail or the stringer stands here
            navy = median(riser)
            for y, c in zip(range(top - 4, top + 4), [navy] * 4 + [lerp(s1, navy, f), lerp(s2, s1, f), lerp(wood, s2, f), wood]):
                if c != px[x, y]: px[x, y] = c; n += 1
    # What is left of a sliver past a line's end, up to the handrail: a cream pixel or two right under a riser takes its navy.
    pale = lambda c: c[2] > 120 and sum(c) > 400 and c[0] > c[2] + 15  # cream and its blends, not the handrail's lit blue
    wide = Image.new('L', (W, H), 0); ImageDraw.Draw(wide).polygon(zone, fill=255); wide = wide.filter(ImageFilter.MaxFilter(9)).load()
    for x in range(x0 - 4, x1 + 4):
        for y in range(y0 + 3, y1 - 3):
            if wide[x, y] and pale(px[x, y]) and (steel(px[x, y - 1]) or pale(px[x, y - 1]) and steel(px[x, y - 2])):
                px[x, y] = px[x, y - 1] if steel(px[x, y - 1]) else px[x, y - 2]; px[x, y - 1] = px[x, y]; n += 1
    return n

TREADS_LEFT = [(214, 576), (212, 580), (200, 600), (190, 615), (178, 640), (168, 660), (158, 680), (150, 700), (146, 720), (146, 745), (152, 770), (160, 785), (166, 800), (180, 822), (192, 838), (200, 850), (200, 900), (250, 868), (240, 850), (230, 830), (222, 808), (217, 790), (213, 770), (208, 750), (207, 720), (207, 690), (208, 665), (212, 645), (218, 625), (226, 605), (234, 585), (238, 576)]  # inside the left stair's stringers, clear of both railings, from the fourth tread down: the top three have no slivers

def stair_left():
    d = Decal('stairs-left-railings', (130, 494, 136, 412), "The left staircase's railing infill, in native lobby px (art/sources/moosylvania-fix/stitched.png): a decal composited onto the 4x upscale by install-master.sh (decals.json), since the master's mesh and thin rails came out of the upscale a crackle of veins and a chain of orange blobs. Round five paints the old infill out underneath; the handrails, stringers and posts are the master's own. Written by scripts/art/overworld/lobby-railings-floor.py.")
    print('left stair:', back_edges(TREADS_LEFT), 'px on the treads\' back edges')
    px[222, 615] = px[222, 616] = px[221, 615]  # a sliver's grey end against the inner handrail, which no colour test tells from the rail's own edge
    px[218, 581], px[219, 581] = px[218, 580], px[219, 580]  # and a two-pixel peak on the fourth tread's back edge, above the relaid treads
    cream, brown = patch((175, 528, 184, 540)), patch((140, 590, 152, 610))
    Ta = [(208.8, 526.1), (205, 531.0), (200, 537.6), (195, 544.1), (190, 550.9), (185, 557.7), (180, 564.8), (175, 573.3), (170, 583.0), (165, 593.2), (161.8, 600), (157.2, 610), (153.2, 620), (149.2, 630), (146.2, 640), (143.5, 650), (140.8, 660), (139.0, 670), (138.0, 680), (137.0, 690), (136.9, 700)]
    Ba = [(208.8, 572.4), (205, 576.0), (200, 582.0), (195, 588.5), (190, 595.2), (186.8, 600), (185, 602.5), (180, 610.0), (175, 617.8), (173.2, 620), (168.2, 630), (162.5, 640), (157.8, 650), (153.8, 660), (149.5, 670), (145.8, 680), (142.2, 690), (139.8, 700)]
    # (a) stands against the wall: the cream wall under the loft, and left of its corner at x 168.2 the oak wainscot
    run(d, Ta, Ba, (139.8, 208.8), lambda x, y: cream if x >= 168.2 else brown)
    Tb = [(264.8, 530), (260.2, 540), (255.7, 550), (248.8, 560), (244.8, 570), (240.5, 580), (235.2, 590), (231.0, 600), (227.2, 610), (224.8, 620), (221.3, 630), (218.5, 640), (216.6, 650), (214.2, 660), (212.3, 670), (212.0, 680), (211.8, 690), (211.7, 700), (211.6, 706)]
    Bb = [(270.8, 540), (267.2, 550), (262.8, 560), (257.2, 570), (252.2, 580), (248.0, 590), (243.0, 600), (238.5, 610), (233.8, 620), (230.2, 630), (226.8, 640), (223.8, 650), (221.0, 660), (218.5, 670), (217.0, 680), (214.8, 690), (214.0, 700), (213.7, 706)]
    run(d, Tb, Bb, (214.0, 264.8), treads(Tb, -1, 5.6, [(530, 0.13), (620, 0.13), (700, 0.04)]))
    Tc = [(146.8, 770), (151.0, 780), (156.2, 790), (161.2, 800), (167.8, 810), (174.2, 820), (181.8, 830), (190.0, 840), (194.3, 845.2)]
    Bc = [(137.5, 760), (139.5, 770), (141.0, 780), (141.8, 790), (145.8, 800), (149.2, 810), (150.5, 820), (154.5, 830), (159.5, 840), (164.2, 850), (169.8, 860), (175.8, 870), (182.5, 880), (189.2, 890), (194.3, 901)]
    run(d, Tc, Bc, (146.8, 194.3), treads(Tc, 1, 6.3, [(770, 0.0), (800, -0.1), (825, -0.14), (850, -0.2), (890, -0.28)], post=(843, 199.8)))
    Td = [(221.5, 760.3), (222, 761.5), (225, 768.6), (230, 779.9), (235, 789.0), (240, 796.3), (245, 803.3), (250, 810.1), (255, 816.3), (256.6, 818.3)]
    Bd = [(221.5, 789.2), (222, 791.2), (225, 803.2), (230, 816.0), (235, 825.8), (240, 834.2), (245, 843.0), (250, 850.5), (255, 858.0), (256.6, 860.4)]
    run(d, Td, Bd, (221.5, 256.6), planks([(222, 754.2), (225, 762.0), (230, 773.2), (235, 782.0), (240, 790.8), (245, 798.2), (250, 805.0), (255, 811.2), (256.6, 813.2)]), sub=(0.175, 0.12))
    bay(d, [(218.5, 518.9), (221, 514.1), (224, 507.15)], [(218.5, 544.1), (221, 539.9), (224, 535.0)], (220.0, 222.9))
    d.save()

def stair_right():
    d = Decal('stairs-right-railings', (622, 494, 136, 412), "The right staircase's railing infill, in native lobby px: as stairs-left-railings.svg, measured on the right stair. Written by scripts/art/overworld/lobby-railings-floor.py.")
    print('right stair:', back_edges([(885 - x, y) for x, y in TREADS_LEFT]), 'px on the treads\' back edges')  # the left stair's zone mirrored about x 442.5
    for x in (658, 659, 660):  # a sliver's grey end against the inner handrail, which no colour test tells from the rail's own edge
        px[x, 598] = px[x, 597]; px[x, 599] = lerp(px[657, 599], px[661, 599], (x - 657) / 4)
    cream, brown = patch((703, 528, 712, 540)), patch((735, 590, 747, 610))
    Ta = [(677.2, 525.8), (679, 528.2), (682, 532.0), (687, 538.2), (692, 544.8), (697, 551.5), (702, 558.8), (707, 566.5), (712, 575.5), (717, 584.0), (719.8, 590), (725.3, 600), (730.0, 610), (733.8, 620), (737.5, 630), (741.0, 640), (743.5, 650), (746.0, 660), (747.8, 670), (748.8, 680), (749.5, 690), (749.8, 700)]
    Ba = [(677.2, 571.7), (679, 573.8), (682, 577.0), (687, 582.2), (692, 588.5), (697, 596.2), (702, 603.0), (707, 609.8), (712, 617.5), (717, 625.8), (719.5, 630), (724.8, 640), (731.2, 650), (733.5, 660), (737.5, 670), (741.2, 680), (744.2, 690), (746.8, 700)]
    run(d, Ta, Ba, (677.2, 746.8), lambda x, y: cream if x <= 719.6 else brown, sub=(0.14, 0.11))
    Tb = [(622.2, 530), (627.2, 540), (632.2, 550), (637.5, 560), (642.5, 570), (646.6, 580), (651.3, 590), (655.6, 600), (658.5, 610), (662.8, 620), (665.3, 630), (668.4, 640), (670.6, 650), (672.8, 660), (674.0, 670), (675.0, 680), (675.1, 690), (675.2, 700), (675.3, 706)]
    Bb = [(616.0, 540), (619.5, 550), (624.0, 560), (630.0, 570), (634.8, 580), (638.8, 590), (644.0, 600), (648.8, 610), (653.5, 620), (657.2, 630), (660.5, 640), (663.8, 650), (666.2, 660), (668.2, 670), (670.0, 680), (672.0, 690), (673.0, 700), (673.4, 706)]
    run(d, Tb, Bb, (622.2, 673.0), treads(Tb, 1, 5.6, [(530, -0.13), (620, -0.13), (700, -0.04)]))
    Tc = [(692.0, 843), (694.0, 840), (703.4, 830), (711.0, 820), (716.0, 810), (723.9, 800), (727.9, 790), (734.3, 780), (737.3, 770)]
    Bc = [(692.0, 896), (695.0, 890), (701.2, 880), (708.8, 870), (714.5, 860), (720.2, 850), (724.8, 840), (730.2, 830), (734.8, 820), (737.5, 810), (740.2, 800), (743.0, 790), (744.2, 780), (746.2, 770), (747.2, 760)]
    run(d, Tc, Bc, (692.0, 737.3), treads(Tc, -1, 7.0, [(770, 0.0), (800, 0.1), (825, 0.14), (850, 0.2), (890, 0.28)], post=(843, 685.5)))
    Td = [(630.6, 817.2), (632, 815.3), (637, 809.3), (642, 802.6), (647, 794.9), (652, 786.9), (657, 777.6), (662, 767.9), (665, 762.1), (665.5, 761.0)]
    Bd = [(630.6, 858.8), (632, 856.8), (637, 849.5), (642, 842.5), (647, 834.2), (652, 825.0), (657, 815.0), (662, 800.2), (665, 786.0), (665.5, 783.6)]
    run(d, Td, Bd, (630.6, 665.5), planks([(630.6, 812.3), (632, 810.5), (637, 804.0), (642, 797.0), (647, 788.8), (652, 780.2), (657, 769.8), (662, 758.8), (665.5, 750.0)]), sub=(0.165, 0.15))
    bay(d, [(663, 507.15), (666, 514.0), (668, 518.1)], [(663, 535.5), (666, 540.35), (668, 543.65)], (664.0, 666.9))
    d.save()

# ---- The office floors beneath the loft --------------------------------------------------------------------------------
# The master's floor in the two offices and in front of them is a smear: ghosted plank bands at odd angles, soft patches of
# other tones, soft blobs under the chairs. It is relaid as planks: each seam of the good floor below, read off the master
# at the row where the relaid floor ends, is carried up its own line to the planks' vanishing point, so the boards run on
# unbroken; each plank is one flat tone, the offices' own shaded honey a few per cent lighter or darker from board to board
# as the hall's are, easing over its last rows into the colour the same board has below. Whatever stands on the floor (the
# chairs, the pots, the desks' side panels, the glass, the stairs) keeps its pixels, and each chair and pot gets one crisp
# contact shadow.
WOOD = lambda c: c[0] > 150 and c[0] > c[1] > c[2] and c[0] - c[2] >= 96 and c[1] - c[2] >= 30  # the floor's honey, lit, shaded or under a chair; not the cream wall. The desks' side panels are as warm, so they are holes
TONES = (1.0, 0.965, 1.02, 0.985, 1.03, 0.97, 1.01, 0.955, 1.025, 0.99)  # board to board
def floor(outer, holes, anchors, yb, shade, hall=None, shadows=()):
    """Relay the floor inside `outer` (less `holes`): `anchors` are the seams' x at row `yb`, the relaid floor's last row;
    `shade` a patch of the office's clean floor; `hall` (x0, y) the part right of x0 whose planks start at row y in the
    open hall and ease in from the floor above; `shadows` crisp ellipses (cx, cy, rx, ry), each a little right of its chair or pot, the light being upper left."""
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m); d.polygon(outer, fill=255)
    for h in holes: d.polygon(h, fill=0)
    x0, y0, x1, y1 = m.getbbox(); mp = m.load()
    u = lambda x, y: VP[0] + (x - VP[0]) * (yb - VP[1]) / (y - VP[1])  # where the plank through (x, y) crosses row yb
    plank = lambda v: sum(1 for a in anchors if a <= v)
    base = patch(shade); below, above = {}, {}
    for x in range(x0 - 12, x1 + 12):  # each board's own colour just below the relaid floor, and above it in the hall
        for y in range(yb, yb + 5):
            if WOOD(bpx[x, y]): below.setdefault(plank(u(x + 0.5, y + 0.5)), []).append(bpx[x, y])
        if hall and x >= hall[0]:
            for y in range(hall[1] - 5, hall[1]):
                if WOOD(bpx[x, y]): above.setdefault(plank(u(x + 0.5, y + 0.5)), []).append(bpx[x, y])
    below = {i: median(cs) for i, cs in below.items()}; above = {i: median(cs) for i, cs in above.items()}
    ease = lambda t: max(0.0, min(1.0, t)) ** 2 * (3 - 2 * max(0.0, min(1.0, t)))
    Z = 4; n = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not mp[x, y] or not WOOD(bpx[x, y]): continue  # whatever stands on the floor keeps its pixels
            acc = [0.0, 0.0, 0.0]
            for sy in range(Z):
                for sx in range(Z):
                    fx, fy = x + (sx + 0.5) / Z, y + (sy + 0.5) / Z; v = u(fx, fy); i = plank(v)
                    c = tuple(k * TONES[i % len(TONES)] for k in base)
                    if i in below: c = lerp(c, below[i], ease((fy - (yb - 16)) / 16))
                    top = 1.0
                    if hall and fx >= hall[0]:
                        top = ease((fy - hall[1]) / 12)
                        if i in above: c = lerp(above[i], c, top)
                    if any(((fx - cx) / rx) ** 2 + ((fy - cy) / ry) ** 2 <= 1 for cx, cy, rx, ry in shadows): c = tuple(k * 0.83 for k in c)
                    seam = min(abs(v - a) for a in anchors) * (fy - VP[1]) / (yb - VP[1])  # px to the nearest seam
                    if seam < 0.3: c = lerp(c, tuple(k * 0.8 for k in c), top)
                    for k in range(3): acc[k] += c[k]
            px[x, y] = tuple(min(255, round(a / Z / Z)) for a in acc); n += 1
    return n

def floors():
    # Left: the office and the floor in front of it, to the seam at x 425.5 in the open hall, where the master draws a ghost
    # of the same smear. The office ends at the glass partition's pane (x 332.5), the floor seen through it left alone.
    desk = [(309.5, 660), (324, 660), (324, 694.5), (315.5, 703), (315.5, 707), (309.5, 707)]  # its side panel
    n = floor([(236, 686), (332.5, 686), (332.5, 722), (334, 722), (337, 708), (425.5, 708), (425.5, 792), (222, 792)], [desk],
              [210, 221, 232, 243, 254, 264.8, 276, 286.8, 297.8, 308.5, 320, 331, 342.2, 353.5, 366, 377.2, 389.8, 401.8, 413.8, 425.5], 792,
              (262, 714, 320, 728), hall=(334, 708), shadows=[(287, 708.5, 21, 5.5), (245, 738.5, 14, 4)])
    print('left office floor:', n, 'px relaid')
    desk = [(563, 660), (580, 660), (580, 709), (576, 709), (563, 697)]; glass = [(539, 640), (554.5, 640), (554.5, 722), (553, 722), (539, 688)]
    n = floor([(553, 686), (662, 686), (668, 795), (540, 795), (540, 722)], [glass, desk],
              [540, 551, 563.5, 573.5, 585, 594.2, 604.3, 614.3, 625.8, 637.4, 648.2, 659, 670, 681], 795,
              (565, 714, 625, 728), shadows=[(605, 708.5, 21, 5.5), (647.5, 738.5, 14, 4)])
    print('right office floor:', n, 'px relaid')

loft(); floors(); stair_left(); stair_right()  # the floors before the stairs: a lower railing shows the relaid floor through it

# Every pixel changed must lie inside a tile's repaint rectangle, or the stitch would drop it.
inside = Image.new('L', (W, H), 0)
for t in spec['tiles'].values():
    for r in t['extra']: ImageDraw.Draw(inside).rectangle(r, fill=255)
changed = ImageChops.difference(img, base).convert('L').point(lambda v: 255 if v else 0)
assert not ImageChops.subtract(changed, inside).getbbox(), 'a change falls outside the round\'s repaint rectangles'
print(changed.histogram()[255], 'px changed, all inside the repaint rectangles')
if '--preview' in sys.argv:
    out = sys.argv[sys.argv.index('--preview') + 1]; img.save(f'{out}/native.png'); print('wrote', f'{out}/native.png')
else:
    for name, t in spec['tiles'].items():
        x, y, w, h = t['rect']; img.crop((x, y, x + w, y + h)).save(f'{D}/tiles/t-{name}-model.png'); print(f'wrote tiles/t-{name}-model.png')
