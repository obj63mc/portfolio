// Reactive state the engine pushes to the Svelte overlay (HUD, card, bench). Written at low rate, never per frame.
export interface BenchRow {
	variant: string;
	bots: number;
	bg: string;
	fps: number;
	p50: number;
	p95: number;
	p99: number;
	jank: number;
	long: number;
	jsP95: number;
	frames: number;
}

export const ui = $state({
	variant: 'A',
	hud: '',
	card: null as null | { title: string; body: string },
	toast: '',
	touch: false,
	lock: 'free' as 'free' | 'gate' | 'locked' | 'paused', // ticket 22
	lockMsg: '',
	bench: { running: false, status: '', rows: [] as BenchRow[], soak: [] as string[] }
});
