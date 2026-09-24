# What does Google Analytics track, and how does it load without hurting the scene?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

Joe has chosen Google Analytics (GA4) for the site; the choice of tool is settled. Decide how it fits: which events are worth tracking (scene views per scene URL, prop clicks, cards opened, cosmetics earned, shared screen plays, contact and résumé link clicks, the socket falling back to single-player), how scene changes on a static SvelteKit site become page views, whether a consent banner or Consent Mode is needed for visitors outside the US given the site already shows GeoIP flags, how and when the gtag script loads so it stays off the 60 fps budget and the first paint, where the measurement ID lives in the build, and what the Content Security Policy must allow. Output: the analytics section of the spec: the event list, the loading and consent rules, and config.

## Answer

Resolved 2026-09-24 in a grilling session with Joe.

### Page views

- Enhanced measurement is off entirely, including history-based page views, outbound clicks, file downloads and scroll.
- `page_view` is sent manually from SvelteKit's `afterNavigate` whenever the pathname changes. This covers the first load too, since `afterNavigate` runs on hydration with type `enter`. Fragment links such as `#belleville` pan the camera and never count.

### Events

| Event | Params | Fires when |
|---|---|---|
| `page_view` | scene path | a scene is entered, including the first load |
| `card_open` | `prop_id`, `scene` | a card opens (opening a card counts as the prop click) |
| `contact_click` | `method`: `resume`, `email`, `linkedin`, `github`, `strava` | a contact or résumé link is used, from the signpost or a card |
| `cosmetic_earned` | `cosmetic_id` | first grant only |
| `gold_cursor` | none | the seventh cosmetic is earned |
| `screen_play` | `title` | the visitor's own poster click is accepted by the server |

Not tracked: district pans, hovers, lap times, the sound toggle, input type, camera movement, multiplayer or socket state, and anything about peers. The GeoIP flag, socket id and any user id are never sent.

### Loading

- A `dataLayer` and `gtag()` queue lives in a bundled module, never an inline `<script>`, and exists from the start so early events are kept.
- gtag.js is injected after the scene's first frame, on `requestIdleCallback` with a 3 s timeout.
- Production only. The measurement ID is `PUBLIC_GA_ID` via `$env/static/public`, set in CI for the production build only. With no ID, analytics is fully off: no script and no queue. Dev and branch previews send nothing. No second property.

### Consent

- Ad signals (`ad_storage`, `ad_user_data`, `ad_personalization`) are denied everywhere. Google Signals is off and there is no Ads linking.
- Region detection is a timezone check: `Europe/*` plus the Atlantic EU zones (Canary, Azores, Madeira, Reykjavik) and `Africa/Ceuta`. It over-includes non-EU Europe, which fails safe.
- A visitor in those timezones with no stored choice sees a non-modal bar pinned to the top of the screen, clear of the phone joystick, in the site's flat style. It has one line of copy ("Can I count visits with Google Analytics? No ads, no tracking elsewhere.") and two equal buttons, **Allow** and **No thanks**. It comes first in tab order, ahead of the scene's `<h1>`, and it stays until the visitor chooses. The scene works normally behind it. There is no privacy page or card; the single line is the notice.
- Before a choice, events queue in memory. **Allow** loads gtag (still deferred behind the first frame) and flushes the queue, including the initial `page_view`. **No thanks** throws the queue away. gtag never loads, and tracking does nothing for the rest of the session.
- Every other timezone loads GA with no bar.
- As a backstop for misdetected EU visitors, `gtag('consent', 'default', { analytics_storage: 'denied', region: [EEA, UK, CH] })` is set, so Google's own geolocation keeps cookies off for them.

### Changing the choice

- A small analytics icon sits next to the sound toggle for every visitor, in all regions. Its accessible name is "Analytics settings".
- Clicking it reopens the same bar, with the current choice shown as pressed (`aria-pressed`).
- Choosing **No thanks** after gtag has loaded sends `gtag('consent', 'update', { analytics_storage: 'denied' })`, since the script can't be unloaded mid-session. Nothing more is sent.

### Global Privacy Control

- `navigator.globalPrivacyControl === true` means GA never loads, in any region, whatever is stored.
- Browsers that don't implement GPC just return `undefined`, so the check never throws. The property is not in TypeScript's DOM lib, so `Navigator` is widened with an optional `globalPrivacyControl?: boolean` rather than cast to `any`.
- While GPC is on, the bar opened from the icon shows both buttons disabled, with a note that the browser's privacy signal is on.
- Do Not Track is ignored.

### Storage

This amends the persistence schema ticket: the `stl-portfolio` object gains `analytics: 'granted' | 'denied'`, left out while the visitor hasn't chosen.

- A missing field in a European timezone shows the bar. A missing field in any other timezone means GA loads. `'denied'` means off everywhere.
- The field is validated like the others, and a bad value counts as missing. On write it merges with last writer wins.
- A change made in another tab is picked up live through the `storage` event. A denial there sends `consent update denied` in this tab.
- If storage throws, the choice lives in memory, so an EU visitor in a private window is asked on every visit.

### Content Security Policy

The analytics needs these allowances. The deploy ticket owns the header itself.

- `script-src https://www.googletagmanager.com`
- `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
- `img-src https://*.google-analytics.com https://*.googletagmanager.com`

### Ruled out

- Filtering Joe's own traffic. The numbers are directional.
- A privacy page or privacy card.
- A preview GA property.
- A GA admin checklist. GA4 property setup is routine and left to implementation.
- Partytown.

### Not changed

No glossary terms and no ADR: everything here is implementation detail and easy to reverse.

2026-09-24, amended by [What does each district and prop sound like, and how is sound switched on?](19-sound-design.md): every device now opens on a modal Join card, which would make the top consent bar inert. The bar therefore opens as a `popover` shown after the Join dialog, so it stacks above the dialog backdrop and stays operable; answering it is not joining. Copy, choices, defaults, GPC and loading rules are unchanged. The analytics icon sits after the sound toggle in the bottom-left cluster. An opt-out analytics toggle on the Join card was considered and ruled out, since a pre-ticked box is not valid consent in the EU (CJEU C-673/17, Planet49).
