// Seam 4 for the Moosylvania lobby TV and its remote (Joe, 2026-10-01), over the built site. Against vite preview, which
// has no /ws, the visitor is alone: the TV, no button, asks for no video until it is in view and then for its first
// channel; the remote on the meeting table opens as a card of three buttons, tunes up and down round the playlist, one
// download for a run of presses, and is put back by power, Esc or a pause; the cursor carries it meanwhile; and under
// reduced motion the TV waits for a press. Two browsers on `wrangler dev` share one channel and one remote: taken by one
// it is nothing to press for the other until it is put back or its holder leaves. `npm run build` first.
// Playwright's Chromium has no H.264, so no frame is drawn here: what is asked for and what is paused are checked.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const TV: string[] = JSON.parse(readFileSync(new URL('../src/lib/video-files.json', import.meta.url), 'utf8')).tv;
const two = (n: number) => String(n).padStart(2, '0');

// Tall enough that the camera, centred on the remote by its focus, has the TV on the wall above it in view too.
test.use({ viewport: { width: 1280, height: 1100 } });

/** The browser refuses the lock, leaving the unlocked mouse. */
function refuseLock() {
	Element.prototype.requestPointerLock = function () {
		setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
		return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
	};
}

async function joinScene(page: Page) {
	await page.locator('dialog.join button').click();
	await expect(page.locator('dialog.join')).toBeHidden();
}

const set = (page: Page) => page.locator('[data-prop="meeting-tv"]');
const button = (page: Page) => page.locator('[data-prop="tv-remote"] > button');
const card = (page: Page) => page.locator('[data-prop="tv-remote"] dialog');
const key = (page: Page, name: 'Channel up' | 'Channel down' | 'Power') => card(page).getByRole('button', { name: new RegExp(`^${name}`) });
/** The file the TV's video names, without its folder and hash; none between channels. */
const showing = (page: Page) =>
	set(page).locator('video').evaluate((v) => v.getAttribute('src')?.replace(/^.*\/|\.[0-9a-f]{8}\.mp4$/g, '') ?? null);
const named = (file: string) => file.replace(/\.mp4$/, '');
/** Every video file the page asks for, by name, in order, each once. */
function asked(page: Page) {
	const files: string[] = [];
	page.on('request', (r) => {
		const file = /\/([^/]+)\.[0-9a-f]{8}\.mp4$/.exec(r.url())?.[1];
		if (file && !files.includes(file)) files.push(file);
	});
	return files;
}
/**
 * Keyboard focus pans the camera to the remote, and the TV comes into view above it. A Tab first: only a focus the
 * keyboard gave pans (`:focus-visible`), and the last thing pressed was the Join button, by the mouse.
 */
async function toRemote(page: Page) {
	await page.keyboard.press('Tab');
	await button(page).focus();
	const inView = () => set(page).evaluate((el) => ((r) => r.bottom > 0 && r.top < innerHeight)(el.getBoundingClientRect()));
	await expect.poll(inView).toBe(true);
	await page.waitForTimeout(300);
}
/** The remote taken from the table by the keyboard, wherever the camera is. */
async function take(page: Page) {
	await button(page).focus();
	await page.keyboard.press('Enter');
}

/** Whether anything opaque is drawn in a CSS px box on the cursor canvas (cosmetics.spec.ts). */
const drawn = (page: Page, b: { x: number; y: number; w: number; h: number }) =>
	page.evaluate((b) => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
		const { data } = c.getContext('2d')!.getImageData(Math.round(b.x * k), Math.round(b.y * k), Math.round(b.w * k), Math.round(b.h * k));
		return data.some((a, i) => i % 4 === 3 && a >= 200);
	}, b);
// A screen this size renders at 1.0, so the own cursor's unit is 1.25 CSS px. Left of the arrow, where the remote is held:
// the arrow, its badge and its tag are all right of its tip, and the halo's glow is never this opaque.
const U = 1.25;
const TIP = { x: 300, y: 300 };
const HAND = { x: TIP.x - 13 * U, y: TIP.y + 6 * U, w: 10 * U, h: 18 * U };

test.describe('without a room', () => {
	test.beforeEach(({ page }) => page.addInitScript(refuseLock));

	test('the TV is no button and asks for nothing until it is in view, then for its first channel alone', async ({ page }) => {
		const files = asked(page);
		await page.goto('/moosylvania');
		await joinScene(page);
		await page.waitForTimeout(800);
		expect(files, 'arriving inside the front doors, the TV is far down the nave').toEqual([]);
		await expect(set(page).locator('button, dialog')).toHaveCount(0);
		await expect(set(page).locator('p')).toContainText(`channel 1 of ${TV.length}`);
		expect(await set(page).locator('video').evaluate((v: HTMLVideoElement) => v.muted && v.loop)).toBe(true);
		await toRemote(page);
		await expect.poll(() => files).toEqual([named(TV[0])]);
		expect(await showing(page)).toBe(named(TV[0]));
	});

	test('the remote is three buttons: up and down go round the channels, a run of presses is one download, and power puts it back', async ({ page }) => {
		const files = asked(page);
		await page.goto('/moosylvania');
		await joinScene(page);
		await page.mouse.move(TIP.x, TIP.y);
		await toRemote(page);
		await expect.poll(() => files.length).toBe(1);
		expect(await drawn(page, HAND)).toBe(false);
		await expect(card(page)).toBeHidden();
		await page.keyboard.press('Enter');
		await expect(card(page)).toBeVisible();
		await expect(card(page).getByRole('button')).toHaveCount(3);
		await expect(card(page).locator('output')).toHaveText(`Channel 01 of ${TV.length}`);
		await expect.poll(() => drawn(page, HAND), 'the cursor carries the remote').toBe(true);
		// Opened on channel up, so Enter tunes at once: down from the first channel is the last.
		await expect(key(page, 'Channel up')).toBeFocused();
		await key(page, 'Channel down').click();
		await expect(card(page).locator('output')).toHaveText(`Channel ${two(TV.length)} of ${TV.length}`);
		await expect(set(page).locator('p')).toContainText(`channel ${TV.length} of ${TV.length}`);
		await expect.poll(() => showing(page)).toBe(named(TV.at(-1)!));
		await expect.poll(() => files).toEqual([named(TV[0]), named(TV.at(-1)!)]);
		// Up three times at once: round past the first channel to the third, and only where it stops is fetched.
		for (let i = 0; i < 3; i++) await key(page, 'Channel up').click();
		await expect(card(page).locator('output')).toHaveText(`Channel 03 of ${TV.length}`);
		expect(await showing(page), 'dark between channels').toBe(null);
		await expect.poll(() => showing(page)).toBe(named(TV[2]));
		await expect.poll(() => files).toEqual([named(TV[0]), named(TV.at(-1)!), named(TV[2])]);
		// Power puts it back; so does Esc.
		await key(page, 'Power').click();
		await expect(card(page)).toBeHidden();
		await expect.poll(() => drawn(page, HAND)).toBe(false);
		await take(page);
		await expect(card(page)).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(card(page)).toBeHidden();
		expect(await showing(page), 'the channel stays where it was left').toBe(named(TV[2]));
	});

	test('a pause holds the TV until Resume and puts the remote back', async ({ page }) => {
		await page.goto('/moosylvania');
		await joinScene(page);
		await toRemote(page);
		const playing = () => set(page).locator('video').evaluate((v: HTMLVideoElement) => !v.paused);
		await expect.poll(playing).toBe(true);
		await page.keyboard.press('Enter');
		await expect(card(page)).toBeVisible();
		await page.evaluate(() => dispatchEvent(new Event('blur')));
		const paused = page.locator('dialog.paused');
		await expect(paused).toBeVisible();
		await expect(card(page)).toBeHidden();
		expect(await playing()).toBe(false);
		await page.waitForTimeout(300);
		expect(await playing(), 'still held, in view or not').toBe(false);
		await paused.locator('button.primary').click();
		await expect.poll(playing).toBe(true);
		await expect(card(page)).toBeHidden();
	});

	test('under reduced motion the TV stays dark until the visitor presses a channel button', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const files = asked(page);
		await page.goto('/moosylvania');
		await joinScene(page);
		await toRemote(page);
		await page.waitForTimeout(600);
		expect(files).toEqual([]);
		await page.keyboard.press('Enter');
		await key(page, 'Channel up').click();
		await expect.poll(() => files).toEqual([named(TV[1])]);
	});
});

test.describe('two browsers on wrangler dev', () => {
	test.describe.configure({ mode: 'serial' });

	const persist = mkdtempSync(join(tmpdir(), 'tv-'));
	let port = 0, dev: ChildProcess | undefined, a: Page, b: Page;
	const base = () => `http://127.0.0.1:${port}`;
	const freePort = () =>
		new Promise<number>((resolve) => {
			const server = createServer().listen(0, '127.0.0.1', () => {
				const { port } = server.address() as AddressInfo;
				server.close(() => resolve(port));
			});
		});

	async function visitor(browser: Browser, alone = false) {
		const page = await (await browser.newContext()).newPage();
		await page.addInitScript(refuseLock);
		await page.goto(`${base()}/moosylvania`);
		if (!alone) await expect(page.locator('.presence')).not.toHaveText(/\b1\b/);
		return page;
	}

	test.beforeAll(async ({ browser }) => {
		port = await freePort();
		dev = spawn(
			process.execPath,
			[
				join(root, 'node_modules/wrangler/bin/wrangler.js'),
				'dev',
				'--ip=127.0.0.1',
				`--port=${port}`,
				`--inspector-port=${await freePort()}`,
				`--persist-to=${persist}`,
				'--show-interactive-dev-session=false'
			],
			{ cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: 'ignore' }
		);
		await expect.poll(() => fetch(`${base()}/ws/overworld`).then((r) => r.status, () => 0), { timeout: 30_000 }).toBe(403);
		a = await visitor(browser, true);
		b = await visitor(browser);
		await Promise.all([joinScene(a), joinScene(b)]);
	});
	test.afterAll(async () => {
		dev?.kill();
		rmSync(persist, { recursive: true, force: true });
	});

	test('the remote one visitor takes is off the table for the other, and its presses change the channel for both', async () => {
		await expect(button(b)).toBeEnabled();
		await take(a);
		await expect(card(a)).toBeVisible();
		await expect(button(b)).toBeDisabled();
		await expect(button(b)).toContainText('another visitor has it');
		await button(b).evaluate((el: HTMLElement) => el.click());
		await b.waitForTimeout(300);
		await expect(card(b)).toBeHidden();
		await key(a, 'Channel up').click();
		await key(a, 'Channel up').click();
		for (const page of [a, b]) await expect(set(page).locator('p')).toContainText(`channel 3 of ${TV.length}`);
		await expect.poll(() => showing(b)).toBe(named(TV[2]));
	});

	test('put back, it is the other visitor\'s to take; a third arrives to the same channel and holder; a holder who leaves leaves it on the table', async ({ browser }) => {
		await key(a, 'Power').click();
		await expect(card(a)).toBeHidden();
		await expect(button(b)).toBeEnabled();
		await expect(button(b)).toContainText('changes the channel');
		await take(b);
		await expect(card(b)).toBeVisible();
		await expect(card(b).locator('output')).toHaveText(`Channel 03 of ${TV.length}`);
		await expect(button(a)).toBeDisabled();
		const c = await visitor(browser);
		await expect(set(c).locator('p')).toContainText(`channel 3 of ${TV.length}`);
		await expect(button(c)).toBeDisabled();
		await b.context().close();
		for (const page of [a, c]) await expect(button(page)).toBeEnabled();
		await expect(set(a).locator('p')).toContainText(`channel 3 of ${TV.length}`);
		await c.context().close();
	});
});
