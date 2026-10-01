// Seam 3: the prerendered HTML of every scene URL, as a crawler or screen reader sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { screenGist } from '../src/lib/scenes/foundry.ts';
import { measurementId, mediaUrl } from '../svelte.config.js';

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
/** The GA4 measurement ID this build was made with: none but on a `main` build in Workers Builds (ticket 23). */
const gaId = measurementId(process.env);
/** The consent bar, a popover: in the Join card and on the page, only in a build with GA. */
const consentBar = /<div class="consent[^"]*" popover="manual"[\s\S]*?<\/button>\s*<\/div>(\s*<!--[^>]*-->)*\s*<\/div>/g;

// No test pins the site's copy, its title tags and headings, cards and labels (Joe, 2026-09-30): it is being rewritten.
// Names come from the scene data where the markup's order or structure is under test.
test('overworld: description and the shell around the layer', () => {
	const html = page('index.html');
	assert.match(html, /<meta name="description" content="[^"]{20,}"/);
	assert.equal(opens(html, 'canvas').length, 2);
	assert.ok(opens(html, 'canvas').every((c) => c.includes('aria-hidden="true"')));
	assert.match(html, /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/);
	assert.match(html, /class="presence"[^>]*>\d+ here</);
	// The Sound toggle, on until the visitor turns it off, named by its hidden label beside the speaker icon (ticket 22). The
	// analytics icon depends on the visitor's timezone, so the browser adds it (ticket 23).
	const controls = html.match(/<div class="controls">([\s\S]*?)<\/div>/)![1];
	const [sound, ...rest] = opens(controls, 'button');
	assert.match(sound, /aria-pressed="true"/);
	assert.match(controls, /<button[^>]*aria-pressed="true"[^>]*>\s*<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span[^>]*>[^<]+<\/span>\s*<\/button>/);
	assert.equal(rest.length, 0);
});

test('overworld: skip link, h1, signpost, then districts west to east with their venues', () => {
	const layer = withoutDialogs(main(page('index.html')));
	assert.equal(hrefs(layer)[0], '#signpost-districts');
	assert.equal(texts(layer, 'h1').length, 1);
	assert.match(hrefs(signpost(layer))[0], /\.pdf$/);
	assert.match(hrefs(signpost(layer))[1], /^mailto:/);
	// West to east by centre x on the accepted master: the park lake sits west of the West End row.
	assert.deepEqual(hrefs(signpost(layer)).slice(4), ['#maplewood', '#forest-park', '#carondelet-park', '#central-west-end', '#midtown', '#belleville']);
	assert.deepEqual(texts(layer, 'h2'), OVERWORLD.districts.map((d) => d.name));
	assert.deepEqual(texts(layer, 'h3'), OVERWORLD.districts.flatMap((d) => d.venues.map((v) => v.name)));
	assert.ok(layer.indexOf('<nav') < layer.indexOf('<h2'), 'signpost comes before the districts');
});

test('overworld: one button per prop, named prop plus gist, and one dialog per card', () => {
	const html = main(page('index.html')), cards = overworldProps.filter((p) => !p.kind);
	const buttons = opens(html, 'button').filter((b) => b.includes('aria-haspopup="dialog"'));
	assert.equal(buttons.length, cards.length);
	assert.equal(opens(html, 'dialog').length, cards.length);
	for (const p of overworldProps) assert.ok(texts(html, 'button').includes(`${p.name}: ${p.gist}`), p.id);
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

test('sub-scenes: focusable h1, props in reading order, exit link to the venue anchor', () => {
	for (const s of subScenes) {
		const html = page(`${s.id}.html`);
		assert.match(html, /<meta name="description" content="[^"]{20,}"/);
		const layer = main(html);
		assert.equal(opens(layer, 'h1').length, 1, s.id);
		assert.match(opens(layer, 'h1')[0], /tabindex="-1"/, s.id);
		assert.deepEqual(texts(withoutDialogs(layer), 'h2'), []);
		// A prop opens its card, unless it is an action (a Foundry poster) or only says its state (the Foundry screen).
		const carded = s.props.filter((p) => !p.kind).length;
		const buttons = opens(layer, 'button').filter((b) => b.includes('aria-haspopup="dialog"'));
		assert.equal(buttons.length, carded, s.id);
		assert.equal(opens(layer, 'dialog').length, carded, s.id);
		// Spec: props left to right, or top to bottom in a scene taller than wide (the Moosylvania lobby).
		const expected = s.props
			.filter((p) => p.kind !== 'status')
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
		// The marquee is scenery, its letters scrolling what's showing (Joe, 2026-09-30).
		'screen', 'poster-fast-five', 'poster-snow-white', 'poster-lorax',
		'mc-sign', 'mc-eye', 'server-rack',
		'chalkboard', 'bottle-bud-light', 'bottle-sapporo', 'bottle-anchor', 'bottle-soonhari', 'bottle-bacardi', 'bottle-grey-goose',
		'bottle-ej', 'bottle-camarena', 'bottle-rumchata', 'bottle-pink-whitney', 'bottle-new-amsterdam', 'brewery-sign',
		// The ATM (PayPal and Venmo) left Brennan's for the overworld; it returns to this list when Joe places it.
		'humidor-cohiba', 'humidor-macanudo', 'humidor-partagas', 'humidor-la-gloria-cubana', 'humidor-punch', 'stg-logo',
		// The cycling course's line joined the ride sign's card, and the START FINISH sign is scenery: the lap timer is an
		// Easter egg (Joe, 2026-09-29).
		'bike', 'ride-sign'
	];
	for (const id of inventory) assert.ok(ids.has(id), id);
	assert.equal(ids.size, allProps.length, 'prop ids are unique across scenes');
	assert.deepEqual([...new Set(allProps.map((p) => p.cosmetic).filter(Boolean))].sort(), [1, 2, 3, 4, 5, 6, 7]);
	const links = (id: string) => (allProps.find((p) => p.id === id)!.links ?? []).map((l) => l.href).join(' ');
	assert.match(links('workstation'), /github\.com/);
	assert.match(links('ride-sign'), /strava\.com/);
	// Easter eggs: their click is the grant, with no card (Joe, 2026-09-30).
	for (const id of ['moose', 'moose-statue', 'bike', 'mc-eye']) assert.equal(allProps.find((p) => p.id === id)!.kind, 'action', id);
});

test.todo('inventory: the ATM on the overworld, for PayPal and Venmo');

// The overworld's marquee scrolls them too (Joe, 2026-09-30), painted on the canvas, which has no markup.
test('clearance: in the markup the Universal titles are told only on the Foundry screen and its posters', () => {
	const titles = /Fast Five|Snow White|Lorax/;
	for (const file of files.filter((f) => f !== 'foundry.html')) assert.doesNotMatch(page(file), titles, file);
	let foundry = page('foundry.html');
	assert.match(foundry, /Universal Pictures Home Entertainment/);
	// Each prop's own block, a button or the screen's line, holds no other: the order doesn't matter.
	for (const id of ['screen', 'poster-fast-five', 'poster-snow-white', 'poster-lorax']) {
		const block = new RegExp(`<div class="prop[^>]*data-prop="${id}"[^>]*>[\\s\\S]*?</div>`);
		assert.match(foundry, block, id);
		foundry = foundry.replace(block, '');
	}
	assert.doesNotMatch(foundry, titles, 'outside the screen and poster props, the head included, the titles are not told');
});

test('the Foundry: a poster is a button with no card, and the screen only says its state (Joe, 2026-09-29)', () => {
	const layer = main(page('foundry.html'));
	for (const id of ['poster-fast-five', 'poster-snow-white', 'poster-lorax']) {
		const block = layer.match(new RegExp(`<div class="prop[^>]*data-prop="${id}"[^>]*>[\\s\\S]*?</div>`))![0];
		assert.doesNotMatch(block, /<dialog|aria-haspopup/, id);
	}
	assert.doesNotMatch(layer.match(/<div class="prop[^>]*data-prop="screen"[^>]*>[\s\S]*?<\/div>/)![0], /<button|<dialog/);
});

test('the Join and Paused cards: on every page, outside the layer, closed until the engine opens them', () => {
	for (const file of files) {
		// The consent bar in the Join card is a popover over it, not the card's content (ticket 23).
		const html = page(file), shell = html.replace(main(html), '').replace(consentBar, '');
		const [join, paused, ...rest] = [...shell.matchAll(/<dialog\b[\s\S]*?<\/dialog>/g)].map((m) => m[0]);
		assert.equal(rest.length, 0, file);
		for (const card of [join, paused]) {
			assert.doesNotMatch(opens(card, 'dialog')[0], /\sopen\b/, `${file}: prerendered closed, so a page without the engine never shows it`);
			assert.match(opens(card, 'dialog')[0], /aria-label(ledby)?=/, file);
		}
		// The Join card: the skyline, the site's name and tagline, and its one button (Joe, 2026-09-30).
		assert.deepEqual([...texts(join, 'p'), ...texts(join, 'button')].map((t) => t.replace(/&#39;/g, "'")),
			['BarMadden.com', 'Portfolio of Joseph Madden', "Let's Explore"], `${file}: the Join card's name, tagline and button`);
		assert.equal(opens(join, 'button').length, 1, file);
		// Resume, and the Sound toggle, since the modal card makes the corner's inert.
		assert.equal(opens(paused, 'button').length, 2, file);
		assert.match(paused, /class="sound\b/, file);
	}
});

// Ticket 23: only production's build carries GA. Any other has no gtag.js loader, no dataLayer queue and no consent bar;
// production's has all of them and its measurement ID, and still never an inline script.
test('analytics: a build without a measurement ID has no GA script, no queue and no bar; with one it has them', () => {
	const dir = new URL('../build/_app/immutable/', import.meta.url);
	const js = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
	const loader = /googletagmanager\.com\/gtag\/js/, queue = /dataLayer/;
	for (const file of files) {
		const html = page(file), bars = html.match(consentBar) ?? [];
		assert.doesNotMatch(html, /<script[^>]*googletagmanager/, `${file}: never an inline or static GA script`);
		assert.equal(bars.length, gaId ? 2 : 0, `${file}: the bar in the Join card and on the page`);
		if (gaId) assert.ok(bars.every((b) => opens(b, 'button').length === 2), file);
	}
	if (gaId) {
		assert.match(js, loader);
		assert.match(js, queue);
		assert.ok(js.includes(gaId), 'the measurement ID');
	} else {
		assert.doesNotMatch(js, loader);
		assert.doesNotMatch(js, queue);
	}
});

// The world rect an element carries for the engine's stylesheet to place it (buildout ticket 08), read back from its
// opening tag's custom properties.
const rectOf = (html: string, open: RegExp) => {
	const style = html.match(open)?.[0].match(/style="([^"]*)"/)?.[1] ?? '';
	const px = (k: string) => Number(style.match(new RegExp(`--${k}:\\s*(-?[\\d.]+)px`))?.[1]);
	return { x: px('x'), y: px('y'), w: px('w'), h: px('h') };
};
// A prop's wrapper: the last `.prop` opening tag before its card's title.
const propOpen = (id: string) => new RegExp(`<div class="prop[^>]*data-prop="${id}"[^>]*>`);

test('the layer: every prop, heading, door, exit and the signpost carries its world rect, so its hit target sits on its art', () => {
	const index = main(page('index.html'));
	assert.deepEqual(rectOf(index, /<nav id="signpost"[^>]*>/), OVERWORLD.signpost.rect, 'signpost');
	for (const d of OVERWORLD.districts) {
		assert.deepEqual(rectOf(index, new RegExp(`<h2 id="${d.id}-heading"[^>]*>`)), d.sign, d.id);
		for (const v of d.venues) {
			assert.deepEqual(rectOf(index, new RegExp(`<h3 id="${v.id}-heading"[^>]*>`)), v.rect, v.id);
			if (v.door) assert.deepEqual(rectOf(index, new RegExp(`<a[^>]*href="${v.door}"[^>]*>`)), v.doorRect ?? v.rect, `${v.id} door`);
			for (const p of v.props) assert.deepEqual(rectOf(index, propOpen(p.id)), p.rect, p.id);
		}
	}
	for (const s of subScenes) {
		const layer = main(page(`${s.id}.html`));
		assert.deepEqual(rectOf(layer, new RegExp(`<a[^>]*href="/#${s.id}"[^>]*>`)), s.exit, `${s.id} exit`);
		for (const p of s.props) assert.deepEqual(rectOf(layer, propOpen(p.id)), p.rect, p.id);
	}
});

test('props (ticket 15): each wrapper names its prop for the engine, and an irregular prop clips its button', () => {
	for (const file of files) {
		const layer = main(page(file)), wrappers = opens(layer, 'div').filter((d) => d.includes('class="prop'));
		const ids = file === 'index.html' ? overworldProps : SUB_SCENES[file.slice(0, -'.html'.length)].props;
		assert.deepEqual(new Set(wrappers.map((d) => d.match(/data-prop="([^"]*)"/)?.[1])), new Set(ids.map((p) => p.id)), file);
		for (const p of ids) {
			const button = layer.match(new RegExp(`${propOpen(p.id).source}\\s*<button[^>]*>`))?.[0].match(/<button[^>]*>/)?.[0] ?? '';
			if (p.clip) assert.ok(button.includes(`--clip:${p.clip}`), `${p.id} clipped`);
			else assert.ok(!button.includes('--clip'), `${p.id} unclipped`);
		}
	}
});

/** Where this build fetches its videos from: the media host on Workers Builds, which runs these tests too, else its own server. */
const MEDIA = (mediaUrl(process.env) || '/media').replace(/[.]/g, '\\.');

/**
 * A card's video with the site's own controls, which the locked cursor can reach, not the browser's: Play and the seek
 * slider prerendered, loaded only when played.
 */
const player = (card: string) => {
	const video = opens(card, 'video')[0];
	assert.ok(!/\scontrols[\s=>]/.test(video) && video.includes('preload="none"'), video);
	assert.ok(card.includes('aria-label="Play"') && /<input[^>]*type="range"[^>]*aria-label="Seek"/.test(card), 'its controls');
	return video;
};

test("the meeting TV: its card holds the video with the site's controls, loaded only when played", () => {
	const tv = main(page('moosylvania.html')).match(/<dialog[^>]*aria-labelledby="card-meeting-tv-title"[\s\S]*?<\/dialog>/)![0];
	const video = player(tv);
	assert.match(video, new RegExp(`src="${MEDIA}/videos/universal/fastfive-demo-full-1024x768\\.[0-9a-f]{8}\\.mp4"`));
});

// The videos are on the media host (Joe, 2026-09-30), not in the build: a Workers Builds build names the host, a local
// one its own /media, and the only films built in are Sushi Stand's two short services.
test('videos: none of the cards\' or the screen\'s is in the build', () => {
	const films = readdirSync(new URL('../build/_app/immutable/assets/', import.meta.url)).filter((f) => f.endsWith('.mp4'));
	assert.deepEqual(films.map((f) => f.split('.')[0]).sort(), ['dinner', 'lunch']);
});

test("the bottles: each card holds its brand's homepage video with the site's controls, loaded only when played", () => {
	const bar = main(page('side-project.html'));
	for (const [id, file] of [
		['bud-light', 'bud-light-homepage-2026-09-30'], ['sapporo', 'sapporo-homepage-2026-09-30'], ['anchor', 'anchor-brewing-homepage-2026-09-30'],
		['soonhari', 'soonhari-homepage-2026-09-30-4k'], ['ej', 'ej-brandy-home-collection-vsop-2026-09-30'], ['camarena', 'camarena-home-margarita-2026-09-30'],
		['rumchata', 'rumchata-home-peppermint-bark-2026-09-30'], ['pink-whitney', 'pink-whitney-home-products-750ml-2026-09-30'],
		['new-amsterdam', 'new-amsterdam-home-find-your-wins-2026-09-30']
	]) {
		const card = bar.match(new RegExp(`<dialog[^>]*aria-labelledby="card-bottle-${id}-title"[\\s\\S]*?</dialog>`))![0];
		const video = player(card);
		assert.match(video, new RegExp(`src="${MEDIA}/videos/(beer|liquor)/${file}\\.[0-9a-f]{8}\\.mp4"`), id);
		// A video card closes by its round X, not a Close at the foot.
		assert.ok(/<form method="dialog" class="x[\s"]/.test(card) && !card.includes('>Close</button>'), id);
	}
});

test('the shared screen: its line carries its state, prerendered idle', () => {
	assert.ok(texts(main(page('foundry.html')), 'p').includes(`Screen: ${screenGist()}`));
	assert.notEqual(screenGist('fast-five'), screenGist(), 'playing says so');
});

test('cards: every card is labelled and closes natively', () => {
	for (const file of files) {
		const layer = main(page(file)), dialogs = opens(layer, 'dialog');
		// The Foundry has none (Joe, 2026-09-29): its posters play reels, and its screen only says what plays.
		assert.ok(file === 'foundry.html' || dialogs.length > 0, file);
		assert.ok(dialogs.every((d) => d.includes('aria-labelledby=')), file);
		assert.equal(layer.match(/<form method="dialog"[\s>]/g)?.length ?? 0, dialogs.length, file);
	}
	// Card titles stay inside the page's heading hierarchy when the cards read inline without JavaScript.
	assert.equal(texts(page('index.html'), 'h4').length, overworldProps.filter((p) => !p.kind).length);
	for (const s of subScenes) assert.equal(texts(page(`${s.id}.html`), 'h2').length, s.props.filter((p) => !p.kind).length, s.id);
	assert.match(page('index.html'), /<noscript>[\s\S]*dialog \{ display: block/);
});

test('headers: one CSP per page, allowing self, the GA hosts, the socket and the media host, with every inline script hashed', () => {
	const expected: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': ["'self'", 'https://www.googletagmanager.com'],
		'connect-src': ["'self'", 'wss://barmadden.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
		'img-src': ["'self'", 'https://*.google-analytics.com', 'https://*.googletagmanager.com'],
		'media-src': ["'self'", 'https://media.barmadden.com']
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

// The site's type (Joe, 2026-09-30) is self-hosted: every face a file of the site's own, never Google's, and never a data:
// URL, which the page policy's default-src 'self' would refuse.
test('fonts: every page preloads the latin faces it is set in, bundled with the site, and nothing inlines a font', () => {
	for (const file of files) {
		const html = page(file);
		assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/, file);
		const preloads = [...html.matchAll(/<link href="([^"]*)" rel="preload" as="font" type="font\/woff2" crossorigin>/g)].map((m) => m[1]);
		assert.deepEqual(preloads.map((href) => href.replace(/^.*\/|\.[\w-]+\.woff2$/g, '')).sort(), [
			'barlow-condensed-latin-800-normal',
			'montserrat-latin-400-normal',
			'montserrat-latin-500-normal',
			'montserrat-latin-700-normal'
		], file);
		for (const href of preloads) assert.ok(existsSync(new URL(`../build/${href.replace(/^(\.\/|\/)/, '')}`, import.meta.url)), href);
	}
	const css = readdirSync(new URL('../build/_app/immutable/assets/', import.meta.url)).filter((f) => f.endsWith('.css'));
	const faces = css.flatMap((f) => [...page(`_app/immutable/assets/${f}`).matchAll(/@font-face\{[^}]*\}/g)].map((m) => m[0]));
	assert.ok(faces.some((f) => /Doto Marquee/.test(f)), 'the marquee face');
	for (const face of faces) assert.match(face, /src:url\(\.\/[\w.-]+\.woff2?\)/, face);
});

test('headers: _headers sends frame-ancestors and the other page headers, never a second page policy; a 404 page', () => {
	const headers = page('_headers');
	assert.deepEqual([...headers.matchAll(/Content-Security-Policy: (.*)/g)].map((m) => m[1]), ["frame-ancestors 'none'"]);
	assert.match(headers, /^\/\*$/m);
	assert.match(headers, /X-Content-Type-Options: nosniff/);
	assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
	assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
	assert.match(headers, /^\/audio\/\*\n\s+Cache-Control: public, max-age=31536000, immutable$/m, 'the hashed sounds are cached for good');
	assert.match(page('404.html'), /<h1>[^<]+<\/h1>/);
});
