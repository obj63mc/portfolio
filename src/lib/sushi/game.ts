// A game of Sushi Stand left unfinished (Joe, 2026-09-30), as it is kept between visits (saved.ts `sushi`): everything the
// page (src/routes/sushi-stand/+page.svelte) needs to carry on from the step it was left at. `readGame` is its read
// rule: what was stored comes in as `unknown`, and anything out of shape is no game at all, so the visitor starts fresh.
import { DAYS, FISH, type Boost, type Conditions, type Day, type FishId, type Happening, type Item, type Sold } from './rules.ts';

/** A stand's name is at most this long, as the name field allows. */
export const NAME_MAX = 24;

export type Meal = 'lunch' | 'dinner';

/** A day's steps, where a game can be left. A service's film is kept as its sales, which were made as it started. */
export type Kept =
	| { is: 'outlook' }
	| { is: 'market' }
	| { is: 'price'; meal: Meal }
	| { is: 'sales'; meal: Meal }
	| { is: 'boost' }
	| { is: 'day' };

export interface Game {
	name: string;
	/** The day being played, 1 to `DAYS`. */
	dayNo: number;
	step: Kept;
	today: Conditions;
	/** The market's prices today, $ per lb. */
	prices: Record<FishId, number>;
	/** The pounds and prices last asked for, each fish's. */
	order: Record<FishId, { lbs: number; price: number }>;
	/** Today's menu, from the price step on. */
	items: Item[];
	/** Lunch's menu mix, which dinner takes. */
	mix: number;
	/** What today's fish cost, $. */
	spent: number;
	sold: Record<Meal, Sold[]>;
	/** Whether to boost dinner, unanswered until the boost step. */
	boosting: boolean | null;
	boost: Boost;
	/** The days finished, today included once its results are up. */
	days: Day[];
}

const isObject = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m);
/** A count or an amount: finite and not negative. */
const isAmount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const isFish = (id: unknown): id is FishId => FISH.some((f) => f.id === id);
const isMeal = (m: unknown): m is Meal => m === 'lunch' || m === 'dinner';
const HAPPENINGS = ['competition', 'sick', 'review', 'festival'] as const satisfies readonly Happening[];
const isHappening = (h: unknown): h is Happening => HAPPENINGS.some((x) => x === h);

/** A list every entry of which reads, else nothing. */
function list<T>(m: unknown, one: (m: unknown) => T | null): T[] | null {
	if (!Array.isArray(m)) return null;
	const all: T[] = [];
	for (const x of m) {
		const read = one(x);
		if (read === null) return null;
		all.push(read);
	}
	return all;
}

/** Every fish's entry of a record, else nothing. */
function perFish<T>(m: unknown, one: (m: unknown) => T | null): Record<FishId, T> | null {
	if (!isObject(m)) return null;
	const all = {} as Record<FishId, T>;
	for (const f of FISH) {
		const read = one(m[f.id]);
		if (read === null) return null;
		all[f.id] = read;
	}
	return all;
}

const step = (m: unknown): Kept | null => {
	if (!isObject(m)) return null;
	if (m.is === 'outlook' || m.is === 'market' || m.is === 'boost' || m.is === 'day') return { is: m.is };
	return (m.is === 'price' || m.is === 'sales') && isMeal(m.meal) ? { is: m.is, meal: m.meal } : null;
};

const today = (m: unknown): Conditions | null =>
	isObject(m) && (m.weather === 'nice' || m.weather === 'bad') && isHappening(m.happening) && typeof m.isd === 'boolean'
		? { weather: m.weather, happening: m.happening, isd: m.isd }
		: null;

const item = (m: unknown): Item | null =>
	isObject(m) && isFish(m.id) && isAmount(m.cost) && isAmount(m.lbs) && isAmount(m.left) && isAmount(m.price) && isAmount(m.golden)
		? { id: m.id, cost: m.cost, lbs: m.lbs, left: m.left, price: m.price, golden: m.golden }
		: null;

const sale = (m: unknown): Sold | null =>
	isObject(m) && isFish(m.id) && isAmount(m.pieces) && isAmount(m.sales) ? { id: m.id, pieces: m.pieces, sales: m.sales } : null;

const boost = (m: unknown): Boost | null =>
	isObject(m) && typeof m.special === 'boolean' && typeof m.ads === 'boolean' && typeof m.discount === 'boolean'
		? { special: m.special, ads: m.ads, discount: m.discount }
		: null;

const day = (m: unknown): Day | null => {
	if (!isObject(m) || !isAmount(m.spent) || !isAmount(m.left)) return null;
	const l = list(m.lunch, sale), d = list(m.dinner, sale), b = boost(m.boost);
	return l && d && b ? { spent: m.spent, lunch: l, dinner: d, boost: b, left: m.left } : null;
};

/**
 * The game stored, or null where any of it is out of shape or doesn't add up: a named stand on a day of the five, at a
 * step with its menu if it is past the market, and a finished day for each one before today, today's too at its results.
 */
export function readGame(m: unknown): Game | null {
	if (!isObject(m)) return null;
	const { name, dayNo, mix, spent, boosting } = m;
	if (typeof name !== 'string' || !name.trim() || name.length > NAME_MAX) return null;
	if (typeof dayNo !== 'number' || !Number.isInteger(dayNo) || dayNo < 1 || dayNo > DAYS) return null;
	if (!isAmount(mix) || !isAmount(spent) || (typeof boosting !== 'boolean' && boosting !== null)) return null;
	const at = step(m.step), cond = today(m.today), b = boost(m.boost);
	const prices = perFish(m.prices, (p) => (isAmount(p) ? p : null));
	const order = perFish(m.order, (o) => (isObject(o) && isAmount(o.lbs) && isAmount(o.price) ? { lbs: o.lbs, price: o.price } : null));
	const items = list(m.items, item), days = list(m.days, day);
	const sold = isObject(m.sold) ? { lunch: list(m.sold.lunch, sale), dinner: list(m.sold.dinner, sale) } : null;
	if (!at || !cond || !b || !prices || !order || !items || !days || !sold?.lunch || !sold.dinner) return null;
	const menu = at.is === 'outlook' || at.is === 'market' || items.length > 0;
	if (!menu || days.length !== (at.is === 'day' ? dayNo : dayNo - 1)) return null;
	return { name, dayNo, step: at, today: cond, prices, order, items, mix, spent, sold: { lunch: sold.lunch, dinner: sold.dinner }, boosting, boost: b, days };
}
