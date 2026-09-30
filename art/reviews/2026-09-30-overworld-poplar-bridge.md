# Overworld: the Poplar Street bridge's cut-out, and what stands in the water

**Verdict:** accepted. The Poplar Street bridge's span over the river is a masked matte of the master, its deck and both piers whole with no fringe, and it lines up with its own pixels in the plate. The river's geometry now marks what a floating cursor drifts round, and the river's end runs along the Poplar Street deck.

Joe (2026-09-30), from the site:
- A cursor floating down went through the Eads Bridge's pier; it should drift round it, and round anything else standing in the water.
- At the last bridge, a cursor in the water was drawn over the bridge instead of under it.

- **The cut-out.** `poplar-bridge`, kind `foreground` like `eads-bridge`, is derived from `overworld-master` through a hand-measured polygon (`registration.mask`) in the crop x 4950 to 5850, y 1660 to 2140, read on a 50 px gridded crop of the 4× master:
  - the deck's top edge from (4950, 1668) to (5850, 1839) and its underside, from (4950, 1832) to (5850, 2011);
  - the west pier, x 4987 to 5100, down to its base at 2001;
  - the east pier, x 5535 to 5655, down to 2133, its shaded face cut on the slant.
  The crop is taken at its native 1058 × 564, so the matte copies the master's pixels unresampled. The deck over the land stays in the plate: only a cursor on the water is drawn under the bridge. The result is 1058 × 546 at world (4950, 1668.5), 900 × 464.7.
- **Read.**
  - On a checkerboard the cut-out is the deck, both parapets and both piers, whole, with a thin water halo at the piers' feet that lands on identical plate pixels.
  - On the site, over a cursor that stepped into the water and back under the deck, the arrow is hidden. On a cursor walking the deck, the arrow is drawn over it (`tests/river.spec.ts`).
- **Geometry** (`src/lib/scenes/overworld.ts`), read on gridded crops of the master:
  - Both decks are walkable: the Eads deck as before, and the Poplar Street deck's road and parapet face between x 4950 and 5850, on the banks.
  - What stands in the water, which a float drifts round (the review workshop's yellow boxes):
    - the Eads middle pier, x 5310 to 5470, y 455 to 650;
    - the Arch levee riverboat with its gangway to the bank, x 4960 to 5185, y 690 to 818;
    - the Belleville barge dock's crane and stilted pier, x 5610 to 5805, y 1025 to 1185.
  - The Poplar Street piers stand south of the river's end, which now runs along the middle of that deck, from (4950, 1750) to (5850, 1925), so a floating cursor is hidden under the bridge when it is washed out.
  - `scripts/art/overworld/sync-geometry.py` syncs both bridges' rects.
- **Checks.** `art:validate` (109 assets), `art:test` and `art:check` pass.

## Hashes (SHA-256)

- `art/manifest.json`: `179f489938b508d6fb9d67f2eb4abbf4447e1a92d4cac7dae3f8f0a8c6b3707d`
- `art/generated/review.json`: `31a1832c11d193b53a4f54e182401742fa2486f21f4313cab2661d0b7adaa07e`
- `art/generated/overworld/poplar-bridge/image.webp`: `0d05b64bd2c1b8ae67cc72f3b0865dfc048710b00cc45b5bd3b99f233b316607`
- `art/generated/overworld/poplar-bridge/asset.json`: `5080c7c149bc243cca4f5178978fbfd4538603b7cb20a0cd48820d34fcb8d339`
- `art/generated/overworld/composite.webp`: `b46a29f8719dbcaae310e51fa43392a9104182e853820c98139e5af50cf34162`
- `art/generated/contact-sheet.webp`: `5521de1eb2f6b805df6d0cd8312d9623a8c26c0e2634c7cf4ff8b909406197c7`
- `art/generated/overworld/overworld-master/image.webp`: `f663e38a30426057fa205f9329b546cb103573490b3b356c34669d7cba920a5b` (unchanged)
