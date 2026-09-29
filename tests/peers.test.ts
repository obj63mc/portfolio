// Seam 2: peer interpolation (buildout ticket 13) as a function of a fake clock, in ms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELAY, record, sample, visible, type Snap } from '../src/lib/net/peers.ts';

const INTERVAL = 50; // 20 Hz

test('a peer is drawn 100 ms behind, interpolated between the positions received around then', () => {
	const s: Snap[] = [];
	record(s, 0, 0, 1000, INTERVAL);
	record(s, 10, 0, 1050, INTERVAL);
	record(s, 20, 10, 1100, INTERVAL);
	assert.equal(DELAY, 100);
	assert.deepEqual(sample(s, 1100), { x: 0, y: 0 });
	assert.deepEqual(sample(s, 1125), { x: 5, y: 0 });
	assert.deepEqual(sample(s, 1175), { x: 15, y: 5 });
	// Past the newest position it holds there: an idle peer stays where it stopped.
	assert.deepEqual(sample(s, 5000), { x: 20, y: 10 });
});

test('no position yet draws nothing; before the first one is due, the first', () => {
	const s: Snap[] = [];
	assert.equal(sample(s, 1000), null);
	record(s, 7, 8, 1000, INTERVAL);
	assert.deepEqual(sample(s, 1000), { x: 7, y: 8 });
});

test('after a pause the last position is pinned one interval back, so the peer sets off smoothly', () => {
	const s: Snap[] = [];
	record(s, 0, 0, 1000, INTERVAL);
	record(s, 100, 0, 4000, INTERVAL); // three seconds still, then a move
	// Without the pin it would be drawn 97 percent of the way at once.
	assert.deepEqual(sample(s, 4000), { x: 0, y: 0 });
	assert.deepEqual(sample(s, 4075), { x: 50, y: 0 });
	assert.deepEqual(sample(s, 4100), { x: 100, y: 0 });
});

test('a jump over 400 world px snaps instead of gliding', () => {
	const s: Snap[] = [];
	record(s, 0, 0, 1000, INTERVAL);
	record(s, 500, 0, 1050, INTERVAL);
	assert.deepEqual(sample(s, 1125), { x: 500, y: 0 });
	record(s, 800, 0, 1100, INTERVAL); // 300 px glides again
	assert.deepEqual(sample(s, 1175), { x: 650, y: 0 });
});

test('only the last few positions are kept', () => {
	const s: Snap[] = [];
	for (let i = 0; i < 20; i++) record(s, i, 0, 1000 + i * INTERVAL, INTERVAL);
	assert.ok(s.length <= 4);
});

test('a peer is drawn only near the camera: its newest position within a margin of the view', () => {
	const view = { x: 1000, y: 500, w: 800, h: 600 };
	const s: Snap[] = [];
	assert.equal(visible(s, view), false);
	record(s, 1400, 800, 0, INTERVAL);
	assert.equal(visible(s, view), true);
	record(s, 5000, 800, 50, INTERVAL);
	assert.equal(visible(s, view), false);
	record(s, 950, 480, 100, INTERVAL); // just off the top left, its arrow reaching in
	assert.equal(visible(s, view), true);
});
