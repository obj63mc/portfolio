# Overworld round twenty-three: the Arch levee's promenade merged into the shore path, the trees beside it whole

**Verdict:** on the installed master, the assembled scene and the plate's tiles at both densities, the promenade's paving fades into the cream shore path a little past its mid-road lamp, the shore runs past the old corner in one curve with no lamp off it, and the lawn beside it carries two whole round trees and no smear. Every automated check passes. Workshop acceptance in `art/review.html`, and the read on the running site, are Joe's.

Joe (2026-10-08), from a screenshot of the Arch grounds' riverfront south of the riverboat: the large road has to merge into the small path; the messed-up tree and bush left of the road need cleaning up, a tree looks cut off and stretched.

- **The defect, native px.** The grey-beige promenade ended on a line across its whole width, from (1508, 277) to the lamp at the kerb (1522, 272), and the cream path carried on below it. On the lawn a round tree at (1484, 252) trailed a dark green band down to half a tree at (1513, 281), its trunk and shadow at (1511, 289).
- **The round.** `sources/overworld-fix/rounds/round-23.json`, one 256 px tile, `levee`. Codex drew it once (attempt a): a good taper and two whole trees, but its shoreline sat about 4 px inland of the master's, which the mask pasted as a wedge of water inside the kerb, and it added a lamp post. So the tile is drawn by hand, no model, by `scripts/art/overworld/levee-merge.py`, in the base's own colours:
  - The paving fades into the shore path's cream across the road's whole width, along the road, from 5 px past the mid-road lamp's foot, and is all cream 6 px short of the kerb lamp; the kerb takes the path's pale rim with it. The road narrows evenly to the path's width, its lawn edge moved in by about 1 px at most.
  - The kerb lamp, the master's own at (1524, 265 to 275), stood in the water off the levee's squared corner. It is removed, post and light (Joe), its pixels the row's own water. The shore from y 262 to 286 is one Hermite curve between the base's shore above and below: about 2.5 px of the corner go to water and about 1.5 px of path are added below it. The mid-road lamp and the lamp south of the curve keep their pixels; none is added or moved. The paving above the fade keeps its own.
  - The road's lawn edge is the base's own, measured per row, carried under the old half tree by a Hermite curve to the path's edge below it.
  - The lawn is relaid in each row's own tone over the band, the half tree, its trunk and its shadow.
  - The round tree is keyed out of the base, without the band or its pale halo, and set back in place; a second copy stands where the half tree stood, its foot at (1509, 291). Each has a small shadow at its foot. No tree was drawn.
- **Rejected first (Joe, the same day).** The first hand tile widened the promenade's cream border strip while the paving pinched out to a point against the kerb at the kerb lamp: the road read as running into the river, to a lamp over the water. The second kept the lamp and carried the bank round its foot, out to x 1529.5, so that it stood on the path: a bump out into the water, where Joe wanted one smooth curve and no lamp. The tile was redrawn as above and the round amended, not followed by another, since nothing of it was committed.
- **Stitch.** Drift 0.0, no pixel changed outside the mask; `tiles.py check` found no dead-end road.
- **Install.** `install-master.sh twenty-three` upscaled the master 4×, composited the six decals, re-derived the plate, its tiles at both densities and the master-derived mattes, listed no stale extraction and validated. `sync-geometry.py` changed nothing. Against the committed master, the new one differs by more than 6 % of a channel only round the edit (4× px x 5600 to 6400, y 800 to 1200), a handful of stray px aside.
- **Geometry.** Nothing here is a prop, a cut-out, a decal or a hit target; the lamp was plate scenery. The river polygon's west bank, the riverboat's obstacle rectangle and the depth regions in `src/lib/scenes/overworld.ts` are as they were: the shore moved by 2.5 native px at most (9 world px), and the polygon's bank there, traced at 50 world px rows, runs 5 native px or more outside the painted one (native x 1531 at y 279, the shore at 1525).
- **Read.** At 2× on the installed master, at the zoom of Joe's third screenshot (the master at 4×), on the composite and on plate tiles 9-1 and 10-1 at 2×, beside the same crops before: no straight end and no point at the water, the paving gone into cream, the shore one curve with no corner, bump or lamp, no ghost of the lamp in the water, no band, both trees whole on the lawn, no seam, fringe or tone step in the lawn or the path. The 1.25× tiles were rebuilt by the same install and not opened after this last change.
- **Not read.** The running site: the phone frame, foreground ordering, motion and reduced motion were not looked at; the round touches no prop, rig or foreground layer.
- **Checks.** `art:check`, `art:test`, `art:validate`, `check`, `build` and `npm test` pass.

## Hashes (SHA-256)

- `art/manifest.json`: `de9fd17e232d6243da76a1f4d6f6fb2fb703a022e086254e424988e105b5138e`
- `art/generated/review.json`: `1d35388620f00b2d0b808d279d46b3e27e2f2447af7f73af2805a572dc951284`
- `art/generated/overworld/composite.webp`: `493ede6bf2fdbebdeecf4f608ba2a71e3b7b2479f077e8718ed764c466ab741d`
- `art/generated/contact-sheet.webp`: `599421185aa9c5066c271bd9e0345ba30dafd86fb208ef2df00e728f4978880e`
- `art/generated/overworld/overworld-master/image.webp`: `081790e4481811390ed47ca9d733dc5a5bbca3dc527739e073ae0c8d78ac9d26`
- `art/generated/overworld/overworld/image.webp`: `2aed60b5d54c07d391d2a2fe47f03c919ca2b0e8e086e1b854e2ddf846e78b50`
- `art/sources/overworld-fix/stitched.png`: `9cf16d51e12d246fad822796656687a439eed96e8767d78db239f82a96adc02d`
- `art/sources/overworld-fix/rounds/round-23.json`: `c3c64314e5e6dd3bc1b5586631eadb0c43a6dfbb12429b269f3b4ca14c16229b`
- `art/sources/overworld-fix/decals.json`: `13607b23f9ae309bb8d0596aea845cf9a55364de2928117a940a2148df89eaea`
- `art/sources/overworld-fix/tiles/t-levee-model.png`: `0c77a6a50dbd4a2a9eb788eafa539d51cb87cfb5251b67e9d5f02eea22c69650`
- `scripts/art/overworld/levee-merge.py`: `af2ec5ba59517e7ed4292d7279a40193d8ecee262909b1f0d84f1a509da0a3da`
