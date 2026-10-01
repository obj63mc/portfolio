// Seam 2: the one-shots' rules (buildout ticket 22) as plain functions: which sound a click, a grant or the Foundry screen
// makes, which one-shots each scene loads, and when the buffers of a scene left behind are let go. The Web Audio module
// that plays them (sound.svelte.ts) only follows these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_SOUNDS, GLOBAL, LINGER, ONE_SHOTS, PROP_SOUNDS, SILENT, clickSounds, grantSound, needed, projectorCue, stale, type SoundId } from '../src/lib/sound.ts';
import { SUB_SCENES, propsOf } from '../src/lib/scenes/index.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Prop } from '../src/lib/scenes/types.ts';

const SCENES = [OVERWORLD, ...Object.values(SUB_SCENES)];
const prop = (id: string): Prop => SCENES.flatMap(propsOf).find((p) => p.id === id)!;

test('every prop in every scene has a signature or is silent on purpose, and every signature names a prop', () => {
	const ids = new Set(SCENES.flatMap(propsOf).map((p) => p.id));
	for (const id of ids) assert.ok(Object.hasOwn(PROP_SOUNDS, id) !== SILENT.includes(id), `${id}: one of a sound or silent`);
	for (const id of [...Object.keys(PROP_SOUNDS), ...SILENT]) assert.ok(ids.has(id) || id === 'signpost', `${id} is a prop`);
});

test('the sound design table, by prop', () => {
	const expect: Record<string, SoundId> = {
		welcome: 'knock',
		'ride-sign': 'knock',
		moose: 'moose',
		'moose-statue': 'moose',
		bike: 'bell',
		'mc-sign': 'squelch',
		'mc-eye': 'squelch',
		'server-rack': 'fan',
		'computer-frontend': 'click',
		'computer-data': 'click',
		whiteboard: 'marker',
		workstation: 'click',
		'ux-laptop': 'click',
		'bottle-bacardi': 'pour',
		'bottle-soonhari': 'pour',
		'humidor-cohiba': 'creak',
		'humidor-punch': 'creak',
		'brewery-sign': 'cooler',
		'stg-logo': 'lighter'
	};
	for (const [id, sound] of Object.entries(expect)) assert.equal(PROP_SOUNDS[id], sound, id);
	for (const p of SUB_SCENES['side-project'].props.filter((p) => p.id.startsWith('bottle-'))) assert.equal(PROP_SOUNDS[p.id], 'pour', p.id);
	for (const p of SUB_SCENES.brennans.props.filter((p) => p.id.startsWith('humidor-'))) assert.equal(PROP_SOUNDS[p.id], 'creak', p.id);
});

test("a card's click sounds the prop's signature alone; a card with no signature only the card", () => {
	assert.deepEqual(clickSounds(prop('bike')), ['bell']);
	assert.deepEqual(clickSounds(prop('brewery-sign')), ['cooler']);
	assert.deepEqual(clickSounds(prop('stg-logo')), ['lighter']);
	assert.deepEqual(clickSounds(prop('diploma')), ['card'], "the card's own paper is its sound (Joe, 2026-09-30)");
	assert.deepEqual(clickSounds(prop('tv-remote')), ['card'], 'picked up, its card is its sound');
	assert.deepEqual(clickSounds(prop('meeting-tv')), [], 'the TV is no button, and plays muted');
});

test("a Foundry poster's click is silent: the screen's projector start is heard by the whole room instead", () => {
	for (const id of ['poster-fast-five', 'poster-snow-white', 'poster-lorax']) assert.deepEqual(clickSounds(prop(id)), [], id);
	assert.deepEqual(clickSounds(undefined), [], 'bare scenery');
});

test('a grant chimes as the cosmetic goes on; the grant that turns the cursor gold plays the fanfare in its place', () => {
	const at = (worn: number, gold = false) => ({ worn, gold });
	assert.equal(grantSound(at(0), at(1)), 'chime', 'the first cosmetic');
	assert.equal(grantSound(at(1), at(4)), 'chime', 'another, earned or worn again');
	assert.equal(grantSound(at(4), at(4)), null, 'already worn: nothing goes on');
	assert.equal(grantSound(at(3), at(7, true)), 'fanfare', 'the seventh');
	assert.equal(grantSound(at(3, true), at(7, true)), 'chime', 'gold already');
});

test('the projector start plays once per reel, from how far into it the visitor is, while its sound lasts', () => {
	const s = { title: 'lorax' as const, at: 10_000 };
	assert.deepEqual(projectorCue(s, null, 10_000, 1800), { at: 10_000, offset: 0 }, 'a click in the room');
	assert.deepEqual(projectorCue(s, null, 10_650, 1800), { at: 10_000, offset: 0.65 }, 'a mid-sequence joiner');
	assert.deepEqual(projectorCue(s, null, 9_990, 1800), { at: 10_000, offset: 0 }, 'a clock a little behind the room');
	assert.equal(projectorCue(s, null, 11_800, 1800), null, 'joined after it ended');
	assert.equal(projectorCue(s, 10_000, 10_100, 1800), null, 'already heard');
	assert.deepEqual(projectorCue({ title: 'lorax', at: 90_000 }, 10_000, 90_000, 1800), { at: 90_000, offset: 0 }, 'the next reel');
	assert.equal(projectorCue(null, 10_000, 20_000, 1800), null, 'idle');
});

test('every scene loads the global one-shots, its props\' signatures and its own extras, and nothing else', () => {
	for (const s of SCENES) {
		const want = needed(s);
		for (const id of GLOBAL) assert.ok(want.has(id), `${s.id}: ${id}`);
		for (const p of propsOf(s)) if (PROP_SOUNDS[p.id]) assert.ok(want.has(PROP_SOUNDS[p.id]), `${s.id}: ${p.id}`);
	}
	assert.deepEqual([...needed(SUB_SCENES.slu)].sort(), [...GLOBAL, 'click', 'marker'].sort());
	assert.ok(needed(OVERWORLD).has('best-lap') && needed(OVERWORLD).has('knock'), 'the lap beep and the signpost');
	assert.ok(needed(SUB_SCENES.foundry).has('projector'));
	assert.ok(!needed(SUB_SCENES.slu).has('projector') && !needed(SUB_SCENES.slu).has('best-lap'));
	assert.ok(needed(OVERWORLD).has('splash'), 'the Grand Basin koi, into Sushi Stand, and the angler’s cast, into Big Muddy');
	const all = new Set([...SCENES.flatMap((s) => [...needed(s)]), ...Object.values(GAME_SOUNDS).flat()]);
	assert.deepEqual([...all].sort(), [...ONE_SHOTS].sort(), 'every one-shot is heard somewhere, the games included');
});

test("a scene's buffers are let go a minute after it is left, unless the scene the visitor is in needs them", () => {
	const last = new Map<SoundId, number>([
		['marker', 0],
		['click', 0],
		['card', 0],
		['pour', 50_000]
	]);
	const here = new Set<SoundId>(['card', 'chime']);
	assert.deepEqual(stale(last, here, LINGER - 1), []);
	assert.deepEqual(stale(last, here, LINGER).sort(), ['click', 'marker']);
	assert.deepEqual(stale(last, here, 50_000 + LINGER).sort(), ['click', 'marker', 'pour']);
});
