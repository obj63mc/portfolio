<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { board, clock } from './board.svelte.ts';
	import { saved } from './saved.svelte.ts';

	// The Carondelet lap board (Joe, 2026-09-30): for a few seconds after each finished lap, top left under the lap clock,
	// the lap's time, large, over the visitor's top ten, the lap itself marked if it made the list. The engine's lap timer
	// shows and hides it (engine/laps.ts). The live region announces the finish, so the board is for the eye only, and the
	// cursor passes over it: a lap runs on while it is up.
	const reduced = new MediaQuery('prefers-reduced-motion: reduce');
	const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
	const lap = $derived(board.lap);
	const rank = $derived(lap ? saved.laps.findIndex((l) => l.ms === lap.ms && l.at === lap.at) : -1);
	/** How far off the personal best a lap that isn't one is, in tenths, between the times as the board shows them. */
	const gap = $derived(lap && !lap.best && saved.laps.length ? Math.floor(lap.ms / 100) - Math.floor(saved.laps[0].ms / 100) : 0);
</script>

{#if lap}
	{#key lap.at}
		<section class="board" class:best={lap.best} aria-hidden="true" out:fade={{ duration: reduced.current ? 0 : 400 }}>
			<p class="head">{lap.best ? 'New personal best' : 'Lap complete'}</p>
			<p class="time">{clock(lap.ms)}</p>
			{#if gap > 0}
				<p class="note">+{(gap / 10).toFixed(1)} s off your best</p>
			{/if}
			{#if saved.laps.length}
				<h2>Your top 10</h2>
				<ol>
					{#each saved.laps as l, i (`${l.ms}-${l.at}`)}
						<li class:this={i === rank}>
							<span>{i + 1}</span>
							<span>{clock(l.ms)}</span>
							<span>{i === rank ? 'this lap' : day.format(l.at)}</span>
						</li>
					{/each}
				</ol>
			{/if}
			{#if rank < 0}
				<p class="note">This lap didn't make your top 10</p>
			{/if}
		</section>
	{/key}
{/if}

<style>
	/* Dark teal and ivory like the lap clock above it, gold for a new best and for the lap's own row. */
	.board {
		position: fixed;
		inset-block-start: 3.5rem;
		inset-inline-start: 1rem;
		box-sizing: border-box;
		inline-size: min(17rem, 100% - 2rem);
		padding-block: 1rem 1.125rem;
		padding-inline: 1.25rem;
		border-radius: 1rem;
		background: rgb(36 79 85 / 0.94);
		box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.25);
		color: #fff4d4;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
		animation: drop 0.3s ease-out;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}

		& p,
		& h2,
		& ol {
			margin: 0;
		}

		& .head,
		& h2 {
			color: #87cdd5;
			font-size: 0.8125rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		& .time {
			font-size: 2.75rem;
			font-weight: 800;
			line-height: 1.1;
		}

		&.best :is(.head, .time) {
			color: #ffd34f;
		}

		& .note {
			margin-block-start: 0.375rem;
			font-size: 0.875rem;
			opacity: 0.8;
		}

		& h2 {
			margin-block-start: 0.875rem;
			padding-block-start: 0.75rem;
			border-block-start: 1px solid rgb(255 244 212 / 0.2);
		}

		& ol {
			display: grid;
			grid-template-columns: auto 1fr auto;
			margin-block-start: 0.375rem;
			padding: 0;
			list-style: none;
		}

		& li {
			display: grid;
			grid-column: 1 / -1;
			grid-template-columns: subgrid;
			column-gap: 0.75rem;
			align-items: baseline;
			padding-block: 0.125rem;
			padding-inline: 0.5rem;
			border-radius: 0.375rem;

			& span:first-child {
				text-align: end;
				opacity: 0.7;
			}

			& span:last-child {
				font-size: 0.8125rem;
				text-align: end;
				opacity: 0.75;
			}

			&.this {
				background: #ffd34f;
				color: #244f55;
				font-weight: 700;

				& span {
					opacity: 1;
				}
			}
		}
	}

	@keyframes drop {
		from {
			opacity: 0;
			translate: 0 -0.75rem;
		}
	}
</style>
