# 08: Canvas engine and camera with an unlocked mouse

**What to build:** The scene canvas draws the tiled background and the button layer moves with one transform per frame, so a desktop visitor can roam the overworld with an ordinary mouse: a drawn cursor follows the OS pointer, and the camera follows the drawn cursor by edge-push through one band (25 percent of the viewport on the overworld, 12 percent in sub-scenes), easing from 0 to about 900 world px/s at the edge, with no push while a prop is hovered or the cursor is within 40 px of a prop or an on-screen control, a hard clamp at scene bounds, and push stopping when the pointer leaves the window. This is also the fallback for a browser that refuses pointer lock (spec gap 6). Keyboard focus (`:focus-visible`) centres the camera on the focused element smoothly, or instantly under reduced motion; a mouse click never pans; the signpost's fragment links pan to their district. Tiles preload one ring beyond the camera and evict beyond two with `ImageBitmap.close()`. Render scale is fixed per session: 1.0 on fine-pointer desktops, 0.6 on phones, and for a coarse-pointer tablet chosen by viewport width (spec gap 5); DPR is capped at 2. The engine starts in `onMount`, adds the class that turns the layer into transparent hit targets, and never re-renders the layer. Desktop has no drag, wheel or trackpad panning.

Carries over the rendering prototype's camera engine, tile loader and prop-layer transform, amended for the spec's rules; the debug HUD, gear panel and variants are not carried.

**Blocked by:** 01 (layer and scene data)

**Status:** ready-for-agent

- [ ] Tiles draw for the overworld and the lobby from whatever art is in scene data (real once 04 and 05 land), at the session render scale, with ring preload and eviction
- [ ] The button layer and the canvas agree: a prop's button sits over its drawn rect at every camera position
- [ ] Edge-push, suppression, clamp and the 25/12 percent bands behave as specified; push stops when the pointer leaves the window
- [ ] Tab to a prop centres the camera on it; reduced motion makes it instant; clicking never pans
- [ ] `#belleville` from the signpost pans to Belleville
- [ ] Render scale and DPR cap follow the device rules above, including the tablet width rule
- [ ] The camera (push band, suppression, clamp) is a pure module stepped with a fake clock and tested that way (seam 2)
