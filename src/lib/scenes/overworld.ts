import type { District, Overworld, Rect } from './types';

// Every rect here was measured on the accepted overworld master (art/reviews/2026-09-24-overworld.md),
// world px at 5400 x 2700. Registered prop rects are the extraction's trim (art/generated/<id>/asset.json).
const centre = (r: Rect) => r.x + r.w / 2;

// One ground plane, one horizon: the depth factor runs 0.85 at the skyline to 1.0 at the south edge in every
// region, so crossing a region boundary never changes scale. The regions tile the world so no gap falls back to 1.
const HORIZON_Y = 300;
const FOREGROUND_Y = 2700;

const districts: District[] = [
	{
		id: 'maplewood',
		name: 'Maplewood',
		rect: { x: 0, y: 850, w: 1500, h: 1400 },
		sign: { x: 520, y: 1800, w: 520, h: 170 },
		venues: [
			{
				id: 'moosylvania',
				name: 'Moosylvania',
				rect: { x: 700, y: 880, w: 630, h: 890 },
				door: '/moosylvania',
				props: [
					{
						id: 'moose',
						name: 'The moose',
						gist: 'the Moosylvania mascot',
						// TODO Joe: the content inventory leaves the moose's personal line to be written.
						body: ['The Moosylvania moose.'],
						rect: { x: 1060, y: 1840, w: 160, h: 120 },
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
						rect: { x: 1040, y: 1712, w: 130, h: 83 }
					}
				]
			},
			{
				id: 'side-project',
				name: 'Side Project Cellar',
				rect: { x: 80, y: 1380, w: 560, h: 400 },
				door: '/side-project',
				props: []
			}
		]
	},
	{
		id: 'central-west-end',
		name: 'Central West End',
		rect: { x: 1100, y: 250, w: 1200, h: 650 },
		sign: { x: 1510, y: 690, w: 450, h: 110 },
		venues: [{ id: 'brennans', name: "Brennan's", rect: { x: 1500, y: 300, w: 310, h: 400 }, door: '/brennans', props: [] }]
	},
	{
		id: 'carondelet-park',
		name: 'Carondelet Park',
		rect: { x: 1300, y: 1300, w: 2050, h: 1350 },
		sign: { x: 1980, y: 2280, w: 630, h: 200 },
		venues: [
			{
				id: 'park',
				name: 'Carondelet Park',
				rect: { x: 1350, y: 1350, w: 1950, h: 1250 },
				props: [
					{
						id: 'track',
						name: 'Cycling track',
						gist: 'the Carondelicious Criterium and Tuesday night training',
						body: ['The park hosts the Carondelicious Criterium and the Tuesday night training series.'],
						rect: { x: 1400, y: 1960, w: 1450, h: 350 }
					},
					{
						id: 'bike',
						name: 'Joe’s bike',
						gist: 'still riding, on Strava',
						body: ['Joe raced criteriums and still rides. Follow along on Strava.'],
						links: [{ label: 'Strava', href: 'https://www.strava.com/athletes/8703625' }],
						rect: { x: 2650, y: 2280, w: 195, h: 140 },
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
						rect: { x: 2850, y: 2020, w: 230, h: 330 }
					}
				]
			}
		]
	},
	{
		id: 'midtown',
		name: 'Midtown',
		rect: { x: 2650, y: 250, w: 1100, h: 900 },
		sign: { x: 2700, y: 610, w: 330, h: 170 },
		venues: [
			{ id: 'slu', name: 'Saint Louis University', rect: { x: 2790, y: 280, w: 770, h: 340 }, door: '/slu', props: [] },
			{
				id: 'foundry',
				name: 'The Foundry',
				rect: { x: 2820, y: 590, w: 880, h: 510 },
				door: '/foundry',
				props: [
					{
						id: 'marquee',
						name: 'Marquee',
						gist: 'Universal Pictures Home Entertainment',
						// Clearance: the three titles are told only on the screen and under the posters inside.
						body: ['Universal Pictures Home Entertainment: three titles, now showing inside.'],
						rect: { x: 3020, y: 850, w: 380, h: 110 }
					}
				]
			}
		]
	},
	{
		id: 'belleville',
		name: 'Belleville',
		rect: { x: 4700, y: 850, w: 700, h: 700 },
		sign: { x: 4920, y: 1170, w: 390, h: 190 },
		venues: [
			{
				id: 'monstercommerce',
				name: 'MonsterCommerce',
				rect: { x: 4740, y: 930, w: 660, h: 490 },
				props: [
					{
						id: 'mc-sign',
						name: 'MonsterCommerce sign',
						gist: '2004 to 2011, acquired by Network Solutions',
						body: [
							'Intern from 2004, full time from 2005 after graduation, left in 2011.',
							'Acquired by Network Solutions, announced December 2005.'
						],
						rect: { x: 4790, y: 930, w: 510, h: 160 },
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
						rect: { x: 5175, y: 1230, w: 80, h: 190 }
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
		rect: { x: 1215, y: 1660, w: 75, h: 140 },
		// TODO Joe: the email address and LinkedIn URL are not on record anywhere in the spec. Fill them in.
		contacts: [
			{ label: 'Resume', href: '/resume.pdf' },
			{ label: 'Email', href: 'mailto:TODO' },
			{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/TODO' },
			{ label: 'GitHub', href: 'https://github.com/obj63mc' }
		]
	},
	districts: districts.sort((a, b) => centre(a.rect) - centre(b.rect)),
	depth: [
		{ x: 0, y: 250, w: 1350, h: 2450 }, // Maplewood and the Forest Park strip
		{ x: 1350, y: 250, w: 1300, h: 1050 }, // Central West End and the I-64 strip
		{ x: 2650, y: 250, w: 1350, h: 1050 }, // Midtown
		{ x: 1350, y: 1300, w: 2650, h: 1400 }, // Carondelet Park, I-44 and the Arch lawn
		{ x: 4000, y: 250, w: 700, h: 2450 }, // the Mississippi
		{ x: 4700, y: 250, w: 700, h: 2450 } // Belleville
	].map((rect) => ({ rect, horizonY: HORIZON_Y, foregroundY: FOREGROUND_Y })),
	foreground: [
		{ key: 'maplewood-tree', rect: { x: 1100, y: 1980, w: 130, h: 130 } },
		{ key: 'arch-tree', rect: { x: 3700, y: 1820, w: 110, h: 150 } }
	],
	river: {
		// West bank north to south, then the Poplar Street bridge line, then the east bank south to north.
		mask: [
			{ x: 4000, y: 230 }, { x: 4040, y: 330 }, { x: 4060, y: 450 }, { x: 4030, y: 560 }, { x: 3990, y: 650 },
			{ x: 3960, y: 820 }, { x: 3990, y: 900 }, { x: 4000, y: 1100 }, { x: 4010, y: 1200 }, { x: 4060, y: 1300 },
			{ x: 4120, y: 1400 }, { x: 4180, y: 1500 }, { x: 4240, y: 1600 }, { x: 4300, y: 1700 }, { x: 4350, y: 1900 },
			{ x: 4400, y: 2100 }, { x: 4390, y: 2200 }, { x: 4330, y: 2380 },
			{ x: 5400, y: 2380 }, { x: 5400, y: 2160 },
			{ x: 5300, y: 2060 }, { x: 5200, y: 1960 }, { x: 5100, y: 1860 }, { x: 5000, y: 1760 }, { x: 4900, y: 1660 },
			{ x: 4800, y: 1560 }, { x: 4700, y: 1460 }, { x: 4640, y: 1360 }, { x: 4600, y: 1250 }, { x: 4620, y: 1130 },
			{ x: 4650, y: 1030 }, { x: 4700, y: 950 }, { x: 4780, y: 900 }, { x: 4860, y: 850 }, { x: 4910, y: 700 },
			{ x: 4880, y: 500 }, { x: 4820, y: 400 }, { x: 4750, y: 320 }, { x: 4650, y: 250 }, { x: 4600, y: 230 }
		],
		deck: { x: 3990, y: 730, w: 950, h: 70 },
		bridge: { key: 'eads-bridge', rect: { x: 3990, y: 590, w: 960, h: 290 } },
		// Passing under the Poplar Street bridge is the river's end.
		southEndY: 2360,
		arch: { x: 3840, y: 1960 }
	}
};
