<script lang="ts">
	// Big Muddy (Joe, 2026-10-01): Lunker Lake, the fishing game of the Punch Cigars and Bassmaster giveaway, rebuilt on the
	// site's type, colours and buttons, behind the angler on the Mississippi's Illinois bank, with no brand of its own and
	// nothing of the original's carried over but its rules (src/lib/big-muddy/rules.ts). The water is a 2D canvas
	// (big-muddy/draw.ts); everything round it is the page. The lure chases the mouse, or is steered by the arrow keys, A
	// and D, or a joystick under a finger. The original's leaderboard is the visitor's own ten heaviest catches, kept like
	// the Carondelet laps with the lure they have earned (saved.svelte.ts). The engine steps away while this page is up
	// (+layout.svelte), and its exit lands back at the angler.
	import { onMount, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { draw, type Art } from '$lib/big-muddy/draw';
	import { SPECIES, STEP, VIEW, afterCatch, afterSnag, depthOf, speciesOf, start, step, type Catch, type End, type Lure, type Run } from '$lib/big-muddy/rules';
	import { KEYS } from '$lib/engine/camera';
	import { saved } from '$lib/saved.svelte';
	import { BIG_MUDDY } from '$lib/scenes';
	import { sound } from '$lib/sound.svelte';

	// The cut-outs at their larger delivery size, as the art pipeline wrote them; none until it has.
	const IMG = import.meta.glob<string>('/art/generated/big-muddy/*/2.webp', { eager: true, query: '?no-inline', import: 'default' });
	const pic = (id: string) => IMG[`/art/generated/big-muddy/big-muddy-${id}/2.webp`];
	/** The how-to's picture: the river cut away at the waterline, the angler above and the three fish below. */
	const backdrop = Object.values(import.meta.glob<string>('/art/generated/big-muddy/big-muddy-master/image.webp', { eager: true, query: '?no-inline', import: 'default' }))[0];

	/** Where the game is: the how-to, a cast, how it ended, and the top ten. */
	type Screen =
		| { is: 'intro' }
		| { is: 'play' }
		| { is: 'result'; end: End; line: string; earned: boolean; lost: boolean; best: boolean }
		| { is: 'board' };

	/** The lures, the first to the last: plain kinds of lure, no maker's. */
	const LURE_NAMES = ['Spinner', 'Minnow', 'Crankbait', 'Big shad'] as const;
	/** What a result says, by the catch's size, and of a snag. */
	const LINES = {
		small: ['A keeper, if you squint.', 'The bait was bigger.', 'Back it goes, before anyone sees.', 'Still has its baby teeth.', 'Deeper. Much deeper.'],
		medium: ["Now that's supper.", 'Worth the photo.', 'Respectable. Now go deeper.', 'The river is warming up to you.'],
		big: ["That's a river monster.", 'They will talk about this one at the bait shop.', 'Get the big net.', 'One for the wall.'],
		snag: ['A sunken branch has your lure.', 'The river bites back.', 'That log has a collection going.', 'Driftwood one, you nil.']
	} as const;
	/** The mouse steers at full this far from the lure, units, and a joystick does nothing this near its middle. */
	const NEAR = 100, DEAD = 0.15;

	const reduced = new MediaQuery('prefers-reduced-motion: reduce');
	/** No mouse or trackpad: the joystick steers, as it does the cursor in a scene. */
	const fine = new MediaQuery('any-pointer: fine');
	const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	const any = <T,>(of: readonly T[]) => of[Math.floor(Math.random() * of.length)];

	let screen = $state<Screen>({ is: 'intro' });
	let paused = $state(false);
	/** What is kept is read once the page has mounted: the prerendered page knows no visitor. */
	let mounted = $state(false);
	let lure = $state<Lure>(1);
	let depth = $state(0);
	/** The catch just made, for its row in the top ten. */
	let last = $state<Catch | null>(null);
	/** A cast has been made this visit: the water shows, where the how-to's picture was. */
	let wet = $state(false);
	let joy = $state<{ id: number; from: number; r: number; pull: number } | null>(null);
	let canvas = $state<HTMLCanvasElement>();
	let heading = $state<HTMLElement>();
	let again = $state<HTMLButtonElement>();
	let pausedCard = $state<HTMLDialogElement>();
	/** The sound engine told of a press on this page, which it needs once when no Join came first. */
	let woke = false;

	// The cast itself is no state: the frame loop changes it 120 times a second, and the page shows only its depth.
	let run: Run | null = null;
	const art: Art = { fish: {} };
	const keys = new Set<string>();
	/** The mouse, units right of the lure; none once it leaves the water or a key steers. */
	let mouse: number | null = null;

	const catches = $derived(mounted ? saved.catches : []);
	const rank = $derived(last ? catches.findIndex((c) => c.at === last!.at && c.fish === last!.fish && c.lb === last!.lb) : -1);

	onMount(() => {
		mounted = true;
		lure = saved.lure;
		sound.game(BIG_MUDDY);
		for (const s of SPECIES) if (pic(s.id)) (art.fish[s.id] = new Image()).src = pic(s.id);
		return () => sound.game(null);
	});

	/** The canvas at the size it is shown, in device px up to two each, and the cast drawn on it as it stands. */
	function fit() {
		const c = canvas;
		if (!c || !c.clientWidth) return;
		const d = Math.min(2, devicePixelRatio);
		c.width = Math.round(c.clientWidth * d);
		c.height = Math.round(c.clientHeight * d);
		if (run) draw(c.getContext('2d')!, c.width, c.height, run, art, reduced.current);
	}

	$effect(() => {
		if (!canvas) return;
		const sized = new ResizeObserver(fit);
		sized.observe(canvas);
		return () => sized.disconnect();
	});

	/** How the lure is steered now, −1 to 1: the keys first, then the joystick's pull, then the mouse's side of the lure. */
	function steering() {
		const key = Math.sign([...keys].reduce((sum, code) => sum + KEYS[code].x, 0));
		if (key) return key;
		if (joy) {
			const m = Math.min(1, Math.abs(joy.pull) / joy.r);
			return m <= DEAD ? 0 : (Math.sign(joy.pull) * (m - DEAD)) / (1 - DEAD);
		}
		return mouse === null ? 0 : mouse / NEAR;
	}

	// The frame loop, while a cast is under way and not paused: as many steps of the rules as the frame's time holds, a
	// tenth of a second at most, so a tab left and come back to doesn't run the cast on without its player.
	$effect(() => {
		const c = canvas;
		if (screen.is !== 'play' || paused || !c || !run) return;
		const g = c.getContext('2d')!, cast = run;
		let then = performance.now(), owed = 0, frame = 0;
		const next = (now: number) => {
			owed = Math.min(owed + (now - then) / 1000, 0.1);
			then = now;
			let end: End | null = null;
			for (; owed >= STEP && !end; owed -= STEP) end = step(cast, steering(), Math.random);
			draw(g, c.width, c.height, cast, art, reduced.current);
			const d = depthOf(cast.y);
			if (d !== depth) depth = d;
			if (end) return finish(end);
			frame = requestAnimationFrame(next);
		};
		frame = requestAnimationFrame(next);
		return () => cancelAnimationFrame(frame);
	});

	/** A cast on the lure held: the splash, the water's bed under the music, and the lure on its way down. */
	async function cast() {
		run = start(lure, Math.random);
		depth = depthOf(run.y);
		keys.clear();
		mouse = null;
		joy = null;
		paused = false;
		wet = true;
		screen = { is: 'play' };
		sound.play('splash');
		sound.service(true);
		await tick();
		fit();
	}

	/** The cast's end: a catch kept if it makes the top ten and the next lure if it earns it, or a lure lost to a snag. */
	async function finish(end: End) {
		const was = lure;
		sound.service(false);
		if (end.is === 'caught') {
			last = { fish: end.fish, lb: end.lb, depth: end.depth, at: Date.now() };
			lure = afterCatch(was, end.lb);
			const best = saved.caught(last), earned = lure > was;
			screen = { is: 'result', end, line: any(end.lb >= 30 ? LINES.big : end.lb >= 10 ? LINES.medium : LINES.small), earned, lost: false, best };
			sound.play(earned ? 'lure-up' : 'star');
		} else {
			last = null;
			lure = afterSnag(was);
			screen = { is: 'result', end, line: any(LINES.snag), earned: false, lost: lure < was, best: false };
			sound.play('snag');
		}
		saved.lure = lure;
		await tick();
		again?.focus();
	}

	async function show(next: { is: 'intro' } | { is: 'board' }) {
		screen = next;
		await tick();
		heading?.focus();
	}

	function pause() {
		if (screen.is !== 'play' || paused) return;
		paused = true;
		keys.clear();
		joy = null;
		pausedCard?.showModal();
	}

	/** The Paused card closed, by its button or Esc: the cast goes on, and the sound a hidden tab stopped starts again. */
	function resume() {
		paused = false;
		sound.resume();
	}

	function keydown(e: KeyboardEvent) {
		if (screen.is !== 'play' || paused || e.metaKey || e.ctrlKey || e.altKey) return;
		// Kept from the browser, or the same press would close the card it has just opened.
		if (e.code === 'Escape') return e.preventDefault(), pause();
		if (!KEYS[e.code]?.x) return;
		e.preventDefault();
		keys.add(e.code);
		mouse = null;
	}
</script>

<svelte:head>
	<title>Big Muddy | BarMadden.com</title>
	<meta name="description" content="Big Muddy: sink a lure into the Mississippi, steer it past the snags and land the heaviest fish you can. A fishing game on Joseph Madden's portfolio." />
</svelte:head>

<svelte:window onkeydown={keydown} onkeyup={(e) => keys.delete(e.code)} onblur={() => keys.clear()} />
<svelte:document onvisibilitychange={() => document.hidden && pause()} />

<!-- Every press taps. On a page opened straight from its URL no Join came first, so the first press is the one that lets
	the sound start. -->
<div
	class="muddy game"
	data-screen={screen.is}
	role="presentation"
	onclick={(e) => {
		if (!(e.target as Element).closest('button, a')) return;
		if (!woke) (woke = true), sound.join();
		sound.play('tap');
	}}
>
	<header>
		<p class="logo">Big Muddy</p>
		{#if screen.is === 'play'}
			<button type="button" class="pause" aria-haspopup="dialog" onclick={pause}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6v12M15.5 6v12" /></svg>
				<span>Pause</span>
			</button>
		{/if}
		<a class="exit" href="/#{BIG_MUDDY}">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
			<span>Back to the riverbank</span>
		</a>
	</header>
	<!-- Without JavaScript there is no game: what it is, in place of it (Joe, 2026-10-02; app.html hides the rest). -->
	<noscript>
		<section class="board plain">
			<h1>Big Muddy</h1>
			<p>A fishing game: sink a lure into the Mississippi, steer it past the snags and land the heaviest fish you can.</p>
			<p>Turn on JavaScript to play.</p>
			<div class="cta"><a class="secondary" href="/#{BIG_MUDDY}">Back to the riverbank</a></div>
		</section>
	</noscript>
	<dialog class="card" aria-labelledby="paused-title" bind:this={pausedCard} onclose={resume}>
		<h2 id="paused-title">Paused</h2>
		<p>Your lure is holding at {depth}&nbsp;ft.</p>
		<form method="dialog">
			<button class="primary">Resume</button>
		</form>
	</dialog>

	<!-- The water: the canvas once a cast has been made, steered by the mouse over it; the how-to's picture before. -->
	<div
		class="water"
		class:wet
		style:--backdrop={backdrop && `url(${backdrop})`}
		role="presentation"
		onpointermove={(e) => {
			if (e.pointerType === 'touch' || !canvas) return;
			const r = canvas.getBoundingClientRect();
			mouse = (e.clientX - r.x - r.width / 2) / (r.height / VIEW.h);
		}}
		onpointerleave={() => (mouse = null)}
	>
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
		{#if wet}
			<dl class="hud">
				<div>
					<dt>Lure</dt>
					<dd>
						<span class="pips" aria-hidden="true">{#each LURE_NAMES as _, i}<i class:on={i < lure}></i>{/each}</span>
						<span class="sr">{lure} of 4, the</span>
						{LURE_NAMES[lure - 1]}
					</dd>
				</div>
				<div>
					<dt>Depth</dt>
					<dd>{depth}&nbsp;ft</dd>
				</div>
				<div>
					<dt>Heaviest</dt>
					<dd>{catches[0]?.lb ?? 0}&nbsp;lb</dd>
				</div>
			</dl>
		{/if}
		{#if screen.is === 'play' && !fine.current}
			<!-- Hidden from assistive tech, as the scenes' joystick is: a keyboard steers with the keys. -->
			<div
				class="joystick on"
				aria-hidden="true"
				onpointerdown={(e) => {
					if (joy) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					joy = { id: e.pointerId, from: e.clientX, r: e.currentTarget.getBoundingClientRect().width / 2, pull: 0 };
				}}
				onpointermove={(e) => {
					if (joy?.id === e.pointerId) joy.pull = e.clientX - joy.from;
				}}
				onpointerup={(e) => joy?.id === e.pointerId && (joy = null)}
				onpointercancel={(e) => joy?.id === e.pointerId && (joy = null)}
			>
				<div style:translate="{joy ? Math.max(-joy.r, Math.min(joy.r, joy.pull)) : 0}px 0"></div>
			</div>
		{/if}

		{#if screen.is !== 'play'}
			<div class="over">
				{#if screen.is === 'intro'}
					<section class="board" aria-labelledby="muddy-title">
						<h1 id="muddy-title" tabindex="-1" bind:this={heading}>Big Muddy</h1>
						<p class="lead">Deeper water, bigger fish.</p>
						<ol class="how">
							<li>Cast, and your lure sinks by itself</li>
							<li>Steer it with the mouse, the arrow keys, or the joystick on a phone</li>
							<li>Hook a fish: the deeper it swims, the heavier it is</li>
							<li>Dodge the snags, or the river keeps your lure</li>
							<li>A big catch earns a faster lure</li>
						</ol>
						<div class="cta">
							<button type="button" class="primary" onclick={cast}>Cast</button>
							{#if catches.length}
								<button type="button" class="secondary" onclick={() => show({ is: 'board' })}>Your top 10</button>
							{/if}
						</div>
					</section>
				{:else if screen.is === 'result'}
					{@const end = screen.end}
					<div class="board" role="dialog" aria-labelledby="muddy-title" aria-describedby="muddy-result">
						{#if end.is === 'caught'}
							<h1 id="muddy-title">{end.lb}&nbsp;lb {speciesOf(end.fish).name}</h1>
						{:else}
							<h1 id="muddy-title" class="snagged">Snagged</h1>
						{/if}
						<div id="muddy-result">
							<p class="lead">{screen.line}</p>
							<p>
								{end.is === 'caught' ? 'Caught' : 'Lost'} at {end.depth}&nbsp;ft.
								{#if screen.best}<strong class="best">Your heaviest yet!</strong>{/if}
							</p>
							{#if screen.earned}
								<p class="lure">You've earned the <strong>{LURE_NAMES[lure - 1]}</strong>, lure {lure} of 4: it sinks faster, so the big ones are closer.</p>
							{:else if screen.lost}
								<p class="lure">The river keeps that one. You're back to the <strong>{LURE_NAMES[lure - 1]}</strong>, lure {lure} of 4.</p>
							{/if}
						</div>
						<div class="cta">
							<button type="button" class="primary" bind:this={again} onclick={cast}>Cast again</button>
							{#if catches.length}
								<button type="button" class="secondary" onclick={() => show({ is: 'board' })}>Your top 10</button>
							{/if}
						</div>
					</div>
				{:else}
					<section class="board" aria-labelledby="muddy-title">
						<h1 id="muddy-title" tabindex="-1" bind:this={heading}>Your top 10</h1>
						{#if catches.length}
							<ol class="top">
								{#each catches as c, i (`${c.at}-${c.fish}-${c.lb}`)}
									<li class:this={i === rank}>
										<span>{i + 1}</span>
										<span>{speciesOf(c.fish).name}</span>
										<span>{c.lb}&nbsp;lb</span>
										<span>{c.depth}&nbsp;ft · {i === rank ? 'this cast' : day.format(c.at)}</span>
									</li>
								{/each}
							</ol>
						{:else}
							<p>Nothing landed yet.</p>
						{/if}
						<p class="small">Your top 10 stays on this device.</p>
						<div class="cta">
							<button type="button" class="primary" onclick={cast}>{wet ? 'Cast again' : 'Cast'}</button>
							<a class="secondary" href="/#{BIG_MUDDY}">Back to the riverbank</a>
						</div>
					</section>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/*
	 * The game over the whole window, like a scene of its own: the site's night header over the water, which is the
	 * canvas, and over that a night board framed in ivory like the cards, gold headlines and buttons, as Sushi Stand's are.
	 */
	.muddy {
		--board-pad: clamp(1.25rem, 0.8rem + 2vw, 2.25rem);
		position: fixed;
		inset: 0;
		z-index: 0;
		display: flex;
		flex-direction: column;
		background: #188f8a;
		color: var(--ivory);
		font-family: var(--body);
		animation: open 0.6s ease-out;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	/* The page opens out of the angler's iris, a circle from the middle. */
	@keyframes open {
		from {
			clip-path: circle(0 at 50% 50%);
		}
		to {
			clip-path: circle(150% at 50% 50%);
		}
	}

	header {
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-block: 0.5rem;
		padding-inline: 1rem;
		background: var(--night);
		box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.2);
	}

	.logo {
		margin: 0;
		color: var(--gold);
		font-family: var(--headline);
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		line-height: 1;
		text-transform: uppercase;
	}

	/* The header's two round buttons, at its end: Pause while the lure is down, and the way out. */
	:is(.exit, .pause) {
		display: grid;
		place-items: center;
		flex: none;
		margin-inline-start: auto;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ivory);
		box-shadow: inset 0 0 0 2px rgb(255 244 212 / 0.5);
		cursor: pointer;

		&:hover {
			background: var(--ivory);
			color: var(--night);
		}

		&:focus-visible {
			outline: 3px solid var(--gold);
			outline-offset: 2px;
		}

		& svg {
			inline-size: 1.25rem;
			block-size: 1.25rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.4;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	.pause + .exit {
		margin-inline-start: 0;
	}

	:is(.exit, .pause) span,
	.sr {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Before the first cast the water is the title picture, its waterline a third down wherever the window crops it. */
	.water {
		position: relative;
		flex: 1;
		min-block-size: 0;
		background: var(--backdrop, none) center 30% / cover no-repeat;
	}

	/* app.css keeps every canvas out of the document until the engine starts; this one is the page's own. */
	canvas {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		touch-action: none;
	}

	.wet canvas {
		display: block;
	}

	.joystick {
		touch-action: none;
	}

	/* The lure held, the depth and the heaviest catch, across the top of the water: read, never pressed. */
	.hud {
		position: absolute;
		inset-block-start: 0.75rem;
		inset-inline: 0.75rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: space-between;
		margin: 0;
		pointer-events: none;

		& div {
			padding-block: 0.3rem 0.4rem;
			padding-inline: 0.75rem;
			border-radius: 0.5rem;
			background: rgb(29 43 58 / 0.78);
		}

		& dt {
			color: var(--sky);
			font-family: var(--headline);
			font-size: 0.8125rem;
			font-weight: 800;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		& dd {
			display: flex;
			gap: 0.5rem;
			align-items: center;
			margin: 0;
			font-family: var(--headline);
			font-size: 1.375rem;
			font-weight: 800;
			line-height: 1.1;
			font-variant-numeric: tabular-nums;
		}
	}

	.pips {
		display: flex;
		gap: 0.2rem;

		& i {
			inline-size: 0.5rem;
			block-size: 0.5rem;
			border-radius: 50%;
			box-shadow: inset 0 0 0 1.5px var(--ivory);

			&.on {
				background: #df7554;
				box-shadow: none;
			}
		}
	}

	/* A board over the water: centred, scrolling when a small window can't hold it, clear of the Sound toggle below. */
	.over {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		overflow-y: auto;
		box-sizing: border-box;
		padding-block: 1.5rem 5rem;
		padding-inline: 1rem;
	}

	.wet .over {
		background: rgb(29 43 58 / 0.35);
	}

	:is(.board, .card) {
		box-sizing: border-box;
		padding: var(--board-pad);
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.75rem;
		background: var(--night);
		color: var(--ivory);
		box-shadow: 0 0 0 7px var(--night), 0 1.375rem 2.75rem rgb(0 0 0 / 0.3);

		& :is(h1, h2) {
			margin-block: 0 0.75rem;
			color: var(--gold);
			font-size: clamp(2.25rem, 1.5rem + 2.5vw, 3.25rem);
			letter-spacing: 0.03em;
			line-height: 1.02;
			text-transform: uppercase;
			outline: none;
		}

		& h1.snagged {
			color: #ff9a7d;
		}

		& p {
			margin-block: 0 0.75rem;
			max-inline-size: 60ch;
			line-height: 1.55;
		}

		& .lead {
			font-size: 1.125rem;
		}

		& .small {
			font-size: 0.875rem;
		}

		& .best {
			color: var(--gold);
		}

		& .lure {
			padding-block: 0.625rem;
			padding-inline: 0.875rem;
			border-radius: 0.5rem;
			background: rgb(255 244 212 / 0.1);
		}
	}

	.board {
		inline-size: min(100%, 36rem);
	}

	.card h2 {
		font-size: 2rem;
	}

	.plain {
		margin-block: 1.5rem;
		margin-inline: auto;
		inline-size: min(100% - 2rem, 36rem);
	}

	.how {
		display: grid;
		gap: 0.5rem;
		margin-block: 1rem 0;
		padding-inline-start: 1.5rem;
		line-height: 1.45;

		& li::marker {
			color: var(--gold);
			font-family: var(--headline);
			font-weight: 800;
		}
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.25rem;
		align-items: center;
		margin-block-start: 2rem;
	}

	/* A link dressed as the ivory-outlined secondary button, which app.css gives buttons alone. */
	a:global(.secondary) {
		--fill: transparent;
		--fill-hot: var(--ivory);
		--ink: var(--ivory);
		--ink-hot: var(--night);
		--edge: inset 0 0 0 2px rgb(255 244 212 / 0.8);
		--edge-pressed: var(--edge);
		padding-block: 0.5rem 0.55rem;
		padding-inline: 1.375rem;
		font-size: 1.1875rem;
	}

	/* The site's buttons (app.css) lift to their lighter fill under the mouse here too; the engine's hover mark is off on this page. */
	:is(button, a):is(:global(.primary), :global(.secondary)):not(:disabled):hover {
		background: var(--fill-hot);
		color: var(--ink-hot, var(--ink));
	}

	/* The top ten as the lap board lists laps: rank, fish, weight, then depth and day, this cast's row gold. */
	.top {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		margin: 1rem 0;
		padding: 0;
		font-variant-numeric: tabular-nums;
		list-style: none;

		& li {
			display: grid;
			grid-column: 1 / -1;
			grid-template-columns: subgrid;
			column-gap: 1rem;
			align-items: baseline;
			padding-block: 0.375rem;
			padding-inline: 0.75rem;
			border-radius: 0.375rem;

			& span:nth-child(1) {
				text-align: end;
				opacity: 0.7;
			}

			& span:nth-child(2) {
				overflow: hidden;
				font-family: var(--headline);
				font-size: 1.25rem;
				font-weight: 800;
				letter-spacing: 0.03em;
				text-overflow: ellipsis;
				text-transform: uppercase;
				white-space: nowrap;
			}

			& span:nth-child(3) {
				font-weight: 700;
				text-align: end;
			}

			& span:nth-child(4) {
				font-size: 0.8125rem;
				text-align: end;
				opacity: 0.75;
			}

			&.this {
				background: var(--gold);
				color: var(--night);

				& span {
					opacity: 1;
				}
			}
		}

		/* On a phone the depth and the day go under the fish, whose name then has the row's width. */
		@media (width < 36rem) {
			grid-template-columns: auto minmax(0, 1fr) auto;

			& li span:nth-child(4) {
				grid-column: 2 / -1;
				text-align: start;
			}
		}
	}
</style>
