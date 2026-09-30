// Dev only, with `?course` in the URL: the lap timer's course drawn over the lake loop, to judge how far a cursor may
// stray. The band is exactly where track.ts counts a cursor on the course: every point within a segment's limit of that
// segment, each segment's reach a capsule, all of them filled at once as one shape (their windings agree, so the
// nonzero fill is their union and overlaps don't darken). The chevrons point the way the loop runs, anticlockwise on
// screen from the start line.
import { CORRIDOR, LOOP, TURN, along } from './track.ts';

/** The course in world px, on a context already carrying the camera's transform. */
export function drawCourse(g: CanvasRenderingContext2D) {
	const { path, half, length, limit: reach } = LOOP, limit = half + CORRIDOR, start = along(LOOP, 0);
	g.save();
	g.lineJoin = g.lineCap = 'round';
	g.beginPath();
	path.forEach((a, i) => {
		const b = path[(i + 1) % path.length], r = reach[i], len = Math.hypot(b.x - a.x, b.y - a.y);
		const nx = (-(b.y - a.y) / len) * r, ny = ((b.x - a.x) / len) * r;
		// Clockwise on screen, as the arcs are.
		g.moveTo(a.x - nx, a.y - ny);
		g.lineTo(b.x - nx, b.y - ny);
		g.lineTo(b.x + nx, b.y + ny);
		g.lineTo(a.x + nx, a.y + ny);
		g.closePath();
		g.moveTo(a.x + r, a.y);
		g.arc(a.x, a.y, r, 0, 2 * Math.PI);
	});
	g.fillStyle = 'rgb(223 117 84 / 0.4)';
	g.fill('nonzero');
	g.beginPath();
	for (const p of path) g.lineTo(p.x, p.y);
	g.closePath();
	g.strokeStyle = 'rgb(36 79 85 / 0.9)';
	g.lineWidth = 2;
	g.setLineDash([12, 10]);
	g.stroke();
	g.setLineDash([]);
	g.strokeStyle = '#244f55';
	g.lineWidth = 5;
	for (let s = 150; s < length; s += 300) {
		const a = along(LOOP, s);
		g.save();
		g.translate(a.x, a.y);
		g.rotate(Math.atan2(a.dy, a.dx));
		g.beginPath();
		g.moveTo(-10, -12);
		g.lineTo(6, 0);
		g.lineTo(-10, 12);
		g.stroke();
		g.restore();
	}
	// The start line across the whole band, and what the band is.
	g.lineWidth = 4;
	g.beginPath();
	g.moveTo(start.x - start.dy * limit, start.y + start.dx * limit);
	g.lineTo(start.x + start.dy * limit, start.y - start.dx * limit);
	g.stroke();
	g.font = 'bold 20px system-ui, sans-serif';
	g.fillStyle = '#244f55';
	g.fillText(
		`on course: within ${limit} px of the centreline (half ${half} + CORRIDOR ${CORRIDOR}), ${half + TURN} in the turns (TURN ${TURN})`,
		start.x - 420,
		start.y + limit + 28
	);
	g.restore();
}
