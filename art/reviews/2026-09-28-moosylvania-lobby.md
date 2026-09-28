# Moosylvania: the whole lobby

**Verdict:** the composition, its revision and the three fix rounds are Joe's calls, and the props, walk-behind furniture, foreground lanterns and scene data are measured from the result. Workshop acceptance of the assembled scene, the walk-behind feel and the opening camera is still Joe's, in `art/review.html`. See [asset hashes and checks](2026-09-28-moosylvania-lobby.json).

## Composition

- Joe asked for the lobby to work more like the overworld, to show more items: one larger scene to scroll between three areas along the nave of the converted church, from behind the front desk, past the front desk and the round sofas, up the stairs to the desks in the loft; more overhead but still at an angle, with the spaces between areas enlarged where needed. He supplied three photographs (local references `06.jpg` to `08.jpg`, recorded in `references/locations.json`): the lobby toward the entrance end with the twin staircases, the loft and the two offices beneath it; the reverse toward the front desk and its frosted glass moose wall; and an overhead from behind that wall.
- The moose wall and the front desk run across the nave, so they face the camera only when it looks along the nave. Six Codex drafts tried two cameras:
  - three tall views up the nave, for vertical scrolling (t)
  - three diagonal views (i).

  They differed in which end is nearest. Joe chose **t1**, the viewpoint of his overhead photograph: the meeting area at the bottom, the moose wall with the desk beyond it, the round sofas, the twin staircases up to the loft, the offices and the front doors beneath it, and the tall stained-glass window at the top.
- Joe's revision:
  - a bigger loft, so a visitor scrolls past desks there, loosely arranged as a lounge workspace
  - the area behind the desk running to the bottom edge, with no steps down.

  Joe's other decisions were a TV that plays a video he will provide, and a mini moose statue on the front desk explaining what Moosylvania is. Attempt **r1a** of three, on Codex's 1:2 canvas (887 × 1774, unresized), is the base.
- Scene size: 2400 × 4800 world px, about 2.25 times the other interiors' area. It is 1.48 image px per world px after the 4× upscale, between the other interiors (2.35) and the overworld (1.18), and a little soft at desktop DPR 2.

## Fix rounds

Each round pasted Codex tiles inside their masks, and the stitch proved 0 px changed outside them.

- **Round one:**
  - **Computers:** lit two more loft computers, so four mark the four stack props.
  - **Statue:** redrew it larger.
  - **Stairs:** opened both stair tops onto the loft (Joe: they looked closed off).
  - **Offices:** took the glass fronts off the two offices and kept the glass along the hall from the front doors (Joe: glass only leading into the building, not enclosing the offices).
- **Round two** (Joe, on round one):
  - **Stair tops:** removed railing pieces left floating there.
  - **Front desk:** turned it to bow out from the glass wall toward the sofas, as the real desk does.
- **Round three** (Joe, on round two):
  - **Monitor:** turned the desk's monitor to face the receptionist's chair.
  - **Statue:** set it wholly on the counter at the desk's right-hand end, where it had hung off.
- `install-master.sh 3` upscaled the master 4× to 3548 × 7096 and re-derived the plate (4800 × 9600, 100 tiles) and the mattes.

## Props, walk-behind furniture, foreground and scene data

- The old master's four lobby monitors and plant were removed.
- **Six props**, measured mattes on the native master, each crop 1:1 with the 4× master (mean difference 0.00/255):
  - the four lit loft computers, monitor and keyboard: frontend, backend, CMS and data (the four desks of the content inventory, now computers)
  - the moose statue, from its white pixels
  - the meeting TV's panel, clear of the sofa in front of it.
- **Fourteen walk-behind units**, traced from the pixels:
  - five loft desks with their chairs (a desk top is as pale as the loft floor, so desk tops and legs are drawn by hand and the monitors, plants, books and chairs segmented)
  - the lounge armchairs
  - the moose wall with the TV panel
  - the two round sofas and their coffee table
  - the meeting sofa, table and two pairs of armchairs.

  Each outline is the unit's convex hull. Each front line is the lower edge of that hull through the front feet, flat past a unit's back. The round sofas and the meeting armchairs face their tables, so their lines also run up the side toward the table (since the code review, below). The moose wall's front line steps forward at the TV panel.
  - The four computers stand on their desks and the TV on the moose wall, so each is used from in front: from the chair's side, and from the meeting area.
  - The reception desk stays in the plate. From this camera the sofa side of the desk is behind it, and walk-behind rules would put the statue out of reach from the side visitors come from.
- **Two foreground cut-outs**, the three hanging lanterns along each wall with their chains. They cover no prop.
- **Scene data** in `src/lib/scenes/moosylvania.ts`:
  - 2400 × 4800
  - `pushBand: 0.25`, the overworld's edge-push band (Joe: it should scroll like the overworld)
  - the six props, read top to bottom
  - the exit on the arched front doors beneath the loft
  - one depth region from the loft (horizon at the top) to the meeting area
  - the lanterns as foreground and the fourteen walk-behind units, back to front.
- **Tab order:** a scene taller than wide now orders its props top to bottom (`readingOrder` in `src/lib/scenes/index.ts`), so keyboard focus pans the camera one way along the nave; the other sub-scenes keep left to right.
- **Opening camera:** `sceneLayouts.moosylvania.arrival` is (1200, 1900), just inside the front doors.
  - The first phone frame shows the loft railing, the doors and the round sofas.
  - A 1440 × 900 desktop frame shows the doors, both offices, the two staircases and the sofas' tops.

  This camera is a default for Joe to adjust.
- **Tests:** a Moosylvania test checks:
  - a tall scene with the overworld's band
  - the props read top to bottom
  - each computer on its own desk, used from in front
  - the loft above the doors, the statue below them and the TV nearest
  - the TV on the moose wall, used from the meeting area
  - no cosmetic in the lobby.

  The inventory test lists the computers, the statue and the TV.

## Open points

- The moose statue's text (what Moosylvania is) is Joe's to write; the card holds a placeholder.
- The TV's video file is Joe's to provide. The spec's "Local prop, the Moosylvania meeting TV" says how it plays; the scene data has no video field until the file exists.
- The two staircases are left in the plate, not walk-behind.

## After the code review, 2026-09-28

- **The TV:** its matte is clear of the meeting sofa, but its rect's bottom 35 px ran behind the sofa's back. A cursor hidden behind the sofa could still reach the TV there, and the TV's button took clicks on the painted sofa back. The TV now has a clip-path, its rect less the sofa's outline, 92 % of the rect.
- **The backend computer:** its rect's top-left corner reached behind the back desk's leg. It now has a clip-path too, 95 % of its rect.
- **Front lines:** the round sofas and the meeting armchairs had front lines trimmed flat at both ends. Stepping on from the coffee table or the meeting table therefore counted as behind, and the sofa or chairs hid the cursor. Each line now runs up the side facing its table, while a back still counts as behind.
- **Tests:** a geometry test checks each case above, and that no walk-behind outline covers any part of another prop's hit area or of the exit.

Validation: `art:validate` PASS (94 assets), `art:check`, `art:test` (3), `svelte-check` (0 errors), production build, `npm test` 23/23.
