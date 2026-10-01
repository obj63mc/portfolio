// A cut-out's delivery sizes: the site draws no cut-out at more than 2 image px per world px, and at 1.25 on a phone or
// a 1x screen, the background tiles' two densities, yet a cut-out is kept at its source's size, up to eleven times that
// (a 1167 px bike for a 100 world px prop), and lossless, four or five times a tile's bytes for the same pixels. So beside
// each `image.webp`, which stays the retained lossless original the workshop reads, the pipeline writes `1.25.webp` and
// `2.webp` at the size the site draws it, the large ones encoded as the tiles are, and the site fetches only those.
import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { magick } from './process.ts';
import type { Manifest, ProcessedAsset, Rect } from './types.ts';
import { assetDir } from './types.ts';

/** The densities the site draws at, image px per world px: the background tiles' (process.ts). */
export const DENSITIES = [1.25, 2];
/**
 * A delivery's encoding. A large one is lossy like the tiles its cut-out is drawn over, a little above their quality 85
 * since a hovered prop is looked at, its chroma kept sharp at flat colour's edges and its alpha exact, so its silhouette is
 * its original's. One of up to SMALL px (256 x 256: the rider, the bike, a bottle) stays lossless: lossy chroma softens
 * a small prop's thin coloured lines, and saves a few kilobytes at most.
 */
const SMALL = 256 * 256;
const LOSSY = ['-quality', '90', '-define', 'webp:lossless=false', '-define', 'webp:method=6', '-define', 'webp:use-sharp-yuv=1', '-define', 'webp:alpha-quality=100'];
const LOSSLESS = ['-define', 'webp:lossless=true', '-define', 'webp:method=6'];

/** A WebP file's pixel size, read from its header, so checking a size never starts ImageMagick. */
export function webpSize(path: string): { w: number; h: number } {
  const b = Buffer.alloc(30), fd = openSync(path, 'r');
  try { readSync(fd, b, 0, 30, 0); } finally { closeSync(fd); }
  const chunk = b.toString('latin1', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1 }; }
  if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error(`Not a WebP image: ${path}`);
}

/** Whether a WebP file's pixels are stored lossless: its image chunk is VP8L, on its own or inside an extended file. */
export function webpLossless(path: string): boolean {
  const b = readFileSync(path);
  for (let at = 12; at + 8 <= b.length; at += 8 + b.readUInt32LE(at + 4) + (b.readUInt32LE(at + 4) & 1)) {
    const chunk = b.toString('latin1', at, at + 4);
    if (chunk === 'VP8L' || chunk === 'VP8 ') return chunk === 'VP8L';
  }
  throw new Error(`Not a WebP image: ${path}`);
}

/** Each rig's bounds in its own space: the box round every part, which the site fits into the rig's rect. */
export function rigBoundsOf(parts: Record<string, Record<string, Rect>>): Record<string, Rect> {
  return Object.fromEntries(Object.entries(parts).map(([name, rig]) => {
    const all = Object.values(rig), x = Math.min(...all.map(p => p.x)), y = Math.min(...all.map(p => p.y));
    return [name, { x, y, w: Math.max(...all.map(p => p.x + p.w)) - x, h: Math.max(...all.map(p => p.y + p.h)) - y }];
  }));
}

/**
 * The size the site draws a cut-out at, world px: its world rect's, or a rig's part (the moose's, the rider's) as its rig
 * is fitted into its laid-out rect. None for what the site never draws: a plate, a reference, a part of no laid-out rig.
 */
export function drawnSize(asset: ProcessedAsset, layouts: Manifest['sceneLayouts'], rigBounds: Record<string, Rect>): { w: number; h: number } | null {
  if (asset.kind === 'part') {
    const rect = layouts?.[asset.scene]?.rigs.find(r => r.name === asset.rig?.name)?.rect, bounds = asset.rig && rigBounds[asset.rig.name];
    if (!rect || !bounds) return null;
    const fit = Math.min(rect.w / bounds.w, rect.h / bounds.h);
    return { w: asset.width * fit, h: asset.height * fit };
  }
  return asset.world && ['prop', 'scenery', 'foreground'].includes(asset.kind) ? { w: asset.world.w, h: asset.world.h } : null;
}

/** A cut-out's pixel size at `density`: what it is drawn at, never larger than its original, which is delivered at its own size. */
export function deliverySize(asset: ProcessedAsset, drawn: { w: number; h: number }, density: number): { w: number; h: number } {
  const w = Math.max(1, Math.round(drawn.w * density)), h = Math.max(1, Math.round(drawn.h * density));
  return w >= asset.width || h >= asset.height ? { w: asset.width, h: asset.height } : { w, h };
}

/** Every cut-out the site draws, with its delivery file at each density, its size and whether it stays lossless. */
export function deliveries(assets: ProcessedAsset[], layouts: Manifest['sceneLayouts'], rigBounds: Record<string, Rect>) {
  return assets.flatMap(asset => {
    const drawn = drawnSize(asset, layouts, rigBounds);
    return drawn ? DENSITIES.map(density => {
      const size = deliverySize(asset, drawn, density);
      return { asset, density, file: `${assetDir(asset)}/${density}.webp`, size, lossless: size.w * size.h <= SMALL };
    }) : [];
  });
}

/**
 * Writes the delivery sizes that are missing, the wrong size or encoded the other way, and returns how many it wrote.
 * Reprocessing an asset replaces its folder, so a changed cut-out has none; a changed world rect or rig layout changes
 * their size. Resized as the tiles are, so a cut-out still lands on its painted original.
 */
export function deliver(root: string, assets: ProcessedAsset[], layouts: Manifest['sceneLayouts'], rigBounds: Record<string, Rect>): number {
  let written = 0;
  for (const { asset, file, size, lossless } of deliveries(assets, layouts, rigBounds)) {
    const source = join(root, 'art/generated', asset.file), target = join(root, 'art/generated', file);
    if (existsSync(target)) {
      const now = webpSize(target);
      if (now.w === size.w && now.h === size.h && webpLossless(target) === lossless) continue;
    }
    const resize = size.w === asset.width && size.h === asset.height ? [] : ['-filter', 'Lanczos', '-resize', `${size.w}x${size.h}!`];
    magick([source, ...resize, ...(lossless ? LOSSLESS : LOSSY), target]);
    written++;
  }
  return written;
}
