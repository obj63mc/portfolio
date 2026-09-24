import type { SubScene } from './types';

// Placeholder rects; the sub-scene art pass (buildout ticket 05) rewrites them.
const desk = (i: number) => ({ x: 400 + i * 550, y: 900, w: 360, h: 260 });

export const MOOSYLVANIA: SubScene = {
	id: 'moosylvania',
	title: 'Moosylvania, Maplewood',
	description:
		'Inside the Moosylvania lobby: the frontend, backend, CMS and data stacks Joe Madden leads as Chief Architect.',
	venue: 'Moosylvania',
	district: 'Maplewood',
	w: 2845,
	h: 1600,
	props: [
		{
			id: 'desk-frontend',
			name: 'Frontend desk',
			gist: 'Nuxt, Next, Svelte, TypeScript',
			body: ['Nuxt, Next, Svelte, modern JavaScript, TypeScript and SCSS.'],
			rect: desk(0)
		},
		{
			id: 'desk-backend',
			name: 'Backend desk',
			gist: 'Node.js, TypeScript and PHP platforms',
			body: ['Node.js/TypeScript and PHP platforms; experience with ASP.NET C#, Ruby and Python.'],
			rect: desk(1)
		},
		{
			id: 'desk-cms',
			name: 'CMS desk',
			gist: 'WordPress, SilverStripe, Strapi, Prismic, Storyblok',
			body: ['WordPress, SilverStripe and Strapi; headless Prismic and Storyblok.'],
			rect: desk(2)
		},
		{
			id: 'desk-data',
			name: 'Data desk',
			gist: 'MySQL, PostgreSQL, Redis',
			body: ['MySQL, PostgreSQL and Redis; MongoDB experience.'],
			rect: desk(3)
		}
	],
	exit: { x: 100, y: 1000, w: 120, h: 220 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 500, foregroundY: 1600 }],
	foreground: []
};
