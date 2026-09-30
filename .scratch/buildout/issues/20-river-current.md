# 20: River current

**What to build:** A cursor that moves onto the water mask from a bank, or off the end of the bridge deck, is in the river: it drifts south at about 150 world px/s while the visitor's own input still moves it (joystick and keys add to the drift), the camera follows through the normal push band, and it leaves the river by reaching either bank. The deck rect is excluded from the mask so walking across never drifts. Drift does not run while paused. Only reaching the river's south end resets the visitor: a short fade (a cut under reduced motion), the cursor at the Arch reset point, the camera centred, the "you" tag shown again, and peers snap on the jump. The owning client computes the drift and sends the result as a normal move. Entering and leaving the river sends the river presence bit, carried in `hello` for late joiners and not validated by the server (spec gap 1, the presence-bit choice). The bridge is drawn over a cursor in the river and under a cursor crossing it, own and peers alike.

Carries over the pointer-lock prototype's river module.

**Blocked by:** 04 (river geometry), 13 (presence), 19 (layering)

**Status:** resolved (2026-09-30); the hands-on checks are listed in the last comment

- [x] Stepping into the water drifts the cursor south; paddling out to a bank stops it; the bridge is crossable without drift
- [x] Passing under the deck keeps the cursor in the river and drawn under the bridge; a peer under the deck is drawn under it too, including for a late joiner
- [x] Reaching the south end resets to the Arch with the fade and the "you" tag; peers see the snap
- [x] Drift stops while paused and resumes on resume
- [x] The river state machine is a pure module stepped with a fake clock and tested for bank entry, deck exit, under-deck, bank exit and south-end reset (seam 2)

## Comments

- From ticket 04's close-out (2026-09-25): `OVERWORLD.river.deck` is an axis-aligned rect round the sloped Eads deck, so it also covers open water above and below the deck band (widest at its west end), where a cursor would not drift. Consider a deck polygon (or the deck band's top and bottom lines) when implementing drift.

### Built, 2026-09-30

- `src/lib/scenes/river.ts` is the state machine, `flow(river, was, p, dt)`: `ashore` or `afloat`, with the frame's drift (150 world px/s south), or `end` on the water at or past `southEndY`. It is tested in `tests/river.test.ts` with a fake clock, covering bank entry, deck exit, under the deck, bank exit, the south end and a paused frame.
- The deck is now a polygon (`river.deck: Point[]`), per ticket 04's close-out comment. It runs from the bridge cut-out's registration matte (the deck's top edge and the girders' underside) between x 4880 and 6430, so open water above and below the slope is river. The review harness draws it as an outline.
- In the engine, the free own cursor is carried like steering, so the camera follows through the push band and the keys and joystick add to the drift. The drift stops whenever the cursor isn't free: paused, and also with a card open, like the keys.
- Reaching the south end is a jump. The cursor goes to the Arch, the camera centres on it and the "you" tag shows. The view then opens out of black over 400 ms (a cut under reduced motion). The jump is immediate rather than at the fade's midpoint, so a pause during the fade can't move a paused cursor (from the code review).
- The river bit goes to the room as the presence bit. The bridge cut-out is drawn over any cursor in the river, own or peer, first in the draw order.
- Browser checks: `tests/river.spec.ts` covers drift, paddling ashore, pause and resume, the reset with its fade, camera and tag, and the deck crossed without drift and drawn over or under. `tests/peers.spec.ts` covers a peer under the deck for a watcher and for a late joiner.
- Left for Joe:
  - Stepping onto the water south of the south-end line washes out at once.
  - The unlocked-mouse fallback: its next move puts the cursor back at the OS pointer, so the drift only carries a still mouse.
  - A peer's river bit can land up to about 100 ms before its drawn position crosses the deck edge, a one-frame flicker of the layering.
- Hands-on checks:
  - Wade in from both banks with the locked mouse and on a phone with the joystick.
  - Cross the Eads deck both ways.
  - Ride the current to the Poplar crossing, with and without reduced motion.
  - Watch a second browser see the snap.
- The `peers.spec.ts` hop test ("the tag came back with the new scene") fails under the whole suite's load on HEAD as well, and passes alone. That flake predates this ticket.

