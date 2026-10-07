import { SUB_SCENES } from '#lib/scenes/index.ts';

export const prerender = true;

// Every page route, read from the routes folder itself, so a new page is listed without a change here; the one dynamic
// route is listed once per scene, as its own `entries` prerenders it.
const paths = Object.keys(import.meta.glob('../**/+page.svelte')).flatMap((file) => {
	const path = file.slice(2, -'/+page.svelte'.length);
	return path === '/[venue]' ? Object.keys(SUB_SCENES).map((venue) => `/${venue}`) : [path || '/'];
});

// The endpoint runs once, in the build, so this is the deploy's own time: every page is rebuilt by every deploy.
const lastmod = new Date().toISOString();

export const GET = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
			.sort()
			.map((path) => `\t<url><loc>https://barmadden.com${path}</loc><lastmod>${lastmod}</lastmod></url>`)
			.join('\n')}\n</urlset>\n`,
		{ headers: { 'Content-Type': 'application/xml' } }
	);
