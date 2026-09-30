// Sushi Stand's rules (Joe, 2026-09-30): the game carried over from Sushi Star, the Sapporo International Sushi Day game
// of 2018 (sapporobeer.com's internationalsushiday/src/components), as pure functions. Five days, each a fish market, a
// priced lunch, a boost, a priced dinner and the day's profit. The numbers are the original's, with two of its bugs
// fixed: the outdoor festival could never come up, and dinner's demand used lunch's prices, so any dinner price sold.
// `rand` is Math.random in the game and a fixed sequence in tests. The page is src/routes/sushi-stand/+page.svelte.

export type Rand = () => number;

export interface Fish {
	id: string;
	name: string;
	/** A service's demand at full, as a share of its base: lunch's 150 pieces, dinner's 300. */
	salesMax: number;
	/** The market's price range, $ per lb: each day's is a whole dollar from `min` up to, not including, `max`. */
	min: number;
	max: number;
}

export const FISH = [
	{ id: 'tuna', name: 'Tuna', salesMax: 0.8, min: 12, max: 15 },
	{ id: 'yellowtail', name: 'Yellowtail', salesMax: 0.6, min: 8, max: 10 },
	{ id: 'shrimp', name: 'Shrimp', salesMax: 0.9, min: 5, max: 7 },
	{ id: 'eel', name: 'Eel', salesMax: 0.7, min: 8, max: 13 },
	{ id: 'red-snapper', name: 'Red Snapper', salesMax: 0.4, min: 12, max: 15 },
	{ id: 'mackerel', name: 'Horse Mackerel', salesMax: 0.7, min: 5, max: 9 },
	{ id: 'flounder', name: 'Flounder', salesMax: 0.5, min: 4, max: 8 },
	{ id: 'sea-urchin', name: 'Sea Urchin', salesMax: 0.6, min: 9, max: 14 },
	{ id: 'salmon-roe', name: 'Salmon Roe', salesMax: 0.4, min: 3, max: 7 }
] as const satisfies readonly Fish[];

export type FishId = (typeof FISH)[number]['id'];

export const DAYS = 5;
/** A pound of fish makes this many pieces. */
export const PIECES_PER_LB = 30;
/** What the price screen adds to a piece's fish cost for rice and the rest, $ (shown, never charged). */
export const OVERHEAD = 1;
/** The boosts' prices, $; the discount's cost is a quarter of dinner's sales. */
export const BOOST_COST = { special: 100, ads: 200 } as const;
export const DISCOUNT = 0.25;

/** One of the day's events besides the weather; International Sushi Day is always day 5's. */
export type Happening = 'competition' | 'sick' | 'review' | 'festival';

export interface Conditions {
	weather: 'nice' | 'bad';
	happening: Happening;
	/** International Sushi Day: demand doubles. */
	isd: boolean;
}

/** A day's conditions: fair or stormy, one event, and International Sushi Day on the last day. */
export function conditions(day: number, rand: Rand): Conditions {
	const weather = Math.round(rand()) ? 'nice' : 'bad';
	const happening = (['competition', 'sick', 'review', 'festival'] as const)[Math.floor(rand() * 4)];
	return { weather, happening, isd: day === DAYS };
}

/** Demand's factor from the day's conditions. */
export function outlook(c: Conditions) {
	const e = { competition: 0.7, sick: 0.7, review: 1.3, festival: 1.3 }[c.happening];
	return (c.weather === 'bad' ? 0.85 : 1.3) * e * (c.isd ? 2 : 1);
}

/** The market's price for each fish today, $ per lb. */
export const market = (rand: Rand): Record<FishId, number> =>
	Object.fromEntries(FISH.map((f) => [f.id, Math.floor(rand() * (f.max - f.min) + f.min)])) as Record<FishId, number>;

/** A fish on today's menu: its cost per lb, the pounds bought, the pieces left and its price per piece. */
export interface Item {
	id: FishId;
	cost: number;
	lbs: number;
	left: number;
	price: number;
	/** The price per piece customers would pay most for, drawn at lunch and kept for dinner. */
	golden: number;
}

/** A piece's cost as the price screen shows it: its share of the fish plus the overhead. */
export const pieceCost = (i: Pick<Item, 'cost'>) => i.cost / PIECES_PER_LB + OVERHEAD;

/** A price's pull on demand: 1 at the golden price, falling a tenth per dollar off it, 0 at $10 off. */
export function priceRate(golden: number, price: number) {
	const off = Math.abs(golden - price) / 10;
	return off < 1 ? 1 - off : 0;
}

/**
 * Demand's factor from the menu's size: how many fish are on it against the day's ideal of 6 to 8. Off by one it is
 * five times demand and on the ideal it is one, as the original has it.
 */
export function variety(fishes: number, rand: Rand) {
	const off = Math.round(rand() * 2) + 6 - fishes;
	return off === 0 ? 1 : 5 / Math.abs(off);
}

export interface Sold {
	id: FishId;
	pieces: number;
	sales: number;
}

/** What a service sells of each item, never more than is left: its base times the fish's pull, the day's and the price's. */
export function serve(items: readonly Item[], base: number, factor: number): Sold[] {
	return items.map((i) => {
		const fish = FISH.find((f) => f.id === i.id)!;
		const want = base * fish.salesMax * factor * priceRate(i.golden, i.price);
		const pieces = want > i.left ? i.left : Math.floor(want);
		return { id: i.id, pieces, sales: pieces * i.price };
	});
}

/** Lunch: each fish's golden price is drawn, then it sells from a base of 150 pieces. */
export function lunch(items: readonly Item[], day: Conditions, rand: Rand) {
	const mix = variety(items.length, rand);
	const priced = items.map((i) => ({ ...i, golden: (i.cost / PIECES_PER_LB) * (rand() * 2.5 + 2) }));
	const sold = serve(priced, 150, outlook(day) * mix);
	return { items: after(priced, sold), sold, mix };
}

export interface Boost {
	special: boolean;
	ads: boolean;
	discount: boolean;
}

/** Dinner: from a base of 300 pieces, with lunch's menu mix and the boosts taken. */
export function dinner(items: readonly Item[], day: Conditions, mix: number, b: Boost) {
	const factor = outlook(day) * mix * (b.ads ? 1.2 : 1) * (b.special ? 1.3 : 1) * (b.discount ? 1.4 : 1);
	const sold = serve(items, 300, factor);
	return { items: after(items, sold), sold };
}

const after = (items: readonly Item[], sold: readonly Sold[]) => items.map((i, n) => ({ ...i, left: i.left - sold[n].pieces }));

export const total = (sold: readonly Sold[], k: 'pieces' | 'sales') => sold.reduce((s, x) => s + x[k], 0);

export interface Day {
	spent: number;
	lunch: Sold[];
	dinner: Sold[];
	boost: Boost;
	left: number;
}

/** A day's costs: the fish, the boosts, and the discount's share of dinner's sales. */
export function expenses(d: Day) {
	const discount = d.boost.discount ? total(d.dinner, 'sales') * DISCOUNT : 0;
	return { fish: d.spent, special: d.boost.special ? BOOST_COST.special : 0, ads: d.boost.ads ? BOOST_COST.ads : 0, discount };
}

/** A day's profit, whole dollars as the original rounds it. */
export function profit(d: Day) {
	const e = expenses(d), dinnerSales = total(d.dinner, 'sales');
	return Math.round(d.boost.discount ? dinnerSales * (1 - DISCOUNT) : dinnerSales) + Math.round(total(d.lunch, 'sales')) - e.fish - e.special - e.ads;
}

/** Whole dollars, a loss with its minus ahead of the sign: $1,234, -$56. */
export const dollars = (n: number) => `${n < 0 ? '-' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
