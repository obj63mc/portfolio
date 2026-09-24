# 24: Launch verification

**What to build:** Joe confirms the site is ready on the real domain: the deploy ticket's verification steps (a phone and a desktop see each other at barmadden.com; `curl` with a foreign `Origin` against `/ws` gets 403; `multiplayer:off` drops both to single-player and `multiplayer:on` restores them; a PR Preview returns `noindex` and loads no GA; `www` redirects), a hands-on phone soak on the full overworld and each sub-scene using the bench and the 10-minute soak for numbers (the phone verdict is Joe's, spec gap 9), a content and clearance review of every card against the content inventory, and a check that every audio file has a ledger row and licence certificate.

**Blocked by:** 05, 07, 14, 20, 22, 23

**Status:** ready-for-human

- [ ] Every verification step in the deploy ticket passes on barmadden.com
- [ ] Phone soak numbers recorded for the overworld and each sub-scene; the phone stays cool and smooth by Joe's judgement
- [ ] Every card's text and logo checked against the inventory and its clearance
- [ ] Every sound file has a ledger row and a certificate outside the static folder
- [ ] `npm run usage` shows a projected bill Joe is happy with at launch traffic
