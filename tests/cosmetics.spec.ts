// Seam 4 for the cosmetics (buildout ticket 16), over the built site: opening a granting prop's card grants its cosmetic,
// announced once and popped onto the drawn cursor; a reload keeps it; earning the last turns the cursor gold; a cosmetic
// earned in another tab appears here silently. The room seeing it is peers.spec.ts's. The browser refuses the pointer
// lock, so the drawn cursor follows the mouse. `npm run build` first.
import { test, expect, type Page } from '@playwright/test';
import { COSMETICS } from '../src/lib/cosmetics.ts';

function refuseLock() {
	Element.prototype.requestPointerLock = function () {
		setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
		return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
	};
}

/** Every non-empty text the live region is given, kept on `window.said`. */
function listen() {
	const said: string[] = ((window as unknown as { said: string[] }).said = []);
	addEventListener('DOMContentLoaded', () => {
		const live = document.querySelector('[role="status"]')!;
		new MutationObserver(() => live.textContent && said.push(live.textContent)).observe(live, { childList: true, characterData: true, subtree: true });
	});
}
/**
 * What the live region said of cosmetics, told by a cosmetic's name (its wording isn't tested); vite preview has no room,
 * so it also says the visitor is offline.
 */
const said = (page: Page) =>
	page.evaluate(
		(names) => (window as unknown as { said: string[] }).said.filter((s) => names.some((n) => s.includes(n))),
		Object.values(COSMETICS).map((c) => c.name)
	);

/** The cursor canvas's pixel at CSS px `x`, `y`, as [r, g, b, a]. */
const pixel = (page: Page, x: number, y: number) =>
	page.evaluate(
		([x, y]) => {
			const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
			return [...c.getContext('2d')!.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data];
		},
		[x, y]
	);

/** Whether anything opaque is drawn in a CSS px box on the cursor canvas. */
const drawn = (page: Page, b: { x: number; y: number; w: number; h: number }) =>
	page.evaluate((b) => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
		const { data } = c.getContext('2d')!.getImageData(Math.round(b.x * k), Math.round(b.y * k), Math.round(b.w * k), Math.round(b.h * k));
		return data.some((a, i) => i % 4 === 3 && a >= 200);
	}, b);

// A screen this size renders at 1.0, so the own cursor's unit is 1.25 CSS px.
const U = 1.25;
const TIP = { x: 600, y: 500 };
/** Above the own cursor's tip, where a hat sits; the arrow, its halo and its tag are all below it. */
const HEAD = { x: TIP.x - 8 * U, y: TIP.y - 12 * U, w: 26 * U, h: 11 * U };

async function join(page: Page) {
	const b = (await page.locator('dialog.join[open] button.primary').boundingBox())!;
	await page.mouse.click(b.x + 8, b.y + 8);
	await expect(page.locator('dialog.join')).toBeHidden();
	await page.mouse.move(TIP.x, TIP.y);
}

/** Opens a prop's card from the keyboard, the mouse and its cursor staying put. */
async function open(page: Page, id: string) {
	await page.locator(`[data-prop="${id}"] > button`).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator(`[data-prop="${id}"] dialog`)).toBeVisible();
}

test.use({ viewport: { width: 1920, height: 1600 } });
test.beforeEach(({ context }) => Promise.all([context.addInitScript(refuseLock), context.addInitScript(listen)]));

test('the diploma’s card grants the graduation cap: announced once, popped on, stored and kept across a reload', async ({ page }) => {
	await page.goto('/slu');
	await join(page);
	expect(await drawn(page, HEAD), 'nothing worn yet').toBe(false);
	await open(page, 'diploma');
	await expect(page.locator('[role="status"]')).toContainText(COSMETICS[1].name);
	await expect.poll(() => drawn(page, HEAD)).toBe(true);
	expect(JSON.parse((await page.evaluate(() => localStorage.getItem('stl-portfolio')))!)).toMatchObject({ v: 1, worn: 1, earned: [1] });
	// Opened again, it is worn again, and nothing new is said.
	await page.keyboard.press('Escape');
	await open(page, 'diploma');
	expect(await said(page)).toHaveLength(1);

	await page.reload();
	await join(page);
	await expect.poll(() => drawn(page, HEAD)).toBe(true);
	expect(await said(page)).toEqual([]);
});

test('earning the last cosmetic turns the cursor gold', async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem('stl-portfolio', JSON.stringify({ v: 1, worn: 1, earned: [1, 2, 3, 5, 6, 7], laps: { track: 1, best: [] }, sound: true }))
	);
	await page.goto('/');
	await join(page);
	// Inside the arrow's body, clear of its outline.
	const body = () => pixel(page, TIP.x + 3 * U, TIP.y + 14 * U);
	await expect.poll(body).toEqual([255, 255, 255, 255]);
	// The moose is an Easter egg: its click grants the antlers, with no card.
	await page.locator('[data-prop="moose"] > button').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('[role="status"]')).toContainText(COSMETICS[4].name);
	await expect(page.locator('[data-prop="moose"] dialog')).toHaveCount(0);
	await expect.poll(body).toEqual([242, 194, 48, 255]);
});

test('a cosmetic earned in another tab is worn here too, with nothing said', async ({ context }) => {
	const here = await context.newPage(), there = await context.newPage();
	for (const page of [here, there]) await page.goto('/slu');
	await join(here);
	await join(there);
	await open(there, 'diploma');
	await expect.poll(() => drawn(here, HEAD)).toBe(true);
	expect(await said(here)).toEqual([]);
});
