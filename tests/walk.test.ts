// Seam 2: the walk-behind rule (buildout ticket 19) as a pure function of a cursor's successive positions, stepped along
// the paths Joe walks in the workshop: through the Moosylvania lobby's staircases, from the loft, the floor and the sides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { LANDING_REACH, walker } from '../src/lib/scenes/walk.ts';
import type { Point, Rect } from '../src/lib/scenes/types.ts';

const lobby = SUB_SCENES.moosylvania;
const unit = (key: string) => lobby.walkBehind.find((w) => w.key === `moosylvania-${key}`)!;
const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// A cursor that appears at the first point and moves on through the rest in mouse-sized steps: the sides it takes of one
// unit, in order ('front, behind' is on it, then off, then under it).
function walk(key: string, ...points: Point[]) {
	const cursor = walker(lobby.walkBehind);
	const seen: string[] = [];
	cursor.step(points[0], true);
	for (let k = 1; k < points.length; k++) {
		const n = Math.ceil(Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y) / 30);
		for (let i = 1; i <= n; i++) {
			const side = cursor.step(lerp(points[k - 1], points[k], i / n)).get(`moosylvania-${key}`);
			if (side && seen.at(-1) !== side) seen.push(side);
		}
	}
	return seen.join(', ');
}
// A point on a staircase's flight, t of the way from the middle of its top step to the middle of its bottom one.
const flight = (key: string, t: number) => {
	const w = unit(key), top = lerp(w.landing![0], w.landing!.at(-1)!, 0.5), foot = lerp(w.front[0], w.front.at(-1)!, 0.5);
	return lerp(top, foot, t);
};
const beside = (r: Rect) => ({
	left: { x: r.x - 60, y: r.y + r.h / 2 }, right: { x: r.x + r.w + 60, y: r.y + r.h / 2 }, below: { x: r.x + r.w / 2, y: r.y + r.h + 40 }
});

test('from beside a loft desk to anywhere down the nearest flight, the cursor steps onto the stairs', () => {
	for (const [stairs, desk] of [['stairs-left', 'desk-left'], ['stairs-right', 'desk-right']]) {
		for (const [where, start] of Object.entries(beside(unit(desk).rect)))
			for (const t of [0.15, 0.35, 0.55, 0.75])
				assert.equal(walk(stairs, start, flight(stairs, t)), 'front', `${stairs}: from ${where} of ${desk} to ${Math.round(t * 100)} % down`);
	}
});

test('straight down from the loft and straight up from the floor, anywhere across the steps, the cursor stays on the stairs', () => {
	for (const stairs of ['stairs-left', 'stairs-right']) {
		const w = unit(stairs);
		for (const t of [0.1, 0.5, 0.9]) {
			const top = lerp(w.landing![0], w.landing!.at(-1)!, t), foot = lerp(w.front[0], w.front.at(-1)!, t);
			assert.equal(walk(stairs, { x: top.x, y: top.y - 150 }, { x: foot.x, y: foot.y + 150 }), 'front', `${stairs}: down, ${t * 100} % across`);
			assert.equal(walk(stairs, { x: foot.x, y: foot.y + 150 }, { x: top.x, y: top.y - 150 }), 'front', `${stairs}: up, ${t * 100} % across`);
		}
	}
});

test('from the ground floor beside the stairs, the cursor goes underneath them', () => {
	const doors = { x: lobby.exit.x + lobby.exit.w / 2, y: lobby.exit.y + lobby.exit.h / 2 };
	for (const stairs of ['stairs-left', 'stairs-right']) {
		const w = unit(stairs), mid = flight(stairs, 0.5), outer = stairs === 'stairs-left' ? w.rect.x - 150 : w.rect.x + w.rect.w + 150;
		assert.equal(walk(stairs, doors, mid), 'behind', `${stairs}: from the front doors`);
		assert.equal(walk(stairs, { x: outer, y: mid.y }, mid), 'behind', `${stairs}: from the wall side`);
		// Down off the loft to the doors and round to the stair's side: far from the loft by then, so underneath.
		assert.equal(walk(stairs, { x: 1200, y: 1250 }, doors, { x: doors.x, y: 2050 }, flight(stairs, 0.7)), 'behind', `${stairs}: the long way round`);
	}
});

test("the workshop's Walk preview mirrors the rule's reach", () => {
	assert.match(readFileSync(new URL('../art/review.js', import.meta.url), 'utf8'), new RegExp(`const LANDING_REACH = ${LANDING_REACH};`));
});
