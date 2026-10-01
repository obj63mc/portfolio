import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

// Each prerendered page preloads its scripts and styles, as by default, and the fonts' latin faces, which nearly all its
// text is set in (Joe, 2026-09-30), so the Join card and the cards paint in their own type. The fonts' other subsets load
// only when a page's text needs them, by their unicode-range.
//
// A local build's videos are its own server's, under /media (vite.config.ts), and the prerenderer follows each card's
// to see that it is there. It isn't a file of the build, and svelte.config.js lets that pass; answered here, plainly not
// found, it isn't logged as an unknown route's error either, a red line a video that read as a failed build.
export const handle: Handle = ({ event, resolve }) => {
	if (building && event.url.pathname.startsWith('/media/')) return new Response(null, { status: 404 });
	return resolve(event, { preload: ({ type, path }) => type === 'js' || type === 'css' || (type === 'font' && /-latin-\d+-normal\.[\w-]+\.woff2$/.test(path)) });
};
