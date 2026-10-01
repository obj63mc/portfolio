<script module lang="ts">
	// Each screenshot is its own hashed file, read from where Joe keeps them: every .webp directly inside a folder of
	// art/sources/screenshots is in the build (a set's working files sit in folders below).
	const FILES = import.meta.glob<string>('../../art/sources/screenshots/*/*.webp', { eager: true, query: '?no-inline', import: 'default' });
</script>

<script lang="ts">
	import type { Prop } from './scenes/types';

	let { screens }: { screens: NonNullable<Prop['screens']> } = $props();
	let track: HTMLDivElement | undefined = $state();
	/** The screenshot in view, by how far the row of them has been scrolled. */
	let i = $state(0);
	// Past either end it comes round to the other, so neither button is ever dead.
	const go = (by: number) => track?.scrollTo({ left: ((i + by + screens.length) % screens.length) * track.clientWidth });
</script>

<!--
	A card's screenshots (Joe, 2026-10-01), one of the media a card shows over its copy, as VideoPlayer and Logos are: a
	browser window on the site as it was. Each screenshot fills the window's width and scrolls in it as its page did; the
	window's back and forward buttons, or a swipe, go from one to the next, a row scrolled sideways that snaps to each. One
	screenshot alone is the window with no buttons. Under the pointer lock the engine clicks the buttons and turns the wheel.
-->
<div class="screens" role="group" aria-label="Screenshots">
	<div class="bar">
		{#if screens.length > 1}
			<button type="button" aria-label="Previous screenshot" onclick={() => go(-1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" /></svg>
			</button>
			<button type="button" aria-label="Next screenshot" onclick={() => go(1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" /></svg>
			</button>
		{/if}
		<p aria-live="polite">{screens[i].name}</p>
		{#if screens.length > 1}
			<span aria-hidden="true">{i + 1} / {screens.length}</span>
		{/if}
	</div>
	<div class="track" bind:this={track} onscroll={(e) => (i = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
		{#each screens as screen, n}
			<!-- A scrolling box takes the keyboard's focus, which Safari gives none by itself. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="page" tabindex="0" role="group" aria-label="{screen.name}, screenshot {n + 1} of {screens.length}">
				<img src={FILES[`../../art/sources/screenshots/${screen.file}`]} alt={screen.name} loading="lazy" />
			</div>
		{/each}
	</div>
</div>

<style>
	.screens {
		overflow: hidden;
		margin-block-end: 1.25rem;
		border-radius: 0.5rem;
		background: #000;
	}

	/* The window's bar, ivory on the night card: back, forward, the page's name where its address was, and the count. */
	.bar {
		--fill-hot: rgb(29 43 58 / 0.12);
		--ink-hot: var(--night);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem;
		background: var(--ivory);
		color: var(--night);
		font-size: 0.8125rem;
	}

	button {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: inherit;
		cursor: pointer;

		&:focus-visible {
			outline: 3px solid var(--night);
			outline-offset: -3px;
		}
	}

	svg {
		inline-size: 1.25rem;
		block-size: 1.25rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	p {
		flex: 1;
		min-inline-size: 0;
		margin: 0 0.25rem;
		padding: 0.375rem 0.875rem;
		border-radius: 1rem;
		background: rgb(29 43 58 / 0.1);
		font-weight: 500;
		line-height: 1.25;
	}

	span {
		flex: none;
		padding-inline: 0.25rem 0.375rem;
		font-variant-numeric: tabular-nums;
	}

	.track {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;

		@media (prefers-reduced-motion: no-preference) {
			scroll-behavior: smooth;
		}
	}

	/* A desktop window's shape, kept tall enough on a phone to read a page in and short enough to leave the copy in view. */
	.page {
		display: flex;
		flex: none;
		flex-direction: column;
		inline-size: 100%;
		aspect-ratio: 16 / 10;
		min-block-size: min(22rem, 55svh);
		max-block-size: 55svh;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		scroll-snap-align: start;
		scroll-snap-stop: always;

		&:focus-visible {
			outline: 3px solid var(--gold);
			outline-offset: -3px;
		}
	}

	/* Full width whatever its height: a long page scrolls, and one shorter than the window sits in its middle. */
	img {
		display: block;
		flex: none;
		inline-size: 100%;
		margin-block: auto;
	}
</style>
