// The scene loop (buildout ticket 08): background tiles on the scene canvas, the prerendered layer moved with one transform
// per camera change, the visitor's drawn cursor on the overlay canvas, and the camera from camera.ts. The input (ticket 09):
// the Join card, the pointer lock with its fallback to the unlocked mouse, pause and resume, and the keys. Touch (ticket 10):
// the joystick, drag-to-pan with its fling, and tap-to-activate. The hop between scenes (ticket 11): the fade, landing at
// the door and focus. Peers (ticket 13): the scene's room through net.ts, every cursor drawn by cursors.ts. The props on
// the scene canvas (ticket 15) are props.ts. Cosmetics (ticket 16): a granting prop's card grants, the saved state
// (saved.svelte.ts) keeps them, and the room hears what the cursor wears. The Foundry screen's reel (ticket 17) is
// projector.ts, and the camera zooms out to frame it. The Carondelet lap timer (ticket 18) is laps.ts. Carried over from
// the rendering and pointer-lock prototypes' engines (prototype/rendering-camera, prototype/pointer-lock) with the spec's
// rules; the layer's markup is never re-rendered here.
import { COSMETICS } from '../cosmetics.ts';
import { saved } from '../saved.svelte.ts';
import { propsOf } from '../scenes/index.ts';
import type { Overworld, Point, Rect, SubScene } from '../scenes/types';
import { Net } from '../net/net.ts';
import { sample, visible } from '../net/peers.ts';
import { Props, clickedProp } from './props.ts';
import { Projector } from './projector.ts';
import {
	KEYS, TILE, centreOn, clamp, coast, fling, framing, glide, pan, rendering, steer, step, stick, tileRange, zoom, type Move, type View
} from './camera.ts';
import { Cursors, type Drawn } from './cursors.ts';
import { Laps } from './laps.ts';

export type Scene = Overworld | SubScene;

/**
 * The visitor's input (spec: Input): the Join card up; joined with the pointer locked, with the unlocked mouse (a refused
 * lock), or by touch on a device with no mouse or trackpad; released, the lock let go by Esc in a card until the next
 * click takes it back; or paused, which re-locks on resume if the lock was held.
 */
type Input = { is: 'join' } | { is: 'locked' } | { is: 'unlocked' } | { is: 'touch' } | { is: 'released' } | { is: 'paused'; relock: boolean };

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

/**
 * The on-screen toggles: they hold the camera still when the mouse's cursor is near them. On touch they and the joystick
 * are the finger's, and the drawn cursor over them neither marks, clicks nor holds anything (Joe, 2026-09-29). Cards stop
 * the camera anyway.
 */
const CONTROLS = '.controls';
/** The drawn cursor's height, world px: a touch drag carries it this far inside the viewport's edge, so it stays in view. */
const CARRY = 40;
/** A touch becomes a drag once it has gone this many CSS px, so a tap on a prop isn't eaten. */
const DRAG = 6;
/** Behind the scene where no tile has arrived, or beyond a scene smaller than the view. */
const BACKDROP = '#1d2b3a';

const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
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
	/** The control under the locked or touch-steered cursor, marked `.hot` since the page gets no hover there. */
	private hot: Element | null = null;
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
	/** Background tiles held, by `<column>-<row>`; a tile still loading has no bitmap. */
	private held = new Map<string, { bmp?: ImageBitmap }>();
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
	/** The Carondelet lap timer (ticket 18). */
	private laps: Laps;
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
		if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open && !this.isGate(r.target))) {
			this.cursors.hidePopover();
			this.cursors.showPopover();
		}
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
		this.props = new Props(layer);
		this.projector = new Projector(layer, this.net);
		this.laps = new Laps(status.lap, status.live);
		document.documentElement.classList.add('engine');
		this.bind();
		this.resize();
		this.moveTo(this.cam);
		// The cursor canvas enters the top layer before the Join card, so the card dims it with the scene.
		cursors.showPopover();
		this.raise.observe(document.body, { subtree: true, attributeFilter: ['open'] });
		this.enter(this.input);
		this.raf = requestAnimationFrame(this.tick);
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.net.destroy();
		this.listeners.abort();
		this.props.destroy();
		this.projector.destroy();
		this.raise.disconnect();
		for (const t of this.held.values()) t.bmp?.close();
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
		for (const card of Object.values(this.cards)) card.close();
		this.cursors.hidePopover();
		this.hot?.classList.remove('hot');
		document.documentElement.classList.remove('engine');
		delete document.documentElement.dataset.input;
		this.layer.style.transform = '';
	}

	/**
	 * Each navigation's scene and fragment. A page load opens centred on the fragment's target, else the overworld's
	 * arrival point (the welcome sign) or a sub-scene's exit door. A hop from another scene (ticket 11) lands at a door
	 * whatever the fragment: into a sub-scene just inside its exit door, focus on its h1; back on the overworld, by the exit
	 * door or the browser's back button, on the door of the venue left, focus on that door. The camera is centred on where
	 * it lands, a joined cursor is put there and the new scene fades in over 300 ms, a cut under reduced motion.
	 */
	show(scene: Scene, hash: string) {
		const target = placed(byHash(hash));
		if (scene === this.scene) {
			if (target) this.panTo(target);
			return;
		}
		const from = this.scene, overworld = 'districts' in scene;
		this.scene = scene;
		// A new scene is a new room (ticket 13): one socket closes and the next opens, and a joined cursor is tagged "you".
		this.net.join(scene.id);
		if (this.cursor) this.art.tag();
		// A prop that only says its state (the Foundry screen) is nothing to aim at.
		this.targets = [...(overworld ? [scene.signpost.rect] : []), ...propsOf(scene).filter((p) => p.kind !== 'status').map((p) => p.rect)];
		for (const t of this.held.values()) t.bmp?.close();
		this.held.clear();
		this.props.show(scene, this.density);
		this.projector.show(scene);
		this.goal = null;
		const door = from && this.layer.querySelector<HTMLElement>(overworld ? `#${from.id} .door` : '.door');
		const at = door ?? target;
		const box = at ? this.box(at) : overworld ? propsOf(scene).find((p) => p.id === 'welcome')!.rect : scene.exit;
		// Just inside a sub-scene's door is the floor in front of it, a cursor's height below the door on its wall, where a
		// click doesn't leave again. The overworld's doors are whole buildings.
		const c = door && !overworld ? { x: box.x + box.w / 2, y: box.y + box.h + CARRY } : centre(box);
		// A hop out of the Foundry mid-reel lands at the session's scale; the box above was read at the reel's.
		this.view = { ...this.view, s: this.base };
		this.moveTo(centreOn(c, this.view, scene));
		if (!door) return;
		// Before Join there is no cursor. The unlocked mouse's cursor stays at the OS pointer, where its clicks land. Push
		// waits for the cursor to move, so a door near the scene's edge doesn't carry the camera off it.
		if (this.cursor && this.input.is !== 'unlocked') this.cursor = { x: (c.x - this.cam.x) * this.view.s, y: (c.y - this.cam.y) * this.view.s };
		this.armed = false;
		// Focus moves after the router's own reset, which for a URL with a fragment (the exit door's `/#<venue>`) runs in a
		// timeout queued before this one and clears focus, the venue's section being unfocusable. A back or forward hop
		// behind the Join or Paused card, whose page is inert, hands focus back to the card's button, which that reset
		// took it from.
		const focus = document.querySelector<HTMLElement>('.gate[open] button') ?? (overworld ? door : this.layer.querySelector<HTMLElement>('h1'));
		setTimeout(() => focus?.focus());
		if (!this.reducedMotion.matches) this.canvas.animate({ opacity: [0, 1] }, 300);
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
				// A real move re-arms the push; a synthetic one (content moving under a still pointer) has no movement.
				if (e.movementX || e.movementY) this.armed = true;
			},
			opts
		);
		// Locked, the mouse's clicks come to the canvas holding the lock: each goes to the control the drawn cursor is over,
		// a card's Close and the links inside it included. A tap on the canvas is on bare scenery and clicks nothing.
		this.canvas.addEventListener('click', () => { if (this.input.is === 'locked') this.under()?.click(); }, opts);
		// A middle click opens the link under the locked cursor in a new tab, as it would at the OS pointer (ticket 11). A
		// page can only open the tab in front, which pauses this one.
		this.canvas.addEventListener(
			'auxclick',
			(e) => {
				const a = e.button === 1 && this.under();
				// No opener, as a native middle click gives none: a card's external link can't reach back into this tab.
				if (a instanceof HTMLAnchorElement) window.open(a.href, '_blank', 'noopener');
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
				if (this.input.is !== 'touch' || e.pointerType !== 'touch' || (e.target as Element).closest('dialog, .controls, .joystick')) return;
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
		addEventListener('keydown', (e) => { if (Object.hasOwn(KEYS, e.code) && !e.metaKey && !e.ctrlKey && !e.altKey) this.keys.add(e.code); }, opts);
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
		// first time, worn again every time. Ticket 22 plays the chime here, and the fanfare on the grant that turns it gold.
		this.layer.addEventListener(
			'click',
			(e) => {
				const id = clickedProp(e);
				const cos = id && this.scene && propsOf(this.scene).find((p) => p.id === id)?.cosmetic;
				if (!cos) return;
				const gold = saved.gold;
				if (saved.grant(cos)) this.live.textContent = `You earned the ${COSMETICS[cos].name}${!gold && saved.gold ? ', and your cursor turned gold' : ''}`;
			},
			opts
		);
	}

	private isGate(card: HTMLDialogElement) {
		return card === this.cards.join || card === this.cards.paused;
	}

	/** The Paused card's note that the browser refused the lock. */
	private get refusal() {
		return this.cards.paused.querySelector<HTMLElement>('.refused')!;
	}

	/**
	 * The link or button under the drawn cursor when it is locked, or steered by touch outside a card (whose controls take
	 * their own taps, the joystick behind it) and off the toggles, which are the finger's too; null for the mouse's real
	 * pointer.
	 */
	private under() {
		const touch = this.input.is === 'touch', c = (this.input.is === 'locked' || (touch && !document.querySelector('dialog[open]'))) && this.cursor;
		const hit = c ? document.elementFromPoint(c.x, c.y)?.closest<HTMLElement>('a, button') : null;
		return hit && !(touch && hit.closest(CONTROLS)) ? hit : null;
	}

	/**
	 * Something to click is under the drawn cursor, which points at it with the hand (Joe, 2026-09-30): what `mark` found
	 * under the lock or a steered touch, or the link or button under the unlocked mouse, whose own cursor is hidden too.
	 */
	private get pointing() {
		const c = this.cursor;
		if (this.input.is !== 'unlocked') return !!this.hot;
		return !!c && !!document.elementFromPoint(c.x, c.y)?.closest('a, button');
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

	/** Esc with no card, blur or a hidden tab: the lock released, the cursor frozen where it is, the camera and keys stopped. */
	private pause() {
		if (!joined(this.input)) return;
		this.keys.clear();
		this.enter({ is: 'paused', relock: this.input.is === 'locked' || this.input.is === 'released' });
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
	}

	/**
	 * Re-locks with the cursor where it froze; the lock's arrival closes the card, a refusal keeps it up and says so. On
	 * touch the Resume tap is where the sound engine (ticket 21) resumes audio.
	 */
	private resume() {
		if (this.input.is !== 'paused') return;
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
		const j = this.joy ? stick(this.joy.pull, this.joy.r, this.view.s, dt) : { x: 0, y: 0 }, d = { x: k.x + j.x, y: k.y + j.y };
		if (c && (d.x || d.y) && !this.projector.seated) {
			this.steerTo({ x: c.x + d.x, y: c.y + d.y }, now);
			this.inside = this.armed = true;
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
				const cursor = free && this.armed && (this.input.is === 'locked' || this.inside) ? this.cursor : null;
				const controls =
					cursor && this.input.is !== 'touch'
						? [...document.querySelectorAll(CONTROLS)].map((c) => c.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }))
						: [];
				const pressed = now - this.pressedAt < 100;
				cam = step(this.cam, { view: this.view, scene, band: scene.pushBand ?? 0.12, cursor, props: this.targets, controls, pressed }, dt);
			}
			if (cam.x !== this.cam.x || cam.y !== this.cam.y) this.moveTo(cam);
		}
		// The scene canvas is drawn only when something on it changed: all of it for the camera or a tile, just the props'
		// area when only they moved on a still camera (props.ts), which keeps a breathing moose from repainting the screen.
		const t = this.net.serverNow(), moved = this.props.step(dt * 1000, t, this.seen(), this.reducedMotion.matches), lit = this.projector.step(t);
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
		this.drawCursors(now);
	};

	/** Locked or on touch, the page has no hover at the drawn cursor, so the link or button under it is marked `.hot` instead. */
	private mark() {
		const hit = this.under();
		if (hit === this.hot) return;
		this.hot?.classList.remove('hot');
		hit?.classList.add('hot');
		this.hot = hit;
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

	/** Fetch the tiles in view and one ring beyond; close and forget any beyond two rings, so phone memory stays flat. */
	private loadTiles() {
		const scene = this.scene!, want = tileRange(this.cam, this.view, scene, 1), keep = tileRange(this.cam, this.view, scene, 2);
		for (let row = want.y0; row <= want.y1; row++)
			for (let col = want.x0; col <= want.x1; col++) {
				const key = `${col}-${row}`;
				if (this.held.has(key)) continue;
				const tile: { bmp?: ImageBitmap } = {};
				this.held.set(key, tile);
				const url = TILE_URLS[`/art/generated/${scene.id}/${scene.id}/${this.density}/${key}.webp`];
				if (!url) continue; // no art for this scene: the backdrop shows
				fetch(url)
					.then((r) => r.blob())
					.then((b) => createImageBitmap(b))
					.then((bmp) => {
						if (this.held.get(key) !== tile) return bmp.close(); // evicted, or the scene changed, while loading
						tile.bmp = bmp;
						this.dirty = true;
					})
					.catch(() => {}); // a failed tile stays backdrop
			}
		for (const [key, tile] of this.held) {
			const [col, row] = key.split('-').map(Number);
			if (col >= keep.x0 && col <= keep.x1 && row >= keep.y0 && row <= keep.y1) continue;
			tile.bmp?.close();
			this.held.delete(key);
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
	 * tab, pops in.
	 */
	private drawCursors(now: number) {
		const c = this.cursor, cam = this.cam, s = this.view.s, k = s * this.dpr, gold = saved.gold;
		if (saved.worn !== this.worn) (this.worn = saved.worn), (this.wornAt = now);
		if (c) {
			this.net.move(cam.x + c.x / s, cam.y + c.y / s);
			this.tellRoom();
		}
		const view = this.seen(), peers: Drawn[] = [];
		for (const p of this.net.peers.values()) {
			const at = visible(p.snaps, view) && sample(p.snaps, now);
			if (at) peers.push({ x: (at.x - cam.x) * k, y: (at.y - cam.y) * k, cc: p.cc, gold: p.gold, cos: p.cos, wornAt: p.wornAt });
		}
		const own = c && { x: c.x * this.dpr, y: c.y * this.dpr, cc: this.net.cc, gold, cos: this.worn, wornAt: this.wornAt, hand: this.pointing };
		this.art.draw(own, peers, now);
	}

	/** What the cursor wears, to the room from Join on; the net client sends only a change. */
	private tellRoom() {
		if (this.cursor) this.net.presence({ cos: saved.worn, gold: saved.gold, river: false });
	}

	/** Shows the "you" tag on the own cursor again: the Arch reset (ticket 20) calls this. */
	tagYou() {
		this.art.tag();
	}
}
