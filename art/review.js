const $ = (id) => document.getElementById(id);
const world = $('world'), phone = $('phone');
const ctx = world.getContext('2d'), pc = phone.getContext('2d'), rc = $('rigview').getContext('2d');
const cache = new Map();
let data, scene, camera, walk = {}, stepped = null, reaction = -10000, last = 0, dirty = true, lastFrame = 0;
const enabled = (id) => $(id).checked;
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
// Walk-behind scenery (spec): the side the cursor steps onto an outline from, above or below its front line, holds
// until it steps off: behind is drawn under the cut-out and cannot use its props, in front is drawn over it and can.
const inside = (p,poly) => {let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)c=!c;}return c;};
const frontY = (f,x) => {if(x<=f[0].x)return f[0].y;for(let i=1;i<f.length;i++)if(x<=f[i].x)return f[i-1].y+(f[i].y-f[i-1].y)*(x-f[i-1].x)/(f[i].x-f[i-1].x);return f[f.length-1].y;};
// Mirrors src/lib/scenes/walk.ts (buildout ticket 19). The side is read where the cursor stepped from, its last position
// outside the outline (or where it appeared, after a jump): a front line through the front feet lies on the outline's
// lower edge, so the first point inside is always above it. A staircase's landing: stepping on from on or above it, or
// within LANDING_REACH world px of travel after leaving that floor, is in front too. A desk: behind only when stepped on
// from directly behind it, down over its back edge; from either side or the front, in front.
const fromBehind = (f,p,poly) => {let back=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.x>f.x)!==(b.x>f.x))back=Math.min(back,a.y+(b.y-a.y)*(f.x-a.x)/(b.x-a.x));}return back!==Infinity&&f.y<back&&p.y-f.y>Math.abs(p.x-f.x);};
const LANDING_REACH = 800;
let sinceLanding = {};
function stepTo(p) {
  const moved=stepped?Math.hypot(p.x-stepped.x,p.y-stepped.y):Infinity;
  for(const w of scene.walkBehind??[]){
    if(w.landing)sinceLanding[w.key]=p.y<=frontY(w.landing,p.x)?0:(sinceLanding[w.key]??Infinity)+moved;
    if(!inside(p,w.outline)){delete walk[w.key];continue;}
    const f=stepped&&!inside(stepped,w.outline)?stepped:p;
    walk[w.key]??=(w.desk?!fromBehind(f,p,w.outline):f.y>=frontY(w.front,f.x)||(w.landing&&(f.y<=frontY(w.landing,f.x)||sinceLanding[w.key]<=LANDING_REACH)))?'front':'behind';
  }
  stepped=p;camera=p;dirty=true;updateStatus();
}
function load(path) {
  if (!cache.has(path)) {
    const image = new Image(); image.onload=()=>{dirty=true;}; image.src = path;
    cache.set(path, image);
  }
  return cache.get(path);
}
function drawImage(context,path,r) {
  const image = load(path);
  if (image.complete && image.naturalWidth) context.drawImage(image,r.x,r.y,r.w,r.h);
}
// Overlay strokes and labels keep a constant on-screen size: a 6750 px world shown 600 px wide would thin a 2 px line to nothing.
const k = () => world.width / Math.max(1, world.clientWidth);
function rect(r,color,label) {
  ctx.strokeStyle=color;ctx.lineWidth=2*k();ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.fillStyle=color;ctx.font=`${13*k()}px system-ui`;ctx.fillText(label,r.x+5*k(),r.y+16*k());
}
function line(y,color,x=0,w=scene.w,label) {
  ctx.strokeStyle=color;ctx.lineWidth=3*k();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  if(label){ctx.fillStyle=color;ctx.font=`${12*k()}px system-ui`;ctx.fillText(label,x+5*k(),y-5*k());}
}
function cursorShape(context,x,y,height) {
  const s=height/36;context.fillStyle='#fff';context.strokeStyle='#243830';context.lineWidth=2*s;context.beginPath();
  context.moveTo(x,y);context.lineTo(x+11*s,y+36*s);context.lineTo(x+18*s,y+23*s);context.lineTo(x+33*s,y+20*s);context.closePath();context.fill();context.stroke();
}
// Spec: d runs from 1.0 at foregroundY to 0.85 at horizonY and holds at 0.85 above it; own cursor 1.25 x the 32 px base x d.
const depthFactor = (d,y) => y<=d.horizonY?0.85:y>=d.foregroundY?1:0.85+0.15*(y-d.horizonY)/(d.foregroundY-d.horizonY);
function frame() {
  const w=390/.6,h=844/.6;
  return {x:Math.max(0,Math.min(scene.w-w,camera.x-w/2)),y:Math.max(0,Math.min(scene.h-h,camera.y-h/2)),w,h};
}
function drawRig(name,target,time,context=ctx) {
  const rig=data.rigs[name];if(!rig)return;
  const source=data.assets.find(a=>a.id===`${name}-master`);if(!source)return;
  const moving=enabled('motion')&&!enabled('reduced');
  const click=Math.max(0,1-(time-reaction)/900);
  const bounds=data.rigBounds[name],scale=Math.min(target.w/bounds.w,target.h/bounds.h);
  context.save();context.translate(target.x+(target.w-bounds.w*scale)/2,target.y+target.h-bounds.h*scale);
  context.scale(scale,scale);context.translate(-bounds.x,-bounds.y);
  const parts=Object.entries(rig);
  // Each part retains absolute master coordinates. Apply ancestor rotations around absolute pivots.
  const transform=(key)=>{
    const p=rig[key];if(!p)return;
    if(p.parent)transform(p.parent);
    const px=p.x+p.w*p.pivot[0],py=p.y+p.h*p.pivot[1];
    let angle=0;
    if(key==='head')angle=Math.sin(time/180)*.035*click;
    if(key==='antlers')angle=Math.sin(time/65)*.065*click;
    if(name==='rider'&&key.includes('wheel')&&moving)angle=time/230;
    context.translate(px,py);context.rotate(angle);
    if(key==='eye'&&((moving&&time%4700>4510)||click>.75))context.scale(1,.14);
    context.translate(-px,-py);
  };
  // Parts outside the draw order (the rider's pedal frames) are the site's to animate; the workshop draws the rest frame.
  for(const [key,p] of parts.filter(([k])=>data.rigDrawOrder.includes(k)).sort(([a],[b])=>data.rigDrawOrder.indexOf(a)-data.rigDrawOrder.indexOf(b))) {
    context.save();transform(key);drawImage(context,`generated/${p.file}`,p);context.restore();
  }
  context.restore();
}
function draw(time) {
  requestAnimationFrame(draw);
  if (!scene) return;
  const instances=scene.rigInstances.filter(r=>data.rigs[r.name]);
  const hasRig=instances.length>0;
  const animated=hasRig&&((enabled('motion')&&!enabled('reduced'))||time-reaction<900);
  if(!dirty&&(!animated||time-lastFrame<1000/30))return;
  dirty=false;lastFrame=time;
  ctx.clearRect(0,0,world.width,world.height);ctx.fillStyle='#e9dfbf';ctx.fillRect(0,0,scene.w,scene.h);
  const density=$('density').value,showMaster=density==='master';
  const plate=data.assets.find(a=>a.id===(showMaster?scene.id+'-master':scene.id));
  if(plate){
    if(density==='plate'||showMaster)drawImage(ctx,`generated/${plate.file}`,{x:0,y:0,w:scene.w,h:scene.h});
    else for(const tile of plate.tiles.filter(t=>t.density===Number(density)))drawImage(ctx,`generated/${tile.file}`,tile);
  }
  if(!showMaster)for(const layer of scene.layers.filter(l=>l.kind==='scenery')){const a=data.assets.find(a=>a.id===layer.asset);drawImage(ctx,`generated/${a.file}`,layer.rect);}
  if(enabled('props')&&!showMaster){
    for(const layer of scene.layers.filter(l=>l.kind==='prop')){const a=data.assets.find(a=>a.id===layer.asset);drawImage(ctx,`generated/${a.file}`,layer.rect);}
    for(const r of instances)drawRig(r.name,{...r.rect,x:r.rect.x+(enabled('motion')&&!enabled('reduced')?Math.sin(time/4000)*r.travelX:0)},time);
  }
  // A cursor silhouette makes occlusion testable between scenery and foreground scenery.
  cursorShape(ctx,camera.x,camera.y,36);
  for(const w of scene.walkBehind??[])if(walk[w.key]==='behind'){const a=data.assets.find(a=>a.id===w.key);if(a)drawImage(ctx,`generated/${a.file}`,scene.layers.find(l=>l.asset===w.key)?.rect??w.rect);}
  if(enabled('foreground')&&!showMaster)for(const layer of scene.layers.filter(l=>l.kind==='foreground')){const a=data.assets.find(a=>a.id===layer.asset);drawImage(ctx,`generated/${a.file}`,layer.rect);}
  if(enabled('depth'))for(const [i,d] of scene.depth.entries()){
    // Tinted so the tiling reads; the horizon should sit at the treeline, and the sample cursors (own size, 1.25 x 32 x d)
    // should read as person scale beside the buildings from the treeline down to the foreground.
    ctx.fillStyle=i%2?'#e8c57633':'#7fc3e833';ctx.fillRect(d.rect.x,d.rect.y,d.rect.w,d.rect.h);
    rect(d.rect,'#e8c576',`depth ${i+1}`);
    line(d.horizonY,'#e8c576',d.rect.x,d.rect.w,`horizon y ${d.horizonY} · ×0.85`);
    line(Math.min(d.foregroundY,scene.h-2*k()),'#a9b866',d.rect.x,d.rect.w,`foreground y ${d.foregroundY} · ×1.0`);
    for(const f of [0.2,0.5,0.8]){const y=d.rect.y+d.rect.h*f;cursorShape(ctx,d.rect.x+d.rect.w/2,y,40*depthFactor(d,y));}
  }
  if(enabled('rects')){
    for(const p of scene.props??[])rect(p.rect,'#31be82',p.id);
    for(const f of scene.foreground??[])rect(f.rect,'#e083b9',f.key);
    ctx.setLineDash([8*k(),5*k()]);ctx.lineWidth=2*k();
    for(const w of scene.walkBehind??[])for(const [points,color,closed] of [[w.outline,'#e083b9',true],[w.front,'#55d6e5',false]]){
      ctx.strokeStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(closed)ctx.closePath();ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  if(enabled('draftRects')){
    ctx.setLineDash([9,6]);
    for(const layer of scene.layers)rect(layer.rect,layer.kind==='prop'?'#9be6b9':layer.kind==='scenery'?'#a9d2ed':'#f6a6d3',layer.id+' · draft');
    ctx.setLineDash([]);
  }
  if(enabled('river')&&scene.river){
    const r=scene.river;ctx.fillStyle='#55d6e54d';ctx.beginPath();r.mask.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
    // The deck is excluded from the overlay mask and outlined as a distinct walkable polygon.
    for(const d of r.decks){
      const deck=()=>{ctx.beginPath();d.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
      if(plate) {ctx.save();deck();ctx.clip();drawImage(ctx,`generated/${plate.file}`,{x:0,y:0,w:scene.w,h:scene.h});ctx.restore();}
      deck();ctx.strokeStyle='#fff';ctx.lineWidth=2*k();ctx.stroke();ctx.fillStyle='#fff';ctx.font=`${13*k()}px system-ui`;ctx.fillText('bridge deck',d[0].x+5*k(),d[0].y-5*k());
    }for(const b of r.bridges??[])rect(b.rect,'#f6a6d3',b.key);for(const o of r.obstacles??[])rect(o,'#ffd34f','in the water');ctx.strokeStyle='#ff7969';ctx.lineWidth=3*k();ctx.beginPath();r.southEnd.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r.arch.x,r.arch.y,18,0,Math.PI*2);ctx.fill();
  }
  const f=frame();
  pc.fillStyle='#e9dfbf';pc.fillRect(0,0,390,844);pc.drawImage(world,f.x,f.y,f.w,f.h,0,0,390,844);
  if(enabled('frame'))rect(f,'#55d6e5','390 × 844 / 0.6');
  rc.fillStyle='#e9dfbf';rc.fillRect(0,0,900,600);
  instances.forEach((r,i)=>drawRig(r.name,{x:i*900/instances.length,y:0,w:900/instances.length,h:600},time,rc));
  if(time-last>1000){last=time;updateStatus();}
}
function updateStatus(){
  const f=frame(),sign=scene.artProps?.find(p=>p.id==='signpost');
  const fits=sign&&sign.rect.x>=f.x&&sign.rect.x+sign.rect.w<=f.x+f.w&&sign.rect.y>=f.y&&sign.rect.y+sign.rect.h<=f.y+f.h;
  const conflicts=(scene.artForeground??scene.foreground??[]).flatMap(a=>(scene.artProps??scene.props??[]).filter(b=>overlap(a.rect,b.rect)).map(b=>`${a.key} overlaps ${b.id}`));
  const missing=data.pending.filter(id=>id===scene.id);
  const sides=(scene.walkBehind??[]).filter(w=>walk[w.key]).map(w=>`${walk[w.key]==='behind'?'behind':'in front of'} ${w.key}${w.props.length?` (${w.props.join(', ')} ${walk[w.key]==='behind'?'not usable':'usable'})`:''}`);
  $('status').textContent=`${scene.w} × ${scene.h} world px. ${sign?'Signpost in phone frame: '+(fits?'PASS':'FAIL')+'. ':''}${conflicts.length?'Foreground conflicts: '+conflicts.join(', ')+'. Foreground scenery must not cover a prop.':'No foreground/prop rectangle overlaps.'}${sides.length?` Cursor ${sides.join(', ')}.`:''}\n`+
    (missing.length?'Background not generated yet. ':'')+'Production overlays read directly from src/lib/scenes; draft rects follow the composed artwork. Maplewood is part of the overworld.';
}
function edgeFacts(image){
  const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
  const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0);
  const pixels=cx.getImageData(0,0,c.width,c.height).data;let magenta=0,alpha=0;
  let white=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>0&&pixels[i+3]<255){alpha++;if(pixels[i]>225&&pixels[i+1]>225&&pixels[i+2]>225)white++;}if(pixels[i+3]>=128&&pixels[i]>180&&pixels[i+2]>180&&pixels[i+1]<110)magenta++;}
  return `${magenta} magenta pixels at ≥50% alpha · ${alpha} partial-alpha pixels · ${white} white fringe candidates`;
}
function selectScene(){
  scene=data.scenes.find(s=>s.id===$('scene').value);camera={...scene.arrival};walk={};stepped=null;sinceLanding={};world.width=scene.w;world.height=scene.h;dirty=true;
  $('rig-section').hidden=scene.rigInstances.length===0;
  $('comparison').src=`generated/${scene.id}/${scene.id}-master/image.webp`;
  $('assets').replaceChildren();
  for(const a of data.assets.filter(a=>a.scene===scene.id)){
    const card=document.createElement('article');card.className='card';const image=document.createElement('img');image.src=`generated/${a.file}`;image.alt=a.id;
    const title=document.createElement('strong');title.textContent=a.id;const detail=document.createElement('p');
    detail.textContent=`${a.width} × ${a.height} · ${a.tiles?.length??0} tiles · ${a.kind}`;
    card.append(image,title,detail);$('assets').append(card);
    if(!['background','reference'].includes(a.kind))image.addEventListener('load',()=>{detail.textContent+='\n'+edgeFacts(image);});
  }
  updateStatus();
}
$('scene').addEventListener('change',selectScene);
$('reset').onclick=()=>{walk={};stepped=null;sinceLanding={};stepTo({...scene.arrival});};
$('react').onclick=()=>{reaction=performance.now();dirty=true;};
document.querySelectorAll('input,select').forEach(control=>control.addEventListener('change',()=>{dirty=true;}));
const at=(event)=>{const r=world.getBoundingClientRect();return {x:(event.clientX-r.left)*scene.w/r.width,y:(event.clientY-r.top)*scene.h/r.height};};
// A click places the cursor as if it arrived there; with Walk on, moving the mouse walks it, so stepping onto a desk from
// behind or in front can be tried.
world.onclick=(event)=>{walk={};stepped=null;sinceLanding={};stepTo(at(event));};
world.onmousemove=(event)=>{if(enabled('walk'))stepTo(at(event));};
$('save').onclick=()=>{
  const report={scene:scene.id,date:new Date().toISOString(),notes:$('notes').value,geometry:$('status').textContent,assetHashes:Object.fromEntries(data.assets.filter(a=>a.scene===scene.id).map(a=>[a.id,a.source.sha256]))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${scene.id}-review.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('saved').textContent='Save under art/reviews/ with your visual verdict.';
};
try {
  const response=await fetch('./generated/review.json');if(!response.ok)throw new Error('Run node scripts/art.ts review first.');data=await response.json();
  for(const s of data.scenes){const option=document.createElement('option');option.value=s.id;option.textContent=s.title;$('scene').append(option);}
  const requested=new URLSearchParams(location.search).get('scene');if(data.scenes.some(s=>s.id===requested))$('scene').value=requested;
  selectScene();requestAnimationFrame(draw);
}catch(error){$('status').textContent=`${error.message} Serve this repository over HTTP, then open art/review.html.`;}
addEventListener('resize',()=>{dirty=true;});
