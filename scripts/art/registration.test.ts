import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { magick, processAsset } from './process.ts';
import { generate } from './generate.ts';
import { validateOutputs } from './validate.ts';
import type { Asset, Manifest } from './types.ts';

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
    assert.deepEqual(validateOutputs(root,childManifest),[]);
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
    assert.deepEqual(validateOutputs(root,manifest),[]);
    glass.world!.h = 160;
    processAsset(glass,source,join(root,'art/generated'));
    assert.deepEqual(validateOutputs(root,manifest),['chair: foreground bounds overlap prop glass']);
    glass.world!.h = 100;
    processAsset(glass,source,join(root,'art/generated'));
    manifest.sceneLayouts = {room:{arrival:{x:0,y:0},rigs:[{name:'rider',rect:{x:200,y:150,w:10,h:10},travelX:150}]}};
    assert.deepEqual(validateOutputs(root,manifest),['chair: foreground bounds overlap prop rider']);
    manifest.sceneLayouts.room.rigs[0].travelX = 0;
    assert.deepEqual(validateOutputs(root,manifest),[]);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
