#!/usr/bin/env python3
"""The overworld Bread Co.'s parapet and sign, by construction (Joe, 2026-10-01).

Codex drew the building with a low parapet and a blank olive panel (art/sources/overworld-fix/bread-co-building-drawn.png,
round twenty's attempt a cut out along its outline). The real logo Joe supplied (bread-co-logo.webp, Panera's trademark,
shown as the client's own sign) is far less wide than that panel, so the parapet is raised to take it: every column of
the drawing is split at the canopy's top edge, RAISE rows of the wall's own brick are let in there, and the roof and its
pale coping ride up whole. The olive panels are painted out in brick, and the logo's script, mark and oval, cropped from
their panel, go on a sage board set into the front wall between the coping and the canopy, sheared to the wall's slope.

    python3 scripts/art/overworld/bread-co-sign.py     # writes art/sources/overworld-fix/bread-co-building.png

and prints the decal's height and centre for decals.json, the drawing's foot staying where round twenty put it. Last, the
drawing's cream outline takes the colour of the ground under it, read from the native master, so run it after a round
that changes the ground there. Then scripts/art/overworld/install-master.sh. All measures are the drawing's own px (480 x 260, 6.99 a native px).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

FIX = Path(__file__).resolve().parents[3] / 'art/sources/overworld-fix'
RAISE = 34
CORNER = 372  # the front wall meets the side wall here
SAGE, RIM = (202, 205, 186), (160, 166, 142)
BOARD = {'cx': 224, 'w': 236, 'h': 62}
# Decals.json's placement of the drawing before it was raised: its height and centre in native px.
WAS = {'height': 37.18, 'center': (393.46, 497.16)}

# Measured on the drawing: the canopy's top edge and the coping's foot, under the front wall and under the side wall.
canopy = lambda x: 85 + 0.131 * (x - 80) if x <= CORNER else 123 - 0.483 * (x - CORNER)
coping = lambda x: 43 + 0.114 * (x - 80) if x <= CORNER else 72 - 0.45 * (x - CORNER)

src = Image.open(FIX / 'bread-co-building-drawn.png').convert('RGBA')
W, H = src.size
px = src.load()

# The wall's brick by column: the mean of the five rows under the coping, clear of the panels, smoothed along the wall so
# that a column's own noise doesn't draw a stripe down the rows let in.
def brick_of(x):
	rows = [px[x, round(coping(x)) + d] for d in range(3, 8)]
	return tuple(sum(p[i] for p in rows) / len(rows) for i in range(3))
raw = {x: brick_of(x) for x in range(76, CORNER + 1)}
# The side wall is in shade and its panel leaves little brick: one tone for all of it, read beside the corner.
side = [px[x, y] for x in range(CORNER + 3, CORNER + 9) for y in range(round(coping(x)) + 8, round(canopy(x)) - 4)]
raw.update({x: tuple(sum(p[i] for p in side) / len(side) for i in range(3)) for x in range(CORNER + 1, 448)})
def brick(x):
	near = [raw[n] for n in range(x - 6, x + 7) if n in raw and (n <= CORNER) == (x <= CORNER)]
	return tuple(round(sum(p[i] for p in near) / len(near)) for i in range(3)) + (255,)

# The olive panels, grown by two px to take their rims, become that brick.
olive = Image.new('L', (W, H), 0)
for x in range(76, 448):
	for y in range(round(coping(x)) + 2, round(canopy(x))):
		r, g, b, a = px[x, y]
		if a > 128 and g > r + 5 and b < 100: olive.putpixel((x, y), 255)
olive = olive.filter(ImageFilter.MaxFilter(5)).load()
for x in range(76, 448):
	fill = brick(x)
	for y in range(round(coping(x)) + 2, round(canopy(x)) - 1):
		if olive[x, y]: px[x, y] = fill

# Raise the parapet: under a wall the new rows are its brick; elsewhere they are empty sky.
out = Image.new('RGBA', (W, H + RAISE), (0, 0, 0, 0))
for x in range(W):
	wall = 76 <= x < 448
	split = round(canopy(x)) - 1 if wall else 0
	col = src.crop((x, 0, x + 1, H))
	out.paste(col.crop((0, 0, 1, split)), (x, 0))
	if wall: ImageDraw.Draw(out).line([(x, split), (x, split + RAISE - 1)], fill=brick(x) if 80 <= x < 444 else px[x, split - 2])
	out.paste(col.crop((0, split, 1, H)), (x, split + RAISE))

# The sign: the logo's content on a sage board with a darker rim, drawn upright at four times the size and sheared.
logo = Image.open(FIX / 'bread-co-logo.webp').convert('RGB').crop((50, 44, 752, 284))
lp = logo.load()
for y in range(logo.height):
	for x in range(logo.width):
		if sum(abs(lp[x, y][i] - SAGE[i]) for i in range(3)) < 40: lp[x, y] = SAGE
S = 4
bw, bh = BOARD['w'] * S, BOARD['h'] * S
board = Image.new('RGBA', (bw, bh), RIM + (255,))
ImageDraw.Draw(board).rectangle([S * 1.5, S * 1.5, bw - S * 1.5 - 1, bh - S * 1.5 - 1], fill=SAGE + (255,))
lh = bh - 4 * S
lw = round(logo.width * lh / logo.height)
board.paste(logo.resize((lw, lh), Image.LANCZOS), ((bw - lw) // 2, 2 * S))
shear = (0.114 + 0.131) / 2
tall = round(bh + shear * bw)
board = board.transform((bw, tall), Image.AFFINE, (1, 0, 0, -shear, 1, 0), Image.BICUBIC).resize((BOARD['w'], round(tall / S)), Image.LANCZOS)
left = BOARD['cx'] - BOARD['w'] // 2
face = canopy(BOARD['cx']) + RAISE - coping(BOARD['cx'])
top = coping(BOARD['cx']) + (face - BOARD['h']) / 2 - shear * BOARD['w'] / 2
out.alpha_composite(board, (left, round(top)))

# The drawing's cream outline, which reads as a white cut-out on the lawn (Joe, 2026-10-01): every cream px within three
# of the cut-out's edge, the roof's coping apart, takes the colour of the ground it stands on in the native master, as
# round twenty-one laid it (bread-co-lot.py): the lawn west of the building above its straight edge, the lawn east of it
# from the canopy's tip down, and the paving in front. A lawn px takes its row's tone, read two native px outward.
k = WAS['height'] / H
height = WAS['height'] + RAISE * k
left, top = WAS['center'][0] - W * k / 2, WAS['center'][1] - RAISE * k / 2 - height / 2
native = Image.open(FIX / 'stitched.png').convert('RGB')
PAVING, LAWN = (253, 240, 194), (172, 203, 58)
is_lawn = lambda c: c[1] > 150 and c[1] > c[0] + 15 and c[2] < 110
def ground(x, y):
	nx, ny = left + x * k, top + y * k
	west = nx < 374 and ny < 502.4 + 0.138 * (nx - 355.5)
	east = nx > 411.3 and ny >= 493 and (ny < 515 or nx > 411.3 + (ny - 515) * 2.3 / 5.6)
	if not (west or east): return PAVING if ny > 500 else None  # behind the east corner the cream strip stays, outline and all
	c = native.getpixel((int(nx) + (-2 if west else 2), int(ny)))
	return c if is_lawn(c) else LAWN
op = out.load()
edge_of = out.getchannel('A').point(lambda a: 255 if a < 128 else 0)
near = edge_of.filter(ImageFilter.MaxFilter(7)).load()
def cream(x, y):
	r, g, b, a = op[x, y]
	return a and r > 215 and g > 205 and b > 150 and not (76 <= x < 448 and y <= coping(x) + 1) and not (x < 76 and y < 47)
todo = [(x, y) for y in range(out.height) for x in range(W) if near[x, y] and cream(x, y)]
while todo:
	x, y = todo.pop()
	if not cream(x, y): continue
	c = ground(x, y)
	if not c: continue
	op[x, y] = (*c, op[x, y][3])
	# The lawn runs on through any cream it touches (the paving Codex drew behind the patio and under the canopy's end).
	if c != PAVING: todo += [(x + i, y + j) for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + i < W and 0 <= y + j < out.height]

out.save(FIX / 'bread-co-building.png')
print(f"bread-co-building.png {out.size}: height {height:.2f}, center [{WAS['center'][0]}, {WAS['center'][1] - RAISE * k / 2:.2f}]")
