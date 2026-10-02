import type { SubScene } from './types';

// Measured on the accepted master (art/sources/bread-co-fix/stitched.png, 1672 x 941, installed 4x as bread-co-master;
// 2026-10-01): a St. Louis Bread Co. café seen nearly face-on to its order counter. The entrance door is at the far left,
// the ATM stands against the back wall beside it, the scan-to-pay stand on the counter right of the register, and the
// usability test (a laptop, a coffee cup and a clipboard) is laid out on the round table below the counter. Each prop's
// rect is its matte's trim, the laptop's the three mattes' together (art/sources/bread-co-fix/rounds/mattes.py).
// The counter and the two table sets are walk-behind scenery. No prop stands on a unit: the counter's outline is notched
// round the stand and the laptop table's round the laptop, cup and clipboard, so a cursor over a prop is never behind
// anything and can always use it, from whichever way it came. The booths along the right wall, the menu boards and the
// pastry case's contents are painted scenery, places for a prop or two more.
export const BREAD_CO: SubScene = {
	id: 'bread-co',
	title: 'St. Louis Bread Co., Lindenwood Park',
	description: 'Scene inside a St. Louis Bread Co. café: the work Joe Madden has done at Moosylvania for PayPal, Venmo and Panera.',
	venue: 'St. Louis Bread Co.',
	// The overworld district its door stands in; the café the room is drawn from is on Chippewa Street.
	district: 'Maplewood',
	w: 2845,
	h: 1600,
	// TODO Joe: names, gists, the screenshots' names and the cards' copy (src/lib/content/bread-co) are drafts to rewrite.
	props: [
		{
			id: 'atm',
			name: 'ATM',
			gist: 'PayPal: email, banner ads and micro sites',
			rect: { x: 428, y: 488, w: 198, h: 450 },
			// Files in art/sources/screenshots/paypal, in the order the card goes through them.
			screens: [
				{ name: 'Holiday coffee micro site', file: 'paypal/01-holiday-coffee-site.webp' },
				{ name: 'Email: Citi Preferred', file: 'paypal/02-email-citi-preferred.webp' },
				{ name: 'Email: Citi Premier', file: 'paypal/03-email-citi-premier.webp' },
				{ name: 'PayPal Credit banner', file: 'paypal/04-credit-banner.webp' }
			]
		},
		{
			id: 'ux-laptop',
			name: 'Usability test',
			gist: 'UX testing for PayPal and Panera',
			rect: { x: 1468, y: 1004, w: 445, h: 259 },
			// Bottom first: the laptop, then the cup and the clipboard in front of it. The pencil stays painted on the table.
			art: ['bread-co-ux-laptop', 'bread-co-ux-cup', 'bread-co-ux-clipboard'],
			// The PayPal Credit flow as it was tested (art/sources/videos/paypal); the copy under it covers Panera's testing too.
			video: { file: 'paypal-credit-ux-2026-09-30.mp4' }
		},
		{
			id: 'venmo-stand',
			name: 'Scan-to-pay stand',
			gist: 'Venmo: CRM across in-app messages, email and banners',
			rect: { x: 1722, y: 541, w: 136, h: 164 },
			// Files in art/sources/screenshots/venmo: the three in-app messages, then the emails, the first of them twice,
			// as a light inbox shows it and as a dark one does (Joe, 2026-10-01: few know dark mode can be coded for).
			screens: [
				{ name: 'In-app: Starbucks offer', file: 'venmo/01-in-app-starbucks.webp' },
				{ name: 'In-app: FanDuel offer', file: 'venmo/02-in-app-fanduel.webp' },
				{ name: 'In-app: Burger King', file: 'venmo/03-in-app-burger-king.webp' },
				{ name: 'Email: Debit Card reloads', file: 'venmo/04-email-debit-reload.webp' },
				{ name: 'Same email, dark mode', file: 'venmo/05-email-debit-reload-dark.webp' },
				{ name: 'Email: Welcome', file: 'venmo/06-email-welcome.webp' },
				{ name: 'Email: Refer a friend', file: 'venmo/07-email-refer-a-friend.webp' },
				{ name: 'Email: Credit Card', file: 'venmo/08-email-credit-card.webp' },
				{ name: 'Email: Crypto', file: 'venmo/09-email-crypto.webp' },
				{ name: 'Email: Tipping', file: 'venmo/10-email-tipping.webp' },
				{ name: 'Email: QR Kit', file: 'venmo/11-email-qr-kit.webp' },
				{ name: 'Email: Purchase Protection', file: 'venmo/12-email-purchase-protection.webp' },
				{ name: 'Email: DoorDash offer', file: 'venmo/13-email-doordash.webp' },
				{ name: 'Email: Holiday gifting', file: 'venmo/14-email-holiday.webp' }
			]
		}
	],
	// The café's glass entrance door at the far left, its frame from the scene's edge to the wall.
	exit: { x: 0, y: 60, w: 382, h: 865 },
	// One floor: the horizon is the back wall's foot beside the door.
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 905, foregroundY: 1600 }],
	foreground: [],
	walkBehind: [
		{
			// The order counter with its pastry case and register. Its outline is its own polygon, notched from x 1715 to
			// 1865 down to the counter's top, where the stand is; its front line is the foot of its kick.
			key: 'bread-co-counter',
			rect: { x: 683, y: 539, w: 1400, h: 431 },
			outline: [
				{ x: 683, y: 689 }, { x: 710, y: 688 }, { x: 710, y: 605 }, { x: 730, y: 560 }, { x: 750, y: 548 }, { x: 751, y: 539 },
				{ x: 1468, y: 549 }, { x: 1483, y: 571 }, { x: 1484, y: 693 }, { x: 1513, y: 689 }, { x: 1514, y: 670 }, { x: 1532, y: 657 },
				{ x: 1562, y: 579 }, { x: 1694, y: 581 }, { x: 1700, y: 586 }, { x: 1673, y: 649 }, { x: 1675, y: 660 }, { x: 1692, y: 670 },
				{ x: 1692, y: 689 }, { x: 1715, y: 693 }, { x: 1715, y: 712 }, { x: 1865, y: 712 }, { x: 1865, y: 691 }, { x: 2001, y: 692 },
				{ x: 2083, y: 701 }, { x: 2080, y: 914 }, { x: 2066, y: 936 }, { x: 2033, y: 953 }, { x: 1989, y: 967 }, { x: 1944, y: 970 },
				{ x: 747, y: 953 }, { x: 694, y: 930 }, { x: 694, y: 906 }, { x: 687, y: 903 }
			],
			front: [{ x: 694, y: 930 }, { x: 747, y: 953 }, { x: 1944, y: 970 }, { x: 1989, y: 967 }, { x: 2033, y: 953 }, { x: 2066, y: 936 }, { x: 2080, y: 914 }],
			props: []
		},
		{
			// The left café table, its two chairs and the sprig on it. Its outline is its convex hull, so a cursor keeps its
			// side until it steps off the whole set; its front line runs through the feet.
			key: 'bread-co-table-left',
			rect: { x: 347, y: 984, w: 666, h: 406 },
			outline: [
				{ x: 1012, y: 1039 }, { x: 1002, y: 1363 }, { x: 998, y: 1365 }, { x: 831, y: 1385 }, { x: 669, y: 1390 }, { x: 522, y: 1380 },
				{ x: 357, y: 1354 }, { x: 346, y: 1041 }, { x: 351, y: 1030 }, { x: 431, y: 1010 }, { x: 716, y: 983 }, { x: 978, y: 1024 }
			],
			front: [{ x: 357, y: 1354 }, { x: 522, y: 1380 }, { x: 669, y: 1390 }, { x: 831, y: 1385 }, { x: 998, y: 1365 }],
			props: []
		},
		{
			// The laptop table and its two chairs: the set's convex hull, notched from x 1460 to 1920 down to y 1270, where
			// the laptop, the cup and the clipboard are.
			key: 'bread-co-table-laptop',
			rect: { x: 1251, y: 1004, w: 939, h: 570 },
			outline: [
				{ x: 1251, y: 1156 }, { x: 1460, y: 1033 }, { x: 1460, y: 1270 }, { x: 1920, y: 1270 }, { x: 1920, y: 1077 }, { x: 2180, y: 1149 },
				{ x: 2190, y: 1158 }, { x: 2173, y: 1523 }, { x: 2044, y: 1574 }, { x: 1383, y: 1563 }, { x: 1262, y: 1512 }
			],
			front: [{ x: 1262, y: 1512 }, { x: 1383, y: 1563 }, { x: 2044, y: 1574 }, { x: 2173, y: 1523 }],
			props: []
		}
	]
};
