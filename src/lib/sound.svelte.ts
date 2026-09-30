// The sound engine (spec: "Sound"): plain Web Audio in one module beside the saved state, through which it reads and writes
// the Sound toggle's choice. The Join press creates and resumes the context; the toggle suspends it and resumes it inside
// its own press; a hidden tab suspends it and the Resume press brings it back, iOS's interruption included. One-shots
// (buildout ticket 22) play through a small pool of voices, their buffers fetched for the scene the visitor is in, or a
// door they are about to take, and let go a minute after that scene is left (sound.ts). Nothing is fetched before Join
// or while muted, and a failed fetch is silence. Ticket 21's beds, theme and music join `master` beside the one-shots.
import FILES from './sound-files.json';
import { KEY } from './saved.ts';
import { saved } from './saved.svelte.ts';
import { LINGER, needed, stale, type SoundId } from './sound.ts';
import type { Overworld, SubScene } from './scenes/types';

type Scene = Overworld | SubScene;

declare global {
	interface Navigator {
		/** How the page's audio mixes with the visitor's own: iOS Safari 16.4 on, absent elsewhere. */
		audioSession?: { type: string };
	}
}

/** At most this many one-shots sound at once; a new one stops the oldest. */
const VOICES = 8;

let ctx: AudioContext | null = null;
/** Everything heard goes through here. */
let master: GainNode | null = null;
/** From the Join press on: before it nothing is fetched or played. */
let joined = false;
/** The scene the visitor is in. */
let current: Scene | null = null;
/** The choice this tab last applied, so another tab's write that leaves it alone changes nothing here. */
let applied = saved.sound;
/** A one-shot's buffer: being fetched, under the signal that calls the fetch off, or decoded and ready to play. */
type Buffer = { is: 'loading'; signal: AbortSignal } | { is: 'ready'; buffer: AudioBuffer };
const buffers = new Map<SoundId, Buffer>();
/** When each one-shot stopped being needed (performance ms): its scene left, or a door not taken. */
const left = new Map<SoundId, number>();
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

/** A one-shot's URL from the generated map (`npm run audio`); none until it is sourced, and then it is silent. */
function url(id: SoundId) {
	const u: unknown = (FILES as Record<string, unknown>)[id];
	return typeof u === 'string' ? u : undefined;
}

/** Inside a press: the context made the first time, and resumed from the toggle, a hidden tab or iOS's interruption. */
function wake() {
	if (!ctx) {
		// iOS: an ambient session respects the silent switch and mixes with the visitor's own audio (Safari 16.4 on).
		if (navigator.audioSession) navigator.audioSession.type = 'ambient';
		ctx = new AudioContext();
		master = ctx.createGain();
		master.connect(ctx.destination);
	}
	if (ctx.state !== 'running') ctx.resume().catch(() => {});
}

/** Fetches and decodes the one-shots not yet held; nothing before Join or while muted. */
function load(ids: Iterable<SoundId>) {
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

/** Lets go of the buffers the visitor's scene doesn't need that were left behind a minute ago. */
function sweep() {
	for (const id of stale(left, current ? needed(current) : new Set(), performance.now())) {
		buffers.delete(id);
		left.delete(id);
	}
}

/** Muted: every voice stopped, every fetch in flight aborted, the context suspended. */
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
	if (current) load(needed(current));
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
	/** The Join press: the context is made and resumed inside it, unless the visitor muted, and the scene's one-shots load. */
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
	/** Each scene the engine shows: its one-shots load, and the last scene's are let go a minute later unless needed here. */
	scene(scene: Scene) {
		const now = performance.now();
		if (current) for (const id of needed(current)) left.set(id, now);
		current = scene;
		if (joined && saved.sound) load(needed(scene));
		setTimeout(sweep, LINGER);
	},
	/** A door to `scene` hovered or focused: its one-shots load ahead of the hop, and go a minute later if it isn't taken. */
	preload(scene: Scene) {
		if (!current || scene === current) return;
		const here = needed(current), now = performance.now(), ahead = [...needed(scene)].filter((id) => !here.has(id) && !buffers.has(id));
		if (!ahead.length || !joined || !saved.sound) return;
		for (const id of ahead) left.set(id, now);
		load(ahead);
		setTimeout(sweep, LINGER);
	},
	/**
	 * Plays a one-shot from `offset` seconds in; false when it can't: before Join, muted, suspended, or not loaded (yet, or
	 * ever, if its fetch failed or it isn't sourced).
	 */
	play(id: SoundId, offset = 0) {
		const b = buffers.get(id);
		if (!ctx || !master || ctx.state !== 'running' || !saved.sound || b?.is !== 'ready') return false;
		const v = new AudioBufferSourceNode(ctx, { buffer: b.buffer });
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
		const b = buffers.get(id);
		return b?.is === 'ready' ? b.buffer.duration * 1000 : undefined;
	}
};
