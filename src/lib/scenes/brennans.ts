import type { Prop, SubScene } from './types';

// TODO Joe: the content inventory promises a one-line "what we did" per brand; none is on record.
const brands: [string, string][] = [
	['cohiba', 'Cohiba'],
	['macanudo', 'Macanudo'],
	['partagas', 'Partagas'],
	['la-gloria-cubana', 'La Gloria Cubana'],
	['punch', 'Punch']
];

// Placeholder rects; the sub-scene art pass (buildout ticket 05) rewrites them.
const boxes: Prop[] = brands.map(([id, name], i) => ({
	id: `humidor-${id}`,
	name: `${name} box`,
	gist: 'Moosylvania client work',
	body: [`${name}: client work at Moosylvania.`],
	rect: { x: 400 + i * 300, y: 500, w: 200, h: 140 },
	cosmetic: 6
}));

export const BRENNANS: SubScene = {
	id: 'brennans',
	title: "Brennan's, Central West End",
	description:
		"Inside Brennan's on North Euclid: the cigar brands and fintech clients Joe Madden has built for at Moosylvania.",
	venue: "Brennan's",
	district: 'Central West End',
	w: 2845,
	h: 1600,
	props: [
		...boxes,
		{
			id: 'stg-logo',
			name: 'Scandinavian Tobacco Group logo',
			gist: 'Moosylvania client work',
			body: ['Scandinavian Tobacco Group: client work at Moosylvania.'],
			rect: { x: 2200, y: 300, w: 200, h: 120 }
		},
		{
			id: 'atm',
			name: 'ATM',
			gist: 'PayPal and Venmo',
			body: ['PayPal and Venmo, fintech clients at Moosylvania.'],
			rect: { x: 2500, y: 800, w: 220, h: 500 }
		}
	],
	exit: { x: 100, y: 1000, w: 120, h: 220 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 500, foregroundY: 1600 }],
	foreground: [],
	walkBehind: []
};
