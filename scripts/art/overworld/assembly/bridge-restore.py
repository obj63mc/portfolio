# Copy the Eads Bridge wholesale from the base master (one continuous drawing) over the composite,
# along a band that hugs the arches column by column and follows the deck, abutments and piers below.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
base=Image.open('art/references/local/drafts/overworld-master-mc-sign.webp').convert('RGB'); bp=base.load()
m=Image.open(src).convert('RGB'); sc=6750/base.width
top=lambda wx:355+(wx-4720)*0.133
def bottom(wx):
    if 4848<=wx<4848+1: return 532
    if wx<4848: return 532
    if 5312<=wx<=5468: return 652
    if 6592<=wx<=6708: return 772
    return top(wx)+60
navy=lambda c: c[2]>c[0]+18 and c[0]<95 and c[2]<150
mask=Image.new('L',base.size,0); mp=mask.load(); F=4
X0=int(4700/sc)
for x in range(X0, base.width):
    wx=x*sc; dt=top(wx); y_deck=int(dt/sc)
    hi=None
    for y in range(max(0,int((dt-260)/sc)), y_deck):
        if navy(bp[x,y]): hi=y; break
    y_top=(hi-2) if hi is not None else y_deck-2
    y_bot=int(bottom(wx)/sc)+1
    for y in range(max(0,y_top-F), min(base.height,y_bot+F)):
        if y<y_top: v=int(255*(F-(y_top-y))/F)
        elif y>y_bot: v=int(255*(F-(y-y_bot))/F)
        else: v=255
        if wx<4730: v=int(v*max(0,(wx-4700))/30)
        mp[x,y]=max(mp[x,y],v)
m.paste(base,(0,0),mask)
# Laclede's Landing painted its river a paler cyan: where both images show water beside the west pier, keep the base water.
import colorsys
mp2=m.load()
def cyan(c):
    h,s_,v=colorsys.rgb_to_hsv(*[q/255 for q in c]); return 0.45<h<0.56 and s_>0.25 and v>0.5
for y in range(int(330/sc), int(640/sc)):
    for x in range(int(4540/sc), int(4830/sc)):
        if cyan(bp[x,y]) and cyan(mp2[x,y]): mp2[x,y]=bp[x,y]
m.save(out,quality=92); print(out)
