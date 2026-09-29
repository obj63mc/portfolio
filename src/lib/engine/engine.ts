// The scene loop (buildout ticket 08): background tiles on the scene canvas, the prerendered layer moved with one transform
// per camera change, the visitor's drawn cursor on the overlay canvas, and the camera from camera.ts. This is the unlocked
// mouse, which the pointer lock (ticket 09) falls back to when the browser refuses it. Carried over from the rendering
// prototype's engine (prototype/rendering-camera) with the spec's rules; the layer's markup is never re-rendered here.
import type { Overworld, Point, Rect, SubScene } from '../scenes/types';
import { TILE, centreOn, clamp, glide, rendering, step, tileRange, type View } from './camera.ts';

export type Scene = Overworld | SubScene;

// Every scene's background tiles at both densities, keyed by path: a background's folder repeats its scene's id,
// /art/generated/<id>/<id>/<density>/<column>-<row>.webp. Never inlined: the page's CSP has no data: source.
const TILE_URLS = import.meta.glob<string>('/art/generated/*/*/{1.25,2}/*.webp', { eager: true, query: '?no-inline', import: 'default' });

/** Screen elements that hold the camera still when the cursor is near them. Tickets 09 and 10 add the cards and joystick. */
const CONTROLS = '.controls';
/** Behind the scene where no tile has arrived, or beyond a scene smaller than the view. */
const BACKDROP = '#1d2b3a';
/** The visitor's own cursor, 32 units tall with its tip at the origin, drawn 1.25x (spec: own cursor). Ticket 13's atlas replaces it. */
const ARROW = new Path2D('M0 0V29L7 22L11.5 32L16 30L11.5 21H21Z');

const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const propsOf = (s: Scene) => ('districts' in s ? s.districts.flatMap((d) => d.venues.flatMap((v) => v.props)) : s.props);

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
	/** Fixed per session with the render scale. */
	private dpr: number;
	private density: number;
	private cam: Point = { x: 0, y: 0 };
	/** A keyboard or fragment glide in progress. */
	private goal: Point | null = null;
	/** The OS pointer, CSS px; null outside the window or over a card or control. */
	private pointer: Point | null = null;
	/** False after a keyboard or fragment pan until the mouse moves, so a mouse resting in the band doesn't undo it. */
	private armed = true;
	/** World rects that hold the camera still: the props, and the overworld's signpost. */
	private targets: Rect[] = [];
	/** Background tiles held, by `<column>-<row>`; a tile still loading has no bitmap. */
	private held = new Map<string, { bmp?: ImageBitmap }>();
	private dirty = true;
	/** The cursor position last drawn, so a still cursor isn't redrawn. */
	private cursorKey = '';
	private raf = 0;
	private last = 0;
	private canvas: HTMLCanvasElement;
	private layer: HTMLElement;
	private cursors: HTMLCanvasElement;
	private g: CanvasRenderingContext2D;
	private cg: CanvasRenderingContext2D;
	private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	private listeners = new AbortController();

	constructor(canvas: HTMLCanvasElement, layer: HTMLElement, cursors: HTMLCanvasElement) {
		const g = canvas.getContext('2d', { alpha: false }), cg = cursors.getContext('2d');
		// Without a canvas the engine never starts and the page stays the plain document (spec: "if the canvas fails").
		if (!g || !cg) throw new Error('No 2D canvas');
		const r = rendering(matchMedia('(pointer: coarse)').matches, screen.width, screen.height, devicePixelRatio);
		this.view = { w: innerWidth, h: innerHeight, s: r.s };
		this.dpr = r.dpr;
		this.density = r.density;
		this.canvas = canvas;
		this.layer = layer;
		this.cursors = cursors;
		this.g = g;
		this.cg = cg;
		document.documentElement.classList.add('engine');
		this.bind();
		this.resize();
		this.moveTo(this.cam);
		this.raf = requestAnimationFrame(this.tick);
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.listeners.abort();
		for (const t of this.held.values()) t.bmp?.close();
		document.documentElement.classList.remove('engine');
		this.layer.style.transform = '';
	}

	/**
	 * Each navigation's scene and fragment. A new scene opens centred on the fragment's target, else the overworld's
	 * arrival point (the welcome sign) or a sub-scene's exit door (ticket 11 lands the cursor just inside it).
	 */
	show(scene: Scene, hash: string) {
		const target = placed(byHash(hash));
		if (scene === this.scene) {
			if (target) this.panTo(target);
			return;
		}
		this.scene = scene;
		this.targets = [...('districts' in scene ? [scene.signpost.rect] : []), ...propsOf(scene).map((p) => p.rect)];
		for (const t of this.held.values()) t.bmp?.close();
		this.held.clear();
		this.goal = null;
		const opening = target ? this.box(target) : 'districts' in scene ? propsOf(scene).find((p) => p.id === 'welcome')!.rect : scene.exit;
		this.moveTo(centreOn(centre(opening), this.view, scene));
	}

	private bind() {
		const opts = { signal: this.listeners.signal };
		addEventListener('resize', () => this.resize(), opts);
		addEventListener(
			'pointermove',
			(e) => {
				if (e.pointerType !== 'mouse') return; // touch is ticket 10
				const over = e.target instanceof Element && e.target.closest(`dialog, ${CONTROLS}`);
				this.pointer = over ? null : { x: e.clientX, y: e.clientY };
				// A real move re-arms the push; a synthetic one (content moving under a still pointer) has no movement.
				if (e.movementX || e.movementY) this.armed = true;
			},
			opts
		);
		// Push stops when the pointer leaves the window.
		addEventListener('mouseout', (e) => { if (!e.relatedTarget) this.pointer = null; }, opts);
		addEventListener('blur', () => (this.pointer = null), opts);
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
	}

	private resize() {
		this.view = { ...this.view, w: innerWidth, h: innerHeight };
		for (const c of [this.canvas, this.cursors]) {
			c.width = Math.round(this.view.w * this.dpr);
			c.height = Math.round(this.view.h * this.dpr);
		}
		this.cursorKey = '';
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
		let cam: Point;
		if (this.goal) {
			cam = glide(this.cam, this.goal, dt);
			if (cam === this.goal) this.goal = null;
		} else {
			// Layout is clean at the top of the frame, so reading the controls' rects here costs nothing.
			const cursor = this.armed && !document.querySelector('dialog[open]') ? this.pointer : null;
			const controls = cursor
				? [...document.querySelectorAll(CONTROLS)].map((c) => c.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }))
				: [];
			cam = step(this.cam, { view: this.view, scene, band: scene.pushBand ?? 0.12, cursor, props: this.targets, controls }, dt);
		}
		if (cam.x !== this.cam.x || cam.y !== this.cam.y) this.moveTo(cam);
		if (this.dirty) this.drawTiles(scene);
		this.drawCursor();
	};

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

	private drawTiles(scene: Scene) {
		this.dirty = false;
		const g = this.g, k = this.view.s * this.dpr, r = tileRange(this.cam, this.view, scene, 0);
		g.fillStyle = BACKDROP;
		g.fillRect(0, 0, this.canvas.width, this.canvas.height);
		// Tile edges rounded to device px from world px, so neighbours meet without seams.
		const px = (world: number, cam: number) => Math.round((world - cam) * k);
		for (let row = r.y0; row <= r.y1; row++)
			for (let col = r.x0; col <= r.x1; col++) {
				const bmp = this.held.get(`${col}-${row}`)?.bmp;
				if (!bmp) continue;
				const x0 = px(col * TILE, this.cam.x), y0 = px(row * TILE, this.cam.y);
				const x1 = px(Math.min(scene.w, (col + 1) * TILE), this.cam.x), y1 = px(Math.min(scene.h, (row + 1) * TILE), this.cam.y);
				g.drawImage(bmp, x0, y0, x1 - x0, y1 - y0);
			}
	}

	/** The drawn cursor, tip on the OS pointer, redrawn only when it moves or hides. */
	private drawCursor() {
		const p = this.pointer, key = p ? `${p.x},${p.y}` : '';
		if (key === this.cursorKey) return;
		this.cursorKey = key;
		const g = this.cg, k = 1.25 * this.view.s * this.dpr;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.cursors.width, this.cursors.height);
		if (!p) return;
		g.setTransform(k, 0, 0, k, p.x * this.dpr, p.y * this.dpr);
		g.lineJoin = 'round';
		g.lineWidth = 2;
		g.strokeStyle = BACKDROP;
		g.fillStyle = '#fff';
		g.stroke(ARROW);
		g.fill(ARROW);
	}
}
