# Does hybrid canvas rendering with the camera model hold 60fps on a phone?

Type: prototype
Status: claimed
Part of: ../map.md
Blocked by: 06, 13

## Question

Build a throwaway SvelteKit static prototype with the artwork on a canvas, clickable props positioned in world coordinates with real HTML underneath, a cursor overlay, edge-push plus drag-to-pan plus joystick camera, and at least one animated prop. Measure frame rate and battery behaviour on a mid-range Android and an iPhone. Decide: does canvas-drawn artwork with DOM props work, or do props need to move onto the canvas with hit regions? Output: the prototype on a branch and a rendering decision. Uses placeholder art if the art pipeline ticket is not done; uses the camera rules from the layout ticket.

## Comments

2026-09-23, from the cursor identity ticket (11): cursors are a 32 world px drawn arrow with three cosmetic anchors (head, face, side), a flag badge lower right, a halo on the visitor's own cursor, and a gold body variant. All drawn from one sprite atlas by cosmetic id. Peers outside the camera are not drawn or interpolated at all. Whether the overlay is DOM or canvas is this prototype's call.

2026-09-23, from the animation approach ticket (13): no Rive runtime. The animated prop is a layered raster prop (separate parts, one pivot each) tweened in the scene loop, plus one sprite-sheet loop for the track rider. Include the reduced-motion behaviour: ambient motion freezes, click reactions play, hover reactions become a highlight. Measure the layered props on the phone alongside the camera. See ADR 0002.

2026-09-24, wayfinder session (claimed, waiting on Joe's phones): the prototype is on branch `prototype/rendering-camera` at `prototypes/rendering-camera/` (commit a2577a1). Rather than one build it holds three variants on the real routes (`/` and `/maplewood/moosylvania`), switchable with `?variant=`: **A** DOM props and DOM cursors; **B** props drawn on the canvas with transparent DOM buttons as hit targets and a cursor overlay canvas; **C** everything on one canvas with per-pixel alpha hit regions and a visually hidden button list. Camera (every ticket 06 rule), tiled background (512 world px WebP tiles at 1.25x or 2x density, one-ring preload, two-ring eviction), 15 Hz peers with 100 ms interpolation, the ticket 07 moose rig, marquee, rider sprite sheet, reduced motion and the lobby handoff are shared, so the variants differ only in rendering and hit testing. A scripted Run all benchmark (A, B, C x 20 and 60 peers) and a 10-minute soak post results to `results.jsonl` through the preview server.

Checked here: all three variants render, switch, enter the lobby and return without errors; drag, touch inertia, cursor carry and joystick push follow the ticket 06 rules under touch emulation. Headless Chrome holds 60 fps with 0 to 0.1% missed frames for every variant, both on desktop (1440x900 at DPR 2) and emulating a 390x844 DPR 3 phone at scale 0.6 with a 4x CPU throttle. That is not a phone GPU, so the decision still waits on the real devices.

What remains is human-in-the-loop (checklist in the README): on the iPhone and a mid-range Android, open `http://<Mac LAN IP>:4173/` served by `npm run phone`, Run all, soak the fastest variant for 10 minutes with battery before and after, and feel-test the camera, joystick and 0.6 scale. Then decide A, B or C and record the answer here.
