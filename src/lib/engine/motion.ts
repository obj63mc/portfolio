// Prop motion and reactions (buildout ticket 15) as pure functions of time and state, for the props module and for tests:
// ambient motion (the moose breathing and blinking, the rider round the park's lake loop, the marquee's letters scrolling
// and its bulbs chasing, a glint along the Side Project bottles, the river's ripples), hover and click reactions, and what reduced motion leaves of them. Times are
// ms. Ambient motion runs on server time, so every visitor in a room sees the rider at the same point. Carried over from
// the rendering prototype's props.ts and the art workshop's drawRig (art/review.js).
import type { Overworld, Point, Rect } from '../scenes/types';
import { lineY } from '../scenes/walk.ts';
import { LOOP, along } from './track.ts';

/** A hover fades in and out over this long; under reduced motion it is a plain highlight, on and off at once. */
export const HOVER_MS = 150;

/** How long each click reaction runs: most props pop, the moose's antlers wobble, the MonsterCommerce eye blinks. */
export const CLICK_MS = { pop: 300, wobble: 1200, blink: 250 } as const;

/**
 * The rider on the Carondelet lake loop (buildout ticket 18): the size of the box its rig is fitted into, its wheels on
 * the ground `drop` below the path's centreline, on the near half; its speed, world px/s; and where it rests under
 * reduced motion, world px along the loop past the start line (art/manifest.json sceneLayouts places it there). So that
 * it rides rather than slides (Joe, 2026-09-30), it follows the centreline averaged `smooth` world px either way, which
 * rounds the loop's corners; turns round over `turn` world px of travel at each end of the loop instead of flipping; leans
 * with the path's slope on screen, up to `lean` radians; and turns its cranks once every `stride` world px, a gear of
 * about one and a half wheel turns, through the seven `frames` of its pedal sheet (art/manifest.json rider-pedal-*).
 */
export const RIDER = { w: 120, h: 85, drop: 12, speed: 200, rest: 100, smooth: 40, turn: 60, lean: 0.1, stride: 170, frames: 7 };

export const ease = (u: number) => u * u * (3 - 2 * u);

/** The hover level after `dt` ms, eased toward 1 while hovered and back to 0; under reduced motion 1 or 0 at once. */
export const hover = (h: number, on: boolean, dt: number, rm: boolean) =>
	rm ? +on : Math.min(1, Math.max(0, h + (on ? dt : -dt) / HOVER_MS));

/** How far through a reaction of `ms` a prop clicked `since` ms ago is: 0 to 1, and 1 at rest. */
export const progress = (since: number, ms: number) => Math.min(1, Math.max(0, since / ms));

/** Up and back down over a reaction, exactly 0 at rest either side, so a finished reaction draws its resting frame. */
const arc = (p: number) => (p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0);

/** The pop's scale about the prop's centre. */
export const pop = (p: number) => 1 + 0.06 * arc(p);

/** An eye's height through a blink: open, shut to a tenth halfway, open again. */
export const blink = (p: number) => 1 - 0.9 * arc(p);

/**
 * How far the MonsterCommerce eye's iris turns, as fractions of the eye: across, and up or down, where the ball is
 * shallower; all the way once the cursor is `reach` world px off.
 */
export const GAZE = { x: 0.16, y: 0.06, reach: 400 } as const;

/**
 * The MonsterCommerce eye's iris offset, world px, in an eye at `eye` looking at the visitor's own cursor `at`: straight
 * ahead with no cursor, and under reduced motion.
 */
export function gaze(eye: Rect, at: Point | null, rm: boolean): Point {
	const dx = at ? at.x - (eye.x + eye.w / 2) : 0, dy = at ? at.y - (eye.y + eye.h / 2) : 0, d = Math.hypot(dx, dy);
	if (rm || !d) return { x: 0, y: 0 };
	const k = Math.min(1, d / GAZE.reach) / d;
	return { x: dx * k * GAZE.x * eye.w, y: dy * k * GAZE.y * eye.h };
}

/** A rig part's rotation (radians, about its pivot) and vertical scale (about its pivot). */
export interface Pose {
	r: number;
	sy: number;
}

/**
 * The moose rig's pose at time `t`, hovered to level `h`, clicked `since` ms ago: its body breathes (about its feet) and
 * its eye blinks every few seconds; hover lifts its head; a click wobbles its antlers and blinks it. Under reduced motion
 * it rests, the click's wobble and blink excepted.
 */
export function moose(t: number, h: number, since: number, rm: boolean): Record<'body' | 'head' | 'antlers' | 'eye', Pose> {
	const idle = t % 4700;
	const wobble = since < CLICK_MS.wobble ? 0.2 * Math.sin(since / 50) * Math.exp(-since / 250) : 0;
	return {
		body: { r: 0, sy: rm ? 1 : 1 + 0.012 * Math.sin((t / 3000) * 2 * Math.PI) },
		head: { r: rm ? 0 : -0.12 * ease(h), sy: 1 },
		antlers: { r: wobble, sy: 1 },
		eye: { r: 0, sy: Math.min(rm || idle < 4500 ? 1 : blink((idle - 4500) / 200), blink(progress(since, CLICK_MS.blink))) }
	};
}

/**
 * The moose's pose as a key for what draws it (props.ts `look`): its body's stretch to a thousandth, a tenth of a world px
 * at its back, and its eye's to a hundredth. Its breath lifts its back a world px and a quarter over a second and a half,
 * a twentieth of a px a frame, and keyed by the time it was drawn again at every frame: a repaint of its corner of the
 * scene, the GPU process's work more than the page's, for nothing the eye sees (2026-10-01: standing still at Maplewood,
 * 23% of a core in the GPU process, 9% keyed so). Equal keys are a moose the eye can't tell apart: some 16 drawings a
 * second, and every frame of a blink.
 */
export const breath = (p: Record<'body' | 'eye', Pose>) => `${p.body.sy.toFixed(3)},${p.eye.sy.toFixed(2)}`;

/** Samples each side of the rider in its moving average. */
const TAPS = 8;

/** The loop at `s`, averaged over RIDER.smooth world px either way with a triangular weight: a point and a unit direction. */
function smoothed(s: number) {
	let x = 0, y = 0, dx = 0, dy = 0, total = 0;
	for (let i = -TAPS; i <= TAPS; i++) {
		const w = TAPS + 1 - Math.abs(i), a = along(LOOP, s + (i / TAPS) * RIDER.smooth);
		x += w * a.x;
		y += w * a.y;
		dx += w * a.dx;
		dy += w * a.dy;
		total += w;
	}
	const len = Math.hypot(dx, dy);
	return { x: x / total, y: y / total, dx: dx / len, dy: dy / len };
}

/** Where along the loop the rider changes between riding east and riding west: the middle of each turn round. */
export const TURNS = (() => {
	const turns: number[] = [], step = 4;
	for (let s = step, last = smoothed(0).dx; s <= LOOP.length; s += step) {
		const dx = smoothed(s).dx;
		if (Math.sign(dx) !== Math.sign(last)) turns.push(s - step + (step * last) / (last - dx));
		last = dx;
	}
	return turns;
})();

/** How far `a` and `b` are apart round the loop, the shorter way. */
const apart = (a: number, b: number) => Math.abs(((((b - a) % LOOP.length) + 1.5 * LOOP.length) % LOOP.length) - LOOP.length / 2);

/**
 * The rider at server time `t`: the box its rig is fitted into; the way it faces (1 east, -1 west) and its horizontal
 * scale, which passes through 0 as it turns round; its lean, radians about where its wheels meet the ground; its pedal
 * frame; and how far it has ridden since the epoch, which turns its wheels. It rides the whole loop, anticlockwise on
 * screen, at a steady speed. Under reduced motion it rests past the start line facing east, its near pedal down.
 */
export function rider(t: number, rm: boolean) {
	const travelled = rm ? 0 : (t / 1000) * RIDER.speed, s = RIDER.rest + travelled, p = smoothed(s);
	const at = { x: p.x - RIDER.w / 2, y: p.y + RIDER.drop - RIDER.h, w: RIDER.w, h: RIDER.h };
	const facing = p.dx < 0 ? -1 : 1, near = Math.min(...TURNS.map((c) => apart(s, c)));
	const flip = facing * Math.sin((Math.PI / 2) * Math.min(1, near / (RIDER.turn / 2)));
	// Heading north or south it faces the camera side on no longer, so its lean fades as it turns.
	const lean = Math.max(-RIDER.lean, Math.min(RIDER.lean, Math.atan(p.dy / p.dx))) * Math.abs(flip);
	const frame = Math.floor((travelled / RIDER.stride) * RIDER.frames) % RIDER.frames;
	return { at, facing, flip, lean, frame, travelled };
}

/**
 * How far a wheel of `radius` has turned after rolling `distance` (both world px), radians within one turn. The rider's
 * distance counts from the epoch, some 10^11 px, so the whole angle is some 10^10 rad, and Chrome hands a canvas's
 * rotation to its drawing in single-precision degrees, whose steps at that size are 131,072 degrees: the wheels stood
 * still (Joe, 2026-09-30). Taken within one turn here, in double precision, the angle is exact.
 */
export const turned = (distance: number, radius: number) => (distance / radius) % (2 * Math.PI);

/** How long the own cursor takes to glide to its Foundry seat after a poster's click, ms (Joe, 2026-09-29). */
export const SIT_MS = 700;

/** The own cursor on its way from `from` to its seat `to`, `since` ms after the poster's click; there at once under reduced motion. */
export const sitting = (from: Point, to: Point, since: number, rm: boolean): Point => {
	const u = rm ? 1 : ease(progress(since, SIT_MS));
	return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u };
};

/** Which third of the marquee's bulbs is lit, stepping every 150 ms; -1 under reduced motion, every bulb as painted. */
export const chase = (t: number, rm: boolean) => (rm ? -1 : Math.floor(t / 150) % 3);

/** How fast the marquee's letters scroll, world px/s. */
export const SCROLL_SPEED = 45;

/**
 * How far the marquee's letters have scrolled at `t`, in whole world px since the epoch, so every visitor reads the same
 * words; 0 under reduced motion, where the board rests on its first words. The board takes it round its text's length.
 */
export const scrolled = (t: number, rm: boolean) => (rm ? 0 : Math.floor((t / 1000) * SCROLL_SPEED));

/** How far a glint has swept along the bottle row, 0 to 1, for 1.4 s every 7 s; null between sweeps and under reduced motion. */
export const glint = (t: number, rm: boolean) => {
	const u = (t % 7000) / 1400;
	return rm || u > 1 ? null : u;
};

/**
 * The river's ripples (Joe, 2026-09-30, after Cursor Camp's water): pale streaks like the ones painted on it and soft
 * darker patches, each seen for `life` s at a time somewhere new, drifting `drift` world px/s south as it fades in and
 * out. They keep `lane` of the way in from either bank and fade out `clear` world px short of a bank, a deck, anything
 * standing in the water, and the arches' steel over the water north of the Eads deck. They move `fps` times a second.
 */
export const WATER = {
	foam: { n: 40, w: [40, 110], h: [4, 7], life: [3, 6] },
	shade: { n: 20, w: [140, 300], h: [40, 80], life: [5, 9] },
	drift: 30,
	lane: 0.12,
	clear: 40,
	fps: 15
} as const;

/** A ripple, centred at x, y, w by h world px, seen at `a`, 0 to 1. */
export interface Ripple {
	kind: 'foam' | 'shade';
	x: number;
	y: number;
	w: number;
	h: number;
	a: number;
}

/** A hash of `n` to [0, 1): the same for every visitor. */
const rand = (n: number) => {
	let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
	x ^= x >>> 13;
	x = Math.imul(x, 0xc2b2ae35);
	return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** Where row `y` crosses the river's outline first and last, world px: its west and east banks. */
export function banks(mask: Point[], y: number): [number, number] | null {
	let w = Infinity, e = -Infinity;
	for (let i = 0, j = mask.length - 1; i < mask.length; j = i++) {
		const a = mask[i], b = mask[j];
		if (a.y > y === b.y > y) continue;
		const x = a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
		(w = Math.min(w, x)), (e = Math.max(e, x));
	}
	return w < e ? [w, e] : null;
}

/** How far a ripple `half` world px across at `p` is from the nearest thing it keeps clear of, world px. */
function clearance(river: Overworld['river'], p: Point, half: number, [west, east]: [number, number]) {
	let d = Math.min(p.x - half - west, east - p.x - half);
	for (const o of river.obstacles)
		d = Math.min(d, Math.hypot(Math.max(o.x - p.x - half, 0, p.x - half - o.x - o.w), Math.max(o.y - p.y, 0, p.y - o.y - o.h)));
	river.decks.forEach(([tl, tr, br, bl], i) => {
		// North of the first deck, the Eads, the water shows through the arches' steel.
		const top = i ? lineY([tl, tr], p.x) : -Infinity, bottom = lineY([bl, br], p.x);
		d = Math.min(d, p.y < top ? top - p.y : p.y > bottom ? p.y - bottom : 0);
	});
	return d;
}

/** The river's ripples at server time `t` ms; under reduced motion they rest where they are at 0. */
export function ripples(river: Overworld['river'], t: number, rm: boolean): Ripple[] {
	const s = rm ? 0 : Math.floor((t / 1000) * WATER.fps) / WATER.fps, ys = river.mask.map((p) => p.y);
	const north = Math.min(...ys), south = Math.max(...ys), out: Ripple[] = [];
	(['foam', 'shade'] as const).forEach((kind, k) => {
		const { n, w, h, life } = WATER[kind];
		for (let i = 0; i < n; i++) {
			const r = (j: number) => rand(k * 1e6 + i * 1e3 + j), span = life[0] + r(0) * (life[1] - life[0]);
			const u = s / span + r(1), round = Math.floor(u), f = u - round, q = (j: number) => rand(k * 1e6 + i * 1e3 + round * 7919 + j);
			const y = north + q(2) * (south - north) + f * span * WATER.drift, side = banks(river.mask, y);
			if (!side) continue;
			const across = WATER.lane + q(3) * (1 - 2 * WATER.lane), x = side[0] + across * (side[1] - side[0]);
			const ww = w[0] + q(4) * (w[1] - w[0]), hh = h[0] + q(5) * (h[1] - h[0]);
			const a = Math.sin(Math.PI * f) * Math.min(1, Math.max(0, clearance(river, { x, y }, ww / 2, side) / WATER.clear));
			if (a > 0) out.push({ kind, x, y, w: ww * (0.7 + 0.3 * Math.sin(Math.PI * f)), h: hh, a });
		}
	});
	return out;
}

/**
 * The koi in Forest Park's Grand Basin (Joe, 2026-09-30), whose click opens Sushi Stand: `len` world px nose to tail,
 * seen from the map's raised camera, which squashes the water's depth to `fore` of its width; it laps an oval in its swim
 * rect every `period` ms, a little faster and slower in turn, its tail beating every `beat` ms, and leaves a ring on the
 * water every `ring` ms, each spreading for two of them. Under reduced motion it rests at the oval's front, facing west.
 */
export const KOI = { len: 72, fore: 0.55, period: 16_000, surge: 7_300, beat: 620, ring: 1_200 } as const;

/** Where the koi is in its `swim` rect at `t`: its middle, its heading on the water, its tail's swing, and its rings. */
export function koi(swim: Rect, t: number, rm: boolean) {
	const cx = swim.x + swim.w / 2, cy = swim.y + swim.h / 2, rx = swim.w / 2 - KOI.len * 0.6, ry = swim.h / 2 - KOI.len * 0.23;
	// Phases taken within one period in double precision, as `turned` explains.
	const at = (t: number) => (rm ? Math.PI / 2 : 2 * Math.PI * ((t % KOI.period) / KOI.period) + 0.25 * Math.sin((2 * Math.PI * (t % KOI.surge)) / KOI.surge));
	const place = (t: number) => ({ x: cx + rx * Math.cos(at(t)), y: cy + ry * Math.sin(at(t)) });
	const a = at(t), heading = Math.atan2((ry * Math.cos(a)) / KOI.fore, -rx * Math.sin(a));
	const wag = rm ? 0 : 0.3 * Math.sin((2 * Math.PI * (t % KOI.beat)) / KOI.beat);
	const rings = rm
		? []
		: [0, 1].map((k) => {
				const from = Math.floor(t / KOI.ring) * KOI.ring - k * KOI.ring, age = (t - from) / (2 * KOI.ring);
				return { ...place(from), r: 6 + 22 * age, a: 0.45 * (1 - age) };
			});
	return { ...place(t), heading, wag, rings };
}
