import type { SubScene } from './types';

// Measured on the accepted master (art/sources/moosylvania-fix/stitched.png, 887 x 1774 on Codex's 1:2 canvas, installed 4x as
// moosylvania-master; buildout ticket 05, 2026-09-28). The lobby is one tall scene scrolled like the overworld, looking up
// the nave of the converted church from above the chancel: the meeting area behind the front desk at the bottom, the front
// desk with its frosted glass moose wall, the round sofas, then the twin staircases up to the loft of desks, with two
// offices and the front doors beneath it. Each prop rect is its matte's trim. The loft desks, the lounge armchairs, the
// moose wall with the TV panel in front of it, the round sofas and their coffee table and the meeting furniture are
// walk-behind scenery; the four computers stand on their desks and the TV on the wall, so each is used from in front. The
// twin staircases are walk-behind too, with a landing at the loft and the flight's full width as the outline: stepping on
// at the foot or from the loft is on the stairs, and from either side, under the rising flight, underneath them (Joe,
// 2026-09-28). The reception desk stays in the plate, so the statue on it is always in reach. The six hanging lanterns are
// foreground.
export const MOOSYLVANIA: SubScene = {
	id: 'moosylvania',
	title: 'Moosylvania, Maplewood',
	description:
		'Inside the Moosylvania lobby, a converted church in Maplewood: the agency where Joe Madden is Chief Architect and the frontend, backend, CMS and data stacks he leads.',
	venue: 'Moosylvania',
	district: 'Maplewood',
	w: 2400,
	h: 4800,
	// Scrolls like the overworld (Joe, 2026-09-28).
	pushBand: 0.25,
	props: [
		{
			id: 'computer-frontend',
			name: 'Frontend computer',
			gist: 'Nuxt, Next, Svelte, TypeScript',
			body: ['Nuxt, Next, Svelte, modern JavaScript, TypeScript and SCSS.'],
			rect: { x: 1391, y: 690, w: 108, h: 92 }
		},
		{
			id: 'computer-backend',
			name: 'Backend computer',
			gist: 'Node.js, TypeScript and PHP platforms',
			body: ['Node.js/TypeScript and PHP platforms; experience with ASP.NET C#, Ruby and Python.'],
			rect: { x: 1580, y: 850, w: 143, h: 119 },
			// Clipped where its top-left corner reaches behind the back desk's leg (spec: an irregular prop gets a clip-path).
			clip: 'polygon(100% 100%, 100% 0%, 28.49% 0%, 28.69% 9.15%, 0% 25.77%, 0% 100%)'
		},
		{
			id: 'computer-cms',
			name: 'CMS computer',
			gist: 'WordPress, SilverStripe, Strapi, Prismic, Storyblok',
			body: ['WordPress, SilverStripe and Strapi; headless Prismic and Storyblok.'],
			rect: { x: 663, y: 879, w: 138, h: 119 }
		},
		{
			id: 'computer-data',
			name: 'Data computer',
			gist: 'MySQL, PostgreSQL, Redis',
			body: ['MySQL, PostgreSQL and Redis; MongoDB experience.'],
			rect: { x: 1136, y: 996, w: 124, h: 106 }
		},
		{
			id: 'moose-statue',
			name: 'Moose statue',
			gist: 'the Moosylvania mascot',
			// No card, like the moose outside: an Easter egg granting the same antlers (Joe, 2026-09-30).
			kind: 'action',
			body: [],
			rect: { x: 1623, y: 2549, w: 124, h: 179 },
			art: ['moosylvania-statue'],
			cosmetic: 4
		},
		{
			id: 'meeting-tv',
			name: 'Meeting TV',
			gist: 'a video from Joe',
			// Clicking plays it on this TV for that visitor only, and its card holds the same video with controls (spec:
			// "Local prop, the Moosylvania meeting TV"). TODO Joe: its line, the card's only copy, under the video.
			body: ['A video from Joe Madden.'],
			rect: { x: 787, y: 3434, w: 828, h: 392 },
			art: ['moosylvania-tv'],
			// TODO Joe: the video file and its captions. The Fast Five game's demo stands in (Joe, 2026-09-29). The screen is
			// the panel's dark inset inside its black border, measured on the TV's matte.
			video: { file: 'fastfive-demo-full-1024x768.mp4', screen: { x: 896, y: 3491, w: 610, h: 255 } }
		}
	],
	// The arched double front doors beneath the loft, between the two offices.
	exit: { x: 1039, y: 1531, w: 319, h: 268 },
	// The camera looks up the nave from above the chancel: the loft is farthest and the meeting area nearest.
	depth: [{ rect: { x: 0, y: 0, w: 2400, h: 4800 }, horizonY: 0, foregroundY: 4800 }],
	foreground: [
		{ key: 'moosylvania-lanterns-left', rect: { x: 103, y: 0, w: 509, h: 1120 } },
		{ key: 'moosylvania-lanterns-right', rect: { x: 1799, y: 0, w: 503, h: 1120 } }
	],
	walkBehind: [
		{
			key: 'moosylvania-lounge-chairs',
			rect: { x: 869, y: 749, w: 246, h: 152 },
			outline: [
				{ x: 1109, y: 855 }, { x: 1074, y: 869 }, { x: 939, y: 896 }, { x: 906, y: 893 }, { x: 877, y: 877 }, { x: 871, y: 866 },
				{ x: 866, y: 787 }, { x: 901, y: 771 }, { x: 1028, y: 747 }, { x: 1074, y: 749 }, { x: 1090, y: 755 }, { x: 1107, y: 782 }
			],
			front: [
				{ x: 877, y: 879 }, { x: 890, y: 887 }, { x: 906, y: 896 }, { x: 917, y: 898 }, { x: 939, y: 898 }, { x: 1074, y: 871 },
				{ x: 1104, y: 863 }, { x: 1109, y: 858 }
			],
			props: []
		},
		{
			key: 'moosylvania-desk-back',
			rect: { x: 1312, y: 694, w: 311, h: 234 },
			outline: [
				{ x: 1618, y: 860 }, { x: 1502, y: 915 }, { x: 1456, y: 923 }, { x: 1315, y: 912 }, { x: 1310, y: 741 },
				{ x: 1396, y: 698 }, { x: 1499, y: 690 }, { x: 1586, y: 695 }, { x: 1615, y: 741 }
			],
			front: [
				{ x: 1315, y: 915 }, { x: 1453, y: 925 }, { x: 1456, y: 925 }, { x: 1502, y: 917 }, { x: 1618, y: 863 }
			],
			props: ['computer-frontend']
		},
		{
			key: 'moosylvania-desk-right',
			rect: { x: 1504, y: 850, w: 360, h: 290 },
			outline: [
				{ x: 1845, y: 1112 }, { x: 1686, y: 1134 }, { x: 1521, y: 1126 }, { x: 1504, y: 1009 }, { x: 1502, y: 917 },
				{ x: 1588, y: 847 }, { x: 1691, y: 847 }, { x: 1810, y: 917 }, { x: 1853, y: 985 }, { x: 1859, y: 1009 }
			],
			front: [
				{ x: 1521, y: 1128 }, { x: 1680, y: 1136 }, { x: 1686, y: 1136 }, { x: 1845, y: 1115 }
			],
			props: ['computer-backend']
		},
		{
			key: 'moosylvania-desk-left',
			rect: { x: 566, y: 879, w: 363, h: 273 },
			outline: [
				{ x: 920, y: 942 }, { x: 917, y: 1128 }, { x: 706, y: 1147 }, { x: 563, y: 1126 }, { x: 566, y: 942 }, { x: 663, y: 877 },
				{ x: 871, y: 906 }
			],
			front: [
				{ x: 563, y: 1128 }, { x: 706, y: 1150 }, { x: 709, y: 1150 }, { x: 917, y: 1131 }
			],
			props: ['computer-cms']
		},
		{
			key: 'moosylvania-desk-centre',
			rect: { x: 1004, y: 999, w: 379, h: 286 },
			outline: [
				{ x: 1375, y: 1061 }, { x: 1377, y: 1126 }, { x: 1366, y: 1255 }, { x: 1177, y: 1280 }, { x: 1009, y: 1255 },
				{ x: 1001, y: 1126 }, { x: 1004, y: 1061 }, { x: 1042, y: 998 }, { x: 1258, y: 1004 }
			],
			front: [
				{ x: 1009, y: 1258 }, { x: 1172, y: 1283 }, { x: 1177, y: 1283 }, { x: 1366, y: 1258 }
			],
			props: ['computer-data']
		},
		{
			key: 'moosylvania-desk-front',
			rect: { x: 1634, y: 1153, w: 211, h: 157 },
			outline: [
				{ x: 1840, y: 1304 }, { x: 1645, y: 1304 }, { x: 1632, y: 1250 }, { x: 1632, y: 1191 }, { x: 1729, y: 1150 },
				{ x: 1783, y: 1150 }, { x: 1840, y: 1191 }
			],
			front: [
				{ x: 1645, y: 1307 }, { x: 1840, y: 1307 }
			],
			props: []
		},
		{
			key: 'moosylvania-stairs-left',
			rect: { x: 357, y: 1286, w: 395, h: 1211 },
			outline: [
				{ x: 734, y: 1286 }, { x: 752, y: 1306 }, { x: 752, y: 1543 }, { x: 719, y: 2398 }, { x: 546, y: 2492 },
				{ x: 527, y: 2497 }, { x: 490, y: 2472 }, { x: 472, y: 2454 }, { x: 434, y: 2392 }, { x: 403, y: 2325 },
				{ x: 371, y: 2220 }, { x: 357, y: 2133 }, { x: 357, y: 1942 }, { x: 360, y: 1863 }, { x: 368, y: 1801 },
				{ x: 401, y: 1685 }, { x: 456, y: 1567 }, { x: 610, y: 1326 }
			],
			front: [{ x: 525, y: 2497 }, { x: 544, y: 2492 }, { x: 547, y: 2470 }, { x: 695, y: 2403 }, { x: 717, y: 2400 }],
			landing: [{ x: 555, y: 1423 }, { x: 752, y: 1423 }],
			props: []
		},
		{
			key: 'moosylvania-stairs-right',
			rect: { x: 1648, y: 1299, w: 392, h: 1196 },
			outline: [
				{ x: 1658, y: 1299 }, { x: 1791, y: 1325 }, { x: 1901, y: 1499 }, { x: 1961, y: 1605 }, { x: 1988, y: 1663 },
				{ x: 2015, y: 1741 }, { x: 2032, y: 1812 }, { x: 2037, y: 1858 }, { x: 2040, y: 2103 }, { x: 2034, y: 2166 },
				{ x: 2024, y: 2220 }, { x: 1999, y: 2301 }, { x: 1958, y: 2392 }, { x: 1915, y: 2459 }, { x: 1868, y: 2494 },
				{ x: 1861, y: 2494 }, { x: 1681, y: 2396 }, { x: 1648, y: 1546 }, { x: 1648, y: 1317 }
			],
			front: [
				{ x: 1680, y: 2397 }, { x: 1707, y: 2403 }, { x: 1845, y: 2465 }, { x: 1851, y: 2489 }, { x: 1867, y: 2495 }
			],
			landing: [{ x: 1659, y: 1423 }, { x: 1843, y: 1423 }],
			props: []
		},
		{
			key: 'moosylvania-coffee-table',
			rect: { x: 1074, y: 2338, w: 260, h: 181 },
			outline: [
				{ x: 1329, y: 2462 }, { x: 1296, y: 2503 }, { x: 1218, y: 2514 }, { x: 1104, y: 2506 }, { x: 1071, y: 2465 },
				{ x: 1071, y: 2384 }, { x: 1088, y: 2359 }, { x: 1150, y: 2338 }, { x: 1234, y: 2335 }, { x: 1264, y: 2340 },
				{ x: 1315, y: 2362 }, { x: 1326, y: 2378 }
			],
			front: [
				{ x: 1101, y: 2506 }, { x: 1104, y: 2508 }, { x: 1153, y: 2514 }, { x: 1185, y: 2516 }, { x: 1218, y: 2516 },
				{ x: 1247, y: 2514 }, { x: 1296, y: 2506 }, { x: 1320, y: 2481 }
			],
			props: []
		},
		{
			key: 'moosylvania-sofa-left',
			rect: { x: 804, y: 2156, w: 300, h: 476 },
			outline: [
				{ x: 1039, y: 2162 }, { x: 1099, y: 2278 }, { x: 1099, y: 2319 }, { x: 1015, y: 2595 }, { x: 974, y: 2627 },
				{ x: 828, y: 2530 }, { x: 804, y: 2465 }, { x: 801, y: 2311 }, { x: 831, y: 2251 }, { x: 890, y: 2202 },
				{ x: 950, y: 2173 }, { x: 1007, y: 2154 }
			],
			front: [{ x: 828, y: 2533 }, { x: 974, y: 2627 }, { x: 1015, y: 2595 }, { x: 1099, y: 2319 }],
			props: []
		},
		{
			key: 'moosylvania-sofa-right',
			rect: { x: 1307, y: 2151, w: 300, h: 482 },
			outline: [
				{ x: 1423, y: 2627 }, { x: 1383, y: 2581 }, { x: 1304, y: 2324 }, { x: 1304, y: 2278 }, { x: 1361, y: 2162 },
				{ x: 1380, y: 2148 }, { x: 1464, y: 2173 }, { x: 1529, y: 2211 }, { x: 1580, y: 2259 }, { x: 1602, y: 2305 },
				{ x: 1602, y: 2457 }, { x: 1575, y: 2530 }
			],
			front: [{ x: 1304, y: 2324 }, { x: 1383, y: 2581 }, { x: 1423, y: 2627 }, { x: 1575, y: 2533 }],
			props: []
		},
		{
			key: 'moosylvania-moose-wall',
			rect: { x: 528, y: 2828, w: 1345, h: 1001 },
			outline: [
				{ x: 1872, y: 3558 }, { x: 1618, y: 3829 }, { x: 782, y: 3829 }, { x: 528, y: 3558 }, { x: 528, y: 2828 },
				{ x: 1872, y: 2828 }
			],
			front: [
				{ x: 533, y: 3553 }, { x: 785, y: 3553 }, { x: 790, y: 3826 }, { x: 1613, y: 3826 }, { x: 1618, y: 3553 },
				{ x: 1867, y: 3553 }
			],
			props: ['meeting-tv']
		},
		{
			key: 'moosylvania-meeting-table',
			rect: { x: 917, y: 4151, w: 579, h: 322 },
			outline: [
				{ x: 1480, y: 4467 }, { x: 925, y: 4467 }, { x: 915, y: 4424 }, { x: 923, y: 4216 }, { x: 1158, y: 4148 },
				{ x: 1239, y: 4148 }, { x: 1477, y: 4210 }, { x: 1491, y: 4345 }, { x: 1491, y: 4424 }
			],
			front: [
				{ x: 925, y: 4470 }, { x: 1480, y: 4470 }
			],
			props: []
		},
		{
			key: 'moosylvania-meeting-chairs-left',
			rect: { x: 533, y: 4023, w: 267, h: 528 },
			outline: [
				{ x: 611, y: 4021 }, { x: 782, y: 4091 }, { x: 795, y: 4237 }, { x: 774, y: 4446 }, { x: 749, y: 4502 },
				{ x: 574, y: 4546 }, { x: 530, y: 4283 }, { x: 584, y: 4032 }, { x: 595, y: 4021 }
			],
			front: [{ x: 574, y: 4546 }, { x: 749, y: 4502 }, { x: 774, y: 4446 }, { x: 795, y: 4237 }],
			props: []
		},
		{
			key: 'moosylvania-meeting-chairs-right',
			rect: { x: 1606, y: 4023, w: 267, h: 528 },
			outline: [
				{ x: 1824, y: 4546 }, { x: 1640, y: 4538 }, { x: 1623, y: 4446 }, { x: 1602, y: 4237 }, { x: 1615, y: 4091 },
				{ x: 1786, y: 4021 }, { x: 1807, y: 4023 }, { x: 1816, y: 4040 }, { x: 1867, y: 4280 }, { x: 1867, y: 4313 }
			],
			front: [{ x: 1602, y: 4237 }, { x: 1623, y: 4446 }, { x: 1640, y: 4538 }, { x: 1824, y: 4546 }],
			props: []
		},
		{
			key: 'moosylvania-meeting-sofa',
			rect: { x: 806, y: 4502, w: 798, h: 292 },
			outline: [
				{ x: 1599, y: 4770 }, { x: 1583, y: 4789 }, { x: 820, y: 4789 }, { x: 804, y: 4770 }, { x: 804, y: 4581 },
				{ x: 820, y: 4500 }, { x: 1583, y: 4500 }, { x: 1599, y: 4581 }
			],
			front: [{ x: 804, y: 4773 }, { x: 820, y: 4792 }, { x: 1583, y: 4792 }, { x: 1586, y: 4789 }, { x: 1599, y: 4773 }],
			props: []
		}
	]
};
