import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { magick, processAsset } from './process.ts';
import { generate } from './generate.ts';
import { validateOutputs } from './validate.ts';
import { rigPart, rigsOf } from './review.ts';
import { DENSITIES, deliver, deliverySize, drawnSize, rigBoundsOf, webpLossless, webpSize } from './deliver.ts';
import type { Asset, Manifest, ProcessedAsset } from './types.ts';

/** A manifest's processed assets, as every pipeline command reads them back. */
const processed = (root: string, manifest: Manifest): ProcessedAsset[] =>
  manifest.assets.map(a => JSON.parse(readFileSync(join(root,'art/generated',a.scene,a.id,'asset.json'),'utf8')));
/** Validation as a pipeline command leaves things: the delivery sizes written after processing (review.ts), then the checks. */
const validated = (root: string, manifest: Manifest) => {
  const assets = processed(root,manifest);
  deliver(root,assets,manifest.sceneLayouts,rigBoundsOf(rigsOf(assets).rigs));
  return validateOutputs(root,manifest);
};

test('trimmed extraction retains scene registration and accepts measured fixture bounds', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-registration-'));
  try {
    const source = join(root, 'source.png');
    magick(['-size', '100x100', 'xc:#ff00ff', '-fill', '#205a68', '-draw', 'rectangle 20,30 59,69', source]);
    const asset: Asset = {id:'monitor',scene:'room',kind:'prop',prompt:'monitor',registration:{asset:'master',rect:{x:1000,y:500,w:200,h:200}}};
    const auto = processAsset(asset,source,join(root,'generated'));
    assert.deepEqual(auto.world,{x:1042,y:562,w:76,h:76});
    // Each scene keeps its assets together in art/generated/<scene>/<id>.
    assert.equal(auto.file,'room/monitor/image.webp');
    assert.deepEqual(readdirSync(join(root,'generated/room/monitor')).sort(),['asset.json','image.webp']);
    const anchor = {x:1040,y:560,w:80,h:80};
    const reviewed = processAsset({...asset,world:anchor},source,join(root,'generated'));
    assert.deepEqual(reviewed.world,anchor);
    assert.throws(()=>processAsset({...asset,registration:{asset:'master',rect:{x:0,y:0,w:200,h:100}}},source,join(root,'generated')),/aspect ratio/);
    assert.deepEqual(JSON.parse(readFileSync(join(root,'generated/room/monitor/asset.json'),'utf8')).world,anchor);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('a measured crop matte preserves original dark pixels and their position without generation', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-matte-'));
  try {
    const masterDir = join(root,'art/generated/room/master');mkdirSync(masterDir,{recursive:true});
    magick(['-size','100x100','xc:#205a68','-alpha','on','-region','3x3+42+52','-channel','A','-evaluate','set','0','+channel','+region','-define','webp:lossless=true',join(masterDir,'image.webp')]);
    writeFileSync(join(root,'style.txt'),'Use the original composition.');
    const master: Asset = {id:'master',scene:'room',kind:'reference',prompt:'room',world:{x:0,y:0,w:200,h:200}};
    const asset: Asset = {id:'chair',scene:'room',kind:'foreground',prompt:'extract',size:'100x100',deriveFrom:'master',registration:{asset:'master',rect:{x:40,y:60,w:100,h:100},mask:[[.2,.2],[.8,.2],[.8,.8],[.2,.7]]}};
    const manifest: Manifest = {version:1,style:'style.txt',references:[],assets:[master,asset]};
    const run = join(root,'run');
    const source = generate(asset,manifest,root,'codex',run);
    const result = processAsset(asset,source,join(root,'art/generated'));
    assert.deepEqual(result.world,{x:61,y:81,w:59,h:59});
    const file = join(root,'art/generated',result.file);
    assert.equal(magick([file,'-crop','1x1+10+10','-alpha','extract','-format','%[fx:mean]','info:']),'1');
    assert.match(magick([file,'-format','%[hex:p{10,10}]','info:']),/^205A68(?:FF)?$/);
    assert.equal(magick([file,'-crop','1x1+25+25','-alpha','extract','-format','%[fx:mean]','info:']),'0');
    const derivation = JSON.parse(readFileSync(join(run,'derivation.json'),'utf8'));
    assert.equal(derivation.operation,'masked-composition-crop');
    assert.match(derivation.referenceSha256,/^[0-9a-f]{64}$/);
    const childManifest = {...manifest,assets:[asset]};
    assert.match(validateOutputs(root,childManifest).join('\n'),/missing or mismatched derivative provenance/);
    const provenancePath = join(root,'art/generated/room/chair/provenance.json');
    const provenance = {sourceSha256:result.source.sha256,derivation};
    writeFileSync(provenancePath,JSON.stringify(provenance));
    assert.deepEqual(validated(root,childManifest),[]);
    // Reprocessing on another machine has no generation logs to restore evidence.
    processAsset(asset,source,join(root,'art/generated'));
    assert.deepEqual(JSON.parse(readFileSync(provenancePath,'utf8')),provenance);
    magick(['-size','100x100','xc:#ffcc00',join(masterDir,'image.webp')]);
    assert.match(validateOutputs(root,childManifest).join('\n'),/parent composition changed/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('foreground may cover scenery but must remain clear of an interactive prop', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-foreground-'));
  try {
    const source = join(root,'source.png');
    magick(['-size','40x40','xc:#ff00ff','-fill','#205a68','-draw','circle 20,20 20,5',source]);
    const cabinet: Asset = {id:'cabinet',scene:'room',kind:'scenery',prompt:'casework',world:{x:0,y:0,w:100,h:200}};
    const chair: Asset = {id:'chair',scene:'room',kind:'foreground',prompt:'chair',world:{x:0,y:140,w:100,h:60}};
    const glass: Asset = {id:'glass',scene:'room',kind:'prop',prompt:'interactive face',world:{x:10,y:10,w:80,h:100}};
    const manifest: Manifest = {version:1,style:'unused',references:[],assets:[cabinet,chair,glass]};
    for (const asset of manifest.assets) processAsset(asset,source,join(root,'art/generated'));
    assert.deepEqual(validated(root,manifest),[]);
    glass.world!.h = 160;
    processAsset(glass,source,join(root,'art/generated'));
    assert.deepEqual(validated(root,manifest),['chair: foreground bounds overlap prop glass']);
    glass.world!.h = 100;
    processAsset(glass,source,join(root,'art/generated'));
    manifest.sceneLayouts = {room:{arrival:{x:0,y:0},rigs:[{name:'rider',rect:{x:200,y:150,w:10,h:10},travelX:150}]}};
    assert.deepEqual(validated(root,manifest),['chair: foreground bounds overlap prop rider']);
    manifest.sceneLayouts.room.rigs[0].travelX = 0;
    assert.deepEqual(validated(root,manifest),[]);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('a rig part cut from a sprite sheet sits at its trim less its anchor, and needs no master frame', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-anchor-'));
  try {
    const source = join(root,'source.png');
    magick(['-size','60x40','xc:#ff00ff','-fill','#205a68','-draw','circle 20,15 20,5',source]);
    // A sprite sheet is kept lossless, so its keyed cells' edges carry no bleed of the key.
    const master: Asset = {id:'bike-master',scene:'room',kind:'reference',prompt:'bike',lossless:true};
    magick(['-size','100x100','plasma:','-depth','8',source.replace('source','master')]);
    const sheet = join(root,'art/generated',processAsset(master,source.replace('source','master'),join(root,'art/generated')).file);
    assert.equal(magick([sheet,source.replace('source','master'),'-compose','difference','-composite','-format','%[fx:maxima]','info:']),'0');
    const frame: Asset = {id:'bike-frame',scene:'room',kind:'part',prompt:'frame',rig:{name:'bike',part:'body',parent:null,pivot:[.5,.5],anchor:[20,15]}};
    const result = processAsset(frame,source,join(root,'art/generated'));
    assert.deepEqual(rigPart(result),{parent:null,x:-9,y:-9,w:19,h:19,pivot:[.5,.5],file:'room/bike-frame/image.webp'});
    assert.deepEqual(rigPart({...result,rig:{...result.rig!,anchor:undefined}}),{parent:null,x:11,y:6,w:19,h:19,pivot:[.5,.5],file:'room/bike-frame/image.webp'});
    const manifest: Manifest = {version:1,style:'unused',references:[],assets:[master,frame]};
    assert.deepEqual(validateOutputs(root,manifest),[]);
    processAsset({...frame,rig:{...frame.rig!,anchor:undefined}},source,join(root,'art/generated'));
    assert.deepEqual(validateOutputs(root,{...manifest,assets:[master,{...frame,rig:{...frame.rig!,anchor:undefined}}]}),['bike-frame: master and part frame dimensions differ; registration requires review']);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('a cut-out is delivered at the size the site draws it at each density, never enlarged, and a rig part as its rig is laid out', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-deliver-'));
  try {
    const out = join(root,'art/generated'), source = join(root,'source.png');
    // One 400 x 200 cut-out, a hole through it, once keyed, eroded a px and trimmed: far larger than any of them is drawn.
    magick(['-size','420x220','xc:#ff00ff','-fill','#205a68','-draw','rectangle 9,9 410,210','-fill','#ff00ff','-draw','rectangle 100,60 140,100',source]);
    const sign: Asset = {id:'sign',scene:'room',kind:'prop',prompt:'sign',world:{x:0,y:0,w:100,h:50}};
    const big: Asset = {id:'big',scene:'room',kind:'scenery',prompt:'big',world:{x:200,y:0,w:190,h:95}};
    const body: Asset = {id:'moose-body',scene:'room',kind:'part',prompt:'body',rig:{name:'moose',part:'body',parent:null,pivot:[.5,1]}};
    const plate: Asset = {id:'room-master',scene:'room',kind:'reference',prompt:'room',world:{x:0,y:0,w:400,h:200}};
    const manifest: Manifest = {version:1,style:'unused',references:[],assets:[sign,big,body,plate],
      sceneLayouts:{room:{arrival:{x:0,y:0},rigs:[{name:'moose',rect:{x:0,y:100,w:80,h:60},travelX:0}]}}};
    for (const asset of manifest.assets) processAsset(asset,source,out);
    assert.match(validateOutputs(root,manifest).join('\n'),/sign: no delivery size at 1\.25/, 'a cut-out with none is reported');
    assert.deepEqual(validated(root,manifest),[]);
    const size = (id: string, density: number) => webpSize(join(out,'room',id,`${density}.webp`));
    assert.deepEqual(DENSITIES.map(d => size('sign',d)),[{w:125,h:63},{w:200,h:100}]);
    // 190 world px at 2 is 380 of its 400: delivered at that; never past its original.
    assert.deepEqual(DENSITIES.map(d => size('big',d)),[{w:238,h:119},{w:380,h:190}]);
    assert.deepEqual(deliverySize({width:200,height:100} as ProcessedAsset,{w:190,h:95},2),{w:200,h:100});
    // Past 256 x 256 px a delivery is lossy, as the tiles are; a small one stays lossless, as every original is.
    const lossless = (id: string, file: string) => webpLossless(join(out,'room',id,file));
    assert.deepEqual(['image.webp','1.25.webp','2.webp'].map(f => lossless('big',f)),[true,true,false]);
    assert.deepEqual(['image.webp','1.25.webp','2.webp'].map(f => lossless('sign',f)),[true,true,true]);
    // The rig is one part, 400 x 200, fitted into 80 x 60: a fifth its size, so 100 x 50 at 1.25.
    assert.deepEqual(DENSITIES.map(d => size('moose-body',d)),[{w:100,h:50},{w:160,h:80}]);
    assert.equal(drawnSize(processed(root,manifest)[3],manifest.sceneLayouts,{}),null,'a reference is never delivered');
    assert.deepEqual(readdirSync(join(out,'room/room-master')).sort(),['asset.json','image.webp']);
    // A delivery keeps its cut-out's transparency exactly, and its colour: the lossy one as near as a tile keeps the plate's.
    for (const [id, x, y] of [['sign',100,50],['big',190,95]] as const) {
      const file = join(out,'room',id,'2.webp'), hole = id === 'sign' ? '1x1+55+35' : '1x1+105+67';
      assert.equal(magick([file,'-crop',hole,'-alpha','extract','-format','%[fx:mean]','info:']),'0',id);
      assert.equal(magick([file,'-crop',`1x1+${x}+${y}`,'-alpha','extract','-format','%[fx:mean]','info:']),'1',id);
      assert.equal(magick([file,'-format',`%[fx:abs(p{${x},${y}}.r-32/255)<.02&&abs(p{${x},${y}}.g-90/255)<.02&&abs(p{${x},${y}}.b-104/255)<.02]`,'info:']),'1',id);
    }
    // Up to date, nothing is written again; a world rect that changed is, at its new size.
    const assets = processed(root,manifest), bounds = rigBoundsOf(rigsOf(assets).rigs);
    assert.equal(deliver(root,assets,manifest.sceneLayouts,bounds),0);
    sign.world = {x:0,y:0,w:80,h:40};
    processAsset(sign,source,out);
    assert.deepEqual(validated(root,manifest),[]);
    assert.deepEqual(DENSITIES.map(d => size('sign',d)),[{w:100,h:50},{w:160,h:80}]);
    manifest.sceneLayouts!.room.rigs[0].rect.w = 40;
    assert.match(validateOutputs(root,manifest).join('\n'),/moose-body: its delivery size at 2 must be 80 × 40/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
