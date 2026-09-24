// PROTOTYPE (ticket 22): stand-in Mississippi between Midtown and Belleville. The real water mask and
// bridge cut-out come from the art pass (ticket 18); here the river is a strip running the full height
// of the overworld, with one bridge deck across it and the Arch on the west bank.
//
// A cursor is "in the river" once it moves onto the water from a bank or off the end of the deck. In the
// river it drifts south, the camera follows through the push band as usual, and the bridge is drawn
// over it (it passes underneath). It leaves the river by steering onto either bank. Only reaching the
// river's south end puts it back at the Arch. On the deck and not in the river, the cursor crosses on top.
export const RIVER = { x: 3980, w: 220, h: 2700, bridge: { x: 3950, y: 1016, w: 280, h: 70 }, arch: { x: 3905, y: 1625 } };
// bridge and arch line up with the road crossing and the Arch already painted in the placeholder art

const onDeck = (x: number, y: number) => {
	const b = RIVER.bridge;
	return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
};

/** Next in-the-river state: the water strip, entered anywhere but the deck, kept while under it. */
export function riverStep(x: number, y: number, was: boolean) {
	if (x < RIVER.x || x > RIVER.x + RIVER.w || y < 0 || y > RIVER.h) return false;
	return was || !onDeck(x, y);
}

/** At the south end: the only place the current washes a visitor out. */
export const atRiverEnd = (y: number) => y >= RIVER.h - 24;

export { onDeck };

type Cam = { x: number; y: number };

export function drawRiver(g: CanvasRenderingContext2D, k: number, cam: Cam) {
	const X = (x: number) => (x - cam.x) * k, Y = (y: number) => (y - cam.y) * k;
	g.fillStyle = 'rgb(58 118 176 / 0.85)';
	g.fillRect(X(RIVER.x), Y(0), RIVER.w * k, RIVER.h * k);
	g.strokeStyle = 'rgb(255 255 255 / 0.35)';
	g.lineWidth = 2 * k;
	for (let y = 40; y < RIVER.h; y += 120)
		for (const dx of [40, 130]) { g.beginPath(); g.moveTo(X(RIVER.x + dx), Y(y)); g.lineTo(X(RIVER.x + dx + 30), Y(y + 18)); g.stroke(); }
	drawBridge(g, k, cam);
	g.fillStyle = '#fff';
	g.font = `600 ${14 * k}px system-ui, sans-serif`;
	g.fillText('stand-in Mississippi', X(RIVER.x + 10), Y(RIVER.bridge.y - 24));
	g.fillText('river end: back to the Arch', X(RIVER.x + 10), Y(RIVER.h - 40));
}

export function drawBridge(g: CanvasRenderingContext2D, k: number, cam: Cam) {
	const b = RIVER.bridge, X = (x: number) => (x - cam.x) * k, Y = (y: number) => (y - cam.y) * k;
	g.fillStyle = '#8a7a66';
	g.fillRect(X(b.x), Y(b.y), b.w * k, b.h * k);
	g.fillStyle = '#6d5f4f';
	g.fillRect(X(b.x), Y(b.y), b.w * k, 10 * k);
	g.fillRect(X(b.x), Y(b.y + b.h - 10), b.w * k, 10 * k);
}
