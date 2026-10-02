// Analytics consent (spec: "Analytics"; buildout ticket 23) as pure functions: what GA does this session given the build's
// measurement ID, the browser's privacy signal, its timezone and the visitor's stored choice; and which of the site's
// links and pages its events name. Cloudflare's beacon loads where GA does, on the same answer (analytics.svelte.ts).
// Nothing here touches the DOM, storage or gtag.

export type Choice = 'granted' | 'denied';

/**
 * What analytics does this session: nothing at all in a build with no measurement ID; never loads under Global Privacy
 * Control; asks, with events held in memory until the visitor chooses; or runs on a choice, stored or implied. A grant
 * the visitor `chosen` overrides the European backstop; an implied one, outside Europe's timezones, leaves it standing.
 */
export type Consent = { is: 'off' } | { is: 'gpc' } | { is: 'asking' } | { is: 'denied' } | { is: 'granted'; chosen?: boolean };

/**
 * The EEA, the UK and Switzerland, ISO 3166 codes: the region-denied `consent default` that keeps Google's own geolocation
 * as the backstop for a European visitor the timezone missed.
 */
export const REGIONS = [
	'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
	'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'
];

/**
 * The EU's Atlantic islands and Iceland, Spain's Ceuta, and Cyprus, an EU member whose zones are Asia's. It over-includes
 * the rest of Europe's zones (Europe/*), which fails safe.
 */
const EUROPEAN = new Set(['Atlantic/Canary', 'Atlantic/Azores', 'Atlantic/Madeira', 'Atlantic/Reykjavik', 'Africa/Ceuta', 'Asia/Nicosia', 'Asia/Famagusta']);

/** A timezone whose visitors are asked before GA counts them. */
export const european = (timeZone: string) => timeZone.startsWith('Europe/') || EUROPEAN.has(timeZone);

/**
 * Consent at load. Global Privacy Control means GA never loads, anywhere, whatever is stored; Do Not Track is ignored. A
 * stored choice stands; with none, a European timezone asks and every other loads with no bar.
 */
export function initial(s: { id: string; gpc: boolean; timeZone: string; stored?: Choice }): Consent {
	if (!s.id) return { is: 'off' };
	if (s.gpc) return { is: 'gpc' };
	if (s.stored) return s.stored === 'granted' ? { is: 'granted', chosen: true } : { is: 'denied' };
	return { is: european(s.timeZone) ? 'asking' : 'granted' };
}

export type ContactMethod = 'resume' | 'email' | 'linkedin' | 'github' | 'strava';

/** A host or any of its subdomains. */
const on = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * The contact a link reaches, for `contact_click`: the resume, its page (Joe, 2026-10-02) or its PDF, email, LinkedIn,
 * GitHub or Strava, from a card or the resume page; null for every other link, the doors and the districts' fragments
 * included. `base` resolves a relative href.
 */
export function contactMethod(href: string, base: string): ContactMethod | null {
	let url: URL;
	try {
		url = new URL(href, base);
	} catch {
		return null;
	}
	if (url.protocol === 'mailto:') return 'email';
	if (url.origin === new URL(base).origin) return url.pathname.endsWith('.pdf') || url.pathname.replace(/\/+$/, '') === '/resume' ? 'resume' : null;
	if (url.protocol !== 'https:') return null;
	const host = url.hostname;
	return on(host, 'linkedin.com') ? 'linkedin' : on(host, 'github.com') ? 'github' : on(host, 'strava.com') ? 'strava' : null;
}

/** The scene a page path shows, named as its room is: `overworld` at the root, else the venue's slug. */
export const sceneOf = (pathname: string) => pathname.replace(/^\/+|\/+$/g, '') || 'overworld';
