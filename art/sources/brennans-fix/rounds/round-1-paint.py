"""Round one of the Brennan's master (Codex draft b1), the painted part (the café table is a Codex tile): the five brand
boxes in the humidor get their real logos on their lids, and the plaque on the humidor's crown gets the Scandinavian
Tobacco Group mark, in the wall's perspective.

  SCENE=brennans python3 scripts/art/overworld/tiles.py prepare rounds/round-1.json   (the lid and plaque polygons are written by --spec)
  uv run --with pillow --with numpy python3 rounds/round-1-paint.py [--spec | --preview <out.png>]

--spec writes the painted tiles' mask polygons into rounds/round-1.json; without it the script paints the round's base into
tiles/t-lids-model.png and tiles/t-plaque-model.png, and tiles.py stitch pastes them inside their masks. --preview paints
the current stitched.png into <out.png> instead.

Logos come from art/references/local/brands/ (ignored; the ledger is art/references/locations.json); Punch and La Gloria
Cubana are the marks Joe supplied on 2026-09-28 (punch-new.svg, lgc.png). Each lid is its draft quad (the box leans back on
its easel, so the face is a slight trapezoid): the face is laid out flat at 8x, filled with the draft lid's own ground, then
warped onto the quad and reduced, so its edges are antialiased the way the painted ones are."""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))  # the repo, from rounds/
D = f'{ROOT}/art/sources/brennans-fix'; B = f'{ROOT}/art/references/local/brands'
K = 8  # supersampling

def marks(name, box=None, ink=None):
    """The logo as RGBA marks: its own alpha, or for a boxed logo the distance from the box colour (unmixed). ink recolours them."""
    a = np.asarray(Image.open(f'{B}/{name}.png').convert('RGBA')).astype(np.float32)
    if box is None:
        m = a
    else:
        box = np.array(box, np.float32); dist = np.abs(a[..., :3] - box).max(-1)
        alpha = np.clip(dist / 110, 0, 1) * a[..., 3] / 255
        rgb = (a[..., :3] - (1 - alpha[..., None]) * box) / np.maximum(alpha[..., None], 1e-3)
        m = np.dstack([np.clip(rgb, 0, 255), alpha * 255])
    if ink is not None: m[..., :3] = ink
    im = Image.fromarray(m.astype(np.uint8), 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())

def split(im, gap):
    """Split marks into rows at runs of at least `gap` empty rows."""
    on = (np.asarray(im.getchannel('A')) > 24).any(axis=1); parts, start, empty = [], None, 0
    for i, v in enumerate(list(on) + [False] * gap):
        if v:
            if start is None: start = i
            empty = 0
        elif start is not None:
            empty += 1
            if empty >= gap: parts.append((start, i - empty + 1)); start = None
    rows = [im.crop((0, s, im.width, e)) for s, e in parts]
    return [r.crop(r.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()) for r in rows]

def punch_crest():
    """The new Punch crest without its smallest lettering (REAL FABRICA DE TABACOS, EST. 1840: under 4 px on a lid, it
    would garble in the 4x upscale). Rendered once from punch-new.svg into punch-new-crest.png beside it."""
    out = f'{B}/punch-new-crest.png'
    if not os.path.exists(out):
        svg = open(f'{B}/punch-new.svg').read()
        svg = re.sub(r'<path d="M106\.46 90\.51[^>]*></path>', '', svg)  # the gold path holding only the small lettering
        tmp = f'{B}/.punch-new-crest.svg'; open(tmp, 'w').write(svg)
        subprocess.run(['magick', '-density', '600', '-background', 'none', tmp, '-resize', '2000x', out], check=True); os.remove(tmp)
    return marks('punch-new-crest')

def stack(parts, w, h, gap=0.1, widths=None, bold=0):
    """Lay parts out top to bottom, centred, in a w x h box (drawn at K x): each as wide as its share of w (widths, 0..1), the
    whole scaled to fit. bold thickens one-colour parts by that many supersampled px a side (per part, or one value)."""
    widths = widths or [1] * len(parts); bolds = bold if isinstance(bold, list) else [bold] * len(parts)
    sized = [(p, ww * w, ww * w * p.height / p.width, b) for p, ww, b in zip(parts, widths, bolds)]
    total = sum(s[2] for s in sized) + gap * h * (len(parts) - 1)
    k = min(1, h / total, w / max(s[1] for s in sized)); out = Image.new('RGBA', (round(w * K), round(h * K)), (0, 0, 0, 0))
    y = (h - total * k) / 2
    for p, pw, ph, b in sized:
        pw, ph = pw * k, ph * k
        q = p.convert('RGBa').resize((max(1, round(pw * K)), max(1, round(ph * K))), Image.LANCZOS).convert('RGBA')
        if b:
            ink = tuple(int(v) for v in np.median(np.asarray(p)[np.asarray(p)[..., 3] > 200][:, :3], axis=0))
            q = Image.merge('RGBA', [*Image.new('RGB', q.size, ink).split(), q.getchannel('A').filter(ImageFilter.MaxFilter(2 * b + 1))])
        out.alpha_composite(q, (round((w - pw) / 2 * K), round(y * K))); y += ph + gap * h * k
    return out

def coeffs(src, dst):
    """PIL perspective coefficients mapping output points dst to input points src."""
    A = []
    for (u, v), (x, y) in zip(src, dst):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
    return np.linalg.solve(np.array(A, float), np.array(src, float).reshape(8)).tolist()

# The five lids, left to right (native px, measured on draft b1: Cohiba, Partagas and La Gloria Cubana fitted to the face's
# pixels, Macanudo's and Punch's cedar read by eye, too close to the lit shelf to fit). Each: the face quad (TL, TR, BR, BL),
# where to sample its ground, and a face(w, h, ground) that returns the flat face at K x.
def ground_of(img, quad, inset=0.12):
    """The median colour of the lid near its left and right edges, clear of the old logo."""
    a = np.asarray(img.convert('RGB')).astype(np.float32); (x0, y0), (x1, _), (x2, y2), (x3, _) = quad
    ys = range(round(y0 + 0.25 * (y2 - y0)), round(y0 + 0.75 * (y2 - y0)))
    px = [a[y, round(x0 + (x3 - x0) * (y - y0) / (y2 - y0) + 3)] for y in ys] + [a[y, round(x1 + (x2 - x1) * (y - y0) / (y2 - y0) - 3)] for y in ys]
    return tuple(int(v) for v in np.median(px, axis=0))

def flat(w, h, ground, art, pad):
    face = Image.new('RGBA', (round(w * K), round(h * K)), ground + (255,))
    face.alpha_composite(art(w - 2 * pad[0], h - 2 * pad[1]), (round(pad[0] * K), round(pad[1] * K)))
    return face

def cohiba_mark():
    """The Cohiba wordmark Joe supplied (cohiba-new.svg): its letters take the page's currentColor, drawn white here as on the
    black lacquered boxes, with the red O. Rendered once into cohiba-new.png beside it."""
    out = f'{B}/cohiba-new.png'
    if not os.path.exists(out):
        svg = open(f'{B}/cohiba-new.svg').read().replace(' fill="none"', '').replace('fill="currentColor"', 'fill="#FFFFFF"')
        svg = svg.replace(' clip-path="url(#clip0_1071_885)"', '')  # the clip is the whole canvas; ImageMagick's renderer drops clipped paths
        tmp = f'{B}/.cohiba-new.svg'; open(tmp, 'w').write(svg)
        subprocess.run(['magick', '-density', '1200', '-background', 'none', tmp, '-resize', '2000x', f'PNG32:{out}'], check=True); os.remove(tmp)
    return marks('cohiba-new')

def lgc_mark():
    """La Gloria Cubana's emblem (lgc.png, Joe's file) with its ring lettering reset larger. On a lid the logo's own letters are
    about 5 px tall and the 4x upscale turns them into LA OLODIA CUBANS, so they, and the two thin rims either side of them, are
    cleared to the band's yellow, and LA GLORIA CUBANA is set along the arc in Futura Condensed ExtraBold across the band's
    full width (caps about 7 px on the lid), in the logo's black. As on the logo, LA ends before the feather and GLORIA CUBANA
    starts after it; the lady's feather, cape and hand go back over the band."""
    a = np.asarray(Image.open(f'{B}/lgc.png').convert('RGBA').resize((1024, 1024), Image.LANCZOS)).astype(np.int16).copy()
    H, W = a.shape[:2]; c = 512; yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot(xx - c, yy - c); rgb = a[..., :3]
    yellow = (rgb[..., 0] > 190) & (rgb[..., 1] > 170) & (rgb[..., 2] < 140)
    dark = (rgb.max(2) < 120) & (a[..., 3] > 128)
    blend = (rgb[..., 2] < 45) & (np.abs(rgb[..., 1] - (31 + (rgb[..., 0] - 35) * 0.936)) < 28)  # a letter's antialiased edge on the yellow
    figure = ~yellow & ~dark & ~blend & (a[..., 3] > 128)  # red, skin, white, hair: the lady, her feather and cape
    near_fig = np.asarray(Image.fromarray((figure * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    # At 512 px the ring runs: the white disc's rim (r 178-181), yellow, a thin rim (188-191), the letters (200-227), a thin rim
    # (239-241), yellow, the thick outer rim (248-256). The new caps use the band from r 186 to 243.
    band_in, band_out = 2 * 186, 2 * 243
    a[(dark | blend) & (r > band_in - 2) & (r < band_out + 2) & ~near_fig, :3] = np.median(rgb[yellow & (r > band_in) & (r < band_out)], axis=0)
    over = near_fig & ~yellow & (r > band_in - 8) & (r < band_out + 8); top = a.copy()
    F = '/System/Library/Fonts/Supplemental/Futura.ttc'; cap, track = 0.84, 0.02
    probe = ImageFont.truetype(F, 100, index=4); h = probe.getbbox('H')[3] - probe.getbbox('H')[1]
    size = round(100 * cap * (band_out - band_in) / h); font = ImageFont.truetype(F, size, index=4)
    top_h, capH = font.getbbox('H')[1], font.getbbox('H')[3] - font.getbbox('H')[1]; rm = (band_in + band_out) / 2
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    def run(text, theta):  # set text clockwise along the arc from its left end at theta (radians, counter-clockwise from the right)
        for ch in text:
            mid = theta - font.getlength(ch) / 2 / rm
            if ch != ' ':
                g = Image.new('RGBA', (size * 2, size * 2), (0, 0, 0, 0)); bb = font.getbbox(ch)
                ImageDraw.Draw(g).text((size - (bb[0] + bb[2]) / 2, size - capH / 2 - top_h), ch, font=font, fill=(35, 31, 32, 255))
                layer.alpha_composite(g.rotate(np.degrees(mid) - 90, resample=Image.BICUBIC), (round(c + rm * np.cos(mid) - size), round(c - rm * np.sin(mid) - size)))
            theta -= (font.getlength(ch) + track * size) / rm
    arc = lambda text: (sum(font.getlength(ch) + track * size for ch in text) - track * size) / rm
    run('LA', np.radians(148) + arc('LA')); run('GLORIA CUBANA', np.radians(122))  # the feather crosses the band at 126-140 degrees
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA'); out.alpha_composite(layer)
    o = np.asarray(out).copy(); o[over] = np.clip(top[over], 0, 255).astype(np.uint8); out = Image.fromarray(o, 'RGBA')
    return out.crop(out.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())

mac = split(marks('macanudo'), 12)            # the crest, MACANUDO, MONTEGO Y CIA (left off: too small)
parta = split(marks('partagas', (28, 28, 28)), 12)  # the crowned shields, PARTAGAS, Y NADA MAS (left off)
LIDS = [
 ('cohiba', [[326, 363], [432, 364], [442, 454], [334, 460]], lambda w, h, g: flat(w, h, g, lambda iw, ih: stack([cohiba_mark()], iw, ih), (9, 10))),
 ('macanudo', [[486, 365], [587, 368], [597, 455], [494, 456]], lambda w, h, g: flat(w, h, g, lambda iw, ih: stack(mac[:2], iw, ih, 0.08, [0.62, 0.9], [0, 1]), (6, 7))),
 ('partagas', [[639, 371], [733, 373], [744, 456], [646, 460]], lambda w, h, g: flat(w, h, g, lambda iw, ih: stack(parta[:2], iw, ih, 0.1, [0.9, 0.78], [0, 1]), (7, 8))),
 ('lgc', [[786, 376], [877, 378], [889, 455], [794, 458]], lambda w, h, g: flat(w, h, g, lambda iw, ih: stack([lgc_mark()], iw, ih), (3, 2))),
 ('punch', [[931, 379], [1010, 380], [1022, 456], [944, 457]], lambda w, h, g: flat(w, h, g, lambda iw, ih: stack([punch_crest()], iw, ih), (3, 4))),
]

# The plaque on the humidor's crown keeps the draft's frame, drawn in the wall's perspective (the humidor wall recedes a
# little to the right, so the plaque's top and bottom slope down that way, as the crown does). Its face is repainted like a
# lid, warped onto the draft face's quad: the lion mark (its red base bar included) over the wordmark.
PLAQUE = [[584, 46], [801, 68], [801, 171], [584, 154]]  # the face quad, fitted to its pixels
lion = marks('stg', (255, 255, 255))
wordmark = marks('stg-wordmark', (28, 28, 28), ink=(58, 58, 62))
FACES = LIDS + [('plaque', PLAQUE, lambda w, h, g: flat(w, h, g, lambda iw, ih: stack([lion, wordmark], iw, ih, 0.08, [0.46, 1], [0, 1]), (11, 7)))]

def paint(img):
    out = img.convert('RGB').copy()
    for name, quad, face in FACES:
        q = np.array(quad, float); w = (np.hypot(*(q[1] - q[0])) + np.hypot(*(q[2] - q[3]))) / 2; h = (np.hypot(*(q[3] - q[0])) + np.hypot(*(q[2] - q[1]))) / 2
        art = face(w, h, ground_of(img, quad))
        x0, y0 = np.floor(q.min(0)).astype(int) - 1; x1, y1 = np.ceil(q.max(0)).astype(int) + 2
        src = [(0, 0), (art.width, 0), (art.width, art.height), (0, art.height)]
        dst = [((px - x0) * K, (py - y0) * K) for px, py in quad]
        warped = art.transform(((x1 - x0) * K, (y1 - y0) * K), Image.PERSPECTIVE, coeffs(src, dst), Image.BICUBIC)
        base = out.crop((x0, y0, x1, y1)).convert('RGBA'); base.alpha_composite(warped.resize((x1 - x0, y1 - y0), Image.BOX))
        out.paste(base.convert('RGB'), (x0, y0))
    return out

def polygons():
    """The round's painted mask polygons: each lid quad and the plaque face grown by a pixel."""
    grow = lambda quad: [[round(x + (1 if x > np.mean([p[0] for p in quad]) else -1)), round(y + (1 if y > np.mean([p[1] for p in quad]) else -1))] for x, y in quad]
    return {'lids': [grow(q) for _, q, _ in LIDS], 'plaque': [grow(PLAQUE)]}

if __name__ == '__main__':
    if '--spec' in sys.argv:
        p = f'{D}/rounds/round-1.json'; s = json.load(open(p))
        for name, polys in polygons().items(): s['tiles'][name]['polygons'] = polys
        json.dump(s, open(p, 'w'), indent=1); open(p, 'a').write('\n'); sys.exit()
    if '--preview' in sys.argv:
        paint(Image.open(f'{D}/stitched.png')).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    spec = json.load(open(f'{D}/rounds/round-1.json')); painted = paint(Image.open(f"{D}/{spec['base']}"))
    for name in polygons():
        x, y, w, h = spec['tiles'][name]['rect']; painted.crop((x, y, x + w, y + h)).save(f'{D}/tiles/t-{name}-model.png')
