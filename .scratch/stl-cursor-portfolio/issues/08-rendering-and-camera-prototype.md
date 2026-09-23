# Does hybrid canvas rendering with the camera model hold 60fps on a phone?

Type: prototype
Status: open
Part of: ../map.md
Blocked by: 06, 13

## Question

Build a throwaway SvelteKit static prototype with the artwork on a canvas, clickable props positioned in world coordinates with real HTML underneath, a cursor overlay, edge-push plus drag-to-pan plus joystick camera, and at least one animated prop. Measure frame rate and battery behaviour on a mid-range Android and an iPhone. Decide: does canvas-drawn artwork with DOM props work, or do props need to move onto the canvas with hit regions? Output: the prototype on a branch and a rendering decision. Uses placeholder art if the art pipeline ticket is not done; uses the camera rules from the layout ticket.

## Comments

2026-09-23, from the cursor identity ticket (11): cursors are a 32 world px drawn arrow with three cosmetic anchors (head, face, side), a flag badge lower right, a halo on the visitor's own cursor, and a gold body variant. All drawn from one sprite atlas by cosmetic id. Peers outside the camera are not drawn or interpolated at all. Whether the overlay is DOM or canvas is this prototype's call.

2026-09-23, from the animation approach ticket (13): no Rive runtime. The animated prop is a layered raster prop (separate parts, one pivot each) tweened in the scene loop, plus one sprite-sheet loop for the track rider. Include the reduced-motion behaviour: ambient motion freezes, click reactions play, hover reactions become a highlight. Measure the layered props on the phone alongside the camera. See ADR 0002.
