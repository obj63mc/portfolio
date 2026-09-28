<script lang="ts">
	import { readingOrder } from './scenes/index.ts';
	import type { SubScene } from './scenes/types';
	import PropCard from './Prop.svelte';

	let { scene }: { scene: SubScene } = $props();
</script>

<svelte:head>
	<title>{scene.title}</title>
	<meta name="description" content={scene.description} />
</svelte:head>

<h1 tabindex="-1">{scene.venue}</h1>
{#each readingOrder(scene) as prop (prop.id)}
	<PropCard {prop} level={2} />
{/each}
<a class="door" href="/#{scene.id}">Back to {scene.district}</a>
