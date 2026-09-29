// Seam 4 for the room client (buildout ticket 13): two browsers on `wrangler dev` serving the build see each other, a hop
// changes rooms, a killed server leaves each visitor exploring solo until it returns, and a hidden tab gives up its place
// after a minute; against vite preview, which has no /ws, a refused socket and a bot's page. `npm run build` first.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Point } from '../src/lib/scenes/types.ts';

const root = new URL('..', import.meta.url).pathname;

const freePort = () =>
	new Promise<number>((resolve) => {
		const server = createServer().listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});

/** The browser refuses the lock, leaving the unlocked mouse, whose drawn cursor follows the OS pointer. */
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
const said = (page: Page) => page.evaluate(() => (window as unknown as { said: string[] }).said);

/** The opaque pixels on the cursor canvas in a CSS px box (the whole canvas by default): their bounds, CSS px, or null. */
const opaque = (page: Page, box?: { x: number; y: number; w: number; h: number }) =>
	page.evaluate((box) => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
		const b = box ?? { x: 0, y: 0, w: innerWidth, h: innerHeight };
		const x = Math.round(b.x * k), y = Math.round(b.y * k), w = Math.round(b.w * k), h = Math.round(b.h * k);
		const { data } = c.getContext('2d')!.getImageData(x, y, w, h);
		let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
		for (let i = 3; i < data.length; i += 4) {
			if (data[i] < 200) continue;
			const px = ((i - 3) / 4) % w, py = Math.floor((i - 3) / 4 / w);
			[x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
		}
		return x1 < 0 ? null : { x: (x + x0) / k, y: (y + y0) / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
	}, box);

/** The render scale, off the layer's transform. */
const scale = (page: Page) => page.locator('main').evaluate((m) => new DOMMatrix(getComputedStyle(m).transform).a);

/** Joins with a click near the Join button's corner, the lock refused, so the drawn cursor follows the mouse. */
async function joinScene(page: Page) {
	const b = (await page.getByRole('button', { name: 'Join' }).boundingBox())!;
	await page.mouse.click(b.x + 8, b.y + 8);
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
}

/** A same-page hop through a door link, as the router takes it. */
const hop = (page: Page, href: string) => page.evaluate((href) => document.querySelector<HTMLAnchorElement>(`main a[href="${href}"]`)!.click(), href);

test.describe('two browsers on wrangler dev', () => {
	test.describe.configure({ mode: 'serial' });

	const persist = mkdtempSync(join(tmpdir(), 'peers-'));
	let port = 0, dev: ChildProcess | undefined, a: Page, b: Page;
	const base = () => `http://127.0.0.1:${port}`;

	/** Serves the build and the rooms, up once the Worker refuses a socket request without an Origin. */
	async function start() {
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
	}
	async function stop() {
		const d = dev!;
		dev = undefined;
		await new Promise((done) => (d.once('exit', done), d.kill()));
	}
	async function visitor(browser: Browser) {
		const page = await (await browser.newContext()).newPage();
		await page.addInitScript(refuseLock);
		await page.addInitScript(listen);
		await page.goto(base());
		return page;
	}

	test.beforeAll(async ({ browser }) => {
		port = await freePort();
		await start();
		a = await visitor(browser);
		b = await visitor(browser);
	});
	test.afterAll(async () => {
		if (dev) await stop();
		rmSync(persist, { recursive: true, force: true });
	});

	test('they see each other move: peers at 0.75x, the own cursor 1.25x with its tag, each with a flag badge', async () => {
		// Connected behind the Join card, before either has joined.
		await expect(a.locator('.presence')).toHaveText('2 here');
		await expect(b.locator('.presence')).toHaveText('2 here');
		expect(await opaque(b), 'nobody has joined, so nobody is drawn').toBeNull();
		await joinScene(a);
		const s = await scale(a), p: Point = { x: 600, y: 380 };
		await a.mouse.move(p.x, p.y);
		// b hasn't joined, so everything on its cursor canvas is a's cursor, where a's own camera shows it.
		// Polled on the distance: the first position b receives is where a joined, which may already be left of p.
		const from = async () => ((o) => (o ? Math.hypot(o.x - p.x, o.y - p.y) : Infinity))(await opaque(b));
		await expect.poll(from).toBeLessThan(4);
		const peer = (await opaque(b))!;
		// The tag sits right of the own arrow, clear of its body, for about two seconds.
		const tagBox = { x: p.x + 23 * 1.25 * s, y: p.y - 2, w: 40, h: 12 * 1.25 * s };
		expect(await opaque(a, tagBox), 'the "you" tag').not.toBeNull();
		// The badge's right half, clear of the arrow's tail.
		expect(await opaque(b, { x: p.x + 18 * 0.75 * s, y: p.y + 23 * 0.75 * s, w: 9 * 0.75 * s, h: 8 * 0.75 * s }), 'the flag').not.toBeNull();
		await expect.poll(() => opaque(a, tagBox), { timeout: 4000 }).toBeNull();
		// Arrow and badge, tip to the badge's foot at 33 units: 1.25x on a's screen, 0.75x on b's. Only opaque pixels count,
		// so the antialiased edges fall short by a little, most at the peer's few px.
		const own = (await opaque(a, { x: p.x - 4, y: p.y - 4, w: 60, h: 60 }))!;
		expect(Math.abs(own.h / (33 * 1.25 * s) - 1)).toBeLessThan(0.1);
		expect(Math.abs(peer.h / (33 * 0.75 * s) - 1)).toBeLessThan(0.1);
		await a.mouse.move(p.x + 100, p.y + 20);
		await expect.poll(async () => (await opaque(b))?.x ?? 0).toBeGreaterThan(p.x + 96);
	});

	test('a hop joins the sub-scene’s room: the overworld’s peers are gone, and the new room’s appear', async () => {
		await hop(a, '/slu');
		await expect(a.locator('.presence')).toHaveText('1 here');
		await expect(b.locator('.presence')).toHaveText('1 here');
		await expect.poll(() => opaque(b)).toBeNull();
		await hop(b, '/slu');
		await expect(a.locator('.presence')).toHaveText('2 here');
		await expect(b.locator('.presence')).toHaveText('2 here');
		// Both cameras are centred on the door they came in by; a's cursor stayed at the mouse and is sent on hello.
		await expect.poll(async () => (await opaque(b))?.x ?? Infinity).toBeLessThan(704);
		const peer = (await opaque(b))!;
		expect(Math.hypot(peer.x - 700, peer.y - 400)).toBeLessThan(4);
		// The tag came back with the new scene.
		expect(await opaque(a, { x: 700 + 23 * 1.25 * (await scale(a)), y: 398, w: 40, h: 10 })).not.toBeNull();
	});

	test('a killed server leaves each visitor solo, announced once, the scene still usable, until it returns', async () => {
		test.setTimeout(90_000);
		await stop();
		for (const page of [a, b]) {
			await expect(page.locator('[role="status"]')).toHaveText('Offline, exploring solo');
			await expect(page.locator('.presence')).toHaveText('1 here');
		}
		await expect.poll(() => opaque(b)).toBeNull();
		await a.mouse.move(500, 300);
		await expect.poll(async () => (await opaque(a))?.x ?? Infinity).toBeLessThan(504);
		// Several retries later, still one announcement each.
		await a.waitForTimeout(4000);
		expect(await said(a)).toEqual(['Offline, exploring solo']);
		expect(await said(b)).toEqual(['Offline, exploring solo']);
		await start();
		for (const page of [a, b]) await expect(page.locator('.presence')).toHaveText('2 here', { timeout: 45_000 });
		await expect(a.locator('[role="status"]')).toHaveText('');
		await expect.poll(async () => (await opaque(b))?.x ?? Infinity).toBeLessThan(504);
	});

	test('a hidden tab stops sending at once and closes after a minute; shown again, it reconnects', async ({ browser }) => {
		const c = await (await browser.newContext()).newPage();
		await c.clock.install();
		await c.addInitScript(refuseLock);
		await c.goto(`${base()}/slu`);
		await expect(b.locator('.presence')).toHaveText('3 here');
		const hidden = (on: boolean) =>
			c.evaluate((on) => {
				Object.defineProperty(document, 'hidden', { configurable: true, get: () => on });
				document.dispatchEvent(new Event('visibilitychange'));
			}, on);
		await hidden(true);
		await c.clock.fastForward(59_000);
		await expect(b.locator('.presence')).toHaveText('3 here');
		await c.clock.fastForward(2000);
		await expect(b.locator('.presence')).toHaveText('2 here');
		await hidden(false);
		await expect(b.locator('.presence')).toHaveText('3 here');
		await c.context().close();
	});
});

test.describe('without a room', () => {
	test.beforeEach(({ page }) => Promise.all([page.addInitScript(refuseLock), page.addInitScript(listen)]));

	test('a refused socket is single-player: announced once, alone, the scene usable, retrying', async ({ page }) => {
		let sockets = 0;
		page.on('websocket', () => sockets++);
		await page.goto('/');
		await expect(page.locator('[role="status"]')).toHaveText('Offline, exploring solo');
		await expect(page.locator('.presence')).toHaveText('1 here');
		await joinScene(page);
		await page.mouse.move(640, 360);
		await expect.poll(async () => (await opaque(page))?.x ?? Infinity).toBeLessThan(644);
		await expect.poll(() => sockets, { timeout: 5000 }).toBeGreaterThan(2);
		expect(await said(page)).toEqual(['Offline, exploring solo']);
	});

	test('a page the edge flags `Server-Timing: bot` opens no socket, announces nothing and never retries', async ({ page }) => {
		await page.route(
			(url) => url.pathname === '/',
			async (route) => {
				const response = await route.fetch();
				await route.fulfill({ response, headers: { ...response.headers(), 'server-timing': 'bot' } });
			}
		);
		let sockets = 0;
		page.on('websocket', () => sockets++);
		await page.goto('/');
		expect(await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).serverTiming.map((t) => t.name))).toEqual(['bot']);
		await page.waitForTimeout(3000);
		expect(sockets).toBe(0);
		expect(await said(page)).toEqual([]);
		await expect(page.locator('.presence')).toHaveText('1 here');
	});
});
