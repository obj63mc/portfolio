// The engine's images, fetched in the order the visitor needs them: the background tiles in view go at once, since the
// iris between scenes waits on them alone; then the cut-outs standing in the view, which are painted into those tiles
// already or stand on them; then the ring of tiles round the view and the cut-outs out of it, a few at a time; and what
// a door in view leads to is fetched last of all, into the browser's cache alone, so the hop finds it there. Before this
// every tile and every cut-out of a scene was asked for together, and on a slow connection the view waited behind the
// megabytes round it. A tile the camera has left is called off, its bytes and its decoding saved. Once all of that is in,
// the rest of the scene's tiles follow into the cache too, so a glide across it finds them there. The order is kept here
// and not left to the host: `priority` only hints it. How many go at a time follows the connection (WINDOW).

declare global {
	interface Navigator {
		/** The visitor asked their browser to save data: Chrome and Edge; absent elsewhere. */
		connection?: { saveData?: boolean };
	}
}

/** In view, fetched at once; or round it or out of it, fetched once nothing in view is waiting. */
export type Urgency = 'now' | 'soon';

/** An image on its way. */
export interface Loading {
	/** Rejects for one that failed or was called off. */
	bmp: Promise<ImageBitmap>;
	/** A tile that has come into view: fetched at once if it was still waiting its turn. */
	hurry(): void;
	/** A cut-out that has come into view: first in line, if it was still waiting, once the view's tiles are in. */
	first(): void;
	/** No longer wanted: its fetch is called off, and it is never decoded. */
	cancel(): void;
}

/** What the loader fetches and decodes with: the browser's own, or a test's stand-ins. */
export interface Fetching {
	fetch(url: string, init: { signal?: AbortSignal; priority: 'high' | 'low' }): Promise<{ ok: boolean; blob(): Promise<Blob> }>;
	decode(blob: Blob): Promise<ImageBitmap>;
	/** The visitor asked to save data: nothing is fetched ahead of a hop. */
	saveData(): boolean;
	/** The time, ms, by which a fetch is timed. */
	now(): number;
}

const BROWSER: Fetching = {
	fetch: (url, init) => fetch(url, init),
	decode: (blob) => createImageBitmap(blob),
	saveData: () => !!navigator.connection?.saveData,
	now: () => performance.now()
};

/**
 * How many images round the view are fetched and decoded at a time, and half as many ahead of a hop. Four to begin with
 * and on a slow connection, where each one in flight takes bandwidth from what the view asks for next. Up to sixteen on a
 * quick one, where an image is a round trip and little more: at four at a time production sent the overworld's 32
 * cut-outs in eight rounds over 0.85 s of a connection that brings 84 tiles at once in a quarter of a second (2026-10-01).
 * The host answers over HTTP/2 or 3, so the browser's six to a host doesn't apply and this is the only limit there is.
 */
const WINDOW = { min: 4, max: 16 };
/** An image back within QUICK ms widens the window by one, and one slower than SLOW ms halves it. */
const QUICK = 200;
const SLOW = 1000;
/** One back sooner than this, ms, came from the browser's cache and says nothing of the connection. */
const CACHED = 15;

interface Job {
	url: string;
	/** In view: asked for at high priority, ahead of the sound's loops, even when it waited its turn. */
	seen: boolean;
	abort: AbortController;
	done(bmp: ImageBitmap): void;
	failed(why: unknown): void;
}

export class Loader {
	private io: Fetching;
	/** Fetches in flight: for the view, round it, and ahead of a hop. */
	private flying = { now: 0, soon: 0, ahead: 0 };
	/** How many go at a time round the view (WINDOW). */
	private wide = WINDOW.min;
	/** Waiting their turn, first in first out: the images round the view, then the URLs ahead of a hop. */
	private queue: Job[] = [];
	private warming: string[] = [];
	/** Every URL the session has fetched or is fetching, so nothing is fetched ahead twice; not one that failed or was called off. */
	private have = new Set<string>();

	constructor(io: Fetching = BROWSER) {
		this.io = io;
	}

	/** An image, decoded: at once for the view, or in its turn. */
	image(url: string, urgency: Urgency): Loading {
		let done!: Job['done'], failed!: (why: unknown) => void;
		const bmp = new Promise<ImageBitmap>((yes, no) => ((done = yes), (failed = no)));
		const job: Job = { url, seen: urgency === 'now', abort: new AbortController(), done, failed: (why) => (this.have.delete(url), failed(why)) };
		this.have.add(url);
		// One in its turn waits for its asker to finish asking: a scene asks for its cut-outs and then its view's tiles in
		// one go, and the tiles are first.
		if (urgency === 'now') this.start(job, 'now');
		else this.queue.push(job), queueMicrotask(() => this.pump());
		return {
			bmp,
			hurry: () => {
				if (this.waiting(job)) (job.seen = true), this.start(job, 'now');
			},
			first: () => {
				if (this.waiting(job)) (job.seen = true), this.queue.unshift(job);
			},
			cancel: () => {
				if (this.waiting(job)) job.failed(new DOMException('Called off', 'AbortError'));
				else job.abort.abort();
			}
		};
	}

	/**
	 * URLs fetched ahead into the browser's cache, never decoded: half the window at a time, once nothing else is coming.
	 * The rest of a scene goes last in line; what a door leads to goes `first`, ahead of any of that still waiting. None
	 * for a visitor saving data.
	 */
	warm(urls: Iterable<string>, first = false) {
		if (this.io.saveData()) return;
		const fresh = [...new Set(urls)].filter((url) => !this.have.has(url));
		this.warming = first ? [...fresh, ...this.warming.filter((url) => !fresh.includes(url))] : [...this.warming, ...fresh.filter((url) => !this.warming.includes(url))];
		queueMicrotask(() => this.pump());
	}

	/** Takes a job out of the queue; false for one already started. */
	private waiting(job: Job) {
		const i = this.queue.indexOf(job);
		if (i >= 0) this.queue.splice(i, 1);
		return i >= 0;
	}

	/** A fetch that took `ms` widens or narrows the window. */
	private paced(ms: number) {
		if (ms < CACHED) return;
		if (ms < QUICK) this.wide = Math.min(WINDOW.max, this.wide + 1);
		else if (ms > SLOW) this.wide = Math.max(WINDOW.min, Math.ceil(this.wide / 2));
	}

	private start(job: Job, urgency: Urgency) {
		const asked = this.io.now();
		this.flying[urgency]++;
		this.io
			.fetch(job.url, { signal: job.abort.signal, priority: job.seen ? 'high' : 'low' })
			.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${job.url}: not found`))))
			.then((blob) => (this.paced(this.io.now() - asked), job.abort.signal.aborted ? Promise.reject(job.abort.signal.reason) : this.io.decode(blob)))
			.then((bmp) => {
				// Called off while it was decoding.
				if (job.abort.signal.aborted) return bmp.close(), job.failed(job.abort.signal.reason);
				job.done(bmp);
			}, job.failed)
			.finally(() => {
				this.flying[urgency]--;
				this.pump();
			});
	}

	/** The next in line, while nothing in view is still coming. */
	private pump() {
		const f = this.flying;
		while (!f.now && f.soon < this.wide && this.queue.length) this.start(this.queue.shift()!, 'soon');
		while (!f.now && !f.soon && !this.queue.length && f.ahead < Math.ceil(this.wide / 2) && this.warming.length) {
			const url = this.warming.shift()!;
			if (this.have.has(url)) continue; // the hop was taken first, and its scene asked for it
			this.have.add(url);
			f.ahead++;
			const asked = this.io.now();
			this.io
				.fetch(url, { priority: 'low' })
				// Read to its end, which is what puts it in the cache.
				.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${url}: not found`))))
				.then(() => this.paced(this.io.now() - asked))
				.catch(() => this.have.delete(url)) // asked for again by the next door in view
				.finally(() => {
					f.ahead--;
					this.pump();
				});
		}
	}
}
