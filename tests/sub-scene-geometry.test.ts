// Seam 2: the sub-scene data modules as pure data. The art pass (buildout ticket 05) writes every rect, outline and
// front line here; these checks are the spec rules a builder relies on, not the artwork's look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import type { Point, Rect } from '../src/lib/scenes/types.ts';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const inPolygon = (p: Point, poly: Point[]) => {
	let hit = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i], b = poly[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
	}
	return hit;
};
const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
// The front line's y at x, flat past either end (spec: walk-behind scenery).
const frontY = (front: Point[], x: number) => {
	if (x <= front[0].x) return front[0].y;
	for (let i = 1; i < front.length; i++)
		if (x <= front[i].x) return front[i - 1].y + ((front[i].y - front[i - 1].y) * (x - front[i - 1].x)) / (front[i].x - front[i - 1].x);
	return front[front.length - 1].y;
};
const scenes = Object.values(SUB_SCENES);

test('sub-scenes: every rect inside the scene, no foreground over a prop', () => {
	for (const s of scenes) {
		const world: Rect = { x: 0, y: 0, w: s.w, h: s.h };
		const rects = [s.exit, ...s.props.map((p) => p.rect), ...s.depth.map((d) => d.rect), ...s.foreground.map((f) => f.rect), ...s.walkBehind.map((w) => w.rect)];
		for (const r of rects) assert.ok(inside(r, world), `${s.id}: ${JSON.stringify(r)} outside the scene`);
		for (const f of s.foreground) for (const p of s.props) assert.ok(!overlap(f.rect, p.rect), `${s.id}: ${f.key} covers ${p.id}`);
	}
});

test('walk-behind scenery: outline inside its cut-out, front line left to right, its props stand on it', () => {
	for (const s of scenes) {
		assert.equal(new Set(s.walkBehind.map((w) => w.key)).size, s.walkBehind.length, `${s.id}: keys are unique`);
		for (const w of s.walkBehind) {
			// Outlines are the mattes' polygons; the rect is the trimmed matte, so allow its 1 px erosion and rounding.
			const grown = { x: w.rect.x - 6, y: w.rect.y - 6, w: w.rect.w + 12, h: w.rect.h + 12 };
			for (const p of w.outline) assert.ok(inPolygon(p, [
				{ x: grown.x, y: grown.y }, { x: grown.x + grown.w, y: grown.y }, { x: grown.x + grown.w, y: grown.y + grown.h }, { x: grown.x, y: grown.y + grown.h }
			]), `${s.id}: ${w.key} outline point ${JSON.stringify(p)} outside its rect`);
			assert.ok(w.front.length >= 2 && w.front.every((p, i) => i === 0 || p.x > w.front[i - 1].x), `${s.id}: ${w.key} front runs left to right`);
			for (const id of w.props) {
				const prop = s.props.find((p) => p.id === id);
				assert.ok(prop, `${s.id}: ${w.key} lists unknown prop ${id}`);
				assert.ok(inPolygon(centre(prop.rect), w.outline), `${s.id}: ${id} does not stand on ${w.key}`);
			}
		}
	}
});

test('SLU: the lit workstation is used from in front of its desk', () => {
	const slu = SUB_SCENES.slu;
	const desk = slu.walkBehind.find((w) => w.props.includes('workstation'))!;
	assert.equal(desk.key, 'slu-desk-back-left');
	// The monitor stands behind the desk's front feet: stepping onto it from between the rows is stepping on from behind.
	const monitor = centre(slu.props.find((p) => p.id === 'workstation')!.rect);
	assert.ok(monitor.y < frontY(desk.front, monitor.x));
	// The chair's feet reach below the front line: stepping on there is stepping on from in front.
	const lowest = desk.outline.reduce((a, b) => (b.y > a.y ? b : a));
	assert.ok(lowest.y >= frontY(desk.front, lowest.x));
});
