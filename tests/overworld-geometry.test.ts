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
		OVERWORLD.river.deck,
		OVERWORLD.river.bridge.rect
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

test('river: deck spans the water, bridge cut-out covers the deck, south end inside the mask, arch reset on land', () => {
	const { mask, deck, bridge, southEndY, arch } = OVERWORLD.river;
	assert.ok(mask.length >= 8);
	const xs = mask.map((p) => p.x), ys = mask.map((p) => p.y);
	const bbox: Rect = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
	assert.ok(overlap(deck, bbox), 'deck crosses the water');
	assert.ok(inside(deck, bridge.rect), 'the bridge cut-out contains the walkable deck');
	assert.ok(southEndY > deck.y + deck.h && southEndY <= bbox.y + bbox.h, 'south end below the deck, at the mask bottom');
	assert.ok(!inPolygon(arch, mask), 'reset point is on land');
	assert.ok(inPolygon({ x: deck.x + deck.w / 2, y: deck.y + deck.h + 100 }, mask), 'water flows under the deck');
	assert.ok(arch.y < southEndY);
});

test('track: a closed loop round the lake in the park, its start line under the track prop, behind each cut-out it lists', () => {
	const { path, half, cover } = OVERWORLD.track;
	const park = OVERWORLD.districts.find((d) => d.id === 'carondelet-park')!;
	const track = props.find((p) => p.id === 'track')!;
	assert.ok(path.length >= 20 && half > 0);
	for (const [i, p] of path.entries()) {
		const q = path[(i + 1) % path.length];
		assert.ok(inside({ ...p, w: 0, h: 0 }, park.rect), `point ${i} in the park`);
		assert.ok(Math.hypot(q.x - p.x, q.y - p.y) <= 250, `points ${i} and ${i + 1} close enough to follow the curves`);
	}
	assert.ok(inside({ ...path[0], w: 0, h: 0 }, track.rect), 'the start line is the track prop');
	for (const id of cover) {
		const world: Rect = JSON.parse(readFileSync(new URL(`../art/generated/overworld/${id}/asset.json`, import.meta.url), 'utf8')).world;
		assert.ok(
			path.some((p) => inside({ ...p, w: 0, h: 0 }, world)),
			`the loop runs behind ${id}`
		);
	}
});
