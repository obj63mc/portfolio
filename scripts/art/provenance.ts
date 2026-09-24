import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ProcessedAsset } from './types.ts';

/** Match retained pixels to the generation prompt, even after offline reprocessing. */
export function saveProvenance(root: string, asset: ProcessedAsset) {
  const runs = join(root, 'art/runs', asset.id);
  if (!existsSync(runs)) return;
  for (const name of readdirSync(runs).sort().reverse()) {
    const run = join(runs, name), processed = join(run, 'processed.json'), prompt = join(run, 'prompt.txt');
    if (!existsSync(processed) || !existsSync(prompt)) continue;
    const result = JSON.parse(readFileSync(processed, 'utf8')) as ProcessedAsset;
    if (result.source.sha256 !== asset.source.sha256) continue;
    const dir = join(root, 'art/generated', asset.id);
    writeFileSync(join(dir, 'prompt.txt'), readFileSync(prompt, 'utf8').replaceAll(root+'/', '<repo>/'));
    writeFileSync(join(dir, 'provenance.json'), JSON.stringify({ sourceSha256: asset.source.sha256,
      run: relative(root, run), provider: existsSync(join(run, 'derivation.json')) ? 'derived' : existsSync(join(run, 'codex.jsonl')) ? 'codex' : 'api',
      derivation: existsSync(join(run, 'derivation.json')) ? JSON.parse(readFileSync(join(run, 'derivation.json'),'utf8')) : undefined,
      note: 'Prompt references use <repo> as the repository root. Run files and original PNG remain local.' }, null, 2)+'\n');
    return;
  }
}
