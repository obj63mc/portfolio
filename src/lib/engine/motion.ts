// Prop motion and reactions (buildout ticket 15) as pure functions of time and state, for the props module and for tests:
// ambient motion (the moose breathing and blinking, the rider round the park's lake loop, the marquee's bulbs chasing,
// a glint along the Side Project bottles), hover and click reactions, and what reduced motion leaves of them. Times are
// ms. Ambient motion runs on server time, so every visitor in a room sees the rider at the same point. Carried over from
// the rendering prototype's props.ts and the art workshop's drawRig (art/review.js).
import { LOOP, along } from './track.ts';

/** A hover fades in and out over this long; under reduced motion it is a plain highlight, on and off at once. */
export const HOVER_MS = 150;

/** How long each click reaction runs: most props pop, the moose's antlers wobble, the MonsterCommerce eye blinks. */
export const CLICK_MS = { pop: 300, wobble: 1200, blink: 250 } as const;

/**
 * The rider on the Carondelet lake loop (buildout ticket 18): the size of the box its rig is fitted into, its wheels on
 * the ground `drop` below the path's centreline, on the near half; its speed, world px/s; and where it rests under
 * reduced motion, world px along the loop past the start line (art/manifest.json sceneLayouts places it there).
 */
export const RIDER = { w: 120, h: 85, drop: 12, speed: 200, rest: 100 };

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
 * The rider at server time `t`: the box its rig is fitted into, the way it faces (1 east, -1 west), and how far it has
 * ridden since the epoch, which turns its wheels. It rides the whole loop, anticlockwise on screen, at a steady speed.
 * Under reduced motion it rests past the start line facing east.
 */
export function rider(t: number, rm: boolean) {
	const travelled = rm ? 0 : (t / 1000) * RIDER.speed, p = along(LOOP, RIDER.rest + travelled);
	const at = { x: p.x - RIDER.w / 2, y: p.y + RIDER.drop - RIDER.h, w: RIDER.w, h: RIDER.h };
	return { at, facing: p.dx < 0 ? -1 : 1, travelled };
}

/** Which third of the marquee's bulbs is lit, stepping every 150 ms; -1 under reduced motion, every bulb as painted. */
export const chase = (t: number, rm: boolean) => (rm ? -1 : Math.floor(t / 150) % 3);

/** How far a glint has swept along the bottle row, 0 to 1, for 1.4 s every 7 s; null between sweeps and under reduced motion. */
export const glint = (t: number, rm: boolean) => {
	const u = (t % 7000) / 1400;
	return rm || u > 1 ? null : u;
};
