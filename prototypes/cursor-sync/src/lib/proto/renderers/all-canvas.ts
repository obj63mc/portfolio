// Variant C: everything on the one scene canvas. Hover and taps use per-pixel alpha hit regions; the
// HTML lives in a visually hidden list of buttons for keyboards, crawlers and screen readers, with a
// focus ring drawn on the canvas.
import type { Engine, Renderer } from '../engine';
import { drawProp, hitProp, type PropState } from '../props';
import { drawCursors } from './draw-cursors';

export class AllCanvas implements Renderer {
	private list!: HTMLElement;
	private e!: Engine;

	mount(e: Engine) {
		this.e = e;
		this.list = document.createElement('nav');
		this.list.className = 'sr';
		this.list.setAttribute('aria-label', 'Props in this scene');
		const ul = document.createElement('ul');
		for (const p of e.props) {
			const li = document.createElement('li');
			const b = document.createElement('button');
			b.textContent = `${p.def.title}. ${p.def.body}`;
			b.addEventListener('click', () => e.activate(p, false));
			b.addEventListener('focus', () => e.focusProp(p.def.id, true));
			b.addEventListener('blur', () => e.focusProp(null, false));
			li.append(b);
			ul.append(li);
		}
		this.list.append(ul);
		e.root.append(this.list);
		e.root.classList.add('canvas-hit');
	}

	hitTest(wx: number, wy: number): PropState | null {
		const ps = this.e.props;
		let best: PropState | null = null;
		for (const p of ps) if (p.visible && hitProp(p, this.e.sprites, wx, wy) && (!best || p.y + p.h > best.y + best.h)) best = p;
		return best;
	}

	frame(e: Engine) {
		const W = e.worldM, g = e.ctx;
		const vis = e.props.filter((p) => p.visible).sort((a, b) => a.y + a.h - (b.y + b.h));
		for (const p of vis) drawProp(g, p, e.sprites, W);
		const f = e.focused && e.props.find((p) => p.def.id === e.focused);
		if (f) {
			g.setTransform(W[0], W[1], W[2], W[3], W[4], W[5]);
			g.lineWidth = 3 / e.s;
			g.strokeStyle = '#1f5fd1';
			g.strokeRect(f.x - 6, f.y - 6, f.w + 12, f.h + 12);
		}
		drawCursors(g, e);
		e.root.classList.toggle('over-prop', !!e.hover);
	}

	destroy() {
		this.list?.remove();
		this.e?.root.classList.remove('canvas-hit', 'over-prop');
	}
}
