# Trace the Mississippi on a master by walking rows from the south, keeping the water runs that continue the channel.
import sys, colorsys, json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); sc=6750/1983; px=im.load()
def water(c):
    h,s,v=colorsys.rgb_to_hsv(*[x/255 for x in c]); return 0.46<h<0.55 and s>0.55 and v>0.5 and c[0]<80
rows={}
for wy in range(2700,199,-50):
    y=min(int(wy/sc),im.height-1); runs=[];cur=None
    for x in range(int(4300/sc),im.width):
        if water(px[x,y]): cur=[x,x] if cur is None else [cur[0],x]
        else:
            if cur and cur[1]-cur[0]>4: runs.append(cur)
            cur=None
    if cur and cur[1]-cur[0]>4: runs.append(cur)
    rows[wy]=[(round(a*sc),round(b*sc)) for a,b in runs]
west,east={},{}; prev=(4411,6287)
for wy in range(2700,199,-50):
    keep=[r for r in rows[wy] if r[1]>=prev[0]-120 and r[0]<=prev[1]+120]
    if not keep: continue  # bridge deck or land row: interpolated later
    lo=min(r[0] for r in keep); hi=max(r[1] for r in keep)
    if hi-lo<150: continue
    west[wy]=lo; east[wy]=hi; prev=(lo,hi)
ys=sorted(west)
print('traced rows',ys[0],'to',ys[-1],'; skipped',[y for y in range(200,2701,50) if y not in west and ys[0]<=y<=ys[-1]])
pts=[(west[y],y) for y in ys]+[(east[y],y) for y in reversed(ys)]
print(json.dumps([{'x':x,'y':y} for x,y in pts]))
