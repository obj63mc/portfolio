// Seam 2: the props (buildout ticket 15) as plain data and pure functions of a fake clock: every prop finds its cut-out,
// and ambient motion, hover and click reactions and reduced motion behave as the spec says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES, artOf, propsOf } from '../src/lib/scenes/index.ts';
import { CLICK_MS, HOVER_MS, RIDER, TURNS, blink, chase, glint, hover, moose, pop, progress, rider, turned } from '../src/lib/engine/motion.ts';
import { along, course, locate } from '../src/lib/engine/track.ts';

const generated = (path: string) => new URL(`../art/generated/${path}`, import.meta.url);
const scenes = [OVERWORLD, ...Object.values(SUB_SCENES)];

test('every prop resolves to its cut-outs or a rig in its scene; the track is its start/finish sign', () => {
	for (const s of scenes)
		for (const p of propsOf(s)) {
			const art = artOf(s, p);
			assert.ok(art.length, `${s.id}/${p.id} has art`);
			for (const id of art)
				assert.ok(existsSync(generated(`${s.id}/${id}/image.webp`)) || existsSync(generated(`${s.id}/${id}-rig.json`)), `${s.id}/${p.id}: ${id}`);
		}
});

test('the rider rests where the art manifest lays it out, and rides the track from there', () => {
	const { sceneLayouts } = JSON.parse(readFileSync(new URL('../art/manifest.json', import.meta.url), 'utf8'));
	const layout = sceneLayouts.overworld.rigs.find((r: { name: string }) => r.name === 'rider');
	const rest = rider(0, true).at;
	assert.deepEqual({ ...layout.rect }, { x: Math.round(rest.x), y: Math.round(rest.y), w: rest.w, h: rest.h });
	assert.equal(layout.travelX, 0, 'it rides the loop in scene data, not a sweep');
});

test('the rider rides the whole lake loop on server time at a steady speed, its wheels turning as far as it rides, its cranks with them', () => {
	const loop = course(OVERWORLD.track), lapMs = (loop.length / RIDER.speed) * 1000, frame = (RIDER.speed * 16) / 1000;
	// Its wheels meet the ground `drop` below the centreline, at the middle of its box.
	const wheels = (t: number) => {
		const { at } = rider(t, false);
		return { x: at.x + at.w / 2, y: at.y + at.h - RIDER.drop };
	};
	let last = rider(0, false), seen = new Set<number>(), pedalled = 0;
	for (let t = 16; t < 2 * lapMs; t += 16) {
		const r = rider(t, false), p = wheels(t), q = wheels(t - 16);
		// It follows the centreline with its corners rounded, never more than a few px off it.
		assert.ok(locate(loop, p).d < 5, `on the loop at ${t}`);
		assert.ok(Math.hypot(p.x - q.x, p.y - q.y) <= frame + 1e-6, `no jump at ${t}`);
		assert.ok(Math.abs(r.travelled - last.travelled - frame) < 1e-6, `the wheels roll as far as it rides at ${t}`);
		assert.ok(Math.abs(r.lean) <= RIDER.lean && Math.abs(r.lean - last.lean) < 0.02, `leans a little, smoothly, at ${t}`);
		assert.ok(Math.abs(r.flip - last.flip) < 0.2, `turns round smoothly at ${t}`);
		assert.ok(r.flip * r.facing >= 0, `faces the way it is turned at ${t}`);
		// The cranks step one frame on at a time, round the sheet.
		const step = (r.frame - last.frame + RIDER.frames) % RIDER.frames;
		assert.ok(step <= 1 && r.frame >= 0 && r.frame < RIDER.frames, `pedals on at ${t}`);
		pedalled += step;
		seen.add(Math.floor(locate(loop, p).s / 500));
		last = r;
	}
	assert.equal(seen.size, Math.ceil(loop.length / 500), 'all the way round');
	assert.ok(Math.abs(pedalled / RIDER.frames - (2 * loop.length) / RIDER.stride) < 1, 'a crank turn every stride');
	const a = wheels(lapMs * 7 + 1234), b = wheels(1234);
	assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, 'a lap brings it back');
	// Two visitors reading the same server time see it at the same point.
	assert.deepEqual(rider(1_790_000_000_123, false), rider(1_790_000_000_123, false));
	for (const t of [0, 5000, 1_790_000_000_123]) assert.deepEqual(rider(t, true), rider(0, true), 'resting frame under reduced motion');
	assert.deepEqual([rider(0, true).facing, rider(0, true).flip, rider(0, true).frame], [1, 1, 0]);
});

test('the rider turns round at each end of the loop, and only there, facing the way it rides everywhere else', () => {
	const loop = course(OVERWORLD.track), at = (s: number) => rider(((s - RIDER.rest) / RIDER.speed) * 1000, false);
	assert.equal(TURNS.length, 2, 'the east and west ends');
	// East of the east end's middle and west of the west end's.
	assert.ok(along(loop, TURNS[0]).x > 3400 && along(loop, TURNS[1]).x < 1400);
	for (const c of TURNS) {
		assert.ok(Math.abs(at(c).flip) < 0.05, 'edge on in the middle of a turn');
		for (const d of [RIDER.turn / 2, -RIDER.turn / 2]) assert.ok(Math.abs(at(c + d).flip) > 0.99, 'full width once it has turned');
	}
	for (let s = RIDER.rest; s < RIDER.rest + loop.length; s += 25) {
		if (TURNS.some((c) => Math.abs(s - c) < RIDER.turn / 2 || Math.abs(s - c - loop.length) < RIDER.turn / 2)) continue;
		const r = at(s), dx = along(loop, s + 20).x - along(loop, s - 20).x;
		assert.equal(Math.abs(r.flip), 1, `full width at ${s}`);
		if (Math.abs(dx) > 5) assert.equal(r.facing, Math.sign(dx), `faces its way at ${s}`);
	}
});

test('the wheels turn within one turn, exactly as far as the rider rolls, at any server time', () => {
	const radius = 18, frame = (RIDER.speed * 16) / 1000;
	// Server time is ms since the epoch: the rider has ridden some 10^11 px, and its wheels some 10^10 rad.
	for (const t of [0, 5000, 1_790_000_000_123, 2_500_000_000_000]) {
		const a = turned(rider(t, false).travelled, radius), b = turned(rider(t + 16, false).travelled, radius);
		assert.ok(a >= 0 && a < 2 * Math.PI && b >= 0 && b < 2 * Math.PI, `within one turn at ${t}`);
		const step = (((b - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		assert.ok(Math.abs(step - frame / radius) < 1e-4, `a frame turns it ${frame / radius} rad at ${t}, not ${step}`);
	}
});

test('hover fades in over 150 ms and out again; under reduced motion it is a plain highlight, on and off at once', () => {
	let h = 0;
	for (let t = 0; t < HOVER_MS; t += 50) h = hover(h, true, 50, false);
	assert.equal(h, 1);
	assert.equal(hover(1, false, 50, false), 1 - 50 / HOVER_MS);
	assert.equal(hover(0, true, 1, true), 1);
	assert.equal(hover(1, false, 1, true), 0);
});

test('click reactions run their length and still play under reduced motion', () => {
	assert.equal(progress(Infinity, CLICK_MS.pop), 1, 'never clicked is at rest');
	assert.equal(pop(progress(0, CLICK_MS.pop)), 1);
	assert.ok(pop(progress(CLICK_MS.pop / 2, CLICK_MS.pop)) > 1.05);
	assert.equal(pop(progress(CLICK_MS.pop, CLICK_MS.pop)), 1);
	assert.ok(blink(progress(CLICK_MS.blink / 2, CLICK_MS.blink)) < 0.2, 'the eye shuts halfway');
	assert.equal(blink(1), 1);
	const wobbling = moose(0, 0, 100, true);
	assert.notEqual(wobbling.antlers.r, 0, 'the antlers wobble under reduced motion');
	assert.equal(moose(0, 0, CLICK_MS.wobble, true).antlers.r, 0, 'and settle');
	assert.ok(moose(0, 0, CLICK_MS.blink / 2, true).eye.sy < 0.2, 'the moose blinks at a click under reduced motion');
});

test('the moose breathes and blinks on its own and lifts its head on hover; under reduced motion it rests', () => {
	const poses = [0, 700, 1400, 4600].map((t) => moose(t, 0, Infinity, false));
	assert.ok(new Set(poses.map((p) => p.body.sy)).size > 1, 'breathing');
	assert.ok(poses[3].eye.sy < 1, 'a blink every few seconds');
	assert.ok(moose(0, 1, Infinity, false).head.r < 0, 'hover lifts the head');
	for (const t of [0, 700, 4600]) {
		const p = moose(t, 1, Infinity, true);
		assert.deepEqual([p.body.sy, p.head.r, p.antlers.r, p.eye.sy], [1, 0, 0, 1], `resting at ${t}`);
	}
});

test('the marquee chases in three steps and the bottles glint in sweeps; both hold still between changes and under reduced motion', () => {
	assert.deepEqual([0, 149, 150, 300, 450].map((t) => chase(t, false)), [0, 0, 1, 2, 0]);
	assert.equal(chase(1234, true), -1);
	assert.equal(glint(0, false), 0);
	assert.ok(glint(700, false)! > 0 && glint(700, false)! < 1);
	assert.equal(glint(3000, false), null, 'still between sweeps');
	assert.equal(glint(3500, false), glint(5000, false));
	assert.equal(glint(700, true), null);
});
