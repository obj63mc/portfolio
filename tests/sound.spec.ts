// Seam 4: the sound over the built site (buildouts ticket 22 and 21): nothing under /audio/ is fetched before Join or while
// muted, the Sound toggle's choice is kept, the one-shots sound on their events and nowhere else, and the theme gives way
// to a sub-scene's music and comes back where it left off. A spy follows each decoded buffer, and each file an audio
// element plays, back to the file it was fetched from and records every one that starts playing: one-shots by id, a
// loop's passes with the offset each starts from, a bed's from its buffer and the streamed music's from its element. The
// lock is refused, so the OS pointer is the cursor. The parts that need a sourced file skip until `npm run audio` has
// encoded some.
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { loopsFor } from '../src/lib/loops.ts';
import { clickSounds, needed } from '../src/lib/sound.ts';

const FILES: unknown = JSON.parse(readFileSync(new URL('../src/lib/sound-files.json', import.meta.url), 'utf8'));
const sourced = (ids: Iterable<string>) => [...ids].filter((id) => typeof FILES === 'object' && FILES !== null && id in FILES).sort();

function spy() {
	const from = new WeakMap<object, string>(), played: string[] = [], passes: { id: string; offset: number }[] = [];
	Object.assign(window, { played, passes });
	const arrayBuffer = Response.prototype.arrayBuffer;
	Response.prototype.arrayBuffer = async function () {
		const data = await arrayBuffer.call(this);
		from.set(data, this.url);
		return data;
	};
	const decode = BaseAudioContext.prototype.decodeAudioData;
	BaseAudioContext.prototype.decodeAudioData = async function (this: BaseAudioContext, data: ArrayBuffer) {
		const url = from.get(data), buffer = await decode.call(this, data);
		if (url) from.set(buffer, url);
		return buffer;
	} as typeof decode;
	// The streamed music: the fetched file is handed to an audio element at a blob: URL.
	const files = new Map<string, string>();
	const blob = Response.prototype.blob;
	Response.prototype.blob = async function () {
		const data = await blob.call(this);
		from.set(data, this.url);
		return data;
	};
	const createObjectURL = URL.createObjectURL;
	URL.createObjectURL = (obj) => {
		const url = createObjectURL(obj), source = from.get(obj);
		if (source) files.set(url, source);
		return url;
	};
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		const url = files.get(this.src), id = url && /\/audio\/([a-z-]+)\./.exec(url)![1];
		if (id) passes.push({ id, offset: this.currentTime });
		return play.call(this);
	};
	const start = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
		const url = this.buffer && from.get(this.buffer), id = url && /\/audio\/([a-z-]+)\./.exec(url)![1];
		if (id && /^(bed-|music-|theme$)/.test(id)) passes.push({ id, offset: args[1] ?? 0 });
		else if (id) played.push(id);
		return start.apply(this, args);
	};
	// The lock refused, as some browsers do: the unlocked mouse carries on (spec: Gaps 6).
	Element.prototype.requestPointerLock = () => Promise.reject(new DOMException('Refused', 'NotAllowedError'));
}

const played = (page: Page) => page.evaluate(() => [...((window as Window & { played?: string[] }).played ?? [])].sort());
/** Every pass a loop has started, in order, with the offset it started from. */
const passes = (page: Page) => page.evaluate(() => [...((window as Window & { passes?: { id: string; offset: number }[] }).passes ?? [])]);
/** The corner's Sound toggle; the Paused card has its own. */
const toggle = (page: Page) => page.locator('.controls:not(dialog *) .sound');

/** Every sound the page fetched, by id; `each` counts the fetches of each. */
function fetched(page: Page) {
	const each = new Map<string, number>();
	page.on('request', (r) => {
		const m = /\/audio\/([a-z-]+)\.[0-9a-f]{8}\.mp3$/.exec(new URL(r.url()).pathname);
		if (m) each.set(m[1], (each.get(m[1]) ?? 0) + 1);
	});
	return Object.assign(() => [...each.keys()].sort(), { each });
}

async function join(page: Page) {
	await page.locator('dialog.join button').click();
	await expect(page.locator('dialog.join')).toBeHidden();
}

test.beforeEach(({ page }) => page.addInitScript(spy));
// A whole sub-scene in view at the session's scale, so every prop is on screen to click.
test.use({ viewport: { width: 2845, height: 1600 } });

test('nothing is fetched before Join or while muted; the toggle unmutes inside its press, and its choice is kept', async ({ page }) => {
	const ids = fetched(page);
	await page.goto('/slu');
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
	await page.waitForTimeout(500);
	expect(ids()).toEqual([]);
	await join(page);
	// The lab's one-shots, its bed and the theme, 12 dB down there (ticket 21).
	const slu = [...needed(SUB_SCENES.slu), ...loopsFor(SUB_SCENES.slu)];
	await expect.poll(ids).toEqual(sourced(slu));

	await toggle(page).click();
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
	await page.reload();
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
	const again = fetched(page);
	await join(page);
	await page.waitForTimeout(500);
	expect(again()).toEqual([]);
	await toggle(page).click();
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
	await expect.poll(again).toEqual(sourced(slu));
});

test("a card's click sounds it and its prop's signature, its closing sounds; hover and another tab's cosmetic are silent", async ({ page }) => {
	test.skip(!sourced(['card']).length, 'no card sounds sourced yet');
	await page.goto('/slu');
	await join(page);
	const diploma = page.locator('[data-prop="diploma"] > button');
	await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('/audio/')).length)).toBeGreaterThan(0);
	await page.waitForTimeout(500); // decoded
	await diploma.hover();
	await page.waitForTimeout(300);
	expect(await played(page)).toEqual([]);

	await diploma.click();
	await expect(page.locator('[data-prop="diploma"] dialog')).toBeVisible();
	await expect.poll(() => played(page)).toEqual(sourced([...clickSounds(SUB_SCENES.slu.props.find((p) => p.id === 'diploma')), 'chime']));
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-prop="diploma"] dialog')).toBeHidden();
	await expect.poll(() => played(page)).toEqual(sourced(['card', 'chime', 'card']));

	const before = await played(page);
	await page.evaluate(() => {
		const stored = JSON.parse(localStorage.getItem('stl-portfolio')!);
		const newValue = JSON.stringify({ ...stored, worn: 5, earned: [...stored.earned, 5] });
		dispatchEvent(new StorageEvent('storage', { key: 'stl-portfolio', newValue }));
	});
	await page.waitForTimeout(300);
	expect(await played(page)).toEqual(before);
});

test('a poster starts the reel, and the projector start plays for the room', async ({ page }) => {
	test.skip(!sourced(['projector']).length, 'no projector sound sourced yet');
	await page.goto('/foundry');
	await join(page);
	await page.waitForTimeout(800); // decoded
	await page.locator('[data-prop="poster-lorax"] > button').click();
	await expect.poll(() => played(page), { timeout: 3000 }).toContain('projector');
	expect(await played(page)).not.toContain('card');
});

// A card's video, a Side Project bottle's: the lobby TV plays muted and has no card (tv.spec.ts).
test("a video's own sound follows the toggle: muted while it is off, unmuted by its press", async ({ page }) => {
	await page.goto('/side-project');
	await join(page);
	await toggle(page).click();
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
	const video = page.locator('[data-prop="bottle-sapporo"] video');
	await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-prop="bottle-sapporo"] > button')!.click());
	await expect(page.locator('[data-prop="bottle-sapporo"] dialog')).toBeVisible();
	expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-prop="bottle-sapporo"] dialog')).toBeHidden();
	await toggle(page).click();
	await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
	expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
});

test("paused, the card's own Sound toggle mutes, and a card's video holds until Resume", async ({ page }) => {
	await page.goto('/side-project');
	await join(page);
	const tv = page.locator('[data-prop="bottle-sapporo"] video'), playing = () => tv.evaluate((v: HTMLVideoElement) => !v.paused);
	await page.locator('[data-prop="bottle-sapporo"] > button').focus();
	await page.keyboard.press('Enter');
	await expect.poll(playing).toBe(true);
	await page.evaluate(() => dispatchEvent(new Event('blur')));
	const paused = page.locator('dialog.paused');
	await expect(paused).toBeVisible();
	expect(await playing()).toBe(false);
	await paused.locator('.sound').click();
	await expect(paused.locator('.sound')).toHaveAttribute('aria-pressed', 'false');
	expect(await tv.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
	await expect(paused, 'the toggle is no Resume').toBeVisible();
	expect(await playing()).toBe(false);
	await paused.locator('button.primary').click();
	await expect.poll(playing).toBe(true);
});

test("Join starts the bed and the theme; in Brennan's the theme gives way to the jazz, and back out it resumes where it left off", async ({ page }) => {
	test.skip(sourced(['theme', 'music-brennans', 'bed-maplewood']).length < 3, 'no beds or music sourced yet');
	const ids = fetched(page);
	await page.goto('/');
	await page.waitForTimeout(300);
	expect(ids(), 'nothing before Join').toEqual([]);
	await join(page);
	// Arriving at the welcome sign, Maplewood's bed and the theme start.
	await expect.poll(async () => (await passes(page)).map((p) => p.id)).toEqual(expect.arrayContaining(['bed-maplewood', 'theme']));
	await page.waitForTimeout(2000);
	await page.evaluate(() => document.querySelector<HTMLAnchorElement>('main a[href="/brennans"]')!.click());
	await expect(page).toHaveURL(/\/brennans$/);
	await expect.poll(async () => (await passes(page)).map((p) => p.id)).toContain('music-brennans');
	await page.waitForTimeout(2000);
	const before = (await passes(page)).filter((p) => p.id === 'theme').length;
	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	// Back on the overworld the theme starts again from the playhead it left: past its start, and short of where it would
	// be had it played on through Brennan's.
	await expect.poll(async () => (await passes(page)).filter((p) => p.id === 'theme').length).toBeGreaterThan(before);
	const resumed = (await passes(page)).filter((p) => p.id === 'theme').at(-1)!;
	expect(resumed.offset).toBeGreaterThan(1);
	expect(resumed.offset).toBeLessThan(5);
	expect(ids.each.get('theme'), 'the theme fetched once').toBe(1);
});
