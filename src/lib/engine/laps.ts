// The Carondelet lap timer on screen (buildout ticket 18): track.ts times the cursor round the lake loop; this shows the
// running time and, at the finish, the lap and the personal best, kept through the persistence module. Only the
// finish is announced, never the ticking clock.
import { saved } from '../saved.svelte.ts';
import { OVERWORLD } from '../scenes/overworld.ts';
import type { Point } from '../scenes/types';
import { course, ride, type Lap, type LapEvent } from './track.ts';

const LOOP = course(OVERWORLD.track);
/** How long a finished lap's time stays up, and a lost lap's notice, ms. */
const NOTE = { lap: 4000, lost: 1500 };

/** A lap time as a race clock shows it, to the tenth, cut rather than rounded: 0:42.3, 1:05.0. */
const clock = (ms: number) => {
	const tenths = Math.floor(ms / 100);
	return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
};
const said = (ms: number) => `${(Math.floor(ms / 100) / 10).toFixed(1)} seconds`;

export class Laps {
	private lap: Lap = { is: 'idle', s: null };
	/** A finished or lost lap's notice, up until `until` (ms). */
	private note: { text: string; until: number } | null = null;
	private shown = '';
	private readout: HTMLElement;
	private live: HTMLElement;

	/** `readout` shows the time on screen; `live` is the page's polite live region. */
	constructor(readout: HTMLElement, live: HTMLElement) {
		this.readout = readout;
		this.live = live;
	}

	/** One frame: the cursor's world position on the overworld at `now` (ms), or null when it can't ride. */
	step(p: Point | null, now: number) {
		let e: LapEvent;
		[this.lap, e] = ride(LOOP, this.lap, p, now);
		if (e?.is === 'lap') {
			const first = saved.lap(e.ms, Date.now()), best = saved.laps[0]?.ms ?? e.ms;
			// Ticket 22's finish-line beep plays here, on a new personal best.
			this.note = { text: first ? `New best ${clock(e.ms)}` : `Lap ${clock(e.ms)}, best ${clock(best)}`, until: now + NOTE.lap };
			this.live.textContent = first ? `Lap ${said(e.ms)}, a new best` : `Lap ${said(e.ms)}. Best ${said(best)}`;
		} else if (e?.is === 'cancel') this.note = { text: 'Lap lost', until: now + NOTE.lost };
		if (this.note && now >= this.note.until) this.note = null;
		const lap = this.lap, text = this.note?.text ?? (lap.is === 'riding' ? `Lap ${clock(now - lap.from)}` : '');
		// Off the course, within the grace, the running time dims.
		this.readout.classList.toggle('off', !this.note && lap.is === 'riding' && lap.off !== null);
		if (text === this.shown) return;
		this.shown = this.readout.textContent = text;
		this.readout.hidden = !text;
	}
}
