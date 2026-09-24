// Variant A: the canvas holds only the background. Every prop is a <button> of <img> layers in a DOM
// world layer that moves with the camera; moving parts get a CSS matrix written per frame. Cursors are
// DOM elements painted from the atlas.
import type { Engine, Renderer } from '../engine';
import { BULBS, EYE, bulbOn, bulbPos, type PropState } from '../props';
import { MOOSE } from '../scenes';
import { ATLAS, CELL, RIDER, TIP, spriteKey } from '../sprites';
import { css } from '../math';

interface PropEl { btn: HTMLButtonElement; parts: HTMLElement[]; bulbs: HTMLElement[]; eye?: HTMLElement; sheet?: HTMLElement; tf: string; phase: number; frame: number; eyeS: number; hover: boolean }
interface CurEl { root: HTMLElement; body: HTMLElement; cos: HTMLElement; flag: HTMLElement; state: string }

export class DomProps implements Renderer {
	private world!: HTMLDivElement;
	private curs!: HTMLDivElement;
	private els = new Map<PropState, PropEl>();
	private pool: CurEl[] = [];
	private own!: CurEl & { you: HTMLElement };

	mount(e: Engine) {
		const sp = e.sprites;
		this.world = div('world prop-layer');
		for (const p of e.props) {
			const btn = document.createElement('button');
			btn.className = 'prop';
			btn.dataset.prop = p.def.id;
			btn.style.width = p.w + 'px';
			btn.style.height = p.h + 'px';
			btn.style.zIndex = String(Math.round(p.y + p.h));
			btn.innerHTML = `<span class="spot"></span><span class="sr">${p.def.title}. ${p.def.body}</span>`;
			const pe: PropEl = { btn, parts: [], bulbs: [], tf: '', phase: -2, frame: -1, eyeS: -1, hover: false };
			const m = p.def.motion;
			if (m === 'moose') {
				for (const part of MOOSE.parts) {
					const img = image(sp.moose.get(part.key)!.url, part.w, part.h);
					pe.parts.push(img);
					btn.append(img);
				}
			} else if (m === 'rider' || m === 'bike') {
				const sh = div('sheet');
				sh.style.backgroundImage = `url(${sp.riderUrl})`;
				sh.style.backgroundSize = `${RIDER.frames * 100}% 100%`;
				pe.sheet = sh;
				btn.append(sh);
			} else {
				btn.append(image(sp.props.get(spriteKey(p.def))!.url, p.w, p.h));
				if (m === 'marquee')
					for (let i = 0; i < BULBS; i++) {
						const b = div('bulb');
						const [x, y] = bulbPos(p, i);
						b.style.transform = `translate(${x - 3.5}px,${y - 3.5}px)`;
						pe.bulbs.push(b);
						btn.append(b);
					}
				if (m === 'blink') {
					pe.eye = image(sp.moose.get('moose-eye')!.url, EYE.w, EYE.h);
					pe.eye.style.left = EYE.x * p.w - EYE.w / 2 + 'px';
					pe.eye.style.top = EYE.y * p.h - EYE.h / 2 + 'px';
					pe.eye.style.transformOrigin = '50% 50%';
					btn.append(pe.eye);
				}
			}
			btn.addEventListener('click', (ev) => e.onPropClick(p.def.id, ev));
			btn.addEventListener('focus', () => e.focusProp(p.def.id, btn.matches(':focus-visible')));
			btn.addEventListener('blur', () => e.focusProp(null, false));
			this.els.set(p, pe);
			this.world.append(btn);
		}
		this.world.addEventListener('pointerover', (ev) => {
			if (ev.pointerType !== 'touch') e.domHover = (ev.target as HTMLElement).closest<HTMLElement>('[data-prop]')?.dataset.prop ?? null;
		});
		this.world.addEventListener('pointerout', (ev) => {
			if (!(ev.relatedTarget as HTMLElement | null)?.closest?.('[data-prop]')) e.domHover = null;
		});
		this.curs = div('cursor-layer');
		const own = this.cursor(e);
		own.root.prepend(cell(e, ATLAS.halo));
		const you = div('you');
		you.textContent = 'you';
		own.root.append(you);
		this.own = { ...own, you };
		e.root.append(this.world, this.curs);
	}

	private cursor(e: Engine): CurEl {
		const root = div('cur');
		root.style.width = root.style.height = CELL + 'px';
		const body = cell(e, ATLAS.body), cos = cell(e, ATLAS.cos), flag = cell(e, ATLAS.flag);
		root.append(body, cos, flag);
		this.curs.append(root);
		return { root, body, cos, flag, state: '' };
	}

	frame(e: Engine) {
		const s = e.s;
		this.world.style.transform = `translate3d(${-e.cam.x * s}px,${-e.cam.y * s}px,0) scale(${s})`;
		for (const [p, pe] of this.els) {
			if (!p.visible) continue;
			const tf = css(p.base);
			if (tf !== pe.tf) { pe.btn.style.transform = tf; pe.tf = tf; }
			if (p.hover !== pe.hover) { pe.btn.classList.toggle('hover', p.hover); pe.hover = p.hover; }
			// moose parts are sized in frame px; p.parts maps frame px to prop-local px
			pe.parts.forEach((img, i) => (img.style.transform = css(p.parts[i])));
			if (pe.sheet && p.frame !== pe.frame) {
				pe.sheet.style.backgroundPosition = `${(p.frame / (RIDER.frames - 1)) * 100}% 0`;
				pe.frame = p.frame;
			}
			if (pe.bulbs.length && p.bulbs !== pe.phase) {
				pe.bulbs.forEach((b, i) => b.classList.toggle('on', bulbOn(p, i)));
				pe.phase = p.bulbs;
			}
			if (pe.eye && p.eye !== pe.eyeS) { pe.eye.style.transform = `scaleY(${p.eye})`; pe.eyeS = p.eye; }
		}
		// cursors
		const drawn = e.peers.drawn;
		while (this.pool.length < drawn.length) this.pool.push(this.cursor(e));
		this.pool.forEach((c, i) => {
			const d = drawn[i];
			if (!d) { if (c.state !== 'off') { c.root.style.display = 'none'; c.state = 'off'; } return; }
			const st = `${d.flag},${d.cos},${d.gold}`;
			if (c.state !== st) {
				c.root.style.display = '';
				pos(c.body, e, d.gold ? ATLAS.gold : ATLAS.body);
				c.cos.style.display = d.cos < 0 ? 'none' : '';
				pos(c.cos, e, ATLAS.cos + Math.max(0, d.cos));
				pos(c.flag, e, ATLAS.flag + d.flag);
				c.state = st;
			}
			c.root.style.transform = `translate3d(${(d.x - e.cam.x - TIP) * s}px,${(d.y - e.cam.y - TIP) * s}px,0) scale(${s})`;
		});
		const o = e.own, oc = this.own;
		const st = `${o.cosmetic},${o.gold}`;
		if (oc.state !== st) {
			pos(oc.body, e, o.gold ? ATLAS.gold : ATLAS.body);
			oc.cos.style.display = o.cosmetic < 0 ? 'none' : '';
			pos(oc.cos, e, ATLAS.cos + Math.max(0, o.cosmetic));
			pos(oc.flag, e, ATLAS.flag);
			oc.state = st;
		}
		oc.root.style.transform = `translate3d(${(o.x - e.cam.x - TIP) * s}px,${(o.y - e.cam.y - TIP) * s}px,0) scale(${s})`;
		oc.you.style.opacity = String(Math.max(0, Math.min(1, o.youUntil - e.t)));
	}

	destroy() {
		this.world?.remove();
		this.curs?.remove();
		this.els.clear();
		this.pool = [];
	}
}

function div(cls: string) {
	const d = document.createElement('div');
	d.className = cls;
	return d;
}

function image(url: string, w: number, h: number) {
	const i = document.createElement('img');
	i.src = url;
	i.alt = '';
	i.draggable = false;
	i.style.width = w + 'px';
	i.style.height = h + 'px';
	return i;
}

function cell(e: Engine, i: number) {
	const c = div('cell');
	c.style.backgroundImage = `url(${e.sprites.atlasUrl})`;
	c.style.backgroundSize = `${ATLAS.count * CELL}px ${CELL}px`;
	pos(c, e, i);
	return c;
}

const pos = (c: HTMLElement, _e: Engine, i: number) => (c.style.backgroundPosition = `${-i * CELL}px 0`);
