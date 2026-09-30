// What reaches gtag (buildout ticket 23): the events a session sends under its consent, held in memory while the visitor
// is asked, flushed on Allow and thrown away on No thanks. gtag and the script's loading are handed in, so the tests drive
// it with a fake; analytics.svelte.ts hands it the page's real queue.
import { REGIONS, type Choice, type Consent } from './consent.ts';

/** The page's `gtag()`: each call is queued for gtag.js, which works through the queue once it has loaded. */
export type Gtag = (...args: unknown[]) => void;

export type EventParams = Record<string, string | number>;

export class Tracker {
	private consent: Consent;
	/** Events held while the visitor is asked. */
	private held: [string, EventParams][] = [];
	/** gtag is set up and its script asked for; it can't be unloaded, only told the visitor declined. */
	private loaded = false;
	private id: string;
	private gtag: Gtag;
	private load: () => void;

	/** `load` injects gtag.js, deferred as it sees fit; it is called at most once. */
	constructor(id: string, consent: Consent, gtag: Gtag, load: () => void) {
		this.id = id;
		this.consent = consent;
		this.gtag = gtag;
		this.load = load;
		if (consent.is !== 'granted') return;
		this.setUp();
		// A visitor who allowed it on an earlier visit is counted as they chose, wherever the backstop places them.
		if (consent.chosen) this.gtag('consent', 'update', { analytics_storage: 'granted' });
	}

	get state(): Consent['is'] {
		return this.consent.is;
	}

	/** An event with exactly its params: sent when granted, held while asking, dropped otherwise. */
	event(name: string, params: EventParams) {
		if (this.consent.is === 'granted') this.gtag('event', name, params);
		else if (this.consent.is === 'asking') this.held.push([name, params]);
	}

	/**
	 * The visitor's choice, from the bar or another tab. Allow grants the default the EEA backstop denied, sends what was
	 * held and loads gtag if it hasn't; No thanks drops what was held, and tells a loaded gtag. Neither does anything
	 * without a measurement ID or under GPC.
	 */
	choose(choice: Choice) {
		const was = this.consent.is;
		if (was === 'off' || was === 'gpc' || was === choice) return;
		this.consent = { is: choice };
		if (choice === 'denied') {
			this.held = [];
			if (this.loaded) this.gtag('consent', 'update', { analytics_storage: 'denied' });
			return;
		}
		this.setUp();
		this.gtag('consent', 'update', { analytics_storage: 'granted' });
		for (const [name, params] of this.held) this.gtag('event', name, params);
		this.held = [];
	}

	/**
	 * Once: ad signals denied everywhere, analytics storage denied for the EEA, the UK and Switzerland until a choice
	 * grants it, Google Signals and ad personalisation off, no automatic page view; then gtag.js.
	 */
	private setUp() {
		if (this.loaded) return;
		this.loaded = true;
		const g = this.gtag;
		g('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
		g('consent', 'default', { analytics_storage: 'denied', region: REGIONS });
		g('js', new Date());
		g('config', this.id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
		this.load();
	}
}
