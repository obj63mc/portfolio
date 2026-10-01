<script lang="ts">
	import { tv } from './tv.svelte.ts';
	import { TV } from './videos.ts';
</script>

<!--
	The Moosylvania lobby TV's remote in hand (Joe, 2026-10-01), an old set's: power, which puts it back on the table for
	the room, and channel up and down, nothing else. The engine hears the channel buttons (engine/tv.ts `data-tune`) and
	asks the room, which tunes the TV for everyone in it; the readout follows the room's channel. Opened on channel up,
	since power is first in the document and a stray Enter would put the remote straight back.
-->
<div class="body">
	<form method="dialog">
		<button class="power" aria-label="Power: put the remote back">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v7M7.5 7a7 7 0 1 0 9 0" /></svg>
		</button>
	</form>
	<output><span class="sr">Channel</span> {String(tv.channel + 1).padStart(2, '0')} <span class="sr">of {TV.length}</span></output>
	<!-- svelte-ignore a11y_autofocus -->
	<button class="key" data-tune="1" aria-label="Channel up" autofocus>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6l8 12H4z" /></svg>
	</button>
	<span class="label" aria-hidden="true">CH</span>
	<button class="key" data-tune="-1" aria-label="Channel down">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18L4 6h16z" /></svg>
	</button>
	<div class="grille" aria-hidden="true"></div>
</div>

<style>
	/*
	 * The remote on the meeting table, held up: the same cream slab, coral power button and dark teal keys (art/style.txt),
	 * with a lip under the slab and under each key that a press pushes down, as the site's buttons have.
	 */
	.body {
		--teal: #244f55;
		--teal-hot: #33707a;
		--coral: #df7554;
		--coral-hot: #ea9479;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		justify-items: center;
		gap: 0.625rem 0.5rem;
		inline-size: 8.5rem;
		padding: 0.875rem 0.875rem 1.125rem;
		border-radius: 1.125rem;
		background: var(--ivory);
		color: var(--teal);
		box-shadow: 0 0.4375rem 0 #cfc3a0, 0 1.375rem 2.75rem rgb(0 0 0 / 0.35);
	}

	form {
		justify-self: start;
		margin: 0;
	}

	button {
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		cursor: pointer;

		&:active {
			translate: 0 0.1875rem;
			box-shadow: 0 0.0625rem 0 var(--lip);
		}

		&:focus-visible {
			outline: 3px solid var(--night);
			outline-offset: 3px;
		}
	}

	.power {
		--fill-hot: var(--coral-hot);
		--ink: var(--ivory);
		--lip: #a8492e;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: 50%;
		background: var(--coral);
		color: var(--ivory);
		box-shadow: 0 0.25rem 0 var(--lip);

		& svg {
			inline-size: 1.375rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.6;
			stroke-linecap: round;
		}
	}

	/* The channel showing, as a set's two red digits behind a dark window. */
	output {
		justify-self: end;
		padding: 0.125rem 0.5rem 0.1875rem;
		border-radius: 0.375rem;
		background: var(--night);
		color: #ff5a4d;
		font-family: var(--headline);
		font-size: 1.625rem;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		letter-spacing: 0.08em;
		line-height: 1.1;
	}

	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.key {
		--fill-hot: var(--teal-hot);
		--ink: var(--ivory);
		--lip: #12292c;
		grid-column: 1 / -1;
		inline-size: 100%;
		block-size: 3.5rem;
		border-radius: 0.625rem;
		background: var(--teal);
		color: var(--ivory);
		box-shadow: 0 0.25rem 0 var(--lip);

		& svg {
			inline-size: 1.625rem;
			fill: currentColor;
		}
	}

	.label {
		grid-column: 1 / -1;
		font-family: var(--headline);
		font-size: 1.125rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		line-height: 1;
	}

	/* The speaker slots an old remote has none of, but its battery door's grip does. */
	.grille {
		grid-column: 1 / -1;
		inline-size: 60%;
		block-size: 1.125rem;
		margin-block-start: 0.375rem;
		background: repeating-linear-gradient(to bottom, #cfc3a0 0 0.1875rem, transparent 0.1875rem 0.4375rem);
	}
</style>
