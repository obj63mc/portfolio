import type { DepthRegion, Cutout } from '../../src/lib/scenes/types';
import type { Asset } from '../../scripts/art/types.ts';

// Issue 02 proof district, local world coordinates. Production placement belongs to issue 04.
export function maplewoodScene(assets: Asset[]) {
  const rect = (id: string) => {
    const world = assets.find(asset => asset.id === id)?.world;
    if (!world) throw new Error(`Maplewood proof requires a world rect for ${id}`);
    return world;
  };
  return {
  id: 'maplewood', title: 'Maplewood · art proof', w: 1400, h: 1000,
  arrival: { x: 1165, y: 570 },
  depth: [{ rect: { x: 0, y: 0, w: 1400, h: 1000 }, horizonY: 160, foregroundY: 950 }] satisfies DepthRegion[],
  foreground: [{ key: 'maplewood-tree', rect: rect('maplewood-tree') }] satisfies Cutout[],
  props: [
    ...['welcome', 'signpost', 'door'].map(id => ({ id, rect: rect(id) })),
    { id: 'moose', rect: { x: 970, y: 510, w: 100, h: 110 } }
  ]
  };
}
