import type { District, Overworld, Point, Rect } from './types';

// Placeholder rects from the cursor-sync prototype's stand-in layout; the overworld art pass
// (buildout ticket 04) rewrites every rect, the depth regions, foreground scenery and river geometry.
const MW: Point = { x: 100, y: 900 };
const CWE: Point = { x: 1700, y: 200 };
const MID: Point = { x: 2850, y: 200 };
const BEL: Point = { x: 4250, y: 600 };
const PARK: Point = { x: 1900, y: 1700 };
const footprint = (origin: Point): Rect => ({ ...origin, w: 1400, h: 1000 });
const sign = (origin: Point): Rect => ({ x: origin.x + 40, y: origin.y + 40, w: 260, h: 90 });
const centre = (r: Rect) => r.x + r.w / 2;

const districts: District[] = [
	{
		id: 'maplewood',
		name: 'Maplewood',
		rect: footprint(MW),
		sign: sign(MW),
		venues: [
			{
				id: 'moosylvania',
				name: 'Moosylvania',
				rect: { x: MW.x + 900, y: MW.y + 250, w: 600, h: 400 },
				door: '/moosylvania',
				props: [
					{
						id: 'moose',
						name: 'The moose',
						gist: 'the Moosylvania mascot',
						// TODO Joe: the content inventory leaves the moose's personal line to be written.
						body: ['The Moosylvania moose.'],
						rect: { x: 1166, y: 1385, w: 95, h: 113 },
						cosmetic: 4
					},
					{
						id: 'welcome',
						name: 'Welcome sign',
						gist: 'Moosylvania, 2011 to present',
						body: [
							'2011 to present. Senior Developer to Chief Architect.',
							'Leads all web work with a small team of writers, creatives and developers.'
						],
						rect: { x: MW.x + 1225, y: MW.y + 512, w: 150, h: 88 }
					}
				]
			},
			{
				id: 'side-project',
				name: 'Side Project Cellar',
				rect: { x: MW.x + 250, y: MW.y + 250, w: 400, h: 300 },
				door: '/side-project',
				props: []
			}
		]
	},
	{
		id: 'central-west-end',
		name: 'Central West End',
		rect: footprint(CWE),
		sign: sign(CWE),
		venues: [{ id: 'brennans', name: "Brennan's", rect: { x: CWE.x + 700, y: CWE.y + 250, w: 400, h: 300 }, door: '/brennans', props: [] }]
	},
	{
		id: 'carondelet-park',
		name: 'Carondelet Park',
		rect: footprint(PARK),
		sign: sign(PARK),
		venues: [
			{
				id: 'park',
				name: 'Carondelet Park',
				rect: { x: PARK.x + 150, y: PARK.y + 100, w: 1100, h: 700 },
				props: [
					{
						id: 'track',
						name: 'Cycling track',
						gist: 'the Carondelicious Criterium and Tuesday night training',
						body: ['The park hosts the Carondelicious Criterium and the Tuesday night training series.'],
						rect: { x: PARK.x + 200, y: PARK.y + 300, w: 900, h: 450 }
					},
					{
						id: 'bike',
						name: 'Joe’s bike',
						gist: 'still riding, on Strava',
						body: ['Joe raced criteriums and still rides. Follow along on Strava.'],
						links: [{ label: 'Strava', href: 'https://www.strava.com/athletes/8703625' }],
						rect: { x: PARK.x + 700, y: PARK.y + 150, w: 120, h: 80 },
						cosmetic: 7
					},
					{
						id: 'ride-sign',
						name: 'Ride sign',
						gist: 'longest ride 160 miles',
						body: [
							'Longest ride: 160 miles, Ride Across Wisconsin. Longest two-day ride: 235 miles, Ride Across Wisconsin.',
							'Raced criteriums, still rides.'
						],
						rect: { x: PARK.x + 950, y: PARK.y + 150, w: 100, h: 130 }
					}
				]
			}
		]
	},
	{
		id: 'midtown',
		name: 'Midtown',
		rect: footprint(MID),
		sign: sign(MID),
		venues: [
			{ id: 'slu', name: 'Saint Louis University', rect: { x: MID.x + 150, y: MID.y + 250, w: 400, h: 300 }, door: '/slu', props: [] },
			{
				id: 'foundry',
				name: 'The Foundry',
				rect: { x: MID.x + 700, y: MID.y + 250, w: 500, h: 350 },
				door: '/foundry',
				props: [
					{
						id: 'marquee',
						name: 'Marquee',
						gist: 'Universal Pictures Home Entertainment',
						// Clearance: the three titles are told only on the screen and under the posters inside.
						body: ['Universal Pictures Home Entertainment: three titles, now showing inside.'],
						rect: { x: MID.x + 750, y: MID.y + 260, w: 400, h: 90 }
					}
				]
			}
		]
	},
	{
		id: 'belleville',
		name: 'Belleville',
		rect: footprint(BEL),
		sign: sign(BEL),
		venues: [
			{
				id: 'monstercommerce',
				name: 'MonsterCommerce',
				rect: { x: BEL.x + 300, y: BEL.y + 250, w: 600, h: 350 },
				props: [
					{
						id: 'mc-sign',
						name: 'MonsterCommerce sign',
						gist: '2004 to 2011, acquired by Network Solutions',
						body: [
							'Intern from 2004, full time from 2005 after graduation, left in 2011.',
							'Acquired by Network Solutions, announced December 2005.'
						],
						rect: { x: BEL.x + 350, y: BEL.y + 260, w: 300, h: 90 },
						cosmetic: 3
					},
					{
						id: 'server-rack',
						name: 'Server rack',
						gist: 'the e-commerce platform, Shopify before Shopify',
						body: [
							'Built the e-commerce platform: Shopify before Shopify.',
							'After the acquisition, moved to networksolutions.com, focusing on conversion optimisation, front-end development and A/B testing.'
						],
						rect: { x: BEL.x + 750, y: BEL.y + 400, w: 100, h: 180 }
					}
				]
			}
		]
	}
];

export const OVERWORLD: Overworld = {
	id: 'overworld',
	title: 'Joe Madden, St. Louis',
	description:
		'An explorable St. Louis where Joe Madden, Chief Architect at Moosylvania, keeps his career, client work, resume and contact details. Move through it as a cursor alongside other visitors.',
	w: 5400,
	h: 2700,
	signpost: {
		rect: { x: MW.x + 614, y: MW.y + 376, w: 91, h: 170 },
		// TODO Joe: the email address and LinkedIn URL are not on record anywhere in the spec. Fill them in.
		contacts: [
			{ label: 'Resume', href: '/resume.pdf' },
			{ label: 'Email', href: 'mailto:TODO' },
			{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/TODO' },
			{ label: 'GitHub', href: 'https://github.com/obj63mc' }
		]
	},
	districts: districts.sort((a, b) => centre(a.rect) - centre(b.rect)),
	depth: districts.map((d) => ({ rect: d.rect, horizonY: d.rect.y + 200, foregroundY: d.rect.y + d.rect.h })),
	foreground: [],
	river: {
		mask: [
			{ x: 3980, y: 0 },
			{ x: 4200, y: 0 },
			{ x: 4200, y: 2700 },
			{ x: 3980, y: 2700 }
		],
		deck: { x: 3900, y: 1180, w: 380, h: 110 },
		southEndY: 2676,
		arch: { x: 3900, y: 1000 }
	}
};
