// Seam 2: analytics (buildout ticket 23) as pure functions and a tracker driven through a fake gtag: whether the consent
// bar shows and GA loads, which links count as contact clicks, and what reaches gtag before, at and after a choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, contactMethod, european, initial, sceneOf, type Consent } from '../src/lib/analytics/consent.ts';
import { Tracker } from '../src/lib/analytics/tracker.ts';
import { beaconToken, measurementId } from '../svelte.config.js';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SLU } from '../src/lib/scenes/slu.ts';

test('timezones: Europe/*, the Atlantic EU zones and Africa/Ceuta ask; Cyprus too; everywhere else does not', () => {
	for (const tz of ['Europe/Paris', 'Europe/London', 'Europe/Zurich', 'Europe/Kyiv', 'Atlantic/Canary', 'Atlantic/Azores', 'Atlantic/Madeira', 'Atlantic/Reykjavik', 'Africa/Ceuta', 'Asia/Nicosia', 'Asia/Famagusta'])
		assert.ok(european(tz), tz);
	for (const tz of ['America/Chicago', 'UTC', 'Africa/Casablanca', 'Asia/Tokyo', 'Atlantic/Bermuda', 'Australia/Sydney', '', 'Europe'])
		assert.ok(!european(tz), tz);
});

test('consent at load: no id is off, GPC never loads, a stored choice stands, else Europe asks and the rest load', () => {
	const id = 'G-TEST';
	assert.deepEqual(initial({ id: '', gpc: false, timeZone: 'Europe/Paris' }), { is: 'off' });
	assert.deepEqual(initial({ id: '', gpc: true, timeZone: 'America/Chicago', stored: 'granted' }), { is: 'off' });
	for (const stored of [undefined, 'granted', 'denied'] as const)
		for (const timeZone of ['Europe/Paris', 'America/Chicago'])
			assert.deepEqual(initial({ id, gpc: true, timeZone, stored }), { is: 'gpc' }, `${stored} ${timeZone}`);
	assert.deepEqual(initial({ id, gpc: false, timeZone: 'Europe/Paris' }), { is: 'asking' });
	assert.deepEqual(initial({ id, gpc: false, timeZone: 'America/Chicago' }), { is: 'granted' });
	for (const timeZone of ['Europe/Paris', 'America/Chicago']) {
		assert.deepEqual(initial({ id, gpc: false, timeZone, stored: 'granted' }), { is: 'granted', chosen: true }, timeZone);
		assert.deepEqual(initial({ id, gpc: false, timeZone, stored: 'denied' }), { is: 'denied' }, timeZone);
	}
	// Do Not Track is ignored: there is no input for it.
});

test('contact clicks: the resume, email, LinkedIn, GitHub and Strava links, from the signpost and the cards; nothing else', () => {
	const base = 'https://barmadden.com/';
	const signpost = OVERWORLD.signpost.contacts.map((l) => contactMethod(l.href, base));
	assert.deepEqual(signpost, ['resume', 'email', 'linkedin', 'github']);
	const cards = [...OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props)), ...SLU.props].flatMap((p) => p.links ?? []);
	assert.deepEqual(new Set(cards.map((l) => contactMethod(l.href, base))), new Set(['strava', 'github']));
	for (const href of ['#belleville', '/moosylvania', '/#slu', 'https://example.com/resume', 'https://notgithub.com/x', 'javascript:void 0', 'http://[bad'])
		assert.equal(contactMethod(href, base), null, href);
	assert.equal(contactMethod('https://gist.github.com/obj63mc', base), 'github');
});

test('scenes: the page path names the room scene, the overworld at the root', () => {
	assert.equal(sceneOf('/'), 'overworld');
	assert.equal(sceneOf('/slu'), 'slu');
	assert.equal(sceneOf('/moosylvania/'), 'moosylvania');
});

test('the backstop: a region-denied default for the EEA, the UK and Switzerland', () => {
	assert.equal(REGIONS.length, 27 + 3 + 2);
	for (const r of ['FR', 'DE', 'IE', 'CY', 'IS', 'LI', 'NO', 'GB', 'CH']) assert.ok(REGIONS.includes(r), r);
	assert.ok(!REGIONS.includes('US'));
});

test('the build: the measurement ID reaches the site only on a main build in Workers Builds', () => {
	assert.equal(measurementId({ WORKERS_CI_BRANCH: 'main', PUBLIC_GA_ID: 'G-1' }), 'G-1');
	assert.equal(measurementId({ WORKERS_CI_BRANCH: 'feature/x', PUBLIC_GA_ID: 'G-1' }), '');
	assert.equal(measurementId({ PUBLIC_GA_ID: 'G-1' }), '', 'a local build');
	assert.equal(measurementId({ WORKERS_CI_BRANCH: 'main' }), '');
});

test("the build: Cloudflare's beacon token reaches the site only on a main build too, the site's own unless another is named", () => {
	const own = beaconToken({ WORKERS_CI_BRANCH: 'main' });
	assert.match(own, /^[0-9a-f]{32}$/);
	assert.equal(beaconToken({ WORKERS_CI_BRANCH: 'main', PUBLIC_CF_BEACON: 'another' }), 'another');
	assert.equal(beaconToken({ WORKERS_CI_BRANCH: 'main', PUBLIC_CF_BEACON: '' }), '', 'named as none');
	for (const env of [{ WORKERS_CI_BRANCH: 'feature/x' }, {}, { PUBLIC_CF_BEACON: 'another' }]) assert.equal(beaconToken(env), '', JSON.stringify(env));
});

/** A tracker over a fake gtag: every call it made, and how often it asked for gtag.js. */
function tracked(consent: Consent) {
	const calls: unknown[][] = [];
	let loads = 0;
	const t = new Tracker('G-TEST', consent, (...args) => void calls.push(args), () => void loads++);
	return { t, calls, loads: () => loads };
}
const events = (calls: unknown[][]) => calls.filter((c) => c[0] === 'event').map((c) => c.slice(1));
const consents = (calls: unknown[][]) => calls.filter((c) => c[0] === 'consent').map((c) => c.slice(1));

test('granted from the start: set up once, ad signals denied, the region backstop, no automatic page view, then events', () => {
	const { t, calls, loads } = tracked({ is: 'granted' });
	assert.equal(loads(), 1);
	assert.deepEqual(consents(calls), [
		['default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' }],
		['default', { analytics_storage: 'denied', region: REGIONS }]
	]);
	assert.equal(calls[2][0], 'js');
	assert.ok(calls[2][1] instanceof Date);
	assert.deepEqual(calls[3], ['config', 'G-TEST', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false }]);
	t.event('page_view', { page_location: 'https://barmadden.com/' });
	t.event('card_open', { prop_id: 'moose', scene: 'overworld' });
	assert.deepEqual(events(calls), [
		['page_view', { page_location: 'https://barmadden.com/' }],
		['card_open', { prop_id: 'moose', scene: 'overworld' }]
	]);
	assert.equal(t.state, 'granted');
});

test('asking: events wait in memory; Allow grants, flushes them in order and loads gtag once', () => {
	const { t, calls, loads } = tracked({ is: 'asking' });
	t.event('page_view', { page_location: 'https://barmadden.com/' });
	t.event('cosmetic_earned', { cosmetic_id: 4 });
	assert.deepEqual(calls, []);
	assert.equal(loads(), 0);
	t.choose('granted');
	assert.equal(loads(), 1);
	assert.deepEqual(consents(calls).at(-1), ['update', { analytics_storage: 'granted' }]);
	assert.deepEqual(events(calls), [['page_view', { page_location: 'https://barmadden.com/' }], ['cosmetic_earned', { cosmetic_id: 4 }]]);
	const update = calls.findIndex((c) => c[0] === 'consent' && c[1] === 'update');
	assert.ok(update < calls.findIndex((c) => c[0] === 'event'), 'granted before the queued events go');
	t.event('gold_cursor', {});
	t.choose('granted');
	assert.equal(loads(), 1);
	assert.deepEqual(events(calls).at(-1), ['gold_cursor', {}]);
});

test('asking: No thanks discards the queue, and gtag never loads nor hears anything', () => {
	const { t, calls, loads } = tracked({ is: 'asking' });
	t.event('page_view', { page_location: 'https://barmadden.com/' });
	t.choose('denied');
	t.event('card_open', { prop_id: 'moose', scene: 'overworld' });
	assert.deepEqual(calls, []);
	assert.equal(loads(), 0);
	assert.equal(t.state, 'denied');
});

test('No thanks after gtag loaded sends consent update denied and nothing after it; Allow again grants again', () => {
	const { t, calls } = tracked({ is: 'granted' });
	t.event('page_view', { page_location: 'https://barmadden.com/' });
	t.choose('denied');
	assert.deepEqual(calls.at(-1), ['consent', 'update', { analytics_storage: 'denied' }]);
	const sent = calls.length;
	t.event('card_open', { prop_id: 'moose', scene: 'overworld' });
	t.choose('denied');
	assert.equal(calls.length, sent, 'denied twice sends it once');
	t.choose('granted');
	assert.deepEqual(calls.at(-1), ['consent', 'update', { analytics_storage: 'granted' }]);
	t.event('gold_cursor', {});
	assert.deepEqual(events(calls).at(-1), ['gold_cursor', {}]);
});

test('a stored Allow grants storage over the European backstop on every later visit, before any event', () => {
	const { t, calls } = tracked({ is: 'granted', chosen: true });
	t.event('page_view', { page_location: 'https://barmadden.com/' });
	assert.deepEqual(consents(calls).at(-1), ['update', { analytics_storage: 'granted' }]);
	const update = calls.findIndex((c) => c[0] === 'consent' && c[1] === 'update'), first = calls.findIndex((c) => c[0] === 'event');
	assert.ok(update >= 0 && update < first, 'the update precedes the first event');
});

test('stored denied, then Allow from the icon: set up and load then, no update for a denial never sent', () => {
	const { t, calls, loads } = tracked({ is: 'denied' });
	t.event('page_view', { page_location: 'https://barmadden.com/slu' });
	assert.deepEqual(calls, []);
	t.choose('granted');
	assert.equal(loads(), 1);
	assert.equal(calls[3][0], 'config');
	assert.deepEqual(events(calls), [], 'what happened while denied was never kept');
});

test('off and GPC: nothing ever reaches gtag, whatever is chosen', () => {
	for (const is of ['off', 'gpc'] as const) {
		const { t, calls, loads } = tracked({ is });
		t.event('page_view', { page_location: 'https://barmadden.com/' });
		t.choose('granted');
		t.event('card_open', { prop_id: 'moose', scene: 'overworld' });
		assert.deepEqual(calls, [], is);
		assert.equal(loads(), 0, is);
		assert.equal(t.state, is);
	}
});
