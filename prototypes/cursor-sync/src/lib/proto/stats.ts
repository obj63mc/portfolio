// Frame timing from rAF timestamps (captures style, layout, paint and composite of every variant) plus
// the JS time of the scene loop itself.
export class Stats {
	private d = new Float32Array(240);
	private j = new Float32Array(240);
	private i = 0;
	private n = 0;
	rec: { d: number[]; j: number[] } | null = null;

	push(delta: number, js: number) {
		this.d[this.i] = delta; this.j[this.i] = js;
		this.i = (this.i + 1) % this.d.length; this.n = Math.min(this.n + 1, this.d.length);
		if (this.rec) { this.rec.d.push(delta); this.rec.j.push(js); }
	}

	recent() {
		return summarise(Array.from(this.d.subarray(0, this.n)), Array.from(this.j.subarray(0, this.n)));
	}
}

const pct = (s: number[], p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? 0;
const r1 = (x: number) => Math.round(x * 10) / 10;

export function summarise(d: number[], j: number[]) {
	if (!d.length) return { fps: 0, p50: 0, p95: 0, p99: 0, jank: 0, long: 0, jsP95: 0, frames: 0, refresh: 0 };
	const s = [...d].sort((a, b) => a - b), js = [...j].sort((a, b) => a - b);
	const total = d.reduce((a, b) => a + b, 0);
	// refresh interval: the 10th percentile frame, snapped to 60/90/120 Hz
	const lo = pct(s, 0.1), refresh = [8.33, 11.11, 16.67].reduce((a, b) => (Math.abs(b - lo) < Math.abs(a - lo) ? b : a));
	return {
		fps: r1((d.length / total) * 1000),
		p50: r1(pct(s, 0.5)), p95: r1(pct(s, 0.95)), p99: r1(pct(s, 0.99)),
		jank: r1((d.filter((x) => x > refresh * 1.5).length / d.length) * 100), // % of frames that missed a vsync
		long: d.filter((x) => x > 50).length,
		jsP95: r1(pct(js, 0.95)), frames: d.length, refresh: Math.round(1000 / refresh)
	};
}
