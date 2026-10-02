import { building } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';

// Each prerendered page preloads its scripts and styles, as by default, and the fonts' latin faces, which nearly all its
// text is set in (Joe, 2026-09-30), so the Join card and the cards paint in their own type. The fonts' other subsets load
// only when a page's text needs them, by their unicode-range.
//
// A local build's videos are its own server's, under /media (vite.config.ts), and the prerenderer follows each card's
// to see that it is there. It isn't a file of the build. Answered here with nothing, and no error, the prerenderer writes
// no file for it and logs nothing: under SvelteKit 3 it prints a red line for every response of 400 or over, which for
// nineteen videos read as a failed build, and anything else it can't find still fails the build.
export const handle: Handle = ({ event, resolve }) => {
	if (building && event.url.pathname.startsWith('/media/')) return new Response(null, { status: 204 });
	return resolve(event, { preload: ({ type, path }) => type === 'js' || type === 'css' || (type === 'font' && /-latin-\d+-normal\.[\w-]+\.woff2$/.test(path)) });
};
