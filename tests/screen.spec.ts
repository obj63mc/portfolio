// Seam 4 for the Foundry screen (buildout ticket 17): two browsers on `wrangler dev` serving the build see one poster
// click play for both, a second click do nothing and a third visitor arrive mid-reel; against vite preview, which has no
// /ws, the reel plays offline from the visitor's own click, framed whole on a phone, and ends; its clicker sits in the
// second row first and steers nothing until it ends (Joe, 2026-09-29). `npm run build` first.
// Playwright's Chromium has no H.264, so the video itself stays dark here: the reel's pixels are checked, not its frames.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROJECTOR_LENS, REEL_FRAME, SCREEN_SURFACE, screenGist, seatOf } from '../src/lib/scenes/foundry.ts';
import type { Point } from '../src/lib/scenes/types.ts';

const root = new URL('..', import.meta.url).pathname;

const freePort = () =>
	new Promise<number>((resolve) => {
		const server = createServer().listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});

/** The browser refuses the lock, leaving the unlocked mouse. */
function refuseLock() {
	Element.prototype.requestPointerLock = function () {
		setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
		return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
	};
}

async function joinScene(page: Page) {
	await page.locator('dialog.join button.primary').click();
	await expect(page.locator('dialog.join')).toBeHidden();
}

/** A poster's click, which asks for its title and opens no card (Joe, 2026-09-29). */
async function poster(page: Page, title: string) {
	await page.locator(`[data-prop="poster-${title}"] > button`).evaluate((b: HTMLElement) => b.click());
	await expect(page.locator('dialog[open]')).toHaveCount(0);
}

const screenStatus = (page: Page) => page.locator('[data-prop="screen"] > p');

/** The layer's transform: the render scale and the camera's offset, CSS px. */
const transform = (page: Page) => page.locator('main').evaluate((m) => ((t) => ({ s: t.a, x: t.e, y: t.f }))(new DOMMatrix(getComputedStyle(m).transform)));
/** Where a world point is on screen, CSS px. */
const onScreen = async (page: Page, p: Point) => ((t) => ({ x: t.x + p.x * t.s, y: t.y + p.y * t.s }))(await transform(page));

/** The drawn cursor's tip, CSS px: the top-left of the cursor canvas's opaque pixels, past the halo's glow (smoke.spec.ts). */
const tip = (page: Page) =>
	page.evaluate(() => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!;
		const { data, width } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
		let x0 = Infinity, y0 = Infinity;
		for (let i = 3; i < data.length; i += 4) {
			if (data[i] < 200) continue;
			x0 = Math.min(x0, ((i - 3) / 4) % width);
			y0 = Math.min(y0, Math.floor((i - 3) / 4 / width));
		}
		const k = c.width / innerWidth;
		return { x: x0 / k, y: y0 / k };
	});
/** How far the drawn cursor's tip is from the offline visitor's seat, CSS px. */
const fromSeat = async (page: Page) => {
	const [t, s] = [await tip(page), await onScreen(page, seatOf(0))];
	return Math.hypot(t.x - s.x, t.y - s.y);
};
/** How far the drawn cursor's tip has moved from `from`, CSS px. */
const moved = async (page: Page, from: Point) => ((t) => Math.hypot(t.x - from.x, t.y - from.y))(await tip(page));
/** What the screen's line says, idle and playing The Lorax, from the scene data (its wording isn't tested). */
const idleLine = screenGist(), playingLine = screenGist('lorax');

/** How bright the scene canvas is at the middle of the screen, 0 to 255: the idle screen is painted ivory. */
const screenLight = async (page: Page) => {
	const [tl, , br] = SCREEN_SURFACE, at = await onScreen(page, { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 });
	return page.evaluate(({ x, y }) => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.scene')!, k = c.width / innerWidth;
		const [r, g, b] = c.getContext('2d')!.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
		return (r + g + b) / 3;
	}, at);
};

test.describe('two browsers on wrangler dev', () => {
	test.describe.configure({ mode: 'serial' });

	const persist = mkdtempSync(join(tmpdir(), 'screen-'));
	let port = 0, dev: ChildProcess | undefined, a: Page, b: Page;
	const base = () => `http://127.0.0.1:${port}`;

	async function visitor(browser: Browser) {
		const page = await (await browser.newContext()).newPage();
		await page.addInitScript(refuseLock);
		await page.goto(`${base()}/foundry`);
		await expect(page.locator('.presence')).not.toHaveText(/\b1\b/);
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
		const first = await (await browser.newContext()).newPage();
		await first.addInitScript(refuseLock);
		await first.goto(`${base()}/foundry`);
		a = first;
		b = await visitor(browser);
	});
	test.afterAll(async () => {
		dev?.kill();
		rmSync(persist, { recursive: true, force: true });
	});

	test('one poster click plays the title for both, and a second click during it does nothing for anyone', async () => {
		await Promise.all([joinScene(a), joinScene(b)]);
		for (const page of [a, b]) await expect(screenStatus(page)).toContainText(idleLine);
		const idle = await screenLight(a);
		await poster(a, 'lorax');
		for (const page of [a, b]) await expect(screenStatus(page)).toContainText(playingLine);
		await poster(b, 'fast-five');
		await b.waitForTimeout(500);
		for (const page of [a, b]) await expect(screenStatus(page)).toContainText(playingLine);
		// The beam comes up on the blank screen, then the title card darkens it.
		await expect.poll(() => screenLight(a), { timeout: 5000 }).toBeLessThan(idle / 2);
	});

	test('a third visitor arriving mid-reel lands partway through the same title', async ({ browser }) => {
		const c = await (await browser.newContext()).newPage();
		let hello: { now: number; screen: { title: string; at: number } | null } | undefined;
		c.on('websocket', (ws) =>
			ws.on('framereceived', ({ payload }) => {
				if (typeof payload === 'string' && payload.includes('"hello"')) hello ??= JSON.parse(payload);
			})
		);
		await c.goto(`${base()}/foundry`);
		await expect(screenStatus(c)).toContainText(playingLine);
		expect(hello!.screen!.title).toBe('lorax');
		expect(hello!.now - hello!.screen!.at).toBeGreaterThan(500);
		// Arriving mid-reel, not in the seats, the visitor keeps the default view (Joe, 2026-09-29).
		await c.waitForTimeout(1000);
		expect((await transform(c)).s).toBeGreaterThan(1280 / REEL_FRAME.w + 0.01);
		await c.context().close();
	});
});

test.describe('without a room', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('offline, a poster click plays the reel locally, framed whole on a phone, and the screen goes idle when it ends', async ({ page }) => {
		await page.clock.install();
		await page.addInitScript(refuseLock);
		await page.goto('/foundry');
		await expect(page.locator('[role="status"]')).not.toBeEmpty();
		await joinScene(page);
		expect((await transform(page)).s).toBeCloseTo(0.6);
		await poster(page, 'lorax');
		await expect(screenStatus(page)).toContainText(playingLine);
		// Eased out to the reel's framing: the projector, its lens and the whole screen in the 390 px wide view.
		await expect.poll(async () => (await transform(page)).s).toBeCloseTo(390 / REEL_FRAME.w, 3);
		for (const p of [PROJECTOR_LENS, { x: 100, y: 1250 }, ...SCREEN_SURFACE]) {
			const at = await onScreen(page, p);
			expect(at.x >= 0 && at.x <= 390 && at.y >= 0 && at.y <= 844, JSON.stringify(p)).toBe(true);
		}
		await page.clock.fastForward(45_000);
		await expect(screenStatus(page)).toContainText(idleLine);
		await expect.poll(async () => (await transform(page)).s).toBe(0.6);
	});
});

test('offline, a poster click seats its clicker in the second row, then plays; nothing steers or clicks for its first 5 s', async ({ page }) => {
	await page.clock.install();
	await page.addInitScript(refuseLock);
	await page.goto('/foundry');
	await joinScene(page);
	const scale = (await transform(page)).s;
	const lorax = (await page.locator('[data-prop="poster-lorax"] > button').boundingBox())!;
	await page.mouse.move(lorax.x + lorax.width / 2, lorax.y + lorax.height / 2);
	await page.mouse.click(lorax.x + lorax.width / 2, lorax.y + lorax.height / 2);
	// The reel waits for the visitor to sit down.
	await expect(screenStatus(page)).toContainText(idleLine);
	await expect(screenStatus(page)).toContainText(playingLine);
	await expect.poll(async () => (await transform(page)).s).toBeCloseTo(1280 / REEL_FRAME.w, 3);
	expect(await fromSeat(page)).toBeLessThan(12);
	const seated = await tip(page);
	// The keys, the mouse and its clicks do nothing as the reel starts: the exit door stays shut.
	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(300);
	await page.keyboard.up('ArrowRight');
	await page.mouse.move(100, 100);
	const exit = await onScreen(page, { x: 1277, y: 443 });
	await page.mouse.click(exit.x, exit.y);
	await page.waitForTimeout(100);
	expect(await moved(page, seated)).toBeLessThan(1);
	expect(new URL(page.url()).pathname).toBe('/foundry');
	// Five seconds into the reel the keys steer again, so the visitor may leave while it plays, still framed (Joe, 2026-09-29).
	await page.clock.fastForward(5_000);
	await expect(screenStatus(page)).toContainText(playingLine);
	const up = await tip(page);
	await page.keyboard.down('ArrowLeft');
	await page.waitForTimeout(300);
	await page.keyboard.up('ArrowLeft');
	expect(up.x - (await tip(page)).x).toBeGreaterThan(20);
	expect((await transform(page)).s).toBeCloseTo(1280 / REEL_FRAME.w, 3);
	// Stepping out of the seats brings the visitor's own view back while it plays, and sitting down again frames it again.
	await page.keyboard.down('ArrowUp');
	await expect.poll(async () => (await transform(page)).s).toBeGreaterThan(1280 / REEL_FRAME.w + 0.01);
	await page.keyboard.up('ArrowUp');
	await expect.poll(async () => (await transform(page)).s).toBe(scale);
	await expect(screenStatus(page)).toContainText(playingLine);
	await page.keyboard.down('ArrowDown');
	await expect.poll(async () => (await transform(page)).s).toBeLessThan(scale - 0.01);
	await page.keyboard.up('ArrowDown');
	await expect.poll(async () => (await transform(page)).s).toBeCloseTo(1280 / REEL_FRAME.w, 3);
	// When it ends the camera comes back to the session's scale.
	await page.clock.fastForward(45_000);
	await expect(screenStatus(page)).toContainText(idleLine);
	await expect.poll(async () => (await transform(page)).s).toBe(scale);
});

test.describe('a phone, with no mouse or trackpad', () => {
	test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

	test('offline, a tapped poster seats its clicker; a drag moves neither the camera nor the cursor until the reel ends', async ({ page }) => {
		await page.clock.install();
		await page.goto('/foundry');
		await page.locator('dialog.join button.primary').tap();
		// The Lorax poster's right edge, in view beside the exit door where a phone opens.
		const at = await onScreen(page, { x: 1030, y: 300 });
		await page.touchscreen.tap(at.x, at.y);
		await expect(screenStatus(page)).toContainText(playingLine);
		await expect.poll(async () => (await transform(page)).s).toBeCloseTo(390 / REEL_FRAME.w, 3);
		expect(await fromSeat(page)).toBeLessThan(12);
		const [seated, framed] = [await tip(page), await transform(page)];
		const cdp = await page.context().newCDPSession(page);
		const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
			cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
		const drag = async () => {
			await touch('touchStart', 200, 700);
			for (let i = 1; i <= 6; i++) await touch('touchMove', 200 - 20 * i, 700), await page.waitForTimeout(16);
			await touch('touchEnd');
			await page.waitForTimeout(400);
		};
		await drag();
		expect(await moved(page, seated)).toBeLessThan(1);
		expect(await transform(page)).toEqual(framed);
		await page.clock.fastForward(45_000);
		await expect(screenStatus(page)).toContainText(idleLine);
		await expect.poll(async () => (await transform(page)).s).toBeCloseTo(0.6);
		const before = await transform(page);
		await drag();
		expect((await transform(page)).x).not.toBe(before.x);
	});
});

