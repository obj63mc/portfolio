import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';

/** The media host and what it holds (`npm run videos`). @type {{ host: `https://${string}.${string}` }} */
const media = JSON.parse(readFileSync(new URL('./src/lib/video-files.json', import.meta.url), 'utf8'));

const gaHosts = /** @type {const} */ (['https://*.google-analytics.com', 'https://*.googletagmanager.com']);

/**
 * The GA4 measurement ID the site is built with (buildout ticket 23): Workers Builds sets `PUBLIC_GA_ID` for every build,
 * and only a `main` build, `WORKERS_CI_BRANCH` being `main`, passes it through. Previews, local builds and the dev server
 * get none, so they carry no GA script and no queue.
 * @param {Record<string, string | undefined>} env
 */
export const measurementId = (env) => (env.WORKERS_CI_BRANCH === 'main' && env.PUBLIC_GA_ID) || '';

/**
 * The host a build fetches its videos from (src/lib/videos.ts): the media host for every Workers Builds build, `main` and
 * Previews alike, and none for a local build or the dev server, which serve the sources themselves under /media
 * (vite.config.ts), so nothing local reaches the network. A build made here to deploy by hand sets `PUBLIC_MEDIA_URL`.
 * @param {Record<string, string | undefined>} env
 */
export const mediaUrl = (env) => env.PUBLIC_MEDIA_URL ?? (env.WORKERS_CI_BRANCH ? media.host : '');

// Set before SvelteKit reads the environment, and always set, if empty, so `$env/static/public` always exports it.
process.env.PUBLIC_MEDIA_URL = mediaUrl(process.env);
// TEMP (ticket 23 hands-on testing): `vite dev` passes PUBLIC_GA_ID through too. Remove once testing is done.
process.env.PUBLIC_GA_ID = measurementId(process.env) || (process.argv.includes('dev') && process.env.PUBLIC_GA_ID) || '';

// The consent smoke (tests/consent.spec.ts) builds the site with a test ID into a folder of its own, so it never
// overwrites the site's build or SvelteKit's output, which `vite preview` serves.
const smoke = process.env.SMOKE_OUT;

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter(smoke ? { pages: `${smoke}/build`, assets: `${smoke}/build` } : undefined),
		...(smoke && { outDir: `${smoke}/.svelte-kit` }),
		// A local build's videos are its own server's, under /media (vite.config.ts): the prerenderer, which follows each
		// page's sources, finds no such files, and anything else it can't find still fails the build.
		prerender: {
			handleHttpError: ({ path, message }) => {
				if (!path.startsWith('/media/')) throw new Error(message);
			}
		},
		// The one page policy: hash mode writes it, with the bootstrap script's hash, into each prerendered page's
		// meta tag. static/_headers adds frame-ancestors.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://www.googletagmanager.com'],
				// The inline style attribute in app.html.
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', ...gaHosts],
				// The videos, from the media host; a local build's are its own.
				'media-src': ['self', media.host],
				'connect-src': ['self', 'wss://barmadden.com', 'https://*.analytics.google.com', ...gaHosts],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		},
		// The Worker, the scripts and the Playwright config are type-checked with the site; left out, the editor puts them
		// in an inferred project, which under TypeScript 6 loads no @types and so reports @types/node as missing.
		typescript: { config: (config) => { config.include.push('../worker/**/*.ts', '../scripts/**/*.ts', '../playwright.config.ts'); } }
	}
};
