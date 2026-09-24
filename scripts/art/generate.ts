import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { magick } from './process.ts';
import type { Asset, Manifest } from './types.ts';

export function preparePrompt(asset: Asset, manifest: Manifest, root: string, run: string) {
  const references = manifest.references.map(p => resolve(root, p));
  if (['maplewood', 'moosylvania', 'side-project'].includes(asset.scene)) {
    const arrival = resolve(root, 'prototypes/art-pipeline/reference/ref-scene-0-arrival-mock.png');
    if (!references.includes(arrival)) references.push(arrival);
  }
  // Keep the asset-specific master last; part prompts refer to the final image.
  for (const path of asset.references ?? []) {
    const reference = resolve(root, path);
    if (!references.includes(reference)) references.push(reference);
  }
  if (asset.opening) {
    const source = resolve(root, `art/generated/${asset.opening.asset}/image.webp`);
    const parent = manifest.assets.find(a => a.id === asset.opening!.asset);
    if (!parent?.world || !existsSync(source)) throw new Error(`Generate ${asset.opening.asset} before ${asset.id}`);
    const r = asset.opening.rect;
    const crop = join(run, 'opening.png');
    magick([source, '-crop', `${r.w * 2}x${r.h * 2}+${r.x * 2}+${r.y * 2}`, '+repage', crop]);
    references.push(crop);
  }
  for (const path of references) if (!existsSync(path)) throw new Error(`Missing reference: ${path}`);
  const prompt = `${readFileSync(resolve(root, manifest.style), 'utf8')}\n\nASSET: ${asset.id}\n${asset.prompt}\n\n` +
    `Target image size: ${asset.size ?? '1536x1024'}. ${asset.kind === 'background' ? 'Fill the image edge to edge.' : 'Keep the entire object within the frame with a clean margin.'}\n` +
    `References in order:\n${references.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n` +
    (asset.opening ? 'The final reference is the exact opening to fill; match its silhouette and perspective.\n' : '');
  writeFileSync(join(run, 'prompt.txt'), prompt);
  return { prompt, references };
}

export function generate(asset: Asset, manifest: Manifest, root: string, provider: 'codex' | 'api', run: string): string {
  mkdirSync(run, { recursive: true });
  const { prompt, references } = preparePrompt(asset, manifest, root, run);
  const output = join(run, 'source.png');
  if (provider === 'codex') {
    const instruction = `${prompt}\nUse the built-in image generation tool, using the attached reference images. Generate exactly this one raster asset. Save the image to ${output}. Do not synthesize the illustration with code or SVG. Do not modify any project files except that output. Do not run git. If image generation is unavailable, report UNSUPPORTED and stop. Do not invoke an API fallback. Return the saved path.\n`;
    const log = openSync(join(run, 'codex.jsonl'), 'w');
    try {
      const result = spawnSync('codex', ['exec', '--ephemeral', '--sandbox', 'workspace-write', '--json', '-C', root,
        ...references.flatMap(p => ['-i', p]), '-o', join(run, 'result.txt'), '-'],
        { cwd: root, input: instruction, stdio: ['pipe', log, 'inherit'], timeout: 15 * 60 * 1000 });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`Codex failed (${result.status}); see ${run}`);
    } finally { closeSync(log); }
  } else {
    if (!process.env.OPENAI_API_KEY) throw new Error('API provider requires OPENAI_API_KEY in your local environment. Never paste it into a prompt.');
    // Use the maintained imagegen CLI, not a second implementation of the Images API.
    const cli = process.env.IMAGE_GEN_CLI ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'skills/.system/imagegen/scripts/image_gen.py');
    if (!existsSync(cli)) throw new Error('Set IMAGE_GEN_CLI to the installed imagegen/scripts/image_gen.py');
    const result = spawnSync(process.env.ART_PYTHON ?? 'python3', [cli, references.length ? 'edit' : 'generate',
      '--prompt-file', join(run, 'prompt.txt'), '--model', 'gpt-image-2', '--size', asset.size ?? '1536x1024',
      '--quality', 'high', '--out', output, ...references.flatMap(p => ['--image', p])], { stdio: 'inherit', timeout: 15 * 60 * 1000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Image API CLI failed (${result.status})`);
  }
  if (!existsSync(output)) throw new Error(`No raster output returned. See ${run}/result.txt. Try --provider api if Codex image generation is unavailable.`);
  return output;
}
