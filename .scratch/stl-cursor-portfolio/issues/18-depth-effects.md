# Which depth effects ship, and what must the art provide for them?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

Charting parked depth effects as a later phase after art: cursors shrinking toward the horizon, cursors sorting behind buildings, and drag when a cursor crosses the river. The art pipeline is proven, but placement is left to the pass that regenerates every scene to join up, so this is the moment to say what that pass must produce. Decide which effects are in the spec (now, later, or never), and for each one kept: what defines the depth bands (a horizon line per scene, per-district foot lines, a depth map), how horizon scaling combines with the own-cursor 1.25x and peers 0.75x sizes and with single zoom (ADR 0001), how Z-sorting can work when cursors are drawn on an overlay canvas above the props (ADR 0003), and whether water drag touches only the drawn cursor or also the position sent on the wire, given that on desktop the drawn cursor tracks the real pointer. Output: the depth rules for the spec and the list of depth data the art regeneration pass must deliver per scene. If a behaviour question can't be settled by talk, graduate it into a prototype ticket.

## Answer

Resolved 2026-09-24 in a two-round grilling session.

A look at the prototype art set the ground: Maplewood is a street-level view with its own sky and horizon (tree line about 30% down), and the lobby's floor starts about 55% down. Depth is therefore per district and per sub-scene, not one horizon per scene, and Carondelet Park sits below Midtown and Central West End with its own horizon. In a street view a facade sits above its own base line, so y-sorting cursors against buildings would hide the cursor on every door and sign; that ruled out general Z-sorting.

### Horizon scaling (first build)

- A depth factor `d` runs linearly from 1.0 at a depth region's `foregroundY` to 0.85 at its `horizonY`, and holds at 0.85 above the horizon (sky). A cursor outside every region is drawn at `d` = 1.
- Drawn size: own cursor 1.25 × d, each peer 0.75 × d (amends the own-cursor rules), scaled about the arrow tip so the hotspot never moves; flag badge and cosmetic scale with the arrow.
- Every client computes `d` locally from the world y it already holds for each cursor. Nothing on the wire; ADR 0001 is untouched.
- Crossing from one region into another eases the drawn scale to the new target over about 150 ms instead of popping.
- Hover and click stay tip-based and are unaffected by scale.
- Smallest case: a peer at 0.75 × 0.85 is about 20 world px, its flag about 6 x 3.8 CSS px on a phone. The strong-contrast note on flag and cosmetic sprites from the own-cursor ticket matters more.

### Foreground scenery (no general Z-sorting)

- No per-cursor depth sort. Instead, some scenery is **foreground scenery**: drawn above every cursor, the visitor's own included, with no outline or fade (Joe's call: hiding your own cursor is more immersive).
- Which pieces are foreground depends on the final layouts and is decided by the art regeneration pass.
- Foreground scenery is scenery only, never a prop, and never overlaps a prop's rect, so a hovered prop is never hidden.
- It is painted into the background tiles and also cut out as a keyed WebP with a world rect (the prop pipeline). The overlay canvas draws the cut-outs after the cursors, so a late sprite load never leaves a hole.

### River current

- A cursor over the Mississippi's water mask drifts downstream (south, down the screen) at about 150 world px/s. The bridge deck is excluded from the mask, so the bridge is always a safe crossing. The visitor's own input still moves the cursor, so they can paddle out.
- The owning client computes the drift and sends the resulting position as a normal move; peers simply see it drift.
- The camera does not follow the drift. When the visitor's cursor drifts out of their camera view: short fade, cursor placed at the Arch reset point, camera centred on it, "you" tag shown again. Under reduced motion the fade is a cut; the drift itself still applies (it is movement, not ambient motion).
- Peers snap instead of interpolating on any position jump over about 400 world px, so the Arch reset never slides across the map. No wire change.
- Joystick: drift adds to the cursor's motion.
- Desktop: the drawn cursor must separate from the hidden real pointer by a growing offset while drifting (mouse deltas still move it; clicks use the drawn position, as the joystick does). How that offset feels and when it clears is graduated to [River current on desktop](22-river-current-desktop.md).
- The earlier water-drag and wake-ripple ideas are dropped; the current replaces them.

### Depth data the art regeneration pass delivers per scene

- **Depth regions**: rects in the scene JSON, each with `horizonY` and `foregroundY`: one per district, one for Carondelet Park, any scenery strip that needs one, and one or more per sub-scene. Checked in the review harness as line overlays.
- **Foreground scenery**: keyed WebP cut-outs with a world rect each, also painted into the tiles, none overlapping a prop rect.
- **Overworld only**: the river water mask as a polygon excluding the bridge deck, and the Arch reset point in world px.

### Recorded elsewhere

- Glossary: added **Foreground scenery** and **River current** to `CONTEXT.md`.
- New ticket: [River current on desktop](22-river-current-desktop.md), blocking spec assembly.
- No ADR: foreground scenery is cheap to reverse.
