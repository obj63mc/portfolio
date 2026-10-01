#!/usr/bin/env python3
"""The scan-to-pay stand's QR pattern, drawn by construction as the café's decal (2026-10-01).

  python3 art/sources/bread-co-fix/rounds/qr-decal.py          writes ../scan-qr.svg and ../decals.json
  python3 art/sources/bread-co-fix/rounds/qr-decal.py --check   also rasterizes the SVG and compares it with the modules

The native master (../stitched.png, 1672 x 941) paints a QR code 46 px square on the stand's card: about 2 px a module,
which the 4x upscale turns into blobs. So the card's white under it is redrawn here with a pattern of square modules,
in native px (the viewBox is the master's own coordinates), and install-master.sh composites it onto the 4x upscale.

It is a QR-shaped PATTERN, not a code: the three finder squares, their separators and the two timing lines of a 21 x 21
symbol, the rest filled from a fixed seed. It carries no format information or error correction; OpenCV's QR detector
finds it and decodes nothing from it (2026-10-01; no phone's reader was tried). A stand that scanned would have to lead
somewhere, and where is Joe's to decide.
ImageMagick's SVG renderer draws it (flat filled polygons, baked coordinates, no strokes or transforms).
"""
import json, os, random, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); FIX = os.path.dirname(HERE)
# Measured on stitched.png: the painted code's box, and the card's white panel it sits in (x 1020-1084, y 340-406).
CODE = (1029, 350, 46)          # x, y, side of the painted code, native px
N, QUIET = 21, 2.3              # modules a side; the white margin the decal repaints, in modules
WHITE, BLACK = '#fdfdfd', '#111111'  # the card's own white (253, 253, 253) and the painted code's black

def modules():
    rnd = random.Random(20261001)
    m = [[rnd.random() < 0.5 for _ in range(N)] for _ in range(N)]
    for i in range(N):  # timing lines, alternating from the finder squares
        m[6][i] = m[i][6] = i % 2 == 0
    for oy, ox in ((0, 0), (0, N - 7), (N - 7, 0)):  # finder squares with their one-module white separators
        for y in range(-1, 8):
            for x in range(-1, 8):
                if 0 <= oy + y < N and 0 <= ox + x < N:
                    ring = max(abs(y - 3), abs(x - 3))
                    m[oy + y][ox + x] = ring in (0, 1, 3)
    m[N - 8][8] = True  # the dark module every symbol has
    return m

def svg(m):
    x0, y0, side = CODE; u = side / N; q = QUIET * u
    box = (x0 - q, y0 - q, side + 2 * q)
    p = lambda v: f'{v:.3f}'
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{p(box[0])} {p(box[1])} {p(box[2])} {p(box[2])}" width="{round(box[2] * 16)}" height="{round(box[2] * 16)}">',
           '<!-- The scan-to-pay stand\'s QR pattern, in native bread-co px (art/sources/bread-co-fix/stitched.png): a decal composited',
           'onto the 4x upscale by install-master.sh (decals.json). Written by rounds/qr-decal.py; a pattern, not a scannable code. -->',
           f'<polygon points="{p(box[0])},{p(box[1])} {p(box[0] + box[2])},{p(box[1])} {p(box[0] + box[2])},{p(box[1] + box[2])} {p(box[0])},{p(box[1] + box[2])}" fill="{WHITE}"/>']
    for y, row in enumerate(m):  # one polygon per run of dark modules in a row
        x = 0
        while x < N:
            if not row[x]: x += 1; continue
            e = x
            while e < N and row[e]: e += 1
            ax, ay, bx, by = x0 + x * u, y0 + y * u, x0 + e * u, y0 + (y + 1) * u
            out.append(f'<polygon points="{p(ax)},{p(ay)} {p(bx)},{p(ay)} {p(bx)},{p(by)} {p(ax)},{p(by)}" fill="{BLACK}"/>')
            x = e
    return '\n'.join(out) + '\n</svg>\n', box

if __name__ == '__main__':
    m = modules(); text, box = svg(m)
    open(f'{FIX}/scan-qr.svg', 'w').write(text)
    spec = [{'file': 'scan-qr.svg', 'center': [round(box[0] + box[2] / 2, 2), round(box[1] + box[2] / 2, 2)], 'height': round(box[2], 2), 'shear': 0,
             'note': "The scan-to-pay stand's QR pattern on its card, 2026-10-01: the master's 46 px code, about 2 px a module, came out of the 4x upscale as blobs, so the card's white under it is redrawn with square modules: the three finder squares, timing lines and a seeded field of a 21 x 21 symbol. A pattern, not a code: it has no format information or error correction, and OpenCV's QR detector decodes nothing from it. Drawn in native px (its viewBox is the master's own coordinates) by rounds/qr-decal.py; the card faces the viewer squarely (the painted code's top edge is level), so it is placed unsheared at its viewBox centre."}]
    open(f'{FIX}/decals.json', 'w').write(json.dumps(spec, indent=2, ensure_ascii=False) + '\n')
    print(f"scan-qr.svg: {sum(map(sum, m))} dark modules of {N * N}; panel x {box[0]:.2f}-{box[0] + box[2]:.2f}, y {box[1]:.2f}-{box[1] + box[2]:.2f} native")
    if '--check' in sys.argv:
        from PIL import Image
        import io
        k = 16  # px a native px
        png = subprocess.check_output(['magick', '-background', 'none', '-density', str(72 * k), f'{FIX}/scan-qr.svg', '-resize', f'{round(box[2] * k)}x{round(box[2] * k)}!', 'PNG32:-'])
        im = Image.open(io.BytesIO(png)).convert('RGBA'); px = im.load(); u = CODE[2] / N
        bad = 0
        for y in range(N):
            for x in range(N):
                r, g, b, a = px[round((CODE[0] + (x + .5) * u - box[0]) * k), round((CODE[1] + (y + .5) * u - box[1]) * k)]
                bad += (a < 250) or ((r < 128) != m[y][x])
        corner = px[2, 2]
        assert bad == 0 and corner[3] > 250 and min(corner[:3]) > 245, (bad, corner)
        print(f'check: {im.size[0]} x {im.size[1]} raster, every module centre matches, quiet zone opaque white')
