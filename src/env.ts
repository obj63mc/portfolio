// The build's public environment (SvelteKit 3: `$app/env/public`): each is inlined at build time, and is empty where a
// build has none. vite.config.ts decides what each build gets (scripts/build-env.ts) before SvelteKit reads them here.
import { defineEnvVars } from '@sveltejs/kit/env';

const text = { public: true, static: true, schema: (value: string | undefined) => value ?? '' } as const;

export const variables = defineEnvVars({
	/** The GA4 measurement ID: a `main` build's alone. */
	PUBLIC_GA_ID: text,
	/** Cloudflare Web Analytics' site token: a `main` build's alone. */
	PUBLIC_CF_BEACON: text,
	/** The videos' host: a Workers Builds build's; a local build serves its own under /media. */
	PUBLIC_MEDIA_URL: text
});
