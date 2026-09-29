import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { dimensions, magick } from './process.ts';
import type { Manifest, ProcessedAsset } from './types.ts';
import { assetDir } from './types.ts';

export function validateOutputs(root: string, manifest: Manifest): string[] {
  const problems: string[] = [];
  const placed: ProcessedAsset[] = [];
  for (const asset of manifest.assets) {
    const dir = join(root, 'art/generated', assetDir(asset)), metadata = join(dir, 'asset.json');
    if (!existsSync(metadata)) { problems.push(`${asset.id}: not generated`); continue; }
    const result = JSON.parse(readFileSync(metadata, 'utf8')) as ProcessedAsset;
    if (result.world) placed.push(result);
    const file = join(root, 'art/generated', result.file);
    const size = dimensions(file);
    if (size.w !== result.width || size.h !== result.height) problems.push(`${asset.id}: dimensions disagree with metadata`);
    if (asset.world && JSON.stringify(asset.world) !== JSON.stringify(result.world)) problems.push(`${asset.id}: world rect changed; reprocess this asset`);
    if (asset.registration) {
      if (JSON.stringify(asset.registration) !== JSON.stringify(result.registration)) problems.push(`${asset.id}: registration changed; regenerate this asset`);
      const r = asset.registration.rect, t = result.trim, s = result.source;
      const expected = asset.world ?? {x:r.x+t.x/s.w*r.w,y:r.y+t.y/s.h*r.h,w:t.w/s.w*r.w,h:t.h/s.h*r.h};
      if (JSON.stringify(expected) !== JSON.stringify(result.world)) problems.push(`${asset.id}: placement must match its reviewed anchor or source crop and trim offset`);
    }
    const provenance = join(dir, 'provenance.json');
    if (asset.deriveFrom) {
      const parent = join(root, 'art/generated', asset.scene, asset.deriveFrom, 'image.webp');
      const evidence = existsSync(provenance) ? JSON.parse(readFileSync(provenance, 'utf8')) : undefined;
      const derivation = evidence?.derivation;
      if (evidence?.sourceSha256 !== result.source.sha256 || derivation?.asset !== asset.deriveFrom || !/^[0-9a-f]{64}$/.test(derivation?.referenceSha256 ?? '') || !existsSync(parent)) {
        problems.push(`${asset.id}: missing or mismatched derivative provenance; regenerate this derivative`);
      } else if (derivation.referenceSha256 !== createHash('sha256').update(readFileSync(parent)).digest('hex')) {
        problems.push(`${asset.id}: parent composition changed; regenerate this derivative`);
      }
    }
    if (asset.kind === 'background' && asset.world) {
      const { w, h } = asset.world;
      if (size.w !== w * 2 || size.h !== h * 2) problems.push(`${asset.id}: desktop plate must be ${w * 2} × ${h * 2}`);
      for (const density of [1.25, 2]) {
        const tiles = result.tiles?.filter(t => t.density === density) ?? [];
        const expected = Math.ceil(w / 512) * Math.ceil(h / 512);
        if (tiles.length !== expected) problems.push(`${asset.id}: expected ${expected} tiles at ${density}`);
        const seen = new Set<string>(); let area = 0;
        for (const tile of tiles) {
          const key = `${tile.x},${tile.y}`;
          if (seen.has(key)) problems.push(`${asset.id}: duplicate tile ${key}`);
          seen.add(key);
          if (tile.x % 512 || tile.y % 512 || tile.x < 0 || tile.y < 0 || tile.w !== Math.min(512,w-tile.x) || tile.h !== Math.min(512,h-tile.y)) problems.push(`${asset.id}: invalid tile ${key}`);
          area += tile.w * tile.h;
          const actual = dimensions(join(root, 'art/generated', tile.file));
          if (actual.w !== Math.round(tile.w*density) || actual.h !== Math.round(tile.h*density)) problems.push(`${asset.id}: wrong pixel dimensions at ${density}/${key}`);
        }
        if (area !== w*h) problems.push(`${asset.id}: incomplete tile coverage at ${density}`);
      }
    } else if (asset.kind !== 'reference') {
      const opaque = magick([file, '-format', '%[opaque]', 'info:']);
      if (opaque === 'True') problems.push(`${asset.id}: missing transparent background`);
    }
    if (asset.rig) {
      const master = join(root, 'art/generated', asset.scene, `${asset.rig.name}-master`, 'asset.json');
      if (existsSync(master)) {
        const source = JSON.parse(readFileSync(master, 'utf8')).source;
        if (result.source.w !== source.w || result.source.h !== source.h) problems.push(`${asset.id}: master and part frame dimensions differ; registration requires review`);
      }
    }
  }
  const props = [
    ...placed.filter(a => a.kind === 'prop').map(a => ({id:a.id,scene:a.scene,rect:a.world!})),
    ...Object.entries(manifest.sceneLayouts ?? {}).flatMap(([scene,layout]) => layout.rigs.map(rig => ({
      id:rig.name,scene,rect:{...rig.rect,x:rig.rect.x-rig.travelX,w:rig.rect.w+rig.travelX*2}
    })))
  ];
  for (const foreground of placed.filter(a => a.kind === 'foreground')) {
    const a = foreground.world!;
    for (const prop of props.filter(p => p.scene === foreground.scene)) {
      const b = prop.rect;
      if (a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y) {
        problems.push(`${foreground.id}: foreground bounds overlap prop ${prop.id}`);
      }
    }
  }
  return problems;
}
