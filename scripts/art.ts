#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generate, preparePrompt } from './art/generate.ts';
import { processAsset } from './art/process.ts';
import { buildReview } from './art/review.ts';
import { validateOutputs } from './art/validate.ts';
import type { Asset, Manifest } from './art/types.ts';
import { assetDir } from './art/types.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { positionals, values } = parseArgs({ allowPositionals: true, options: {
  provider: { type: 'string', default: 'codex' }, source: { type: 'string' }, force: { type: 'boolean' },
  'keep-masters': { type: 'boolean' },
  'dry-run': { type: 'boolean' }, manifest: { type: 'string', default: 'art/manifest.json' }
} });
const [command = 'help', id] = positionals;
try {
  const manifest = JSON.parse(readFileSync(resolve(root, values.manifest!), 'utf8')) as Manifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Unsupported manifest');
  const ids = new Set<string>();
  for (const asset of manifest.assets) {
    if (!/^[a-z0-9-]+$/.test(asset.id) || ids.has(asset.id)) throw new Error(`Invalid/duplicate asset id: ${asset.id}`);
    ids.add(asset.id);
  }
  for (const asset of manifest.assets) {
    // A derivative is cut from its own scene's composition, so validation finds its parent in the same scene folder.
    const parent = manifest.assets.find(a => a.id === asset.deriveFrom);
    if (parent && parent.scene !== asset.scene) throw new Error(`${asset.id}: derives from ${parent.id} in scene ${parent.scene}, not ${asset.scene}`);
  }
  const outputRoot = join(root, 'art/generated');
  if (command === 'list') {
    console.log(manifest.assets.map(a => `${a.id.padEnd(23)} ${a.kind.padEnd(11)} ${existsSync(join(outputRoot, assetDir(a), 'asset.json')) ? 'ready' : 'missing'}`).join('\n'));
  } else if (command === 'review' || command === 'compose') {
    await buildReview(root, manifest, command === 'compose');
  } else if (command === 'validate') {
    const problems = validateOutputs(root, manifest);
    console.log(problems.length ? problems.join('\n') : `PASS: ${manifest.assets.length} assets, exact tile coverage at both densities, transparent cut-outs and registered rig frame sizes.`);
    if (problems.length) process.exitCode = 1;
  } else if (command === 'generate' || command === 'process') {
    if (values.provider !== 'codex' && values.provider !== 'api') throw new Error('--provider must be codex or api');
    const provider: 'codex' | 'api' = values.provider;
    const selected = id === 'all' ? manifest.assets : id === 'backgrounds' ? manifest.assets.filter(a => a.kind === 'background') :
      id === 'furnishings' ? manifest.assets.filter(a => a.scene !== 'overworld' && ['scenery', 'prop', 'foreground'].includes(a.kind)) :
      id?.startsWith('scene:') ? manifest.assets.filter(a => a.scene === id.slice(6)) : manifest.assets.filter(a => a.id === id);
    if (!selected.length) throw new Error(`Unknown asset ${id}; run node scripts/art.ts list`);
    if (values.source && selected.length !== 1) throw new Error('--source requires exactly one asset');
    const complete = new Set<string>();
    const visiting = new Set<string>();
    function run(asset: Asset) {
      if (complete.has(asset.id)) return;
      if (visiting.has(asset.id)) throw new Error(`Dependency cycle at ${asset.id}`);
      visiting.add(asset.id);
      for (const dep of asset.dependsOn ?? []) {
        const dependency = manifest.assets.find(a => a.id === dep);
        if (!dependency) throw new Error(`${asset.id}: unknown dependency ${dep}`);
        if (!existsSync(join(outputRoot, assetDir(dependency), 'asset.json')) || (values.force && selected.some(a => a.id === dep))) run(dependency);
      }
      visiting.delete(asset.id);
      if (existsSync(join(outputRoot, assetDir(asset), 'asset.json')) && (!values.force || (values['keep-masters'] && asset.kind === 'reference'))) {
        console.log(`Keep ${asset.id}${values['keep-masters'] && asset.kind === 'reference' ? ' (--keep-masters)' : ' (use --force to regenerate)'}`); complete.add(asset.id); return;
      }
      const runDir = join(root, 'art/runs', asset.id, new Date().toISOString().replaceAll(':', '-'));
      mkdirSync(runDir, { recursive: true });
      if (values['dry-run']) {
        const prepared = preparePrompt(asset, manifest, root, runDir);
        console.log(`${asset.id}: ${runDir}/prompt.txt (${prepared.references.length} references)`);
        complete.add(asset.id); return;
      }
      console.log(`${command} ${asset.id} (${asset.deriveFrom ? 'derived' : provider})`);
      const source = values.source && selected[0].id === asset.id ? resolve(values.source) : join(root, 'art/sources', `${asset.id}.png`);
      const input = command === 'generate' && !values.source ? generate(asset, manifest, root, provider, runDir) : source;
      if (!existsSync(input)) throw new Error(asset.deriveFrom ? `${asset.id} is re-cut from ${asset.deriveFrom}: run generate ${asset.id}` : `Missing source ${input}`);
      mkdirSync(join(root, 'art/sources'), { recursive: true });
      const saved = join(root, 'art/sources', `${asset.id}.png`);
      const result = processAsset(asset, input, outputRoot);
      // generate re-cuts a derivative from its committed parent, so sources/ keeps only originals for reprocessing.
      if (input !== saved && !asset.deriveFrom) copyFileSync(input, saved);
      const promptPath = join(runDir, 'prompt.txt');
      if (existsSync(promptPath)) copyFileSync(promptPath, join(outputRoot, assetDir(asset), 'prompt.txt'));
      writeFileSync(join(runDir, 'processed.json'), JSON.stringify(result, null, 2) + '\n');
      complete.add(asset.id);
      console.log(`Ready ${asset.id}: ${result.width} × ${result.height}, ${result.tiles?.length ?? 0} tiles`);
    }
    for (const asset of selected) run(asset);
    if (!values['dry-run']) await buildReview(root, manifest);
  } else {
    console.log('Art pipeline (Node 24+, ImageMagick 7, authenticated Codex CLI)\n' +
      '  node scripts/art.ts list\n' +
      '  node scripts/art.ts generate <asset|backgrounds|furnishings|scene:name|all> [--provider codex|api] [--force] [--keep-masters] [--dry-run]\n' +
      '  node scripts/art.ts process <asset> [--source file.png] [--force]\n' +
      '  node scripts/art.ts review\n\nReview: serve the repository with python3 -m http.server 4174 --bind 127.0.0.1\nOpen http://127.0.0.1:4174/art/review.html');
    if (command !== 'help') process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
