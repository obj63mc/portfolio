// Seam 2: the camera (buildout ticket 08) as pure functions of the view, the scene and the drawn cursor, stepped with a
// fake clock the way the engine steps it each frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centreOn, glide, rendering, step, tileRange, type Frame } from '../src/lib/engine/camera.ts';

const desktop = { w: 1000, h: 800, s: 1 };
const overworld = { w: 6750, h: 2700 };
const frame = (over: Partial<Frame> = {}): Frame => ({
	view: desktop,
	scene: overworld,
	band: 0.25,
	cursor: null,
	props: [],
	controls: [],
	...over
});
// Hold the cursor still for `seconds` at 60 fps; the camera's travel from a mid-scene start.
const hold = (f: Frame, seconds: number) => {
	const start = { x: 2000, y: 1000 };
	let cam = start;
	for (let i = 0; i < seconds * 60; i++) cam = step(cam, f, 1 / 60);
	return { x: cam.x - start.x, y: cam.y - start.y };
};

test('push eases from 0 at the band edge to 900 world px/s at the viewport edge', () => {
	assert.deepEqual(hold(frame({ cursor: { x: 500, y: 400 } }), 1), { x: 0, y: 0 }, 'centre: still');
	assert.deepEqual(hold(frame({ cursor: { x: 750, y: 400 } }), 1), { x: 0, y: 0 }, 'on the band edge: still');
	assert.ok(Math.abs(hold(frame({ cursor: { x: 1000, y: 400 } }), 1).x - 900) < 1, 'right edge: 900 px in a second');
	assert.ok(Math.abs(hold(frame({ cursor: { x: 0, y: 400 } }), 1).x + 900) < 1, 'left edge: 900 px back');
	assert.ok(Math.abs(hold(frame({ cursor: { x: 500, y: 0 } }), 1).y + 900) < 1, 'top edge');
	const half = hold(frame({ cursor: { x: 875, y: 400 } }), 1).x;
	assert.ok(half > 0 && half < 450, `halfway into the band eases in: ${half}`);
});

test('the band is 25 percent of the viewport on the overworld and 12 in a sub-scene; the pointer leaving stops it', () => {
	const cursor = { x: 850, y: 400 }; // 15 percent from the right edge
	assert.ok(hold(frame({ cursor, band: 0.25 }), 1).x > 0);
	assert.equal(hold(frame({ cursor, band: 0.12 }), 1).x, 0);
	assert.deepEqual(hold(frame({ cursor: null }), 1), { x: 0, y: 0 });
});

test('no push within 40 CSS px of a prop or an on-screen control', () => {
	const cursor = { x: 990, y: 400 }; // world (2990, 1400) from the start
	const prop = (gap: number) => ({ x: 2990 + gap, y: 1300, w: 100, h: 200 });
	assert.equal(hold(frame({ cursor, props: [prop(39)] }), 1).x, 0, 'a prop 39 px away holds the camera');
	assert.ok(hold(frame({ cursor, props: [prop(41)] }), 1).x > 0, 'one 41 px away does not');
	// At the phone's 0.6 scale 40 CSS px is 66.7 world px.
	const phone = { view: { w: 390, h: 844, s: 0.6 }, cursor: { x: 385, y: 422 } }; // world (2641.7, 1703.3)
	assert.equal(hold(frame({ ...phone, props: [{ x: 2641.7 + 66, y: 1700, w: 50, h: 50 }] }), 1).x, 0);
	assert.ok(hold(frame({ ...phone, props: [{ x: 2641.7 + 68, y: 1700, w: 50, h: 50 }] }), 1).x > 0);
	const control = { x: 16, y: 740, w: 160, h: 44 }; // the bottom-left toggles, screen px
	assert.equal(hold(frame({ cursor: { x: 100, y: 770 }, controls: [control] }), 1).y, 0, 'on the toggles');
	assert.equal(hold(frame({ cursor: { x: 215, y: 790 }, controls: [control] }), 1).y, 0, '39 px right of them');
	assert.ok(hold(frame({ cursor: { x: 217, y: 790 }, controls: [control] }), 1).y > 0, '41 px right of them');
});

test('hard clamp at the scene bounds: pushing into a corner stops dead, no rubber band', () => {
	let cam = { x: 5700, y: 1850 };
	for (let i = 0; i < 120; i++) cam = step(cam, frame({ cursor: { x: 1000, y: 800 } }), 1 / 60);
	assert.deepEqual(cam, { x: 6750 - 1000, y: 2700 - 800 });
	for (let i = 0; i < 600; i++) cam = step(cam, frame({ cursor: { x: 0, y: 0 } }), 1 / 60);
	assert.deepEqual(cam, { x: 0, y: 0 });
	// At 0.6 on a phone the view is 650 x 1406.7 world px.
	assert.deepEqual(centreOn({ x: 6700, y: 2690 }, { w: 390, h: 844, s: 0.6 }, overworld), { x: 6750 - 650, y: 2700 - 844 / 0.6 });
});

test('centring on a point, clamped; a scene smaller than the view sits in its middle', () => {
	assert.deepEqual(centreOn({ x: 3000, y: 1000 }, desktop, overworld), { x: 2500, y: 600 });
	assert.deepEqual(centreOn({ x: 100, y: 100 }, desktop, overworld), { x: 0, y: 0 });
	// The lobby, 2400 x 4800, on a 2560 x 1440 screen: centred across, clamped down the nave.
	assert.deepEqual(centreOn({ x: 1200, y: 4700 }, { w: 2560, h: 1440, s: 1 }, { w: 2400, h: 4800 }), { x: -80, y: 3360 });
});

test('a glide to a focused prop or a fragment target eases there and lands exactly', () => {
	const goal = centreOn({ x: 6300, y: 1350 }, desktop, overworld); // Belleville from Maplewood
	let cam = centreOn({ x: 1835, y: 1438 }, desktop, overworld);
	const first = glide(cam, goal, 1 / 60);
	assert.ok(first.x > cam.x && first.x < goal.x, 'moves partway on the first frame');
	let frames = 0;
	while (cam !== goal && frames < 600) (cam = glide(cam, goal, 1 / 60)), frames++;
	assert.deepEqual(cam, goal);
	assert.ok(frames > 20 && frames < 120, `within two seconds: ${frames} frames`);
});

test('render scale is fixed per session: 0.6 on a screen under 768 px on its shorter side, else 1; DPR capped at 2', () => {
	assert.deepEqual(rendering(1440, 900, 2), { s: 1, dpr: 2, density: 2 }, 'retina desktop');
	assert.deepEqual(rendering(1920, 1080, 1), { s: 1, dpr: 1, density: 1.25 }, 'plain desktop');
	assert.deepEqual(rendering(1366, 768, 1), { s: 1, dpr: 1, density: 1.25 }, 'a 768 px tall laptop is not small');
	assert.deepEqual(rendering(390, 844, 3), { s: 0.6, dpr: 2, density: 1.25 }, 'iPhone');
	assert.deepEqual(rendering(932, 430, 3), { s: 0.6, dpr: 2, density: 1.25 }, 'iPhone held landscape: still small');
	assert.deepEqual(rendering(744, 1133, 2), { s: 0.6, dpr: 2, density: 1.25 }, 'iPad mini');
	assert.deepEqual(rendering(820, 1180, 2), { s: 1, dpr: 2, density: 2 }, 'iPad');
});

test('tiles: the 512 px tiles in view, grown by a ring and cut to the scene', () => {
	const cam = { x: 2000, y: 1000 }; // columns 3 to 5 and rows 1 to 3 in view
	assert.deepEqual(tileRange(cam, desktop, overworld, 0), { x0: 3, y0: 1, x1: 5, y1: 3 });
	assert.deepEqual(tileRange(cam, desktop, overworld, 1), { x0: 2, y0: 0, x1: 6, y1: 4 }, 'preloaded');
	assert.deepEqual(tileRange(cam, desktop, overworld, 2), { x0: 1, y0: 0, x1: 7, y1: 5 }, 'kept; the 2700 px scene has rows 0 to 5');
	assert.deepEqual(tileRange({ x: 5750, y: 1900 }, desktop, overworld, 1), { x0: 10, y0: 2, x1: 13, y1: 5 }, 'the far corner');
	assert.deepEqual(tileRange({ x: -80, y: 0 }, { w: 2560, h: 1440, s: 1 }, { w: 2400, h: 4800 }, 1), { x0: 0, y0: 0, x1: 4, y1: 3 });
});
