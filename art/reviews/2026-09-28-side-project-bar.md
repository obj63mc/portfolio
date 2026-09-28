# Side Project: the front bar and its bottles

**Verdict:** the composition, the bottles and the sign are Joe's calls, and the props, walk-behind counters and scene data are measured from the result. Joe set the opening camera on the sign. Workshop acceptance of the assembled scene and the walk-behind counters is still Joe's, in `art/review.html`. See [asset hashes and checks](2026-09-28-side-project-bar.json).

## Composition

- Joe moved the ten brands (Bacardi, Grey Goose, New Amsterdam, Camarena, Barefoot, Bud Light, E&J, Pink Whitney, RumChata and Soonhari) from taps to bottles with their logos on the back bar. The old scene looked into the room from its entry, with two bars and a dozen identical faucets. The new one faces the front bar at a slight angle: its bottle wall fills the picture, and a little of the back bar shows at the right.
- The architecture is the Cellar's own photograph of the front bar (`references/local/places/side-project/11-back-bar.jpg`, new in the ledger), with its cooler photograph for the back bar:
  - the deep navy liquor wall, with floating shelves and wine bottles along its top, and the wood-framed mirror
  - the white-tile counter with a walnut top, and white stools with blond seats
  - jar pendants
  - the reclaimed-wood cooler with its chalkboard.
- Six Codex drafts tried two cameras, each with the bottles in one row of ten or two shelves of five:
  - three true isometric cutaways (a), in the camera of the SLU lab and the Foundry
  - three gentle three-quarter views, nearly face-on to the navy wall (b).
  A local logo sheet of the ten brands was attached, and every draft lettered the labels.
- Joe chose **b1**: one lit row of ten on the lower shelf, the exit door at the far left, and the cooler with its chalkboard at the right.
- The native master is Codex's own 16:9 canvas, 1672 × 941, unresized.

## Round one: the labels and the sign

Painted by construction in `rounds/round-1-paint.py`, no model. It pasted inside its masks, and the stitch proved 0 px changed outside them.

- **Labels.** b1 drew the bottles well but garbled several labels (GREY COOSE, CAMAEERNA, WHITEEY). Every label was repainted from the brand's own logo file:
  - each keeps the draft's rectangle, filled flat with the logo's own ground, with the logo drawn at 8× and reduced
  - Grey Goose and RumChata are printed on the glass, so the old print was first cleared to the bottle's own column colours.
- **Small lettering.** A test upscale showed lettering under about 6 px garbles in the 4× Real-ESRGAN pass. So:
  - GREY GOOSE and NEW AMSTERDAM are stacked a word a line
  - small words are thickened
  - New Amsterdam's and Camarena's labels widen to the bottle's glass edges, with their letters heightened
  - VODKA and TEQUILA are left off.

  After the upscale every brand reads except AMSTERDAM, whose nine letters in 33 px read only as a line of lettering; the skyline mark and NEW carry that bottle.
- **Sign.** Joe asked for a round sign on the door of the cooler behind the right bar, like the round plaques of draft a2, carrying the Side Project light-bulb logo. Clicking it grants the beer mug.
  - It is a disc of radius 35 px on the door slab, between its top strap hinge and its handle.
  - It has a dark brown rim, a cream face, a thin inner ring, and the brewery's logo (script and bulb) in the logo's brown.
  - It casts a soft shadow down and to the right.
- `install-master.sh 1` upscaled the master 4× to 6688 × 3764 and re-derived the plate. The system `python3` lacks Pillow, so it ran with a `python3` on the path that has it, and the stale-extraction check completed.

## Props, walk-behind counters and scene data

- The Codex tap-bank and stool cut-outs of the old master were removed.
- **Twelve props,** all measured mattes on the native master (`deriveFrom` plus `registration.mask`), each crop 1:1 with the 4× master. Composited over it, each differs by 0.00/255.
  - The ten bottles were traced against the wall: the wall colour per row interpolated from the gaps between bottles, a bottle wherever the image departs from it. The light fixtures and a pendant's cord above Grey Goose and New Amsterdam are cut off.
  - The sign is its disc and rim; the chalkboard is its framed quad.
- **Two walk-behind counters,** the front bar and the back bar. Each outline is the walnut top, its end face and the tile front down to the base, with whatever stands in front of it painted over it (the stools' backs and seats); each front line is the counter's base.
  - A cursor that steps onto a counter from the wall, or from the floor behind it, goes behind the bar. One that steps on from in front of the base is drawn over it.
  - The stools below the base are not scenery, so a cursor is always drawn over their legs; making every stool walk-behind would hide a cursor anywhere over the bar.
- **Scene data** in `src/lib/scenes/side-project.ts`:
  - props left to right: the ten bottles, then the sign, then the chalkboard
  - the exit is the door at the far left, 0,323 267 × 647 since the code review (below)
  - one depth region, with the horizon at the back bar's base (1140), and no foreground scenery
  - `sceneLayouts['side-project'].arrival` is (2069, 701), the centre of the sign: Joe wants a phone to open on the Side Project logo. The first phone frame shows the sign in its middle, with the cooler door around it, part of the chalkboard to its right and the end of the front bar below it.
- **Tests:** a Side Project test checks:
  - ten bottles in one row on one shelf, none overlapping
  - the counters below the shelf
  - the beer mug from the sign alone, between the bottles and the chalkboard.

  The inventory test lists `brewery-sign`.

## Open points

- The sign's card line and the brands' "what we did" lines are placeholders for Joe.
- AMSTERDAM reads only as lettering at this size.
- As in the lab, the depth factor shrinks a cursor toward the horizon, although the wall above it is not floor.

## After the code review, 2026-09-28

- **Draw order:** the two counters are now listed back to front. The back bar, whose base is higher up the picture, is drawn first. It had been listed after the front bar, so where the cut-outs meet it would have painted over the front bar's walnut corner. A geometry test now checks the order of any two overlapping walk-behind cut-outs.
- **Exit:** it stops at the counter top, 0,323 267 × 647, above the left end of the front bar. A cursor behind the counter's end would otherwise have been hidden while still able to click the door. The geometry test now checks that no walk-behind outline covers any part of an exit or of a prop's hit area.

Validation: `art:validate` PASS (72 assets), `art:check`, `art:test` (3), `svelte-check` (0 errors), production build, `npm test` 21/21.
