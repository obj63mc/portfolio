// The room wire protocol (spec: "Rooms, protocol and degradation"), shared by the Worker's room object and the client.
// The hot path is hand-packed binary, little-endian; the rare control messages are JSON text.
//
// client -> server
//   binary  [1, x u16, y u16]                        a move in whole world px, at most RATE a second, only when it moved
//   text    {"t":"presence","cos":0-7,"gold":bool,"river":bool}
//   text    ping                                     keepalive every KEEPALIVE, answered pong by the hibernation auto-response
// server -> client
//   binary  [2, n u16, (id u16, x u16, y u16) * n]   every cursor that moved since the last tick
//   text    ServerMessage below: hello, in, out, presence

/** Moves up and frames down, per second. */
export const RATE = 20;
/**
 * Keepalive, ms: the client's `ping`, which the room's auto-response answers without waking it. A visitor only watching
 * (a video of a few minutes, no move) keeps their place by it; a room drops a socket that goes three of them without one.
 */
export const KEEPALIVE = 30_000;
/** Visitors per room (ADR 0005). */
export const CAP = 60;
/** The longest control message a room reads; anything longer is dropped unparsed. */
export const MAX_TEXT = 256;
/** The close code for a socket that outran its token bucket; the client waits 5 s before reconnecting. */
export const RATE_LIMITED = 4008;

const MOVE = 1;
const FRAME = 2;

/** What a visitor wears: a cosmetic id (0 is none), the gold bit, and the river bit while the current carries them. */
export interface Presence {
	cos: number;
	gold: boolean;
	river: boolean;
}

/** A visitor as the room shows them: x and y are -1 until their first move; cc is the geolocated country, XX unknown. */
export interface Peer extends Presence {
	id: number;
	cc: string;
	x: number;
	y: number;
}

export type ServerMessage =
	| {
			t: 'hello';
			id: number;
			cc: string;
			/** Server time, ms since the epoch, for the shared props' timelines. */
			now: number;
			rate: number;
			cap: number;
			/** The room's name, `scene:n`. */
			room: string;
			peers: Peer[];
			/** The shared-prop snapshot: the Foundry screen's state once ticket 17 adds it, null until then. */
			screen: null;
	  }
	| ({ t: 'in' } & Peer)
	| { t: 'out'; id: number }
	| ({ t: 'presence'; id: number } & Presence);

export type ClientMessage = { t: 'presence' } & Presence;

export function encodeMove(x: number, y: number): ArrayBuffer {
	const b = new ArrayBuffer(5);
	const v = new DataView(b);
	v.setUint8(0, MOVE);
	v.setUint16(1, x, true);
	v.setUint16(3, y, true);
	return b;
}

export function decodeMove(b: ArrayBuffer): [x: number, y: number] | null {
	const v = new DataView(b);
	return b.byteLength === 5 && v.getUint8(0) === MOVE ? [v.getUint16(1, true), v.getUint16(3, true)] : null;
}

export function encodeFrame(cursors: Iterable<{ id: number; x: number; y: number }>): ArrayBuffer {
	const list = [...cursors];
	const b = new ArrayBuffer(3 + list.length * 6);
	const v = new DataView(b);
	v.setUint8(0, FRAME);
	v.setUint16(1, list.length, true);
	list.forEach((c, i) => {
		v.setUint16(3 + i * 6, c.id, true);
		v.setUint16(5 + i * 6, c.x, true);
		v.setUint16(7 + i * 6, c.y, true);
	});
	return b;
}

/** Calls `each` for every cursor in a frame, or for none if the bytes aren't one; a callback allocates nothing per frame. */
export function decodeFrame(b: ArrayBuffer, each: (id: number, x: number, y: number) => void) {
	if (b.byteLength < 3) return;
	const v = new DataView(b);
	const n = v.getUint16(1, true);
	if (v.getUint8(0) !== FRAME || b.byteLength !== 3 + n * 6) return;
	for (let i = 0; i < n; i++) each(v.getUint16(3 + i * 6, true), v.getUint16(5 + i * 6, true), v.getUint16(7 + i * 6, true));
}

const isPresence = (m: Record<string, unknown>) => Number.isInteger(m.cos) && typeof m.gold === 'boolean' && typeof m.river === 'boolean';
const isPeer = (m: Record<string, unknown>) =>
	Number.isInteger(m.id) && typeof m.cc === 'string' && isPresence(m) && Number.isInteger(m.x) && Number.isInteger(m.y);
const isObject = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null;

/**
 * A text message from the room, narrowed for the client, or null to drop it: the `pong` auto-response, anything not
 * JSON, an unknown op or a bad field. The peers' own fields are all a client reads, so extra ones pass through.
 */
export function readServer(text: string): ServerMessage | null {
	let m: unknown;
	try {
		m = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isObject(m)) return null;
	const ok =
		m.t === 'hello'
			? Number.isInteger(m.id) &&
				typeof m.cc === 'string' &&
				typeof m.now === 'number' &&
				Number.isInteger(m.rate) &&
				Number.isInteger(m.cap) &&
				typeof m.room === 'string' &&
				m.screen === null &&
				Array.isArray(m.peers) &&
				m.peers.every((p) => isObject(p) && isPeer(p))
			: m.t === 'in'
				? isPeer(m)
				: m.t === 'out'
					? Number.isInteger(m.id)
					: m.t === 'presence' && Number.isInteger(m.id) && isPresence(m);
	return ok ? (m as ServerMessage) : null;
}

/** A control message from a client, validated, or null to drop it: too long, not JSON, an unknown op or a bad field. */
export function readControl(text: string): ClientMessage | null {
	// The length check first spares encoding a long message; the byte count catches multi-byte characters under it.
	if (text.length > MAX_TEXT || new TextEncoder().encode(text).byteLength > MAX_TEXT) return null;
	let m: unknown;
	try {
		m = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof m !== 'object' || m === null) return null;
	const { t, cos, gold, river } = m as Record<string, unknown>;
	if (t !== 'presence' || typeof gold !== 'boolean' || typeof river !== 'boolean') return null;
	return Number.isInteger(cos) && typeof cos === 'number' && cos >= 0 && cos <= 7 ? { t, cos, gold, river } : null;
}
