import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Connect } from 'vite';
import { appendFileSync } from 'node:fs';

// PROTOTYPE: phones POST benchmark results here and they land in results.jsonl on the Mac.
const results: Connect.NextHandleFunction = (req, res, next) => {
	// pages are rebuilt while phones test; never let a phone keep a stale index.html
	if (!req.url?.startsWith('/_app/immutable/')) res.setHeader('Cache-Control', 'no-store');
	if (req.url !== '/__results' || req.method !== 'POST') return next();
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		appendFileSync('results.jsonl', JSON.stringify(JSON.parse(body)) + '\n');
		res.statusCode = 204;
		res.end();
	});
};

export default defineConfig({
	plugins: [
		sveltekit(),
		{
			name: 'bench-results',
			configureServer: (s) => void s.middlewares.use(results),
			configurePreviewServer: (s) => void s.middlewares.use(results)
		}
	]
});
