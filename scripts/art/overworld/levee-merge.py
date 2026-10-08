#!/usr/bin/env python3
"""Merge the Arch levee's wide promenade into the cream shore path (round twenty-three, the `levee` tile; Joe, 2026-10-08).

  python3 scripts/art/overworld/levee-merge.py     after tiles.py prepare; writes tiles/t-levee-model.png, then tiles.py stitch

South of the riverboat the grey-beige promenade ended in a squared edge across its whole width and the narrow cream path
carried on below it; on the lawn beside it a round tree trailed a dark green smear down to half a tree cut off at the
promenade's end. Codex redrew the tile well (attempt a) but moved the shoreline 4 px and added a lamp, so the tile is drawn
by hand, in the base's own colours:

- The paving fades into the shore path's cream across the road's whole width, along the road, from 5 px past the mid-road
  lamp's foot, and is all cream 6 px short of where the kerb lamp stood; the kerb takes the path's pale rim with it. (First the cream
  border strip widened while the paving pinched out against the kerb at the lamp; Joe, the same day: the road then ran
  into the river, to a lamp over the water.) The road narrows evenly to the path's width, its lawn edge moved in by about
  1 px at most.
- The kerb lamp that stood in the water off the levee's squared corner is removed, post and light (Joe; a bank carried
  round its foot, tried first, bumped out into the water), and the shore from y 262 to 286 is one curve between the
  base's own shore above and below, the corner gone. The mid-road lamp and the lamp south of it keep their pixels.
- The road's lawn edge is the base's own, measured per row (where the blue channel crosses from lawn to cream), carried
  under the old half tree by a Hermite curve to the path's edge below it.
- Lawn left of that edge, in each row's own lawn tone, over the smear, the half tree, its trunk and its shadow.
- The round tree is keyed out of the base (crown and trunk, without the smear or its pale halo) and set back in place, and
  a second copy stands where the half tree stood, each with a small shadow at its foot.
"""
import json, os
from PIL import Image, ImageDraw
D = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'art', 'sources', 'overworld-fix'))
spec = json.load(open(f'{D}/rounds/round-23.json')); t = spec['tiles']['levee']; x0, y0, w, h = t['rect']
base = Image.open(f"{D}/{spec['base']}").convert('RGB').crop((x0, y0, x0 + w, y0 + h)); bp = base.load()
tile = base.copy(); px = tile.load()
at = lambda x, y: bp[x - x0, y - y0]

CREAM, RIM, SHADOW = (252, 236, 182), (253, 246, 206), (146, 160, 48)  # the shore path, its pale rim at the water, a tree's shadow on the lawn
TOP, WIDEN, END = 257, 262, 294  # rows: the relay starts under the round tree's crown; the road narrows from WIDEN
FADE = (1764, 1778)  # x + y where the paving starts and ends its fade into cream: 5 px past the mid-road lamp's foot, done 6 px short of the kerb lamp
BANK, LAST, SLOPES = 261, 286, (0.9, 0.55)  # the shore relaid as one curve: rows after BANK to LAST, leaving and arriving at the base's own slants
TREE, FOOT = (1476, 244, 1492, 262), (1484, 261)  # the round tree's box and its trunk's foot
SECOND = (25, 30)  # the second tree's offset from the first: its foot at (1509, 291), where the half tree's trunk stood
lawn = lambda c: c[0] > 165 and c[1] > 195 and c[2] < 100 and c[1] > c[0] + 12
mix = lambda a, b, k: tuple(round(a[i] * k + b[i] * (1 - k)) for i in range(3))
clamp = lambda v: max(0.0, min(1.0, v))
paved = lambda c: c[0] > 175 and c[0] > c[1] and 110 < c[2] < 205  # paving or its cream strip

def lawn_edge(y):
	"""Where row y passes from lawn, tree or smear (little blue) to the road's cream (blue over 110), in master px."""
	for x in range(1484 if y < 280 else 1508, 1524):
		a, b = at(x - 1, y)[2], at(x, y)[2]
		if a < 110 <= b and at(x + 1, y)[2] >= 110: return x - 0.5 + (110 - a) / (b - a) + 0.5
def kerb(y):
	"""The first px right of the road in row y that is kerb or water (green no less than red, blue high)."""
	return next(x for x in range(int(L[y]) + 4, 1540) if at(x, y)[1] >= at(x, y)[0] - 2 and at(x, y)[2] > 170)

# The lawn edge: measured and smoothed above the half tree and below it, a Hermite curve between.
raw = {y: lawn_edge(y) for y in list(range(TOP - 2, 277)) + list(range(289, END + 3))}
smooth = lambda y, ys: sum(raw[v] for v in ys if abs(v - y) <= 2) / sum(1 for v in ys if abs(v - y) <= 2)
upper, lower = range(TOP - 2, 277), range(289, END + 3)
L = {y: smooth(y, upper) for y in range(TOP, 275)} | {y: smooth(y, lower) for y in range(291, END + 1)}
ya, yb = 274, 291; ma, mb = (L[274] - L[268]) / 6, (L[END] - L[291]) / (END - 291); span = yb - ya
for y in range(ya + 1, yb):
	s = (y - ya) / span; h00, h10, h01, h11 = 2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2
	L[y] = h00 * L[ya] + h10 * span * ma + h01 * L[yb] + h11 * span * mb
K = {y: kerb(y) for y in range(TOP, END + 1)}
K = {y: sorted(K[v] for v in (y - 1, y, y + 1) if v in K)[1 if TOP < y < END else 0] for y in K}  # no one-row notches
# The paving hands over to the path's cream across the road's whole width, along the road (x + y), a little past the mid-road lamp.
fade = lambda x, y: (lambda s: s * s * (3 - 2 * s))(clamp((x + y + 1 - FADE[0]) / (FADE[1] - FADE[0])))
# The shore: the base's own (the first water px of a row) to BANK and from LAST, and between them one Hermite curve in
# place of the levee's squared corner, where the kerb lamp stood in the water: up to 2.5 px of the corner go to water, and
# up to 1.5 px of path are added below it.
water = {y: next(x for x in range(K[y], 1540) if at(x, y)[0] < 100) for y in K}
def shore(y):
	n = LAST - BANK; s = (y - BANK) / n
	return (2 * s ** 3 - 3 * s ** 2 + 1) * water[BANK] + (s ** 3 - 2 * s ** 2 + s) * n * SLOPES[0] + (-2 * s ** 3 + 3 * s ** 2) * water[LAST] + (s ** 3 - s ** 2) * n * SLOPES[1]
S = {y: shore(y) if BANK < y < LAST else water[y] for y in K}
R = {y: S[y] - 1.0 if BANK < y <= LAST else K[y] for y in K}  # the cream's right edge: the kerb, or the new bank's pale rim
# The road narrows evenly from its width at WIDEN to the path's at LAST: its lawn edge moves in where the base's is wider.
wide = lambda y: (R[WIDEN] - L[WIDEN]) + (R[LAST] - L[LAST] - R[WIDEN] + L[WIDEN]) * (y - WIDEN) / (LAST - WIDEN)
N = {y: max(L[y], R[y] - wide(y)) if WIDEN < y < LAST else L[y] for y in K}
L = {y: sum(N[v] for v in range(y - 2, y + 3) if v in N) / sum(1 for v in range(y - 2, y + 3) if v in N) if WIDEN < y < LAST else N[y] for y in N}

def cover(poly, Z=8):
	"""How much of each tile px a polygon in master px covers, 0 to 255, drawn Z times the size and box-filtered down."""
	m = Image.new('L', (w * Z, h * Z), 0)
	ImageDraw.Draw(m).polygon([((x - x0) * Z, (y - y0) * Z) for x, y in poly], fill=255)
	return m.resize((w, h), Image.BOX).load()
rows = range(TOP, END + 1)
cream = cover([(L[y], y + 0.5) for y in rows] + [(R[y], y + 0.5) for y in reversed(rows)])
new = range(BANK, LAST + 1); rim = cover([(R[y], y + 0.5) for y in new] + [(S[y], y + 0.5) for y in reversed(new)])
grass = cover([(1470, TOP + 0.5)] + [(L[y], y + 0.5) for y in rows] + [(1511.5, END + 0.5), (1479.5, 262), (1470, 262)])  # its left side runs 2 px clear of the smear, short of the pond path's trees

# The round tree, keyed out of the base: its crown by how far below the lawn's red a px is, its trunk by column.
tx0, ty0, tx1, ty1 = TREE; sprite = Image.new('RGBA', (tx1 - tx0, ty1 - ty0), (0, 0, 0, 0)); sp = sprite.load()
for y in range(ty0, ty1):
	for x in range(tx0, tx1):
		c = at(x, y); crown = y <= 257 and c[2] < 110; trunk = y > 257 and abs(x - FOOT[0]) <= 1
		if crown or trunk: sp[x - tx0, y - ty0] = (*c, round(255 * clamp((152 - c[0]) / 36)))

# Lawn: each row's own tone, the median of the lawn px the base has in it, or the row above's.
tone = (187, 205, 76)
for y in range(ty0, END + 1):
	run = sorted(at(x, y) for x in range(1474, 1524) if lawn(at(x, y)))
	if len(run) >= 4: tone = run[len(run) // 2]
	for x in range(1474, 1534):
		i, j = x - x0, y - y0; c = at(x, y)
		if y < TOP:  # round the tree: its crown, its halo and nothing of the road
			if x < tx1 and c[2] < 110 and not lawn(c): px[i, j] = tone
			continue
		g, k, e, f = grass[i, j] / 255, cream[i, j] / 255, rim[i, j] / 255, fade(x, y)
		out = at(1531, y) if BANK < y <= LAST and R[y] - 2 <= x <= 1529 else c  # the row's own water under the new shore, over the old corner and the kerb lamp
		if K[y] <= x < water[y] and y <= BANK: out = mix(mix(RIM, at(water[y] + 1, y), clamp((c[0] - 25) / 185)), c, f)  # the kerb, to the path's pale rim
		if k: out = mix(mix(CREAM, c, f) if paved(c) or not f else CREAM, out, k)  # before the fade, the base's own px: the mid-road lamp
		if e: out = mix(RIM, out, e)
		if g and not (g == 1 and lawn(c)): out = mix(tone, out, g)
		px[i, j] = out

# The two trees, each on a small shadow.
for dx, dy in ((0, 0), SECOND):
	fx, fy = FOOT[0] + dx, FOOT[1] + dy
	for y in range(fy - 2, fy + 3):
		for x in range(fx - 3, fx + 8):
			k = clamp(1.4 - (((x - fx - 2.5) / 4.2) ** 2 + ((y - fy - 0.2) / 1.7) ** 2) ** 0.5 * 1.4) * 0.75
			if k and lawn(px[x - x0, y - y0]): px[x - x0, y - y0] = mix(SHADOW, px[x - x0, y - y0], k)
	tile.paste(sprite, (tx0 + dx - x0, ty0 + dy - y0), sprite)

tile.save(f'{D}/tiles/t-levee-model.png')
print('wrote tiles/t-levee-model.png; lawn edge', {y: round(L[y], 1) for y in (258, 266, 274, 282, 290)}, 'kerb', {y: K[y] for y in (262, 270, 277, 284)})
