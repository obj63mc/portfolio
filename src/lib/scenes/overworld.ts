import type { District, Overworld, Rect } from './types';

// World px at 6750 x 2700, measured on the accepted overworld master (art/generated/overworld/overworld-master, issue 04).
// Registered prop and foreground rects are each extraction's trim (art/generated/overworld/<id>/asset.json); the welcome
// board, signpost, bike and ride sign are placed by their manifest world rects; the moose and rider by sceneLayouts.
// The Old Courthouse and the Maplewood storefront row are scenery painted in the plate, not venues.
const centre = (r: Rect) => r.x + r.w / 2;

/**
 * The games (Joe, 2026-09-30 and 2026-10-01), each a page of its own with no scene, at `/<id>`, which is also the id of
 * the venue whose door leads there: Sushi Stand behind the koi in Forest Park's Grand Basin, and Big Muddy behind the
 * angler on the Mississippi's Illinois bank.
 */
export const SUSHI = 'sushi-stand';
export const BIG_MUDDY = 'big-muddy';
export const GAMES = [SUSHI, BIG_MUDDY] as const;
export type GameId = (typeof GAMES)[number];
/** The game a page path is, if it is one. */
export const gameAt = (pathname: string): GameId | undefined => GAMES.find((g) => pathname === `/${g}`);

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
						rect: { x: 1775, y: 1363, w: 160, h: 114 }
					},
					{
						id: 'moose',
						name: 'The moose',
						gist: 'the Moosylvania mascot',
						// No card: the moose, the statue, the bike and the MonsterCommerce eye are Easter eggs, their click the
						// grant (Joe, 2026-09-30).
						kind: 'action',
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
			},
			{
				// St. Louis Bread Co. (Joe, 2026-10-01), east of Ted Drewes, the white building with the yellow awning: the
				// building with its patio and shrubs, measured on the installed master (overworld rounds twenty and twenty-one).
				id: 'bread-co',
				name: 'St. Louis Bread Co.',
				rect: { x: 1225, y: 1615, w: 229, h: 138 },
				door: '/bread-co',
				props: []
			}
		]
	},
	{
		// The park strip north of Maplewood, under its painted sign (Joe, 2026-09-30). A koi swims in the Grand Basin below the
		// Art Museum and its statue; clicking it opens Sushi Stand, the game (routes/sushi-stand). The venue is the koi's
		// swim, measured on a gridded crop of the master between the basin's fountains, its door the whole of it.
		id: 'forest-park',
		name: 'Forest Park',
		rect: { x: 200, y: 250, w: 1650, h: 600 },
		sign: { x: 1468, y: 694, w: 220, h: 58 },
		venues: [{ id: SUSHI, name: 'Sushi Stand', rect: { x: 684, y: 486, w: 252, h: 68 }, door: `/${SUSHI}`, props: [] }]
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
						gist: 'still riding',
						kind: 'action',
						rect: { x: 2012, y: 1884, w: 100, h: 57 },
						cosmetic: 7
					},
					{
						id: 'ride-sign',
						name: 'Ride sign',
						gist: 'longest ride 160 miles',
						// The bike's card went (Joe, 2026-09-30); its Strava link came here, and is in the copy alone (Joe, 2026-10-01).
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
				// The cinema east of the sawtooth-roofed hall, its roof to the foot of the venue, under its marquee: the hall
				// itself is no way in (Joe, 2026-09-30).
				doorRect: { x: 3236, y: 1380, w: 819, h: 415 },
				props: []
			}
		]
	},
	{
		id: 'belleville',
		name: 'Belleville',
		// North to the treeline, 700 px more than it was, to take in the Illinois bank and its grain elevator, where the
		// angler fishes (Joe, 2026-10-01).
		rect: { x: 5800, y: 250, w: 950, h: 1600 },
		sign: { x: 6110, y: 1630, w: 350, h: 130 },
		venues: [
			{
				// An angler on the sand point west of the grain elevator, fishing the Mississippi (Joe, 2026-10-01); clicking them
				// opens Big Muddy, the game (routes/big-muddy). An Easter egg, so the angler is small, about the drawn cursor's
				// size, rod and all; the venue is the least a finger needs round them on a phone, 48 CSS px at 0.6, its door
				// the whole of it and its centre ashore, where a visitor lands coming back.
				id: BIG_MUDDY,
				name: 'Big Muddy',
				rect: { x: 5956, y: 296, w: 80, h: 80 },
				door: `/${BIG_MUDDY}`,
				props: []
			},
			{
				id: 'monstercommerce',
				name: 'MonsterCommerce',
				rect: { x: 5900, y: 1050, w: 720, h: 560 },
				props: [
					{
						id: 'mc-sign',
						name: 'MonsterCommerce sign',
						gist: '2004 to 2011, acquired by Network Solutions',
						rect: { x: 5945, y: 1106, w: 581, h: 165 },
						// The sign, then the monster's eye forming its O, which blinks. The eye is its own prop, drawn here, over the sign.
						art: ['mc-sign', 'mc-eye']
					},
					{
						id: 'mc-eye',
						name: 'The monster’s eye',
						gist: 'MonsterCommerce',
						kind: 'action',
						// The eye's cut-out, measured on the plate.
						rect: { x: 6007, y: 1137, w: 66, h: 75 },
						clip: 'ellipse(50% 50%)',
						cosmetic: 3,
						art: []
					},
					{
						id: 'server-rack',
						name: 'Server rack',
						gist: 'the e-commerce platform, Shopify before Shopify',
						rect: { x: 6351, y: 1406, w: 121, h: 174 },
						// The sites and the software as they were (Joe, 2026-10-01), files in art/sources/screenshots/monstercommerce in
						// the order the card goes through them: the homepages, then what the platform and the sites did.
						screens: [
							{ name: 'Homepage, 2004', file: 'monstercommerce/01-monstercommerce-homepage-2004.webp' },
							{ name: 'Homepage, 2005', file: 'monstercommerce/02-monstercommerce-homepage-2005.webp' },
							{ name: 'Homepage, 2008', file: 'monstercommerce/03-monstercommerce-homepage-2008.webp' },
							{ name: 'Network Solutions, 2010', file: 'monstercommerce/04-network-solutions-homepage-2010.webp' },
							{ name: 'Orders list, version 3', file: 'monstercommerce/05-orders-v3.webp' },
							{ name: 'Orders list, version 4', file: 'monstercommerce/06-orders-v4.webp' },
							{ name: 'Product list, version 3', file: 'monstercommerce/07-product-list-v3.webp' },
							{ name: 'Product list, version 4', file: 'monstercommerce/08-product-list-v4.webp' },
							{ name: 'Edit product, version 3', file: 'monstercommerce/09-product-editor-v3.webp' },
							{ name: 'Edit product, version 4', file: 'monstercommerce/10-product-editor-v4.webp' },
							{ name: 'Inventory, version 3', file: 'monstercommerce/11-inventory-v3.webp' },
							{ name: 'Inventory, version 4', file: 'monstercommerce/12-inventory-v4.webp' },
							{ name: 'Categories, version 3', file: 'monstercommerce/13-categories-v3.webp' },
							{ name: 'Categories, version 4', file: 'monstercommerce/14-categories-v4.webp' },
							{ name: 'Store header, version 3', file: 'monstercommerce/15-header-html-v3.webp' },
							{ name: 'Store header, version 4', file: 'monstercommerce/16-header-html-v4.webp' },
							{ name: 'Store header, version 7', file: 'monstercommerce/17-header-html-network-solutions.webp' },
							{ name: 'Payments, version 3', file: 'monstercommerce/18-custom-payments-v3.webp' },
							{ name: 'Payments, version 4', file: 'monstercommerce/19-custom-payments-v4.webp' },
							{ name: 'Marketplace, 2005', file: 'monstercommerce/20-monstermarketplace-portal-2005.webp' },
							{ name: 'Marketplace listing, 2005', file: 'monstercommerce/21-monstermarketplace-product-2005.webp' },
							{ name: 'Registration, 2010', file: 'monstercommerce/22-network-solutions-registration-2010.webp' },
							{ name: 'Manage domain, 2011', file: 'monstercommerce/23-network-solutions-account-manager-2011.webp' }
						]
					}
				]
			}
		]
	}
];

export const OVERWORLD: Overworld = {
	id: 'overworld',
	title: 'Welcome to the Portfolio of Joseph Madden | BarMadden.com',
	description:
		'Explore the portfolio of Joseph Madden, showcasing my career, client work, resume, and contact details in an explorable St. Louis setting.',
	w: 6750,
	h: 2700,
	pushBand: 0.25,
	// The directory board on the lawn left of the church steps (Joe, 2026-10-01), drawn by scripts/art/overworld/signs.py:
	// its six plaques, three rows of two, a district each in the districts' order. The rect is the plaques' own box inside
	// the board's cut-out, which the links share, each over 48 x 48 CSS px on a phone at 0.6. It links to the districts
	// alone: the resume and the contacts are in the welcome sign's copy.
	signpost: { rect: { x: 1298, y: 1178, w: 254, h: 256 } },
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
		// instead. East bank rows 800 to 900 re-traced on the round-thirteen master (the bank below the east pier), and rows
		// 250 to 450 on a gridded crop of the master (2026-10-01): they ran 40 to 115 px inland of the painted bank beside
		// the grain elevator, where the angler's door now is.
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
			{ x: 6227, y: 450 }, { x: 6090, y: 400 }, { x: 5975, y: 350 }, { x: 5990, y: 300 }, { x: 5900, y: 250 }
		],
		// The Eads deck, road and parapet face, from the bridge cut-out's registration matte (its top edge and the girders'
		// underside) between x 4880, on the west abutment, and 6430, on the east bank's grass, so stepping off either end
		// lands ashore. Off its north or south edge is open water (buildout ticket 20).
		// The Poplar Street deck, road and parapet face, read on a gridded crop of the master between x 4950 and 5850, both on
		// the banks' grass, so a cursor crosses the river's end on it without being washed out.
		decks: [
			[{ x: 4880, y: 361 }, { x: 6430, y: 567 }, { x: 6430, y: 642 }, { x: 4880, y: 436 }],
			[{ x: 4950, y: 1672 }, { x: 5850, y: 1843 }, { x: 5850, y: 2007 }, { x: 4950, y: 1828 }]
		],
		bridges: [
			{ key: 'eads-bridge', rect: { x: 4715, y: 339, w: 2035, h: 434 } },
			{ key: 'poplar-bridge', rect: { x: 4950, y: 1668, w: 900, h: 466 } }
		],
		// Read on gridded crops of the master (Joe, 2026-09-30): the Eads Bridge's middle pier from the deck's underside to
		// its base, the riverboat at the Arch levee with its gangway to the bank, the Belleville barge dock's crane and
		// stilted pier, and the Poplar Street bridge's two piers, from its deck's underside to their bases (its cut-out's
		// matte).
		obstacles: [
			{ x: 5310, y: 455, w: 160, h: 195 },
			{ x: 4960, y: 690, w: 225, h: 128 },
			{ x: 5610, y: 1025, w: 195, h: 160 },
			{ x: 4987, y: 1840, w: 113, h: 161 },
			{ x: 5535, y: 1946, w: 120, h: 187 }
		],
		// The bottom of the world, less the arrow's height, right across the water: a floating cursor is put back at the Arch
		// only once its arrow touches the scene's bottom edge, where the visitor sees it arrive (Joe, 2026-09-30).
		southEnd: [{ x: 4400, y: 2660 }, { x: 6300, y: 2660 }],
		// The lawn between the Arch's legs, south of the museum entrance.
		arch: { x: 4780, y: 1330 },
		// The Arch grounds and the water, top to bottom, between Midtown's east edge and Belleville's west, each 100 px or more
		// clear, where their beds cross (buildout ticket 21).
		footprint: { x: 4450, y: 0, w: 1250, h: 2700 }
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
	},
	// Scenery, not a prop: no button or card, its letters scrolling what's showing inside (Joe, 2026-09-30). The face is
	// the canopy's white front, measured on the plate: 54 px tall at its west end and 57 at its east.
	marquee: {
		art: ['marquee', 'marquee-bulbs'],
		face: [
			{ x: 3238, y: 1608 },
			{ x: 3715, y: 1668 },
			{ x: 3715, y: 1725 },
			{ x: 3238, y: 1662 }
		],
		text: 'Now Playing  *  Fast Five  *  Snow White & the Huntsman  *  The Lorax'
	},
	// Scenery, the art of Big Muddy's door (Joe, 2026-10-01): a standalone cut-out on the sand point, placed by its
	// manifest world rect. The rod's tip is read on the cut-out as placed; the bobber floats west of the bank, clear of
	// the Eads Bridge's steel arch, which crosses the water south of it.
	angler: { art: 'angler', tip: { x: 5974, y: 326 }, bobber: { x: 5966, y: 349 } }
};
