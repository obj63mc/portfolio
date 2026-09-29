// Seam 1: the rooms through their socket contract, against the real Worker and objects under `wrangler dev` (the
// cursor sync prototype's bots script, turned into assertions). The pure encoding is in protocol.test.ts and the Worker's
// refusals in deploy.test.ts. One wrangler dev serves the whole file with a small ceiling, so the tests run in order and
// keep a ledger of the visitors the directory is counting: a bot leaves the ledger only once a peer has seen its `out`,
// which the room sends after reporting the leave.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as sleep } from 'node:timers/promises';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { decodeFrame, encodeMove, type ServerMessage } from '../src/lib/net/protocol.ts';

const MAX = 70;
const root = new URL('..', import.meta.url).pathname;
const persist = mkdtempSync(join(tmpdir(), 'rooms-'));
let base = '';
let dev: ChildProcess;

const freePort = () =>
	new Promise<number>((resolve) => {
		const server = createServer().listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});

before(async () => {
	// The rooms never read the assets, but wrangler wants the directory to exist before a build has made it.
	mkdirSync(join(root, 'build'), { recursive: true });
	const port = await freePort();
	base = `http://127.0.0.1:${port}`;
	dev = spawn(
		process.execPath,
		[
			join(root, 'node_modules/wrangler/bin/wrangler.js'),
			'dev',
			'--ip=127.0.0.1',
			`--port=${port}`,
			`--inspector-port=${await freePort()}`,
			`--persist-to=${persist}`,
			`--var=MAX_VISITORS:${MAX}`,
			'--show-interactive-dev-session=false'
		],
		{ cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: 'ignore' }
	);
	// Up once the Worker answers: a socket request without an Origin is refused by the Worker itself.
	for (const end = Date.now() + 30_000; ; await sleep(200)) {
		const status = await fetch(`${base}/ws/overworld`).then((r) => r.status, () => 0);
		if (status === 403) break;
		assert.ok(Date.now() < end, 'wrangler dev did not start');
	}
});

after(() => {
	for (const bot of ledger) bot.ws.close();
	dev?.kill();
	rmSync(persist, { recursive: true, force: true });
});

type Cursor = { id: number; x: number; y: number };
type Inbound = ServerMessage | { t: 'frame'; bytes: number; cursors: Cursor[] } | { t: 'pong' };
type Of<K extends Inbound['t']> = Extract<Inbound, { t: K }>;
interface Bot {
	ws: WebSocket;
	hello: Of<'hello'>;
	inbox: Inbound[];
	closed: Promise<number>;
	/** The first message of type `t` that `where` accepts, received or within two seconds, taken from the inbox. */
	take<K extends Inbound['t']>(t: K, where?: (m: Of<K>) => boolean): Promise<Of<K>>;
}

/** The visitors the directory is counting, as far as the tests know. */
const ledger = new Set<Bot>();

// Node's WebSocket takes headers, which the DOM type the check loads doesn't know.
const Socket = WebSocket as unknown as new (url: string, init: { headers: Record<string, string> }) => WebSocket;

async function enter(scene: string): Promise<Bot> {
	const ws = new Socket(`${base.replace('http', 'ws')}/ws/${scene}`, { headers: { Origin: base } });
	ws.binaryType = 'arraybuffer';
	const inbox: Inbound[] = [];
	ws.onmessage = ({ data }) => {
		if (data === 'pong') return void inbox.push({ t: 'pong' });
		if (typeof data === 'string') return void inbox.push(JSON.parse(data));
		const cursors: Cursor[] = [];
		decodeFrame(data, (id, x, y) => cursors.push({ id, x, y }));
		inbox.push({ t: 'frame', bytes: data.byteLength, cursors });
	};
	const closed = new Promise<number>((resolve) => (ws.onclose = (e) => resolve(e.code)));
	const take = async <K extends Inbound['t']>(t: K, where: (m: Of<K>) => boolean = () => true) => {
		for (const end = Date.now() + 2000; Date.now() < end; await sleep(5)) {
			const i = inbox.findIndex((m) => m.t === t && where(m as Of<K>));
			if (i >= 0) return inbox.splice(i, 1)[0] as Of<K>;
		}
		throw new Error(`no ${t} for this bot`);
	};
	const bot: Bot = { ws, hello: await take('hello'), inbox, closed, take };
	ledger.add(bot);
	return bot;
}

/** A bot leaves, and a peer still in its room sees it go. */
async function leave(bot: Bot, witness: Bot) {
	bot.ws.close();
	await witness.take('out', (m) => m.id === bot.hello.id);
	ledger.delete(bot);
}

/** The status an upgrade gets: 101, or the Worker's or room's refusal. */
const upgrade = (scene: string, origin = base) =>
	new Promise<number>((resolve, reject) => {
		const headers = {
			Origin: origin,
			Connection: 'Upgrade',
			Upgrade: 'websocket',
			'Sec-WebSocket-Version': '13',
			'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='
		};
		request(`${base}/ws/${scene}`, { headers })
			.on('upgrade', (_res, socket) => (socket.destroy(), resolve(101)))
			.on('response', (res) => (res.resume(), resolve(res.statusCode ?? 0)))
			.on('error', reject)
			.end();
	});

let a: Bot, b: Bot;

test('hello carries the id, the geolocated country, server time, rate, cap, room, peers and the shared-prop slot', async () => {
	a = await enter('overworld?cc=ZZ');
	const { t, id, cc, now, ...rest } = a.hello;
	assert.equal(id, 1);
	assert.match(cc, /^([A-Z]{2}|XX)$/);
	assert.notEqual(cc, 'ZZ', 'the country is never the client’s word');
	assert.ok(Math.abs(now - Date.now()) < 5000, 'server time');
	assert.deepEqual(rest, { rate: 20, cap: 60, room: 'overworld:1', peers: [], screen: null });
});

test('two bots in a room exchange moves, clamped to the scene; a third on another scene lands in a different room', async () => {
	b = await enter('overworld');
	assert.equal(b.hello.room, 'overworld:1');
	assert.deepEqual(b.hello.peers, [{ id: a.hello.id, cc: a.hello.cc, cos: 0, gold: false, river: false, x: -1, y: -1 }]);
	await a.take('in', (m) => m.id === b.hello.id);

	a.ws.send(encodeMove(100, 200));
	const frame = await b.take('frame');
	assert.deepEqual(frame.cursors, [{ id: a.hello.id, x: 100, y: 200 }]);
	assert.equal(frame.bytes, 3 + 6);
	b.ws.send(encodeMove(65535, 65535));
	await a.take('frame', (f) => f.cursors.some((c) => c.id === b.hello.id && c.x === OVERWORLD.w && c.y === OVERWORLD.h));

	const c = await enter('foundry');
	assert.equal(c.hello.room, 'foundry:1');
	assert.deepEqual(c.hello.peers, []);
	a.ws.send(encodeMove(300, 400));
	await b.take('frame', (f) => f.cursors.some((m) => m.x === 300));
	await sleep(100);
	assert.ok(!c.inbox.some((m) => m.t === 'frame' || m.t === 'in'), 'nothing from the overworld room reaches the foundry');
});

test('presence is validated and fanned out when it happens, as its own message', async () => {
	for (const bad of [
		{ t: 'presence', cos: 8, gold: false, river: false },
		{ t: 'presence', cos: 2, gold: 'yes', river: false },
		{ t: 'screen.play', title: 'lorax' },
		{ t: 'presence', cos: 1, gold: false, river: false, pad: 'x'.repeat(256) }
	])
		a.ws.send(JSON.stringify(bad));
	a.ws.send('not json');
	for (let i = 0; i < 2; i++) a.ws.send(JSON.stringify({ t: 'presence', cos: 3, gold: true, river: true }));
	assert.deepEqual(await b.take('presence'), { t: 'presence', id: a.hello.id, cos: 3, gold: true, river: true });
	await sleep(100);
	assert.ok(!b.inbox.some((m) => m.t === 'presence'), 'the invalid updates and the unchanged repeat were dropped');
	assert.ok(!a.inbox.some((m) => m.t === 'presence'), 'a visitor is not echoed its own presence');

	const d = await enter('overworld');
	assert.deepEqual(
		d.hello.peers.find((p) => p.id === a.hello.id),
		{ id: a.hello.id, cc: a.hello.cc, cos: 3, gold: true, river: true, x: 300, y: 400 }
	);
	await leave(d, a);
});

test('changing scene closes one socket and opens another: the old room sees it go, the new room come in', async () => {
	const hop = await enter('overworld');
	await b.take('in', (m) => m.id === hop.hello.id);
	await leave(hop, a);
	const there = await enter('foundry');
	assert.equal(there.hello.room, 'foundry:1');
	assert.equal(there.hello.peers.length, 1, 'with the bot already in the foundry');
	assert.ok(!b.inbox.some((m) => m.t === 'in' && m.id === there.hello.id), 'the overworld never hears of it');
});

test('a socket past its token bucket (twice the rate, four seconds of burst) is closed with 4008', async () => {
	const flood = await enter('brennans');
	const witness = await enter('brennans');
	for (let i = 0; i < 80; i++) flood.ws.send(encodeMove(i, i));
	await sleep(100);
	assert.equal(flood.ws.readyState, WebSocket.OPEN, 'four seconds of moves at once pass');
	for (let i = 0; i < 20; i++) flood.ws.send(encodeMove(i, i));
	assert.equal(await flood.closed, 4008);
	await witness.take('out', (m) => m.id === flood.hello.id);
	ledger.delete(flood);
});

test('placement is fill-first: 60 to a room, the 61st opens scene:2, and a freed seat in scene:1 is filled first', async () => {
	const first = await Promise.all(Array.from({ length: 60 }, () => enter('slu')));
	assert.deepEqual(new Set(first.map((bot) => bot.hello.room)), new Set(['slu:1']));
	assert.equal(new Set(first.map((bot) => bot.hello.id)).size, 60, 'ids are unique in the room');
	const overflow = await enter('slu');
	assert.equal(overflow.hello.room, 'slu:2');
	assert.deepEqual(overflow.hello.peers, []);
	await leave(first[0], first[1]);
	assert.equal((await enter('slu')).hello.room, 'slu:1');
});

test('the ceiling refuses the visitor past MAX_VISITORS, and a leave makes room again', async () => {
	const lobby: Bot[] = [];
	while (ledger.size < MAX) lobby.push(await enter('moosylvania'));
	assert.equal(await upgrade('side-project'), 503);
	await leave(lobby[0], lobby[1]);
	assert.equal((await enter('side-project')).hello.room, 'side-project:1');
});

test('a foreign Origin is refused by the Worker itself', async () => {
	assert.equal(await upgrade('overworld', 'https://evil.example'), 403);
});

/** The objects' source without its comments. */
const code = () => readFileSync(join(root, 'worker/rooms.ts'), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

test('rooms are on the WebSocket Hibernation API, so a still room bills no duration', async () => {
	// Statically: sockets are accepted by the object state and their events come to its handlers. A socket's own accept()
	// and listeners, or a setInterval, would pin the object in memory; the tick is a setTimeout chain that stops when still.
	assert.match(code(), /this\.ctx\.acceptWebSocket\(/);
	assert.doesNotMatch(code(), /\.accept\(\)|addEventListener|setInterval/);
	// At run time: a keepalive ping is answered by the auto-response, which doesn't wake the object. The room's own
	// handler has no pong, so the answer can only come from the runtime.
	a.ws.send('ping');
	await a.take('pong');
});

test('neither object ever touches Durable Object storage', () => {
	// Every path, statically: the objects' source has no way into their storage (SQL, get, put, delete, setAlarm), which
	// the local runtime types in worker/cloudflare.d.ts also leave off the object state, so a call fails the type-check.
	assert.doesNotMatch(code(), /storage|\bsql\b|alarm/i);
	// Every path the tests above took, at run time: each object's local database holds only wrangler's record of the
	// object's name, and no alarm is set. A put or any SQL would add a table, and setAlarm a row.
	const dir = join(persist, 'v3/do');
	const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.sqlite'));
	assert.ok(files.length >= 8, 'the directory and seven rooms');
	for (const file of files) {
		const db = new DatabaseSync(join(dir, file), { readOnly: true });
		const tables = db.prepare("select name from sqlite_master where type = 'table'").all().map((row) => row.name);
		const alarms = tables.includes('_cf_ALARM') ? db.prepare('select * from _cf_ALARM').all() : [];
		assert.deepEqual([tables.filter((t) => t !== '__miniflare_do_name' && t !== '_cf_ALARM'), alarms], [[], []], file);
		db.close();
	}
});
