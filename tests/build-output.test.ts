// Seam 3: the prerendered HTML of every scene URL, as a crawler or screen reader sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { MOOSYLVANIA } from '../src/lib/scenes/moosylvania.ts';

const page = (file: string) => readFileSync(new URL(`../build/${file}`, import.meta.url), 'utf8');
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const withoutDialogs = (html: string) => html.replace(/<dialog[\s\S]*?<\/dialog>/g, '');
const texts = (html: string, tag: string) =>
	[...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
const opens = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const signpost = (layer: string) => layer.slice(layer.indexOf('<nav'), layer.indexOf('</nav>'));
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);

const overworldProps = OVERWORLD.districts.flatMap((d) => d.venues.flatMap((v) => v.props));

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
	assert.deepEqual(hrefs(signpost(layer)).slice(4), ['#maplewood', '#central-west-end', '#carondelet-park', '#midtown', '#belleville']);
	assert.deepEqual(texts(layer, 'h2'), ['Maplewood', 'Central West End', 'Carondelet Park', 'Midtown', 'Belleville']);
	assert.deepEqual(texts(layer, 'h3'), [
		'Moosylvania', 'Side Project Cellar', "Brennan's", 'Carondelet Park', 'Saint Louis University', 'The Foundry', 'MonsterCommerce'
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
	assert.deepEqual(moosylvania.map((t) => t.split(':')[0]), ['The moose', 'Welcome sign'], 'props read left to right');
});

test('overworld: doors and contacts are links, everything else stays a button', () => {
	const layer = withoutDialogs(main(page('index.html')));
	const moosylvania = layer.slice(layer.indexOf('id="moosylvania"'), layer.indexOf('id="side-project"'));
	assert.ok(hrefs(moosylvania).includes('/moosylvania'), 'venue door links to the flat sub-scene URL');
	const external = hrefs(layer).filter((h) => /^(https?:|mailto:)/.test(h));
	assert.deepEqual(external, hrefs(signpost(layer)).filter((h) => /^(https?:|mailto:)/.test(h)), 'external links outside cards live only on the signpost');
});

test('sub-scene: title with district, focusable h1, props, exit link to the venue anchor', () => {
	const html = page('moosylvania.html');
	assert.equal(texts(html, 'title')[0], 'Moosylvania, Maplewood');
	const layer = main(html);
	assert.match(layer, /<h1[^>]*tabindex="-1"[^>]*>Moosylvania<\/h1>/);
	assert.deepEqual(texts(withoutDialogs(layer), 'h2'), []);
	const buttons = opens(layer, 'button').filter((b) => b.includes('aria-haspopup="dialog"'));
	assert.equal(buttons.length, MOOSYLVANIA.props.length);
	assert.equal(opens(layer, 'dialog').length, MOOSYLVANIA.props.length);
	assert.ok(texts(layer, 'button').includes('Frontend desk: Nuxt, Next, Svelte, TypeScript'));
	assert.ok(hrefs(withoutDialogs(layer)).includes('/#moosylvania'));
});

test('cards: every dialog is labelled and closes natively', () => {
	for (const file of ['index.html', 'moosylvania.html']) {
		const dialogs = opens(page(file), 'dialog');
		assert.ok(dialogs.length > 0);
		assert.ok(dialogs.every((d) => d.includes('aria-labelledby=')), file);
		assert.equal(page(file).match(/<form method="dialog">/g)?.length, dialogs.length, file);
	}
	// Card titles stay inside the page's heading hierarchy when the cards read inline without JavaScript.
	assert.equal(texts(page('index.html'), 'h4').length, overworldProps.length);
	assert.equal(texts(page('moosylvania.html'), 'h2').length, MOOSYLVANIA.props.length);
	assert.match(page('index.html'), /<noscript>[\s\S]*dialog \{ display: block/);
});
