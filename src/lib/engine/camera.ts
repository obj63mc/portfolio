// The camera (spec: Camera; buildout ticket 08) as pure functions of the view, the scene and the drawn cursor: the engine
// steps it each frame, the tests with a fake clock (seam 2). World px everywhere (ADR 0001); the view is CSS px at the
// session's render scale. Carried over from the rendering prototype's engine.
import type { Point, Rect } from '../scenes/types.ts';

/** Background tile edge, world px. */
export const TILE = 512;
/** Edge-push speed at the viewport's edge, world px/s. */
const PUSH = 900;
/** The camera holds still while the cursor is within this many CSS px of a prop or an on-screen control. */
const NEAR = 40;

export interface View {
	/** The viewport, CSS px. */
	w: number;
	h: number;
	/** Render scale: CSS px per world px. */
	s: number;
}

export interface Size {
	w: number;
	h: number;
}

export interface Frame {
	view: View;
	scene: Size;
	/** The push band, a fraction of the viewport's width and height. */
	band: number;
	/** The drawn cursor, CSS px; null while it can't push (outside the window, over a card). */
	cursor: Point | null;
	/** World rects of the props. */
	props: Rect[];
	/** Screen rects of the on-screen controls, CSS px. */
	controls: Rect[];
}

/** One axis of the push band: 0 up to the band's inner edge, easing to -1 or 1 at the viewport's edge. */
const edge = (pos: number, size: number, band: number) => {
	const b = size * band, p = Math.max(0, Math.min(size, pos));
	if (p < b) return -((1 - p / b) ** 2);
	if (p > size - b) return (1 - (size - p) / b) ** 2;
	return 0;
};

/** Hard clamp at the scene's bounds, no rubber-banding; along an axis the view is larger than, the scene sits in its middle. */
export function clamp(cam: Point, v: View, scene: Size): Point {
	const axis = (p: number, view: number, size: number) => (size <= view ? (size - view) / 2 : Math.max(0, Math.min(size - view, p)));
	return { x: axis(cam.x, v.w / v.s, scene.w), y: axis(cam.y, v.h / v.s, scene.h) };
}

/** The camera centred on a world point, clamped. */
export const centreOn = (p: Point, v: View, scene: Size) => clamp({ x: p.x - v.w / v.s / 2, y: p.y - v.h / v.s / 2 }, v, scene);

const within = (p: Point, r: Rect, m: number) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m;

/** One frame of edge-push: the camera after `dt` seconds. */
export function step(cam: Point, f: Frame, dt: number): Point {
	const c = f.cursor, s = f.view.s;
	const world = c && { x: cam.x + c.x / s, y: cam.y + c.y / s };
	const held = !c || f.props.some((r) => within(world!, r, NEAR / s)) || f.controls.some((r) => within(c, r, NEAR));
	const pushed = held ? cam : { x: cam.x + edge(c.x, f.view.w, f.band) * PUSH * dt, y: cam.y + edge(c.y, f.view.h, f.band) * PUSH * dt };
	return clamp(pushed, f.view, f.scene);
}

/**
 * Keyboard focus and fragment links: one frame of an exponential ease toward `goal` (time constant 0.2 s), returning `goal`
 * itself once within half a world px, so the engine knows the glide is over.
 */
export function glide(cam: Point, goal: Point, dt: number): Point {
	const k = 1 - Math.exp(-dt / 0.2), x = cam.x + (goal.x - cam.x) * k, y = cam.y + (goal.y - cam.y) * k;
	return Math.hypot(goal.x - x, goal.y - y) < 0.5 ? goal : { x, y };
}

/**
 * The session's render scale (CSS px per world px), device pixel ratio and background tile density, fixed at start. A
 * screen under 768 px on its shorter side draws at the phone's 0.6, turned either way; anything larger at 1, whatever its
 * pointer (Joe, 2026-09-29). The DPR is capped at 2; tiles come at 1.25 image px per world px where that covers scale x
 * DPR, else 2.
 */
export function rendering(screenW: number, screenH: number, devicePixelRatio: number) {
	const s = Math.min(screenW, screenH) < 768 ? 0.6 : 1, dpr = Math.min(2, devicePixelRatio || 1);
	return { s, dpr, density: s * dpr <= 1.25 ? 1.25 : 2 };
}

/** The background tiles in view, grown by `ring` tiles on every side and cut to the scene: inclusive column and row bounds. */
export function tileRange(cam: Point, v: View, scene: Size, ring: number) {
	const cols = Math.ceil(scene.w / TILE), rows = Math.ceil(scene.h / TILE);
	return {
		x0: Math.max(0, Math.floor(cam.x / TILE) - ring),
		y0: Math.max(0, Math.floor(cam.y / TILE) - ring),
		x1: Math.min(cols - 1, Math.floor((cam.x + v.w / v.s) / TILE) + ring),
		y1: Math.min(rows - 1, Math.floor((cam.y + v.h / v.s) / TILE) + ring)
	};
}
