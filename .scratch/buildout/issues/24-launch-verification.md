# 24: Launch verification

**What to build:** Joe confirms the site is ready on the real domain: the deploy ticket's verification steps (a phone and a desktop see each other at barmadden.com; `curl` with a foreign `Origin` against `/ws` gets 403; `multiplayer:off` drops both to single-player and `multiplayer:on` restores them; a PR Preview returns `noindex` and loads no GA; `www` redirects), a hands-on phone soak on the full overworld and each sub-scene using the bench and the 10-minute soak for numbers (the phone verdict is Joe's, spec gap 9), a content and clearance review of every card against the content inventory, and a check that every audio file has a ledger row and licence certificate.

**Blocked by:** 05, 07, 14, 20, 22, 23

**Status:** ready-for-human

- [ ] Every verification step in the deploy ticket passes on barmadden.com
- [ ] Phone soak numbers recorded for the overworld and each sub-scene; the phone stays cool and smooth by Joe's judgement
- [ ] Every card's text and logo checked against the inventory and its clearance
- [ ] Every sound file has a ledger row and a certificate outside the static folder
- [ ] `npm run usage` shows a projected bill Joe is happy with at launch traffic

## Comments

2026-09-30, the agent's pass (Joe, the rest is yours). Tickets 25, 26 and 27 are off the list: Joe builds the ATM, the depth pass and the signpost targets directly. Ticket 20 (river current) is still open and listed as a blocker here; the protocol already carries the river bit, but no drift runs.

**Deploy verification on barmadden.com**
- Passed from curl:
  - `/` returns 200 with `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`, the permissions policy and no `X-Robots-Tag`.
  - `http://` returns 301 to `https://`.
  - `www` now resolves, and `https://www…/midtown/foundry?x=1` returns 301 to the apex with the query kept. This was 07's last open item.
  - `/ws/overworld` with a foreign `Origin` returns 403, and so does one with no `Origin`.
  - A Googlebot user agent gets `Server-Timing: bot`.
  - `/nope` returns 404.
- Passed with two sockets from Node, `Origin: https://barmadden.com`. Both landed in `overworld:1`. B's hello listed A, A got B's `in`, and B's move reached both as a frame. That is the multiplayer path; the phone-and-desktop check by eye is still Joe's.
- Not done:
  - `multiplayer:off`/`on` would change production's secret and drop live visitors, so it stays Joe's.
  - There is no open PR, so there is no Preview URL to check live. Previews build without GA because `measurementId` is empty off `main`, which `tests/analytics.test.ts` covers. `noindex` is ticked in 07.

**Phone soak:** Joe's. Use `npm run bench 10` on the phone. The only numbers so far are ticket 10's Pixel.

**Sound files:** all 34 files in `static/audio` have a ledger row in `docs/audio-sources.md`, and every row names an existing file. There are no licence certificates anywhere in `audio/`. The 31 Freesound files are CC0, and their rows link each source. The three Pixabay tracks (theme, Brennan's jazz, Side Project's music) need Joe to save Pixabay's licence or download record under `audio/` if Pixabay provides one.

**Usage:** `npm run usage` projects $5.00 for September, the Workers Paid base. DO requests are 329, messages in 129,709, and duration is 160 of 400,000 included GB-s. That is pre-launch traffic, so the number to judge comes after launch.

**Cards against the inventory** (subagent read of `src/lib/scenes/*.ts` against the inventory; the placeholders were checked live):
- Launch blockers, all live on barmadden.com now:
  - Email is `mailto:TODO` and LinkedIn is `linkedin.com/in/TODO` (`src/lib/scenes/overworld.ts:189-190`).
  - `static/resume.pdf` is the placeholder ("resume placeholder. Replace static/resume.pdf with the real PDF.").
- The meeting TV plays the Fast Five demo as a stand-in (`moosylvania.ts:78`). That shows a Universal title outside the Foundry and the marquee, which the clearance rule doesn't allow. Its card body is the placeholder "A video from Joe Madden."
- Generic lines: the ten bottles, five humidors and STG plaque say only "client work at Moosylvania" or "Joe built the website", with no line per brand on what was done. The Side Project sign's line is a placeholder.
- Framing: the scene descriptions say "brands Joe Madden has built for" (`side-project.ts:51`, `brennans.ts:41`). The spec's framing is "brands I worked with".
- On no scene:
  - PayPal and Venmo (the ATM).
  - CAO and General Cigar, which are cleared.
  - The moose's personal line and the statue's text on what Moosylvania is. Neither prop has a card now.
- Shown, but the inventory has no clearance line:
  - The SLU logomark decal.
  - The Side Project light-bulb mark.
  - The Lorax character on its poster.
- The marquee doesn't name Universal and separates its titles with `*`. The spec writes "Now Playing: …, …".
- Matching the inventory: the welcome sign, MonsterCommerce sign and eye, server rack, ride sign (Strava), diploma, whiteboard, workstation (GitHub), the four lobby computers and the chalkboard. The logos of the ten bottles and five humidors are cleared. No typos found.
- The inventory itself needs updating: Strava moved to the ride sign, and the moose, statue and bike have no cards.
