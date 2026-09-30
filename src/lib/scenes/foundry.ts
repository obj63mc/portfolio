import type { Point, Rect, SubScene } from './types';
import { inOutline } from './walk.ts';

/** The three Universal Pictures Home Entertainment titles the shared screen can play (spec: "One shared prop"). */
export const SCREEN_TITLES = {
	'fast-five': 'Fast Five',
	'snow-white': 'Snow White and the Huntsman',
	lorax: 'The Lorax'
} as const;
export type ScreenTitle = keyof typeof SCREEN_TITLES;

/** The title a poster prop's id names, null for any other prop. */
export const posterOf = (id?: string) => (id?.startsWith('poster-') ? (id.slice('poster-'.length) as ScreenTitle) : null);

/** The screen button's gist for a state: "Screen: now playing Fast Five", or the idle wording. */
export const screenGist = (playing?: ScreenTitle) =>
	playing ? `now playing ${SCREEN_TITLES[playing]}` : 'idle, pick a poster to start a reel';

/**
 * The demo of the game each title's reel shows on the screen, a file in art/sources/videos (Joe, 2026-09-29), and its
 * length in ms (ffprobe), which sets the reel's (net/screen.ts).
 */
export const SCREEN_VIDEOS: Record<ScreenTitle, { file: string; ms: number }> = {
	'fast-five': { file: 'fastfive-demo-full-1024x768.mp4', ms: 58_167 },
	'snow-white': { file: 'swath-demo-tour-1280x800.mp4', ms: 35_070 },
	lorax: { file: 'lorax-demo-tour-1280x800.mp4', ms: 36_400 }
};

/** The line of case-study text the screen shows after each title's video, and its card and the screen's card say. */
export const CASE_STUDY: Record<ScreenTitle, string> = {
	'fast-five': 'A find-and-seek and safe-cracking game promoting the home video release.',
	'snow-white': 'Multiple mini games built from scenes in the film.',
	lorax: 'A partnership with Words With Friends.'
};

// Measured on the accepted master (art/sources/foundry-fix/stitched.png, 1672 x 941, installed 4x as foundry-master;
// buildout ticket 05, 2026-09-28): a small auditorium in a true isometric cutaway. The three posters hang on the left
// wall, left to right, each rect its matte's trim with the picture light above it; the screen fills the right wall. The
// three seat rows and the projector ledge are walk-behind scenery, back to front; no prop stands on them.
const posters: Record<ScreenTitle, Rect> = {
	'fast-five': { x: 247, y: 187, w: 262, h: 507 },
	'snow-white': { x: 543, y: 129, w: 245, h: 474 },
	lorax: { x: 822, y: 70, w: 225, h: 454 }
};

/**
 * The screen's painted surface, clockwise from its top left. The timeline draws into this quad: the camera sees the right
 * wall at an angle, so it is not a rectangle, and its bottom edge falls more steeply than its top. Each corner is the
 * ivory's own edge, measured on the composite and the 4x master (the bottom right re-measured 2 px lower on 2026-09-30): the reel covers it and its lit rim, a few px onto the dark
 * frame (projector.ts).
 */
export const SCREEN_SURFACE: Point[] = [
	{ x: 1661, y: 90 },
	{ x: 2666, y: 303 },
	{ x: 2665, y: 913 },
	{ x: 1661, y: 571 }
];

/** Where the beam starts: the end of the projector's lens barrel, on the ledge at the lower left, aimed up-right at the screen. */
export const PROJECTOR_LENS: Point = { x: 381, y: 1047 };

/**
 * What the camera frames while a reel plays (Joe, 2026-09-29, ticket 17): the projector, whose body on the ledge spans
 * x 100 to 390 and y 1010 to 1250 on the master, and the whole screen, with 40 px to spare.
 */
export const REEL_FRAME: Rect = { x: 60, y: 50, w: 2646, h: 1240 };

/**
 * Where a poster's clicker sits for the reel (Joe, 2026-09-29): the second row's seats, where the cursor's tip rests on
 * the headrest, as a head over the seat back, measured on the master. Best first, the middle of the row, then outward;
 * the row's last seat, low by the aisle, is below the frame the reel holds the camera on.
 */
export const SEATS: Point[] = [
	{ x: 1310, y: 1015 },
	{ x: 1100, y: 922 },
	{ x: 1520, y: 1113 },
	{ x: 900, y: 832 },
	{ x: 1770, y: 1230 },
	{ x: 715, y: 752 }
];

/** A visitor's seat, by their id in the room (0 offline), so that visitors sitting at once spread along the row. */
export const seatOf = (id: number) => SEATS[id % SEATS.length];

/** The picture light over each poster. Painted switched off; hovering a poster lights it. */
export const POSTER_LAMPS: Record<ScreenTitle, Point> = {
	'fast-five': { x: 386, y: 201 },
	'snow-white': { x: 676, y: 146 },
	lorax: { x: 946, y: 87 }
};

export const FOUNDRY: SubScene = {
	id: 'foundry',
	title: 'The Foundry, Midtown',
	description:
		'Inside the Alamo Drafthouse theatre at City Foundry: three Universal Pictures Home Entertainment games Moosylvania built, on the screen and its posters.',
	venue: 'The Foundry',
	district: 'Midtown',
	w: 2845,
	h: 1600,
	props: [
		...(Object.keys(SCREEN_TITLES) as ScreenTitle[]).map((id) => ({
			id: `poster-${id}`,
			name: `${SCREEN_TITLES[id]} poster`,
			gist: 'play it on the screen',
			// No card: the reel on the screen is what a poster presents (Joe, 2026-09-29). Its text moves elsewhere later.
			kind: 'action' as const,
			body: [],
			rect: posters[id],
			cosmetic: 2 as const
		})),
		{
			id: 'screen',
			name: 'Screen',
			gist: screenGist(),
			// Nothing to click: the posters start its reels, and the engine keeps its state current (Joe, 2026-09-29).
			kind: 'status',
			body: [],
			rect: { x: 1656, y: 85, w: 1016, h: 833 }
		}
	],
	// The exit door on the left wall, beside the screen, under its green sign.
	exit: { x: 1198, y: 233, w: 158, h: 420 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 641, foregroundY: 1600 }],
	foreground: [],
	walkBehind: [
		{
			key: 'foundry-row-front',
			rect: { x: 1045, y: 648, w: 1349, h: 750 },
			outline: [
				{ x: 1045, y: 733 }, { x: 1045, y: 816 }, { x: 1501, y: 1017 }, { x: 2195, y: 1347 }, { x: 2236, y: 1370 }, { x: 2243, y: 1398 },
				{ x: 2394, y: 1313 }, { x: 2392, y: 1204 }, { x: 2350, y: 1182 }, { x: 2335, y: 1187 }, { x: 2270, y: 1158 }, { x: 2261, y: 1149 },
				{ x: 2294, y: 1129 }, { x: 2294, y: 1119 }, { x: 2251, y: 1098 }, { x: 2212, y: 1117 }, { x: 2084, y: 1063 }, { x: 2062, y: 1070 },
				{ x: 2050, y: 1066 }, { x: 2037, y: 1056 }, { x: 2072, y: 1034 }, { x: 2072, y: 1025 }, { x: 2028, y: 1007 }, { x: 1994, y: 1022 },
				{ x: 1872, y: 969 }, { x: 1841, y: 976 }, { x: 1827, y: 964 }, { x: 1860, y: 944 }, { x: 1860, y: 937 }, { x: 1844, y: 928 },
				{ x: 1816, y: 920 }, { x: 1787, y: 932 }, { x: 1668, y: 881 }, { x: 1639, y: 888 }, { x: 1627, y: 877 }, { x: 1657, y: 860 },
				{ x: 1657, y: 848 }, { x: 1622, y: 833 }, { x: 1589, y: 847 }, { x: 1475, y: 799 }, { x: 1448, y: 808 }, { x: 1438, y: 799 },
				{ x: 1468, y: 782 }, { x: 1468, y: 770 }, { x: 1436, y: 757 }, { x: 1402, y: 769 }, { x: 1291, y: 724 }, { x: 1285, y: 718 },
				{ x: 1291, y: 711 }, { x: 1291, y: 702 }, { x: 1261, y: 689 }, { x: 1227, y: 697 }, { x: 1126, y: 655 }, { x: 1091, y: 648 },
				{ x: 1087, y: 651 }, { x: 1094, y: 660 }, { x: 1089, y: 685 }, { x: 1079, y: 695 }, { x: 1077, y: 712 }
			],
			front: [{ x: 1041, y: 811 }, { x: 1504, y: 1018 }, { x: 2232, y: 1367 }, { x: 2239, y: 1394 }, { x: 2389, y: 1316 }],
			props: []
		},
		{
			key: 'foundry-row-middle',
			rect: { x: 590, y: 723, w: 1470, h: 865 },
			outline: [
				{ x: 592, y: 818 }, { x: 590, y: 905 }, { x: 1084, y: 1138 }, { x: 1611, y: 1406 }, { x: 1880, y: 1547 }, { x: 1890, y: 1557 },
				{ x: 1897, y: 1588 }, { x: 2061, y: 1496 }, { x: 2057, y: 1365 }, { x: 2015, y: 1342 }, { x: 1999, y: 1347 }, { x: 1933, y: 1314 },
				{ x: 1926, y: 1306 }, { x: 1955, y: 1289 }, { x: 1957, y: 1275 }, { x: 1916, y: 1253 }, { x: 1873, y: 1272 }, { x: 1727, y: 1204 },
				{ x: 1712, y: 1202 }, { x: 1698, y: 1207 }, { x: 1678, y: 1192 }, { x: 1710, y: 1173 }, { x: 1708, y: 1160 }, { x: 1669, y: 1141 },
				{ x: 1627, y: 1156 }, { x: 1492, y: 1092 }, { x: 1480, y: 1090 }, { x: 1465, y: 1097 }, { x: 1445, y: 1083 }, { x: 1477, y: 1064 },
				{ x: 1474, y: 1051 }, { x: 1438, y: 1034 }, { x: 1402, y: 1049 }, { x: 1268, y: 988 }, { x: 1239, y: 996 }, { x: 1225, y: 984 },
				{ x: 1254, y: 969 }, { x: 1257, y: 956 }, { x: 1218, y: 939 }, { x: 1186, y: 950 }, { x: 1069, y: 896 }, { x: 1052, y: 894 },
				{ x: 1045, y: 888 }, { x: 1057, y: 879 }, { x: 1053, y: 867 }, { x: 1023, y: 854 }, { x: 989, y: 864 }, { x: 869, y: 811 },
				{ x: 861, y: 803 }, { x: 866, y: 789 }, { x: 834, y: 774 }, { x: 796, y: 784 }, { x: 776, y: 770 }, { x: 710, y: 743 },
				{ x: 701, y: 731 }, { x: 645, y: 723 }, { x: 641, y: 769 }, { x: 628, y: 779 }, { x: 628, y: 794 }
			],
			front: [{ x: 589, y: 903 }, { x: 1011, y: 1102 }, { x: 1569, y: 1384 }, { x: 1882, y: 1549 }, { x: 1896, y: 1586 }, { x: 2059, y: 1498 }],
			props: []
		},
		{
			key: 'foundry-row-back',
			rect: { x: 362, y: 906, w: 1310, h: 692 },
			outline: [
				{ x: 366, y: 998 }, { x: 362, y: 1013 }, { x: 388, y: 1037 }, { x: 398, y: 1070 }, { x: 631, y: 1187 }, { x: 636, y: 1246 },
				{ x: 1009, y: 1449 }, { x: 1269, y: 1598 }, { x: 1673, y: 1597 }, { x: 1671, y: 1517 }, { x: 1622, y: 1488 }, { x: 1608, y: 1493 },
				{ x: 1530, y: 1452 }, { x: 1523, y: 1444 }, { x: 1552, y: 1425 }, { x: 1550, y: 1411 }, { x: 1509, y: 1389 }, { x: 1467, y: 1408 },
				{ x: 1392, y: 1367 }, { x: 1378, y: 1369 }, { x: 1308, y: 1333 }, { x: 1291, y: 1333 }, { x: 1278, y: 1326 }, { x: 1266, y: 1314 },
				{ x: 1293, y: 1299 }, { x: 1298, y: 1285 }, { x: 1256, y: 1262 }, { x: 1217, y: 1277 }, { x: 1193, y: 1260 }, { x: 1171, y: 1250 },
				{ x: 1155, y: 1251 }, { x: 1079, y: 1212 }, { x: 1062, y: 1209 }, { x: 1045, y: 1214 }, { x: 1028, y: 1200 }, { x: 1058, y: 1183 },
				{ x: 1060, y: 1172 }, { x: 1023, y: 1151 }, { x: 982, y: 1165 }, { x: 852, y: 1100 }, { x: 841, y: 1098 }, { x: 820, y: 1109 },
				{ x: 812, y: 1097 }, { x: 844, y: 1078 }, { x: 839, y: 1064 }, { x: 805, y: 1049 }, { x: 771, y: 1063 }, { x: 645, y: 1001 },
				{ x: 638, y: 995 }, { x: 648, y: 986 }, { x: 648, y: 976 }, { x: 613, y: 957 }, { x: 579, y: 969 }, { x: 476, y: 916 },
				{ x: 442, y: 906 }, { x: 424, y: 916 }, { x: 420, y: 942 }, { x: 407, y: 954 }, { x: 405, y: 973 }, { x: 374, y: 988 }
			],
			front: [{ x: 362, y: 1013 }, { x: 383, y: 1032 }, { x: 396, y: 1068 }, { x: 628, y: 1185 }, { x: 635, y: 1245 }, { x: 1268, y: 1597 }, { x: 1669, y: 1598 }],
			props: []
		},
		{
			key: 'foundry-projector-ledge',
			rect: { x: 0, y: 1003, w: 633, h: 597 },
			outline: [
				{ x: 0, y: 1068 }, { x: 240, y: 1003 }, { x: 315, y: 1027 }, { x: 342, y: 1012 }, { x: 368, y: 1017 }, { x: 386, y: 1037 },
				{ x: 393, y: 1068 }, { x: 616, y: 1180 }, { x: 633, y: 1190 }, { x: 633, y: 1472 }, { x: 366, y: 1600 }, { x: 0, y: 1600 }
			],
			front: [{ x: 0, y: 1600 }, { x: 366, y: 1600 }, { x: 633, y: 1472 }],
			props: []
		}
	]
};

/** How far above or below a seat row a point still counts as in the seats, world px: the legroom between rows is under 90. */
const LEGROOM = 45;

/**
 * Whether a point is in the seats, on one of the three seat rows or the legroom between them (Joe, 2026-09-29): while a
 * reel plays, a visitor whose cursor is there sees the whole theatre, as someone sitting down at the movies does, and one
 * anywhere else their own view.
 */
export const inSeats = (p: Point) =>
	[0, -LEGROOM, LEGROOM].some((dy) => FOUNDRY.walkBehind.some((w) => w.key.startsWith('foundry-row-') && inOutline({ x: p.x, y: p.y + dy }, w.outline)));
