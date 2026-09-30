"""Round two of the Side Project master, painted by construction (no model): the brand bottles are rearranged on their
shelf, beers first, and two beers join them (Joe, 2026-09-30). Left to right: Bud Light, Sapporo, Anchor, Soonhari, then
Bacardi, Grey Goose, E&J, Camarena, RumChata, Pink Whitney, New Amsterdam. Barefoot leaves the shelf.

  SCENE=side-project python3 scripts/art/overworld/tiles.py prepare rounds/round-2.json
  uv run --with pillow --with numpy python3 rounds/round-2-paint.py [--spec | --manifest | --preview <out.png>]

--spec writes the round's mask polygons into rounds/round-2.json and --manifest moves each bottle's registration in
art/manifest.json (adding Sapporo and Anchor, dropping Barefoot); without either the script paints the round's base into
tiles/t-shelf-model.png, and tiles.py stitch pastes it inside its mask. --preview paints the current base into <out.png>.

Every bottle is cut from the base through its measured matte (art/manifest.json, drawn 8x and reduced) and the wall and
shelf behind all of them relaid, each row interpolated across the bottles from the wall either side; the pendant's cord
that hung onto New Amsterdam's cap goes too. The bottles are pasted back in the new order, evenly spaced, whole pixels
moved, each dropped or raised with the shelf's slope so it stands as far into the shelf top as it did. Sapporo and Anchor
are the Bud Light longneck relabelled: Sapporo's gold star over SAPPORO on black, its foil and cap gold; Anchor's navy
anchor on its yellow. Logos come from art/references/local/brands/ (ignored; the ledger is art/references/locations.json)."""
import importlib.util, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
spec1 = importlib.util.spec_from_file_location('round1', f'{HERE}/round-1-paint.py'); r1 = importlib.util.module_from_spec(spec1); spec1.loader.exec_module(r1)
ROOT, D, K, marks, split, stack = r1.ROOT, r1.D, r1.K, r1.marks, r1.split, r1.stack

MANIFEST = f'{ROOT}/art/manifest.json'
BEFORE = '8369f0a'  # the commit whose manifest holds round one's mattes, which --manifest moves
F = 1672 / 2845  # native px a world px
ORDER = ['bud-light', 'sapporo', 'anchor', 'soonhari', 'bacardi', 'grey-goose', 'ej', 'camarena', 'rumchata', 'pink-whitney', 'new-amsterdam']
SPAN = (234, 950)            # the row's left and right edges, native px: inside the upper shelf's brackets, under its light strip
CORD = (421, 336, 428, 358)  # the pendant cord above New Amsterdam's old place, x0, y0, x1, y1 exclusive
LABEL = (620, 439, 656, 484)  # the Bud Light's body label with its two edge bands, exclusive
NECK = (631, 376, 645, 412)  # its cap and neck foil, inside the glass

def bottles():
    """Each brand bottle's matte in the base, as round one measured it: its native rect and polygon."""
    out = {}
    for a in json.loads(subprocess.check_output(['git', '-C', ROOT, 'show', f'{BEFORE}:art/manifest.json']))['assets']:
        if not a['id'].startswith('side-project-bottle-'): continue
        r = a['registration']['rect']; x, y, w, h = (r[k] * F for k in 'xywh')
        out[a['id'][len('side-project-bottle-'):]] = {'rect': (x, y, w, h), 'poly': [(x + u * w, y + v * h) for u, v in a['registration']['mask']]}
    out['sapporo'] = out['anchor'] = out['bud-light']
    return out

def matte(poly, size, grow=0):
    """The polygon's coverage, drawn at K x and reduced; grow dilates it by whole native px."""
    m = Image.new('L', (size[0] * K, size[1] * K), 0); ImageDraw.Draw(m).polygon([(x * K, y * K) for x, y in poly], fill=255)
    m = m.resize(size, Image.BOX)
    if grow: m = m.point(lambda v: 255 if v else 0).filter(ImageFilter.MaxFilter(2 * grow + 1))
    return np.asarray(m).astype(np.float32) / 255

def foot(poly, size):
    """The shelf top under a bottle's base, where the base's contact shadow falls outside its matte: its width, from 2 px
    above the base to 4 below, faded out over 2 px either end. It is relaid with the wall; the moved matte keeps the base's
    own dark edge."""
    xs = [x for x, _ in poly]; x0, x1, y = min(xs), max(xs), max(y for _, y in poly); m = np.zeros(size[::-1], np.float32)
    ramp = np.clip(np.minimum(np.arange(size[0]) - (x0 - 2), x1 + 2 - np.arange(size[0])) / 2, 0, 1)
    m[round(y) - 2:round(y) + 4] = ramp[None]
    return m

def slope(a):
    """The shelf top's rise, px a px: the first wood row under the wall, fitted across the gaps."""
    xs = [x for x in range(240, 990, 10)]; ys = []
    for x in xs:
        col = a[470:520, x]; ys.append(470 + next(i for i, p in enumerate(col) if p[0] > p[2] + 20))
    return np.polyfit(xs, ys, 1)[0]

def layout(b, k):
    """Each bottle's whole-pixel move (dx, dy): evenly spaced across SPAN in ORDER, each keeping its depth on the shelf."""
    gap = (SPAN[1] - SPAN[0] - sum(b[n]['rect'][2] for n in ORDER)) / (len(ORDER) - 1); x = SPAN[0]; out = {}
    for n in ORDER:
        dx = round(x - b[n]['rect'][0]); out[n] = (dx, round(k * dx)); x += b[n]['rect'][2] + gap
    return out

def relabel(img, name):
    """The Bud Light bottle, relabelled as Sapporo or Anchor."""
    out = img.copy(); x0, y0, x1, y1 = LABEL; w, h = x1 - x0, y1 - y0
    if name == 'sapporo':
        star, word = split(marks('sapporo'), 0, 20)
        ground, band = (26, 24, 22), (201, 160, 58)
        art = stack([star, recolour(word, (240, 236, 226))], w - 4, h - 8, 0.14, [0.62, 1], [0, 1])
    else:
        ground, band, art = (247, 204, 34), (30, 38, 74), stack([marks('anchor-brewing')], w - 4, h - 8, bold=1)
    big = Image.new('RGBA', (w * K, h * K), ground + (255,)); d = ImageDraw.Draw(big)
    d.rectangle((0, 0, w * K, 2 * K - 1), fill=band + (255,)); d.rectangle((0, (h - 2) * K, w * K, h * K), fill=band + (255,))
    big.alpha_composite(art, (2 * K, 4 * K))
    # The label wraps the glass: its outer columns keep the bottle's own dark outline.
    lab = np.asarray(big.convert('RGB').resize((w, h), Image.LANCZOS)).astype(np.float32); a = np.asarray(out).astype(np.float32)
    edge = np.ones(w, np.float32); edge[0] = edge[-1] = 0.35
    a[y0:y1, x0:x1] = lab * edge[None, :, None] + a[y0:y1, x0:x1] * (1 - edge[None, :, None])
    if name == 'sapporo':  # the foil and cap gold: every blue pixel keeps its lightness in gold
        n0, n1, n2, n3 = NECK; r = a[n1:n3, n0:n2]; blue = (r[..., 2] > r[..., 0] + 10)[..., None]
        lum = r.mean(-1, keepdims=True) / 170; gold = np.clip(lum * np.array([226, 178, 72], np.float32), 0, 255)
        a[n1:n3, n0:n2] = np.where(blue, gold, r)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def recolour(im, ink):
    return Image.merge('RGBA', [*Image.new('RGB', im.size, ink).split(), im.getchannel('A')])

def paint(img):
    img = img.convert('RGB'); a = np.asarray(img).astype(np.float32); size = img.size; b = bottles(); moves = layout(b, slope(a))
    # The wall and shelf behind every bottle, and the cord: each row interpolated across from the pixels either side.
    clear = np.maximum.reduce([np.maximum(matte(b[n]['poly'], size, 2), foot(b[n]['poly'], size)) for n in b if n not in ('sapporo', 'anchor')])
    clear[CORD[1]:CORD[3], CORD[0]:CORD[2]] = 1
    wall = a.copy()
    for y in np.nonzero(clear.any(1))[0]:
        row = clear[y] > 0; xs = np.arange(size[0]); keep = ~row
        for c in range(3): wall[y, row, c] = np.interp(xs[row], xs[keep], a[y, keep, c])
    out = wall.copy()
    for n in ORDER:
        src = np.asarray(relabel(img, n) if n in ('sapporo', 'anchor') else img).astype(np.float32)
        al = matte(b[n]['poly'], size, 0)[..., None]; dx, dy = moves[n]
        moved = np.roll(np.roll(src * al, dy, 0), dx, 1); am = np.roll(np.roll(al, dy, 0), dx, 1)
        out = moved + out * (1 - am)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), b, moves

def polygons(b, moves):
    """The round's mask: every bottle's old and new box and the cord, 3 px out."""
    boxes = []
    for n in set(b) | set(ORDER):
        x, y, w, h = b[n]['rect']
        for dx, dy in ([(0, 0)] if n not in ('sapporo', 'anchor') else []) + ([moves[n]] if n in moves else []):
            boxes.append((int(x + dx) - 3, int(y + dy) - 3, int(x + w + dx) + 4, int(y + h + dy) + 4))
    boxes.append((CORD[0] - 3, CORD[1] - 3, CORD[2] + 3, CORD[3] + 3))
    return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]] for x0, y0, x1, y1 in boxes]

def manifest(moves):
    """Each bottle's registration moved with it; Sapporo and Anchor cut with the Bud Light's matte; Barefoot gone."""
    m = json.load(open(MANIFEST)); assets = m['assets']; by = {a['id']: a for a in assets}
    bl = json.loads(json.dumps(by['side-project-bottle-bud-light'])); i = assets.index(by['side-project-bottle-barefoot'])
    for n in ('anchor', 'sapporo'): assets.insert(i, {**json.loads(json.dumps(bl)), 'id': f'side-project-bottle-{n}'})
    assets.remove(by['side-project-bottle-barefoot'])
    for a in assets:
        if not a['id'].startswith('side-project-bottle-'): continue
        dx, dy = moves[a['id'][len('side-project-bottle-'):]]; r = a['registration']['rect']
        r['x'] = round(r['x'] + dx / F, 2); r['y'] = round(r['y'] + dy / F, 2)
    json.dump(m, open(MANIFEST, 'w'), indent=2, ensure_ascii=False); open(MANIFEST, 'a').write('\n')

if __name__ == '__main__':
    spec = json.load(open(f'{D}/rounds/round-2.json')); base = Image.open(f"{D}/{spec['base']}")
    painted, b, moves = paint(base)
    if '--spec' in sys.argv:
        spec['tiles']['shelf']['polygons'] = polygons(b, moves)
        json.dump(spec, open(f'{D}/rounds/round-2.json', 'w'), indent=1); open(f'{D}/rounds/round-2.json', 'a').write('\n'); sys.exit()
    if '--manifest' in sys.argv: manifest(moves); sys.exit()
    if '--preview' in sys.argv: painted.save(sys.argv[sys.argv.index('--preview') + 1]); sys.exit()
    for name, t in spec['tiles'].items():
        x, y, w, h = t['rect']; painted.crop((x, y, x + w, y + h)).save(f'{D}/tiles/t-{name}-model.png')
