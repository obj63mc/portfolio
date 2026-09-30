import type { District, Overworld, Rect } from './types';

// World px at 6750 x 2700, measured on the accepted overworld master (art/generated/overworld/overworld-master, issue 04).
// Registered prop and foreground rects are each extraction's trim (art/generated/overworld/<id>/asset.json); the welcome
// board, signpost, bike and ride sign are placed by their manifest world rects; the moose and rider by sceneLayouts.
// The Old Courthouse and the Maplewood storefront row are scenery painted in the plate, not venues.
const centre = (r: Rect) => r.x + r.w / 2;

// One ground plane, one horizon: the depth factor runs 0.85 at the treeline to 1.0 at the south edge in every
// region, so crossing a region boundary never changes scale. The regions tile the whole world, sky included, so the
// factor holds 0.85 above the treeline instead of falling back to 1 there.
const HORIZON_Y = 250;
const FOREGROUND_Y = 2700;

const districts: District[] = [
	{
		id: 'maplewood',
		name: 'Maplewood',
		rect: { x: 0, y: 860, w: 1950, h: 900 },
		sign: { x: 400, y: 1370, w: 460, h: 110 },
		venues: [
			{
				id: 'moosylvania',
				name: 'Moosylvania',
				rect: { x: 1560, y: 990, w: 380, h: 640 },
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
		rect: { x: 1870, y: 290, w: 1830, h: 560 },
		sign: { x: 1880, y: 700, w: 560, h: 140 },
		venues: [{ id: 'brennans', name: "Brennan's", rect: { x: 2910, y: 390, w: 400, h: 390 }, door: '/brennans', props: [] }]
	},
	{
		id: 'carondelet-park',
		name: 'Carondelet Park',
		// North to the gazebo's lawn, where Joe's bike and the ride sign stand (Joe, 2026-09-29).
		rect: { x: 850, y: 1795, w: 2950, h: 905 },
		sign: { x: 1430, y: 2400, w: 550, h: 140 },
		venues: [
			{
				id: 'park',
				name: 'Carondelet Park',
				rect: { x: 900, y: 1800, w: 2800, h: 900 },
				props: [
					// Joe's bike parked in front of the notice board on the lawn west of the gazebo, north of the lake, clear of the
					// lake loop: nothing on the track is clickable, since its lap timer is an Easter egg (Joe, 2026-09-29).
					{
						id: 'bike',
						name: 'Joe’s bike',
						gist: 'still riding, on Strava',
						body: ['Joe raced criteriums and still rides. Follow along on Strava.'],
						links: [{ label: 'Strava', href: 'https://www.strava.com/athletes/8703625' }],
						rect: { x: 2012, y: 1884, w: 100, h: 57 },
						cosmetic: 7
					},
					{
						id: 'ride-sign',
						name: 'Ride sign',
						gist: 'longest ride 160 miles',
						body: [
							'Longest ride: 160 miles, Ride Across Wisconsin. Longest two-day ride: 235 miles, Ride Across Wisconsin.',
							'Raced criteriums, still rides. The loop road around the lake hosts the Carondelicious Criterium and the Tuesday night training series.'
						],
						rect: { x: 1992, y: 1806, w: 78, h: 94 }
					}
				]
			}
		]
	},
	{
		id: 'midtown',
		name: 'Midtown',
		rect: { x: 2150, y: 870, w: 2200, h: 925 },
		sign: { x: 2760, y: 1280, w: 400, h: 130 },
		venues: [
			{ id: 'slu', name: 'Saint Louis University', rect: { x: 2440, y: 890, w: 1240, h: 430 }, door: '/slu', props: [] },
			{
				id: 'foundry',
				name: 'The Foundry',
				rect: { x: 2200, y: 1380, w: 1900, h: 415 },
				door: '/foundry',
				props: [
					{
						id: 'marquee',
						name: 'Marquee',
						gist: 'Universal Pictures Home Entertainment',
						// Clearance: the three titles are told only on the screen and under the posters inside.
						body: ['Universal Pictures Home Entertainment: three titles, now showing inside.'],
						rect: { x: 3238, y: 1585, w: 563, h: 152 },
						// The canopy, then its string of bulbs, which chase.
						art: ['marquee', 'marquee-bulbs']
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
				rect: { x: 5900, y: 1050, w: 720, h: 560 },
				props: [
					{
						id: 'mc-sign',
						name: 'MonsterCommerce sign',
						gist: '2004 to 2011, acquired by Network Solutions',
						body: [
							'Intern from 2004, full time from 2005 after graduation, left in 2011.',
							'Acquired by Network Solutions, announced December 2005.'
						],
						rect: { x: 5945, y: 1106, w: 581, h: 165 },
						cosmetic: 3,
						// The sign, then the monster's eye forming its O, which blinks.
						art: ['mc-sign', 'mc-eye']
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
	pushBand: 0.25,
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
		{ x: 0, y: 0, w: 1500, h: 2700 }, // Maplewood and the Forest Park strip
		{ x: 1500, y: 0, w: 2200, h: 1300 }, // Central West End and the I-64 strip
		{ x: 1500, y: 1300, w: 2700, h: 600 }, // Midtown
		{ x: 1500, y: 1900, w: 2700, h: 800 }, // Carondelet Park
		{ x: 3700, y: 0, w: 2100, h: 1300 }, // the Arch grounds, Eads Bridge and the river's north reach
		{ x: 4200, y: 1300, w: 1600, h: 1400 }, // the Mississippi south of the Arch and the Poplar crossing
		{ x: 5800, y: 0, w: 950, h: 2700 } // Belleville
	].map((rect) => ({ rect, horizonY: HORIZON_Y, foregroundY: FOREGROUND_Y })),
	foreground: [
		{ key: 'maplewood-tree', rect: { x: 1543, y: 1574, w: 242, h: 232 } },
		{ key: 'park-tree', rect: { x: 2784, y: 2462, w: 195, h: 237 } }
	],
	river: {
		// West bank north to south, the south edge, then the east bank south to north. Traced by water colour on the
		// fill-pass master at 50 px rows (scripts/art/overworld/assembly/rivermask.py); the rows under the Eads arches
		// and the Poplar bridge, the Arch levee riverboat and the Belleville barge dock are read by eye on gridded crops
		// instead. East bank rows 800 to 900 re-traced on the round-thirteen master (the bank below the east pier).
		mask: [
			{ x: 4870, y: 250 }, { x: 4880, y: 300 }, { x: 4900, y: 350 }, { x: 4960, y: 400 }, { x: 4943, y: 450 },
			{ x: 4912, y: 500 }, { x: 4880, y: 550 }, { x: 4861, y: 600 }, { x: 4925, y: 650 }, { x: 4990, y: 700 },
			{ x: 5040, y: 750 }, { x: 5090, y: 800 }, { x: 5130, y: 850 }, { x: 5164, y: 900 }, { x: 5211, y: 950 },
			{ x: 5249, y: 1000 }, { x: 5249, y: 1050 }, { x: 5245, y: 1100 }, { x: 5245, y: 1150 }, { x: 5249, y: 1200 },
			{ x: 5286, y: 1250 }, { x: 5276, y: 1300 }, { x: 5283, y: 1350 }, { x: 5293, y: 1400 }, { x: 5290, y: 1450 },
			{ x: 5280, y: 1500 }, { x: 5266, y: 1550 }, { x: 5242, y: 1600 }, { x: 5222, y: 1650 }, { x: 5188, y: 1700 },
			{ x: 5100, y: 1750 }, { x: 5030, y: 1800 }, { x: 4990, y: 1850 }, { x: 4960, y: 1900 }, { x: 4925, y: 1950 },
			{ x: 4891, y: 2000 }, { x: 4818, y: 2050 }, { x: 4745, y: 2100 }, { x: 4672, y: 2150 }, { x: 4598, y: 2200 },
			{ x: 4585, y: 2250 }, { x: 4564, y: 2300 }, { x: 4544, y: 2350 }, { x: 4525, y: 2400 }, { x: 4497, y: 2450 },
			{ x: 4476, y: 2500 }, { x: 4459, y: 2550 }, { x: 4442, y: 2600 }, { x: 4425, y: 2650 }, { x: 4411, y: 2700 },
			{ x: 6290, y: 2700 }, { x: 6277, y: 2650 }, { x: 6260, y: 2600 }, { x: 6243, y: 2550 }, { x: 6222, y: 2500 },
			{ x: 6188, y: 2450 }, { x: 6154, y: 2400 }, { x: 6113, y: 2350 }, { x: 6052, y: 2300 }, { x: 6022, y: 2250 },
			{ x: 6008, y: 2200 }, { x: 5984, y: 2150 }, { x: 5940, y: 2100 }, { x: 5899, y: 2050 }, { x: 5804, y: 2000 },
			{ x: 5804, y: 1950 }, { x: 5800, y: 1900 }, { x: 5800, y: 1850 }, { x: 5800, y: 1800 }, { x: 5800, y: 1750 },
			{ x: 5790, y: 1700 }, { x: 5759, y: 1650 }, { x: 5736, y: 1600 }, { x: 5715, y: 1550 }, { x: 5702, y: 1500 },
			{ x: 5698, y: 1450 }, { x: 5708, y: 1400 }, { x: 5715, y: 1350 }, { x: 5732, y: 1300 }, { x: 5753, y: 1250 },
			{ x: 5776, y: 1200 }, { x: 5613, y: 1150 }, { x: 5634, y: 1100 }, { x: 5715, y: 1050 }, { x: 5753, y: 1000 },
			{ x: 5797, y: 950 }, { x: 5896, y: 900 }, { x: 5943, y: 850 }, { x: 5926, y: 800 }, { x: 5988, y: 750 },
			{ x: 5998, y: 700 }, { x: 6000, y: 650 }, { x: 6150, y: 600 }, { x: 6300, y: 550 }, { x: 6320, y: 500 },
			{ x: 6300, y: 450 }, { x: 6200, y: 400 }, { x: 6080, y: 350 }, { x: 6030, y: 300 }, { x: 6000, y: 250 }
		],
		// The Eads deck slopes from (4880, 370) to (6430, 580); the walkable rect spans the water and reaches the east
		// bank at every row it covers, so stepping off its east edge lands on grass. Being a rect round a sloped deck, it
		// also covers open water above and below the deck band (widest at its west end), where no drift applies.
		deck: { x: 4880, y: 340, w: 1550, h: 310 },
		bridge: { key: 'eads-bridge', rect: { x: 4715, y: 339, w: 2035, h: 434 } },
		// Passing under the Poplar Street bridge is the river's end.
		southEndY: 1900,
		// The lawn between the Arch's legs, south of the museum entrance.
		arch: { x: 4780, y: 1330 }
	},
	track: {
		// Read by eye on gridded crops of the plate every 100 px or so, each point then centred across the cream path
		// (buildout ticket 18). Where the path runs behind the park sign and three trees it is interpolated from either side.
		path: [
			{ x: 2599, y: 2534 }, { x: 2699, y: 2543 }, { x: 2800, y: 2544 }, { x: 2900, y: 2546 }, { x: 3000, y: 2547 },
			{ x: 3100, y: 2542 }, { x: 3200, y: 2529 }, { x: 3300, y: 2507 }, { x: 3401, y: 2484 }, { x: 3501, y: 2442 },
			{ x: 3565, y: 2394 }, { x: 3598, y: 2349 }, { x: 3606, y: 2301 }, { x: 3574, y: 2246 }, { x: 3495, y: 2195 },
			{ x: 3396, y: 2157 }, { x: 3297, y: 2128 }, { x: 3198, y: 2105 }, { x: 3099, y: 2085 }, { x: 2999, y: 2069 },
			{ x: 2899, y: 2052 }, { x: 2799, y: 2035 }, { x: 2699, y: 2021 }, { x: 2600, y: 2007 }, { x: 2450, y: 2000 },
			{ x: 2300, y: 1998 }, { x: 2148, y: 1994 }, { x: 2000, y: 1961 }, { x: 1800, y: 1947 }, { x: 1600, y: 1944 },
			{ x: 1450, y: 1951 }, { x: 1301, y: 1978 }, { x: 1206, y: 2036 }, { x: 1165, y: 2110 }, { x: 1172, y: 2179 },
			{ x: 1202, y: 2238 }, { x: 1261, y: 2299 }, { x: 1355, y: 2351 }, { x: 1431, y: 2379 }, { x: 1600, y: 2388 },
			{ x: 1800, y: 2400 }, { x: 2000, y: 2428 }, { x: 2100, y: 2457 }, { x: 2199, y: 2478 }, { x: 2300, y: 2493 },
			{ x: 2400, y: 2508 }, { x: 2499, y: 2523 }
		],
		// 25 to 57 px wide, 37 on the lower straight.
		half: 18,
		// The turns at the loop's far west and east ends, round which the lap timer's corridor widens (Joe, 2026-09-30): the
		// path bends west of x 1450 and east of x 3450, and the corridor is at its widest there, having widened along the last
		// 250 px of each straight.
		ends: { west: 1650, east: 3200 },
		cover: ['park-sign', 'track-tree-west', 'park-tree', 'track-tree-east'],
		// On the lawn where a bench stood, just south of the start line (Joe, 2026-09-29): scenery, not a prop.
		sign: 'start-sign'
	}
};
