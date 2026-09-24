# 04: Overworld art pass

**What to build:** Every district and strip of the overworld regenerated in one pass through the pipeline so that neighbouring scenes join up: Maplewood at the west edge, Central West End, Midtown, the Mississippi with the Arch and the bridge, Belleville at the east edge, Carondelet Park south-centre, with the Forest Park strip and its sign and the Highway 40/64 strip between them, and painted neighbourhood entrance signs. The pass is the judge-and-regenerate loop from ticket 02, run by a Claude agent, and its outputs land in the overworld scene-data module, so the accessible layer's buttons and the harness overlays move with the art: every prop's world rect; a depth region (`horizonY`, `foregroundY`) per district, one for the park, and any strip that needs one; the foreground scenery cut-outs with world rects, also painted into the tiles; the river water mask polygon, bridge deck rect, bridge cut-out, south-end line and Arch reset point. Placement of the signpost is settled here: it must sit inside the first portrait phone frame at 0.6 scale with the camera centred on the welcome sign. The overworld may widen to about 5400 world px, never more.

Prop art is tightly trimmed because the hit area is the rect; moving props (moose, rider, MonsterCommerce eye, marquee lights) are delivered as parts. Flag and cosmetic sprites are not in this pass.

**Blocked by:** 01 (scene-data module), 02 (pipeline and harness)

**Status:** ready-for-agent

- [ ] Overworld tiles at both densities for the whole scene, and the districts read as one continuous world in the harness with no seams
- [ ] Every overworld prop has a trimmed cut-out and its world rect written to scene data; the build-output test still passes
- [ ] Depth regions written to scene data and accepted in the harness overlay
- [ ] Foreground scenery cut-outs with rects written to scene data, none overlapping a prop rect, and the same pieces painted into the tiles
- [ ] River mask, deck rect, bridge cut-out, south-end line and Arch reset point written to scene data and accepted in the harness overlay; the deck rect is excluded from the mask
- [ ] The signpost sits inside the 390 x 844 frame at 0.6 scale centred on the welcome sign, checked in the harness
- [ ] Moving props delivered as parts with pivots
- [ ] Prompts and judge notes recorded so a scene can be regenerated alone later
