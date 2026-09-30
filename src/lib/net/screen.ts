// The Foundry screen, the one shared prop (spec: "One shared prop"; buildout ticket 17): its state, which the room holds
// and every client runs from server time, and its reel as a pure function of that time. The room reads the lengths to
// know when the screen is idle again; the engine draws the reel (engine/projector.ts). Times are ms.
import { SCREEN_VIDEOS, type ScreenTitle } from '../scenes/foundry.ts';
import type { Point } from '../scenes/types';

/** Idle, or a title playing since `at`, server time. */
export type Screen = { title: ScreenTitle; at: number } | null;

/**
 * The reel round each title's demo video: the projector lights up, "Now Showing" and the title, the video, its line of
 * case-study text, then the fade to dark (Joe, 2026-09-29: the video's length sets the reel's, spec gap 8).
 */
export const REEL = { beam: 1200, title: 2000, caseStudy: 3000, fade: 1500 } as const;

export const reelMs = (title: ScreenTitle) => REEL.beam + REEL.title + SCREEN_VIDEOS[title].ms + REEL.caseStudy + REEL.fade;

/** Whether the screen is playing at `now`; a clock a little behind the server's counts the reel as just started. */
export const playing = (s: Screen, now: number): s is NonNullable<Screen> => !!s && now - s.at < reelMs(s.title);

/**
 * The reel at `now`: how lit the projector and the screen are (0 to 1), what the screen shows (nothing while the beam
 * comes up, the title card, the video or the case study), and how far into the video it is, seconds. Null when idle.
 */
export function reel(s: Screen, now: number) {
	if (!playing(s, now)) return null;
	const e = Math.max(0, now - s.at), video = SCREEN_VIDEOS[s.title].ms, end = reelMs(s.title);
	const t = [REEL.beam, REEL.beam + REEL.title, REEL.beam + REEL.title + video];
	return {
		title: s.title,
		level: Math.min(1, e / REEL.beam, (end - e) / REEL.fade),
		show: e < t[0] ? null : e < t[1] ? ('title' as const) : e < t[2] ? ('video' as const) : ('case' as const),
		video: Math.min(video, Math.max(0, e - t[1])) / 1000
	};
}

/**
 * The projective map of the unit square onto a quad given clockwise from its top left (Heckbert's square-to-quad): the
 * reel's texture, u across and v down, onto the screen's painted surface, which the camera sees at an angle.
 */
export function onQuad([p0, p1, p2, p3]: Point[]): (u: number, v: number) => Point {
	const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
	const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
	const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
	const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y;
	return (u, v) => {
		const w = g * u + h * v + 1;
		return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
	};
}
