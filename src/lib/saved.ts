// What a visitor keeps between visits (spec: "Persistence"), as pure functions: the one localStorage value's shape, its
// read rules and the merge every write makes with what another tab may have written since. Only saved.svelte.ts touches
// the storage itself.
import { KNOWN, isCosmetic } from './cosmetics.ts';
import type { CosmeticId } from './scenes/types';
import { isCatch, type Catch, type Lure } from './big-muddy/rules.ts';
import { NAME_MAX, readGame, type Game } from './sushi/game.ts';

/** The one localStorage key. */
export const KEY = 'stl-portfolio';
/** The schema's version: a newer one, from a later build, starts this one fresh. */
export const VERSION = 1;
/** The Carondelet track's version: laps ridden on another are dropped. */
export const TRACK = 1;

/** A lap: its time and when it was ridden, epoch ms. */
export interface Lap {
	ms: number;
	at: number;
}

/** A finished game of Sushi Stand: the stand's name, its five days' profit in whole dollars, and when, epoch ms. */
export interface Stand {
	name: string;
	profit: number;
	at: number;
}

export interface Saved {
	v: typeof VERSION;
	/** The cosmetic worn, 0 for none. */
	worn: number;
	/** Every cosmetic earned, sorted, ids a newer build knows included. */
	earned: number[];
	/** The personal top ten on this version of the track, fastest first. */
	laps: { track: number; best: Lap[] };
	sound: boolean;
	/** The personal Sushi Stand top ten, most profit first; absent until a game is finished. */
	stands?: Stand[];
	/** The game of Sushi Stand left unfinished (sushi/game.ts); absent with none in progress. */
	sushi?: Game;
	/** The personal Big Muddy top ten, heaviest first; absent until a fish is caught. */
	catches?: Catch[];
	/** The Big Muddy lure earned (big-muddy/rules.ts); absent on the first. */
	lure?: Exclude<Lure, 1>;
	/** The analytics choice, absent until the visitor makes one. */
	analytics?: 'granted' | 'denied';
}

const isObject = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m);
const isLap = (l: unknown): l is Lap => isObject(l) && typeof l.ms === 'number' && l.ms > 0 && Number.isFinite(l.ms) && Number.isFinite(l.at);

const isStand = (s: unknown): s is Stand =>
	isObject(s) && typeof s.name === 'string' && s.name.length <= NAME_MAX && Number.isInteger(s.profit) && Number.isFinite(s.at);

/** Earned ids, sorted and without repeats. */
const ids = (earned: number[]) => [...new Set(earned)].sort((a, b) => a - b);
/** The fastest ten, fastest first, without repeats. */
const fastest = (laps: Lap[]) =>
	laps
		.filter((l, i) => laps.findIndex((m) => m.ms === l.ms && m.at === l.at) === i)
		.sort((a, b) => a.ms - b.ms)
		.slice(0, 10)
		.map(({ ms, at }) => ({ ms, at }));
/** The ten most profitable, most first, the earlier of a tie first, without repeats. */
const richest = (stands: Stand[]) =>
	stands
		.filter((s, i) => stands.findIndex((m) => m.at === s.at && m.name === s.name && m.profit === s.profit) === i)
		.sort((a, b) => b.profit - a.profit || a.at - b.at)
		.slice(0, 10)
		.map(({ name, profit, at }) => ({ name, profit, at }));
/** The stands field as stored: absent while there are none. */
const standsField = (stands: Stand[]) => (stands.length ? { stands: richest(stands) } : {});
/** The ten heaviest catches, heaviest first, then the deeper, then the earlier, without repeats. */
const heaviest = (catches: Catch[]) =>
	catches
		.filter((c, i) => catches.findIndex((m) => m.at === c.at && m.fish === c.fish && m.lb === c.lb) === i)
		.sort((a, b) => b.lb - a.lb || b.depth - a.depth || a.at - b.at)
		.slice(0, 10)
		.map(({ fish, lb, depth, at }) => ({ fish, lb, depth, at }));
/** The catches field as stored: absent while there are none. */
const catchesField = (catches: Catch[]) => (catches.length ? { catches: heaviest(catches) } : {});
/** The worn cosmetic if it is one this build knows and it was earned, else none. */
const wearable = (worn: unknown, earned: number[]) => (isCosmetic(worn) && earned.includes(worn) ? worn : 0);

export const fresh = (): Saved => ({ v: VERSION, worn: 0, earned: [], laps: { track: TRACK, best: [] }, sound: true });

/**
 * The stored text, each field validated on its own, a bad one reset to its default: nothing stored, bad JSON or a newer
 * version is a fresh start. Earned ids this build doesn't know are kept, for a newer build in another tab.
 */
export function read(text: string | null): Saved {
	let m: unknown;
	try {
		m = JSON.parse(text ?? '');
	} catch {
		return fresh();
	}
	if (!isObject(m) || (typeof m.v === 'number' && m.v > VERSION)) return fresh();
	const earned = ids(Array.isArray(m.earned) ? m.earned.filter((id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0) : []);
	const laps = m.laps, best = isObject(laps) && laps.track === TRACK && Array.isArray(laps.best) ? laps.best.filter(isLap) : [];
	const sushi = readGame(m.sushi);
	return {
		v: VERSION,
		worn: wearable(m.worn, earned),
		earned,
		laps: { track: TRACK, best: fastest(best) },
		sound: typeof m.sound === 'boolean' ? m.sound : true,
		...standsField(Array.isArray(m.stands) ? m.stands.filter(isStand) : []),
		...(sushi && { sushi }),
		...catchesField(Array.isArray(m.catches) ? m.catches.filter(isCatch) : []),
		...(m.lure === 2 || m.lure === 3 || m.lure === 4 ? { lure: m.lure } : {}),
		...(m.analytics === 'granted' || m.analytics === 'denied' ? { analytics: m.analytics } : {})
	};
}

/**
 * What a write stores: this tab's state `mine` merged with what is `stored` now, which another tab may have written
 * since this one read it. Earned is a union, laps keep the fastest ten, stands the richest and catches the heaviest;
 * worn, sound, the Sushi Stand game in progress (or none) and the Big Muddy lure are this tab's, the last writer's, and
 * so is the analytics choice once this tab has one.
 */
export function merge(stored: Saved, mine: Saved): Saved {
	const analytics = mine.analytics ?? stored.analytics;
	return {
		...mine,
		earned: ids([...stored.earned, ...mine.earned]),
		laps: { track: TRACK, best: fastest([...stored.laps.best, ...mine.laps.best]) },
		...standsField([...(stored.stands ?? []), ...(mine.stands ?? [])]),
		...catchesField([...(stored.catches ?? []), ...(mine.catches ?? [])]),
		...(analytics && { analytics })
	};
}

/** Gold: every cosmetic this build knows is earned. Derived, never stored; ids only a newer build knows don't count. */
export const gold = (earned: readonly number[], known: readonly number[] = KNOWN) => known.every((id) => earned.includes(id));

/** A granting prop's click: its cosmetic is worn, and earned if this is the `first` time. */
export function grant(s: Saved, id: CosmeticId) {
	const first = !s.earned.includes(id);
	return { saved: { ...s, worn: id, earned: first ? ids([...s.earned, id]) : s.earned }, first };
}

/** A completed lap: whether it `entered` the top ten, and whether it is a personal `best`, faster than every other. */
export function addLap(s: Saved, lap: Lap) {
	const all = s.laps.best, best = fastest([...all, lap]), entered = best.some((l) => l.ms === lap.ms && l.at === lap.at);
	return { saved: entered ? { ...s, laps: { track: TRACK, best } } : s, entered, best: !all.length || lap.ms < all[0].ms };
}

/** The Sushi Stand game in progress as it now stands, or none once it is finished or started over. */
export function keepGame(s: Saved, game: Game | null): Saved {
	const { sushi: _, ...rest } = s;
	return game ? { ...rest, sushi: game } : rest;
}

/** A finished Sushi Stand game: whether it `entered` the top ten, and whether it is a personal `best`, more than every other. */
export function addStand(s: Saved, stand: Stand) {
	const all = s.stands ?? [], top = richest([...all, stand]), entered = top.some((t) => t.at === stand.at && t.name === stand.name);
	return { saved: entered ? { ...s, stands: top } : s, entered, best: !all.length || stand.profit > all[0].profit };
}

/** A Big Muddy catch: whether it `entered` the top ten, and whether it is a personal `best`, heavier than every other. */
export function addCatch(s: Saved, c: Catch) {
	const all = s.catches ?? [], top = heaviest([...all, c]), entered = top.some((t) => t.at === c.at && t.fish === c.fish && t.lb === c.lb);
	return { saved: entered ? { ...s, catches: top } : s, entered, best: !all.length || c.lb > all[0].lb };
}

/** The Big Muddy lure now held: stored from the second up, the first being where everyone starts. */
export function keepLure(s: Saved, lure: Lure): Saved {
	const { lure: _, ...rest } = s;
	return lure === 1 ? rest : { ...rest, lure };
}
