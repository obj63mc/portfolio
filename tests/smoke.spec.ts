// Seam 4: the browser smoke (buildout ticket 09) over the built site: Join, pause and resume, and a card opened and closed
// with the keyboard and with the drawn cursor; touch on an emulated phone (ticket 10), with real touches; and a venue hop and
// back (ticket 11). A headless tab can't take a real pointer lock, so a stand-in grants it and the tests send the mouse's
// movement and clicks to the lock element, as a real lock does; the lock itself stays hands-on.
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Point } from '../src/lib/scenes/types.ts';

/** `refuseLock` makes the stand-in refuse the lock, as Chrome does for about a second after Esc. */
type Stand = Window & { refuseLock?: boolean };

function fakeLock() {
	let held: Element | null = null;
	// The lock element changes as the event fires, as in a real browser.
	const change = (el: Element | null) =>
		setTimeout(() => {
			held = el;
			document.dispatchEvent(new Event('pointerlockchange'));
		});
	Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get: () => held });
	Element.prototype.requestPointerLock = function () {
		if ((window as Stand).refuseLock) {
			setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
			return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
		}
		change(this);
		return Promise.resolve();
	};
	Document.prototype.exitPointerLock = function () {
		if (held) change(null);
	};
	// Esc releases a real lock in the browser, and the page never sees the key.
	addEventListener(
		'keydown',
		(e) => {
			if (!held || e.key !== 'Escape') return;
			e.stopImmediatePropagation();
			e.preventDefault();
			document.exitPointerLock();
		},
		true
	);
}

/** Locked, the mouse moves the drawn cursor by its movement and clicks at the lock element. */
const nudge = (page: Page, movementX: number, movementY: number) =>
	page.evaluate(
		([movementX, movementY]) =>
			document.pointerLockElement!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', movementX, movementY })),
		[movementX, movementY]
	);
const lockedClick = (page: Page) => page.evaluate(() => document.pointerLockElement!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const lockHolder = (page: Page) => page.evaluate(() => document.pointerLockElement?.className ?? null);

/**
 * The drawn cursor's tip, CSS px, read off the cursor canvas: the middle of the leftmost run of its body's white or gold
 * in its topmost row, past the halo's glow (ticket 13), clear of a cosmetic above it (the moose's antlers) and of the
 * "you" tag's white outline, which borders its blue letters. That is the arrow's tip, and the pointing hand's fingertip
 * over something to click (Joe, 2026-09-30); null when none is drawn.
 */
const tip = (page: Page) =>
	page.evaluate(() => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!;
		const { data, width, height } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
		const px = (x: number, y: number) => data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4);
		const blue = (x: number, y: number) => ((p) => p[3] >= 200 && p[2] > 180 && p[0] < 120)(px(x, y));
		const tagged = (x: number, y: number) => {
			for (let v = y; v <= Math.min(height - 1, y + 3); v++)
				for (let u = Math.max(0, x - 3); u <= Math.min(width - 1, x + 3); u++) if (blue(u, v)) return true;
			return false;
		};
		const body = (x: number, y: number) => {
			const [r, g, b, a] = px(x, y);
			return a >= 200 && r >= 220 && g >= 180 && (b >= 220 || b <= 90) && !tagged(x, y);
		};
		for (let y = 0; y < height; y++)
			for (let x = 0; x < width; x++) {
				if (!body(x, y)) continue;
				let end = x;
				while (end + 1 < width && body(end + 1, y)) end++;
				const k = c.width / innerWidth;
				return { x: (x + end) / 2 / k, y: y / k };
			}
		return null;
	});
/** How far the drawn cursor is from `p`; its outline reaches a pixel or two past the tip. */
const off = async (page: Page, p: Point) => {
	const t = await tip(page);
	return t ? Math.hypot(t.x - p.x, t.y - p.y) : Infinity;
};
/**
 * A hop's iris (ticket 11, Joe 2026-09-30), watched from before the hop: each state `html[data-iris]` takes, in order,
 * until the new scene's `selector` is in the page with the iris open again.
 */
const landing = (page: Page, selector: string) =>
	page.evaluate(
		(selector) =>
			new Promise<string[]>((done) => {
				const html = document.documentElement, seen = [html.dataset.iris ?? 'open'];
				const watch = new MutationObserver(() => seen.push(html.dataset.iris ?? 'open'));
				watch.observe(html, { attributeFilter: ['data-iris'] });
				const frame = () => {
					if (!document.querySelector(selector) || html.dataset.iris !== 'open') return requestAnimationFrame(frame);
					watch.disconnect();
					done(seen);
				};
				frame();
			}),
		selector
	);
/**
 * Where the iris closes, watched from before a hop: the middle of the clear hole left on the cursor canvas once it is
 * under 200 CSS px across, all else black.
 */
const irisAt = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<Point>((done) => {
				const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!, k = c.width / innerWidth;
				const frame = () => {
					if (document.documentElement.dataset.iris !== 'closing') return requestAnimationFrame(frame);
					const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
					let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
					for (let i = 3; i < data.length; i += 4) {
						if (data[i] > 250) continue;
						const px = ((i - 3) / 4) % c.width, py = Math.floor((i - 3) / 4 / c.width);
						[x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
					}
					if (x1 < 0 || (x1 - x0) / k > 200) return requestAnimationFrame(frame);
					done({ x: (x0 + x1) / 2 / k, y: (y0 + y1) / 2 / k });
				};
				frame();
			})
	);
/** Holds a key down for `ms`. */
async function hold(page: Page, key: string, ms: number) {
	await page.keyboard.down(key);
	await page.waitForTimeout(ms);
	await page.keyboard.up(key);
}
const centre = async (l: Locator) => {
	const b = (await l.boundingBox())!;
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/**
 * The cursor canvas, counting from here on, as `data-lifts`, each time it is put back on top of the top layer: over a
 * prop card as it opens. A modal card leaves the canvas inert, so hit testing can't tell which of the two is on top.
 */
const lifts = async (page: Page) => {
	const canvas = page.locator('canvas.cursors');
	await canvas.evaluate((c: HTMLElement) =>
		c.addEventListener('beforetoggle', (e) => {
			if ((e as ToggleEvent).newState === 'open') c.dataset.lifts = String(Number(c.dataset.lifts ?? 0) + 1);
		})
	);
	return canvas;
};
/** The viewport's centre, CSS px. */
const middle = (page: Page) => ({ x: page.viewportSize()!.width / 2, y: page.viewportSize()!.height / 2 });
/** Just inside a sub-scene's exit door (ticket 11): a cursor's height, 40 world px at the render scale, below its middle. */
const below = async (page: Page, l: Locator) => {
	const b = (await l.boundingBox())!, s = await page.locator('main').evaluate((m) => new DOMMatrix(getComputedStyle(m).transform).a);
	return { x: b.x + b.width / 2, y: b.y + b.height + 40 * s };
};
/** How far `l`'s centre is from the viewport's: 0 with the camera centred on it. */
const offCentre = async (page: Page, l: Locator) => {
	const c = await centre(l), m = middle(page);
	return Math.hypot(c.x - m.x, c.y - m.y);
};
/** Nothing has focus, so no ring shows: the page's body holds it. */
const unfocused = (page: Page) => page.evaluate(() => document.activeElement === document.body && !document.querySelector(':focus-visible'));

/**
 * Joins with a click near the Join button's top right corner, where the cursor starts, and waits for the lock; and for the
 * cursor to be drawn there, unless scenery there covers it (`seen` false: a desk in the SLU lab, ticket 19).
 */
async function join(page: Page, seen = true) {
	const b = (await page.locator('dialog.join[open] button').boundingBox())!, at = { x: b.x + b.width - 8, y: b.y + 8 };
	await page.mouse.click(at.x, at.y);
	await expect(page.locator('dialog.join')).toBeHidden();
	await expect.poll(() => lockHolder(page)).toBe('scene');
	if (seen) await expect.poll(() => off(page, at)).toBeLessThan(5);
	return at;
}

test.beforeEach(({ page }) => page.addInitScript(fakeLock));

test('before Join only the Join card takes input, nothing moves and no cursor is drawn', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('dialog.join')).toBeVisible();
	await expect(page.locator('dialog.join button')).toBeFocused();
	const camera = await page.locator('main').getAttribute('style');
	for (let i = 0; i < 4; i++) {
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => !!document.activeElement?.closest('main, .controls'))).toBe(false);
	}
	await page.keyboard.press('Escape'); // before any gesture, when Chrome won't let a page refuse the cancel
	await page.keyboard.press('Escape');
	await expect(page.locator('dialog.join')).toBeVisible();
	await page.mouse.move(1270, 360); // deep in the push band
	await hold(page, 'ArrowRight', 400);
	expect(await page.locator('main').getAttribute('style')).toBe(camera);
	expect(await tip(page)).toBeNull();
});

test.describe('the locked cursor in the SLU lab, the whole height in view', () => {
	test.use({ viewport: { width: 1920, height: 1600 } });

	test('Join locks the pointer where pressed; the drawn cursor opens a card, closes it and follows its link', async ({ page }) => {
		await page.goto('/slu');
		// At this size Join puts the cursor on a desk, appearing above its front line, so behind it and covered (ticket 19);
		// the first move below shows it started where pressed.
		let at = await join(page, false);
		const moveTo = async (p: Point) => {
			await nudge(page, p.x - at.x, p.y - at.y);
			await expect.poll(() => off(page, p)).toBeLessThan(5);
			at = p;
		};
		const card = page.locator('[data-prop="workstation"] dialog');
		const prop = page.locator('[data-prop="workstation"] > button');
		// The monitor stands on its desk and is used from in front of it (ticket 19): the cursor comes to it from the floor
		// beside the desk's chair (world 1060, 1570), up through the chair (1005, 1450), which joins the desktop.
		const world = (x: number, y: number) =>
			page.locator('main').evaluate((m, p) => {
				const q = new DOMMatrix(getComputedStyle(m).transform).transformPoint(p);
				return { x: q.x, y: q.y };
			}, { x, y });
		const toMonitor = async () => {
			for (const p of [await world(1060, 1570), await world(1005, 1450), await centre(prop)]) await moveTo(p);
		};

		await toMonitor();
		await lockedClick(page);
		await expect(card).toBeVisible();
		const close = card.locator('form[method="dialog"] button');
		await moveTo(await centre(close));
		await expect(close).toHaveClass(/(^|\s)hot(\s|$)/); // the hover mark under the lock
		await lockedClick(page);
		await expect(card).toBeHidden();

		await toMonitor(); // the card's Close is over the scene beyond the desk, so the cursor had stepped off it
		await lockedClick(page);
		await expect(card).toBeVisible();
		// An external link opens in a new tab (Joe, 2026-09-30).
		await page.context().route('https://github.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'GitHub' }));
		await moveTo(await centre(card.locator('a[href*="github.com"]')));
		const tab = page.context().waitForEvent('page');
		await lockedClick(page);
		await expect(await tab).toHaveURL('https://github.com/obj63mc');
		await expect(page.locator('dialog.paused'), 'this tab pauses').toBeVisible();
	});
});

test('Esc, blur and a hidden tab pause; Resume re-locks with the cursor where it froze, or says to try again', async ({ page }) => {
	await page.goto('/');
	const at = await join(page);
	await nudge(page, 150, 80);
	const frozen = { x: at.x + 150, y: at.y + 80 };
	await expect.poll(() => off(page, frozen)).toBeLessThan(5);
	const paused = page.locator('dialog.paused');
	const resume = paused.locator('button.primary');
	const resumed = async () => {
		await resume.click();
		await expect(paused).toBeHidden();
		expect(await lockHolder(page)).toBe('scene');
		expect(await off(page, frozen)).toBeLessThan(5);
	};

	await page.keyboard.press('Escape');
	await expect(paused).toBeVisible();
	await page.mouse.move(40, 40); // the freed OS pointer
	expect(await off(page, frozen)).toBeLessThan(5);
	await resumed();

	await page.evaluate(() => dispatchEvent(new Event('blur')));
	await expect(paused).toBeVisible();
	expect(await lockHolder(page)).toBeNull();
	await resumed();

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(paused).toBeVisible();
	await page.keyboard.press('Escape'); // the Paused card stays until Resume
	await expect(paused).toBeVisible();
	await page.evaluate(() => ((window as Stand).refuseLock = true));
	await resume.click();
	await expect(paused.locator('.refused')).toBeVisible();
	await expect(paused).toBeVisible();
	await page.evaluate(() => ((window as Stand).refuseLock = false));
	await resumed();
	await expect(paused.locator('.refused')).toBeHidden();
});

test('a refused lock at Join leaves the unlocked mouse: the drawn cursor follows the OS pointer', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => ((window as Stand).refuseLock = true));
	await page.locator('dialog.join button').click();
	await expect(page.locator('dialog.join')).toBeHidden();
	await page.mouse.move(400, 300);
	await expect.poll(() => off(page, { x: 400, y: 300 })).toBeLessThan(5);
	expect(await lockHolder(page)).toBeNull();
	await expect(page.locator('.joystick'), 'the touch controls only without a mouse').toBeHidden();
	// The OS pointer's middle click on a door opens it in a new tab, as on any page.
	const door = await centre(page.locator('main a[href="/moosylvania"]'));
	const tab = page.context().waitForEvent('page');
	await page.mouse.click(door.x, door.y, { button: 'middle' });
	await expect(await tab).toHaveURL('/moosylvania');
	await expect(page).toHaveURL('/');
});

test("a card's video: the locked cursor over it shows the site's controls, marks the one it is on and clicks it", async ({ page }) => {
	await page.goto('/side-project');
	let at = await join(page);
	const moveTo = async (p: Point) => {
		await nudge(page, p.x - at.x, p.y - at.y);
		await expect.poll(() => off(page, p)).toBeLessThan(5);
		at = p;
	};
	// Opened by a click, which unlike keyboard focus doesn't glide the camera, carrying the locked cursor with it.
	const canvas = await lifts(page);
	await page.locator('[data-prop="bottle-anchor"] > button').evaluate((b: HTMLElement) => b.click());
	const card = page.locator('[data-prop="bottle-anchor"] dialog'), player = card.locator('.player');
	await expect(card).toBeVisible();
	// The cursor canvas goes over the card, for the drawn cursor to reach into it.
	await expect(canvas).toHaveAttribute('data-lifts', '1');
	const mute = player.getByRole('button', { name: 'Mute' });
	await moveTo(await centre(mute));
	await expect(player).toHaveClass(/(^|\s)hot(\s|$)/);
	await expect(mute).toHaveClass(/(^|\s)hot(\s|$)/);
	await lockedClick(page);
	await expect(player.getByRole('button', { name: 'Unmute' })).toBeVisible();
	const box = (await player.boundingBox())!;
	await moveTo({ x: box.x + box.width / 2, y: box.y - 40 });
	await expect(player).not.toHaveClass(/(^|\s)hot(\s|$)/);
	// Closed, a video that plays in its card alone stops and lets go of its download: nothing of it is held, and it
	// starts over the next time its card opens.
	const video = card.locator('video'), state = () => video.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, held: v.readyState, at: v.currentTime }));
	await expect.poll(async () => (await state()).held).toBeGreaterThan(0);
	await card.evaluate((d: HTMLDialogElement) => d.close());
	await expect.poll(state).toEqual({ paused: true, held: 0, at: 0 });
});

test('the keyboard joins with the lock; Esc in a card closes it without pausing, and a mouse click takes the lock back', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('dialog.join button')).toBeFocused();
	const start = await centre(page.locator('dialog.join button'));
	await page.keyboard.press('Enter');
	await expect(page.locator('dialog.join')).toBeHidden();
	await expect.poll(() => lockHolder(page)).toBe('scene');
	await expect.poll(() => off(page, start)).toBeLessThan(5);

	for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.matches('.prop > button'))); i++) await page.keyboard.press('Tab');
	const prop = page.locator('.prop > button:focus');
	await page.keyboard.press('Enter');
	const card = page.locator('main dialog[open]');
	await expect(card).toBeVisible();
	await hold(page, 'ArrowRight', 300);
	expect(await off(page, start)).toBeLessThan(5);

	await page.keyboard.press('Escape');
	await expect(card).toBeHidden();
	await expect(prop).toBeFocused();
	expect(await lockHolder(page)).toBeNull();
	const paused = page.locator('dialog.paused');
	await expect(paused).toBeHidden();

	await hold(page, 'ArrowRight', 300);
	const moved = (await tip(page))!.x - start.x;
	expect(moved).toBeGreaterThan(100); // 600 px/s for 0.3 s, give or take a frame
	expect(moved).toBeLessThan(260);
	const held = (await tip(page))!, over = await centre(prop);
	await page.mouse.move(over.x, over.y); // the OS pointer moves; the drawn cursor holds still
	await page.waitForTimeout(100);
	expect(await off(page, held)).toBeLessThan(1);

	await page.mouse.click(over.x, over.y); // over the prop, yet it only takes the lock back
	await expect.poll(() => lockHolder(page)).toBe('scene');
	await expect(card).toHaveCount(0);
	await page.keyboard.press('Escape'); // no card open: a pause
	await expect(paused).toBeVisible();
});

test('a door hops to its sub-scene and back, the lock held: by the locked cursor, the back button, Enter and the exit door', async ({ page }) => {
	await page.goto('/');
	const at = await join(page);
	const door = page.locator('main a[href="/moosylvania"]'), exit = page.locator('main a[href="/#moosylvania"]');
	const h1 = page.locator('main h1');
	/**
	 * The cursor on the door, or just inside the exit door off it, with the camera centred on it; once the router's own
	 * focus reset has run, focus on `focused`, or on nothing back on the overworld, where the visitor roams free.
	 */
	const landed = async (link: Locator, focused: Locator | null) => {
		const spot = link === exit ? () => below(page, exit) : () => centre(link);
		await expect.poll(async () => off(page, await spot())).toBeLessThan(5);
		await expect.poll(() => off(page, middle(page))).toBeLessThan(5);
		if (link === exit) await expect(exit, 'a click there stays inside').not.toHaveClass(/hot/);
		await page.waitForTimeout(100);
		if (focused) await expect(focused).toBeFocused();
		else expect(await unfocused(page), 'nothing focused').toBe(true);
		expect(await lockHolder(page)).toBe('scene');
	};

	// The locked cursor clicks the door: the iris closes on it, and the lobby opens out of the black at its front doors.
	const c = await centre(door);
	await nudge(page, c.x - at.x, c.y - at.y);
	await expect.poll(() => off(page, c)).toBeLessThan(5);
	let fade = landing(page, 'main a[href="/#moosylvania"]');
	await lockedClick(page);
	await expect(page).toHaveURL('/moosylvania');
	expect(await fade).toEqual(['open', 'closing', 'shut', 'opening', 'open']);
	await landed(exit, h1);

	// The back button returns to the venue's door, on the overworld with no fragment, with nothing focused.
	fade = landing(page, 'main a[href="/moosylvania"]');
	await page.goBack();
	await expect(page).toHaveURL('/');
	expect((await fade).slice(-4), 'the first may still be opening').toEqual(['closing', 'shut', 'opening', 'open']);
	await landed(door, null);

	// Enter on the door, focused, hops the same way; the exit door, a nudge up from where the cursor landed, comes back.
	await door.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL('/moosylvania');
	await landed(exit, h1);
	await nudge(page, 0, -60);
	await expect(exit).toHaveClass(/hot/);
	// The iris closes on the click, not on the h1, whose focus on arrival shows as the keyboard's (Joe, 2026-09-30).
	const clicked = (await tip(page))!, closing = irisAt(page);
	await lockedClick(page);
	const hole = await closing;
	expect(Math.hypot(hole.x - clicked.x, hole.y - clicked.y)).toBeLessThan(6);
	await expect(page).toHaveURL('/#moosylvania');
	await landed(door, null);

	// Back to that fragment URL from the lobby, the router's fragment focus reset included; left by Enter on the exit door,
	// the lobby comes back to nothing focused too.
	await door.focus();
	await page.keyboard.press('Enter');
	await landed(exit, h1);
	await page.goBack();
	await expect(page).toHaveURL('/#moosylvania');
	await landed(door, null);
	await page.goForward();
	await landed(exit, h1);
	await exit.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL('/#moosylvania');
	await landed(door, null);

	// A middle click on the door opens the lobby in a new tab, a page load of its own with its Join card.
	const tab = page.context().waitForEvent('page');
	await page.evaluate(() => document.pointerLockElement!.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 })));
	const lobby = await tab;
	await expect(lobby).toHaveURL('/moosylvania');
	await expect(lobby.locator('dialog.join')).toBeVisible();
	await expect(page).toHaveURL('/#moosylvania');
});

test('a back or forward hop behind the Join or Paused card lands at the door and leaves focus on the card', async ({ page }) => {
	const door = page.locator('main a[href="/moosylvania"]');
	await page.goto('/');
	await join(page);
	await door.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL('/moosylvania');

	// Reloaded, the lobby opens on its Join card; back hops behind it, with no cursor to place.
	await page.reload();
	await expect(page.locator('dialog.join')).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL('/');
	await expect.poll(() => offCentre(page, door)).toBeLessThan(1);
	await page.waitForTimeout(100);
	await expect(page.locator('dialog.join button')).toBeFocused();
	expect(await tip(page)).toBeNull();

	// Paused in the lobby, back hops behind the Paused card; Resume re-locks with the cursor on the door.
	await join(page);
	await page.goForward();
	await expect(page.locator('main h1')).toBeFocused();
	await page.keyboard.press('Escape');
	const resume = page.locator('dialog.paused button.primary');
	await expect(resume).toBeVisible();
	await page.goBack();
	await expect.poll(() => offCentre(page, door)).toBeLessThan(1);
	await page.waitForTimeout(100);
	await expect(resume).toBeFocused();
	await resume.click();
	await expect.poll(() => lockHolder(page)).toBe('scene');
	expect(await off(page, middle(page))).toBeLessThan(5);
});

test('the back button while the iris closes is undone, and the hop lands', async ({ page }) => {
	const door = page.locator('main a[href="/moosylvania"]'), exit = page.locator('main a[href="/#moosylvania"]');
	const iris = () => page.evaluate(() => document.documentElement.dataset.iris);
	await page.goto('/moosylvania');
	await join(page);
	await exit.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL('/#moosylvania');
	await expect.poll(iris).toBe('open');
	// The door, then back while the iris closes on it: the lobby is where back would go, but the hop there goes first.
	await door.focus();
	await page.keyboard.press('Enter');
	await expect.poll(iris).toBe('closing');
	await page.goBack();
	await expect(page.locator('main h1')).toBeFocused();
	await expect(page).toHaveURL('/moosylvania');
	await expect.poll(iris).toBe('open');
	// Back again, once it has landed, leaves for the overworld.
	await page.goBack();
	await expect(page).toHaveURL('/#moosylvania');
	await expect(door).toBeAttached();
	await expect.poll(iris).toBe('open');
});

test.describe('a phone, with no mouse or trackpad', () => {
	test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

	/**
	 * One finger's real touches, through the DevTools protocol, so the page gets real pointer events. `at` stamps a touch
	 * (s since the epoch) instead of it happening as it is sent.
	 */
	async function finger(page: Page) {
		const cdp = await page.context().newCDPSession(page);
		const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point, at?: number) =>
			cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [], ...(at && { timestamp: at }) });
		return { down: (p: Point) => send('touchStart', p), move: (p: Point, at?: number) => send('touchMove', p, at), up: (at?: number) => send('touchEnd', undefined, at) };
	}
	/** The camera, CSS px, off the layer's transform. */
	const camera = (page: Page) =>
		page.locator('main').evaluate((m) => {
			const t = new DOMMatrix(getComputedStyle(m).transform);
			return { x: -t.e, y: -t.f };
		});
	/** A drag in `steps` moves of `by`, a frame apart. */
	async function drag(page: Page, f: Awaited<ReturnType<typeof finger>>, from: Point, by: Point, steps: number) {
		await f.down(from);
		for (let i = 1; i <= steps; i++) {
			await f.move({ x: from.x + by.x * i, y: from.y + by.y * i });
			await page.waitForTimeout(16);
		}
	}

	test('Join by tap; tap a prop, drag the scene, steer with the joystick and tap it to click under the cursor', async ({ page }) => {
		await page.goto('/');
		const f = await finger(page), stick = page.locator('.joystick'), ground = { x: 320, y: 650 };
		const start = await camera(page);
		await drag(page, f, ground, { x: -20, y: 0 }, 5);
		await f.up();
		expect(await camera(page), 'before Join a drag does nothing').toEqual(start);
		await expect(stick).toBeHidden();
		const post = (await page.locator('#signpost').boundingBox())!;
		expect(post.x >= 0 && post.y >= 0 && post.x + post.width <= 390 && post.y + post.height <= 844, 'the signpost in the first frame').toBe(true);

		// The Join button's right end, clear of the foreground tree south of the church.
		const b = (await page.locator('dialog.join[open] button').boundingBox())!, pressed = { x: b.x + b.width - 8, y: b.y + 8 };
		await page.touchscreen.tap(pressed.x, pressed.y);
		await expect(page.locator('dialog.join')).toBeHidden();
		await expect.poll(() => off(page, pressed)).toBeLessThan(5);
		await expect(stick).toBeVisible();
		expect(await lockHolder(page), 'no lock on touch').toBeNull();

		// A tap on a prop moves the cursor there and opens its card; a tap on Close closes it.
		const welcome = page.locator('[data-prop="welcome"] > button'), card = page.locator('[data-prop="welcome"] dialog');
		const at = await centre(welcome), canvas = await lifts(page);
		await page.touchscreen.tap(at.x, at.y);
		await expect(card).toBeVisible();
		await expect.poll(() => off(page, at)).toBeLessThan(5);
		// The cursor holds still there while the card is open, and the card stays over it: on touch the cursor canvas is not
		// put over a card, so it never sits on a card's video.
		await expect(canvas).not.toHaveAttribute('data-lifts');
		const close = await centre(card.locator('form[method="dialog"] button'));
		await page.touchscreen.tap(close.x, close.y);
		await expect(card).toBeHidden();

		// The joystick tapped without steering clicks what the cursor is over, wherever on the stick the thumb lands.
		const hub = await centre(stick);
		await f.down({ x: hub.x + 35, y: hub.y - 20 });
		await f.up();
		await expect(card).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(card).toBeHidden();

		// Past 6 px it is a drag, from a prop too: the view catches up with the finger, and the click the browser still sends
		// for a finger inside its own tap slop opens nothing.
		await drag(page, f, at, { x: 2, y: 0 }, 4);
		await f.up();
		const nudged = await camera(page);
		expect(nudged).toEqual({ x: start.x - 8, y: start.y });
		await page.waitForTimeout(200);
		await expect(card).toBeHidden();

		// A finger that wanders under 6 px still taps: the moose's click grants its antlers, with no card.
		const moose = await centre(page.locator('[data-prop="moose"] > button'));
		await drag(page, f, moose, { x: 2, y: 0 }, 2);
		await f.up();
		await expect(page.locator('[role="status"]')).toContainText('antlers');
		expect(await camera(page), 'and pans nothing').toEqual(nudged);
		const cursor = { x: moose.x + 4, y: moose.y }; // where the finger lifted
		await expect.poll(() => off(page, cursor)).toBeLessThan(5);

		// A drag pans against the finger and leaves the cursor where it is in the world; held still, it doesn't coast.
		await drag(page, f, ground, { x: -15, y: 0 }, 10);
		await page.waitForTimeout(150);
		await f.up();
		expect(await camera(page)).toEqual({ x: nudged.x + 150, y: nudged.y });
		expect(await off(page, { x: cursor.x - 150, y: cursor.y })).toBeLessThan(5);
		await page.waitForTimeout(200);
		expect(await camera(page), 'no fling').toEqual({ x: nudged.x + 150, y: nudged.y });

		// Dragged the other way far enough, the cursor is carried along inside the edge.
		await drag(page, f, { x: 40, y: 650 }, { x: 25, y: 0 }, 12);
		await page.waitForTimeout(150);
		await f.up();
		expect(await off(page, { x: 390 - 24, y: cursor.y })).toBeLessThan(5);

		// Let go while moving, it coasts on. A finger moves every frame whatever the page draws, but a page drawing the
		// moose's breathing acknowledges each sent touch a few frames late, so these are stamped a frame apart.
		await f.down(ground);
		const t0 = Date.now() / 1000;
		for (let i = 1; i <= 6; i++) await f.move({ x: ground.x - 30 * i, y: ground.y }, t0 + i / 60);
		await f.up(t0 + 7 / 60);
		const flung = await camera(page);
		await page.waitForTimeout(500);
		expect((await camera(page)).x - flung.x, 'coasting').toBeGreaterThan(20);

		// The joystick pulled to the rim steers the cursor right at 360 CSS px/s and the camera follows at the edge; let go,
		// the camera stops.
		const before = (await tip(page))!, pushed = await camera(page);
		await f.down(hub);
		await f.move({ x: hub.x + 60, y: hub.y });
		await page.waitForTimeout(250);
		const steered = (await tip(page))!;
		expect(steered.x - before.x).toBeGreaterThan(40);
		expect(Math.abs(steered.y - before.y)).toBeLessThan(2);
		await page.waitForTimeout(1000);
		await f.up();
		const stopped = await camera(page);
		expect(stopped.x).toBeGreaterThan(pushed.x);
		await page.waitForTimeout(200);
		expect(await camera(page)).toEqual(stopped);
	});

	test('the joystick scrolls down and right even where the controls line the bottom edge', async ({ page }) => {
		await page.goto('/');
		await page.locator('dialog.join button').tap();
		const f = await finger(page), hub = await centre(page.locator('.joystick'));
		/** The camera's travel, CSS px, with the joystick held pulled (dx, dy) for 2.5 s. */
		const hold = async (dx: number, dy: number) => {
			const a = await camera(page);
			await f.down(hub);
			await f.move({ x: hub.x + dx, y: hub.y + dy });
			await page.waitForTimeout(2500);
			await f.up();
			const b = await camera(page);
			return { x: b.x - a.x, y: b.y - a.y };
		};
		expect((await hold(0, 60)).y, 'down, the cursor against the toggles').toBeGreaterThan(150);
		expect((await hold(60, 0)).x, 'right, into the corner by the joystick').toBeGreaterThan(150);
	});

	test('the toggles and the joystick are the finger’s: the cursor over them marks nothing and never holds the camera', async ({ page }) => {
		// Midtown, where no prop is near the toggles once the cursor is on them. Dragging the view down carries the cursor
		// down with the scene, so the drag is as long as the Join tap is above the toggles.
		await page.goto('/#midtown');
		const toggles = (await page.locator('.controls:not(dialog *)').boundingBox())!, join = (await page.locator('dialog.join[open] button').boundingBox())!;
		// The Join button's top left corner: the drag carries the cursor down level with the toggles, just right of them,
		// and the joystick steers it left onto them.
		const at = { x: join.x + 4, y: join.y + 4 }, down = toggles.y + toggles.height / 2 - at.y;
		expect(down, 'the camera can scroll that far').toBeLessThan((await camera(page)).y);
		await page.touchscreen.tap(at.x, at.y);
		const f = await finger(page), hub = await centre(page.locator('.joystick'));
		await drag(page, f, { x: 320, y: 100 }, { x: 0, y: down / 20 }, 20);
		await page.waitForTimeout(150);
		await f.up();
		for (let i = 0; i < 20 && (await tip(page))!.x > toggles.x + toggles.width - 8; i++) {
			await f.down(hub);
			await f.move({ x: hub.x - 18, y: hub.y }); // 30 percent of the stick: about 64 CSS px/s
			await page.waitForTimeout(150);
			await f.up();
		}
		const on = (await tip(page))!;
		expect(on.y > toggles.y && on.y < toggles.y + toggles.height && on.x > toggles.x && on.x < toggles.x + toggles.width, 'the cursor sits on the toggles').toBe(true);
		await page.waitForTimeout(100);
		await expect(page.locator('.controls:not(dialog *) .hot')).toHaveCount(0);
		// Steered slowly right along the bottom band, still within 40 px of the toggles, it scrolls down at once.
		const before = await camera(page);
		await f.down(hub);
		await f.move({ x: hub.x + 18, y: hub.y }); // 30 percent of the stick: about 64 CSS px/s
		await page.waitForTimeout(400);
		const after = await camera(page);
		await f.up();
		expect((await tip(page))!.x, 'still beside the toggles').toBeLessThan(toggles.x + toggles.width + 40);
		expect(after.y - before.y).toBeGreaterThan(60);
	});

	test('a door tapped hops to its sub-scene and back with the joystick still there, cut under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await page.locator('dialog.join button').tap();
		const door = page.locator('main a[href="/moosylvania"]'), exit = page.locator('main a[href="/#moosylvania"]');
		const stick = page.locator('.joystick');
		const fade = landing(page, 'main a[href="/#moosylvania"]'), c = await centre(door);
		await page.touchscreen.tap(c.x, c.y);
		await expect(page).toHaveURL('/moosylvania');
		expect(await fade, 'a cut').toEqual(['open']);
		await expect(page.locator('main h1')).toBeFocused();
		await expect.poll(async () => off(page, await below(page, exit))).toBeLessThan(5);
		await expect(stick).toBeVisible();
		await page.goBack();
		await expect(page).toHaveURL('/');
		await expect.poll(async () => off(page, await centre(door))).toBeLessThan(5);
		await page.waitForTimeout(100);
		expect(await unfocused(page), 'nothing focused').toBe(true);
		await expect(stick).toBeVisible();
	});

	test("a card's video keeps its controls put away while it plays: a tap calls them up, and a tap or three seconds puts them away", async ({ page }) => {
		await page.goto('/side-project');
		await page.locator('dialog.join button').tap();
		await page.locator('[data-prop="bottle-anchor"] > button').evaluate((b: HTMLElement) => b.click());
		const player = page.locator('[data-prop="bottle-anchor"] dialog .player'), video = player.locator('video'), bar = player.locator('.bar');
		const state = () => video.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, muted: v.muted }));
		const tap = async (l: Locator) => {
			const c = await centre(l);
			await page.touchscreen.tap(c.x, c.y);
		};
		const playing = { paused: false, muted: false };
		await expect.poll(state).toEqual(playing);
		// Shown as the video starts, the bar goes by itself; put away it takes no tap, so one where its last button was
		// calls it up and presses nothing.
		await expect(bar).toHaveCSS('opacity', '0', { timeout: 6000 });
		await tap(bar.locator('button').last());
		await expect(bar).toHaveCSS('opacity', '1');
		expect(await state()).toEqual(playing);
		// A tap on the video puts it away again and the next calls it back, the video playing on.
		await tap(video);
		await expect(bar).toHaveCSS('opacity', '0');
		await tap(video);
		await expect(bar).toHaveCSS('opacity', '1');
		expect(await state()).toEqual(playing);
		// Paused from the bar, it stays for as long as the video is paused.
		await tap(bar.locator('button').first());
		await expect.poll(state).toEqual({ paused: true, muted: false });
		await page.waitForTimeout(3500);
		await expect(bar).toHaveCSS('opacity', '1');
		// A tap on the paused video plays it, and the bar goes after its three seconds.
		await tap(video);
		await expect.poll(state).toEqual(playing);
		await expect(bar).toHaveCSS('opacity', '0', { timeout: 6000 });
	});

	test('a hidden tab pauses; the Resume tap goes back to touch without a lock', async ({ page }) => {
		await page.goto('/');
		await page.locator('dialog.join button').tap();
		await expect(page.locator('.joystick')).toBeVisible();
		await page.evaluate(() => {
			Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		const paused = page.locator('dialog.paused');
		await expect(paused).toBeVisible();
		await paused.locator('button.primary').tap();
		await expect(paused).toBeHidden();
		await expect(page.locator('.joystick')).toBeVisible();
		expect(await lockHolder(page)).toBeNull();
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the page is the plain document: no Join or Paused card, and the cards read inline', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('dialog.gate').first()).toBeHidden();
		await expect(page.locator('dialog.gate').last()).toBeHidden();
		await expect(page.locator('main dialog').first()).toBeVisible();
	});
});

test('the plain document never flashes before the engine takes the page, and shows without JavaScript', async ({ browser }) => {
	const shown = (page: Page) => page.locator('body > div').evaluate((d) => getComputedStyle(d).visibility);
	// The engine's chunk, the one that says 'No 2D canvas', held back until the test lets it go.
	let release = () => {};
	const held = new Promise<void>((done) => (release = done));
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.route('**/_app/immutable/**/*.js', async (route) => {
		const response = await route.fetch(), body = await response.text();
		if (body.includes('No 2D canvas')) await held;
		await route.fulfill({ response, body });
	});
	await page.goto('/');
	await expect.poll(() => shown(page)).toBe('hidden');
	release();
	await expect(page.locator('dialog.join')).toBeVisible();
	expect(await shown(page)).toBe('visible');
	await context.close();
	const plain = await browser.newContext({ javaScriptEnabled: false });
	const still = await plain.newPage();
	await still.goto('/');
	await expect(still.getByRole('heading', { level: 1 })).toBeVisible();
	await plain.close();
});
