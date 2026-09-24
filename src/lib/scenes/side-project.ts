import type { Prop, SubScene } from './types';

// TODO Joe: the content inventory promises a one-line "what we did" per brand; none is on record.
// Bacardi, Grey Goose and Barefoot Wine are confirmed website builds; the rest are on Moosylvania's work page.
const brands: [string, string][] = [
	['bacardi', 'Bacardi'],
	['grey-goose', 'Grey Goose'],
	['new-amsterdam', 'New Amsterdam Vodka'],
	['camarena', 'Camarena Tequila'],
	['barefoot', 'Barefoot Wine'],
	['bud-light', 'Bud Light'],
	['ej', 'E&J Brandy'],
	['pink-whitney', 'Pink Whitney'],
	['rumchata', 'RumChata'],
	['soonhari', 'Soonhari']
];
const builtSite = new Set(['bacardi', 'grey-goose', 'barefoot']);

// Placeholder rects; the sub-scene art pass (buildout ticket 05) rewrites them.
const taps: Prop[] = brands.map(([id, name], i) => ({
	id: `tap-${id}`,
	name: `${name} tap`,
	gist: builtSite.has(id) ? 'built the website' : 'Moosylvania client work',
	body: [builtSite.has(id) ? `${name}: Joe built the website at Moosylvania.` : `${name}: client work at Moosylvania.`],
	rect: { x: 300 + i * 230, y: 400, w: 120, h: 300 },
	cosmetic: 5
}));

export const SIDE_PROJECT: SubScene = {
	id: 'side-project',
	title: 'Side Project Cellar, Maplewood',
	description:
		'Inside the Side Project Cellar bar, across the street from Moosylvania: the alcohol brands Joe Madden has built for, and his favourite brewery.',
	venue: 'Side Project Cellar',
	district: 'Maplewood',
	w: 2845,
	h: 1600,
	props: [
		...taps,
		{
			id: 'chalkboard',
			name: 'Chalkboard',
			gist: 'Joe’s favourite brewery',
			body: ['Side Project is Joe’s favourite brewery. Favourite styles: stouts and barleywines.'],
			rect: { x: 2650, y: 300, w: 150, h: 400 }
		}
	],
	exit: { x: 100, y: 1000, w: 120, h: 220 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 500, foregroundY: 1600 }],
	foreground: []
};
