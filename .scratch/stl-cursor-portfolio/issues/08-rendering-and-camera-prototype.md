# Does hybrid canvas rendering with the camera model hold 60fps on a phone?

Type: prototype
Status: resolved
Part of: ../map.md
Blocked by: 06, 13

## Question

Build a throwaway SvelteKit static prototype with the artwork on a canvas, clickable props positioned in world coordinates with real HTML underneath, a cursor overlay, edge-push plus drag-to-pan plus joystick camera, and at least one animated prop. Measure frame rate and battery behaviour on a mid-range Android and an iPhone. Decide: does canvas-drawn artwork with DOM props work, or do props need to move onto the canvas with hit regions? Output: the prototype on a branch and a rendering decision. Uses placeholder art if the art pipeline ticket is not done; uses the camera rules from the layout ticket.

## Answer

Resolved 2026-09-24 with the rendering prototype on branch `prototype/rendering-camera` (`prototypes/rendering-camera/`, commit a2577a1). Recorded as [ADR 0003, Canvas-drawn props with DOM hit targets](../../../docs/adr/0003-canvas-props-dom-hit-targets.md).

**Decision: variant B.** Joe picked it after driving the prototype and confirmed that movement works well: drag, fling, joystick, edge push and the lobby handoff.

- **Artwork and props** are drawn by the scene canvas loop: background tiles first, then visible props sorted by base y. This keeps ADR 0002 unchanged.
- **Hit targets**: each prop has a transparent `<button>` holding its real text, sized to the prop's world rect, inside one DOM layer that the camera moves with a single transform per frame. Only moving props, such as the rider, get their own per-frame transform. Clicks, keyboard focus, `:focus-visible` rings, Enter and Space, and screen-reader touch exploration are all native and sit where the prop is drawn.
- **Hover**: DOM pointer events for a mouse. For the joystick-driven cursor, `elementFromPoint` at the drawn cursor's position.
- **Cursors** are drawn on an overlay canvas above the button layer with `pointer-events: none`, from the atlas in the cursor identity ticket (11).
- **Background**: 512 world px WebP tiles on the canvas at two densities, 1.25 image px per world px for phones (0.6 x DPR 2) and 2 for desktop at DPR 2. DPR is capped at 2. Tiles one ring beyond the camera are preloaded, and tiles beyond two rings are evicted with `ImageBitmap.close()` so phone memory stays flat.
- **Camera**: every rule from the layout ticket (06) was implemented as written and needed no retuning: push band 25% overworld and 12% sub-scenes, up to 900 px/s, suppressed within 40 px of a prop; drag after 6 px; touch inertia with tau 0.15 s; joystick at 600 px/s with a 15% dead zone. Render scale 0.6 on phones and 1.0 on desktop holds.

### Why not A or C

- **A (DOM props)** writes a CSS matrix per moving part and per peer cursor every frame, and contradicts ADR 0002's canvas-native props for no measured gain.
- **C (all canvas)** has pixel-accurate hits, but its HTML is a hidden list: a screen-reader user exploring by touch finds nothing where the prop is drawn, and focus rings and alpha masks become our own code to maintain.
- B keeps native semantics in place for the cost of one transform per frame.

### Measured

Headless Chrome, scripted 12 s tour over every district (frames that missed a vsync in brackets):

| Setup | A 20 / 60 peers | B 20 / 60 peers | C 20 / 60 peers |
| --- | --- | --- | --- |
| Desktop 1440x900, DPR 2, scale 1 | 60 / 60 fps (0 / 0%) | 59.9 / 60 fps (0.1 / 0%) | 60 / 60 fps (0 / 0%) |
| Phone emulation 390x844, DPR 3 capped to 2, scale 0.6, CPU 4x throttled | 59.7 / 60 fps (0.1 / 0%) | 60 / 60 fps (0 / 0%) | 60 / 60 fps (0 / 0%) |

JS per frame stayed under 1 ms at p95 in every run. No phone benchmark or battery soak was posted to `results.jsonl`, so the phone verdict rests on Joe's hands-on test, not on phone GPU numbers. The prototype's Run all and Soak buttons remain the way to get them if a later scene is heavier.

### Consequences for the spec

- Hit shapes are the prop's rect, not its alpha. Clicks on a prop's transparent corners count. Keep prop art tightly trimmed; any irregular prop gets a CSS `clip-path` on its button.
- The button layer must be prerendered HTML so crawlers see it. The prototype ran with `ssr = false`, so this is still open and belongs to the accessible HTML layer ticket.
- The prototype redraws every frame. Production should skip the draw when the camera, visible peers and visible ambient motion are all still, to save battery.
- The debug HUD, bench and soak are prototype-only.

## Comments

2026-09-23, from the cursor identity ticket (11): cursors are a 32 world px drawn arrow with three cosmetic anchors (head, face, side), a flag badge lower right, a halo on the visitor's own cursor, and a gold body variant. All drawn from one sprite atlas by cosmetic id. Peers outside the camera are not drawn or interpolated at all. Whether the overlay is DOM or canvas is this prototype's call.

2026-09-23, from the animation approach ticket (13): no Rive runtime. The animated prop is a layered raster prop (separate parts, one pivot each) tweened in the scene loop, plus one sprite-sheet loop for the track rider. Include the reduced-motion behaviour: ambient motion freezes, click reactions play, hover reactions become a highlight. Measure the layered props on the phone alongside the camera. See ADR 0002.

2026-09-24, wayfinder session (claimed, waiting on Joe's phones): the prototype is on branch `prototype/rendering-camera` at `prototypes/rendering-camera/` (commit a2577a1). Rather than one build it holds three variants on the real routes (`/` and `/maplewood/moosylvania`), switchable with `?variant=`: **A** DOM props and DOM cursors; **B** props drawn on the canvas with transparent DOM buttons as hit targets and a cursor overlay canvas; **C** everything on one canvas with per-pixel alpha hit regions and a visually hidden button list. Camera (every ticket 06 rule), tiled background (512 world px WebP tiles at 1.25x or 2x density, one-ring preload, two-ring eviction), 15 Hz peers with 100 ms interpolation, the ticket 07 moose rig, marquee, rider sprite sheet, reduced motion and the lobby handoff are shared, so the variants differ only in rendering and hit testing. A scripted Run all benchmark (A, B, C x 20 and 60 peers) and a 10-minute soak post results to `results.jsonl` through the preview server.

Checked here: all three variants render, switch, enter the lobby and return without errors; drag, touch inertia, cursor carry and joystick push follow the ticket 06 rules under touch emulation. Headless Chrome holds 60 fps with 0 to 0.1% missed frames for every variant, both on desktop (1440x900 at DPR 2) and emulating a 390x844 DPR 3 phone at scale 0.6 with a 4x CPU throttle. That is not a phone GPU, so the decision still waits on the real devices.

What remains is human-in-the-loop (checklist in the README): on the iPhone and a mid-range Android, open `http://<Mac LAN IP>:4173/` served by `npm run phone`, Run all, soak the fastest variant for 10 minutes with battery before and after, and feel-test the camera, joystick and 0.6 scale. Then decide A, B or C and record the answer here.
