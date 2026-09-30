import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Asset, ProcessedAsset } from './types.ts';
import { assetDir } from './types.ts';

export function magick(args: string[]): string {
  return execFileSync('magick', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
}
export function dimensions(path: string): { w: number; h: number } {
  const [w, h] = magick(['identify', '-format', '%w %h', path]).split(' ').map(Number);
  if (!w || !h) throw new Error(`Invalid image: ${path}`);
  return { w, h };
}

/** Raster processing is deterministic; generation is the only model-dependent step. */
export function processAsset(asset: Asset, input: string, outputRoot: string): ProcessedAsset {
  mkdirSync(outputRoot, { recursive: true });
  const staging = mkdtempSync(join(outputRoot, '.processing-'));
  const target = join(outputRoot, assetDir(asset)), staged = join(staging, assetDir(asset)), previous = join(staging, 'previous');
  try {
    const result = processInto(asset, input, staging);
    const oldPrompt = join(target, 'prompt.txt');
    if (existsSync(oldPrompt)) copyFileSync(oldPrompt, join(staged, 'prompt.txt'));
    const oldProvenance = join(target, 'provenance.json');
    if (existsSync(oldProvenance) && JSON.parse(readFileSync(oldProvenance, 'utf8')).sourceSha256 === result.source.sha256) {
      copyFileSync(oldProvenance, join(staged, 'provenance.json'));
    }
    if (existsSync(target)) renameSync(target, previous);
    else mkdirSync(join(outputRoot, asset.scene), { recursive: true });
    try { renameSync(staged, target); }
    catch (error) { if (existsSync(previous)) renameSync(previous, target); throw error; }
    return result;
  } finally {
    // Only our temporary processing directory, never a user-selected input.
    rmSync(staging, { recursive: true, force: true });
  }
}

function processInto(asset: Asset, input: string, outputRoot: string): ProcessedAsset {
  const dir = join(outputRoot, assetDir(asset));
  mkdirSync(dir, { recursive: true });
  const source = { ...dimensions(input), sha256: createHash('sha256').update(readFileSync(input)).digest('hex') };
  const file = `${assetDir(asset)}/image.webp`;
  let trim = { x: 0, y: 0, w: source.w, h: source.h };
  const result: ProcessedAsset = { id: asset.id, scene: asset.scene, kind: asset.kind, file, world: asset.world,
    source, trim, width: 0, height: 0, rig: asset.rig, registration: asset.registration };
  if (asset.kind === 'background') {
    if (!asset.world) throw new Error(`${asset.id}: background requires a world rect`);
    // Resize once before tiling; integer pixel boundaries at both densities prevent seams.
    const { w, h } = asset.world;
    magick([input, '-filter', 'Lanczos', '-resize', `${w * 2}x${h * 2}!`, '-quality', '85', join(outputRoot, file)]);
    // The 2x companion only helps a source smaller than the plate; an upscaled master already exceeds it.
    if (dimensions(input).w * (asset.upscale ?? 2) <= w * 2) magick([input, '-filter', 'Lanczos', '-resize', `${Math.round((asset.upscale ?? 2) * 100)}%`, '-quality', '85', join(dir, 'upscale.webp')]);
    else if (existsSync(join(dir, 'upscale.webp'))) unlinkSync(join(dir, 'upscale.webp'));
    result.tiles = [];
    for (const density of [1.25, 2]) {
      const layer = join(dir, `density-${density}.png`);
      magick([input, '-filter', 'Lanczos', '-resize', `${Math.round(w * density)}x${Math.round(h * density)}!`, layer]);
      const tilesDir = join(dir, String(density));
      mkdirSync(tilesDir, { recursive: true });
      magick([layer, '-crop', `${512 * density}x${512 * density}`, '+repage', '-quality', '85', join(tilesDir, 'tile-%d.webp')]);
      let index = 0;
      for (let y = 0; y < h; y += 512) for (let x = 0; x < w; x += 512) {
        const tw = Math.min(512, w - x), th = Math.min(512, h - y);
        const tile = `${assetDir(asset)}/${density}/${x / 512}-${y / 512}.webp`;
        renameSync(join(tilesDir, `tile-${index++}.webp`), join(outputRoot, tile));
        result.tiles.push({ density, x, y, w: tw, h: th, file: tile });
      }
      unlinkSync(layer);
    }
  } else if (asset.kind === 'reference') {
    magick([input, ...(asset.lossless ? ['-define', 'webp:lossless=true'] : ['-quality', '90']), join(outputRoot, file)]);
  } else {
    const keyed = join(dir, 'keyed.png');
    // Existing alpha is preserved. The key is outside the art palette.
    magick([input, '-alpha', 'on', '-fuzz', '10%', '-transparent', '#FF00FF', '-channel', 'A',
      '-level', '2%,98%', '-morphology', 'Erode', 'Diamond:1', '+channel', keyed]);
    const [w, h, x, y] = magick([keyed, '-trim', '-format', '%w %h %X %Y', 'info:']).split(' ').map(Number);
    if (!w || !h || magick([keyed, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:']) === '0') {
      throw new Error(`${asset.id}: keying removed the whole image`);
    }
    trim = { x, y, w, h };
    result.trim = trim;
    if (asset.registration) {
      const r = asset.registration.rect;
      if (Math.abs(source.w/source.h-r.w/r.h) > .02) throw new Error(`${asset.id}: extraction canvas aspect ratio changed`);
      // A reviewed world rect anchors the trimmed object to its real fixture.
      // Otherwise preserve the extraction's original position within the crop.
      result.world = asset.world ?? { x: r.x+x/source.w*r.w, y: r.y+y/source.h*r.h, w: w/source.w*r.w, h: h/source.h*r.h };
    }
    magick([keyed, '-trim', '+repage', '-define', 'webp:lossless=true', join(outputRoot, file)]);
    unlinkSync(keyed);
  }
  const size = dimensions(join(outputRoot, file));
  result.width = size.w; result.height = size.h;
  writeFileSync(join(dir, 'asset.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
