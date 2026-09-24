import type { SubScene } from './types';

// Placeholder rects; the sub-scene art pass (buildout ticket 05) rewrites them.
export const SLU: SubScene = {
	id: 'slu',
	title: 'Saint Louis University, Midtown',
	description:
		'Inside the Saint Louis University computer science lab: Joe Madden’s BS in Computer Science with Honors, 2005, his senior project and his GitHub.',
	venue: 'Saint Louis University',
	district: 'Midtown',
	w: 2845,
	h: 1600,
	props: [
		{
			id: 'diploma',
			name: 'Diploma',
			gist: 'BS Computer Science with Honors, 2005',
			body: ['Bachelor of Science in Computer Science with Honors, Saint Louis University, 2005.'],
			rect: { x: 500, y: 300, w: 300, h: 220 },
			cosmetic: 1
		},
		{
			id: 'whiteboard',
			name: 'Whiteboard',
			gist: 'basis path testing, the senior project',
			body: ['A diagram of basis path testing, the senior project.'],
			rect: { x: 1100, y: 250, w: 700, h: 450 }
		},
		{
			id: 'workstation',
			name: 'Lab workstation',
			gist: 'Joe’s GitHub',
			body: ['The code lives on GitHub.'],
			links: [{ label: 'GitHub', href: 'https://github.com/obj63mc' }],
			rect: { x: 2100, y: 800, w: 420, h: 360 }
		}
	],
	exit: { x: 100, y: 1000, w: 120, h: 220 },
	depth: [{ rect: { x: 0, y: 0, w: 2845, h: 1600 }, horizonY: 500, foregroundY: 1600 }],
	foreground: []
};
