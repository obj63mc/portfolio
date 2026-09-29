// Peer interpolation (buildout ticket 13), carried over from the cursor sync prototype's net.ts as pure functions of a
// clock in ms: each peer is drawn DELAY behind the positions received for it, so there is always a segment to glide
// along between two frames.
import type { Point, Rect } from '../scenes/types';

/** A position received at `t`, ms on the receiver's clock. */
export interface Snap extends Point {
	t: number;
}

/** How far behind its positions a peer is drawn, ms: two intervals at 20 Hz. */
export const DELAY = 100;
/** A jump longer than this, world px (a door, the Arch reset), snaps instead of gliding. */
const SNAP = 400;
/** Positions kept per peer: enough to cover DELAY with a late frame. */
const KEEP = 4;
/** World px round the view where a peer is still drawn: an arrow whose tip is just off the top left reaches in. */
const MARGIN = 100;

/**
 * Records a position received at `t`. After a pause (nothing for over two intervals: the peer stood still, since frames
 * carry only cursors that moved) its last position is pinned one interval back, so it sets off from there instead of
 * jumping most of the way at once.
 */
export function record(snaps: Snap[], x: number, y: number, t: number, interval: number) {
	const last = snaps.at(-1);
	if (last && t - last.t > 2 * interval) snaps.push({ t: t - interval, x: last.x, y: last.y });
	snaps.push({ t, x, y });
	if (snaps.length > KEEP) snaps.splice(0, snaps.length - KEEP);
}

/** Where a peer is drawn at `now`: DELAY behind, between the positions around then; null before its first position. */
export function sample(snaps: Snap[], now: number): Point | null {
	const t = now - DELAY;
	for (let i = 1; i < snaps.length; i++) {
		const a = snaps[i - 1], b = snaps[i];
		if (t <= a.t) break;
		if (t > b.t) continue;
		if (Math.hypot(b.x - a.x, b.y - a.y) > SNAP) return { x: b.x, y: b.y };
		const u = (t - a.t) / (b.t - a.t);
		return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
	}
	const at = t <= (snaps[0]?.t ?? 0) ? snaps[0] : snaps.at(-1);
	return at ? { x: at.x, y: at.y } : null;
}

/** Whether a peer is near enough the view, a world rect, to interpolate and draw; off-camera peers are neither. */
export const visible = (snaps: Snap[], view: Rect) => {
	const p = snaps.at(-1);
	return !!p && p.x > view.x - MARGIN && p.y > view.y - MARGIN && p.x < view.x + view.w + MARGIN && p.y < view.y + view.h + MARGIN;
};
