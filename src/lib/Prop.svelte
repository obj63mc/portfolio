<script lang="ts">
	import { cardOpen } from './analytics.svelte.ts';
	import { sound } from './sound.svelte.ts';
	import { at } from './scenes/index.ts';
	import { VIDEOS } from './videos.ts';
	import VideoPlayer from './VideoPlayer.svelte';
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

	// A video with no screen in the scene (a Side Project bottle's) plays in its card alone, so it stops when the card closes
	// and lets go of its download (Joe, 2026-09-30). Served whole by the site's own host, which answers no byte range, a
	// paused video held its connection half read, and a few of them left the next card's video waiting behind them; from
	// the media host (videos.ts) it still has no call to go on downloading. Loaded with no source it drops what it held;
	// given its source back, with `preload="none"`, it fetches nothing until it next plays, from the start. (Chrome loads a
	// played video again at once if its source is left in place.)
	function close() {
		const video = dialog?.querySelector('video'), src = video?.getAttribute('src');
		if (prop.video?.screen || !video || !src) return;
		video.pause();
		video.removeAttribute('src');
		video.load();
		video.setAttribute('src', src);
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
			<!-- A video card is the video with its body, one short line, below it, a See More button for a live site and a round X
				on the card's corner to close (Joe, 2026-09-30); its venue and title stay for assistive tech and the plain document.
				The contents scroll inside the card, so the X can overhang it. -->
			<dialog bind:this={dialog} class:video={prop.video} aria-labelledby="card-{prop.id}-title" onclose={close}>
				{#if prop.video}
					<form method="dialog" class="x">
						<button class="secondary" aria-label="Close">
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
						</button>
					</form>
				{/if}
				<div class="scroll">
					<p class="where">{where}</p>
					<svelte:element this={`h${level}`} id="card-{prop.id}-title">{prop.name}</svelte:element>
					{#if prop.video}
						<!-- The same video plays on the prop's screen in the scene (props.ts), if it has one, and keeps playing there after the card
							closes. TODO Joe: captions for the real video; the fill-in has none. -->
						<VideoPlayer src={VIDEOS[prop.video.file]} captions={prop.video.captions} />
					{/if}
					{#each prop.body as paragraph}
						<p>{paragraph}</p>
					{/each}
					{#if prop.links}
						<ul>
							{#each prop.links as link}
								<li>
									<!-- An external link opens in a new tab (Joe, 2026-09-30); the browser gives it no opener. -->
									<a href={link.href} class={prop.video ? 'primary' : undefined} target={/^https?:/.test(link.href) ? '_blank' : undefined}>
										{link.label}
										<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8M9 8h7v7" /></svg>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					{#if !prop.video}
						<form method="dialog"><button class="secondary">Close</button></form>
					{/if}
				</div>
			</dialog>
		{/if}
	</div>
{/if}

<style>
	/*
	 * A card's contents on its night board (src/app.css; Joe, 2026-09-30): the venue over a gold headline, the text, gold
	 * links with an arrow, and Close at the foot. Without the engine the cards read inline as plain document. Every card is
	 * 90 % of the viewport wide up to 860 px and at most 85 % tall, scrolling inside.
	 */
	:global(html.engine) dialog {
		inline-size: min(90vw, 860px);
		max-inline-size: none;
		max-block-size: 85svh;
		overflow: visible;

		&[open] {
			display: flex;
			flex-direction: column;
		}

		/* Room inside the scrolling box for focus rings and a button's lip, which it would clip. */
		& .scroll {
			min-block-size: 0;
			margin: -0.5rem;
			padding: 0.5rem;
			overflow-y: auto;
		}

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

		& a:not(.primary) {
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

		/* A live site's See More: the gold button at a card's size, its arrow beside the label. */
		& a.primary {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			padding-block: 0.5rem 0.55rem;
			padding-inline: 1.375rem;
			font-size: 1.1875rem;
		}

		/* A video card: the video the card's full width and a small line under it. */
		&.video {
			& :is(.where, h2, h4) {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;
			}

			& p {
				margin-block: 0.75rem 0;
				font-size: 0.9375rem;
			}
		}

		/* The X, centred on the card's top right corner (the outer corner of its border): the card's ivory-ringed Close, round
		   and filled with the night so it reads over the scene too. */
		& .x {
			position: absolute;
			inset-block-start: -2px;
			inset-inline-end: -2px;
			margin: 0;
			translate: 50% -50%;

			& button {
				--fill: var(--night);
				display: grid;
				place-items: center;
				inline-size: 2.5rem;
				block-size: 2.5rem;
				padding: 0;
				border-radius: 50%;
			}

			& svg {
				inline-size: 1.125rem;
				block-size: 1.125rem;
			}
		}
	}

	h2,
	h4 {
		margin-block: 0 0.75rem;
		font-size: 1.75rem;
	}
</style>
