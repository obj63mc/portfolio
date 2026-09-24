import type { DepthRegion, Cutout } from '../../src/lib/scenes/types';

// Issue 02 proof district, local world coordinates. Production placement belongs to issue 04.
export const MAPLEWOOD = {
  id: 'maplewood', title: 'Maplewood · art proof', w: 1400, h: 1000,
  arrival: { x: 1165, y: 570 },
  depth: [{ rect: { x: 0, y: 0, w: 1400, h: 1000 }, horizonY: 160, foregroundY: 950 }] satisfies DepthRegion[],
  foreground: [{ key: 'maplewood-tree', rect: { x: 100, y: 735, w: 110, h: 160 } }] satisfies Cutout[],
  props: [
    { id: 'welcome', rect: { x: 1080, y: 515, w: 170, h: 105 } },
    { id: 'signpost', rect: { x: 840, y: 475, w: 85, h: 160 } },
    { id: 'door', rect: { x: 987, y: 374, w: 44, h: 60 } },
    { id: 'moose', rect: { x: 970, y: 510, w: 100, h: 110 } }
  ]
};
