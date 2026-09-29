<script lang="ts">
	import { at } from './scenes/index.ts';
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript.
	// `state` replaces the gist for a prop whose name follows live state (the Foundry screen: "Screen: now playing Fast Five").
	let { prop, level, state }: { prop: Prop; level: 2 | 4; state?: string } = $props();
	let dialog: HTMLDialogElement;

	// The videos a card can play, served from where Joe keeps them and hashed into the build.
	const VIDEOS = import.meta.glob<string>('/art/sources/videos/*.mp4', { eager: true, query: '?no-inline', import: 'default' });

	// Opening the card is the click (ticket 15), which plays its video: loaded only now, with sound, inside the gesture.
	function open() {
		dialog.showModal();
		dialog.querySelector('video')?.play().catch(() => {});
	}
</script>

<!-- The engine reads `data-prop` for the prop's hover and click reactions; its stylesheet clips the button to `--clip`. -->
<div class="prop at" data-prop={prop.id} style={at(prop.rect)}>
	<button type="button" aria-haspopup="dialog" style={prop.clip && `--clip:${prop.clip}`} onclick={open}>
		{prop.name}: {state ?? prop.gist}
	</button>
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
</div>

<style>
	video {
		display: block;
		inline-size: 100%;
	}
</style>
