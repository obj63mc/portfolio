// The walk-behind rule (buildout ticket 19) as a pure function of one cursor's successive positions, for the engine and
// for tests; the workshop's Walk preview (art/review.js) mirrors it. Nothing here touches the DOM or the clock.
import type { Point, WalkBehind } from './types';

/**
 * How far, in world px, a cursor may travel after leaving the floor above a staircase (on or above its landing) and still
 * step onto the stairs from that floor, wherever it crosses the stair's edge: a cursor coming off the loft at an angle
 * passes the loft's edge beside the stair before it reaches the flight (Joe, 2026-09-28).
 */
export const LANDING_REACH = 800;

/** A polyline's y at x, flat past either end: a front line or a landing. */
export const lineY = (line: Point[], x: number) => {
	if (x <= line[0].x) return line[0].y;
	for (let i = 1; i < line.length; i++)
		if (x <= line[i].x) return line[i - 1].y + ((line[i].y - line[i - 1].y) * (x - line[i - 1].x)) / (line[i].x - line[i - 1].x);
	return line[line.length - 1].y;
};

export const inOutline = (p: Point, outline: Point[]) => {
	let hit = false;
	for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
		const a = outline[i], b = outline[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
	}
	return hit;
};

/**
 * Whether a step from `from` to `to` comes onto an outline from directly behind it: from above its back edge, the
 * highest the outline reaches at `from`'s x, and heading down more than across. A step from beside the outline, left or
 * right of all of it, or across it at any height, sideways past its back corners included, doesn't.
 */
export const fromBehind = (from: Point, to: Point, outline: Point[]) => {
	let back = Infinity;
	for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
		const a = outline[i], b = outline[j];
		if (a.x > from.x !== b.x > from.x) back = Math.min(back, a.y + ((b.y - a.y) * (from.x - a.x)) / (b.x - a.x));
	}
	return back !== Infinity && from.y < back && to.y - from.y > Math.abs(to.x - from.x);
};

export type Side = 'front' | 'behind';

/**
 * The props a cursor with `sides` can't use: those standing on scenery it is behind. The engine takes their hover and
 * cursor clicks away from the visitor's own cursor; keyboard focus and the DOM buttons themselves are untouched.
 */
export const blocked = (units: WalkBehind[], sides: ReadonlyMap<string, Side>) => units.flatMap((w) => (sides.get(w.key) === 'behind' ? w.props : []));

/**
 * One cursor's side of each walk-behind unit it is on. The side is decided when the cursor steps onto a unit's outline,
 * read where it stepped from, its last position outside the outline: on or below the front line is in front, above it
 * behind. For a staircase, stepping on from on or above its landing is in front too, as is stepping on within
 * LANDING_REACH of travel after leaving that floor. A desk is stricter about behind (Joe, 2026-10-01: the cursor kept
 * going under the lab's desks on its way to the workstation): only stepping on from directly behind it, down over its
 * back edge, is behind; from either side, whatever the height, and from the front it is in front. The side holds until the
 * cursor steps off. A cursor that appears or jumps (a scene entry, a reset, a peer snap) takes the side of the point it
 * lands on, which on a desk is in front.
 */
export function walker(units: WalkBehind[], reach = LANDING_REACH) {
	const sides = new Map<string, Side>();
	const sinceLanding = new Map<string, number>();
	let last: Point | null = null;
	return {
		step(p: Point, jump = false): ReadonlyMap<string, Side> {
			if (jump) (last = null), sides.clear(), sinceLanding.clear();
			const moved = last ? Math.hypot(p.x - last.x, p.y - last.y) : Infinity;
			for (const w of units) {
				if (w.landing) sinceLanding.set(w.key, p.y <= lineY(w.landing, p.x) ? 0 : (sinceLanding.get(w.key) ?? Infinity) + moved);
				if (!inOutline(p, w.outline)) {
					sides.delete(w.key);
					continue;
				}
				if (sides.has(w.key)) continue;
				const from = last && !inOutline(last, w.outline) ? last : p;
				const fromAbove = !!w.landing && (from.y <= lineY(w.landing, from.x) || sinceLanding.get(w.key)! <= reach);
				const front = w.desk ? !fromBehind(from, p, w.outline) : from.y >= lineY(w.front, from.x) || fromAbove;
				sides.set(w.key, front ? 'front' : 'behind');
			}
			last = p;
			return sides;
		}
	};
}
