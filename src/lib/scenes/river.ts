// The river current (buildout ticket 20), carried over from the pointer-lock prototype's river.ts as a pure function of one
// cursor's successive positions and the frame's seconds, for the engine and for tests. Nothing here touches the DOM or the
// clock.
import type { Overworld, Point, Rect } from './types';
import { inOutline, lineY } from './walk.ts';

/** The drift, world px a second south. */
export const CURRENT = 150;
/** How long a cursor must be left still in the water before it floats, seconds (Joe, 2026-09-30). */
export const STILL = 1;
/** The own cursor's arrow, world px right and down from its tip at full size: what a float keeps clear of obstacles. */
export const ARROW = { w: 26, h: 40 };
/** How far either side a float looks for open water round what blocks it, world px, and how finely. */
const SEARCH = { reach: 600, step: 4 };

/**
 * On a bank or the deck; or in the river, where it was last frame (`at`) and how long it has been left still there,
 * seconds: from STILL on it floats.
 */
export type Current = { is: 'ashore' } | { is: 'afloat'; at: Point; still: number };

export const ASHORE: Current = { is: 'ashore' };

/**
 * One frame of `dt` seconds for a cursor at `p`, `stirred` if the visitor moved it this frame (a mouse, the keys, the
 * joystick, a drag). It goes afloat stepping onto the water from a bank or off the deck, stays afloat under the deck, and
 * comes ashore on either bank; a cursor on a deck crosses it ashore. In the water it floats only once it has been left
 * still for STILL seconds: stirred, or moved by anything else before it floats (the camera's push under a still mouse),
 * it starts the count again. Floating, the current carries it `d` world px this frame, south and round what stands in the
 * water (`carry`), and the push that follows the drift doesn't stop it; anything the visitor does does. A floating cursor
 * at or past the river's end is washed out, `end`, which puts the visitor back at the Arch; one moving about there is not
 * (Joe, 2026-09-30).
 */
export function flow(river: Overworld['river'], was: Current, p: Point, dt: number, stirred: boolean): { is: Current | { is: 'end' }; d: Point } {
	if (!inOutline(p, river.mask) || (was.is === 'ashore' && river.decks.some((d) => inOutline(p, d)))) return { is: ASHORE, d: { x: 0, y: 0 } };
	const floating = was.is === 'afloat' && was.still >= STILL && !stirred;
	if (floating && p.y >= lineY(river.southEnd, p.x)) return { is: { is: 'end' }, d: { x: 0, y: 0 } };
	const moved = was.is === 'ashore' || stirred || (!floating && (p.x !== was.at.x || p.y !== was.at.y));
	return { is: { is: 'afloat', at: p, still: moved ? 0 : was.still + dt }, d: floating ? carry(river, p, CURRENT * dt) : { x: 0, y: 0 } };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A floating cursor may be at `p`: its tip on the water, its arrow clear of everything standing in it. */
const open = (river: Overworld['river'], p: Point) =>
	inOutline(p, river.mask) && !river.obstacles.some((o) => overlaps(o, { ...p, ...ARROW }));

/**
 * The current's step of `s` world px from `p`: straight south, or, where a pier, a boat or the bank is in the way, toward
 * the nearest open water that far south on either side, diagonally where that is open and sideways where it isn't. So a
 * floating cursor drifts round what stands in the water and follows the banks, never carried through or ashore; with no
 * open way within reach it waits. An obstacle by a bank reaches the bank, so no float is pinched between them.
 */
function carry(river: Overworld['river'], p: Point, s: number): Point {
	const y = p.y + s, at = (d: Point) => open(river, { x: p.x + d.x, y: p.y + d.y });
	if (at({ x: 0, y: s })) return { x: 0, y: s };
	// A cursor the visitor left inside something works its way out sideways.
	const stuck = !open(river, p);
	for (let off = SEARCH.step; off <= SEARCH.reach; off += SEARCH.step)
		for (const x of [p.x - off, p.x + off]) {
			if (!open(river, { x, y })) continue;
			const dx = x - p.x, k = s / Math.hypot(dx, s), slant = { x: dx * k, y: s * k }, side = { x: Math.sign(dx) * Math.min(s, Math.abs(dx)), y: 0 };
			if (at(slant)) return slant;
			if (stuck || at(side)) return side;
		}
	return { x: 0, y: 0 };
}
