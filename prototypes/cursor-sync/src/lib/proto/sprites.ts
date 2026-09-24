// Sprites prepared once per scene at the session's tile density: prop images pre-scaled to their world
// size (so neither canvas nor DOM downsamples 1000 px art every frame), alpha masks for canvas hit
// regions, the cursor atlas and the rider sprite sheet (both procedural placeholders).
import { MOOSE, type PropDef } from './scenes';

export interface Sprite {
	src: HTMLCanvasElement;
	url: string; // blob URL of src, for the DOM variant
	alpha: Uint8ClampedArray; // one byte per pixel of src
}

export const CELL = 48; // cursor atlas cell, world px; arrow tip at (16, 16)
export const TIP = 16;
export const ATLAS = { body: 0, gold: 1, halo: 2, cos: 3, flag: 10, count: 18 };
export const RIDER = { w: 60, h: 50, frames: 8 };

const SRC = '/art/props/';
const imgCache = new Map<string, Promise<HTMLImageElement>>();

function loadImg(name: string) {
	let p = imgCache.get(name);
	if (!p) {
		p = new Promise((res, rej) => {
			const i = new Image();
			i.onload = () => res(i);
			i.onerror = rej;
			i.src = SRC + name + '.webp';
		});
		imgCache.set(name, p);
	}
	return p;
}

function canvas(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
}

const blobUrl = (c: HTMLCanvasElement) =>
	new Promise<string>((res) => c.toBlob((b) => res(URL.createObjectURL(b!)), 'image/png'));

async function sprite(name: string, w: number, h: number, density: number): Promise<Sprite> {
	const img = await loadImg(name);
	const c = canvas(w * density, h * density);
	const ctx = c.getContext('2d', { willReadFrequently: true })!;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(img, 0, 0, c.width, c.height);
	const data = ctx.getImageData(0, 0, c.width, c.height).data;
	const alpha = new Uint8ClampedArray(c.width * c.height);
	for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
	return { src: c, url: await blobUrl(c), alpha };
}

export const spriteKey = (p: PropDef) => `${p.img}@${p.w}x${p.h}`;

export interface Sprites {
	props: Map<string, Sprite>;
	moose: Map<string, Sprite>;
	atlas: HTMLCanvasElement;
	atlasUrl: string;
	rider: HTMLCanvasElement;
	riderUrl: string;
	spot: HTMLCanvasElement;
}

export async function loadSprites(props: PropDef[], density: number): Promise<Sprites> {
	const out = new Map<string, Sprite>();
	const jobs: Promise<void>[] = [];
	for (const p of props) {
		if (!p.img || out.has(spriteKey(p))) continue;
		const key = spriteKey(p);
		out.set(key, null as unknown as Sprite);
		jobs.push(sprite(p.img, p.w, p.h, density).then((s) => void out.set(key, s)));
	}
	const moose = new Map<string, Sprite>();
	if (props.some((p) => p.motion === 'moose'))
		for (const part of MOOSE.parts)
			jobs.push(sprite(part.key, part.w * MOOSE.kM, part.h * MOOSE.kM, density).then((s) => void moose.set(part.key, s)));
	const atlas = drawAtlas();
	const rider = drawRider();
	const [atlasUrl, riderUrl] = await Promise.all([blobUrl(atlas), blobUrl(rider), ...jobs]);
	return { props: out, moose, atlas, atlasUrl: atlasUrl as string, rider, riderUrl: riderUrl as string, spot: drawSpot() };
}

// ---- procedural placeholders -------------------------------------------------------------------

const Z = 2; // atlas and sheet are drawn at 2 px per world px

function drawAtlas() {
	const c = canvas(CELL * Z * ATLAS.count, CELL * Z);
	const g = c.getContext('2d')!;
	const cell = (i: number, fn: () => void) => {
		g.setTransform(Z, 0, 0, Z, i * CELL * Z, 0);
		fn();
	};
	const arrow = (fill: string) => {
		g.beginPath();
		const pts = [[0, 0], [0, 24], [6, 18], [10, 27], [14, 25], [10, 17], [18, 17]];
		pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, TIP + x * 1.2, TIP + y * 1.2));
		g.closePath();
		g.fillStyle = fill;
		g.fill();
		g.lineWidth = 1.6;
		g.lineJoin = 'round';
		g.strokeStyle = '#1d2b3a';
		g.stroke();
	};
	cell(ATLAS.body, () => arrow('#ffffff'));
	cell(ATLAS.gold, () => arrow('#f2c230'));
	cell(ATLAS.halo, () => {
		const r = g.createRadialGradient(22, 28, 2, 22, 28, 20);
		r.addColorStop(0, 'rgba(60,140,255,0.55)');
		r.addColorStop(1, 'rgba(60,140,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, CELL, CELL);
	});
	const cos: (() => void)[] = [
		() => { // graduation cap
			g.fillStyle = '#1d2b3a';
			g.beginPath(); g.moveTo(8, 9); g.lineTo(20, 4); g.lineTo(32, 9); g.lineTo(20, 14); g.closePath(); g.fill();
			g.fillRect(15, 11, 10, 5);
			g.strokeStyle = '#f2c230'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(20, 9); g.lineTo(30, 12); g.lineTo(30, 18); g.stroke();
		},
		() => { // 3D glasses
			g.fillStyle = '#1d2b3a'; g.fillRect(15, 21, 18, 1.5);
			g.fillStyle = '#e23b3b'; g.fillRect(16, 22, 7, 5);
			g.fillStyle = '#3b8de2'; g.fillRect(25, 22, 7, 5);
		},
		() => { // monster hat
			g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(20, 13, 10, 7, 0, Math.PI, 0); g.fill(); g.fillRect(10, 12, 20, 3);
			g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 9, 2.4, 0, 7); g.arc(24, 9, 2.4, 0, 7); g.fill();
			g.fillStyle = '#000'; g.beginPath(); g.arc(16, 9, 1, 0, 7); g.arc(24, 9, 1, 0, 7); g.fill();
		},
		() => { // antlers
			g.strokeStyle = '#8a5a2b'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath();
			g.moveTo(17, 15); g.lineTo(11, 5); g.moveTo(14, 10); g.lineTo(8, 9); g.moveTo(12, 7); g.lineTo(13, 2);
			g.moveTo(25, 15); g.lineTo(31, 5); g.moveTo(28, 10); g.lineTo(34, 9); g.moveTo(30, 7); g.lineTo(29, 2);
			g.stroke();
		},
		() => { // beer mug
			g.fillStyle = '#e8a33a'; g.fillRect(35, 24, 8, 10);
			g.fillStyle = '#fff'; g.fillRect(34.5, 22, 9, 3);
			g.strokeStyle = '#e8a33a'; g.lineWidth = 1.5; g.beginPath(); g.arc(43.5, 29, 2.5, -1.5, 1.5); g.stroke();
		},
		() => { // cigar
			g.fillStyle = '#7a4a22'; g.fillRect(31, 31, 12, 3);
			g.fillStyle = '#ff5a2a'; g.fillRect(43, 31, 2, 3);
			g.strokeStyle = 'rgba(120,120,120,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(45, 30); g.quadraticCurveTo(47, 26, 44, 22); g.stroke();
		},
		() => { // bike helmet
			g.fillStyle = '#2d7fd3'; g.beginPath(); g.ellipse(20, 15, 10, 7, 0, Math.PI, 0); g.fill();
			g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(16, 9); g.lineTo(18, 14); g.moveTo(22, 8.5); g.lineTo(22, 14); g.moveTo(27, 10); g.lineTo(25, 14); g.stroke();
		}
	];
	cos.forEach((fn, i) => cell(ATLAS.cos + i, fn));
	const flags: string[][] = [
		['#d6262f', '#1f4ea8', '#f2c230'], // St. Louis fallback
		['#b22234', '#ffffff', '#3c3b6e'],
		['#0055a4', '#ffffff', '#ef4135'],
		['#000000', '#dd0000', '#ffce00'],
		['#ffffff', '#bc002d', '#ffffff'],
		['#009c3b', '#ffdf00', '#002776'],
		['#d52b1e', '#ffffff', '#d52b1e'],
		['#009246', '#ffffff', '#ce2b37']
	];
	flags.forEach(([a, b, c2], i) =>
		cell(ATLAS.flag + i, () => {
			const x = 30, y = 38, w = 15, h = 10;
			const vertical = i === 2 || i === 6 || i === 7;
			g.fillStyle = a; g.fillRect(x, y, w, h);
			g.fillStyle = b;
			if (i === 0) { g.beginPath(); g.moveTo(x, y + h * 0.35); g.lineTo(x + w, y + h * 0.65); g.lineTo(x + w, y + h * 0.8); g.lineTo(x, y + h * 0.5); g.fill(); g.fillStyle = c2; g.beginPath(); g.arc(x + w / 2, y + h / 2, 2.2, 0, 7); g.fill(); }
			else if (i === 4) { g.fillRect(x, y, w, h); g.fillStyle = b === '#ffffff' ? '#bc002d' : c2; g.beginPath(); g.arc(x + w / 2, y + h / 2, 3, 0, 7); g.fill(); }
			else if (vertical) { g.fillRect(x + w / 3, y, w / 3, h); g.fillStyle = c2; g.fillRect(x + (2 * w) / 3, y, w / 3, h); }
			else { g.fillRect(x, y + h / 3, w, h / 3); g.fillStyle = c2; g.fillRect(x, y + (2 * h) / 3, w, h / 3); }
			g.strokeStyle = '#1d2b3a'; g.lineWidth = 0.8; g.strokeRect(x, y, w, h);
		})
	);
	return c;
}

function drawRider() {
	const { w, h, frames } = RIDER;
	const c = canvas(w * Z * frames, h * Z);
	const g = c.getContext('2d')!;
	for (let f = 0; f < frames; f++) {
		g.setTransform(Z, 0, 0, Z, f * w * Z, 0);
		const a = (f / frames) * Math.PI * 2;
		g.lineWidth = 2; g.strokeStyle = '#1d2b3a';
		for (const cx of [13, 47]) {
			g.beginPath(); g.arc(cx, 38, 10, 0, 7); g.stroke();
			g.beginPath(); for (let k = 0; k < 3; k++) { const b = a + (k * Math.PI) / 3; g.moveTo(cx + Math.cos(b) * 9, 38 + Math.sin(b) * 9); g.lineTo(cx - Math.cos(b) * 9, 38 - Math.sin(b) * 9); } g.lineWidth = 0.6; g.stroke(); g.lineWidth = 2;
		}
		g.strokeStyle = '#c0392b'; g.beginPath(); g.moveTo(13, 38); g.lineTo(28, 38); g.lineTo(42, 22); g.lineTo(24, 22); g.lineTo(28, 38); g.moveTo(24, 22); g.lineTo(22, 18); g.moveTo(42, 22); g.lineTo(47, 38); g.stroke();
		const px = 28 + Math.cos(a) * 5, py = 38 + Math.sin(a) * 5;
		g.strokeStyle = '#2b2b2b'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(23, 17); g.lineTo((23 + px) / 2 + 5, (17 + py) / 2 - 3); g.lineTo(px, py); g.stroke();
		g.strokeStyle = '#e23b3b'; g.lineWidth = 4; g.beginPath(); g.moveTo(23, 17); g.lineTo(38, 9); g.lineTo(43, 19); g.stroke();
		g.fillStyle = '#f1c9a5'; g.beginPath(); g.arc(41, 6, 4, 0, 7); g.fill();
		g.fillStyle = '#2d7fd3'; g.beginPath(); g.ellipse(41, 4.5, 5, 3, 0, Math.PI, 0); g.fill();
	}
	return c;
}

function drawSpot() {
	const c = canvas(128, 32);
	const g = c.getContext('2d')!;
	const r = g.createRadialGradient(64, 16, 0, 64, 16, 64);
	r.addColorStop(0, 'rgba(255,250,210,0.95)');
	r.addColorStop(1, 'rgba(255,250,210,0)');
	g.setTransform(1, 0, 0, 0.25, 0, 12);
	g.fillStyle = r;
	g.fillRect(0, -48, 128, 128);
	return c;
}
