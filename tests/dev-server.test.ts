// `npm run dev` serves the background tiles the engine fetches. SvelteKit narrows Vite's fs.allow to src, node_modules and
// its own output, which left art/generated out: every tile came back 403 and the dev scene drew nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('the dev server serves a background tile, and nothing else under art/', async () => {
	const server = await createServer({ server: { port: 0 }, logLevel: 'silent' });
	await server.listen();
	try {
		const base = server.resolvedUrls!.local[0];
		const tile = await fetch(new URL('art/generated/overworld/overworld/1.25/0-0.webp?no-inline', base));
		assert.equal(tile.status, 200);
		assert.equal(tile.headers.get('content-type'), 'image/webp');
		assert.equal((await fetch(new URL('art/style.txt', base))).status, 403, 'the art workspace stays private');
	} finally {
		await server.close();
	}
});
