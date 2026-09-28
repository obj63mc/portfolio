import type { SubScene } from './types';

/** The three Universal Pictures Home Entertainment titles the shared screen can play (spec: "One shared prop"). */
export const SCREEN_TITLES = {
	'fast-five': 'Fast Five',
	'snow-white': 'Snow White and the Huntsman',
	lorax: 'The Lorax'
} as const;
export type ScreenTitle = keyof typeof SCREEN_TITLES;

/** The screen button's gist for a state: "Screen: now playing Fast Five", or the idle wording. */
export const screenGist = (playing?: ScreenTitle) =>
	playing ? `now playing ${SCREEN_TITLES[playing]}` : 'idle, pick a poster to start a reel';

const caseStudy: Record<ScreenTitle, string> = {
	'fast-five': 'A find-and-seek and safe-cracking game promoting the home video release.',
	'snow-white': 'Multiple mini games built from scenes in the film.',
	lorax: 'A partnership with Words With Friends.'
};

// Placeholder rects; the sub-scene art pass (buildout ticket 05) rewrites them.
const poster = (i: number) => ({ x: 1500 + i * 420, y: 350, w: 300, h: 440 });

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
		{
			id: 'screen',
			name: 'Screen',
			gist: screenGist(),
			body: [
				'The screen plays one reel at a time for everyone in the room. Click a poster to start one.',
				...Object.entries(SCREEN_TITLES).map(([id, title]) => `${title}: ${caseStudy[id as ScreenTitle]}`)
			],
			rect: { x: 300, y: 200, w: 1000, h: 560 },
			cosmetic: 2
		},
		...(Object.keys(SCREEN_TITLES) as ScreenTitle[]).map((id, i) => ({
			id: `poster-${id}`,
			name: `${SCREEN_TITLES[id]} poster`,
			gist: 'Universal Pictures Home Entertainment',
			body: [caseStudy[id]],
			rect: poster(i),
			cosmetic: 2 as const
		}))
	],
	exit: { x: 100, y: 1000, w: 120, h: 220 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 500, foregroundY: 1600 }],
	foreground: [],
	walkBehind: []
};
