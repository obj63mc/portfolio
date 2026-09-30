// Seam 4 for the river current (buildout ticket 20), over the built site: the drawn cursor left still in the Mississippi
// for a second floats south at the current's speed, the camera following, until the visitor moves it, reaches a bank or
// floats to the bottom edge of the scene, which fades it back to the Arch with its "you" tag; moving about in the water
// never does (Joe, 2026-09-30). The Eads deck is crossed
// without floating, and a float drifts round its pier; each bridge, Eads and Poplar Street, is drawn over a cursor under
// it but not over one on it. The browser refuses the pointer lock here, so the drawn cursor follows the mouse until the
// keys steer it.
import { test, expect, type Page } from '@playwright/test';
import { factor } from '../src/lib/engine/depth.ts';
import { ARROW } from '../src/lib/scenes/river.ts';
import { lineY } from '../src/lib/scenes/walk.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import type { Point } from '../src/lib/scenes/types.ts';

const { arch } = OVERWORLD.river, [deck, poplar] = OVERWORLD.river.decks;

function refuseLock() {
	Element.prototype.requestPointerLock = function () {
		setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
		return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
	};
}

test.beforeEach(({ page }) => page.addInitScript(refuseLock));

/** The camera: its top left, world px, and the render scale, off the layer's transform. */
const camera = (page: Page) =>
	page.locator('main').evaluate((m) => {
		const t = new DOMMatrix(getComputedStyle(m).transform);
		return { x: 0 - t.e / t.a, y: 0 - t.f / t.a, s: t.a };
	});

/** The mouse to a world point through the camera where it is now; the drawn cursor follows it. */
async function point(page: Page, p: Point) {
	const c = await camera(page);
	await page.mouse.move((p.x - c.x) * c.s, (p.y - c.y) * c.s);
}

/**
 * The drawn cursor's tip, CSS px: the top left of the opaque pixels on the cursor canvas round `near`, and how many of
 * them are the arrow's pure white body, which the bridge covers when it is drawn over the cursor.
 */
const cursorAt = (page: Page, near: Point) =>
	page.evaluate((near) => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
		const x = Math.round((near.x - 60) * k), y = Math.round((near.y - 60) * k), w = Math.round(120 * k), h = Math.round(160 * k);
		const { data } = c.getContext('2d')!.getImageData(x, y, w, h);
		let x0 = Infinity, y0 = Infinity, white = 0;
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] < 200) continue;
			const px = (i / 4) % w, py = Math.floor(i / 4 / w);
			if (py < y0 || (py === y0 && px < x0)) (x0 = px), (y0 = py);
			if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) white++;
		}
		return y0 === Infinity ? null : { x: (x + x0) / k, y: (y + y0) / k, white };
	}, near);

async function join(page: Page) {
	const b = (await page.locator('dialog.join[open] button').boundingBox())!;
	await page.mouse.click(b.x + 8, b.y + 8);
	await expect(page.locator('dialog.join')).toBeHidden();
}

/** Onto the east bank off Belleville, then a step west into the water: the cursor's tip on screen once it is in. */
async function wade(page: Page) {
	await page.goto('/#belleville');
	await join(page);
	await point(page, { x: 5900, y: 1450 });
	await point(page, { x: 5550, y: 1450 });
	const c = await camera(page);
	return { x: (5550 - c.x) * c.s, y: (1450 - c.y) * c.s };
}

/** Where the cursor's tip is drawn, CSS px, `ms` apart. */
async function travel(page: Page, at: Point, ms: number) {
	const y0 = (await cursorAt(page, at))!.y;
	await page.waitForTimeout(ms);
	return (await cursorAt(page, at))!.y - y0;
}

test('left still in the water for a second the cursor floats south; the keys stop it and paddle it to the bank', async ({ page }) => {
	const at = await wade(page);
	expect(await travel(page, at, 600), 'still for less than a second').toBe(0);
	// Then about 150 world px a second, 90 CSS px at the 0.6 render scale.
	await expect.poll(() => travel(page, at, 300)).toBeGreaterThan(10);
	expect(await travel(page, at, 500)).toBeLessThan(80);
	// A tap of a key stops it where it is.
	await page.keyboard.press('ArrowLeft');
	const y = (await cursorAt(page, at))!.y;
	expect(await travel(page, { x: at.x, y }, 600)).toBe(0);
	// Paddled east with the keys to the east bank, it stays there.
	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(500);
	await page.keyboard.up('ArrowRight');
	const c = await camera(page), ashore = (await cursorAt(page, { x: at.x + 180, y }))!;
	expect(c.x + ashore.x / c.s, 'on the east bank').toBeGreaterThan(5760);
	expect(await travel(page, ashore, 1500)).toBe(0);
});

test('moving the mouse stops the float too', async ({ page }) => {
	const at = await wade(page);
	await expect.poll(() => travel(page, at, 300)).toBeGreaterThan(10);
	const c = await camera(page), here = (await cursorAt(page, at))!;
	await page.mouse.move(here.x + 5, here.y);
	expect(await travel(page, { x: here.x + 5, y: here.y }, 600)).toBe(0);
	expect(c).toEqual(await camera(page));
});

test('the float stops while paused and carries on after Resume', async ({ page }) => {
	const at = await wade(page);
	await expect.poll(() => travel(page, at, 300)).toBeGreaterThan(10);
	await page.evaluate(() => dispatchEvent(new Event('blur')));
	await expect(page.locator('dialog.paused')).toBeVisible();
	expect(await travel(page, at, 600)).toBe(0);
	// Resumed from the keyboard, so the mouse doesn't move the cursor.
	await page.keyboard.press('Enter');
	await expect(page.locator('dialog.paused')).toBeHidden();
	await expect.poll(() => travel(page, at, 300)).toBeGreaterThan(10);
});

/** The view has gone black at its top left corner: the wash-out's fade, drawn over everything on the cursor canvas. */
const black = (page: Page) => page.evaluate(() => document.querySelector<HTMLCanvasElement>('canvas.cursors')!.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] > 200);

test('moving about on the water below the Poplar Street bridge sends nobody back; left still there, the visitor floats on', async ({ page }) => {
	await page.goto('/#belleville');
	await join(page);
	const c = await camera(page);
	// Three seconds wandering below the bridge, where the river used to end, never still for a second.
	for (let i = 0; i < 30; i++) {
		await point(page, { x: 5300 + 8 * i, y: 1940 + 40 * Math.abs(Math.sin(i / 3)) });
		await page.waitForTimeout(100);
		expect(await black(page)).toBe(false);
	}
	expect(await camera(page)).toEqual(c);
	// Left still, it floats down with the camera following: nobody is sent back yet.
	await point(page, { x: 5400, y: 1960 });
	await expect.poll(async () => (await camera(page)).y, { timeout: 5000 }).toBeGreaterThan(c.y + 50);
	expect(await black(page)).toBe(false);
});

test('floating at the current’s speed, the camera following, to the bottom edge of the scene fades the visitor back to the Arch', async ({ page }) => {
	test.setTimeout(40_000);
	await wade(page);
	// Sampled through the whole float, which the camera follows down: never faster than the current, 150 world px a
	// second, and seen on screen to the end, its arrow at the bottom edge of the scene.
	const seen: { t: number; p: Point; screen: number }[] = [];
	while (!(await black(page))) {
		const t = await page.evaluate(() => performance.now()), p = await tip(page), c = await camera(page);
		if (p) seen.push({ t, p, screen: (p.y - c.y) * c.s });
		expect(seen.length, 'still floating').toBeLessThan(400);
		await page.waitForTimeout(50);
	}
	const moving = seen.filter((s, i) => i && s.p.y > seen[i - 1].p.y);
	expect(moving.length).toBeGreaterThan(20);
	for (let i = 10; i < seen.length; i += 10) expect((seen[i].p.y - seen[i - 10].p.y) / ((seen[i].t - seen[i - 10].t) / 1000)).toBeLessThan(165);
	const last = seen.at(-1)!;
	expect(last.p.y + 40, 'the arrow at the bottom edge').toBeGreaterThan(OVERWORLD.h - 12);
	expect(last.screen, 'in view').toBeLessThan(720);
	// The view cuts to black and opens out of it on the Arch, in the middle of the screen.
	await expect.poll(async () => ((c) => [Math.round(c.x + 640 / c.s), Math.round(c.y + 360 / c.s)])(await camera(page))).toEqual([arch.x, arch.y]);
	const s = (await camera(page)).s * factor(OVERWORLD.depth, arch);
	await expect.poll(async () => ((p) => p && Math.hypot(p.x - 640, p.y - 360))(await cursorAt(page, { x: 640, y: 360 }))).toBeLessThan(1.5);
	expect(await cursorAt(page, { x: 640 + 23 * 1.25 * s + 50, y: 360 }), 'the "you" tag').not.toBeNull();
});

test('the deck is crossed without floating, however long the cursor stays on it; under it, in the river, the bridge is drawn over the cursor', async ({ page }) => {
	await page.goto('/#belleville');
	await join(page);
	// Steered north with the keys until the camera is at the top of the world, the deck in view.
	await page.keyboard.down('ArrowUp');
	await expect.poll(async () => (await camera(page)).y, { timeout: 10_000 }).toBe(0);
	await page.keyboard.up('ArrowUp');
	// Along the deck's middle, west to east over the water, the cursor never drifts off it.
	const top = (x: number) => lineY([deck[0], deck[1]], x);
	const mid = (x: number) => top(x) + (deck[3].y - deck[0].y) / 2;
	const c = await camera(page), screen = (p: Point) => ({ x: (p.x - c.x) * c.s, y: (p.y - c.y) * c.s });
	for (let x = 5300; x <= 6000; x += 100) await point(page, { x, y: mid(x) });
	const end = screen({ x: 6000, y: mid(6000) });
	await page.waitForTimeout(1500);
	const crossed = (await cursorAt(page, end))!;
	expect(Math.hypot(crossed.x - end.x, crossed.y - end.y), 'where it was put').toBeLessThan(1.5);
	// Back along the deck to just below its north edge mid-river: on the deck, it is drawn over the bridge.
	const at = { x: 5700, y: top(5700) + 10 }, on = screen(at);
	await point(page, { x: 5700, y: mid(5700) });
	await point(page, at);
	await page.waitForTimeout(100);
	const over = (await cursorAt(page, on))!;
	expect(over.white, 'drawn over the bridge').toBeGreaterThan(20);
	// Off the deck's south edge into the water, then back to the same place: afloat, it is under the bridge.
	await point(page, { x: 5700, y: mid(5700) + 80 });
	await page.waitForTimeout(100);
	await point(page, at);
	await page.waitForTimeout(50);
	const under = (await cursorAt(page, on))!;
	expect(under.white, 'the bridge drawn over it').toBeLessThan(over.white / 4);
});

/** The own cursor's tip in world px, the top left of the opaque pixels on the cursor canvas (it is the only cursor here). */
const tip = (page: Page) =>
	page.evaluate(() => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
		const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
		for (let i = 3; i < data.length; i += 4) if (data[i] >= 200) return { x: ((i - 3) / 4) % c.width / k, y: Math.floor((i - 3) / 4 / c.width) / k };
		return null;
	}).then(async (p) => ((c) => p && { x: c.x + p.x / c.s, y: c.y + p.y / c.s })(await camera(page)));

/** Joined off Belleville and steered north until the camera is at the top of the world, the Eads Bridge in view. */
async function toEads(page: Page) {
	await page.goto('/#belleville');
	await join(page);
	await page.keyboard.down('ArrowUp');
	await expect.poll(async () => (await camera(page)).y, { timeout: 10_000 }).toBe(0);
	await page.keyboard.up('ArrowUp');
}

test('a float drifts round the Eads Bridge’s middle pier, never through it, and on down the river', async ({ page }) => {
	await toEads(page);
	const [pier] = OVERWORLD.river.obstacles;
	// Left still in the water just north of the deck, over the pier.
	await point(page, { x: 5380, y: 385 });
	const seen: Point[] = [];
	for (let i = 0; i < 80; i++) {
		const p = await tip(page);
		if (p) seen.push(p);
		if (p && p.y > pier.y + pier.h + 20) break;
		await page.waitForTimeout(60);
	}
	const past = seen.at(-1)!;
	expect(past.y, 'floated past the pier').toBeGreaterThan(pier.y + pier.h);
	for (const p of seen) expect(p.x + ARROW.w <= pier.x + 1 || p.x >= pier.x + pier.w - 1 || p.y + ARROW.h <= pier.y + 1 || p.y >= pier.y + pier.h - 1, JSON.stringify(p)).toBe(true);
});

test('the Poplar Street bridge is crossed on top and passed in the river underneath', async ({ page }) => {
	await page.goto('/#belleville');
	await join(page);
	// Waiting on the east bank for the "you" tag, a label nothing covers, to fade, so only the arrow's white is counted.
	await point(page, { x: 5900, y: 1450 });
	await page.waitForTimeout(2600);
	const c = await camera(page), screen = (p: Point) => ({ x: (p.x - c.x) * c.s, y: (p.y - c.y) * c.s });
	const top = (x: number) => lineY([poplar[0], poplar[1]], x), mid = (x: number) => top(x) + (poplar[3].y - poplar[0].y) / 2;
	// Walked across the deck from the west bank, over the river's end: the cursor stays on it, drawn over the bridge.
	for (let x = 5000; x <= 5500; x += 100) await point(page, { x, y: mid(x) });
	const at = { x: 5500, y: top(5500) + 15 }, on = screen(at);
	await point(page, at);
	await page.waitForTimeout(1500);
	const over = (await cursorAt(page, on))!;
	expect(Math.hypot(over.x - on.x, over.y - on.y), 'still where it was put').toBeLessThan(1.5);
	expect(over.white, 'drawn over the bridge').toBeGreaterThan(20);
	// Into the water north of the deck and back to the same place: in the river, under the bridge.
	await point(page, { x: 5500, y: top(5500) - 80 });
	await page.waitForTimeout(100);
	await point(page, at);
	await page.waitForTimeout(50);
	expect((await cursorAt(page, on))!.white, 'the bridge drawn over it').toBeLessThan(over.white / 4);
});

