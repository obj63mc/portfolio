import type { Prop, Rect, SubScene } from './types';

// TODO Joe: the content inventory promises a one-line "what we did" per brand; none is on record.
// Bacardi and Grey Goose are confirmed website builds; the rest are on Moosylvania's work page. The beers come first, left of
// the spirits (Joe, 2026-09-30).
const brands = [
	['bud-light', 'Bud Light'],
	['sapporo', 'Sapporo'],
	['anchor', 'Anchor Brewing'],
	['soonhari', 'Soonhari'],
	['bacardi', 'Bacardi'],
	['grey-goose', 'Grey Goose'],
	['ej', 'E&J Brandy'],
	['camarena', 'Camarena Tequila'],
	['rumchata', 'RumChata'],
	['pink-whitney', 'Pink Whitney'],
	['new-amsterdam', 'New Amsterdam Vodka']
] as const;
type Brand = (typeof brands)[number][0];
const builtSite = new Set(['bacardi', 'grey-goose']);
// A bottle plays its brand's homepage (art/sources/videos/beer and liquor, `npm run videos`), and its card's only copy is its line, under
// the video. `link`, where the site is still up, adds a See More link to it under the line.
// TODO Joe: the spirits' lines (placeholders), and Bacardi's and Grey Goose's photos or videos.
const homepage: Partial<Record<Brand, { file: string; line: string; link?: string }>> = {
	'bud-light': { file: 'bud-light-homepage-2026-09-30.mp4', line: 'We built Bud Light\'s "Big Game" Website' },
	sapporo: { file: 'sapporo-homepage-2026-09-30.mp4', line: 'SapporoBeer.com was a standard brochure site with tons of promotions and minigames - can you find the easter egg on this site to play one?' },
	anchor: { file: 'anchor-brewing-homepage-2026-09-30.mp4', line: 'When Anchor Rebranded, We Relaunched the brand with a new website.' },
	soonhari: { file: 'soonhari-homepage-2026-09-30-4k.mp4', line: 'Soonhari, the original flavored Soju just got a brand new website.', link:'https://soonhariusa.com' },
	ej: { file: 'ej-brandy-home-collection-vsop-2026-09-30.mp4', line: 'The E&J Brandy homepage.' },
	camarena: { file: 'camarena-home-margarita-2026-09-30.mp4', line: 'The Camarena Tequila homepage.' },
	rumchata: { file: 'rumchata-home-peppermint-bark-2026-09-30.mp4', line: 'The RumChata homepage.' },
	'pink-whitney': { file: 'pink-whitney-home-products-750ml-2026-09-30.mp4', line: 'The Pink Whitney homepage.' },
	'new-amsterdam': { file: 'new-amsterdam-home-find-your-wins-2026-09-30.mp4', line: 'The New Amsterdam Vodka homepage.' }
};

// Measured on the accepted master (art/sources/side-project-fix/stitched.png, 1672 x 941, installed 4x as
// side-project-master; buildout ticket 05, 2026-09-28): the front bar seen nearly face-on, its navy wall behind. The eleven
// brand bottles stand in one lit row on the wall's lower shelf, left to right in brand order (round two, 2026-09-30), each
// rect its matte's trim; the back bar's cooler at the right carries the Side Project sign on its door and the chalkboard.
// The two counters are walk-behind scenery; no prop stands on them.
const shelf: Record<Brand, Rect> = {
	'bud-light': { x: 398, y: 644, w: 66, h: 211 },
	sapporo: { x: 500, y: 644, w: 66, h: 211 },
	anchor: { x: 602, y: 643, w: 66, h: 211 },
	soonhari: { x: 706, y: 682, w: 53, h: 168 },
	bacardi: { x: 795, y: 590, w: 83, h: 260 },
	'grey-goose': { x: 914, y: 578, w: 76, h: 272 },
	ej: { x: 1026, y: 650, w: 95, h: 202 },
	camarena: { x: 1157, y: 631, w: 95, h: 219 },
	rumchata: { x: 1290, y: 650, w: 97, h: 201 },
	'pink-whitney': { x: 1423, y: 622, w: 77, h: 221 },
	'new-amsterdam': { x: 1535, y: 595, w: 80, h: 252 }
};

// One bottle per brand, its logo on the label (Joe, 2026-09-28).
const bottles: Prop[] = brands.map(([id, name]) => {
	const video = homepage[id];
	return {
		id: `bottle-${id}`,
		name: `${name} bottle`,
		gist: builtSite.has(id) ? 'built the website' : 'Moosylvania client work',
		body: [video?.line ?? (builtSite.has(id) ? `${name}: Joe built the website at Moosylvania.` : `${name}: client work at Moosylvania.`)],
		rect: shelf[id],
		...(video && { video: { file: video.file } }),
		...(video?.link && { links: [{ label: 'See More', href: video.link }] })
	};
});

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
			cosmetic: 5,
			art: ['side-project-sign']
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
