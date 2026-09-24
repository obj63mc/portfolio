import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dimensions, magick } from './process.ts';
import type { Manifest, ProcessedAsset } from './types.ts';

export function validateOutputs(root: string, manifest: Manifest): string[] {
  const problems: string[] = [];
  for (const asset of manifest.assets) {
    const dir = join(root, 'art/generated', asset.id), metadata = join(dir, 'asset.json');
    if (!existsSync(metadata)) { problems.push(`${asset.id}: not generated`); continue; }
    const result = JSON.parse(readFileSync(metadata, 'utf8')) as ProcessedAsset;
    const file = join(root, 'art/generated', result.file);
    const size = dimensions(file);
    if (size.w !== result.width || size.h !== result.height) problems.push(`${asset.id}: dimensions disagree with metadata`);
    if (asset.world && JSON.stringify(asset.world) !== JSON.stringify(result.world)) problems.push(`${asset.id}: world rect changed; reprocess this asset`);
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
      const master = join(root, 'art/generated', `${asset.rig.name}-master`, 'asset.json');
      if (existsSync(master)) {
        const source = JSON.parse(readFileSync(master, 'utf8')).source;
        if (result.source.w !== source.w || result.source.h !== source.h) problems.push(`${asset.id}: master and part frame dimensions differ; registration requires review`);
      }
    }
  }
  return problems;
}
