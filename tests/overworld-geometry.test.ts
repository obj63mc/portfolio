// Seam 2: the overworld scene-data module as pure data. The art pass (buildout ticket 04) writes every
// rect here; these checks are the spec rules a builder relies on, not the artwork's look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Rect } from '../src/lib/scenes/types.ts';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

test('districts read west to east by centre x, with the park between the west end and midtown', () => {
	const centres = OVERWORLD.districts.map((d) => d.rect.x + d.rect.w / 2);
	assert.deepEqual([...centres].sort((a, b) => a - b), centres);
	assert.deepEqual(
		OVERWORLD.districts.map((d) => d.id),
		['maplewood', 'central-west-end', 'carondelet-park', 'midtown', 'belleville']
	);
	for (const d of OVERWORLD.districts) {
		assert.ok(inside(d.sign, d.rect), `${d.id} sign over its district`);
		for (const v of d.venues) for (const p of v.props) assert.ok(inside(p.rect, d.rect), `${p.id} inside ${d.id}`);
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
	assert.ok(!inside({ x: arch.x, y: arch.y, w: 1, h: 1 }, bbox) || arch.x < bbox.x + 200, 'reset point is on the west bank');
	assert.ok(arch.y < southEndY);
});
