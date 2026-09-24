import { BRENNANS } from './brennans.ts';
import { FOUNDRY } from './foundry.ts';
import { MOOSYLVANIA } from './moosylvania.ts';
import { SIDE_PROJECT } from './side-project.ts';
import { SLU } from './slu.ts';
import type { SubScene } from './types';

/** Every sub-scene by its flat URL slug, which is also the overworld venue id its exit link targets. */
export const SUB_SCENES: Record<string, SubScene> = Object.fromEntries(
	[MOOSYLVANIA, SLU, FOUNDRY, SIDE_PROJECT, BRENNANS].map((s) => [s.id, s])
);
