// PROTOTYPE (ticket 09): simulated visitors against a real room. Each bot wanders like a visitor
// (moves, pauses, drifts toward the busy area), sends at the room rate only when it moved, and measures
// echo latency (its own move coming back in a server frame, so it includes the server tick wait) and
// downlink per bot. Prints a line every 10 s and a cost projection at the end.
//
//   node scripts/bots.mjs --url wss://cursor-sync-proto.barmadden.workers.dev --room overworld --n 20 --hz 15 --secs 120
import { parseArgs } from 'node:util';

const { values: a } = parseArgs({
	options: {
		url: { type: 'string', default: 'ws://localhost:8787' },
		room: { type: 'string', default: 'overworld' },
		n: { type: 'string', default: '20' },
		hz: { type: 'string', default: '15' },
		secs: { type: 'string', default: '60' },
		idle: { type: 'string', default: '0.35' } // share of time a bot sits still
	}
});
const N = +a.n, HZ = +a.hz, SECS = +a.secs, IDLE = +a.idle;
const SIZE = { overworld: [5400, 2700], lobby: [2845, 1600], theatre: [2845, 1600] }[a.room];
const HOT = a.room === 'overworld' ? [100, 900, 1400, 933] : [200, 300, 2400, 1100];

const echo = [], t0 = performance.now();
let bytesIn = 0, framesIn = 0, movesOut = 0, live = 0, spec = 0, closed = 0;
const now = () => performance.now();

function bot(i) {
	return new Promise((done) => {
		const ws = new WebSocket(`${a.url}/ws/${a.room}?hz=${HZ}&ts=XXXX.DUMMY.TOKEN.XXXX&cos=${i % 8 - 1}`, { headers: { Origin: a.url.replace(/^ws/, 'http') } });
		ws.binaryType = 'arraybuffer';
		let id = -1, isSpec = false, x = HOT[0] + Math.random() * HOT[2], y = HOT[1] + Math.random() * HOT[3], tx = x, ty = y, wait = 0;
		const speed = 120 + Math.random() * 250, sent = new Map();
		let timer;
		ws.onmessage = (ev) => {
			if (typeof ev.data === 'string') {
				bytesIn += ev.data.length;
				const m = JSON.parse(ev.data);
				if (m.t === 'hello') { id = m.id; isSpec = m.spec; m.spec ? spec++ : live++; }
				if (m.t === 'live') { isSpec = false; spec--; live++; }
				return;
			}
			bytesIn += ev.data.byteLength;
			framesIn++;
			const v = new DataView(ev.data), n = v.getUint16(1, true);
			for (let k = 0; k < n; k++) {
				if (v.getUint16(3 + k * 6, true) !== id) continue;
				const key = (v.getUint16(5 + k * 6, true) << 16) | v.getUint16(7 + k * 6, true), at = sent.get(key);
				if (at !== undefined) { echo.push(now() - at); sent.delete(key); }
			}
		};
		ws.onopen = () => {
			timer = setInterval(() => {
				const dt = 1 / HZ;
				if (wait > 0) { wait -= dt; return; } // still: send nothing
				const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy), step = speed * dt;
				if (d <= step) {
					x = tx; y = ty;
					if (Math.random() < IDLE) wait = 1 + Math.random() * 6;
					const far = Math.random() < 0.25;
					tx = far ? HOT[0] + Math.random() * HOT[2] : x + (Math.random() - 0.5) * 600;
					ty = far ? HOT[1] + Math.random() * HOT[3] : y + (Math.random() - 0.5) * 350;
					tx = Math.max(0, Math.min(SIZE[0], tx)); ty = Math.max(0, Math.min(SIZE[1], ty));
				} else { x += (dx / d) * step; y += (dy / d) * step; }
				const xi = Math.round(x), yi = Math.round(y), b = new ArrayBuffer(5), v = new DataView(b);
				v.setUint8(0, 1); v.setUint16(1, xi, true); v.setUint16(3, yi, true);
				if (ws.readyState !== 1 || id < 0 || isSpec) return; // spectators send nothing
				ws.send(b);
				movesOut++;
				sent.set((xi << 16) | yi, now());
				if (sent.size > 64) sent.delete(sent.keys().next().value);
			}, 1000 / HZ);
		};
		ws.onclose = (ev) => { clearInterval(timer); if (ev.code !== 1000) { closed++; console.log(`bot ${i} closed ${ev.code} ${ev.reason}`); } done(); };
		ws.onerror = () => {};
		setTimeout(() => ws.close(1000, 'done'), SECS * 1000);
	});
}

const pct = (s, q) => Math.round(s[Math.floor(s.length * q)] ?? 0);
let last = { t: now(), bytes: 0, frames: 0, moves: 0 };
const report = setInterval(() => {
	const t = now(), d = (t - last.t) / 1000, s = [...echo].sort((p, q) => p - q);
	echo.length = 0;
	console.log(
		`${Math.round((t - t0) / 1000)}s live ${live} spec ${spec} closed ${closed} | echo p50 ${pct(s, 0.5)} p95 ${pct(s, 0.95)} p99 ${pct(s, 0.99)} ms | ` +
		`down ${((bytesIn - last.bytes) / 1024 / d / N).toFixed(1)} kB/s/bot, ${((framesIn - last.frames) / d / N).toFixed(1)} frames/s/bot | up ${((movesOut - last.moves) / d).toFixed(0)} msg/s total`
	);
	last = { t, bytes: bytesIn, frames: framesIn, moves: movesOut };
}, 10_000);

// stagger joins over a second, like real arrivals
await Promise.all(Array.from({ length: N }, (_, i) => new Promise((r) => setTimeout(r, (i * 1000) / N)).then(() => bot(i))));
clearInterval(report);
const hours = (N * SECS) / 3600, perVisitorHour = movesOut / hours;
console.log(`\n${movesOut} moves from ${N} bots over ${SECS} s = ${Math.round(perVisitorHour)} inbound msgs per visitor-hour`);
console.log(`requests cost: $${((perVisitorHour / 20) * 0.15e-6 * 1000).toFixed(4)} per 1,000 visitor-hours (20:1, $0.15/M, before the 1M included)`);
