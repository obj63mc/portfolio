# 23: Analytics: GA4 events, deferred loading, consent popover, GPC

**What to build:** In production a bundled `dataLayer` and `gtag()` queue exist from the start (never an inline script) and gtag.js is injected after the first frame on `requestIdleCallback` with a 3 s timeout, only when `PUBLIC_GA_ID` is set, which the Workers Builds build script passes through only when `WORKERS_CI_BRANCH` is `main`; with no id there is no script and no queue. Enhanced measurement is off; `page_view` is sent manually from `afterNavigate` on every pathname change including the first load, never for fragments. Events: `page_view` (scene path), `card_open` (`prop_id`, `scene`), `contact_click` (`method`), `cosmetic_earned` (`cosmetic_id`, first grant only), `gold_cursor`, `screen_play` (`title`, when the visitor's own click is accepted). Nothing else, and never the flag, socket id or any user id. Ad signals denied everywhere, Google Signals off, and a region-denied `consent default` for EEA, UK and CH as the backstop. A visitor in a `Europe/*`, Atlantic EU or `Africa/Ceuta` timezone with no stored choice sees a one-line bar ("Can I count visits with Google Analytics? No ads, no tracking elsewhere.") with equal Allow and No thanks buttons as a `popover` stacked above the Join card, operable before Join and not counting as Join; events queue in memory until a choice; Allow loads gtag and flushes; No thanks discards and gtag never loads; the choice persists through the rune module's `analytics` field. The analytics icon beside the Sound toggle reopens the bar with the current choice pressed; No thanks after gtag has loaded sends `consent update denied`, as does a denial from another tab. Global Privacy Control true means GA never loads and the bar shows both buttons disabled with a note; Do Not Track is ignored.

**Blocked by:** 09 (Join card stacking), 16 (the rune and grants), 17 (`screen_play`)

**Status:** ready-for-agent

- [ ] A preview build contains no GA script and no queue; the build-output test asserts it
- [ ] A production build with an id loads gtag after the first frame and sends the six events with exactly the listed parameters
- [ ] In a European timezone the popover appears above the Join card, both buttons work before Join, and the choice persists; other timezones get no bar
- [ ] The icon reopens the bar; choosing No thanks after Allow sends the consent update
- [ ] With GPC on, gtag never loads and the bar is disabled with the note
- [ ] Playwright smoke: the consent popover in a European timezone
