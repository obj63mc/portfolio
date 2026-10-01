// The videos' move to the media host (Joe, 2026-09-30): the map the site reads (src/lib/video-files.json) names every
// source and every video the scenes play, at the key its source hashes to; the sync's plan re-keys a replaced video and
// never drops one, the bucket being the videos' backup; a key maps back to its source and nothing else; and only a
// Workers Builds build names the media host.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyOf, sourceOf } from '../scripts/media.ts';
import { local, plan, sources, used, type Manifest } from '../scripts/videos.ts';
import { mediaUrl } from '../svelte.config.js';

const manifest: Manifest = JSON.parse(readFileSync(new URL('../src/lib/video-files.json', import.meta.url), 'utf8'));

test('the map names every video the scenes play and every source on this machine, each source hashing to its key', () => {
	for (const file of [...used(), ...sources()]) assert.ok(manifest.files[file], `${file} is not in the map: run \`npm run videos\``);
	for (const [file, key] of Object.entries(manifest.files)) {
		assert.ok(sourceOf(key)?.endsWith(`/${file}`), key);
		// A checkout without the sources (`npm run videos pull`) has nothing to hash.
		const l = local(file);
		if (l) assert.equal(keyOf(l.folder, file, l.hash), key, `${file} changed: run \`npm run videos\``);
	}
	assert.match(manifest.host, /^https:\/\/[\w.-]+$/);
});

test('a key is its folder, name and hash, and maps back to its source alone', () => {
	const key = keyOf('beer', 'sapporo-homepage-2026-09-30.mp4', '1e8cbe47');
	assert.equal(key, 'videos/beer/sapporo-homepage-2026-09-30.1e8cbe47.mp4');
	assert.equal(sourceOf(key), 'beer/sapporo-homepage-2026-09-30.mp4');
	for (const not of ['videos/beer/sapporo.mp4', 'videos/../style.1e8cbe47.mp4', 'videos/beer/../x.1e8cbe47.mp4', 'videos/a/b/c.1e8cbe47.mp4', 'audio/x.1e8cbe47.mp4', 'videos/beer/x.1e8cbe47.txt'])
		assert.equal(sourceOf(not), null, not);
});

test("a sync's plan: a changed source takes a new key, a new one joins, and a video whose source is gone from this machine keeps its place", () => {
	const was: Manifest = { host: 'https://media.example', bucket: 'b', files: { 'a.mp4': keyOf('beer', 'a.mp4', '00000001'), 'b.mp4': keyOf('beer', 'b.mp4', '00000002') } };
	const here = (hashes: Record<string, string>) => (file: string) => (hashes[file] ? { folder: 'beer', hash: hashes[file] } : null);
	assert.deepEqual(plan(was, ['a.mp4', 'b.mp4'], here({ 'a.mp4': '00000001', 'b.mp4': '00000002' })), was);
	// `a` replaced, `c` new, `b` no longer here: nothing leaves the map, since nothing leaves the bucket.
	const next = plan(was, ['a.mp4', 'c.mp4'], here({ 'a.mp4': '0000000a', 'c.mp4': '00000003' }));
	assert.deepEqual(next, { ...was, files: { 'a.mp4': keyOf('beer', 'a.mp4', '0000000a'), 'b.mp4': was.files['b.mp4'], 'c.mp4': keyOf('beer', 'c.mp4', '00000003') } });
	// A checkout with no sources at all changes nothing; a video with neither a source nor a key can't be planned.
	assert.deepEqual(plan(was, [], here({})), was);
	assert.throws(() => plan(was, ['d.mp4'], here({})), /d\.mp4/);
});

test('only a Workers Builds build, main or a Preview, fetches from the media host; a local one serves its own', () => {
	assert.equal(mediaUrl({ WORKERS_CI_BRANCH: 'main' }), manifest.host);
	assert.equal(mediaUrl({ WORKERS_CI_BRANCH: 'feature/x' }), manifest.host);
	assert.equal(mediaUrl({}), '');
	assert.equal(mediaUrl({ PUBLIC_MEDIA_URL: 'https://other.example' }), 'https://other.example');
});
