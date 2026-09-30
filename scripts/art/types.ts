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
  /** A reference kept lossless because parts are keyed from it (a sprite sheet): lossy WebP bleeds the key into their edges. */
  lossless?: boolean;
  opening?: { asset: string; rect: Rect };
  registration?: { asset: string; rect: Rect; mask?: [number, number][] };
  /**
   * A rig part: its parent, its pivot as fractions of itself, and, for a part cut from a sprite sheet, `anchor`, the point
   * of its own source (px) that sits at the rig's origin. Without one its source is the rig master's frame.
   */
  rig?: { name: string; part: string; parent: string | null; pivot: [number, number]; anchor?: [number, number] };
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
/** An asset's folder under art/generated: each scene keeps its assets together, `<scene>/<id>`. */
export const assetDir = (asset: { id: string; scene: string }) => `${asset.scene}/${asset.id}`;
// The rider's wheels turn under its frame; a rig's other parts (the rider's pedal frames) are drawn only by the site.
export const RIG_DRAW_ORDER =['rear-wheel', 'front-wheel', 'body', 'head', 'antlers', 'eye'];
