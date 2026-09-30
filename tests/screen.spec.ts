// Seam 4 for the Foundry screen (buildout ticket 17): two browsers on `wrangler dev` serving the build see one poster
// click play for both, a second click do nothing and a third visitor arrive mid-reel; against vite preview, which has no
// /ws, the reel plays offline from the visitor's own click, framed whole on a phone, and ends. `npm run build` first.
// Playwright's Chromium has no H.264, so the video itself stays dark here: the reel's pixels are checked, not its frames.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROJECTOR_LENS, REEL_FRAME, SCREEN_SURFACE } from '../src/lib/scenes/foundry.ts';
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
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
}

/** A poster's click, which opens its card and asks for its title; the card is closed again. */
async function poster(page: Page, title: string) {
	await page.locator(`[data-prop="poster-${title}"] > button`).evaluate((b: HTMLElement) => b.click());
	await page.keyboard.press('Escape');
}

const screenButton = (page: Page) => page.locator('[data-prop="screen"] > button');

/** The layer's transform: the render scale and the camera's offset, CSS px. */
const transform = (page: Page) => page.locator('main').evaluate((m) => ((t) => ({ s: t.a, x: t.e, y: t.f }))(new DOMMatrix(getComputedStyle(m).transform)));
/** Where a world point is on screen, CSS px. */
const onScreen = async (page: Page, p: Point) => ((t) => ({ x: t.x + p.x * t.s, y: t.y + p.y * t.s }))(await transform(page));

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
		await expect(page.locator('.presence')).not.toHaveText('1 here');
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
		for (const page of [a, b]) await expect(screenButton(page)).toHaveText('Screen: idle, pick a poster to start a reel');
		const idle = await screenLight(a);
		await poster(a, 'lorax');
		for (const page of [a, b]) await expect(screenButton(page)).toHaveText('Screen: now playing The Lorax');
		await poster(b, 'fast-five');
		await b.waitForTimeout(500);
		for (const page of [a, b]) await expect(screenButton(page)).toHaveText('Screen: now playing The Lorax');
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
		await expect(screenButton(c)).toHaveText('Screen: now playing The Lorax');
		expect(hello!.screen!.title).toBe('lorax');
		expect(hello!.now - hello!.screen!.at).toBeGreaterThan(500);
		// Behind the Join card too, the camera frames the reel.
		await expect.poll(async () => (await transform(c)).s).toBeLessThan(1);
		await c.context().close();
	});
});

test.describe('without a room', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('offline, a poster click plays the reel locally, framed whole on a phone, and the screen goes idle when it ends', async ({ page }) => {
		await page.clock.install();
		await page.addInitScript(refuseLock);
		await page.goto('/foundry');
		await expect(page.locator('[role="status"]')).toHaveText('Offline, exploring solo');
		await joinScene(page);
		expect((await transform(page)).s).toBeCloseTo(0.6);
		await poster(page, 'lorax');
		await expect(screenButton(page)).toHaveText('Screen: now playing The Lorax');
		// Eased out to the reel's framing: the projector, its lens and the whole screen in the 390 px wide view.
		await expect.poll(async () => (await transform(page)).s).toBeCloseTo(390 / REEL_FRAME.w, 3);
		for (const p of [PROJECTOR_LENS, { x: 100, y: 1250 }, ...SCREEN_SURFACE]) {
			const at = await onScreen(page, p);
			expect(at.x >= 0 && at.x <= 390 && at.y >= 0 && at.y <= 844, JSON.stringify(p)).toBe(true);
		}
		await page.clock.fastForward(45_000);
		await expect(screenButton(page)).toHaveText('Screen: idle, pick a poster to start a reel');
		await expect.poll(async () => (await transform(page)).s).toBe(0.6);
	});
});
