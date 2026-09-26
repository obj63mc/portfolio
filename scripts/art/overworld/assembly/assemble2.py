# Paste round-two regional edits onto the round-one candidate, feathered, with protected areas kept from the base.
import sys, json, os
from PIL import Image, ImageDraw, ImageFilter
S=os.path.dirname(os.path.abspath(__file__)); 
def poplar_protect(px, x0, y0, w, h, sc):
    """Keep the base's Poplar Street bridge deck: a band from (4750,1690) sloping 0.133 east, 140 px thick."""
    for y in range(h):
        wy=y0+y*sc
        for x in range(w):
            wx=x0+x*sc
            if 4700<=wx<=6400:
                t=1690+(wx-4750)*0.133
                if t-60<=wy<=t+150: px[x,y]=0
                elif t-80<wy<t-60: px[x,y]=min(px[x,y],int(255*(t-60-wy)/20))
                elif t+150<wy<t+170: px[x,y]=min(px[x,y],int(255*(wy-t-150)/20))

base_path, regions_path, out = sys.argv[1:4]; only=sys.argv[4:]
R=json.load(open(regions_path))
sc=6750/1983; F=8
base=Image.open(base_path).convert('RGB'); m=base.copy(); bpx=base.load()
protect={'r18-maplewood-south':[(1735,1490,1955,1645),(1540,1570,1790,1810)],
         'r14-belleville-around':[(5885,1025,6665,1635),(6015,1565,6485,1785)],
         'r10-downtown-core':[(3950,250,4450,340),(3790,700,4330,1300)],
         'r11-downtown-south':[(3790,700,4330,1285)],
         'r21-courthouse':[(3600,1405,4040,1470)]}
def silver(c): r,g,b=c; return abs(r-g)<16 and abs(g-b)<16 and 150<r<240
for k,(x0,y0,x1,y1,size) in R.items():
    if only and k not in only: continue
    src=f'art/sources/overworld-fill-{k}.png'
    if not os.path.exists(src): print('skip',k); continue
    X0,Y0=round(x0/sc),round(y0/sc); X1=m.width if x1>=6750 else round(x1/sc); Y1=m.height if y1>=2700 else round(y1/sc)
    w,h=X1-X0,Y1-Y0; e=Image.open(src).convert('RGB').resize((w,h),Image.LANCZOS)
    mask=Image.new('L',(w,h),255); px=mask.load()
    for y in range(h):
        for x in range(w):
            ds=[]
            if x0>0: ds.append(x)
            if x1<6750: ds.append(w-1-x)
            if y0>0: ds.append(y)
            if y1<2700: ds.append(h-1-y)
            d=min(ds) if ds else F
            if d<F: px[x,y]=int(255*d/F)
    keep=Image.new('L',(w,h),0); kd=ImageDraw.Draw(keep)
    for (px0,py0,px1,py1) in protect.get(k,[]): kd.rectangle([px0/sc-X0,py0/sc-Y0,px1/sc-X0,py1/sc-Y0],fill=255)
    if k=='r13-arch-grounds-silver-protection-disabled':
        kp=keep.load()
        for y in range(h):
            for x in range(w):
                if silver(bpx[X0+x,Y0+y]): kp[x,y]=255
        keep=keep.filter(ImageFilter.MaxFilter(7))
    keep=keep.filter(ImageFilter.GaussianBlur(3))
    # protected pixels: mask -> 0 (keep base)
    mask=Image.composite(Image.new('L',(w,h),0),mask,keep)
    if k=='r15-chouteau':
        px=mask.load()
        for y in range(h):
            wy=y0+y*sc
            if wy>=1828:
                for x in range(w): px[x,y]=0
            elif wy>1798:
                for x in range(w): px[x,y]=min(px[x,y],int(255*(1828-wy)/30))
    if k=='r14-belleville-around': poplar_protect(mask.load(), x0, y0, w, h, sc)
    if k=='r18-maplewood-south':
        px=mask.load()
        for y in range(h):
            if y0+y*sc<=1780: continue
            for x in range(w):
                wx=x0+x*sc
                if wx>=2600: px[x,y]=0
                elif wx>2570: px[x,y]=min(px[x,y],int(255*(2600-wx)/30))
    if k=='r11-downtown-south':
        px=mask.load()
        for y in range(h):
            wy=y0+y*sc
            if wy>=1470:
                for x in range(w): px[x,y]=0
            elif wy>1440:
                for x in range(w): px[x,y]=min(px[x,y],int(255*(1470-wy)/30))
    m.paste(e,(X0,Y0),mask); print('pasted',k,(X0,Y0,w,h))
m.save(out,quality=92); m.resize((2250,900),Image.LANCZOS).save(out.replace('.webp','-preview.png')); print(out)
