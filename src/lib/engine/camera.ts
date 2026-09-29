// The camera (spec: Camera; buildout ticket 08) as pure functions of the view, the scene and the drawn cursor, the keys
// that steer that cursor (ticket 09), and touch's joystick, drag and fling (ticket 10): the engine steps them each frame,
// the tests with a fake clock (seam 2). World px everywhere (ADR 0001); the view is CSS px at the session's render scale.
// Carried over from the rendering and pointer-lock prototypes' engines.
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
	/**
	 * Steering is pressing the cursor against the viewport's edge. It can't be aiming at anything further out, so nothing
	 * holds the camera: on a phone the controls line the bottom edge, and a prop beside the pinned cursor would otherwise
	 * stop it for good (ticket 10).
	 */
	pressed: boolean;
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
	const held = !c || (!f.pressed && (f.props.some((r) => within(world!, r, NEAR / s)) || f.controls.some((r) => within(c, r, NEAR))));
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
 * A touch drag of `d` CSS px (ticket 10): the camera moves against it (drag left, the view moves right), clamped. The drawn
 * cursor keeps its world place unless the drag would take it out of view: then it is carried along with its tip on the
 * top or left edge, or `margin` CSS px inside the right or bottom one, so the arrow stays in view. A cursor already past
 * that line is carried where it is, never pulled in.
 */
export function pan(cam: Point, cursor: Point, d: Point, v: View, scene: Size, margin: number): { cam: Point; cursor: Point } {
	const next = clamp({ x: cam.x - d.x / v.s, y: cam.y - d.y / v.s }, v, scene);
	const hold = (p: number, moved: number, size: number) => Math.max(Math.min(p, 0), Math.min(Math.max(p, size - margin), moved));
	return {
		cam: next,
		cursor: { x: hold(cursor.x, cursor.x + (cam.x - next.x) * v.s, v.w), y: hold(cursor.y, cursor.y + (cam.y - next.y) * v.s, v.h) }
	};
}

/** A drag's move: when, and where the finger was, CSS px. */
export interface Move extends Point {
	t: number;
}

/** A drag's velocity as it is let go, CSS px/s, from its moves in the last 80 ms; a finger held still first flings nothing. */
export function fling(moves: Move[], now: number): Point | null {
	const recent = moves.filter((m) => now - m.t < 80), a = recent[0], b = recent.at(-1);
	return a && b && b.t > a.t ? { x: ((b.x - a.x) * 1000) / (b.t - a.t), y: ((b.y - a.y) * 1000) / (b.t - a.t) } : null;
}

/** A fling's velocity after `dt` seconds more of inertia: decaying with a time constant of 0.15 s, null once under 5 px/s. */
export function coast(vel: Point, dt: number): Point | null {
	const k = Math.exp(-dt / 0.15), x = vel.x * k, y = vel.y * k;
	return Math.hypot(x, y) < 5 ? null : { x, y };
}

/** Arrow keys and WASD by `KeyboardEvent.code`, so WASD is where it sits on any layout, and the way each steers. */
export const KEYS: Record<string, Point> = {
	ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
	ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 }
};

/** The drawn cursor's top speed under the keys and the joystick, world px/s. */
const SPEED = 600;
/** The joystick's dead zone, a fraction of its radius. */
const DEAD = 0.15;

/** The drawn cursor's travel in `dt` seconds with `keys` held: 600 world px/s, diagonals normalised, in CSS px at scale `s`. */
export function steer(keys: ReadonlySet<string>, s: number, dt: number): Point {
	const axis = (a: 'x' | 'y') => Math.sign([...keys].reduce((sum, k) => sum + (KEYS[k]?.[a] ?? 0), 0));
	const x = axis('x'), y = axis('y'), k = x || y ? (SPEED * s * dt) / Math.hypot(x, y) : 0;
	return { x: x * k, y: y * k };
}

/**
 * The drawn cursor's travel in `dt` seconds with the joystick's knob pulled `pull` CSS px from the centre of a stick of
 * radius `r` (ticket 10): nothing inside the 15 percent dead zone, then easing linearly to 600 world px/s at the rim and
 * no faster beyond it, along the pull; CSS px at scale `s`.
 */
export function stick(pull: Point, r: number, s: number, dt: number): Point {
	const len = Math.hypot(pull.x, pull.y), m = Math.min(1, len / r);
	if (m <= DEAD) return { x: 0, y: 0 };
	const k = (((m - DEAD) / (1 - DEAD)) * SPEED * s * dt) / len;
	return { x: pull.x * k, y: pull.y * k };
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
