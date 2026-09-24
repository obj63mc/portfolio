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
		mask: Point[];
		deck: Rect;
		southEndY: number;
		arch: Point;
	};
}

export interface SubScene extends SceneBase {
	venue: string;
	district: string;
	props: Prop[];
	exit: Rect;
}
