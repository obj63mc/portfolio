# 03: The other four sub-scenes with the full content inventory

**What to build:** `/slu`, `/foundry`, `/side-project` and `/brennans` prerendered the same way as the lobby, each from its own scene-data module, with every prop, card and link from the content inventory: the CS lab (diploma, whiteboard, workstation), the theatre (screen, three posters with the Universal Home text under them), the Side Project bar (one tap or bottle per cleared brand with its one-line "what we did", the chalkboard), Brennan's (one humidor box per brand plus the Scandinavian Tobacco Group logo, the ATM). The overworld gains door links for SLU, the Foundry, Side Project and Brennan's, and every sub-scene exits to `/#<venue>`. The overworld's exterior-only venues (MonsterCommerce, Carondelet Park) and all exterior props get their cards too, so after this ticket the whole inventory is on the site.

**Blocked by:** 01 (skeleton)

**Status:** ready-for-agent

- [ ] The four URLs are prerendered with the flat slugs above, `<title>` carrying the district, description, `<h1 tabindex="-1">`, props left to right, exit link
- [ ] Every prop in the content inventory exists as a button plus dialog on some scene, including the exterior props (signpost, welcome sign, moose, MonsterCommerce sign and server rack, marquee, track, bike, ride sign)
- [ ] Clearance rules hold: logos only where the work is public or Joe cleared it; the Universal Home titles are told only on the screen and under the posters
- [ ] The shared screen's button name has a place for its state ("Screen, now playing Fast Five"), defaulting to idle wording
- [ ] Door links from the overworld to all five sub-scenes are real `<a href>`s
- [ ] The build-output test passes for all six scene URLs
