import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { magick } from './process.ts';
import type { ProcessedAsset, Rect, RigPlacement } from './types.ts';
import { RIG_DRAW_ORDER } from './types.ts';

interface Part { parent: string | null; x: number; y: number; w: number; h: number; pivot: number[]; file: string }
interface Scene { id: string; w: number; h: number; rigInstances: RigPlacement[]; layers: { asset: string; kind: string; rect: Rect }[] }

/** A review composite never replaces the separable production layers. */
export function compose(root: string, scenes: Scene[], assets: ProcessedAsset[], rigs: Record<string, Record<string, Part>>, rigBounds: Record<string, Rect>) {
  const out = join(root, 'art/generated/composites'); mkdirSync(out, { recursive: true });
  for (const scene of scenes) {
    const plate = assets.find(a => a.id === scene.id);
    if (!plate) continue;
    const args = [join(root, 'art/generated', plate.file), '-resize', `${scene.w}x${scene.h}!`];
    const add = (path: string, r: Rect) => args.push('(', path, '-resize', `${Math.round(r.w)}x${Math.round(r.h)}!`, ')', '-geometry', `+${Math.round(r.x)}+${Math.round(r.y)}`, '-compose', 'Over', '-composite');
    for (const layer of scene.layers.filter(l => l.kind === 'prop')) {
      const asset = assets.find(a => a.id === layer.asset)!;
      add(join(root, 'art/generated', asset.file), layer.rect);
    }
    for (const instance of scene.rigInstances) {
      const rigName = instance.name;
      if (!rigs[rigName]) continue;
      const master = assets.find(a => a.id === `${rigName}-master`);
      const target = instance.rect;
      const bounds = rigBounds[rigName], scale = Math.min(target.w/bounds.w, target.h/bounds.h);
      if (master) for (const key of RIG_DRAW_ORDER) {
        const part = rigs[rigName][key]; if (!part) continue;
        add(join(root, 'art/generated', part.file), { x: target.x+(target.w-bounds.w*scale)/2+(part.x-bounds.x)*scale,
          y: target.y+target.h-bounds.h*scale+(part.y-bounds.y)*scale, w:part.w*scale, h:part.h*scale });
      }
    }
    for (const layer of scene.layers.filter(l => l.kind === 'foreground')) {
      const asset = assets.find(a => a.id === layer.asset)!;
      add(join(root, 'art/generated', asset.file), layer.rect);
    }
    magick([...args, '-quality', '88', join(out, `${scene.id}.webp`)]);
  }
  const plates = scenes.map(s => join(out, `${s.id}.webp`)).filter(existsSync);
  if (plates.length) {
    // Composite explicitly: montage tries to load a font even for an unlabelled sheet.
    const sheet = ['-size', `1328x${Math.ceil(plates.length / 2) * 384}`, 'xc:#e9dfbf'];
    plates.forEach((plate, i) => sheet.push('(', plate, '-thumbnail', '640x360', '-background', '#e9dfbf',
      '-gravity', 'center', '-extent', '640x360', ')', '-gravity', 'NorthWest',
      '-geometry', `+${12 + i % 2 * 664}+${12 + Math.floor(i / 2) * 384}`, '-composite'));
    magick([...sheet, join(out, 'contact-sheet.webp')]);
  }
}
