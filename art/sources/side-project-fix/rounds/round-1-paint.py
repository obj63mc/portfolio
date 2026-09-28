"""Round one of the Side Project master (Codex draft b1), painted by construction (no model): the ten brand bottles get
their real logos, and the cooler door gets a round Side Project sign with the light-bulb logo.

  SCENE=side-project python3 scripts/art/overworld/tiles.py prepare rounds/round-1.json   (the spec is written by --spec)
  uv run --with pillow --with numpy python3 rounds/round-1-paint.py [--spec | --preview <out.png>]

--spec writes the round's mask polygons into rounds/round-1.json; without it the script paints the round's base into
tiles/t-labels-model.png and tiles/t-sign-model.png, and tiles.py stitch pastes them inside their masks. --preview paints
the current stitched.png into <out.png> instead.

Logos come from art/references/local/brands/ (ignored; the ledger is art/references/locations.json). Each is drawn at 8x
and reduced, so its edges are antialiased the way the painted ones are. A label keeps the draft's rectangle and is filled
flat with its logo's own ground (a boxed logo's box colour, else the draft label's colour); a logo printed straight on the
glass (Grey Goose, RumChata) is drawn on the bottle's own colours, carried down each column from clean glass above or below
the old print."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))  # the repo, from rounds/
D = f'{ROOT}/art/sources/side-project-fix'; B = f'{ROOT}/art/references/local/brands'
K = 8  # supersampling

def marks(name, box=None, ink=None, weight=1.0):
    """The logo as RGBA marks: its own alpha, or for a boxed logo the distance from the box colour. ink recolours the marks;
    weight < 1 thickens hairlines that would fade at label size (alpha ** weight)."""
    a = np.asarray(Image.open(f'{B}/{name}.png').convert('RGBA')).astype(np.float32)
    if box is None:
        m = a
    else:
        box = np.array(box, np.float32); dist = np.abs(a[..., :3] - box).max(-1)
        alpha = np.clip(dist / 110, 0, 1)
        rgb = (a[..., :3] - (1 - alpha[..., None]) * box) / np.maximum(alpha[..., None], 1e-3)  # unmix the antialiasing
        m = np.dstack([np.clip(rgb, 0, 255), alpha * 255])
    if ink is not None: m[..., :3] = ink
    m[..., 3] = 255 * (m[..., 3] / 255) ** weight
    im = Image.fromarray(m.astype(np.uint8), 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())

def split(im, axis, gap):
    """Split marks at runs of at least `gap` empty rows (axis 0) or columns (axis 1)."""
    on = (np.asarray(im.getchannel('A')) > 24).any(axis=1 - axis)
    parts, start, empty = [], None, 0
    for i, v in enumerate(list(on) + [False] * gap):
        if v:
            if start is None: start = i
            empty = 0
        elif start is not None:
            empty += 1
            if empty >= gap: parts.append((start, i - empty + 1)); start = None
    crop = lambda s, e: im.crop((0, s, im.width, e) if axis == 0 else (s, 0, e, im.height))
    return [p.crop(p.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()) for p in (crop(s, e) for s, e in parts)]

def cols(im, spans):
    """Cut marks into column spans (logo px), each trimmed to its marks."""
    return [im.crop((a, 0, b, im.height)).crop(im.crop((a, 0, b, im.height)).getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()) for a, b in spans]

def stack(parts, w, h, gap=0.12, widths=None, bold=0, tall=None):
    """Lay parts out top to bottom in a w x h box (drawn at K x): each as wide as its share of w (widths, 0..1), the whole
    scaled to fit. bold (one value, or one per part) thickens a one-colour part by that many supersampled px a side, so
    small lettering survives the 4x upscale; multi-colour parts (the geese, the flag bars) are left at 0. tall (one per part)
    heightens a part's own letters, a condensed cut of the wordmark where a label is too narrow for it."""
    widths = widths or [1] * len(parts); bolds = bold if isinstance(bold, list) else [bold] * len(parts); tall = tall or [1] * len(parts)
    sized = [(p, ww * w, ww * w * p.height / p.width * t, b) for p, ww, b, t in zip(parts, widths, bolds, tall)]
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

# The ten bottles, left to right as on the shelf (native px, measured on draft b1). Each label: its rect [x0, y0, x1, y1]
# (inclusive of its painted edge), its ground, and its art laid out inside a pad px margin (a function of the inner w, h).
LABELS = []
def label(rect, ground, art, pad=2):
    LABELS.append((rect, ground, art, pad))
bat = split(marks('bacardi', ink=(128, 94, 52)), 0, 30)[0]  # the gold bat emblem, a shade darker so it holds on the cream label
label([251, 420, 295, 479], (246, 238, 214), lambda w, h: stack([bat, marks('bacardi-wordmark')], w, h, 0.16, [0.5, 1]), 3)
na = split(marks('new-amsterdam', (28, 42, 74)), 0, 20)          # the skyline, NEW AMSTERDAM, VODKA
na_words = split(na[1], 1, 25)                                    # NEW | AMSTERDAM (the registered mark falls off: too small)
# Lettering under about 6 px garbles in the 4x upscale, so small words are stacked and thickened, a label may widen to its
# bottle's glass edges, and the smallest line of a logo (VODKA, TEQUILA) is left off.
label([406, 410, 441, 478], (28, 42, 74), lambda w, h: stack([na[0], *na_words], w, h, 0.12, [0.6, 0.5, 1], [0, 2, 1], [1, 1.3, 2.1]))
camarena = split(marks('camarena', (28, 28, 28)), 0, 20)[0]
label([475, 434, 521, 468], (28, 28, 28), lambda w, h: stack([camarena], w, h, bold=2, tall=[1.35]))
bf = cols(marks('barefoot'), [(0, 174), (217, 913)])             # the foot, then the wordmark
label([553, 421, 591, 485], (250, 250, 247), lambda w, h: stack(bf, w, h, 0.16, [0.6, 1], [0, 1]))
label([620, 442, 655, 481], (255, 255, 255), lambda w, h: stack([marks('bud-light', (255, 255, 255))], w, h), 1)
label([691, 452, 728, 484], (28, 28, 28), lambda w, h: stack([marks('ej-brandy', (28, 28, 28))], w, h), 1)
pw = cols(marks('pink-whitney', (28, 28, 28)), [(80, 504), (562, 1358)])  # PINK, WHITNEY (the stars are dropped)
label([765, 430, 800, 465], (28, 28, 28), lambda w, h: stack(pw, w, h, 0.14, [0.72, 1], 1))
label([906, 449, 933, 482], (28, 28, 28), lambda w, h: stack([marks('soonhari', (28, 28, 28))], w, h), 1)

# Logos printed on the glass: the area cleared, the rows to carry each column's clean glass colour from, and the art.
goose = split(marks('grey-goose'), 0, 10)                          # geese, GREY GOOSE, flag bars, VODKA
goose_words = cols(goose[1], [(0, 454), (508, 1168)])             # GREY over GOOSE
PRINTS = [
 ([331, 412, 371, 482], (401, 411), lambda w, h: stack([goose[0], *goose_words, goose[2]], w, h, 0.07, [0.9, 0.72, 0.9, 0.27], [0, 2, 2, 0])),  # to the glass edges: the draft printed small geese there
 ([833, 436, 879, 462], (466, 476), lambda w, h: stack([marks('rumchata')], w, h, bold=1)),
]

# The sign: a round plaque centred on the cooler door, between its top strap hinge and its handle.
SIGN_C, SIGN_R = (1216, 412), 35
SIGN_SHADOW = (2, 3)

def paint(img):
    out = img.convert('RGB').copy()
    for (x0, y0, x1, y1), ground, art, pad in LABELS:
        w, h = x1 - x0 + 1, y1 - y0 + 1
        big = Image.new('RGBA', (w * K, h * K), ground + (255,))
        big.alpha_composite(art(w - 2 * pad, h - 2 * pad), (pad * K, pad * K))
        out.paste(big.convert('RGB').resize((w, h), Image.LANCZOS), (x0, y0))
    a = np.asarray(out).astype(np.float32)
    for (x0, y0, x1, y1), (r0, r1), _ in PRINTS:
        a[y0:y1 + 1, x0:x1 + 1] = np.median(a[r0:r1 + 1, x0:x1 + 1], axis=0)[None]  # each column's clean glass colour
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    for (x0, y0, x1, y1), _, art in PRINTS:
        w, h = x1 - x0 + 1, y1 - y0 + 1
        base = out.crop((x0, y0, x1 + 1, y1 + 1)).convert('RGBA'); base.alpha_composite(art(w - 2, h - 2).resize((w - 2, h - 2), Image.LANCZOS), (1, 1))
        out.paste(base.convert('RGB'), (x0, y0))
    # The sign, drawn at 8x: a soft shadow on the door, the dark rim, the cream face, a thin inner ring and the logo.
    cx, cy = SIGN_C; R = SIGN_R; pad = 8; box = (cx - R - pad, cy - R - pad, cx + R + pad + 1, cy + R + pad + 1)
    bw, bh = box[2] - box[0], box[3] - box[1]
    layer = Image.new('RGBA', (bw * K, bh * K), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    c = lambda dx=0, dy=0, r=R: [((cx - box[0] + dx - r) * K, (cy - box[1] + dy - r) * K), ((cx - box[0] + dx + r) * K, (cy - box[1] + dy + r) * K)]
    d.ellipse(c(*SIGN_SHADOW), fill=(110, 62, 24, 110))
    d.ellipse(c(), fill=(59, 42, 30, 255))
    d.ellipse(c(r=R - 2.5), fill=(247, 239, 220, 255))
    d.ellipse(c(r=R - 4.4), outline=(59, 42, 30, 255), width=round(0.8 * K))
    logo = marks('side-project')
    lw = 1.12 * 2 * (R - 6.5) / (1 + (logo.height / logo.width) ** 2) ** 0.5  # the logo's corners are empty, so it may overhang its box's inscribed size
    art = stack([logo], lw, lw * logo.height / logo.width, bold=1)
    layer.alpha_composite(art, (round((cx - box[0] - lw / 2) * K), round((cy - box[1] - lw * logo.height / logo.width / 2) * K)))
    base = out.crop(box).convert('RGBA'); base.alpha_composite(layer.resize((bw, bh), Image.LANCZOS)); out.paste(base.convert('RGB'), box[:2])
    return out

def polygons():
    """The round's mask polygons: each label rect and print area, and the sign's disc with its shadow."""
    polys = {'labels': [[[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]] for (x0, y0, x1, y1), *_ in LABELS] +
                       [[[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]] for (x0, y0, x1, y1), *_ in PRINTS]}
    cx, cy = SIGN_C; r = SIGN_R + 5
    polys['sign'] = [[[round(cx + 1 + r * np.cos(t)), round(cy + 1.5 + r * np.sin(t))] for t in np.linspace(0, 2 * np.pi, 48, endpoint=False)]]
    return polys

if __name__ == '__main__':
    if '--spec' in sys.argv:
        p = f'{D}/rounds/round-1.json'; s = json.load(open(p))
        for name, polys in polygons().items(): s['tiles'][name]['polygons'] = polys
        json.dump(s, open(p, 'w'), indent=1); open(p, 'a').write('\n'); sys.exit()
    if '--preview' in sys.argv:
        paint(Image.open(f'{D}/stitched.png')).save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    spec = json.load(open(f'{D}/rounds/round-1.json')); painted = paint(Image.open(f"{D}/{spec['base']}"))
    for name, t in spec['tiles'].items():
        x, y, w, h = t['rect']; painted.crop((x, y, x + w, y + h)).save(f'{D}/tiles/t-{name}-model.png')
