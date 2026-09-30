// Horizon scaling (buildout ticket 19): cursors shrink toward a depth region's horizon, as pure functions of a cursor's
// world position and the clock, for the engine and for tests; and each cursor followed frame to frame, its drawn factor
// with its side of the walk-behind scenery (walk.ts). Local drawing only: nothing here crosses the wire.
import { walker, type Side } from '../scenes/walk.ts';
import type { DepthRegion, Point, WalkBehind } from '../scenes/types';

/** The factor at and above a region's horizon; 1 at its foreground line and outside every region. */
export const FAR = 0.85;
/** Crossing into another region eases the drawn factor over this long, ms. */
export const EASE = 150;

/** The first region whose rect holds `p`, owning its left and top edges; -1 outside every region. */
const regionAt = (regions: DepthRegion[], p: Point) =>
	regions.findIndex(({ rect: r }) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);

/** The region's factor at `y`: 1 at its foreground line and below, 0.85 at its horizon and above, linear between. */
function along(r: DepthRegion, y: number) {
	const span = r.foregroundY - r.horizonY;
	const u = span > 0 ? (r.foregroundY - y) / span : y > r.horizonY ? 0 : 1;
	return 1 - (1 - FAR) * Math.max(0, Math.min(1, u));
}

/** The depth factor at world point `p`: its region's, or 1 outside every region. */
export function factor(regions: DepthRegion[], p: Point) {
	const i = regionAt(regions, p);
	return i < 0 ? 1 : along(regions[i], p.y);
}

/**
 * A cursor's drawn factor `d`, the region it is in, and the ease it is in after crossing into that region: from the
 * factor drawn when it crossed, at `t0` (ms).
 */
export interface Depth {
	d: number;
	region: number;
	from: number;
	t0: number;
}

const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * The drawn factor at `p` at time `now` (ms), from the last frame's `prev`. Within a region it follows the cursor at
 * once; crossing into another region (or out of every one) it eases over EASE ms from what was drawn, so a region with
 * another horizon never snaps the cursor's size. A cursor that first appears or `jump`s (a scene entry, a reset, a peer
 * snap) takes the factor of where it lands.
 */
export function depth(prev: Depth | null, regions: DepthRegion[], p: Point, now: number, jump = false): Depth {
	const region = regionAt(regions, p), target = region < 0 ? 1 : along(regions[region], p.y);
	if (!prev || jump) return { d: target, region, from: target, t0: -Infinity };
	const crossed = region !== prev.region, from = crossed ? prev.d : prev.from, t0 = crossed ? now : prev.t0;
	const u = (now - t0) / EASE;
	return { d: u >= 1 ? target : from + (target - from) * smooth(Math.max(0, u)), region, from, t0 };
}

/**
 * One cursor, the visitor's own or a peer's, followed frame to frame through a scene: its drawn depth factor and its side
 * of each walk-behind unit it is on, from its successive world positions. A scene entry is a new follower; a reset or a
 * peer's snap is a `jump`, and the cursor takes the factor and the sides of where it lands.
 */
export function follower(scene: { depth: DepthRegion[]; walkBehind?: WalkBehind[] }) {
	const walk = walker(scene.walkBehind ?? []);
	let d: Depth | null = null, last: Point | null = null;
	return {
		/** Where it was last stepped to; null before its first step. */
		get last() {
			return last;
		},
		step(p: Point, now: number, jump = false): { d: number; sides: ReadonlyMap<string, Side> } {
			d = depth(d, scene.depth, p, now, jump);
			const sides = walk.step(p, jump);
			last = p;
			return { d: d.d, sides };
		}
	};
}
