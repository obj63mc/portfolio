// Canvas cursor drawing shared by variants B (overlay canvas) and C (scene canvas).
import type { Engine } from '../engine';
import { ATLAS, CELL, TIP } from '../sprites';

export function drawCursors(g: CanvasRenderingContext2D, e: Engine) {
	const atlas = e.sprites.atlas, z = atlas.height; // cell edge in atlas px
	const k = e.s * e.dpr, size = CELL * k;
	g.setTransform(1, 0, 0, 1, 0, 0);
	const one = (x: number, y: number, flag: number, cos: number, gold: boolean, own: boolean) => {
		const dx = (x - e.cam.x - TIP) * k, dy = (y - e.cam.y - TIP) * k;
		if (own) g.drawImage(atlas, ATLAS.halo * z, 0, z, z, dx, dy, size, size);
		g.drawImage(atlas, (gold ? ATLAS.gold : ATLAS.body) * z, 0, z, z, dx, dy, size, size);
		if (cos >= 0) g.drawImage(atlas, (ATLAS.cos + cos) * z, 0, z, z, dx, dy, size, size);
		g.drawImage(atlas, (ATLAS.flag + flag) * z, 0, z, z, dx, dy, size, size);
	};
	for (const p of e.peers.drawn) one(p.x, p.y, p.flag, p.cos, p.gold, false);
	const o = e.own;
	one(o.x, o.y, e.net.flag, o.cosmetic, o.gold, true);
	const left = o.youUntil - e.t;
	if (left > 0) {
		g.globalAlpha = Math.min(1, left);
		g.font = `600 ${12 * e.dpr}px system-ui, sans-serif`;
		g.fillStyle = '#1f5fd1';
		g.fillText('you', (o.x - e.cam.x) * k + 22 * e.dpr, (o.y - e.cam.y) * k + 4 * e.dpr);
		g.globalAlpha = 1;
	}
}
