# Paste a 1536x1024 regional edit of the MonsterCommerce crop (world 5700,900 to 6750,1600) back into master P.
import sys
from PIL import Image
edit, out = sys.argv[1], sys.argv[2]
sc = 6750/1983
m = Image.open('art/generated/overworld/overworld-master/image.webp').convert('RGB')
x0, y0 = round(5700/sc), round(900/sc); x1, y1 = m.width, round(1600/sc)
w, h = x1-x0, y1-y0; F = 22
e = Image.open(edit).convert('RGB').resize((w, h), Image.LANCZOS)
mask = Image.new('L', (w, h), 255); px = mask.load()
for y in range(h):
    for x in range(w):
        d = min(x, y, h-1-y)  # the right edge is the image edge: no feather there
        if d < F: px[x, y] = int(255*d/F)
m.paste(e, (x0, y0), mask)
m.save(out, quality=92)
m.crop((x0-40, y0-30, x1, y1+30)).resize(((x1-x0+40)*3, (y1-y0+60)*3), Image.LANCZOS).save(out.replace('.webp', '-zoom.png'))
print(out, (x0, y0, w, h))
