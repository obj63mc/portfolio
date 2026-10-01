// The Moosylvania lobby TV's remote (Joe, 2026-10-01): one object the room keeps (net/protocol.ts `Tv`), on the meeting
// table or in one visitor's hand. A click on its prop asks the room for it; whoever the room says holds it has its card
// open, the remote itself, whose channel buttons ask the room for the next channel and whose closing puts it back. The
// channel and the holder are copied each frame to tv.svelte.ts, which the TV's video and the remote's card draw from.
import { flushSync } from 'svelte';
import { cardOpen } from '../analytics.svelte.ts';
import type { Net } from '../net/net.ts';
import { IDLE, channelOf, tv } from '../tv.svelte.ts';

export class Remote {
	private layer: HTMLElement;
	private net: Net;
	/** The remote's card in this scene, if it has a remote. */
	private card: HTMLDialogElement | null = null;
	/** The card was opened for this visitor, its holder: closed again, by its power button or Esc, the remote goes back. */
	private opened = false;
	/** When its holder here took it or last pressed a button, performance.now() ms. */
	private pressed = 0;
	private listeners = new AbortController();

	/** `layer` is the prerendered layer: the remote's button is marked `data-take`, its channel buttons `data-tune`. */
	constructor(layer: HTMLElement, net: Net) {
		this.layer = layer;
		this.net = net;
		const opts = { signal: this.listeners.signal };
		layer.addEventListener(
			'click',
			(e) => {
				const on = (e.target as Element).closest<HTMLElement>('[data-take], [data-tune]'), by = Number(on?.dataset.tune);
				if (!on) return;
				if (by === 1 || by === -1) {
					net.remote({ t: 'tv.tune', by });
					this.pressed = performance.now();
				} else {
					// Taken again in the frame its card closed, it is put back first, so the room hears both in order.
					this.put();
					net.remote({ t: 'tv.take' });
				}
			},
			opts
		);
	}

	/** A new scene's remote, if it has one. */
	show() {
		this.card = this.layer.querySelector('dialog.remote');
	}

	/** Puts the remote back if this visitor holds it: its card closed, the engine paused, a minute without a press. */
	put() {
		this.opened = false;
		if (this.net.tv.holder === this.net.id) this.net.remote({ t: 'tv.put' });
	}

	/** One frame at `now`, performance.now() ms: the room's TV into the page, and the card open for its holder alone. */
	step(now: number) {
		const { ch, holder } = this.net.tv, held = holder === null ? null : holder === this.net.id ? 'me' : 'other', channel = channelOf(ch);
		if (tv.held !== held) tv.held = held;
		if (tv.channel !== channel) {
			tv.channel = channel;
			// The holder's own press has tuned it: under reduced motion the TV plays from here on. The page lets go of the
			// old channel's video now, before this frame's props could ask it to play.
			if (held === 'me') tv.tuned = true;
			flushSync();
		}
		const card = this.card, mine = held === 'me';
		if (!mine) this.opened = false;
		if (card && mine && !card.open) {
			// However its holder closed the card, by its power button, Esc or the lock's release, the remote goes back on
			// the table. (The card's own `close` event comes too late to tell: a frame or so after it closed.)
			if (this.opened) return this.put();
			card.showModal();
			cardOpen(card.parentElement?.dataset.prop ?? '');
			this.opened = true;
			this.pressed = now;
		} else if (card?.open && !mine) card.close();
		if (mine && now - this.pressed > IDLE) this.put();
	}

	destroy() {
		this.listeners.abort();
	}
}
