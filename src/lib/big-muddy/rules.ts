// Big Muddy's rules (Joe, 2026-10-01): the game carried over from Lunker Lake, the fishing game of the Punch Cigars and
// Bassmaster giveaway (bassmaster.moosebeta.com's lib/game), as plain functions on a fixed step. The lure sinks by
// itself and is steered left and right; fish and snags rise past it; the first touch ends the cast, a catch the heavier
// the deeper its fish appeared. The numbers are the original's; what was changed on purpose is in
// .scratch/big-muddy/spec.md. `rand` is Math.random in the game and a fixed sequence in tests. The page is
// src/routes/big-muddy/+page.svelte.

export type Rand = () => number;

/** What is seen of the water, in the rules' units: the original's 800 px width, and a height every device shares. */
export const VIEW = { w: 800, h: 1200 } as const;
/** The hook's place in the view, from its top: the lure hangs here while the water goes by. */
export const LURE_Y = 200;
/** One step of the rules, s. A frame runs as many as its time holds, so a cast is the same at any refresh rate. */
export const STEP = 1 / 120;
/** A foot of depth, units. */
export const FT = 300;
/** The hook, all of the lure that catches or snags. */
export const HOOK = { w: 12, h: 20 } as const;
/** Steering at full, units/s, and how far either side of where it was cast the lure goes. */
export const STEER = 400;
export const REACH = 800;
/** Where a fish or snag appears: this far under the view at least, and as far again as the view's foot is deep. */
export const GAP = 200;
/** Where a cast starts: the hook mid-view, a little under the surface. */
const CAST = { x: (VIEW.w - HOOK.w) / 2, y: 236 } as const;
const SINK_MAX = 3000;

/** The four lures, the first to the last: the speed each starts sinking at, units/s, and gains, units/s². */
export const LURES = [{ v: 50, a: 10 }, { v: 100, a: 15 }, { v: 200, a: 20 }, { v: 300, a: 30 }] as const;
export type Lure = 1 | 2 | 3 | 4;
/** The catch that earns the next lure, lb, by the lure it was caught on; the last has none. */
const EARNS = [10, 30, 50] as const;

export interface Species {
	id: string;
	name: string;
	/** Its box at full size, units. */
	w: number;
	h: number;
	/** How fast it swims across and rises, units/s. */
	swim: number;
	rise: number;
	/** Its weight: the depth term's divisor, the lb a ratio of 1 weighs, and the least it weighs. */
	per: number;
	lb: number;
	min: number;
	/** It first turns within this many whole seconds. */
	turn: number;
}

export const SPECIES = [
	{ id: 'bass', name: 'largemouth bass', w: 250, h: 101, swim: 270, rise: 170, per: 400, lb: 7.5, min: 1, turn: 2 },
	{ id: 'catfish', name: 'blue catfish', w: 300, h: 174, swim: 200, rise: 102, per: 1000, lb: 22.5, min: 0, turn: 5 },
	{ id: 'gar', name: 'alligator gar', w: 500, h: 116, swim: 150, rise: 85, per: 1000, lb: 21, min: 0, turn: 7 }
] as const satisfies readonly Species[];

export type FishId = (typeof SPECIES)[number]['id'];

/** How many of each fish are in the water, and how many snags. */
export const SCHOOL = 5;
export const SNAGS = 8;
/** A snag: its box and how fast it rises, units/s. */
export const SNAG = { w: 50, h: 30, rise: 100 } as const;

export interface Swimmer {
	fish: FishId;
	x: number;
	y: number;
	w: number;
	h: number;
	lb: number;
	/** The way it swims, and how long until it turns, s. */
	dir: 1 | -1;
	turn: number;
}

export interface Snag {
	x: number;
	y: number;
	/** Which of the two it is drawn as. */
	shape: 0 | 1;
}

/** A cast under way: the lure's level, the hook's place and sinking speed, how long it has run, and what is in the water. */
export interface Run {
	lure: Lure;
	x: number;
	y: number;
	vy: number;
	t: number;
	fish: Swimmer[];
	snags: Snag[];
}

/** How a cast ends. */
export type End = { is: 'caught'; fish: FishId; lb: number; depth: number } | { is: 'snagged'; depth: number };

/** A catch kept in the top ten: its fish, weight, the depth it was caught at, ft, and when, epoch ms. */
export interface Catch {
	fish: FishId;
	lb: number;
	depth: number;
	at: number;
}

const isObject = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m);

export const isCatch = (c: unknown): c is Catch =>
	isObject(c) && SPECIES.some((s) => s.id === c.fish) && Number.isInteger(c.lb) && (c.lb as number) >= 0 && Number.isInteger(c.depth) && Number.isFinite(c.at);

export const speciesOf = (id: FishId): Species => SPECIES.find((s) => s.id === id)!;
export const depthOf = (y: number) => Math.round(y / FT);
/** The view's top left corner in the water: the hook is kept mid-view, LURE_Y down. */
export const viewOf = (run: Run) => ({ x: run.x + HOOK.w / 2 - VIEW.w / 2, y: run.y - LURE_Y });

/**
 * A fish appearing at `depth` ft: its weight, lb, and its size as a share of full. The original read `depth + 1` off a
 * string, so the depth counts ten times over, and that is the game's tuning.
 */
export function weigh(s: Species, depth: number, rand: Rand) {
	const ratio = Math.max(0.2, (10 * depth + 1) / s.per + (Math.floor(rand() * 2) + 1) / 20);
	return { lb: Math.max(s.min, Math.floor(Math.round(ratio * s.lb * 10) / 10)), scale: Math.min(ratio, 1.5) };
}

/** Somewhere under the view: across its width, and from GAP below its foot as far again as the foot is deep. */
function below(run: Run, rand: Rand) {
	const v = viewOf(run), foot = v.y + VIEW.h;
	return { x: v.x + rand() * VIEW.w, y: foot + GAP + rand() * foot };
}

function swimmer(s: Species, run: Run, rand: Rand, turn: number): Swimmer {
	const at = below(run, rand), { lb, scale } = weigh(s, depthOf(run.y), rand);
	return { fish: s.id, ...at, w: s.w * scale, h: s.h * scale, lb, dir: rand() < 0.5 ? -1 : 1, turn: 1 + Math.floor(rand() * turn) };
}

/** A cast's first moment on `lure`: the hook just under the surface, every fish and snag below the view. */
export function start(lure: Lure, rand: Rand): Run {
	const run: Run = { lure, ...CAST, vy: LURES[lure - 1].v, t: 0, fish: [], snags: [] };
	for (const s of SPECIES) for (let i = 0; i < SCHOOL; i++) run.fish.push(swimmer(s, run, rand, s.turn));
	for (let i = 0; i < SNAGS; i++) run.snags.push({ ...below(run, rand), shape: i % 2 ? 1 : 0 });
	return run;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const touches = (run: Run, b: { x: number; y: number; w: number; h: number }) =>
	run.x < b.x + b.w && b.x < run.x + HOOK.w && run.y < b.y + b.h && b.y < run.y + HOOK.h;

/**
 * One STEP of `run`, changed in place, steered by `steer` from −1, hard left, to 1: the lure sinks and moves across,
 * the fish swim, turn and rise, the snags rise, and whatever has gone above the view appears again below it, a fish
 * weighed afresh. The cast's end if the hook now touches a fish or a snag, a fish first; else null.
 */
export function step(run: Run, steer: number, rand: Rand): End | null {
	run.t += STEP;
	run.vy = Math.min(SINK_MAX, run.vy + LURES[run.lure - 1].a * STEP);
	run.y += run.vy * STEP;
	run.x = clamp(run.x + clamp(steer, -1, 1) * STEER * STEP, CAST.x - REACH, CAST.x + REACH);
	const top = run.y - LURE_Y;
	for (const [i, f] of run.fish.entries()) {
		const s = speciesOf(f.fish);
		if ((f.turn -= STEP) <= 0) {
			f.dir = f.dir === 1 ? -1 : 1;
			f.turn = 1 + Math.floor(rand() * 4);
		}
		f.x += f.dir * s.swim * STEP;
		f.y -= s.rise * STEP;
		if (f.y + f.h <= top) run.fish[i] = swimmer(s, run, rand, 4);
	}
	for (const [i, s] of run.snags.entries()) {
		s.y -= SNAG.rise * STEP;
		if (s.y + SNAG.h <= top) run.snags[i] = { ...below(run, rand), shape: s.shape ? 0 : 1 };
	}
	const depth = depthOf(run.y), f = run.fish.find((f) => touches(run, f));
	if (f) return { is: 'caught', fish: f.fish, lb: f.lb, depth };
	return run.snags.some((s) => touches(run, { ...s, ...SNAG })) ? { is: 'snagged', depth } : null;
}

/** The lure after a catch of `lb` on `lure`: the next one if the catch earns it. */
export const afterCatch = (lure: Lure, lb: number): Lure => (lure < 4 && lb >= EARNS[lure - 1] ? ((lure + 1) as Lure) : lure);
/** The lure after a snag: the one before, never less than the first. */
export const afterSnag = (lure: Lure): Lure => Math.max(1, lure - 1) as Lure;
