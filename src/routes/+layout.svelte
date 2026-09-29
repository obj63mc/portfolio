<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import type { Engine } from '$lib/engine/engine';
	import { SUB_SCENES } from '$lib/scenes';
	import { OVERWORLD } from '$lib/scenes/overworld';

	let { children } = $props();
	let scene: HTMLCanvasElement, layer: HTMLElement, cursors: HTMLCanvasElement, join: HTMLDialogElement, paused: HTMLDialogElement;
	let engine: Promise<Engine | undefined> | undefined;

	// The engine loads once the page has mounted (afterNavigate's first call), out of the prerender and the first paint,
	// and never re-renders the layer; each navigation hands it the new scene, in order. If it can't start (no canvas, the
	// chunk failed to load) the page stays the plain document.
	afterNavigate(({ to }) => {
		if (!to) return;
		engine ??= import('$lib/engine/engine')
			.then(({ Engine }) => new Engine(scene, layer, cursors, { join, paused }))
			.catch((err) => void console.error(err));
		engine.then((e) => e?.show(SUB_SCENES[to.url.pathname.slice(1)] ?? OVERWORLD, to.url.hash));
	});
	onMount(() => () => engine?.then((e) => e?.destroy()));
</script>

<canvas class="scene" aria-hidden="true" bind:this={scene}></canvas>
<main bind:this={layer}>
	{@render children()}
</main>
<p class="presence">1 here</p>
<div role="status" aria-live="polite"></div>
<div class="controls">
	<button type="button" aria-pressed="true">Sound</button>
	<button type="button">Analytics settings</button>
</div>
<!--
	The Join and Paused cards (buildout ticket 09): the engine opens them with showModal(), so a page without it, or without
	JavaScript, never shows them. The cursor canvas is a manual popover, in the top layer with the cards: the engine raises
	it over each prop card, so a locked cursor can reach the card's Close, and leaves these two above it, dimming the scene.
-->
<dialog class="gate" aria-label="Join" bind:this={join}>
	<button type="button">Join</button>
</dialog>
<dialog class="gate" aria-labelledby="paused-title" bind:this={paused}>
	<p id="paused-title">Paused, click to resume</p>
	<button type="button">Resume</button>
	<p class="refused" hidden>The browser didn't take the mouse. Try again in a moment.</p>
</dialog>
<canvas class="cursors" popover="manual" aria-hidden="true" bind:this={cursors}></canvas>
