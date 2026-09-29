// Seam 1: the Worker's socket contract until rooms exist (ticket 12). Seam 3: the build step that keeps Previews unindexed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../worker/index.ts';

const upgrade = (url: string, origin?: string) =>
	worker.fetch(new Request(url, { headers: { Upgrade: 'websocket', ...(origin ? { Origin: origin } : {}) } }));

test('socket: a foreign or missing Origin is forbidden', () => {
	for (const origin of ['https://evil.example', 'http://barmadden.com', 'https://www.barmadden.com', undefined])
		assert.equal(upgrade('https://barmadden.com/ws/overworld', origin).status, 403, origin);
});

test('socket: its own origin is refused cleanly until rooms exist, in production, on a Preview and under wrangler dev', () => {
	for (const origin of ['https://barmadden.com', 'https://feature-x-barmadden.barmadden.workers.dev', 'http://localhost:8787']) {
		const res = upgrade(`${origin}/ws/overworld`, origin);
		assert.equal(res.status, 503, origin);
		assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
	}
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
