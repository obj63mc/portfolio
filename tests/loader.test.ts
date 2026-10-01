// Seam 2: the engine's image loader (src/lib/engine/loader.ts) with stand-ins for the network and the decoder: what is in
// view is fetched at once, what is round it in its turn, what a door leads to last, and a tile left behind is called off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Loader, type Fetching } from '../src/lib/engine/loader.ts';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES, doorsOf } from '../src/lib/scenes/index.ts';

interface Call {
	url: string;
	priority: string;
	signal?: AbortSignal;
	/** Answers the fetch: found, or not. */
	answer(ok?: boolean): void;
	fail(): void;
}

/**
 * A loader over a network that answers when told to, and a decoder that counts what it decodes and what is closed,
 * holding each image until `decoding` settles when it is given.
 */
function harness(saveData = false, decoding?: Promise<void>) {
	const calls: Call[] = [], decoded: string[] = [], closed: string[] = [];
	const io: Fetching = {
		fetch: (url, init) =>
			new Promise((resolve, reject) => {
				const blob = () => Promise.resolve(new Blob([url]));
				calls.push({ url, priority: init.priority, signal: init.signal, answer: (ok = true) => resolve({ ok, blob }), fail: () => reject(new Error('offline')) });
				init.signal?.addEventListener('abort', () => reject(init.signal!.reason));
			}),
		decode: async (blob) => {
			const url = await blob.text();
			decoded.push(url);
			await decoding;
			return { width: 1, height: 1, close: () => void closed.push(url) };
		},
		saveData: () => saveData
	};
	return { loader: new Loader(io), calls, decoded, closed, asked: () => calls.map((c) => c.url) };
}

/** Lets every promise settled so far run its reactions. */
const settle = () => new Promise((done) => setImmediate(done));
/** How a loading ended: its image arrived, or it was refused. */
const outcome = (bmp: Promise<ImageBitmap>) => bmp.then(() => 'arrived', () => 'refused');

test('what is in view is fetched at once at high priority; what is round it waits until none of it is still coming, then goes four at a time, in order', async () => {
	const { loader, calls, asked } = harness();
	const ring = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((u) => loader.image(u, 'soon'));
	await settle();
	assert.deepEqual(asked(), ['r1', 'r2', 'r3', 'r4'], 'with nothing in view coming, the ring starts, four at a time');
	const view = [loader.image('v1', 'now'), loader.image('v2', 'now')];
	assert.deepEqual(asked().slice(4), ['v1', 'v2'], 'the view never waits');
	assert.deepEqual(calls.map((c) => c.priority), ['low', 'low', 'low', 'low', 'high', 'high']);
	calls[0].answer();
	await settle();
	assert.equal(calls.length, 6, 'a ring tile done, the next still waits behind the view');
	calls[4].answer();
	await settle();
	assert.equal(calls.length, 6, 'and behind the last of the view');
	calls[5].answer();
	await settle();
	assert.deepEqual(asked().slice(6), ['r5'], 'the view in, the ring carries on, still four at a time');
	for (const c of calls.slice(1, 4)) c.answer();
	await settle();
	assert.deepEqual(asked().slice(6), ['r5', 'r6']);
	for (const c of calls.slice(6)) c.answer();
	assert.deepEqual(await Promise.all([...ring, ...view].map((l) => outcome(l.bmp))), Array(8).fill('arrived'));
});

test('a scene that asks for its cut-outs and then its view in one go has the view fetched first', async () => {
	const { loader, calls, asked } = harness();
	loader.image('cut-out', 'soon');
	loader.image('tile', 'now');
	await settle();
	assert.deepEqual(asked(), ['tile']);
	calls[0].answer();
	await settle();
	assert.deepEqual(asked(), ['tile', 'cut-out']);
});

test('a waiting image that comes into view is fetched at once; one already on its way is left alone', async () => {
	const { loader, calls, asked } = harness();
	loader.image('v', 'now');
	const a = loader.image('a', 'soon'), b = loader.image('b', 'soon');
	b.hurry();
	assert.deepEqual(asked(), ['v', 'b']);
	assert.equal(calls[1].priority, 'high');
	b.hurry();
	assert.equal(calls.length, 2, 'not asked for twice');
	calls[0].answer();
	calls[1].answer();
	await settle();
	assert.deepEqual(asked(), ['v', 'b', 'a'], 'the rest in their turn');
	a.hurry();
	assert.equal(calls.length, 3);
});

test('a waiting cut-out that comes into view goes first in line, behind the view\'s tiles and never ahead of them', async () => {
	const { loader, calls, asked } = harness();
	loader.image('tile', 'now');
	const cuts = ['a', 'b', 'c', 'd', 'e', 'f'].map((u) => loader.image(u, 'soon'));
	cuts[5].first();
	cuts[4].first();
	await settle();
	assert.deepEqual(asked(), ['tile'], 'the tile alone while it is coming');
	calls[0].answer();
	await settle();
	assert.deepEqual(asked(), ['tile', 'e', 'f', 'a', 'b'], 'then the ones in view, and the rest in order');
	assert.deepEqual(calls.slice(1).map((c) => c.priority), ['high', 'high', 'low', 'low'], 'what is in view is asked for ahead of the rest');
	cuts[4].first();
	assert.equal(calls.length, 5, 'one on its way is left alone');
});

test('an image no longer wanted is never fetched if it was waiting, its fetch is called off if it was coming, and it is closed if it was decoding', async () => {
	const { loader, calls, decoded, closed } = harness();
	const view = loader.image('v', 'now'), waiting = loader.image('w', 'soon'), coming = loader.image('c', 'now');
	waiting.cancel();
	coming.cancel();
	assert.equal(calls[1].signal?.aborted, true, 'the fetch itself is called off');
	assert.deepEqual(await Promise.all([outcome(waiting.bmp), outcome(coming.bmp)]), ['refused', 'refused']);
	// Called off between its last byte and its decoding: it is not decoded at all.
	const late = loader.image('l', 'now');
	calls[2].answer();
	late.cancel();
	assert.equal(await outcome(late.bmp), 'refused');
	calls[0].answer();
	assert.equal(await outcome(view.bmp), 'arrived');
	await settle();
	assert.deepEqual(calls.map((c) => c.url), ['v', 'c', 'l'], 'the waiting one was never asked for');
	assert.deepEqual(decoded, ['v']);
	assert.deepEqual(closed, []);
	view.cancel(); // done already: nothing to call off
	// Called off while it is decoding: its bitmap is closed, never handed over.
	let finish!: () => void;
	const slow = harness(false, new Promise((done) => (finish = done)));
	const tile = slow.loader.image('t', 'now');
	slow.calls[0].answer();
	await settle();
	assert.deepEqual(slow.decoded, ['t']);
	tile.cancel();
	finish();
	assert.equal(await outcome(tile.bmp), 'refused');
	assert.deepEqual(slow.closed, ['t']);
});

test('an image that is not found, or whose fetch fails, is refused and lets the next go', async () => {
	const { loader, calls, asked } = harness();
	const missing = loader.image('missing', 'now'), offline = loader.image('offline', 'now');
	loader.image('next', 'soon');
	calls[0].answer(false);
	calls[1].fail();
	assert.deepEqual(await Promise.all([outcome(missing.bmp), outcome(offline.bmp)]), ['refused', 'refused']);
	await settle();
	assert.deepEqual(asked(), ['missing', 'offline', 'next']);
});

test('what a door leads to is fetched last, two at a time at low priority, never decoded, and never what the session has asked for already', async () => {
	const { loader, calls, decoded, asked } = harness();
	loader.image('tile', 'now');
	loader.image('ring', 'soon');
	loader.warm(['tile', 'a', 'b', 'c']);
	await settle();
	assert.deepEqual(asked(), ['tile'], 'nothing ahead while the view is coming');
	calls[0].answer();
	await settle();
	assert.deepEqual(asked(), ['tile', 'ring'], 'nor while the ring is');
	calls[1].answer();
	await settle();
	assert.deepEqual(asked(), ['tile', 'ring', 'a', 'b'], 'then two at a time, and not the tile again');
	assert.deepEqual(calls.slice(2).map((c) => c.priority), ['low', 'low']);
	// The view asks for more: it goes at once, and the next one ahead waits for it.
	loader.image('tile-2', 'now');
	calls[2].answer();
	await settle();
	assert.deepEqual(asked().slice(4), ['tile-2']);
	calls[4].answer();
	await settle();
	assert.deepEqual(asked().slice(5), ['c']);
	loader.warm(['a', 'b', 'c']);
	calls[3].answer();
	calls[5].answer();
	await settle();
	assert.equal(calls.length, 6, 'asked for once');
	assert.deepEqual(decoded, ['tile', 'ring', 'tile-2'], 'fetched into the cache, not decoded');
});

test('a tile called off before it arrived is still fetched ahead of the hop back to it, and one the hop asked for first is not fetched ahead as well', async () => {
	const { loader, calls, asked } = harness();
	// The overworld's ring, called off by the hop into a venue, whose exit leads back to it.
	const ring = loader.image('ring', 'soon'), coming = loader.image('coming', 'now');
	ring.cancel();
	coming.cancel();
	assert.deepEqual(await Promise.all([outcome(ring.bmp), outcome(coming.bmp)]), ['refused', 'refused']);
	loader.warm(['ring', 'coming', 'ring']);
	await settle();
	assert.deepEqual(asked(), ['coming', 'ring', 'coming'], 'each once');
	// A door's scene asked for ahead, and the hop taken before its turn came.
	const hop = harness();
	void hop.loader.image('here', 'now').bmp.then((b) => b.close());
	hop.loader.warm(['there']);
	await settle();
	void hop.loader.image('there', 'now').bmp.then((b) => b.close());
	hop.calls[0].answer();
	hop.calls[1].answer();
	await settle();
	assert.deepEqual(hop.asked(), ['here', 'there']);
});

test('one that failed ahead is asked for again by the next door, and a visitor saving data has nothing fetched ahead', async () => {
	const { loader, calls, asked } = harness();
	loader.warm(['a']);
	await settle();
	calls[0].fail();
	await settle();
	loader.warm(['a']);
	await settle();
	assert.deepEqual(asked(), ['a', 'a']);
	const saving = harness(true);
	saving.loader.warm(['a', 'b']);
	await settle();
	assert.deepEqual(saving.asked(), []);
	saving.loader.image('tile', 'now');
	assert.deepEqual(saving.asked(), ['tile'], 'what they are looking at is still fetched');
});

test('doors: the overworld has one to each sub-scene, inside the world, and a sub-scene has its exit, back to the overworld', () => {
	const doors = doorsOf(OVERWORLD);
	assert.deepEqual(doors.map((d) => d.to.id).sort(), Object.keys(SUB_SCENES).sort());
	for (const { to, at } of doors) assert.ok(at.x >= 0 && at.y >= 0 && at.x + at.w <= OVERWORLD.w && at.y + at.h <= OVERWORLD.h, to.id);
	// The Foundry's door is its cinema, not the whole hall.
	const foundry = OVERWORLD.districts.flatMap((d) => d.venues).find((v) => v.id === 'foundry')!;
	assert.deepEqual(doors.find((d) => d.to.id === 'foundry')!.at, foundry.doorRect);
	for (const s of Object.values(SUB_SCENES)) assert.deepEqual(doorsOf(s), [{ to: OVERWORLD, at: s.exit }], s.id);
});
