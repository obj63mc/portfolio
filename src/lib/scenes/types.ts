// One typed module per scene (spec: "Scene data"). World px everywhere (ADR 0001).
// The accessible layer, the canvas engine, the sound engine and analytics all read from these.

export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** The seven cosmetics, by id; 0 is no cosmetic. */
export type CosmeticId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Link {
	label: string;
	href: string;
}

export interface Prop {
	id: string;
	name: string;
	/** Short line appended to the button name: "Diploma: BS Computer Science with Honors, 2005". */
	gist: string;
	/**
	 * What it is, when not a button opening its card: an `action`, a button whose click is all it does (a Foundry poster
	 * starts its reel), or a `status`, no button at all, its name and state read as text in the layer (the Foundry screen).
	 * Neither has a card (Joe, 2026-09-29, buildout ticket 17).
	 */
	kind?: 'action' | 'status';
	/** Card paragraphs, the full content-inventory text; none for an `action` or a `status`. */
	body: string[];
	/** Links shown inside the card. An external link never leaves the card (spec: "Links, not buttons"). */
	links?: Link[];
	rect: Rect;
	/** CSS clip-path for an irregular prop's button. */
	clip?: string;
	/** The cosmetic this prop grants on first interaction. */
	cosmetic?: CosmeticId;
	/**
	 * Its cut-outs in art/generated/<scene>/, bottom first, each an asset id or a rig's name (`<name>-rig.json`); an empty
	 * list is a prop with no art of its own. Unset, the one cut-out named for the prop: its id on the overworld,
	 * `<scene>-<id>` in a sub-scene (`artOf` in index.ts).
	 */
	art?: string[];
	/** A video its card plays, drawn onto `screen` in the scene while it plays: a file in art/sources/videos. */
	video?: { file: string; screen: Rect; captions?: string };
}

export interface Venue {
	id: string;
	name: string;
	rect: Rect;
	props: Prop[];
	/** URL of the sub-scene behind the venue door, absent for exterior-only venues. */
	door?: string;
	/** The door link's hit area where it is less than the whole building: the Foundry's cinema, under its marquee. */
	doorRect?: Rect;
}

export interface District {
	id: string;
	name: string;
	rect: Rect;
	/** Heading box: the `<h2>` sits over the painted neighbourhood entrance sign. The venue rect is the `<h3>` box. */
	sign: Rect;
	venues: Venue[];
}

export interface DepthRegion {
	rect: Rect;
	horizonY: number;
	foregroundY: number;
}

/** Foreground scenery: a keyed WebP cut-out drawn after every cursor. Never overlaps a prop rect. */
export interface Cutout {
	key: string;
	rect: Rect;
}

/**
 * Walk-behind scenery: a keyed cut-out, such as a lab desk with its monitor and chair, that a cursor passes behind or in
 * front of. The side a cursor steps onto the outline from decides, read at its last position outside the outline: from
 * above the front line it is behind, drawn under the cut-out, and cannot use the props standing on it; from on or below
 * the line it is in front, drawn over it, and can use them. It keeps that side until it steps off the outline.
 */
export interface WalkBehind extends Cutout {
	/** Where a cursor is on the scenery. */
	outline: Point[];
	/** The front feet, left to right. The line's y at the cursor's x (flat past either end) splits behind from in front. */
	front: Point[];
	/**
	 * A staircase's top step, left to right, where it meets the floor above (the Moosylvania loft). Stepping on from on or
	 * above this line is coming down the stairs, so it is in front too, as is stepping on within `LANDING_REACH` of travel
	 * after leaving that floor (`walk.ts`: a cursor coming off the loft at an angle passes the loft's edge beside the stair
	 * first). Only stepping on between the two lines from the floor below, from a stair's side, goes underneath.
	 */
	landing?: Point[];
	/** Ids of the props standing on it. */
	props: string[];
}

interface SceneBase {
	id: string;
	title: string;
	description: string;
	w: number;
	h: number;
	depth: DepthRegion[];
	foreground: Cutout[];
	/**
	 * Edge-push band, a fraction of the viewport's width and height: 0.12 unless set. The overworld and the Moosylvania
	 * lobby, which scrolls like it, use 0.25.
	 */
	pushBand?: number;
}

export interface Overworld extends SceneBase {
	signpost: { rect: Rect; contacts: Link[] };
	/** West to east by centre x: DOM order, tab order and reading order. */
	districts: District[];
	river: {
		/** Water polygon. The deck rect is excluded by the engine, so walking across never drifts. */
		mask: Point[];
		deck: Rect;
		/** The bridge cut-out: drawn over a cursor in the river and under a cursor crossing the deck. */
		bridge: Cutout;
		southEndY: number;
		arch: Point;
		/**
		 * Where the river and the Arch's bed plays at full (buildout ticket 21), fading out over the strips beside it; each
		 * district's bed plays over the district's rect.
		 */
		footprint: Rect;
	};
	/** The Carondelet lake loop (buildout ticket 18): the lap timer's course, which the rider rides too. */
	track: {
		/** The centreline, a closed loop anticlockwise on screen, from the start/finish line on the lower straight. */
		path: Point[];
		/** The painted path's half-width. */
		half: number;
		/** Where the turns at the loop's ends begin, world x: the lap timer's corridor widens west of `west` and east of `east`. */
		ends: { west: number; east: number };
		/** Cut-outs of the scenery the loop runs behind, drawn over the rider as it passes behind them. */
		cover: string[];
		/** The start/finish sign's cut-out, scenery beside the line that nothing clicks: the lap timer is an Easter egg. */
		sign: string;
	};
	/** The Foundry cinema's marquee: scenery that nothing clicks, whose letter board scrolls what's showing. */
	marquee: {
		/** Its cut-outs, bottom first: the canopy, then its string of bulbs, which chase. */
		art: string[];
		/**
		 * The canopy's front face, clockwise from its top left, its sides upright: the letter board fills it inside a white
		 * frame, the letters following its slope.
		 */
		face: Point[];
		/** What scrolls across the board, over and over. */
		text: string;
	};
}

export interface SubScene extends SceneBase {
	venue: string;
	district: string;
	props: Prop[];
	exit: Rect;
	/** Back to front, the order they are drawn in. */
	walkBehind: WalkBehind[];
}
