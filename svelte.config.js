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
		// The Worker is type-checked with the site.
		typescript: { config: (config) => { config.include.push('../worker/**/*.ts'); } }
	}
};
