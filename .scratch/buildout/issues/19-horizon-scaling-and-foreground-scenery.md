# 19: Horizon scaling and foreground scenery

**What to build:** Cursors shrink toward the horizon: a depth factor `d` runs linearly from 1.0 at a depth region's `foregroundY` to 0.85 at its `horizonY`, holding at 0.85 above the horizon and 1 outside every region, computed locally from world y, with a 150 ms ease when crossing regions; drawn size is own 1.25 x `d`, peer 0.75 x `d`, about the tip, with cosmetic and flag scaling too. Foreground scenery from scene data (the keyed cut-outs with world rects, already painted into the tiles) is drawn on the overlay canvas after every cursor, own included, with no outline or fade. No general Z-sorting. Walk-behind scenery (scene data `walkBehind`: the SLU lab's four desks, each with its monitor, keyboard and chair) is drawn over a cursor that stepped onto it from behind and under one that stepped on from in front, and a prop standing on it is usable only from in front (see the 2026-09-28 comment).

**Blocked by:** 04 (depth regions and cut-outs in scene data), 13 (cursors drawn), 15 (props drawn)

**Status:** ready-for-agent

- [ ] Walking toward a district's horizon shrinks the own cursor and peers by the specified factor; crossing into another region eases over 150 ms
- [ ] Hover and click stay tip-based at every scale
- [ ] A cursor behind a foreground tree is covered by it, for the visitor's own cursor and for peers
- [ ] The depth factor is a pure function with tests at `foregroundY`, `horizonY`, above the horizon and outside every region (seam 2)
- [ ] In the SLU lab a cursor stepping onto a desk from between the rows is covered by it and cannot hover or click its monitor; one stepping on from the chair side is drawn over it and can, for the visitor's own cursor and for peers
- [ ] The side a cursor is on is a pure function of its previous and current positions, with tests for stepping on from behind, from in front, from the side, a jump onto the scenery and stepping off (seam 2)

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
