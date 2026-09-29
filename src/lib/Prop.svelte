<script lang="ts">
	import { at } from './scenes/index.ts';
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript.
	// `state` replaces the gist for a prop whose name follows live state (the Foundry screen: "Screen: now playing Fast Five").
	let { prop, level, state }: { prop: Prop; level: 2 | 4; state?: string } = $props();
	let dialog: HTMLDialogElement;
</script>

<div class="prop at" style={at(prop.rect)}>
	<button type="button" aria-haspopup="dialog" onclick={() => dialog.showModal()}>
		{prop.name}: {state ?? prop.gist}
	</button>
	<dialog bind:this={dialog} aria-labelledby="card-{prop.id}-title">
		<svelte:element this={`h${level}`} id="card-{prop.id}-title">{prop.name}</svelte:element>
		{#each prop.body as paragraph}
			<p>{paragraph}</p>
		{/each}
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
