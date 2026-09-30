// The river current (buildout ticket 20), carried over from the pointer-lock prototype's river.ts as a pure function of one
// cursor's successive positions and the frame's seconds, for the engine and for tests. Nothing here touches the DOM or the
// clock.
import type { Overworld, Point } from './types';
import { inOutline } from './walk.ts';

/** The drift, world px a second south. */
export const CURRENT = 150;
/** How long a cursor must be left still in the water before it floats, seconds (Joe, 2026-09-30). */
export const STILL = 1;

/**
 * On a bank or the deck; or in the river, where it was last frame (`at`) and how long it has been left still there,
 * seconds: from STILL on it floats.
 */
export type Current = { is: 'ashore' } | { is: 'afloat'; at: Point; still: number };

export const ASHORE: Current = { is: 'ashore' };

/**
 * One frame of `dt` seconds for a cursor at `p`, `stirred` if the visitor moved it this frame (a mouse, the keys, the
 * joystick, a drag). It goes afloat stepping onto the water from a bank or off the deck, stays afloat under the deck, and
 * comes ashore on either bank. In the water it floats only once it has been left still for STILL seconds: stirred, or
 * moved by anything else before it floats (the camera's push under a still mouse), it starts the count again. Floating,
 * the current carries it `dy` world px south this frame, and the push that follows the drift doesn't stop it; anything
 * the visitor does does. A floating cursor at or past the south end is washed out, `end`, which puts the visitor back at
 * the Arch; one moving about there is not (Joe, 2026-09-30).
 */
export function flow(river: Overworld['river'], was: Current, p: Point, dt: number, stirred: boolean): { is: Current | { is: 'end' }; dy: number } {
	if (!inOutline(p, river.mask) || (was.is === 'ashore' && inOutline(p, river.deck))) return { is: ASHORE, dy: 0 };
	const floating = was.is === 'afloat' && was.still >= STILL && !stirred;
	if (floating && p.y >= river.southEndY) return { is: { is: 'end' }, dy: 0 };
	const moved = was.is === 'ashore' || stirred || (!floating && (p.x !== was.at.x || p.y !== was.at.y));
	return { is: { is: 'afloat', at: p, still: moved ? 0 : was.still + dt }, dy: floating ? CURRENT * dt : 0 };
}
