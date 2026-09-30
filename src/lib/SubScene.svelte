<script lang="ts">
	import { at, readingOrder } from './scenes/index.ts';
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
	<PropCard {prop} level={2} where={scene.venue} />
{/each}
<a class="door at" style={at(scene.exit)} href="/#{scene.id}">Back to {scene.district}</a>
