<script module lang="ts">
	// Each logo is its own hashed file: the page's policy allows an image from the site, no data: URL.
	const FILES = import.meta.glob<string>('./logos/*.{svg,png}', { eager: true, query: '?no-inline', import: 'default' });
</script>

<script lang="ts">
	import type { Prop } from './scenes/types';

	let { logos }: { logos: NonNullable<Prop['logos']> } = $props();
</script>

<!--
	A card's logos (Joe, 2026-10-01), one of the media a card shows over its copy, as VideoPlayer is: each brand's own mark
	in its own colours on an ivory tile, which keeps a dark mark legible on the night board and makes a row of unlike logos
	one set. The names are written under the marks, so the images say nothing more; fetched when the card first shows.
-->
<ul>
	{#each logos as logo}
		<li><img src={FILES[`./logos/${logo.file}`]} alt="" width="40" height="40" loading="lazy" />{logo.name}</li>
	{/each}
</ul>

<style>
	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 0.5rem;
		margin-block: 0 1.25rem;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		align-content: start;
		justify-items: center;
		gap: 0.375rem;
		inline-size: 4.75rem;
		font-size: 0.75rem;
		line-height: 1.2;
		text-align: center;
	}

	img {
		box-sizing: content-box;
		padding: 0.625rem;
		border-radius: 0.75rem;
		background: var(--ivory);
		object-fit: contain;
	}
</style>
