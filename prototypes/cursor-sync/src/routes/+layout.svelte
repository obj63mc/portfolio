<!--
	PROTOTYPE, throwaway (tickets 08 and 09). Ticket 09 adds the real socket (lib/proto/net.ts) and the
	Foundry theatre with the shared screen at /midtown/foundry. Three variants of where props and cursors live, switchable with
	?variant=A|B|C, on the real scene routes (/ and /maplewood/moosylvania). Camera, input, tiles and
	peers are shared by every variant so the variants differ only in rendering and hit testing.
	Ticket 15: the floating switcher now cycles own-cursor treatments (?own=A..E, combos like ?own=BE
	via the gear panel); the renderer variant stays on B (?variant= still works).
	Ticket 22: desktop pointer lock. A Join card over the live scene locks the pointer; Esc or leaving
	the window shows a Paused card, and Resume re-locks with the cursor where it froze. ?lock=0 turns it
	off, ?current= sets the river speed, ?pdrift=1 keeps drifting while paused.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';
	import { Engine, OWN_VARIANTS, readSettings } from '$lib/proto/engine';
	import { sceneForPath } from '$lib/proto/scenes';
	import { ui } from '$lib/proto/ui.svelte';
	import { runAll, soak } from '$lib/proto/bench';
	import './proto.css';

	let { children } = $props();
	let stage: HTMLDivElement;
	let eng = $state<Engine>();
	let panel = $state(false);
	let hud = $state(true);
	let form = $state<Record<string, string>>({});
	let own = $state('A');

	onMount(() => {
		const q = new URLSearchParams(location.search);
		const s = readSettings(q);
		form = {
			bots: String(s.bots), bg: s.bg, scale: String(s.scale), dpr: String(s.dprCap), rm: s.rm ? '1' : '0',
			props: String(s.props), tiles: String(s.tiles), push: String(s.push), joy: String(s.joy), tau: String(s.tau), band: String(s.band),
			hz: String(s.hz), delay: String(s.delay), ts: s.turnstile ? '1' : '0', own: s.own, ownk: String(s.ownk), peerk: String(s.peerk),
			lock: s.lock ? '1' : '0', current: String(s.current), pdrift: s.pdrift ? '1' : '0'
		};
		own = s.own;
		const e = new Engine(stage, s, (path, back) => {
			if (back && history.state && history.length > 1 && sceneForPath(location.pathname) !== 'overworld') history.back();
			else goto(path + location.search);
		});
		e.start(sceneForPath(location.pathname)).then(() => (eng = e));
		const key = (ev: KeyboardEvent) => {
			if ((ev.target as HTMLElement).closest('input,select')) return;
			if (ev.key === '[') cycle(-1);
			if (ev.key === ']') cycle(1);
			if (ev.key === 'h') hud = !hud;
		};
		addEventListener('keydown', key);
		return () => { removeEventListener('keydown', key); e.destroy(); };
	});

	$effect(() => {
		const id = sceneForPath(page.url.pathname);
		eng?.goScene(id);
	});

	function cycle(d: number) {
		if (!eng || ui.bench.running) return;
		const i = OWN_VARIANTS.findIndex((v) => v.key === own);
		const v = OWN_VARIANTS[(i + d + OWN_VARIANTS.length) % OWN_VARIANTS.length].key;
		const u = new URL(location.href);
		u.searchParams.set('own', v);
		replaceState(u.pathname + u.search, page.state);
		own = form.own = eng.settings.own = v;
		eng.own.youUntil = eng.t + 4; // replay the tag so A and B can be judged on arrival too
	}

	function apply() {
		const u = new URL(location.href);
		for (const [k, v] of Object.entries(form)) u.searchParams.set(k, v);
		location.href = u.toString();
	}

	// joystick: bottom right, 15% dead zone (ticket 06)
	let knob = $state({ x: 0, y: 0 });
	let joyId = -1;
	const R = 60;
	function joyMove(ev: PointerEvent, base: HTMLElement) {
		const r = base.getBoundingClientRect();
		let dx = ev.clientX - (r.left + R), dy = ev.clientY - (r.top + R);
		const len = Math.hypot(dx, dy);
		if (len > R) { dx *= R / len; dy *= R / len; }
		knob = { x: dx, y: dy };
		const m = Math.min(1, len / R), live = m < 0.15 ? 0 : (m - 0.15) / 0.85;
		if (eng) { eng.joy.x = len ? (dx / Math.hypot(dx, dy)) * live : 0; eng.joy.y = len ? (dy / Math.hypot(dx, dy)) * live : 0; eng.joy.active = true; }
	}
	function joyEnd() {
		joyId = -1;
		knob = { x: 0, y: 0 };
		if (eng) { eng.joy.x = eng.joy.y = 0; eng.joy.active = false; }
	}
	const current = $derived(OWN_VARIANTS.find((v) => v.key === own) ?? { key: own, name: 'combo' });
</script>

<div class="stage" bind:this={stage}></div>
{@render children()}

{#if hud}
	<button class="ui hud" onclick={() => (hud = false)} title="Hide HUD (h)">{ui.hud}</button>
{:else}
	<button class="ui hud-min" onclick={() => (hud = true)}>HUD</button>
{/if}

{#if ui.card}
	<div class="ui card" role="dialog" aria-label={ui.card.title}>
		<h2>{ui.card.title}</h2>
		<p>{ui.card.body}</p>
		<button onclick={() => (ui.card = null)}>Close</button>
	</div>
{/if}

{#if ui.toast}<div class="ui toast">{ui.toast}</div>{/if}

{#if page.url.pathname !== '/'}
	<button class="ui back" onclick={() => history.back()}>← Back</button>
{/if}

{#if ui.touch}
	<div
		class="ui joy"
		role="presentation"
		onpointerdown={(ev) => { joyId = ev.pointerId; (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); joyMove(ev, ev.currentTarget as HTMLElement); }}
		onpointermove={(ev) => ev.pointerId === joyId && joyMove(ev, ev.currentTarget as HTMLElement)}
		onpointerup={joyEnd}
		onpointercancel={joyEnd}
	>
		<div class="knob" style:transform="translate({knob.x}px, {knob.y}px)"></div>
	</div>
{/if}

<div class="ui switcher" class:touch={ui.touch}>
	<button onclick={() => cycle(-1)} aria-label="Previous variant">◀</button>
	<span>{current.key} ({current.name})</span>
	<button onclick={() => cycle(1)} aria-label="Next variant">▶</button>
	<button onclick={() => (panel = !panel)} aria-label="Settings and benchmark">⚙</button>
</div>

{#if panel}
	<div class="ui panel">
		<h2>Network</h2>
		<button disabled={!eng} onclick={() => { eng?.net.drop(10); panel = false; }}>Drop socket for 10 s</button>
		<p class="hint">Rooms at different rates are separate, so everyone comparing must pick the same rate.</p>
		<h2>Settings <small>(reloads)</small></h2>
		<div class="grid">
			<label>Pointer lock <select bind:value={form.lock}><option value="1">on</option><option value="0">off</option></select></label>
			<label>River current px/s <input bind:value={form.current} inputmode="numeric" /></label>
			<label>Drift while paused <select bind:value={form.pdrift}><option value="0">no</option><option value="1">yes</option></select></label>
			<label>Own cursor (letters, e.g. BE) <input bind:value={form.own} /></label>
			<label>Own scale for B <select bind:value={form.ownk}>{#each ['1.25', '1.4', '1.5', '1.75'] as v}<option>{v}</option>{/each}</select></label>
			<label>Peer scale for D <select bind:value={form.peerk}>{#each ['0.6', '0.75', '0.8', '1'] as v}<option>{v}</option>{/each}</select></label>
			<label>Send rate Hz <select bind:value={form.hz}>{#each ['10', '15', '20'] as v}<option>{v}</option>{/each}</select></label>
			<label>Interp delay ms <input bind:value={form.delay} inputmode="numeric" /></label>
			<label>Turnstile <select bind:value={form.ts}><option value="1">on</option><option value="0">off</option></select></label>
			<label>Simulated peers (0 = socket) <select bind:value={form.bots}>{#each ['0', '20', '40', '60', '120'] as v}<option>{v}</option>{/each}</select></label>
			<label>Background <select bind:value={form.bg}><option value="canvas">canvas</option><option value="dom">DOM tiles</option></select></label>
			<label>Render scale <input bind:value={form.scale} inputmode="decimal" /></label>
			<label>DPR cap <input bind:value={form.dpr} inputmode="decimal" /></label>
			<label>Reduced motion <select bind:value={form.rm}><option value="0">off</option><option value="1">on</option></select></label>
			<label>Props ×<select bind:value={form.props}>{#each ['1', '2', '4'] as v}<option>{v}</option>{/each}</select></label>
			<label>Tile density <select bind:value={form.tiles}><option value="0">auto</option><option value="1.25">1.25</option><option value="2">2</option></select></label>
			<label>Push band (0 = scene) <input bind:value={form.band} inputmode="decimal" /></label>
			<label>Push px/s <input bind:value={form.push} inputmode="numeric" /></label>
			<label>Joystick px/s <input bind:value={form.joy} inputmode="numeric" /></label>
			<label>Inertia tau s <input bind:value={form.tau} inputmode="decimal" /></label>
		</div>
		<button onclick={apply}>Apply</button>

		<h2>Benchmark</h2>
		<p class="hint">Keep the screen on and hands off. Run all: A, B, C × 20 and 60 peers, about 90 s. Soak: current variant for 10 min, for heat and battery.</p>
		<button disabled={ui.bench.running || !eng} onclick={() => { panel = false; eng && runAll(eng).then(() => (panel = true)); }}>Run all</button>
		<button disabled={ui.bench.running || !eng} onclick={() => { panel = false; eng && soak(eng, 10).then(() => (panel = true)); }}>Soak 10 min</button>
		{#if ui.bench.rows.length}
			<table>
				<thead><tr><th>var</th><th>peers</th><th>fps</th><th>p95 ms</th><th>missed %</th><th>&gt;50ms</th><th>js p95</th></tr></thead>
				<tbody>
					{#each ui.bench.rows as r}
						<tr><td>{r.variant}</td><td>{r.bots}</td><td>{r.fps}</td><td>{r.p95}</td><td>{r.jank}</td><td>{r.long}</td><td>{r.jsP95}</td></tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#each ui.bench.soak as line}<div class="soak">{line}</div>{/each}
	</div>
{/if}

{#if ui.bench.running}<div class="ui status">{ui.bench.status}</div>{/if}

{#if ui.lock === 'gate' || (ui.lock === 'paused' && !panel)}
	<!-- ticket 22: the live scene keeps running behind this; keyboard users can still Tab to props -->
	<div class="ui lockgate">
		<div class="gatecard" role="dialog" aria-labelledby="gate-title">
			{#if ui.lock === 'gate'}
				<h2 id="gate-title">St. Louis, by cursor</h2>
				<p>Join to explore with everyone else here. Press Esc any time to get your mouse back.</p>
				<button disabled={!eng} onclick={(ev) => eng?.lockPointer(ev.clientX, ev.clientY)}>Join</button>
			{:else}
				<h2 id="gate-title">Paused</h2>
				<p>Your cursor is waiting where you left it.</p>
				<button onclick={() => eng?.lockPointer()}>Resume</button>
			{/if}
			{#if ui.lockMsg}<p class="hint">{ui.lockMsg}</p>{/if}
		</div>
	</div>
{/if}
