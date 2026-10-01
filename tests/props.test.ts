// Seam 2: the props (buildout ticket 15) as plain data and pure functions of a fake clock: every prop finds its cut-out,
// and ambient motion, hover and click reactions and reduced motion behave as the spec says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DENSITIES, deliveries, rigBoundsOf, webpSize } from '../scripts/art/deliver.ts';
import { rigsOf } from '../scripts/art/review.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES, artOf, propsOf } from '../src/lib/scenes/index.ts';
import { CLICK_MS, GAZE, HOVER_MS, RIDER, SCROLL_SPEED, TURNS, blink, breath, chase, gaze, glint, hover, moose, pop, progress, rider, ripples, scrolled, turned } from '../src/lib/engine/motion.ts';
import { along, course, locate } from '../src/lib/engine/track.ts';
import { inOutline, lineY } from '../src/lib/scenes/walk.ts';

const generated = (path: string) => new URL(`../art/generated/${path}`, import.meta.url);
const scenes = [OVERWORLD, ...Object.values(SUB_SCENES)];

test('every prop resolves to its cut-outs or a rig in its scene; the track is its start/finish sign', () => {
	for (const s of scenes)
		for (const p of propsOf(s)) {
			const art = artOf(s, p);
			// Or it is drawn in another prop's layer: the MonsterCommerce eye, over its sign.
			assert.ok(art.length || propsOf(s).some((q) => artOf(s, q).includes(p.id)), `${s.id}/${p.id} has art`);
			for (const id of art)
				assert.ok(existsSync(generated(`${s.id}/${id}/image.webp`)) || existsSync(generated(`${s.id}/${id}-rig.json`)), `${s.id}/${p.id}: ${id}`);
		}
});

// The site fetches a cut-out at the size it draws it, never its original (scripts/art/deliver.ts): the art pipeline writes
// each one's delivery sizes, and this holds a build to them wherever it is made, without ImageMagick.
test('every cut-out the site draws is delivered at both densities, at the size it is drawn', () => {
	const manifest = JSON.parse(readFileSync(new URL('../art/manifest.json', import.meta.url), 'utf8'));
	const assets = manifest.assets.map((a: { scene: string; id: string }) => JSON.parse(readFileSync(generated(`${a.scene}/${a.id}/asset.json`), 'utf8')));
	const due = deliveries(assets, manifest.sceneLayouts, rigBoundsOf(rigsOf(assets).rigs));
	for (const d of due) {
		assert.ok(existsSync(generated(d.file)), `${d.file}: npm run art:review writes it`);
		assert.deepEqual(webpSize(fileURLToPath(generated(d.file))), d.size, `${d.file}: npm run art:review rewrites it`);
		assert.ok(d.size.w <= d.asset.width && d.size.h <= d.asset.height, `${d.file} is never larger than its original`);
	}
	// What the engine asks for: each prop's cut-outs and its rig's parts, the scenery drawn over the cursors, and the
	// overworld's scenery the plate doesn't paint.
	const delivered = new Set(due.map((d) => d.file));
	for (const s of scenes) {
		const scenery = 'walkBehind' in s ? s.walkBehind.map((w) => w.key) : [...s.river.bridges.map((b) => b.key), 'signpost', 'door', 'rider', ...s.track.cover, s.track.sign, ...s.marquee.art];
		for (const id of [...propsOf(s).flatMap((p) => artOf(s, p)), ...s.foreground.map((c) => c.key), ...scenery]) {
			const original = `${s.id}/${id}/image.webp`;
			const files: string[] = existsSync(generated(original))
				? [original]
				: Object.values(JSON.parse(readFileSync(generated(`${s.id}/${id}-rig.json`), 'utf8')) as Record<string, { file: string }>).map((p) => p.file);
			for (const file of files) for (const density of DENSITIES) assert.ok(delivered.has(file.replace('image.webp', `${density}.webp`)), `${file} at ${density}`);
		}
	}
	// A rig's parts are delivered as the manifest lays the rig out, which is the size the site fits it into: the moose's
	// prop rect here, the rider's below.
	const layout = manifest.sceneLayouts.overworld.rigs.find((r: { name: string }) => r.name === 'moose').rect;
	const moose = propsOf(OVERWORLD).find((p) => artOf(OVERWORLD, p).includes('moose'))!.rect;
	assert.deepEqual({ w: layout.w, h: layout.h }, { w: moose.w, h: moose.h });
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

test('the MonsterCommerce eye looks at the visitor’s cursor, no further than its ball allows', () => {
	const eye = { x: 0, y: 0, w: 60, h: 80 };
	assert.deepEqual(gaze(eye, null, false), { x: 0, y: 0 }, 'straight ahead before Join');
	assert.deepEqual(gaze(eye, { x: 1000, y: 40 }, true), { x: 0, y: 0 }, 'and under reduced motion');
	assert.deepEqual(gaze(eye, { x: 1000, y: 40 }, false), { x: GAZE.x * 60, y: 0 }, 'all the way right');
	assert.ok(gaze(eye, { x: 30, y: -1000 }, false).y === -GAZE.y * 80, 'all the way up');
	const near = gaze(eye, { x: 30 + GAZE.reach / 2, y: 40 }, false);
	assert.equal(near.x, (GAZE.x * 60) / 2, 'half way for a cursor half its reach off');
});

test('the river’s ripples drift on its water, clear of its banks, decks and what stands in it; under reduced motion they rest', () => {
	const river = OVERWORLD.river, [eads, poplar] = river.decks;
	for (let t = 0; t < 60_000; t += 1_700)
		for (const r of ripples(river, t, false)) {
			const at = `${r.kind} at ${Math.round(r.x)}, ${Math.round(r.y)}, t ${t}`;
			assert.ok(inOutline({ x: r.x - r.w / 2, y: r.y }, river.mask) && inOutline({ x: r.x + r.w / 2, y: r.y }, river.mask), `${at} is on the water`);
			assert.ok(r.y > lineY([eads[3], eads[2]], r.x), `${at} is south of the Eads deck`);
			assert.ok(r.y < lineY([poplar[0], poplar[1]], r.x) || r.y > lineY([poplar[3], poplar[2]], r.x), `${at} is off the Poplar Street deck`);
			for (const o of river.obstacles) assert.ok(!(r.x + r.w / 2 > o.x && r.x - r.w / 2 < o.x + o.w && r.y > o.y && r.y < o.y + o.h), `${at} is clear of ${o.x}, ${o.y}`);
		}
	assert.ok(ripples(river, 0, false).length > 10, 'plenty of them');
	assert.notDeepEqual(ripples(river, 1000, false), ripples(river, 3000, false), 'they move');
	assert.deepEqual(ripples(river, 1000, true), ripples(river, 3000, true), 'but not under reduced motion');
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

test('a still camera draws the breathing moose when its back has moved a tenth of a world px, not at every frame, and draws every frame of a blink', () => {
	const standing = OVERWORLD.districts.flatMap((d) => d.venues).flatMap((v) => v.props).find((p) => p.id === 'moose')!.rect;
	/** The keys of `frames` frames from `from` ms, 60 a second. */
	const keys = (from: number, frames: number) => Array.from({ length: frames }, (_, i) => breath(moose(from + (i * 1000) / 60, 0, Infinity, false)));
	const drawn = (ks: string[]) => ks.filter((k, i) => i === 0 || k !== ks[i - 1]).length;
	// A breath out and in, 3 s, clear of the blink at 4.5 s.
	const breathing = drawn(keys(0, 180));
	assert.ok(breathing >= 40 && breathing <= 56, `${breathing} drawings of 180 frames`);
	// Between two drawings the back, the moose's height from its feet, has moved a tenth of a world px or so.
	assert.ok(0.001 * standing.h <= 0.11, `${0.001 * standing.h} world px`);
	const blinking = keys(4500, 12);
	assert.equal(drawn(blinking), blinking.length, 'every frame of a blink');
	assert.equal(breath(moose(100, 0, Infinity, true)), breath(moose(2000, 0, Infinity, true)), 'at rest under reduced motion');
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

test('the marquee, scenery with its own cut-outs, scrolls its letters on server time a whole px at a time; under reduced motion it rests on its first words', () => {
	for (const id of OVERWORLD.marquee.art) assert.ok(existsSync(generated(`overworld/${id}/image.webp`)), id);
	assert.deepEqual([0, 999, 1000, 2000].map((t) => scrolled(t, false)), [0, 44, SCROLL_SPEED, 2 * SCROLL_SPEED]);
	// Server time is some 10^12 ms from the epoch: still whole px, at the same steady speed.
	const now = 1_790_000_000_007;
	assert.ok(Number.isInteger(scrolled(now, false)));
	assert.equal(scrolled(now + 1000, false) - scrolled(now, false), SCROLL_SPEED);
	assert.equal(scrolled(now, true), 0);
});
