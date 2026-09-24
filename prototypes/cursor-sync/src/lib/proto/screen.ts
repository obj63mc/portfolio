// PROTOTYPE (ticket 09): the Foundry screen reel, drawn from shared state alone. Anyone arriving mid-reel
// computes the same frame from `now - startedAt`, so every visitor in the room sees the same moment.
import type { M } from './math';
import { SEQ_MS, type Screen } from './protocol';
import type { PropState } from './props';

const NAMES = { 'fast-five': 'FAST FIVE', 'snow-white': 'SNOW WHITE AND THE HUNTSMAN', lorax: 'THE LORAX' };
// one-line case-study text from the content inventory (ticket 05)
const LINES = {
	'fast-five': 'Find-and-seek and safe-cracking game for the home video release.',
	'snow-white': 'Mini games built from scenes in the film.',
	lorax: 'Partnership with Words With Friends.'
};
const HUES = { 'fast-five': 20, 'snow-white': 210, lorax: 35 };

export function drawScreen(g: CanvasRenderingContext2D, p: PropState, W: M, screen: Screen | null, now: number, source: string) {
	g.setTransform(W[0], W[1], W[2], W[3], W[4], W[5]);
	const { x, y, w, h } = p;
	g.fillStyle = '#111';
	g.fillRect(x - 12, y - 12, w + 24, h + 24);
	const t = screen ? now - screen.startedAt : -1;
	const cx = x + w / 2, cy = y + h / 2;
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	if (!screen || t < 0 || t > SEQ_MS) {
		g.fillStyle = '#1b1b1f';
		g.fillRect(x, y, w, h);
		g.fillStyle = '#5a5a66';
		g.font = '600 44px system-ui, sans-serif';
		g.fillText('Click a poster to play it for the whole room', cx, cy);
	} else {
		const title = screen.title;
		// 0-1.5 s projector warms up; 1.5-3.5 Now Showing; 3.5-6 title; 6-11 case study; 11-12 fade out
		const bright = Math.min(1, t / 1500) * (t > 11000 ? Math.max(0, 1 - (t - 11000) / 1000) : 1);
		g.fillStyle = `hsl(${HUES[title]} 30% ${6 + bright * 22}%)`;
		g.fillRect(x, y, w, h);
		g.globalAlpha = bright;
		g.fillStyle = '#fff4d6';
		if (t < 3500) {
			g.font = '800 90px Georgia, serif';
			g.fillText('NOW SHOWING', cx, cy);
		} else if (t < 6000) {
			g.font = '900 110px Georgia, serif';
			g.fillText(NAMES[title], cx, cy, w - 80);
		} else {
			g.fillStyle = `hsl(${HUES[title]} 60% 55%)`;
			g.fillRect(x + 120, y + 100, w - 240, h - 330);
			g.fillStyle = '#fff4d6';
			g.font = '600 46px system-ui, sans-serif';
			g.fillText(LINES[title], cx, y + h - 140, w - 120);
		}
		g.globalAlpha = 1;
		// progress bar so two phones can be compared at a glance
		g.fillStyle = '#ffd84a';
		g.fillRect(x, y + h - 10, (w * Math.min(t, SEQ_MS)) / SEQ_MS, 10);
	}
	g.fillStyle = '#9a9aa6';
	g.font = '500 26px ui-monospace, monospace';
	g.textAlign = 'right';
	g.fillText(source, x + w - 16, y + 28);
	g.textAlign = 'start';
}
