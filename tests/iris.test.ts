// Seam 2: the iris between scenes (ticket 11, Joe 2026-09-30) as pure functions of a fake clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IRIS, OPEN, advance, closing, hole, reach, type Iris } from '../src/lib/engine/iris.ts';

const view = { w: 1000, h: 800 };
const door = { x: 200, y: 600 };

test('reach: the hole uncovers the whole view from its farthest corner', () => {
	assert.equal(reach({ x: 0, y: 0 }, { w: 300, h: 400 }), 500);
	assert.equal(reach(door, view), Math.hypot(800, 600));
	assert.equal(reach({ x: 500, y: 400 }, view), Math.hypot(500, 400));
});

test('closing: from the whole view down to the door, eased, then shut and waiting to land', () => {
	const closing: Iris = { is: 'closing', at: door, t0: 1000 };
	assert.equal(hole(closing, 1000, view), reach(door, view));
	assert.equal(hole(closing, 1000 + IRIS.close / 2, view), reach(door, view) / 2);
	assert.ok(hole(closing, 1100, view)! > reach(door, view) * 0.75, 'starts gently');
	assert.equal(hole(closing, 1000 + IRIS.close, view), 0);
	assert.equal(advance(closing, 1000 + IRIS.close - 1, true), closing);
	assert.deepEqual(advance(closing, 1000 + IRIS.close, true), { is: 'shut', at: door, t0: 1000 + IRIS.close, landed: false });
});

test('shut: black; landed, it opens once the tiles are in or after the wait, and stranded, after longer', () => {
	const landed: Iris = { is: 'shut', at: door, t0: 0, landed: true };
	assert.equal(hole(landed, 5, view), 0);
	assert.equal(advance(landed, 5, false), landed);
	assert.deepEqual(advance(landed, 5, true), { is: 'opening', at: door, t0: 5 });
	assert.deepEqual(advance(landed, IRIS.wait, false), { is: 'opening', at: door, t0: IRIS.wait });
	const stranded: Iris = { is: 'shut', at: door, t0: 0, landed: false };
	assert.equal(advance(stranded, IRIS.wait, true), stranded, 'nothing landed to show');
	assert.deepEqual(advance(stranded, IRIS.stranded, false), { is: 'opening', at: door, t0: IRIS.stranded });
});

test('opening: out of the landing spot to the whole view, then open, drawing nothing', () => {
	const opening: Iris = { is: 'opening', at: door, t0: 0 };
	assert.equal(hole(opening, 0, view), 0);
	assert.equal(hole(opening, IRIS.open / 2, view), reach(door, view) / 2);
	assert.equal(hole(opening, IRIS.open, view), reach(door, view));
	assert.equal(advance(opening, IRIS.open - 1, true), opening);
	assert.equal(advance(opening, IRIS.open, true), OPEN);
	assert.equal(hole(OPEN, 0, view), null);
	assert.equal(advance(OPEN, 0, false), OPEN);
});

test('closing: on the door from open; leaving as it opens turns it round from there; closing or shut, it carries on', () => {
	const shut: Iris = { is: 'shut', at: door, t0: 0, landed: false }, closed: Iris = { is: 'closing', at: door, t0: 1000 }, now = 1200;
	const where = { x: 900, y: 100 };
	assert.deepEqual(closing(OPEN, where, 5, view), { is: 'closing', at: where, t0: 5 });
	const opening = { is: 'opening', at: door, t0: 0 } as const, mid = IRIS.open / 3;
	const out = closing(opening, where, mid, view);
	assert.equal(out.is === 'closing' && out.at, where, 'on the new point');
	assert.ok(Math.abs(hole(out, mid, view)! - hole(opening, mid, view)!) < 1e-6, 'from the size it had got to');
	assert.ok(hole(out, mid + 1, view)! < hole(out, mid, view)!, 'and closing');
	const wide = closing({ is: 'opening', at: door, t0: 0 }, { x: 500, y: 400 }, IRIS.open - 1, view);
	assert.equal(hole(wide, IRIS.open - 1, view), reach({ x: 500, y: 400 }, view), 'never wider than the view needs');
	assert.equal(closing(closed, where, now, view), closed);
	assert.equal(closing(shut, where, now, view), shut);
});
