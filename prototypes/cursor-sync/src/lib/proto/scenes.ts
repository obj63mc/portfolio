// Placeholder scene data. Positions are world px (ADR 0001). Maplewood rects come from the ticket 07
// harness (district origin 100, 900); other districts use stand-in art from scripts/build-art.sh.
import type { Title } from './protocol';

export type SceneId = 'overworld' | 'lobby' | 'theatre';
export type Motion = 'none' | 'moose' | 'rider' | 'marquee' | 'blink' | 'bike' | 'screen';

export interface PropDef {
	id: string;
	title: string;
	body: string;
	x: number;
	y: number;
	w: number;
	h: number;
	img?: string;
	motion?: Motion;
	enter?: SceneId;
	exit?: boolean;
	cosmetic?: number;
	play?: Title; // a Foundry poster: clicking sends the shared screen op
}

export interface SceneDef {
	id: SceneId;
	path: string;
	art: SceneId; // which scene's background tiles to draw
	w: number;
	h: number;
	band: number;
	arrival: { x: number; y: number };
	hot: { x: number; y: number; w: number; h: number };
	props: PropDef[];
}

// Moose rig from ticket 07, in the 1254 px master frame. kM maps frame px to world px.
export const MOOSE = {
	kM: 0.13,
	origin: [200, 41] as const, // top-left of the parts' bounds in frame px
	parts: [
		{ key: 'moose-body', parent: null, x: 200, y: 181, w: 728, h: 726, pivot: [0.5, 1] },
		{ key: 'moose-antlers', parent: 'moose-head', x: 319, y: 41, w: 568, h: 255, pivot: [0.78, 0.95] },
		{ key: 'moose-head', parent: 'moose-body', x: 452, y: 152, w: 437, h: 375, pivot: [0.15, 0.85] },
		{ key: 'moose-eye', parent: 'moose-head', x: 558, y: 180, w: 48, h: 46, pivot: [0.5, 0.5] }
	]
};

export const TRACK = { cx: 2600, cy: 2010, rx: 520, ry: 300, lap: 8 };

const k = 1100 / 1400; // stand-in district scale
const MW = { x: 100, y: 900 };
const CWE = { x: 1700, y: 200 };
const MID = { x: 2850, y: 200 };
const BEL = { x: 4250, y: 600 };

export const OVERWORLD: SceneDef = {
	id: 'overworld',
	path: '/',
	art: 'overworld',
	w: 5400,
	h: 2700,
	band: 0.25,
	arrival: { x: 1400, y: 1456 },
	hot: { x: 100, y: 900, w: 1400, h: 933 },
	props: [
		{ id: 'signpost', title: 'Signpost', body: 'Resume (PDF), email, LinkedIn, GitHub. Arrows to Central West End, Midtown, Belleville and Carondelet Park.', img: 'signpost', x: MW.x + 614, y: MW.y + 376, w: 91, h: 170 },
		{ id: 'welcome', title: 'Moosylvania', body: '2011 to present. Senior Developer to Chief Architect. Leads all web work with a small team of writers, creatives and developers.', img: 'welcome', x: MW.x + 1225, y: MW.y + 512, w: 150, h: 88 },
		{ id: 'moosylvania-door', title: 'Moosylvania door', body: 'Enter the lobby.', img: 'door', x: MW.x + 989, y: MW.y + 360, w: 98, h: 82, enter: 'lobby' },
		{ id: 'moose', title: 'The moose', body: 'A personal line, to be written. Grants the antlers.', motion: 'moose', x: 1166, y: 1385, w: 95, h: 113, cosmetic: 3 },
		{ id: 'side-project', title: 'Side Project Cellar', body: 'Across the street from Moosylvania. Bar sub-scene (not in this prototype).', img: 'door', x: MW.x + 330, y: MW.y + 350, w: 70, h: 59 },
		{ id: 'brennans', title: "Brennan's", body: 'Cigar clients. Bar interior sub-scene (not in this prototype).', img: 'door', x: CWE.x + 989 * k, y: CWE.y + 360 * k, w: 77, h: 64 },
		{ id: 'slu', title: 'Saint Louis University', body: 'BS Computer Science with Honors, 2005. CS lab sub-scene (not in this prototype).', img: 'door', x: MID.x + 300 * k, y: MID.y + 350 * k, w: 60, h: 50 },
		{ id: 'marquee', title: 'The Foundry marquee', body: 'Universal Pictures Home Entertainment: three titles.', img: 'welcome', motion: 'marquee', x: MID.x + 780 * k, y: MID.y + 470 * k, w: 150, h: 88 },
		{ id: 'foundry-door', title: 'The Foundry', body: 'Enter the theatre.', img: 'door', enter: 'theatre', x: MID.x + 989 * k, y: MID.y + 360 * k, w: 77, h: 64 },
		{ id: 'monster', title: 'MonsterCommerce', body: 'Intern 2004, full time 2005, left 2011. Acquired by Network Solutions. Click to blink the eye.', img: 'welcome', motion: 'blink', x: BEL.x + 850 * k, y: BEL.y + 470 * k, w: 150, h: 88, cosmetic: 2 },
		{ id: 'server-rack', title: 'Server rack', body: 'Built the e-commerce platform; later conversion optimisation and A/B testing at networksolutions.com.', img: 'signpost', x: BEL.x + 500 * k, y: BEL.y + 300 * k, w: 70, h: 130 },
		{ id: 'rider', title: 'Track rider', body: 'Carondelicious Criterium and the Tuesday night series.', motion: 'rider', x: TRACK.cx, y: TRACK.cy, w: 60, h: 50 },
		{ id: 'bike', title: "Joe's bike", body: 'Strava link. Grants the bike helmet.', motion: 'bike', x: 2050, y: 2300, w: 60, h: 50, cosmetic: 6 },
		{ id: 'ride-sign', title: 'Ride sign', body: 'Longest ride 160 miles; longest two-day 235 miles (Ride Across Wisconsin).', img: 'signpost', x: 3100, y: 1700, w: 70, h: 130 }
	]
};

export const LOBBY: SceneDef = {
	id: 'lobby',
	path: '/maplewood/moosylvania',
	art: 'lobby',
	w: 2845,
	h: 1600,
	band: 0.12,
	arrival: { x: 1430, y: 1300 },
	hot: { x: 0, y: 0, w: 2845, h: 1600 },
	props: [
		{ id: 'desk-frontend', title: 'Frontend desk', body: 'Nuxt, Next, Svelte, modern JS, TypeScript, SCSS.', img: 'welcome', x: 500, y: 950, w: 200, h: 117 },
		{ id: 'desk-backend', title: 'Backend desk', body: 'Node.js/TypeScript and PHP; ASP.NET C#, Ruby, Python.', img: 'welcome', x: 1000, y: 950, w: 200, h: 117 },
		{ id: 'desk-cms', title: 'CMS desk', body: 'WordPress, SilverStripe, Strapi; headless Prismic and Storyblok.', img: 'welcome', x: 1650, y: 950, w: 200, h: 117 },
		{ id: 'desk-data', title: 'Data desk', body: 'MySQL, PostgreSQL, Redis; MongoDB.', img: 'welcome', x: 2150, y: 950, w: 200, h: 117 },
		{ id: 'exit', title: 'Exit door', body: 'Back to Maplewood.', img: 'door', x: 1370, y: 1400, w: 120, h: 100, exit: true }
	]
};

// The Foundry theatre, with placeholder art borrowed from the lobby: three posters and the one shared prop.
export const THEATRE: SceneDef = {
	id: 'theatre',
	path: '/midtown/foundry',
	art: 'lobby',
	w: 2845,
	h: 1600,
	band: 0.12,
	arrival: { x: 1430, y: 1100 },
	hot: { x: 200, y: 300, w: 2400, h: 1100 },
	props: [
		{ id: 'poster-fast-five', title: 'Fast Five', body: 'Poster. Click to play it on the screen.', img: 'signpost', x: 260, y: 520, w: 150, h: 280, play: 'fast-five' },
		{ id: 'poster-snow-white', title: 'Snow White and the Huntsman', body: 'Poster. Click to play it on the screen.', img: 'signpost', x: 470, y: 520, w: 150, h: 280, play: 'snow-white' },
		{ id: 'poster-lorax', title: 'The Lorax', body: 'Poster. Click to play it on the screen.', img: 'signpost', x: 680, y: 520, w: 150, h: 280, play: 'lorax' },
		{ id: 'screen', title: 'The Foundry screen', body: 'Shared: every visitor in the theatre sees the same reel.', motion: 'screen', x: 1050, y: 300, w: 1500, h: 760 },
		{ id: 'exit', title: 'Exit door', body: 'Back to Midtown.', img: 'door', x: 1370, y: 1400, w: 120, h: 100, exit: true }
	]
};

export const SCENES: Record<SceneId, SceneDef> = { overworld: OVERWORLD, lobby: LOBBY, theatre: THEATRE };

export const sceneForPath = (path: string): SceneId =>
	(Object.values(SCENES).find((s) => s.path === (path.replace(/\/$/, '') || '/'))?.id ?? 'overworld');

/** Stress mode: copies of every overworld prop scattered by a fixed seed. */
export function multiplyProps(scene: SceneDef, mult: number): PropDef[] {
	if (mult <= 1 || scene.id !== 'overworld') return scene.props;
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	const out = [...scene.props];
	for (let m = 1; m < mult; m++)
		for (const p of scene.props) {
			if (p.motion === 'rider') continue;
			out.push({ ...p, id: `${p.id}-${m}`, enter: undefined, x: 100 + rnd() * (scene.w - 300), y: 100 + rnd() * (scene.h - 300) });
		}
	return out;
}
