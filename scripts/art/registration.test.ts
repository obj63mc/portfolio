import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { magick, processAsset } from './process.ts';
import { generate } from './generate.ts';
import type { Asset, Manifest } from './types.ts';

test('trimmed extraction retains scene registration and accepts measured fixture bounds', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-registration-'));
  try {
    const source = join(root, 'source.png');
    magick(['-size', '100x100', 'xc:#ff00ff', '-fill', '#205a68', '-draw', 'rectangle 20,30 59,69', source]);
    const asset: Asset = {id:'monitor',scene:'room',kind:'prop',prompt:'monitor',registration:{asset:'master',rect:{x:1000,y:500,w:200,h:200}}};
    const auto = processAsset(asset,source,join(root,'generated'));
    assert.deepEqual(auto.world,{x:1042,y:562,w:76,h:76});
    const anchor = {x:1040,y:560,w:80,h:80};
    const reviewed = processAsset({...asset,world:anchor},source,join(root,'generated'));
    assert.deepEqual(reviewed.world,anchor);
    assert.throws(()=>processAsset({...asset,registration:{asset:'master',rect:{x:0,y:0,w:200,h:100}}},source,join(root,'generated')),/aspect ratio/);
    assert.deepEqual(JSON.parse(readFileSync(join(root,'generated/monitor/asset.json'),'utf8')).world,anchor);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('a measured crop matte preserves original dark pixels and their position without generation', () => {
  const root = mkdtempSync(join(tmpdir(), 'art-matte-'));
  try {
    const masterDir = join(root,'art/generated/master');mkdirSync(masterDir,{recursive:true});
    magick(['-size','100x100','xc:#205a68','-define','webp:lossless=true',join(masterDir,'image.webp')]);
    writeFileSync(join(root,'style.txt'),'Use the original composition.');
    const master: Asset = {id:'master',scene:'room',kind:'reference',prompt:'room',world:{x:0,y:0,w:200,h:200}};
    const asset: Asset = {id:'chair',scene:'room',kind:'foreground',prompt:'extract',size:'100x100',deriveFrom:'master',registration:{asset:'master',rect:{x:40,y:60,w:100,h:100},mask:[[.2,.2],[.8,.2],[.8,.8],[.2,.8]]}};
    const manifest: Manifest = {version:1,style:'style.txt',references:[],assets:[master,asset]};
    const run = join(root,'run');
    const source = generate(asset,manifest,root,'codex',run);
    const result = processAsset(asset,source,join(root,'art/generated'));
    assert.deepEqual(result.world,{x:61,y:81,w:59,h:59});
    const file = join(root,'art/generated',result.file);
    assert.equal(magick([file,'-crop','1x1+20+20','-alpha','extract','-format','%[fx:mean]','info:']),'1');
    assert.match(magick([file,'-format','%[hex:p{20,20}]','info:']),/^205A68(?:FF)?$/);
    const derivation = JSON.parse(readFileSync(join(run,'derivation.json'),'utf8'));
    assert.equal(derivation.operation,'masked-composition-crop');
    assert.match(derivation.referenceSha256,/^[0-9a-f]{64}$/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
