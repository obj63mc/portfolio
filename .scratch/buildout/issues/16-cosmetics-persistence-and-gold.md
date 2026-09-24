# 16: Cosmetics: seven grants, the persistence rune, presence pop and gold

**What to build:** The first click on a granting prop (the diploma, any Foundry poster, the MonsterCommerce eye, the moose, any Side Project tap, any humidor box, Joe's bike) pops its cosmetic onto the visitor's cursor with a 300 ms scale-in, and everyone in the room sees it through a presence update. One is worn at a time, the most recently granted; re-clicking a granting prop re-wears it. Every client draws cosmetics from the atlas by id at the head, face or side anchor, never covering the flag, scaled with the cursor. Once every cosmetic the build knows is earned the body turns gold, derived and never stored. A returning visitor gets their worn cosmetic and earned set back from the one localStorage key, `stl-portfolio`, through the single Svelte 5 rune module that is the only code touching that key, implementing the spec's shape (`v`, `worn`, `earned`, `laps`, `sound`, `analytics`) and its read rules (per-field validation, fresh start on bad JSON or a newer `v`, unknown ids kept but not drawn, worn outside earned becomes 0), its write rules (write on every change, never on unload, re-read and merge first: earned is a union, laps keep the fastest ten, the rest last-writer-wins, everything in try/catch, memory-only if storage throws), and the window `storage` event (a cosmetic earned in another tab updates this tab, sends presence, plays nothing; a consent denial there is forwarded to analytics later).

**Blocked by:** 13 (presence and the atlas), 15 (the click)

**Status:** ready-for-agent

- [ ] Each of the seven granting props grants its cosmetic on first interaction with the pop, and the room sees it; opening the card counts as the click
- [ ] Wearing, replacing and re-wearing behave as specified; the worn id crosses the wire and the server rejects ids outside 0 to 7
- [ ] Earning all seven turns the cursor gold; gold is derived, and a build that knows fewer cosmetics still computes it
- [ ] Reload restores worn and earned; a second tab earning a cosmetic updates the first tab silently and sends its presence
- [ ] The rune module's read-merge-write and validation are pure functions tested with plain inputs (seam 2), including the bad-field, newer-`v`, unknown-id and merge cases
