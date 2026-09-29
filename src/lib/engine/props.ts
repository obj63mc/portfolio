// Props on the scene canvas (buildout ticket 15): each prop's cut-outs drawn over the background tiles in order of their
// base y, with the scenery the overworld's plate doesn't paint (the signpost, the church door, the rider). The
// prerendered layer stays the hit target: this reads which props are hovered (the free mouse, the engine's `.hot` mark
// for a locked or steered cursor, keyboard focus) and clicked (the click that opens a card), and plays their reactions;
// their timing is in motion.ts. Carried over from the rendering prototype's canvas props (prototype/rendering-camera).
import { POSTER_LAMPS, type ScreenTitle } from '../scenes/foundry.ts';
import { artOf } from '../scenes/index.ts';
import type { Overworld, Point, Prop, Rect, SubScene } from '../scenes/types';
import { CLICK_MS, RIDER, blink, chase, glint, hover, moose, pop, progress, rider, type Pose } from './motion.ts';

/** A rig part in its master's px: its parent, its pivot as fractions of itself, and its file under art/generated. */
interface Part {
	parent: string | null;
	x: number;
	y: number;
	w: number;
	h: number;
	pivot: [number, number];
	file: string;
}

// Cut-outs by path, never inlined (the page's CSP has no data: source). The scene plates and the masters they are cut
// from stay out of the build: the tiles are the plates.
const IMAGES = import.meta.glob<string>(
	[
		'/art/generated/*/*/image.webp',
		'!/art/generated/*/*-master/image.webp',
		'!/art/generated/{overworld,slu,foundry,moosylvania,side-project,brennans}/{overworld,slu,foundry,moosylvania,side-project,brennans}/image.webp'
	],
	{ eager: true, query: '?no-inline', import: 'default' }
);
/** Each cut-out's world rect as the art pipeline registered it (asset.json); rig parts have none. */
const WORLDS = import.meta.glob<Rect>(
	['/art/generated/*/*/asset.json', '!/art/generated/*/*-master/asset.json', '!/art/generated/overworld/{moose,rider}-*/asset.json'],
	{ eager: true, import: 'world' }
);
const RIGS = import.meta.glob<Record<string, Part>>('/art/generated/*/*-rig.json', { eager: true, import: 'default' });

/** The monster's purple round the MonsterCommerce eye: its lid, drawn under the eye as it shuts. */
const LID = '#6a2464';
/** The hover highlight, a warm glow round a prop's silhouette, and how far it reaches, world px. */
const GLOW = '255 236 170';
const GLOW_PX = 18;
/** How far past its box a layer may draw: its glow, a pop, the moose's antlers wobbling. */
const REACH = 2 * GLOW_PX;
/** The Side Project bottles' glint: a slanted band this wide, world px. */
const GLINT_W = 36;

interface Cut {
	id: string;
	rect: Rect;
	bmp?: ImageBitmap;
	/** The MonsterCommerce eye's silhouette in the monster's purple. */
	lid?: ImageBitmap;
	/** The marquee's bulbs alone, without the facade behind the string. */
	lit?: ImageBitmap;
}

interface RigPart extends Part {
	key: string;
	/** Its ancestors and itself, root first: whose poses it takes. */
	chain: RigPart[];
	bmp?: ImageBitmap;
}

/** Something drawn: a prop, or scenery the plate lacks. */
interface Layer {
	prop?: Prop;
	/** Where it draws, for culling, drawing order (its base y) and a pop's centre; the rider's whole straight. */
	box: Rect;
	cuts: Cut[];
	rig?: { name: 'moose' | 'rider'; parts: RigPart[]; at: Rect; bounds: Rect };
	video?: { el: HTMLVideoElement; screen: Rect };
	/** Its hover level, 0 to 1, and when it was last clicked (server ms). */
	hover: number;
	clicked: number;
	/** What it last drew, so a still layer isn't drawn again. */
	drawn: string;
}

/** The props hovered: by the free mouse, by the engine's mark for a locked or steered cursor, and by keyboard focus. */
const HOVERED = [
	"html:not([data-input='locked'], [data-input='touch']) .prop > button:hover",
	'.prop > button:is(.hot, :focus-visible)'
].join(', ');

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const grow = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
const union = (rs: Rect[]): Rect => {
	const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
	return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
const centre = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const posterOf = (p?: Prop) => (p?.id.startsWith('poster-') ? (p.id.slice('poster-'.length) as ScreenTitle) : null);
const isBottle = (p?: Prop) => !!p?.id.startsWith('bottle-');

/** A cut-out at its world size in the session's density, so a frame never scales down 2000 px art. */
function load(url: string, w: number, h: number) {
	return fetch(url)
		.then((r) => r.blob())
		.then((b) => createImageBitmap(b, { resizeWidth: Math.max(1, Math.round(w)), resizeHeight: Math.max(1, Math.round(h)), resizeQuality: 'high' }));
}

export class Props {
	private layers: Layer[] = [];
	/** Bumped on each scene, so a cut-out arriving for the last one is dropped. */
	private generation = 0;
	private arrived = false;
	/** The Side Project bottle row's reach, which the glint sweeps. */
	private row: Rect | null = null;
	private t = 0;
	private rm = false;
	/** Where a poster's light or a bottle's glint is masked to its pixels (`shine`). */
	private scratch: OffscreenCanvas | undefined;
	private listeners = new AbortController();
	private layer: HTMLElement;

	/** `layer` is the prerendered layer: its prop buttons are the hit targets, and their clicks open the cards. */
	constructor(layer: HTMLElement) {
		this.layer = layer;
		// Opening a card is the click (spec: "Cards"): a click, a tap, Enter or Space, or the engine clicking under the cursor.
		layer.addEventListener(
			'click',
			(e) => {
				const id = (e.target as Element).closest<HTMLElement>('.prop > button')?.parentElement?.dataset.prop;
				const l = id && this.layers.find((l) => l.prop?.id === id);
				if (l) l.clicked = this.t;
			},
			{ signal: this.listeners.signal }
		);
	}

	destroy() {
		this.listeners.abort();
		this.clear();
	}

	/** A new scene's layers, their cut-outs loading at `density` image px per world px. */
	show(scene: Overworld | SubScene, density: number) {
		this.clear();
		const gen = ++this.generation, overworld = 'districts' in scene;
		const props = overworld ? scene.districts.flatMap((d) => d.venues.flatMap((v) => v.props)) : scene.props;
		const layer = (prop: Prop | undefined, art: string[], at: Rect): Layer => {
			const world = (id: string) => WORLDS[`/art/generated/${scene.id}/${id}/asset.json`];
			const cuts = art.filter(world).map((id) => ({ id, rect: world(id) }));
			// A name with no cut-out of its own is a rig: the moose, the rider. (The marquee's and the sign's rig files only
			// describe their bulbs and eye, which are cut-outs too.)
			const name = art.find((id) => !world(id) && RIGS[`/art/generated/${scene.id}/${id}-rig.json`]) as 'moose' | 'rider' | undefined;
			const rig = name && this.rig(scene.id, name, at);
			return { prop, box: union([...cuts.map((c) => c.rect), ...(rig ? [at] : [])]), cuts, rig, hover: 0, clicked: -Infinity, drawn: '' };
		};
		this.layers = props.map((p) => layer(p, artOf(scene, p), p.rect)).filter((l) => l.cuts.length || l.rig);
		// The plate paints none of these: the signpost, the church door and the rider riding the park's lower straight.
		if (overworld) {
			this.layers.push(layer(undefined, ['signpost', 'door'], scene.signpost.rect));
			const r = layer(undefined, ['rider'], RIDER.rect);
			r.box = { ...r.box, x: r.box.x - RIDER.travelX, w: r.box.w + 2 * RIDER.travelX };
			this.layers.push(r);
		}
		for (const l of this.layers) {
			const v = l.prop?.video;
			const el = v && this.layer.querySelector<HTMLVideoElement>(`[data-prop="${l.prop!.id}"] video`);
			if (el) l.video = { el, screen: v.screen };
		}
		this.layers.sort((a, b) => a.box.y + a.box.h - (b.box.y + b.box.h));
		const bottles = this.layers.filter((l) => isBottle(l.prop));
		this.row = bottles.length ? union(bottles.map((l) => l.box)) : null;
		// Every cut-out and rig part, at the size it is drawn.
		const arrive = (bmp: ImageBitmap, set: (b: ImageBitmap) => void) => {
			if (gen !== this.generation) return bmp.close();
			set(bmp);
			this.arrived = true;
		};
		for (const l of this.layers) {
			for (const c of l.cuts) {
				const url = IMAGES[`/art/generated/${scene.id}/${c.id}/image.webp`];
				load(url, c.rect.w * density, c.rect.h * density)
					.then((bmp) => arrive(bmp, (b) => (c.bmp = b)))
					.then(() => {
						if (c.id === 'mc-eye' && c.bmp) return lid(c.bmp).then((b) => arrive(b, (b) => (c.lid = b)));
						if (c.id === 'marquee-bulbs' && c.bmp) return lit(c.bmp).then((b) => arrive(b, (b) => (c.lit = b)));
					})
					.catch(() => {}); // a failed cut-out leaves its painted original, or nothing
			}
			const k = l.rig && Math.min(l.rig.at.w / l.rig.bounds.w, l.rig.at.h / l.rig.bounds.h) * density;
			for (const p of l.rig?.parts ?? [])
				load(IMAGES[`/art/generated/${p.file}`], p.w * k!, p.h * k!)
					.then((bmp) => arrive(bmp, (b) => (p.bmp = b)))
					.catch(() => {});
		}
	}

	/**
	 * One frame's state at server time `t` (ms), `dt` ms after the last: hover levels eased toward what is hovered now.
	 * Returns the world rect to draw again, or null when nothing in `view` looks different from its last drawing: a
	 * cut-out arrived (all of it), a hover is fading, a reaction is running, ambient motion moved, the TV's video played.
	 */
	step(dt: number, t: number, view: Rect, rm: boolean): Rect | null {
		this.t = t;
		this.rm = rm;
		const hovered = new Set([...this.layer.querySelectorAll(HOVERED)].map((b) => b.parentElement?.dataset.prop));
		const changed: Rect[] = this.arrived ? [view] : [];
		this.arrived = false;
		for (const l of this.layers) {
			if (l.prop) l.hover = hover(l.hover, hovered.has(l.prop.id), dt, rm);
			if (!overlaps(grow(l.box, REACH), view)) continue;
			const look = this.look(l);
			if (look !== l.drawn) (l.drawn = look), changed.push(grow(l.box, REACH));
		}
		return changed.length ? union(changed) : null;
	}

	/** Every layer in `view`, bottom first, on a canvas scaled `k` device px per world px with the camera at `cam`. */
	draw(g: CanvasRenderingContext2D, cam: Point, k: number, view: Rect) {
		g.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
		for (const l of this.layers) if (overlaps(grow(l.box, REACH), view)) this.drawLayer(g, l, k);
		g.setTransform(1, 0, 0, 1, 0, 0);
	}

	/** What a layer draws now, as a key: equal keys draw the same pixels. */
	private look(l: Layer) {
		const { t, rm } = this, since = t - l.clicked;
		const reaction = progress(since, l.rig?.name === 'moose' ? CLICK_MS.wobble : l.cuts.some((c) => c.id === 'mc-eye') ? CLICK_MS.blink : CLICK_MS.pop);
		const v = l.video?.el;
		const ambient =
			l.rig && !rm ? t : l.cuts.some((c) => c.id === 'marquee-bulbs') ? chase(t, rm) : isBottle(l.prop) ? glint(t, rm) : v ? `${v.currentTime},${v.ended}` : '';
		return `${l.hover}|${reaction}|${ambient}`;
	}

	private drawLayer(g: CanvasRenderingContext2D, l: Layer, k: number) {
		const { t, rm } = this, since = t - l.clicked, h = l.hover, poster = posterOf(l.prop);
		g.save();
		// A click pops a prop about its centre, but the moose wobbles its antlers and the MonsterCommerce eye blinks instead.
		const s = l.rig || l.cuts.some((c) => c.id === 'mc-eye') ? 1 : pop(progress(since, CLICK_MS.pop));
		if (s !== 1) {
			const c = centre(l.box);
			g.translate(c.x, c.y);
			g.scale(s, s);
			g.translate(-c.x, -c.y);
		}
		const paint = () => {
			for (const c of l.cuts) {
				if (!c.bmp) continue;
				const r = c.rect, p = c.lid ? progress(since, CLICK_MS.blink) : 1;
				if (p < 1) {
					// The eye shuts about its middle over the monster's purple.
					const m = centre(r);
					g.drawImage(c.lid!, r.x, r.y, r.w, r.h);
					g.save();
					g.translate(m.x, m.y);
					g.scale(1, blink(p));
					g.translate(-m.x, -m.y);
					g.drawImage(c.bmp, r.x, r.y, r.w, r.h);
					g.restore();
				} else g.drawImage(c.bmp, r.x, r.y, r.w, r.h);
			}
			if (l.rig) this.drawRig(g, l);
		};
		// Hovered, a prop glows round its silhouette, which covers its painted original exactly; a poster's picture light
		// lights it instead, but under reduced motion every hover is the plain glow. The glow is painted first and the prop
		// again over it, so one part's glow never lightens another (the moose's head over its body).
		if (h && (!poster || rm)) {
			g.shadowColor = `rgb(${GLOW} / ${0.9 * h})`;
			g.shadowBlur = GLOW_PX * k;
			paint();
			g.shadowColor = 'transparent';
		}
		paint();
		for (const c of l.cuts) if (c.lit) this.chase(g, c);
		if (isBottle(l.prop)) this.glint(g, l);
		if (poster && h && !rm) this.lamp(g, l.cuts[0], POSTER_LAMPS[poster], h);
		if (l.video) this.screen(g, l.video.el, l.video.screen);
		g.restore();
	}

	/** A rig fitted into its rect as the art workshop fits it, each part turned and squashed about its pivot by its pose. */
	private drawRig(g: CanvasRenderingContext2D, l: Layer) {
		const { name, parts, at, bounds } = l.rig!, sc = Math.min(at.w / bounds.w, at.h / bounds.h);
		let poses: Record<string, Pose>, dx = 0, facing = 1;
		if (name === 'moose') poses = moose(this.t, l.hover, this.t - l.clicked, this.rm);
		else {
			const r = rider(this.t, this.rm), wheel = { r: 0, sy: 1 };
			({ dx, facing } = r);
			// A wheel turns by the distance ridden over its radius, both in world px.
			wheel.r = r.travelled / ((parts.find((p) => p.key.endsWith('wheel'))?.w ?? 1) * sc * 0.5);
			poses = { 'rear-wheel': wheel, 'front-wheel': wheel };
		}
		g.save();
		g.translate(at.x + dx + (at.w - bounds.w * sc) / 2, at.y + at.h - bounds.h * sc);
		g.scale(sc, sc);
		g.translate(-bounds.x, -bounds.y);
		if (facing < 0) {
			// Riding west, the rig is mirrored about its middle.
			const cx = bounds.x + bounds.w / 2;
			g.translate(cx, 0);
			g.scale(-1, 1);
			g.translate(-cx, 0);
		}
		for (const p of parts) {
			if (!p.bmp) continue;
			g.save();
			for (const q of p.chain) {
				const pose = poses[q.key];
				if (!pose) continue;
				const px = q.x + q.w * q.pivot[0], py = q.y + q.h * q.pivot[1];
				g.translate(px, py);
				g.rotate(pose.r);
				g.scale(1, pose.sy);
				g.translate(-px, -py);
			}
			g.drawImage(p.bmp, p.x, p.y, p.w, p.h);
			g.restore();
		}
		g.restore();
	}

	/** A third of the marquee's bulbs lit brighter, stepping along the string. */
	private chase(g: CanvasRenderingContext2D, c: Cut) {
		const phase = chase(this.t, this.rm);
		if (phase < 0) return;
		const r = c.rect, period = 33; // three bulbs apart, about 11 world px each
		g.save();
		g.beginPath();
		for (let x = r.x + (phase * period) / 3; x < r.x + r.w; x += period) g.rect(x, r.y, period / 3, r.h);
		g.clip();
		g.globalCompositeOperation = 'lighter';
		g.globalAlpha = 0.8;
		g.drawImage(c.lit!, r.x, r.y, r.w, r.h);
		g.restore();
	}

	/** The glint: a slanted band of light sweeping the bottle row, on each bottle's own pixels. */
	private glint(g: CanvasRenderingContext2D, l: Layer) {
		const u = glint(this.t, this.rm), row = this.row, c = l.cuts[0];
		if (u === null || !row || !c) return;
		const slant = row.h * 0.25, x = row.x - GLINT_W + u * (row.w + GLINT_W + slant);
		if (x + GLINT_W < l.box.x || x - slant > l.box.x + l.box.w) return;
		this.shine(g, c, (og) => {
			og.beginPath();
			og.moveTo(x, row.y);
			og.lineTo(x + GLINT_W, row.y);
			og.lineTo(x + GLINT_W - slant, row.y + row.h);
			og.lineTo(x - slant, row.y + row.h);
			og.fillStyle = 'rgb(255 255 255 / 0.7)';
			og.fill();
		});
	}

	/** A poster's picture light switched on: a warm pool from its lamp down over the poster. */
	private lamp(g: CanvasRenderingContext2D, c: Cut, at: Point, h: number) {
		this.shine(g, c, (og) => {
			const light = og.createRadialGradient(at.x, at.y, 0, at.x, at.y, c.rect.h * 0.85);
			light.addColorStop(0, `rgb(255 226 160 / ${0.85 * h})`);
			light.addColorStop(0.45, `rgb(255 205 130 / ${0.35 * h})`);
			light.addColorStop(1, 'rgb(255 205 130 / 0)');
			og.fillStyle = light;
			og.fillRect(c.rect.x, c.rect.y, c.rect.w, c.rect.h);
		});
	}

	/**
	 * Light screened over a cut-out's own pixels only: `fill` paints in world px and is masked to the cut-out, so a
	 * poster hung at an angle lights up without the wall its rect takes in.
	 */
	private shine(g: CanvasRenderingContext2D, c: Cut, fill: (og: OffscreenCanvasRenderingContext2D) => void) {
		const bmp = c.bmp, r = c.rect;
		if (!bmp) return;
		const k = bmp.width / r.w, o = (this.scratch ??= new OffscreenCanvas(1, 1));
		// Resizing clears it and resets its state.
		o.width = bmp.width;
		o.height = bmp.height;
		const og = o.getContext('2d')!;
		og.drawImage(bmp, 0, 0);
		og.globalCompositeOperation = 'source-in';
		og.setTransform(k, 0, 0, k, -r.x * k, -r.y * k);
		fill(og);
		g.save();
		g.globalCompositeOperation = 'screen';
		g.drawImage(o, r.x, r.y, r.w, r.h);
		g.restore();
	}

	/** The TV's video on its screen, fitted inside it, from the first frame played until it ends; dark otherwise. */
	private screen(g: CanvasRenderingContext2D, v: HTMLVideoElement, s: Rect) {
		if (!v.currentTime || v.ended || v.readyState < 2 || !v.videoWidth) return;
		const k = Math.min(s.w / v.videoWidth, s.h / v.videoHeight), w = v.videoWidth * k, h = v.videoHeight * k;
		g.fillStyle = '#000';
		g.fillRect(s.x, s.y, s.w, s.h);
		g.drawImage(v, s.x + (s.w - w) / 2, s.y + (s.h - h) / 2, w, h);
	}

	/** A rig's parts, each with the chain of parts whose poses move it, fitted into `at`. */
	private rig(scene: string, name: 'moose' | 'rider', at: Rect) {
		const json = RIGS[`/art/generated/${scene}/${name}-rig.json`];
		const parts = Object.entries(json).map(([key, p]) => ({ ...p, key, chain: [] as RigPart[] }) satisfies RigPart);
		for (const p of parts) for (let q: RigPart | undefined = p; q; q = parts.find((r) => r.key === q!.parent)) p.chain.unshift(q);
		return { name, parts, at, bounds: union(parts) };
	}

	private clear() {
		this.generation++;
		for (const l of this.layers) for (const b of [...l.cuts.flatMap((c) => [c.bmp, c.lid, c.lit]), ...(l.rig?.parts.map((p) => p.bmp) ?? [])]) b?.close();
		this.layers = [];
	}
}

/** The MonsterCommerce eye's silhouette filled with the monster's purple: the lid it shuts over. */
function lid(eye: ImageBitmap) {
	const c = new OffscreenCanvas(eye.width, eye.height), g = c.getContext('2d')!;
	g.drawImage(eye, 0, 0);
	g.globalCompositeOperation = 'source-in';
	g.fillStyle = LID;
	g.fillRect(0, 0, c.width, c.height);
	return createImageBitmap(c);
}

/** The marquee's bulbs alone: its bright warm pixels, without the white canopy edge or the facade behind the string. */
function lit(bulbs: ImageBitmap) {
	const c = new OffscreenCanvas(bulbs.width, bulbs.height), g = c.getContext('2d', { willReadFrequently: true })!;
	g.drawImage(bulbs, 0, 0);
	const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
	for (let i = 0; i < d.length; i += 4) if (d[i + 1] < 192 || d[i] - d[i + 2] < 30) d[i + 3] = 0;
	g.putImageData(img, 0, 0);
	return createImageBitmap(c);
}
