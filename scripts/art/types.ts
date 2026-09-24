export interface Rect { x: number; y: number; w: number; h: number }
export interface RigPlacement { name: string; rect: Rect; travelX: number }
export interface Asset {
  id: string;
  scene: string;
  kind: 'background' | 'scenery' | 'prop' | 'foreground' | 'part' | 'reference';
  prompt: string;
  references?: string[];
  dependsOn?: string[];
  deriveFrom?: string;
  world?: Rect;
  size?: string;
  upscale?: number;
  opening?: { asset: string; rect: Rect };
  registration?: { asset: string; rect: Rect; mask?: [number, number][] };
  rig?: { name: string; part: string; parent: string | null; pivot: [number, number] };
}
export interface Manifest {
  version: number;
  style: string;
  references: string[];
  assets: Asset[];
  sceneLayouts?: Record<string, { arrival: { x: number; y: number }; rigs: RigPlacement[] }>;
}
export interface ProcessedAsset {
  id: string;
  kind: Asset['kind'];
  scene: string;
  file: string;
  world?: Rect;
  source: { w: number; h: number; sha256: string };
  trim: Rect;
  width: number;
  height: number;
  tiles?: { density: number; x: number; y: number; w: number; h: number; file: string }[];
  rig?: Asset['rig'];
  registration?: Asset['registration'];
}
export const RIG_DRAW_ORDER = ['body', 'rear-wheel', 'front-wheel', 'head', 'antlers', 'eye'];
