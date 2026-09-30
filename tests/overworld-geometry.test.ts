// Seam 2: the overworld scene-data module as pure data. The art pass (buildout ticket 04) writes every
// rect here; these checks are the spec rules a builder relies on, not the artwork's look.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
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
const bounds = (poly: Point[]): Rect => {
	const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
	return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
const world: Rect = { x: 0, y: 0, w: OVERWORLD.w, h: OVERWORLD.h };
const props = OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props));
const welcome = props.find((p) => p.id === 'welcome')!;

// The spec's 5400 cap was waived by Joe for the wider plaza (issue 04 comment).
test('world is 4800 to 6750 wide, 2700 tall, every rect inside it', () => {
	assert.ok(OVERWORLD.w >= 4800 && OVERWORLD.w <= 6750);
	assert.equal(OVERWORLD.h, 2700);
	const rects = [
		OVERWORLD.signpost.rect,
		...OVERWORLD.districts.flatMap((d) => [d.rect, d.sign, ...d.venues.flatMap((v) => [v.rect, ...v.props.map((p) => p.rect)])]),
		...OVERWORLD.depth.map((r) => r.rect),
		...OVERWORLD.foreground.map((f) => f.rect),
		...OVERWORLD.river.decks.map(bounds),
		...OVERWORLD.river.bridges.map((b) => b.rect),
		...OVERWORLD.river.obstacles
	];
	for (const r of rects) assert.ok(inside(r, world), JSON.stringify(r));
});

test('districts read west to east by centre x: on the accepted master the park lake sits west of the west end row', () => {
	const centres = OVERWORLD.districts.map((d) => d.rect.x + d.rect.w / 2);
	assert.deepEqual([...centres].sort((a, b) => a - b), centres);
	assert.deepEqual(
		OVERWORLD.districts.map((d) => d.id),
		['maplewood', 'carondelet-park', 'central-west-end', 'midtown', 'belleville']
	);
	for (const d of OVERWORLD.districts) {
		assert.ok(inside(d.sign, d.rect), `${d.id} sign over its district`);
		for (const v of d.venues) {
			assert.ok(inside(v.rect, d.rect), `${v.id} inside ${d.id}`);
			for (const p of v.props) assert.ok(inside(p.rect, v.rect), `${p.id} inside ${v.id}`);
		}
		for (const e of OVERWORLD.districts) if (e !== d) assert.ok(!overlap(d.rect, e.rect), `${d.id} overlaps ${e.id}`);
	}
});

test('arrival: the signpost fits the first 390 x 844 phone frame at 0.6 scale centred on the welcome sign', () => {
	const w = 390 / 0.6, h = 844 / 0.6;
	const cx = welcome.rect.x + welcome.rect.w / 2, cy = welcome.rect.y + welcome.rect.h / 2;
	const frame: Rect = { x: Math.max(0, Math.min(OVERWORLD.w - w, cx - w / 2)), y: Math.max(0, Math.min(OVERWORLD.h - h, cy - h / 2)), w, h };
	assert.ok(inside(OVERWORLD.signpost.rect, frame));
	assert.ok(inside(props.find((p) => p.id === 'moose')!.rect, frame), 'the moose is in the first frame too');
});

test('depth regions: horizon above foreground, factor continuous across regions', () => {
	assert.ok(OVERWORLD.depth.length >= 5);
	for (const d of OVERWORLD.depth) assert.ok(d.horizonY < d.foregroundY);
	const [first] = OVERWORLD.depth;
	for (const d of OVERWORLD.depth) assert.deepEqual([d.horizonY, d.foregroundY], [first.horizonY, first.foregroundY], 'one ground plane, one gradient');
	for (let i = 0; i < OVERWORLD.depth.length; i++)
		for (let j = i + 1; j < OVERWORLD.depth.length; j++) assert.ok(!overlap(OVERWORLD.depth[i].rect, OVERWORLD.depth[j].rect), `regions ${i} and ${j} overlap`);
});

test('foreground scenery never overlaps a prop rect or the signpost', () => {
	assert.ok(OVERWORLD.foreground.length > 0);
	for (const f of OVERWORLD.foreground) {
		for (const p of props) assert.ok(!overlap(f.rect, p.rect), `${f.key} over ${p.id}`);
		assert.ok(!overlap(f.rect, OVERWORLD.signpost.rect), `${f.key} over the signpost`);
	}
});

test('river: deck spans the water, the bridge cut-outs cover it and the river’s end, south end inside the mask, arch reset on land', () => {
	const { mask, bridges, southEnd, obstacles, arch } = OVERWORLD.river, [deck, poplarDeck] = OVERWORLD.river.decks.map(bounds);
	assert.ok(mask.length >= 8);
	const bbox = bounds(mask), [eads, poplar] = bridges;
	assert.deepEqual(bridges.map((b) => b.key), ['eads-bridge', 'poplar-bridge']);
	assert.ok(overlap(deck, bbox), 'deck crosses the water');
	assert.ok(inside(deck, eads.rect), 'the Eads cut-out contains the walkable deck');
	assert.ok(overlap(poplarDeck, bbox) && overlap(poplarDeck, poplar.rect), 'the Poplar Street deck crosses the water under its cut-out');
	assert.ok(inPolygon({ x: deck.x + deck.w / 2, y: deck.y + deck.h + 100 }, mask), 'water flows under the deck');
	// The river's end runs west to east below the Eads deck, inside the Poplar Street cut-out, so a cursor floating to it is
	// under that bridge; the Arch reset point is on land, north of it.
	assert.ok(southEnd.length >= 2 && southEnd.every((p, i) => i === 0 || p.x > southEnd[i - 1].x));
	for (const p of southEnd) {
		assert.ok(p.y > deck.y + deck.h && p.y <= bbox.y + bbox.h, 'south end below the deck, inside the mask');
		assert.ok(inside({ ...p, w: 0, h: 0 }, poplar.rect), 'under the Poplar Street bridge');
	}
	for (let i = 1; i < southEnd.length; i++)
		for (const u of [0.1, 0.5, 0.9]) {
			const [a, b] = [southEnd[i - 1], southEnd[i]];
			assert.ok(inPolygon({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, OVERWORLD.river.decks[1]), 'along the Poplar Street deck');
		}
	assert.ok(!inPolygon(arch, mask), 'reset point is on land');
	assert.ok(arch.y < Math.min(...southEnd.map((p) => p.y)));
	// Everything standing in the water is in it, north of the river's end.
	for (const o of obstacles) {
		assert.ok(overlap(o, bbox), JSON.stringify(o));
		assert.ok(o.y + o.h < Math.min(...southEnd.map((p) => p.y)), JSON.stringify(o));
	}
});

test('track: a closed loop round the lake in the park, the start/finish sign at its start line, behind each cut-out it lists', () => {
	const { path, half, cover } = OVERWORLD.track;
	const park = OVERWORLD.districts.find((d) => d.id === 'carondelet-park')!;
	const world = (id: string): Rect => JSON.parse(readFileSync(new URL(`../art/generated/overworld/${id}/asset.json`, import.meta.url), 'utf8')).world;
	assert.ok(path.length >= 20 && half > 0);
	for (const [i, p] of path.entries()) {
		const q = path[(i + 1) % path.length];
		assert.ok(inside({ ...p, w: 0, h: 0 }, park.rect), `point ${i} in the park`);
		assert.ok(Math.hypot(q.x - p.x, q.y - p.y) <= 250, `points ${i} and ${i + 1} close enough to follow the curves`);
	}
	// The START FINISH sign, scenery, stands on the lawn just south of the line, spanning it.
	const [start] = path, sign = world(OVERWORLD.track.sign);
	assert.ok(sign.x < start.x && start.x < sign.x + sign.w && sign.y > start.y && sign.y - start.y < 60, 'the sign stands at the start line');
	// Nothing clickable is on the track, whose lap timer is an Easter egg (Joe, 2026-09-29): no prop reaches the painted path.
	const toPath = (p: Point) =>
		Math.min(
			...path.map((a, i) => {
				const b = path[(i + 1) % path.length], dx = b.x - a.x, dy = b.y - a.y;
				const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
				return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy);
			})
		);
	for (const p of props) {
		const { x, y, w, h } = p.rect, edge: Point[] = [];
		for (let t = 0; t <= 1; t += 0.05) edge.push({ x: x + t * w, y }, { x: x + t * w, y: y + h }, { x, y: y + t * h }, { x: x + w, y: y + t * h });
		assert.ok(Math.min(...edge.map(toPath)) > half, `${p.id} clear of the track`);
	}
	for (const id of cover) assert.ok(path.some((p) => inside({ ...p, w: 0, h: 0 }, world(id))), `the loop runs behind ${id}`);
});

test('the Foundry: its door is the cinema under its marquee, not the hall beside it, and the letter board is the canopy face', () => {
	const asset = (id: string): Rect => JSON.parse(readFileSync(new URL(`../art/generated/overworld/${id}/asset.json`, import.meta.url), 'utf8')).world;
	const venues = OVERWORLD.districts.flatMap((d) => d.venues), foundry = venues.find((v) => v.id === 'foundry')!;
	for (const v of venues) if (v.doorRect) assert.ok(inside(v.doorRect, v.rect), `${v.id}: its door on its building`);
	// The sawtooth-roofed hall fills the building's west half; the cinema stands east of it (Joe, 2026-09-30).
	const door = foundry.doorRect!, canopy = asset('marquee');
	assert.ok(door.x > foundry.rect.x + foundry.rect.w / 2, 'the cinema, east of the hall');
	assert.ok(inside(canopy, door), 'the marquee hangs over the way in');
	// The board is drawn with upright sides, its letters following the face's top edge.
	const [tl, tr, br, bl] = OVERWORLD.marquee.face;
	assert.ok(tl.x === bl.x && tr.x === br.x && tl.x < tr.x && tl.y < bl.y && tr.y < br.y, 'upright sides, west to east');
	const reach = { x: canopy.x - 1, y: canopy.y - 1, w: canopy.w + 2, h: canopy.h + 2 };
	for (const p of OVERWORLD.marquee.face) assert.ok(inside({ ...p, w: 0, h: 0 }, reach), `${p.x}, ${p.y} on the canopy`);
});
