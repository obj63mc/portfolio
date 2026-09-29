#!/usr/bin/env python3
"""Redraw the Maplewood parking lot's stall lines straight and evenly spaced (overworld round fifteen, the `lot` tile).

  python3 scripts/art/overworld/lot-stripes.py     after tiles.py prepare; writes tiles/t-lot-model.png, then run tiles.py stitch

Inside the tile's polygon, every asphalt or old stripe pixel is relaid as the lot's flat asphalt, then new stall lines are
drawn over those pixels only, so the trees, the roof and the curbs in front of the lot keep their pixels. The lot frame is
measured on the base: the storefront curb y = 0.1913 x + 263.09 (u runs along it) and the lot's side edges, dy/dx -0.49 (v
runs down them). One row of stalls stands on the curb and a double row with a centre line fills the middle of the lot.
"""
import json, os
from PIL import Image, ImageDraw
D = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'art', 'sources', 'overworld-fix'))
spec = json.load(open(f'{D}/rounds/round-15.json')); t = spec['tiles']['lot']; x0, y0, w, h = t['rect']
base = Image.open(f"{D}/{spec['base']}").convert('RGB').crop((x0, y0, x0 + w, y0 + h)); px = base.load()

ASPHALT, STRIPE, WIDTH = (185, 180, 172), (234, 231, 222), 1.2  # the base's median asphalt; a light warm white
LOT = lambda c: max(c) - min(c) < 26 and 165 <= sum(c) / 3 <= 235 and c[2] >= c[0] - 30  # asphalt, stripes and their blends
p = lambda u, v: (190 + u - v - x0, 299.4 + 0.1913 * u + 0.49 * v - y0)  # lot frame -> tile px; u = 0 at x 190 on the curb

area = Image.new('L', (w, h), 0); ImageDraw.Draw(area).polygon([(x - x0, y - y0) for x, y in t['polygons'][0]], fill=255); ap = area.load()
lot = Image.new('L', (w, h), 0); lp = lot.load()
for y in range(h):
    for x in range(w):
        if ap[x, y] and LOT(px[x, y]): lp[x, y] = 255; px[x, y] = ASPHALT

Z = 8; lines = Image.new('L', (w * Z, h * Z), 0); d = ImageDraw.Draw(lines)  # drawn 8x and box-filtered down: anti-aliased
seg = lambda a, b: d.line([tuple(c * Z for c in a), tuple(c * Z for c in b)], fill=255, width=round(WIDTH * Z))
STEP, DEPTH = 15, 12  # stall spacing along the curb and line length down the side edges, both in curb x px
for u in range(6, 255, STEP): seg(p(u, 0), p(u, DEPTH))                         # the row on the storefront curb
for u in range(126, 262, STEP): seg(p(u, 57 - DEPTH), p(u, 57 + DEPTH))         # the double row, whose left end the lawn notch sets
seg(p(126, 57), p(262, 57))                                                    # and its centre line
cover = lines.resize((w, h), Image.BOX)
cover = Image.composite(cover, Image.new('L', (w, h), 0), lot)                 # only on lot pixels: whatever stands in front stays
base.paste(Image.new('RGB', (w, h), STRIPE), (0, 0), cover)
base.save(f'{D}/tiles/t-lot-model.png'); print('wrote tiles/t-lot-model.png,', lot.histogram()[255], 'lot px relaid')
