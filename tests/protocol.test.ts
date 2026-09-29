// Seam 1's pure half: the wire encoding and the guards on control messages, without a socket (the rooms themselves are
// tested through wrangler dev in rooms.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeFrame, decodeMove, encodeFrame, encodeMove, readControl } from '../src/lib/net/protocol.ts';

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
