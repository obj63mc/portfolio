// Variant B: props drawn in the canvas loop; each prop also has a transparent <button> in a DOM layer
// that moves with the camera (one transform per frame), so hit testing, focus, keyboard and screen
// readers stay native. Cursors are drawn on an overlay canvas.
import type { Engine, Renderer } from '../engine';
import { drawProp } from '../props';
import { drawCursors } from './draw-cursors';

export class CanvasProps implements Renderer {
	private layer!: HTMLDivElement;
	private overlay!: HTMLCanvasElement;
	private og!: CanvasRenderingContext2D;
	private btns = new Map<string, HTMLButtonElement>();
	private last = new Map<string, string>();

	mount(e: Engine) {
		this.layer = document.createElement('div');
		this.layer.className = 'world hit-layer';
		for (const p of e.props) {
			const b = document.createElement('button');
			b.className = 'hit';
			b.dataset.prop = p.def.id;
			b.innerHTML = `<span class="sr">${p.def.title}. ${p.def.body}</span>`;
			b.style.width = p.w + 'px';
			b.style.height = p.h + 'px';
			b.style.zIndex = String(Math.round(p.y + p.h));
			b.style.transform = `translate(${p.x}px,${p.y}px)`;
			b.addEventListener('click', (ev) => e.onPropClick(p.def.id, ev));
			b.addEventListener('focus', () => e.focusProp(p.def.id, b.matches(':focus-visible')));
			b.addEventListener('blur', () => e.focusProp(null, false));
			this.btns.set(p.def.id, b);
			this.layer.append(b);
		}
		this.layer.addEventListener('pointerover', (ev) => {
			if (ev.pointerType !== 'touch') e.domHover = (ev.target as HTMLElement).closest<HTMLElement>('[data-prop]')?.dataset.prop ?? null;
		});
		this.layer.addEventListener('pointerout', (ev) => {
			if (!(ev.relatedTarget as HTMLElement | null)?.closest?.('[data-prop]')) e.domHover = null;
		});
		this.overlay = document.createElement('canvas');
		this.overlay.className = 'cursor-canvas';
		this.overlay.width = e.canvas.width;
		this.overlay.height = e.canvas.height;
		this.overlay.style.width = e.vw + 'px';
		this.overlay.style.height = e.vh + 'px';
		this.og = this.overlay.getContext('2d')!;
		e.root.append(this.layer, this.overlay);
	}

	frame(e: Engine) {
		const W = e.worldM, g = e.ctx;
		const vis = e.props.filter((p) => p.visible).sort((a, b) => a.y + a.h - (b.y + b.h));
		for (const p of vis) drawProp(g, p, e.sprites, W);
		const s = e.s;
		this.layer.style.transform = `translate3d(${-e.cam.x * s}px,${-e.cam.y * s}px,0) scale(${s})`;
		for (const p of e.props) {
			if (p.def.motion !== 'rider') continue; // only moving props need their hit box moved
			const t = `translate(${p.x}px,${p.y}px)`;
			if (this.last.get(p.def.id) !== t) { this.btns.get(p.def.id)!.style.transform = t; this.last.set(p.def.id, t); }
		}
		this.og.setTransform(1, 0, 0, 1, 0, 0);
		this.og.clearRect(0, 0, this.overlay.width, this.overlay.height);
		drawCursors(this.og, e);
	}

	destroy() {
		this.layer?.remove();
		this.overlay?.remove();
		this.btns.clear();
		this.last.clear();
	}
}
