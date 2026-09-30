// The audio pipeline's outputs agree (buildout ticket 22): every one-shot the sound module knows has a row in
// audio/sounds.json, every file served under static/audio is one the manifest produced and has its row in the ledger,
// and the ledger is what `npm run audio` writes from the manifest, so no file ships without its source and licence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { ledger, parse } from '../scripts/audio.ts';
import { ONE_SHOTS } from '../src/lib/sound.ts';
import { BEDS, MUSIC } from '../src/lib/loops.ts';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const sounds = parse(JSON.parse(read('audio/sounds.json')));
const files: Record<string, string> = JSON.parse(read('src/lib/sound-files.json'));
const served = existsSync(new URL('static/audio/', root)) ? readdirSync(new URL('static/audio/', root)) : [];

test('every one-shot has exactly one manifest row, and every one-shot row is a sound the module plays', () => {
	const shots = sounds.filter((s) => s.kind === 'one-shot').map((s) => s.id);
	assert.deepEqual([...shots].sort(), [...ONE_SHOTS].sort());
});

test('every bed and every piece of music has exactly one manifest row of its kind, cut to its loop (ticket 21)', () => {
	assert.deepEqual(sounds.filter((s) => s.kind === 'bed').map((s) => s.id).sort(), [...BEDS].sort());
	assert.deepEqual(sounds.filter((s) => s.kind === 'music').map((s) => s.id).sort(), [...MUSIC].sort());
	for (const s of sounds) if (s.kind !== 'one-shot' && s.file) assert.ok(s.trim, `${s.id} is cut to a loop`);
});

test("Joe's alternatives in audio/sources/alternatives are kept aside: every row's source sits directly in audio/sources", () => {
	for (const s of sounds) assert.ok(!s.file?.includes('/'), s.id);
});

test('every sourced row has its source file in audio/, outside static/', () => {
	for (const s of sounds) if (s.file) assert.ok(existsSync(new URL(`audio/sources/${s.file}`, root)), `${s.id}: audio/sources/${s.file}`);
});

test('every file served is one the manifest encoded, content-hashed, and every encoded file is served', () => {
	for (const [id, url] of Object.entries(files)) {
		assert.ok(sounds.some((s) => s.id === id && s.file), `${id} has a sourced row`);
		assert.match(url, new RegExp(`^/audio/${id}\\.[0-9a-f]{8}\\.mp3$`), id);
		assert.ok(served.includes(url.slice('/audio/'.length)), `${url} is in static/audio`);
	}
	assert.deepEqual(served.sort(), Object.values(files).map((u) => u.slice('/audio/'.length)).sort(), 'nothing else in static/audio');
});

test('the ledger is the one the manifest writes, a row for every file served', () => {
	const md = read('docs/audio-sources.md');
	assert.equal(md, ledger(sounds, files), 'docs/audio-sources.md is stale: run npm run audio');
	for (const url of Object.values(files)) assert.ok(md.includes(`\`static${url}\``), url);
});

test('a row off the licence ladder, or sourced without its source, author or licence, is refused', () => {
	const row = { id: 'knock', kind: 'one-shot', use: 'a knock', status: 'provisional', file: 'k.wav', source: 'https://freesound.org/s/1/', author: 'a', licence: 'CC0' };
	assert.equal(parse({ sounds: [row] })[0].licence, 'CC0');
	for (const bad of [{ licence: 'CC-BY-NC' }, { licence: 'CC-BY' }, { licence: 'Envato Elements' }, { source: undefined }, { author: '' }, { licence: undefined }, { kind: 'loop' }, { trim: [1, 0.5] }])
		assert.throws(() => parse({ sounds: [{ ...row, ...bad }] }), JSON.stringify(bad));
	assert.throws(() => parse({ sounds: [row, row] }), 'a repeated id');
	assert.equal(parse({ sounds: [{ id: 'knock', kind: 'one-shot', use: 'a knock', status: 'provisional' }] })[0].file, undefined, 'not yet sourced');
	// A loop is cut to its period, within the spec's range for its kind: beds 30 to 45 s, music 50 s (Sushi Stand's 52 s loop) to the theme's 3 minutes.
	const bed = { ...row, id: 'bed-x', kind: 'bed', trim: [10, 46] };
	assert.equal(parse({ sounds: [bed] })[0].trim![1], 46);
	for (const trim of [undefined, [10, 35], [10, 60]]) assert.throws(() => parse({ sounds: [{ ...bed, trim }] }), `bed ${trim}`);
	const music = { ...row, id: 'theme', kind: 'music', trim: [0, 98] };
	assert.equal(parse({ sounds: [music] })[0].kind, 'music');
	assert.equal(parse({ sounds: [{ ...music, trim: [24, 152] }] })[0].trim![1], 152, 'a theme of 2 minutes 8 s');
	assert.equal(parse({ sounds: [{ ...music, trim: [0, 52] }] })[0].trim![1], 52, "Sushi Stand's music");
	for (const trim of [[0, 45], [0, 190]]) assert.throws(() => parse({ sounds: [{ ...music, trim }] }), `music ${trim}`);
});
