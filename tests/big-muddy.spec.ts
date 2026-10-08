// Big Muddy (Joe, 2026-10-01) over the built site: the angler's door on the Illinois bank opens the game, the engine
// stepping away while it is up and taking the page back at the angler; a cast left alone ends as the rules say it does
// for the same dice, its catch kept in the visitor's own top ten; and a snag costs the lure held. The browser refuses the
// pointer lock here, so the drawn cursor follows the mouse.
import { test, expect, type Page } from '@playwright/test';
import { STEP, afterSnag, speciesOf, start, step, type End, type Lure } from '../src/lib/big-muddy/rules.ts';

/** A seeded generator (mulberry32), the same in the page and here. */
const seeded = (a: number) => () => {
	a = (a + 0x6d2b79f5) | 0;
	let t = Math.imul(a ^ (a >>> 15), 1 | a);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** How an unsteered cast on `lure` ends for `seed`, and after how long, s; null if it runs past `most` seconds. */
function unsteered(lure: Lure, seed: number, most: number): { end: End; t: number } | null {
	const rand = seeded(seed), run = start(lure, rand);
	for (let i = 0; i < most / STEP; i++) {
		const end = step(run, 0, rand);
		if (end) return { end, t: run.t };
	}
	return null;
}

/** The first seed whose unsteered cast on `lure` ends as `is` within twelve seconds. */
function seedFor(lure: Lure, is: End['is']) {
	for (let seed = 1; seed < 500; seed++) {
		const cast = unsteered(lure, seed, 12);
		if (cast?.end.is === is) return { seed, ...cast };
	}
	throw new Error(`no seed under 500 ends ${is} on lure ${lure}`);
}

/** The page's dice from here on: the same generator from `seed`. */
const seed = (page: Page, n: number) =>
	page.evaluate((a) => {
		Math.random = () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}, n);

const engine = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('engine'));
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('stl-portfolio') ?? '{}'));

test('the angler opens Big Muddy over the whole window, and its exit lands back at the angler', async ({ page }) => {
	await page.addInitScript(() => {
		Element.prototype.requestPointerLock = function () {
			setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
			return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
		};
	});
	await page.goto('/#big-muddy');
	await page.locator('dialog.join button.primary').click();
	const angler = page.locator('#big-muddy .door');
	await expect(angler).toHaveAttribute('href', '/big-muddy');
	await page.waitForTimeout(800);
	const box = (await angler.boundingBox())!;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForURL('**/big-muddy');
	await expect(page.getByRole('heading', { name: 'Big Muddy' })).toBeVisible();
	expect(await engine(page)).toBe(false);
	await expect(page.locator('canvas.scene')).toBeHidden();
	await page.getByRole('link', { name: 'Back to the riverbank' }).click();
	await page.waitForURL((u) => u.pathname === '/');
	await expect.poll(() => engine(page)).toBe(true);
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	// Landed with the angler's door in view.
	const back = (await angler.boundingBox())!, view = page.viewportSize()!;
	expect(back.x + back.width > 0 && back.x < view.width && back.y + back.height > 0 && back.y < view.height).toBe(true);
	// Sushi Stand's way back is still the koi's: each game lands at its own door.
	await page.goto('/sushi-stand');
	await page.getByRole('link', { name: 'Back to Forest Park' }).first().click();
	await page.waitForURL((u) => u.pathname === '/' && u.hash === '#sushi-stand');
});

test('a cast left alone lands the fish the rules say, which heads the top ten, kept on the device', async ({ page }) => {
	test.setTimeout(40_000);
	const { seed: n, end } = seedFor(1, 'caught');
	if (end.is !== 'caught') throw new Error('unreachable');
	await page.goto('/big-muddy');
	await expect(page.getByRole('button', { name: 'Your top 10' })).toHaveCount(0);
	await seed(page, n);
	await page.getByRole('button', { name: 'Cast', exact: true }).click();
	await expect(page.locator('.muddy')).toHaveAttribute('data-screen', 'play');
	await expect(page.locator('.muddy canvas')).toBeVisible();
	const title = `${end.lb} lb ${speciesOf(end.fish).name}`;
	await expect(page.getByRole('dialog', { name: title })).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole('dialog')).toContainText(`Caught at ${end.depth} ft`);
	await expect(page.getByRole('button', { name: 'Cast again' })).toBeFocused();
	const kept = (await stored(page)).catches;
	expect(kept).toHaveLength(1);
	expect(kept[0]).toMatchObject({ fish: end.fish, lb: end.lb, depth: end.depth });
	await page.getByRole('button', { name: 'Your top 10' }).click();
	await expect(page.getByRole('heading', { name: 'Your top 10' })).toBeFocused();
	await expect(page.locator('.top li.this')).toContainText(speciesOf(end.fish).name);
	// Kept: the how-to offers the top ten from the next visit on.
	await page.reload();
	await expect(page.getByRole('button', { name: 'Your top 10' })).toBeVisible();
});

test('a snag costs the lure held, and Esc pauses a cast until Resume', async ({ page }) => {
	test.setTimeout(40_000);
	const { seed: n, t } = seedFor(3, 'snagged');
	await page.addInitScript(() => localStorage.setItem('stl-portfolio', JSON.stringify({ v: 1, lure: 3 })));
	await page.goto('/big-muddy');
	await seed(page, n);
	await page.getByRole('button', { name: 'Cast', exact: true }).click();
	await expect(page.locator('.hud')).toContainText('Crankbait');
	// Paused, the cast waits: well past when it would have ended, it hasn't.
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
	await page.waitForTimeout(t * 1000 + 1500);
	await expect(page.locator('.muddy')).toHaveAttribute('data-screen', 'play');
	await page.getByRole('button', { name: 'Resume' }).click();
	await expect(page.getByRole('dialog', { name: 'Snagged' })).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole('dialog')).toContainText('Minnow');
	expect((await stored(page)).lure).toBe(afterSnag(3));
	expect((await stored(page)).catches).toBeUndefined();
});
