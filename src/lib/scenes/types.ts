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
	/** Card paragraphs, the full content-inventory text. */
	body: string[];
	/** Links shown inside the card. An external link never leaves the card (spec: "Links, not buttons"). */
	links?: Link[];
	rect: Rect;
	/** CSS clip-path for an irregular prop's button. */
	clip?: string;
	/** The cosmetic this prop grants on first interaction. */
	cosmetic?: CosmeticId;
}

export interface Venue {
	id: string;
	name: string;
	rect: Rect;
	props: Prop[];
	/** URL of the sub-scene behind the venue door, absent for exterior-only venues. */
	door?: string;
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
 * front of. The side a cursor steps onto the outline from decides: from above the front line it is behind, drawn under
 * the cut-out, and cannot use the props standing on it; from on or below the line it is in front, drawn over it, and
 * can use them. It keeps that side until it steps off the outline.
 */
export interface WalkBehind extends Cutout {
	/** Where a cursor is on the scenery. */
	outline: Point[];
	/** The front feet, left to right. The line's y at the cursor's x (flat past either end) splits behind from in front. */
	front: Point[];
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
	};
}

export interface SubScene extends SceneBase {
	venue: string;
	district: string;
	props: Prop[];
	exit: Rect;
	/** Back to front, the order they are drawn in. */
	walkBehind: WalkBehind[];
	/**
	 * Edge-push band, a fraction of the viewport's width and height: 0.12 in a sub-scene unless set. The Moosylvania lobby,
	 * which scrolls like the overworld, uses the overworld's 0.25.
	 */
	pushBand?: number;
}
