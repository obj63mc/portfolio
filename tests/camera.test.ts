// Seam 2: the camera (buildout ticket 08) as pure functions of the view, the scene and the drawn cursor, stepped with a
// fake clock the way the engine steps it each frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centreOn, coast, fling, glide, pan, rendering, steer, step, stick, tileRange, type Frame } from '../src/lib/engine/camera.ts';
import type { Point } from '../src/lib/scenes/types.ts';

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

test('arrow keys and WASD steer the cursor at 600 world px/s, diagonals normalised', () => {
	const second = (keys: string[], s = 1) => steer(new Set(keys), s, 1);
	assert.deepEqual(second(['ArrowRight']), { x: 600, y: 0 });
	assert.deepEqual(second(['KeyW']), { x: 0, y: -600 });
	assert.deepEqual(second(['KeyD', 'ArrowRight']), { x: 600, y: 0 }, 'two keys the same way are not faster');
	assert.deepEqual(second(['ArrowLeft', 'KeyD']), { x: 0, y: 0 }, 'opposite keys cancel');
	const diagonal = second(['ArrowDown', 'KeyA']);
	assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 600) < 1e-9 && diagonal.x < 0 && diagonal.x === -diagonal.y, 'down-left at 600');
	assert.deepEqual(second(['ArrowRight'], 0.6), { x: 360, y: 0 }, 'at the phone scale, 360 CSS px a second');
	assert.deepEqual(second(['Space', 'KeyQ']), { x: 0, y: 0 }, 'other keys do nothing');
});

test('a touch drag pans against the finger, clamped, and the cursor keeps its world place unless carried at the edge', () => {
	const phone = { w: 390, h: 844, s: 0.6 }, margin = 24; // the cursor's 40 world px at 0.6
	const cam = { x: 2000, y: 1000 }, cursor = { x: 200, y: 400 }; // world (2333.3, 1666.7)
	const world = (r: ReturnType<typeof pan>) => ({ x: r.cam.x + r.cursor.x / 0.6, y: r.cam.y + r.cursor.y / 0.6 });

	const left = pan(cam, cursor, { x: -60, y: 0 }, phone, overworld, margin);
	assert.deepEqual(left.cam, { x: 2100, y: 1000 }, 'dragged 60 px left, the view moves 100 world px right');
	assert.ok(Math.abs(world(left).x - (2000 + 200 / 0.6)) < 1e-9, 'the cursor stays put in the world');
	assert.ok(Math.abs(left.cursor.x - 140) < 1e-9, 'and so moves 60 px left on screen');

	const far = pan({ x: 2000, y: 200 }, cursor, { x: -300, y: -500 }, phone, overworld, margin);
	assert.deepEqual(far.cam, { x: 2500, y: 200 + 500 / 0.6 });
	assert.deepEqual(far.cursor, { x: 0, y: 0 }, 'carried along at the top-left edge, where its tip is its corner');
	const back = pan(cam, cursor, { x: 300, y: 500 }, phone, overworld, margin);
	assert.deepEqual(back.cursor, { x: 390 - 24, y: 844 - 24 }, 'and the arrow held in view at the bottom-right');

	const edge = pan({ x: 0, y: 0 }, cursor, { x: 120, y: 90 }, phone, overworld, margin);
	assert.deepEqual(edge, { cam: { x: 0, y: 0 }, cursor }, 'at the scene edge the camera clamps and nothing moves');

	// A cursor the joystick left against the right edge is carried only if the drag would take it further out.
	const tucked = { x: 385, y: 400 };
	assert.deepEqual(pan(cam, tucked, { x: 0, y: -60 }, phone, overworld, margin).cursor, { x: 385, y: 340 }, 'a drag up leaves it there');
	assert.deepEqual(pan(cam, tucked, { x: 30, y: 0 }, phone, overworld, margin).cursor, tucked, 'one right carries it where it is');
	assert.ok(Math.abs(pan(cam, tucked, { x: -30, y: 0 }, phone, overworld, margin).cursor.x - 355) < 1e-9, 'one left brings it in');
});

test('a drag let go while moving coasts on, decaying over about 300 ms; one held still first does not', () => {
	// Moves every 16 ms, 8 px left each: 500 px/s.
	const moves = Array.from({ length: 10 }, (_, i) => ({ t: 1000 + i * 16, x: 300 - i * 8, y: 400 }));
	const v = fling(moves, 1144)!;
	assert.ok(Math.abs(v.x + 500) < 1e-9 && v.y === 0, `500 px/s left: ${v.x}`);
	assert.equal(fling(moves, 1144 + 200), null, 'held still 200 ms before lifting');
	assert.equal(fling(moves.slice(0, 1), 1000), null, 'a single move has no speed');

	// The fling's travel frame by frame, as the engine pans by it.
	let vel: Point | null = v, travel = 0, frames = 0;
	for (; vel && frames < 600; frames++) (travel += vel.x / 60), (vel = coast(vel, 1 / 60));
	assert.ok(Math.abs(travel + 500 * 0.15) < 5, `about speed x tau: ${travel}`);
	assert.ok(frames > 20 && frames < 80, `stopped within a second or so: ${frames} frames`);
	let slowed: Point = v;
	for (let i = 0; i < 18; i++) slowed = coast(slowed, 1 / 60)!;
	assert.ok(Math.abs(slowed.x / v.x - Math.exp(-2)) < 1e-9, 'down to e^-2 after 300 ms');
});

test('the joystick: nothing in the 15 percent dead zone, then up to 600 world px/s at the rim', () => {
	const second = (x: number, y: number, s = 1) => stick({ x, y }, 60, s, 1);
	assert.deepEqual(second(0, 0), { x: 0, y: 0 });
	assert.deepEqual(second(9, 0), { x: 0, y: 0 }, 'a thumb resting 9 of 60 px out steers nothing');
	assert.ok(second(10, 0).x > 0, 'just past the dead zone it creeps');
	assert.deepEqual(second(60, 0), { x: 600, y: 0 }, 'at the rim');
	assert.deepEqual(second(0, -90), { x: 0, y: -600 }, 'pulled past the rim, no faster');
	const halfway = second(0, 34.5); // midway from the dead zone's edge (9) to the rim
	assert.ok(Math.abs(halfway.y - 300) < 1e-9 && halfway.x === 0, `midway: ${halfway.y}`);
	const diagonal = second(-30, 30);
	assert.ok(diagonal.x < 0 && diagonal.x === -diagonal.y, 'down-left, along the pull');
	assert.deepEqual(second(60, 0, 0.6), { x: 360, y: 0 }, 'at the phone scale, 360 CSS px a second');
});
