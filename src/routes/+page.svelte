<script lang="ts">
	import { OVERWORLD as overworld } from '$lib/scenes/overworld';
	import { at, leftToRight } from '$lib/scenes/index';
	import PropCard from '$lib/Prop.svelte';
</script>

<svelte:head>
	<title>{overworld.title}</title>
	<meta name="description" content={overworld.description} />
</svelte:head>

<!-- With the engine the skip link sits on the signpost, where it leads, so focusing it never pans the camera away. -->
<a class="skip at" style={at(overworld.signpost.rect)} href="#signpost-districts">Skip to districts</a>
<h1>{overworld.title}</h1>
<nav id="signpost" class="at" style={at(overworld.signpost.rect)} aria-label="Signpost">
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
		<h2 id="{d.id}-heading" class="at" style={at(d.sign)}>{d.name}</h2>
		{#each d.venues as v (v.id)}
			<section id={v.id} aria-labelledby="{v.id}-heading">
				<h3 id="{v.id}-heading" class="at" style={at(v.rect)}>{v.name}</h3>
				{#each leftToRight(v.props) as prop (prop.id)}
					<PropCard {prop} level={4} where={v.name} />
				{/each}
				{#if v.door}
					<!-- The whole building (ticket 05), or the part of it that is the way in; its props sit above it. -->
					<a class="door at" style={at(v.doorRect ?? v.rect)} href={v.door}>Enter {v.name}</a>
				{/if}
			</section>
		{/each}
	</section>
{/each}
