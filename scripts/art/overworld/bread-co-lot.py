#!/usr/bin/env python3
"""Relay the ground round the overworld's St. Louis Bread Co. (round twenty-one, the `breadcolot` tile; Joe, 2026-10-01).

  python3 scripts/art/overworld/bread-co-lot.py     after tiles.py prepare; writes tiles/t-breadcolot-model.png, then tiles.py stitch

Round twenty cleared the lot to paving by hand, which left the paving cut out beside the canopy on the west and a path up
to the bushes on the east. Here the lawn west of the building is carried right to the patio and the building, down to one
straight edge that runs with the front wall (dy/dx 0.138) from the old lawn edge at (355.5, 502.4) to the patio's corner,
and the paving below that edge is relaid flat; the lawn east of it is carried left to the side wall and the corner bush,
over the path, to one straight edge from the bushes' foot (411.3, 515) to the lawn's own corner (413.6, 520.6). A row's
lawn takes the tone of the lawn already in that row, which is not one tone. Under the building's decal the paint is
never seen; it is there so that no blurred edge of the native building shows round the decal. The grey lot west of the
paving and its edge keep their pixels, as does anything green east of the building (the tree). The cream strip behind the building's east corner, up to the road's sidewalk, is left as it is.
"""
import json, os
from PIL import Image, ImageDraw
D = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'art', 'sources', 'overworld-fix'))
spec = json.load(open(f'{D}/rounds/round-21.json')); t = spec['tiles']['breadcolot']; x0, y0, w, h = t['rect']
tile = Image.open(f"{D}/{spec['base']}").convert('RGB').crop((x0, y0, x0 + w, y0 + h)); px = tile.load()
at = lambda x, y: px[x - x0, y - y0]

PAVING = (253, 240, 194)  # the base's median paving in front of the building
lawn = lambda c: c[1] > 150 and c[1] > c[0] + 15 and c[2] < 110
green = lambda c: c[1] > c[0] + 15 and c[2] < 120
grey = lambda c: abs(c[0] - c[1]) < 18 and abs(c[1] - c[2]) < 25 and 120 < c[0] < 225
edge = lambda x: 502.4 + 0.138 * (x - 355.5)  # the west lawn's foot

def cover(poly, Z=8):
	"""How much of each tile px a polygon in master px covers, 0 to 255, drawn Z times the size and box-filtered down."""
	m = Image.new('L', (w * Z, h * Z), 0)
	ImageDraw.Draw(m).polygon([((x - x0) * Z, (y - y0) * Z) for x, y in poly], fill=255)
	return m.resize((w, h), Image.BOX).load()
mix = lambda a, b, k: tuple(round(a[i] * k + b[i] * (1 - k)) for i in range(3))
def tone_of(y, xs, was):
	"""A row's lawn tone: the median of the lawn px in a stretch that is lawn alone, or the row above's where it is not."""
	run = sorted(at(x, y) for x in xs if lawn(at(x, y)))
	return run[len(run) // 2] if len(run) == len(xs) else was

# West: each row's lawn tone is read at x 356 to 359, clear of the building.
west = cover([(355, 486), (374, 486), (374, edge(374)), (355, edge(355))])
tone = None
for y in range(486, 509):
	tone = tone_of(y, range(356, 360), tone)
	for x in range(354, 374):
		k = west[x - x0, y - y0] / 255
		near_lot = x < 361 and any(grey(at(x + i, y + j)) for i in (-1, 0, 1) for j in (-1, 0, 1))
		if x < 355 or near_lot or (k == 1 and lawn(at(x, y))): continue
		# Above the edge, lawn; below it, flat paving wherever the old paving or the old building's blur was.
		below = PAVING if y >= edge(x) - 1 and not lawn(at(x, y)) or k < 1 else at(x, y)
		if k > 0 or y >= edge(x): px[x - x0, y - y0] = mix(tone, below, k)

# East: each row's lawn tone is read at x 427 to 431, clear of the building and the tree's trunk. Over the path the lawn
# goes everywhere; beside the canopy's tip, above it, only where nothing green stands.
east = cover([(411.3, 506), (419.5, 506), (419.5, 493), (426, 493), (426, 512), (418, 518.5), (413.6, 520.6), (411.3, 515)])
tone = (176, 208, 58)
for y in range(493, 522):
	tone = tone_of(y, range(427, 432), tone)
	for x in range(411, 426):
		k = east[x - x0, y - y0] / 255
		if k == 0 or (y < 506 and green(at(x, y))): continue
		px[x - x0, y - y0] = mix(tone, at(x, y), k)

tile.save(f'{D}/tiles/t-breadcolot-model.png'); print('wrote tiles/t-breadcolot-model.png')
