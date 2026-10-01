import { defineConfig } from '@playwright/test';

// Seam 4: a small browser smoke over the built site; `npm run build` first. The real pointer lock stays hands-on.
// SMOKE_PORT lets two checkouts run their smokes at once, each against its own build.
const port = Number(process.env.SMOKE_PORT ?? 4173);

export default defineConfig({
	testDir: 'tests',
	testMatch: '*.spec.ts',
	webServer: [
		{ command: `npx vite preview --port ${port} --strictPort`, port, reuseExistingServer: true },
		// The consent smoke (tests/consent.spec.ts, ticket 23) needs a build with analytics, which only production's has:
		// the site built as a `main` build with a test measurement ID and a test beacon token, into .smoke/ so it
		// overwrites neither the site's build nor SvelteKit's output, and served on the next port. The spec aborts every
		// request to Google and to Cloudflare's analytics, so nothing is sent.
		{
			command: `npx vite build && npx vite preview --port ${port + 1} --strictPort`,
			port: port + 1,
			reuseExistingServer: true,
			timeout: 180_000,
			env: { SMOKE_OUT: '.smoke', WORKERS_CI_BRANCH: 'main', PUBLIC_GA_ID: 'G-SMOKETEST', PUBLIC_CF_BEACON: 'smoketest' }
		}
	],
	use: { baseURL: `http://localhost:${port}` }
});
