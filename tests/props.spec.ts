// Seam 4 for the props (buildout ticket 15), over the built site: the scene canvas is drawn only while something on it
// moves, hover and click reactions draw and settle, and reduced motion freezes ambient motion but keeps click reactions.
// The meeting TV and its remote are tv.spec.ts's. The browser refuses the pointer lock here, so the drawn cursor follows
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
	await page.locator('dialog.join button.primary').click();
	await expect(page.locator('dialog.join')).toBeHidden();
}

/** A world point on screen, CSS px, through the layer's camera transform. */
const screenOf = (page: Page, p: { x: number; y: number }) =>
	page.locator('main').evaluate((m, p) => {
		const q = new DOMMatrix(getComputedStyle(m).transform).transformPoint(p);
		return { x: q.x, y: q.y };
	}, p);

/** Walks the mouse through world points, a few frames at each, so the engine steps its cursor at every one. */
async function walk(page: Page, ...points: { x: number; y: number }[]) {
	for (const p of points) {
		const at = await screenOf(page, p);
		await page.mouse.move(at.x, at.y);
		await page.waitForTimeout(100);
	}
}

// The lab's near-left desk carries the workstation's monitor (ticket 19): stepped onto from the aisle between the rows the
// cursor is behind it, and from the floor by its chair, up through the chair, in front of it. World px.
const AISLE = { x: 935, y: 979 };
const FLOOR = { x: 1060, y: 1570 };
const CHAIR = { x: 1005, y: 1450 };

test.beforeEach(({ page }) => page.addInitScript(countDraws));

test.describe('the SLU lab, the whole height in view', () => {
	test.use({ viewport: { width: 1920, height: 1600 } });

	test('with nothing moving no frame is drawn; a hover and a click draw until their reactions settle', async ({ page }) => {
		await page.goto('/slu'); // no ambient motion in the lab
		await join(page);
		await page.mouse.move(5, 5);
		await page.waitForTimeout(500);
		expect(await drawsOver(page, 1000)).toBe(0);

		const workstation = page.locator('[data-prop="workstation"] > button');
		await walk(page, FLOOR, CHAIR); // the monitor is used from in front of its desk
		await workstation.hover();
		expect(await drawsOver(page, 400)).toBeGreaterThan(0); // the glow fading in
		expect(await drawsOver(page, 1000)).toBe(0); // held, still

		await workstation.click();
		await expect(page.locator('[data-prop="workstation"] dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await page.mouse.move(5, 5);
		await page.waitForTimeout(500);
		expect(await drawsOver(page, 1000)).toBe(0);
	});

	test('stepping onto a desk from between the rows, its monitor takes neither hover nor click; from the chair side it takes both', async ({ page }) => {
		await page.goto('/slu');
		await join(page);
		const prop = page.locator('[data-prop="workstation"]'), button = prop.locator('> button'), card = prop.locator('dialog');
		const box = (await button.boundingBox())!, monitor = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		await page.mouse.move(5, 5);
		await page.waitForTimeout(300);

		await walk(page, AISLE);
		await page.mouse.move(monitor.x, monitor.y);
		await expect(prop).toHaveClass(/\bbehind\b/);
		expect(await drawsOver(page, 600)).toBe(0); // no glow
		await page.mouse.click(monitor.x, monitor.y);
		await expect(card).toBeHidden();
		// The keyboard still reaches it.
		await button.focus();
		await page.keyboard.press('Enter');
		await expect(card).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(card).toBeHidden();
		await button.blur(); // the focus the card handed back plays the hover glow too

		await walk(page, { x: 1150, y: 1590 }, FLOOR, CHAIR);
		await page.mouse.move(monitor.x, monitor.y);
		await expect(prop).not.toHaveClass(/\bbehind\b/);
		expect(await drawsOver(page, 400)).toBeGreaterThan(0); // the glow fading in
		await page.mouse.click(monitor.x, monitor.y);
		await expect(card).toBeVisible();
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
	const moose = page.locator('[data-prop="moose"] > button');
	await moose.focus();
	await page.keyboard.press('Enter'); // the click: the antlers wobble
	expect(await drawsOver(page, 600)).toBeGreaterThan(10);
	await page.waitForTimeout(800);
	expect(await drawsOver(page, 1000)).toBe(0);
});
