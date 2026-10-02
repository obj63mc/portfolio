<script lang="ts">
	// Sushi Stand (Joe, 2026-09-30): Sushi Star, the 2018 International Sushi Day game made for Sapporo, rebuilt on the
	// site's type, colours and buttons, behind the koi in Forest Park's Grand Basin, with no brand of its own: the
	// happy hour's six-pack is drawn here (six-pack.svg). Its rules are src/lib/sushi/rules.ts; its other art is the
	// original's (src/lib/sushi/img), the stand's sign and the logo lettered here rather than in the pictures. The original's global leaderboard is the visitor's own top ten, kept like the Carondelet laps
	// (saved.svelte.ts). The engine steps away while this page is up (+layout.svelte), and its exit lands back at the koi.
	// A game left unfinished is kept with them (sushi/game.ts) and carried on from where it was left; Start over, in the
	// header, drops it for a new one.
	import { onMount, tick, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { saved } from '$lib/saved.svelte';
	import { sound } from '$lib/sound.svelte';
	import type { Stand } from '$lib/saved';
	import { SUSHI } from '$lib/scenes';
	import { NAME_MAX, type Game, type Kept, type Meal } from '$lib/sushi/game';
	import {
		BOOST_COST, DAYS, FISH, PIECES_PER_LB, conditions, dinner, dollars, expenses, lunch, market, pieceCost, profit, total,
		type Boost, type Conditions, type Day, type FishId, type Item, type Sold
	} from '$lib/sushi/rules';
	import lunchVideo from '$lib/sushi/lunch.mp4';
	import dinnerVideo from '$lib/sushi/dinner.mp4';
	import sixPack from '$lib/sushi/six-pack.svg?no-inline';

	const IMG = import.meta.glob<string>('/src/lib/sushi/img/*.webp', { eager: true, query: '?no-inline', import: 'default' });
	const img = (name: string) => IMG[`/src/lib/sushi/img/${name}.webp`];

	/**
	 * Where the game is: the how-to and the name, then each day's steps (those a game can be left at, and a service's
	 * film), then the five days' results and the top ten.
	 */
	type Step = { is: 'how' } | { is: 'name' } | Kept | { is: 'service'; meal: Meal } | { is: 'final' } | { is: 'board' };

	/** The tracker's six steps of a day, by the step each lights. */
	const STAGES = ['Fish market', 'Price lunch', 'Lunch service', 'Boost sales', 'Price dinner', 'Dinner service'];
	const stage = (s: Step) =>
		s.is === 'market' ? 1
		: s.is === 'price' ? (s.meal === 'lunch' ? 2 : 5)
		: s.is === 'service' || s.is === 'sales' ? (s.meal === 'lunch' ? 3 : 6)
		: s.is === 'boost' ? 4
		: s.is === 'day' ? 7
		: 0;

	const HAPPENINGS = {
		competition: { img: 'competition', head: 'New competition opened down the street', body: 'Competition for customers is up. Expect a dip in business.' },
		sick: { img: 'employee-absence', head: 'A chef called in sick', body: 'One of your chefs called off work. Expect service to be slow.' },
		review: { img: 'review', head: 'A great review', body: 'People are going to want to try your famous sushi!' },
		festival: { img: 'festival', head: 'Outdoor festival nearby', body: 'Foot traffic should be up around your stand.' }
	} as const;

	const BOOSTS = [
		{ key: 'special', head: 'Happy hour special', cost: dollars(BOOST_COST.special), body: 'Run a beer happy hour. You discount the drinks, but you bring in more customers.', art: sixPack },
		{ key: 'ads', head: 'Advertise your stand', cost: dollars(BOOST_COST.ads), body: 'Build awareness and foot traffic by taking out an ad.', art: img('advertise') },
		{ key: 'discount', head: 'Buy 1, get 1 half off', cost: '−25% of dinner sales', body: 'More customers order with a discount on their second piece.', art: img('bogo') }
	] as const satisfies readonly { key: keyof Boost; head: string; cost: string; body: string; art: string }[];

	const reduced = new MediaQuery('prefers-reduced-motion: reduce');
	const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	const count = (n: number) => n.toLocaleString('en-US');
	const cents = (n: number) => `$${n.toFixed(2)}`;
	const noBoost = (): Boost => ({ special: false, ads: false, discount: false });

	let step = $state<Step>({ is: 'how' });
	let name = $state('');
	let dayNo = $state(1);
	let today = $state<Conditions>(conditions(1, Math.random));
	let prices = $state(market(Math.random));
	/** The pounds and prices asked for, kept from one day to the next as the original did. */
	let order = $state(Object.fromEntries(FISH.map((f) => [f.id, { lbs: 0, price: 0 }])) as Record<FishId, { lbs: number; price: number }>);
	let items = $state<Item[]>([]);
	let mix = 1;
	let spent = 0;
	let sold = $state<Record<Meal, Sold[]>>({ lunch: [], dinner: [] });
	let boosting = $state<boolean | null>(null);
	let boost = $state<Boost>(noBoost());
	let days = $state<{ day: Day; profit: number }[]>([]);
	/** This game's entry in the top ten, once finished, and whether it was a new best. */
	let finished = $state<{ stand: Stand; best: boolean } | null>(null);
	let heading = $state<HTMLElement>();
	/** Start over's card, asking first: a game in progress is five days' work. */
	let restart = $state<HTMLDialogElement>();
	/** The sound engine told of a press on this page, which it needs once when no Join came first. */
	let woke = false;

	/** The step a game is kept at: none outside a day's steps, and a service's film as its sales, made as it started. */
	const kept = (s: Step): Kept | null =>
		s.is === 'how' || s.is === 'name' || s.is === 'final' || s.is === 'board' ? null : s.is === 'service' ? { is: 'sales', meal: s.meal } : s;
	/** A day is under way: the game is kept as it stands, and can be started over. */
	const playing = $derived(!!kept(step));
	const night = $derived(step.is === 'boost' || step.is === 'day' || ((step.is === 'price' || step.is === 'service' || step.is === 'sales') && step.meal === 'dinner'));
	const bought = $derived(FISH.reduce((s, f) => s + prices[f.id] * order[f.id].lbs, 0));
	const standName = $derived(name.trim() || 'Sushi Stand');
	const fishOf = (id: FishId) => FISH.find((f) => f.id === id)!;

	// Its music plays while the page is up, the restaurant's bed under a service and its sales (sound.svelte.ts `game`).
	// A game left unfinished carries on from its step, once the page has mounted: the prerendered page opens on the how-to.
	onMount(() => {
		sound.game(SUSHI);
		// A copy: the page changes its own, and what is stored changes only by a write.
		if (saved.game) resume(structuredClone(saved.game));
		return () => sound.game(null);
	});

	/** Picks a kept game up where it was left, with none of the step's sounds but a service's bed. */
	function resume(g: Game) {
		({ name, dayNo, today, prices, order, items, mix, spent, sold, boosting, boost } = g);
		days = g.days.map((day) => ({ day, profit: profit(day) }));
		step = g.step;
		sound.service(g.step.is === 'sales');
	}

	// The game is kept as it stands at every change, a pound ordered or a price set included, never on the way out
	// (saved.svelte.ts).
	$effect(() => {
		const at = kept(step);
		if (!at) return;
		const game: Game = $state.snapshot({ name, dayNo, step: at, today, prices, order, items, mix, spent, sold, boosting, boost, days: days.map((d) => d.day) });
		untrack(() => (saved.game = game));
	});

	/**
	 * Every step change starts at the top with its heading focused, as a new page would, and sounds its moment: the doors'
	 * bell as a service opens, the register on its sales, the day's profit or loss, the star at the end, a storm coming.
	 */
	async function go(next: Step) {
		step = next;
		sound.service(next.is === 'service' || next.is === 'sales');
		const cue =
			next.is === 'service' ? 'service-bell'
			: next.is === 'sales' ? 'register'
			: next.is === 'day' ? ((days.at(-1)?.profit ?? 0) > 0 ? 'profit' : 'loss')
			: next.is === 'final' ? 'star'
			: next.is === 'outlook' && today.weather === 'bad' ? 'rain'
			: null;
		if (cue) sound.play(cue);
		await tick();
		document.querySelector('.sushi')?.scrollTo(0, 0);
		heading?.focus();
	}

	/** Start over's card, its answer cleared: Esc leaves the last one standing. */
	function openRestart() {
		if (!restart) return;
		restart.returnValue = '';
		restart.showModal();
	}

	function newGame() {
		saved.game = null;
		name = '';
		dayNo = 1;
		days = [];
		finished = null;
		for (const f of FISH) order[f.id] = { lbs: 0, price: 0 };
		void go({ is: 'name' });
	}

	function openDay() {
		today = conditions(dayNo, Math.random);
		prices = market(Math.random);
		boosting = null;
		boost = noBoost();
		void go({ is: 'outlook' });
	}

	function toLunch() {
		const menu = FISH.filter((f) => order[f.id].lbs > 0);
		items = menu.map((f) => {
			const lbs = order[f.id].lbs, cost = prices[f.id];
			// A new fish starts at its cost a piece, to the half dollar above.
			const price = order[f.id].price || Math.ceil(pieceCost({ cost }) * 2) / 2;
			return { id: f.id, cost, lbs, left: lbs * PIECES_PER_LB, price, golden: 0 };
		});
		spent = bought;
		void go({ is: 'price', meal: 'lunch' });
	}

	/** The doors open: the service's film, then its sales, served when the film starts so a skip can't change them. */
	function serveMeal(meal: Meal) {
		for (const i of items) order[i.id].price = i.price;
		if (meal === 'lunch') {
			const l = lunch(items, today, Math.random);
			items = l.items;
			mix = l.mix;
			sold.lunch = l.sold;
		} else {
			const d = dinner(items, today, mix, boosting ? boost : noBoost());
			items = d.items;
			sold.dinner = d.sold;
		}
		if (!reduced.current) return void go({ is: 'service', meal });
		sound.play('service-bell');
		void go({ is: 'sales', meal });
	}

	function endDay() {
		const d: Day = { spent, lunch: sold.lunch, dinner: sold.dinner, boost: boosting ? boost : noBoost(), left: items.reduce((s, i) => s + i.left, 0) };
		days.push({ day: d, profit: profit(d) });
		void go({ is: 'day' });
	}

	function nextDay() {
		if (dayNo < DAYS) {
			dayNo++;
			return openDay();
		}
		saved.game = null;
		const stand = { name: standName, profit: days.reduce((s, d) => s + d.profit, 0), at: Date.now() };
		finished = { stand, best: saved.stand(stand) };
		void go({ is: 'final' });
	}

	const nudge = (n: number, by: number, step = 1) => Math.max(0, Math.round((n + by) / step) * step);
	const shown = $derived(step.is === 'board' ? saved.stands : []);
	const rank = $derived(finished ? saved.stands.findIndex((s) => s.at === finished!.stand.at && s.name === finished!.stand.name) : -1);
	const today$ = $derived(days.at(-1));
</script>

<svelte:head>
	<title>Sushi Stand | BarMadden.com</title>
	<meta
		name="description"
		content="Sushi Stand: five days to make your sushi stand the hottest spot in town. A sushi business game on Joseph Madden's portfolio."
	/>
</svelte:head>

{#snippet logo(small = false)}
	<p class="logo" class:small aria-label="Sushi Stand">
		<img src={img('sushi-script')} alt="" />
		<span aria-hidden="true">Stand</span>
	</p>
{/snippet}

{#snippet sign(label: string)}
	<div class="stand">
		<img src={img('sushihut')} alt="" />
		<p class="sign">{label}</p>
	</div>
{/snippet}

{#snippet stepper(label: string, value: number, set: (n: number) => void, by: number, unit: string, money = false)}
	<div class="stepper">
		<button type="button" class="round" aria-label="Less {label}" disabled={value <= 0} onclick={() => set(nudge(value, -by, by))}>−</button>
		<label>
			{#if money}<span aria-hidden="true">$</span>{/if}
			<input
				type="number"
				min="0"
				step={money ? 0.5 : 1}
				inputmode="decimal"
				aria-label={label}
				value={money ? value.toFixed(2) : value}
				onchange={(e) => {
					const n = Number(e.currentTarget.value), v = Number.isFinite(n) && n > 0 ? (money ? Math.round(n * 100) / 100 : Math.floor(n)) : 0;
					set(v);
					e.currentTarget.value = money ? v.toFixed(2) : String(v);
				}}
			/>
			<span>{unit}</span>
		</label>
		<button type="button" class="round" aria-label="More {label}" onclick={() => set(nudge(value, by, by))}>+</button>
	</div>
{/snippet}

{#snippet salesCards(meal: Meal)}
	<ul class="cards">
		{#each sold[meal] as s (s.id)}
			{@const left = items.find((i) => i.id === s.id)?.left ?? 0}
			<li class="card">
				<h3>{fishOf(s.id).name}</h3>
				<div class="art"><img src={img(`${s.id}-nigiri`)} alt="" /></div>
				<p class="figure"><span>Sales</span> {dollars(s.sales)}</p>
				<p class="small">Sold {count(s.pieces)} · {count(left)} left</p>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- Every press taps, the fish market's pounds included (Joe, 2026-09-30). On a page opened straight from its URL no Join
	came first, so the first press is the one that lets the sound start. -->
<div
	class="sushi game"
	class:night
	data-step={step.is}
	role="presentation"
	onclick={(e) => {
		if (!(e.target as Element).closest('button, a')) return;
		if (!woke) (woke = true), sound.join();
		sound.play('tap');
	}}
>
	<header>
		{@render logo(true)}
		{#if name && step.is !== 'how' && step.is !== 'name'}
			<p class="tracker">
				<strong>{standName}</strong>
				<span>{step.is === 'final' || step.is === 'board' ? 'Final results' : `Day ${dayNo} / ${DAYS}`}</span>
			</p>
		{/if}
		{#if playing}
			<button type="button" class="restart" aria-haspopup="dialog" onclick={openRestart}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4h4" /></svg>
				<span>Start over</span>
			</button>
		{/if}
		<a class="exit" href="/#{SUSHI}">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
			<span>Back to Forest Park</span>
		</a>
	</header>
	<!-- Without JavaScript there is no game: what it is, in place of it (Joe, 2026-10-02; app.html hides the rest). -->
	<noscript>
		<section class="board plain">
			<h1>Sushi Stand</h1>
			<p>A sushi business game: it's almost International Sushi Day, and you've got five days to make your sushi stand the hottest spot in town.</p>
			<p>Turn on JavaScript to play.</p>
			<div class="cta"><a class="secondary" href="/#{SUSHI}">Back to Forest Park</a></div>
		</section>
	</noscript>
	<!-- Start over asks first, then drops the kept game for a new one, from its name. -->
	<dialog class="restart-card" aria-labelledby="restart-title" bind:this={restart} onclose={(e) => e.currentTarget.returnValue === 'restart' && newGame()}>
		<h2 id="restart-title">Start over?</h2>
		<p>{standName} closes for good, and you open a new stand on day&nbsp;1.</p>
		<form method="dialog">
			<button class="primary" value="restart">Start over</button>
			<button class="secondary" value="">Keep playing</button>
		</form>
	</dialog>

	{#if step.is === 'service'}
		{@const meal = step.meal}
		<!-- The doors open: the original's film of the stand, its clock running on through the service, the name on its sign.
			It ends on its own after three seconds, or a click skips it. -->
		<button type="button" class="service" class:night={meal === 'dinner'} aria-label="Skip to the {meal} sales" onclick={() => go({ is: 'sales', meal })}>
			<span class="film">
				<video src={meal === 'lunch' ? lunchVideo : dinnerVideo} autoplay muted playsinline onended={() => go({ is: 'sales', meal })}></video>
				<span class="film-sign">{standName}</span>
			</span>
		</button>
	{:else}
		<div class="body">
			<aside class="side" aria-hidden="true">
				{@render sign(standName)}
			</aside>
			<section class="board" aria-labelledby="sushi-title">
				{#if stage(step) > 0}
					<ol class="stages" aria-label="Today's steps">
						{#each STAGES as label, i}
							<li class:done={stage(step) > i + 1} class:now={stage(step) === i + 1} aria-current={stage(step) === i + 1 ? 'step' : undefined}>
								<span>{i + 1}</span>
								{label}
							</li>
						{/each}
					</ol>
				{/if}

				{#if step.is === 'how'}
					{@render logo()}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>How to play</h1>
					<p>It's almost International Sushi Day, and you've got {DAYS}&nbsp;days to make your sushi stand the hottest spot in town!</p>
					<ol class="how">
						<li>Name your stand</li>
						<li>Buy your fish, with no budget</li>
						<li>Build your menu</li>
						<li>Set your prices</li>
						<li>Open your doors</li>
					</ol>
					<p>You'll serve lunch and dinner each day. The better business is, the more money you'll&nbsp;make.</p>
					<p class="em">Will <strong>your</strong> stand make your top&nbsp;10?</p>
					<div class="cta">
						<button type="button" class="primary" onclick={newGame}>Let's play</button>
						{#if saved.stands.length}
							<button type="button" class="secondary" onclick={() => go({ is: 'board' })}>Your top 10</button>
						{/if}
					</div>
				{:else if step.is === 'name'}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Name your stand</h1>
					<form
						class="name"
						onsubmit={(e) => {
							e.preventDefault();
							if (name.trim()) openDay();
						}}
					>
						<label for="stand-name">Your stand's name</label>
						<input id="stand-name" type="text" maxlength={NAME_MAX} autocomplete="off" bind:value={() => name, (v) => (name = v.replace(/\//g, ''))} />
						<div class="preview" aria-hidden="true">{@render sign(standName)}</div>
						<div class="cta">
							<button class="primary" disabled={!name.trim()}>Open for business</button>
						</div>
					</form>
				{:else if step.is === 'outlook'}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Day {dayNo}: today's outlook</h1>
					<p>What could move business one way or the other today.</p>
					<ul class="conditions">
						<li>
							<img src={img(today.weather === 'nice' ? 'weather-good' : 'weather-bad')} alt="" />
							<div>
								<h2>{today.weather === 'nice' ? 'The sun is out' : 'Storms are here'}</h2>
								<p>{today.weather === 'nice' ? 'People are out and about. Business should be up.' : 'People are staying inside. Business should be down.'}</p>
							</div>
						</li>
						<li>
							<img src={img(HAPPENINGS[today.happening].img)} alt="" />
							<div>
								<h2>{HAPPENINGS[today.happening].head}</h2>
								<p>{HAPPENINGS[today.happening].body}</p>
							</div>
						</li>
						{#if today.isd}
							<li>
								<img src={img('isd-calendar')} alt="" />
								<div>
									<h2>It's International Sushi Day</h2>
									<p>Expect a lot of hungry (and thirsty) customers ready to celebrate.</p>
								</div>
							</li>
						{/if}
					</ul>
					<div class="cta"><button type="button" class="primary" onclick={() => go({ is: 'market' })}>To the fish market</button></div>
				{:else if step.is === 'market'}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Buy your fish for today's menu</h1>
					<p>Order too much and it goes to waste. Order too little and you miss out on&nbsp;sales.</p>
					<ul class="cards">
						{#each FISH as f (f.id)}
							<li class="card" class:on={order[f.id].lbs > 0}>
								<h3>{f.name}</h3>
								<p class="price">{dollars(prices[f.id])} / lb</p>
								<div class="art"><img src={img(f.id)} alt="" /></div>
								{@render stepper(`pounds of ${f.name}`, order[f.id].lbs, (n) => (order[f.id].lbs = n), 1, 'lbs')}
								<p class="small">Makes {count(order[f.id].lbs * PIECES_PER_LB)} pieces</p>
							</li>
						{/each}
					</ul>
					<div class="cta">
						<p class="total">Today's fish: <strong>{dollars(bought)}</strong></p>
						<button type="button" class="primary" disabled={!bought} onclick={toLunch}>Prepare lunch</button>
					</div>
				{:else if step.is === 'price'}
					{@const meal = step.meal}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Set your {meal} prices</h1>
					<p>Price too low and you miss out on profit. Price too high and you turn customers&nbsp;away.</p>
					<ul class="cards">
						{#each items as item, n (item.id)}
							<li class="card">
								<h3>{fishOf(item.id).name}</h3>
								<div class="art"><img src={img(`${item.id}-nigiri`)} alt="" /></div>
								{#if item.left > 0}
									<p class="small">Your cost: <strong>{cents(pieceCost(item))}</strong> a piece · {count(item.left)} pieces</p>
								{:else}
									<p class="small"><strong>Sold out</strong></p>
								{/if}
								{@render stepper(`price of ${fishOf(item.id).name}`, item.price, (p) => (items[n].price = p), 0.5, 'a piece', true)}
							</li>
						{/each}
					</ul>
					<div class="cta"><button type="button" class="primary" onclick={() => serveMeal(meal)}>Serve {meal}</button></div>
				{:else if step.is === 'sales'}
					{@const meal = step.meal}
					{@const pieces = total(sold[meal], 'pieces')}
					{@const left = items.reduce((s, i) => s + i.left, 0)}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>{meal === 'lunch' ? 'Lunch' : 'Dinner'} sales</h1>
					<p class="result">{dollars(total(sold[meal], 'sales'))}</p>
					<p class="lead">You sold <strong>{count(pieces)}</strong> pieces.</p>
					{#if meal === 'lunch'}
						<p class="lead">You have <strong>{count(left)}</strong> pieces left for dinner.</p>
					{:else if left > 0}
						<p class="lead">Don't be so wasteful: <strong>{count(left)}</strong> pieces didn't sell today.</p>
					{:else}
						<p class="lead"><strong>Sold out!</strong></p>
					{/if}
					{#if sold[meal].length}
						<h2>Sales by menu item</h2>
						{@render salesCards(meal)}
					{/if}
					<div class="cta">
						{#if meal === 'lunch'}
							<button type="button" class="primary" onclick={() => go({ is: 'boost' })}>Boost business</button>
						{:else}
							<button type="button" class="primary" onclick={endDay}>See the day's results</button>
						{/if}
					</div>
				{:else if step.is === 'boost'}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Boost business</h1>
					<p>Run a special or advertise, and it could bring more customers in for dinner.</p>
					<fieldset class="choice">
						<legend>Would you like to boost business?</legend>
						<button type="button" class="alternate" aria-pressed={boosting === true} onclick={() => (boosting = true)}>Yes</button>
						<button type="button" class="alternate" aria-pressed={boosting === false} onclick={() => ((boosting = false), (boost = noBoost()))}>No</button>
					</fieldset>
					{#if boosting}
						<ul class="cards boosts">
							{#each BOOSTS as b (b.key)}
								<li class="card" class:on={boost[b.key]}>
									<h3>{b.head}</h3>
									<p class="price">{b.cost}</p>
									<div class="art"><img src={b.art} alt="" /></div>
									<p class="small">{b.body}</p>
									<button type="button" class="alternate" aria-pressed={boost[b.key]} onclick={() => (boost[b.key] = !boost[b.key])}>
										{boost[b.key] ? 'Added' : 'Add it'}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<div class="cta">
						<button type="button" class="primary" disabled={boosting === null} onclick={() => go({ is: 'price', meal: 'dinner' })}>Prepare dinner</button>
					</div>
				{:else if step.is === 'day' && today$}
					{@const d = today$.day}
					{@const e = expenses(d)}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Day {dayNo} results</h1>
					<div class="tables">
						<table>
							<caption>Sales</caption>
							<tbody>
								<tr><th scope="row">Lunch<small>Sold {count(total(d.lunch, 'pieces'))} pieces</small></th><td>{dollars(total(d.lunch, 'sales'))}</td></tr>
								<tr><th scope="row">Dinner<small>Sold {count(total(d.dinner, 'pieces'))} pieces</small></th><td>{dollars(total(d.dinner, 'sales'))}</td></tr>
							</tbody>
							<tfoot>
								<tr>
									<th scope="row">Total<small>Sold {count(total(d.lunch, 'pieces') + total(d.dinner, 'pieces'))} pieces</small></th>
									<td>{dollars(total(d.lunch, 'sales') + total(d.dinner, 'sales'))}</td>
								</tr>
							</tfoot>
						</table>
						<table>
							<caption>Expenses</caption>
							<tbody>
								<tr><th scope="row">Fish</th><td>{dollars(e.fish)}</td></tr>
								{#if e.special}<tr><th scope="row">Happy hour special</th><td>{dollars(e.special)}</td></tr>{/if}
								{#if e.ads}<tr><th scope="row">Advertising</th><td>{dollars(e.ads)}</td></tr>{/if}
								{#if e.discount}<tr><th scope="row">Half-off discount</th><td>{dollars(e.discount)}</td></tr>{/if}
							</tbody>
							<tfoot>
								<tr><th scope="row">Total</th><td>{dollars(e.fish + e.special + e.ads + e.discount)}</td></tr>
							</tfoot>
						</table>
					</div>
					<h2>Day {dayNo} profit</h2>
					<p class="result" class:loss={today$.profit < 0}>{dollars(today$.profit)}</p>
					<div class="cta">
						<button type="button" class="primary" onclick={nextDay}>{dayNo < DAYS ? `Start day ${dayNo + 1}` : 'See your final results'}</button>
					</div>
				{:else if step.is === 'final' && finished}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>Congrats!</h1>
					<p class="lead">Five days in, <strong>{finished.stand.name}</strong> is the talk of the town.</p>
					<div class="finale" aria-hidden="true">
						{@render logo()}
						{@render sign(finished.stand.name)}
					</div>
					<h2>Total profit</h2>
					<p class="result" class:loss={finished.stand.profit < 0}>{dollars(finished.stand.profit)}</p>
					{#if finished.best}<p class="best">A new personal best!</p>{/if}
					<table>
						<caption>Final results</caption>
						<tbody>
							{#each days as d, i}
								<tr>
									<th scope="row">Day {i + 1}<small>Sold {count(total(d.day.lunch, 'pieces') + total(d.day.dinner, 'pieces'))} pieces</small></th>
									<td>{dollars(d.profit)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr>
								<th scope="row">Total<small>Sold {count(days.reduce((s, d) => s + total(d.day.lunch, 'pieces') + total(d.day.dinner, 'pieces'), 0))} pieces</small></th>
								<td>{dollars(finished.stand.profit)}</td>
							</tr>
						</tfoot>
					</table>
					<div class="cta">
						<button type="button" class="primary" onclick={() => go({ is: 'board' })}>Your top 10</button>
						<button type="button" class="secondary" onclick={newGame}>Play again</button>
					</div>
				{:else if step.is === 'board'}
					<h1 id="sushi-title" tabindex="-1" bind:this={heading}>{finished?.best ? 'New personal best' : 'Your top 10'}</h1>
					{#if shown.length}
						<ol class="top">
							{#each shown as s, i (`${s.at}-${s.name}`)}
								<li class:this={i === rank}>
									<span>{i + 1}</span>
									<span>{s.name}</span>
									<span>{dollars(s.profit)}</span>
									<span>{i === rank ? 'this game' : day.format(s.at)}</span>
								</li>
							{/each}
						</ol>
					{:else}
						<p>No finished stands yet.</p>
					{/if}
					{#if finished && rank < 0}
						<p class="small">{finished.stand.name}'s {dollars(finished.stand.profit)} didn't make your top 10.</p>
					{/if}
					<p class="small">Your top 10 stays on this device.</p>
					<div class="cta">
						<button type="button" class="primary" onclick={newGame}>{finished ? 'Play again' : "Let's play"}</button>
						<a class="secondary" href="/#{SUSHI}">Back to Forest Park</a>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	/*
	 * The game over the whole window, like a scene of its own: the original's skyline behind, by day in the site's sky and
	 * by night, from boosting business on, in its night; the stand beside a night board framed in ivory like the cards,
	 * gold headlines and buttons. Menu cards are ivory, the fish on them as the original drew them.
	 */
	.sushi {
		--board-pad: clamp(1.25rem, 0.8rem + 2vw, 2.25rem);
		--skyline: url('$lib/sushi/img/day-bg.webp');
		--pavement: #424242;
		/* What a phone's toolbars take when they show: the large viewport less the small. */
		--toolbars: calc(100lvh - 100svh);
		position: fixed;
		inset: 0;
		z-index: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background: var(--sky);
		color: var(--ivory);
		font-family: var(--body);
		animation: open 0.6s ease-out;

		/*
		 * The skyline stands still (Joe, 2026-09-30): the page itself is as tall as the window is at the moment, which a
		 * phone's toolbars change as it scrolls, so the skyline is a layer of its own, hung from the top at the large
		 * viewport's height with its foot at the small viewport's, where it shows whole with the toolbars up; when they
		 * go, its pavement runs on below it.
		 */
		&::before {
			content: '';
			position: fixed;
			inset-block-start: 0;
			inset-inline: 0;
			z-index: -1;
			block-size: 100lvh;
			background:
				var(--skyline) center bottom var(--toolbars) / max(100%, 1000px) auto no-repeat,
				linear-gradient(var(--pavement), var(--pavement)) bottom / 100% calc(var(--toolbars) + 1px) no-repeat;
			pointer-events: none;
		}

		&.night {
			--skyline: url('$lib/sushi/img/night-bg.webp');
			--pavement: #282828;
			background: #56626a;
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	/* The page opens out of the koi's iris, a circle from the middle. */
	@keyframes open {
		from {
			clip-path: circle(0 at 50% 50%);
		}
		to {
			clip-path: circle(150% at 50% 50%);
		}
	}

	header {
		position: sticky;
		inset-block-start: 0;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0 auto 1.25rem;
		inline-size: min(18rem, 70%);

		& img {
			inline-size: 100%;
		}

		& span {
			margin-block-start: 0.25rem;
			padding-inline-start: 0.9em;
			color: var(--gold);
			font-family: var(--headline);
			font-size: clamp(1.25rem, 0.9rem + 1.5vw, 1.75rem);
			font-weight: 800;
			letter-spacing: 0.9em;
			line-height: 1;
			text-transform: uppercase;
		}

		&.small {
			margin: 0;
			inline-size: 6rem;
			flex: none;

			& span {
				font-size: 0.8rem;
			}
		}
	}

	.tracker {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1rem;
		align-items: baseline;
		margin: 0;
		min-inline-size: 0;
		font-family: var(--headline);
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;

		& strong {
			overflow: hidden;
			font-size: 1.375rem;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		& span {
			color: var(--sky);
		}
	}

	/* The header's two round buttons, at its end: Start over while a day is under way, and the way out. */
	:is(.exit, .restart) {
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

		& span {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}

	.restart + .exit {
		margin-inline-start: 0;
	}

	/* Start over's card: a night board like the game's, over the dimmed page. */
	.restart-card {
		box-sizing: border-box;
		padding: var(--board-pad);
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.75rem;
		background: var(--night);
		color: var(--ivory);
		box-shadow: 0 0 0 7px var(--night), 0 1.375rem 2.75rem rgb(0 0 0 / 0.3);

		& h2 {
			margin-block: 0 0.5rem;
			color: var(--gold);
			font-size: 2rem;
			letter-spacing: 0.03em;
			text-transform: uppercase;
		}

		& p {
			margin-block: 0 1.5rem;
			line-height: 1.55;
		}

		& form {
			display: flex;
			flex-wrap: wrap;
			gap: 1rem 1.25rem;
			align-items: center;
		}

		/* Both at the card's size, as a prop card's buttons are. */
		& .primary {
			padding-block: 0.5rem 0.55rem;
			padding-inline: 1.375rem;
			font-size: 1.1875rem;
		}
	}

	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
		box-sizing: border-box;
		inline-size: 100%;
		max-inline-size: 76rem;
		margin-inline: auto;
		padding-block: 1.5rem 5rem;
		padding-inline: 1rem;

		@media (width >= 64rem) {
			grid-template-columns: 19rem minmax(0, 1fr);
		}
	}

	/* The stand at its sign on the skyline's pavement, beside the board on a wide window; the name step shows it on the board. */
	/*
	 * Its feet halfway down the skyline's pavement, the bottom 78 of the picture's 1000 × 687 px, whatever the board scrolls:
	 * hung from the top at the small viewport's height, as the skyline is, so it stands still with it.
	 */
	.side {
		display: none;
		position: fixed;
		inset-block-start: 0;
		inset-inline-start: max(1rem, (100vw - 76rem) / 2 + 1rem);
		box-sizing: border-box;
		inline-size: 19rem;
		block-size: 100svh;
		padding-block-end: calc(max(100vw, 1000px) * 0.039);
		align-content: end;
		pointer-events: none;

		@media (width >= 64rem) {
			display: grid;
		}
	}

	.stand {
		position: relative;
		container-type: inline-size;

		& img {
			display: block;
			inline-size: 100%;
			filter: drop-shadow(0 0.5rem 0.75rem rgb(0 0 0 / 0.25));
		}

		/* The blank sign over the roof: 17 % in, 66 % wide, the top 12 % of the stand (measured on sushihut.png). */
		& .sign {
			position: absolute;
			inset-block-start: 0;
			inset-inline-start: 17%;
			display: grid;
			place-items: center;
			box-sizing: border-box;
			inline-size: 66%;
			block-size: 12%;
			margin: 0;
			padding-inline: 3%;
			overflow: hidden;
			color: var(--night);
			font-family: var(--headline);
			font-size: 6.5cqi;
			font-weight: 800;
			letter-spacing: 0.04em;
			line-height: 1;
			text-transform: uppercase;
			white-space: nowrap;
		}
	}

	.board {
		box-sizing: border-box;
		min-inline-size: 0;
		padding: var(--board-pad);
		border: 2px solid rgb(255 244 212 / 0.3);
		border-radius: 0.75rem;
		background: var(--night);
		box-shadow: 0 0 0 7px var(--night), 0 1.375rem 2.75rem rgb(0 0 0 / 0.3);

		& h1 {
			margin-block: 0 0.75rem;
			color: var(--gold);
			font-size: clamp(2.25rem, 1.5rem + 2.5vw, 3.25rem);
			letter-spacing: 0.03em;
			line-height: 1.02;
			text-transform: uppercase;
			outline: none;
		}

		& h2 {
			margin-block: 1.75rem 0.5rem;
			color: var(--sky);
			font-size: 1.375rem;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		& p {
			margin-block: 0 0.75rem;
			max-inline-size: 60ch;
			line-height: 1.55;
		}

		& .lead {
			font-size: 1.125rem;
		}

		& .em {
			font-style: italic;
		}

		& .small {
			font-size: 0.875rem;
		}
	}

	.stages {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-block: 0 1.5rem;
		padding: 0;
		list-style: none;

		& li {
			display: flex;
			align-items: center;
			gap: 0.375rem;
			padding-block: 0.25rem;
			padding-inline: 0.375rem 0.75rem;
			border-radius: 2rem;
			box-shadow: inset 0 0 0 1px rgb(255 244 212 / 0.3);
			color: rgb(255 244 212 / 0.7);
			font-size: 0.8125rem;
			font-weight: 500;

			& span {
				display: grid;
				place-items: center;
				inline-size: 1.375rem;
				block-size: 1.375rem;
				border-radius: 50%;
				background: rgb(255 244 212 / 0.15);
				font-size: 0.75rem;
			}

			&.done {
				color: var(--sky);

				& span {
					background: var(--sky);
					color: var(--night);
				}
			}

			&.now {
				background: var(--gold);
				box-shadow: none;
				color: var(--night);

				& span {
					background: var(--night);
					color: var(--gold);
				}
			}
		}
	}

	.how {
		display: grid;
		gap: 0.5rem;
		margin-block: 1.25rem;
		padding: 0;
		counter-reset: how;
		list-style: none;

		& li {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			font-family: var(--headline);
			font-size: 1.5rem;
			font-weight: 800;
			letter-spacing: 0.03em;
			text-transform: uppercase;
			counter-increment: how;

			&::before {
				content: counter(how);
				display: grid;
				place-items: center;
				flex: none;
				inline-size: 2.25rem;
				block-size: 2.25rem;
				border-radius: 50%;
				background: var(--gold);
				color: var(--night);
			}
		}
	}

	.plain {
		margin-block: 1.5rem;
		margin-inline: auto;
		inline-size: min(100% - 2rem, 36rem);
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.25rem;
		align-items: center;
		margin-block-start: 2rem;

		& .total {
			margin: 0;
			font-size: 1.125rem;

			& strong {
				color: var(--gold);
			}
		}
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
	:is(button, a):is(:global(.primary), :global(.alternate), :global(.secondary)):not(:disabled):hover {
		background: var(--fill-hot);
		color: var(--ink-hot, var(--ink));
	}

	.name {
		& label {
			display: block;
			margin-block-end: 0.375rem;
			color: var(--sky);
			font-size: 0.875rem;
			font-weight: 500;
			letter-spacing: 0.1em;
			text-transform: uppercase;
		}

		& input {
			box-sizing: border-box;
			inline-size: min(100%, 26rem);
			padding-block: 0.5rem;
			padding-inline: 0.75rem;
			border: 2px solid rgb(255 244 212 / 0.5);
			border-radius: 0.5rem;
			background: var(--night-hot);
			color: var(--ivory);
			font-family: var(--headline);
			font-size: 1.75rem;
			font-weight: 800;
			letter-spacing: 0.04em;
			text-transform: uppercase;

			&:focus-visible {
				outline: 3px solid var(--gold);
				outline-offset: 2px;
			}
		}

		& .preview {
			inline-size: min(100%, 24rem);
			margin-block-start: 1.75rem;
		}
	}

	/* Beside the board on a wide window, the stand on the pavement stands in for the name step's and the finale's. */
	@media (width >= 64rem) {
		.board {
			grid-column: 2;
		}

		:is(.preview, .finale .stand) {
			display: none;
		}
	}

	.conditions {
		display: grid;
		gap: 1rem;
		margin: 1.5rem 0 0;
		padding: 0;
		list-style: none;

		& li {
			display: flex;
			gap: 1.25rem;
			align-items: center;
			padding: 1rem 1.25rem;
			border-radius: 0.75rem;
			background: var(--night-hot);
		}

		& img {
			flex: none;
			inline-size: 4.5rem;
			block-size: 4.5rem;
			object-fit: contain;
		}

		& h2 {
			margin-block: 0 0.25rem;
			color: var(--ivory);
			letter-spacing: 0.03em;
		}

		& p {
			margin: 0;
		}
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
		gap: 1rem;
		margin: 1.5rem 0 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: var(--ivory);
		color: var(--night);
		box-shadow: inset 0 0 0 3px transparent;

		&.on {
			box-shadow: inset 0 0 0 3px var(--gold-lip);
		}

		& h3 {
			margin: 0;
			font-size: 1.375rem;
			letter-spacing: 0.03em;
			text-transform: uppercase;
		}

		& .price {
			margin: -0.375rem 0 0;
			color: #b64d2e;
			font-weight: 700;
		}

		/* A fixed box the picture is fitted into whole: a block, so the picture's 100 % height has a definite height to take. */
		& .art {
			block-size: 7rem;

			& img {
				display: block;
				inline-size: 100%;
				block-size: 100%;
				object-fit: contain;
			}
		}

		& p {
			margin: 0;
		}

		& .figure {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			font-family: var(--headline);
			font-size: 1.75rem;
			font-weight: 800;

			& span {
				color: #52677a;
				font-size: 0.875rem;
				letter-spacing: 0.1em;
				text-transform: uppercase;
			}
		}

		& button.alternate {
			align-self: start;
			margin-block-start: auto;

			/* Added, gold: the site's pressed ivory would vanish on the card. */
			&[aria-pressed='true'] {
				--fill: var(--gold);
				--fill-hot: var(--gold-hot);
				--edge: 0 0.25rem 0 var(--gold-lip);
				--edge-pressed: 0 0.0625rem 0 var(--gold-lip);
			}
		}
	}

	/* Small beside their copy, which needs the room on a phone. */
	.boosts .art {
		block-size: 4.5rem;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-block-start: auto;

		& label {
			display: flex;
			flex: 1;
			align-items: center;
			gap: 0.25rem;
			min-inline-size: 0;
			font-weight: 500;
		}

		& input {
			box-sizing: border-box;
			inline-size: 100%;
			min-inline-size: 0;
			padding-block: 0.375rem;
			padding-inline: 0.5rem;
			border: 2px solid #cfc3a0;
			border-radius: 0.375rem;
			background: #fff;
			color: var(--night);
			font-size: 1.125rem;
			font-weight: 700;
			font-variant-numeric: tabular-nums;
			text-align: center;
			appearance: textfield;

			&::-webkit-inner-spin-button,
			&::-webkit-outer-spin-button {
				appearance: none;
				margin: 0;
			}

			&:focus-visible {
				outline: 3px solid var(--night);
				outline-offset: 1px;
			}
		}

		& label span:last-child {
			flex: none;
			font-size: 0.875rem;
		}
	}

	.round {
		display: grid;
		place-items: center;
		flex: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--night);
		color: var(--ivory);
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;

		&:hover:not(:disabled) {
			background: var(--night-hot);
		}

		&:active:not(:disabled) {
			translate: 0 1px;
		}

		&:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: 3px solid var(--gold-lip);
			outline-offset: 2px;
		}
	}

	.result {
		margin-block: 0.25rem 0.75rem;
		color: var(--gold);
		font-family: var(--headline);
		font-size: clamp(3.5rem, 2.5rem + 4vw, 5.5rem);
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;

		&.loss {
			color: #ff9a7d;
		}
	}

	.best {
		color: var(--gold);
		font-weight: 700;
	}

	.choice {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		margin: 1.25rem 0 0;
		padding: 0;
		border: 0;

		& legend {
			float: left;
			inline-size: 100%;
			margin-block-end: 0.75rem;
			font-weight: 500;
		}
	}

	.tables {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: 1rem 2rem;
	}

	table {
		inline-size: 100%;
		margin-block-start: 1rem;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;

		& caption {
			padding-block-end: 0.5rem;
			color: var(--sky);
			font-family: var(--headline);
			font-size: 1.375rem;
			font-weight: 800;
			letter-spacing: 0.06em;
			text-align: start;
			text-transform: uppercase;
		}

		& :is(th, td) {
			padding-block: 0.5rem;
			border-block-end: 1px solid rgb(255 244 212 / 0.15);
			vertical-align: top;
		}

		& th {
			font-weight: 500;
			text-align: start;

			& small {
				display: block;
				font-size: 0.8125rem;
				font-weight: 400;
				opacity: 0.75;
			}
		}

		& td {
			font-size: 1.125rem;
			font-weight: 700;
			text-align: end;
		}

		& tfoot :is(th, td) {
			border: 0;
			color: var(--gold);
			font-weight: 700;
		}
	}

	.finale {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		margin-block: 1.5rem;

		& .stand {
			inline-size: min(100%, 22rem);
		}
	}

	/* The top ten as the lap board lists laps: rank, name, profit and day, this game's row gold. */
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
	}

	/*
	 * The service's film over the whole window below the header, its sky and pavement carried out to either side; the name
	 * on its sign at 25 % in, 49 % wide and 61.5 % down, 3.4 % tall (measured on the 640 × 1136 film).
	 */
	.service {
		position: relative;
		flex: 1;
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		overflow: hidden;
		background: linear-gradient(#cae0e7 69%, #444 69%);
		cursor: pointer;

		&.night {
			background: linear-gradient(#77848a 69%, #363636 69%);
		}

		& .film {
			position: relative;
			block-size: 100%;
			max-block-size: calc(100svh - 4rem);
			aspect-ratio: 640 / 1136;
			container-type: inline-size;
		}

		& video {
			display: block;
			inline-size: 100%;
			block-size: 100%;
		}

		& .film-sign {
			position: absolute;
			inset-block-start: 61.4%;
			inset-inline-start: 25%;
			display: grid;
			place-items: center;
			inline-size: 49.4%;
			block-size: 3.4%;
			overflow: hidden;
			color: var(--night);
			font-family: var(--headline);
			font-size: 4.5cqi;
			font-weight: 800;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			white-space: nowrap;
		}
	}
</style>
