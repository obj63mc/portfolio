// Sushi Stand's rules (src/lib/sushi/rules.ts) and its saved top ten (saved.ts), with fixed dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addStand, merge, read, type Saved } from '../src/lib/saved.ts';
import { conditions, dinner, dollars, lunch, market, priceRate, profit, serve, total, variety, type Item } from '../src/lib/sushi/rules.ts';

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
