import { BREAD_CO } from './bread-co.ts';
import { BRENNANS } from './brennans.ts';
import { FOUNDRY } from './foundry.ts';
import { MOOSYLVANIA } from './moosylvania.ts';
import { OVERWORLD } from './overworld.ts';
import { SIDE_PROJECT } from './side-project.ts';
import { SLU } from './slu.ts';
import type { Overworld, Prop, Rect, SubScene } from './types';

export { BIG_MUDDY, GAMES, SUSHI, gameAt, type GameId } from './overworld.ts';

/** Every sub-scene by its flat URL slug, which is also the overworld venue id its exit link targets. */
export const SUB_SCENES: Record<string, SubScene> = Object.fromEntries(
	[MOOSYLVANIA, SLU, FOUNDRY, SIDE_PROJECT, BRENNANS, BREAD_CO].map((s) => [s.id, s])
);

/** The scene a page path shows: the overworld at the root, a sub-scene at its slug; none for any other path. */
export const sceneAt = (pathname: string): Overworld | SubScene | undefined => (pathname === '/' ? OVERWORLD : SUB_SCENES[pathname.slice(1)]);

/**
 * A scene's doors, each with the scene behind it and its own rect: the overworld's venues that have a sub-scene (a
 * game's door leads to a page with no scene), or a sub-scene's exit, back to the overworld.
 */
export const doorsOf = (s: Overworld | SubScene): { to: Overworld | SubScene; at: Rect }[] =>
	'districts' in s
		? s.districts.flatMap((d) => d.venues).flatMap((v) => {
				const to = v.door ? sceneAt(v.door) : undefined;
				return to ? [{ to, at: v.doorRect ?? v.rect }] : [];
			})
		: [{ to: OVERWORLD, at: s.exit }];

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
/**
 * Where the overworld opens (Joe, 2026-10-01): the welcome sign and the signpost together, the camera centred on the two,
 * so that a phone's first frame holds both.
 */
export const arrival = (o: Overworld): Rect => {
	const a = propsOf(o).find((p) => p.id === 'welcome')!.rect, b = o.signpost.rect;
	const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
	return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

export const at = (r: Rect) => `--x:${r.x}px;--y:${r.y}px;--w:${r.w}px;--h:${r.h}px`;
