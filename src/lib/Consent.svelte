<script lang="ts">
	import { untrack } from 'svelte';
	import { bar } from './analytics.svelte.ts';
	import type { Choice } from './analytics/consent.ts';

	// The consent bar (buildout ticket 23): one line asking a European visitor whether GA may count their visit, with
	// equal Allow and No thanks buttons, as a manual popover over the scene that stays until they choose. It is rendered
	// twice and shows in one place at a time: inside the Join card (`gate`) while that is up, since a modal card leaves
	// only its own contents operable and a popover beside it would be inert, whatever its place in the top layer; and on
	// the page after Join, and when the analytics icon reopens it. Answering it is not joining.
	let { gate = false }: { gate?: boolean } = $props();
	const uid = $props.id();
	let el: HTMLElement;
	/** Each time the Join card opens, which puts the card over the bar: the bar is raised over it again. */
	let opened = $state(0);

	// Inside the Join card, the bar follows it: the engine opens it with showModal() and closes it on Join.
	$effect(() => {
		if (!gate) return;
		const card = el.closest('dialog')!;
		const seen = () => {
			bar.joinUp = card.open;
			if (card.open) opened++;
		};
		const watch = new MutationObserver(seen);
		watch.observe(card, { attributeFilter: ['open'] });
		untrack(seen);
		return () => watch.disconnect();
	});

	// Shown, the bar enters the top layer last, over any card opened before it. On the page the cursor canvas is raised
	// over it again, as the engine raises it over each card, so a locked cursor aiming at a button stays in sight.
	$effect(() => {
		const shown = bar.open && (gate ? bar.joinUp : !bar.joinUp);
		void opened;
		el.togglePopover(false);
		if (!shown) return;
		el.showPopover();
		const cursors = document.querySelector<HTMLElement>('canvas.cursors');
		if (!gate && cursors?.matches(':popover-open')) {
			cursors.hidePopover();
			cursors.showPopover();
		}
	});

	/** A choice closes the bar; focus goes back to the Join button, or to the analytics icon on the page. */
	function choose(choice: Choice) {
		const focused = el.contains(document.activeElement);
		bar.choose(choice);
		const back = gate ? el.closest('dialog')?.querySelector<HTMLElement>(':scope > button') : document.querySelector<HTMLElement>('.controls .analytics');
		if (focused) back?.focus();
	}
</script>

<div class="consent" popover="manual" role="region" aria-labelledby="{uid}-ask" bind:this={el}>
	<p id="{uid}-ask">Can I count visits with Google Analytics? No ads, no tracking elsewhere.</p>
	<div class="choices">
		<button type="button" class="alternate" aria-pressed={bar.pressed === 'granted'} disabled={bar.gpc} onclick={() => choose('granted')}>Allow</button>
		<button type="button" class="alternate" aria-pressed={bar.pressed === 'denied'} disabled={bar.gpc} onclick={() => choose('denied')}>No thanks</button>
	</div>
	{#if bar.gpc}
		<p class="note">Your browser's Global Privacy Control is on, so Google Analytics stays off.</p>
	{/if}
</div>

<style>
	/* A one-line card at the top of the screen, clear of the joystick and the toggles, on the cards' night board (src/app.css;
	   Joe, 2026-09-30); inside the Join card it sets its own type, since the card's would carry over. */
	.consent {
		inset-block: 1rem auto;
		inset-inline: 1rem;
		margin-block: 0;
		margin-inline: auto;
		max-inline-size: 60rem;
		padding-block: 0.875rem;
		padding-inline: 1.25rem;
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.625rem;
		background: var(--night);
		color: var(--ivory);
		box-shadow: 0 0 0 5px var(--night), 0 0.875rem 1.875rem rgb(0 0 0 / 0.3);
		font-size: 1rem;
		font-weight: 500;
		text-align: center;

		&:popover-open {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			gap: 0.625rem 1rem;
		}

		& p {
			margin: 0;
		}

		& .choices {
			display: flex;
			gap: 0.625rem;
		}

		/* Allow and No thanks are equal: the same sky buttons, neither the default; the choice in force is ivory. */
		& button {
			min-inline-size: 8rem;
		}

		& .note {
			flex-basis: 100%;
			color: var(--gold);
			font-size: 0.875rem;
			font-weight: 400;
		}
	}
</style>
