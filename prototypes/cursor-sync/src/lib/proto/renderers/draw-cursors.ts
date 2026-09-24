// Canvas cursor drawing shared by variants B (overlay canvas) and C (scene canvas).
// PROTOTYPE (ticket 15): the own cursor has letter-keyed treatments that combine (?own=BE):
//   A baseline (ticket 11: halo + "you" tag that fades), B bigger own cursor (?ownk=, world px, own
//   screen only), C beacon ring with a sonar ping, D peers recede (smaller and faded on your screen),
//   E a persistent "you" marker above the tip. Nothing here touches the wire: peers see you at 32 px.
//   Verdict: BD with ?ownk=1.25&peerk=0.75 and peers at full opacity (the default below).
import type { Engine } from '../engine';
import { ATLAS, CELL, TIP } from '../sprites';
import { drawBridge, onDeck } from '../river';

const BLUE = '#1f5fd1';

export function drawCursors(g: CanvasRenderingContext2D, e: Engine) {
	const atlas = e.sprites.atlas, z = atlas.height; // cell edge in atlas px
	const k = e.s * e.dpr;
	const fx = e.settings.own, rm = e.settings.rm;
	g.setTransform(1, 0, 0, 1, 0, 0);
	const one = (x: number, y: number, flag: number, cos: number, gold: boolean, own: boolean, sc: number) => {
		// scale about the arrow tip so the hotspot stays on the same world point
		const size = CELL * k * sc, dx = (x - e.cam.x - TIP * sc) * k, dy = (y - e.cam.y - TIP * sc) * k;
		if (own) g.drawImage(atlas, ATLAS.halo * z, 0, z, z, dx, dy, size, size);
		g.drawImage(atlas, (gold ? ATLAS.gold : ATLAS.body) * z, 0, z, z, dx, dy, size, size);
		if (cos >= 0) g.drawImage(atlas, (ATLAS.cos + cos) * z, 0, z, z, dx, dy, size, size);
		g.drawImage(atlas, (ATLAS.flag + flag) * z, 0, z, z, dx, dy, size, size);
	};

	const psc = fx.includes('D') ? e.settings.peerk : 1;
	// ticket 22: in the river, your cursor passes under the bridge. Peers on the deck stay on top; a
	// peer's own river state is not on the wire, so a peer swimming under the bridge is drawn over it here.
	const under = e.inRiver;
	const later: typeof e.peers.drawn = [];
	for (const p of e.peers.drawn) {
		if (under && onDeck(p.x, p.y)) later.push(p);
		else one(p.x, p.y, p.flag, p.cos, p.gold, false, psc);
	}
	const bridge = () => {
		if (!under) return;
		drawBridge(g, k, e.cam);
		g.setTransform(1, 0, 0, 1, 0, 0);
		for (const p of later) one(p.x, p.y, p.flag, p.cos, p.gold, false, psc);
	};

	if (!e.showOwn) return; // ticket 22: no own cursor before the first Join
	const o = e.own, osc = fx.includes('B') ? e.settings.ownk : 1;
	const sx = (o.x - e.cam.x) * k, sy = (o.y - e.cam.y) * k; // tip, device px
	if (fx.includes('C')) {
		// ring centred on the arrow body, plus a ping every 2 s (static under reduced motion)
		const cx = sx + 12 * k * osc, cy = sy + 19 * k * osc, r0 = 24 * k * osc;
		g.lineWidth = 3 * e.dpr;
		g.strokeStyle = BLUE;
		g.globalAlpha = 0.9;
		g.beginPath(); g.arc(cx, cy, r0, 0, 7); g.stroke();
		if (!rm) {
			const u = (e.t % 2) / 1.2;
			if (u < 1) {
				g.globalAlpha = 0.7 * (1 - u);
				g.lineWidth = 2.5 * e.dpr;
				g.beginPath(); g.arc(cx, cy, r0 + u * 40 * e.dpr, 0, 7); g.stroke();
			}
		}
		g.globalAlpha = 1;
	}
	one(o.x, o.y, e.net.flag, o.cosmetic, o.gold, true, osc);
	bridge();

	if (fx.includes('E')) {
		// persistent pill above the tip, in CSS px so it reads the same at every render scale
		const d = e.dpr, w = 30 * d, h = 16 * d, px = sx - w / 2, py = sy - h - 12 * d;
		g.fillStyle = BLUE;
		g.beginPath(); g.roundRect(px, py, w, h, 8 * d); g.fill();
		g.beginPath(); g.moveTo(sx - 5 * d, py + h); g.lineTo(sx + 5 * d, py + h); g.lineTo(sx, py + h + 6 * d); g.fill();
		g.font = `700 ${11 * d}px system-ui, sans-serif`;
		g.textAlign = 'center'; g.textBaseline = 'middle';
		g.fillStyle = '#fff';
		g.fillText('you', sx, py + h / 2 + 0.5 * d);
		g.textAlign = 'start'; g.textBaseline = 'alphabetic';
		return; // the pill replaces the fading tag
	}
	const left = o.youUntil - e.t;
	if (left > 0) {
		g.globalAlpha = Math.min(1, left);
		g.font = `600 ${12 * e.dpr}px system-ui, sans-serif`;
		g.fillStyle = BLUE;
		g.fillText('you', sx + 22 * e.dpr * osc, sy + 4 * e.dpr);
		g.globalAlpha = 1;
	}
}
