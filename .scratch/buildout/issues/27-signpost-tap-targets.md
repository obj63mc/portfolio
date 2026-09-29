# 27: Signpost tap targets of at least 48 x 48

**What to build:** Every signpost link gets a tap target of at least 48 x 48 CSS px, which is 80 x 80 world px at the phone's 0.6 scale (Joe, 2026-09-29). That covers the four contacts (Resume, Email, LinkedIn, GitHub) and the five district arrows. Each target sits over its own painted arm or plaque. Today the nine links share the 60 x 120 board in equal slots of about 13 world px, 8 CSS px on a phone (ticket 08).

- A larger signpost is drawn through the art pipeline in the overworld's style. It is a standalone cut-out placed by its `world` rect (`art/README.md`), so it is re-placed, not painted into the plate.
- Scene data gains a world rect per link: `signpost.contacts` and the district arrows in `src/lib/scenes/overworld.ts`. The layer then places each link at its own rect instead of splitting the board.
- The signpost still fits the first 390 x 844 phone frame at 0.6 centred on the welcome sign, clear of the Maplewood foreground tree and the Moosylvania door (`tests/overworld-geometry.test.ts`). Nine 80 px targets stacked in one column are 720 world px tall, against a frame of 650 x 1406, so the arms may need two columns or two posts.
- The skip link (still open, see 08) sits on the signpost while the engine runs, and moves with it.

**Blocked by:** 04 (resolved), 08 (resolved)

**Status:** needs-triage

- [ ] Each of the nine signpost links is at least 80 x 80 world px, over its own painted arm or plaque
- [ ] A geometry test asserts the size, and that the whole signpost is in the first phone frame
- [ ] The build-output test checks each link's rect against scene data
