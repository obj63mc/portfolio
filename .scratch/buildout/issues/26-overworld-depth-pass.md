# 26: Overworld depth pass

**What to build:** Depth on the overworld, as in Cursor Camp: a cursor that walks up behind a building, a sign, the Arch or a tree is hidden behind it, and one that walks in front of it from the street is drawn over it. Today the overworld has only the Eads Bridge's river layering and two foreground trees, so in the workshop's Walk preview a cursor is drawn over everything (Joe, 2026-09-28).

Every piece that stands up from the ground becomes walk-behind scenery, under the same rule as the rooms (ticket 19). Each piece gets:
- a measured matte cut from `overworld-master`, 1:1 with its pixels
- an outline, the piece as drawn
- a front line along the base where it meets the ground
- the ids of the props standing on it, such as the MonsterCommerce sign and its eye, the Foundry marquee and the welcome board.

A cursor that steps on from the street side is drawn over the piece and can use its props. One that steps on from behind is hidden, and those props take no hover or cursor click until it steps off.

**Proposed tiers, for Joe to confirm:**
- **Landmarks, walk-behind:**
  - the five venue buildings: the Moosylvania church, the Side Project Cellar, Brennan's, McDonnell Douglas Hall and the Foundry
  - the MonsterCommerce building
  - the five district signs and the Forest Park sign
  - the Arch: behind it from above its base line; in front of its legs from below.
  - the Art Museum with its statue, the boathouse and pavilions in Forest Park, the Old Courthouse, Busch Stadium, the storefront rows, the grain elevator, the churches and the windmill.
- **Trees, walk-behind:** each free-standing tree, its front line at the foot of its trunk. There are dozens, so they would be traced semi-automatically from the canopy greens and trunk browns, then checked by eye. The two foreground trees (`maplewood-tree`, `park-tree`) would become walk-behind as well, so a cursor in front of them is no longer covered.
- **Houses:** each house as a unit, or one unit per block.
- **Flat, left in the plate:** roads, paths, lawns, the lake and the river, parking lots, fountain basins, playgrounds, benches and the ball field.
- **Unchanged:** the Eads Bridge keeps the river rule (ticket 20). The highway bridge at the Poplar crossing gets the same treatment, over a cursor in the river and under one crossing it.

**Constraints:**
- No walk-behind outline covers any part of another prop's hit area, the signpost or a venue door. The sub-scenes' geometry test extends to the overworld.
- The signpost and the welcome board stay usable in the first phone frame.
- `walkBehind` is listed back to front.
- The depth regions are unchanged.
- The `Overworld` scene type gains `walkBehind`, which only sub-scenes have today.

**Blocked by:** 04 (resolved). The engine rule is ticket 19; the data can land first and is previewed in the workshop.

**Status:** needs-info

- [ ] Joe confirms the tiers: which trees (all, or those near paths and venues), houses one by one or by block, and the Arch
- [ ] Mattes measured 1:1 on `overworld-master`, with outlines, front lines and props in `src/lib/scenes/overworld.ts`, listed back to front
- [ ] The overworld geometry test checks hit areas, props on their units and draw order
- [ ] Joe judges the Walk preview in the harness; the arrival phone frame still shows the signpost
- [ ] Review record with asset hashes
