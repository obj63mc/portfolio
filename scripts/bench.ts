// The phone bench (buildout ticket 10; spec: Testing Decisions, "Performance is measured, not asserted"): roams the built
// overworld as a 390 x 844 phone under Chrome's device emulation, with real touches on the joystick and drags and flings
// of the scene, and prints one line of frame rate and memory every 30 s. `npm run build` first, then
// `npm run bench [minutes]` (default 3). `HEADED=1` draws in a window, on the GPU, instead of headless.
//
// On a real Android phone, with USB debugging on and Chrome open: `adb forward tcp:9222 localabstract:chrome_devtools_remote`
// and `adb reverse tcp:4175 tcp:4175`, then `CDP=http://localhost:9222 npm run bench`. The bench opens its own tab there
// (keep the screen on) and reads memory through adb.
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const minutes = Number(process.argv[2] ?? 3);
if (!(minutes > 0)) throw new Error('Usage: npm run bench [minutes]');
const device = process.env.CDP;
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true }, logLevel: 'silent' });
const browser = device ? await chromium.connectOverCDP(device) : await chromium.launch({ headless: !process.env.HEADED });
const page = device
	? await browser.contexts()[0].newPage()
	: await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
const cdp = await page.context().newCDPSession(page), browserCdp = await browser.newBrowserCDPSession();
await cdp.send('Performance.enable');
const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
	cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

await page.goto('http://localhost:4175/');
await page.bringToFront();
/** The middle of a box: the Join button, the joystick, or the viewport, where the flings start. */
const centre = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const mid = centre(await page.evaluate(() => ({ x: 0, y: 0, width: innerWidth, height: innerHeight })));
const join = centre((await page.getByRole('button', { name: 'Join' }).boundingBox())!);
await touch('touchStart', join.x, join.y);
await touch('touchEnd');
await page.locator('.joystick').waitFor();
const hub = centre((await page.locator('.joystick').boundingBox())!);
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
	const ids = processInfo.filter((p) => p.type === 'renderer' || p.type === 'GPU').map((p) => String(p.id)).join(',');
	const [cmd, ...args] = device ? ['adb', 'shell', 'ps', '-o', 'RSS=', '-p', ids] : ['ps', '-o', 'rss=', '-p', ids];
	return Math.round(execFileSync(cmd, args, { encoding: 'utf8' }).split('\n').reduce((s, l) => s + (Number(l) || 0), 0) / 1024);
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
			return `${Math.round(-t.e / t.a)},${Math.round(-t.f / t.a)}`; // world px: the layer's scale is the render scale
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

const about = await page.evaluate(() => ({ ua: navigator.userAgent, viewport: `${innerWidth} x ${innerHeight} @ ${devicePixelRatio}` }));
console.log(JSON.stringify({ at: new Date().toISOString(), on: device ? 'usb' : process.env.HEADED ? 'headed' : 'headless', minutes, ...about }));
const end = Date.now() + minutes * 60_000;
let next = Date.now() + 30_000, n = 0;
const clock = setInterval(async () => {
	if (Date.now() < next) return;
	next += 30_000;
	console.log(JSON.stringify({ min: ++n / 2, ...(await sample()) }));
}, 250);
while (Date.now() < end) await lap();
clearInterval(clock);
await page.close();
await browser.close(); // over CDP this only disconnects
await server.close();
