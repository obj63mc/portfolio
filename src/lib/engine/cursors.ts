// Every cursor on the overlay canvas (buildout ticket 13), carried over from the pointer-lock prototype's draw-cursors.ts
// and sprites.ts: one local sprite atlas, the arrow's white and gold bodies and the own cursor's halo rasterized once at
// the session's scale, beside the flag sheet (scripts/flags.ts). Only ids cross the wire; every client draws every
// cursor itself, and the sizes and the tag are local drawing, never sent.
import SHEET from './flags.webp?no-inline';
import FLAGS from './flags.json';

/** A cursor to draw: its tip in device px, its country code and whether its body is gold. */
export interface Drawn {
	x: number;
	y: number;
	cc: string;
	gold: boolean;
}

/** The arrow, 32 units tall with its tip at the origin; a unit is a world px at 1x. */
const ARROW = new Path2D('M0 0V29L7 22L11.5 32L16 30L11.5 21H21Z');
/** The own cursor is drawn 1.25x and every peer 0.75x, about the tip so the hotspot never moves (spec: own cursor). */
export const OWN = 1.25;
export const PEER = 0.75;
/** Where ticket 16 hangs a cosmetic, units from the tip; none covers the flag badge. */
export const ANCHORS = { head: { x: 6, y: 0 }, face: { x: 8, y: 11 }, side: { x: 21, y: 13 } } as const;
/** The flag badge at the arrow's lower right, units from the tip, 4:3 like the sheet's cells. */
const BADGE = { x: 13, y: 21, w: 16, h: 12 };
/** St. Louis city-flag blue: the halo and the tag. The outline is the engine's backdrop. */
const BLUE = '#1f5fd1';
const OUTLINE = '#1d2b3a';
const GOLD = '#f2c230';
/** An atlas cell round the arrow, units, with room for the halo's glow: white body, gold body, halo. */
const PAD = 12;
const CELL = { w: 48, h: 56 };
/** The tag shows this long, ms, then fades over FADE. */
const TAG = 2000;
const FADE = 500;

/** The atlas at `r` device px per unit, the own cursor's size: peers draw it scaled down. */
function rasterize(r: number) {
	const c = document.createElement('canvas'), w = Math.ceil(CELL.w * r);
	c.width = w * 3;
	c.height = Math.ceil(CELL.h * r);
	const g = c.getContext('2d')!;
	['#fff', GOLD].forEach((fill, i) => {
		g.setTransform(r, 0, 0, r, i * w + PAD * r, PAD * r);
		g.lineJoin = 'round';
		g.lineWidth = 2;
		g.strokeStyle = OUTLINE;
		g.fillStyle = fill;
		g.stroke(ARROW);
		g.fill(ARROW);
	});
	g.setTransform(r, 0, 0, r, 2 * w + PAD * r, PAD * r);
	const glow = g.createRadialGradient(9, 15, 2, 9, 15, 21);
	glow.addColorStop(0, 'rgb(31 95 209 / 0.6)');
	glow.addColorStop(1, 'rgb(31 95 209 / 0)');
	g.fillStyle = glow;
	g.fillRect(-PAD, -PAD, CELL.w, CELL.h);
	return c;
}

export class Cursors {
	private canvas: HTMLCanvasElement;
	private g: CanvasRenderingContext2D;
	private scale: number;
	private dpr: number;
	private atlas: HTMLCanvasElement;
	private sheet = new Image();
	private ready = false;
	private flags = new Map(FLAGS.codes.map((c, i) => [c, i]));
	/** What was last drawn, so a still frame isn't redrawn. */
	private key = '';
	private tagAt = -Infinity;

	/** `scale` is device px per world px, fixed for the session with the render scale; `dpr` sizes the tag's text. */
	constructor(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, scale: number, dpr: number) {
		this.canvas = canvas;
		this.g = g;
		this.scale = scale;
		this.dpr = dpr;
		this.atlas = rasterize(OWN * scale);
		this.sheet.src = SHEET;
		// Until the sheet arrives cursors go without a badge; a failed sheet leaves them without one.
		this.sheet.decode().then(() => ((this.ready = true), this.invalidate()), () => {});
	}

	/** Shows the own cursor's "you" tag, which fades after about two seconds: Join, every scene entry, the Arch reset. */
	tag() {
		this.tagAt = performance.now();
	}

	/** The canvas was resized, and cleared with it. */
	invalidate() {
		this.key = '';
	}

	/** Peers first, then the own cursor over them; redrawn only when a cursor, a badge or the tag has changed. */
	draw(own: Drawn | null, peers: Drawn[], now: number) {
		const tag = own ? Math.max(0, Math.min(1, (this.tagAt + TAG + FADE - now) / FADE)) : 0;
		const key = [tag, this.ready, ...[own, ...peers].flatMap((p) => (p ? [p.x, p.y, p.cc, p.gold] : ['-']))].join();
		if (key === this.key) return;
		this.key = key;
		const g = this.g;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (const p of peers) this.one(p, PEER, false);
		if (!own) return;
		this.one(own, OWN, true);
		if (!tag) return;
		const d = this.dpr, k = OWN * this.scale, x = own.x + 22 * k, y = own.y + 12 * k;
		g.globalAlpha = tag;
		g.font = `600 ${12 * d}px system-ui, sans-serif`;
		g.lineJoin = 'round';
		g.lineWidth = 3 * d;
		g.strokeStyle = '#fff';
		g.strokeText('you', x, y);
		g.fillStyle = BLUE;
		g.fillText('you', x, y);
		g.globalAlpha = 1;
	}

	/** One cursor `size` times its 32 units, scaled about its tip, with its flag badge outlined for contrast at a few px. */
	private one(p: Drawn, size: number, halo: boolean) {
		const g = this.g, r = OWN * this.scale, k = size * this.scale, cw = this.atlas.width / 3, ch = this.atlas.height;
		const x = p.x - PAD * k, y = p.y - PAD * k, w = (cw * k) / r, h = (ch * k) / r;
		if (halo) g.drawImage(this.atlas, 2 * cw, 0, cw, ch, x, y, w, h);
		g.drawImage(this.atlas, p.gold ? cw : 0, 0, cw, ch, x, y, w, h);
		if (!this.ready) return;
		// Unknown geo (XX), Tor (T1), EU, UN and any code without a country flag wear the St. Louis flag, the sheet's first cell.
		const i = this.flags.get(p.cc.toLowerCase()) ?? 0;
		const bx = p.x + BADGE.x * k, by = p.y + BADGE.y * k, bw = BADGE.w * k, bh = BADGE.h * k;
		g.drawImage(this.sheet, (i % FLAGS.cols) * FLAGS.w, Math.floor(i / FLAGS.cols) * FLAGS.h, FLAGS.w, FLAGS.h, bx, by, bw, bh);
		g.lineWidth = Math.max(1, 0.8 * k);
		g.strokeStyle = OUTLINE;
		g.strokeRect(bx, by, bw, bh);
	}
}
