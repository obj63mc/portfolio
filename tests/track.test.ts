// Seam 2: the Carondelet lap timer (buildout ticket 18) as a pure module stepped with a fake clock. A cursor is ridden
// round a course as a list of positions; the timer says when a lap starts, finishes or is cancelled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORRIDOR, TURN, along, course, ride, type Lap, type LapEvent } from '../src/lib/engine/track.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Point } from '../src/lib/scenes/types.ts';

// A 1000 x 400 box, anticlockwise on screen from its start line, the middle of its bottom side.
const box = course({
	path: [
		{ x: 500, y: 400 },
		{ x: 1000, y: 400 },
		{ x: 1000, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 400 }
	],
	half: 20
});

/** Points `step` px apart along straight legs through `via`. */
function legs(via: Point[], step = 10): Point[] {
	const out: Point[] = [];
	for (let i = 0; i + 1 < via.length; i++) {
		const a = via[i], b = via[i + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
		for (let k = i ? 1 : 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
	}
	return out;
}

/** Rides the cursor through `points`, one every `dt` ms from `t0`, and returns every event with its time. */
function run(points: (Point | null)[], dt = 1000 / 60, t0 = 0, lap: Lap = { is: 'idle', s: null }) {
	const events: { t: number; e: NonNullable<LapEvent> }[] = [];
	points.forEach((p, i) => {
		const t = t0 + i * dt;
		let e: LapEvent;
		[lap, e] = ride(box, lap, p, t);
		if (e) events.push({ t, e });
	});
	return { events, lap };
}

// Once round anticlockwise from just before the line to just after it: 2800 px of loop.
const lapRound = legs([
	{ x: 450, y: 400 },
	{ x: 1000, y: 400 },
	{ x: 1000, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: 400 },
	{ x: 560, y: 400 }
]);

test('crossing the start line starts a lap, and crossing it again after going round finishes it with the time', () => {
	const { events } = run(lapRound, 10);
	assert.deepEqual(
		events.map(({ e }) => e.is),
		['start', 'lap']
	);
	const [start, done] = events;
	assert.equal(done.e.is === 'lap' && done.e.ms, done.t - start.t);
	assert.ok(Math.abs(done.t - start.t - 2800) <= 20, 'a loop of 2800 px ridden at 1 px/ms');
});

/** The same positions pushed `by` px off the path, outward from the box's middle. */
const wide = (points: Point[], by: number) =>
	points.map((p) => ({ x: p.x + (p.x <= 0 ? -by : p.x >= 1000 ? by : 0), y: p.y + (p.y >= 400 ? by : p.y <= 0 ? -by : 0) }));

test('it is forgiving: a lap ridden well off the painted path, or leaving it for a moment, still counts', () => {
	assert.deepEqual(
		run(wide(lapRound, 80), 10).events.map(({ e }) => e.is),
		['start', 'lap'],
		'80 px off the centreline, inside the corridor'
	);
	// Halfway along the top, 200 px out for half a second, then back.
	const wobble = lapRound.map((p) => (p.y === 0 && p.x > 300 && p.x < 800 ? { ...p, y: -200 } : p));
	assert.equal(wobble.filter((p) => p.y === -200).length, 49);
	assert.deepEqual(
		run(wobble, 10).events.map(({ e }) => e.is),
		['start', 'lap']
	);
});

test('leaving the course for more than a second loses the lap', () => {
	const away = legs([{ x: 450, y: 400 }, { x: 800, y: 400 }, { x: 800, y: 700 }]);
	const { events, lap } = run([...away, ...Array(70).fill({ x: 800, y: 700 })], 1000 / 60);
	assert.deepEqual(
		events.map(({ e }) => e.is),
		['start', 'cancel']
	);
	const [, cancel] = events;
	assert.ok(cancel.t > 1000, 'not before the grace ran out');
	assert.equal(lap.is, 'idle');
});

test('a pause or a card, a null position, loses a running lap', () => {
	const { events } = run([...legs([{ x: 450, y: 400 }, { x: 700, y: 400 }]), null]);
	assert.deepEqual(
		events.map(({ e }) => e.is),
		['start', 'cancel']
	);
});

test('no shortcuts: cutting across the lake, or crossing the line back and forth, never finishes a lap', () => {
	const cut = legs([{ x: 450, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 400 }, { x: 560, y: 400 }]);
	assert.ok(!run(cut, 10).events.some(({ e }) => e.is === 'lap'), 'across the middle');
	const dither = Array.from({ length: 20 }, (_, i) => legs(i % 2 ? [{ x: 560, y: 400 }, { x: 440, y: 400 }] : [{ x: 440, y: 400 }, { x: 560, y: 400 }])).flat();
	const { events } = run(dither, 10);
	assert.ok(events.length && events.every(({ e }) => e.is === 'start'), 'each crossing starts a lap afresh, none finishes');
});

test('a lap counts either way round, and each finish starts the next lap', () => {
	const clockwise = legs([{ x: 560, y: 400 }, { x: 0, y: 400 }, { x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 400 }, { x: 440, y: 400 }]);
	assert.deepEqual(
		run(clockwise, 10).events.map(({ e }) => e.is),
		['start', 'lap']
	);
	const twice = [...lapRound, ...legs([{ x: 560, y: 400 }, { x: 1000, y: 400 }, { x: 1000, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 400 }, { x: 560, y: 400 }]).slice(1)];
	const laps = run(twice, 10).events.filter(({ e }) => e.is === 'lap');
	assert.equal(laps.length, 2);
	assert.ok(laps.every(({ e }) => e.is === 'lap' && Math.abs(e.ms - 2800) <= 20), 'both flying laps timed line to line');
});

test('on the Carondelet loop, a thumb weaving round it at joystick speed makes a lap, and a cut across the lake does not', () => {
	const loop = course(OVERWORLD.track);
	/** The events of riding `points` round the loop, one every 60th of a second. */
	const events = (points: Point[]) => {
		let lap: Lap = { is: 'idle', s: null }, e: LapEvent;
		const out: NonNullable<LapEvent>[] = [];
		points.forEach((p, i) => {
			[lap, e] = ride(loop, lap, p, (i * 1000) / 60);
			if (e) out.push(e);
		});
		return out;
	};
	// Up to 75 px either side of the centreline, 10 px a frame (600 world px/s), from just before the line.
	const weave: Point[] = [];
	for (let s = -60; s < loop.length + 60; s += 10) {
		const a = along(loop, s - 1), b = along(loop, s + 1), p = along(loop, s), l = Math.hypot(b.x - a.x, b.y - a.y), o = 75 * Math.sin(s / 170);
		weave.push({ x: p.x - ((b.y - a.y) / l) * o, y: p.y + ((b.x - a.x) / l) * o });
	}
	assert.ok(75 < loop.half + CORRIDOR);
	const woven = events(weave);
	assert.deepEqual(
		woven.map((e) => e.is),
		['start', 'lap']
	);
	assert.ok(Math.abs((woven[1] as { ms: number }).ms - (loop.length / 600) * 1000) < 100, 'timed at the speed ridden');
	// Over the line and round the east end, then from the far side straight south over the water, skipping the west end:
	// the lap is lost, and crossing the line again only starts the next.
	const { path } = OVERWORLD.track;
	const cut = legs([{ x: 2550, y: 2528 }, ...path.slice(1, 26), { x: 2300, y: 2493 }, { x: 2650, y: 2539 }]);
	assert.deepEqual(
		events(cut).map((e) => e.is),
		['start', 'cancel', 'start']
	);
});

test('on the Carondelet loop the turns at its far ends are far wider: swinging out round them counts, straying as far off a straight does not', () => {
	const loop = course(OVERWORLD.track), { ends } = OVERWORLD.track;
	assert.equal(loop.limit[0], loop.half + CORRIDOR, 'the start line on a straight');
	assert.equal(Math.max(...loop.limit), loop.half + TURN);
	/** The events of riding the centreline at 600 world px/s, pushed `out` px outward (away from the lake) where `where` says. */
	const events = (out: number, where: (p: Point) => boolean) => {
		let lap: Lap = { is: 'idle', s: null }, e: LapEvent;
		const got: NonNullable<LapEvent>[] = [];
		for (let s = -60, i = 0; s < loop.length + 60; s += 10, i++) {
			const a = along(loop, s), o = where(a) ? out : 0;
			[lap, e] = ride(loop, lap, { x: a.x - a.dy * o, y: a.y + a.dx * o }, (i * 1000) / 60);
			if (e) got.push(e);
		}
		return got.map((e) => e.is);
	};
	// 200 px out all the way round both turns, where the path bends.
	assert.ok(200 > loop.half + CORRIDOR);
	assert.deepEqual(
		events(200, ({ x }) => x < ends.west - 200 || x > ends.east + 250),
		['start', 'lap']
	);
	// As far out along 800 px of the top straight, over a second at this speed: lost, and the line only starts the next.
	assert.deepEqual(
		events(200, ({ x, y }) => y < 2200 && x > 1900 && x < 2700),
		['start', 'cancel', 'start']
	);
});
