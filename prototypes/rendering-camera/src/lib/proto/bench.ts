// Scripted benchmark: the same camera tour over every district for each variant and peer count, then
// the results are posted to the preview server (results.jsonl next to package.json) and shown in the panel.
import type { Engine, Variant } from './engine';
import { summarise } from './stats';
import { ui, type BenchRow } from './ui.svelte';

// camera centres: Maplewood arrival, Central West End, Midtown, Belleville, Carondelet Park, back
const TOUR: [number, number][] = [[1400, 1456], [2250, 560], [3400, 560], [4800, 960], [2600, 2000], [1400, 1456]];
const WARM = 1.5, REC = 12;

function device(e: Engine) {
	return {
		at: new Date().toISOString(), ua: navigator.userAgent, screen: `${screen.width}x${screen.height}`,
		viewport: `${e.vw}x${e.vh}`, dpr: devicePixelRatio, scale: e.s, dprUsed: e.dpr, density: e.density,
		rm: e.settings.rm, props: e.props.length
	};
}

async function post(body: unknown) {
	try { await fetch('/__results', { method: 'POST', body: JSON.stringify(body) }); } catch { /* static host: panel only */ }
}

async function record(e: Engine, seconds: number) {
	await e.runTour(TOUR.slice(0, 2), WARM); // warm up: tiles decode, JIT settles
	e.stats.rec = { d: [], j: [] };
	await e.runTour(TOUR, seconds);
	const r = e.stats.rec;
	e.stats.rec = null;
	return summarise(r.d, r.j);
}

export async function runAll(e: Engine, variants: Variant[] = ['A', 'B', 'C'], peers = [20, 60]) {
	if (ui.bench.running) return;
	if (e.scene.id !== 'overworld') { ui.bench.status = 'Go back to the overworld first.'; return; }
	ui.bench.running = true;
	const prev = { v: e.settings.variant, n: e.settings.bots };
	const rows: BenchRow[] = [];
	for (const v of variants)
		for (const n of peers) {
			ui.bench.status = `Running ${v} with ${n} peers… hands off`;
			e.setVariant(v);
			e.setPeers(n);
			const s = await record(e, REC);
			rows.push({ variant: v, bots: n, bg: e.settings.bg, ...s });
			ui.bench.rows = [...rows];
		}
	e.setVariant(prev.v);
	e.setPeers(prev.n);
	await post({ kind: 'bench', ...device(e), rows });
	ui.bench.status = 'Done. Results posted to the Mac (if served by npm run phone).';
	ui.bench.running = false;
}

/** Thermal and battery soak: loop the tour on the current variant, one summary per 30 s. */
export async function soak(e: Engine, minutes = 10) {
	if (ui.bench.running) return;
	if (e.scene.id !== 'overworld') { ui.bench.status = 'Go back to the overworld first.'; return; }
	ui.bench.running = true;
	ui.bench.soak = [];
	const battery = await (navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.().catch(() => null);
	const lines: object[] = [];
	const end = performance.now() + minutes * 60_000;
	let i = 0;
	while (performance.now() < end) {
		e.stats.rec = { d: [], j: [] };
		await e.runTour(TOUR, 30);
		const r = e.stats.rec!;
		e.stats.rec = null;
		const s = summarise(r.d, r.j);
		const line = { min: Math.round(++i * 5) / 10, ...s, battery: battery ? Math.round(battery.level * 100) : null, charging: battery?.charging ?? null };
		lines.push(line);
		ui.bench.soak = [...ui.bench.soak, `${line.min} min: ${s.fps} fps, p95 ${s.p95} ms, missed ${s.jank}%${line.battery != null ? `, battery ${line.battery}%` : ''}`];
		ui.bench.status = `Soak ${e.settings.variant}: ${line.min} of ${minutes} min… hands off, screen on`;
	}
	await post({ kind: 'soak', variant: e.settings.variant, bots: e.settings.bots, bg: e.settings.bg, ...device(e), lines });
	ui.bench.status = 'Soak done. Results posted to the Mac.';
	ui.bench.running = false;
}
