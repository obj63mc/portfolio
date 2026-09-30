// Every cursor on the overlay canvas (buildout ticket 13), carried over from the pointer-lock prototype's draw-cursors.ts
// and sprites.ts: one local sprite atlas, the arrow's white and gold bodies, the own cursor's halo and the seven
// cosmetics (ticket 16) rasterized once at the session's scale, beside the flag sheet (scripts/flags.ts). Only ids cross
// the wire; every client draws every cursor itself, and the sizes, the pop and the tag are local drawing, never sent.
import { COSMETICS, KNOWN } from '../cosmetics.ts';
import type { CosmeticId } from '../scenes/types';
import SHEET from './flags.webp?no-inline';
import FLAGS from './flags.json';

/**
 * A cursor to draw: its tip in device px, its country code, whether its body is gold, the cosmetic it wears (0 none, an
 * id this build doesn't know draws nothing) and when that went on (performance.now() ms), which pops it in.
 */
export interface Drawn {
	x: number;
	y: number;
	cc: string;
	gold: boolean;
	cos: number;
	wornAt: number;
}

/** The arrow, 32 units tall with its tip at the origin; a unit is a world px at 1x. */
const ARROW = new Path2D('M0 0V29L7 22L11.5 32L16 30L11.5 21H21Z');
/** The own cursor is drawn 1.25x and every peer 0.75x, about the tip so the hotspot never moves (spec: own cursor). */
export const OWN = 1.25;
export const PEER = 0.75;
/** Where a cosmetic hangs, units from the tip: the head above it, the face across it, the side at its right; none covers the flag badge. */
export const ANCHORS = { head: { x: 6, y: 0 }, face: { x: 8, y: 11 }, side: { x: 21, y: 13 } } as const;
/** The flag badge at the arrow's lower right, units from the tip, 4:3 like the sheet's cells. */
const BADGE = { x: 13, y: 21, w: 16, h: 12 };
/** St. Louis city-flag blue: the halo and the tag. The outline is the engine's backdrop. */
const BLUE = '#1f5fd1';
const OUTLINE = '#1d2b3a';
const GOLD = '#f2c230';
/**
 * An atlas cell round the arrow, units, with room for the halo's glow and the antlers' tips: white body, gold body,
 * halo, then a cell per cosmetic, drawn over the body at the same place.
 */
const PAD = 14;
const CELL = { w: 52, h: 60 };
const CELLS = 3 + KNOWN.length;
/** A cosmetic pops in over this long, ms, when it goes on. */
const POP = 300;
/** The tag shows this long, ms, then fades over FADE. */
const TAG = 2000;
const FADE = 500;

/** A shape outlined like the arrow, so it reads at a few px on any ground, then filled. */
function shape(g: CanvasRenderingContext2D, fill: string, path: (p: Path2D) => void) {
	const p = new Path2D();
	path(p);
	g.lineWidth = 2;
	g.strokeStyle = OUTLINE;
	g.stroke(p);
	g.fillStyle = fill;
	g.fill(p);
}

/** A line with the outline round it. */
function line(g: CanvasRenderingContext2D, colour: string, width: number, path: (p: Path2D) => void) {
	const p = new Path2D();
	path(p);
	g.lineCap = 'round';
	g.lineWidth = width + 2;
	g.strokeStyle = OUTLINE;
	g.stroke(p);
	g.lineWidth = width;
	g.strokeStyle = colour;
	g.stroke(p);
}

/** Each cosmetic in flat shapes, units from its anchor (the spec's table; there is no cosmetic art). */
const DRAW: Record<CosmeticId, (g: CanvasRenderingContext2D) => void> = {
	1: (g) => {
		// The graduation cap: a mortarboard on its band, its tassel hanging gold.
		shape(g, '#2b3950', (p) => p.rect(-5, -5, 10, 5));
		shape(g, '#3a4d6e', (p) => (p.moveTo(-11, -7), p.lineTo(0, -11), p.lineTo(11, -7), p.lineTo(0, -3), p.closePath()));
		line(g, GOLD, 1.4, (p) => (p.moveTo(0, -7), p.lineTo(8, -5), p.lineTo(8, 0)));
	},
	2: (g) => {
		// 3D glasses: a white frame, one red lens and one cyan.
		shape(g, '#fff', (p) => p.rect(-8, -3, 17, 6));
		shape(g, '#e8383d', (p) => p.rect(-6.5, -1.5, 6, 3));
		shape(g, '#2fb5e8', (p) => p.rect(1.5, -1.5, 6, 3));
	},
	3: (g) => {
		// Monster ears: two purple pointed ears, pink inside, on a band.
		line(g, '#7b2d8b', 2, (p) => (p.moveTo(-8, 1), p.quadraticCurveTo(0, -6, 8, 1)));
		for (const s of [-1, 1]) {
			shape(g, '#7b2d8b', (p) => (p.moveTo(9 * s, 0), p.lineTo(10 * s, -11), p.lineTo(2 * s, -3), p.closePath()));
			shape(g, '#f7a1c4', (p) => (p.moveTo(8 * s, -2), p.lineTo(8.6 * s, -7.5), p.lineTo(4.5 * s, -3.5), p.closePath()));
		}
	},
	4: (g) => {
		// Antlers: a branching beam either side.
		for (const s of [-1, 1])
			line(g, '#a0662e', 2.2, (p) => {
				p.moveTo(4 * s, -1);
				p.lineTo(9 * s, -7);
				p.lineTo(12 * s, -11);
				p.moveTo(9 * s, -7);
				p.lineTo(14 * s, -6);
				p.moveTo(6 * s, -4);
				p.lineTo(7 * s, -10);
			});
	},
	5: (g) => {
		// A beer mug: amber, its handle to the right, a head of foam.
		line(g, '#f2a52b', 2, (p) => p.arc(8, 0, 3, -Math.PI / 2, Math.PI / 2));
		shape(g, '#f2a52b', (p) => p.rect(0, -5, 8, 10));
		shape(g, '#fff', (p) => p.roundRect(-1, -8, 10, 4, 2));
	},
	6: (g) => {
		// A cigar, tilted up, its gold band and a glowing tip, with a curl of smoke.
		g.rotate(-0.25);
		shape(g, '#8a5230', (p) => p.roundRect(-3, -1.5, 14, 3.5, 1.5));
		shape(g, '#e0b040', (p) => p.rect(0, -1.5, 2, 3.5));
		shape(g, '#ff5a1f', (p) => p.rect(11, -1.5, 1.5, 3.5));
		g.rotate(0.25);
		g.lineWidth = 1;
		g.strokeStyle = 'rgb(210 210 210 / 0.9)';
		g.beginPath();
		g.moveTo(12, -5);
		g.quadraticCurveTo(15, -8, 12, -11);
		g.stroke();
	},
	7: (g) => {
		// A bike helmet: a blue dome with white vents.
		shape(g, '#1e88e5', (p) => (p.ellipse(0, 0, 9, 7, 0, Math.PI, 0), p.closePath()));
		line(g, '#fff', 1, (p) => (p.moveTo(-4, -5), p.lineTo(-3, -2), p.moveTo(0, -6), p.lineTo(0, -2), p.moveTo(4, -5), p.lineTo(3, -2)));
	}
};

/** The pop: a scale-in from nothing, overshooting a little, over POP ms since `u` 0. */
const popIn = (u: number) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;

/** The atlas at `r` device px per unit, the own cursor's size: peers draw it scaled down. */
function rasterize(r: number) {
	const c = document.createElement('canvas'), w = Math.ceil(CELL.w * r);
	c.width = w * CELLS;
	c.height = Math.ceil(CELL.h * r);
	const g = c.getContext('2d')!;
	g.lineJoin = 'round';
	const cell = (i: number, x = 0, y = 0) => g.setTransform(r, 0, 0, r, i * w + (PAD + x) * r, (PAD + y) * r);
	['#fff', GOLD].forEach((fill, i) => {
		cell(i);
		g.lineWidth = 2;
		g.strokeStyle = OUTLINE;
		g.fillStyle = fill;
		g.stroke(ARROW);
		g.fill(ARROW);
	});
	cell(2);
	const glow = g.createRadialGradient(9, 15, 2, 9, 15, 21);
	glow.addColorStop(0, 'rgb(31 95 209 / 0.6)');
	glow.addColorStop(1, 'rgb(31 95 209 / 0)');
	g.fillStyle = glow;
	g.fillRect(-PAD, -PAD, CELL.w, CELL.h);
	KNOWN.forEach((id, i) => {
		const a = ANCHORS[COSMETICS[id].anchor];
		cell(3 + i, a.x, a.y);
		DRAW[id](g);
	});
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

	/** Peers first, then the own cursor over them; redrawn only when a cursor, its badge, its cosmetic or the tag has changed. */
	draw(own: Drawn | null, peers: Drawn[], now: number) {
		const tag = own ? Math.max(0, Math.min(1, (this.tagAt + TAG + FADE - now) / FADE)) : 0;
		const pop = (p: Drawn) => Math.min(1, (now - p.wornAt) / POP);
		const key = [tag, this.ready, ...[own, ...peers].flatMap((p) => (p ? [p.x, p.y, p.cc, p.gold, p.cos, pop(p)] : ['-']))].join();
		if (key === this.key) return;
		this.key = key;
		const g = this.g;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (const p of peers) this.one(p, PEER, false, pop(p));
		if (!own) return;
		this.one(own, OWN, true, pop(own));
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

	/**
	 * One cursor `size` times its 32 units, scaled about its tip: its cosmetic, `pop` of the way through popping in about
	 * its anchor, and its flag badge outlined for contrast at a few px.
	 */
	private one(p: Drawn, size: number, halo: boolean, pop: number) {
		const g = this.g, r = OWN * this.scale, k = size * this.scale, cw = this.atlas.width / CELLS, ch = this.atlas.height;
		const x = p.x - PAD * k, y = p.y - PAD * k, w = (cw * k) / r, h = (ch * k) / r;
		if (halo) g.drawImage(this.atlas, 2 * cw, 0, cw, ch, x, y, w, h);
		g.drawImage(this.atlas, p.gold ? cw : 0, 0, cw, ch, x, y, w, h);
		const c = KNOWN.indexOf(p.cos as CosmeticId);
		if (c >= 0) {
			const a = ANCHORS[COSMETICS[KNOWN[c]].anchor], ax = p.x + a.x * k, ay = p.y + a.y * k, s = popIn(pop);
			g.setTransform(s, 0, 0, s, ax - s * ax, ay - s * ay);
			g.drawImage(this.atlas, (3 + c) * cw, 0, cw, ch, x, y, w, h);
			g.setTransform(1, 0, 0, 1, 0, 0);
		}
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
