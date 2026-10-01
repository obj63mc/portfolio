// Big Muddy's water (Joe, 2026-10-01), drawn on a 2D canvas from a cast as its rules have it (rules.ts): the view is
// VIEW.h units tall whatever the canvas, the hook kept mid-width and LURE_Y down, so every device sees as far ahead; a
// wider canvas only sees more to either side. The lure, its line, the bubbles and the snags are drawn here, a snag a
// branching twig as the original's were (Joe, 2026-10-01); the fish are the art pipeline's cut-outs
// (art/generated/big-muddy), each one still that swims by a wave run along it, and plain shapes until their pictures
// arrive. Nothing here changes the cast.
import { FT, HOOK, LURE_Y, SNAG, VIEW, type FishId, type Lure, type Run } from './rules.ts';

/** The cut-outs, as they load: each fish facing left. */
export interface Art {
	fish: Partial<Record<FishId, HTMLImageElement>>;
}

/**
 * The water, in the style contract's colours (art/style.txt): a deep turquoise at the surface, dark teal by DEEP ft.
 * Everything the lure can touch, and the lure, wears a HALO, an ivory outline OUTLINE units wide at any size (Joe,
 * 2026-10-01): the surface is a shade under the contract's turquoise so that ivory stands at least 3 to 1 against the
 * water at every depth, whatever a fish's own colours are (tests/big-muddy.test.ts holds it to that).
 */
const SHALLOW = [24, 143, 138], DEEP_WATER = [36, 79, 85], DEEP = 120;
export const HALO = '#fff4d4';
const OUTLINE = 4.5;
/** The eight ways the outline is laid round a picture. */
const ROUND = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)] as const);
const INK = { coral: '#df7554', ivory: '#fff4d4', teal: '#244f55', line: 'rgb(255 244 212 / 0.7)', bubble: 'rgb(255 244 212 / 0.28)' };
/** A fish with no picture yet, by its kind. */
const PLAIN: Record<FishId, string> = { bass: '#719b50', catfish: '#87cdd5', gar: '#ffd34f' };
/**
 * A snag's twig round its box, units: the branch reaches well past the part that catches, as the original's did. Its
 * trunk rises from the lower right through the box to its tips, upper left; `PX` canvas px a unit, sharp on any screen.
 */
const TWIG = { x: -38, y: -56, w: 128, h: 128, PX: 3 };
/** The two twigs, by shape: the dice each grows from, the way its trunk leans, rad, and its first reach, units. */
const TWIGS = [{ seed: 7, lean: -2.3, reach: 30 }, { seed: 19, lean: -2.05, reach: 34 }];
/** The strips a fish is drawn in, the tail's swing as a share of its height, and its beats a second. */
const STRIPS = 12, SWING = 0.09, BEAT = 1.6;
/** The bubbles: one cluster in each cell this size, units. */
const CELL = 260;

const ready = (img?: HTMLImageElement): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0;

/** The water's colour at `depth` ft. */
export function water(depth: number) {
	const k = Math.min(1, depth / DEEP), e = 1 - (1 - k) * (1 - k);
	return `rgb(${SHALLOW.map((c, i) => Math.round(c + (DEEP_WATER[i] - c) * e)).join(' ')})`;
}

/** A number from 0 up to 1 fixed for a cell of the water, so its bubbles stay where they are as it scrolls. */
const noise = (i: number, j: number, n: number) => {
	const s = Math.sin(i * 127.1 + j * 311.7 + n * 74.7) * 43758.5453;
	return s - Math.floor(s);
};

const twigs = new Map<string, HTMLCanvasElement>();

/**
 * A snag's twig in `ink`, drawn once and kept: a trunk that forks again and again, each bough shorter, thinner and
 * turned a little off the last, with a stray twig here and there along the way. The same dice grow the same twig.
 */
function twig(shape: 0 | 1, ink: string) {
	const key = `${shape}${ink}`, kept = twigs.get(key);
	if (kept) return kept;
	const c = document.createElement('canvas'), g = c.getContext('2d')!, { seed, lean, reach } = TWIGS[shape];
	c.width = TWIG.w * TWIG.PX;
	c.height = TWIG.h * TWIG.PX;
	g.scale(TWIG.PX, TWIG.PX);
	g.lineCap = 'round';
	const boughs: { path: Path2D; wide: number }[] = [];
	let a = seed;
	const dice = () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const grow = (x: number, y: number, way: number, long: number, wide: number, forks: number) => {
		// Bowed a little, as a branch is, toward the way it will fork.
		const bow = (dice() - 0.5) * 0.5, mx = x + Math.cos(way + bow) * long * 0.5, my = y + Math.sin(way + bow) * long * 0.5;
		const x2 = x + Math.cos(way) * long, y2 = y + Math.sin(way) * long;
		const path = new Path2D();
		path.moveTo(x, y);
		path.quadraticCurveTo(mx, my, x2, y2);
		boughs.push({ path, wide });
		if (!forks) return;
		const side = dice() < 0.5 ? -1 : 1;
		grow(x2, y2, way + side * (0.12 + dice() * 0.25), long * (0.74 + dice() * 0.12), wide * 0.74, forks - 1);
		grow(x2, y2, way - side * (0.45 + dice() * 0.45), long * (0.5 + dice() * 0.2), wide * 0.6, forks - 1);
		if (dice() < 0.45) grow(mx, my, way + side * (0.7 + dice() * 0.4), long * 0.45, wide * 0.5, Math.min(1, forks - 1));
	};
	grow(TWIG.w - 22, TWIG.h - 10, lean, reach, 7.5, 5);
	// The whole twig's outline first, then the twig over it, so no bough's outline crosses another bough.
	// A bough's outline is no wider than the bough, so the twig's tips stay dark inside a thin rim.
	for (const [style, rim] of [[HALO, OUTLINE * 0.6], [ink, 0]] as const) {
		g.strokeStyle = style;
		for (const b of boughs) {
			g.lineWidth = b.wide + 2 * Math.min(rim, b.wide * 0.5);
			g.stroke(b.path);
		}
	}
	twigs.set(key, c);
	return c;
}

/** How long each level's lure is, units. */
const lureLong = (level: Lure) => 46 + level * 12;

/** The lure of each level, its eye at the origin and its hook under it: longer and fuller the further on. */
function lure(g: CanvasRenderingContext2D, level: Lure) {
	const long = lureLong(level), wide = 7 + level * 3;
	const hook = () => {
		g.beginPath();
		g.moveTo(HOOK.w / 2, long);
		g.lineTo(HOOK.w / 2, long + HOOK.h * 0.55);
		g.arc(0, long + HOOK.h * 0.55, HOOK.w / 2, 0, Math.PI);
		g.stroke();
	};
	// The outline of the body and the hook, under both.
	g.lineCap = 'round';
	g.strokeStyle = HALO;
	g.lineWidth = 3 + OUTLINE;
	hook();
	g.lineWidth = OUTLINE;
	g.fillStyle = INK.coral;
	g.beginPath();
	g.ellipse(0, long / 2, wide, long / 2, 0, 0, Math.PI * 2);
	g.stroke();
	g.fill();
	// A lighter belly and an eye, so it reads as bait and not a float.
	g.fillStyle = INK.ivory;
	g.beginPath();
	g.ellipse(-wide * 0.25, long * 0.55, wide * 0.35, long * 0.3, 0, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = INK.teal;
	g.beginPath();
	g.arc(wide * 0.2, long * 0.2, 2.5, 0, Math.PI * 2);
	g.fill();
	// The hook: all of it that catches, HOOK's box, hanging under the body.
	g.strokeStyle = INK.teal;
	g.lineWidth = 3;
	hook();
}

const shapes = new Map<HTMLImageElement, HTMLCanvasElement>();

/** A picture's shape filled with the outline's ivory, made once and kept. */
function shape(img: HTMLImageElement) {
	let c = shapes.get(img);
	if (c) return c;
	c = document.createElement('canvas');
	c.width = img.naturalWidth;
	c.height = img.naturalHeight;
	const g = c.getContext('2d')!;
	g.drawImage(img, 0, 0);
	g.globalCompositeOperation = 'source-in';
	g.fillStyle = HALO;
	g.fillRect(0, 0, c.width, c.height);
	shapes.set(img, c);
	return c;
}

/**
 * A fish in its box, facing the way it swims: its picture in strips, each riding a wave that grows toward the tail, over
 * its own shape in ivory laid OUTLINE units out all round, which is its outline at whatever size it swims.
 */
function fish(g: CanvasRenderingContext2D, img: HTMLImageElement | undefined, kind: FishId, w: number, h: number, t: number, still: boolean) {
	if (!ready(img)) {
		g.beginPath();
		g.ellipse(w * 0.42, h / 2, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
		g.moveTo(w * 0.78, h / 2);
		g.lineTo(w, h * 0.1);
		g.lineTo(w, h * 0.9);
		g.closePath();
		g.strokeStyle = HALO;
		g.lineWidth = OUTLINE * 2;
		g.lineJoin = 'round';
		g.stroke();
		g.fillStyle = PLAIN[kind];
		g.fill();
		g.fillStyle = INK.teal;
		g.beginPath();
		g.arc(w * 0.14, h * 0.4, Math.max(1.5, h * 0.06), 0, Math.PI * 2);
		g.fill();
		return;
	}
	// The picture keeps its own shape, as wide as the box and centred on it: the box is the rules', the original's frame.
	const tall = (w * img.naturalHeight) / img.naturalWidth, y = (h - tall) / 2, sw = img.naturalWidth / STRIPS, dw = w / STRIPS;
	const lay = (of: CanvasImageSource, x: number, dy: number) => {
		if (still) return void g.drawImage(of, x, y + dy, w, tall);
		for (let i = 0; i < STRIPS; i++) {
			const along = i / (STRIPS - 1), swing = Math.sin(t * BEAT * Math.PI * 2 - along * 3) * tall * SWING * along * along;
			// A hair wider than its share, so no seam shows between strips.
			g.drawImage(of, i * sw, 0, sw, img.naturalHeight, x + i * dw, y + dy + swing, dw + 0.6, tall);
		}
	};
	const outline = shape(img);
	for (const [x, dy] of ROUND) lay(outline, x * OUTLINE, dy * OUTLINE);
	lay(img, 0, 0);
}

/**
 * The cast `run` on a canvas `w` by `h` px: the water at its depth's colour, its bubbles, the snags, the fish, then the
 * line and the lure. `still` under reduced motion: no bubbles going by, and no wave along the fish.
 */
export function draw(g: CanvasRenderingContext2D, w: number, h: number, run: Run, art: Art, still: boolean) {
	const k = h / VIEW.h, cx = run.x + HOOK.w / 2, top = run.y - LURE_Y, half = w / k / 2, left = cx - half;
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.fillStyle = water(run.y / FT);
	g.fillRect(0, 0, w, h);
	// Units from here on, the view's top left at the canvas's.
	g.setTransform(k, 0, 0, k, -left * k, -top * k);

	if (!still) {
		g.strokeStyle = INK.bubble;
		g.lineWidth = 2;
		for (let i = Math.floor(left / CELL); i <= Math.floor((left + 2 * half) / CELL); i++)
			for (let j = Math.floor(top / CELL); j <= Math.floor((top + VIEW.h) / CELL); j++) {
				const x = (i + noise(i, j, 0)) * CELL, y = (j + noise(i, j, 1)) * CELL;
				for (let b = 0; b < 3; b++) {
					g.beginPath();
					g.arc(x + (b % 2 ? 5 : -3), y - b * 18, 6 - b * 1.5, 0, Math.PI * 2);
					g.stroke();
				}
			}
	}

	// The snags, the one the hook is caught on in coral, as the original's turned red.
	for (const s of run.snags) {
		const caught = run.x < s.x + SNAG.w && s.x < run.x + HOOK.w && run.y < s.y + SNAG.h && s.y < run.y + HOOK.h;
		g.drawImage(twig(s.shape, caught ? INK.coral : INK.teal), s.x + TWIG.x, s.y + TWIG.y, TWIG.w, TWIG.h);
	}

	for (const f of run.fish) {
		if (f.x > left + 2 * half || f.x + f.w < left || f.y > top + VIEW.h) continue;
		g.save();
		// The pictures face left; one swimming right is turned about.
		if (f.dir === 1) g.transform(-1, 0, 0, 1, f.x + f.w, f.y);
		else g.translate(f.x, f.y);
		// Each on its own beat, so a school doesn't swim in step.
		fish(g, art.fish[f.fish], f.fish, f.w, f.h, run.t + f.lb * 0.37 + f.w, still);
		g.restore();
	}

	// The line from the surface, out of sight above, down to the lure's eye; the lure's hook where the rules have it.
	g.save();
	g.translate(cx, run.y);
	const long = lureLong(run.lure);
	g.strokeStyle = INK.line;
	g.lineWidth = 2;
	g.beginPath();
	g.moveTo(0, -LURE_Y - 10);
	g.lineTo(0, -long);
	g.stroke();
	g.translate(0, -long);
	lure(g, run.lure);
	g.restore();
}
