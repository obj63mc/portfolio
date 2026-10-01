// Seam 2: the walk-behind rule (buildout ticket 19) as a pure function of a cursor's successive positions, stepped along
// the paths Joe walks in the workshop: through the Moosylvania lobby's staircases, from the loft, the floor and the sides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { LANDING_REACH, blocked, walker } from '../src/lib/scenes/walk.ts';
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

// The SLU lab's near-left desk, which carries the workstation's monitor (Joe, 2026-09-28): a cursor stepping onto it
// from between the rows goes behind it, one stepping on from the chair side is in front and can use the monitor. A desk
// hides only a cursor that came down onto it from directly behind (Joe, 2026-10-01: the cursor kept going underneath on
// its way to the monitor): from either side, at any height, it stays on top.
const lab = SUB_SCENES.slu;
const desk = lab.walkBehind.find((w) => w.key === 'slu-desk-back-left')!;
const monitor = (() => {
	const r = lab.props.find((p) => p.id === 'workstation')!.rect;
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
})();
// The sides one cursor takes of the desk, stepped in mouse-sized steps through the points; a `null` makes the next point a jump.
function onDesk(...points: (Point | null)[]) {
	const cursor = walker(lab.walkBehind), seen: string[] = [];
	let last: Point | null = null, jump = true;
	for (const p of points) {
		if (!p) {
			jump = true;
			continue;
		}
		const n = last && !jump ? Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 30) : 1;
		for (let i = 1; i <= n; i++) {
			const side = cursor.step(last && !jump ? lerp(last, p, i / n) : p, jump && i === 1).get(desk.key) ?? 'off';
			if (seen.at(-1) !== side) seen.push(side);
		}
		(last = p), (jump = false);
	}
	return seen.join(', ');
}

test('the monitor stands on the desk, above its front line', () => {
	assert.ok(desk.props.includes('workstation'));
	assert.ok(monitor.y < Math.min(...desk.front.map((p) => p.y)));
});

// Beside and below the desk: the aisle between the rows behind it, the floor in front of its chair, and up through the
// chair, whose seat joins the desktop in the matte (a straight line up from the floor can pass between the two instead).
const aisle = { x: monitor.x, y: desk.rect.y - 40 };
const floor = { x: 1005, y: desk.rect.y + desk.rect.h + 40 };
const chair = { x: 1005, y: 1450 };

test('stepping onto the desk from behind it, between the rows, goes behind it and stays there while on it', () => {
	assert.equal(onDesk(aisle, monitor), 'off, behind');
	// Down across the desk to the chair's foot, below the front line: still behind until it steps off.
	assert.equal(onDesk(aisle, monitor, chair, { x: 1005, y: 1560 }), 'off, behind');
});

test('stepping onto the desk from in front, the chair side, is in front of it, up to the monitor too', () => {
	assert.equal(onDesk(floor, chair, monitor), 'off, front');
});

test('from either side of a desk, at any height, the cursor stays on top: straight across to the monitor, past its back corners, or up a leg', () => {
	const left = desk.rect.x - 40, right = desk.rect.x + desk.rect.w + 40, leg = desk.front[0].x + 1;
	for (const x of [left, right]) {
		// Level with the monitor, which is higher than the desktop's two ends: across the aisle beside its back corners.
		assert.equal(onDesk({ x, y: monitor.y }, monitor), 'off, front', `from x ${x}, level with the monitor`);
		for (const y of [desk.rect.y + 40, desk.rect.y + desk.rect.h / 2, desk.rect.y + desk.rect.h - 40])
			assert.equal(onDesk({ x, y }, { x: monitor.x, y }, monitor).split(', ').at(-1), 'front', `from x ${x} at y ${y}`);
	}
	// Low along the floor to under the near leg, then up it.
	assert.equal(onDesk({ x: left, y: desk.front[0].y + 20 }, { x: leg, y: desk.front[0].y + 20 }, { x: leg, y: 1300 }, monitor), 'off, front');
});

test('only a desk is so forgiving, and every desk is: the lab\'s four and the lobby loft\'s five, a cursor from beside each on top and one from directly behind under it', () => {
	const desks = Object.values(SUB_SCENES).flatMap((s) => s.walkBehind.filter((w) => w.desk).map((w) => ({ s, w })));
	assert.deepEqual(desks.map(({ w }) => w.key).sort(), [
		'moosylvania-desk-back', 'moosylvania-desk-centre', 'moosylvania-desk-front', 'moosylvania-desk-left', 'moosylvania-desk-right',
		'slu-desk-back-left', 'slu-desk-back-right', 'slu-desk-front-left', 'slu-desk-front-right'
	]);
	for (const s of Object.values(SUB_SCENES)) for (const w of s.walkBehind) assert.equal(!!w.desk, w.key.includes('-desk-'), w.key);
	for (const { s, w } of desks) {
		// The side a lone cursor takes of this desk alone, stepped from `a` to `b`.
		const side = (a: Point, b: Point) => {
			const cursor = walker([w]);
			cursor.step(a, true);
			let taken: string | undefined;
			for (let i = 1; i <= 40 && !taken; i++) taken = cursor.step(lerp(a, b, i / 40)).get(w.key);
			return taken;
		};
		const xs = w.outline.map((p) => p.x), ys = w.outline.map((p) => p.y);
		const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
		// A point well inside: halfway down the outline, the middle of its leftmost span there.
		const row = (y0 + y1) / 2;
		const across = w.outline
			.flatMap((a, i) => {
				const b = w.outline[(i + 1) % w.outline.length];
				return a.y > row !== b.y > row ? [a.x + ((b.x - a.x) * (row - a.y)) / (b.y - a.y)] : [];
			})
			.sort((a, b) => a - b);
		const mid = { x: (across[0] + across[1]) / 2, y: row };
		assert.equal(side({ x: x0 - 60, y: row }, mid), 'front', `${s.id} ${w.key}: from its left`);
		assert.equal(side({ x: x1 + 60, y: row }, mid), 'front', `${s.id} ${w.key}: from its right`);
		assert.equal(side({ x: mid.x, y: y1 + 60 }, mid), 'front', `${s.id} ${w.key}: from the front`);
		assert.equal(side({ x: mid.x, y: y0 - 60 }, mid), 'behind', `${s.id} ${w.key}: from directly behind`);
	}
});

test('a cursor that jumps onto the desk takes the side of where it lands, which on a desk is in front', () => {
	assert.equal(onDesk(floor, null, monitor), 'off, front');
	// The chair's foot, inside the outline below the front line.
	assert.equal(onDesk(aisle, null, { x: 1005, y: 1575 }), 'off, front');
});

test('stepping off forgets the side: the next step on is read afresh', () => {
	const left = desk.rect.x - 40;
	assert.equal(onDesk(aisle, monitor, aisle, { x: left, y: aisle.y }, { x: left, y: floor.y }, floor, chair, monitor), 'off, behind, off, front');
});

test('behind the desk its monitor is blocked; in front of it, or off it, nothing is', () => {
	const cursor = walker(lab.walkBehind);
	cursor.step(aisle, true);
	assert.deepEqual(blocked(lab.walkBehind, cursor.step(monitor)), ['workstation']);
	cursor.step(floor, true);
	assert.deepEqual(blocked(lab.walkBehind, cursor.step(floor)), []);
	for (const p of [chair, monitor]) cursor.step(p);
	assert.deepEqual(blocked(lab.walkBehind, cursor.step(monitor)), []);
});

test("the workshop's Walk preview mirrors the rule's reach", () => {
	assert.match(readFileSync(new URL('../art/review.js', import.meta.url), 'utf8'), new RegExp(`const LANDING_REACH = ${LANDING_REACH};`));
});
