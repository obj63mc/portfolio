// Seam 1's pure half: the wire encoding and the guards on control messages, without a socket (the rooms themselves are
// tested through wrangler dev in rooms.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeFrame, decodeMove, encodeFrame, encodeMove, readControl, readServer, type Peer } from '../src/lib/net/protocol.ts';

test('a move is 5 bytes and round-trips; any other shape is not a move', () => {
	const move = encodeMove(4799, 65535);
	assert.equal(move.byteLength, 5);
	assert.deepEqual(decodeMove(move), [4799, 65535]);
	assert.equal(decodeMove(new ArrayBuffer(6)), null);
	assert.equal(decodeMove(new Uint8Array([2, 0, 0, 0, 0]).buffer), null);
});

test('a frame is 3 + 6n bytes and round-trips every cursor in it; a truncated frame decodes nothing', () => {
	const cursors = [
		{ id: 1, x: 0, y: 0 },
		{ id: 65535, x: 5400, y: 4800 },
		{ id: 300, x: 1234, y: 567 }
	];
	const frame = encodeFrame(cursors);
	assert.equal(frame.byteLength, 3 + 6 * cursors.length);
	const out: typeof cursors = [];
	decodeFrame(frame, (id, x, y) => out.push({ id, x, y }));
	assert.deepEqual(out, cursors);
	decodeFrame(frame.slice(0, 10), () => assert.fail('decoded a truncated frame'));
	assert.equal(encodeFrame([]).byteLength, 3);
});

test('control: a presence update is read with only its own fields', () => {
	assert.deepEqual(readControl('{"t":"presence","cos":7,"gold":true,"river":false,"cc":"FR"}'), {
		t: 'presence',
		cos: 7,
		gold: true,
		river: false
	});
	assert.deepEqual(readControl('{"t":"presence","cos":0,"gold":false,"river":true}'), {
		t: 'presence',
		cos: 0,
		gold: false,
		river: true
	});
});

test('control: bad cosmetic ids and bits, unknown ops, bad JSON and anything over 256 bytes are dropped', () => {
	const presence = (fields: object) => JSON.stringify({ t: 'presence', cos: 1, gold: false, river: false, ...fields });
	for (const text of [
		presence({ cos: 8 }),
		presence({ cos: -1 }),
		presence({ cos: 1.5 }),
		presence({ cos: '1' }),
		presence({ gold: 1 }),
		presence({ river: undefined }),
		presence({ t: 'cos' }),
		presence({ pad: 'x'.repeat(256) }),
		// Under 256 characters, over 256 bytes.
		presence({ pad: 'é'.repeat(120) }),
		'{"t":"presence"',
		'null',
		'[]',
		'"ping"',
		'7'
	])
		assert.equal(readControl(text), null, text);
});

test('server: hello, in, out and presence are read as the client knows them', () => {
	const peer: Peer = { id: 2, cc: 'FR', cos: 3, gold: false, river: true, x: 10, y: -1 };
	const hello = { t: 'hello', id: 1, cc: 'XX', now: 1_790_000_000_000, rate: 20, cap: 60, room: 'overworld:1', peers: [peer], screen: null, tv: { ch: 0, holder: null } };
	for (const m of [hello, { t: 'in', ...peer }, { t: 'out', id: 2 }, { t: 'presence', id: 2, cos: 0, gold: true, river: false }])
		assert.deepEqual(readServer(JSON.stringify(m)), m);
});

test('server: anything else is dropped, the pong auto-response included', () => {
	const peer = { id: 2, cc: 'FR', cos: 3, gold: false, river: true, x: 10, y: 20 };
	for (const text of [
		'pong',
		'{"t":"hello","id":1}',
		JSON.stringify({ t: 'hello', id: 1, cc: 'XX', now: 1, rate: 20, cap: 60, room: 'overworld:1', peers: [{ ...peer, gold: 'no' }], screen: null, tv: { ch: 0, holder: null } }),
		JSON.stringify({ t: 'hello', id: 1, cc: 'XX', now: 1, rate: 20, cap: 60, peers: [peer], screen: null, tv: { ch: 0, holder: null } }),
		JSON.stringify({ t: 'in', ...peer, id: '2' }),
		JSON.stringify({ t: 'in', ...peer, x: undefined }),
		JSON.stringify({ t: 'out' }),
		JSON.stringify({ t: 'presence', id: 2, cos: 1 }),
		JSON.stringify({ t: 'screen', id: 2 }),
		'null',
		'[]'
	])
		assert.equal(readServer(text), null, text);
});

test('control: a poster click is `screen.play` with a title the build knows; anything else is dropped', () => {
	assert.deepEqual(readControl('{"t":"screen.play","title":"lorax","x":1}'), { t: 'screen.play', title: 'lorax' });
	for (const title of ['toString', 'Lorax', 7, null, undefined])
		assert.equal(readControl(JSON.stringify({ t: 'screen.play', title })), null, String(title));
});

test('server: the screen snapshot in hello and the echo of an accepted play are read; bad ones are dropped', () => {
	const hello = { t: 'hello', id: 1, cc: 'XX', now: 5, rate: 20, cap: 60, room: 'foundry:1', peers: [], tv: { ch: 0, holder: null } };
	for (const m of [{ ...hello, screen: { title: 'fast-five', at: 4 } }, { t: 'screen', title: 'snow-white', at: 4 }])
		assert.deepEqual(readServer(JSON.stringify(m)), m);
	for (const m of [
		{ ...hello, screen: { title: 'jaws', at: 4 } },
		{ ...hello, screen: { title: 'lorax' } },
		hello,
		{ t: 'screen', title: 'lorax', at: '4' },
		{ t: 'screen', at: 4 }
	])
		assert.equal(readServer(JSON.stringify(m)), null, JSON.stringify(m));
});

test("control: the lobby TV's remote is taken, put back and tuned one channel up or down; anything else is dropped", () => {
	assert.deepEqual(readControl('{"t":"tv.take","holder":3}'), { t: 'tv.take' });
	assert.deepEqual(readControl('{"t":"tv.put"}'), { t: 'tv.put' });
	for (const by of [1, -1]) assert.deepEqual(readControl(JSON.stringify({ t: 'tv.tune', by, ch: 9 })), { t: 'tv.tune', by });
	for (const by of [0, 2, -2, 0.5, '1', null, undefined]) assert.equal(readControl(JSON.stringify({ t: 'tv.tune', by })), null, String(by));
	assert.equal(readControl('{"t":"tv.steal"}'), null);
});

test("server: the lobby TV in hello and after each change, its channel and its remote's holder, are read; bad ones are dropped", () => {
	const hello = { t: 'hello', id: 1, cc: 'XX', now: 5, rate: 20, cap: 60, room: 'moosylvania:1', peers: [], screen: null };
	for (const m of [{ ...hello, tv: { ch: -3, holder: 2 } }, { ...hello, tv: { ch: 0, holder: null } }, { t: 'tv', ch: 40, holder: 1 }, { t: 'tv', ch: 0, holder: null }])
		assert.deepEqual(readServer(JSON.stringify(m)), m);
	for (const m of [hello, { ...hello, tv: null }, { ...hello, tv: { ch: 0 } }, { ...hello, tv: { ch: '1', holder: null } }, { t: 'tv', ch: 1.5, holder: null }, { t: 'tv', ch: 1, holder: 'me' }, { t: 'tv', holder: 1 }])
		assert.equal(readServer(JSON.stringify(m)), null, JSON.stringify(m));
});
