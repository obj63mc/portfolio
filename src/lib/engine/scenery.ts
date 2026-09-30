// Scenery over the cursors (buildout ticket 19): foreground scenery, drawn over every cursor, the visitor's own included,
// and walk-behind scenery, drawn over the cursors behind it (walk.ts decides who is); on the overworld, the bridges, drawn
// over the cursors in the river (ticket 20: river.ts decides who is). All of it is painted into the tiles
// already; their keyed cut-outs are loaded here for the overlay canvas, which draws them over a cursor's own pixels only
// (cursors.ts), so a static copy never covers the scene canvas's props, their reactions or another cursor.
import type { Overworld, Point, Rect, SubScene } from '../scenes/types';
import type { Side } from '../scenes/walk.ts';
import { cutout } from './props.ts';

/** A cut-out to draw over a cursor, in device px; walk-behind scenery says where it stands, back to front (`at`). */
export interface Cover {
	key: string;
	bmp: ImageBitmap;
	x: number;
	y: number;
	w: number;
	h: number;
	at?: number;
}

/** A cut-out and its world rect; no bitmap until it has arrived, and none for one that failed. */
interface Piece {
	key: string;
	rect: Rect;
	bmp?: ImageBitmap;
}

export class Scenery {
	/** Foreground scenery, over every cursor. */
	private fore: Piece[] = [];
	/** Walk-behind scenery, back to front, the order it is drawn in. */
	private units: Piece[] = [];
	/** The overworld's bridges; none in a sub-scene. */
	private bridges: Piece[] = [];
	/** Bumped on each scene, so a cut-out arriving for the last one is dropped. */
	private generation = 0;

	/** A new scene's scenery, its cut-outs loading at `density` image px per world px. */
	show(scene: Overworld | SubScene, density: number) {
		this.clear();
		const gen = ++this.generation;
		const load = ({ key, rect }: { key: string; rect: Rect }): Piece[] => {
			const c = cutout(scene.id, key, rect, density);
			if (!c) return [];
			const piece: Piece = { key, rect: c.rect };
			c.bmp.then((bmp) => (gen === this.generation ? (piece.bmp = bmp) : bmp.close())).catch(() => {}); // a failed cut-out covers nothing
			return [piece];
		};
		this.fore = scene.foreground.flatMap(load);
		this.units = ('walkBehind' in scene ? scene.walkBehind : []).flatMap(load);
		this.bridges = 'river' in scene ? scene.river.bridges.flatMap(load) : [];
	}

	/** Foreground scenery through the camera at `cam`, `k` device px per world px. */
	foreground(cam: Point, k: number): Cover[] {
		return this.fore.flatMap((p) => cover(p, cam, k));
	}

	/** The walk-behind scenery a cursor with `sides` is behind, back to front, through the camera. */
	behind(sides: ReadonlyMap<string, Side>, cam: Point, k: number): Cover[] {
		return sides.size ? this.units.flatMap((p, at) => (sides.get(p.key) === 'behind' ? cover(p, cam, k).map((c) => ({ ...c, at })) : [])) : [];
	}

	/**
	 * The bridges over a cursor in the river, through the camera: behind everything else, so a cursor under one is drawn
	 * before every cursor crossing it.
	 */
	bridge(cam: Point, k: number): Cover[] {
		return this.bridges.flatMap((p) => cover(p, cam, k).map((c) => ({ ...c, at: -1 })));
	}

	destroy() {
		this.clear();
	}

	private clear() {
		this.generation++;
		for (const p of [...this.fore, ...this.units, ...this.bridges]) p.bmp?.close();
		this.fore = [];
		this.units = [];
		this.bridges = [];
	}
}

const cover = ({ key, rect: r, bmp }: Piece, cam: Point, k: number): Cover[] =>
	bmp ? [{ key, bmp, x: (r.x - cam.x) * k, y: (r.y - cam.y) * k, w: r.w * k, h: r.h * k }] : [];
