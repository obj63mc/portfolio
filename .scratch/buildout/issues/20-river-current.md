# 20: River current

**What to build:** A cursor that moves onto the water mask from a bank, or off the end of the bridge deck, is in the river: it drifts south at about 150 world px/s while the visitor's own input still moves it (joystick and keys add to the drift), the camera follows through the normal push band, and it leaves the river by reaching either bank. The deck rect is excluded from the mask so walking across never drifts. Drift does not run while paused. Only reaching the river's south end resets the visitor: a short fade (a cut under reduced motion), the cursor at the Arch reset point, the camera centred, the "you" tag shown again, and peers snap on the jump. The owning client computes the drift and sends the result as a normal move. Entering and leaving the river sends the river presence bit, carried in `hello` for late joiners and not validated by the server (spec gap 1, the presence-bit choice). The bridge is drawn over a cursor in the river and under a cursor crossing it, own and peers alike.

Carries over the pointer-lock prototype's river module.

**Blocked by:** 04 (river geometry), 13 (presence), 19 (layering)

**Status:** ready-for-agent

- [ ] Stepping into the water drifts the cursor south; paddling out to a bank stops it; the bridge is crossable without drift
- [ ] Passing under the deck keeps the cursor in the river and drawn under the bridge; a peer under the deck is drawn under it too, including for a late joiner
- [ ] Reaching the south end resets to the Arch with the fade and the "you" tag; peers see the snap
- [ ] Drift stops while paused and resumes on resume
- [ ] The river state machine is a pure module stepped with a fake clock and tested for bank entry, deck exit, under-deck, bank exit and south-end reset (seam 2)

## Comments

- From ticket 04's close-out (2026-09-25): `OVERWORLD.river.deck` is an axis-aligned rect round the sloped Eads deck, so it also covers open water above and below the deck band (widest at its west end), where a cursor would not drift. Consider a deck polygon (or the deck band's top and bottom lines) when implementing drift.
