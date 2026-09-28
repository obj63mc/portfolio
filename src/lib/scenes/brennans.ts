import type { Prop, Rect, SubScene } from './types';

// TODO Joe: the content inventory promises a one-line "what we did" per brand; none is on record.
const brands = [
	['cohiba', 'Cohiba'],
	['macanudo', 'Macanudo'],
	['partagas', 'Partagas'],
	['la-gloria-cubana', 'La Gloria Cubana'],
	['punch', 'Punch']
] as const;
type Brand = (typeof brands)[number][0];

// Measured on the accepted master (art/sources/brennans-fix/stitched.png, 1672 x 941, installed 4x as brennans-master;
// buildout ticket 05, 2026-09-28): the camera faces the humidor built into the brick wall, seen nearly face-on. The five
// brand boxes stand on easels at eye level, one behind each glass door, left to right in brand order, each rect its
// matte's trim; the Scandinavian Tobacco Group plaque hangs on the humidor's crown. The café table set and the lounge (chair
// and coffee table) are walk-behind scenery, the sofa at the lower right is foreground; no prop stands on any of them.
const humidor: Record<Brand, Rect> = {
	cohiba: { x: 553, y: 616, w: 201, h: 167 },
	macanudo: { x: 825, y: 619, w: 192, h: 157 },
	partagas: { x: 1086, y: 629, w: 182, h: 154 },
	'la-gloria-cubana': { x: 1336, y: 638, w: 179, h: 142 },
	punch: { x: 1582, y: 643, w: 158, h: 135 }
};

// One box per brand, its logo on the lid; any of them grants the cigar.
const boxes: Prop[] = brands.map(([id, name]) => ({
	id: `humidor-${id}`,
	name: `${name} box`,
	gist: 'Moosylvania client work',
	body: [`${name}: client work at Moosylvania.`],
	rect: humidor[id],
	cosmetic: 6
}));

export const BRENNANS: SubScene = {
	id: 'brennans',
	title: "Brennan's, Central West End",
	description:
		"Inside Brennan's on North Euclid: the cigar brands Joe Madden has built for at Moosylvania.",
	venue: "Brennan's",
	district: 'Central West End',
	w: 2845,
	h: 1600,
	props: [
		...boxes,
		{
			id: 'stg-logo',
			name: 'Scandinavian Tobacco Group plaque',
			gist: 'Moosylvania client work',
			body: ['Scandinavian Tobacco Group: client work at Moosylvania.'],
			rect: { x: 954, y: 43, w: 437, h: 261 }
		}
	],
	// Brennan's teal front door at the far left. The ATM left the room for the overworld, where Joe has yet to place it
	// (Joe, 2026-09-28; buildout ticket 25).
	exit: { x: 0, y: 94, w: 378, h: 1148 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 1200, foregroundY: 1600 }],
	foreground: [{ key: 'brennans-sofa', rect: { x: 2355, y: 1049, w: 490, h: 551 } }],
	walkBehind: [
		{
			key: 'brennans-cafe',
			rect: { x: 570, y: 1049, w: 769, h: 428 },
			outline: [
				{ x: 1337, y: 1071 }, { x: 1326, y: 1401 }, { x: 1177, y: 1425 }, { x: 694, y: 1476 }, { x: 573, y: 1435 }, { x: 570, y: 1088 },
				{ x: 580, y: 1081 }, { x: 987, y: 1049 }, { x: 1271, y: 1052 }, { x: 1319, y: 1061 }
			],
			front: [{ x: 570, y: 1437 }, { x: 684, y: 1476 }, { x: 835, y: 1444 }, { x: 992, y: 1438 }, { x: 1167, y: 1425 }, { x: 1337, y: 1401 }],
			props: []
		},
		{
			key: 'brennans-lounge',
			rect: { x: 1637, y: 1001, w: 1038, h: 541 },
			outline: [
				{ x: 2671, y: 1270 }, { x: 2617, y: 1342 }, { x: 2306, y: 1540 }, { x: 2265, y: 1540 }, { x: 1943, y: 1508 }, { x: 1651, y: 1411 },
				{ x: 1637, y: 1041 }, { x: 1651, y: 1022 }, { x: 1708, y: 1010 }, { x: 1799, y: 1001 }, { x: 2357, y: 1088 }, { x: 2671, y: 1246 }
			],
			front: [
				{ x: 1637, y: 1413 }, { x: 1836, y: 1471 }, { x: 1943, y: 1508 }, { x: 2287, y: 1540 }, { x: 2306, y: 1540 },
				{ x: 2617, y: 1342 }, { x: 2671, y: 1270 }
			],
			props: []
		}
	]
};
