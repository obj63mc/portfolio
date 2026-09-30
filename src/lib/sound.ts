// The one-shots (spec: "Sound"; buildout ticket 22) as pure rules: every one-shot by id, each prop's signature from the
// sound design table (.scratch/stl-cursor-portfolio/issues/19-sound-design.md at tag archive/buildout), what a click, a
// grant or the Foundry screen sounds like, which one-shots a scene loads, and when a scene's buffers are let go. The
// Web Audio module that plays them is sound.svelte.ts; the files are audio/sounds.json's, encoded by `npm run audio`.
import { propsOf } from './scenes/index.ts';
import type { Overworld, Prop, SubScene } from './scenes/types';
import type { Screen } from './net/screen.ts';

/**
 * Every one-shot, by id: its file is `static/audio/<id>.<hash>.mp3`. One card sound opens and closes every card, and one
 * mouse click serves every computer (Joe, 2026-09-30, choosing the sounds).
 */
export const ONE_SHOTS = [
	'card', 'chime', 'fanfare', 'best-lap', 'door-open', 'door-close', 'projector',
	'knock', 'moose', 'bell', 'squelch', 'fan', 'click', 'marker', 'pour', 'chalk', 'creak', 'cooler', 'lighter'
] as const;

export type SoundId = (typeof ONE_SHOTS)[number];

/**
 * Heard wherever the visitor is, so loaded on Join in every scene: every card's open and close, the cosmetic chime, the
 * gold fanfare and the doors, which every scene has.
 */
export const GLOBAL: readonly SoundId[] = ['card', 'chime', 'fanfare', 'door-open', 'door-close'];

/**
 * Each prop's signature, by prop id, played with the card's sound on the click that opens its card; `signpost` is the
 * signpost's links, which aren't props. A prop Joe gives a sound later is one more row here.
 */
export const PROP_SOUNDS: Readonly<Record<string, SoundId>> = {
	signpost: 'knock',
	welcome: 'knock',
	'ride-sign': 'knock',
	moose: 'moose',
	'moose-statue': 'moose',
	bike: 'bell',
	'mc-sign': 'squelch',
	'mc-eye': 'squelch',
	'server-rack': 'fan',
	'computer-frontend': 'click',
	'computer-backend': 'click',
	'computer-cms': 'click',
	'computer-data': 'click',
	whiteboard: 'marker',
	workstation: 'click',
	'bottle-bacardi': 'pour',
	'bottle-grey-goose': 'pour',
	'bottle-new-amsterdam': 'pour',
	'bottle-camarena': 'pour',
	'bottle-barefoot': 'pour',
	'bottle-bud-light': 'pour',
	'bottle-ej': 'pour',
	'bottle-pink-whitney': 'pour',
	'bottle-rumchata': 'pour',
	'bottle-soonhari': 'pour',
	chalkboard: 'chalk',
	'humidor-cohiba': 'creak',
	'humidor-macanudo': 'creak',
	'humidor-partagas': 'creak',
	'humidor-la-gloria-cubana': 'creak',
	'humidor-punch': 'creak',
	// No row in the sound design table; Joe gave them these (2026-09-30).
	'brewery-sign': 'cooler',
	'stg-logo': 'lighter'
};

/**
 * Props with no signature of their own, on purpose: the diploma's paper is its card's own sound (Joe, 2026-09-30), the
 * meeting TV's sound is its video, the Foundry posters are heard through the screen's projector start, which the whole
 * room hears, and the screen is no button.
 */
export const SILENT: readonly string[] = ['diploma', 'meeting-tv', 'poster-fast-five', 'poster-snow-white', 'poster-lorax', 'screen'];

/** What each scene hears beyond its props: the overworld's signpost and the lap timer's beep, the Foundry's projector start. */
const EXTRAS: Readonly<Record<string, readonly SoundId[]>> = { overworld: ['knock', 'best-lap'], foundry: ['projector'] };

/** A scene's buffers are let go this long after the visitor leaves it, ms, unless the scene they are in needs them. */
export const LINGER = 60_000;

/** The one-shots a scene loads: the global ones, its props' signatures and its extras. */
export const needed = (scene: Overworld | SubScene): ReadonlySet<SoundId> =>
	new Set([...GLOBAL, ...propsOf(scene).flatMap((p) => (PROP_SOUNDS[p.id] ? [PROP_SOUNDS[p.id]] : [])), ...(EXTRAS[scene.id] ?? [])]);

/** What a prop's click sounds like: its signature, or else its card opening, unless it has none. Hover never sounds. */
export const clickSounds = (prop: Prop | undefined): SoundId[] =>
	prop && PROP_SOUNDS[prop.id] ? [PROP_SOUNDS[prop.id]] : prop && !prop.kind ? ['card'] : [];

/**
 * A granting click's sound, from what the cursor wore and whether it was gold before and after: the chime as a cosmetic
 * goes on, earned or worn again; the fanfare in its place on the grant that turns the cursor gold; nothing when the
 * cosmetic was worn already. A cosmetic earned in another tab never comes here.
 */
export function grantSound(was: { worn: number; gold: boolean }, now: { worn: number; gold: boolean }): SoundId | null {
	if (now.gold && !was.gold) return 'fanfare';
	return now.worn !== was.worn ? 'chime' : null;
}

/**
 * The Foundry screen's projector start, which everyone in the room hears (spec: "Peers"): for the reel of screen `s`, at
 * server time `now`, not yet `heard` (the start of the reel it last played for), from `offset` seconds in, so that a
 * visitor who arrives mid-sequence hears the rest of it; null while idle, once heard, or after its `length` ms.
 */
export function projectorCue(s: Screen, heard: number | null, now: number, length: number) {
	if (!s || s.at === heard || now - s.at >= length) return null;
	return { at: s.at, offset: Math.max(0, now - s.at) / 1000 };
}

/**
 * The buffers to let go at `now`: those the current scene doesn't `need` whose scene was left, or which the camera moved
 * away from (`last`, ms), LINGER ago. One-shots and loops alike (loops.ts).
 */
export const stale = <T>(last: ReadonlyMap<T, number>, need: ReadonlySet<T>, now: number): T[] =>
	[...last].filter(([id, at]) => !need.has(id) && now - at >= LINGER).map(([id]) => id);
