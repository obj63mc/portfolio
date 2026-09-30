import { BRENNANS } from './brennans.ts';
import { FOUNDRY } from './foundry.ts';
import { MOOSYLVANIA } from './moosylvania.ts';
import { OVERWORLD } from './overworld.ts';
import { SIDE_PROJECT } from './side-project.ts';
import { SLU } from './slu.ts';
import type { Overworld, Prop, Rect, SubScene } from './types';

/** Every sub-scene by its flat URL slug, which is also the overworld venue id its exit link targets. */
export const SUB_SCENES: Record<string, SubScene> = Object.fromEntries(
	[MOOSYLVANIA, SLU, FOUNDRY, SIDE_PROJECT, BRENNANS].map((s) => [s.id, s])
);

/** The scene a page path shows: the overworld at the root, a sub-scene at its slug; none for any other path. */
export const sceneAt = (pathname: string): Overworld | SubScene | undefined => (pathname === '/' ? OVERWORLD : SUB_SCENES[pathname.slice(1)]);

/** Props left to right, the spec's reading order for the overworld's venues and the wide sub-scenes. */
export const leftToRight = (props: Prop[]): Prop[] => [...props].sort((a, b) => a.rect.x - b.rect.x);

/**
 * A sub-scene's props in DOM, tab and reading order: left to right, or top to bottom in a scene taller than wide (the
 * Moosylvania lobby), so that keyboard focus pans the camera one way along the scene instead of back and forth.
 */
export const readingOrder = (s: SubScene): Prop[] =>
	s.h > s.w ? [...s.props].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x) : leftToRight(s.props);

/** Every prop in a scene: the overworld's venue by venue, or a sub-scene's. */
export const propsOf = (s: Overworld | SubScene): Prop[] => ('districts' in s ? s.districts.flatMap((d) => d.venues.flatMap((v) => v.props)) : s.props);

/** A prop's cut-outs in its scene's art folder, bottom first (`Prop.art`). */
export const artOf = (scene: Overworld | SubScene, prop: Prop): string[] =>
	prop.art ?? ['districts' in scene ? prop.id : `${scene.id}-${prop.id}`];

/**
 * An element's world rect as custom properties, prerendered into its style attribute. Only the engine's stylesheet reads
 * them (`html.engine main .at` in app.css), turning the plain document into hit targets placed over their art.
 */
export const at = (r: Rect) => `--x:${r.x}px;--y:${r.y}px;--w:${r.w}px;--h:${r.h}px`;
