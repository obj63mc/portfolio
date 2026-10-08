// Seam 4 for the Carondelet lap timer and the rider (buildout ticket 18), over the built site: the drawn cursor ridden
// once round the lake loop, weaving across the path as a thumb on a joystick does, shows its time as a new best on the
// lap board, and under reduced motion the rider rests. The browser refuses the pointer lock here, so the drawn cursor
// follows the mouse.
import { test, expect, type Page } from '@playwright/test';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { along, course } from '../src/lib/engine/track.ts';

type Counted = Window & { draws: number };

function setUp() {
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

async function join(page: Page) {
	await page.locator('dialog.join button.primary').click();
	await expect(page.locator('dialog.join')).toBeHidden();
}

/** Where a world point is on screen, CSS px, with the camera where it is now. */
const onScreen = (page: Page, p: { x: number; y: number }) =>
	page.locator('main').evaluate((m, p) => {
		const t = new DOMMatrix(getComputedStyle(m).transform);
		return { x: p.x * t.a + t.e, y: p.y * t.a + t.f };
	}, p);

test.beforeEach(({ page }) => page.addInitScript(setUp));

test('a lap round the lake loop, weaving across the path, shows its time as a new best on the lap board', async ({ page }) => {
	test.setTimeout(60_000);
	await page.goto('/#park');
	await join(page);
	const loop = course(OVERWORLD.track), readout = page.locator('.lap');
	await expect(readout).toBeHidden();
	// 16 world px a step, slow enough for the camera's push to keep the path in view, up to 50 px either side of it.
	for (let s = -80; s < loop.length + 80; s += 16) {
		const a = along(loop, s), o = 50 * Math.sin(s / 150);
		const at = await onScreen(page, { x: a.x - a.dy * o, y: a.y + a.dx * o });
		await page.mouse.move(at.x, at.y);
		if (s === 208) await expect(readout).toHaveText(/0:0\d\.\d/);
	}
	// The board shows the lap, a new best at the top of the visitor's top ten, while the clock runs on into the next lap.
	const board = page.locator('.board.best');
	await expect(board).toBeVisible();
	await expect(board.locator('.time')).toHaveText(/^\d:\d\d\.\d$/);
	await expect(board.locator('li')).toHaveCount(1);
	await expect(board.locator('li.this')).toBeVisible();
	await expect(readout).toHaveText(/0:0\d\.\d/);
	// The finish is announced with its time.
	await expect(page.locator('[role="status"]')).toHaveText(/\d+\.\d/);
});

test.describe('the whole loop in view', () => {
	test.use({ viewport: { width: 3000, height: 900 } });

	test('the rider rides the loop; under reduced motion it rests', async ({ page }) => {
		await page.goto('/#park');
		await join(page);
		await page.mouse.move(1500, 450); // over the lake, out of the push band
		await page.waitForTimeout(300);
		const drawsOver = async (ms: number) => {
			const from = await page.evaluate(() => (window as unknown as Counted).draws);
			await page.waitForTimeout(ms);
			return (await page.evaluate(() => (window as unknown as Counted).draws)) - from;
		};
		expect(await drawsOver(1000)).toBeGreaterThan(5);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.waitForTimeout(300);
		expect(await drawsOver(1000)).toBe(0);
	});
});
