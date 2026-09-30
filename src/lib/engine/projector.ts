// The Foundry screen on the scene canvas (buildout ticket 17): the reel net/screen.ts times from server time, drawn over
// the props and under the cursors. The projector's beam fans from its lens to the screen's four corners; the title card,
// the title's demo video and its case study are drawn on a flat film, which is mapped onto the screen's painted quad (the
// camera sees the right wall at an angle) through a mesh of triangles. The video plays in step with the room, with sound.
// A poster's clicker first takes a seat in the second row, and watches from it with steering off until the reel ends.
import { CASE_STUDY, PROJECTOR_LENS, REEL_FRAME, SCREEN_SURFACE, SCREEN_TITLES, SCREEN_VIDEOS, posterOf, screenGist, seatOf, type ScreenTitle } from '../scenes/foundry.ts';
import type { Net } from '../net/net.ts';
import { onQuad, reel } from '../net/screen.ts';
import type { Overworld, Point, Rect, SubScene } from '../scenes/types';
import { VIDEOS } from '../videos.ts';
import { SIT_MS, sitting } from './motion.ts';
import { clickedProp } from './props.ts';

/** The film the reel is drawn on before it is mapped onto the screen, px: 16:9, sharp at the screen's largest. */
const FILM = { w: 1280, h: 720 };
/** The mesh the film is mapped through, cells of two triangles; finer cells follow the perspective more closely. */
const MESH = { cols: 8, rows: 6 };
/** How long a seated visitor waits for a reel after asking for one, ms, before steering comes back (a socket that never plays). */
const UNHEARD = 3000;
/** How far the video may drift from the room's time, seconds, before it is seeked back into step. */
const DRIFT = 0.5;
/** The lamp's glow round the lens, world px. */
const GLOW = 70;
const FONT = 'system-ui, sans-serif';
const GOLD = '#f2c230';

const bounds = (ps: Point[], d = 0): Rect => {
	const x = Math.min(...ps.map((p) => p.x)) - d, y = Math.min(...ps.map((p) => p.y)) - d;
	return { x, y, w: Math.max(...ps.map((p) => p.x)) + d - x, h: Math.max(...ps.map((p) => p.y)) + d - y };
};
/** How far inside the painted surface the film stops, world px, so that nothing of the reel ever draws past the screen. */
const INSET = 1;
/** The letterbox round the video on every side, a fraction of the film's height: the video always sits inside the screen. */
const MARGIN = 0.04;
/** The screen's box, which a new frame of the video redraws, and the beam's, which a change of light redraws. */
const QUAD = bounds(SCREEN_SURFACE, 1);
const BEAM = bounds([PROJECTOR_LENS, ...SCREEN_SURFACE], GLOW);

/** Each triangle of the mesh: its corners on the film and on the screen, and the film's box round it. */
const TRIANGLES = (() => {
	const at = onQuad(SCREEN_SURFACE), out: { film: Point[]; screen: Point[]; box: Rect }[] = [];
	const film = (i: number, j: number) => ({ x: (i / MESH.cols) * FILM.w, y: (j / MESH.rows) * FILM.h });
	const screen = (i: number, j: number) => at(i / MESH.cols, j / MESH.rows);
	for (let j = 0; j < MESH.rows; j++)
		for (let i = 0; i < MESH.cols; i++) {
			const box = bounds([film(i, j), film(i + 1, j + 1)], 2);
			for (const corners of [[[i, j], [i + 1, j], [i + 1, j + 1]], [[i, j], [i + 1, j + 1], [i, j + 1]]])
				out.push({ film: corners.map(([a, b]) => film(a, b)), screen: corners.map(([a, b]) => screen(a, b)), box });
		}
	return out;
})();

type Reel = NonNullable<ReturnType<typeof reel>>;

export class Projector {
	private foundry = false;
	/** The reel at the last step, null while the screen is idle. */
	private reel: Reel | null = null;
	/** The title the video holds, loaded when its reel starts and let go when it ends. */
	private title: ScreenTitle | null = null;
	/** Starting the video: ready to, waiting on play(), or refused even muted (until the next title). */
	private start: 'ready' | 'starting' | 'refused' = 'ready';
	private video = document.createElement('video');
	private film = new OffscreenCanvas(FILM.w, FILM.h);
	/** The film mapped onto the screen at the canvas's scale, composited with the reel's light. */
	private lens = new OffscreenCanvas(1, 1);
	/** What the last step showed, and what the lens holds, so a still reel is neither redrawn nor re-mapped. */
	private drawn = '';
	private mapped = '';
	/**
	 * The visitor's own seat, from their poster's click until the reel they sat down for ends (Joe, 2026-09-29): the cursor
	 * glides there from where it was (`from`, world px, at the click's `at`, performance ms), and only once seated asks the
	 * room for the title (`asked`). `seen` once a reel runs after it asked, the one it asked for or one already playing.
	 */
	private seat: { title: ScreenTitle; to: Point; from: Point | null; at: number; asked: number | null; seen: boolean } | null = null;
	private listeners = new AbortController();
	private layer: HTMLElement;
	private net: Net;

	/** `layer` is the prerendered layer: a poster's click there seats its clicker, then asks the room for its title. */
	constructor(layer: HTMLElement, net: Net) {
		this.layer = layer;
		this.net = net;
		this.video.playsInline = true;
		this.video.preload = 'auto';
		layer.addEventListener(
			'click',
			(e) => {
				const title = posterOf(clickedProp(e));
				if (this.foundry && title) this.seat ??= { title, to: seatOf(net.id), from: null, at: performance.now(), asked: null, seen: false };
			},
			{ signal: this.listeners.signal }
		);
	}

	destroy() {
		this.listeners.abort();
		this.load(null);
	}

	show(scene: Overworld | SubScene) {
		this.foundry = scene.id === 'foundry';
		this.reel = null;
		this.seat = null;
		this.drawn = '';
		this.load(null);
	}

	/** While a reel plays, or its clicker sits down for it, the camera frames the projector and the whole screen (Joe, 2026-09-29). */
	framing(): Rect | null {
		return this.reel || this.seat ? REEL_FRAME : null;
	}

	/** The visitor is seated for a reel, or on the way to their seat: their steering is off. */
	get seated() {
		return !!this.seat;
	}

	/**
	 * Where the own cursor is held `now` (performance ms), world px, given where it is (`at`): gliding to its seat, then on
	 * it until the reel ends; null when the visitor steers. Seated, it asks the room for the title, which plays it if the
	 * screen is idle (offline, here); if no reel runs within UNHEARD of asking, steering comes back.
	 */
	hold(at: Point, now: number, rm: boolean): Point | null {
		const s = this.seat;
		if (!s) return null;
		s.from ??= at;
		if (s.asked === null && (rm || now - s.at >= SIT_MS)) (s.asked = now), this.net.play(s.title);
		if (s.asked !== null && ((s.seen ||= !!this.reel) ? !this.reel : now - s.asked > UNHEARD)) return (this.seat = null);
		return sitting(s.from, s.to, now - s.at, rm);
	}

	/**
	 * One frame at server time `t`: the reel, the video kept in step with it, and the world rect to draw again, or null when
	 * the screen looks as it last did: the screen's box for a new frame of video, the beam's for a change of light.
	 */
	step(t: number): Rect | null {
		const last = this.reel, r = (this.reel = this.foundry ? reel(this.net.screen, t) : null), v = this.video;
		if ((r?.title ?? null) !== this.title) this.load(r?.title ?? null);
		if (r) this.sync(r);
		const look = r ? `${r.title}|${r.level}|${r.show}|${r.show === 'video' ? v.currentTime : ''}` : '';
		if (look === this.drawn) return null;
		this.drawn = look;
		return last && r && last.level === r.level && last.show === r.show ? QUAD : BEAM;
	}

	/** The beam and the screen, on a canvas scaled `k` device px per world px with the camera at `cam`. */
	draw(g: CanvasRenderingContext2D, cam: Point, k: number) {
		const r = this.reel;
		if (!r) return;
		g.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
		this.beam(g, r.level);
		this.map(r, k);
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.globalAlpha = r.level;
		g.drawImage(this.lens, (QUAD.x - cam.x) * k, (QUAD.y - cam.y) * k);
		g.globalAlpha = 1;
	}

	/** The title's video, loaded only when its reel runs, and the screen button's name, which says what is playing. */
	private load(title: ScreenTitle | null) {
		const v = this.video;
		this.title = title;
		this.start = 'ready';
		v.pause();
		if (title) {
			v.muted = false;
			v.src = VIDEOS[`/art/sources/videos/${SCREEN_VIDEOS[title].file}`];
		} else if (v.hasAttribute('src')) {
			v.removeAttribute('src');
			v.load();
		}
		const status = this.foundry && this.layer.querySelector('[data-prop="screen"] > p');
		if (status) status.textContent = `Screen: ${screenGist(title ?? undefined)}`;
	}

	/** The video plays through its part of the reel, seeked back into step when it drifts from the room's time. */
	private sync(r: Reel) {
		const v = this.video;
		if (r.show !== 'video') return void (v.paused || v.pause());
		if (v.readyState >= HTMLMediaElement.HAVE_METADATA && Math.abs(v.currentTime - r.video) > DRIFT) v.currentTime = r.video;
		if (!v.paused || v.ended || v.error || this.start !== 'ready') return;
		this.start = 'starting';
		// With sound, as the room hears the screen; where the browser refuses that (no gesture yet, or iOS), muted rather
		// than not at all.
		v.play()
			.catch(() => ((v.muted = true), v.play()))
			.then(() => (this.start = 'ready'), () => (this.start = 'refused'));
	}

	/** The beam: a cone of light from the lens to the screen's corners, round the screen, and the lamp glowing at the lens. */
	private beam(g: CanvasRenderingContext2D, level: number) {
		const [tl, tr, br, bl] = SCREEN_SURFACE, o = PROJECTOR_LENS, mid = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };
		g.save();
		g.globalCompositeOperation = 'screen';
		g.beginPath();
		g.moveTo(o.x, o.y);
		for (const p of [tl, tr, br]) g.lineTo(p.x, p.y);
		g.closePath();
		g.moveTo(tl.x, tl.y);
		for (const p of [bl, br, tr]) g.lineTo(p.x, p.y);
		g.closePath();
		const light = g.createLinearGradient(o.x, o.y, mid.x, mid.y);
		light.addColorStop(0, `rgb(255 244 214 / ${0.36 * level})`);
		light.addColorStop(1, `rgb(255 244 214 / ${0.08 * level})`);
		g.fillStyle = light;
		g.fill('evenodd');
		const glow = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, GLOW);
		glow.addColorStop(0, `rgb(255 250 230 / ${level})`);
		glow.addColorStop(1, 'rgb(255 250 230 / 0)');
		g.fillStyle = glow;
		g.fillRect(o.x - GLOW, o.y - GLOW, 2 * GLOW, 2 * GLOW);
		g.restore();
	}

	/** The film for this frame, mapped onto the screen at `k` device px per world px, unless the lens holds it already. */
	private map(r: Reel, k: number) {
		const key = `${this.drawn}|${k}`;
		if (key === this.mapped) return;
		this.mapped = key;
		this.paint(r);
		const lens = this.lens, w = Math.ceil(QUAD.w * k), h = Math.ceil(QUAD.h * k);
		// Resizing clears it and resets its state.
		if (lens.width !== w || lens.height !== h) (lens.width = w), (lens.height = h);
		const g = lens.getContext('2d')!;
		g.setTransform(k, 0, 0, k, -QUAD.x * k, -QUAD.y * k);
		g.clearRect(QUAD.x, QUAD.y, QUAD.w, QUAD.h);
		g.save();
		g.beginPath();
		const [tl, , br] = SCREEN_SURFACE, mid = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };
		for (const p of SCREEN_SURFACE) {
			const len = Math.hypot(p.x - mid.x, p.y - mid.y);
			g.lineTo(p.x - ((p.x - mid.x) * INSET) / len, p.y - ((p.y - mid.y) * INSET) / len);
		}
		g.clip();
		// Each triangle of film goes onto its triangle of screen by the one affine map that takes three corners to three,
		// clipped a device px wider so that neighbours overlap instead of leaving hairlines between them.
		for (const { film: [s0, s1, s2], screen: [d0, d1, d2], box } of TRIANGLES) {
			const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
			const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den;
			const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den;
			const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den;
			const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den;
			const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3;
			g.save();
			g.beginPath();
			for (const p of [d0, d1, d2]) {
				const len = Math.hypot(p.x - cx, p.y - cy);
				g.lineTo(p.x + (p.x - cx) / (len * k), p.y + (p.y - cy) / (len * k));
			}
			g.clip();
			g.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
			g.drawImage(this.film, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
			g.restore();
		}
		g.restore();
	}

	/** The film: the lamp's light on the blank screen as the beam comes up, the title card, the video, the case study. */
	private paint(r: Reel) {
		const g = this.film.getContext('2d')!, v = this.video, { w, h } = FILM, title = SCREEN_TITLES[r.title];
		g.fillStyle = r.show ? '#0b0b10' : '#fff4dc';
		g.fillRect(0, 0, w, h);
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		if (r.show === 'video') {
			if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !v.videoWidth) return;
			const m = 2 * MARGIN * h, s = Math.min((w - m) / v.videoWidth, (h - m) / v.videoHeight), vw = v.videoWidth * s, vh = v.videoHeight * s;
			g.drawImage(v, (w - vw) / 2, (h - vh) / 2, vw, vh);
		} else if (r.show === 'title') {
			g.fillStyle = GOLD;
			g.font = `600 44px ${FONT}`;
			g.fillText('Now Showing', w / 2, h * 0.34);
			g.fillStyle = '#fff';
			line(g, title, 700, 92, w / 2, h * 0.56, w * 0.86);
		} else if (r.show === 'case') {
			g.fillStyle = GOLD;
			line(g, title, 600, 48, w / 2, h * 0.3, w * 0.86);
			g.fillStyle = '#fff';
			g.font = `500 50px ${FONT}`;
			const lines = wrap(g, CASE_STUDY[r.title], w * 0.8);
			lines.forEach((l, i) => g.fillText(l, w / 2, h * 0.56 + (i - (lines.length - 1) / 2) * 66));
		}
	}
}

/** One line of text at `size` px, or smaller to fit `most` px wide. */
function line(g: OffscreenCanvasRenderingContext2D, text: string, weight: number, size: number, x: number, y: number, most: number) {
	g.font = `${weight} ${size}px ${FONT}`;
	const fit = Math.min(size, (size * most) / g.measureText(text).width);
	g.font = `${weight} ${fit}px ${FONT}`;
	g.fillText(text, x, y);
}

/** Text broken into lines no wider than `most` px, in the context's font. */
function wrap(g: OffscreenCanvasRenderingContext2D, text: string, most: number) {
	const lines: string[] = [];
	for (const word of text.split(' ')) {
		const last = lines.at(-1);
		if (last !== undefined && g.measureText(`${last} ${word}`).width <= most) lines[lines.length - 1] = `${last} ${word}`;
		else lines.push(word);
	}
	return lines;
}
