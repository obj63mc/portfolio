// Seam 4 for analytics (buildout ticket 23): the consent bar in a European timezone, over the Join card and operable before
// Join, against the site built with a test measurement ID and a test beacon token, which playwright.config.ts builds into
// .smoke/ and serves on the port after the site's. Nothing reaches Google or Cloudflare's analytics: every request to
// their hosts is aborted, and recorded to show whether gtag.js and Cloudflare's beacon, which loads on the same answer,
// were asked for. A headless tab can't take a real pointer lock, so a stand-in refuses it and Join leaves the unlocked
// mouse, whose clicks land where they are sent.
import { test, expect, type Page } from '@playwright/test';

const GA = `http://localhost:${Number(process.env.SMOKE_PORT ?? 4173) + 1}`;

/** Requests for Google's hosts and Cloudflare's analytics, each aborted. */
async function google(page: Page) {
	const asked: string[] = [];
	await page.route(/googletagmanager\.com|google-analytics\.com|cloudflareinsights\.com/, (route) => (asked.push(route.request().url()), route.abort()));
	return asked;
}
const gtagJs = (asked: string[]) => asked.some((u) => u.startsWith('https://www.googletagmanager.com/gtag/js?id=G-SMOKETEST'));
/** Cloudflare's beacon, asked for at the one path the page policy allows. */
const beaconJs = (asked: string[]) => asked.includes('https://static.cloudflareinsights.com/beacon.min.js');
/** The token the beacon's own tag carries for it; none while there is no tag. */
const beaconToken = (page: Page) => page.evaluate(() => JSON.parse(document.querySelector<HTMLElement>('script[data-cf-beacon]')?.dataset.cfBeacon ?? '{}').token);

/** What the page queued for gtag.js, each call as an array. */
const queued = (page: Page) => page.evaluate(() => (window.dataLayer ?? []).map((call) => Array.from(call as ArrayLike<unknown>)));
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('stl-portfolio') ?? '{}').analytics);

/** The bar where it shows now; Allow is its first button, No thanks its second. */
const bar = (page: Page) => page.locator('.consent:popover-open');
const allow = (page: Page) => bar(page).locator('button').nth(0);
const noThanks = (page: Page) => bar(page).locator('button').nth(1);
const joinCard = (page: Page) => page.locator('dialog.join');

/**
 * The site loaded and its engine started, the Join card up. Before that the page is the plain document, with the bar on
 * it; once the card opens the bar moves into it.
 */
async function arrive(page: Page) {
	await page.goto(`${GA}/`);
	await expect(joinCard(page)).toBeVisible();
}

async function join(page: Page) {
	await joinCard(page).locator(':scope > button').click();
	await expect(joinCard(page)).toBeHidden();
}

test.beforeEach(({ page }) =>
	page.addInitScript(() => {
		Element.prototype.requestPointerLock = function () {
			setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')));
			return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
		};
	})
);

test.describe('in a European timezone', () => {
	test.use({ timezoneId: 'Europe/Paris' });

	test('the bar shows over the Join card and takes a keyboard and a click before Join; Allow loads gtag and Cloudflare\'s beacon and is kept', async ({ page }) => {
		const asked = await google(page);
		await arrive(page);
		await expect(bar(page)).toHaveCount(1);
		await expect(joinCard(page).locator('.consent:popover-open'), 'inside the modal card, the one place it stays operable').toHaveCount(1);
		// Tab from Join reaches the bar's buttons, and nothing else does: the page behind the card is inert.
		await joinCard(page).locator(':scope > button').focus();
		await page.keyboard.press('Tab');
		await expect(allow(page)).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(noThanks(page)).toBeFocused();
		for (const b of [allow(page), noThanks(page)]) await expect(b).toHaveAttribute('aria-pressed', 'false');
		await page.waitForTimeout(500);
		expect(asked, 'nothing loads before a choice, Google\'s or Cloudflare\'s').toEqual([]);
		expect(await queued(page), 'events wait in memory, not in the queue gtag.js reads').toEqual([]);

		// A real click: Playwright refuses it if the card's backdrop would take it.
		await allow(page).click();
		await expect(bar(page)).toHaveCount(0);
		await expect(joinCard(page), 'answering is not joining').toBeVisible();
		await expect(joinCard(page).locator(':scope > button'), 'focus back on Join').toBeFocused();
		await expect.poll(() => gtagJs(asked)).toBe(true);
		await expect.poll(() => beaconJs(asked), "Cloudflare's beacon on the same answer").toBe(true);
		expect(await beaconToken(page)).toBe('smoketest');
		const calls = await queued(page);
		const update = calls.findIndex((c) => c[0] === 'consent' && c[1] === 'update');
		expect(calls[update][2]).toEqual({ analytics_storage: 'granted' });
		expect(calls.slice(update + 1)).toEqual([['event', 'page_view', { page_location: `${GA}/` }]]);
		expect(await stored(page)).toBe('granted');

		await page.reload();
		await expect(joinCard(page)).toBeVisible();
		await page.waitForTimeout(300);
		await expect(bar(page), 'asked once').toHaveCount(0);
	});

	test('No thanks keeps gtag and the beacon away; the icon reopens the bar with it pressed, and Allow then loads both', async ({ page }) => {
		const asked = await google(page);
		await arrive(page);
		await noThanks(page).click();
		await expect(bar(page)).toHaveCount(0);
		expect(await stored(page)).toBe('denied');
		await join(page);
		// A card opened while declined is never kept for later.
		await page.locator('main [data-prop="welcome"] > button').focus();
		await page.keyboard.press('Enter');
		await page.keyboard.press('Escape');
		await page.waitForTimeout(3500);
		expect(asked, 'neither gtag.js nor the beacon').toEqual([]);
		expect(await queued(page)).toEqual([]);

		const icon = page.locator('.controls .analytics');
		await expect(icon).toHaveAttribute('aria-expanded', 'false');
		await icon.click();
		await expect(icon).toHaveAttribute('aria-expanded', 'true');
		await expect(bar(page)).toHaveCount(1);
		await expect(page.locator('dialog .consent:popover-open'), 'on the page once joined').toHaveCount(0);
		await expect(noThanks(page)).toHaveAttribute('aria-pressed', 'true');
		await expect(allow(page)).toHaveAttribute('aria-pressed', 'false');
		await allow(page).click();
		await expect(bar(page)).toHaveCount(0);
		await expect(icon, 'focus back on the icon').toBeFocused();
		await expect.poll(() => gtagJs(asked)).toBe(true);
		await expect.poll(() => beaconJs(asked)).toBe(true);
		expect((await queued(page)).filter((c) => c[0] === 'event'), 'what happened while declined stays unsent').toEqual([]);
		await icon.click();
		await expect(allow(page)).toHaveAttribute('aria-pressed', 'true');
		// No thanks after gtag has loaded tells it so.
		await noThanks(page).click();
		expect((await queued(page)).at(-1)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
	});

	test('joining without answering keeps the bar up on the page, still operable, over the scene', async ({ page }) => {
		await google(page);
		await arrive(page);
		await expect(bar(page)).toHaveCount(1);
		await join(page);
		await expect(bar(page)).toHaveCount(1);
		await expect(page.locator('dialog .consent:popover-open')).toHaveCount(0);
		await allow(page).click();
		await expect(bar(page)).toHaveCount(0);
		expect(await stored(page)).toBe('granted');
	});

	test('a choice made in another tab applies here: a denial after gtag loaded tells it so', async ({ page, context }) => {
		await google(page);
		await arrive(page);
		await allow(page).click();
		await expect.poll(async () => (await queued(page)).some((c) => c[0] === 'event')).toBe(true);
		const other = await context.newPage();
		await google(other);
		await arrive(other);
		await expect(bar(other), 'the choice is shared').toHaveCount(0);
		await join(other);
		await other.locator('.controls .analytics').click();
		await noThanks(other).click();
		await expect.poll(async () => (await queued(page)).at(-1)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
	});

	test('Global Privacy Control: neither gtag nor the beacon ever loads, and the reopened bar has both buttons disabled with a note', async ({ page }) => {
		await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
		const asked = await google(page);
		await arrive(page);
		await page.waitForTimeout(300);
		await expect(bar(page), 'nothing to ask').toHaveCount(0);
		await join(page);
		await page.locator('.controls .analytics').click();
		await expect(bar(page)).toHaveCount(1);
		for (const b of [allow(page), noThanks(page)]) {
			await expect(b).toBeDisabled();
			await expect(b).toHaveAttribute('aria-pressed', 'false');
		}
		await expect(bar(page).locator('.note')).toBeVisible();
		await page.waitForTimeout(3500);
		expect(asked).toEqual([]);
		expect(await queued(page)).toEqual([]);
	});
});

test.describe('elsewhere', () => {
	test.use({ timezoneId: 'America/Chicago' });

	test('no bar; gtag and the beacon load after the first frame, and gtag hears each scene entered, never a fragment', async ({ page }) => {
		const asked = await google(page);
		await arrive(page);
		await expect.poll(() => gtagJs(asked)).toBe(true);
		await expect.poll(() => beaconJs(asked)).toBe(true);
		await expect(bar(page)).toHaveCount(0);
		await expect(page.locator('.controls .analytics')).toHaveCount(0);
		const views = async () => (await queued(page)).filter((c) => c[0] === 'event' && c[1] === 'page_view').map((c) => c[2]);
		expect(await views()).toEqual([{ page_location: `${GA}/` }]);
		const calls = await queued(page);
		expect(calls.find((c) => c[0] === 'config')).toEqual(['config', 'G-SMOKETEST', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);
		expect(calls.filter((c) => c[0] === 'consent')[0][2]).toMatchObject({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
		await join(page);
		// A signpost district pans; the page stays counted once.
		await page.locator('#signpost a[href="#belleville"]').focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#belleville$/);
		// A card opened: its prop and scene. A contact link: its method.
		await page.locator('main [data-prop="welcome"] > button').focus();
		await page.keyboard.press('Enter');
		await page.keyboard.press('Escape');
		expect(await views()).toEqual([{ page_location: `${GA}/` }]);
		const events = (await queued(page)).filter((c) => c[0] === 'event').map((c) => c.slice(1));
		expect(events).toContainEqual(['card_open', { prop_id: 'welcome', scene: 'overworld' }]);
		// The ride sign's card links to Strava; the signpost links to the districts alone (Joe, 2026-10-01).
		await page.locator('main [data-prop="ride-sign"] > button').focus();
		await page.keyboard.press('Enter');
		const strava = page.locator('[data-prop="ride-sign"] dialog a[href*="strava.com"]').first();
		await strava.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
		await strava.focus();
		await page.keyboard.press('Enter');
		expect((await queued(page)).at(-1)).toEqual(['event', 'contact_click', { method: 'strava' }]);
	});
});
