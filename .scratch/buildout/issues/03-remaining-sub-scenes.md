# 03: The other four sub-scenes with the full content inventory

**What to build:** `/slu`, `/foundry`, `/side-project` and `/brennans` prerendered the same way as the lobby, each from its own scene-data module, with every prop, card and link from the content inventory: the CS lab (diploma, whiteboard, workstation), the theatre (screen, three posters with the Universal Home text under them), the Side Project bar (one tap or bottle per cleared brand with its one-line "what we did", the chalkboard), Brennan's (one humidor box per brand plus the Scandinavian Tobacco Group logo, the ATM). The overworld gains door links for SLU, the Foundry, Side Project and Brennan's, and every sub-scene exits to `/#<venue>`. The overworld's exterior-only venues (MonsterCommerce, Carondelet Park) and all exterior props get their cards too, so after this ticket the whole inventory is on the site.

**Blocked by:** 01 (skeleton)

**Status:** resolved

- [x] The four URLs are prerendered with the flat slugs above, `<title>` carrying the district, description, `<h1 tabindex="-1">`, props left to right, exit link
- [x] Every prop in the content inventory exists as a button plus dialog on some scene, including the exterior props (signpost, welcome sign, moose, MonsterCommerce sign and server rack, marquee, track, bike, ride sign)
- [x] Clearance rules hold: logos only where the work is public or Joe cleared it; the Universal Home titles are told only on the screen and under the posters
- [x] The shared screen's button name has a place for its state ("Screen, now playing Fast Five"), defaulting to idle wording
- [x] Door links from the overworld to all five sub-scenes are real `<a href>`s
- [x] The build-output test passes for all six scene URLs

## Comments

2026-09-24, resolved in one commit on `main`. The five sub-scenes render through one dynamic route (`src/routes/[venue]`) from `SUB_SCENES` in `src/lib/scenes/index.ts`, keyed by the flat slug that is also the overworld venue id. `Prop.svelte` takes an optional `state` that replaces the gist in the button name; `foundry.ts` exports `SCREEN_TITLES` and `screenGist(title?)` for the shared-screen ticket (17) to feed it. Left for Joe: the per-brand "what we did" one-liners at Side Project and Brennan's are not on record anywhere, so the taps and humidor boxes carry a neutral "client work at Moosylvania" line (website builds named for Bacardi, Grey Goose and Barefoot, per the inventory's clearance note); the moose line is still unwritten. Clearance: the marquee names the studio only; the three titles appear on the screen card and under the posters, and the test asserts they appear nowhere else.
