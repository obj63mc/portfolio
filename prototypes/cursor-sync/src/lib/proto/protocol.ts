// PROTOTYPE, throwaway (ticket 09). The wire protocol, shared by the Worker, the room Durable Object,
// the client and the bot script. Hot path (moves up, cursor frames down) is hand-packed binary; rare
// control messages are JSON text frames.
//
// client -> server
//   binary  [1, x u16, y u16]                          move, world px, at most `hz` per second
//   text    {"t":"cos","cos":-1..6,"gold":bool}        worn cosmetic changed
//   text    {"t":"play","title":"fast-five"}           Foundry screen op
//   text    {"t":"ping","c":clientMs}                  RTT and clock offset
//   text    "ping"                                     keepalive, answered "pong" by auto-response
// server -> client
//   binary  [2, n u16, (id u16, x u16, y u16) * n]     every changed cursor since the last tick
//   text    {"t":"hello",id,cc,now,hz,cap,live,spec,peers:[[id,cc,cos,gold,x,y]],screen}
//   text    {"t":"in",id,cc,cos,gold} {"t":"out",id} {"t":"cos",id,cos,gold}
//   text    {"t":"live"}                               a spectator was promoted to a live cursor
//   text    {"t":"screen",screen:null|{title,startedAt}}
//   text    {"t":"pong",c,s}

export type RoomId = 'overworld' | 'lobby' | 'theatre';

// Per-room live-cursor caps. Their sum is the global cost bound: 30 on the overworld plus 6 in each of
// the five sub-scenes of the real site is 60 live cursors. Everyone past the cap is a spectator.
export const ROOMS: Record<RoomId, { w: number; h: number; cap: number }> = {
	overworld: { w: 5400, h: 2700, cap: 30 },
	lobby: { w: 2845, h: 1600, cap: 6 },
	theatre: { w: 2845, h: 1600, cap: 6 }
};

export const RATES = [10, 15, 20];
export const DEFAULT_HZ = 15;

export const TITLES = ['fast-five', 'snow-white', 'lorax'] as const;
export type Title = (typeof TITLES)[number];
export const SEQ_MS = 12000; // the busy window of one screen sequence

export interface Screen { title: Title; startedAt: number }

export const MOVE = 1;
export const FRAME = 2;

export function encodeMove(x: number, y: number) {
	const b = new ArrayBuffer(5), v = new DataView(b);
	v.setUint8(0, MOVE);
	v.setUint16(1, x, true);
	v.setUint16(3, y, true);
	return b;
}

export function decodeMove(b: ArrayBuffer): [number, number] | null {
	if (b.byteLength !== 5) return null;
	const v = new DataView(b);
	return v.getUint8(0) === MOVE ? [v.getUint16(1, true), v.getUint16(3, true)] : null;
}

export function encodeFrame(cs: { id: number; x: number; y: number }[]) {
	const b = new ArrayBuffer(3 + cs.length * 6), v = new DataView(b);
	v.setUint8(0, FRAME);
	v.setUint16(1, cs.length, true);
	cs.forEach((c, i) => {
		v.setUint16(3 + i * 6, c.id, true);
		v.setUint16(5 + i * 6, c.x, true);
		v.setUint16(7 + i * 6, c.y, true);
	});
	return b;
}

export function decodeFrame(b: ArrayBuffer, each: (id: number, x: number, y: number) => void) {
	const v = new DataView(b);
	if (v.getUint8(0) !== FRAME) return;
	const n = v.getUint16(1, true);
	for (let i = 0; i < n; i++) each(v.getUint16(3 + i * 6, true), v.getUint16(5 + i * 6, true), v.getUint16(7 + i * 6, true));
}

// Countries with a flag in the placeholder atlas; everything else wears the St. Louis flag (index 0).
const FLAGS = ['STL', 'US', 'FR', 'DE', 'JP', 'BR', 'CA', 'IT'];
export const flagIndex = (cc: string) => Math.max(0, FLAGS.indexOf(cc));
