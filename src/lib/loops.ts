// The beds and the music (spec: "Sound"; buildout ticket 21) as pure rules: which beds a scene has and where each is
// heard, every loop's gain for the camera's centre and the scene's state, the loops a camera position needs loaded, and
// the passes each loop plays. The Web Audio module that plays them is sound.svelte.ts; the one-shots' rules are sound.ts's;
// the files are audio/sounds.json's, encoded by `npm run audio`.
import type { Overworld, Point, Rect, SubScene } from './scenes/types';

type Scene = Overworld | SubScene;

/** The beds, by id: each district's, the river and the Arch's, and each sub-scene's; `bed-<district or scene id>`. */
export const BEDS = [
	'bed-maplewood', 'bed-central-west-end', 'bed-midtown', 'bed-carondelet-park', 'bed-belleville', 'bed-river',
	'bed-slu', 'bed-foundry', 'bed-moosylvania', 'bed-side-project', 'bed-brennans'
] as const;

export type BedId = (typeof BEDS)[number];

/** The music: the overworld's theme, and the three sub-scenes' own. The Foundry's is its screen's video, while it plays. */
export const MUSIC = ['theme', 'music-brennans', 'music-side-project', 'music-moosylvania'] as const;

export type MusicId = (typeof MUSIC)[number];
export type LoopId = BedId | MusicId;

/** The sub-scenes with music of their own, which the theme gives way to. */
export const SCENE_MUSIC: Readonly<Record<string, MusicId>> = { brennans: 'music-brennans', 'side-project': 'music-side-project', moosylvania: 'music-moosylvania' };

/** A bed fades from full at its footprint's edge to silence this far outside it, world px. */
export const FADE = 400;
/** A bed not yet audible loads once the camera's centre is this far from its fade zone, world px. */
export const NEAR = 800;
/** Each pass of a loop overlaps the next by this long, s, the one fading out as the other fades in on equal-power curves. */
export const OVERLAP = 2;

const dB = (x: number) => 10 ** (x / 20);

/**
 * The levels, as gains over the beds at full. The files are loudness-matched, beds to about −30 LUFS and music to about −26
 * (spec: "Format"), so the theme 10 dB down sits about 6 dB under the beds, and 12 dB further down in the scenes without
 * music of their own; a sub-scene's own music 4 dB down is level with its room's bed, and ducks 12 dB under the meeting
 * TV's video. Paused, everything but the one-shots is at 30 percent.
 */
export const LEVEL = { theme: dB(-10), themeUnder: dB(-22), music: dB(-4), ducked: dB(-16), paused: 0.3 } as const;

const isBed = (id: string): id is BedId => (BEDS as readonly string[]).includes(id);

/** How far a point is outside a rect, world px; 0 inside or on its edge. */
const outside = (p: Point, r: Rect) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));

/** A bed's gain with the camera's centre at `centre`: full inside its footprint, falling to 0 over FADE px, equal-power. */
export function bedGain(footprint: Rect, centre: Point) {
	const t = outside(centre, footprint) / FADE;
	return t >= 1 ? 0 : Math.cos((t * Math.PI) / 2);
}

/**
 * A scene's beds and where each is heard at full: on the overworld each district's rect and the river's footprint, the
 * scenery strips between them only where neighbours overlap (spec: "Beds"); a sub-scene's own bed, the whole scene.
 */
export function bedsOf(scene: Scene): { id: BedId; footprint: Rect }[] {
	if (!('districts' in scene)) return isBed(`bed-${scene.id}`) ? [{ id: `bed-${scene.id}` as BedId, footprint: { x: 0, y: 0, w: scene.w, h: scene.h } }] : [];
	const districts = scene.districts.flatMap((d) => (isBed(`bed-${d.id}`) ? [{ id: `bed-${d.id}` as BedId, footprint: d.rect }] : []));
	return [...districts, { id: 'bed-river', footprint: scene.river.footprint }];
}

/** The theme's level in a scene: under the beds on the overworld, further down without music, gone where there is some. */
function themeGain(scene: Scene, screen: boolean) {
	if ('districts' in scene) return LEVEL.theme;
	if (SCENE_MUSIC[scene.id] || (scene.id === 'foundry' && screen)) return 0;
	return LEVEL.themeUnder;
}

/**
 * Every loop's gain in `scene` with the camera's centre at `centre`: its beds by the crossfade, the theme, and the scene's
 * own music, ducked while a prop's `video` plays; the theatre's `screen` playing is its music. Crowd noise never scales
 * with the room: nothing here knows of peers.
 */
export function gains(scene: Scene, centre: Point, s: { screen: boolean; video: boolean }): Map<LoopId, number> {
	const out = new Map<LoopId, number>(bedsOf(scene).map((b) => [b.id, bedGain(b.footprint, centre)]));
	out.set('theme', themeGain(scene, s.screen));
	const own = !('districts' in scene) && SCENE_MUSIC[scene.id];
	if (own) out.set(own, s.video ? LEVEL.ducked : LEVEL.music);
	return out;
}

/** The theme and the scene's own music: what a scene plays of them at all, whatever its screen or TV is doing. */
const musicOf = (scene: Scene): MusicId[] => {
	const own = !('districts' in scene) && SCENE_MUSIC[scene.id];
	return own ? [own] : ['theme'];
};

/**
 * The loops to have loaded with the camera's centre at `centre`: the beds audible there and those within NEAR of their
 * fade zone, and the scene's music or the theme.
 */
export const needed = (scene: Scene, centre: Point): ReadonlySet<LoopId> =>
	new Set<LoopId>([...bedsOf(scene).filter((b) => outside(centre, b.footprint) < FADE + NEAR).map((b) => b.id), ...musicOf(scene)]);

/**
 * The loops a door hovered or focused loads ahead of the hop: a sub-scene's bed and its music or the theme; for the
 * overworld only the theme, since which beds are heard waits for where the visitor lands.
 */
export const loopsFor = (scene: Scene): ReadonlySet<LoopId> =>
	new Set<LoopId>('districts' in scene ? ['theme'] : [...bedsOf(scene).map((b) => b.id), ...musicOf(scene)]);

/** When the pass after one started at context time `at` from `offset` s into a loop of period `P` s starts, from 0. */
export const nextPass = (at: number, offset: number, P: number) => at + P - offset;

/** Where in its period a loop is at context time `now`, s, for a pass that started at `at` from `offset`. */
export const playhead = (at: number, offset: number, now: number, P: number) => (offset + now - at) % P;

/** Points on each fade's curve. */
const STEPS = 32;

/**
 * A pass's gain envelope from `offset` s into a loop of period `P`, times relative to its start: in over the file's first
 * OVERLAP s (the rest of it for a pass resumed within it, none past it), out over the OVERLAP s past the period, which
 * the next pass fades in over. Sine in and cosine out: at every point of the overlap their squares sum to one, the equal
 * power two uncorrelated passes need (a bed's two stretches, and music cut where it repeats but isn't a copy of itself).
 */
export function envelope(offset: number, P: number) {
	const curve = (from: number, to: number, f: (x: number) => number) => Float32Array.from({ length: STEPS }, (_, i) => f(from + ((to - from) * i) / (STEPS - 1)));
	const fadeIn = offset < OVERLAP ? { from: 0, duration: OVERLAP - offset, curve: curve(offset / OVERLAP, 1, (x) => Math.sin((x * Math.PI) / 2)) } : null;
	return { in: fadeIn, out: { at: P - offset, duration: OVERLAP, curve: curve(0, 1, (x) => Math.cos((x * Math.PI) / 2)) } };
}
