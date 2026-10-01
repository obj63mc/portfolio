// The scene loop (buildout ticket 08): background tiles on the scene canvas, the prerendered layer moved with one transform
// per camera change, the visitor's drawn cursor on the overlay canvas, and the camera from camera.ts. The input (ticket 09):
// the Join card, the pointer lock with its fallback to the unlocked mouse, pause and resume, and the keys. Touch (ticket 10):
// the joystick, drag-to-pan with its fling, and tap-to-activate. The hop between scenes (ticket 11): the iris (iris.ts),
// landing at the door and focus. Peers (ticket 13): the scene's room through net.ts, every cursor drawn by cursors.ts. The props on
// the scene canvas (ticket 15) are props.ts. Cosmetics (ticket 16): a granting prop's card grants, the saved state
// (saved.svelte.ts) keeps them, and the room hears what the cursor wears. The Foundry screen's reel (ticket 17) is
// projector.ts, and the camera zooms out to frame it. The Carondelet lap timer (ticket 18) is laps.ts. Horizon scaling
// and the scenery over the cursors (ticket 19): depth.ts follows each cursor's depth factor and its side of the
// walk-behind scenery, scenery.ts holds the cut-outs drawn over it. The one-shots (ticket 22) are one-shots.ts, played by
// the sound engine (sound.svelte.ts), which the Join press starts; the beds, the theme and the music (ticket 21, loops.ts)
// follow the camera and the scene through it every frame. The river current (ticket 20) is river.ts. Carried over from
// the rendering and pointer-lock prototypes' engines (tags archive/prototype/rendering-camera and
// archive/prototype/pointer-lock) with the spec's rules; the layer's markup is never re-rendered here.
import { earned, linkUsed } from '../analytics.svelte.ts';
import { COSMETICS } from '../cosmetics.ts';
import { saved } from '../saved.svelte.ts';
import { grantSound } from '../sound.ts';
import { sound } from '../sound.svelte.ts';
import { tv } from '../tv.svelte.ts';
import { arrival, doorsOf, gameAt, propsOf, sceneAt, type GameId } from '../scenes/index.ts';
import type { Overworld, Point, Rect, SubScene } from '../scenes/types';
import { ASHORE, flow, type Current } from '../scenes/river.ts';
import { blocked, type Side } from '../scenes/walk.ts';
import { Net } from '../net/net.ts';
import { SNAP, sample, visible } from '../net/peers.ts';
import { playing } from '../net/screen.ts';
import { follower } from './depth.ts';
import { Scenery } from './scenery.ts';
import { Props, artIn, clickedProp } from './props.ts';
import { Loader, type Loading } from './loader.ts';
import { Projector } from './projector.ts';
import { Remote } from './tv.ts';
import {
	KEYS, TILE, centreOn, clamp, coast, fling, framing, glide, pan, rendering, steer, step, stick, tileRange, zoom, type Move, type View
} from './camera.ts';
import { Cursors, type Drawn } from './cursors.ts';
import { Laps } from './laps.ts';
import { OneShots } from './one-shots.ts';
import { IRIS, OPEN, advance, closing, hole, type Iris } from './iris.ts';

export type Scene = Overworld | SubScene;

/**
 * The visitor's input (spec: Input): the Join card up; joined with the pointer locked, with the unlocked mouse (a refused
 * lock), or by touch on a device with no mouse or trackpad; released, the lock let go by Esc in a card until the next
 * click takes it back; paused, which re-locks on resume if the lock was held; or away at a game, a page with no scene,
 * the same on the way back.
 */
type Input =
	| { is: 'join' }
	| { is: 'locked' }
	| { is: 'unlocked' }
	| { is: 'touch' }
	| { is: 'released' }
	| { is: 'paused'; relock: boolean }
	| { is: 'away'; relock: boolean };

/** A slider clicked by the locked cursor at `x`, CSS px: set to the value there, as a click on its track sets it. */
const slide = (el: HTMLInputElement, x: number) => {
	const r = el.getBoundingClientRect(), min = Number(el.min), max = Number(el.max);
	el.value = String(min + Math.min(1, Math.max(0, (x - r.x) / r.width)) * (max - min));
	el.dispatchEvent(new Event('input', { bubbles: true }));
	el.dispatchEvent(new Event('change', { bubbles: true }));
};

/** Joined and not paused: the keys steer. */
const joined = (i: Input) => i.is === 'locked' || i.is === 'unlocked' || i.is === 'touch' || i.is === 'released';

/**
 * A touch on the scene (ticket 10): none; a finger down that is still a tap; a drag, once it has gone 6 px; or a drag let
 * go, coasting while `vel` has speed, whose click the browser may still send is swallowed until the next touch.
 */
type Gesture =
	| { is: 'none' }
	| { is: 'tap'; id: number; from: Point }
	| { is: 'drag'; id: number; at: Point; moves: Move[] }
	| { is: 'lifted'; vel: Point | null };

// Every scene's background tiles at both densities, keyed by path: a background's folder repeats its scene's id,
// /art/generated/<id>/<id>/<density>/<column>-<row>.webp. Never inlined: the page's CSP has no data: source.
const TILE_URLS = import.meta.glob<string>('/art/generated/*/*/{1.25,2}/*.webp', { eager: true, query: '?no-inline', import: 'default' });
/** A scene's background tile at `density`, by `<column>-<row>`; none where the scene has no art. */
const tileUrl = (scene: Scene, density: number, key: string): string | undefined => TILE_URLS[`/art/generated/${scene.id}/${scene.id}/${density}/${key}.webp`];

/**
 * The on-screen toggles, and the consent bar on the page (ticket 23): they hold the camera still when the mouse's cursor
 * is near them. On touch they and the joystick are the finger's, and the drawn cursor over them neither marks, clicks nor
 * holds anything (Joe, 2026-09-29). Cards stop the camera anyway.
 */
const CONTROLS = '.controls:not(dialog *), .consent:popover-open';
/** The drawn cursor's height, world px: a touch drag carries it this far inside the viewport's edge, so it stays in view. */
const CARRY = 40;
/** A touch becomes a drag once it has gone this many CSS px, so a tap on a prop isn't eaten. */
const DRAG = 6;
/** Washed out at the river's south end, the view opens on the Arch out of black over this long, ms. */
const WASH = 400;
/** Behind the scene where no tile has arrived, or beyond a scene smaller than the view. */
const BACKDROP = '#1d2b3a';

const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/**
 * Where a hop from `from` lands in `to`, world px, as `show` lands it: just inside a sub-scene's exit door, on the floor a
 * cursor's height below it, or on the overworld at the door of the venue left.
 */
function landing(to: Scene, from: Scene): Point {
	if ('exit' in to) return { x: to.exit.x + to.exit.w / 2, y: to.exit.y + to.exit.h + CARRY };
	return centre(doorsOf(to).find((d) => d.to.id === from.id)?.at ?? propsOf(to).find((p) => p.id === 'welcome')!.rect);
}
/** A point held inside the viewport. */
const inView = (p: Point, v: View): Point => ({ x: Math.max(0, Math.min(v.w - 1, p.x)), y: Math.max(0, Math.min(v.h - 1, p.y)) });

/** The element a URL fragment names; a malformed one (`#%E0`) names nothing. */
function byHash(hash: string) {
	try {
		return document.getElementById(decodeURIComponent(hash.slice(1)));
	} catch {
		return null;
	}
}

/**
 * Where an element is painted: its placed box (itself, or the `.at` it sits in, such as the signpost round its links), or a
 * district's or venue's section by its heading. Null for what has no place in the world, such as the visually hidden h1.
 */
const placed = (el: Element | null) => (el?.matches('section') ? el.querySelector('h2, h3') : (el?.closest('.at') ?? null));

export class Engine {
	private scene: Scene | null = null;
	/** Away at a page with no scene (`suspend`): the game whose door led there, if it is one. */
	private away: { door?: GameId } | null = null;
	private view: View;
	/** The session's render scale, which the view's leaves only to frame the Foundry's reel (ticket 17). */
	private base: number;
	/** Fixed per session with the render scale. */
	private dpr: number;
	private density: number;
	private cam: Point = { x: 0, y: 0 };
	/** A keyboard or fragment glide in progress. */
	private goal: Point | null = null;
	private input: Input = { is: 'join' };
	/** The drawn cursor, CSS px; none before Join. */
	private cursor: Point | null = null;
	/** The unlocked mouse is in the window; locked, the cursor always is. */
	private inside = false;
	/** Arrow keys and WASD held, by code. */
	private keys = new Set<string>();
	/** The props' videos a pause stopped, the meeting TV's, to play again on Resume; the Foundry screen plays on. */
	private stopped: HTMLVideoElement[] = [];
	/** The control under the locked or touch-steered cursor, marked `.hot` since the page gets no hover there. */
	private hot: Element | null = null;
	/** The card video player under the locked cursor, marked `.hot` too, which shows its controls (VideoPlayer.svelte). */
	private hotPlayer: Element | null = null;
	/** False after a keyboard or fragment pan, or a drag, until the cursor moves, so a cursor resting in the band doesn't undo it. */
	private armed = true;
	/** When steering last pressed the cursor against the viewport's edge (camera.ts `Frame.pressed`). */
	private pressedAt = -Infinity;
	private gesture: Gesture = { is: 'none' };
	/**
	 * The joystick held: its finger, its radius, where the finger landed and its pull from there (CSS px), and whether it
	 * ever left the dead zone.
	 */
	private joy: { id: number; r: number; from: Point; pull: Point; steered: boolean } | null = null;
	/** World rects that hold the camera still: the props, and the overworld's signpost. */
	private targets: Rect[] = [];
	/** Every image the engine fetches, in the order the visitor needs them (loader.ts). */
	private loader = new Loader();
	/** Background tiles held, by `<column>-<row>`; a tile still loading has no bitmap. */
	private held = new Map<string, { bmp?: ImageBitmap; loading?: Loading }>();
	/** The scene's doors still to be fetched ahead of a hop through them (`lookAhead`). */
	private doors: ReturnType<typeof doorsOf> = [];
	private dirty = true;
	/** The scene's room: peers, "N here", the offline announcement and the server time ambient motion runs on. */
	private net: Net;
	/** Every cursor, from one atlas. */
	private art: Cursors;
	/** The cosmetic the own cursor wears and when it went on (performance.now() ms), which pops it in; none on arrival. */
	private worn = saved.worn;
	private wornAt = -Infinity;
	/** The polite live region: the visitor's own events only. */
	private live: HTMLElement;
	private props: Props;
	private projector: Projector;
	/** The Moosylvania lobby TV's remote (tv.ts). */
	private remote: Remote;
	/** The Carondelet lap timer (ticket 18). */
	private laps: Laps;
	/** The one-shots (ticket 22). */
	private shots: OneShots;
	/** Foreground and walk-behind scenery, drawn over the cursors it covers (ticket 19). */
	private scenery = new Scenery(this.loader);
	/** The own cursor followed through the scene: none until its first step there; `jumped` makes its next step a jump. */
	private follow: ReturnType<typeof follower> | null = null;
	private jumped = false;
	/** The own cursor's depth factor and its side of the walk-behind scenery, this frame. */
	private ownDepth = 1;
	private ownSides: ReadonlyMap<string, Side> = new Map();
	/** Each drawn peer followed the same way, by id. */
	private peerFollow = new Map<number, ReturnType<typeof follower>>();
	/** The ids of the props the own cursor is behind, joined: those marked `.behind` in the layer. */
	private marked = '';
	/** The iris between scenes. */
	private iris: Iris = OPEN;
	/** The own cursor in or out of the river current (ticket 20), from its last free frame. */
	private current: Current = ASHORE;
	/** The visitor moved the cursor since the current last looked (a mouse, a key, a drag or its fling), which stops a float. */
	private stirred = false;
	/** When the visitor was last washed out at the river's south end, performance.now() ms. */
	private washedAt = -Infinity;
	private raf = 0;
	private last = 0;
	private canvas: HTMLCanvasElement;
	private layer: HTMLElement;
	private cursors: HTMLCanvasElement;
	private joystick: HTMLElement;
	private knob: HTMLElement;
	private g: CanvasRenderingContext2D;
	private cg: CanvasRenderingContext2D;
	private cards: { join: HTMLDialogElement; paused: HTMLDialogElement };
	private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	/** A mouse or trackpad is connected; without one Join enters the touch model (Joe, 2026-09-29). */
	private fine = matchMedia('(any-pointer: fine)');
	private listeners = new AbortController();
	/** Lifts the cursor canvas over each prop card as it opens. */
	private raise = new MutationObserver((records) => {
		if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open && !this.isGate(r.target))) this.lift();
	});

	/**
	 * `joystick` is the touch joystick, its knob its first child; `cards` are the Join and Paused cards; `status` holds the
	 * "N here" count, the polite live region and the lap clock. The canvas holding the pointer lock is the scene's, in the
	 * shared layout.
	 */
	constructor(
		canvas: HTMLCanvasElement,
		layer: HTMLElement,
		cursors: HTMLCanvasElement,
		joystick: HTMLElement,
		cards: Engine['cards'],
		status: { here: HTMLElement; live: HTMLElement; lap: HTMLElement }
	) {
		const g = canvas.getContext('2d', { alpha: false }), cg = cursors.getContext('2d');
		// Without a canvas the engine never starts and the page stays the plain document (spec: "if the canvas fails").
		if (!g || !cg) throw new Error('No 2D canvas');
		const r = rendering(screen.width, screen.height, devicePixelRatio);
		this.view = { w: innerWidth, h: innerHeight, s: r.s };
		this.base = r.s;
		this.dpr = r.dpr;
		this.density = r.density;
		this.canvas = canvas;
		this.layer = layer;
		this.cursors = cursors;
		this.joystick = joystick;
		this.knob = joystick.firstElementChild as HTMLElement;
		this.g = g;
		this.cg = cg;
		this.cards = cards;
		this.art = new Cursors(cursors, cg, r.s * r.dpr, r.dpr);
		this.live = status.live;
		// Only the visitor's own events are announced: offline and cosmetics earned, never another visitor's comings and goings.
		this.net = new Net({
			count: (n) => (status.here.textContent = `${n} here`),
			solo: (on) => (status.live.textContent = on ? 'Offline, exploring solo' : '')
		});
		this.props = new Props(layer, this.loader);
		this.projector = new Projector(layer, this.net);
		this.remote = new Remote(layer, this.net);
		this.laps = new Laps(status.lap, status.live);
		this.shots = new OneShots(layer, this.net);
		document.documentElement.classList.add('engine');
		this.bind();
		this.resize();
		this.moveTo(this.cam);
		// The cursor canvas enters the top layer before the Join card, so the card dims it with the scene.
		cursors.showPopover();
		this.raise.observe(document.body, { subtree: true, attributeFilter: ['open'] });
		// And over a card's video gone full screen, which enters the top layer over it.
		document.addEventListener('fullscreenchange', () => document.fullscreenElement && this.lift(), { signal: this.listeners.signal });
		this.enter(this.input);
		this.raf = requestAnimationFrame(this.tick);
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.net.destroy();
		this.listeners.abort();
		this.props.destroy();
		this.projector.destroy();
		this.remote.destroy();
		this.shots.destroy();
		this.scenery.destroy();
		this.raise.disconnect();
		this.dropTiles();
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
		for (const card of Object.values(this.cards)) card.close();
		this.cursors.hidePopover();
		this.hot?.classList.remove('hot');
		this.hotPlayer?.classList.remove('hot');
		document.documentElement.classList.remove('engine');
		delete document.documentElement.dataset.input;
		delete document.documentElement.dataset.iris;
		this.layer.style.transform = '';
	}

	/**
	 * Each navigation's scene and fragment. A page load opens centred on the fragment's target, else the overworld's
	 * arrival point (between the welcome sign and the signpost) or a sub-scene's exit door. A hop from another scene (ticket 11) lands at a door
	 * whatever the fragment: into a sub-scene just inside its exit door, focus on its h1; back on the overworld, by the exit
	 * door or the browser's back button, on the door of the venue left, with nothing focused: the visitor roams free, and
	 * Tab reaches the door again (Joe, 2026-09-30). The camera is centred on where it lands, a joined cursor is put there
	 * and the new scene opens out of the iris that `close` shut, from there, once its tiles in view have arrived (Joe,
	 * 2026-09-30); a cut under reduced motion.
	 */
	show(scene: Scene, hash: string) {
		const target = placed(byHash(hash));
		if (scene === this.scene) {
			if (target) this.panTo(target);
			return;
		}
		// Back from a game, the engine takes the page again and lands at the door that led there, the koi or the angler
		// (Joe, 2026-09-30).
		const back = this.away, from = this.scene?.id ?? back?.door, overworld = 'districts' in scene;
		if (back) {
			this.away = null;
			document.documentElement.classList.add('engine');
			this.cursors.showPopover();
		}
		this.scene = scene;
		// A new scene is a new room (ticket 13): one socket closes and the next opens, and a joined cursor is tagged "you".
		this.net.join(scene.id);
		if (this.cursor) this.art.tag();
		// A prop that only says its state (the Foundry screen) is nothing to aim at.
		this.targets = [...(overworld ? [scene.signpost.rect] : []), ...propsOf(scene).filter((p) => p.kind !== 'status').map((p) => p.rect)];
		this.dropTiles();
		this.doors = doorsOf(scene);
		this.props.show(scene, this.density);
		this.projector.show(scene);
		this.remote.show();
		// Every cursor enters the new scene afresh: the own takes the depth and sides of where it lands, and peers are a new room's.
		this.scenery.show(scene, this.density);
		this.follow = null;
		this.ownSides = new Map();
		this.marked = '';
		this.peerFollow.clear();
		this.goal = null;
		this.current = ASHORE;
		this.washedAt = -Infinity;
		const door = from && this.layer.querySelector<HTMLElement>(overworld ? `#${from} .door` : '.door');
		this.shots.show(scene, !!door);
		const at = door ?? target;
		const box = at ? this.box(at) : overworld ? arrival(scene) : scene.exit;
		// Just inside a sub-scene's door is the floor in front of it, a cursor's height below the door on its wall, where a
		// click doesn't leave again. The overworld's doors are buildings, or the Foundry's cinema.
		const c = door && !overworld ? { x: box.x + box.w / 2, y: box.y + box.h + CARRY } : centre(box);
		// A hop out of the Foundry mid-reel lands at the session's scale; the box above was read at the reel's.
		this.view = { ...this.view, s: this.base };
		this.moveTo(centreOn(c, this.view, scene));
		const landing = { x: (c.x - this.cam.x) * this.view.s, y: (c.y - this.cam.y) * this.view.s };
		if (door || this.iris.is !== 'open') this.iris = this.reducedMotion.matches ? OPEN : { is: 'shut', at: landing, t0: performance.now(), landed: true };
		// A locked cursor waits behind the Paused card, since only a click can take the lock back.
		if (this.input.is === 'away') this.enter(this.input.relock ? { is: 'paused', relock: true } : { is: this.fine.matches ? 'unlocked' : 'touch' });
		if (!door) return;
		// Before Join there is no cursor. The unlocked mouse's cursor stays at the OS pointer, where its clicks land. Push
		// waits for the cursor to move, so a door near the scene's edge doesn't carry the camera off it.
		if (this.cursor && this.input.is !== 'unlocked') this.cursor = { ...landing };
		this.armed = false;
		// Focus moves after the router's own reset, which for a URL with a fragment (the exit door's `/#<venue>`) runs in a
		// timeout queued before this one and clears focus, the venue's section being unfocusable. A back or forward hop
		// behind the Join or Paused card, whose page is inert, hands focus back to the card's button, which that reset
		// took it from. Back on the overworld nothing else takes focus, so the door left shows no ring.
		const focus = document.querySelector<HTMLElement>('.gate[open] button') ?? (overworld ? null : this.layer.querySelector<HTMLElement>('h1'));
		setTimeout(() => focus?.focus());
	}

	/**
	 * Leaving the scene for another (ticket 11) for `to`: the iris closes on the door, the link to it when focused from
	 * the keyboard, or else the drawn cursor, which clicked it, or the view's middle for the back button before Join. Only
	 * that link counts: a sub-scene's h1, focused on arrival, shows as keyboard focus too (Joe, 2026-09-30). Resolves once it is shut,
	 * for the hop to go; null under reduced motion or in a hidden tab, which draws nothing, and the hop goes at once.
	 */
	close(to: URL): Promise<void> | null {
		if (!this.scene) return null;
		// Into Sushi Stand the koi splashes (Joe, 2026-09-30), and into Big Muddy the angler's cast does.
		sound.play(gameAt(to.pathname) ? 'splash' : 'door-open');
		// The scene's beds fade as the iris closes, and the theme toward its level beyond the door (ticket 21).
		sound.leave(sceneAt(to.pathname));
		if (this.reducedMotion.matches || document.hidden) return null;
		const now = performance.now(), el = document.activeElement;
		const link = el instanceof HTMLAnchorElement && el.href === to.href && el.matches(':focus-visible') && this.layer.contains(el);
		const r = link ? el.getBoundingClientRect() : null;
		const at = r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : (this.cursor ?? { x: this.view.w / 2, y: this.view.h / 2 });
		this.iris = closing(this.iris, { ...at }, now, this.view);
		const left = this.iris.is === 'closing' ? this.iris.t0 + IRIS.close - now : 0;
		return new Promise((done) => setTimeout(done, left));
	}

	/**
	 * Out to a game (Joe, 2026-09-30), the page at `pathname`, one of its own with no scene: the room left, the lock let go
	 * and the canvases put away, nothing drawn and no input taken, until `show` brings the next scene.
	 */
	suspend(pathname: string) {
		if (!this.scene) return;
		const i = this.input;
		this.away = { door: gameAt(pathname) };
		this.scene = null;
		this.net.leave();
		this.keys.clear();
		this.goal = null;
		this.iris = OPEN;
		this.enter({ is: 'away', relock: i.is === 'paused' ? i.relock : i.is === 'locked' || i.is === 'released' });
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
		this.cursors.hidePopover();
		this.hot?.classList.remove('hot');
		this.hot = null;
		const html = document.documentElement;
		html.classList.remove('engine');
		delete html.dataset.iris;
		this.layer.style.transform = '';
	}

	private bind() {
		const opts = { signal: this.listeners.signal };
		addEventListener('resize', () => this.resize(), opts);
		const { join, paused } = this.cards;
		join.querySelector('button')!.addEventListener('click', (e) => this.join(e), opts);
		paused.querySelector('button')!.addEventListener('click', () => this.resume(), opts);
		// Esc never closes the Join or Paused card: refused at the keydown, and at the cancel it becomes, which Chrome lets a
		// page refuse only after a user gesture. A close request that can't be refused (Android's back) reopens the card.
		for (const card of [join, paused]) {
			card.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); }, opts);
			card.addEventListener('cancel', (e) => e.preventDefault(), opts);
			card.addEventListener('close', () => this.enter(this.input), opts);
		}
		document.addEventListener(
			'pointerlockchange',
			() => {
				if (document.pointerLockElement === this.canvas) this.enter({ is: 'locked' });
				else if (this.input.is === 'locked') this.escaped();
			},
			opts
		);
		// Released, the next mouse click takes the lock back and does nothing else, since it lands at the OS pointer rather
		// than the drawn cursor. Chrome refuses for about a second after Esc; a refused click just leaves it released. A
		// touch drag's click, which the browser sends when the finger went under its own tap slop, does nothing at all. A
		// keyboard click (detail 0) passes both.
		addEventListener(
			'click',
			(e) => {
				if (!e.detail) return;
				// Seated for the Foundry's reel, a pointer's click in the scene does nothing; the keyboard still reaches everything.
				if (this.projector.seated && this.layer.contains(e.target as Node)) return void (e.preventDefault(), e.stopPropagation());
				if (this.input.is === 'released') this.lock();
				else if (this.gesture.is !== 'lifted') return;
				e.preventDefault();
				e.stopPropagation();
			},
			{ ...opts, capture: true }
		);
		// Chrome refuses a lock for about a second after Esc releases one. At Join a refusal leaves the unlocked mouse.
		document.addEventListener('pointerlockerror', () => { if (this.input.is === 'paused') this.refusal.hidden = false; }, opts);
		addEventListener(
			'pointermove',
			(e) => {
				if (e.pointerType !== 'mouse' || !this.cursor || this.projector.seated) return; // touch drags, below
				// Locked, the mouse moves the drawn cursor 1:1, OS acceleration kept, held inside the viewport; unlocked, it
				// follows the OS pointer. Before Join and while paused it stays put.
				if (this.input.is === 'locked') this.steerTo({ x: this.cursor.x + e.movementX, y: this.cursor.y + e.movementY }, e.timeStamp);
				else if (this.input.is === 'unlocked') (this.cursor = { x: e.clientX, y: e.clientY }), (this.inside = true);
				else return;
				// A real move re-arms the push and stirs the river; a synthetic one (content moving under a still pointer) has
				// no movement.
				if (e.movementX || e.movementY) this.armed = this.stirred = true;
			},
			opts
		);
		// Locked, the mouse's clicks come to the canvas holding the lock: each goes to the control the drawn cursor is over,
		// a card's Close and the links inside it included, sets a slider (a card video's seek bar) where it is clicked, or
		// plays or pauses a card's video. A tap on the canvas is on bare scenery and clicks nothing.
		this.canvas.addEventListener(
			'click',
			() => {
				if (this.input.is !== 'locked' || !this.cursor) return;
				const hit = this.under();
				if (hit instanceof HTMLInputElement) return slide(hit, this.cursor.x);
				if (hit) return hit.click();
				const video = document.elementFromPoint(this.cursor.x, this.cursor.y)?.closest<HTMLVideoElement>('dialog video');
				if (video) void (video.paused ? video.play().catch(() => {}) : video.pause());
			},
			opts
		);
		// Locked, the wheel comes to the canvas too: it scrolls what the drawn cursor is over in a card, a screenshot in its
		// window (Screens.svelte) or, where that has no further to go, the card's own contents.
		this.canvas.addEventListener(
			'wheel',
			(e) => {
				if (this.input.is !== 'locked' || !this.cursor) return;
				const by = e.deltaY * (e.deltaMode ? 40 : 1);
				for (let el = document.elementFromPoint(this.cursor.x, this.cursor.y); el?.closest('dialog'); el = el.parentElement) {
					const top = el.scrollTop;
					if (/auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollBy({ top: by, behavior: 'instant' });
					if (el.scrollTop !== top) return;
				}
			},
			{ ...opts, passive: true }
		);
		// A middle click opens the link under the locked cursor in a new tab, as it would at the OS pointer (ticket 11). A
		// page can only open the tab in front, which pauses this one.
		this.canvas.addEventListener(
			'auxclick',
			(e) => {
				const a = e.button === 1 && this.under();
				// No opener, as a native middle click gives none: a card's external link can't reach back into this tab.
				if (a instanceof HTMLAnchorElement) linkUsed(a), window.open(a.href, '_blank', 'noopener');
			},
			opts
		);
		// Touch: a finger on the scene or a prop drags the camera once it has gone 6 px, so a tap isn't eaten, and flings it
		// when let go while moving. A tap on a prop, a door or a link moves the cursor there, and the tap's own click
		// activates it. The joystick, the controls and the cards take their own touches.
		addEventListener(
			'pointerdown',
			(e) => {
				if (this.gesture.is === 'tap' || this.gesture.is === 'drag') return; // one finger drags
				this.gesture = { is: 'none' }; // any touch stops a fling
				if (this.input.is !== 'touch' || e.pointerType !== 'touch' || (e.target as Element).closest('dialog, .controls, .consent, .joystick')) return;
				this.gesture = { is: 'tap', id: e.pointerId, from: { x: e.clientX, y: e.clientY } };
			},
			opts
		);
		addEventListener(
			'pointermove',
			(e) => {
				const g = this.gesture, at = { x: e.clientX, y: e.clientY };
				// Past the threshold the scene catches up with the finger and then keeps under it.
				if (g.is === 'tap' && g.id === e.pointerId && Math.hypot(at.x - g.from.x, at.y - g.from.y) > DRAG) {
					this.gesture = { is: 'drag', id: g.id, at: g.from, moves: [] };
					this.armed = false;
					this.goal = null;
				}
				const d = this.gesture;
				if (d.is !== 'drag' || d.id !== e.pointerId) return;
				this.slide({ x: at.x - d.at.x, y: at.y - d.at.y });
				d.at = at;
				if (d.moves.push({ t: e.timeStamp, ...at }) > 8) d.moves.shift();
			},
			opts
		);
		const lift = (e: PointerEvent) => {
			const g = this.gesture;
			if ((g.is !== 'tap' && g.is !== 'drag') || g.id !== e.pointerId) return;
			const up = e.type === 'pointerup';
			if (g.is === 'drag') this.gesture = { is: 'lifted', vel: up ? fling(g.moves, e.timeStamp) : null };
			else {
				this.gesture = { is: 'none' };
				if (up && !this.projector.seated && this.layer.contains((e.target as Element).closest('a, button'))) this.cursor = { x: e.clientX, y: e.clientY };
			}
		};
		addEventListener('pointerup', lift, opts);
		addEventListener('pointercancel', lift, opts);
		// The joystick: the finger's pull from where it landed steers the drawn cursor (camera.ts `stick`), and the camera
		// follows through the push band. A tap, which never leaves the dead zone, clicks under the cursor.
		this.joystick.addEventListener(
			'pointerdown',
			(e) => {
				if (this.input.is !== 'touch' || this.joy) return;
				this.joystick.setPointerCapture(e.pointerId);
				const from = { x: e.clientX, y: e.clientY };
				this.joy = { id: e.pointerId, r: this.joystick.getBoundingClientRect().width / 2, from, pull: { x: 0, y: 0 }, steered: false };
			},
			opts
		);
		this.joystick.addEventListener('pointermove', (e) => { if (e.pointerId === this.joy?.id) this.pull(e); }, opts);
		this.joystick.addEventListener(
			'pointerup',
			(e) => {
				if (e.pointerId !== this.joy?.id) return;
				if (!this.joy.steered) this.under()?.click();
				this.letGo();
			},
			opts
		);
		this.joystick.addEventListener('pointercancel', (e) => { if (e.pointerId === this.joy?.id) this.letGo(); }, opts);
		// Push stops when the unlocked pointer leaves the window.
		addEventListener('mouseout', (e) => { if (!e.relatedTarget) this.inside = false; }, opts);
		// Blur, an external link included, and a hidden tab pause.
		addEventListener('blur', () => { this.inside = false; this.pause(); }, opts);
		document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); }, opts);
		// Modifiers pass through, so the browser's shortcuts never steer.
		// A key's press stirs the river, however short: a tap between two frames steers nothing but still stops a float.
		addEventListener('keydown', (e) => { if (Object.hasOwn(KEYS, e.code) && !e.metaKey && !e.ctrlKey && !e.altKey) this.keys.add(e.code), (this.stirred = true); }, opts);
		addEventListener('keyup', (e) => this.keys.delete(e.code), opts);
		// Keyboard focus centres the camera on a placed element; a click's focus (not :focus-visible), a card's contents, the
		// focus a closing card hands back to its prop and the unplaced h1 don't.
		this.layer.addEventListener(
			'focusin',
			(e) => {
				const el = e.target as Element, from = e.relatedTarget as Element | null, at = placed(el);
				if (at && el.matches(':focus-visible') && !el.closest('dialog') && !from?.closest('dialog')) this.panTo(at);
			},
			opts
		);
		// A card's external link opens a new tab, which leaves this one: it pauses now, whatever order the browser's blur, hidden
		// tab and lock let go come in (Joe, 2026-09-30).
		this.layer.addEventListener('click', (e) => { if ((e.target as Element).closest('a[target="_blank"]')) this.pause(); }, opts);
		// Fragment links (the signpost's districts, the skip link) pan to their target, the same fragment again included,
		// which the router and hashchange both skip.
		this.layer.addEventListener(
			'click',
			(e) => {
				const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
				const target = a && placed(byHash(a.hash));
				if (target) this.panTo(target);
			},
			opts
		);
		// A cosmetic earned in another tab reaches this tab's room at once, though a hidden tab draws no frames (spec:
		// "Persistence"). The saved state heard the event first: it listened from its module's load.
		addEventListener('storage', () => this.tellRoom(), opts);
		// Opening a granting prop's card is the click that grants its cosmetic (spec: "Cosmetics"): earned and announced the
		// first time, worn again every time, with the chime as it goes on, or the fanfare in its place when it turns gold
		// (ticket 22); analytics counts only the first time (ticket 23).
		this.layer.addEventListener(
			'click',
			(e) => {
				const id = clickedProp(e);
				const cos = id && this.scene && propsOf(this.scene).find((p) => p.id === id)?.cosmetic;
				if (!cos) return;
				const gold = saved.gold, worn = saved.worn, first = saved.grant(cos);
				const cue = grantSound({ worn, gold }, { worn: saved.worn, gold: saved.gold });
				if (cue) sound.play(cue);
				if (!first) return;
				this.live.textContent = `You earned the ${COSMETICS[cos].name}${!gold && saved.gold ? ', and your cursor turned gold' : ''}`;
				earned(cos, !gold && saved.gold);
			},
			opts
		);
	}

	private isGate(card: HTMLDialogElement) {
		return card === this.cards.join || card === this.cards.paused;
	}

	/**
	 * The cursor canvas to the top of the top layer, over a prop card or its video gone full screen, where the mouse's
	 * drawn cursor reaches the card's controls. Not on touch (Joe, 2026-09-30): a card's controls are the finger's and
	 * the cursor holds still while it is open, so it stays under the card and its backdrop, dimmed with the scene, and
	 * never sits on the video being watched. Nor away at a game, whose own card it is put away under.
	 */
	private lift() {
		if (this.input.is === 'touch' || !this.scene) return;
		this.cursors.hidePopover();
		this.cursors.showPopover();
	}

	/** The Paused card's note that the browser refused the lock. */
	private get refusal() {
		return this.cards.paused.querySelector<HTMLElement>('.refused')!;
	}

	/**
	 * The link or button under the drawn cursor when it is locked, or steered by touch outside a card (whose controls take
	 * their own taps, the joystick behind it) and off the toggles, which are the finger's too; null for the mouse's real
	 * pointer. A prop standing on scenery the cursor is behind isn't there for it (ticket 19).
	 */
	private under() {
		const touch = this.input.is === 'touch', c = (this.input.is === 'locked' || (touch && !document.querySelector('dialog[open]'))) && this.cursor;
		const hit = c ? document.elementFromPoint(c.x, c.y)?.closest<HTMLElement>('a, button, input[type="range"]') : null;
		return hit && !(touch && hit.closest(CONTROLS)) && !hit.matches('.prop.behind > button') ? hit : null;
	}

	/**
	 * Something to click is under the drawn cursor, which points at it with the hand (Joe, 2026-09-30): what `mark` found
	 * under the lock or a steered touch, or the link or button under the unlocked mouse, whose own cursor is hidden too.
	 */
	private get pointing() {
		const c = this.cursor;
		if (this.input.is !== 'unlocked') return !!this.hot;
		return !!c && !!document.elementFromPoint(c.x, c.y)?.closest('a, button, input[type="range"]');
	}

	/** Every change of input goes through here: the card it calls for is open and any other is closed. */
	private enter(input: Input) {
		this.input = input;
		document.documentElement.dataset.input = input.is;
		const { join, paused } = this.cards, want = input.is === 'join' ? join : input.is === 'paused' ? paused : null;
		for (const card of [join, paused]) if (card !== want && card.open) card.close();
		if (want && !want.open) want.showModal();
		if (input.is !== 'paused') this.refusal.hidden = true;
	}

	/**
	 * Join: the cursor starts where it was pressed, or mid-button from the keyboard (`detail` 0). With a mouse or trackpad
	 * connected the pointer locks, from a keyboard Join too (Joe, 2026-09-29: `any-pointer: fine`, a tablet with one
	 * included); the unlocked mouse carries on until the lock arrives, and for good if it is refused. Without one, the
	 * touch model (ticket 10).
	 */
	private join(e: MouseEvent) {
		if (this.input.is !== 'join') return;
		const b = (e.currentTarget as Element).getBoundingClientRect(), fine = this.fine.matches;
		this.cursor = e.detail ? { x: e.clientX, y: e.clientY } : { x: b.x + b.width / 2, y: b.y + b.height / 2 };
		this.art.tag();
		sound.join();
		this.enter({ is: fine ? 'unlocked' : 'touch' });
		if (fine) this.lock();
	}

	private lock() {
		// Chrome rejects the promise it returns as well as firing pointerlockerror; Safari returns nothing.
		this.canvas.requestPointerLock?.()?.catch(() => {});
	}

	/**
	 * The lock let go in the window, by Esc (which the page never sees) or the browser. With a card open it closes the
	 * card instead of pausing (Joe, 2026-09-29): the drawn cursor holds still, the OS cursor shows and the keys still
	 * steer until a click takes the lock back.
	 */
	private escaped() {
		const card = this.layer.querySelector<HTMLDialogElement>('dialog[open]');
		if (!card || !document.hasFocus() || document.hidden) return this.pause();
		this.inside = false;
		this.enter({ is: 'released' });
		card.close();
	}

	/**
	 * Esc with no card, blur or a hidden tab: the lock released, the cursor frozen where it is, the camera and keys stopped,
	 * a prop's video held, and the lobby TV's remote put back for the room.
	 */
	private pause() {
		if (!joined(this.input)) return;
		this.keys.clear();
		this.stopped = [...this.layer.querySelectorAll('video')].filter((v) => !v.paused);
		for (const v of this.stopped) v.pause();
		this.remote.put();
		this.enter({ is: 'paused', relock: this.input.is === 'locked' || this.input.is === 'released' });
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
	}

	/**
	 * Re-locks with the cursor where it froze; the lock's arrival closes the card, a refusal keeps it up and says so. The
	 * press resumes audio a hidden tab suspended, on touch as on desktop, and the videos the pause held.
	 */
	private resume() {
		if (this.input.is !== 'paused') return;
		sound.resume();
		for (const v of this.stopped.splice(0)) v.play().catch(() => {});
		if (this.input.relock) this.lock();
		else this.enter({ is: this.fine.matches ? 'unlocked' : 'touch' });
	}

	/** The knob follows the finger's pull, held to the stick's rim. */
	private pull(e: PointerEvent) {
		const j = this.joy!, p = { x: e.clientX - j.from.x, y: e.clientY - j.from.y };
		const t = stick(p, j.r, 1, 1), k = Math.min(1, j.r / Math.hypot(p.x, p.y));
		j.pull = p;
		j.steered ||= !!(t.x || t.y);
		this.knob.style.translate = `${p.x * k}px ${p.y * k}px`;
	}

	private letGo() {
		this.joy = null;
		this.knob.style.translate = '';
	}

	/** The steered cursor moved to `p`, held inside the viewport; held against an edge, it is pressed there at time `t`. */
	private steerTo(p: Point, t: number) {
		this.cursor = inView(p, this.view);
		if (p.x !== this.cursor.x || p.y !== this.cursor.y) this.pressedAt = t;
	}

	/** A drag or its fling moves the camera against the finger; the cursor keeps its world place, carried at the edge. */
	private slide(d: Point) {
		if (!this.scene || !this.cursor || this.zooming) return;
		const next = pan(this.cam, this.cursor, d, this.view, this.scene, CARRY * this.view.s);
		this.cursor = next.cursor;
		this.stirred = true;
		this.moveTo(next.cam);
	}

	private resize() {
		this.view = { ...this.view, w: innerWidth, h: innerHeight };
		for (const c of [this.canvas, this.cursors]) {
			c.width = Math.round(this.view.w * this.dpr);
			c.height = Math.round(this.view.h * this.dpr);
		}
		this.art.invalidate();
		if (this.cursor) this.cursor = inView(this.cursor, this.view);
		if (this.scene) this.moveTo(clamp(this.cam, this.view, this.scene));
	}

	/** An element's box in world px, read through the layer's current transform. */
	private box(el: Element): Rect {
		const r = el.getBoundingClientRect(), s = this.view.s;
		return { x: this.cam.x + r.left / s, y: this.cam.y + r.top / s, w: r.width / s, h: r.height / s };
	}

	/** Centre on a placed element, gliding, or at once under reduced motion. */
	private panTo(el: Element) {
		if (!this.scene) return;
		const goal = centreOn(centre(this.box(el)), this.view, this.scene);
		this.armed = false;
		if (this.reducedMotion.matches) (this.goal = null), this.moveTo(goal);
		else this.goal = goal;
	}

	/** The one place the camera moves: the layer's transform, the tiles wanted and a redraw follow it. */
	private moveTo(cam: Point) {
		this.cam = cam;
		const s = this.view.s;
		this.layer.style.transform = `translate(${-cam.x * s}px, ${-cam.y * s}px) scale(${s})`;
		if (this.scene) this.loadTiles();
		this.dirty = true;
	}

	private tick = (now: number) => {
		this.raf = requestAnimationFrame(this.tick);
		const dt = Math.min(0.05, (now - this.last) / 1000);
		this.last = now;
		const scene = this.scene;
		if (!scene) return;
		// Joined with no card open, the cursor steers by keys and the joystick and pushes the camera. A card, or a Join or
		// Paused card, stops both and lets go of any touch; paused, the camera doesn't move at all.
		const free = joined(this.input) && !document.querySelector('dialog[open]');
		if (!free && (this.joy || this.gesture.is !== 'none')) (this.gesture = { is: 'none' }), this.letGo();
		const c = free ? this.cursor : null, k = steer(this.keys, this.view.s, dt);
		const j = this.joy ? stick(this.joy.pull, this.joy.r, this.view.s, dt) : { x: 0, y: 0 };
		// The current carries a free cursor left still, the camera following it at the current's own speed; the keys and the
		// joystick stop it, so a floating cursor is never steered in the same frame.
		const drift = c ? this.drift(scene, dt, now, !!(k.x || k.y || j.x || j.y)) : null;
		const floating = !!drift && (drift.x !== 0 || drift.y !== 0);
		if (floating) this.float(scene, drift);
		const d = { x: k.x + j.x, y: k.y + j.y };
		if (c && (d.x || d.y) && !this.projector.seated) {
			this.steerTo({ x: c.x + d.x, y: c.y + d.y }, now);
			this.armed = true;
			if (this.input.is !== 'unlocked' || k.x || k.y) this.inside = true;
		} else if (this.input.is === 'touch') this.inside = false; // on touch the camera follows only a steered cursor
		const g = this.gesture;
		if (g.is === 'lifted' && g.vel) {
			this.slide({ x: g.vel.x * dt, y: g.vel.y * dt });
			g.vel = coast(g.vel, dt);
		}
		if (!this.reframe(dt) && this.input.is !== 'paused') {
			let cam: Point;
			if (this.goal) {
				cam = glide(this.cam, this.goal, dt);
				if (cam === this.goal) this.goal = null;
			} else {
				// Layout is clean at the top of the frame, so reading the toggles' rects here costs nothing. On touch they don't count.
				// A float moves the camera itself, at the current's speed: the push would carry it faster the lower it got.
				const cursor = free && !floating && this.armed && (this.input.is === 'locked' || this.inside) ? this.cursor : null;
				const controls =
					cursor && this.input.is !== 'touch'
						? [...document.querySelectorAll(CONTROLS)].map((c) => c.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }))
						: [];
				const pressed = now - this.pressedAt < 100;
				cam = step(this.cam, { view: this.view, scene, band: scene.pushBand ?? 0.12, cursor, props: this.targets, controls, pressed }, dt);
			}
			if (cam.x !== this.cam.x || cam.y !== this.cam.y) this.moveTo(cam);
		}
		// Where the cursor now is decides which props it is behind, before their hover is read.
		this.walk(scene, now);
		this.remote.step(now);
		// The scene canvas is drawn only when something on it changed: all of it for the camera or a tile, just the props'
		// area when only they moved on a still camera (props.ts), which keeps a breathing moose from repainting the screen.
		const t = this.net.serverNow(), view = this.seen(), moved = this.props.step(dt * 1000, t, view, this.reducedMotion.matches, this.own), lit = this.projector.step(t);
		this.scenery.near(view);
		if (this.doors.length && joined(this.input)) this.lookAhead(scene, view);
		this.shots.step(t);
		// The beds follow the camera's centre, the theme and the music the scene, its screen and a prop's video (ticket 21).
		sound.step({ centre: { x: view.x + view.w / 2, y: view.y + view.h / 2 }, paused: this.input.is === 'paused', screen: playing(this.net.screen, t) });
		if (this.dirty) this.drawScene(scene);
		else for (const area of [moved, lit]) if (area) this.drawScene(scene, area);
		// A Foundry poster's clicker glides to a seat in the second row and watches from it (Joe, 2026-09-29): the cursor is
		// held there, whatever the input, for the reel's first 5 s; a drag or a fling is already off while the camera frames it.
		const own = this.own, v = this.view;
		const seat = own && this.projector.hold(own, now, this.reducedMotion.matches);
		if (seat) this.cursor = { x: (seat.x - this.cam.x) * v.s, y: (seat.y - this.cam.y) * v.s };
		// The lap timer rides with the free cursor on the overworld; a pause, a card or a sub-scene loses a lap.
		this.laps.step(free && 'districts' in scene ? this.own : null, now);
		this.mark();
		this.iris = advance(this.iris, now, this.iris.is === 'shut' && this.tilesIn());
		const html = document.documentElement;
		if (html.dataset.iris !== this.iris.is) html.dataset.iris = this.iris.is;
		this.drawCursors(scene, now);
	};

	/**
	 * The river current on the free own cursor this frame (ticket 20), world px: left still in the water for a second it
	 * floats south, round the piers, boats and docks in its way, until the visitor moves it (`steered` by the keys or
	 * joystick this frame, or `stirred` since the last); floating to the bottom edge of the scene, the visitor is washed
	 * out to the Arch (Joe, 2026-09-30).
	 */
	private drift(scene: Scene, dt: number, now: number, steered: boolean): Point {
		const at = this.own, stirred = this.stirred || steered, none = { x: 0, y: 0 };
		this.stirred = false;
		if (!('river' in scene) || !at) return none;
		const f = flow(scene.river, this.current, at, dt, stirred);
		if (f.is.is === 'end') return this.toArch(scene, now), none;
		this.current = f.is;
		return f.d;
	}

	/**
	 * A float's step `d`, world px: the cursor moves on screen up to the push band's inner edge, and past it the camera
	 * takes the step instead, so the float goes at the current's own speed, never the push's, with the cursor held in view.
	 * Where the camera meets the scene's edge the cursor moves on to it, so the visitor sees it reach the river's end (Joe,
	 * 2026-09-30).
	 */
	private float(scene: Scene, d: Point) {
		const v = this.view, b = scene.pushBand ?? 0.12, c = this.cursor!, to = { x: c.x + d.x * v.s, y: c.y + d.y * v.s };
		// How far a step from `was` to `p` goes out past the band's inner edge on an axis `size` CSS px long.
		const past = (p: number, was: number, size: number) =>
			p > size * (1 - b) && p > was ? p - Math.max(size * (1 - b), was) : p < size * b && p < was ? p - Math.min(size * b, was) : 0;
		const cam = clamp({ x: this.cam.x + past(to.x, c.x, v.w) / v.s, y: this.cam.y + past(to.y, c.y, v.h) / v.s }, v, scene);
		this.cursor = inView({ x: to.x - (cam.x - this.cam.x) * v.s, y: to.y - (cam.y - this.cam.y) * v.s }, v);
		if (cam.x !== this.cam.x || cam.y !== this.cam.y) this.moveTo(cam);
	}

	/**
	 * Washed out at `now`: the cursor at the Arch reset point, out of the river, the camera centred on it and the "you" tag
	 * shown again, the view opening out of black over WASH ms (a cut under reduced motion). It is a jump: the cursor takes
	 * the depth factor and the sides of where it lands (ticket 19), and peers snap to it.
	 */
	private toArch(scene: Overworld, now: number) {
		const a = scene.river.arch;
		this.current = ASHORE;
		this.washedAt = now;
		this.goal = null;
		this.armed = false;
		this.moveTo(centreOn(a, this.view, scene));
		this.cursor = { x: (a.x - this.cam.x) * this.view.s, y: (a.y - this.cam.y) * this.view.s };
		this.art.tag();
		this.jumped = true;
	}

	/**
	 * The own cursor's step through the scene (ticket 19), before anything reads what it is over: its depth factor, and
	 * its side of the walk-behind scenery. The props standing on scenery it is behind are marked `.behind`, and take neither
	 * its hover nor its clicks: the free mouse's pass through them (app.css), and `under` skips them for a locked or steered
	 * cursor. Keyboard focus, a screen reader and a finger's own tap still reach them, so nothing is out of reach.
	 */
	private walk(scene: Scene, now: number) {
		const at = this.own;
		if (at) {
			const f = (this.follow ??= follower(scene)).step(at, now, this.jumped);
			this.ownDepth = f.d;
			this.ownSides = f.sides;
			this.jumped = false;
		}
		const ids = at && 'walkBehind' in scene ? blocked(scene.walkBehind, this.ownSides) : [];
		if (ids.join() === this.marked) return;
		this.marked = ids.join();
		for (const el of this.layer.querySelectorAll<HTMLElement>('.prop[data-prop]')) el.classList.toggle('behind', ids.includes(el.dataset.prop!));
	}

	/**
	 * Locked or on touch, the page has no hover at the drawn cursor, so the link or button under it is marked `.hot` instead,
	 * and locked, the card video player it is over.
	 */
	private mark() {
		const c = this.input.is === 'locked' && this.cursor, player = (c && document.elementFromPoint(c.x, c.y)?.closest('.player')) || null;
		if (player !== this.hotPlayer) this.hotPlayer?.classList.remove('hot'), player?.classList.add('hot'), (this.hotPlayer = player);
		const hit = this.under();
		if (hit === this.hot) return;
		this.hot?.classList.remove('hot');
		hit?.classList.add('hot');
		this.hot = hit;
		this.shots.over(hit);
	}

	/** The drawn cursor's world position; none before Join. */
	private get own(): Point | null {
		const c = this.cursor;
		return c && { x: this.cam.x + c.x / this.view.s, y: this.cam.y + c.y / this.view.s };
	}

	/** The camera is framing the Foundry's reel, or easing to or from it. */
	private get zooming() {
		return !!this.projector.framing(this.own, this.cursor) || this.view.s !== this.base;
	}

	/**
	 * While the Foundry's reel plays and the visitor sits in its seats, the camera eases out to frame the projector and the
	 * whole screen, whatever the device (Joe, 2026-09-29), and back to the session's scale on the visitor's cursor when it
	 * ends or they leave the seats; a cut under reduced motion.
	 * The cursor keeps its world place, except the unlocked mouse's, which is the OS pointer's. It runs paused too, and
	 * nothing else moves the camera meanwhile. True while it holds the camera.
	 */
	private reframe(dt: number) {
		if (!this.zooming) return false;
		const scene = this.scene!, v = this.view, world = this.own, r = this.projector.framing(world, this.cursor);
		// A shot's centre as the clamp leaves it, so that an eased shot arrives exactly.
		const clamped = (s: number, p: Point) => {
			const cam = centreOn(p, { ...v, s }, scene);
			return { s, at: { x: cam.x + v.w / s / 2, y: cam.y + v.h / s / 2 } };
		};
		const from = { s: v.s, at: { x: this.cam.x + v.w / v.s / 2, y: this.cam.y + v.h / v.s / 2 } };
		const goal = r ? framing(r, v, this.base) : { s: this.base, at: world ?? from.at }, to = clamped(goal.s, goal.at);
		const shot = this.reducedMotion.matches ? to : zoom(from, to, dt);
		const cam = centreOn(shot.at, { ...v, s: shot.s }, scene);
		// Push waits for the cursor to move once the zoom lets go, so a cursor resting in the band doesn't carry the camera off.
		this.goal = null;
		this.armed = false;
		if (shot.s === v.s && cam.x === this.cam.x && cam.y === this.cam.y) return true;
		this.view = { ...v, s: shot.s };
		this.moveTo(cam);
		if (world && this.input.is !== 'unlocked') this.cursor = inView({ x: (world.x - cam.x) * shot.s, y: (world.y - cam.y) * shot.s }, this.view);
		return true;
	}

	/**
	 * Fetch the tiles in view at once and one ring beyond in their turn (loader.ts), a tile of the ring at once when it
	 * comes into view; close and forget any beyond two rings, so phone memory stays flat, calling off one still on its way.
	 */
	private loadTiles() {
		const scene = this.scene!, seen = tileRange(this.cam, this.view, scene, 0), want = tileRange(this.cam, this.view, scene, 1), keep = tileRange(this.cam, this.view, scene, 2);
		for (let row = want.y0; row <= want.y1; row++)
			for (let col = want.x0; col <= want.x1; col++) {
				const key = `${col}-${row}`, inView = col >= seen.x0 && col <= seen.x1 && row >= seen.y0 && row <= seen.y1;
				const had = this.held.get(key);
				if (had) {
					if (inView) had.loading?.hurry();
					continue;
				}
				const tile: { bmp?: ImageBitmap; loading?: Loading } = {};
				this.held.set(key, tile);
				const url = tileUrl(scene, this.density, key);
				if (!url) continue; // no art for this scene: the backdrop shows
				tile.loading = this.loader.image(url, inView ? 'now' : 'soon');
				tile.loading.bmp
					.then((bmp) => {
						if (this.held.get(key) !== tile) return bmp.close(); // evicted, or the scene changed, while loading
						tile.bmp = bmp;
						tile.loading = undefined;
						this.dirty = true;
					})
					.catch(() => {}); // a failed tile stays backdrop
			}
		for (const [key, tile] of this.held) {
			const [col, row] = key.split('-').map(Number);
			if (col >= keep.x0 && col <= keep.x1 && row >= keep.y0 && row <= keep.y1) continue;
			tile.loading?.cancel();
			tile.bmp?.close();
			this.held.delete(key);
		}
	}

	/** Every tile let go: the scene changed, or the engine is done. */
	private dropTiles() {
		for (const t of this.held.values()) t.loading?.cancel(), t.bmp?.close();
		this.held.clear();
	}

	/** Every background tile in view has arrived, or has no art. */
	private tilesIn() {
		const scene = this.scene!, r = tileRange(this.cam, this.view, scene, 0);
		for (let row = r.y0; row <= r.y1; row++)
			for (let col = r.x0; col <= r.x1; col++) {
				const key = `${col}-${row}`;
				if (tileUrl(scene, this.density, key) && !this.held.get(key)?.bmp) return false;
			}
		return true;
	}

	/**
	 * From Join on, a door in `view` has what its hop lands on fetched ahead: the tiles in view there and
	 * the cut-outs standing in it, into the browser's cache, once nothing of this scene is still coming, so the iris
	 * opens on the whole view. A sub-scene's only door is its exit, fetched ahead wherever the camera is; each scene once.
	 */
	private lookAhead(scene: Scene, view: Rect) {
		for (let i = this.doors.length - 1; i >= 0; i--) {
			const { to, at } = this.doors[i];
			if (!('exit' in scene || overlaps(at, view))) continue;
			this.doors.splice(i, 1);
			const v = { ...this.view, s: this.base }, cam = centreOn(landing(to, scene), v, to), r = tileRange(cam, v, to, 0);
			const tiles: string[] = [];
			for (let row = r.y0; row <= r.y1; row++)
				for (let col = r.x0; col <= r.x1; col++) {
					const url = tileUrl(to, this.density, `${col}-${row}`);
					if (url) tiles.push(url);
				}
			this.loader.warm([...tiles, ...artIn(to, this.density, { x: cam.x, y: cam.y, w: v.w / v.s, h: v.h / v.s })]);
		}
	}

	/** The world rect in view. */
	private seen(): Rect {
		return { x: this.cam.x, y: this.cam.y, w: this.view.w / this.view.s, h: this.view.h / this.view.s };
	}

	/**
	 * The background tiles in view, then the props over them; or only those within `area` (world px), clipped to the whole
	 * device px round it, which paint exactly what a full drawing would there.
	 */
	private drawScene(scene: Scene, area?: Rect) {
		const g = this.g, k = this.view.s * this.dpr, seen = this.seen(), a = area ?? seen;
		// Tile edges rounded to device px from world px, so neighbours meet without seams.
		const px = (world: number, cam: number) => Math.round((world - cam) * k);
		const x = Math.floor((a.x - this.cam.x) * k), y = Math.floor((a.y - this.cam.y) * k);
		const w = Math.ceil((a.x + a.w - this.cam.x) * k) - x, h = Math.ceil((a.y + a.h - this.cam.y) * k) - y;
		g.save();
		if (area) {
			g.beginPath();
			g.rect(x, y, w, h);
			g.clip();
		} else this.dirty = false;
		g.fillStyle = BACKDROP;
		g.fillRect(x, y, w, h);
		const r = tileRange({ x: a.x, y: a.y }, { w: a.w, h: a.h, s: 1 }, scene, 0);
		for (let row = r.y0; row <= r.y1; row++)
			for (let col = r.x0; col <= r.x1; col++) {
				const bmp = this.held.get(`${col}-${row}`)?.bmp;
				if (!bmp) continue;
				const x0 = px(col * TILE, this.cam.x), y0 = px(row * TILE, this.cam.y);
				const x1 = px(Math.min(scene.w, (col + 1) * TILE), this.cam.x), y1 = px(Math.min(scene.h, (row + 1) * TILE), this.cam.y);
				g.drawImage(bmp, x0, y0, x1 - x0, y1 - y0);
			}
		this.props.draw(g, this.cam, k, a);
		this.projector.draw(g, this.cam, k);
		g.restore();
	}

	/**
	 * The drawn cursor, from Join on, goes to the room at its world position, with what it wears; over something to click
	 * it is drawn as the pointing hand, a local drawing the room never hears of. Peers near the camera are
	 * drawn 100 ms behind; the rest are neither interpolated nor drawn. A cosmetic newly worn, granted here or in another
	 * tab, pops in. Every cursor shrinks toward its depth region's horizon, and the scenery that covers it is drawn over
	 * it (ticket 19): peers are followed through the scene as the own cursor is, locally, from where they are drawn, a
	 * peer's snap being a jump. With a prop card open no scenery is drawn: the cursor canvas is then over the card and its
	 * backdrop (on touch under them, `lift`), where a cut-out would paint the scenery undimmed over both, and the cursors
	 * are drawn over everything.
	 * The bridge is drawn over a cursor in the river, own or peer, by the river bit a peer's presence carries, and the
	 * wash-out's fade over everything (ticket 20).
	 */
	private drawCursors(scene: Scene, now: number) {
		const c = this.cursor, cam = this.cam, s = this.view.s, k = s * this.dpr, gold = saved.gold;
		if (saved.worn !== this.worn) (this.worn = saved.worn), (this.wornAt = now);
		if (c) {
			this.net.move(cam.x + c.x / s, cam.y + c.y / s);
			this.tellRoom();
		}
		const card = !!this.layer.querySelector('dialog[open]');
		const bridge = card ? [] : this.scenery.bridge(cam, k);
		const fade = this.reducedMotion.matches ? 0 : Math.max(0, 1 - (now - this.washedAt) / WASH);
		const behind = (sides: ReadonlyMap<string, Side>, afloat: boolean) => (card ? [] : [...(afloat ? bridge : []), ...this.scenery.behind(sides, cam, k)]);
		const view = this.seen(), peers: Drawn[] = [];
		for (const [id, p] of this.net.peers) {
			const at = visible(p.snaps, view) && sample(p.snaps, now);
			if (!at) continue;
			let f = this.peerFollow.get(id);
			if (!f) this.peerFollow.set(id, (f = follower(scene)));
			const last = f.last, { d, sides } = f.step(at, now, !!last && Math.hypot(at.x - last.x, at.y - last.y) > SNAP);
			peers.push({ x: (at.x - cam.x) * k, y: (at.y - cam.y) * k, cc: p.cc, gold: p.gold, cos: p.cos, wornAt: p.wornAt, d, behind: behind(sides, p.river), remote: id === this.net.tv.holder });
		}
		for (const id of this.peerFollow.keys()) if (!this.net.peers.has(id)) this.peerFollow.delete(id);
		const own = c && {
			x: c.x * this.dpr, y: c.y * this.dpr, cc: this.net.cc, gold, cos: this.worn, wornAt: this.wornAt, hand: this.pointing, d: this.ownDepth, behind: behind(this.ownSides, this.current.is === 'afloat'), remote: tv.held === 'me'
		};
		const r = hole(this.iris, now, this.view), iris = this.iris;
		const shade = r === null || iris.is === 'open' ? null : { x: iris.at.x * this.dpr, y: iris.at.y * this.dpr, r: r * this.dpr };
		this.art.draw(own, peers, now, shade, card ? [] : this.scenery.foreground(cam, k), fade);
	}

	/** What the cursor wears and whether it is in the river, to the room from Join on; the net client sends only a change. */
	private tellRoom() {
		if (this.cursor) this.net.presence({ cos: saved.worn, gold: saved.gold, river: this.current.is === 'afloat' });
	}
}
