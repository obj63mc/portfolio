// Seam 2 for the Foundry screen (buildout ticket 17): its reel as a pure function of server time, one test per title's
// length, the homography that maps the reel onto the screen's painted quad, and the poster's clicker taking a seat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accepted, playing, reel, reelMs, onQuad, type Screen } from '../src/lib/net/screen.ts';
import { SCREEN_SURFACE, SEATS, seatOf } from '../src/lib/scenes/foundry.ts';
import { SIT_MS, sitting } from '../src/lib/engine/motion.ts';

const at = 1_790_000_000_000;

test('idle: no reel and nothing playing', () => {
	assert.equal(reel(null, at), null);
	assert.equal(playing(null, at), false);
});

// Each title runs its demo video (ffprobe: Fast Five 58.167 s, Snow White and the Huntsman 35.07 s, The Lorax 36.4 s)
// between 3.2 s of projector and title card and 4.5 s of case study and fade to dark.
for (const [title, video, length] of [
	['fast-five', 58_167, 65_867],
	['snow-white', 35_070, 42_770],
	['lorax', 36_400, 44_100]
] as const) {
	test(`${title}: the projector lights up, the title, ${video / 1000} s of video, the case study, dark after ${length / 1000} s`, () => {
		const s = { title, at };
		assert.equal(reelMs(title), length);
		assert.deepEqual(reel(s, at), { title, level: 0, show: null, video: 0 });
		assert.equal(reel(s, at + 600)?.level, 0.5, 'the beam comes up over 1.2 s');
		assert.deepEqual(reel(s, at + 1200), { title, level: 1, show: 'title', video: 0 });
		assert.deepEqual(reel(s, at + 3200), { title, level: 1, show: 'video', video: 0 });
		assert.deepEqual(reel(s, at + 3200 + 10_000), { title, level: 1, show: 'video', video: 10 });
		assert.equal(reel(s, at + 3200 + video - 1)?.show, 'video');
		assert.deepEqual(reel(s, at + 3200 + video), { title, level: 1, show: 'case', video: video / 1000 });
		assert.equal(reel(s, at + length - 750)?.level, 0.5, 'the fade to dark takes 1.5 s');
		assert.equal(playing(s, at + length - 1), true);
		assert.equal(reel(s, at + length), null);
		assert.equal(playing(s, at + length), false);
	});
}

test('a clock a little behind the server starts the reel from its beginning', () => {
	assert.deepEqual(reel({ title: 'lorax', at }, at - 40), { title: 'lorax', level: 0, show: null, video: 0 });
	assert.equal(playing({ title: 'lorax', at }, at - 40), true);
});

// Ticket 23: `screen_play` counts only the visitor's own click the room took. The room says nothing of who asked (no
// attribution), so it is a new reel of the title asked for, arriving after the ask.
test('accepted: a new reel of the title asked for; not the reel already playing, another title, or no reel', () => {
	const busy: Screen = { title: 'lorax', at };
	assert.ok(accepted(null, { title: 'lorax', at: at + 50 }, 'lorax'), 'idle, then the echo');
	assert.ok(accepted(busy, { title: 'lorax', at: at + 90_000 }, 'lorax'), 'a later reel of the same title');
	assert.ok(!accepted(busy, busy, 'lorax'), 'dropped while it played: the same reel');
	assert.ok(!accepted(null, { title: 'fast-five', at: at + 50 }, 'lorax'), 'another visitor was first');
	assert.ok(!accepted(null, null, 'lorax'), 'nothing yet');
});

test('the reel maps onto the screen quad: corners to corners, and the middle where the diagonals cross', () => {
	const map = onQuad(SCREEN_SURFACE);
	const near = (p: { x: number; y: number }, q: { x: number; y: number }) => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-6, `${JSON.stringify(p)} ≠ ${JSON.stringify(q)}`);
	[
		[0, 0],
		[1, 0],
		[1, 1],
		[0, 1]
	].forEach(([u, v], i) => near(map(u, v), SCREEN_SURFACE[i]));
	// A projective map keeps straight lines straight, so the texture's centre lands where the quad's diagonals meet.
	const [a, b, c, d] = SCREEN_SURFACE;
	const cross = (p: { x: number; y: number }, q: { x: number; y: number }) => p.x * q.y - p.y * q.x;
	const sub = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: p.x - q.x, y: p.y - q.y });
	const t = cross(sub(b, a), sub(d, b)) / cross(sub(c, a), sub(d, b));
	near(map(0.5, 0.5), { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t });
});

// Joe, 2026-09-29: a poster's click seats its clicker in the second row before the reel starts.
test('a seat for each visitor in the room, spread along the row: consecutive ids never share one', () => {
	const ids = Array.from({ length: SEATS.length }, (_, i) => i);
	assert.equal(new Set(ids.map(seatOf)).size, SEATS.length);
	assert.deepEqual(seatOf(SEATS.length + 2), seatOf(2), 'past the last seat the row starts again');
});

test('sitting: the own cursor glides to its seat over SIT_MS, easing in and out, and is there at once under reduced motion', () => {
	const from = { x: 100, y: 100 }, to = { x: 300, y: 500 };
	assert.deepEqual(sitting(from, to, 0, false), from);
	assert.deepEqual(sitting(from, to, SIT_MS / 2, false), { x: 200, y: 300 });
	assert.ok(sitting(from, to, SIT_MS / 4, false).x - from.x < (to.x - from.x) / 4, 'a slow start');
	assert.deepEqual(sitting(from, to, SIT_MS, false), to);
	assert.deepEqual(sitting(from, to, 5 * SIT_MS, false), to);
	assert.deepEqual(sitting(from, to, 0, true), to);
});
