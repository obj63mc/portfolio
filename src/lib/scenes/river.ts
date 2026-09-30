// The river current (buildout ticket 20), carried over from the pointer-lock prototype's river.ts as a pure function of one
// cursor's successive positions and the frame's seconds, for the engine and for tests. Nothing here touches the DOM or the
// clock.
import type { Overworld, Point } from './types';
import { inOutline } from './walk.ts';

/** The drift, world px a second south. */
export const CURRENT = 150;

/** On a bank or the deck, or in the river, drifting. */
export type Current = 'ashore' | 'afloat';

/**
 * One frame of `dt` seconds for a cursor at `p` that `was` ashore or afloat: it goes afloat stepping onto the water from a
 * bank or off the deck, stays afloat under the deck, and comes ashore on either bank. Afloat, the current carries it `dy`
 * world px south this frame, which the visitor's own input adds to. On the water at or past the south end it is washed out,
 * `end`, which puts the visitor back at the Arch.
 */
export function flow(river: Overworld['river'], was: Current, p: Point, dt: number): { is: Current | 'end'; dy: number } {
	const is = !inOutline(p, river.mask) || (was === 'ashore' && inOutline(p, river.deck)) ? 'ashore' : p.y >= river.southEndY ? 'end' : 'afloat';
	return { is, dy: is === 'afloat' ? CURRENT * dt : 0 };
}
