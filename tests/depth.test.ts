// Seam 2: horizon scaling (buildout ticket 19) as pure functions of a cursor's world position and a fake clock: the depth
// factor each depth region gives, and the drawn factor easing over 150 ms where the cursor crosses into another region.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EASE, FAR, depth, drawOrder, factor, follower, type Depth } from '../src/lib/engine/depth.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import type { DepthRegion } from '../src/lib/scenes/types.ts';

// Two regions side by side with different horizons, and a gap between them with no region at all.
const west: DepthRegion = { rect: { x: 0, y: 0, w: 1000, h: 1200 }, horizonY: 200, foregroundY: 1000 };
const east: DepthRegion = { rect: { x: 1200, y: 0, w: 1000, h: 1200 }, horizonY: 600, foregroundY: 1000 };
const regions = [west, east];
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test('the factor is 1 at the foreground line and 0.85 at the horizon, linear between', () => {
	close(factor(regions, { x: 500, y: 1000 }), 1);
	close(factor(regions, { x: 500, y: 200 }), FAR);
	close(factor(regions, { x: 500, y: 600 }), (1 + FAR) / 2);
	close(FAR, 0.85);
	// Below the foreground line, still in the region, it holds at 1.
	close(factor(regions, { x: 500, y: 1100 }), 1);
});

test('the factor holds at 0.85 above the horizon', () => {
	close(factor(regions, { x: 500, y: 0 }), FAR);
	close(factor(regions, { x: 1500, y: 100 }), FAR);
});

test('the factor is 1 outside every region, in the gap between two and beyond them', () => {
	close(factor(regions, { x: 1100, y: 300 }), 1);
	close(factor(regions, { x: 2500, y: 300 }), 1);
	close(factor([], { x: 0, y: 0 }), 1);
});

test('each region gives its own factor: the same y is nearer the horizon in one than the other', () => {
	close(factor(regions, { x: 999, y: 600 }), (1 + FAR) / 2);
	close(factor(regions, { x: 1200, y: 600 }), FAR);
	// A rect owns its left and top edges, not its right and bottom ones.
	close(factor([east, west], { x: 1000, y: 600 }), 1);
});

test('within a region the drawn factor follows the cursor at once', () => {
	let d: Depth = depth(null, regions, { x: 500, y: 1000 }, 0);
	close(d.d, 1);
	d = depth(d, regions, { x: 500, y: 600 }, 16);
	close(d.d, (1 + FAR) / 2);
});

test('crossing into another region eases the drawn factor over 150 ms', () => {
	close(EASE, 150);
	let d = depth(null, regions, { x: 1150, y: 300 }, 1000);
	close(d.d, 1); // in the gap
	d = depth(d, regions, { x: 1250, y: 300 }, 1000);
	close(d.d, 1); // it has just crossed: still the factor it had
	d = depth(d, regions, { x: 1260, y: 300 }, 1000 + EASE / 2);
	assert.ok(d.d < 1 && d.d > FAR, `half way through the ease: ${d.d}`);
	d = depth(d, regions, { x: 1270, y: 300 }, 1000 + EASE);
	close(d.d, FAR);
});

test('turning back part way through an ease sets off from where the drawn factor is, with no jump', () => {
	let d = depth(null, regions, { x: 1150, y: 300 }, 0);
	d = depth(d, regions, { x: 1250, y: 300 }, 0);
	d = depth(d, regions, { x: 1250, y: 300 }, EASE / 2);
	const midway = d.d;
	d = depth(d, regions, { x: 1150, y: 300 }, EASE / 2);
	close(d.d, midway);
	d = depth(d, regions, { x: 1150, y: 300 }, EASE / 2 + EASE);
	close(d.d, 1);
});

test('a jump (a scene entry, a reset, a peer snap) takes the new factor at once', () => {
	let d = depth(null, regions, { x: 1150, y: 300 }, 0);
	d = depth(d, regions, { x: 1250, y: 300 }, 0, true);
	close(d.d, FAR);
});

test("a follower keeps one cursor's drawn factor and its side of the walk-behind scenery it is on", () => {
	const lab = SUB_SCENES.slu, r = lab.props.find((p) => p.id === 'workstation')!.rect, monitor = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
	const cursor = follower(lab);
	let f = cursor.step({ x: monitor.x, y: 980 }, 0);
	close(f.d, factor(lab.depth, { x: monitor.x, y: 980 }));
	assert.equal(f.sides.size, 0);
	for (let y = 980; y <= monitor.y; y += 20) f = cursor.step({ x: monitor.x, y }, 16);
	f = cursor.step(monitor, 32);
	assert.equal(f.sides.get('slu-desk-back-left'), 'behind');
	assert.ok(f.d < 1 && f.d > FAR);
	assert.deepEqual(cursor.last, monitor);
	// A jump onto the monitor takes the side of where it lands, which on a desk is in front (Joe, 2026-10-01).
	f = cursor.step(monitor, 48, true);
	assert.equal(f.sides.get('slu-desk-back-left'), 'front');
	// The overworld has no walk-behind scenery.
	assert.equal(follower(OVERWORLD).step({ x: 100, y: 100 }, 0).sides.size, 0);
});

test('every scene has depth regions, and the overworld is covered by them everywhere', () => {
	for (const s of [OVERWORLD, ...Object.values(SUB_SCENES)]) assert.ok(s.depth.length, `${s.id} has no depth region`);
	for (let x = 0; x < OVERWORLD.w; x += 50)
		for (let y = 0; y < OVERWORLD.h; y += 50) {
			const [r] = OVERWORLD.depth;
			close(factor(OVERWORLD.depth, { x, y }), factor([{ ...r, rect: { x: 0, y: 0, w: OVERWORLD.w, h: OVERWORLD.h } }], { x, y }));
		}
});

test('a cursor behind walk-behind scenery is drawn before every cursor in front of it, the furthest back first', () => {
	const c = (id: string, ...behind: number[]) => ({ id, behind });
	const order = (cs: ReturnType<typeof c>[]) => drawOrder(cs, (x) => x.behind).map((x) => x.id);
	assert.deepEqual(order([c('peer'), c('own')]), ['peer', 'own'], 'nothing behind: peers, then the own cursor');
	assert.deepEqual(order([c('peer'), c('own', 1)]), ['own', 'peer'], 'the own cursor behind a desk goes under a peer in front');
	assert.deepEqual(order([c('a', 2), c('b', 0), c('own')]), ['b', 'a', 'own'], 'behind the back row, then the front row, then the rest');
	assert.deepEqual(order([c('a', 1, 2), c('b', 2)]), ['a', 'b'], 'behind two rows goes by the furthest back');
});
