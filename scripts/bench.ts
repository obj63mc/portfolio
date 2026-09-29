// The phone bench (buildout ticket 10; spec: Testing Decisions, "Performance is measured, not asserted"): roams the built
// overworld as a 390 x 844 phone under Chrome's device emulation, with real touches on the joystick and drags and flings
// of the scene, and prints one line of frame rate and memory every 30 s. `npm run build` first, then
// `npm run bench [minutes]` (default 3). `HEADED=1` draws in a window, on the GPU, instead of headless.
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const minutes = Number(process.argv[2] ?? 3);
if (!(minutes > 0)) throw new Error('Usage: npm run bench [minutes]');
/** The phone's viewport, and its middle, where the flings start. */
const phone = { width: 390, height: 844 }, mid = { x: 195, y: 422 };
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: phone, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
const cdp = await page.context().newCDPSession(page), browserCdp = await browser.newBrowserCDPSession();
await cdp.send('Performance.enable');
const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
	cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

await page.goto('http://localhost:4175/');
await page.getByRole('button', { name: 'Join' }).tap();
const stick = (await page.locator('.joystick').boundingBox())!, hub = { x: stick.x + stick.width / 2, y: stick.y + stick.height / 2 };
// Every frame's time, for the page to hand over and forget each window.
await page.evaluate(() => {
	const w = window as unknown as { frames_: number[] };
	w.frames_ = [];
	const f = (t: number) => (w.frames_.push(t), requestAnimationFrame(f));
	requestAnimationFrame(f);
});

/** Resident memory, MB, of the renderer and GPU processes, where the tiles' decoded bitmaps live. */
async function rss() {
	const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
	const ids = processInfo.filter((p) => p.type === 'renderer' || p.type === 'GPU').map((p) => String(p.id));
	return Math.round(execFileSync('ps', ['-o', 'rss=', '-p', ids.join(',')], { encoding: 'utf8' }).split('\n').reduce((s, l) => s + (Number(l) || 0), 0) / 1024);
}

/** One window's frames: mean fps, 95th-percentile frame time and the share of frames over 25 ms. */
async function sample() {
	const t = await page.evaluate(() => (window as unknown as { frames_: number[] }).frames_.splice(0));
	const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
	const { metrics } = await cdp.send('Performance.getMetrics');
	const heap = metrics.find((m) => m.name === 'JSHeapUsedSize')!.value;
	return {
		fps: Math.round(((t.length - 1) * 1000) / (t.at(-1)! - t[0])),
		p95: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10,
		over25: Math.round((d.filter((x) => x > 25).length * 1000) / d.length) / 10,
		heapMB: Math.round(heap / 1e5) / 10,
		rssMB: await rss(),
		camera: await page.locator('main').evaluate((m) => {
			const t = new DOMMatrix(getComputedStyle(m).transform);
			return `${Math.round(-t.e / 0.6)},${Math.round(-t.f / 0.6)}`; // world px at the phone's 0.6 scale
		})
	};
}

/** The joystick pulled to (dx, dy) for `ms`. */
async function steer(dx: number, dy: number, ms: number) {
	await touch('touchStart', hub.x, hub.y);
	await touch('touchMove', hub.x + dx, hub.y + dy);
	await page.waitForTimeout(ms);
	await touch('touchEnd');
}
/** A fling of the scene: ten frame-apart moves of (dx, dy), let go while moving. */
async function fling(dx: number, dy: number) {
	const x = mid.x - dx * 5, y = mid.y - dy * 5;
	await touch('touchStart', x, y);
	for (let i = 1; i <= 10; i++) await touch('touchMove', x + dx * i, y + dy * i), await page.waitForTimeout(16);
	await touch('touchEnd');
	await page.waitForTimeout(600);
}

// A lap: east across the districts by joystick and flings, down to the park, and back west along the south, then up.
const lap = async () => {
	for (let i = 0; i < 4; i++) await steer(60, 8, 2500), await fling(-30, 0);
	for (let i = 0; i < 2; i++) await fling(0, -30);
	for (let i = 0; i < 4; i++) await steer(-60, -8, 2500), await fling(30, 0);
	for (let i = 0; i < 2; i++) await steer(10, -60, 1500), await fling(0, 30);
};

console.log(JSON.stringify({ at: new Date().toISOString(), headed: !!process.env.HEADED, minutes, ua: await page.evaluate(() => navigator.userAgent) }));
const end = Date.now() + minutes * 60_000;
let next = Date.now() + 30_000, n = 0;
const clock = setInterval(async () => {
	if (Date.now() < next) return;
	next += 30_000;
	console.log(JSON.stringify({ min: ++n / 2, ...(await sample()) }));
}, 250);
while (Date.now() < end) await lap();
clearInterval(clock);
await browser.close();
await server.close();
