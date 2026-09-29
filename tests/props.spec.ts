// Seam 4 for the props (buildout ticket 15), over the built site: the scene canvas is drawn only while something on it
// moves, hover and click reactions draw and settle, reduced motion freezes ambient motion but keeps click reactions, and
// the meeting TV's video loads only on its click. The browser refuses the pointer lock here, so the drawn cursor follows
// the mouse and hover is the page's own.
import { test, expect, type Page } from '@playwright/test';

type Counted = Window & { draws: number };

function countDraws() {
	(window as unknown as Counted).draws = 0;
	// The scene canvas fills its backdrop once per drawing (engine.ts drawScene).
	const fill = CanvasRenderingContext2D.prototype.fillRect;
	CanvasRenderingContext2D.prototype.fillRect = function (...a) {
		if (this.canvas.classList.contains('scene')) (window as unknown as Counted).draws++;
		return fill.apply(this, a);
	};
	Element.prototype.requestPointerLock = function () {
		setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
		return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
	};
}

/** How many times the scene canvas is drawn over `ms`. */
const drawsOver = async (page: Page, ms: number) => {
	const from = await page.evaluate(() => (window as unknown as Counted).draws);
	await page.waitForTimeout(ms);
	return (await page.evaluate(() => (window as unknown as Counted).draws)) - from;
};

async function join(page: Page) {
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
}

test.beforeEach(({ page }) => page.addInitScript(countDraws));

test.describe('the SLU lab, the whole height in view', () => {
	test.use({ viewport: { width: 1920, height: 1600 } });

	test('with nothing moving no frame is drawn; a hover and a click draw until their reactions settle', async ({ page }) => {
		await page.goto('/slu'); // no ambient motion in the lab
		await join(page);
		await page.mouse.move(5, 5);
		await page.waitForTimeout(500);
		expect(await drawsOver(page, 1000)).toBe(0);

		const workstation = page.getByRole('button', { name: /^Lab workstation/ });
		await workstation.hover();
		expect(await drawsOver(page, 400)).toBeGreaterThan(0); // the glow fading in
		expect(await drawsOver(page, 1000)).toBe(0); // held, still

		await workstation.click();
		await expect(page.getByRole('dialog', { name: 'Lab workstation' })).toBeVisible();
		await page.keyboard.press('Escape');
		await page.mouse.move(5, 5);
		await page.waitForTimeout(500);
		expect(await drawsOver(page, 1000)).toBe(0);
	});
});

test('ambient motion draws while in view; under reduced motion it rests, and a click reaction still plays', async ({ page }) => {
	await page.goto('/'); // the moose breathes beside the welcome sign
	await join(page);
	await page.mouse.move(5, 5);
	expect(await drawsOver(page, 1000)).toBeGreaterThan(20);

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.waitForTimeout(300);
	expect(await drawsOver(page, 1000)).toBe(0);
	const moose = page.getByRole('button', { name: /^The moose/ });
	await moose.focus();
	await page.keyboard.press('Enter'); // the click: the card opens and the antlers wobble
	await expect(page.getByRole('dialog', { name: 'The moose' })).toBeVisible();
	expect(await drawsOver(page, 600)).toBeGreaterThan(10);
	await page.waitForTimeout(800);
	expect(await drawsOver(page, 1000)).toBe(0);
});

test('the meeting TV loads its video only on the click that opens its card', async ({ page }) => {
	const videos: string[] = [];
	page.on('request', (r) => r.url().endsWith('.mp4') && videos.push(r.url()));
	await page.goto('/moosylvania');
	await join(page);
	const tv = page.getByRole('button', { name: /^Meeting TV/ });
	await tv.focus();
	await page.waitForTimeout(500);
	expect(videos).toEqual([]);
	await page.keyboard.press('Enter');
	const card = page.getByRole('dialog', { name: 'Meeting TV' });
	await expect(card.locator('video[controls]')).toBeVisible();
	await expect.poll(() => videos.length).toBeGreaterThan(0);
});
