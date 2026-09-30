// The sound engine (spec: "Sound"): plain Web Audio in one module beside the saved state, through which it reads and writes
// the Sound toggle's choice. The Join press creates and resumes the context; the toggle suspends it and resumes it inside
// its own press; a hidden tab suspends it and the Resume press brings it back, iOS's interruption included. One-shots
// (buildout ticket 22) play through a small pool of voices, their buffers fetched for the scene the visitor is in, or a
// door they are about to take, and let go a minute after that scene is left (sound.ts). The beds, the theme and the
// scenes' music (ticket 21) are loops (loops.ts): each a gain the engine's every frame sets from the camera's centre and
// the scene, eased so nothing pops, over passes that overlap (a bed's at equal power, music's at equal gain); paused,
// all of them duck to 30 percent together. Nothing is fetched before Join or while muted, and a failed fetch is silence.
import FILES from './sound-files.json';
import { LEVEL, OVERLAP, envelope, fadeOf, gains, leavingGains, loopsFor, loopsNeeded, nextPass, playhead, type Fade, type LoopId } from './loops.ts';
import { KEY } from './saved.ts';
import { saved } from './saved.svelte.ts';
import { LINGER, needed, stale, type SoundId } from './sound.ts';
import type { Overworld, Point, SubScene } from './scenes/types';

type Scene = Overworld | SubScene;
type AudioId = SoundId | LoopId;

declare global {
	interface Navigator {
		/** How the page's audio mixes with the visitor's own: iOS Safari 16.4 on, absent elsewhere. */
		audioSession?: { type: string };
	}
}

/** At most this many one-shots sound at once; a new one stops the oldest. */
const VOICES = 8;
/**
 * How quickly a loop's gain follows its target, s (a time constant: most of the way in three of them): the camera's
 * crossfade, a scene fading out as the iris closes on the door (450 ms) and the next fading in as it opens (600 ms).
 */
const EASE = { camera: 0.08, closing: 0.15, opening: 0.2 } as const;
/** A pass is scheduled this long, s, before it starts. */
const AHEAD = 1.5;

let ctx: AudioContext | null = null;
/** Everything heard goes through here. */
let master: GainNode | null = null;
/** The beds, the theme and the music, which a pause ducks together; the one-shots go straight to `master`. */
let ambience: GainNode | null = null;
/** From the Join press on: before it nothing is fetched or played. */
let joined = false;
/** The scene the visitor is in, and the camera's centre on it at the last frame (world px). */
let current: Scene | null = null;
let centre: Point = { x: 0, y: 0 };
/**
 * Between scenes: settled, the loops following the camera; leaving through a door as its iris closes, fading with it
 * (loops.ts `leavingGains`); or opening on the next scene, eased with its iris until `until` (context s).
 */
let passage: { is: 'settled' } | { is: 'leaving'; to: Scene | undefined } | { is: 'opening'; until: number } = { is: 'settled' };
/** The choice this tab last applied, so another tab's write that leaves it alone changes nothing here. */
let applied = saved.sound;
/** A buffer: being fetched, under the signal that calls the fetch off, or decoded and ready to play. */
type Buffer = { is: 'loading'; signal: AbortSignal } | { is: 'ready'; buffer: AudioBuffer };
const buffers = new Map<AudioId, Buffer>();
/** When each buffer stopped being needed (performance ms): its scene left, a door not taken, or a bed the camera left. */
const left = new Map<AudioId, number>();
/** The loops the camera needed at the last frame, to see which it has just moved away from. */
let wanted: ReadonlySet<LoopId> = new Set();
/** The ambience's gain, 1 or ducked for a pause, as last set. */
let ambienceLevel = 1;
/** Aborted when the visitor mutes, which stops every fetch in flight. */
let fetches = new AbortController();
const voices: AudioBufferSourceNode[] = [];
/**
 * Videos that play with their own sound beside the context, the Foundry screen's and the meeting TV's: they follow the
 * toggle and a hidden tab too. A browser pauses a video unmuted outside a press, so only a press unmutes them.
 */
const media = new Set<HTMLMediaElement>();

/** The videos muted while the toggle is off or the tab hidden; `press` is a press, which may also unmute them. */
function hush(press: boolean) {
	const muted = !saved.sound || document.hidden;
	for (const m of media) if (muted || press) m.muted = muted;
}

/** A sound's URL from the generated map (`npm run audio`); none until it is sourced, and then it is silent. */
function url(id: AudioId) {
	const u: unknown = (FILES as Record<string, unknown>)[id];
	return typeof u === 'string' ? u : undefined;
}

const ready = (id: AudioId) => {
	const b = buffers.get(id);
	return b?.is === 'ready' ? b.buffer : null;
};

/**
 * One loop: a gain the engine sets every frame, over passes of its buffer that each overlap the next by OVERLAP s
 * (loops.ts `envelope`), scheduled a little ahead. Silent for a moment, it stops and keeps its place, so it starts again
 * where it left off: the theme comes back from a sub-scene with music at the playhead it left.
 */
class Loop {
	readonly gain: GainNode;
	private c: AudioContext;
	/** How its passes cross (loops.ts `fadeOf`). */
	private fade: Fade;
	/** Stopped where it was in its period (s); or playing its passes, the latest last. */
	private run: { is: 'stopped'; at: number } | { is: 'playing'; passes: { at: number; offset: number; source: AudioBufferSourceNode }[] } = {
		is: 'stopped',
		at: 0
	};
	private target = 0;
	/** When its target went to 0, context s. */
	private quietSince = 0;

	constructor(c: AudioContext, out: AudioNode, fade: Fade) {
		this.c = c;
		this.fade = fade;
		this.gain = new GainNode(c, { gain: 0 });
		this.gain.connect(out);
	}

	/** One frame at context time `now`: the gain eased toward `target` over `tc` s, passes scheduled, stopped once silent. */
	step(buffer: AudioBuffer | null, target: number, tc: number, now: number) {
		if (target !== this.target) {
			this.gain.gain.setTargetAtTime(target, now, tc);
			if (!target) this.quietSince = now;
			this.target = target;
		}
		const r = this.run;
		if (r.is === 'stopped') {
			if (target > 0 && buffer) this.run = { is: 'playing', passes: [this.pass(buffer, now + 0.02, r.at)] };
			return;
		}
		const last = r.passes[r.passes.length - 1], P = period(last.source);
		// Faded out (five time constants is under 1 percent), it stops and remembers where it was.
		if (!target && now - this.quietSince > 5 * tc) return this.stop(now);
		const next = nextPass(last.at, last.offset, P);
		if (buffer && now > next - AHEAD) r.passes = [...r.passes.filter((p) => now < nextPass(p.at, p.offset, P) + OVERLAP), this.pass(buffer, next, 0)];
	}

	/** A pass of `buffer` starting at context time `at`, `offset` s in, faded in and out on its envelope. */
	private pass(buffer: AudioBuffer, at: number, offset: number) {
		const e = envelope(offset, buffer.duration - OVERLAP, this.fade), g = new GainNode(this.c, { gain: e.in.curve[0] });
		g.gain.setValueCurveAtTime(e.in.curve, at, e.in.duration);
		g.gain.setValueCurveAtTime(e.out.curve, at + e.out.at, e.out.duration);
		const source = new AudioBufferSourceNode(this.c, { buffer });
		source.connect(g).connect(this.gain);
		source.onended = () => g.disconnect();
		source.start(at, offset);
		return { at, offset, source };
	}

	private stop(now: number) {
		const r = this.run;
		if (r.is !== 'playing') return;
		const on = r.passes.filter((p) => p.at <= now).at(-1) ?? r.passes[0], P = period(on.source);
		for (const p of r.passes) p.source.stop();
		this.run = { is: 'stopped', at: now < on.at ? on.offset : playhead(on.at, on.offset, now, P) };
	}
}

/** A loop's period, s: its file less the OVERLAP s past it that the next pass fades in over. */
const period = (source: AudioBufferSourceNode) => source.buffer!.duration - OVERLAP;

const loops = new Map<LoopId, Loop>();

/** Inside a press: the context made the first time, and resumed from the toggle, a hidden tab or iOS's interruption. */
function wake() {
	if (!ctx) {
		// iOS: an ambient session respects the silent switch and mixes with the visitor's own audio (Safari 16.4 on).
		if (navigator.audioSession) navigator.audioSession.type = 'ambient';
		ctx = new AudioContext();
		master = ctx.createGain();
		master.connect(ctx.destination);
		ambience = ctx.createGain();
		ambience.connect(master);
	}
	if (ctx.state !== 'running') ctx.resume().catch(() => {});
}

/** Fetches and decodes the sounds not yet held; nothing before Join or while muted. */
function load(ids: Iterable<AudioId>) {
	const c = ctx, { signal } = fetches;
	if (!c || !joined || !saved.sound) return;
	for (const id of ids) {
		const u = url(id);
		if (!u || buffers.has(id)) continue;
		const loading: Buffer = { is: 'loading', signal };
		buffers.set(id, loading);
		fetch(u, { signal })
			.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${u}: ${r.status}`))))
			.then((data) => c.decodeAudioData(data))
			.then(
				(buffer) => void (buffers.get(id) === loading && buffers.set(id, { is: 'ready', buffer })),
				// Silence, and fetched again when a scene next needs it.
				() => void (buffers.get(id) === loading && buffers.delete(id))
			);
	}
}

/** Everything the visitor's scene needs now: its one-shots, and the loops for the camera's place in it. */
const need = (): ReadonlySet<AudioId> => (current ? new Set<AudioId>([...needed(current), ...loopsNeeded(current, centre)]) : new Set());

/** Lets go of the buffers the visitor's scene doesn't need that were left behind a minute ago. */
function sweep() {
	for (const id of stale(left, need(), performance.now())) {
		buffers.delete(id);
		left.delete(id);
	}
}

/** Muted: every voice stopped, every fetch in flight aborted, the context suspended; the loops hold where they are. */
function mute() {
	for (const v of voices.splice(0)) v.stop();
	fetches.abort();
	fetches = new AbortController();
	for (const [id, b] of buffers) if (b.is === 'loading') buffers.delete(id);
	ctx?.suspend().catch(() => {});
}

/** The toggle's choice, pressed here or written by another tab, applied once joined; a hidden tab stays suspended. */
function apply() {
	applied = saved.sound;
	if (!joined) return;
	if (!saved.sound) return mute();
	if (document.hidden) return;
	wake();
	load(need());
}

if (typeof window !== 'undefined') {
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) return;
		ctx?.suspend().catch(() => {});
		hush(false);
	});
	// The saved state heard the event first: it listened from its module's load.
	addEventListener('storage', (e) => {
		if (e.key !== KEY || saved.sound === applied) return;
		apply();
		hush(false);
	});
}

export const sound = {
	/** The Join press: the context is made and resumed inside it, unless the visitor muted, and the scene's sounds load. */
	join() {
		joined = true;
		apply();
	},
	/** The Resume press: a context a hidden tab suspended, or iOS interrupted, resumes inside it. */
	resume() {
		if (joined && saved.sound) wake();
		hush(true);
	},
	/** The Sound toggle's press: the choice flips and is saved, and the context follows it inside the press. */
	toggle() {
		saved.sound = !saved.sound;
		apply();
		hush(true);
	},
	/** Whether a video with its own sound starts muted: the toggle off, or the tab hidden. */
	get muted() {
		return !saved.sound || document.hidden;
	},
	/** A video with its own sound, which then follows the toggle and a hidden tab (`hush`). */
	media(el: HTMLMediaElement) {
		media.add(el);
		if (this.muted) el.muted = true;
	},
	/**
	 * Leaving for `to` through a door, as the iris closes on it (ticket 11): the scene's beds fade out and the theme goes
	 * toward its level there, gone into a sub-scene with music of its own.
	 */
	leave(to: Scene | undefined) {
		passage = { is: 'leaving', to };
	},
	/**
	 * Each scene the engine shows: its sounds load, those the last scene needed are let go a minute later unless needed
	 * here, and its loops fade in as the iris opens, the theme keeping its place.
	 */
	scene(scene: Scene) {
		const now = performance.now();
		for (const id of need()) left.set(id, now);
		current = scene;
		passage = { is: 'opening', until: (ctx?.currentTime ?? 0) + 3 * EASE.opening };
		if (joined && saved.sound) load(need());
		setTimeout(sweep, LINGER);
	},
	/** A door to `scene` hovered or focused: its sounds load ahead of the hop, and go a minute later if it isn't taken. */
	preload(scene: Scene) {
		if (!current || scene === current) return;
		const here = need(), now = performance.now();
		const ahead = [...needed(scene), ...loopsFor(scene)].filter((id) => !here.has(id) && !buffers.has(id));
		if (!ahead.length || !joined || !saved.sound) return;
		for (const id of ahead) left.set(id, now);
		load(ahead);
		setTimeout(sweep, LINGER);
	},
	/**
	 * Every frame of the engine's loop: the camera's centre on the scene (world px), whether the visitor is paused and
	 * whether the Foundry's screen is playing; a prop's video playing is one of the videos this module follows. Beds near
	 * the camera load, those it moved away from go a minute later, and every loop's gain follows (loops.ts `gains`).
	 */
	step(frame: { centre: Point; paused: boolean; screen: boolean }) {
		centre = frame.centre;
		const scene = current;
		if (!scene || !joined || !saved.sound) return;
		const want = loopsNeeded(scene, centre), now = performance.now();
		if ([...want].some((id) => !wanted.has(id)) || [...wanted].some((id) => !want.has(id))) {
			for (const id of wanted) if (!want.has(id)) left.set(id, now);
			for (const id of want) left.delete(id);
			if ([...wanted].some((id) => !want.has(id))) setTimeout(sweep, LINGER);
			wanted = want;
			load(want);
		}
		const c = ctx;
		if (!c || !ambience || c.state !== 'running') return;
		const t = c.currentTime;
		if (passage.is === 'opening' && t >= passage.until) passage = { is: 'settled' };
		const tc = passage.is === 'leaving' ? EASE.closing : passage.is === 'opening' ? EASE.opening : EASE.camera;
		const level = frame.paused ? LEVEL.paused : 1;
		if (level !== ambienceLevel) ambience.gain.setTargetAtTime((ambienceLevel = level), t, 0.1);
		const s = { screen: frame.screen, video: [...media].some((m) => !m.paused && !m.ended) }, here = gains(scene, centre, s);
		const target = passage.is === 'leaving' ? leavingGains(here, passage.to, s) : here;
		for (const id of new Set<LoopId>([...target.keys(), ...loops.keys()])) {
			// In hundredths, so a slow pan sets a new target when it is heard, not every frame.
			const buffer = ready(id), g = Math.round((target.get(id) ?? 0) * 100) / 100;
			let loop = loops.get(id);
			if (!loop) {
				if (!g || !buffer) continue;
				loops.set(id, (loop = new Loop(c, ambience, fadeOf(id))));
			}
			loop.step(buffer, g, tc, t);
		}
	},
	/**
	 * Plays a one-shot from `offset` seconds in; false when it can't: before Join, muted, suspended, or not loaded (yet, or
	 * ever, if its fetch failed or it isn't sourced).
	 */
	play(id: SoundId, offset = 0) {
		const b = ready(id);
		if (!ctx || !master || ctx.state !== 'running' || !saved.sound || !b) return false;
		const v = new AudioBufferSourceNode(ctx, { buffer: b });
		v.connect(master);
		v.onended = () => {
			const i = voices.indexOf(v);
			if (i >= 0) voices.splice(i, 1);
			v.disconnect();
		};
		if (voices.push(v) > VOICES) voices.shift()!.stop();
		v.start(0, offset);
		return true;
	},
	/** A one-shot's length, ms, once it is loaded. */
	length(id: SoundId) {
		const b = ready(id);
		return b ? b.duration * 1000 : undefined;
	}
};
