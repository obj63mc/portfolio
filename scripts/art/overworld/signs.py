#!/usr/bin/env python3
"""The overworld's two Maplewood signs, drawn by construction, not by a model (Joe, 2026-10-01).

  welcome   the welcome board right of the church steps: an ivory face in the old board's teal frame, on its two
            brown posts, carrying the site's badge (art/sources/brand/icon.png cut to a circle, as the favicon is).
  signpost  the directory board on the lawn left of the steps, in place of the fingerpost: six lettered plaques, one a
            district, in the site's reading order, each 123 x 80 world px so that its link is over 48 x 48 CSS px on a
            phone, which draws the world at 0.6.

Each is flat filled shapes in the style contract's palette and the old signs' own teal, mustard and brown, seen face on
as the fingerpost was, lit from the upper left: a post's right side and a plaque's lower edge are in shade. Drawn at 8
image px a world px and halved, so the source is 4 px a world px, which both delivery sizes are cut down from.

    python3 scripts/art/overworld/signs.py            # writes art/sources/welcome.png and art/sources/signpost.png
    npm run art -- process welcome --force && npm run art -- process signpost --force

The names are the districts' in src/lib/scenes/overworld.ts, west to east, as its signpost lists them: change one there
and here together. `PLAQUES` is the links' own box, `OVERWORLD.signpost.rect`; tests/overworld-geometry.test.ts holds
the two to each other.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
S = 8  # image px a world px while drawing
FONT = ROOT / 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff'

IVORY, IVORY_SHADE = '#fff4d4', '#e6d6a8'
GOLD, GOLD_SHADE = '#ffd34f', '#d9ae48'
SKY, SKY_SHADE = '#87cdd5', '#54b1ae'
TEAL, TEAL_SHADE, TEAL_LIT = '#4e867a', '#3c6c62', '#6daba6'
INK = '#244f55'
POST, POST_SHADE, POST_CAP = '#764529', '#492814', '#854f2a'

# World px. The directory: its whole cut-out, and the six plaques' box inside it, three rows of two.
SIGNPOST = {'x': 1290, 'y': 1134, 'w': 270, 'h': 336}
PLAQUE = {'w': 123, 'h': 80, 'gap': 8}
HEADER, LEGS = 36, 28
NAMES = ['MAPLEWOOD', 'FOREST\nPARK', 'CARONDELET\nPARK', 'CENTRAL\nWEST END', 'MIDTOWN', 'BELLEVILLE']
PLAQUES = {
	'x': SIGNPOST['x'] + PLAQUE['gap'],
	'y': SIGNPOST['y'] + HEADER + PLAQUE['gap'],
	'w': 2 * PLAQUE['w'] + PLAQUE['gap'],
	'h': 3 * PLAQUE['h'] + 2 * PLAQUE['gap'],
}
WELCOME = {'x': 1775, 'y': 1363, 'w': 160, 'h': 114}
SPACING = 0.06  # between a plaque's letters, of their size


def canvas(w, h):
	im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
	return im, ImageDraw.Draw(im)


def box(d, x, y, w, h, fill, r=0):
	d.rounded_rectangle([x * S, y * S, (x + w) * S - 1, (y + h) * S - 1], radius=r * S, fill=fill)


def post(d, x, y, w, h):
	"""A square post: its lit face, its right side in shade and a lighter cap."""
	box(d, x, y, w, h, POST)
	box(d, x + w * 0.62, y, w * 0.38, h, POST_SHADE)
	box(d, x, y, w, 4, POST_CAP)


def lettering(d, text, cx, cy, size, fill, spacing=SPACING):
	"""Capitals centred on (cx, cy), a line to each \\n, tracked a little as a painted sign's are."""
	font = ImageFont.truetype(str(FONT), round(size * S))
	lines = text.split('\n')
	cap = font.getbbox('H')[3] - font.getbbox('H')[1]
	lead = cap * 1.42
	top = cy * S - (cap + lead * (len(lines) - 1)) / 2
	for i, line in enumerate(lines):
		track = size * S * spacing
		width = sum(font.getlength(c) for c in line) + track * (len(line) - 1)
		x = cx * S - width / 2
		for c in line:
			d.text((x, top + lead * i - font.getbbox('H')[1]), c, font=font, fill=fill)
			x += font.getlength(c) + track


def finish(im, w, h, name):
	out = im.resize((w * 4, h * 4), Image.LANCZOS)
	out.save(ROOT / 'art/sources' / f'{name}.png')
	print(name, out.size)


def signpost():
	w, h = SIGNPOST['w'], SIGNPOST['h']
	im, d = canvas(w, h)
	board = h - LEGS
	post(d, 6, 10, 14, h - 10)
	post(d, w - 20, 10, 14, h - 10)
	# The board: dark teal, its lower edge in shade, the header's lettering on it.
	box(d, 0, 0, w, board, TEAL_SHADE, r=10)
	box(d, 0, 0, w, board - 5, INK, r=10)
	lettering(d, 'EXPLORE BARMADDEN', w / 2, HEADER / 2 + 3, 22, IVORY, spacing=0.12)
	fills = [(IVORY, IVORY_SHADE), (GOLD, GOLD_SHADE), (SKY, SKY_SHADE)]
	# One size for all six: the largest at which the longest line clears its plaque's edges by 9 px a side.
	unit = ImageFont.truetype(str(FONT), 100)
	widest = max(sum(unit.getlength(c) for c in line) + 100 * SPACING * (len(line) - 1) for name in NAMES for line in name.split('\n'))
	size = (PLAQUE['w'] - 18) * 100 / widest
	for i, name in enumerate(NAMES):
		col, row = i % 2, i // 2
		x = PLAQUE['gap'] + col * (PLAQUE['w'] + PLAQUE['gap'])
		y = HEADER + PLAQUE['gap'] + row * (PLAQUE['h'] + PLAQUE['gap'])
		face, shade = fills[(row + col) % 3]
		box(d, x, y, PLAQUE['w'], PLAQUE['h'], shade, r=7)
		box(d, x, y, PLAQUE['w'], PLAQUE['h'] - 5, face, r=7)
		lettering(d, name, x + PLAQUE['w'] / 2, y + (PLAQUE['h'] - 5) / 2, size, INK)
	finish(im, w, h, 'signpost')


def welcome():
	w, h = WELCOME['w'], WELCOME['h']
	im, d = canvas(w, h)
	legs, frame = 18, 7
	x0, x1, top, bottom = 9, w - 9, 14, h - legs
	cx, cy, r = w / 2, 50, 50
	post(d, 0, top - 6, 13, h - top + 6)
	post(d, w - 13, top - 6, 13, h - top + 6)

	def board(inset, fill, drop=0):
		# A board with a round crown: a rectangle and the circle that rises out of its top edge.
		box(d, x0 + inset, top + inset + drop, x1 - x0 - 2 * inset, bottom - top - 2 * inset, fill, r=max(1, 6 - inset))
		d.ellipse([(cx - r + inset) * S, (cy - r + inset) * S, (cx + r - inset) * S - 1, (cy + r - inset) * S - 1], fill=fill)

	board(0, TEAL_SHADE)
	board(0, TEAL, drop=-4)
	board(frame, IVORY)
	# The badge: the site's icon cut to a circle, in the middle of the crown's circle.
	size = 76
	badge = Image.open(ROOT / 'art/sources/brand/icon.png').convert('RGBA').resize((size * S, size * S), Image.LANCZOS)
	mask = Image.new('L', badge.size, 0)
	ImageDraw.Draw(mask).ellipse([0, 0, size * S - 1, size * S - 1], fill=255)
	im.paste(badge, (round((cx - size / 2) * S), round((cy - size / 2) * S)), mask)
	finish(im, w, h, 'welcome')


if __name__ == '__main__':
	signpost()
	welcome()
