// The room client (buildout ticket 13), carried over from the cursor sync prototype's net.ts: one socket on the scene's
// room, `/ws/<scene id>` on the page's own origin, open from the first frame so that peers move behind the Join card.
// When it is down the scene carries on single-player with no reconnecting UI; the next `hello` overwrites what this
// client knew without animation. Rates, sizes and the wire format are protocol.ts's.
import type { ScreenTitle } from '../scenes/foundry.ts';
import { KEEPALIVE, RATE, RATE_LIMITED, decodeFrame, encodeMove, readServer, samePresence, type ClientMessage, type Peer, type Presence, type Tv } from './protocol.ts';
import { record, type Snap } from './peers.ts';
import { playing, type Screen } from './screen.ts';

/**
 * A peer as this client knows it: its presence, the positions received for it (none until its first move), and when its
 * cosmetic last changed (performance.now() ms), which pops it on; -Infinity for what it wore when this client met it.
 */
export interface NetPeer extends Omit<Peer, 'x' | 'y'> {
	snaps: Snap[];
	wornAt: number;
}

/**
 * The socket: none (no scene yet, a bot's page, or destroyed); connecting; live since its `hello` arrived at `at`
 * (performance.now() ms); or down, retrying once `retry` fires, or waiting for the tab to show when it has none.
 */
type Link =
	| { is: 'off' }
	| { is: 'connecting'; ws: WebSocket }
	| { is: 'live'; ws: WebSocket; at: number }
	| { is: 'down'; retry?: ReturnType<typeof setTimeout> };

/** What the page shows of the room: "N here", and "Offline, exploring solo" once per offline spell. */
export interface Status {
	count(n: number): void;
	solo(on: boolean): void;
}

/** A hidden tab gives up its place after this long, ms, and reconnects when it shows again. */
const HIDDEN = 60_000;
/** A socket closed sooner than this after its `hello`, ms, is an ordinary drop: the backoff keeps growing. */
const SETTLED = 1000;
/** The retry backoff's first and longest wait, seconds. */
const BACKOFF = { first: 0.5, most: 30 };
/** Seconds to wait after the room closed the socket for outrunning its token bucket. */
const RATE_LIMITED_WAIT = 5;

/**
 * The edge adds `Server-Timing: bot` to a crawler's pages (buildout ticket 07), and the WAF refuses its sockets: such a
 * page never opens one, announces nothing and never retries. Only barmadden.com sends it.
 */
const isBot = () =>
	(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.serverTiming?.some((t) => t.name === 'bot') ?? false;

export class Net {
	/** This visitor's id in the room and geolocated country, `XX` (the St. Louis flag) until a `hello` says otherwise. */
	id = 0;
	cc = 'XX';
	peers = new Map<number, NetPeer>();
	/** The room's Foundry screen (ticket 17), from its `hello` and its echoes; offline, the reel of a poster clicked here. */
	screen: Screen = null;
	/**
	 * The room's lobby TV (Joe, 2026-10-01), from its `hello` and its echoes: the channel, and who holds the remote. Offline
	 * it is this visitor's alone, taken, tuned and put back here.
	 */
	tv: Tv = { ch: 0, holder: null };
	/** This visitor put the remote back and the room hasn't yet said so. */
	private putting = false;
	private link: Link = { is: 'off' };
	private scene: string | null = null;
	private bot = isBot();
	/** Server time minus Date.now(), ms, from the last `hello`. */
	private offset = 0;
	/** Seconds before the next retry, doubling from 0.5 to 30. */
	private backoff = BACKOFF.first;
	/** The last move sent, packed, and when the next may go (performance.now() ms). */
	private sent = -1;
	private nextSend = 0;
	private solo = false;
	/** What this visitor wears, as the room last heard it or will on the next `hello`; none before Join, when nothing is sent. */
	private mine: Presence | null = null;
	private hiddenClose: ReturnType<typeof setTimeout> | undefined;
	private keepalive = setInterval(() => this.link.is === 'live' && this.link.ws.send('ping'), KEEPALIVE);
	private status: Status;

	constructor(status: Status) {
		this.status = status;
		document.addEventListener('visibilitychange', this.visibility);
	}

	/**
	 * Server time, epoch ms, for timelines every visitor in the room shares (the NPC rider, the Foundry screen). The offset
	 * ignores the `hello`'s one-way latency, tens of ms. It holds through a drop; before any `hello` it is Date.now().
	 */
	serverNow() {
		return Date.now() + this.offset;
	}

	/** Joins a scene's room, closing the last scene's socket. */
	join(scene: string) {
		this.scene = scene;
		this.screen = null;
		this.tv = { ch: 0, holder: null };
		this.backoff = BACKOFF.first;
		this.open();
	}

	/** Leaves the room for Sushi Stand, which has none: peers vanish, and no socket opens until the next join. */
	leave() {
		this.scene = null;
		this.screen = null;
		this.tv = { ch: 0, holder: null };
		this.close();
		this.link = { is: 'off' };
	}

	/**
	 * The lobby TV's remote: taken from the table, tuned a channel up or down, and put back. The room decides, the first
	 * take winning and only the holder tuning, and a take or a tune changes nothing here until it echoes. Offline the
	 * remote is on the table for this visitor alone, until a `hello` overwrites it.
	 */
	remote(m: Extract<ClientMessage, { t: `tv.${string}` }>) {
		const { ch, holder } = this.tv, live = this.link.is === 'live';
		if (this.link.is === 'live') this.link.ws.send(JSON.stringify(m));
		if (m.t === 'tv.take') {
			if (!live) this.tv = { ch, holder: holder ?? this.id };
		} else if (holder === this.id) {
			// Putting it back is the holder's to do, so it is back here at once and the card that closed stays closed; the
			// room's echoes of the presses before it, still on their way, don't hand it back.
			if (m.t === 'tv.put') (this.tv = { ch, holder: null }), (this.putting = live);
			else if (!live) this.tv = { ch: ch + m.by, holder };
		}
	}

	/**
	 * A Foundry poster's click: the room plays the title for everyone if its screen is idle, and nothing changes here until
	 * it echoes. Offline the screen's state machine runs here, from this click, until a `hello` overwrites it.
	 */
	play(title: ScreenTitle) {
		const now = this.serverNow();
		if (this.link.is === 'live') this.link.ws.send(JSON.stringify({ t: 'screen.play', title } satisfies ClientMessage));
		else if (!playing(this.screen, now)) this.screen = { title, at: now };
	}

	/** The own cursor's world position, every frame from Join on: sent at most RATE times a second, and only when it moved. */
	move(x: number, y: number) {
		if (this.link.is !== 'live' || document.hidden) return;
		const xi = Math.max(0, Math.round(x)), yi = Math.max(0, Math.round(y)), key = xi * 65536 + yi, t = performance.now();
		if (key === this.sent || t < this.nextSend) return;
		this.nextSend = Math.max(this.nextSend + 1000 / RATE, t + 500 / RATE);
		this.sent = key;
		this.link.ws.send(encodeMove(xi, yi));
	}

	/**
	 * This visitor's presence, every frame from Join on: sent when it changes, a hidden tab included (a cosmetic earned in
	 * another tab), and to every room after its `hello`.
	 */
	presence(p: Presence) {
		if (this.mine && samePresence(p, this.mine)) return;
		this.mine = { ...p };
		this.tell();
	}

	private tell() {
		if (this.mine && this.link.is === 'live') this.link.ws.send(JSON.stringify({ t: 'presence', ...this.mine } satisfies ClientMessage));
	}

	destroy() {
		this.scene = null;
		clearInterval(this.keepalive);
		clearTimeout(this.hiddenClose);
		document.removeEventListener('visibilitychange', this.visibility);
		this.close();
		this.link = { is: 'off' };
	}

	private open() {
		this.close();
		this.link = { is: 'off' };
		if (this.bot || !this.scene) return;
		if (document.hidden) return void (this.link = { is: 'down' });
		let ws: WebSocket;
		try {
			ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/${this.scene}`);
		} catch {
			return this.down();
		}
		ws.binaryType = 'arraybuffer';
		this.link = { is: 'connecting', ws };
		const current = () => 'ws' in this.link && this.link.ws === ws;
		ws.onmessage = (e) => {
			if (!current()) return;
			if (typeof e.data === 'string') this.message(e.data, ws);
			else if (e.data instanceof ArrayBuffer) this.frame(e.data);
		};
		ws.onclose = (e) => {
			if (current()) this.down(e.code === RATE_LIMITED ? RATE_LIMITED_WAIT : undefined);
		};
	}

	/** Closes the socket, if any, and forgets the room: peers vanish at once. The caller sets the link. */
	private close() {
		if (this.link.is === 'down') clearTimeout(this.link.retry);
		if ('ws' in this.link && this.link.ws.readyState <= WebSocket.OPEN) this.link.ws.close(1000);
		// With the room gone nobody else holds the remote; this visitor keeps it if they had it.
		if (this.tv.holder !== this.id) this.tv = { ch: this.tv.ch, holder: null };
		this.peers.clear();
		this.status.count(1);
	}

	/** The socket dropped or was refused: single-player, then a retry after a jittered backoff, or after `wait` seconds. */
	private down(wait?: number) {
		if (this.link.is === 'live' && performance.now() - this.link.at >= SETTLED) this.backoff = BACKOFF.first;
		this.close();
		this.setSolo(true);
		if (document.hidden) return void (this.link = { is: 'down' });
		const w = wait ?? Math.min(BACKOFF.most, this.backoff * (0.8 + Math.random() * 0.4));
		this.backoff = Math.min(BACKOFF.most, this.backoff * 2);
		this.link = { is: 'down', retry: setTimeout(() => this.open(), w * 1000) };
	}

	private setSolo(on: boolean) {
		if (on !== this.solo) this.status.solo((this.solo = on));
	}

	/** A hidden tab stops sending at once (`move`) and closes after a minute; showing it reconnects. */
	private visibility = () => {
		clearTimeout(this.hiddenClose);
		if (document.hidden) {
			this.hiddenClose = setTimeout(() => {
				this.close();
				this.link = { is: 'down' };
			}, HIDDEN);
		} else if (this.link.is === 'down' && !this.link.retry) {
			this.backoff = BACKOFF.first;
			this.open();
		}
	};

	private message(text: string, ws: WebSocket) {
		const m = readServer(text);
		if (!m) return;
		const t = performance.now();
		const known = ({ id, cc, cos, gold, river, x, y }: Peer): NetPeer => ({ id, cc, cos, gold, river, snaps: x >= 0 ? [{ t, x, y }] : [], wornAt: -Infinity });
		switch (m.t) {
			case 'hello':
				this.id = m.id;
				this.cc = m.cc;
				this.offset = m.now - Date.now();
				this.peers = new Map(m.peers.map((p) => [p.id, known(p)]));
				this.screen = m.screen;
				this.tv = m.tv;
				this.putting = false;
				this.link = { is: 'live', ws, at: t };
				this.sent = -1; // the new room hears where this cursor is at once
				this.tell(); // and, once joined, what it wears; the room drops it if that's nothing
				this.setSolo(false);
				break;
			case 'in':
				this.peers.set(m.id, known(m));
				break;
			case 'out':
				this.peers.delete(m.id);
				break;
			case 'presence': {
				const p = this.peers.get(m.id);
				if (!p) return;
				// A grant pops; a peer not yet seen moving takes what it wears at once, as one arriving from another room
				// does, since it joins wearing nothing and says what it wears right after.
				if (m.cos !== p.cos && p.snaps.length) p.wornAt = t;
				Object.assign(p, { cos: m.cos, gold: m.gold, river: m.river });
				return;
			}
			case 'screen':
				this.screen = { title: m.title, at: m.at };
				return;
			case 'tv':
				if (m.holder !== this.id) this.putting = false;
				this.tv = { ch: m.ch, holder: this.putting ? null : m.holder };
				return;
		}
		this.status.count(this.peers.size + 1);
	}

	private frame(b: ArrayBuffer) {
		const t = performance.now();
		decodeFrame(b, (id, x, y) => {
			const p = id !== this.id && this.peers.get(id);
			if (p) record(p.snaps, x, y, t, 1000 / RATE);
		});
	}
}
