// Seam 2 for the Foundry screen (buildout ticket 17): its reel as a pure function of server time, one test per title's
// length, and the homography that maps the reel onto the screen's painted quad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playing, reel, reelMs, onQuad } from '../src/lib/net/screen.ts';
import { SCREEN_SURFACE } from '../src/lib/scenes/foundry.ts';

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
