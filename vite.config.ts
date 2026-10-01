import { sveltekit } from '@sveltejs/kit/vite';
import { marked } from 'marked';
import { defineConfig, type Plugin } from 'vite';
import { serveMedia } from './scripts/media.ts';

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
	plugins: [sveltekit(), localMedia, markdown],
	// A font is always its own file, however small: the page's policy (kit.csp in svelte.config.js) allows fonts from the
	// site itself, not a data: URL, and the marquee's face and some of the fonts' subsets are under Vite's inlining limit.
	build: { assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined) },
	// SvelteKit narrows the dev server's file access to src, node_modules and its output; the engine fetches its background
	// tiles and cut-outs from art/generated, and a card's screenshots are built in from art/sources/screenshots
	// (src/lib/Screens.svelte). The rest of art/ is the art workspace and stays unserved, the videos but through /media above.
	server: { fs: { allow: ['art/generated', 'art/sources/screenshots'] } }
});
