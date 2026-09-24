// Simulated peers: a wandering bot per visitor, "sent" at 15 Hz like the capped protocol, and rendered
// 100 ms in the past by interpolating between the last snapshots (ticket 04). Off-camera peers are not
// interpolated or drawn (ticket 11).
import type { SceneDef } from './scenes';

const HZ = 15;
const DELAY = 0.1;

export interface Peer {
	x: number; y: number; tx: number; ty: number; speed: number; wait: number;
	flag: number; cos: number; gold: boolean;
	st: Float64Array; sx: Float32Array; sy: Float32Array; head: number; next: number;
}

export interface Drawn { x: number; y: number; flag: number; cos: number; gold: boolean }

export class Peers {
	list: Peer[] = [];
	drawn: Drawn[] = [];
	constructor(private scene: SceneDef, n: number, now: number) {
		this.resize(n, now);
	}

	resize(n: number, now: number) {
		while (this.list.length > n) this.list.pop();
		while (this.list.length < n) {
			const [x, y] = this.target();
			const p: Peer = {
				x, y, tx: x, ty: y, speed: 80 + Math.random() * 170, wait: Math.random() * 2,
				flag: Math.floor(Math.random() * 8), cos: Math.random() < 0.6 ? Math.floor(Math.random() * 7) : -1, gold: Math.random() < 0.05,
				st: new Float64Array(3).fill(now), sx: new Float32Array(3).fill(x), sy: new Float32Array(3).fill(y), head: 0,
				next: now + Math.random() / HZ
			};
			this.list.push(p);
		}
	}

	private target(): [number, number] {
		const s = this.scene, r = Math.random() < 0.6 ? s.hot : { x: 0, y: 0, w: s.w, h: s.h };
		return [r.x + Math.random() * r.w, r.y + Math.random() * r.h];
	}

	update(dt: number, now: number, view: { x: number; y: number; w: number; h: number }) {
		this.drawn.length = 0;
		const rt = now - DELAY;
		for (const p of this.list) {
			// the "remote" side: wander and send at 15 Hz
			if (p.wait > 0) p.wait -= dt;
			else {
				const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
				if (d <= step) {
					p.x = p.tx; p.y = p.ty; p.wait = Math.random() < 0.5 ? 0.3 + Math.random() * 2.5 : 0;
					[p.tx, p.ty] = Math.random() < 0.7 ? [p.x + (Math.random() - 0.5) * 500, p.y + (Math.random() - 0.5) * 300] : this.target();
					p.tx = Math.max(0, Math.min(this.scene.w, p.tx)); p.ty = Math.max(0, Math.min(this.scene.h, p.ty));
				} else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
			}
			if (now >= p.next) {
				p.next += 1 / HZ;
				if (p.next < now) p.next = now + 1 / HZ;
				p.head = (p.head + 1) % 3;
				p.st[p.head] = now; p.sx[p.head] = p.x; p.sy[p.head] = p.y;
			}
			// the local side: cull on the newest snapshot, then interpolate
			const hx = p.sx[p.head], hy = p.sy[p.head];
			if (hx < view.x - 60 || hy < view.y - 60 || hx > view.x + view.w + 20 || hy > view.y + view.h + 20) continue;
			const a = (p.head + 2) % 3, b = p.head, c = (p.head + 1) % 3;
			let x = p.sx[b], y = p.sy[b];
			for (const [i, j] of [[c, a], [a, b]]) {
				if (rt >= p.st[i] && rt <= p.st[j] && p.st[j] > p.st[i]) {
					const u = (rt - p.st[i]) / (p.st[j] - p.st[i]);
					x = p.sx[i] + (p.sx[j] - p.sx[i]) * u; y = p.sy[i] + (p.sy[j] - p.sy[i]) * u;
					break;
				}
			}
			this.drawn.push({ x, y, flag: p.flag, cos: p.cos, gold: p.gold });
		}
	}
}
