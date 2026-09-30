# 19: Horizon scaling and foreground scenery

**What to build:** Cursors shrink toward the horizon: a depth factor `d` runs linearly from 1.0 at a depth region's `foregroundY` to 0.85 at its `horizonY`, holding at 0.85 above the horizon and 1 outside every region, computed locally from world y, with a 150 ms ease when crossing regions; drawn size is own 1.25 x `d`, peer 0.75 x `d`, about the tip, with cosmetic and flag scaling too. Foreground scenery from scene data (the keyed cut-outs with world rects, already painted into the tiles) is drawn on the overlay canvas after every cursor, own included, with no outline or fade. No general Z-sorting. Walk-behind scenery (scene data `walkBehind`: the SLU lab's four desks, each with its monitor, keyboard and chair) is drawn over a cursor that stepped onto it from behind and under one that stepped on from in front, and a prop standing on it is usable only from in front (see the 2026-09-28 comment).

**Blocked by:** 04 (depth regions and cut-outs in scene data), 13 (cursors drawn), 15 (props drawn)

**Status:** resolved (2026-09-30); the hands-on checks are listed in the last comment

- [x] Walking toward a district's horizon shrinks the own cursor and peers by the specified factor; crossing into another region eases over 150 ms
- [x] Hover and click stay tip-based at every scale
- [x] A cursor behind a foreground tree is covered by it, for the visitor's own cursor and for peers
- [x] The depth factor is a pure function with tests at `foregroundY`, `horizonY`, above the horizon and outside every region (seam 2)
- [x] In the SLU lab a cursor stepping onto a desk from between the rows is covered by it and cannot hover or click its monitor; one stepping on from the chair side is drawn over it and can, for the visitor's own cursor and for peers
- [x] The side a cursor is on is a pure function of its previous and current positions, with tests for stepping on from behind, from in front, from the side, a jump onto the scenery and stepping off (seam 2)

## Comments

### Walk-behind scenery, 2026-09-28

Joe's call for the SLU lab. He wants the lab to behave like walking round the room: walk behind a desk and it covers you; step in front of a computer to use it. Plain y-sorting cannot do this: to click a monitor the tip must be on the screen, which is above the desk's floor line, so a y-sort would put every visitor behind the desk and the monitor would never be usable. The rule is therefore the side a cursor steps on from:

- Each `WalkBehind` in scene data has an `outline` (world px, the cut-out's matte polygon), a `front` polyline through the front feet (left to right; its y at the cursor's x, flat past either end) and the ids of the `props` standing on it.
- When a cursor's tip moves from outside the outline to inside it, it is **in front** if the tip is on or below the front line there, and **behind** if above. It keeps that side while inside and forgets it on stepping off. A cursor that first appears inside an outline, or jumps into one (a peer snap), takes the side of that point.
- A cursor behind walk-behind scenery is drawn before that cut-out, and every other cursor after it; `walkBehind` is listed back to front, which is the draw order. Draw the cut-out over a cursor clipped to that cursor's drawn bounds, so a prop's reaction on the scene canvas is never covered by a static copy.
- While the visitor's own cursor is behind scenery, the props it lists take no hover and no cursor click. Keyboard focus, screen readers and any direct activation of the DOM button are unaffected, so nothing becomes unreachable.
- Peers get the same rule locally from their successive positions; nothing goes on the wire.

Foreground scenery is unchanged: always over every cursor. The SLU lab has none now; its two front chairs were dropped as foreground and belong to their desks instead. The workshop previews the rule: tick **Walk the cursor with the mouse** in `art/review.html` and step onto a desk from either side. Data rules are checked in `tests/sub-scene-geometry.test.ts`.

### The Foundry's rows, 2026-09-28

The Foundry theatre follows the same rule: its three seat rows (front row nearest the screen) and the projector ledge are walk-behind scenery, listed back to front in `src/lib/scenes/foundry.ts`. No prop stands on them, so they only decide drawing. A cursor in the walkway between two rows is covered by the row nearer the viewer and drawn over the row beyond it, as if walking between the seats. `tests/sub-scene-geometry.test.ts` now also checks, in every scene, that walk-behind scenery never covers a prop it does not carry.

### Walk-behind: the side is read where the cursor stepped from; staircases, 2026-09-28

- **Which point decides:** the rule above reads the tip once it is inside the outline. A front line through the front feet lies on the outline's lower edge, as on the lobby's round sofas and Brennan's lounge. A cursor coming up from below is then already above that line at its first point inside, so stepping on from in front would put it behind. The side is now read at the cursor's last position outside the outline, the point it stepped from: on or below the front line is in front, above it behind. A cursor that appears inside an outline, or jumps into one (a peer snap), still takes the side of that point. This matches the glossary and the `WalkBehind` comment ("the side a cursor steps onto it from"). The workshop's Walk preview (`art/review.js`) is corrected to match.
- **Staircases:** a `WalkBehind` may carry a `landing`, a staircase's top step where it meets the floor above. Stepping on from on or above it, coming down from the floor above, is in front too; only stepping on between the two lines, from a stair's side, goes underneath. The Moosylvania lobby's twin staircases are the first (Joe, 2026-09-28: the cursor should be hidden going under the stairs from the sides, since the loft is above).

### Walk-behind: coming off the floor above a staircase, 2026-09-28

Joe, walking the lobby stairs in the workshop: coming down from the loft broke most of the time. A cursor next to a loft desk that moved to the stairs always went underneath, on both stairs. It left the loft at an angle and passed the loft's edge beside the stair, so it stepped onto the flight from its side, below the landing. The rule now remembers the floor above: a cursor that was on or above a staircase's landing within `LANDING_REACH` (800 world px) of travel steps onto the stairs from that floor, wherever it crosses the stair's edge. A jump (a scene entry, a reset or a peer snap) forgets it.

The rule is now a pure module, `src/lib/scenes/walk.ts`, for the engine to use: `walker(units)` follows one cursor step by step and returns its side of each unit it is on. `tests/walk.test.ts` walks it through the lobby's stairs:
- from beside the loft desks to anywhere down the flight
- straight down and up across the full width of the steps
- from the front doors, the wall side and the long way round.

A sweep of 1,300 loft starting points per stair all reach the stairs, and 238 ground-floor approaches all go underneath. The workshop's Walk preview mirrors the module, and a test holds the two to the same reach.


### Built, 2026-09-30

- **Depth factor** (`src/lib/engine/depth.ts`): `factor(regions, p)` is 1 at a region's `foregroundY` and below, 0.85 at its `horizonY` and above, linear between, and 1 outside every region; a rect owns its left and top edges. `depth(prev, …)` eases the drawn factor over 150 ms (smoothstep) from what was drawn when a cursor crosses into another region, or out of every one; within a region it follows at once, and a jump takes the new factor at once. `follower(scene)` follows one cursor, own or peer, frame to frame: its drawn factor and its side of the walk-behind scenery (`walk.ts`). `tests/depth.test.ts` covers the factor at `foregroundY`, `horizonY`, above the horizon, outside every region, in the gap between two and on their shared edge, the ease, turning back mid-ease, a jump, and that the overworld's regions cover it everywhere. The overworld's regions share one horizon, so crossing between them never changes a cursor's size there; the ease shows only where regions differ.
- **Drawing** (`cursors.ts`): own 1.25 × d and peers 0.75 × d about the tip, with the halo, cosmetic, flag badge, the pointing hand and the "you" tag's place scaling with it. Hit resolution is unchanged, at the tip.
- **Scenery over cursors** (`src/lib/engine/scenery.ts`): the scene's foreground cut-outs and walk-behind cut-outs load with the scene (their registered `asset.json` world rects, through `cutout` in `props.ts`). A covered cursor is drawn on a scratch canvas, the scenery over it drawn there `source-atop`, and the result put on the overlay: the cut-out lands on that cursor's own pixels and nowhere else, which is tighter than "clipped to its drawn bounds" and so never covers a prop's reaction on the scene canvas or another cursor. The walk-behind units a cursor is behind go first, back to front, then the foreground, which covers every cursor. The "you" tag is drawn after, never covered: it is a label, and it helps a visitor find a cursor that is behind a desk or a tree.
- **Cards and scenery:** while a prop card is open no scenery is drawn over any cursor. The cursor canvas then sits in the top layer over the card and its backdrop, so a cut-out there would paint the scenery undimmed over both; the cursors are drawn over everything, as they already are over the card. Under the Join and Paused cards the cursor canvas is below the card, dimmed with the scene, and scenery is drawn as usual.
- **Walk-behind rule in the engine:** one follower for the own cursor and one per drawn peer, fed from where each is drawn. A scene entry starts a new follower (the cursor takes the side of where it lands), the Arch reset (`tagYou`, ticket 20) is a jump, and a peer moving more than the 400 px snap in a frame is a jump. A peer off camera isn't followed; when it comes back its next step is read from where it was last seen. A touch tap that moves the cursor onto a prop is an ordinary step, read from where the cursor was, since the spec's jumps are the scene entry, the reset and a peer's snap. The own cursor is stepped before the props read their hover each frame.
- **Blocking:** while the own cursor is behind a unit, the props it lists are marked `.behind` on their `.prop`. The free mouse's hover and clicks pass through their buttons (`pointer-events: none` in `app.css`, for every input but touch), `props.ts` no longer reads the mouse's `:hover` on them, and `under` skips them for the locked and the touch-steered cursor, so no `.hot`, no hand and no click. Keyboard focus (with its glow), a screen reader and a finger's own tap on the button still reach them.
- **Tests:** `tests/walk.test.ts` now walks the SLU lab's near-left desk (the workstation's): stepping on from between the rows (behind, held while crossing to the chair's foot), from the chair side (in front, up to the monitor), from the side above the front line (behind) and along the floor and up the near leg (in front), a jump onto the monitor (behind) and onto the chair's foot (in front), and stepping off and back on read afresh; plus `blocked`. Seam 4: `tests/props.spec.ts` checks that from between the rows the monitor takes no hover glow and no click while Enter still opens it, and from the chair side it takes both. The lab's existing browser specs now reach the monitor from the chair side (the old paths came onto the desk from behind, which the rule now forbids), the locked-cursor smoke skips its tip check at Join (at 1920 × 1600 Join lands on the front-left desk from behind, so the cursor is covered there), and `tests/peers.spec.ts` measures both sizes times the depth factor at the cursor's world point.

A note on the lab's mattes: the desks' outlines are the mattes' polygons, and at some columns the chair and the desktop don't join (a gap between the chair's back and the desk's front edge). A cursor going straight up from the floor in front of a chair through such a gap steps off and back on above the front line, so it goes behind. Coming up through the chair's middle, where they join, keeps it in front. The tests use that path.

Hands-on (Joe, desktop and phone):
- Overworld: walk north toward the treeline and back; the own cursor and a peer shrink to 0.85 at the horizon and grow back, with no pop. In the lab and the lobby, the same toward the back wall and up the nave.
- Walk behind the Maplewood tree and the park tree east of the lake (own and a peer): covered, with no fringe or doubled edge; the "you" tag stays visible. Brennan's sofa at the lower right, and the Moosylvania lanterns, the same.
- SLU lab: step onto a desk from between the rows (covered, the monitor neither glows nor clicks) and from the chair side (drawn over it, the monitor glows and opens), with the locked mouse, the unlocked mouse and the joystick; a peer doing the same looks the same from your screen.
- Open a card while behind a desk: the cursor shows over the card, and no scenery shows over the card.
- After closing a card with its Close button, the cursor is wherever Close was, usually off the desk; coming back to the monitor from above goes behind it. That is the rule, but say if it feels wrong.
- Foundry: a visitor seated for a reel glides into the second row from a poster, and the rows are walk-behind scenery, so whichever side the glide steps on from decides whether the row covers the seated cursor. Check that it reads as sitting in the row rather than as the cursor vanishing.
- On a phone, tapping the lab's monitor opens its card even with the cursor behind the desk (a finger's tap is a direct activation), and the cursor lands on the monitor stepped from where it was.
