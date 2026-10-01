// Big Muddy's rules (src/lib/big-muddy/rules.ts), its saved top ten and its lure (saved.ts), with fixed dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCatch, keepLure, merge, read, type Saved } from '../src/lib/saved.ts';
import {
	FT, GAP, HOOK, LURE_Y, LURES, REACH, SCHOOL, SNAG, SNAGS, SPECIES, STEER, STEP, VIEW, afterCatch, afterSnag, depthOf, isCatch, speciesOf, start, step, viewOf, weigh,
	type End, type Run
} from '../src/lib/big-muddy/rules.ts';

/** Dice that roll `xs` in turn, over and over. */
const dice = (...xs: number[]) => {
	let i = 0;
	return () => xs[i++ % xs.length];
};
/** A seeded generator (mulberry32), for a whole cast. */
const seeded = (a: number) => () => {
	a = (a + 0x6d2b79f5) | 0;
	let t = Math.imul(a ^ (a >>> 15), 1 | a);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const [bass, catfish, gar] = SPECIES;
/** Runs `run` until it ends or `seconds` pass. */
function play(run: Run, steer: number, rand: () => number, seconds: number): End | null {
	for (let i = 0; i < seconds / STEP; i++) {
		const end = step(run, steer, rand);
		if (end) return end;
	}
	return null;
}

test("a fish weighs what the original's did at its depth", () => {
	// 12 ft: (121 / 400 + 0.05) * 7.5 = 2.64, 2.6 to one decimal, 2 lb; the high roll, 3.02, is 3.
	assert.equal(weigh(bass, 12, dice(0)).lb, 2);
	assert.equal(weigh(bass, 12, dice(0.5)).lb, 3);
	// At the surface a bass is the least a fish is, a fifth its size and a pound.
	assert.deepEqual(weigh(bass, 0, dice(0)), { lb: 1, scale: 0.2 });
	// The catfish and the gar start at 4 lb: 0.2 of 22.5 and of 21.
	assert.equal(weigh(catfish, 1, dice(0)).lb, 4);
	assert.equal(weigh(gar, 1, dice(0)).lb, 4);
	// 100 ft: a bass (1001 / 400 + 0.05) * 7.5 = 19.1, a catfish (1.001 + 0.1) * 22.5 = 24.8, a gar 1.051 * 21 = 22.1.
	assert.equal(weigh(bass, 100, dice(0)).lb, 19);
	assert.equal(weigh(catfish, 100, dice(0.5)).lb, 24);
	assert.equal(weigh(gar, 100, dice(0)).lb, 22);
	// Drawn no larger than half as big again, however deep.
	assert.equal(weigh(bass, 100, dice(0)).scale, 1.5);
	assert.equal(weigh(catfish, 100, dice(0)).scale, 1.051);
});

test('a catch earns the next lure at 10, 30 and 50 lb, one at a time, and a snag costs one', () => {
	assert.equal(afterCatch(1, 9), 1);
	assert.equal(afterCatch(1, 10), 2);
	assert.equal(afterCatch(1, 80), 2);
	assert.equal(afterCatch(2, 29), 2);
	assert.equal(afterCatch(2, 30), 3);
	assert.equal(afterCatch(3, 50), 4);
	assert.equal(afterCatch(4, 500), 4);
	assert.equal(afterSnag(4), 3);
	assert.equal(afterSnag(1), 1);
});

test('a cast starts with the hook mid-view and everything in the water below the view', () => {
	const run = start(1, seeded(1)), v = viewOf(run);
	assert.equal(run.x + HOOK.w / 2 - v.x, VIEW.w / 2);
	assert.equal(run.y - v.y, LURE_Y);
	assert.equal(depthOf(run.y), 1);
	assert.equal(run.fish.length, SCHOOL * SPECIES.length);
	assert.equal(run.snags.length, SNAGS);
	for (const b of [...run.fish, ...run.snags]) {
		assert.ok(b.y >= v.y + VIEW.h + GAP, `${b.y} is in view`);
		assert.ok(b.x >= v.x && b.x < v.x + VIEW.w);
	}
	// A fish's box is its species' at the size it was weighed at.
	for (const f of run.fish) assert.ok(Math.abs(f.w / f.h - speciesOf(f.fish).w / speciesOf(f.fish).h) < 1e-9);
});

test('each lure sinks from its own speed and gains its own, and steering is 400 a second within reach', () => {
	for (const lure of [1, 2, 3, 4] as const) {
		const run: Run = { ...start(lure, seeded(1)), fish: [], snags: [] }, y0 = run.y, { v, a } = LURES[lure - 1];
		assert.equal(play(run, 0, Math.random, 2), null);
		// Two seconds on: v t + a t² / 2, within a step's worth.
		assert.ok(Math.abs(run.y - y0 - (2 * v + 2 * a)) < a * STEP * 2 + 1e-6, `lure ${lure}: ${run.y - y0}`);
		assert.ok(Math.abs(run.vy - (v + 2 * a)) < 1e-6);
	}
	const run: Run = { ...start(1, seeded(1)), fish: [], snags: [] }, x0 = run.x;
	play(run, 1, Math.random, 1);
	assert.ok(Math.abs(run.x - x0 - STEER) < 1e-6);
	play(run, 0.5, Math.random, 1);
	assert.ok(Math.abs(run.x - x0 - STEER * 1.5) < 1e-6);
	play(run, 9, Math.random, 5);
	assert.equal(run.x, x0 + REACH);
	play(run, -1, Math.random, 9);
	assert.equal(run.x, x0 - REACH);
});

test('the hook touching a fish is a catch at its weight, a snag a snag, and a fish comes first', () => {
	const bare = (): Run => ({ ...start(1, seeded(1)), fish: [], snags: [] });
	const fish = (run: Run) => ({ fish: 'gar' as const, x: run.x - 40, y: run.y + 30, w: 100, h: 23, lb: 31, dir: 1 as const, turn: 9 });
	let run = bare();
	run.fish.push(fish(run));
	const caught = play(run, 0, dice(0.5), 1);
	assert.deepEqual(caught, { is: 'caught', fish: 'gar', lb: 31, depth: depthOf(run.y) });
	run = bare();
	run.snags.push({ x: run.x - 20, y: run.y + 30, shape: 0 });
	assert.deepEqual(play(run, 0, dice(0.5), 1), { is: 'snagged', depth: depthOf(run.y) });
	// Both touched in the same step.
	run = bare();
	run.fish.push({ ...fish(run), y: run.y + HOOK.h + 0.5 });
	run.snags.push({ x: run.x - 20, y: run.y + HOOK.h + 0.5, shape: 0 });
	assert.equal(step(run, 0, dice(0.5))?.is, 'caught');
	// A snag a hook's width off to the side is missed.
	run = bare();
	run.snags.push({ x: run.x + HOOK.w + 1, y: run.y + 30, shape: 0 });
	assert.equal(play(run, 0, dice(0.5), 1), null);
});

test('a fish turns when its time is up and swims the other way', () => {
	const run: Run = { ...start(1, seeded(1)), fish: [], snags: [] };
	run.fish.push({ fish: 'bass', x: 2000, y: run.y + 5000, w: 50, h: 20, lb: 1, dir: 1, turn: 0.5 });
	play(run, 0, dice(0), 0.5 - STEP);
	assert.ok(Math.abs(run.fish[0].x - 2000 - bass.swim * (0.5 - STEP)) < 1);
	// Turned, for a whole second more (the dice roll the least).
	play(run, 0, dice(0), 3 * STEP);
	assert.equal(run.fish[0].dir, -1);
	assert.ok(run.fish[0].turn > 0.9 && run.fish[0].turn <= 1);
});

test('what rises above the view appears again below it, a fish weighed for the depth it is then', () => {
	const run: Run = { ...start(4, seeded(1)), fish: [], snags: [] };
	run.y = 40 * FT;
	const top = () => viewOf(run).y;
	run.fish.push({ fish: 'bass', x: 0, y: top() - 40, w: 50, h: 20, lb: 1, dir: 1, turn: 9 });
	run.snags.push({ x: 0, y: top() - SNAG.h - 1, shape: 0 });
	assert.equal(step(run, 0, dice(0)), null);
	const [f] = run.fish, [s] = run.snags;
	assert.ok(f.y >= top() + VIEW.h + GAP && s.y >= top() + VIEW.h + GAP);
	// 40 ft: (401 / 400 + 0.05) * 7.5 = 7.89, 7 lb, a little over full size.
	assert.equal(f.lb, 7);
	assert.ok(Math.abs(f.w - bass.w * 1.0525) < 1e-6);
	assert.equal(s.shape, 1);
});

test('a cast is the same for the same dice, and left alone it ends', () => {
	const ends = [1, 2, 3, 4, 5].map((seed) => {
		const a = seeded(seed), b = seeded(seed);
		const one = play(start(1, a), 0, a, 600), two = play(start(1, b), 0, b, 600);
		assert.deepEqual(one, two);
		return one;
	});
	assert.ok(ends.every((e) => e !== null), 'every unsteered cast met a fish or a snag within ten minutes');
});

test('the catch top ten: heaviest first, ten at most, absent until the first catch, merged across tabs', () => {
	const none = read(null);
	assert.equal('catches' in none, false);
	const first = addCatch(none, { fish: 'bass', lb: 3, depth: 14, at: 1 });
	assert.deepEqual(first, { saved: { ...none, catches: [{ fish: 'bass', lb: 3, depth: 14, at: 1 }] }, entered: true, best: true });
	let s: Saved = first.saved;
	for (let i = 0; i < 10; i++) s = addCatch(s, { fish: 'gar', lb: 10 + i, depth: 50 + i, at: 10 + i }).saved;
	assert.equal(s.catches?.length, 10);
	assert.equal(s.catches?.[0].lb, 19);
	assert.equal(s.catches?.some((c) => c.fish === 'bass'), false);
	const small = addCatch(s, { fish: 'bass', lb: 1, depth: 2, at: 99 });
	assert.deepEqual([small.entered, small.best], [false, false]);
	// A tie in weight: the deeper catch first.
	const tie = addCatch(s, { fish: 'catfish', lb: 19, depth: 90, at: 100 });
	assert.equal(tie.best, false);
	assert.equal(tie.saved.catches?.[0].fish, 'catfish');
	const other = { ...none, catches: [{ fish: 'catfish' as const, lb: 60, depth: 260, at: 50 }] };
	assert.equal(merge(other, s).catches?.[0].lb, 60);
	// Rows out of shape are dropped: a fish the game hasn't, a weight that is no whole number, a missing date.
	const bad = [{ fish: 'carp', lb: 5, depth: 3, at: 1 }, { fish: 'bass', lb: 1.5, depth: 3, at: 1 }, { fish: 'bass', lb: 2, depth: 3 }, null, 7];
	assert.equal(read(JSON.stringify({ v: 1, catches: bad })).catches, undefined);
	assert.equal(isCatch({ fish: 'gar', lb: 4, depth: 1, at: 5 }), true);
});

test('the lure is kept from the second up, read back only as a lure, and is the last writer’s', () => {
	const none = read(null);
	assert.equal('lure' in keepLure(none, 1), false);
	assert.equal(keepLure(none, 3).lure, 3);
	assert.equal('lure' in keepLure(keepLure(none, 3), 1), false);
	assert.equal(read(JSON.stringify({ v: 1, lure: 4 })).lure, 4);
	for (const lure of [1, 5, '2', null]) assert.equal('lure' in read(JSON.stringify({ v: 1, lure })), false);
	assert.equal(merge(keepLure(none, 4), keepLure(none, 2)).lure, 2);
	assert.equal('lure' in merge(keepLure(none, 4), none), false);
});
