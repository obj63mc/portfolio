import { defineConfig } from '@playwright/test';

// Seam 4: a small browser smoke over the built site; `npm run build` first. The real pointer lock stays hands-on.
export default defineConfig({
	testDir: 'tests',
	testMatch: '*.spec.ts',
	webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
	use: { baseURL: 'http://localhost:4173' }
});
