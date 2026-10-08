<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { SUB_SCENES } from './scenes/index.ts';

	// `reading`: the scene is put away and its page read as the plain document; `onread` asks the layout for it, or back.
	let { reading, onread }: { reading: boolean; onread: (on: boolean) => void } = $props();
	// One menu on the page and one in each of the Join and Paused cards, whose modal makes the page's inert.
	const id = $props.id();
	let open = $state(false);
	const scenes = Object.values(SUB_SCENES).map((s) => ({ href: `/${s.id}`, name: s.venue }));

	afterNavigate(() => void (open = false));
</script>

<!-- The site menu (Joe, 2026-10-08), top left: the toggle between exploring the scene and reading its page, the resume,
	each scene, then home and Joe's GitHub and LinkedIn. One of the controls (src/app.css), so the drawn cursor marks and
	clicks it and the camera holds still beside it. It opens without JavaScript: its button is the label of a hidden
	checkbox, and the panel shows while that is checked (`:has`, below); scripts only close it on a navigation. -->
<nav class="controls menu" aria-label="Site">
	<label for="nav-toggle-{id}">
		<input type="checkbox" id="nav-toggle-{id}" aria-controls={id} bind:checked={open} />
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path class="closed" d="M4 7h16M4 12h16M4 17h16" />
			<path class="opened" d="M6 6l12 12M18 6L6 18" />
		</svg>
		<span>Menu</span>
	</label>
	<div class="panel" {id}>
		<button type="button" class="mode" onclick={() => ((open = false), onread(!reading))}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if reading}
					<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
				{:else}
					<path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />
				{/if}
			</svg>
			{reading ? 'Let\'s Explore!' : 'I don\'t feel like exploring'}
		</button>
		<ul>
			<li><a href="/resume">Resume</a></li>
			{#each scenes as scene (scene.href)}
				<li><a href={scene.href}>{scene.name}</a></li>
			{/each}
		</ul>
		<ul class="icons">
			<li>
				<a href="/" aria-label="Home">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>
				</a>
			</li>
			<li>
				<a href="https://github.com/obj63mc" target="_blank" rel="noopener" aria-label="GitHub">
					<svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						/>
					</svg>
				</a>
			</li>
			<li>
				<a href="https://www.linkedin.com/in/joseph-madden-152b2745/" target="_blank" rel="noopener" aria-label="LinkedIn">
					<svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
						/>
					</svg>
				</a>
			</li>
		</ul>
	</div>
</nav>

<!-- The label's tile, icon and hidden name are the controls' (src/app.css); the panel is in the flow under it, so the
	controls' box, which holds the camera, covers it while open. -->
<style>
	.menu {
		inset-block: 1rem auto;
		flex-direction: column;
		align-items: start;

		/* The checkbox is out of sight and still takes the keyboard: its ring is drawn on its label's tile. */
		& input {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			margin: 0;
			opacity: 0;
		}

		& label:has(:focus-visible) {
			outline: 3px solid var(--ivory);
			outline-offset: 3px;
		}

		/* With no engine to mark what the cursor is over (app.css), the mouse's own hover does. */
		:global(html:not(.engine)) & label:hover {
			background: var(--fill-hot);
		}

		&:has(input:checked) .closed,
		&:not(:has(input:checked)) :is(.opened, .panel) {
			display: none;
		}
	}

	.panel {
		min-inline-size: 13rem;
		max-block-size: calc(100dvh - 6rem);
		overflow-y: auto;
		padding: 0.5rem;
		border-radius: 0.75rem;
		background: var(--night);
		color: var(--ivory);
		box-shadow: inset 0 0 0 2px rgb(255 244 212 / 0.3), 0 0.375rem 0.875rem rgb(0 0 0 / 0.25);

		& ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		& :is(a, .mode) {
			display: block;
			padding: 0.5rem 0.75rem;
			border-radius: 0.5rem;
			color: inherit;
			font-weight: 700;
			text-align: start;
			text-decoration: none;

			&:focus-visible {
				outline: 3px solid var(--ivory);
				outline-offset: -3px;
			}

			:global(html:not(.engine)) &:hover {
				background: var(--gold);
				color: var(--night);
			}
		}

		/* The toggle between exploring and reading, over the links: a row, not a tile. */
		& .mode {
			--fill: none;
			--fill-hot: var(--gold);
			--ink-hot: var(--night);
			display: flex;
			align-items: center;
			gap: 0.5rem;
			inline-size: 100%;
			block-size: auto;
			margin-block-end: 0.5rem;
			box-shadow: none;
			font: inherit;
			font-weight: 700;
		}

		& .icons {
			display: flex;
			gap: 0.25rem;
			margin-block-start: 0.5rem;
			padding-block-start: 0.5rem;
			border-block-start: 2px solid rgb(255 244 212 / 0.3);

			& a {
				display: grid;
				place-items: center;
				inline-size: 2.75rem;
				block-size: 2.75rem;
				padding: 0;
			}
		}

		& .brand {
			fill: currentColor;
			stroke: none;
		}
	}
</style>
