// GA4 on the page (spec: "Analytics"; buildout ticket 23): the bundled `dataLayer` and `gtag()` queue, gtag.js loaded
// after the first frame when the idle browser gets to it, the consent bar's state, and the six events. Only a production
// build has a measurement ID (svelte.config.js); in any other there is no queue, no script and no bar, and every event
// below is a call to nothing. The rules are analytics/consent.ts's, what reaches gtag analytics/tracker.ts's; the
// choice persists through saved.svelte.ts.
import { browser } from '$app/environment';
import { PUBLIC_GA_ID } from '$env/static/public';
import { contactMethod, initial, sceneOf, type Choice, type Consent } from './analytics/consent.ts';
import { Tracker, type Gtag } from './analytics/tracker.ts';
import { saved } from './saved.svelte.ts';
import { KEY } from './saved.ts';
import type { ScreenTitle } from './scenes/foundry.ts';
import type { CosmeticId } from './scenes/types';

declare global {
	interface Navigator {
		/** Global Privacy Control: true where the visitor turned it on; absent in browsers without it. */
		globalPrivacyControl?: boolean;
	}
	interface Window {
		dataLayer?: unknown[];
	}
}

/** The build's GA4 measurement ID, empty in every build but production's. */
export const GA_ID = PUBLIC_GA_ID;

/** The page's queue, which gtag.js works through once it has loaded: it reads each call's arguments object, not an array. */
function queue(): Gtag {
	const layer = (window.dataLayer ??= []);
	return function gtag() {
		layer.push(arguments);
	};
}

/** gtag.js, injected after the next frame once the browser is idle, or within 3 s; where there is no idle callback (Safari), just after that frame. */
function load() {
	const inject = () => {
		const s = document.createElement('script');
		s.async = true;
		s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
		document.head.append(s);
	};
	requestAnimationFrame(() => ('requestIdleCallback' in window ? requestIdleCallback(inject, { timeout: 3000 }) : setTimeout(inject)));
}

const consent: Consent =
	browser && GA_ID
		? initial({
				id: GA_ID,
				gpc: navigator.globalPrivacyControl === true,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
				stored: saved.analytics
			})
		: { is: 'off' };
const tracker = browser && GA_ID ? new Tracker(GA_ID, consent, queue(), load) : null;

/** What the bar shows: open, and the tracker's state, whose choice it shows pressed. */
let open = $state(consent.is === 'asking');
let state = $state(consent.is);
/** The Join card is up (Consent.svelte watches it): the bar shows inside it, the one place a modal card leaves operable. */
let joinUp = $state(false);

/** The consent bar (Consent.svelte) and the analytics icon beside the Sound toggle. */
export const bar = {
	get open() {
		return open;
	},
	get joinUp() {
		return joinUp;
	},
	set joinUp(up: boolean) {
		joinUp = up;
	},
	/** The choice in force, pressed when the bar reopens: none while asking, and none under GPC, where GA never loads. */
	get pressed(): Choice | null {
		return state === 'granted' || state === 'denied' ? state : null;
	},
	/** Global Privacy Control is on: both buttons are disabled, with a note. */
	get gpc() {
		return state === 'gpc';
	},
	/** The icon reopens the bar with the current choice pressed, or closes it again. */
	toggle() {
		open = !open;
	},
	/** Allow or No thanks: kept, applied, and the bar closes. Answering it is not joining. */
	choose(choice: Choice) {
		if (!tracker || state === 'gpc') return;
		saved.analytics = choice;
		tracker.choose(choice);
		state = tracker.state;
		open = false;
	}
};

if (browser && tracker) {
	// A choice made in another tab applies here, a denial telling a loaded gtag; the saved state heard the event first,
	// having listened from its module's load.
	addEventListener('storage', (e) => {
		const choice = saved.analytics;
		if (e.key !== KEY || !choice || choice === state) return;
		tracker.choose(choice);
		state = tracker.state;
		if (state === choice) open = false;
	});
	// A contact link used, from the signpost or a card: a click, the keyboard's included, or a middle click. A click the
	// engine swallows (the one that only takes the pointer lock back, a touch drag's) never reaches here.
	const used = (e: MouseEvent) => {
		const a = (e.target as Element | null)?.closest?.('a');
		if (a && (e.type === 'click' || e.button === 1)) linkUsed(a);
	};
	document.addEventListener('click', used);
	document.addEventListener('auxclick', used);
}

/** The last page counted: a fragment on the same page never counts again. */
let counted: string | null = null;

/** A scene entered, the first load included (afterNavigate), by its path: never the fragment, nor the query. */
export function pageView(url: URL) {
	if (!tracker || url.pathname === counted) return;
	counted = url.pathname;
	tracker.event('page_view', { page_location: url.origin + url.pathname });
}

/** A prop's card opened, which is its click. */
export function cardOpen(propId: string) {
	tracker?.event('card_open', { prop_id: propId, scene: sceneOf(location.pathname) });
}

/** A link used; only a contact counts (`contact_click`). The engine calls this for a middle click under the pointer lock. */
export function linkUsed(a: HTMLAnchorElement) {
	const method = tracker && contactMethod(a.href, location.href);
	if (method) tracker.event('contact_click', { method });
}

/** A cosmetic earned for the first time, here and not in another tab; `gold` when it was the last one. */
export function earned(id: CosmeticId, gold: boolean) {
	tracker?.event('cosmetic_earned', { cosmetic_id: id });
	if (gold) tracker?.event('gold_cursor', {});
}

/** The room took the visitor's own poster click: a new reel of the title they asked for. */
export function screenPlay(title: ScreenTitle) {
	tracker?.event('screen_play', { title });
}
