// The scene loop shared by every variant: camera rules from ticket 06, input, background tiles, own
// cursor, peers, prop motion and stats. Variants (renderers/) only decide where props and cursors are
// drawn and hit-tested.
import { SCENES, multiplyProps, type SceneDef, type SceneId } from './scenes';
import { newProp, updateProp, hitProp, type PropState } from './props';
import { loadSprites, type Sprites } from './sprites';
import { Peers } from './peers';
import { Net } from './net';
import { Stats } from './stats';
import { ui } from './ui.svelte';
import type { M } from './math';
import { DomProps } from './renderers/dom-props';
import { CanvasProps } from './renderers/canvas-props';
import { AllCanvas } from './renderers/all-canvas';

export type Variant = 'A' | 'B' | 'C';
export const VARIANTS: { key: Variant; name: string }[] = [
	{ key: 'A', name: 'DOM props, DOM cursors' },
	{ key: 'B', name: 'Canvas props, DOM hit targets, cursor canvas' },
	{ key: 'C', name: 'All canvas, alpha hit regions, hidden HTML' }
];

export interface Settings {
	variant: Variant;
	bots: number;
	bg: 'canvas' | 'dom';
	scale: number;
	dprCap: number;
	rm: boolean;
	props: number;
	tiles: number; // 0 = auto
	push: number;
	joy: number;
	tau: number;
	band: number; // 0 = scene default
	hz: number;
	delay: number; // interpolation delay, ms
	turnstile: boolean;
	ws: string; // socket base URL
}

export function readSettings(q: URLSearchParams): Settings {
	const coarse = matchMedia('(pointer: coarse)').matches;
	const small = Math.min(screen.width, screen.height) < 700;
	const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
	return {
		variant: (['A', 'B', 'C'].includes(q.get('variant') ?? '') ? q.get('variant') : 'B') as Variant,
		bots: num('bots', 0), // > 0: ticket 08's simulated peers instead of the socket
		bg: q.get('bg') === 'dom' ? 'dom' : 'canvas',
		scale: num('scale', coarse ? (small ? 0.6 : 0.8) : 1),
		dprCap: num('dpr', 2),
		rm: q.has('rm') ? q.get('rm') === '1' : matchMedia('(prefers-reduced-motion: reduce)').matches,
		props: num('props', 1),
		tiles: num('tiles', 0),
		push: num('push', 900),
		joy: num('joy', 600),
		tau: num('tau', 0.15),
		band: num('band', 0),
		hz: num('hz', 15),
		delay: num('delay', 100),
		turnstile: q.get('ts') !== '0',
		ws: q.get('ws') ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
	};
}

export interface Renderer {
	mount(e: Engine): void;
	frame(e: Engine): void;
	hitTest?(wx: number, wy: number): PropState | null;
	destroy(): void;
}

interface Tile { bmp?: ImageBitmap; img?: HTMLImageElement; dead?: boolean }

export interface Script {
	t: number;
	dur: number;
	path: [number, number][];
	done: () => void;
	nextClick: number;
}

const TILE = 512;
const MANIFEST: Record<string, { cols: number; rows: number }> = {
	overworld: { cols: 11, rows: 6 },
	lobby: { cols: 6, rows: 4 }
};

export class Engine {
	scene!: SceneDef;
	props: PropState[] = [];
	sprites!: Sprites;
	peers!: Peers | Net;
	net: Net;
	renderer!: Renderer;
	stats = new Stats();
	settings: Settings;

	vw = 0; vh = 0; s: number; dpr: number; density: number;
	cam = { x: 0, y: 0 };
	own = { x: 0, y: 0, cosmetic: -1, gold: false, youUntil: 0 };
	pointer = { x: 0, y: 0, inside: false };
	touchMode = false;
	joy = { x: 0, y: 0, active: false };
	keys = new Set<string>();
	hover: PropState | null = null;
	domHover: string | null = null;
	focused: string | null = null;
	script: Script | null = null;
	t = 0;

	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	tileLayer: HTMLDivElement;
	fade: HTMLDivElement;
	private tiles = new Map<string, Tile>();
	private drag: null | { id: number; x0: number; y0: number; x: number; y: number; moved: boolean; touch: boolean; samples: [number, number, number][] } = null;
	private inertia = { vx: 0, vy: 0 };
	private suppressClick = false;
	private raf = 0;
	private last = 0;
	private hudAt = 0;
	private loading: Promise<void> | null = null;
	private off: (() => void)[] = [];

	constructor(public root: HTMLElement, settings: Settings, private nav: (path: string, back?: boolean) => void) {
		this.settings = settings;
		this.net = new Net({ hz: settings.hz, delay: settings.delay, turnstile: settings.turnstile, base: settings.ws });
		this.s = settings.scale;
		this.dpr = Math.min(devicePixelRatio || 1, settings.dprCap);
		const need = this.s * this.dpr;
		this.density = settings.tiles || (need <= 1.3 ? 1.25 : 2);

		this.tileLayer = el('div', 'tile-layer');
		this.canvas = el('canvas', 'scene-canvas');
		this.ctx = this.canvas.getContext('2d', { alpha: settings.bg === 'dom' })!;
		this.fade = el('div', 'fade');
		root.append(this.tileLayer, this.canvas, this.fade);
		this.tileLayer.hidden = settings.bg !== 'dom';
		this.bindInput();
		this.setTouch(matchMedia('(pointer: coarse)').matches);
		(window as unknown as { __eng: Engine }).__eng = this; // PROTOTYPE: poke from devtools
		this.resize();
	}

	// ---- lifecycle --------------------------------------------------------------------------------

	async start(id: SceneId) {
		await this.loadScene(id, null);
		this.setVariant(this.settings.variant);
		this.last = performance.now();
		this.raf = requestAnimationFrame(this.tick);
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.net.destroy();
		this.renderer?.destroy();
		this.off.forEach((f) => f());
		this.tiles.forEach((t) => t.bmp?.close());
		this.root.replaceChildren();
	}

	setVariant(v: Variant) {
		this.renderer?.destroy();
		this.settings.variant = v;
		ui.variant = v;
		this.domHover = null;
		this.renderer = v === 'A' ? new DomProps() : v === 'B' ? new CanvasProps() : new AllCanvas();
		this.renderer.mount(this);
		this.canvas.hidden = v === 'A' && this.settings.bg === 'dom';
	}

	setPeers(n: number) {
		this.settings.bots = n;
		if (this.peers instanceof Peers) this.peers.resize(n, this.t);
	}

	/** Route changed: fade, swap scene, place the cursor at the door it came through. */
	async goScene(id: SceneId) {
		if (!this.scene || this.scene.id === id || this.loading) return;
		this.fade.style.opacity = '1';
		await wait(220);
		const from = this.scene.id;
		this.loading = this.loadScene(id, from);
		await this.loading;
		this.loading = null;
		this.renderer.destroy();
		this.renderer.mount(this);
		this.fade.style.opacity = '0';
	}

	private async loadScene(id: SceneId, from: SceneId | null) {
		const scene = SCENES[id];
		const defs = multiplyProps(scene, this.settings.props);
		this.sprites = await loadSprites(defs, this.density);
		this.scene = scene;
		this.props = defs.map(newProp);
		this.tiles.forEach((t) => (t.dead = true, t.bmp?.close(), t.img?.remove()));
		this.tiles.clear();
		if (this.settings.bots) this.peers = new Peers(scene, this.settings.bots, this.t);
		else { this.peers = this.net; this.net.join(id); }
		ui.card = null;
		let at = scene.arrival;
		const door = from && scene.props.find((p) => p.enter === from);
		if (door) {
			at = { x: door.x + door.w / 2, y: door.y + door.h + 24 };
		}
		this.own.x = at.x;
		this.own.y = at.y;
		this.own.youUntil = this.t + 4;
		this.centreOn(at.x, at.y);
		if (!this.touchMode) this.pointer.inside = false; // no push until the mouse moves again
	}

	// ---- geometry ---------------------------------------------------------------------------------

	get viewW() { return this.vw / this.s; }
	get viewH() { return this.vh / this.s; }
	get band() { return this.settings.band || this.scene.band; }

	resize() {
		this.vw = this.root.clientWidth;
		this.vh = this.root.clientHeight;
		this.canvas.width = Math.round(this.vw * this.dpr);
		this.canvas.height = Math.round(this.vh * this.dpr);
		this.canvas.style.width = this.vw + 'px';
		this.canvas.style.height = this.vh + 'px';
		this.renderer?.destroy();
		this.renderer?.mount(this);
	}

	centreOn(x: number, y: number) {
		this.cam.x = x - this.viewW / 2;
		this.cam.y = y - this.viewH / 2;
		this.clamp();
	}

	private clamp() {
		const c = (v: number, view: number, size: number) => (size <= view ? (size - view) / 2 : Math.max(0, Math.min(size - view, v)));
		this.cam.x = c(this.cam.x, this.viewW, this.scene.w);
		this.cam.y = c(this.cam.y, this.viewH, this.scene.h);
	}

	/** World -> device px for canvases. */
	get worldM(): M {
		const k = this.s * this.dpr;
		return [k, 0, 0, k, -this.cam.x * k, -this.cam.y * k];
	}

	get ownScreen() {
		return { x: (this.own.x - this.cam.x) * this.s, y: (this.own.y - this.cam.y) * this.s };
	}

	/** True when the cursor is driven by something other than a real mouse (joystick or bench). */
	get virtualCursor() {
		return !!this.script || (this.touchMode && this.joy.active);
	}

	// ---- input ------------------------------------------------------------------------------------

	private on<K extends keyof WindowEventMap>(t: Window | HTMLElement, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) {
		t.addEventListener(type, fn as EventListener, opts);
		this.off.push(() => t.removeEventListener(type, fn as EventListener, opts));
	}

	private bindInput() {
		const r = this.root;
		this.on(window, 'resize', () => this.resize());
		this.on(r, 'pointerdown', (e) => {
			if ((e.target as HTMLElement).closest('.ui')) return;
			this.setTouch(e.pointerType !== 'mouse');
			if (this.drag) return;
			this.inertia.vx = this.inertia.vy = 0;
			this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType !== 'mouse', samples: [] };
		}, { capture: true });
		this.on(window, 'pointermove', (e) => {
			if (e.pointerType === 'mouse') {
				this.setTouch(false);
				this.pointer.x = e.clientX;
				this.pointer.y = e.clientY;
				this.pointer.inside = true;
			}
			const d = this.drag;
			if (!d || d.id !== e.pointerId) return;
			if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true;
			if (d.moved) {
				this.cam.x -= (e.clientX - d.x) / this.s;
				this.cam.y -= (e.clientY - d.y) / this.s;
				this.clamp();
				d.samples.push([e.timeStamp, e.clientX, e.clientY]);
				if (d.samples.length > 8) d.samples.shift();
			}
			d.x = e.clientX;
			d.y = e.clientY;
		});
		const up = (e: PointerEvent) => {
			const d = this.drag;
			if (!d || d.id !== e.pointerId) return;
			this.drag = null;
			if (d.moved) {
				this.suppressClick = true;
				setTimeout(() => (this.suppressClick = false), 0);
				const recent = d.samples.filter((s) => e.timeStamp - s[0] < 80);
				if (d.touch && recent.length > 1) {
					const a = recent[0], b = recent[recent.length - 1], dt = (b[0] - a[0]) / 1000 || 1;
					this.inertia.vx = -(b[1] - a[1]) / dt / this.s;
					this.inertia.vy = -(b[2] - a[2]) / dt / this.s;
				}
			} else if (e.type === 'pointerup' && this.renderer.hitTest && !(e.target as HTMLElement).closest('.ui')) {
				const p = this.renderer.hitTest(this.cam.x + e.clientX / this.s, this.cam.y + e.clientY / this.s);
				if (p) this.activate(p, d.touch);
			}
		};
		this.on(window, 'pointerup', up);
		this.on(window, 'pointercancel', up);
		this.on(r, 'click', (e) => {
			if (this.suppressClick) { e.stopPropagation(); e.preventDefault(); }
		}, { capture: true });
		this.on(window, 'mouseout', (e) => { if (!e.relatedTarget) this.pointer.inside = false; });
		this.on(window, 'blur', () => { this.pointer.inside = false; this.keys.clear(); });
		this.on(r, 'wheel', (e) => {
			e.preventDefault();
			if (e.ctrlKey) return; // pinch: no zoom (ADR 0001)
			const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.vh : 1;
			const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
			this.cam.x += (dx * k) / this.s;
			this.cam.y += (dy * k) / this.s;
			this.clamp();
		}, { passive: false });
		const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'];
		this.on(window, 'keydown', (e) => {
			if ((e.target as HTMLElement).closest('input,select,textarea')) return;
			if (e.key === 'Escape') ui.card = null;
			const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
			if (KEYS.includes(k)) { this.keys.add(k); e.preventDefault(); }
		});
		this.on(window, 'keyup', (e) => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
	}

	private setTouch(on: boolean) {
		if (this.touchMode === on) return;
		this.touchMode = on;
		ui.touch = on;
		this.root.classList.toggle('touch', on);
	}

	/** Renderers call this for DOM clicks (A, B); the canvas variant resolves taps itself. */
	onPropClick(id: string, e: MouseEvent) {
		const p = this.props.find((q) => q.def.id === id);
		if (!p) return;
		const touch = this.touchMode && e.detail > 0; // keyboard clicks have detail 0
		this.activate(p, touch);
	}

	/** Keyboard focus on a prop: bring it into view. */
	focusProp(id: string | null, keyboard: boolean) {
		this.focused = id;
		const p = id && this.props.find((q) => q.def.id === id);
		if (p && keyboard) this.centreOn(p.x + p.w / 2, p.y + p.h / 2);
	}

	activate(p: PropState, touch: boolean) {
		if (touch) { this.own.x = p.x + p.w / 2; this.own.y = p.y + p.h / 2; }
		p.clickT = 0;
		if (this.script) return;
		const d = p.def;
		if (d.play) return this.net.play(d.play);
		if (d.cosmetic != null && this.own.cosmetic !== d.cosmetic) {
			this.own.cosmetic = d.cosmetic;
			this.net.setCos(d.cosmetic, this.own.gold);
			ui.toast = `Cosmetic granted by ${d.title}`;
			setTimeout(() => (ui.toast = ''), 2000);
		}
		if (d.enter) this.nav(SCENES[d.enter].path);
		else if (d.exit) this.nav('/', true);
		else ui.card = { title: d.title, body: d.body };
	}

	// ---- loop -------------------------------------------------------------------------------------

	private tick = (now: number) => {
		this.raf = requestAnimationFrame(this.tick);
		const delta = now - this.last;
		this.last = now;
		const t0 = performance.now();
		const dt = Math.min(0.05, delta / 1000);
		this.t += dt;
		if (!this.loading) {
			this.update(dt);
			this.drawBackground();
			this.renderer.frame(this);
		}
		this.stats.push(delta, performance.now() - t0);
		if (now - this.hudAt > 250) { this.hudAt = now; this.hud(); }
	};

	private update(dt: number) {
		const st = this.settings;
		let vx = 0, vy = 0;
		const sc = this.script;
		if (sc) {
			this.runScript(sc, dt);
		} else {
			// joystick moves the cursor in world space; the camera follows through the push band
			if (this.joy.active) {
				this.own.x = Math.max(0, Math.min(this.scene.w, this.own.x + this.joy.x * st.joy * dt));
				this.own.y = Math.max(0, Math.min(this.scene.h, this.own.y + this.joy.y * st.joy * dt));
			}
			const pushing = !this.drag && (this.touchMode ? this.joy.active : this.pointer.inside);
			if (pushing && !this.nearProp()) {
				const p = this.touchMode ? this.ownScreen : this.pointer;
				vx += edge(p.x, this.vw, this.band) * st.push;
				vy += edge(p.y, this.vh, this.band) * st.push;
			}
			const k = this.keys;
			vx += ((k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)) * 800;
			vy += ((k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0)) * 800;
			if (!this.drag && (this.inertia.vx || this.inertia.vy)) {
				vx += this.inertia.vx; vy += this.inertia.vy;
				const f = Math.exp(-dt / st.tau);
				this.inertia.vx *= f; this.inertia.vy *= f;
				if (Math.hypot(this.inertia.vx, this.inertia.vy) < 5) this.inertia.vx = this.inertia.vy = 0;
			}
			this.cam.x += vx * dt;
			this.cam.y += vy * dt;
			this.clamp();
			if (this.touchMode) {
				// touch drag pans without moving the cursor in world space, but never loses it off screen
				const m = 16 / this.s;
				this.own.x = Math.max(this.cam.x + m, Math.min(this.cam.x + this.viewW - m, this.own.x));
				this.own.y = Math.max(this.cam.y + m, Math.min(this.cam.y + this.viewH - m, this.own.y));
			} else if (this.pointer.inside) {
				this.own.x = this.cam.x + this.pointer.x / this.s;
				this.own.y = this.cam.y + this.pointer.y / this.s;
			}
			this.net.move(this.own.x, this.own.y);
		}

		// visibility, hover, motion
		const vx0 = this.cam.x - 60, vy0 = this.cam.y - 60, vx1 = this.cam.x + this.viewW + 60, vy1 = this.cam.y + this.viewH + 60;
		for (const p of this.props) p.visible = p.x + p.w > vx0 && p.x < vx1 && p.y + p.h > vy0 && p.y < vy1;
		const h = this.resolveHover();
		if (h !== this.hover) { if (this.hover) this.hover.hover = false; if (h) h.hover = true; this.hover = h; }
		for (const p of this.props) if (p.visible || p.def.motion === 'rider') updateProp(p, dt, this.t, st.rm, this.own.x);
		this.peers.update(dt, this.t, { x: this.cam.x, y: this.cam.y, w: this.viewW, h: this.viewH });
		this.updateTiles();
	}

	private resolveHover(): PropState | null {
		if (this.drag?.moved) return null;
		const s = this.ownScreen;
		if (this.renderer.hitTest) {
			if (this.touchMode && !this.virtualCursor) return null;
			if (!this.touchMode && !this.pointer.inside && !this.script) return null;
			return this.renderer.hitTest(this.own.x, this.own.y);
		}
		if (this.virtualCursor) {
			// DOM variants: the drawn cursor is not a real pointer, so ask the DOM where it is
			const el = document.elementFromPoint(s.x, s.y)?.closest<HTMLElement>('[data-prop]');
			return el ? (this.props.find((p) => p.def.id === el.dataset.prop) ?? null) : null;
		}
		if (this.touchMode) return null;
		return this.domHover ? (this.props.find((p) => p.def.id === this.domHover) ?? null) : null;
	}

	/** Push suppression: over a prop or within 40 px of one. */
	private nearProp() {
		if (this.hover) return true;
		const m = 40 / this.s, x = this.own.x, y = this.own.y;
		return this.props.some((p) => p.visible && x > p.x - m && x < p.x + p.w + m && y > p.y - m && y < p.y + p.h + m);
	}

	// ---- background tiles -------------------------------------------------------------------------

	private tileRange(ring: number) {
		const { cols, rows } = MANIFEST[this.scene.art];
		return {
			x0: Math.max(0, Math.floor(this.cam.x / TILE) - ring), y0: Math.max(0, Math.floor(this.cam.y / TILE) - ring),
			x1: Math.min(cols - 1, Math.floor((this.cam.x + this.viewW) / TILE) + ring), y1: Math.min(rows - 1, Math.floor((this.cam.y + this.viewH) / TILE) + ring),
			cols
		};
	}

	/** Load the visible tiles plus one ring; drop anything beyond two rings so phone memory stays flat. */
	private updateTiles() {
		const r = this.tileRange(1);
		for (let ty = r.y0; ty <= r.y1; ty++)
			for (let tx = r.x0; tx <= r.x1; tx++) {
				const key = tx + ',' + ty;
				if (this.tiles.has(key)) continue;
				const tile: Tile = {};
				this.tiles.set(key, tile);
				const url = `/art/${this.scene.art}/${this.density}/t_${ty * r.cols + tx}.webp`;
				if (this.settings.bg === 'dom') {
					const img = new Image();
					img.decoding = 'async';
					img.onload = () => {
						if (tile.dead) return;
						img.style.cssText = `left:${tx * TILE}px;top:${ty * TILE}px;width:${img.naturalWidth / this.density}px;height:${img.naturalHeight / this.density}px`;
						this.tileLayer.append(img);
					};
					img.src = url;
					tile.img = img;
				} else {
					fetch(url).then((res) => res.blob()).then((b) => createImageBitmap(b)).then((bmp) => {
						if (tile.dead) bmp.close();
						else tile.bmp = bmp;
					});
				}
			}
		const keep = this.tileRange(2);
		for (const [key, t] of this.tiles) {
			const [tx, ty] = key.split(',').map(Number);
			if (tx < keep.x0 || tx > keep.x1 || ty < keep.y0 || ty > keep.y1) {
				t.dead = true; t.bmp?.close(); t.img?.remove();
				this.tiles.delete(key);
			}
		}
	}

	private drawBackground() {
		const g = this.ctx;
		g.setTransform(1, 0, 0, 1, 0, 0);
		if (this.settings.bg === 'dom') {
			const s = this.s;
			this.tileLayer.style.transform = `translate3d(${-this.cam.x * s}px,${-this.cam.y * s}px,0) scale(${s})`;
			if (!this.canvas.hidden) g.clearRect(0, 0, this.canvas.width, this.canvas.height);
			return;
		}
		const k = this.s * this.dpr, r = this.tileRange(0);
		if (this.scene.w < this.viewW || this.scene.h < this.viewH) { g.fillStyle = '#1d2b3a'; g.fillRect(0, 0, this.canvas.width, this.canvas.height); }
		for (let ty = r.y0; ty <= r.y1; ty++)
			for (let tx = r.x0; tx <= r.x1; tx++) {
				const bmp = this.tiles.get(tx + ',' + ty)?.bmp;
				const x0 = Math.round((tx * TILE - this.cam.x) * k), y0 = Math.round((ty * TILE - this.cam.y) * k);
				const wx = bmp ? bmp.width / this.density : TILE, wy = bmp ? bmp.height / this.density : TILE;
				const x1 = Math.round((tx * TILE + wx - this.cam.x) * k), y1 = Math.round((ty * TILE + wy - this.cam.y) * k);
				if (bmp) g.drawImage(bmp, x0, y0, x1 - x0, y1 - y0);
				else { g.fillStyle = '#a9cf86'; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
			}
		if (this.scene.id === 'theatre') { g.fillStyle = 'rgb(10 8 20 / 0.7)'; g.fillRect(0, 0, this.canvas.width, this.canvas.height); } // lights down
	}

	// ---- bench script -----------------------------------------------------------------------------

	runTour(path: [number, number][], dur: number) {
		return new Promise<void>((done) => {
			this.script = { t: 0, dur, path, done, nextClick: 1 };
			ui.card = null;
		});
	}

	private runScript(sc: Script, dt: number) {
		sc.t += dt;
		const u = Math.min(1, sc.t / sc.dur);
		const segs = sc.path.length - 1, f = u * segs, i = Math.min(segs - 1, Math.floor(f)), v = f - i;
		const [ax, ay] = sc.path[i], [bx, by] = sc.path[i + 1];
		const e = v * v * (3 - 2 * v);
		this.centreOn(ax + (bx - ax) * e, ay + (by - ay) * e);
		const a = sc.t * 2.2;
		this.own.x = this.cam.x + this.viewW / 2 + Math.cos(a) * 90 / this.s;
		this.own.y = this.cam.y + this.viewH / 2 + Math.sin(a) * 60 / this.s;
		if (sc.t > sc.nextClick) {
			sc.nextClick += 2;
			for (const p of this.props) if (p.visible) p.clickT = 0;
		}
		if (u >= 1) { this.script = null; sc.done(); }
	}

	// ---- HUD --------------------------------------------------------------------------------------

	private hud() {
		const r = this.stats.recent(), st = this.settings;
		ui.hud =
			`${st.variant} · bg ${st.bg}${st.rm ? ' · reduced motion' : ''}\n` +
			`${r.fps} fps (${r.refresh} Hz) · p95 ${r.p95} ms · missed ${r.jank}% · js p95 ${r.jsP95} ms\n` +
			this.net.hud() + '\n' +
			`scale ${this.s} · dpr ${this.dpr} · tiles ${this.density}x (${this.tiles.size} held) · canvas ${this.canvas.width}x${this.canvas.height}\n` +
			`peers ${this.peers.drawn.length} on screen · props ${this.props.filter((p) => p.visible).length} on screen of ${this.props.length}`;
	}
}

function edge(pos: number, size: number, band: number) {
	const b = size * band;
	pos = Math.max(0, Math.min(size, pos));
	if (pos < b) { const t = 1 - pos / b; return -t * t; }
	if (pos > size - b) { const t = 1 - (size - pos) / b; return t * t; }
	return 0;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string) {
	const e = document.createElement(tag);
	e.className = cls;
	return e;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
