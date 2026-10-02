import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { marked } from 'marked';
import { defineConfig, type Plugin } from 'vite';
import { beaconToken, measurementId, media, mediaUrl } from './scripts/build-env.ts';
import { serveMedia } from './scripts/media.ts';

const gaHosts = ['https://*.google-analytics.com', 'https://*.googletagmanager.com'] as const;

// Set before SvelteKit reads the environment (src/env.ts), and always set, if empty.
process.env.PUBLIC_MEDIA_URL = mediaUrl(process.env);
process.env.PUBLIC_CF_BEACON = beaconToken(process.env);
// TEMP (ticket 23 hands-on testing): `vite dev` passes PUBLIC_GA_ID through too. Remove once testing is done.
process.env.PUBLIC_GA_ID = measurementId(process.env) || (process.argv.includes('dev') && process.env.PUBLIC_GA_ID) || '';

// The consent smoke (tests/consent.spec.ts) builds the site with a test ID into a folder of its own, so it never
// overwrites the site's build or SvelteKit's output, which `vite preview` serves.
const smoke = process.env.SMOKE_OUT;

// SvelteKit's own config (SvelteKit 3: the plugin's options, where svelte.config.js was).
const kit = sveltekit({
	adapter: adapter(smoke ? { pages: `${smoke}/build`, assets: `${smoke}/build` } : undefined),
	...(smoke && { outDir: `${smoke}/.svelte-kit` }),
	// The one page policy: hash mode writes it, with the bootstrap script's hash, into each prerendered page's
	// meta tag. static/_headers adds frame-ancestors.
	csp: {
		mode: 'hash',
		directives: {
			'default-src': ['self'],
			// GA's loader, and Cloudflare Web Analytics' beacon at the one path the site's own consent code loads it from
			// (src/lib/analytics.svelte.ts). The path is exact on purpose: the tag Cloudflare's edge can add to a page by
			// itself, which no consent would govern, is at a versioned path under it, and stays refused.
			'script-src': ['self', 'https://www.googletagmanager.com', 'https://static.cloudflareinsights.com/beacon.min.js'],
			// The inline style attribute in app.html.
			'style-src': ['self', 'unsafe-inline'],
			'img-src': ['self', ...gaHosts],
			// The videos, from the media host; a local build's are its own. The streamed music plays from the file the page
			// fetched, at a blob: URL (src/lib/sound.svelte.ts).
			'media-src': ['self', 'blob:', media.host],
			// The beacon reports to Cloudflare's own host.
			'connect-src': ['self', 'wss://barmadden.com', 'https://*.analytics.google.com', ...gaHosts, 'https://cloudflareinsights.com'],
			'object-src': ['none'],
			'base-uri': ['self']
		}
	}
});

// The media host's stand-in on this machine (scripts/media.ts): the dev and preview servers answer /media/<key> from the
// video sources, so a local build and the smokes play the cards' videos without the bucket.
const localMedia: Plugin = {
	name: 'local-media',
	configureServer: (server) => void server.middlewares.use(serveMedia),
	configurePreviewServer: (server) => void server.middlewares.use(serveMedia)
};

// A card's copy (src/lib/content, read by Prop.svelte) is written in Markdown and built into the page as HTML, so no
// parser reaches the browser. A link to another site opens in a new tab, as a card's other links do.
const markdown: Plugin = {
	name: 'markdown',
	transform: (code, id) =>
		id.endsWith('.md')
			? { code: `export default ${JSON.stringify(marked.parse(code, { async: false }).replace(/<a (href="https?:)/g, '<a target="_blank" $1'))}`, map: null }
			: undefined
};

export default defineConfig({
	plugins: [kit, localMedia, markdown],
	// A font is always its own file, however small: the page's policy (`csp` above) allows fonts from the
	// site itself, not a data: URL, and the marquee's face and some of the fonts' subsets are under Vite's inlining limit.
	build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
	// SvelteKit narrows the dev server's file access to src, node_modules and its output; the engine fetches its background
	// tiles and cut-outs from art/generated, and a card's screenshots are built in from art/sources/screenshots
	// (src/lib/Screens.svelte). The rest of art/ is the art workspace and stays unserved, the videos but through /media above.
	server: { fs: { allow: ['art/generated', 'art/sources/screenshots'] } }
});
