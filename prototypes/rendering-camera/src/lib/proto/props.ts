// Prop runtime state and motion (ADR 0002: pivoted layers tweened in the scene loop, sprite sheet for
// the rider). Every variant uses the same matrices, so they differ only in where pixels and hit tests live.
import { MOOSE, TRACK, type PropDef } from './scenes';
import { type M, T, S, R, mul, about, apply, inv } from './math';
import { RIDER, spriteKey, type Sprites } from './sprites';

export interface PropState {
	def: PropDef;
	x: number;
	y: number;
	w: number;
	h: number;
	hover: boolean;
	hoverT: number;
	clickT: number; // seconds since last click reaction
	frame: number;
	flip: boolean;
	visible: boolean;
	base: M; // prop-local world px -> world px
	parts: M[]; // moose only: part image px (frame units) -> prop-local
	eye: number; // eye scaleY for moose and MonsterCommerce
	bulbs: number; // marquee phase
}

export const newProp = (def: PropDef): PropState => ({
	def, x: def.x, y: def.y, w: def.w, h: def.h, hover: false, hoverT: 0, clickT: 99, frame: 0, flip: false,
	visible: true, base: T(def.x, def.y), parts: [], eye: 1, bulbs: 0
});

const ease = (t: number) => t * t * (3 - 2 * t);
const F: M = mul(S(MOOSE.kM), T(-MOOSE.origin[0], -MOOSE.origin[1]));
const pivot = (p: (typeof MOOSE.parts)[number]) => [p.x + p.pivot[0] * p.w, p.y + p.pivot[1] * p.h] as const;

export function updateProp(p: PropState, dt: number, t: number, rm: boolean, cursorX: number) {
	p.hoverT = Math.max(0, Math.min(1, p.hoverT + (p.hover ? dt : -dt) / 0.15));
	p.clickT += dt;
	const m = p.def.motion;
	if (m === 'rider') {
		const a = rm ? Math.PI / 2 : (t / TRACK.lap) * Math.PI * 2;
		p.x = TRACK.cx + Math.cos(a) * TRACK.rx - p.w / 2;
		p.y = TRACK.cy + Math.sin(a) * TRACK.ry - p.h;
		p.flip = Math.sin(a) < 0; // top of the oval runs right to left
		p.frame = rm ? 0 : Math.floor(t * 10) % RIDER.frames;
	}
	// hover lift is a hover reaction (dropped under reduced motion); the click squash always plays
	const lift = rm ? 0 : 4 * ease(p.hoverT);
	const own = m === 'moose' || m === 'blink';
	const k = !own && p.clickT < 0.3 ? 1 + 0.08 * Math.sin((p.clickT / 0.3) * Math.PI) : 1;
	p.base = mul(mul(T(p.x + p.w / 2, p.y + p.h - lift), S(p.flip ? -k : k, k)), T(-p.w / 2, -p.h));

	if (m === 'moose') {
		const [body, antlers, head, eye] = MOOSE.parts;
		const breath = rm ? 1 : 1 + 0.012 * Math.sin((t / 3) * Math.PI * 2);
		const dir = cursorX < p.x + p.w / 2 ? -1 : 1;
		const turn = rm ? 0 : 0.14 * dir * ease(p.hoverT);
		const wob = p.clickT < 1.2 ? 0.2 * Math.sin(p.clickT * 20) * Math.exp(-p.clickT * 4) : 0;
		const Ab = about(...pivot(body), S(1, breath));
		const Ah = mul(Ab, about(...pivot(head), R(turn)));
		const Aa = mul(Ah, about(...pivot(antlers), R(wob)));
		p.eye = blink(t, rm, p.clickT);
		const Ae = mul(Ah, about(...pivot(eye), S(1, p.eye)));
		p.parts = [Ab, Aa, Ah, Ae].map((A, i) => mul(mul(F, A), T(MOOSE.parts[i].x, MOOSE.parts[i].y)));
	} else if (m === 'blink') {
		p.eye = p.clickT < 0.18 ? 0.1 : 1;
	} else if (m === 'marquee') {
		p.bulbs = rm ? -1 : Math.floor(t / 0.15) % 3;
	}
}

function blink(t: number, rm: boolean, clickT: number) {
	if (clickT < 0.15) return 0.1;
	if (rm) return 1;
	return t % 4 < 0.12 ? 0.1 : 1;
}

export const BULBS = 16;
export function bulbPos(p: PropState, i: number): [number, number] {
	const per = 2 * (p.w + p.h), d = (i / BULBS) * per;
	if (d < p.w) return [d, 0];
	if (d < p.w + p.h) return [p.w, d - p.w];
	if (d < 2 * p.w + p.h) return [p.w - (d - p.w - p.h), p.h];
	return [0, p.h - (d - 2 * p.w - p.h)];
}
export const bulbOn = (p: PropState, i: number) => p.bulbs < 0 || i % 3 === p.bulbs;
export const EYE = { x: 0.5, y: 0.22, w: 24, h: 23 }; // MonsterCommerce eye, centred at (x*w, y*h)

// ---- canvas drawing (variants B and C) ---------------------------------------------------------

export function drawProp(g: CanvasRenderingContext2D, p: PropState, sp: Sprites, W: M) {
	if (p.hoverT > 0.01) {
		g.setTransform(W[0], W[1], W[2], W[3], W[4], W[5]);
		g.globalAlpha = p.hoverT;
		g.drawImage(sp.spot, p.x - p.w * 0.15, p.y + p.h - 16, p.w * 1.3, 30);
		g.globalAlpha = 1;
	}
	const B = mul(W, p.base);
	const set = (m: M) => g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
	const m = p.def.motion;
	if (m === 'moose') {
		MOOSE.parts.forEach((part, i) => {
			set(mul(B, p.parts[i]));
			g.drawImage(sp.moose.get(part.key)!.src, 0, 0, part.w, part.h);
		});
		return;
	}
	set(B);
	if (m === 'rider' || m === 'bike') {
		const cw = sp.rider.width / RIDER.frames;
		g.drawImage(sp.rider, p.frame * cw, 0, cw, sp.rider.height, 0, 0, p.w, p.h);
		return;
	}
	g.drawImage(sp.props.get(spriteKey(p.def))!.src, 0, 0, p.w, p.h);
	if (m === 'marquee') {
		for (const on of [true, false]) {
			g.beginPath();
			for (let i = 0; i < BULBS; i++) {
				if (bulbOn(p, i) !== on) continue;
				const [x, y] = bulbPos(p, i);
				g.moveTo(x + 3.5, y);
				g.arc(x, y, 3.5, 0, Math.PI * 2);
			}
			g.fillStyle = on ? '#ffd84a' : '#6b5a2a';
			g.fill();
		}
	} else if (m === 'blink') {
		const cx = EYE.x * p.w, cy = EYE.y * p.h;
		set(mul(B, about(cx, cy, S(1, p.eye))));
		g.drawImage(sp.moose.get('moose-eye')?.src ?? sp.spot, cx - EYE.w / 2, cy - EYE.h / 2, EYE.w, EYE.h);
	}
}

/** Pixel-accurate hit test for the all-canvas variant. */
export function hitProp(p: PropState, sp: Sprites, wx: number, wy: number): boolean {
	if (wx < p.x - 6 || wy < p.y - 6 || wx > p.x + p.w + 6 || wy > p.y + p.h + 6) return false;
	const [lx, ly] = apply(inv(p.base), wx, wy);
	const m = p.def.motion;
	if (m === 'rider' || m === 'bike' || m === 'marquee') return lx >= 0 && ly >= 0 && lx <= p.w && ly <= p.h;
	if (m === 'moose')
		return MOOSE.parts.some((part, i) => {
			const [px, py] = apply(inv(p.parts[i]), lx, ly);
			return alphaAt(sp.moose.get(part.key)!, px / part.w, py / part.h);
		});
	return alphaAt(sp.props.get(spriteKey(p.def))!, lx / p.w, ly / p.h);
}

function alphaAt(s: { src: HTMLCanvasElement; alpha: Uint8ClampedArray }, u: number, v: number) {
	if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
	return s.alpha[Math.floor(v * s.src.height) * s.src.width + Math.floor(u * s.src.width)] > 40;
}
