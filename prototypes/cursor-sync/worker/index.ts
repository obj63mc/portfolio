// PROTOTYPE, throwaway (ticket 09). One Worker serves the static prototype build and upgrades
// /ws/<room> to that room's Durable Object. Nothing touches Durable Object storage: every storage call
// bills as a row write, so room and shared-prop state live in memory and in socket attachments.
import { DurableObject } from 'cloudflare:workers';
import {
	ROOMS, RATES, DEFAULT_HZ, TITLES, SEQ_MS, decodeMove, encodeFrame,
	type RoomId, type Screen, type Title
} from '../src/lib/proto/protocol';

interface Env {
	ROOM: DurableObjectNamespace<Room>;
	ASSETS: Fetcher;
	TURNSTILE_SECRET: string;
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);
		const [, kind, room] = url.pathname.split('/');
		if ((kind !== 'ws' && kind !== 'stats') || !(room in ROOMS)) return env.ASSETS.fetch(req);
		const hz = Number(url.searchParams.get('hz') ?? DEFAULT_HZ);
		if (!RATES.includes(hz)) return new Response('bad hz', { status: 400 });
		// rooms at different rates are separate objects, so rates can be compared side by side
		const stub = env.ROOM.get(env.ROOM.idFromName(`${room}@${hz}`));
		if (kind === 'stats') return stub.fetch(`https://room/stats?room=${room}&hz=${hz}`);

		if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
		const origin = req.headers.get('Origin');
		if (origin && new URL(origin).host !== url.host && !/^(localhost|127\.|192\.168\.|10\.)/.test(new URL(origin).hostname))
			return new Response('bad origin', { status: 403 });
		const token = url.searchParams.get('ts');
		if (!token) return new Response('turnstile token required', { status: 401 });
		const form = new FormData();
		form.append('secret', env.TURNSTILE_SECRET);
		form.append('response', token);
		const ok = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
			.then((r) => r.json<{ success: boolean }>());
		if (!ok.success) return new Response('turnstile failed', { status: 403 });

		const cc = (req.cf?.country as string | undefined) ?? 'XX';
		const q = new URLSearchParams({ room, hz: String(hz), cc, cos: url.searchParams.get('cos') ?? '-1', gold: url.searchParams.get('gold') ?? '0' });
		return stub.fetch(`https://room/join?${q}`, { headers: req.headers });
	}
};

interface Peer {
	id: number;
	cc: string;
	cos: number;
	gold: boolean;
	x: number; // -1 until the first move
	y: number;
	spec: boolean;
	joined: number;
	tokens: number;
	refill: number;
}

type Attachment = Omit<Peer, 'tokens' | 'refill'> & { room: RoomId; hz: number };

export class Room extends DurableObject<Env> {
	private room: RoomId = 'overworld';
	private hz = DEFAULT_HZ;
	private peers = new Map<WebSocket, Peer>();
	private nextId = 1;
	private dirty = new Set<Peer>();
	private tick: ReturnType<typeof setInterval> | null = null;
	private idleTicks = 0;
	private screen: Screen | null = null;
	private screenTimer: ReturnType<typeof setTimeout> | null = null;
	private c = { since: Date.now(), wakes: 1, msgsIn: 0, movesIn: 0, bytesIn: 0, framesOut: 0, bytesOut: 0, dropped: 0, rateClosed: 0, tickMs: 0, occupiedMs: 0, visitorMs: 0, liveMs: 0, sampleAt: Date.now() };

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// keepalives are answered without waking the object
		ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
		// after hibernation the constructor runs again: rebuild the room from the sockets' attachments
		for (const ws of ctx.getWebSockets()) {
			const a = ws.deserializeAttachment() as Attachment | null;
			if (!a) continue;
			this.room = a.room;
			this.hz = a.hz;
			this.peers.set(ws, { ...a, tokens: a.hz * 4, refill: Date.now() });
			this.nextId = Math.max(this.nextId, a.id + 1);
		}
	}

	async fetch(req: Request): Promise<Response> {
		const q = new URL(req.url).searchParams;
		this.room = q.get('room') as RoomId;
		this.hz = Number(q.get('hz'));
		if (new URL(req.url).pathname === '/stats') return Response.json(this.stats());

		const { cap } = ROOMS[this.room];
		const live = [...this.peers.values()].filter((p) => !p.spec).length;
		const pair = new WebSocketPair();
		const ws = pair[1];
		this.ctx.acceptWebSocket(ws);
		this.sample();
		const cos = Number(q.get('cos'));
		const p: Peer = {
			id: this.nextId++ % 65535, cc: q.get('cc') ?? 'XX', cos: cos >= -1 && cos <= 6 ? cos : -1, gold: q.get('gold') === '1',
			x: -1, y: -1, spec: live >= cap, joined: Date.now(), tokens: this.hz * 4, refill: Date.now()
		};
		this.peers.set(ws, p);
		this.save(ws, p);
		ws.send(JSON.stringify({
			t: 'hello', id: p.id, cc: p.cc, now: Date.now(), hz: this.hz, cap, live: live + (p.spec ? 0 : 1), spec: p.spec,
			peers: [...this.peers.values()].filter((o) => !o.spec && o !== p).map((o) => [o.id, o.cc, o.cos, o.gold, o.x, o.y]),
			screen: this.screen
		}));
		if (!p.spec) this.broadcast({ t: 'in', id: p.id, cc: p.cc, cos: p.cos, gold: p.gold }, ws);
		return new Response(null, { status: 101, webSocket: pair[0] });
	}

	async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
		const p = this.peers.get(ws);
		if (!p) return;
		this.c.msgsIn++;
		this.c.bytesIn += typeof msg === 'string' ? msg.length : msg.byteLength;
		// per-socket token bucket: twice the send rate, burst of four seconds' worth at 1x
		const now = Date.now();
		p.tokens = Math.min(this.hz * 4, p.tokens + ((now - p.refill) / 1000) * this.hz * 2);
		p.refill = now;
		if (--p.tokens < 0) {
			this.c.rateClosed++;
			ws.close(4008, 'rate limited');
			this.leave(ws);
			return;
		}
		if (p.spec) return void this.c.dropped++; // spectators send nothing that counts

		if (typeof msg !== 'string') {
			const m = decodeMove(msg);
			if (!m) return void this.c.dropped++;
			const { w, h } = ROOMS[this.room];
			p.x = Math.min(w, m[0]);
			p.y = Math.min(h, m[1]);
			this.c.movesIn++;
			this.dirty.add(p);
			this.startTick();
			return;
		}
		if (msg.length > 256) return void this.c.dropped++;
		let m: { t?: string; cos?: number; gold?: boolean; title?: string; c?: number };
		try { m = JSON.parse(msg); } catch { return void this.c.dropped++; }
		if (m.t === 'ping') ws.send(JSON.stringify({ t: 'pong', c: m.c, s: now }));
		else if (m.t === 'cos' && typeof m.cos === 'number' && m.cos >= -1 && m.cos <= 6) {
			p.cos = m.cos;
			p.gold = !!m.gold;
			this.save(ws, p);
			this.broadcast({ t: 'cos', id: p.id, cos: p.cos, gold: p.gold }, ws);
		} else if (m.t === 'play' && TITLES.includes(m.title as Title) && this.room === 'theatre') {
			if (this.screen) return void this.c.dropped++; // busy: dropped silently, first accepted op wins
			this.screen = { title: m.title as Title, startedAt: now };
			this.broadcast({ t: 'screen', screen: this.screen });
			this.screenTimer = setTimeout(() => {
				this.screen = null;
				this.screenTimer = null;
				this.broadcast({ t: 'screen', screen: null });
			}, SEQ_MS);
		} else this.c.dropped++;
	}

	async webSocketClose(ws: WebSocket, code: number) {
		this.leave(ws);
		try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ }
	}

	async webSocketError(ws: WebSocket) {
		this.leave(ws);
	}

	private leave(ws: WebSocket) {
		const p = this.peers.get(ws);
		if (!p) return;
		this.sample();
		this.peers.delete(ws);
		this.dirty.delete(p);
		if (!p.spec) {
			this.broadcast({ t: 'out', id: p.id });
			// a live slot opened: promote the longest-waiting spectator
			const next = [...this.peers.entries()].filter(([, o]) => o.spec).sort((a, b) => a[1].joined - b[1].joined)[0];
			if (next) {
				const [nws, np] = next;
				np.spec = false;
				this.save(nws, np);
				nws.send(JSON.stringify({ t: 'live' }));
				this.broadcast({ t: 'in', id: np.id, cc: np.cc, cos: np.cos, gold: np.gold }, nws);
			}
		}
		if (!this.peers.size) {
			// empty room: shared props reset, timers stop so the object can be evicted
			this.screen = null;
			if (this.screenTimer) clearTimeout(this.screenTimer);
			this.screenTimer = null;
			this.stopTick();
		}
	}

	private startTick() {
		this.idleTicks = 0;
		if (this.tick) return;
		const started = Date.now();
		this.tick = setInterval(() => {
			if (!this.dirty.size) {
				// nobody moved for two seconds: stop ticking so the object can hibernate
				if (++this.idleTicks > this.hz * 2) {
					this.c.tickMs += Date.now() - started;
					this.stopTick();
				}
				return;
			}
			this.idleTicks = 0;
			const frame = encodeFrame([...this.dirty]);
			this.dirty.clear();
			for (const ws of this.peers.keys()) {
				try { ws.send(frame); } catch { /* closing */ }
			}
			this.c.framesOut++;
			this.c.bytesOut += frame.byteLength * this.peers.size;
		}, 1000 / this.hz);
	}

	private stopTick() {
		if (!this.tick) return;
		clearInterval(this.tick);
		this.tick = null;
		// positions go into the attachments so a joiner after hibernation still sees everyone
		for (const [ws, p] of this.peers) this.save(ws, p);
	}

	private save(ws: WebSocket, p: Peer) {
		const { tokens, refill, ...rest } = p;
		ws.serializeAttachment({ ...rest, room: this.room, hz: this.hz } satisfies Attachment);
	}

	private broadcast(m: object, except?: WebSocket) {
		const s = JSON.stringify(m);
		for (const ws of this.peers.keys()) if (ws !== except) try { ws.send(s); } catch { /* closing */ }
	}

	/** Accumulate occupied time and visitor time since the last membership change. */
	private sample() {
		const now = Date.now(), dt = now - this.c.sampleAt;
		if (this.peers.size) this.c.occupiedMs += dt;
		this.c.visitorMs += dt * this.peers.size;
		this.c.liveMs += dt * [...this.peers.values()].filter((p) => !p.spec).length;
		this.c.sampleAt = now;
	}

	private stats() {
		this.sample();
		const c = this.c, visitorH = c.liveMs / 3.6e6;
		// Durable Object pricing: inbound WebSocket messages bill 20:1 as requests at $0.15/M; duration
		// bills 128 MB for every second the object is awake at $12.50 per million GB-s.
		const perVisitorHour = visitorH ? c.msgsIn / visitorH : 0;
		return {
			room: this.room, hz: this.hz, cap: ROOMS[this.room].cap,
			live: [...this.peers.values()].filter((p) => !p.spec).length,
			spectators: [...this.peers.values()].filter((p) => p.spec).length,
			screen: this.screen, ticking: !!this.tick,
			since: new Date(c.since).toISOString(), counters: c,
			perLiveVisitorHour: {
				msgsIn: Math.round(perVisitorHour),
				requestUSD: +((perVisitorHour / 20) * 0.15e-6).toFixed(6),
				downKB: visitorH ? Math.round(c.bytesOut / 1024 / (c.visitorMs / 3.6e6)) : 0
			},
			awake: { occupiedH: +(c.occupiedMs / 3.6e6).toFixed(3), gbS: Math.round((c.occupiedMs / 1000) * 0.125) }
		};
	}
}
