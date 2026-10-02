<script module lang="ts">
	// Each card's copy (Joe, 2026-10-01): the Markdown file named for its prop, in its scene's folder of src/lib/content,
	// built into the page as HTML (vite.config.ts). The folders only sort the files: a prop's id is its own on the whole site.
	const COPY = Object.fromEntries(
		Object.entries(import.meta.glob<string>('./content/*/*.md', { eager: true, import: 'default' })).map(([path, html]) => [
			path.slice(path.lastIndexOf('/') + 1, -3),
			html
		])
	);
</script>

<script lang="ts">
	import { cardOpen } from './analytics.svelte.ts';
	import { sound } from './sound.svelte.ts';
	import { at } from './scenes/index.ts';
	import { SETTLE, tv } from './tv.svelte.ts';
	import { TV, VIDEOS } from './videos.ts';
	import Logos from './Logos.svelte';
	import Remote from './Remote.svelte';
	import Screens from './Screens.svelte';
	import VideoPlayer from './VideoPlayer.svelte';
	import type { Prop } from './scenes/types';

	// `level` keeps the card title inside the page's heading hierarchy when the cards read inline without JavaScript, and
	// `where` is the venue named over it. A prop whose name follows live state (the Foundry screen: "Screen: now playing
	// Fast Five") is prerendered with its gist, and the engine keeps it current.
	let { prop, level, where }: { prop: Prop; level: 2 | 4; where: string } = $props();
	// Bound only for a prop with a card.
	let dialog: HTMLDialogElement | undefined = $state();

	// A TV that plays by itself (a `status` prop with a video; Joe, 2026-10-01): the element the engine draws onto its
	// screen (props.ts) and plays while it is in view.
	let television: HTMLVideoElement | undefined = $state();
	// A card is its media over its copy: a video (VideoPlayer), logos (Logos) or screenshots (Screens, one of them alone a
	// plain image), each a component of its own taking its place here. Everything a card shows in words is its copy, any headline
	// included (Joe, 2026-10-01): its venue and title are there for assistive tech and the plain document alone. A
	// headline in the copy is Markdown's `#`, which here goes under the card's title in the page's headings.
	const copy = $derived(COPY[prop.id]?.replace(/<(\/?)h(\d)/g, (_, slash, n) => `<${slash}h${Math.min(6, +n + level)}`));
	// A remote another visitor of the room holds is off the table: nothing to press.
	const away = $derived(!!prop.tunes && tv.held === 'other');

	// Opening the card is the click (ticket 15), which plays its video: loaded only now, with sound, inside the gesture. An
	// `action` prop has no card: the engine hears its click. Nor does the click open a remote's: it asks the room for the
	// remote, and the engine opens the card for whoever the room says holds it (engine/tv.ts).
	function open() {
		if (!dialog || prop.tunes) return;
		dialog.showModal();
		// Its sound follows the Sound toggle and a hidden tab, as the Foundry screen's does.
		const video = dialog.querySelector('video');
		if (video) {
			sound.media(video);
			video.play().catch(() => {});
		}
		cardOpen(prop.id);
	}

	// A card's video (a Side Project bottle's) plays in its card alone, so it stops when the card closes and lets go of its
	// download (Joe, 2026-09-30). Served whole by the site's own host, which answers no byte range, a
	// paused video held its connection half read, and a few of them left the next card's video waiting behind them; from
	// the media host (videos.ts) it still has no call to go on downloading. Loaded with no source it drops what it held;
	// given its source back, with `preload="none"`, it fetches nothing until it next plays, from the start. (Chrome loads a
	// played video again at once if its source is left in place.)
	function close() {
		const video = dialog?.querySelector('video'), src = video?.getAttribute('src');
		if (!video || !src) return;
		video.pause();
		video.removeAttribute('src');
		video.load();
		video.setAttribute('src', src);
	}

	// The TV's channel: its video, named only here so that a page without the engine fetches none. A change of channel
	// lets go of the old video at once, the screen dark as between a set's channels, and names the new one when the
	// channel has been still for SETTLE, so surfing through ten channels starts one download.
	$effect(() => {
		const v = television;
		if (!v) return;
		const src = VIDEOS[TV[tv.channel]];
		if (v.getAttribute('src') === src) return;
		v.removeAttribute('src');
		v.load();
		const settled = setTimeout(() => v.setAttribute('src', src), SETTLE);
		return () => clearTimeout(settled);
	});
	// Leaving the scene lets go of its download too.
	$effect(() => {
		const v = television;
		return () => (v?.removeAttribute('src'), v?.load());
	});
</script>

<!-- The engine reads `data-prop` for the prop's hover and click reactions; its stylesheet clips the button to `--clip`. -->
{#if prop.kind === 'status'}
	<div class="prop status at" data-prop={prop.id} style={at(prop.rect)}>
		{#if prop.video}
			<p>{prop.name}: {prop.gist}, channel {tv.channel + 1} of {TV.length}</p>
			<video bind:this={television} hidden muted loop playsinline preload="none"></video>
		{:else}
			<p>{prop.name}: {prop.gist}</p>
		{/if}
		{#if prop.reels}
			<!-- The plain document's screen (Joe, 2026-10-02): no poster starts a reel without JavaScript, so each is a video
				of its own with the browser's controls, fetched only when played. -->
			<noscript>
				{#each prop.reels as reel}
					<figure class="reel">
						<figcaption><strong>{reel.name}</strong> {reel.line}</figcaption>
						<!-- svelte-ignore a11y_media_has_caption -->
						<video src={VIDEOS[reel.file]} controls playsinline preload="none"></video>
					</figure>
				{/each}
			</noscript>
		{/if}
	</div>
{:else}
	<div class="prop at" data-prop={prop.id} style={at(prop.rect)}>
		<button
			type="button"
			aria-haspopup={prop.kind ? undefined : 'dialog'}
			style={prop.clip && `--clip:${prop.clip}`}
			data-take={prop.tunes ? '' : undefined}
			disabled={away}
			onclick={open}
		>
			{prop.name}: {away ? 'another visitor has it' : prop.gist}
		</button>
		{#if !prop.kind}
			<!-- A card closes by the round X on its corner (Joe, 2026-09-30). A video card is the video with its copy, one short
				line, below it, and a See More button for a live site. The contents scroll inside the card, so the X can overhang it. -->
			<dialog bind:this={dialog} class:video={prop.video} class:remote={prop.tunes} aria-labelledby="card-{prop.id}-title" onclose={close}>
				{#if prop.tunes}
					<!-- A remote's card is the remote in hand: its title for assistive tech, then its buttons. -->
					<svelte:element this={`h${level}`} id="card-{prop.id}-title">{prop.name}</svelte:element>
					<Remote />
				{:else}
					<form method="dialog" class="x">
						<button class="secondary" aria-label="Close">
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
						</button>
					</form>
					<div class="scroll">
						<p class="where">{where}</p>
						<svelte:element this={`h${level}`} id="card-{prop.id}-title">{prop.name}</svelte:element>
						{#if prop.video}
							<VideoPlayer src={VIDEOS[prop.video.file]} captions={prop.video.captions} />
						{:else if prop.logos}
							<Logos logos={prop.logos} />
						{:else if prop.screens}
							<Screens screens={prop.screens} />
						{/if}
						{#if copy}
							<!-- Written by Joe in the site's own files, so trusted as its markup is. -->
							<div class="copy">{@html copy}</div>
						{/if}
						{#if prop.links}
							<ul>
								{#each prop.links as link}
									<li>
										<!-- An external link opens in a new tab (Joe, 2026-09-30); the browser gives it no opener. -->
										<a href={link.href} class={prop.video ? 'primary' : undefined} target={/^https?:/.test(link.href) ? '_blank' : undefined}>
											{link.label}
											<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8M9 8h7v7" /></svg>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</dialog>
		{/if}
	</div>
{/if}

<style>
	/*
	 * A card's contents on its night board (src/app.css; Joe, 2026-09-30): its media, its copy, a gold headline where the
	 * copy has one, and gold links with an arrow. They read the same in the engine's card and inline in the plain document
	 * (Joe, 2026-10-02).
	 */
	dialog {
		/* The venue is read, not shown: on the plain document its heading is just above. */
		& .where {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		/* The copy is Markdown's markup, which carries none of this component's classes. */
		& .copy {
			line-height: 1.55;

			/* A headline, Markdown's `#`, under the card's own title: h3 in a sub-scene and h5 on the overworld; `##` is smaller. */
			& :global(:is(h3, h4, h5, h6)) {
				margin-block: 0 0.75rem;
				color: var(--gold);
				font-size: 1.375rem;
				letter-spacing: 0.03em;
				line-height: 1.02;
				text-transform: uppercase;
			}

			& :global(:is(h3, h5)) {
				font-size: clamp(2rem, 1.4rem + 2vw, 2.75rem);
			}

			& :global(:is(p, ul, ol)) {
				margin-block: 0 0.75rem;
			}

			& :global(:is(ul, ol)) {
				padding-inline-start: 1.25rem;
			}

			& :global(:last-child) {
				margin-block-end: 0;
			}

			& :global(a) {
				border-radius: 0.25rem;
				color: var(--gold);
				font-weight: 500;
				text-decoration-thickness: 2px;
				text-underline-offset: 5px;
			}

			& :global(a:focus-visible) {
				outline: 3px solid var(--ivory);
				outline-offset: 3px;
			}
		}

		& ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0.625rem 1.25rem;
			margin-block: 1rem 0;
			padding: 0;
			list-style: none;
		}

		& a:not(.primary) {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			margin-inline: -0.25rem;
			padding-inline: 0.25rem;
			border-radius: 0.25rem;
			color: var(--gold);
			font-weight: 500;
			text-decoration-thickness: 2px;
			text-underline-offset: 5px;

			&:focus-visible {
				outline: 3px solid var(--ivory);
				outline-offset: 3px;
			}
		}

		& svg {
			inline-size: 1rem;
			block-size: 1rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		/* A live site's See More: the gold button at a card's size, its arrow beside the label. */
		& a.primary {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			padding-block: 0.5rem 0.55rem;
			padding-inline: 1.375rem;
			font-size: 1.1875rem;
		}

		/* A video card: the video the card's full width and a small line under it. */
		&.video .copy {
			margin-block-start: 0.75rem;
			font-size: 0.9375rem;
		}
	}

	/* The engine's card: 90 % of the viewport wide up to 860 px and at most 85 % tall, scrolling inside. */
	:global(html.engine) dialog {
		inline-size: min(90vw, 860px);
		max-inline-size: none;
		max-block-size: 85svh;
		overflow: visible;

		&[open] {
			display: flex;
			flex-direction: column;
		}

		/* Room inside the scrolling box for focus rings and a button's lip, which it would clip. */
		& .scroll {
			min-block-size: 0;
			margin: -0.5rem;
			padding: 0.5rem;
			overflow-y: auto;
		}

		/* The title is read, not shown: what a card shows in words is its copy. */
		& :is(h2, h4) {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		/*
		 * A remote's card is the remote itself (Remote.svelte; Joe, 2026-10-01): small, in the viewport's bottom corner, with
		 * the scene undimmed behind it, so the TV it tunes stays in sight.
		 */
		&.remote {
			inline-size: fit-content;
			margin-block: auto 1.5rem;
			margin-inline: auto 1.5rem;
			padding: 0;
			border: 0;
			background: none;
			box-shadow: none;

			&::backdrop {
				background: none;
			}
		}

		/* The X, centred on the card's top right corner (the outer corner of its border): the card's ivory-ringed Close, round
		   and filled with the night so it reads over the scene too. */
		& .x {
			position: absolute;
			inset-block-start: -2px;
			inset-inline-end: -2px;
			margin: 0;
			translate: 50% -50%;

			& button {
				--fill: var(--night);
				display: grid;
				place-items: center;
				inline-size: 2.5rem;
				block-size: 2.5rem;
				padding: 0;
				border-radius: 50%;
			}

			& svg {
				inline-size: 1.125rem;
				block-size: 1.125rem;
			}
		}
	}

	/*
	 * The plain document's card (Joe, 2026-10-02): no dialog's box, only its contents in the flow of the board app.css
	 * draws round it, the prop's name a sky label over them. Nothing opens or closes it, so its Close is gone; the
	 * <noscript> style in app.html shows it in place of its button, as the last rule here does when the engine couldn't start.
	 */
	:global(html:not(.engine)) dialog {
		position: static;
		inline-size: auto;
		max-inline-size: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;

		& .x {
			display: none;
		}

		& :is(h2, h4) {
			margin-block: 0 0.75rem;
			color: var(--sky);
			font-size: 1.125rem;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		/* The media no wider than reads well in a wide column. */
		& :global(:is(.player, .screens)) {
			max-inline-size: 44rem;
		}
	}

	/* A reel of the plain document's screen: a board as a card's is (app.css), its title the card's sky label, its line, its video. */
	.reel {
		box-sizing: border-box;
		margin: 0 0 1rem;
		padding: var(--board-pad);
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.75rem;
		background: var(--night);

		& figcaption {
			margin-block-end: 0.75rem;
		}

		& strong {
			display: block;
			margin-block-end: 0.5rem;
			color: var(--sky);
			font-family: var(--headline);
			font-size: 1.125rem;
			font-weight: 800;
			letter-spacing: 0.06em;
			line-height: 1.1;
			text-transform: uppercase;
		}

		& video {
			display: block;
			inline-size: 100%;
			max-inline-size: 44rem;
			border-radius: 0.375rem;
			background: #000;
		}
	}

	:global(html.plain) .prop {
		& > button,
		& > dialog.remote {
			display: none;
		}

		& > dialog:not(.remote) {
			display: block;
		}
	}
</style>
