<script lang="ts">
	import { OVERWORLD as overworld } from '$lib/scenes/overworld';
	import { leftToRight } from '$lib/scenes/index';
	import PropCard from '$lib/Prop.svelte';
</script>

<svelte:head>
	<title>{overworld.title}</title>
	<meta name="description" content={overworld.description} />
</svelte:head>

<a class="skip" href="#signpost-districts">Skip to districts</a>
<h1>{overworld.title}</h1>
<nav id="signpost" aria-label="Signpost">
	{#each overworld.signpost.contacts as link}
		<a href={link.href}>{link.label}</a>
	{/each}
	<ul id="signpost-districts">
		{#each overworld.districts as d (d.id)}
			<li><a href="#{d.id}">{d.name}</a></li>
		{/each}
	</ul>
</nav>
{#each overworld.districts as d (d.id)}
	<section id={d.id} aria-labelledby="{d.id}-heading">
		<h2 id="{d.id}-heading">{d.name}</h2>
		{#each d.venues as v (v.id)}
			<section id={v.id} aria-labelledby="{v.id}-heading">
				<h3 id="{v.id}-heading">{v.name}</h3>
				{#each leftToRight(v.props) as prop (prop.id)}
					<PropCard {prop} level={4} />
				{/each}
				{#if v.door}
					<a class="door" href={v.door}>Enter {v.name}</a>
				{/if}
			</section>
		{/each}
	</section>
{/each}
