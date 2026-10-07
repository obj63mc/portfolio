#!/usr/bin/env python3
"""The MIDTOWN and BELLEVILLE district signs, relettered (round twenty-two; Joe, 2026-10-07).

The two smallest painted boards: at 15 native px their lettering came out of the 4x upscale uneven, as FOREST PARK's did.

  tiles   after tiles.py prepare: writes tiles/t-midtown-model.png and tiles/t-belleville-model.png, the round's two
          tiles drawn by hand. Each board's whole front face (the tile's polygon in rounds/round-22.json: TL TR BR BL,
          under its top edge, between its ends, down behind the bushes) is relaid as the MAPLEWOOD and CENTRAL WEST
          END boards' wood: their flat red-brown, faintly streaked along the board, two thin plank seams and a nail
          head inside each top corner. Bush pixels keep theirs. A part repaint, the lettering's quad alone, showed
          its edges in the upscale.
  decals  writes art/sources/overworld-fix/<id>-sign.svg: the name alone, in Barlow Condensed 700 (the site's headline
          face, SIL OFL) as white outlines sheared with the board's slope, in native px (the viewBox is the master's
          own coordinates). One flat filled path, since ImageMagick's SVG renderer ignores strokes and transforms.

    tiles.py prepare rounds/round-22.json
    uv run --with fonttools --with pillow scripts/art/overworld/district-signs.py
    tiles.py stitch && scripts/art/overworld/install-master.sh twenty-two "<note>"

It prints each decal's decals.json entry. The lettering's measurements are read off the master before this round
(rounds/base-22.png): remeasure if a round redraws a board.
"""
import json
import math
import random
from pathlib import Path
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
FIX = ROOT / 'art/sources/overworld-fix'
FONT = ROOT / 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff'
WHITE = '#ffffff'
TRACK = 0.03  # between letters, of the em
# The MAPLEWOOD and CENTRAL WEST END boards' wood, read off the native master: one flat red-brown, barely streaked,
# crossed by a thin dark plank seam or two that starts at an end and dies away.
WOOD, DARK, NAIL = (133, 68, 31), (92, 43, 18), (222, 178, 120)
GRAIN = 0.03  # the streaks, lighter and darker, of the wood's tone
SEAM = 0.75  # a seam's darkest, of DARK over WOOD
SEAMS = [(0.34, 0, 0.42), (0.52, 0.6, 1)]  # how far down the face, and from where to where along it

# Native px: the old lettering's x extent, its cap line and baseline at the extent's left end, and their slope (dy/dx).
SIGNS = {
	'midtown': {'name': 'MIDTOWN', 'x': (831, 905), 'cap': 382.2, 'base': 397.6, 'slope': 0.104},
	'belleville': {'name': 'BELLEVILLE', 'x': (1804, 1887), 'cap': 483.15, 'base': 498.7, 'slope': 0.119},
}


def paint_out(base, tile, face, text):
	"""The tile's crop of the base with the board's whole front face relaid as the MAPLEWOOD and CENTRAL WEST END boards' wood."""
	x0, y0, w, h = tile
	(xl, tl), (xr, tr), (_, br), (_, bl) = face
	top = lambda x: tl + (tr - tl) * (x - xl) / (xr - xl)
	depth = lambda x: (bl - tl) + ((br - tr) - (bl - tl)) * (x - xl) / (xr - xl)
	bush = lambda c: c[1] >= c[0] - 12 and c[2] < c[1] - 20 and c[0] < 200  # green, or a blend with it
	# Grain: faint streaks along the board, a tone a slope line that swells and fades along it, no two boards' alike.
	rnd = random.Random(text['name'])
	rows = [rnd.uniform(-1, 1) for _ in range(int(max(bl - tl, br - tr)) + 3)]
	swell = [[rnd.uniform(0.2, 1) for _ in range(int(xr - xl) // 16 + 3)] for _ in rows]
	def grain(v, x):
		def row(i):
			j, f = int(x // 16), x % 16 / 16
			return (0.7 * rows[i] + 0.3 * rows[i - 1]) * (swell[i][j] * (1 - f) + swell[i][j + 1] * f)
		i, f = int(v), v - int(v)
		return row(i) * (1 - f) + row(i + 1) * f
	def seam(u, t):
		"""How dark a plank seam makes a px at u down the face and t along it: a thin line that wavers and dies away."""
		k = 0
		for su, t0, t1 in SEAMS:
			if t0 <= t <= t1:
				d = abs((u - su) * depth(xl + t * (xr - xl)) - 0.4 * math.sin(t * 23 + su * 9))  # px off the seam's line
				k = max(k, max(0, 1 - d / 0.8) * min(1, (t - t0) / 0.04, (t1 - t) / 0.12))
		return k
	out = base.crop((x0, y0, x0 + w, y0 + h))
	op = out.load()
	for y in range(h):
		for x in range(w):
			below = y0 + y > text['base'] + text['slope'] * (x0 + x - text['x'][0]) + 2  # the bushes stand below the lettering
			if not xl <= x0 + x + 0.5 <= xr or (below and bush(op[x, y])):
				continue
			u = (y0 + y + 0.5 - top(x0 + x + 0.5)) / depth(x0 + x + 0.5)
			if 0 <= u <= 1:
				g = 1 + GRAIN * grain(u * depth(x0 + x + 0.5), x0 + x - xl)
				k = SEAM * seam(u, (x0 + x + 0.5 - xl) / (xr - xl))
				op[x, y] = tuple(round(min(WOOD[c] * g, 255) * (1 - k) + DARK[c] * k) for c in range(3))
	for nx in (xl + 4.5, xr - 4.5):  # a nail head inside each top corner
		op[int(nx) - x0, int(top(nx) + 4) - y0] = NAIL
	return out


def lettering(font, name, text):
	"""The name's outlines between the old cap line and baseline, centred on the old extent, never wider than it."""
	glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
	em, cap = font['head'].unitsPerEm, font['OS/2'].sCapHeight
	names = [cmap[ord(ch)] for ch in name]
	width = sum(hmtx[g][0] for g in names) + TRACK * em * (len(names) - 1) - hmtx[names[0]][1]  # from the first glyph's ink
	(xa, xb), slope = text['x'], text['slope']
	s = min((text['base'] - text['cap']) / cap, (xb - xa) / width)
	x = (xa + xb) / 2 - s * width / 2 - s * hmtx[names[0]][1]
	# A smaller size keeps the old lettering's centre line.
	mid = (text['cap'] + text['base']) / 2
	pen = SVGPathPen(glyphs, ntos=lambda v: f'{v:.3f}')
	for g in names:
		base = mid + s * cap / 2 + slope * (x - xa)
		glyphs[g].draw(TransformPen(pen, (s, slope * s, 0, -s, x, base)))
		x += s * (hmtx[g][0] + TRACK * em)
	return f'<path d="{pen.getCommands()}" fill="{WHITE}"/>'


def main():
	spec = json.loads((FIX / 'rounds/round-22.json').read_text())
	base = Image.open(FIX / spec['base']).convert('RGB')
	font = TTFont(FONT)
	for sign, d in SIGNS.items():
		t = spec['tiles'][sign]
		quad = t['polygons'][0]
		paint_out(base, t['rect'], quad, d).save(FIX / f'tiles/t-{sign}-model.png')
		x0, y0 = min(p[0] for p in quad), min(p[1] for p in quad)
		w, h = max(p[0] for p in quad) - x0, max(p[1] for p in quad) - y0
		svg = [
			f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h:.2f}" width="{w * 4}" height="{h * 4:.2f}">',
			f"<!-- The {d['name']} sign's lettering, in native overworld px (art/sources/overworld-fix/stitched.png): a decal composited",
			'onto the 4x upscale by install-master.sh (decals.json). Written by scripts/art/overworld/district-signs.py. Barlow',
			"Condensed 700 (SIL OFL, @fontsource/barlow-condensed) as outlines, sheared with the board's slope. -->",
			lettering(font, d['name'], d),
			'</svg>',
		]
		(FIX / f'{sign}-sign.svg').write_text('\n'.join(svg) + '\n')
		print(f'tiles/t-{sign}-model.png, {sign}-sign.svg  center [{x0 + w / 2}, {y0 + h / 2:.3f}]  height {h:.2f}')


if __name__ == '__main__':
	main()
