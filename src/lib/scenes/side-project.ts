import type { Prop, Rect, SubScene } from './types';

// TODO Joe: the content inventory promises a one-line "what we did" per brand; none is on record.
// Bacardi, Grey Goose and Barefoot Wine are confirmed website builds; the rest are on Moosylvania's work page.
const brands = [
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
] as const;
type Brand = (typeof brands)[number][0];
const builtSite = new Set(['bacardi', 'grey-goose', 'barefoot']);

// Measured on the accepted master (art/sources/side-project-fix/stitched.png, 1672 x 941, installed 4x as
// side-project-master; buildout ticket 05, 2026-09-28): the front bar seen nearly face-on, its navy wall behind. The ten
// brand bottles stand in one lit row on the wall's lower shelf, left to right in brand order, each rect its matte's trim;
// the back bar's cooler at the right carries the Side Project sign on its door and the chalkboard. The two counters are
// walk-behind scenery; no prop stands on them.
const shelf: Record<Brand, Rect> = {
	bacardi: { x: 422, y: 593, w: 83, h: 260 },
	'grey-goose': { x: 557, y: 582, w: 76, h: 272 },
	'new-amsterdam': { x: 679, y: 602, w: 80, h: 252 },
	camarena: { x: 798, y: 634, w: 95, h: 219 },
	barefoot: { x: 934, y: 602, w: 73, h: 250 },
	'bud-light': { x: 1050, y: 639, w: 66, h: 211 },
	ej: { x: 1157, y: 648, w: 95, h: 202 },
	'pink-whitney': { x: 1290, y: 624, w: 77, h: 221 },
	rumchata: { x: 1407, y: 648, w: 97, h: 201 },
	soonhari: { x: 1536, y: 675, w: 53, h: 168 }
};

// One bottle per brand, its logo on the label (Joe, 2026-09-28).
const bottles: Prop[] = brands.map(([id, name]) => ({
	id: `bottle-${id}`,
	name: `${name} bottle`,
	gist: builtSite.has(id) ? 'built the website' : 'Moosylvania client work',
	body: [builtSite.has(id) ? `${name}: Joe built the website at Moosylvania.` : `${name}: client work at Moosylvania.`],
	rect: shelf[id]
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
		...bottles,
		// TODO Joe: the sign's line is a placeholder; the beer mug moved here from the bottles (Joe, 2026-09-28).
		{
			id: 'brewery-sign',
			name: 'Side Project sign',
			gist: 'Side Project Brewing',
			body: ['Side Project Brewing’s light bulb, on the Cellar’s cooler door. The Cellar is across the street from Moosylvania.'],
			rect: { x: 2007, y: 639, w: 124, h: 124 },
			cosmetic: 5
		},
		{
			id: 'chalkboard',
			name: 'Chalkboard',
			gist: 'Joe’s favourite brewery',
			body: ['Side Project is Joe’s favourite brewery. Favourite styles: stouts and barleywines.'],
			rect: { x: 2227, y: 561, w: 289, h: 262 }
		}
	],
	exit: { x: 0, y: 323, w: 267, h: 647 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 1140, foregroundY: 1600 }],
	foreground: [],
	walkBehind: [
		{
			key: 'side-project-back-bar',
			rect: { x: 2256, y: 893, w: 589, h: 388 },
			outline: [
				{ x: 2256, y: 893 }, { x: 2845, y: 905 }, { x: 2845, y: 1275 }, { x: 2819, y: 1280 }, { x: 2301, y: 1141 }, { x: 2256, y: 1129 }
			],
			front: [{ x: 2256, y: 1129 }, { x: 2301, y: 1141 }, { x: 2819, y: 1280 }, { x: 2845, y: 1280 }],
			props: []
		},
		{
			key: 'side-project-front-bar',
			rect: { x: 179, y: 911, w: 2088, h: 648 },
			outline: [
				{ x: 179, y: 974 }, { x: 2265, y: 911 }, { x: 2266, y: 974 }, { x: 2217, y: 981 }, { x: 2217, y: 1357 }, { x: 1702, y: 1403 },
				{ x: 306, y: 1559 }, { x: 305, y: 1525 }, { x: 221, y: 1442 }, { x: 221, y: 1034 }, { x: 179, y: 991 }
			],
			front: [{ x: 179, y: 1559 }, { x: 306, y: 1559 }, { x: 1702, y: 1403 }, { x: 2266, y: 1352 }],
			props: []
		}
	]
};
