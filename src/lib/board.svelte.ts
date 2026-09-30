// The Carondelet lap board (Joe, 2026-09-30): after each finished lap, its time over the visitor's top ten, for a few
// seconds. The engine's lap timer (engine/laps.ts) shows and hides it; LapBoard.svelte draws it from here and the saved
// laps.
import type { Lap } from './saved.ts';

/** A lap time as a race clock shows it, to the tenth, cut rather than rounded: 0:42.3, 1:05.0. */
export const clock = (ms: number) => {
	const tenths = Math.floor(ms / 100);
	return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
};

/** The lap just finished, recorded at epoch ms `at`, and whether it was a new personal best; none between showings. */
export const board = $state<{ lap: (Lap & { best: boolean }) | null }>({ lap: null });
