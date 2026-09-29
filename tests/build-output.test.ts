// Seam 3: the prerendered HTML of every scene URL, as a crawler or screen reader sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { screenGist } from '../src/lib/scenes/foundry.ts';

const page = (file: string) => readFileSync(new URL(`../build/${file}`, import.meta.url), 'utf8');
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const withoutDialogs = (html: string) => html.replace(/<dialog[\s\S]*?<\/dialog>/g, '');
const texts = (html: string, tag: string) =>
	[...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
const opens = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const signpost = (layer: string) => layer.slice(layer.indexOf('<nav'), layer.indexOf('</nav>'));
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);

const overworldProps = OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props));
const subScenes = Object.values(SUB_SCENES);
const allProps = [...overworldProps, ...subScenes.flatMap((s) => s.props)];
const files = ['index.html', ...subScenes.map((s) => `${s.id}.html`)];

test('overworld: title, description and the shell around the layer', () => {
	const html = page('index.html');
	assert.equal(texts(html, 'title')[0], 'Joe Madden, St. Louis');
	assert.match(html, /<meta name="description" content="[^"]{20,}"/);
	assert.equal(opens(html, 'canvas').length, 2);
	assert.ok(opens(html, 'canvas').every((c) => c.includes('aria-hidden="true"')));
	assert.match(html, /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
	assert.match(html, /class="presence"[^>]*>\d+ here</);
	assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>Sound</);
	assert.match(html, /<button[^>]*>Analytics settings</);
});

test('overworld: skip link, h1, signpost, then districts west to east with their venues', () => {
	const layer = withoutDialogs(main(page('index.html')));
	assert.equal(hrefs(layer)[0], '#signpost-districts');
	assert.deepEqual(texts(layer, 'h1'), ['Joe Madden, St. Louis']);
	assert.deepEqual(texts(signpost(layer), 'a').slice(0, 4), ['Resume', 'Email', 'LinkedIn', 'GitHub']);
	assert.match(hrefs(signpost(layer))[0], /\.pdf$/);
	assert.match(hrefs(signpost(layer))[1], /^mailto:/);
	// West to east by centre x on the accepted master: the park lake sits west of the West End row.
	assert.deepEqual(hrefs(signpost(layer)).slice(4), ['#maplewood', '#carondelet-park', '#central-west-end', '#midtown', '#belleville']);
	assert.deepEqual(texts(layer, 'h2'), ['Maplewood', 'Carondelet Park', 'Central West End', 'Midtown', 'Belleville']);
	assert.deepEqual(texts(layer, 'h3'), [
		'Moosylvania', 'Side Project Cellar', 'Carondelet Park', "Brennan's", 'Saint Louis University', 'The Foundry', 'MonsterCommerce'
	]);
	assert.ok(layer.indexOf('<nav') < layer.indexOf('<h2'), 'signpost comes before the districts');
});

test('overworld: one button and one dialog per prop, named prop plus gist', () => {
	const html = main(page('index.html'));
	const buttons = opens(html, 'button').filter((b) => b.includes('aria-haspopup="dialog"'));
	assert.equal(buttons.length, overworldProps.length);
	assert.equal(opens(html, 'dialog').length, overworldProps.length);
	for (const p of overworldProps) assert.ok(texts(html, 'button').includes(`${p.name}: ${p.gist}`), p.id);
	assert.match(html, /<dialog[^>]*>[\s\S]*Chief Architect[\s\S]*<\/dialog>/);
	const moosylvania = texts(withoutDialogs(html).slice(html.indexOf('id="moosylvania"')), 'button').slice(0, 2);
	const byX = OVERWORLD.districts[0].venues[0].props.slice().sort((a, b) => a.rect.x - b.rect.x).map((p) => p.name);
	assert.deepEqual(moosylvania.map((t) => t.split(':')[0]), byX, 'props read left to right');
});

test('overworld: doors and contacts are links, everything else stays a button', () => {
	const layer = withoutDialogs(main(page('index.html')));
	const moosylvania = layer.slice(layer.indexOf('id="moosylvania"'), layer.indexOf('id="side-project"'));
	assert.ok(hrefs(moosylvania).includes('/moosylvania'), 'venue door links to the flat sub-scene URL');
	const external = hrefs(layer).filter((h) => /^(https?:|mailto:)/.test(h));
	assert.deepEqual(external, hrefs(signpost(layer)).filter((h) => /^(https?:|mailto:)/.test(h)), 'external links outside cards live only on the signpost');
});

test('overworld: a door link to every sub-scene', () => {
	const layer = withoutDialogs(main(page('index.html')));
	for (const s of subScenes) {
		const venue = layer.slice(layer.indexOf(`id="${s.id}"`));
		assert.ok(hrefs(venue.slice(0, venue.indexOf('</section>'))).includes(`/${s.id}`), s.id);
	}
});

test('sub-scenes: title with district, focusable h1, props in reading order, exit link to the venue anchor', () => {
	for (const s of subScenes) {
		const html = page(`${s.id}.html`);
		assert.equal(texts(html, 'title')[0], `${s.venue}, ${s.district}`);
		assert.match(html, /<meta name="description" content="[^"]{20,}"/);
		const layer = main(html);
		assert.match(layer, new RegExp(`<h1[^>]*tabindex="-1"[^>]*>${s.venue}</h1>`));
		assert.deepEqual(texts(withoutDialogs(layer), 'h2'), []);
		const buttons = opens(layer, 'button').filter((b) => b.includes('aria-haspopup="dialog"'));
		assert.equal(buttons.length, s.props.length, s.id);
		assert.equal(opens(layer, 'dialog').length, s.props.length, s.id);
		// Spec: props left to right, or top to bottom in a scene taller than wide (the Moosylvania lobby).
		const expected = [...s.props]
			.sort(s.h > s.w ? (a, b) => a.rect.y - b.rect.y : (a, b) => a.rect.x - b.rect.x)
			.map((p) => `${p.name}: ${p.gist}`);
		assert.deepEqual(texts(withoutDialogs(layer), 'button').slice(0, expected.length), expected, s.id);
		assert.ok(hrefs(withoutDialogs(layer)).includes(`/#${s.id}`), s.id);
	}
});

test('inventory: every prop from the content inventory is on some scene, one grant per cosmetic', () => {
	const ids = new Set(allProps.map((p) => p.id));
	const inventory = [
		'welcome', 'moose', 'computer-frontend', 'computer-backend', 'computer-cms', 'computer-data', 'moose-statue', 'meeting-tv',
		'diploma', 'whiteboard', 'workstation',
		'marquee', 'screen', 'poster-fast-five', 'poster-snow-white', 'poster-lorax',
		'mc-sign', 'server-rack',
		'chalkboard', 'bottle-bacardi', 'bottle-grey-goose', 'bottle-new-amsterdam', 'bottle-camarena', 'bottle-barefoot',
		'bottle-bud-light', 'bottle-ej', 'bottle-pink-whitney', 'bottle-rumchata', 'bottle-soonhari', 'brewery-sign',
		// The ATM (PayPal and Venmo) left Brennan's for the overworld; it returns to this list when Joe places it (ticket 25).
		'humidor-cohiba', 'humidor-macanudo', 'humidor-partagas', 'humidor-la-gloria-cubana', 'humidor-punch', 'stg-logo',
		'track', 'bike', 'ride-sign'
	];
	for (const id of inventory) assert.ok(ids.has(id), id);
	assert.equal(ids.size, allProps.length, 'prop ids are unique across scenes');
	assert.deepEqual([...new Set(allProps.map((p) => p.cosmetic).filter(Boolean))].sort(), [1, 2, 3, 4, 5, 6, 7]);
	const cards = (id: string) => allProps.find((p) => p.id === id)!.body.join(' ');
	const links = (id: string) => (allProps.find((p) => p.id === id)!.links ?? []).map((l) => l.href).join(' ');
	assert.match(links('workstation'), /github\.com/);
	assert.match(links('bike'), /strava\.com/);
	assert.match(cards('mc-sign'), /Network Solutions/);
	assert.match(cards('diploma'), /2005/);
});

test.todo('inventory: the ATM on the overworld, for PayPal and Venmo (buildout ticket 25)');

test('clearance: the Universal titles are told only on the Foundry screen and under its posters', () => {
	const titles = /Fast Five|Snow White|Lorax/;
	for (const file of files.filter((f) => f !== 'foundry.html')) assert.doesNotMatch(page(file), titles, file);
	let foundry = page('foundry.html');
	assert.match(foundry, /Universal Pictures Home Entertainment/);
	// Each match is one prop's own block: it never runs across another prop's opening tag, so the order doesn't matter.
	for (const id of ['screen', 'poster-fast-five', 'poster-snow-white', 'poster-lorax']) {
		const card = new RegExp(`<div class="prop">(?:(?!<div class="prop">)[\\s\\S])*?<dialog[^>]*aria-labelledby="card-${id}-title"[\\s\\S]*?</dialog>`);
		assert.match(foundry, card, id);
		foundry = foundry.replace(card, '');
	}
	assert.doesNotMatch(foundry, titles, 'outside the screen and poster props, the marquee and the head included, the titles are not told');
});

test('the shared screen: button name carries its state, prerendered idle', () => {
	assert.ok(texts(main(page('foundry.html')), 'button').includes(`Screen: ${screenGist()}`));
	assert.equal(screenGist('fast-five'), 'now playing Fast Five');
});

test('cards: every dialog is labelled and closes natively', () => {
	for (const file of files) {
		const dialogs = opens(page(file), 'dialog');
		assert.ok(dialogs.length > 0);
		assert.ok(dialogs.every((d) => d.includes('aria-labelledby=')), file);
		assert.equal(page(file).match(/<form method="dialog">/g)?.length, dialogs.length, file);
	}
	// Card titles stay inside the page's heading hierarchy when the cards read inline without JavaScript.
	assert.equal(texts(page('index.html'), 'h4').length, overworldProps.length);
	for (const s of subScenes) assert.equal(texts(page(`${s.id}.html`), 'h2').length, s.props.length, s.id);
	assert.match(page('index.html'), /<noscript>[\s\S]*dialog \{ display: block/);
});

test('headers: one CSP per page, allowing self, the GA hosts and the socket, with every inline script hashed', () => {
	const expected: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': ["'self'", 'https://www.googletagmanager.com'],
		'connect-src': ["'self'", 'wss://barmadden.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
		'img-src': ["'self'", 'https://*.google-analytics.com', 'https://*.googletagmanager.com']
	};
	for (const file of files) {
		const html = page(file);
		const policies = [...html.matchAll(/<meta http-equiv="content-security-policy" content="([^"]*)"/g)].map((m) => m[1]);
		assert.equal(policies.length, 1, file);
		const directives = Object.fromEntries(policies[0].split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...src]) => [name, src]));
		for (const [name, sources] of Object.entries(expected)) for (const s of sources) assert.ok(directives[name]?.includes(s), `${file} ${name} ${s}`);
		for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
			assert.ok(directives['script-src'].includes(`'sha256-${createHash('sha256').update(body).digest('base64')}'`), `${file} inline script hashed`);
	}
});

test('headers: _headers sends frame-ancestors and the other page headers, never a second page policy; a 404 page', () => {
	const headers = page('_headers');
	assert.deepEqual([...headers.matchAll(/Content-Security-Policy: (.*)/g)].map((m) => m[1]), ["frame-ancestors 'none'"]);
	assert.match(headers, /^\/\*$/m);
	assert.match(headers, /X-Content-Type-Options: nosniff/);
	assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
	assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
	assert.match(page('404.html'), /<h1>Not found<\/h1>/);
});
