// Seam 3: the prerendered HTML of every scene URL, and the resume's, as a crawler or screen reader sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';
import { screenGist } from '../src/lib/scenes/foundry.ts';
import { beaconToken, measurementId, mediaUrl } from '../scripts/build-env.ts';

const page = (file: string) => readFileSync(new URL(`../build/${file}`, import.meta.url), 'utf8');
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const withoutDialogs = (html: string) => html.replace(/<dialog[\s\S]*?<\/dialog>/g, '');
// A scene's write-up (About.svelte) is copy, with whatever headings it likes: the page's own structure is what is left.
const withoutAbout = (html: string) => html.replace(/<section class="about">[\s\S]*?<\/section>/, '');
const texts = (html: string, tag: string) =>
	[...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
const opens = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const signpost = (layer: string) => layer.slice(layer.indexOf('<nav'), layer.indexOf('</nav>'));
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);

const overworldProps = OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props));
const subScenes = Object.values(SUB_SCENES);
const allProps = [...overworldProps, ...subScenes.flatMap((s) => s.props)];
const files = ['index.html', ...subScenes.map((s) => `${s.id}.html`)];
/** The scene pages and the resume (Joe, 2026-10-02), a page with no scene: the shell round every page is checked on all of them. */
const pages = [...files, 'resume.html'];
/** The GA4 measurement ID this build was made with: none but on a `main` build in Workers Builds (ticket 23). */
const gaId = measurementId(process.env);
/** Cloudflare's beacon token this build was made with, on the same builds; the beacon loads only beside GA. */
const beacon = gaId && beaconToken(process.env);
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
	const layer = withoutAbout(withoutDialogs(main(page('index.html'))));
	assert.equal(hrefs(layer)[0], '#signpost-districts');
	assert.equal(texts(layer, 'h1').length, 1);
	// The signpost links to the districts alone (Joe, 2026-10-01), west to east by centre x on the accepted master: the park
	// lake sits west of the West End row.
	assert.deepEqual(hrefs(signpost(layer)), ['#maplewood', '#forest-park', '#carondelet-park', '#central-west-end', '#midtown', '#belleville']);
	// A district's heading is the one placed on its sign; any other h2 is the page's own copy.
	const districts = [...layer.matchAll(/<h2 id="[^"]*-heading"[^>]*>([^<]*)</g)];
	assert.deepEqual(districts.map((m) => m[1].trim()), OVERWORLD.districts.map((d) => d.name));
	assert.deepEqual(texts(layer, 'h3'), OVERWORLD.districts.flatMap((d) => d.venues.map((v) => v.name)));
	assert.ok(layer.indexOf('<nav') < districts[0].index, 'signpost comes before the districts');
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

test('overworld: doors are links, everything else stays a button, and no link outside a card leaves the site', () => {
	const layer = withoutDialogs(main(page('index.html')));
	const moosylvania = layer.slice(layer.indexOf('id="moosylvania"'), layer.indexOf('id="side-project"'));
	assert.ok(hrefs(moosylvania).includes('/moosylvania'), 'venue door links to the flat sub-scene URL');
	const external = hrefs(layer).filter((h) => /^(https?:|mailto:)/.test(h));
	assert.deepEqual(external, [], 'external links live only in the cards');
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
		assert.deepEqual(texts(withoutAbout(withoutDialogs(layer)), 'h2'), []);
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

// The copy is the page's own markup (Joe, 2026-10-02), so this reads its shape alone: the sections and their headings, the
// entries with their dates, the contacts by their hosts, the PDF and the way back.
test('the resume: a page with no scene, its sections, entries and contacts, the PDF as a download and the exit to the arrival point', () => {
	const html = page('resume.html');
	assert.match(html, /<meta name="description" content="[^"]{20,}"/);
	const layer = main(html);
	assert.match(layer, /<article class="resume[\s"]/, 'the first-paint exemption in app.css keys on it');
	assert.equal(opens(layer, 'h1').length, 1);
	// A section a heading, each section named by its h2.
	const sections = opens(layer, 'section');
	assert.ok(sections.length >= 4, 'summary, skills, experience and education at the least');
	assert.equal(texts(layer, 'h2').length, sections.length);
	for (const s of sections) {
		const id = s.match(/aria-labelledby="([^"]*)"/)?.[1];
		assert.ok(id && layer.includes(`<h2 id="${id}"`), s);
	}
	// An entry, a role, project or degree: an h3 first, its dates as time elements.
	const entries = [...layer.matchAll(/<article class="entry[^"]*"[^>]*>([\s\S]*?)<\/article>/g)].map((m) => m[1]);
	assert.ok(entries.length >= 4, 'three roles and a degree at the least');
	assert.equal(texts(layer, 'h3').length, entries.length);
	for (const e of entries) {
		assert.match(e, /^\s*<h3[\s>]/);
		assert.match(e, /<time datetime="\d{4}(-\d{2})?">/);
	}
	const links = hrefs(layer);
	assert.ok(links.some((h) => h.startsWith('mailto:')), 'email');
	assert.ok(links.some((h) => /^https:\/\/(www\.)?linkedin\.com\//.test(h)), 'LinkedIn');
	assert.ok(links.some((h) => /^https:\/\/github\.com\//.test(h)), 'GitHub');
	assert.match(layer, /<a[^>]*href="\/resume\.pdf"[^>]*\sdownload(="")?[\s>]/, 'the PDF, a download the router leaves to the browser');
	assert.match(layer, /<a class="exit[^"]*" href="\/"/, 'the way back, to the arrival point');
	assert.doesNotMatch(layer, /<dialog|<canvas/);
	assert.equal(opens(layer, 'button').length, 1, 'Print');
});

test('inventory: every prop from the content inventory is on some scene, one grant per cosmetic', () => {
	const ids = new Set(allProps.map((p) => p.id));
	const inventory = [
		'welcome', 'moose', 'computer-frontend', 'computer-backend', 'computer-cms', 'computer-data', 'moose-statue', 'meeting-tv', 'tv-remote',
		'diploma', 'whiteboard', 'workstation',
		// The marquee is scenery, its letters scrolling what's showing (Joe, 2026-09-30).
		'screen', 'poster-fast-five', 'poster-snow-white', 'poster-lorax',
		'mc-sign', 'mc-eye', 'server-rack',
		'bottle-bud-light', 'bottle-sapporo', 'bottle-anchor', 'bottle-soonhari', 'bottle-bacardi', 'bottle-grey-goose',
		'bottle-ej', 'bottle-camarena', 'bottle-rumchata', 'bottle-pink-whitney', 'bottle-new-amsterdam', 'brewery-sign',
		'humidor-cohiba', 'humidor-macanudo', 'humidor-partagas', 'humidor-la-gloria-cubana', 'humidor-punch', 'stg-logo',
		// The ATM that left Brennan's stands in the Bread Co. café, for PayPal; Venmo has the stand on the counter there, and
		// the usability testing the laptop (Joe, 2026-10-01).
		'atm', 'venmo-stand', 'ux-laptop',
		// The cycling course's line joined the ride sign's card, and the START FINISH sign is scenery: the lap timer is an
		// Easter egg (Joe, 2026-09-29).
		'bike', 'ride-sign'
	];
	for (const id of inventory) assert.ok(ids.has(id), id);
	assert.equal(ids.size, allProps.length, 'prop ids are unique across scenes');
	assert.deepEqual([...new Set(allProps.map((p) => p.cosmetic).filter(Boolean))].sort(), [1, 2, 3, 4, 5, 6, 7]);
	const links = (id: string) => (allProps.find((p) => p.id === id)!.links ?? []).map((l) => l.href).join(' ');
	// The workstation's GitHub link is in its copy alone (Joe, 2026-10-01), once in its card.
	assert.equal(links('workstation'), '');
	const workstation = main(page('slu.html')).match(/<dialog[^>]*aria-labelledby="card-workstation-title"[\s\S]*?<\/dialog>/)![0];
	assert.equal(workstation.match(/href="https:\/\/github\.com\/obj63mc"/g)?.length, 1);
	// So is the ride sign's Strava link (Joe, 2026-10-01).
	assert.equal(links('ride-sign'), '');
	const rideSign = main(page('index.html')).match(/<dialog[^>]*aria-labelledby="card-ride-sign-title"[\s\S]*?<\/dialog>/)![0];
	assert.equal(rideSign.match(/href="https:\/\/www\.strava\.com\/athletes\/8703625"/g)?.length, 1);
	// Easter eggs: their click is the grant, with no card (Joe, 2026-09-30).
	for (const id of ['moose', 'moose-statue', 'bike', 'mc-eye']) assert.equal(allProps.find((p) => p.id === id)!.kind, 'action', id);
});

// The overworld's marquee scrolls them too (Joe, 2026-09-30), painted on the canvas, which has no markup.
// The resume names them too (Joe, 2026-10-02): it is no scene, and he cleared them for it.
test('the Foundry: a poster is a button with no card, and the screen only says its state (Joe, 2026-09-29)', () => {
	const layer = main(page('foundry.html'));
	for (const id of ['poster-fast-five', 'poster-snow-white', 'poster-lorax']) {
		const block = layer.match(new RegExp(`<div class="prop[^>]*data-prop="${id}"[^>]*>[\\s\\S]*?</div>`))![0];
		assert.doesNotMatch(block, /<dialog|aria-haspopup/, id);
	}
	assert.doesNotMatch(layer.match(/<div class="prop[^>]*data-prop="screen"[^>]*>[\s\S]*?<\/div>/)![0], /<button|<dialog/);
});

test('the Join and Paused cards: on every page, outside the layer, closed until the engine opens them', () => {
	for (const file of pages) {
		// The consent bar in the Join card is a popover over it, not the card's content (ticket 23).
		const html = page(file), shell = html.replace(main(html), '').replace(consentBar, '');
		const [join, paused, ...rest] = [...shell.matchAll(/<dialog\b[\s\S]*?<\/dialog>/g)].map((m) => m[0]);
		assert.equal(rest.length, 0, file);
		for (const card of [join, paused]) {
			assert.doesNotMatch(opens(card, 'dialog')[0], /\sopen\b/, `${file}: prerendered closed, so a page without the engine never shows it`);
			assert.match(opens(card, 'dialog')[0], /aria-label(ledby)?=/, file);
		}
		// The Join card: the skyline, the name that labels it, and its one button (Joe, 2026-09-30); its words are its own.
		// Each card has the site menu too (Joe, 2026-10-08), its toggle out of exploring a button, since the modal card makes the page's inert.
		assert.match(join, /<img\b/, file);
		assert.match(join, /id="join-title"/, file);
		assert.equal(opens(join, 'button').length, 2, file);
		assert.match(join, /class="controls menu\b/, file);
		// Resume, and the Sound toggle, since the modal card makes the corner's inert.
		assert.equal(opens(paused, 'button').length, 3, file);
		assert.match(paused, /class="controls menu\b/, file);
		assert.match(paused, /class="sound\b/, file);
	}
});

// Ticket 23: only production's build carries GA. Any other has no gtag.js loader, no dataLayer queue and no consent bar;
// production's has all of them and its measurement ID, and still never an inline script.
test('analytics: a build without a measurement ID has no GA script, no queue and no bar; with one it has them', () => {
	const dir = new URL('../build/_app/immutable/', import.meta.url);
	const js = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
	const loader = /googletagmanager\.com\/gtag\/js/, queue = /dataLayer/, cloudflare = /static\.cloudflareinsights\.com\/beacon\.min\.js/;
	for (const file of pages) {
		const html = page(file), bars = html.match(consentBar) ?? [];
		assert.doesNotMatch(html, /<script[^>]*(googletagmanager|cloudflareinsights)/, `${file}: never an inline or static analytics script`);
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
	// Cloudflare's beacon is loaded by the same code, with its token, or not in the build at all.
	if (beacon) assert.match(js, cloudflare), assert.ok(js.includes(beacon), 'the beacon token');
	else assert.doesNotMatch(js, cloudflare);
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

test('the meeting TV is a television, no button and no card, its video named only by the engine; its remote is the card (Joe, 2026-10-01)', () => {
	const layer = main(page('moosylvania.html'));
	const tv = layer.match(/<div class="prop[^>]*data-prop="meeting-tv"[^>]*>[\s\S]*?<\/div>/)![0];
	assert.doesNotMatch(tv, /<button|<dialog/);
	assert.match(tv, /Meeting TV: [^<]*channel 1 of \d+/);
	const video = opens(tv, 'video')[0];
	for (const attribute of ['hidden', 'muted', 'loop', 'playsinline', 'preload="none"']) assert.ok(video.includes(` ${attribute}`), attribute);
	assert.ok(!/\s(src|autoplay|controls)[\s=>]/.test(video), 'a page without the engine fetches and plays nothing');
	// The remote's button asks for it, and its card is the remote: channel up and down, and power, which closes it.
	assert.match(layer, /<button[^>]*aria-haspopup="dialog"[^>]*data-take[^>]*>\s*TV remote: changes the channel/);
	const remote = layer.match(/<dialog[^>]*aria-labelledby="card-tv-remote-title"[\s\S]*?<\/dialog>/)![0];
	assert.match(opens(remote, 'dialog')[0], /class="[^"]*\bremote\b/);
	assert.match(remote, /<button[^>]*data-tune="1"[^>]*aria-label="Channel up"/);
	assert.match(remote, /<button[^>]*data-tune="-1"[^>]*aria-label="Channel down"/);
	assert.match(remote, /<form method="dialog"[^>]*>\s*<button[^>]*aria-label="Power: put the remote back"/);
	assert.equal(opens(remote, 'button').length, 3, 'up, down and power only');
	assert.doesNotMatch(remote, /<video/);
	assert.match(page('moosylvania.html'), /<noscript>[\s\S]*dialog\.remote \{ display: none/, 'its buttons need the engine');
});

test('copy: each card\'s is its Markdown file, built in as markup; no file is without a card, and no card empty (Joe, 2026-10-01)', () => {
	const dir = new URL('../src/lib/content/', import.meta.url);
	const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.md') && f.includes('/') && !f.endsWith('/about.md'));
	const copy = new Map(files.map((f) => [f.slice(f.lastIndexOf('/') + 1, -3), readFileSync(new URL(f, dir), 'utf8').trim()]));
	assert.equal(copy.size, files.length, 'a prop id names one file');
	const scenes = [['overworld', 'index.html', OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props))] as const,
		...Object.values(SUB_SCENES).map((s) => [s.id, `${s.id}.html`, s.props] as const)];
	for (const [scene, file, props] of scenes) {
		const layer = main(page(file));
		for (const p of props.filter((p) => !p.kind && !p.tunes)) {
			const text = copy.get(p.id);
			assert.ok(text || p.video || p.logos || p.screens, `${p.id}: a card has copy or media`);
			const card = layer.match(new RegExp(`<dialog[^>]*aria-labelledby="card-${p.id}-title"[\\s\\S]*?</dialog>`))![0];
			assert.equal(/<div class="copy[^>]*>\s*(<!--.*?-->)?\s*<(p|ul|ol|h\d)>/.test(card), !!text, `${p.id}: its copy as markup`);
			if (text) assert.ok(files.includes(`${scene}/${p.id}.md`), `${p.id}: filed under its scene`);
			copy.delete(p.id);
		}
	}
	assert.deepEqual([...copy.keys()], [], 'every file is a card\'s');
});

test("the loft's computers: each card shows its stack's logos, a hashed file each, named under it and fetched when shown (Joe, 2026-10-01)", () => {
	const layer = main(page('moosylvania.html'));
	const computers = SUB_SCENES.moosylvania.props.filter((p) => p.logos);
	assert.equal(computers.length, 4);
	for (const p of computers) {
		const card = layer.match(new RegExp(`<dialog[^>]*aria-labelledby="card-${p.id}-title"[\\s\\S]*?</dialog>`))![0];
		const images = opens(card, 'img');
		assert.equal(images.length, p.logos!.length, p.id);
		for (const [i, image] of images.entries()) {
			const [, file] = image.match(/src="[^"]*\/(_app\/immutable\/assets\/[^"]+)"/) ?? [];
			assert.ok(file && existsSync(new URL(`../build/${file}`, import.meta.url)), `${p.id}: ${p.logos![i].file} is in the build`);
			assert.match(image, /alt=""[^>]*loading="lazy"/, p.id);
			assert.ok(card.includes(`>${p.logos![i].name}</li>`), `${p.id}: ${p.logos![i].name}`);
		}
	}
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
	for (const s of subScenes) assert.equal(texts(withoutAbout(page(`${s.id}.html`)), 'h2').length, s.props.filter((p) => !p.kind).length, s.id);
	assert.match(page('index.html'), /<noscript>[\s\S]*dialog \{ display: block/);
});

test('headers: one CSP per page, allowing self, the GA hosts, the socket and the media host, with every inline script hashed', () => {
	const expected: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': ["'self'", 'https://www.googletagmanager.com', 'https://static.cloudflareinsights.com/beacon.min.js'],
		'connect-src': ["'self'", 'wss://barmadden.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com', 'https://cloudflareinsights.com'],
		'img-src': ["'self'", 'https://*.google-analytics.com', 'https://*.googletagmanager.com'],
		'media-src': ["'self'", 'blob:', 'https://media.barmadden.com']
	};
	for (const file of pages) {
		const html = page(file);
		const policies = [...html.matchAll(/<meta http-equiv="content-security-policy" content="([^"]*)"/g)].map((m) => m[1]);
		assert.equal(policies.length, 1, file);
		const directives = Object.fromEntries(policies[0].split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...src]) => [name, src]));
		for (const [name, sources] of Object.entries(expected)) for (const s of sources) assert.ok(directives[name]?.includes(s), `${file} ${name} ${s}`);
		// Cloudflare's host as a whole would let through the tag its edge adds by itself, which no consent governs.
		assert.ok(!directives['script-src'].includes('https://static.cloudflareinsights.com'), `${file}: the beacon at its one path only`);
		for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
			assert.ok(directives['script-src'].includes(`'sha256-${createHash('sha256').update(body).digest('base64')}'`), `${file} inline script hashed`);
	}
});

// The site's type (Joe, 2026-09-30) is self-hosted: every face a file of the site's own, never Google's, and never a data:
// URL, which the page policy's default-src 'self' would refuse.
test('fonts: every page preloads the latin faces it is set in, bundled with the site, and nothing inlines a font', () => {
	for (const file of pages) {
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

// What the rules of _headers send for a path: a rule is a path line, `*` standing for anything, then its headers.
const cacheControl = (path: string) => {
	const rules = page('_headers').split(/\n(?=\/)/).filter((r) => r.startsWith('/'));
	const matches = (rule: string) => new RegExp(`^${rule.split('\n')[0].trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(path);
	return rules.filter(matches).flatMap((r) => [...r.matchAll(/^\s+Cache-Control: (.*)$/gm)].map((m) => m[1]));
};

test('caching: every hashed file of the build is kept for good, the icons a day, and a page is asked for again each time', () => {
	const dir = new URL('../build/', import.meta.url), forever = ['public, max-age=31536000, immutable'];
	const built = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.\w+$/.test(f));
	const hashed = built.filter((f) => f.startsWith('_app/immutable/') || f.startsWith('audio/'));
	// The tiles and the cut-outs among them, the bulk of what a visit fetches.
	assert.ok(hashed.filter((f) => f.endsWith('.webp')).length > 100, 'the art is in the build');
	for (const f of hashed) assert.deepEqual(cacheControl(`/${f}`), forever, f);
	for (const f of built.filter((f) => !hashed.includes(f))) {
		const icon = /^(favicon\.ico|apple-touch-icon\.png|icon-\d+\.png|manifest\.webmanifest)$/.test(f);
		assert.deepEqual(cacheControl(`/${f}`), icon ? ['public, max-age=86400'] : [], f);
	}
	// A page is also asked for at its path without the extension.
	for (const path of ['/', '/moosylvania', '/sushi-stand', '/big-muddy', '/resume', '/_app/version.json', '/resume.pdf']) assert.deepEqual(cacheControl(path), [], path);
});

test("the bottles of the sites Joe built, MonsterCommerce's server rack and the café's ATM and stand: each card shows its screenshots in a window, a hashed file each, named and fetched when shown (Joe, 2026-10-01)", () => {
	const built = allProps.filter((p) => p.screens);
	assert.deepEqual(built.map((p) => p.id).sort(), ['atm', 'bottle-bacardi', 'bottle-grey-goose', 'server-rack', 'venmo-stand']);
	for (const p of built) {
		const layer = main(page(overworldProps.includes(p) ? 'index.html' : `${subScenes.find((s) => s.props.includes(p))!.id}.html`));
		const card = layer.match(new RegExp(`<dialog[^>]*aria-labelledby="card-${p.id}-title"[\\s\\S]*?</dialog>`))![0];
		const images = opens(card, 'img');
		assert.equal(images.length, p.screens!.length, p.id);
		for (const [i, image] of images.entries()) {
			const [, file] = image.match(/src="[^"]*\/(_app\/immutable\/assets\/[^"]+)"/) ?? [];
			assert.ok(file && existsSync(new URL(`../build/${file}`, import.meta.url)), `${p.id}: ${p.screens![i].file} is in the build`);
			assert.ok(image.includes(`alt="${p.screens![i].name}"`) && image.includes('loading="lazy"'), `${p.id}: ${p.screens![i].name}`);
		}
		assert.equal(opens(card, 'button').filter((b) => /aria-label="(Previous|Next) screenshot"/.test(b)).length, 2, p.id);
		assert.doesNotMatch(card, /<video/, p.id);
	}
});
