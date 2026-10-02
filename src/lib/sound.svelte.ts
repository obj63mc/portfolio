// The sound engine (spec: "Sound"): plain Web Audio in one module beside the saved state, through which it reads and writes
// the Sound toggle's choice. The Join press creates and resumes the context; the toggle suspends it and resumes it inside
// its own press; a hidden tab suspends it and the Resume press brings it back, iOS's interruption included. One-shots
// (buildout ticket 22) play through a small pool of voices, their buffers fetched for the scene the visitor is in, or a
// door they are about to take, and let go a minute after that scene is left (sound.ts). The beds, the theme and the
// scenes' music (ticket 21) are loops (loops.ts): each a gain the engine's every frame sets from the camera's centre and
// the scene, eased so nothing pops, over passes that overlap (a bed's at equal power, music's at equal gain); paused,
// all of them duck to 30 percent together. A bed plays from its decoded buffer; the theme and the music are streamed
// (Joe, 2026-10-01), each from audio elements of a small pool, through the same gains. Nothing is fetched before Join or
// while muted, and a failed fetch is silence.
import FILES from './sound-files.json';
import {
	CROSS, GAME_LOOPS, LEVEL, OVERLAP, SLOWEST, envelope, fadeOf, gameGains, gains, latencyAfter, leavingGains, loopsFor, loopsNeeded, nextPass, playhead, startIn, streamed,
	type Fade, type LoopId, type MusicId
} from './loops.ts';
import { KEY } from './saved.ts';
import { saved } from './saved.svelte.ts';
import { GAME_SOUNDS, LINGER, ONE_SHOTS, needed, stale, type SoundId } from './sound.ts';
import type { GameId } from './scenes/overworld.ts';
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
/** A pass is scheduled this long, s, before it starts; a streamed one is made ready then. */
const AHEAD = 1.5;
/**
 * The audio elements the streamed music plays from, as many as it can need at once: two pieces, one fading out as the
 * other fades in across a door, each at its seam with a pass on two.
 */
const DECKS = 4;

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
 * A game (Joe, 2026-09-30), up without a scene or the engine's frames: which, whether its bed is on, and the timer that
 * steps its loops in their place.
 */
let game: { id: GameId; service: boolean; timer: ReturnType<typeof setInterval> } | null = null;
/** How often the game steps its loops, ms: well inside a pass's scheduling lead. */
const GAME_STEP = 250;
/**
 * Between scenes: settled, the loops following the camera; leaving through a door as its iris closes, fading with it
 * (loops.ts `leavingGains`); or opening on the next scene, eased with its iris until `until` (context s).
 */
let passage: { is: 'settled' } | { is: 'leaving'; to: Scene | undefined } | { is: 'opening'; until: number } = { is: 'settled' };
/** The choice this tab last applied, so another tab's write that leaves it alone changes nothing here. */
let applied = saved.sound;
/**
 * A sound held: being fetched, under the signal that calls the fetch off; decoded and ready to play; or, streamed music,
 * its file as it came, at a URL an audio element plays it from.
 */
type Buffer = { is: 'loading'; signal: AbortSignal } | { is: 'ready'; buffer: AudioBuffer } | { is: 'file'; url: string };
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

/** A streamed piece's file, once it is fetched. */
const file = (id: MusicId) => {
	const b = buffers.get(id);
	return b?.is === 'file' ? b.url : null;
};

/**
 * One bed: a gain the engine sets every frame, over passes of its buffer that each overlap the next by OVERLAP s
 * (loops.ts `envelope`), scheduled a little ahead. Silent for a moment, it stops and keeps its place, so it starts again
 * where it left off.
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
			if (target > 0 && buffer) this.resume(buffer, now + 0.02, r.at);
			return;
		}
		const last = r.passes[r.passes.length - 1], P = period(last.source);
		// Faded out (five time constants is under 1 percent), it stops and remembers where it was.
		if (!target && now - this.quietSince > 5 * tc) return this.stop(now);
		const next = nextPass(last.at, last.offset, P);
		if (buffer && now > next - AHEAD) r.passes = [...r.passes.filter((p) => now < nextPass(p.at, p.offset, P) + OVERLAP), this.pass(buffer, next, 0)];
	}

	/**
	 * Playing again from `offset` s in, at context time `at`; a pass the browser refuses (a schedule it won't take) is
	 * logged and the loop starts from the top on the next frame instead, so no loop ever throws frame after frame.
	 */
	private resume(buffer: AudioBuffer, at: number, offset: number) {
		try {
			this.run = { is: 'playing', passes: [this.pass(buffer, at, offset)] };
		} catch (err) {
			this.run = { is: 'stopped', at: 0 };
			console.error(err);
		}
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

/**
 * An audio element of the pool and its place in the graph, its sound through `g`, which a pass fades: free, or taken
 * by a stream until `use` is aborted, which ends its listeners. `wanted` while it should be sounding, which a mute or a
 * hidden tab pauses and a press or the next frame starts again; `starting` while a play is yet to be answered.
 */
interface Deck {
	el: HTMLAudioElement;
	/** The element's sound in the graph, held here so it lives as long as the element. */
	node: MediaElementAudioSourceNode;
	g: GainNode;
	use: AbortController | null;
	wanted: boolean;
	starting: boolean;
	/** Its fade in, context s: from silence at `from` to full `over` s on. */
	fade: { from: number; over: number };
}

const decks: Deck[] = [];
/** How many presses have woken the context: a stream whose play the browser refused tries again after the next. */
let presses = 0;
/**
 * How long an element takes to sound once it is told to play, s: measured each time a piece begins, and again from how
 * far off each seam's next pass was (loops.ts `latencyAfter`).
 */
let latency = 0;

/**
 * Calls `then` once a deck that has said it is playing is: Safari says so a tenth of a second before the element's clock
 * moves, Chrome as it does. With how long that was, s; none if it was paused meanwhile, or never moved.
 */
function sounding(deck: Deck, then: (waited: number | null) => void) {
	const { el } = deck, from = performance.now(), was = el.currentTime;
	const timer = setInterval(() => {
		const waited = (performance.now() - from) / 1000, moved = el.currentTime - was;
		if (!moved && !el.paused && waited < 4 * SLOWEST) return;
		clearInterval(timer);
		then(moved > 0 ? Math.max(0, waited - moved) : null);
	}, 10);
	deck.use!.signal.addEventListener('abort', () => clearInterval(timer));
}

/** A free deck, its sound into `out`; none while all are taken, and the stream that asked waits. */
function take(out: AudioNode): Deck | null {
	const deck = decks.find((d) => !d.use);
	if (!deck) return null;
	deck.use = new AbortController();
	deck.fade = { from: 0, over: 0 };
	deck.g.gain.cancelScheduledValues(0);
	deck.g.gain.value = 0;
	deck.g.connect(out);
	return deck;
}

/** A deck given back: paused, its file let go, silent and out of the graph. */
function release(deck: Deck) {
	deck.use?.abort();
	deck.use = null;
	deck.wanted = deck.starting = false;
	deck.el.pause();
	deck.el.removeAttribute('src');
	deck.el.load();
	deck.g.disconnect();
}

/** A deck told to play; a refusal, which a browser gives an element no press has touched, is left to `refused`. */
function play(deck: Deck, refused: () => void) {
	deck.wanted = deck.starting = true;
	deck.el.play().then(
		() => void (deck.starting = false),
		(e: unknown) => {
			deck.starting = false;
			if (e instanceof DOMException && e.name === 'NotAllowedError') refused();
		}
	);
}

/**
 * One piece of music, streamed: a gain the engine sets every frame, like a loop's, over passes that an audio element
 * each plays from the piece's file, the next started on a second element as the last reaches its period and crossed
 * into over CROSS s at equal power (loops.ts). Silent for a moment, it stops, gives its elements back and keeps its place,
 * so the theme comes back from a sub-scene with music at the playhead it left.
 */
class Stream {
	readonly gain: GainNode;
	private c: AudioContext;
	/**
	 * Stopped where it was in its period (s); or playing the pass on `on`, and from AHEAD s before its period the `next`:
	 * made ready, then started by its `timer`, then crossed into until context time `until`.
	 */
	private run: { is: 'stopped'; at: number } | { is: 'playing'; on: Deck; next?: { deck: Deck; timer?: ReturnType<typeof setTimeout>; started: boolean; until?: number } } = {
		is: 'stopped',
		at: 0
	};
	private target = 0;
	/** When its target went to 0, context s. */
	private quietSince = 0;
	/** The press count when a play was last refused: nothing is played again until another press. */
	private refused = -1;

	constructor(c: AudioContext, out: AudioNode) {
		this.c = c;
		this.gain = new GainNode(c, { gain: 0 });
		this.gain.connect(out);
	}

	/** One frame at context time `now`, as a loop's: `url` is the piece's file, none until it is fetched. */
	step(url: string | null, target: number, tc: number, now: number) {
		if (target !== this.target) {
			this.gain.gain.setTargetAtTime(target, now, tc);
			if (!target) this.quietSince = now;
			this.target = target;
		}
		const r = this.run;
		if (r.is === 'stopped') {
			const deck = target > 0 && url && this.refused !== presses ? take(this.gain) : null;
			if (deck) (this.run = { is: 'playing', on: deck }), this.begin(deck, url!, r.at);
			return;
		}
		if (!target && now - this.quietSince > 5 * tc) return this.stop();
		const { on, next } = r, P = on.el.duration - OVERLAP;
		// A file the browser can't play is silence, and isn't tried again until a press.
		if (on.el.error || next?.deck.el.error) return (this.refused = presses), this.stop();
		// Paused by a mute or a hidden tab and back, or refused and pressed since: on from where it was.
		if (this.refused !== presses) for (const d of [on, next?.deck]) if (d?.wanted && d.el.paused && !d.el.ended && !d.starting) play(d, () => (this.refused = presses));
		if (next) {
			// Crossed: the last pass's element goes back, and the next is the pass playing.
			if (next.until !== undefined && now >= next.until) release(on), (this.run = { is: 'playing', on: next.deck });
			// Held before it started, its timer with it: set again from where the pass playing now is.
			else if (!next.started && next.timer === undefined && !on.el.paused) next.timer = setTimeout(() => this.cross(), startIn(on.el.currentTime, P, latency));
			return;
		}
		// The pass ran out with nothing to follow it, its file gone or every element taken: from the top, when it can.
		if (on.el.ended) return release(on), void (this.run = { is: 'stopped', at: 0 });
		if (!url || !(P - on.el.currentTime < AHEAD)) return;
		const deck = take(this.gain);
		if (!deck) return;
		deck.el.src = url;
		r.next = { deck, started: false };
	}

	/** A mute or a hidden tab: its elements pause where they are, and a pass yet to start waits. */
	hold() {
		const r = this.run;
		if (r.is !== 'playing') return;
		if (r.next) clearTimeout(r.next.timer), (r.next.timer = undefined);
		for (const d of [r.on, r.next?.deck]) d?.el.pause();
	}

	/** The first pass, or the one that picks up `offset` s in: faded in from silence as it sounds, as a loop's is. */
	private begin(deck: Deck, url: string, offset: number) {
		const { el } = deck, signal = deck.use!.signal;
		el.src = url;
		el.addEventListener(
			'playing',
			() => {
				this.fade(deck, envelope(offset, 0, 'gain').in.duration);
				// How long this browser's elements take to sound, for the seams to come.
				sounding(deck, (waited) => void (waited !== null && waited <= SLOWEST && (latency = waited)));
			},
			{ once: true, signal }
		);
		const go = () => {
			if (offset) el.currentTime = offset;
			// Muted or hidden while its file was read: it waits, as a held pass does, for the frame that plays it.
			if (this.c.state !== 'running') return void (deck.wanted = true);
			play(deck, () => (this.refused = presses));
		};
		// A place in the file can be set only once the browser knows the file.
		if (offset && el.readyState < HTMLMediaElement.HAVE_METADATA) el.addEventListener('loadedmetadata', go, { once: true, signal });
		else go();
	}

	/** A deck's pass in from silence over `over` s, from now. */
	private fade(deck: Deck, over: number) {
		const t = this.c.currentTime;
		deck.fade = { from: t, over };
		deck.g.gain.setValueAtTime(0, t);
		deck.g.gain.linearRampToValueAtTime(1, t + over);
	}

	/** The next pass, started; once it sounds the two cross, and how far off it was sets the lead the next one is given. */
	private cross() {
		const r = this.run;
		if (r.is !== 'playing' || !r.next || r.next.started) return;
		const { on, next } = r, { deck } = next, signal = deck.use!.signal;
		next.timer = undefined;
		next.started = true;
		deck.el.addEventListener(
			'playing',
			() =>
				sounding(deck, () => {
					const t = this.c.currentTime, past = on.el.currentTime - (on.el.duration - OVERLAP);
					if (!on.el.paused && !deck.el.paused) latency = latencyAfter(latency, past - deck.el.currentTime);
					// Over CROSS s, or what is left of the last pass's overlap if the start was slow; the last pass out from the
					// level its own fade in has reached, full unless it began a moment ago.
					const over = Math.min(CROSS, Math.max(0.05, OVERLAP - past)), f = on.fade, level = f.over ? Math.min(1, Math.max(0, (t - f.from) / f.over)) : 1;
					const e = envelope(0, 0, 'power');
					on.g.gain.cancelScheduledValues(t);
					on.g.gain.setValueCurveAtTime(e.out.curve.map((v) => v * level), t, over);
					deck.g.gain.cancelScheduledValues(t);
					deck.g.gain.setValueCurveAtTime(e.in.curve, t, over);
					deck.fade = { from: t, over };
					next.until = t + over;
				}),
			{ once: true, signal }
		);
		play(deck, () => (this.refused = presses));
	}

	private stop() {
		const r = this.run;
		if (r.is !== 'playing') return;
		// Where the pass heard is: the next one, once the two have begun to cross.
		const { el } = r.next?.until !== undefined ? r.next.deck : r.on, P = el.duration - OVERLAP;
		const at = el.ended || el.error || !(P > 0) ? 0 : el.currentTime % P;
		clearTimeout(r.next?.timer);
		for (const d of [r.on, r.next?.deck]) if (d) release(d);
		this.run = { is: 'stopped', at };
	}
}

const streams = new Map<MusicId, Stream>();

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
		// The streamed music's elements, made and loaded inside this press: iOS plays an element later, outside a press,
		// only if a press has touched it (as Howler's pool is unlocked).
		for (let i = 0; i < DECKS; i++) {
			const el = new Audio(), g = new GainNode(ctx, { gain: 0 });
			el.preload = 'auto';
			el.load();
			const node = new MediaElementAudioSourceNode(ctx, { mediaElement: el });
			node.connect(g);
			decks.push({ el, node, g, use: null, wanted: false, starting: false, fade: { from: 0, over: 0 } });
		}
	}
	presses++;
	if (ctx.state !== 'running') ctx.resume().catch(() => {});
	// A piece a mute, a hidden tab or iOS paused plays on from inside the press.
	for (const d of decks) if (d.wanted && d.el.paused && !d.el.ended && !d.starting) play(d, () => {});
}

const ONE_SHOT: ReadonlySet<AudioId> = new Set(ONE_SHOTS);

/**
 * Fetches the sounds not yet held, and decodes them, but the streamed music, whose file is kept as it came for an audio
 * element to play: fetched here and not by the element, which asks a host for byte ranges that this one doesn't answer,
 * so the fetch is still one a mute calls off, made once, and at this priority. Nothing before Join or while muted. The
 * loops, megabytes between them (the theme alone is two), are asked for at low priority, so they come after the scene's
 * pictures and the one-shots, a few kilobytes each, and fade in when they arrive.
 */
function load(ids: Iterable<AudioId>) {
	const c = ctx, { signal } = fetches;
	if (!c || !joined || !saved.sound) return;
	for (const id of ids) {
		const u = url(id);
		if (!u || buffers.has(id)) continue;
		const loading: Buffer = { is: 'loading', signal };
		buffers.set(id, loading);
		fetch(u, { signal, priority: ONE_SHOT.has(id) ? 'auto' : 'low' })
			.then((r): Promise<Buffer> => {
				if (!r.ok) return Promise.reject(new Error(`${u}: ${r.status}`));
				if (streamed(id)) return r.blob().then((data) => ({ is: 'file', url: URL.createObjectURL(data) }));
				return r.arrayBuffer().then((data) => c.decodeAudioData(data)).then((buffer) => ({ is: 'ready', buffer }));
			})
			.then(
				(held) => {
					if (buffers.get(id) === loading) buffers.set(id, held);
					else if (held.is === 'file') URL.revokeObjectURL(held.url); // muted while it came
				},
				// Silence, and fetched again when a scene next needs it.
				() => void (buffers.get(id) === loading && buffers.delete(id))
			);
	}
}

/** Everything the visitor's scene needs now: its one-shots, and the loops for the camera's place in it. */
const need = (): ReadonlySet<AudioId> =>
	game ? new Set<AudioId>([...GAME_SOUNDS[game.id], ...Object.values(GAME_LOOPS[game.id])])
	: current ? new Set<AudioId>([...needed(current), ...loopsNeeded(current, centre)])
	: new Set();

/** Lets go of the buffers the visitor's scene doesn't need that were left behind a minute ago. */
function sweep() {
	for (const id of stale(left, need(), performance.now())) {
		const b = buffers.get(id);
		// A piece not needed for a minute has long faded out and given its elements back.
		if (b?.is === 'file') URL.revokeObjectURL(b.url);
		buffers.delete(id);
		left.delete(id);
	}
}

/** The context suspended, by a mute or a hidden tab: the loops hold where they are, and the streamed music's elements pause. */
function suspend() {
	ctx?.suspend().catch(() => {});
	for (const s of streams.values()) s.hold();
}

/** Muted: every voice stopped, every fetch in flight aborted, the context suspended; the loops hold where they are. */
function mute() {
	for (const v of voices.splice(0)) v.stop();
	fetches.abort();
	fetches = new AbortController();
	for (const [id, b] of buffers) if (b.is === 'loading') buffers.delete(id);
	suspend();
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
		suspend();
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
		this.game(null);
		const now = performance.now();
		for (const id of need()) left.set(id, now);
		current = scene;
		passage = { is: 'opening', until: (ctx?.currentTime ?? 0) + 3 * EASE.opening };
		if (joined && saved.sound) load(need());
		setTimeout(sweep, LINGER);
	},
	/**
	 * A game up, or none: its sounds load, the last scene's are let go a minute later, and its loops fade in as the
	 * page opens and step on a timer, since the engine draws no frames while it is up.
	 */
	game(up: GameId | null) {
		if (up === (game?.id ?? null)) return;
		const now = performance.now();
		for (const id of need()) left.set(id, now);
		if (game) clearInterval(game.timer);
		game = up ? { id: up, service: false, timer: setInterval(() => this.step({ centre, paused: false, screen: false }), GAME_STEP) } : null;
		if (up) {
			passage = { is: 'opening', until: (ctx?.currentTime ?? 0) + 3 * EASE.opening };
			if (joined && saved.sound) load(need());
		}
		setTimeout(sweep, LINGER);
	},
	/** A game's bed on or off: a Sushi Stand service's restaurant, Big Muddy's water while the lure is down. */
	service(on: boolean) {
		if (game) game.service = on;
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
		if ((!scene && !game) || !joined || !saved.sound) return;
		const want: ReadonlySet<LoopId> = game ? new Set(Object.values(GAME_LOOPS[game.id])) : loopsNeeded(scene!, centre), now = performance.now();
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
		const s = { screen: frame.screen, video: [...media].some((m) => !m.paused && !m.ended) }, here = game ? gameGains(game.id, game.service) : gains(scene!, centre, s);
		const target = passage.is === 'leaving' ? leavingGains(here, passage.to, s) : here;
		for (const id of new Set<LoopId>([...target.keys(), ...loops.keys(), ...streams.keys()])) {
			// In hundredths, so a slow pan sets a new target when it is heard, not every frame.
			const g = Math.round((target.get(id) ?? 0) * 100) / 100;
			if (streamed(id)) {
				const url = file(id);
				let stream = streams.get(id);
				if (!stream) {
					if (!g || !url) continue;
					streams.set(id, (stream = new Stream(c, ambience)));
				}
				stream.step(url, g, tc, t);
				continue;
			}
			const buffer = ready(id);
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
