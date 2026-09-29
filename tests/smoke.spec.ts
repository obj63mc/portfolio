// Seam 4: the browser smoke (buildout ticket 09) over the built site: Join, pause and resume, and a card opened and closed
// with the keyboard and with the drawn cursor; and touch on an emulated phone (ticket 10), with real touches. A headless tab
// can't take a real pointer lock, so a stand-in grants it and the tests send the mouse's movement and clicks to the lock
// element, as a real lock does; the lock itself stays hands-on.
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

/** The drawn cursor's tip, CSS px, read off the cursor canvas: the top-left of its painted pixels; null when none is drawn. */
const tip = (page: Page) =>
	page.evaluate(() => {
		const c = document.querySelector<HTMLCanvasElement>('canvas.cursors')!;
		const { data, width } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
		let x0 = Infinity, y0 = Infinity;
		for (let i = 3; i < data.length; i += 4) {
			if (!data[i]) continue;
			x0 = Math.min(x0, ((i - 3) / 4) % width);
			y0 = Math.min(y0, Math.floor((i - 3) / 4 / width));
		}
		const k = c.width / innerWidth;
		return x0 === Infinity ? null : { x: x0 / k, y: y0 / k };
	});
/** How far the drawn cursor is from `p`; its outline reaches a pixel or two past the tip. */
const off = async (page: Page, p: Point) => {
	const t = await tip(page);
	return t ? Math.hypot(t.x - p.x, t.y - p.y) : Infinity;
};
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

/** Joins with a click near the Join button's corner, where the cursor starts, and waits for the lock. */
async function join(page: Page) {
	const b = (await page.getByRole('button', { name: 'Join' }).boundingBox())!, at = { x: b.x + 8, y: b.y + 8 };
	await page.mouse.click(at.x, at.y);
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
	await expect.poll(() => lockHolder(page)).toBe('scene');
	await expect.poll(() => off(page, at)).toBeLessThan(5);
	return at;
}

test.beforeEach(({ page }) => page.addInitScript(fakeLock));

test('before Join only the Join card takes input, nothing moves and no cursor is drawn', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Join' })).toBeFocused();
	const camera = await page.locator('main').getAttribute('style');
	for (let i = 0; i < 4; i++) {
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => !!document.activeElement?.closest('main, .controls'))).toBe(false);
	}
	await page.keyboard.press('Escape'); // before any gesture, when Chrome won't let a page refuse the cancel
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeVisible();
	await page.mouse.move(1270, 360); // deep in the push band
	await hold(page, 'ArrowRight', 400);
	expect(await page.locator('main').getAttribute('style')).toBe(camera);
	expect(await tip(page)).toBeNull();
});

test.describe('the locked cursor in the SLU lab, the whole height in view', () => {
	test.use({ viewport: { width: 1920, height: 1600 } });

	test('Join locks the pointer where pressed; the drawn cursor opens a card, closes it and follows its link', async ({ page }) => {
		await page.goto('/slu');
		let at = await join(page);
		const moveTo = async (p: Point) => {
			await nudge(page, p.x - at.x, p.y - at.y);
			await expect.poll(() => off(page, p)).toBeLessThan(5);
			at = p;
		};
		const card = page.getByRole('dialog', { name: 'Lab workstation' });
		const prop = page.getByRole('button', { name: /^Lab workstation/ });

		await moveTo(await centre(prop));
		await lockedClick(page);
		await expect(card).toBeVisible();
		const close = card.getByRole('button', { name: 'Close' });
		await moveTo(await centre(close));
		await expect(close).toHaveCSS('outline-style', 'solid'); // the hover mark under the lock
		await lockedClick(page);
		await expect(card).toBeHidden();

		await moveTo(await centre(prop));
		await lockedClick(page);
		await expect(card).toBeVisible();
		await page.route('https://github.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'GitHub' }));
		await moveTo(await centre(card.getByRole('link', { name: 'GitHub' })));
		await lockedClick(page);
		await expect(page).toHaveURL('https://github.com/obj63mc');
	});
});

test('Esc, blur and a hidden tab pause; Resume re-locks with the cursor where it froze, or says to try again', async ({ page }) => {
	await page.goto('/');
	const at = await join(page);
	await nudge(page, 150, 80);
	const frozen = { x: at.x + 150, y: at.y + 80 };
	await expect.poll(() => off(page, frozen)).toBeLessThan(5);
	const paused = page.getByRole('dialog', { name: 'Paused, click to resume' });
	const resume = paused.getByRole('button', { name: 'Resume' });
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
	await expect(paused.getByText('Try again in a moment')).toBeVisible();
	await expect(paused).toBeVisible();
	await page.evaluate(() => ((window as Stand).refuseLock = false));
	await resumed();
	await expect(paused.getByText('Try again in a moment')).toBeHidden();
});

test('a refused lock at Join leaves the unlocked mouse: the drawn cursor follows the OS pointer', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => ((window as Stand).refuseLock = true));
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
	await page.mouse.move(400, 300);
	await expect.poll(() => off(page, { x: 400, y: 300 })).toBeLessThan(5);
	expect(await lockHolder(page)).toBeNull();
	await expect(page.locator('.joystick'), 'the touch controls only without a mouse').toBeHidden();
});

test('the keyboard joins with the lock; Esc in a card closes it without pausing, and a mouse click takes the lock back', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Join' })).toBeFocused();
	const start = await centre(page.getByRole('button', { name: 'Join' }));
	await page.keyboard.press('Enter');
	await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
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
	const paused = page.getByRole('dialog', { name: 'Paused, click to resume' });
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

test.describe('a phone, with no mouse or trackpad', () => {
	test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

	/** One finger's real touches, through the DevTools protocol, so the page gets real pointer events. */
	async function finger(page: Page) {
		const cdp = await page.context().newCDPSession(page);
		const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
		return { down: (p: Point) => send('touchStart', p), move: (p: Point) => send('touchMove', p), up: () => send('touchEnd') };
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

		const b = (await page.getByRole('button', { name: 'Join' }).boundingBox())!;
		await page.touchscreen.tap(b.x + 8, b.y + 8);
		await expect(page.getByRole('dialog', { name: 'Join' })).toBeHidden();
		await expect.poll(() => off(page, { x: b.x + 8, y: b.y + 8 })).toBeLessThan(5);
		await expect(stick).toBeVisible();
		expect(await lockHolder(page), 'no lock on touch').toBeNull();

		// A tap on a prop moves the cursor there and opens its card; a tap on Close closes it.
		const welcome = page.getByRole('button', { name: /^Welcome sign/ }), card = page.getByRole('dialog', { name: 'Welcome sign' });
		const at = await centre(welcome);
		await page.touchscreen.tap(at.x, at.y);
		await expect(card).toBeVisible();
		await expect.poll(() => off(page, at)).toBeLessThan(5);
		const close = await centre(card.getByRole('button', { name: 'Close' }));
		await page.touchscreen.tap(close.x, close.y);
		await expect(card).toBeHidden();

		// The joystick tapped without steering clicks what the cursor is over, wherever on the stick the thumb lands.
		const hub = await centre(stick);
		await f.down({ x: hub.x + 35, y: hub.y - 20 });
		await f.up();
		await expect(card).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(card).toBeHidden();

		// A finger that wanders under 6 px still taps.
		const moose = await centre(page.getByRole('button', { name: /^The moose/ }));
		await drag(page, f, moose, { x: 2, y: 0 }, 2);
		await f.up();
		await expect(page.getByRole('dialog', { name: 'The moose' })).toBeVisible();
		await page.keyboard.press('Escape');
		expect(await camera(page), 'and pans nothing').toEqual(start);
		const cursor = { x: moose.x + 4, y: moose.y }; // where the finger lifted
		await expect.poll(() => off(page, cursor)).toBeLessThan(5);

		// Past 6 px it is a drag, from a prop too: the view catches up with the finger, and the click the browser still sends
		// for a finger inside its own tap slop opens nothing.
		await drag(page, f, moose, { x: 2, y: 0 }, 4);
		await f.up();
		const nudged = await camera(page);
		expect(nudged).toEqual({ x: start.x - 8, y: start.y });
		await page.waitForTimeout(200);
		await expect(page.getByRole('dialog', { name: 'The moose' })).toBeHidden();

		// A drag pans against the finger and leaves the cursor where it is in the world; held still, it doesn't coast.
		await drag(page, f, ground, { x: -15, y: 0 }, 10);
		await page.waitForTimeout(150);
		await f.up();
		expect(await camera(page)).toEqual({ x: nudged.x + 150, y: nudged.y });
		expect(await off(page, { x: cursor.x + 8 - 150, y: cursor.y })).toBeLessThan(5);
		await page.waitForTimeout(200);
		expect(await camera(page), 'no fling').toEqual({ x: nudged.x + 150, y: nudged.y });

		// Dragged the other way far enough, the cursor is carried along inside the edge.
		await drag(page, f, { x: 40, y: 650 }, { x: 25, y: 0 }, 12);
		await page.waitForTimeout(150);
		await f.up();
		expect(await off(page, { x: 390 - 24, y: cursor.y })).toBeLessThan(5);

		// Let go while moving, it coasts on.
		await drag(page, f, ground, { x: -30, y: 0 }, 6);
		await f.up();
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
		await page.getByRole('button', { name: 'Join' }).tap();
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
		// Midtown, where no prop is near the toggles once the cursor is on them. Dragging the view up to the scene's top
		// carries the cursor down by the camera's height, so Join is tapped that far above the toggles.
		await page.goto('/#midtown');
		const toggles = (await page.locator('.controls').boundingBox())!, join = (await page.getByRole('button', { name: 'Join' }).boundingBox())!;
		const at = { x: join.x + 8, y: toggles.y + toggles.height / 2 - (await camera(page)).y };
		expect(at.y > join.y && at.y < join.y + join.height, 'the Join tap on the button').toBe(true);
		await page.touchscreen.tap(at.x, at.y);
		const f = await finger(page), hub = await centre(page.locator('.joystick'));
		await drag(page, f, { x: 320, y: 100 }, { x: 0, y: 35 }, 20);
		await page.waitForTimeout(150);
		await f.up();
		const on = (await tip(page))!;
		expect(on.y > toggles.y && on.y < toggles.y + toggles.height && on.x > toggles.x && on.x < toggles.x + toggles.width, 'the cursor sits on the toggles').toBe(true);
		await page.waitForTimeout(100);
		await expect(page.locator('.controls .hot')).toHaveCount(0);
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

	test('a hidden tab pauses; the Resume tap goes back to touch without a lock', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Join' }).tap();
		await expect(page.locator('.joystick')).toBeVisible();
		await page.evaluate(() => {
			Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		const paused = page.getByRole('dialog', { name: 'Paused, click to resume' });
		await expect(paused).toBeVisible();
		await paused.getByRole('button', { name: 'Resume' }).tap();
		await expect(paused).toBeHidden();
		await expect(page.locator('.joystick')).toBeVisible();
		expect(await lockHolder(page)).toBeNull();
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the page is the plain document: no Join or Paused card, and the cards read inline', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Join' })).toBeHidden();
		await expect(page.getByText('Paused, click to resume')).toBeHidden();
		await expect(page.getByText('Chief Architect').first()).toBeVisible();
	});
});
