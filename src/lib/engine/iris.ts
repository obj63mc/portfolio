// The iris between scenes (Joe, 2026-09-30, amending ticket 11): leaving a scene, black closes in from the screen's edges
// to a point on the door; the new scene opens out of the black from a point on where the visitor lands, once its tiles in
// view have arrived. Pure functions of the clock; the engine steps it each frame and cursors.ts draws it over everything
// on the overlay canvas, the cursors included. Reduced motion never starts it: the hop is a cut.
import type { Point } from '../scenes/types';

/**
 * Closing and opening take this long, ms. Landed, the new scene waits at most `wait` for its tiles before opening anyway;
 * shut with nothing landed (a navigation that never happened), it opens again where it closed after `stranded`.
 */
export const IRIS = { close: 450, open: 600, wait: 800, stranded: 2000 } as const;

/** Open, drawing nothing; closing on `at`, CSS px, from `t0` (performance.now() ms); shut; or opening out of `at`. */
export type Iris =
	| { is: 'open' }
	| { is: 'closing'; at: Point; t0: number }
	| { is: 'shut'; at: Point; t0: number; landed: boolean }
	| { is: 'opening'; at: Point; t0: number };

export const OPEN: Iris = { is: 'open' };

/** The radius, CSS px, that uncovers the whole view from `at`: the distance to its farthest corner. */
export const reach = (at: Point, view: { w: number; h: number }) => Math.hypot(Math.max(at.x, view.w - at.x), Math.max(at.y, view.h - at.y));

/** Eased in and out, so the circle starts gently and settles; `unease` is its inverse. */
const ease = (t: number) => t * t * (3 - 2 * t);
const unease = (e: number) => 0.5 - Math.sin(Math.asin(1 - 2 * e) / 3);
const progress = (now: number, t0: number, ms: number) => Math.max(0, Math.min(1, (now - t0) / ms));

/** The hole's radius at `now`, CSS px: 0 shut, and null open, when there is nothing to draw. */
export function hole(iris: Iris, now: number, view: { w: number; h: number }): number | null {
	if (iris.is === 'open') return null;
	if (iris.is === 'shut') return 0;
	const r = reach(iris.at, view);
	return iris.is === 'closing' ? r * (1 - ease(progress(now, iris.t0, IRIS.close))) : r * ease(progress(now, iris.t0, IRIS.open));
}

/**
 * The iris closing on `at` from `now`. One still opening, a hop left just after it landed, closes on `at` too, from the
 * size its hole has got to, so it never widens first. One closing or shut carries on.
 */
export function closing(iris: Iris, at: Point, now: number, view: { w: number; h: number }): Iris {
	if (iris.is === 'closing' || iris.is === 'shut') return iris;
	if (iris.is === 'open') return { is: 'closing', at, t0: now };
	const left = Math.min(1, hole(iris, now, view)! / reach(at, view));
	return { is: 'closing', at, t0: now - unease(1 - left) * IRIS.close };
}

/**
 * The iris at `now`: closing ends shut; shut and landed, it opens once `ready` (the new scene's tiles in view) or after
 * `wait`; shut with nothing landed, it opens after `stranded`; opening ends open.
 */
export function advance(iris: Iris, now: number, ready: boolean): Iris {
	switch (iris.is) {
		case 'open':
			return iris;
		case 'closing':
			return now - iris.t0 < IRIS.close ? iris : { is: 'shut', at: iris.at, t0: now, landed: false };
		case 'shut':
			return (iris.landed ? ready || now - iris.t0 >= IRIS.wait : now - iris.t0 >= IRIS.stranded) ? { is: 'opening', at: iris.at, t0: now } : iris;
		case 'opening':
			return now - iris.t0 < IRIS.open ? iris : OPEN;
	}
}
