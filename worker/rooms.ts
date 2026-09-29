// The Worker's entry (wrangler.toml `main`): the fetch handler from index.ts and the two Durable Object classes behind it
// (ADR 0005). Each room is its own object named `scene:n`, holding up to 60 visitors; the directory hears only joins and
// leaves. Everything lives in memory and in socket attachments, never in the objects' storage, which bills per row and
// holds nothing a deploy shouldn't reset.
import { DurableObject } from 'cloudflare:workers';
import {
	CAP,
	RATE,
	RATE_LIMITED,
	decodeMove,
	encodeFrame,
	readControl,
	type Peer,
	type ServerMessage
} from '../src/lib/net/protocol.ts';
import { DIRECTORY, SCENES, refuse, type Env } from './index.ts';

export { default } from './index.ts';

/** What a room keeps with each socket, so that it can hibernate and wake with everyone where they were. */
interface Attachment {
	room: string;
	peer: Peer;
}

interface Visitor {
	peer: Peer;
	tokens: number;
	refill: number;
}

// The per-socket token bucket refills at twice the rate and holds four seconds' worth at the rate; past it, close 4008.
const BURST = RATE * 4;

const send = (ws: WebSocket, data: string | ArrayBuffer) => {
	try {
		ws.send(data);
	} catch {
		// Closing: its close handler removes it.
	}
};

export class Room extends DurableObject<Env> {
	private name = '';
	private visitors = new Map<WebSocket, Visitor>();
	private moved = new Set<Peer>();
	private tick: ReturnType<typeof setTimeout> | undefined;
	/** Ticks since anyone moved. */
	private still = 0;
	/** One stub for every report, so that they reach the directory in the order they were sent. */
	private directory = this.ctx.exports.Directory.getByName(DIRECTORY);

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// Keepalive pings are answered without waking the object.
		ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
		// Waking from hibernation runs the constructor again: rebuild the room from its sockets' attachments.
		for (const ws of ctx.getWebSockets()) {
			const { room, peer } = ws.deserializeAttachment() as Attachment;
			this.name = room;
			this.visitors.set(ws, { peer, tokens: BURST, refill: Date.now() });
		}
	}

	/** A socket upgrade forwarded by the Worker, whose URL alone carries the room's name and the visitor's country. */
	async fetch(req: Request): Promise<Response> {
		const q = new URL(req.url).searchParams;
		this.name = q.get('room') ?? this.name;
		if (this.visitors.size >= CAP) {
			// The directory's count was behind (it restarted, or a report overtook a placement). Correcting it sends
			// this visitor, reconnecting with backoff, to a room with space.
			await this.report();
			return refuse(503, 'room full');
		}
		const peers = [...this.visitors.values()].map((v) => v.peer);
		// Ids are unique among those present, which is all a client needs: a reused id always follows the old one's `out`.
		let id = 1;
		while (peers.some((p) => p.id === id)) id++;
		const peer: Peer = { id, cc: q.get('cc') ?? 'XX', cos: 0, gold: false, river: false, x: -1, y: -1 };
		const { 0: client, 1: ws } = new WebSocketPair();
		this.ctx.acceptWebSocket(ws);
		this.visitors.set(ws, { peer, tokens: BURST, refill: Date.now() });
		this.save(ws, peer);
		const hello: ServerMessage = {
			t: 'hello',
			id,
			cc: peer.cc,
			now: Date.now(),
			rate: RATE,
			cap: CAP,
			room: this.name,
			peers,
			screen: null
		};
		send(ws, JSON.stringify(hello));
		this.broadcast({ t: 'in', ...peer }, ws);
		await this.report();
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
		const v = this.visitors.get(ws);
		if (!v) return;
		const now = Date.now();
		v.tokens = Math.min(BURST, v.tokens + ((now - v.refill) / 1000) * RATE * 2);
		v.refill = now;
		if (--v.tokens < 0) {
			ws.close(RATE_LIMITED, 'rate limited');
			return this.leave(ws);
		}
		if (typeof msg !== 'string') {
			const move = decodeMove(msg);
			if (!move) return;
			const { w, h } = SCENES[this.name.split(':')[0]];
			v.peer.x = Math.min(w, move[0]);
			v.peer.y = Math.min(h, move[1]);
			this.moved.add(v.peer);
			this.still = 0;
			this.tick ??= setTimeout(this.step, 1000 / RATE);
			return;
		}
		// Dropped unless valid (too long, not JSON, an unknown op or a bad field) and a change: presence goes out when it
		// changes, never in the tick's frame.
		const m = readControl(msg), p = v.peer;
		if (!m || (m.cos === p.cos && m.gold === p.gold && m.river === p.river)) return;
		const { t, ...presence } = m;
		Object.assign(p, presence);
		this.save(ws, p);
		this.broadcast({ t, id: p.id, ...presence }, ws);
	}

	async webSocketClose(ws: WebSocket) {
		// Answer the client's close frame. The runtime doesn't for a hibernatable socket (under wrangler dev, 2026-09), and
		// the client waited out its ten-second closing timeout. A socket this room closed itself is already closed.
		try {
			ws.close();
		} catch {
			// Already closed.
		}
		await this.leave(ws);
	}

	async webSocketError(ws: WebSocket) {
		await this.leave(ws);
	}

	/** One tick: a frame of the cursors that moved, to everyone. After two still seconds it stops, so the room can hibernate. */
	private step = () => {
		if (this.moved.size) {
			const frame = encodeFrame(this.moved);
			this.moved.clear();
			this.still = 0;
			for (const ws of this.visitors.keys()) send(ws, frame);
		} else if (++this.still >= RATE * 2) {
			this.tick = undefined;
			// Positions go into the attachments, so the room wakes with everyone where they stopped.
			for (const [ws, v] of this.visitors) this.save(ws, v.peer);
			return;
		}
		this.tick = setTimeout(this.step, 1000 / RATE);
	};

	private async leave(ws: WebSocket) {
		const v = this.visitors.get(ws);
		if (!v) return;
		this.visitors.delete(ws);
		this.moved.delete(v.peer);
		if (!this.visitors.size) {
			clearTimeout(this.tick);
			this.tick = undefined;
		}
		// The directory hears first, so a peer that sees `out` knows the directory has counted it.
		await this.report();
		this.broadcast({ t: 'out', id: v.peer.id });
	}

	/**
	 * Tells the directory this room's true count, after every join, leave and refusal: a placement that never arrived, or
	 * a directory that restarted, is corrected by the room's next one, as is a lost report.
	 */
	private report() {
		return this.directory.size(this.name, this.visitors.size).catch(console.error);
	}

	private save(ws: WebSocket, peer: Peer) {
		ws.serializeAttachment({ room: this.name, peer } satisfies Attachment);
	}

	private broadcast(m: ServerMessage, except?: WebSocket) {
		const text = JSON.stringify(m);
		for (const ws of this.visitors.keys()) if (ws !== except) send(ws, text);
	}
}

export class Directory extends DurableObject<Env> {
	// ponytail: counts live in memory only. After an eviction (a quiet spell with no join or leave anywhere) the directory
	// starts empty and relearns each room from that room's next report; until then it undercounts the ceiling, which only
	// binds on a site too busy for the directory to go quiet, and may place a joiner in a full room, which refuses them to
	// single-player until their backoff retry. Have rooms report on a timer if that ever shows up in practice.
	/** Visitors per room: placements, overwritten by each room's own report. */
	private rooms = new Map<string, number>();

	/** The fullest room of this scene with space, else a new one; null once the site holds MAX_VISITORS. */
	place(scene: string): string | null {
		let total = 0;
		let best: string | undefined;
		let most = -1;
		for (const [room, n] of this.rooms) {
			total += n;
			if (n < CAP && n > most && room.startsWith(`${scene}:`)) [best, most] = [room, n];
		}
		// A missing or malformed ceiling refuses everyone rather than lifting the bound.
		if (!(total < Number(this.env.MAX_VISITORS))) return null;
		if (!best) {
			let n = 1;
			while (this.rooms.has(`${scene}:${n}`)) n++;
			[best, most] = [`${scene}:${n}`, 0];
		}
		this.rooms.set(best, most + 1);
		return best;
	}

	/** A room's own count after a join, a leave or a refusal. An empty room is forgotten, and its number reused. */
	size(room: string, n: number) {
		if (n) this.rooms.set(room, n);
		else this.rooms.delete(room);
	}
}
