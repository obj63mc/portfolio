<script lang="ts">
	// The site's type (Joe, 2026-09-30), self-hosted: Vite bundles each face's files from its @fontsource package, never
	// fetched from Google. Headlines in Barlow Condensed ExtraBold, body copy in Montserrat at 400, 500 and 700 (src/app.css).
	import '@fontsource/barlow-condensed/800.css';
	import '@fontsource/montserrat/400.css';
	import '@fontsource/montserrat/500.css';
	import '@fontsource/montserrat/700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { GA_ID, bar, pageView } from '#lib/analytics.svelte.ts';
	import Consent from '#lib/Consent.svelte';
	import type { Engine } from '#lib/engine/engine.ts';
	import LapBoard from '#lib/LapBoard.svelte';
	import SoundToggle from '#lib/SoundToggle.svelte';
	import skyline from '#lib/brand/skyline.webp?no-inline';
	import { sceneAt } from '#lib/scenes/index.ts';

	let { children } = $props();
	let scene: HTMLCanvasElement, layer: HTMLElement, cursors: HTMLCanvasElement, joystick: HTMLElement, join: HTMLDialogElement, paused: HTMLDialogElement;
	let here: HTMLElement, live: HTMLElement, lap: HTMLElement;
	let engine: Promise<Engine | undefined> | undefined;
	/** The engine once it has started. */
	let started: Engine | undefined;
	/** A hop to another scene waiting for its iris to close, then going, its own navigation let through. */
	let hop: 'closing' | 'going' | null = null;
	/** The engine couldn't start, so every page stays the plain document. */
	let failed = false;

	// The engine loads once the page has mounted (afterNavigate's first call), out of the prerender and the first paint,
	// and never re-renders the layer; each navigation hands it the new scene, in order. If it can't start (no canvas, the
	// chunk failed to load) the page stays the plain document.
	afterNavigate(({ to }) => {
		if (!to) return;
		// A scene entered, the first load included, counts for analytics (ticket 23); a fragment on the same scene doesn't.
		pageView(to.url);
		// A game has no scene: the engine, if it is running, steps away until the next one (Joe, 2026-09-30).
		const shown = sceneAt(to.url.pathname);
		// A page with no scene, or an engine that can't start, is the plain document, shown (app.css).
		document.documentElement.classList.toggle('plain', !shown || failed);
		if (!shown) return void started?.suspend(to.url.pathname);
		engine ??= import('#lib/engine/engine.ts')
			.then(({ Engine }) => (started = new Engine(scene, layer, cursors, joystick, { join, paused }, { here, live, lap })))
			.catch((err) => {
				failed = true;
				document.documentElement.classList.add('plain');
				console.error(err);
				return undefined;
			});
		engine.then((e) => e?.show(shown, to.url.hash));
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
<!-- The consent bar on the page, after Join and when the icon reopens it: first in tab order, ahead of the scene (ticket 23). -->
{#if GA_ID}
	<Consent />
{/if}
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
	<SoundToggle />
	<!-- It reopens the consent bar (ticket 23), only where the bar is offered: a build with GA and a European timezone. -->
	{#if bar.offered}
		<button type="button" class="analytics" aria-expanded={bar.open} onclick={() => bar.toggle()}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-8M12 20V5M19 20v-5" /></svg>
			<span>Analytics settings</span>
		</button>
	{/if}
</div>
<!-- The touch joystick (buildout ticket 10), shown after Join on a device with no mouse or trackpad. Hidden from assistive
	tech: a keyboard steers with the keys. -->
<div class="joystick" aria-hidden="true" bind:this={joystick}><div></div></div>
<!--
	The Join and Paused cards (buildout ticket 09): the engine opens them with showModal(), so a page without it, or without
	JavaScript, never shows them. The cursor canvas is a manual popover, in the top layer with the cards: the engine raises
	it over each prop card, so a locked cursor can reach the card's Close, and leaves these two above it, dimming the scene.
	On touch a prop card stays above it too, its controls the finger's.
-->
<dialog class="gate join" aria-labelledby="join-title" bind:this={join}>
	<!-- The daylight window (Joe, 2026-09-30): the skyline art is in art/sources/brand/. -->
	<img src={skyline} alt="" width="1600" height="640" />
	<p style="margin:0;">Welcome to</p>
	<p class="name" id="join-title">BarMadden.com</p>
	<p class="tag">The Portfolio of Joseph Madden</p>
	<button type="button" class="primary">Let's Explore</button>
	<!-- The consent bar for a European visitor, over the card, operable before Join (ticket 23). -->
	{#if GA_ID}
		<Consent gate />
	{/if}
</dialog>
<dialog class="gate paused" aria-labelledby="paused-title" bind:this={paused}>
	<p id="paused-title">Paused, click to resume</p>
	<button type="button" class="primary">Resume</button>
	<p class="refused" hidden>The browser didn't take the mouse. Try again in a moment.</p>
	<!-- The modal card makes the controls behind it inert: its own Sound toggle stands in their place, over them. -->
	<div class="controls">
		<SoundToggle />
	</div>
</dialog>
<canvas class="cursors" popover="manual" aria-hidden="true" bind:this={cursors}></canvas>
