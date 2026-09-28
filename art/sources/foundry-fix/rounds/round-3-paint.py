"""Round three of the Foundry stair aisle, painted by construction (no model): the aisle descends toward the screen in
four levels, the landing by the projector highest, then the back row's level, the middle row's and the floor by the
front row and the door. Every tread is flat carpet, every drop a glowing turquoise edge on the tier edge of its row, and
the wall's black border is a staircase: one straight section per level, a right-angle drop at each edge's wall end.

  SCENE=foundry python3 scripts/art/overworld/tiles.py prepare rounds/round-3.json   (the spec is written by --spec)
  uv run --with pillow --with numpy --with opencv-python-headless python3 rounds/round-3-paint.py [--spec]

--spec writes the round's mask polygons into rounds/round-3.json; without it the script paints tiles/t-stairs3.png
into tiles/t-stairs3-model.png, and tiles.py stitch pastes it inside the mask."""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

D = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))  # the fix folder, from rounds/
OX, OY, TW, TH = 0, 300, 640, 427  # the tile, in master px
H = 10      # one step: about the height of a seat tier's end face
BAND = 22   # the black border's height, as painted by the door
# The orange wall's foot, the top of the border at the door's level (master px, measured before round two).
EDGE = [(0, 526.9), (20, 520.4), (60, 508.3), (100, 494.2), (120, 487.8), (180, 468.5), (240, 449.6), (300, 435.1),
        (345, 425.4), (377, 418.6), (440, 405.1), (500, 391.9), (560, 379.4), (611, 368.7)]
E0 = lambda x: np.interp(x, *zip(*EDGE))
top = lambda x, lv: E0(x) - lv * H              # the border's top at level lv
junction = lambda x, lv: E0(x) + BAND - lv * H  # where that level's tread meets the border
# Tier edges: each row's lower edge (its front line) carried up-left, as a line y = y0 + m (x - x0); the drop from
# level k to k - 1 runs along it, from the wall to the row's first seat.
TIERS = [((46, 530), 0.5195), ((346, 531), 0.472), ((612, 477), 0.449)]  # back row (3 -> 2), middle (2 -> 1), front (1 -> 0)
line = lambda t, x: t[0][1] + t[1] * (x - t[0][0])
# Each edge's wall end: where its tier line meets the upper level's junction.
CORNERS = []
for i, t in enumerate(TIERS):
    xs = np.arange(0, 640, 0.05); d = line(t, xs) - junction(xs, 3 - i)
    x = float(xs[np.argmin(np.abs(d))]); CORNERS.append((x, float(line(t, x))))
def wall_level(x):  # the level of the tread meeting the wall at column x
    return 3 - sum(x >= c[0] for c in CORNERS)
def zone(x, y):  # the level of the tread at a floor point: which side of each tier line it lies on
    return 3 if y > line(TIERS[0], x) else 2 if y > line(TIERS[1], x) else 1 if y > line(TIERS[2], x) else 0

# The area repainted: the aisle floor up to its seats and ledge, the floor beside the middle row's first seats, the
# strip above the middle row's first headrest, and the wall's foot up to the raised border.
AISLE = [(0, 524), (120, 485), (240, 447), (345, 423), (376, 420), (376, 470), (347, 474), (345, 530), (338, 549), (252, 527),
         (246, 534), (244, 556), (238, 572), (214, 576), (207, 597), (141, 589), (0, 627)]  # down to the ledge's railing
RIGHT = [(440, 402), (611, 366), (611, 496), (583, 502), (512, 476), (500, 452), (440, 425)]
HEADREST = [(376, 421.8), (470, 401.5), (470, 460), (462, 456), (427, 438), (397, 424), (385, 424), (377, 427)]
xs_wall = sorted(set([0, 611] + [int(c[0]) for c in CORNERS] + [int(c[0]) + 1 for c in CORNERS] + list(range(0, 612, 25))))
WALL = [(x, round(float(top(x, wall_level(x))) - 4, 1)) for x in xs_wall] + [(x, round(float(E0(x)) + 3, 1)) for x in reversed(xs_wall)]
POLYS = [AISLE, RIGHT, HEADREST, WALL]

def raster(polys):
    m = Image.new('L', (TW, TH), 0); d = ImageDraw.Draw(m)
    for poly in polys: d.polygon([(x - OX, y - OY) for x, y in poly], fill=255)
    return np.asarray(m) > 0
# The round's mask: the core grown 4 px round its floor parts, so the repaint reaches the seats' own edges; inside that
# margin only floor-coloured pixels are repainted, never a seat, the ledge or the wall.
core = raster(POLYS)
grown = cv2.dilate(raster([AISLE, RIGHT, HEADREST]).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) | core

if '--spec' in sys.argv:
    p = f'{D}/rounds/round-3.json'; s = json.load(open(p))
    cs, _ = cv2.findContours(grown.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    s['tiles']['stairs3']['polygons'] = [[[int(q[0]) + OX, int(q[1]) + OY] for q in cv2.approxPolyDP(c, 0.6, True)[:, 0, :]] for c in cs]
    json.dump(s, open(p, 'w'), indent=1); open(p, 'a').write('\n')
    print('corners', [(round(x), round(y)) for x, y in CORNERS]); sys.exit()

tile = np.asarray(Image.open(f'{D}/tiles/t-stairs3.png').convert('RGB')).astype(np.float32)
master = np.asarray(Image.open(f'{D}/rounds/base-3.png').convert('RGB')).astype(np.float32)
orig = np.asarray(Image.open(f'{D}/rounds/base-2.png').convert('RGB')).astype(np.float32)  # before round two
floorlike = (tile[..., 2] > tile[..., 0] + 25) & (tile[..., 1] > tile[..., 0] + 15)
mask = core | (grown & floorlike)

# Carpet: the floor's own colour, a smooth plane fitted to the plain carpet of the tile outside the aisle (the room's
# gentle light falloff), plus the carpet's fine tile pattern (the high-pass of open floor right of the rows).
t8 = tile.astype(np.float32)
carpet = (t8[..., 2] > t8[..., 0] + 25) & (t8[..., 1] > 50) & (t8[..., 1] < 100) & ~cv2.dilate(mask.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
yy_, xx_ = np.mgrid[0:TH, 0:TW]
A = np.stack([np.ones(carpet.sum()), xx_[carpet], yy_[carpet]], 1)
coef = [np.linalg.lstsq(A, t8[..., c][carpet], rcond=None)[0] for c in range(3)]
plane = np.stack([co[0] + co[1] * xx_ + co[2] * yy_ for co in coef], -1)
# The real floor's departure from the plane, carried in from the aisle's edge (normalized convolution), fading to the
# plane where no plain carpet is near, so the repaint meets the floor around it without a seam.
res = (t8 - plane) * carpet[..., None]
wgt = cv2.GaussianBlur(carpet.astype(np.float32), (0, 0), 14)
rs = np.stack([cv2.GaussianBlur(res[..., c], (0, 0), 14) for c in range(3)], -1) / np.maximum(wgt, 1e-3)[..., None]
low = plane + rs * np.clip(wgt / 0.08, 0, 1)[..., None]
patch = master[700:941, 1440:1660]
detail = patch - cv2.GaussianBlur(patch, (0, 0), 6)
detail = np.tile(detail, (TH // detail.shape[0] + 1, TW // detail.shape[1] + 1, 1))[:TH, :TW]
floor = low + detail

# The border's profile down from the orange edge (the orange-to-black rim, then the flat black), from the border by the
# door, sampled at quarter pixels so every section lands at its exact, fractional height.
KS = np.arange(-2, BAND + 0.01, 0.25)
prof = np.mean([[[np.interp(E0(x) + k, np.arange(orig.shape[0]), orig[:, x, c]) for c in range(3)] for k in KS] for x in range(560, 611)], axis=0)
rim = prof[np.argmin(np.abs(KS - 1))]
body = prof[-8]

out = tile.copy()
for yy in range(TH):
    for xx in range(TW):
        if not mask[yy, xx]: continue
        x, y = xx + OX, yy + OY
        z = zone(x, y)
        if y >= junction(x, z):
            out[yy, xx] = floor[yy, xx]; continue
        lv = wall_level(x); t = top(x, lv)
        if y >= t - 2:  # the border (its rim blends into the orange above)
            k = y - t
            col = np.array([np.interp(k, KS, prof[:, c]) for c in range(3)]) if k < 6 else body
            # the soft carpet line at the border's foot
            cover = np.clip(junction(x, lv) - y, 0, 1) if lv == z else 1
            out[yy, xx] = col * cover + floor[yy, xx] * (1 - cover)
        # above the border the tile keeps its own wall

# The right angles: each drop's vertical edge on the wall gets the border's rim, one px wide, on the higher section's end.
for i, (cx, cy) in enumerate(CORNERS):
    lv_hi = 3 - i; x = int(np.floor(cx)) - 1
    for y in range(int(np.ceil(top(cx, lv_hi))), int(np.floor(top(cx, lv_hi - 1))) + 1):
        if 0 <= y - OY < TH and 0 <= x - OX < TW and mask[y - OY, x - OX]: out[y - OY, x - OX] = rim

# The drops, drawn at 4x and reduced: the shadow on the lower tread just beyond each edge, then the light strip on the
# upper tread's nosing, 5 px, the colours of the strips Codex drew, with a soft glow. Clipped to the aisle, so seats and
# the ledge stand in front of them.
S = 4
shade = Image.new('L', (TW * S, TH * S), 0); bar = Image.new('L', (TW * S, TH * S), 0); hi = Image.new('L', (TW * S, TH * S), 0)
sd, bd, hd = ImageDraw.Draw(shade), ImageDraw.Draw(bar), ImageDraw.Draw(hi)
for (cx, cy), t in zip(CORNERS, TIERS):
    x1 = 700; A = ((cx - OX) * S, (cy - OY) * S); B = ((x1 - OX) * S, (line(t, x1) - OY) * S)
    for k in range(0, 13 * S):
        sd.line([(A[0], A[1] - k), (B[0], B[1] - k)], fill=int(115 * (1 - k / (13 * S))), width=1)
    bd.polygon([(A[0], A[1]), (B[0], B[1]), (B[0], B[1] + 5 * S), (A[0], A[1] + 5 * S)], fill=255)
    hd.line([(A[0], A[1] + 0.5 * S), (B[0], B[1] + 0.5 * S)], fill=255, width=S)
down = lambda im, blur=0: np.asarray((im.filter(ImageFilter.GaussianBlur(blur * S)) if blur else im).resize((TW, TH), Image.LANCZOS)).astype(np.float32)[..., None] / 255
shade, bar_a, glow, hi = down(shade, 0.4), down(bar), down(bar, 1.8), down(hi)
isfloor = np.zeros((TH, TW), bool)
for yy in range(TH):
    for xx in range(TW):
        if mask[yy, xx]: x, y = xx + OX, yy + OY; isfloor[yy, xx] = y >= junction(x, zone(x, y))
fl = isfloor[..., None]
out = np.where(fl, out * (1 - 0.5 * shade), out)
out = out + (np.array([47, 144, 156], np.float32) - out) * np.clip(0.7 * glow - bar_a, 0, 1) * fl
out = out + (np.array([124, 236, 232], np.float32) - out) * bar_a * fl
out = out + (np.array([175, 250, 246], np.float32) - out) * (0.5 * hi * bar_a) * fl
out = np.where(mask[..., None], out, tile)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{D}/tiles/t-stairs3-model.png')
print('corners', [(round(x), round(y)) for x, y in CORNERS])
