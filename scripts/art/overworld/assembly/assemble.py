# Paste every available regional fill edit back into master P, feathered except along image edges.
import sys, json, os
from PIL import Image
S=os.path.dirname(os.path.abspath(__file__)); R=json.load(open(f'{S}/regions.json'))
out=sys.argv[1]; only=sys.argv[2:]  # optional subset of region keys

import colorsys
def road_top(img, x0w, x1w, y0w, y1w):
    """World-space top edge of the grey highway per world column of img (world coords), None where absent."""
    scw=6750/img.width; pxl=img.load(); out={}
    for wx in range(x0w, x1w+1):
        x=min(img.width-1,int(wx/scw)); ys=[]
        for wy in range(y0w, y1w):
            y=min(img.height-1,int(wy/scw)); r,g,b=pxl[x,y]
            if max(r,g,b)-min(r,g,b)<30 and 125<max(r,g,b)<200 and abs(r-g)<20: ys.append(wy)
        runs=[]; cur=None
        for wy in ys:
            if cur and wy-cur[1]<=int(scw)+1: cur[1]=wy
            else:
                if cur: runs.append(cur)
                cur=[wy,wy]
        if cur: runs.append(cur)
        runs=[r for r in runs if r[1]-r[0]>=40]
        out[wx]=runs[0][0] if runs else None
    return out

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

sc=6750/1983; m=Image.open('art/references/local/drafts/overworld-master-mc-sign.webp').convert('RGB'); F=22
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
            if x0>0 and not (k=='r5n-east-north' and y0+y*sc<800): ds.append(x)
            if x1<6750 and not (k=='r4-south-downtown' and y0+y*sc>1930): ds.append(w-1-x)
            if y0>0: ds.append(y)
            if y1<2700: ds.append(h-1-y)
            d=min(ds) if ds else F
            if d<F: px[x,y]=int(255*d/F)
    if k=='r8a-bjc':
        # The campus edit moved the highway. Keep the edit only north of both highways; the base road stays.
        e_world=Image.open(src).convert('RGB').resize((round(w*(6750/m.width)),round(h*(6750/m.width))))
        bt=road_top(m, x0, x1, y0, y1); et=road_top(e_world.resize((6750,round(6750*h/w))) if False else e_world, 0, x1-x0, 0, y1-y0)
        px=mask.load()
        for x in range(w):
            wx=x0+x*sc; b=bt.get(int(wx)); t=et.get(int(x*sc)); t=None if t is None else t+y0
            cands=[v for v in (b,t) if v is not None]
            clip=(min(cands) if cands else 1090+0.33*(wx-1950))-12
            for y in range(h):
                wy=y0+y*sc
                if wy>=clip: px[x,y]=0
                elif wy>clip-30: px[x,y]=min(px[x,y],int(255*(clip-wy)/30))
    if k=='r5s-belleville': poplar_protect(mask.load(), x0, y0, w, h, sc)
    m.paste(e,(X0,Y0),mask); print('pasted',k,(X0,Y0,w,h))
    if k=='r4-south-downtown':
        # The edit drew its own bank about 160 px west of the base bank and meets the crop edge at row 2200.
        # Join them with a short diagonal bank from the base line at row 2000 to the edit's line at row 2200,
        # flooding the base land east of that line with flat water graded into the far-east water tone.
        mp=m.load()
        def cyan(c):
            h,s_,v=colorsys.rgb_to_hsv(*[q/255 for q in c]); return 0.45<h<0.56 and s_>0.4 and v>0.5
        def Lx(wy):
            if wy<2200: return 4891+(wy-2000)*(4598-4891)/200
            xs=[(2200,4598),(2250,4585),(2300,4564),(2350,4544),(2400,4525),(2450,4497),(2500,4476),(2550,4459),(2600,4442),(2650,4425),(2700,4411)]
            for (ya,xa),(yb,xb) in zip(xs,xs[1:]):
                if ya<=wy<=yb: return xa+(wy-ya)*(xb-xa)/(yb-ya)
            return 4411
        xfar=int(4900/sc); xend=int(4830/sc); strip=(214,178,118)
        for y in range(int(2000/sc), m.height):
            wy=y*sc; L=Lx(wy); xl=int(L/sc); b=mp[xfar,y]
            a=mp[max(0,xl-6),y] if wy>=2200 and cyan(mp[max(0,xl-6),y]) else b
            for x in range(xl, xend):
                t=(x-xl)/max(1,(xend-xl)); mp[x,y]=tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))
            if wy<2200:
                for x in range(max(0,xl-4), xl): mp[x,y]=strip
m.save(out,quality=92); m.resize((2250,900),Image.LANCZOS).save(out.replace('.webp','-preview.png')); print(out)
