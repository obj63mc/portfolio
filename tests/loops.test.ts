// Seam 2: the beds and music (buildout ticket 21) as plain functions of the camera's centre and a fake clock: each bed's
// gain, full inside its footprint and gone 400 world px outside it on an equal-power curve; the theme's and each scene's
// own music's levels; the loops a camera position needs loaded; and the passes a loop plays, each overlapping the next by
// 2 s on equal-power curves. The Web Audio module (sound.svelte.ts) only follows these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	bedGain, BEDS, bedsOf, envelope, FADE, fadeOf, gains, leavingGains, LEVEL, loopsFor, loopsNeeded, MUSIC, NEAR, nextPass, OVERLAP, playhead, RESUME, SCENE_MUSIC, type LoopId
} from '../src/lib/loops.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';

const SCENES = [OVERWORLD, ...Object.values(SUB_SCENES)];
const box = { x: 1000, y: 1000, w: 500, h: 400 };
const near = (a: number, b: number, what = '', within = 1e-9) => assert.ok(Math.abs(a - b) < within, `${what}: ${a} is not ${b}`);

test("a bed's gain is full inside its footprint and on its edge, and falls to nothing 400 world px outside it", () => {
	near(bedGain(box, { x: 1200, y: 1200 }), 1, 'inside');
	near(bedGain(box, { x: 1000, y: 1400 }), 1, 'on the corner');
	near(bedGain(box, { x: 1500 + FADE / 2, y: 1200 }), Math.SQRT1_2, 'halfway out, the equal-power midpoint');
	assert.equal(bedGain(box, { x: 1500 + FADE, y: 1200 }), 0, 'at the fade zone’s edge');
	assert.equal(bedGain(box, { x: 5000, y: 5000 }), 0, 'far away');
	// Diagonally off a corner the distance is to the corner.
	near(bedGain(box, { x: 1500 + 120, y: 1400 + 160 }), Math.cos((200 / FADE) * (Math.PI / 2)), 'off a corner');
});

test('the fade out is an equal-power curve: gains at mirrored distances square to one', () => {
	for (const d of [0, 50, 133, 200, 300, 400]) {
		const g = bedGain(box, { x: 1500 + d, y: 1200 }), h = bedGain(box, { x: 1500 + FADE - d, y: 1200 });
		near(g * g + h * h, 1, `${d} px`);
	}
});

test('every scene has its beds: the five districts and the river on the overworld, its own in a sub-scene', () => {
	const ow = bedsOf(OVERWORLD).map((b) => b.id);
	assert.deepEqual(ow.sort(), [...OVERWORLD.districts.map((d) => `bed-${d.id}`), 'bed-river'].sort());
	for (const d of OVERWORLD.districts) assert.deepEqual(bedsOf(OVERWORLD).find((b) => b.id === `bed-${d.id}`)!.footprint, d.rect, d.id);
	for (const s of Object.values(SUB_SCENES)) assert.deepEqual(bedsOf(s), [{ id: `bed-${s.id}`, footprint: { x: 0, y: 0, w: s.w, h: s.h } }], s.id);
	assert.deepEqual([...new Set(SCENES.flatMap((s) => bedsOf(s).map((b) => b.id)))].sort(), [...BEDS].sort(), 'eleven beds, each somewhere');
});

test("the river's footprint holds the Arch and the water off the bridge, clear of Midtown and Belleville", () => {
	const r = OVERWORLD.river.footprint, arch = OVERWORLD.river.arch;
	assert.ok(arch.x >= r.x && arch.x <= r.x + r.w && arch.y >= r.y && arch.y <= r.y + r.h, 'the Arch');
	const deck = OVERWORLD.river.deck;
	assert.ok(deck.x < r.x + r.w && deck.x + deck.w > r.x, 'the bridge crosses it');
	for (const id of ['midtown', 'belleville']) {
		const d = OVERWORLD.districts.find((d) => d.id === id)!.rect;
		assert.ok(r.x >= d.x + d.w || r.x + r.w <= d.x, `${id} is beside it, not in it`);
	}
});

test('roaming the overworld west to east, some bed is always audible along the districts, and never two at full but where footprints meet', () => {
	const y = 1300;
	for (let x = 0; x <= OVERWORLD.w; x += 50) {
		const g = gains(OVERWORLD, { x, y }, { screen: false, video: false });
		const beds = [...g].filter(([id]) => id.startsWith('bed-'));
		assert.ok(beds.some(([, v]) => v > 0), `a bed at x ${x}`);
		for (const [, v] of beds) assert.ok(v >= 0 && v <= 1);
	}
	const mid = gains(OVERWORLD, { x: 5000, y }, { screen: false, video: false });
	assert.equal(mid.get('bed-river'), 1, 'in the river’s footprint');
});

test("neighbouring beds cross at equal power: their power together never passes one, and is one inside any bed's footprint", () => {
	const beds = bedsOf(OVERWORLD);
	for (let y = 0; y <= OVERWORLD.h; y += 100)
		for (let x = 0; x <= OVERWORLD.w; x += 50) {
			const g = gains(OVERWORLD, { x, y }, { screen: false, video: false });
			const power = [...g].filter(([id]) => id.startsWith('bed-')).reduce((sum, [, v]) => sum + v * v, 0);
			assert.ok(power <= 1 + 1e-9, `${power} at ${x}, ${y}`);
			if (beds.some((b) => bedGain(b.footprint, { x, y }) === 1)) near(power, 1, `inside a footprint at ${x}, ${y}`);
		}
	// Where Midtown's and Carondelet Park's footprints meet, neither is at full: they share the power.
	const mt = OVERWORLD.districts.find((d) => d.id === 'midtown')!.rect, cp = OVERWORLD.districts.find((d) => d.id === 'carondelet-park')!.rect;
	const g = gains(OVERWORLD, { x: Math.max(mt.x, cp.x) + 10, y: cp.y }, { screen: false, video: false });
	for (const id of ['bed-midtown', 'bed-carondelet-park'] as const) assert.ok(g.get(id)! > 0.5 && g.get(id)! < 1, `${id}: ${g.get(id)}`);
});

test('the theme plays 6 dB under the beds on the overworld, 12 dB further down in the lab and the idle theatre, and not at all where a scene has music', () => {
	const at = (scene: Parameters<typeof gains>[0], s = { screen: false, video: false }) => gains(scene, { x: 10, y: 10 }, s);
	near(at(OVERWORLD).get('theme')!, LEVEL.theme, 'overworld');
	near(LEVEL.theme, 10 ** (-10 / 20), 'music files are 4 dB hotter than beds: 10 dB down puts the theme 6 dB under');
	near(at(SUB_SCENES.slu).get('theme')!, LEVEL.themeUnder, 'the lab');
	near(LEVEL.themeUnder, LEVEL.theme * 10 ** (-12 / 20), '12 dB further down');
	near(at(SUB_SCENES.foundry).get('theme')!, LEVEL.themeUnder, 'the theatre, screen idle');
	assert.equal(at(SUB_SCENES.foundry, { screen: true, video: false }).get('theme'), 0, 'the theatre while the screen plays');
	for (const id of ['brennans', 'side-project', 'moosylvania']) {
		assert.equal(at(SUB_SCENES[id]).get('theme'), 0, `${id}: the theme gives way`);
		near(at(SUB_SCENES[id]).get(SCENE_MUSIC[id]!)!, id === 'moosylvania' ? LEVEL.lobby : LEVEL.music, `${id}: its own music`);
	}
	near(LEVEL.lobby, LEVEL.music * 10 ** (-6 / 20), 'the lobby’s playlist is low, 6 dB under a bar’s music');
});

test('paused, the beds, the theme and the music duck together to 30 percent', () => {
	assert.equal(LEVEL.paused, 0.3);
});

test("the lobby's playlist ducks while the meeting TV's video plays; nothing else a scene hears depends on it", () => {
	const quiet = gains(SUB_SCENES.moosylvania, { x: 10, y: 10 }, { screen: false, video: true });
	near(quiet.get('music-moosylvania')!, LEVEL.lobby * LEVEL.duck);
	near(LEVEL.duck, 10 ** (-12 / 20), '12 dB under');
	assert.equal(quiet.get('bed-moosylvania'), 1, 'the bed stays');
});

test('a scene’s gains name only its own loops, and every loop some scene plays', () => {
	for (const s of SCENES) {
		const ids = [...gains(s, { x: 10, y: 10 }, { screen: false, video: false }).keys()];
		assert.ok(ids.every((id) => (BEDS as readonly string[]).includes(id) || (MUSIC as readonly string[]).includes(id)), s.id);
	}
	const all = new Set(SCENES.flatMap((s) => [...gains(s, { x: 10, y: 10 }, { screen: false, video: false }).keys()]));
	assert.deepEqual([...all].sort(), [...BEDS, ...MUSIC].sort());
});

test('loading: the beds audible at the camera and those within 800 px of their fade zone, and the music or theme the scene plays', () => {
	const at = (x: number, y: number) => [...loopsNeeded(OVERWORLD, { x, y })].sort();
	const mw = OVERWORLD.districts.find((d) => d.id === 'maplewood')!.rect;
	const deep = at(mw.x + 100, mw.y + mw.h / 2);
	assert.ok(deep.includes('bed-maplewood') && deep.includes('theme'));
	assert.ok(!deep.includes('bed-belleville') && !deep.includes('bed-river'), 'the far east is not loaded from the west edge');
	// A footprint within FADE + NEAR is in reach, and one just beyond it is not.
	const bv = OVERWORLD.districts.find((d) => d.id === 'belleville')!.rect, y = bv.y + bv.h / 2;
	assert.ok(at(bv.x - (FADE + NEAR) + 1, y).includes('bed-belleville'));
	assert.ok(!at(bv.x - (FADE + NEAR) - 1, y).includes('bed-belleville'));
	for (const s of Object.values(SUB_SCENES)) {
		const want = [...loopsNeeded(s, { x: 5, y: 5 })].sort();
		const own = SCENE_MUSIC[s.id], expect: LoopId[] = [`bed-${s.id}` as LoopId, ...(own ? [own] : ['theme' as const])];
		assert.deepEqual(want, expect.sort(), s.id);
		assert.deepEqual([...loopsFor(s)].sort(), expect.sort(), `${s.id}: a door hovered loads the same`);
	}
	assert.deepEqual([...loopsFor(OVERWORLD)], ['theme'], 'the overworld’s beds wait for where the visitor lands');
});

test('a loop plays passes each a period apart, the next starting as the last reaches its period, from 0', () => {
	assert.equal(nextPass(10, 0, 36), 46, 'a pass from the top');
	assert.equal(nextPass(10, 20, 36), 26, 'a pass resumed at 20 s reaches its period 16 s later');
	near(playhead(10, 0, 22.5, 36), 12.5);
	near(playhead(10, 20, 25, 36), 35, 'resumed at 20 s, 15 s on');
	near(playhead(10, 20, 27, 36), 1, 'into the next pass');
});

test('each pass fades in over its first 2 s and out over the 2 s past its period, on curves that sum to equal power', () => {
	const P = 36, e = envelope(0, P);
	assert.equal(e.in?.from, 0);
	near(e.in!.duration, OVERLAP);
	near(e.out.at, P, 'the fade out starts at the period, where the next pass starts');
	near(e.out.duration, OVERLAP);
	for (let i = 0; i < e.out.curve.length; i++) {
		const o = e.out.curve[i], n = envelope(0, P).in!.curve[i];
		near(o * o + n * n, 1, `point ${i}`, 1e-6); // the curves are Float32Arrays, as Web Audio takes them
	}
	// Resumed where it stopped, nothing overlaps it and it may come in mid-phrase: it fades in from silence, briefly.
	for (const offset of [1, OVERLAP, 20]) {
		const r = envelope(offset, P);
		assert.equal(r.in?.curve[0], 0, `resumed at ${offset} s, from silence`);
		near(r.in!.duration, RESUME, `resumed at ${offset} s, over ${RESUME} s`);
		near(r.out.at, P - offset, `resumed at ${offset} s, its period is reached ${offset} s sooner`);
	}
});

test("a bed's passes cross at equal power; music's, cut where it nearly repeats, at equal gain so the seam doesn't swell", () => {
	assert.equal(fadeOf('bed-river'), 'power');
	for (const id of MUSIC) assert.equal(fadeOf(id), 'gain', id);
	const e = envelope(0, 36, 'gain');
	for (let i = 0; i < e.out.curve.length; i++) near(e.out.curve[i] + e.in!.curve[i], 1, `point ${i}`, 1e-6);
});

test('leaving through a door, every loop fades with the iris but the theme, which goes toward its level where the visitor lands', () => {
	const here = gains(OVERWORLD, { x: 1800, y: 1400 }, { screen: false, video: false });
	const into = (to: Parameters<typeof leavingGains>[1], screen = false) => leavingGains(here, to, { screen, video: false });
	for (const [id, g] of into(SUB_SCENES.slu)) if (id !== 'theme') assert.equal(g, 0, id);
	assert.equal(into(SUB_SCENES.slu).get('theme'), LEVEL.themeUnder, 'into the lab, the theme carries on further down');
	assert.equal(into(SUB_SCENES.brennans).get('theme'), 0, 'into a scene with music of its own, it goes');
	assert.equal(into(SUB_SCENES.foundry, true).get('theme'), 0, 'into the theatre while its screen plays, it goes');
	assert.equal(leavingGains(gains(SUB_SCENES.brennans, { x: 10, y: 10 }, { screen: false, video: false }), OVERWORLD, { screen: false, video: false }).get('theme'), LEVEL.theme, 'back out, it comes up under the beds');
	assert.equal(into(undefined).get('theme'), 0, 'off the site: silence');
});
