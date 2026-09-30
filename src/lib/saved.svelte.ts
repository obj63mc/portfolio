// The one module that touches localStorage (spec: "Persistence"): what the visitor keeps between visits, as Svelte 5
// state for the engine, the sound module, analytics and the UI to read and change through it. The rules are saved.ts's.
// Every change is written at once, merged over what another tab may have stored since, and never on unload; where storage
// throws (blocked site data, a private window) the session runs from memory, with no message.
import { KEY, addLap, fresh, gold, grant, merge, read, type Lap, type Saved } from './saved.ts';
import type { CosmeticId } from './scenes/types';

function load() {
	try {
		return read(localStorage.getItem(KEY));
	} catch {
		return fresh();
	}
}

// Replaced whole on every change, so it needs no deep proxy.
let data = $state.raw(load());

function save(next: Saved) {
	try {
		next = merge(read(localStorage.getItem(KEY)), next);
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// Kept in memory for this session.
	}
	data = next;
}

// Another tab wrote: its cosmetics, laps and choices apply here as the last writer's. The engine sees a new worn cosmetic,
// pops it on and tells this tab's room, and plays nothing. Ticket 23: a consent denial arriving here is where this tab
// sends `consent update denied`.
if (typeof window !== 'undefined') addEventListener('storage', (e) => { if (e.key === KEY) data = merge(data, read(e.newValue)); });

export const saved = {
	/** The cosmetic worn, 0 for none. */
	get worn() {
		return data.worn;
	},
	/** Every cosmetic this build knows is earned: the gold cursor, derived and never stored. */
	get gold() {
		return gold(data.earned);
	},
	/** Personal best laps, fastest first, at most ten. */
	get laps(): readonly Lap[] {
		return data.laps.best;
	},
	get sound() {
		return data.sound;
	},
	get analytics() {
		return data.analytics;
	},
	/** A granting prop's click: its cosmetic is worn; true the first time, when it is earned. */
	grant(id: CosmeticId) {
		const g = grant(data, id);
		if (g.first || g.saved.worn !== data.worn) save(g.saved);
		return g.first;
	},
	/** Records a completed lap at epoch ms `at`: written if it enters the top ten; true when it is a new personal best. */
	lap(ms: number, at: number) {
		const l = addLap(data, { ms, at });
		if (l.entered) save(l.saved);
		return l.best;
	}
};
