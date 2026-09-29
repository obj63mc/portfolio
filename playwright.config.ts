import { defineConfig } from '@playwright/test';

// Seam 4: a small browser smoke over the built site; `npm run build` first. The real pointer lock stays hands-on.
// SMOKE_PORT lets two checkouts run their smokes at once, each against its own build.
const port = Number(process.env.SMOKE_PORT ?? 4173);

export default defineConfig({
	testDir: 'tests',
	testMatch: '*.spec.ts',
	webServer: { command: `npx vite preview --port ${port} --strictPort`, port, reuseExistingServer: true },
	use: { baseURL: `http://localhost:${port}` }
});
