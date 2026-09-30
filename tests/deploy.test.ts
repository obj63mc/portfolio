// Seam 1's gate: the Worker's checks before a socket reaches a room (the rooms themselves are tested through wrangler dev
// in rooms.test.ts). Seam 3: the build step that keeps Previews unindexed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../worker/index.ts';

// Stand-ins for ctx.exports: the directory places a visitor in `scene:1`, or nowhere past the ceiling, and the room
// answers with the URL it was handed.
let full = false;
const ctx = {
	exports: {
		Directory: { getByName: () => ({ place: async (scene: string) => (full ? null : `${scene}:1`) }) },
		Room: { getByName: () => ({ fetch: async (req: Request) => new Response(req.url) }) }
	}
} as unknown as Parameters<typeof worker.fetch>[2];

const upgrade = (url: string, origin?: string, env: { MULTIPLAYER?: string } = {}, country?: string) => {
	const req = new Request(url, { headers: { Upgrade: 'websocket', ...(origin ? { Origin: origin } : {}) } });
	return worker.fetch(Object.assign(req, { cf: { country } }), env, ctx);
};

test('socket: a foreign or missing Origin is forbidden', async () => {
	for (const origin of ['https://evil.example', 'http://barmadden.com', 'https://www.barmadden.com', undefined])
		assert.equal((await upgrade('https://barmadden.com/ws/overworld', origin)).status, 403, String(origin));
});

test('socket: its own origin reaches a room in production, on a Preview and under wrangler dev, flagged by geolocation', async () => {
	for (const origin of ['https://barmadden.com', 'https://feature-x-barmadden.barmadden.workers.dev', 'http://localhost:8787']) {
		const res = await upgrade(`${origin}/ws/foundry?cc=ZZ&room=overworld:9`, origin, {}, 'FR');
		assert.equal(await res.text(), 'https://room/?room=foundry%3A1&cc=FR', origin);
	}
	const res = await upgrade('https://barmadden.com/ws/overworld', 'https://barmadden.com');
	assert.equal(await res.text(), 'https://room/?room=overworld%3A1&cc=XX', 'XX without a geolocated country');
});

test('socket: refused cleanly with multiplayer off, past the ceiling, for an unknown scene and without an upgrade', async () => {
	const origin = 'https://barmadden.com';
	const refusals: [string, Promise<Response>, number][] = [
		['off', upgrade(`${origin}/ws/overworld`, origin, { MULTIPLAYER: 'off' }), 503],
		...['/ws', '/ws/', '/ws/nowhere', '/ws/constructor', '/ws/overworld/x'].map(
			(path): [string, Promise<Response>, number] => [path, upgrade(origin + path, origin), 404]
		),
		['no upgrade', worker.fetch(new Request(`${origin}/ws/overworld`, { headers: { Origin: origin } }), {}, ctx), 426]
	];
	for (const [name, res, status] of refusals) {
		assert.equal((await res).status, status, name);
		assert.equal((await res).headers.get('X-Content-Type-Options'), 'nosniff', name);
	}
	full = true;
	assert.equal((await upgrade(`${origin}/ws/overworld`, origin)).status, 503, 'past the ceiling');
	full = false;
});

const headersAfterBuild = (branch?: string) => {
	const dir = mkdtempSync(join(tmpdir(), 'noindex-'));
	mkdirSync(join(dir, 'build'));
	writeFileSync(join(dir, 'build/_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
	const { WORKERS_CI_BRANCH, ...env } = process.env;
	execFileSync(process.execPath, [new URL('../scripts/noindex.ts', import.meta.url).pathname], {
		cwd: dir,
		env: branch ? { ...env, WORKERS_CI_BRANCH: branch } : env
	});
	return readFileSync(join(dir, 'build/_headers'), 'utf8');
};

test('build: a Preview branch sends X-Robots-Tag noindex on every asset; main and local builds do not', () => {
	assert.match(headersAfterBuild('feature/login'), /^\/\*\n {2}X-Robots-Tag: noindex$/m);
	assert.doesNotMatch(headersAfterBuild('main'), /noindex/);
	assert.doesNotMatch(headersAfterBuild(), /noindex/);
});
