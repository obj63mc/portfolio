// The Carondelet lap timer on screen (buildout ticket 18): track.ts times the cursor round the lake loop; this shows the
// running time and, at the finish, the lap board (Joe, 2026-09-30): the lap's time over the visitor's top ten, kept
// through the persistence module, while the clock runs on into the next lap. Only the finish is announced, never the
// ticking clock.
import { board, clock } from '../board.svelte.ts';
import { saved } from '../saved.svelte.ts';
import { sound } from '../sound.svelte.ts';
import type { Point } from '../scenes/types';
import { LOOP, ride, type Lap, type LapEvent } from './track.ts';

/** How long the lap board stays up after a finish, and a lost lap's notice, ms. */
const NOTE = { board: 8000, lost: 1500 };

const said = (ms: number) => `${(Math.floor(ms / 100) / 10).toFixed(1)} seconds`;

export class Laps {
	private lap: Lap = { is: 'idle', s: null };
	/** A lost lap's notice, up until `until` (ms). */
	private note: { text: string; until: number } | null = null;
	/** When the lap board comes down (ms). */
	private boardUntil = 0;
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
		const was = this.lap;
		[this.lap, e] = ride(LOOP, this.lap, p, now);
		if (import.meta.env.DEV) {
			// In dev, the console says what the timer did, and where a riding cursor left the course.
			if (e) console.debug(`[lap] ${e.is}${e.is === 'lap' ? ` ${clock(e.ms)}` : ''}`);
			const lap = this.lap, wasOff = was.is === 'riding' && was.off !== null;
			if (lap.is === 'riding' && lap.off !== null && !wasOff && p)
				console.debug(`[lap] off the course ${Math.round(lap.run)} px into the lap, at (${Math.round(p.x)}, ${Math.round(p.y)})`);
		}
		if (e?.is === 'lap') {
			const at = Date.now(), record = saved.lap(e.ms, at), best = saved.laps[0]?.ms ?? e.ms;
			// The finish-line beep on a new personal best (ticket 22).
			if (record) sound.play('best-lap');
			board.lap = { ms: e.ms, at, best: record };
			this.boardUntil = now + NOTE.board;
			this.live.textContent = record ? `Lap ${said(e.ms)}, a new best` : `Lap ${said(e.ms)}. Best ${said(best)}`;
		} else if (e?.is === 'cancel') this.note = { text: 'Lap lost', until: now + NOTE.lost };
		if (this.note && now >= this.note.until) this.note = null;
		if (board.lap && now >= this.boardUntil) board.lap = null;
		const lap = this.lap, text = this.note?.text ?? (lap.is === 'riding' ? `Lap ${clock(now - lap.from)}` : '');
		// Off the course, within the grace, the running time dims.
		this.readout.classList.toggle('off', !this.note && lap.is === 'riding' && lap.off !== null);
		if (text === this.shown) return;
		this.shown = this.readout.textContent = text;
		this.readout.hidden = !text;
	}
}
