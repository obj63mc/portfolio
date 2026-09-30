// Seam 4: the sound over the built site (buildout ticket 22): nothing under /audio/ is fetched before Join or while muted,
// the Sound toggle's choice is kept, and the one-shots sound on their events and nowhere else. A spy follows each decoded
// buffer back to the file it was fetched from and records every one that starts playing. The lock is refused, so the
// OS pointer is the cursor. The parts that need a sourced file skip until `npm run audio` has encoded some.
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { clickSounds, needed, type SoundId } from '../src/lib/sound.ts';

const FILES: Partial<Record<SoundId, string>> = JSON.parse(readFileSync(new URL('../src/lib/sound-files.json', import.meta.url), 'utf8'));
const sourced = (ids: Iterable<SoundId>) => [...ids].filter((id) => FILES[id]).sort();

function spy() {
	const from = new WeakMap<object, string>(), played: string[] = [];
	(window as Window & { played?: string[] }).played = played;
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
	const start = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
		const url = this.buffer && from.get(this.buffer);
		if (url) played.push(/\/audio\/([a-z-]+)\./.exec(url)![1]);
		return start.apply(this, args);
	};
	// The lock refused, as some browsers do: the unlocked mouse carries on (spec: Gaps 6).
	Element.prototype.requestPointerLock = () => Promise.reject(new DOMException('Refused', 'NotAllowedError'));
}

const played = (page: Page) => page.evaluate(() => [...((window as Window & { played?: string[] }).played ?? [])].sort());
const toggle = (page: Page) => page.locator('.controls .sound');

/** Every one-shot the page fetched, by id. */
function fetched(page: Page) {
	const ids = new Set<string>();
	page.on('request', (r) => {
		const m = /\/audio\/([a-z-]+)\.[0-9a-f]{8}\.mp3$/.exec(new URL(r.url()).pathname);
		if (m) ids.add(m[1]);
	});
	return () => [...ids].sort();
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
	await expect.poll(ids).toEqual(sourced(needed(SUB_SCENES.slu)));

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
	await expect.poll(again).toEqual(sourced(needed(SUB_SCENES.slu)));
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
