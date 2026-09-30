import type { Handle } from '@sveltejs/kit';

// Each prerendered page preloads its scripts and styles, as by default, and the fonts' latin faces, which nearly all its
// text is set in (Joe, 2026-09-30), so the Join card and the cards paint in their own type. The fonts' other subsets load
// only when a page's text needs them, by their unicode-range.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, { preload: ({ type, path }) => type === 'js' || type === 'css' || (type === 'font' && /-latin-\d+-normal\.[\w-]+\.woff2$/.test(path)) });
