// Sushi Stand's rules (src/lib/sushi/rules.ts), its saved top ten and its game left unfinished (saved.ts, sushi/game.ts),
// with fixed dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addStand, keepGame, merge, read, type Saved } from '../src/lib/saved.ts';
import { readGame, type Game } from '../src/lib/sushi/game.ts';
import { FISH, conditions, dinner, dollars, lunch, market, priceRate, profit, serve, total, variety, type Item } from '../src/lib/sushi/rules.ts';

/** Dice that roll `xs` in turn, over and over. */
const dice = (...xs: number[]) => {
	let i = 0;
	return () => xs[i++ % xs.length];
};

const tuna = (o: Partial<Item> = {}): Item => ({ id: 'tuna', cost: 12, lbs: 2, left: 60, price: 2, golden: 2, ...o });

test('every one of the four happenings can come up, and day 5 is International Sushi Day', () => {
	const seen = new Set([0, 0.3, 0.6, 0.9].map((r) => conditions(1, dice(0.9, r)).happening));
	assert.deepEqual([...seen].sort(), ['competition', 'festival', 'review', 'sick']);
	assert.equal(conditions(5, Math.random).isd, true);
	assert.equal(conditions(4, Math.random).isd, false);
	assert.equal(conditions(1, dice(0.2, 0)).weather, 'bad');
});

test("the market's prices are whole dollars in each fish's range", () => {
	for (const r of [0, 0.5, 0.999]) {
		const m = market(dice(r));
		assert.ok(Number.isInteger(m.tuna) && m.tuna >= 12 && m.tuna < 15, String(m.tuna));
	}
});

test('a price pulls fully at the golden price, a tenth less per dollar off, never below nothing', () => {
	assert.equal(priceRate(2, 2), 1);
	assert.equal(priceRate(2, 7), 0.5);
	assert.equal(priceRate(2, 12), 0);
	assert.equal(priceRate(2, 40), 0);
});

test("the menu's mix: 1 on the day's ideal, 5 off by one", () => {
	assert.equal(variety(7, dice(0.5)), 1);
	assert.equal(variety(6, dice(0.5)), 5);
	assert.equal(variety(1, dice(0.5)), 5 / 6);
});

test('a service never sells more than is left, and sells whole pieces', () => {
	const [all] = serve([tuna({ left: 10 })], 150, 10);
	assert.deepEqual(all, { id: 'tuna', pieces: 10, sales: 20 });
	const [some] = serve([tuna()], 150, 0.1);
	assert.equal(some.pieces, Math.floor(150 * 0.8 * 0.1));
});

test("dinner's demand follows dinner's own price, so a sky-high price sells nothing", () => {
	const day = conditions(1, dice(0.9, 0.6)); // nice, a review
	const l = lunch([tuna({ left: 600 })], day, dice(0.5, 0));
	assert.ok(total(l.sold, 'pieces') > 0);
	const fair = dinner(l.items, day, l.mix, { special: false, ads: false, discount: false });
	const greedy = dinner(l.items.map((i) => ({ ...i, price: 50 })), day, l.mix, { special: false, ads: false, discount: false });
	assert.ok(total(fair.sold, 'pieces') > 0);
	assert.equal(total(greedy.sold, 'pieces'), 0);
	assert.equal(fair.items[0].left, 600 - total(l.sold, 'pieces') - total(fair.sold, 'pieces'));
});

test("a day's profit: lunch and dinner, a quarter off dinner for the discount, less the fish and the boosts", () => {
	const s = (sales: number) => [{ id: 'tuna' as const, pieces: 1, sales }];
	const day = { spent: 300, lunch: s(400.4), dinner: s(1000), left: 0 };
	assert.equal(profit({ ...day, boost: { special: false, ads: false, discount: false } }), 1100);
	assert.equal(profit({ ...day, boost: { special: true, ads: true, discount: true } }), 750 + 400 - 300 - 100 - 200);
	assert.equal(dollars(-1234.4), '-$1,234');
	assert.equal(dollars(56), '$56');
});

test('the stand top ten: most profit first, ten at most, absent until the first game, merged across tabs', () => {
	const none = read(null);
	assert.equal('stands' in none, false);
	const first = addStand(none, { name: 'Maki Moves', profit: 500, at: 1 });
	assert.deepEqual(first, { saved: { ...none, stands: [{ name: 'Maki Moves', profit: 500, at: 1 }] }, entered: true, best: true });
	let s: Saved = first.saved;
	for (let i = 0; i < 10; i++) s = addStand(s, { name: `Stand ${i}`, profit: 1000 + i, at: 10 + i }).saved;
	assert.equal(s.stands?.length, 10);
	assert.equal(s.stands?.[0].profit, 1009);
	assert.equal(s.stands?.some((t) => t.name === 'Maki Moves'), false);
	const low = addStand(s, { name: 'Tiny', profit: -50, at: 99 });
	assert.equal(low.entered, false);
	assert.equal(low.best, false);
	const other = { ...none, stands: [{ name: 'Other tab', profit: 5000, at: 50 }] };
	assert.equal(merge(other, s).stands?.[0].name, 'Other tab');
	assert.deepEqual(read(JSON.stringify({ v: 1, stands: [{ name: 'x'.repeat(25), profit: 1, at: 1 }, { name: 'ok', profit: 1.5, at: 1 }] })).stands, undefined);
});

/** A game left on day 2, pricing dinner: day 1 finished, tuna on the menu, lunch sold. */
const game = (o: Partial<Game> = {}): Game => ({
	name: 'Maki Moves',
	dayNo: 2,
	step: { is: 'price', meal: 'dinner' },
	today: { weather: 'nice', happening: 'review', isd: false },
	prices: market(dice(0.5)),
	order: Object.fromEntries(FISH.map((f) => [f.id, f.id === 'tuna' ? { lbs: 2, price: 2.5 } : { lbs: 0, price: 0 }])) as Game['order'],
	items: [tuna({ left: 12, price: 2.5, golden: 1.3 })],
	mix: 5 / 6,
	spent: 26,
	sold: { lunch: [{ id: 'tuna', pieces: 48, sales: 120 }], dinner: [] },
	boosting: true,
	boost: { special: true, ads: false, discount: false },
	days: [{ spent: 24, lunch: [{ id: 'tuna', pieces: 30, sales: 60 }], dinner: [{ id: 'tuna', pieces: 27, sales: 54 }], boost: { special: false, ads: false, discount: false }, left: 3 }],
	...o
});
const stored = (g: unknown) => JSON.parse(JSON.stringify(g)) as unknown;

test('a game left unfinished reads back as it was kept, at any of a day\'s steps, with nothing else carried', () => {
	assert.deepEqual(readGame(stored(game())), game());
	const day1 = { days: [], dayNo: 1 };
	for (const g of [
		game({ ...day1, step: { is: 'outlook' }, items: [] }),
		game({ ...day1, step: { is: 'market' }, items: [], boosting: null }),
		game({ step: { is: 'sales', meal: 'lunch' } }),
		game({ step: { is: 'boost' } }),
		game({ dayNo: 1, step: { is: 'day' } })
	])
		assert.deepEqual(readGame(stored(g)), g, g.step.is);
	assert.deepEqual(readGame({ ...game(), extra: 1, step: { is: 'boost', meal: 'lunch' } }), game({ step: { is: 'boost' } }));
});

test('a kept game out of shape, or that does not add up, is no game', () => {
	const bad: [string, unknown][] = [
		['not an object', 'game'],
		['no name', game({ name: '  ' })],
		['a name too long', game({ name: 'x'.repeat(25) })],
		['a sixth day', game({ dayNo: 6 })],
		['half a day', { ...game(), dayNo: 1.5 }],
		['a step the game has not', { ...game(), step: { is: 'service', meal: 'lunch' } }],
		['a price step with no meal', { ...game(), step: { is: 'price' } }],
		['a fish with no market price', { ...game(), prices: { tuna: 12 } }],
		['pounds below nothing', { ...game(), order: { ...game().order, tuna: { lbs: -1, price: 2 } } }],
		['a fish the market has not', { ...game(), items: [{ ...tuna(), id: 'cod' }] }],
		['a mix that is no number', game({ mix: NaN })],
		['unknown weather', { ...game(), today: { weather: 'snow', happening: 'review', isd: false } }],
		['a boost half answered', { ...game(), boost: { special: true } }],
		['past the market with no menu', game({ items: [] })],
		['a day short', game({ days: [] })],
		['results with no day behind them', game({ step: { is: 'day' } })],
		['a day out of shape', { ...game(), days: [{ spent: 1 }] }]
	];
	for (const [what, g] of bad) assert.equal(readGame(stored(g)), null, what);
});

test('the kept game: stored with the rest, a bad one dropped alone, this tab\'s the one a write stores, gone once cleared', () => {
	const none = read(null);
	assert.equal('sushi' in none, false);
	const kept = keepGame({ ...none, sound: false }, game());
	assert.deepEqual(read(JSON.stringify(kept)), kept);
	assert.deepEqual(read(JSON.stringify({ ...kept, sushi: { ...game(), dayNo: 9 } })), { ...none, sound: false });
	// Another tab's write of something else leaves this tab's game as it is; this tab's clearing clears it there.
	const later = keepGame(kept, game({ step: { is: 'boost' } }));
	assert.deepEqual(merge(kept, later).sushi?.step, { is: 'boost' });
	assert.equal('sushi' in merge(kept, keepGame(later, null)), false);
	assert.equal('sushi' in keepGame(none, null), false);
});
