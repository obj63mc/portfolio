import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { serveMedia } from './scripts/media.ts';

// The media host's stand-in on this machine (scripts/media.ts): the dev and preview servers answer /media/<key> from the
// video sources, so a local build and the smokes play the cards' videos without the bucket.
const localMedia: Plugin = {
	name: 'local-media',
	configureServer: (server) => void server.middlewares.use(serveMedia),
	configurePreviewServer: (server) => void server.middlewares.use(serveMedia)
};

export default defineConfig({
	plugins: [sveltekit(), localMedia],
	// A font is always its own file, however small: the page's policy (kit.csp in svelte.config.js) allows fonts from the
	// site itself, not a data: URL, and the marquee's face and some of the fonts' subsets are under Vite's inlining limit.
	build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
	// SvelteKit narrows the dev server's file access to src, node_modules and its output; the engine fetches its background
	// tiles and cut-outs from art/generated (the rest of art/ is the art workspace and stays unserved, the videos but
	// through /media above).
	server: { fs: { allow: ['art/generated'] } }
});
