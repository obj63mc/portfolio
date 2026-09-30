import adapter from '@sveltejs/adapter-static';

const gaHosts = ['https://*.google-analytics.com', 'https://*.googletagmanager.com'];

export default {
	kit: {
		adapter: adapter(),
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
