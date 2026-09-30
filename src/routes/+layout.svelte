<script lang="ts">
	// The site's type (Joe, 2026-09-30), self-hosted: Vite bundles each face's files from its @fontsource package, never
	// fetched from Google. Headlines in Barlow Condensed ExtraBold, body copy in Montserrat at 400 and 500 (src/app.css).
	import '@fontsource/barlow-condensed/800.css';
	import '@fontsource/montserrat/400.css';
	import '@fontsource/montserrat/500.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { GA_ID, bar, pageView } from '$lib/analytics.svelte';
	import Consent from '$lib/Consent.svelte';
	import type { Engine } from '$lib/engine/engine';
	import LapBoard from '$lib/LapBoard.svelte';
	import { SUB_SCENES } from '$lib/scenes';
	import { OVERWORLD } from '$lib/scenes/overworld';

	let { children } = $props();
	let scene: HTMLCanvasElement, layer: HTMLElement, cursors: HTMLCanvasElement, joystick: HTMLElement, join: HTMLDialogElement, paused: HTMLDialogElement;
	let here: HTMLElement, live: HTMLElement, lap: HTMLElement;
	let engine: Promise<Engine | undefined> | undefined;
	/** The engine once it has started. */
	let started: Engine | undefined;
	/** A hop to another scene waiting for its iris to close, then going, its own navigation let through. */
	let hop: 'closing' | 'going' | null = null;

	// The engine loads once the page has mounted (afterNavigate's first call), out of the prerender and the first paint,
	// and never re-renders the layer; each navigation hands it the new scene, in order. If it can't start (no canvas, the
	// chunk failed to load) the page stays the plain document.
	afterNavigate(({ to }) => {
		if (!to) return;
		// A scene entered, the first load included, counts for analytics (ticket 23); a fragment on the same scene doesn't.
		pageView(to.url);
		engine ??= import('$lib/engine/engine')
			.then(({ Engine }) => (started = new Engine(scene, layer, cursors, joystick, { join, paused }, { here, live, lap })))
			.catch((err) => void console.error(err));
		engine.then((e) => e?.show(SUB_SCENES[to.url.pathname.slice(1)] ?? OVERWORLD, to.url.hash));
	});
	// A hop to another scene waits for the iris to close on the door (Joe, 2026-09-30); a fragment on the same scene pans.
	// It waits before it starts, called off and sent again once the iris is shut: a door's link by goto, the back or
	// forward button by the same step through history, which the router undid. The router's own wait (onNavigate) takes
	// the new URL first and lands its page even when something else navigates meanwhile. While the iris closes nothing
	// else navigates, a back or forward press undone; leaving the site isn't held, since holding it asks to confirm.
	beforeNavigate((nav) => {
		const to = nav.to;
		if (nav.willUnload || !to) return;
		if (hop === 'going') return void (hop = null);
		if (hop === 'closing') return nav.cancel();
		const shut = nav.from?.url.pathname !== to.url.pathname && started?.close(to.url);
		if (!shut) return;
		nav.cancel();
		hop = 'closing';
		void shut.then(() => {
			hop = 'going';
			if (nav.type === 'popstate') history.go(nav.delta);
			else void goto(to.url);
		});
	});
	onMount(() => () => engine?.then((e) => e?.destroy()));
</script>

<canvas class="scene" aria-hidden="true" bind:this={scene}></canvas>
<main bind:this={layer}>
	{@render children()}
</main>
<!-- The room's count and the visitor's own events (buildout ticket 13), both written by the engine. -->
<p class="presence" bind:this={here}>1 here</p>
<div role="status" aria-live="polite" bind:this={live}></div>
<!-- The Carondelet lap timer's clock (buildout ticket 18), written by the engine; the live region announces each finish. -->
<p class="lap" aria-hidden="true" hidden bind:this={lap}></p>
<LapBoard />
<div class="controls">
	<button type="button" aria-pressed="true">Sound</button>
	<!-- It reopens the consent bar (ticket 23). A build with no GA, every one but production's, has no bar for it to open,
		and keeps it disabled in its place. -->
	<button type="button" class="analytics" disabled={!GA_ID} aria-expanded={GA_ID ? bar.open : undefined} onclick={() => bar.toggle()}>
		Analytics settings
	</button>
</div>
{#if GA_ID}
	<Consent />
{/if}
<!-- The touch joystick (buildout ticket 10), shown after Join on a device with no mouse or trackpad. Hidden from assistive
	tech: a keyboard steers with the keys. -->
<div class="joystick" aria-hidden="true" bind:this={joystick}><div></div></div>
<!--
	The Join and Paused cards (buildout ticket 09): the engine opens them with showModal(), so a page without it, or without
	JavaScript, never shows them. The cursor canvas is a manual popover, in the top layer with the cards: the engine raises
	it over each prop card, so a locked cursor can reach the card's Close, and leaves these two above it, dimming the scene.
-->
<dialog class="gate join" aria-label="Join" bind:this={join}>
	<button type="button">Join</button>
	<!-- The consent bar for a European visitor, over the card, operable before Join (ticket 23). -->
	{#if GA_ID}
		<Consent gate />
	{/if}
</dialog>
<dialog class="gate paused" aria-labelledby="paused-title" bind:this={paused}>
	<p id="paused-title">Paused, click to resume</p>
	<button type="button">Resume</button>
	<p class="refused" hidden>The browser didn't take the mouse. Try again in a moment.</p>
</dialog>
<canvas class="cursors" popover="manual" aria-hidden="true" bind:this={cursors}></canvas>
