import type { District, Overworld, Rect } from './types';

// World px at 6750 x 2700, measured on the accepted overworld master (art/generated/overworld-master, issue 04).
// Registered prop and foreground rects are each extraction's trim (art/generated/<id>/asset.json); the welcome
// board, signpost, bike and ride sign are placed by their manifest world rects; the moose and rider by sceneLayouts.
// The Old Courthouse and the Maplewood storefront row are scenery painted in the plate, not venues.
const centre = (r: Rect) => r.x + r.w / 2;

// One ground plane, one horizon: the depth factor runs 0.85 at the treeline to 1.0 at the south edge in every
// region, so crossing a region boundary never changes scale. The regions tile the ground so no gap falls back to 1.
const HORIZON_Y = 250;
const FOREGROUND_Y = 2700;

const districts: District[] = [
	{
		id: 'maplewood',
		name: 'Maplewood',
		rect: { x: 0, y: 760, w: 2050, h: 1000 },
		sign: { x: 400, y: 1370, w: 460, h: 110 },
		venues: [
			{
				id: 'moosylvania',
				name: 'Moosylvania',
				rect: { x: 1560, y: 990, w: 360, h: 480 },
				door: '/moosylvania',
				props: [
					{
						id: 'welcome',
						name: 'Welcome sign',
						gist: 'Moosylvania, 2011 to present',
						body: [
							'2011 to present. Senior Developer to Chief Architect.',
							'Leads all web work with a small team of writers, creatives and developers.'
						],
						rect: { x: 1775, y: 1400, w: 120, h: 77 }
					},
					{
						id: 'moose',
						name: 'The moose',
						gist: 'the Moosylvania mascot',
						// TODO Joe: the content inventory leaves the moose's personal line to be written.
						body: ['The Moosylvania moose.'],
						rect: { x: 1790, y: 1520, w: 140, h: 105 },
						cosmetic: 4
					}
				]
			},
			{
				id: 'side-project',
				name: 'Side Project Cellar',
				rect: { x: 210, y: 1070, w: 600, h: 240 },
				door: '/side-project',
				props: []
			}
		]
	},
	{
		id: 'central-west-end',
		name: 'Central West End',
		rect: { x: 1850, y: 290, w: 1850, h: 560 },
		sign: { x: 1880, y: 700, w: 560, h: 140 },
		venues: [{ id: 'brennans', name: "Brennan's", rect: { x: 2910, y: 390, w: 400, h: 390 }, door: '/brennans', props: [] }]
	},
	{
		id: 'carondelet-park',
		name: 'Carondelet Park',
		rect: { x: 850, y: 1900, w: 2950, h: 800 },
		sign: { x: 1430, y: 2400, w: 550, h: 140 },
		venues: [
			{
				id: 'park',
				name: 'Carondelet Park',
				rect: { x: 900, y: 1950, w: 2800, h: 700 },
				props: [
					{
						id: 'track',
						name: 'Cycling course',
						gist: 'the Carondelicious Criterium and Tuesday night training',
						body: ['The loop road around the lake hosts the Carondelicious Criterium and the Tuesday night training series.'],
						// The lower straight of the lake loop, west of the foreground tree.
						rect: { x: 2300, y: 2635, w: 400, h: 55 }
					},
					{
						id: 'bike',
						name: 'Joe’s bike',
						gist: 'still riding, on Strava',
						body: ['Joe raced criteriums and still rides. Follow along on Strava.'],
						links: [{ label: 'Strava', href: 'https://www.strava.com/athletes/8703625' }],
						rect: { x: 2350, y: 2558, w: 100, h: 57 },
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
						rect: { x: 2982, y: 2528, w: 82, h: 98 }
					}
				]
			}
		]
	},
	{
		id: 'midtown',
		name: 'Midtown',
		rect: { x: 2150, y: 700, w: 2200, h: 1250 },
		sign: { x: 2760, y: 1280, w: 400, h: 130 },
		venues: [
			{ id: 'slu', name: 'Saint Louis University', rect: { x: 2440, y: 890, w: 1240, h: 430 }, door: '/slu', props: [] },
			{
				id: 'foundry',
				name: 'The Foundry',
				rect: { x: 2200, y: 1380, w: 1900, h: 520 },
				door: '/foundry',
				props: [
					{
						id: 'marquee',
						name: 'Marquee',
						gist: 'Universal Pictures Home Entertainment',
						// Clearance: the three titles are told only on the screen and under the posters inside.
						body: ['Universal Pictures Home Entertainment: three titles, now showing inside.'],
						rect: { x: 3238, y: 1585, w: 563, h: 152 }
					}
				]
			}
		]
	},
	{
		id: 'belleville',
		name: 'Belleville',
		rect: { x: 5800, y: 950, w: 950, h: 900 },
		sign: { x: 6110, y: 1630, w: 350, h: 130 },
		venues: [
			{
				id: 'monstercommerce',
				name: 'MonsterCommerce',
				rect: { x: 5900, y: 1050, w: 720, h: 480 },
				props: [
					{
						id: 'mc-sign',
						name: 'MonsterCommerce sign',
						gist: '2004 to 2011, acquired by Network Solutions',
						body: [
							'Intern from 2004, full time from 2005 after graduation, left in 2011.',
							'Acquired by Network Solutions, announced December 2005.'
						],
						rect: { x: 5910, y: 1118, w: 631, h: 185 },
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
						rect: { x: 6351, y: 1406, w: 121, h: 174 }
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
	w: 6750,
	h: 2700,
	signpost: {
		rect: { x: 1520, y: 1370, w: 60, h: 120 },
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
		{ x: 0, y: 250, w: 1500, h: 2450 }, // Maplewood and the Forest Park strip
		{ x: 1500, y: 250, w: 2200, h: 1050 }, // Central West End and the I-64 strip
		{ x: 1500, y: 1300, w: 2700, h: 600 }, // Midtown
		{ x: 1500, y: 1900, w: 2700, h: 800 }, // Carondelet Park
		{ x: 3700, y: 250, w: 2100, h: 1050 }, // the Arch grounds, Eads Bridge and the river's north reach
		{ x: 4200, y: 1300, w: 1600, h: 1400 }, // the Mississippi south of the Arch and the Poplar crossing
		{ x: 5800, y: 250, w: 950, h: 2450 } // Belleville
	].map((rect) => ({ rect, horizonY: HORIZON_Y, foregroundY: FOREGROUND_Y })),
	foreground: [
		{ key: 'maplewood-tree', rect: { x: 1543, y: 1574, w: 242, h: 232 } },
		{ key: 'park-tree', rect: { x: 2709, y: 2420, w: 271, h: 255 } }
	],
	river: {
		// West bank north to south, the south edge, then the east bank south to north. Traced by water colour
		// on the master at 100 px rows; the rows under the two bridges are interpolated.
		mask: [
			{ x: 5040, y: 270 }, { x: 5048, y: 300 }, { x: 4980, y: 400 }, { x: 4915, y: 500 }, { x: 4891, y: 600 },
			{ x: 4956, y: 700 }, { x: 5031, y: 800 }, { x: 5085, y: 900 }, { x: 5140, y: 1000 }, { x: 5239, y: 1100 },
			{ x: 5239, y: 1200 }, { x: 5273, y: 1300 }, { x: 5297, y: 1400 }, { x: 5283, y: 1500 }, { x: 5245, y: 1600 },
			{ x: 5188, y: 1700 }, { x: 5090, y: 1800 }, { x: 4960, y: 1900 }, { x: 4891, y: 2000 }, { x: 4830, y: 2100 },
			{ x: 4766, y: 2200 }, { x: 4708, y: 2300 }, { x: 4650, y: 2400 }, { x: 4595, y: 2500 }, { x: 4544, y: 2600 },
			{ x: 4500, y: 2700 },
			{ x: 6355, y: 2700 }, { x: 6338, y: 2600 }, { x: 6304, y: 2500 }, { x: 6256, y: 2400 }, { x: 6195, y: 2300 },
			{ x: 6049, y: 2200 }, { x: 6049, y: 2100 }, { x: 5804, y: 2000 }, { x: 5800, y: 1900 }, { x: 5790, y: 1800 },
			{ x: 5719, y: 1700 }, { x: 5661, y: 1600 }, { x: 5627, y: 1500 }, { x: 5616, y: 1400 }, { x: 5627, y: 1300 },
			{ x: 5647, y: 1200 }, { x: 5715, y: 1100 }, { x: 5770, y: 1000 }, { x: 5889, y: 900 }, { x: 5988, y: 800 },
			{ x: 5981, y: 700 }, { x: 5994, y: 600 }, { x: 6297, y: 500 }, { x: 6345, y: 400 }, { x: 6423, y: 300 },
			{ x: 6440, y: 270 }
		],
		// The Eads deck slopes from (4880, 370) to (6320, 600); the walkable rect spans the water between the banks.
		deck: { x: 4880, y: 340, w: 1440, h: 290 },
		bridge: { key: 'eads-bridge', rect: { x: 4715, y: 339, w: 2035, h: 434 } },
		// Passing under the Poplar Street bridge is the river's end.
		southEndY: 1900,
		// The lawn between the Arch's legs, above the highway.
		arch: { x: 4600, y: 1450 }
	}
};
