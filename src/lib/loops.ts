// The beds and the music (spec: "Sound"; buildout ticket 21) as pure rules: which beds a scene has and where each is
// heard, every loop's gain for the camera's centre and the scene's state, the loops a camera position needs loaded, and
// the passes each loop plays. The Web Audio module that plays them is sound.svelte.ts; the one-shots' rules are sound.ts's;
// the files are audio/sounds.json's, encoded by `npm run audio`.
import type { Overworld, Point, Rect, SubScene } from './scenes/types';

type Scene = Overworld | SubScene;

/** The beds, by id: each district's, the river and the Arch's, and each sub-scene's; `bed-<district or scene id>`. */
export const BEDS = [
	'bed-maplewood', 'bed-central-west-end', 'bed-midtown', 'bed-carondelet-park', 'bed-belleville', 'bed-river',
	'bed-slu', 'bed-foundry', 'bed-moosylvania', 'bed-side-project', 'bed-brennans', 'bed-forest-park', 'bed-sushi-service'
] as const;

export type BedId = (typeof BEDS)[number];

/**
 * The music: the overworld's theme, the three sub-scenes' own and Sushi Stand's. The Foundry's is its screen's video,
 * while it plays.
 */
export const MUSIC = ['theme', 'music-brennans', 'music-side-project', 'music-moosylvania', 'music-sushi-stand'] as const;

export type MusicId = (typeof MUSIC)[number];
export type LoopId = BedId | MusicId;

/** The sub-scenes with music of their own, which the theme gives way to. */
export const SCENE_MUSIC: Readonly<Partial<Record<string, MusicId>>> = { brennans: 'music-brennans', 'side-project': 'music-side-project', moosylvania: 'music-moosylvania' };

/** What a scene is showing that its music gives way to: the Foundry's screen playing a reel, a prop's video playing. */
export type Showing = { screen: boolean; video: boolean };

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
 * music of their own; a bar's own music 4 dB down is level with its room's bed, and the lobby's playlist, "a low
 * playlist" (sound design), 6 dB under that. A scene's music ducks 12 dB under a prop's video, the meeting TV's. Paused,
 * everything but the one-shots is at 30 percent.
 */
export const LEVEL = { theme: dB(-10), themeUnder: dB(-22), music: dB(-4), lobby: dB(-10), duck: dB(-12), paused: 0.3 } as const;

/** A sub-scene's own music at its level: the lobby's playlist low, a bar's level with its room. */
const ownLevel = (id: MusicId) => (id === 'music-moosylvania' ? LEVEL.lobby : LEVEL.music);

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
	const bed = (id: string, footprint: Rect) => (isBed(id) ? [{ id, footprint }] : []);
	if (!('districts' in scene)) return bed(`bed-${scene.id}`, { x: 0, y: 0, w: scene.w, h: scene.h });
	return [...scene.districts.flatMap((d) => bed(`bed-${d.id}`, d.rect)), { id: 'bed-river', footprint: scene.river.footprint }];
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
export function gains(scene: Scene, centre: Point, s: Showing): Map<LoopId, number> {
	// Neighbours' fades reach into each other's footprints, the strips between them being narrower than a fade, so where
	// their power together passes one they are scaled back to it: an equal-power crossfade however many overlap.
	const beds = bedsOf(scene).map((b) => [b.id, bedGain(b.footprint, centre)] as const);
	const power = beds.reduce((sum, [, g]) => sum + g * g, 0), k = power > 1 ? 1 / Math.sqrt(power) : 1;
	const out = new Map<LoopId, number>(beds.map(([id, g]) => [id, g * k]));
	out.set('theme', themeGain(scene, s.screen));
	const own = !('districts' in scene) && SCENE_MUSIC[scene.id];
	if (own) out.set(own, ownLevel(own) * (s.video ? LEVEL.duck : 1));
	return out;
}

/** Sushi Stand's loops (Joe, 2026-09-30): its music throughout, and its restaurant's bed while a service is on. */
export const GAME_LOOPS: ReadonlySet<LoopId> = new Set(['music-sushi-stand', 'bed-sushi-service']);

/** Every loop's gain in Sushi Stand: its music at a bar's level, the restaurant under it only through a service. */
export const gameGains = (service: boolean) =>
	new Map<LoopId, number>([
		['music-sushi-stand', LEVEL.music],
		['bed-sushi-service', service ? 1 : 0]
	]);

/**
 * Leaving through a door for `to` as its iris closes (none: off the site): every loop playing, `from`, fades out with the
 * iris but the theme, which goes toward its level there, keeping its place for when it is heard again.
 */
export function leavingGains(from: ReadonlyMap<LoopId, number>, to: Scene | undefined, s: Showing): Map<LoopId, number> {
	const out = new Map<LoopId, number>([...from.keys()].map((id) => [id, 0]));
	out.set('theme', to ? themeGain(to, s.screen) : 0);
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
export const loopsNeeded = (scene: Scene, centre: Point): ReadonlySet<LoopId> =>
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
/** A loop resumed where it stopped fades in from silence over this long, s: nothing overlaps it, and it may be mid-phrase. */
export const RESUME = 0.5;

/**
 * How a loop's passes cross: a bed's two stretches are uncorrelated, so at equal power (sine in, cosine out, their squares
 * summing to one); music cut where it nearly repeats is close to a copy of itself across the seam, so at equal gain (the
 * two summing to one), which an equal-power cross would swell by up to 3 dB.
 */
export type Fade = 'power' | 'gain';

export const fadeOf = (id: LoopId): Fade => (isBed(id) ? 'power' : 'gain');

/**
 * A pass's gain envelope from `offset` s into a loop of period `P`, times relative to its start: from the top, in over
 * the file's first OVERLAP s, which the last pass fades out over; resumed partway, in from silence over RESUME s; out over
 * the OVERLAP s past the period, which the next pass fades in over, on the loop's `fade`.
 */
export function envelope(offset: number, P: number, fade: Fade = 'power') {
	const curve = (f: (x: number) => number) => Float32Array.from({ length: STEPS }, (_, i) => f(i / (STEPS - 1)));
	const up = fade === 'power' ? (x: number) => Math.sin((x * Math.PI) / 2) : (x: number) => x;
	const down = fade === 'power' ? (x: number) => Math.cos((x * Math.PI) / 2) : (x: number) => 1 - x;
	return { in: { from: 0, duration: offset > 0 ? RESUME : OVERLAP, curve: curve(up) }, out: { at: P - offset, duration: OVERLAP, curve: curve(down) } };
}
