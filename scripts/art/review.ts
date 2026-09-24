import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, ProcessedAsset } from './types.ts';
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
  const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) });
  const sourceScenes = [
    { ...OVERWORLD, arrival: centre(OVERWORLD.districts.flatMap(d => d.venues.flatMap(v => v.props)).find(p => p.id === 'welcome')!.rect), props: [
      { id: 'signpost', rect: OVERWORLD.signpost.rect }, ...OVERWORLD.districts.flatMap(d => d.venues.flatMap(v => v.props))
    ] },
    ...Object.values(SUB_SCENES).map(scene => ({ ...scene, arrival: { x: 1422, y: 1000 } }))
  ];
  const scenes = sourceScenes.map(scene => {
    const layout = manifest.sceneLayouts?.[scene.id];
    const rigInstances = layout?.rigs ?? [];
    const layers = assets.flatMap(asset => {
      if (asset.scene !== scene.id || !asset.world || !['scenery', 'prop', 'foreground'].includes(asset.kind)) return [];
      return [{ id: asset.id, asset: asset.id, kind: asset.kind, rect: asset.world }];
    });
    return { ...scene, arrival: layout?.arrival ?? scene.arrival, layers, rigInstances,
      artProps: [...layers.filter(l => l.kind === 'prop').map(l => ({ id: l.id, rect: l.rect })),
        ...rigInstances.map(rig => ({ id: rig.name, rect: { ...rig.rect, x: rig.rect.x-rig.travelX, w: rig.rect.w+rig.travelX*2 } }))],
      artForeground: layers.filter(l => l.kind === 'foreground').map(l => ({ key: l.id, rect: l.rect })) };
  });
  mkdirSync(join(root, 'art/generated'), { recursive: true });
  for (const [name, rig] of Object.entries(rigs)) writeFileSync(join(root, `art/generated/${name}-rig.json`), JSON.stringify(rig, null, 2) + '\n');
  writeFileSync(join(root, 'art/generated/review.json'), JSON.stringify({ scenes, assets, rigs, rigBounds, rigDrawOrder: RIG_DRAW_ORDER,
    pending: manifest.assets.filter(a => !assets.some(p => p.id === a.id)).map(a => a.id) }, null, 2) + '\n');
  console.log(`Review data: ${assets.length}/${manifest.assets.length} assets. art/review.html`);
  if (composites) compose(root, scenes, assets, rigs, rigBounds);
}
