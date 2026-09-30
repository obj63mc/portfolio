<script lang="ts">
	import { cardOpen } from './analytics.svelte.ts';
	import { sound } from './sound.svelte.ts';
	import { at } from './scenes/index.ts';
	import { VIDEOS } from './videos.ts';
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript, and
	// `where` is the venue named over it. A prop whose name follows live state (the Foundry screen: "Screen: now playing
	// Fast Five") is prerendered with its gist, and the engine keeps it current.
	let { prop, level, where }: { prop: Prop; level: 2 | 4; where: string } = $props();
	// Bound only for a prop with a card.
	let dialog: HTMLDialogElement | undefined = $state();

	// Opening the card is the click (ticket 15), which plays its video: loaded only now, with sound, inside the gesture. An
	// `action` prop has no card: the engine hears its click.
	function open() {
		if (!dialog) return;
		dialog.showModal();
		// Its sound follows the Sound toggle and a hidden tab, as the Foundry screen's does.
		const video = dialog.querySelector('video');
		if (video) {
			sound.media(video);
			video.play().catch(() => {});
		}
		cardOpen(prop.id);
	}
</script>

<!-- The engine reads `data-prop` for the prop's hover and click reactions; its stylesheet clips the button to `--clip`. -->
{#if prop.kind === 'status'}
	<div class="prop status at" data-prop={prop.id} style={at(prop.rect)}>
		<p>{prop.name}: {prop.gist}</p>
	</div>
{:else}
	<div class="prop at" data-prop={prop.id} style={at(prop.rect)}>
		<button type="button" aria-haspopup={prop.kind ? undefined : 'dialog'} style={prop.clip && `--clip:${prop.clip}`} onclick={open}>
			{prop.name}: {prop.gist}
		</button>
		{#if !prop.kind}
			<dialog bind:this={dialog} aria-labelledby="card-{prop.id}-title">
				<p class="where">{where}</p>
				<svelte:element this={`h${level}`} id="card-{prop.id}-title">{prop.name}</svelte:element>
				{#each prop.body as paragraph}
					<p>{paragraph}</p>
				{/each}
				{#if prop.video}
					<!-- The same element plays on the prop's screen in the scene (props.ts), and keeps playing there after the card
						closes. TODO Joe: captions for the real video; the fill-in has none. -->
					<!-- svelte-ignore a11y_media_has_caption -->
					<video src={VIDEOS[`/art/sources/videos/${prop.video.file}`]} controls preload="none" playsinline>
						{#if prop.video.captions}
							<track kind="captions" src={prop.video.captions} srclang="en" label="English" default />
						{/if}
					</video>
				{/if}
				{#if prop.links}
					<ul>
						{#each prop.links as link}
							<li>
								<a href={link.href}>
									{link.label}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8M9 8h7v7" /></svg>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				<form method="dialog"><button class="secondary">Close</button></form>
			</dialog>
		{/if}
	</div>
{/if}

<style>
	/*
	 * A card's contents on its night board (src/app.css; Joe, 2026-09-30): the venue over a gold headline, the text, gold
	 * links with an arrow, and Close at the foot. Without the engine the cards read inline as plain document.
	 */
	:global(html.engine) dialog {
		& .where {
			margin-block: 0 0.375rem;
			color: var(--sky);
			font-size: 0.8125rem;
			font-weight: 500;
			letter-spacing: 0.14em;
			text-transform: uppercase;
		}

		& :is(h2, h4) {
			margin-block: 0 0.75rem;
			color: var(--gold);
			font-size: clamp(2rem, 1.4rem + 2vw, 2.75rem);
			letter-spacing: 0.03em;
			line-height: 1.02;
			text-transform: uppercase;
		}

		& p {
			margin-block: 0 0.75rem;
			line-height: 1.55;
		}

		& ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0.625rem 1.25rem;
			margin-block: 1rem 0;
			padding: 0;
			list-style: none;
		}

		& a {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			margin-inline: -0.25rem;
			padding-inline: 0.25rem;
			border-radius: 0.25rem;
			color: var(--gold);
			font-weight: 500;
			text-decoration-thickness: 2px;
			text-underline-offset: 5px;

			&:focus-visible {
				outline: 3px solid var(--ivory);
				outline-offset: 3px;
			}
		}

		& svg {
			inline-size: 1rem;
			block-size: 1rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		& form {
			display: flex;
			justify-content: flex-end;
			margin-block-start: 1.5rem;
		}
	}

	h2,
	h4 {
		margin-block: 0 0.75rem;
		font-size: 1.75rem;
	}

	video {
		display: block;
		inline-size: 100%;
	}
</style>
