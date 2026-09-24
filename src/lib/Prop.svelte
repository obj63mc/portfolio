<script lang="ts">
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript.
	let { prop, level }: { prop: Prop; level: 2 | 4 } = $props();
	let dialog: HTMLDialogElement;
</script>

<div class="prop">
	<button type="button" aria-haspopup="dialog" onclick={() => dialog.showModal()}>
		{prop.name}: {prop.gist}
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
