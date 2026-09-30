import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// A font is always its own file, however small: the page's policy (kit.csp in svelte.config.js) allows fonts from the
	// site itself, not a data: URL, and the marquee's face and some of the fonts' subsets are under Vite's inlining limit.
	build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
	// SvelteKit narrows the dev server's file access to src, node_modules and its output; the engine fetches its background
	// tiles and cut-outs from art/generated and the cards play videos from art/sources/videos (the rest of art/ is the art
	// workspace and stays unserved).
	server: { fs: { allow: ['art/generated', 'art/sources/videos'] } }
});
