<!--
	The error page (Joe, 2026-10-02): what the layout shows in place of a page that isn't there or couldn't load. It has no
	scene, so the layout marks it `plain` and it wears the plain document's look (app.css): the gold headline, ivory copy,
	gold links, and the gold button for the way back. The copy is this markup, plain HTML; the tests never read its words.
	A path the host has no page for is answered first by static/404.html, a file of its own: this page is what a visitor
	sees once the site's scripts are running.
-->
<script lang="ts">
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{missing ? 'Not found' : 'Something went wrong'} | BarMadden.com</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if missing}
	<!-- 404: no page at this address. -->
	<h1>Looks like you are lost</h1>
	<p class="lead">Need help finding your way?</p>
	<p>Hit one of the links below to continue your journey.</p>
{:else}
	<!-- Any other error: a page that failed to load. `page.error.message` is SvelteKit's own short line for it. -->
	<h1>Something went wrong</h1>
	<p class="lead">{page.status}: {page.error?.message}</p>
	<p>TODO: a line or two for a visitor whose page didn't load.</p>
{/if}

<!-- Places to go from here: add or drop links as the copy wants. -->
<ul>
	<li><a href="/resume">Resume</a></li>
	<li><a href="/sushi-stand">The Sushi Stand</a></li>
	<li><a href="/big-muddy">Big Muddy</a></li>
	<li><a href="/moosylvania">Moosylvania</a></li>
	<li><a href="/foundry">Foundry</a></li>
	<li><a href="/side-project">Side Project</a></li>
	<li><a href="/bread-co">Bread Co.</a></li>
	<li><a href="/slu">SLU</a></li>
	<li><a href="/brennans">Brennan's</a></li>
</ul>

<a class="door" href="/">Back to BarMadden</a>

<style>
	.lead {
		margin-block: 0 1rem;
		font-size: 1.125rem;
	}

	p {
		margin-block: 0 0.75rem;
		max-inline-size: 44rem;
	}

	ul {
		margin-block: 0 1rem;
		padding-inline-start: 1.25rem;

		& li::marker {
			color: var(--gold);
		}
	}
</style>
