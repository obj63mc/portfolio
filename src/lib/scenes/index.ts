import { BRENNANS } from './brennans.ts';
import { FOUNDRY } from './foundry.ts';
import { MOOSYLVANIA } from './moosylvania.ts';
import { SIDE_PROJECT } from './side-project.ts';
import { SLU } from './slu.ts';
import type { Prop, SubScene } from './types';

/** Every sub-scene by its flat URL slug, which is also the overworld venue id its exit link targets. */
export const SUB_SCENES: Record<string, SubScene> = Object.fromEntries(
	[MOOSYLVANIA, SLU, FOUNDRY, SIDE_PROJECT, BRENNANS].map((s) => [s.id, s])
);

/** Props left to right, the spec's reading order for the overworld's venues and the wide sub-scenes. */
export const leftToRight = (props: Prop[]): Prop[] => [...props].sort((a, b) => a.rect.x - b.rect.x);

/**
 * A sub-scene's props in DOM, tab and reading order: left to right, or top to bottom in a scene taller than wide (the
 * Moosylvania lobby), so that keyboard focus pans the camera one way along the scene instead of back and forth.
 */
export const readingOrder = (s: SubScene): Prop[] =>
	s.h > s.w ? [...s.props].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x) : leftToRight(s.props);
