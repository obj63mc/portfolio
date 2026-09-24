# 04: Overworld art pass

**What to build:** Every district and strip of the overworld regenerated in one pass through the pipeline so that neighbouring scenes join up: Maplewood at the west edge, Central West End, Midtown, the Mississippi with the Arch and the bridge, Belleville at the east edge, Carondelet Park south-centre, with the Forest Park strip and its sign and the Highway 40/64 strip between them, and painted neighbourhood entrance signs. The pass is the judge-and-regenerate loop from ticket 02, run by a Claude agent, and its outputs land in the overworld scene-data module, so the accessible layer's buttons and the harness overlays move with the art: every prop's world rect; a depth region (`horizonY`, `foregroundY`) per district, one for the park, and any strip that needs one; the foreground scenery cut-outs with world rects, also painted into the tiles; the river water mask polygon, bridge deck rect, bridge cut-out, south-end line and Arch reset point. Placement of the signpost is settled here: it must sit inside the first portrait phone frame at 0.6 scale with the camera centred on the welcome sign. The overworld may widen to about 5400 world px, never more.

Prop art is tightly trimmed because the hit area is the rect; moving props (moose, rider, MonsterCommerce eye, marquee lights) are delivered as parts. Flag and cosmetic sprites are not in this pass.

**Blocked by:** 01 (scene-data module), 02 (pipeline and harness)

**Status:** ready-for-human

- [x] Overworld tiles at both densities for the whole scene, and the districts read as one continuous world in the harness with no seams
- [x] Every overworld prop has a trimmed cut-out and its world rect written to scene data; the build-output test still passes
- [ ] Depth regions written to scene data and accepted in the harness overlay
- [x] Foreground scenery cut-outs with rects written to scene data, none overlapping a prop rect, and the same pieces painted into the tiles
- [ ] River mask, deck rect, bridge cut-out, south-end line and Arch reset point written to scene data and accepted in the harness overlay; the deck rect is excluded from the mask
- [ ] The signpost sits inside the 390 x 844 frame at 0.6 scale centred on the welcome sign, checked in the harness
- [x] Moving props delivered as parts with pivots
- [x] Prompts and judge notes recorded so a scene can be regenerated alone later

## Comments

### Overworld master in progress, 2026-09-24

Work so far, all through `npm run art` and the Codex CLI:

- The aerial city map (`art/references/local/drafts/overworld-master-v0.webp`, the previous `overworld-master`) was replaced by a Cursor Camp style diorama: elevated three-quarter camera, north up, one ground plane, about a dozen large landmarks, connected cream paths. A Cursor Camp screenshot (`art/references/local/cursor-camp/campfire.png`, logged in `references/locations.json`) is attached for camera and scale only.
- Pipeline facts learned and now enforced: the Codex image tool accepts at most five references (`MAX_REFERENCES` in `scripts/art/generate.ts`) and returns a fixed native size, 1774 x 887 for 2:1; the earlier 2048/2304 wide masters were `sips` upscales by the Codex agent. The pipeline now asks for the native file unresized.
- The committed `overworld-master` is the second diorama draft (v2). Its plate, tiles, the re-placed welcome board, signpost, moose and rider (`sceneLayouts`), the registration extractions (door, marquee, marquee-bulbs, mc-sign, mc-eye, server-rack, bike, ride-sign, eads-bridge, maplewood-tree) and the geometry in `src/lib/scenes/overworld.ts` (districts, venues, props, six depth regions, foreground trees, river polygon, Eads deck and bridge cut-out, Poplar south end, Arch reset) were all measured on v2. `tests/overworld-geometry.test.ts` covers the spec rules on that data. The maplewood-tree extraction is a rejected half tree; arch-tree was dropped after Codex found no tree in its crop.

**Superseded decision:** v2's layout was wrong; the map must follow the aerial v0 for building designs and this layout: Maplewood far west at mid height, Central West End next east and higher, Midtown directly below it, Carondelet Park south-east of Midtown with the lake loop as the bike course (no track), the Arch on the west bank, MonsterCommerce farthest east across the river, no highway between districts. Variants A, B, C were generated from that brief, then fix-pass candidates D and E from A. **Candidate E wins**: `art/generated/overworld-master-e/` (image, prompt). A to D stay local under `art/references/local/drafts/`.

**Next, in order:**

1. One more fix pass on E: start the I-64 highway at the Forest Park strip east of Maplewood, not beside the church; copy the Side Project deck from candidate C literally (`references/local/drafts/side-project-from-v3c.png`); plus whatever Joe adds.
2. Install the accepted image as `overworld-master` (`process overworld-master --source <run>/source.png --force`, with the manifest prompt and references updated to that run), then `generate overworld --force` for the plate.
3. Re-measure every registration crop, the welcome/signpost/moose/rider placements and all of `overworld.ts` against the new master; regenerate the extractions; re-run `art:validate`, the geometry test, the harness phone frame; record the verdict under `art/reviews/`.

### Overworld master accepted, 2026-09-24 (later)

`art/generated/overworld-master` is now **candidate P**, world **6750 x 2700** (Joe waived the spec's 5400 cap for the Maplewood plaza). Chain, recorded in the asset's `prompt.txt` and `provenance.json`: variant A (style) -> E (courthouse, highway, plain sky) -> G (courthouse west of the Arch, Maplewood plaza, 2.5:1) -> P (Maplewood plaza region redrawn by a Codex regional edit on a cleared, annotated crop, pasted back with a feathered border). Every candidate image is under `art/references/local/drafts/`. New local references: a Cursor Camp screenshot (camera and scale), the Old Courthouse photo (CC BY 2.0) and Joe's satellite screenshot of the Maplewood plaza, all logged in `references/locations.json`.

Lessons: Codex ignores orientation prose when a reference crop already shows the object at an angle; a cleared crop plus an annotated copy (footprint, front arrow, deck box) worked. Full-scene reruns drift; regional edits on a crop keep the rest pinned.

The plate and 168 tiles per density are re-derived from P. **Stale:** the welcome/signpost/moose/rider placements, every registration extraction (door, marquee, bulbs, mc-sign, mc-eye, server-rack, bike, ride-sign, eads-bridge, maplewood-tree) and all rects in `src/lib/scenes/overworld.ts` were measured on the 5400-wide v2 draft; only the world size was updated. The prop pass re-measures all of them on P and adds the Old Courthouse and the storefront row to the venue/depth geometry.

### Prop pass complete, 2026-09-24 (evening)

Every rect in `src/lib/scenes/overworld.ts` is now measured on master P; the review record is `art/reviews/2026-09-24-overworld.md` with hashes in the JSON beside it.

- Re-registered on P: door, marquee, mc-sign, mc-eye, server-rack, eads-bridge (2.5:1 crop). Codex redrew rather than registered both trees and the bulb string, so `maplewood-tree`, `park-tree` and `marquee-bulbs` are measured mattes (`deriveFrom` + `registration.mask`) copied from the master; the mask path in `generate.ts` had been dropping alpha, now fixed. The first mc-sign attempt flattened the board; a tighter 3:2 crop registered it.
- Re-placed: welcome, signpost, moose, rider (`sceneLayouts`), plus bike and ride-sign, which are now standalone cut-outs because P paints neither.
- Scene data: districts now read Maplewood, Carondelet Park, Central West End, Midtown, Belleville by centre x (the park lake sits west of the West End row); Old Courthouse and the storefront row added as scenery venues; seven depth regions with horizon 250; river mask traced by colour; deck `{4880,340,1440,290}`, south end 1900, Arch reset `(4600,1450)`. `tests/overworld-geometry.test.ts` and `tests/build-output.test.ts` derive the district order from the module.
- Automated checks: `art:validate` PASS (50 assets), full suite 16/16, svelte-check, build. The three checklist items that say "in the harness" stay open: the agent had no browser this session, so the depth, river and phone-frame overlays were rendered from the scene module over the assembled composite instead (`art/reviews/2026-09-24-overworld.md`). Joe: open `art/review.html` (`python3 -m http.server 4174`), toggle depth and river geometry, check the phone crop, ambient motion, click reactions and reduced motion, then tick them.
- After review: the Old Courthouse and the storefront row are scenery in the plate only (CONTEXT.md: a venue is an enterable place), and the Eads Bridge is a measured matte of the deck, abutments and piers because the Codex extraction had redrawn it larger and over the Arch.
