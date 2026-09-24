const $ = (id) => document.getElementById(id);
const world = $('world'), phone = $('phone');
const ctx = world.getContext('2d'), pc = phone.getContext('2d'), rc = $('rigview').getContext('2d');
const cache = new Map();
let data, scene, camera, reaction = -10000, last = 0, dirty = true, lastFrame = 0;
const enabled = (id) => $(id).checked;
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
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
function rect(r,color,label) {
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.fillStyle=color;ctx.font='20px system-ui';ctx.fillText(label,r.x+5,r.y+24);
}
function line(y,color,x=0,w=scene.w) {
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
}
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
  for(const [key,p] of parts.sort(([a],[b])=>data.rigDrawOrder.indexOf(a)-data.rigDrawOrder.indexOf(b))) {
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
  ctx.fillStyle='#fff';ctx.strokeStyle='#243830';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(camera.x,camera.y);ctx.lineTo(camera.x+11,camera.y+36);ctx.lineTo(camera.x+18,camera.y+23);ctx.lineTo(camera.x+33,camera.y+20);ctx.closePath();ctx.fill();ctx.stroke();
  if(enabled('foreground')&&!showMaster)for(const layer of scene.layers.filter(l=>l.kind==='foreground')){const a=data.assets.find(a=>a.id===layer.asset);drawImage(ctx,`generated/${a.file}`,layer.rect);}
  if(enabled('depth'))for(const [i,d] of scene.depth.entries()){
    rect(d.rect,'#e8c576',`depth ${i+1}`);line(d.horizonY,'#e8c576',d.rect.x,d.rect.w);line(d.foregroundY,'#a9b866',d.rect.x,d.rect.w);
  }
  if(enabled('rects')){
    for(const p of scene.props??[])rect(p.rect,'#31be82',p.id);
    for(const f of scene.foreground??[])rect(f.rect,'#e083b9',f.key);
  }
  if(enabled('draftRects')){
    ctx.setLineDash([9,6]);
    for(const layer of scene.layers)rect(layer.rect,layer.kind==='prop'?'#9be6b9':layer.kind==='scenery'?'#a9d2ed':'#f6a6d3',layer.id+' · draft');
    ctx.setLineDash([]);
  }
  if(enabled('river')&&scene.river){
    const r=scene.river;ctx.fillStyle='#55d6e54d';ctx.beginPath();r.mask.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
    // The deck is excluded from the overlay mask and shown as a distinct walkable rectangle.
    if(plate) {ctx.save();ctx.beginPath();ctx.rect(r.deck.x,r.deck.y,r.deck.w,r.deck.h);ctx.clip();drawImage(ctx,`generated/${plate.file}`,{x:0,y:0,w:scene.w,h:scene.h});ctx.restore();}
    rect(r.deck,'#fff','bridge deck');if(r.bridge)rect(r.bridge.rect,'#f6a6d3',r.bridge.key);line(r.southEndY,'#ff7969');ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r.arch.x,r.arch.y,18,0,Math.PI*2);ctx.fill();
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
  $('status').textContent=`${scene.w} × ${scene.h} world px. ${sign?'Signpost in phone frame: '+(fits?'PASS':'FAIL')+'. ':''}${conflicts.length?'Foreground conflicts: '+conflicts.join(', ')+'. Foreground scenery must not cover a prop.':'No foreground/prop rectangle overlaps.'}\n`+
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
  scene=data.scenes.find(s=>s.id===$('scene').value);camera={...scene.arrival};world.width=scene.w;world.height=scene.h;dirty=true;
  $('rig-section').hidden=scene.rigInstances.length===0;
  $('comparison').src=`generated/${scene.id}-master/image.webp`;
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
$('reset').onclick=()=>{camera={...scene.arrival};dirty=true;updateStatus();};
$('react').onclick=()=>{reaction=performance.now();dirty=true;};
document.querySelectorAll('input,select').forEach(control=>control.addEventListener('change',()=>{dirty=true;}));
world.onclick=(event)=>{const r=world.getBoundingClientRect();camera={x:(event.clientX-r.left)*scene.w/r.width,y:(event.clientY-r.top)*scene.h/r.height};dirty=true;updateStatus();};
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
