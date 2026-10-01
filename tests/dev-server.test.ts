// `npm run dev` serves the background tiles the engine fetches. SvelteKit narrows Vite's fs.allow to src, node_modules and
// its own output, which left art/generated out: every tile came back 403 and the dev scene drew nothing. It also stands
// in for the media host: a video's key under /media is answered from its source, by byte range.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { SOURCES, sourceOf } from '../scripts/media.ts';

test('the dev server serves a background tile, and nothing else under art/', async () => {
	const server = await createServer({ server: { port: 0 }, logLevel: 'silent' });
	await server.listen();
	try {
		const base = server.resolvedUrls!.local[0];
		const tile = await fetch(new URL('art/generated/overworld/overworld/1.25/0-0.webp?no-inline', base));
		assert.equal(tile.status, 200);
		assert.equal(tile.headers.get('content-type'), 'image/webp');
		assert.equal((await fetch(new URL('art/style.txt', base))).status, 403, 'the art workspace stays private');
		// A checkout without the video sources, Workers Builds' or one yet to `npm run videos pull`, has none to serve.
		const key = Object.values<string>(JSON.parse(readFileSync(new URL('../src/lib/video-files.json', import.meta.url), 'utf8')).files)[0];
		if (existsSync(SOURCES + sourceOf(key))) {
			assert.equal((await fetch(new URL(`art/sources/videos/${sourceOf(key)}`, base))).status, 403, 'a video but through /media');
			const part = await fetch(new URL(`media/${key}`, base), { headers: { Range: 'bytes=4-11' } });
			assert.equal(part.status, 206);
			assert.match(part.headers.get('content-range') ?? '', /^bytes 4-11\/\d+$/);
			assert.equal(new TextDecoder().decode(await part.arrayBuffer()), 'ftypmp42', 'the range asked for');
			assert.equal((await fetch(new URL(`media/${key.replace(/[0-9a-f]{8}\.mp4$/, 'zzzzzzzz.mp4')}`, base))).status, 404, 'only a key');
		}
	} finally {
		await server.close();
	}
});
