#!/usr/bin/env python3
"""Exact tile map for fixing the overworld master.

  python3 tiles.py slice    cut base.png into square tiles (tiles/t-<name>.png), the same tiles of marked.png,
                            a repaint mask per tile filled from the red loops (white = repaint) and a prompt per tile
  python3 tiles.py stitch   paste every tiles/t-<name>-out.png back with ImageMagick, only inside its mask, into
                            stitched.png, then prove every pixel outside the masks still equals base.png

Every pixel operation is ImageMagick; this file only decides rectangles and writes masks. No model touches the stitch.
"""
import json, os, subprocess, sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); T = f'{D}/tiles'
BASE, MARKED = f'{D}/base.png', f'{D}/marked.png'
def magick(*args): subprocess.run(['magick', *[str(a) for a in args]], check=True)

# Square 512 windows: columns at 0, 500, 1000, 1471 and rows at 0, 281 cover 1983 x 793 with small overlaps so
# every marked defect fits inside one tile with margin. The lake loop needs the whole lake, so it gets one 3:2 tile.
TILES = [
 {'name': 'c0r0', 'rect': [0, 0, 512, 512],      'loops': [0, 1, 2, 3]},
 {'name': 'c0r1', 'rect': [0, 281, 512, 512],    'loops': []},
 {'name': 'c1r0', 'rect': [500, 0, 512, 512],    'loops': [4], 'extra': [[575, 245, 725, 320]]},
 {'name': 'c1r1', 'rect': [500, 281, 512, 512],  'loops': [5, 6]},
 {'name': 'c2r0', 'rect': [1000, 0, 512, 512],   'loops': [8, 9]},
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
 'c1r1': ["Upper loop, south of the church steps: a cut-off tree stands in front of a small brick house. Remove the tree completely and draw the house whole, with lawn and the path.",
          "Lower loop, north of the lake and south of the big factory: the cluster of trees is blurred and cut. Remove those trees; lawn."],
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

def lake_band(tile):
    """Shore zone 7 to 40 px around the lake in this tile, minus the fixtures that must not move."""
    x, y, w, h = tile['rect']; im = Image.open(BASE).convert('RGB').crop((x, y, x + w, y + h)); W, H = im.size; p = im.load()
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
    outer = filled.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.MaxFilter(41)); inner = filled.filter(ImageFilter.MaxFilter(7))
    band = Image.new('L', (W, H), 0); bp = band.load(); op, ip = outer.load(), inner.load()
    for yy in range(H):
        for xx in range(W):
            if op[xx, yy] and not ip[xx, yy]: bp[xx, yy] = 255
    d = ImageDraw.Draw(band)  # protected: park sign, pavilion and pier, shop, benches, picnic table, lakeside houses
    for r in [(160, 405, 345, 478), (548, 325, 700, 430), (25, 318, 105, 372), (30, 382, 80, 408), (488, 464, 535, 494), (642, 466, 695, 498),
              (710, 452, 768, 508), (135, 232, 335, 292), (348, 228, 422, 272), (480, 256, 520, 300)]: d.rectangle(r, fill=0)
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
        if t.get('band') == 'lake': mask.paste(255, (0, 0), lake_band(t))
        mask.save(f'{T}/t-{n}-mask.png')
        prompt = PRE + '\n'.join(f'{i + 1}. {s}' for i, s in enumerate(FIXES.get(n, []))) if FIXES.get(n) else ''
        if prompt: open(f'{T}/t-{n}-prompt.txt', 'w').write(prompt + '\n')
        table.append({**t, 'repaintPx': mask.histogram()[255], 'edit': bool(prompt)})
        print(n, t['rect'], 'repaint px', mask.histogram()[255])
    json.dump(table, open(f'{D}/tilemap.json', 'w'), indent=1)

def stitch():
    layers = []
    for t in json.load(open(f'{D}/tilemap.json')):
        x, y, w, h = t['rect']; n = t['name']; out = f'{T}/t-{n}-out.png'
        if not os.path.exists(out): print(n, 'no output, base kept'); continue
        layer = f'{T}/.layer-{n}.png'  # the model's pixels, alpha = mask (1 px feather), on a transparent full-size canvas
        magick('-size', '1983x793', 'xc:none', '(', out, '-filter', 'Lanczos', '-resize', f'{w}x{h}!', '(', f'{T}/t-{n}-mask.png', '-blur', '0x0.7', ')',
               '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')', '-geometry', f'+{x}+{y}', '-compose', 'Over', '-composite', layer)
        layers.append(layer); print(n, 'pasted inside its mask')
    magick(BASE, *layers, '-flatten', f'{D}/stitched.png')
    for l in layers: os.remove(l)
    # proof: outside the union of masks, stitched.png equals base.png pixel for pixel
    union = Image.new('L', (1983, 793), 0)
    for t in json.load(open(f'{D}/tilemap.json')):
        x, y, w, h = t['rect']; m = Image.open(f'{T}/t-{n}-mask.png') if False else Image.open(f"{T}/t-{t['name']}-mask.png").convert('L')
        union.paste(255, (x, y), m.filter(ImageFilter.MaxFilter(5)))
    union.save(f'{T}/.union.png')
    magick(BASE, f'{D}/stitched.png', '-compose', 'Difference', '-composite', '-threshold', '0', '(', f'{T}/.union.png', '-negate', ')', '-compose', 'Multiply', '-composite', '-format', '%[fx:mean*w*h]', '-write', 'info:/tmp/ae.txt', 'null:')
    os.remove(f'{T}/.union.png'); print('pixels changed outside the masks:', open('/tmp/ae.txt').read().strip())

if __name__ == '__main__':
    {'slice': slice_tiles, 'stitch': stitch}[sys.argv[1]]()
