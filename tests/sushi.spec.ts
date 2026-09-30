// Sushi Stand (Joe, 2026-09-30) over the built site: the Grand Basin koi's door opens the game, the engine stepping away
// while it is up and taking the page back at the koi; and a whole game, five days under reduced motion, lands in the
// visitor's own top ten. The browser refuses the pointer lock here, so the drawn cursor follows the mouse.
import { test, expect, type Page } from '@playwright/test';

test.beforeEach(({ page }) =>
	page.addInitScript(() => {
		Element.prototype.requestPointerLock = function () {
			setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
			return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
		};
	})
);

const engine = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('engine'));

test('the koi opens Sushi Stand over the whole window, and its exit lands back at the koi', async ({ page }) => {
	await page.goto('/#sushi-stand');
	await page.locator('dialog.join button').click();
	const koi = page.locator('#sushi-stand .door');
	await expect(koi).toHaveAttribute('href', '/sushi-stand');
	await page.waitForTimeout(800);
	const box = (await koi.boundingBox())!;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForURL('**/sushi-stand');
	await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
	expect(await engine(page)).toBe(false);
	await expect(page.locator('canvas.scene')).toBeHidden();
	await page.getByRole('link', { name: 'Back to Forest Park' }).click();
	await page.waitForURL((u) => u.pathname === '/');
	await expect.poll(() => engine(page)).toBe(true);
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	// Landed with the koi's door in view.
	const back = (await koi.boundingBox())!, view = page.viewportSize()!;
	expect(back.x + back.width > 0 && back.x < view.width && back.y + back.height > 0 && back.y < view.height).toBe(true);
});

test('five days of Sushi Stand, then the stand heads the top ten, kept on the device', async ({ browser }) => {
	test.setTimeout(60_000);
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await page.goto('/sushi-stand');
	await page.getByRole('button', { name: "Let's play" }).click();
	await page.getByLabel("Your stand's name").fill('Maki/Moves');
	await expect(page.getByLabel("Your stand's name")).toHaveValue('MakiMoves');
	await page.getByRole('button', { name: 'Open for business' }).click();
	for (let d = 1; d <= 5; d++) {
		await expect(page.getByRole('heading', { name: `Day ${d}: today's outlook` })).toBeFocused();
		await page.getByRole('button', { name: 'To the fish market' }).click();
		if (d === 1) {
			await expect(page.getByRole('button', { name: 'Prepare lunch' })).toBeDisabled();
			for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'More pounds of Tuna' }).click();
		}
		// Each day's order is kept for the next.
		await expect(page.getByLabel('pounds of Tuna', { exact: true })).toHaveValue('2');
		await page.getByRole('button', { name: 'Prepare lunch' }).click();
		await page.getByRole('button', { name: 'Serve lunch' }).click();
		await expect(page.getByRole('heading', { name: 'Lunch sales' })).toBeVisible();
		await page.getByRole('button', { name: 'Boost business' }).click();
		await expect(page.getByRole('button', { name: 'Prepare dinner' })).toBeDisabled();
		await page.getByRole('button', { name: 'No' }).click();
		await page.getByRole('button', { name: 'Prepare dinner' }).click();
		await page.getByRole('button', { name: 'Serve dinner' }).click();
		await page.getByRole('button', { name: "See the day's results" }).click();
		await expect(page.getByRole('heading', { name: `Day ${d} results` })).toBeVisible();
		await page.getByRole('button', { name: d < 5 ? `Start day ${d + 1}` : 'See your final results' }).click();
	}
	await expect(page.getByRole('heading', { name: 'Congrats!' })).toBeVisible();
	await page.getByRole('button', { name: 'Your top 10' }).click();
	await expect(page.locator('.top li.this')).toContainText('MakiMoves');
	const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stl-portfolio') ?? '{}').stands);
	expect(stored).toHaveLength(1);
	expect(stored[0].name).toBe('MakiMoves');
	await context.close();
});
