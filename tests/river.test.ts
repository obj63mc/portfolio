// Seam 2: the river current (buildout ticket 20) as a pure function of one cursor's successive positions and a fake clock:
// in the river once it steps onto the water from a bank or off the deck, still in it under the deck, out on either bank,
// and washed out only at the south end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT, flow, type Current } from '../src/lib/scenes/river.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Overworld, Point } from '../src/lib/scenes/types.ts';

// A straight river from x 1000 to 1400, a deck sloping down across it at y 400 to 500, 60 px thick, its ends on the banks.
const river: Overworld['river'] = {
	mask: [{ x: 1000, y: 0 }, { x: 1000, y: 2000 }, { x: 1400, y: 2000 }, { x: 1400, y: 0 }],
	deck: [{ x: 900, y: 400 }, { x: 1500, y: 500 }, { x: 1500, y: 560 }, { x: 900, y: 460 }],
	bridge: { key: 'bridge', rect: { x: 900, y: 380, w: 600, h: 300 } },
	southEndY: 1800,
	arch: { x: 800, y: 1000 },
	footprint: { x: 800, y: 0, w: 800, h: 2000 }
};

/**
 * A cursor stepped through `frames` of `dt` seconds from `from`, its own input moving it `input` world px a second, the
 * current carrying it south while afloat; its state and position after each frame.
 */
function ride(from: Point, input: Point, frames: number, dt = 1 / 60, was: Current = 'ashore', r = river) {
	const trail: { is: Current | 'end'; at: Point }[] = [];
	let at = from, is = was;
	for (let i = 0; i < frames; i++) {
		const f = flow(r, is, at, dt);
		at = { x: at.x + input.x * dt, y: at.y + input.y * dt + f.dy };
		trail.push({ is: f.is, at });
		if (f.is === 'end') break;
		is = f.is;
	}
	return trail;
}

test('stepping into the water from a bank drifts the cursor south at the current', () => {
	const t = ride({ x: 980, y: 1000 }, { x: 600, y: 0 }, 60);
	assert.equal(t[0].is, 'ashore');
	const wet = t.findIndex((f) => f.is === 'afloat');
	assert.ok(wet > 0, 'afloat once on the water');
	// A second of frames, the first few on the bank: it has drifted south by the current times the time afloat.
	const afloat = t.filter((f) => f.is === 'afloat').length / 60;
	assert.ok(Math.abs(t.at(-1)!.at.y - (1000 + CURRENT * afloat)) < 1e-6);
	assert.equal(CURRENT, 150);
});

test('paddling to either bank brings it ashore and stops the drift', () => {
	for (const input of [{ x: -600, y: 0 }, { x: 600, y: 0 }]) {
		const t = ride({ x: 1200, y: 1000 }, input, 60, 1 / 60, 'afloat');
		const out = t.findIndex((f) => f.is === 'ashore');
		assert.ok(out > 0, 'ashore on the bank');
		const y = t[out].at.y;
		assert.ok(t.slice(out).every((f) => f.is === 'ashore' && f.at.y === y), 'no drift ashore');
	}
});

test('walking across the deck never drifts, whichever way', () => {
	for (const [from, input] of [[{ x: 950, y: 440 }, { x: 600, y: 100 }], [{ x: 1450, y: 520 }, { x: -600, y: -100 }]] as const) {
		const t = ride(from, input, 50);
		assert.ok(t.every((f) => f.is === 'ashore'), JSON.stringify(t.find((f) => f.is !== 'ashore')));
		assert.ok(t.some((f) => f.at.x > 1000 && f.at.x < 1400), 'it crossed the water');
	}
});

test('stepping off the deck onto the water, north or south of it, puts the cursor in the river', () => {
	assert.equal(flow(river, 'ashore', { x: 1200, y: 460 }, 0.1).is, 'ashore', 'on the deck');
	assert.equal(flow(river, 'ashore', { x: 1200, y: 420 }, 0.1).is, 'afloat', 'off its north edge');
	assert.equal(flow(river, 'ashore', { x: 1200, y: 540 }, 0.1).is, 'afloat', 'off its south edge');
	// What the deck's slope leaves open is water, though a rect round the deck would cover it.
	assert.equal(flow(river, 'ashore', { x: 1050, y: 530 }, 0.1).is, 'afloat');
});

test('drifting under the deck keeps the cursor in the river, and it comes out the other side still in it', () => {
	const t = ride({ x: 1200, y: 300 }, { x: 0, y: 0 }, 120, 1 / 60, 'afloat');
	assert.ok(t.every((f) => f.is === 'afloat'));
	assert.ok(t.some((f) => f.at.y > 430 && f.at.y < 500), 'passed under the deck');
	assert.ok(t.at(-1)!.at.y > 560, 'and out below it');
});

test('only the south end washes the cursor out, after the time the current takes to carry it there', () => {
	const t = ride({ x: 1200, y: 1200 }, { x: 0, y: 0 }, 10_000, 1 / 16, 'afloat');
	assert.equal(t.at(-1)!.is, 'end');
	assert.ok(t.slice(0, -1).every((f) => f.is === 'afloat'));
	// 600 px at 150 px/s: four seconds of 1/16 s frames, the last one reaching the line.
	assert.equal(t.length, 4 * 16 + 1);
	// Pushing north against it holds it off the end; a bank below the line still brings it ashore rather than washing it out.
	assert.ok(ride({ x: 1200, y: 1200 }, { x: 0, y: -150 }, 400, 0.05, 'afloat').every((f) => f.is === 'afloat'));
	assert.equal(flow(river, 'afloat', { x: 1450, y: 1900 }, 0.05).is, 'ashore');
});

test('stepping onto the water below the south end washes the cursor out at once', () => {
	assert.equal(flow(river, 'ashore', { x: 1200, y: 1900 }, 0.05).is, 'end');
});

test('no time, no drift: a paused frame carries nothing', () => {
	assert.deepEqual(flow(river, 'afloat', { x: 1200, y: 1000 }, 0), { is: 'afloat', dy: 0 });
});

test('the overworld: the Eads deck is walkable across the water, and open water above and below its slope is river', () => {
	const r = OVERWORLD.river;
	// Across the deck from its west end to its east end, along its middle: never afloat.
	const [nw, ne, se, sw] = r.deck;
	for (let u = 0; u <= 1; u += 0.02) {
		const p = { x: nw.x + (ne.x - nw.x) * u, y: (nw.y + sw.y) / 2 + ((ne.y + se.y) / 2 - (nw.y + sw.y) / 2) * u };
		assert.equal(flow(r, 'ashore', p, 0.1).is, 'ashore', JSON.stringify(p));
	}
	// Mid-river, north and south of the deck's band.
	const mid = (nw.x + ne.x) / 2, top = (nw.y + ne.y) / 2, bottom = (sw.y + se.y) / 2;
	assert.equal(flow(r, 'ashore', { x: mid, y: top - 40 }, 0.1).is, 'afloat');
	assert.equal(flow(r, 'ashore', { x: mid, y: bottom + 40 }, 0.1).is, 'afloat');
	// Under the deck, afloat stays afloat; the Arch reset point is ashore.
	assert.equal(flow(r, 'afloat', { x: mid, y: (top + bottom) / 2 }, 0.1).is, 'afloat');
	assert.equal(flow(r, 'afloat', r.arch, 0.1).is, 'ashore');
});
