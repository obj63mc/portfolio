<script lang="ts">
	import { cardOpen } from './analytics.svelte.ts';
	import { at } from './scenes/index.ts';
	import { VIDEOS } from './videos.ts';
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript. A
	// prop whose name follows live state (the Foundry screen: "Screen: now playing Fast Five") is prerendered with its gist,
	// and the engine keeps it current.
	let { prop, level }: { prop: Prop; level: 2 | 4 } = $props();
	// Bound only for a prop with a card.
	let dialog: HTMLDialogElement | undefined = $state();

	// Opening the card is the click (ticket 15), which plays its video: loaded only now, with sound, inside the gesture. An
	// `action` prop has no card: the engine hears its click.
	function open() {
		if (!dialog) return;
		dialog.showModal();
		dialog.querySelector('video')?.play().catch(() => {});
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
							<li><a href={link.href}>{link.label}</a></li>
						{/each}
					</ul>
				{/if}
				<form method="dialog"><button>Close</button></form>
			</dialog>
		{/if}
	</div>
{/if}

<style>
	/* The card's title, a headline (src/app.css). */
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
