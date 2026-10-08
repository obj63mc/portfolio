// The resume (Joe, 2026-10-02) over the built site: a page of its own with no scene, shown from its first paint before
// any script runs, reached from the welcome sign's card with the engine stepping away and its exit landing back at the
// welcome sign, and printed to two Letter pages in the site's type with none of the site's chrome. The browser refuses
// the pointer lock here, so the drawn cursor follows the mouse. RESUME_PDF=<path> keeps the printed PDF for a look.
import { test, expect, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const engine = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('engine'));
const refuseLock = (page: Page) =>
	page.addInitScript(() => {
		Element.prototype.requestPointerLock = function () {
			setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
			return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
		};
	});

test('the resume shows at once without a script, with the engine away, and its exit lands at the welcome sign', async ({ page }) => {
	await refuseLock(page);
	// No script at all: the stylesheet's exemption alone shows the page.
	await page.route('**/_app/immutable/**/*.js', (r) => r.abort());
	await page.goto('/resume');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await page.locator('body > div').evaluate((d) => getComputedStyle(d).visibility)).toBe('visible');
	await page.unroute('**/_app/immutable/**/*.js');
	await page.goto('/resume');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await engine(page)).toBe(false);
	await expect(page.locator('canvas.scene')).toBeHidden();
	// Neither the room's count nor the engine's controls, the Sound toggle and the joystick, on a plain document (Joe, 2026-10-02).
	await expect(page.locator('.presence')).toBeHidden();
	await expect(page.locator('.controls:not(dialog *)').first()).toBeHidden();
	await expect(page.locator('.joystick')).toBeHidden();
	await page.locator('a.exit').click();
	await page.waitForURL((u) => u.pathname === '/');
	await expect.poll(() => engine(page)).toBe(true);
	await expect(page.locator('dialog.join[open]')).toBeVisible();
	// The arrival point: the welcome sign, whose card links the resume, is in the first frame.
	const box = (await page.locator('[data-prop="welcome"]').boundingBox())!, view = page.viewportSize()!;
	expect(box.x + box.width > 0 && box.x < view.width && box.y + box.height > 0 && box.y < view.height).toBe(true);
});

test("the welcome sign's card links the resume: the hop lands with the engine away, and the exit brings it back", async ({ page }) => {
	await refuseLock(page);
	await page.goto('/');
	await page.locator('dialog.join button.primary').click();
	await page.locator('[data-prop="welcome"] > button').evaluate((b: HTMLElement) => b.click());
	const link = page.locator('[data-prop="welcome"] dialog a[href="/resume"]');
	await expect(link).toBeVisible();
	await link.click();
	await page.waitForURL((u) => u.pathname === '/resume');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await engine(page)).toBe(false);
	await expect(page.locator('canvas.scene')).toBeHidden();
	await page.locator('a.exit').click();
	await page.waitForURL((u) => u.pathname === '/');
	await expect.poll(() => engine(page)).toBe(true);
	// Joined already: no card reopens.
	await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test("printed, it is two Letter pages in the site's type, with none of the chrome and nothing filled", async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', "page.pdf is Chromium's");
	await page.goto('/resume');
	await page.evaluate(() => document.fonts.ready);
	const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`));
	expect(loaded).toContain('Barlow Condensed 800');
	expect(loaded).toContain('Montserrat 400');
	await page.emulateMedia({ media: 'print' });
	await expect(page.locator('.bar')).toBeHidden();
	await expect(page.locator('.controls:not(dialog *)').first()).toBeHidden();
	await expect(page.locator('.sheet')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	const pdf = await page.pdf({ format: 'Letter', printBackground: false });
	if (process.env.RESUME_PDF) writeFileSync(process.env.RESUME_PDF, pdf);
	// Chromium's PDFs keep each page's dictionary in the clear; /Pages is the tree over them.
	expect(pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(2);
});
