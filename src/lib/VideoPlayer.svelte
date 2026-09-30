<script lang="ts">
	// A card's video with the site's own controls (Joe, 2026-09-30): the drawn cursor under the pointer lock can't reach a
	// browser's native controls, which answer only the real mouse, so these are plain buttons and a slider that it can.
	let { src, captions }: { src: string; captions?: string } = $props();
	let player: HTMLDivElement | undefined = $state();
	let paused = $state(true), time = $state(0), duration = $state(0), muted = $state(false), full = $state(false);
	// iPhone Safari fullscreens only a video, with its own controls; there the button is left out, and in the prerender.
	let canFull = $state(false);
	$effect(() => void (canFull = document.fullscreenEnabled));

	const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
	const toggle = (v: HTMLVideoElement | null | undefined) => v && void (v.paused ? v.play().catch(() => {}) : v.pause());
</script>

<svelte:document onfullscreenchange={() => (full = !!player && document.fullscreenElement === player)} />

<!-- The bar shows while the cursor is over the player (hovered, or marked `.hot` by the engine under the lock), while it
	is paused or holds focus, and always on touch. -->
<div class="player" class:paused bind:this={player}>
	<!-- svelte-ignore a11y_media_has_caption, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<video {src} preload="none" playsinline bind:paused bind:currentTime={time} bind:duration bind:muted onclick={(e) => toggle(e.currentTarget)}>
		{#if captions}
			<track kind="captions" src={captions} srclang="en" label="English" default />
		{/if}
	</video>
	<div class="bar">
		<button type="button" aria-label={paused ? 'Play' : 'Pause'} onclick={() => toggle(player?.querySelector('video'))}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if paused}
					<path class="solid" d="M7 4.5v15l12-7.5z" />
				{:else}
					<path class="solid" d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" />
				{/if}
			</svg>
		</button>
		<input type="range" min="0" max={duration || 0} step="0.1" bind:value={time} aria-label="Seek" aria-valuetext="{clock(time)} of {clock(duration)}" />
		<span class="time">{clock(time)} / {clock(duration)}</span>
		<button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => (muted = !muted)}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path class="solid" d="M3 9h4l5-4v14l-5-4H3z" />
				{#if muted}
					<path d="M16 9.5l5 5M21 9.5l-5 5" />
				{:else}
					<path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
				{/if}
			</svg>
		</button>
		{#if canFull}
			<button type="button" aria-label={full ? 'Exit full screen' : 'Full screen'} onclick={() => (full ? document.exitFullscreen() : player?.requestFullscreen())}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					{#if full}
						<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
					{:else}
						<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
					{/if}
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.player {
		position: relative;
		overflow: hidden;
		border-radius: 0.375rem;
		background: #000;

		&:fullscreen {
			display: grid;
			align-content: center;
			border-radius: 0;
		}
	}

	video {
		display: block;
		inline-size: 100%;
		max-block-size: 100vh;
		cursor: pointer;
	}

	/* Over the foot of the video on a night fade: ivory icons that light gold, the gold slider and the time. */
	.bar {
		--fill-hot: transparent;
		--ink-hot: var(--gold);
		position: absolute;
		inset-inline: 0;
		inset-block-end: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-block: 1.5rem 0.5rem;
		padding-inline: 0.625rem;
		background: linear-gradient(transparent, rgb(29 43 58 / 0.7) 40%, rgb(29 43 58 / 0.95));
		color: var(--ivory);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.player:global(.hot) .bar,
	.player:is(.paused, :focus-within) .bar,
	:global(html:not([data-input='locked'], [data-input='touch'])) .player:hover .bar,
	:global(html[data-input='touch']) .bar {
		opacity: 1;
	}

	button {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: inherit;
		cursor: pointer;

		&:focus-visible {
			outline: 3px solid var(--ivory);
			outline-offset: 1px;
		}
	}

	svg {
		inline-size: 1.375rem;
		block-size: 1.375rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.solid {
		fill: currentColor;
		stroke-width: 1.5;
	}

	input {
		flex: 1;
		min-inline-size: 0;
		margin: 0;
		accent-color: var(--gold);
		cursor: pointer;
	}

	.time {
		flex: none;
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
</style>
