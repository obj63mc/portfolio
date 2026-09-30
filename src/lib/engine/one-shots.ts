// The scene's one-shots (buildout ticket 22): a prop's click sounds its card opening and its signature, a signpost link
// knocks, a card closing sounds, and the Foundry screen's projector start sounds for everyone in the room when a reel
// starts, from the right point for a visitor who arrives mid-sequence. A door hovered or focused loads its scene's
// one-shots ahead of the hop. Hover is silent, and nothing a peer does sounds but the screen. The rules are sound.ts's;
// sound.svelte.ts plays them. The grant's chime, the doors and the lap beep are played where they happen.
import type { Net } from '../net/net.ts';
import { propsOf, sceneAt } from '../scenes/index.ts';
import type { Overworld, SubScene } from '../scenes/types';
import { PROP_SOUNDS, clickSounds, projectorCue } from '../sound.ts';
import { sound } from '../sound.svelte.ts';
import { clickedProp } from './props.ts';

/** The longest a one-shot runs, ms: how long the projector start is waited for until its buffer gives its length. */
const LONGEST = 2000;

export class OneShots {
	private scene: Overworld | SubScene | null = null;
	/** The start of the reel whose projector start has played, server ms. */
	private heard: number | null = null;
	private listeners = new AbortController();
	private net: Net;

	/** `layer` is the prerendered layer, whose clicks open the cards; `net` holds the room's Foundry screen. */
	constructor(layer: HTMLElement, net: Net) {
		this.net = net;
		const opts = { signal: this.listeners.signal };
		// The click that opens a card (spec: "Cards"): a click, a tap, Enter or Space, or the engine clicking under the cursor.
		layer.addEventListener(
			'click',
			(e) => {
				const id = clickedProp(e), prop = id && this.scene ? propsOf(this.scene).find((p) => p.id === id) : undefined;
				const cues = prop ? clickSounds(prop) : (e.target as Element).closest('#signpost a') ? [PROP_SOUNDS.signpost] : [];
				for (const cue of cues) sound.play(cue);
			},
			opts
		);
		// A card closes by its Close button, Escape, or the lock let go in it; `close` doesn't bubble.
		layer.addEventListener('close', (e) => { if ((e.target as Element).closest('.prop')) sound.play('card'); }, { ...opts, capture: true });
		layer.addEventListener('pointerover', (e) => this.over(e.target as Element), opts);
		layer.addEventListener('focusin', (e) => this.over(e.target as Element), opts);
	}

	destroy() {
		this.listeners.abort();
	}

	/** A new scene: its one-shots load, and a `hop` through a door lands with the door closing behind it. */
	show(scene: Overworld | SubScene, hop: boolean) {
		this.scene = scene;
		this.heard = null;
		sound.scene(scene);
		if (hop) sound.play('door-close');
	}

	/**
	 * What the cursor is over: hovered by the mouse, focused, or under the locked or steered cursor (the engine's mark). A
	 * door loads its scene's one-shots ahead of the hop.
	 */
	over(el: Element | null) {
		const door = el?.closest<HTMLAnchorElement>('a.door');
		if (!door) return;
		const to = sceneAt(new URL(door.href).pathname);
		if (to) sound.preload(to);
	}

	/** One frame at server time `t`: a reel that has just started, here or for the room, plays the projector start. */
	step(t: number) {
		const cue = projectorCue(this.net.screen, this.heard, t, sound.length('projector') ?? LONGEST);
		if (cue && sound.play('projector', cue.offset)) this.heard = cue.at;
	}
}
