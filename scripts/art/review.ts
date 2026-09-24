import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, ProcessedAsset } from './types.ts';
import { maplewoodScene } from '../../art/scenes/maplewood.ts';
import { RIG_DRAW_ORDER } from './types.ts';
import { OVERWORLD } from '../../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../../src/lib/scenes/index.ts';
import { compose } from './compose.ts';
import { saveProvenance } from './provenance.ts';

export async function buildReview(root: string, manifest: Manifest, composites = false) {
  const assets: ProcessedAsset[] = manifest.assets.flatMap(a => {
    const path = join(root, 'art/generated', a.id, 'asset.json');
    return existsSync(path) ? [JSON.parse(readFileSync(path, 'utf8')) as ProcessedAsset] : [];
  });
  const rigs: Record<string, Record<string, { parent: string | null; x: number; y: number; w: number; h: number; pivot: number[]; file: string }>> = {};
  for (const asset of assets) saveProvenance(root, asset);
  for (const asset of assets) if (asset.rig) {
    const { name, part, parent, pivot } = asset.rig;
    const rig = rigs[name] ??= {};
    // Source-space trim offsets preserve registration when independently keyed parts are trimmed.
    rig[part] = { parent, x: asset.trim.x, y: asset.trim.y, w: asset.width, h: asset.height, pivot, file: asset.file };
  }
  const rigBounds = Object.fromEntries(Object.entries(rigs).map(([name, rig]) => {
    const parts = Object.values(rig), x = Math.min(...parts.map(p => p.x)), y = Math.min(...parts.map(p => p.y));
    return [name, { x, y, w: Math.max(...parts.map(p => p.x+p.w))-x, h: Math.max(...parts.map(p => p.y+p.h))-y }];
  }));
  const sourceScenes = [maplewoodScene(manifest.assets),
    { ...OVERWORLD, arrival: { x: 1390, y: 1456 }, props: [
      { id: 'signpost', rect: OVERWORLD.signpost.rect }, ...OVERWORLD.districts.flatMap(d => d.venues.flatMap(v => v.props))
    ] },
    ...Object.values(SUB_SCENES).map(scene => ({
      ...scene, arrival: { x: 1422, y: 1000 },
      artProps: manifest.assets.flatMap(a => a.scene === scene.id && a.kind === 'prop' && a.world ? [{ id: a.id, rect: a.world }] : []),
      artForeground: manifest.assets.flatMap(a => a.scene === scene.id && a.kind === 'foreground' && a.world ? [{ key: a.id, rect: a.world }] : [])
    }))
  ];
  const scenes = sourceScenes.map(scene => {
    const rig = scene.id === 'maplewood' ? { name: 'moose', rect: scene.props.find(p => p.id === 'moose')!.rect, travelX: 0 } :
      scene.id === 'overworld' ? { name: 'rider', rect: { x: 2100, y: 2200, w: 240, h: 160 }, travelX: 300 } : undefined;
    const layers = assets.flatMap(asset => {
      if (asset.scene !== scene.id || !asset.world || !['prop', 'foreground'].includes(asset.kind)) return [];
      const rects = asset.id === 'lobby-desk' ? scene.props.filter(p => p.id.startsWith('desk-')).map(p => p.rect) : [asset.world];
      return rects.map((rect, i) => ({ id: `${asset.id}-${i}`, asset: asset.id, kind: asset.kind, rect }));
    });
    return { ...scene, layers, rig,
      artProps: [...layers.filter(l => l.kind === 'prop').map(l => ({ id: l.id, rect: l.rect })),
        ...(rig ? [{ id: rig.name, rect: { ...rig.rect, x: rig.rect.x-rig.travelX, w: rig.rect.w+rig.travelX*2 } }] : [])],
      artForeground: layers.filter(l => l.kind === 'foreground').map(l => ({ key: l.id, rect: l.rect })) };
  });
  mkdirSync(join(root, 'art/generated'), { recursive: true });
  for (const [name, rig] of Object.entries(rigs)) writeFileSync(join(root, `art/generated/${name}-rig.json`), JSON.stringify(rig, null, 2) + '\n');
  writeFileSync(join(root, 'art/generated/review.json'), JSON.stringify({ scenes, assets, rigs, rigBounds, rigDrawOrder: RIG_DRAW_ORDER,
    pending: manifest.assets.filter(a => !assets.some(p => p.id === a.id)).map(a => a.id) }, null, 2) + '\n');
  console.log(`Review data: ${assets.length}/${manifest.assets.length} assets. art/review.html`);
  if (composites) compose(root, scenes, assets, rigs, rigBounds);
}
