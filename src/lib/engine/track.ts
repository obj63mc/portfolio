// The Carondelet lap timer (buildout ticket 18) and the course it times, the lake loop in the overworld's scene data,
// which the rider rides too (motion.ts). Pure functions of positions and a clock, for the engine and for tests. The
// timer is forgiving, for a thumb on a phone's joystick (Joe, 2026-09-29): a corridor wider than the painted path, and
// a moment off it before a lap is lost.
import type { Point } from '../scenes/types';

/** A closed loop: its points, the distance along it to each (world px from the start line) and its length. */
export interface Course {
	path: Point[];
	at: number[];
	length: number;
	/** The painted path's half-width. */
	half: number;
}

export function course({ path, half }: { path: Point[]; half: number }): Course {
	const at = [0];
	for (let i = 1; i <= path.length; i++) at.push(at[i - 1] + Math.hypot(path[i % path.length].x - path[i - 1].x, path[i % path.length].y - path[i - 1].y));
	return { path, at, length: at[path.length], half };
}

/** The point `s` world px along the loop from the start line, and the way the path runs there, a unit vector. */
export function along(c: Course, s: number) {
	s = ((s % c.length) + c.length) % c.length;
	let i = 0;
	while (i < c.path.length - 1 && c.at[i + 1] <= s) i++;
	const a = c.path[i], b = c.path[(i + 1) % c.path.length], len = c.at[i + 1] - c.at[i], u = (s - c.at[i]) / len;
	return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}

/** The shortest way from `a` to `b` round the loop, signed: positive the way the path runs. */
const delta = (c: Course, a: number, b: number) => ((((b - a) % c.length) + 1.5 * c.length) % c.length) - c.length / 2;

/**
 * Where `p` is on the loop: the distance along it `s` of the nearest point, and how far `p` is from it. With `near`,
 * only the loop within REACH of that distance is searched, so a cursor is followed along the path and never jumps
 * across the lake to the other side's.
 */
export function locate(c: Course, p: Point, near?: number) {
	let best = { s: 0, d: Infinity };
	const n = c.path.length;
	for (let i = 0; i < n; i++) {
		const a = c.path[i], b = c.path[(i + 1) % n], len = c.at[i + 1] - c.at[i];
		let lo = 0, hi = 1;
		if (near !== undefined) {
			// The part of this segment within REACH of `near`, as fractions of it.
			const from = delta(c, near, c.at[i]);
			lo = Math.max(0, (-REACH - from) / len);
			hi = Math.min(1, (REACH - from) / len);
			if (lo > hi) continue;
		}
		const u = Math.max(lo, Math.min(hi, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
		const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, d = Math.hypot(p.x - x, p.y - y);
		if (d < best.d) best = { s: (c.at[i] + u * len) % c.length, d };
	}
	return best;
}

/** How far past the painted edge a cursor still counts as on the course, world px. */
export const CORRIDOR = 70;
/** How long a cursor may be off the course before its lap is lost, ms. */
export const GRACE = 1000;
/**
 * How far along the loop from where a cursor was last on it the timer looks for it again, world px: as far as the
 * joystick carries it in the grace (600 world px/s), and short of the other side of the lake anywhere, so cutting
 * across it never rejoins the course.
 */
export const REACH = 600;

/**
 * The timer: idle, knowing where on the loop the cursor last was if it was on the course (null if not, or never), to see
 * it cross the line; or riding a lap since `from` (ms), `run` world px of it done the way it goes (`dir`, 1 the way the
 * path runs), last on the course at `s`, and off it since `off`.
 */
export type Lap = { is: 'idle'; s: number | null } | { is: 'riding'; from: number; dir: 1 | -1; run: number; s: number; off: number | null };

/** What a step did: started a lap (or started it again), finished one in `ms`, or lost it. */
export type LapEvent = { is: 'start' } | { is: 'lap'; ms: number } | { is: 'cancel' } | null;

/**
 * One step of the timer: the cursor at `p` (world px) at `t` (ms), or null when it can't ride (paused, a card open,
 * another scene), which loses a lap. A lap starts when the cursor crosses the start line on the course, either way,
 * and finishes when it crosses it again having gone the whole loop that way: each finish starts the next lap.
 */
export function ride(c: Course, lap: Lap, p: Point | null, t: number): [Lap, LapEvent] {
	if (!p) return [{ is: 'idle', s: null }, lap.is === 'riding' ? { is: 'cancel' } : null];
	const limit = c.half + CORRIDOR;
	if (lap.is === 'idle') {
		const at = locate(c, p);
		if (at.d > limit) return [{ is: 'idle', s: null }, null];
		const ds = lap.s === null ? 0 : delta(c, lap.s, at.s);
		// Over the line: from the end of the loop to its start, or back.
		const past = lap.s === null ? 0 : lap.s + ds < 0 ? -1 : lap.s + ds >= c.length ? 1 : 0;
		if (!past) return [{ is: 'idle', s: at.s }, null];
		return [{ is: 'riding', from: t, dir: past, run: past > 0 ? at.s : c.length - at.s, s: at.s, off: null }, { is: 'start' }];
	}
	const at = locate(c, p, lap.s);
	if (at.d > limit) {
		const off = lap.off ?? t;
		return t - off > GRACE ? [{ is: 'idle', s: null }, { is: 'cancel' }] : [{ ...lap, off }, null];
	}
	const run = lap.run + lap.dir * delta(c, lap.s, at.s);
	// Back over the line the other way: a lap that way instead.
	if (run < 0) return [{ is: 'riding', from: t, dir: lap.dir === 1 ? -1 : 1, run: -run, s: at.s, off: null }, { is: 'start' }];
	if (run >= c.length) return [{ is: 'riding', from: t, dir: lap.dir, run: run - c.length, s: at.s, off: null }, { is: 'lap', ms: t - lap.from }];
	return [{ ...lap, run, s: at.s, off: null }, null];
}
