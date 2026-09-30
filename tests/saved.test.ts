// Seam 2: the persistence rune's pure half (buildout ticket 16), the spec's "Persistence" read rules and write-time merge
// with plain inputs, no storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KNOWN } from '../src/lib/cosmetics.ts';
import { addLap, gold, grant, merge, read, type Saved } from '../src/lib/saved.ts';
import { SUB_SCENES, propsOf } from '../src/lib/scenes/index.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';

const FRESH = { v: 1, worn: 0, earned: [], laps: { track: 1, best: [] }, sound: true };

test('nothing stored, unparseable JSON, a non-object or a newer version starts fresh', () => {
	for (const text of [null, '', '{"v":1', 'null', '[]', '7', '"x"', JSON.stringify({ v: 2, worn: 1, earned: [1], sound: false })])
		assert.deepEqual(read(text), FRESH, String(text));
});

test('a good value reads back as stored', () => {
	const stored = {
		v: 1,
		worn: 3,
		earned: [1, 3, 7],
		laps: { track: 1, best: [{ ms: 41_000, at: 1_790_000_000_000 }, { ms: 45_500, at: 1_789_000_000_000 }] },
		sound: false,
		analytics: 'denied'
	};
	assert.deepEqual(read(JSON.stringify(stored)), stored);
});

test('each bad field resets to its default alone, the others kept', () => {
	const good = { v: 1, worn: 2, earned: [2, 5], laps: { track: 1, best: [{ ms: 50_000, at: 1 }] }, sound: false, analytics: 'granted' };
	const is = (fields: object, expected: object) =>
		assert.deepEqual(read(JSON.stringify({ ...good, ...fields })), { ...good, ...expected }, JSON.stringify(fields));
	is({ earned: 'all' }, { earned: [], worn: 0 });
	is({ earned: [5, 2, 2, '3', 1.5, -1, 0, null] }, { earned: [2, 5] });
	is({ worn: 'cap' }, { worn: 0 });
	is({ worn: 5 }, { worn: 5 });
	is({ sound: 'off' }, { sound: true });
	is({ laps: [] }, { laps: { track: 1, best: [] } });
	is({ laps: { track: 1, best: 'fast' } }, { laps: { track: 1, best: [] } });
	const { analytics: _, ...unchosen } = good;
	for (const analytics of ['yes', null, 1]) assert.deepEqual(read(JSON.stringify({ ...good, analytics })), unchosen, String(analytics));
	const { sound: __, ...silent } = good;
	assert.deepEqual(read(JSON.stringify(silent)), { ...good, sound: true }, 'a missing sound means on');
	assert.deepEqual(read(JSON.stringify({ ...good, v: undefined })), good, 'a missing version is this one');
});

test('unknown earned ids are kept; a worn id not earned, or unknown, becomes 0', () => {
	assert.deepEqual(read(JSON.stringify({ v: 1, worn: 9, earned: [9, 12, 1] })), { ...FRESH, worn: 0, earned: [1, 9, 12] });
	assert.equal(read(JSON.stringify({ v: 1, worn: 4, earned: [1, 2] })).worn, 0);
	assert.equal(read(JSON.stringify({ v: 1, worn: 4, earned: [4] })).worn, 4);
});

test('laps on another track, with a bad time or a bad date are dropped; the rest sorted fastest first, ten at most', () => {
	assert.deepEqual(read(JSON.stringify({ v: 1, laps: { track: 2, best: [{ ms: 1000, at: 1 }] } })).laps, { track: 1, best: [] });
	const best = [
		{ ms: 30_000, at: 1 },
		{ ms: 0, at: 2 },
		{ ms: -5, at: 3 },
		{ ms: null, at: 4 },
		{ ms: 20_000, at: 'today' },
		{ ms: 25_000, at: 5 },
		'fast',
		...Array.from({ length: 12 }, (_, i) => ({ ms: 40_000 + i, at: 10 + i }))
	];
	const kept = read(JSON.stringify({ v: 1, laps: { track: 1, best } })).laps.best;
	assert.deepEqual(kept.slice(0, 2), [{ ms: 25_000, at: 5 }, { ms: 30_000, at: 1 }]);
	assert.equal(kept.length, 10);
	assert.deepEqual(kept.at(-1), { ms: 40_007, at: 17 });
});

test("a write merges with what another tab stored: earned a union, laps the fastest ten, the rest this tab's", () => {
	const lap = (ms: number, at = ms) => ({ ms, at });
	const stored: Saved = {
		v: 1,
		worn: 4,
		earned: [1, 4, 9],
		laps: { track: 1, best: [lap(30_000), lap(50_000), ...Array.from({ length: 8 }, (_, i) => lap(60_000 + i))] },
		sound: false,
		analytics: 'denied'
	};
	const mine: Saved = { v: 1, worn: 2, earned: [2], laps: { track: 1, best: [lap(40_000), lap(50_000)] }, sound: true };
	assert.deepEqual(merge(stored, mine), {
		v: 1,
		worn: 2,
		earned: [1, 2, 4, 9],
		laps: { track: 1, best: [lap(30_000), lap(40_000), lap(50_000), ...Array.from({ length: 7 }, (_, i) => lap(60_000 + i))] },
		sound: true,
		// A choice made in another tab isn't undone by a tab that never saw it.
		analytics: 'denied'
	});
	assert.equal(merge(stored, { ...mine, analytics: 'granted' }).analytics, 'granted');
});

test('a grant wears its cosmetic and earns it the first time; granting it again only wears it again', () => {
	const once = grant(read(null), 7);
	assert.deepEqual([once.first, once.saved.worn, once.saved.earned], [true, 7, [7]]);
	const other = grant(once.saved, 1);
	assert.deepEqual([other.first, other.saved.worn, other.saved.earned], [true, 1, [1, 7]]);
	const again = grant(other.saved, 7);
	assert.deepEqual([again.first, again.saved.worn, again.saved.earned], [false, 7, [1, 7]]);
});

test('gold is every cosmetic the build knows, ids it does not know aside, however few it knows', () => {
	assert.equal(gold([1, 2, 3, 4, 5, 6, 7]), true);
	assert.equal(gold([1, 2, 3, 4, 5, 6, 8, 9]), false);
	assert.equal(gold([]), false);
	assert.equal(gold([1, 2], [1, 2]), true);
	assert.equal(gold([1, 3], [1, 2]), false);
});

test('gold can be reached: some prop grants every cosmetic the build knows', () => {
	const granted = new Set([OVERWORLD, ...Object.values(SUB_SCENES)].flatMap((s) => propsOf(s).map((p) => p.cosmetic)));
	assert.deepEqual(KNOWN.filter((id) => !granted.has(id)), []);
});

test('a lap enters the top ten if it is fast enough, and is a personal best only if it beats the fastest', () => {
	const lap = (ms: number) => ({ ms, at: ms });
	const first = addLap(read(null), lap(60_000));
	assert.deepEqual([first.entered, first.best, first.saved.laps.best], [true, true, [lap(60_000)]]);
	const ten = Array.from({ length: 10 }, (_, i) => lap(40_000 + i * 1000));
	const full: Saved = { ...read(null), laps: { track: 1, best: ten } };
	const slow = addLap(full, lap(50_000));
	assert.deepEqual([slow.entered, slow.best, slow.saved.laps.best], [false, false, ten]);
	const middling = addLap(full, lap(45_500));
	assert.deepEqual([middling.entered, middling.best, middling.saved.laps.best.length], [true, false, 10]);
	assert.deepEqual(middling.saved.laps.best.at(-1), lap(48_000));
	assert.deepEqual([addLap(full, lap(40_000)).best, addLap(full, lap(39_999)).best], [false, true]);
});
