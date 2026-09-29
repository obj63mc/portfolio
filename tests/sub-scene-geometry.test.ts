// Seam 2: the sub-scene data modules as pure data. The art pass (buildout ticket 05) writes every rect, outline and
// front line here; these checks are the spec rules a builder relies on, not the artwork's look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingOrder, SUB_SCENES } from '../src/lib/scenes/index.ts';
import { POSTER_LAMPS, PROJECTOR_LENS, SCREEN_SURFACE, SCREEN_TITLES, type ScreenTitle } from '../src/lib/scenes/foundry.ts';
import type { Point, Prop, Rect } from '../src/lib/scenes/types.ts';

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
const corners = (r: Rect): Point[] => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
// A prop's hit area is its rect, cut to its clip-path when it has one (spec: an irregular prop gets a clip-path).
const hitArea = (p: Prop): Point[] =>
	p.clip
		? [...p.clip.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g)].map((m) => ({ x: p.rect.x + (+m[1] / 100) * p.rect.w, y: p.rect.y + (+m[2] / 100) * p.rect.h }))
		: corners(p.rect);
// World px (pixel centres) inside both polygons.
const shared = (a: Point[], b: Point[]) => {
	const box = (ps: Point[]) => ({ x0: Math.min(...ps.map((p) => p.x)), y0: Math.min(...ps.map((p) => p.y)), x1: Math.max(...ps.map((p) => p.x)), y1: Math.max(...ps.map((p) => p.y)) });
	const ba = box(a), bb = box(b);
	let n = 0;
	for (let y = Math.floor(Math.max(ba.y0, bb.y0)); y < Math.max(ba.y1, bb.y1) && y < Math.min(ba.y1, bb.y1); y++)
		for (let x = Math.floor(Math.max(ba.x0, bb.x0)); x < Math.min(ba.x1, bb.x1); x++)
			if (inPolygon({ x: x + 0.5, y: y + 0.5 }, a) && inPolygon({ x: x + 0.5, y: y + 0.5 }, b)) n++;
	return n;
};
const lowestFront = (w: { front: Point[] }) => Math.max(...w.front.map((p) => p.y));
// The outline's outermost point on one side, the lower one where that side is an upright edge.
const side = (w: { outline: Point[] }, s: 'left' | 'right') =>
	w.outline.reduce((a, b) => ((s === 'left' ? b.x < a.x : b.x > a.x) || (b.x === a.x && b.y > a.y) ? b : a));
// Scenery that faces one way: stepping on from that side is stepping on from in front, so the front line runs up that
// side of the outline, while from the other side (a sofa's or chair's back) it counts as behind.
const faces = (w: { key: string; outline: Point[]; front: Point[] }, toward: 'left' | 'right') => {
	const near = side(w, toward), far = side(w, toward === 'left' ? 'right' : 'left');
	assert.ok(near.y >= frontY(w.front, near.x) - 1, `${w.key}: stepping on from the ${toward} is from in front`);
	assert.ok(far.y < frontY(w.front, far.x), `${w.key}: stepping on over its back is from behind`);
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
			if (w.landing) {
				assert.ok(w.landing.length >= 2 && w.landing.every((p, i) => i === 0 || p.x > w.landing![i - 1].x), `${s.id}: ${w.key} landing runs left to right`);
				// The landing is the stair's top, the front line its foot: no x where the top is at or below the foot.
				for (const p of [...w.landing, ...w.front]) assert.ok(frontY(w.landing, p.x) < frontY(w.front, p.x), `${s.id}: ${w.key} landing above its front`);
			}
			for (const id of w.props) {
				const prop = s.props.find((p) => p.id === id);
				assert.ok(prop, `${s.id}: ${w.key} lists unknown prop ${id}`);
				assert.ok(inPolygon(centre(prop.rect), w.outline), `${s.id}: ${id} does not stand on ${w.key}`);
			}
			// Every other prop's hit area, and the exit, is clear of it: a cursor hidden behind the scenery never hovers them.
			for (const p of s.props.filter((p) => !w.props.includes(p.id)))
				assert.equal(shared(hitArea(p), w.outline), 0, `${s.id}: ${w.key} covers part of ${p.id}`);
			assert.equal(shared(corners(s.exit), w.outline), 0, `${s.id}: ${w.key} covers part of the exit`);
		}
	}
});

test('walk-behind scenery is drawn back to front: of two overlapping cut-outs, the nearer front line comes later', () => {
	for (const s of scenes)
		s.walkBehind.forEach((w, i) => {
			for (const v of s.walkBehind.slice(i + 1))
				if (overlap(w.rect, v.rect)) assert.ok(lowestFront(w) <= lowestFront(v), `${s.id}: ${v.key} is drawn after ${w.key}, but is farther back`);
		});
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

test('Foundry: posters left to right beside the screen, the beam from the ledge to the screen surface', () => {
	const foundry = SUB_SCENES.foundry;
	const rect = (id: string) => foundry.props.find((p) => p.id === id)!.rect;
	const posters = (Object.keys(SCREEN_TITLES) as ScreenTitle[]).map((id) => rect(`poster-${id}`));
	const screen = rect('screen');
	// Clicking reads left to right: the three posters in title order, then the screen they play on.
	posters.forEach((p, i) => assert.ok(i === 0 || p.x >= posters[i - 1].x + posters[i - 1].w, `poster ${i} overlaps the one before`));
	assert.ok(posters[2].x + posters[2].w < screen.x);
	// Each picture light hangs at the top of its poster's rect, where the hover light starts.
	for (const id of Object.keys(POSTER_LAMPS) as ScreenTitle[]) {
		const lamp = POSTER_LAMPS[id], p = rect(`poster-${id}`);
		assert.ok(inPolygon(lamp, [{ x: p.x, y: p.y }, { x: p.x + p.w, y: p.y }, { x: p.x + p.w, y: p.y + p.h / 5 }, { x: p.x, y: p.y + p.h / 5 }]), id);
	}
	// The timeline's quad is the screen's own surface, and the beam leaves the lens on the ledge, below and left of it.
	const grown = { x: screen.x - 6, y: screen.y - 6, w: screen.w + 12, h: screen.h + 12 };
	for (const c of SCREEN_SURFACE) assert.ok(c.x >= grown.x && c.x <= grown.x + grown.w && c.y >= grown.y && c.y <= grown.y + grown.h);
	const ledge = foundry.walkBehind.find((w) => w.key === 'foundry-projector-ledge')!;
	assert.ok(inPolygon(PROJECTOR_LENS, ledge.outline));
	assert.ok(PROJECTOR_LENS.x < screen.x && PROJECTOR_LENS.y > screen.y + screen.h);
});

test('Side Project: ten bottles in a row on one shelf, the sign on the cooler door grants the beer mug', () => {
	const bar = SUB_SCENES['side-project'];
	const bottles = bar.props.filter((p) => p.id.startsWith('bottle-'));
	assert.equal(bottles.length, 10);
	// One row, left to right, none overlapping: every bottle stands on the same shelf (bases within a few px).
	bottles.forEach((b, i) => assert.ok(i === 0 || b.rect.x >= bottles[i - 1].rect.x + bottles[i - 1].rect.w, `${b.id} overlaps the one before`));
	const bases = bottles.map((b) => b.rect.y + b.rect.h);
	assert.ok(Math.max(...bases) - Math.min(...bases) < 20, 'bottles stand on one shelf');
	// The counters stand below the shelf, so no cursor behind the bar is ever over a bottle.
	for (const w of bar.walkBehind) assert.ok(Math.min(...w.outline.map((p) => p.y)) > Math.max(...bases), w.key);
	// The beer mug comes from the sign alone, right of the bottles and left of the chalkboard on the same cooler.
	const sign = bar.props.find((p) => p.id === 'brewery-sign')!;
	assert.deepEqual(bar.props.filter((p) => p.cosmetic === 5).map((p) => p.id), ['brewery-sign']);
	const chalkboard = bar.props.find((p) => p.id === 'chalkboard')!;
	assert.ok(sign.rect.x > bottles[9].rect.x + bottles[9].rect.w && sign.rect.x + sign.rect.w < chalkboard.rect.x);
});

test("Brennan's: five brand boxes in a row on one humidor shelf, each grants the cigar, the STG plaque above them", () => {
	const room = SUB_SCENES['brennans'];
	const boxes = room.props.filter((p) => p.id.startsWith('humidor-'));
	assert.equal(boxes.length, 5);
	boxes.forEach((b, i) => assert.ok(i === 0 || b.rect.x >= boxes[i - 1].rect.x + boxes[i - 1].rect.w, `${b.id} overlaps the one before`));
	const bases = boxes.map((b) => b.rect.y + b.rect.h);
	assert.ok(Math.max(...bases) - Math.min(...bases) < 20, 'boxes stand on one shelf');
	// Any box grants the cigar, and nothing else in the room does.
	assert.deepEqual(room.props.filter((p) => p.cosmetic === 6).map((p) => p.id), boxes.map((b) => b.id));
	// The plaque hangs on the humidor's crown, above the boxes and within their span.
	const stg = room.props.find((p) => p.id === 'stg-logo')!;
	assert.ok(stg.rect.y + stg.rect.h < Math.min(...boxes.map((b) => b.rect.y)));
	assert.ok(stg.rect.x > boxes[0].rect.x && stg.rect.x + stg.rect.w < boxes[4].rect.x + boxes[4].rect.w);
	// The furniture stands on the floor below the shelf, so no cursor behind it is ever over a box; the door is left of the humidor.
	for (const w of room.walkBehind) assert.ok(Math.min(...w.outline.map((p) => p.y)) > Math.max(...bases), w.key);
	assert.ok(room.exit.x + room.exit.w < boxes[0].rect.x);
	// The lounge's coffee table is open to the rug on its right: stepping on from there is from in front.
	faces(room.walkBehind.find((w) => w.key === 'brennans-lounge')!, 'right');
	assert.ok(!room.props.some((p) => p.id === 'atm'), 'the ATM left Brennan’s for the overworld (buildout ticket 25)');
});

test('Moosylvania: a tall lobby scrolled like the overworld, the loft computers over the doors, the statue, then the TV', () => {
	const lobby = SUB_SCENES.moosylvania;
	assert.ok(lobby.h > lobby.w, 'a tall scene, scrolled up and down the nave');
	assert.equal(lobby.pushBand, 0.25, "the overworld's push band");
	for (const s of scenes.filter((s) => s !== lobby)) assert.equal(s.pushBand, undefined, `${s.id} keeps the sub-scene band`);
	const computers = ['computer-frontend', 'computer-backend', 'computer-cms', 'computer-data'];
	assert.deepEqual(readingOrder(lobby).map((p) => p.id), [...computers, 'moose-statue', 'meeting-tv'], 'props read top to bottom');
	const rect = (id: string) => lobby.props.find((p) => p.id === id)!.rect;
	// Each loft computer stands on its own desk and is used from in front of it, from the chair's side.
	for (const id of computers) {
		const desk = lobby.walkBehind.filter((w) => w.props.includes(id));
		assert.equal(desk.length, 1, id);
		const c = centre(rect(id));
		assert.ok(c.y < frontY(desk[0].front, c.x), `${id} stands behind its desk's front feet`);
	}
	// The loft is above the front doors beneath it, the front desk's statue below them, the meeting TV nearest.
	const bottom = (r: Rect) => r.y + r.h;
	assert.ok(Math.max(...computers.map((id) => bottom(rect(id)))) < lobby.exit.y);
	assert.ok(bottom(lobby.exit) < rect('moose-statue').y);
	assert.ok(bottom(rect('moose-statue')) < rect('meeting-tv').y);
	// The TV hangs on the moose wall and is used from the meeting area in front of it; the statue is on no walk-behind scenery.
	const wall = lobby.walkBehind.find((w) => w.props.includes('meeting-tv'))!;
	assert.equal(wall.key, 'moosylvania-moose-wall');
	const tv = rect('meeting-tv');
	assert.ok(bottom(tv) <= frontY(wall.front, tv.x + tv.w / 2) + 2);
	assert.ok(!lobby.walkBehind.some((w) => w.props.includes('moose-statue')));
	// The round sofas face the coffee table between them, and the armchairs the meeting table.
	const unit = (key: string) => lobby.walkBehind.find((w) => w.key === `moosylvania-${key}`)!;
	faces(unit('sofa-left'), 'right');
	faces(unit('sofa-right'), 'left');
	faces(unit('meeting-chairs-left'), 'right');
	faces(unit('meeting-chairs-right'), 'left');
	// The meeting sofa faces the TV from the bottom of the picture, across the table, so every seat can watch it: it is the
	// nearest furniture, drawn last, a cursor stepping on from the table's side goes behind its back, and nothing stands
	// in front of the TV.
	const sofa = unit('meeting-sofa'), table = unit('meeting-table');
	assert.ok(Math.min(...sofa.outline.map((p) => p.y)) > table.rect.y + table.rect.h, 'the sofa is below the table');
	assert.equal(lobby.walkBehind.at(-1), sofa);
	const top = sofa.outline.reduce((a, b) => (b.y < a.y ? b : a));
	assert.ok(top.y < frontY(sofa.front, top.x), 'from the table, behind the sofa');
	assert.equal(lobby.props.find((p) => p.id === 'meeting-tv')!.clip, undefined, 'nothing covers the TV');
	// The twin staircases rise to the loft. Stepping on anywhere across the bottom step, or from the loft anywhere across the
	// top step, is on the stairs; stepping on from either side, under the rising flight, is underneath them. The outline is
	// the flight's full width, so a cursor walking straight up or down stays on the stairs round the curve (Joe, 2026-09-28:
	// coming down from the loft the cursor kept ending up underneath, and going up only worked dead centre).
	const across = (poly: Point[], y: number) => {
		const xs: number[] = [];
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a = poly[i], b = poly[j];
			if (a.y > y !== b.y > y) xs.push(a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
		}
		return [Math.min(...xs), Math.max(...xs)];
	};
	for (const key of ['stairs-left', 'stairs-right']) {
		const stairs = unit(key);
		assert.ok(stairs?.landing, `${key}: a walk-behind staircase with a landing`);
		const landing = stairs.landing!;
		const on = (p: Point) => p.y >= frontY(stairs.front, p.x) || p.y <= frontY(landing, p.x);
		const top = (t: number) => { const x = landing[0].x + t * (landing.at(-1)!.x - landing[0].x); return { x, y: frontY(landing, x) }; };
		const foot = (t: number) => { const x = stairs.front[0].x + t * (stairs.front.at(-1)!.x - stairs.front[0].x); return { x, y: frontY(stairs.front, x) }; };
		for (let t = 0; t <= 1.0001; t += 0.1) {
			assert.ok(on({ ...top(t), y: top(t).y - 1 }), `${key}: from the loft, on the stairs (${Math.round(t * 100)} % across)`);
			assert.ok(on({ ...foot(t), y: foot(t).y + 1 }), `${key}: from the foot, on the stairs (${Math.round(t * 100)} % across)`);
			// A straight walk from any point across the top step to the same point across the bottom one stays on the stairs
			// (short of the very edges, where the walk runs along the outline itself).
			if (t < 0.05 || t > 0.95) continue;
			for (let u = 0.02; u < 0.99; u += 0.04) {
				const p = { x: top(t).x + u * (foot(t).x - top(t).x), y: top(t).y + u * (foot(t).y - top(t).y) };
				assert.ok(inPolygon(p, stairs.outline), `${key}: a straight walk ${Math.round(t * 100)} % across leaves the stairs at ${Math.round(p.x)},${Math.round(p.y)}`);
			}
		}
		// From either side, halfway up the flight, underneath.
		const mid = (frontY(stairs.front, foot(0.5).x) + frontY(landing, top(0.5).x)) / 2;
		const [x0, x1] = across(stairs.outline, mid);
		assert.ok(!on({ x: x0 - 1, y: mid }) && !on({ x: x1 + 1, y: mid }), `${key}: from either side, underneath`);
		assert.deepEqual(stairs.props, []);
	}
	// The lobby grants nothing: Moosylvania's antlers come from the moose outside.
	assert.ok(!lobby.props.some((p) => p.cosmetic));
});
