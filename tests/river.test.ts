// Seam 2: the river current (buildout ticket 20) as a pure function of one cursor's successive positions and a fake clock:
// in the river once it steps onto the water from a bank or off the deck, still in it under the deck, out on either bank.
// It floats only once it has been left still in the water for a second, anything the visitor does stops it, and only a
// floating cursor is washed out at the south end (Joe, 2026-09-30).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARROW, ASHORE, BANK, CURRENT, STILL, flow, type Current } from '../src/lib/scenes/river.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Overworld, Point } from '../src/lib/scenes/types.ts';
import { inOutline as inPolygon } from '../src/lib/scenes/walk.ts';

// A straight river from x 1000 to 1400, a deck sloping down across it at y 400 to 500, 60 px thick, its ends on the banks,
// a pier in midstream at y 1200 to 1300 and a boat moored at the west bank at y 1400; the river ends at y 1800.
const pier = { x: 1150, y: 1200, w: 100, h: 100 }, boat = { x: 1000, y: 1400, w: 120, h: 80 };
const river: Overworld['river'] = {
	mask: [{ x: 1000, y: 0 }, { x: 1000, y: 2000 }, { x: 1400, y: 2000 }, { x: 1400, y: 0 }],
	decks: [[{ x: 900, y: 400 }, { x: 1500, y: 500 }, { x: 1500, y: 560 }, { x: 900, y: 460 }]],
	bridges: [{ key: 'bridge', rect: { x: 900, y: 380, w: 600, h: 300 } }],
	obstacles: [pier, boat],
	southEnd: [{ x: 1000, y: 1800 }, { x: 1400, y: 1800 }],
	arch: { x: 800, y: 1000 },
	footprint: { x: 800, y: 0, w: 800, h: 2000 }
};

type Step = { is: Current['is'] | 'end'; at: Point; dy: number; dx: number };

/**
 * A cursor stepped through `frames` of `dt` seconds from `from`: `input` moves it that many world px a second, by the
 * visitor's own hand when `steered` (keys, a mouse, the joystick) and by the camera's push otherwise; the current carries
 * it south while it floats. Its state, position and drift after each frame, up to a wash-out.
 */
function ride(from: Point, frames: number, { input = { x: 0, y: 0 }, steered = true, dt = 1 / 16, was = ASHORE as Current, r = river } = {}) {
	const trail: Step[] = [];
	let at = from, is = was;
	for (let i = 0; i < frames; i++) {
		const moving = !!(input.x || input.y), f = flow(r, is, at, dt, steered && moving);
		at = { x: at.x + input.x * dt + f.d.x, y: at.y + input.y * dt + f.d.y };
		trail.push({ is: f.is.is, at, dy: f.d.y, dx: f.d.x });
		if (f.is.is === 'end') break;
		is = f.is;
	}
	return trail;
}

const afloat = (from: Point, still = 0): Current => ({ is: 'afloat', at: from, still });

test('stepped into the water from a bank, the cursor floats only once it has been left still for a second', () => {
	assert.equal(STILL, 1);
	assert.equal(CURRENT, 150);
	const wade = ride({ x: 980, y: 1000 }, 16, { input: { x: 160, y: 0 } });
	assert.equal(wade[0].is, 'ashore');
	assert.ok(wade.some((f) => f.is === 'afloat'), 'afloat once on the water');
	assert.ok(wade.every((f) => f.dy === 0), 'no drift while it moves');
	// Left there: a second without a drift, then the current carries it.
	const left = ride(wade.at(-1)!.at, 32, { was: afloat(wade.at(-1)!.at) });
	assert.deepEqual(left.map((f) => f.dy > 0), [...Array(16).fill(false), ...Array(16).fill(true)]);
	assert.equal(left.at(-1)!.dy, CURRENT / 16);
});

test('anything the visitor does stops the float, and it starts again only after another second still', () => {
	const from = { x: 1300, y: 1000 };
	const floating = ride(from, 40, { was: afloat(from, STILL) });
	assert.ok(floating.every((f) => f.dy > 0));
	// A step of the keys, the mouse or the joystick: the drift stops that frame.
	const at = floating.at(-1)!.at, stirred = flow(river, afloat(at, 5), at, 1 / 16, true);
	assert.deepEqual(stirred, { is: afloat(at), d: { x: 0, y: 0 } });
	const again = ride(at, 20, { was: stirred.is });
	assert.equal(again.findIndex((f) => f.dy > 0), 16);
});

test('carried by the camera’s push, the cursor isn’t left still, so it never starts to float', () => {
	const t = ride({ x: 1200, y: 1000 }, 64, { input: { x: 0, y: 40 }, steered: false, was: afloat({ x: 1200, y: 1000 }) });
	assert.ok(t.every((f) => f.is === 'afloat' && f.dy === 0));
});

test('once it floats, the camera’s push following the drift doesn’t stop it; only the visitor does', () => {
	const from = { x: 1300, y: 1000 };
	const t = ride(from, 32, { input: { x: 0, y: 60 }, steered: false, was: afloat(from, STILL) });
	assert.ok(t.every((f) => f.dy > 0));
});

test('paddling to either bank brings it ashore', () => {
	for (const input of [{ x: -600, y: 0 }, { x: 600, y: 0 }]) {
		const t = ride({ x: 1200, y: 1000 }, 16, { input, was: afloat({ x: 1200, y: 1000 }, STILL) });
		assert.equal(t.at(-1)!.is, 'ashore');
		assert.ok(t.every((f) => f.dy === 0));
	}
});

test('floating into a pier, it drifts round the nearer side and on down, never through it', () => {
	const overlaps = (p: Point, o: typeof pier) => p.x < o.x + o.w && p.x + ARROW.w > o.x && p.y < o.y + o.h && p.y + ARROW.h > o.y;
	for (const [x, side] of [[1180, 'west'], [1230, 'east']] as const) {
		const t = ride({ x, y: 1000 }, 45, { was: afloat({ x, y: 1000 }, STILL) });
		assert.ok(t.every((f) => f.is === 'afloat' && !overlaps(f.at, pier)), `${x} went through the pier`);
		assert.ok(t.at(-1)!.at.y > pier.y + pier.h, 'and past it');
		const passing = t.find((f) => f.at.y > pier.y)!;
		assert.ok(side === 'west' ? passing.at.x + ARROW.w <= pier.x : passing.at.x >= pier.x + pier.w, `${x} passed on the ${side}`);
		// It kept to the current's speed going round.
		assert.ok(t.every((f) => Math.hypot(f.dx, f.dy) <= CURRENT / 16 + 1e-9));
	}
});

/** The arrow at `p`, with BANK world px of water beside it: all of it on the river. */
const onWater = (r: Overworld['river'], p: Point) =>
	[p.x - BANK, p.x + ARROW.w + BANK].every((x) => [p.y, p.y + ARROW.h - 1].every((y) => inPolygon({ x, y }, r.mask)));

test('left still by either bank, the cursor floats in from it and down with water on both sides of its arrow', () => {
	for (const x of [1003, 1395]) {
		const t = ride({ x, y: 600 }, 64, { was: afloat({ x, y: 600 }, STILL) });
		assert.ok(t.every((f) => f.is === 'afloat'));
		const from = t.findIndex((f) => onWater(river, f.at));
		assert.ok(from >= 0 && from < 16, `${x} moved in off the bank`);
		assert.ok(t.slice(from).every((f) => onWater(river, f.at)), `${x} kept off the bank`);
		assert.ok(t.at(-1)!.at.y > 900, `${x} floated on down`);
	}
});

test('a boat moored at the bank is passed on its open side, and the float never carries the cursor ashore', () => {
	const t = ride({ x: 1010, y: 1300 }, 40, { was: afloat({ x: 1010, y: 1300 }, STILL) });
	assert.ok(t.every((f) => f.is === 'afloat'));
	const passing = t.find((f) => f.at.y + ARROW.h > boat.y && f.at.y < boat.y + boat.h)!;
	assert.ok(passing.at.x >= boat.x + boat.w, 'east of the boat');
	// Hard by the east bank, the drift keeps to the water.
	assert.ok(ride({ x: 1399, y: 600 }, 64, { was: afloat({ x: 1399, y: 600 }, STILL) }).every((f) => f.is === 'afloat'));
});

test('the river’s end is a line: a sloped one ends each floating cursor where it crosses it', () => {
	const sloped = { ...river, obstacles: [], southEnd: [{ x: 1000, y: 1500 }, { x: 1400, y: 1700 }] };
	for (const [x, y] of [[1100, 1550], [1300, 1650]]) {
		const t = ride({ x, y: 1000 }, 10_000, { was: afloat({ x, y: 1000 }, STILL), r: sloped });
		assert.equal(t.at(-1)!.is, 'end');
		assert.ok(Math.abs(t.at(-2)!.at.y - y) < CURRENT / 16 + 1e-9, `${x} ended at ${t.at(-2)!.at.y}`);
	}
});

test('walking across the deck never puts the cursor in the river, whichever way', () => {
	for (const [from, input] of [[{ x: 950, y: 440 }, { x: 600, y: 100 }], [{ x: 1450, y: 520 }, { x: -600, y: -100 }]] as const) {
		const t = ride(from, 50, { input, dt: 1 / 60 });
		assert.ok(t.every((f) => f.is === 'ashore'), JSON.stringify(t.find((f) => f.is !== 'ashore')));
		assert.ok(t.some((f) => f.at.x > 1000 && f.at.x < 1400), 'it crossed the water');
	}
	// Standing still on it never floats.
	assert.ok(ride({ x: 1200, y: 460 }, 64).every((f) => f.is === 'ashore' && f.dy === 0));
});

test('stepping off the deck onto the water, north or south of it, puts the cursor in the river', () => {
	assert.equal(flow(river, ASHORE, { x: 1200, y: 460 }, 0.1, true).is.is, 'ashore', 'on the deck');
	assert.equal(flow(river, ASHORE, { x: 1200, y: 420 }, 0.1, true).is.is, 'afloat', 'off its north edge');
	assert.equal(flow(river, ASHORE, { x: 1200, y: 540 }, 0.1, true).is.is, 'afloat', 'off its south edge');
	// What the deck's slope leaves open is water, though a rect round the deck would cover it.
	assert.equal(flow(river, ASHORE, { x: 1050, y: 530 }, 0.1, true).is.is, 'afloat');
});

test('floating under the deck keeps the cursor in the river, and it comes out the other side still in it', () => {
	const t = ride({ x: 1200, y: 300 }, 32, { was: afloat({ x: 1200, y: 300 }, STILL) });
	assert.ok(t.every((f) => f.is === 'afloat'));
	assert.ok(t.some((f) => f.at.y > 430 && f.at.y < 500), 'passed under the deck');
	assert.ok(t.at(-1)!.at.y > 560, 'and out below it');
});

test('only a floating cursor is washed out at the south end, after the time the current takes to carry it there', () => {
	const t = ride({ x: 1300, y: 1200 }, 10_000, { was: afloat({ x: 1300, y: 1200 }, STILL) });
	assert.equal(t.at(-1)!.is, 'end');
	assert.ok(t.slice(0, -1).every((f) => f.is === 'afloat'));
	// 600 px at 150 px/s: four seconds of 1/16 s frames, the last one reaching the line.
	assert.equal(t.length, 4 * 16);
});

test('moving about on the water at and past the south end washes nothing out; left still there a second, it does', () => {
	const about = ride({ x: 1050, y: 1750 }, 160, { input: { x: 20, y: 10 } });
	assert.ok(about.every((f) => f.is !== 'end'));
	assert.ok(about.some((f) => f.at.y > 1800 && f.is === 'afloat'));
	const below = { x: 1200, y: 1900 }, left = ride(below, 32, { was: afloat(below) });
	assert.equal(left.at(-1)!.is, 'end');
	assert.equal(left.length, 17);
});

test('no time, nothing: a paused frame neither drifts nor counts toward the second still', () => {
	const at = { x: 1200, y: 1000 };
	assert.deepEqual(flow(river, afloat(at, 0.5), at, 0, false), { is: afloat(at, 0.5), d: { x: 0, y: 0 } });
	assert.deepEqual(flow(river, afloat(at, STILL), at, 0, false), { is: afloat(at, STILL), d: { x: 0, y: 0 } });
});

test('the overworld: both decks are walkable across the water, and open water above and below their slopes is river', () => {
	const r = OVERWORLD.river;
	// Across each deck from its west end to its east end, along its middle, the Poplar Street deck over the river's end
	// included: never afloat.
	for (const [nw, ne, se, sw] of r.decks)
		for (let u = 0; u <= 1; u += 0.02) {
			const p = { x: nw.x + (ne.x - nw.x) * u, y: (nw.y + sw.y) / 2 + ((ne.y + se.y) / 2 - (nw.y + sw.y) / 2) * u };
			assert.equal(flow(r, ASHORE, p, 0.1, true).is.is, 'ashore', JSON.stringify(p));
		}
	const [nw, ne, se, sw] = r.decks[0];
	// Mid-river, north and south of the deck's band.
	const mid = (nw.x + ne.x) / 2, top = (nw.y + ne.y) / 2, bottom = (sw.y + se.y) / 2;
	assert.equal(flow(r, ASHORE, { x: mid, y: top - 40 }, 0.1, true).is.is, 'afloat');
	assert.equal(flow(r, ASHORE, { x: mid, y: bottom + 40 }, 0.1, true).is.is, 'afloat');
	// Under the deck, afloat stays afloat; the Arch reset point is ashore.
	const under = { x: mid, y: (top + bottom) / 2 };
	assert.equal(flow(r, afloat(under), under, 0.1, false).is.is, 'afloat');
	assert.equal(flow(r, afloat(under), r.arch, 0.1, true).is.is, 'ashore');
});

test('the overworld: a float from anywhere across the water rounds every pier, boat and dock and reaches the river’s end', () => {
	const r = OVERWORLD.river, clear = (p: Point) => r.obstacles.every((o) => !(p.x < o.x + o.w && p.x + ARROW.w > o.x && p.y < o.y + o.h && p.y + ARROW.h > o.y));
	for (const y of [300, 700, 1000]) {
		const row = r.mask.filter((p) => p.y === y).map((p) => p.x).sort((a, b) => a - b);
		for (let x = row[0] + 5; x < row[1]; x += 20) {
			const from = { x, y };
			if (!clear(from)) continue;
			const t = ride(from, 60 * 16, { was: afloat(from, STILL), r });
			assert.equal(t.at(-1)!.is, 'end', `from ${x}, ${y}: stuck at ${JSON.stringify(t.at(-1)!.at)}`);
			assert.ok(t.slice(0, -1).every((f) => f.is === 'afloat' && clear(f.at)), `from ${x}, ${y}`);
			// Off the bank within a second, and kept off it all the way down.
			const off = t.findIndex((f) => onWater(r, f.at));
			assert.ok(off >= 0 && off < 16 && t.slice(off, -1).every((f) => onWater(r, f.at)), `from ${x}, ${y}: over the land`);
		}
	}
});
