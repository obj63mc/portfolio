# River current on desktop: does the drifting cursor feel like play or a broken mouse?

Type: prototype
Status: open
Part of: ../map.md
Blocked by: 18

## Question

The depth effects ticket (18) settled the river current: a cursor over the Mississippi's water mask (bridge deck excluded) drifts south at about 150 world px/s, the camera does not follow, drifting out of the camera view fades the visitor to the Arch, and peers snap on jumps over about 400 world px. On touch this is simple, since the joystick moves the cursor in world space. On desktop the drawn cursor is the real pointer (OS pointer hidden), so drift has to pull the drawn cursor away from the pointer by a growing offset while mouse deltas still move it and clicks use the drawn position (as the joystick does via `elementFromPoint`). Decide by feel: whether the offset reads as play or as a broken mouse; when the offset clears (only on the Arch reset, or also easing back to the pointer once the cursor is off the water, and over what time); what happens when the hidden real pointer reaches the window edge or leaves the window while the drawn cursor is still in the river; whether edge-push reads from the drawn cursor or the real pointer while an offset exists; and whether the 150 px/s drift speed holds. If the offset can't be made to feel right, name the fallback (for example, desktop cursors float over the water with no drift). Output: the desktop current rules for the spec. Prototype on top of `prototype/cursor-sync` or `prototype/rendering-camera`, with a stand-in river strip and bridge.
