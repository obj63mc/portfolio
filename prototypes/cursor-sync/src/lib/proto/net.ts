// PROTOTYPE (ticket 09): the real socket in place of ticket 08's simulated peers. One socket per scene
// room; peers are drawn `delay` ms behind by interpolating between received snapshots, and off-camera
// peers are skipped (ticket 11). When the socket is down the scene carries on single-player and the
// Foundry screen runs locally; the next hello overwrites local state without animation.
import {
	DEFAULT_HZ, SEQ_MS, decodeFrame, encodeMove, flagIndex,
	type RoomId, type Screen, type Title
} from './protocol';
import type { Drawn } from './peers';

export interface NetSettings { hz: number; delay: number; turnstile: boolean; base: string }

type State = 'off' | 'connecting' | 'live' | 'spectator' | 'down';

interface NetPeer {
	id: number; cc: string; flag: number; cos: number; gold: boolean;
	st: Float64Array; sx: Float32Array; sy: Float32Array; head: number; n: number;
}

const SITE_KEY = '1x00000000000000000000AA'; // Turnstile test key: always passes
const now = () => performance.now() / 1000;

export class Net {
	state: State = 'off';
	room: RoomId | null = null;
	id = 0;
	cc = '';
	cap = 0;
	peers = new Map<number, NetPeer>();
	drawn: Drawn[] = [];
	cos = -1;
	gold = false;

	private ws: WebSocket | null = null;
	private serverScreen: Screen | null = null;
	private localScreen: Screen | null = null;
	private offset = 0; // server ms minus Date.now()
	private bestRtt = Infinity;
	private lastSent = -1;
	private nextSend = 0;
	private sent = new Map<number, number>();
	private echo: number[] = [];
	private rtt = 0;
	private joinMs = 0;
	private backoff = 0.5;
	private retryAt = 0;
	private retry: ReturnType<typeof setTimeout> | null = null;
	private blockedUntil = 0;
	private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
	private pinger: ReturnType<typeof setInterval>;
	private meter = { at: now(), bytes: 0, frames: 0, ups: 0, kBps: 0, fps: 0, upHz: 0 };
	private closeNote = '';

	constructor(private s: NetSettings) {
		this.pinger = setInterval(() => this.sendJson({ t: 'ping', c: Date.now() }), 2000);
		document.addEventListener('visibilitychange', this.onVisibility);
	}

	get hz() { return this.s.hz || DEFAULT_HZ; }
	get flag() { return flagIndex(this.cc); }
	serverNow() { return Date.now() + this.offset; }

	/** What the screen shows: server state when connected, the local machine otherwise. */
	get screen(): Screen | null {
		if (this.state === 'live') return this.serverScreen;
		if (this.state === 'spectator') return this.serverScreen ?? this.localScreen;
		return this.localScreen;
	}
	get screenSource() {
		if (this.state === 'live' || (this.state === 'spectator' && this.serverScreen)) return 'shared';
		return 'local';
	}

	// ---- connection -------------------------------------------------------------------------------

	join(room: RoomId) {
		this.room = room;
		this.backoff = 0.5;
		this.open();
	}

	private async open() {
		if (this.retry) clearTimeout(this.retry);
		this.retry = null;
		this.teardown();
		if (!this.room || document.hidden) return;
		const room = this.room, t0 = performance.now();
		this.state = 'connecting';
		let token = 'XXXX.DUMMY.TOKEN.XXXX';
		if (this.s.turnstile) {
			try { token = await turnstile(); } catch { this.closeNote = 'turnstile failed'; return this.down(5); }
		}
		if (this.room !== room || this.state !== 'connecting') return; // navigated meanwhile
		const q = new URLSearchParams({ hz: String(this.hz), ts: token, cos: String(this.cos), gold: this.gold ? '1' : '0' });
		const ws = new WebSocket(`${this.s.base}/ws/${room}?${q}`);
		ws.binaryType = 'arraybuffer';
		this.ws = ws;
		ws.onmessage = (ev) => {
			if (this.ws !== ws) return;
			if (typeof ev.data === 'string') {
				this.meter.bytes += ev.data.length;
				this.onJson(JSON.parse(ev.data), t0);
			} else {
				this.meter.bytes += ev.data.byteLength;
				this.meter.frames++;
				this.onFrame(ev.data);
			}
		};
		ws.onclose = (ev) => {
			if (this.ws !== ws) return;
			this.ws = null;
			this.closeNote = `closed ${ev.code}${ev.reason ? ' ' + ev.reason : ''}`;
			this.down(ev.code === 4008 ? 5 : undefined);
		};
	}

	private teardown() {
		const ws = this.ws;
		this.ws = null;
		if (ws && ws.readyState <= 1) ws.close(1000, 'leaving');
		this.peers.clear();
		this.drawn.length = 0;
		this.serverScreen = null;
	}

	/** Socket gone: single-player until the reconnect, with exponential backoff and jitter. */
	private down(wait?: number) {
		this.teardown();
		this.state = 'down';
		if (document.hidden) return;
		const w = Math.max(wait ?? this.backoff * (0.8 + Math.random() * 0.4), (this.blockedUntil - Date.now()) / 1000);
		this.backoff = Math.min(30, this.backoff * 2);
		this.retryAt = now() + w;
		this.retry = setTimeout(() => this.open(), w * 1000);
	}

	/** Test control: kill the socket and refuse to reconnect for `sec` seconds. */
	drop(sec: number) {
		this.blockedUntil = Date.now() + sec * 1000;
		this.closeNote = `dropped by hand for ${sec} s`;
		this.backoff = 0.5;
		this.down();
	}

	private onVisibility = () => {
		if (document.hidden) {
			// hidden tabs stop sending at once and give up their slot after a minute
			this.hiddenTimer = setTimeout(() => {
				this.closeNote = 'tab hidden 60 s';
				this.teardown();
				this.state = 'down';
			}, 60_000);
		} else {
			if (this.hiddenTimer) clearTimeout(this.hiddenTimer);
			this.hiddenTimer = null;
			if (this.state === 'down' && !this.retry) { this.backoff = 0.5; this.open(); }
		}
	};

	destroy() {
		clearInterval(this.pinger);
		if (this.retry) clearTimeout(this.retry);
		document.removeEventListener('visibilitychange', this.onVisibility);
		this.room = null;
		this.teardown();
	}

	// ---- messages ---------------------------------------------------------------------------------

	private onJson(m: any, t0: number) {
		switch (m.t) {
			case 'hello':
				this.state = m.spec ? 'spectator' : 'live';
				this.joinMs = Math.round(performance.now() - t0);
				this.id = m.id;
				this.cc = m.cc;
				this.cap = m.cap;
				this.backoff = 0.5;
				this.bestRtt = Infinity;
				this.offset = m.now - Date.now();
				for (const [id, cc, cos, gold, x, y] of m.peers) {
					const p = this.addPeer(id, cc, cos, gold);
					if (x >= 0) this.push(p, x, y, now());
				}
				this.serverScreen = m.screen;
				this.localScreen = null; // the snapshot wins, no animation
				this.lastSent = -1;
				break;
			case 'live':
				this.state = 'live';
				break;
			case 'in':
				this.addPeer(m.id, m.cc, m.cos, m.gold);
				break;
			case 'out':
				this.peers.delete(m.id);
				break;
			case 'cos': {
				const p = this.peers.get(m.id);
				if (p) { p.cos = m.cos; p.gold = m.gold; }
				break;
			}
			case 'screen':
				this.serverScreen = m.screen;
				break;
			case 'pong': {
				const t = Date.now(), rtt = t - m.c;
				this.rtt = rtt;
				if (rtt <= this.bestRtt) { this.bestRtt = rtt; this.offset = m.s + rtt / 2 - t; }
				break;
			}
		}
	}

	private addPeer(id: number, cc: string, cos: number, gold: boolean) {
		const p: NetPeer = { id, cc, flag: flagIndex(cc), cos, gold, st: new Float64Array(3), sx: new Float32Array(3), sy: new Float32Array(3), head: 0, n: 0 };
		this.peers.set(id, p);
		return p;
	}

	private onFrame(b: ArrayBuffer) {
		const t = now();
		decodeFrame(b, (id, x, y) => {
			if (id === this.id) {
				const at = this.sent.get((x << 16) | y);
				if (at !== undefined) {
					this.echo.push((t - at) * 1000);
					if (this.echo.length > 200) this.echo.shift();
				}
				return;
			}
			const p = this.peers.get(id);
			if (p) this.push(p, x, y, t);
		});
	}

	private push(p: NetPeer, x: number, y: number, t: number) {
		// after a pause, pin the old position one interval back so the peer doesn't slide across the gap
		if (p.n && t - p.st[p.head] > 2 / this.hz) this.write(p, p.sx[p.head], p.sy[p.head], t - 1 / this.hz);
		this.write(p, x, y, t);
	}

	private write(p: NetPeer, x: number, y: number, t: number) {
		if (!p.n) { p.st.fill(t); p.sx.fill(x); p.sy.fill(y); p.n = 1; return; }
		p.head = (p.head + 1) % 3;
		p.st[p.head] = t; p.sx[p.head] = x; p.sy[p.head] = y;
		p.n++;
	}

	private sendJson(m: object) {
		if (this.state === 'live' && this.ws?.readyState === 1) this.ws.send(JSON.stringify(m));
	}

	// ---- per frame --------------------------------------------------------------------------------

	/** Own cursor, every frame: sent at most `hz` times a second and only when it moved. */
	move(x: number, y: number) {
		if (this.state !== 'live' || document.hidden || this.ws?.readyState !== 1) return;
		const xi = Math.max(0, Math.round(x)), yi = Math.max(0, Math.round(y)), key = (xi << 16) | yi;
		const t = now();
		if (key === this.lastSent || t < this.nextSend) return;
		this.nextSend = Math.max(this.nextSend + 1 / this.hz, t + 0.5 / this.hz);
		this.lastSent = key;
		this.ws.send(encodeMove(xi, yi));
		this.meter.ups++;
		this.sent.set(key, t);
		if (this.sent.size > 64) this.sent.delete(this.sent.keys().next().value!);
	}

	play(title: Title) {
		if (this.state === 'live') return this.sendJson({ t: 'play', title }); // no optimistic change
		if (this.screen) return; // busy, same rule as the server
		const sc = { title, startedAt: this.serverNow() };
		this.localScreen = sc;
		setTimeout(() => { if (this.localScreen === sc) this.localScreen = null; }, SEQ_MS);
	}

	setCos(cos: number, gold: boolean) {
		this.cos = cos;
		this.gold = gold;
		this.sendJson({ t: 'cos', cos, gold });
	}

	update(_dt: number, _t: number, view: { x: number; y: number; w: number; h: number }) {
		this.drawn.length = 0;
		const rt = now() - this.s.delay / 1000;
		for (const p of this.peers.values()) {
			if (!p.n) continue;
			const hx = p.sx[p.head], hy = p.sy[p.head];
			if (hx < view.x - 60 || hy < view.y - 60 || hx > view.x + view.w + 20 || hy > view.y + view.h + 20) continue;
			const a = (p.head + 1) % 3, b = (p.head + 2) % 3, c = p.head; // oldest to newest
			let x = p.sx[c], y = p.sy[c];
			if (rt <= p.st[a]) { x = p.sx[a]; y = p.sy[a]; }
			else for (const [i, j] of [[a, b], [b, c]]) {
				if (rt >= p.st[i] && rt <= p.st[j] && p.st[j] > p.st[i]) {
					const u = (rt - p.st[i]) / (p.st[j] - p.st[i]);
					x = p.sx[i] + (p.sx[j] - p.sx[i]) * u; y = p.sy[i] + (p.sy[j] - p.sy[i]) * u;
					break;
				}
			}
			this.drawn.push({ x, y, flag: p.flag, cos: p.cos, gold: p.gold });
		}
	}

	hud() {
		const m = this.meter, t = now();
		if (t - m.at >= 1) {
			const d = t - m.at;
			m.kBps = Math.round((m.bytes / 1024 / d) * 10) / 10; m.fps = Math.round(m.frames / d); m.upHz = Math.round(m.ups / d);
			m.at = t; m.bytes = m.frames = m.ups = 0;
		}
		const e = [...this.echo].sort((a, b) => a - b), pc = (q: number) => Math.round(e[Math.floor(e.length * q)] ?? 0);
		const live = this.state === 'live' || this.state === 'spectator';
		const who = live ? ` · id ${this.id} · ${this.cc} · ${this.peers.size + (this.state === 'live' ? 1 : 0)}/${this.cap} live` : '';
		const why = this.state === 'down' ? ` · ${this.closeNote}${this.retry ? ` · retry in ${Math.max(0, this.retryAt - t).toFixed(1)} s` : ''}` : '';
		return (
			`net ${this.state.toUpperCase()} ${this.room}@${this.hz}Hz${who}${why}\n` +
			`rtt ${this.rtt} ms · echo p50 ${pc(0.5)} p95 ${pc(0.95)} ms · join ${this.joinMs} ms · interp ${this.s.delay} ms\n` +
			`down ${m.kBps} kB/s, ${m.fps} frames/s · up ${m.upHz} msg/s · screen ${this.screen ? this.screen.title : 'idle'} (${this.screenSource})`
		);
	}
}

// ---- Turnstile ------------------------------------------------------------------------------------

declare global {
	interface Window { turnstile?: { render(el: HTMLElement, o: object): string; remove(id: string): void } }
}
let tsScript: Promise<void> | null = null;

function turnstile(): Promise<string> {
	tsScript ??= new Promise((res, rej) => {
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		s.onload = () => res();
		s.onerror = rej;
		document.head.append(s);
	});
	return tsScript.then(() => new Promise<string>((res, rej) => {
		const box = document.createElement('div');
		box.className = 'ui ts-box';
		document.body.append(box);
		const done = () => setTimeout(() => { window.turnstile!.remove(id); box.remove(); });
		const id = window.turnstile!.render(box, {
			sitekey: SITE_KEY, appearance: 'interaction-only',
			callback: (tok: string) => { done(); res(tok); },
			'error-callback': () => { done(); rej(new Error('turnstile')); }
		});
	}));
}
