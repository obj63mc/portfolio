# 08: Canvas engine and camera with an unlocked mouse

**What to build:** The scene canvas draws the tiled background and the button layer moves with one transform per frame, so a desktop visitor can roam the overworld with an ordinary mouse: a drawn cursor follows the OS pointer, and the camera follows the drawn cursor by edge-push through one band (25 percent of the viewport on the overworld and in the Moosylvania lobby, which scrolls like it, 12 percent in the other sub-scenes), easing from 0 to about 900 world px/s at the edge, with no push while a prop is hovered or the cursor is within 40 px of a prop or an on-screen control, a hard clamp at scene bounds, and push stopping when the pointer leaves the window. This is also the fallback for a browser that refuses pointer lock (spec gap 6). Keyboard focus (`:focus-visible`) centres the camera on the focused element smoothly, or instantly under reduced motion; a mouse click never pans; the signpost's fragment links pan to their district. Tiles preload one ring beyond the camera and evict beyond two with `ImageBitmap.close()`. Render scale is fixed per session: 1.0 on fine-pointer desktops, 0.6 on phones, and for a coarse-pointer tablet chosen by viewport width (spec gap 5); DPR is capped at 2. The engine starts in `onMount`, adds the class that turns the layer into transparent hit targets, and never re-renders the layer. Desktop has no drag, wheel or trackpad panning.

Carries over the rendering prototype's camera engine, tile loader and prop-layer transform, amended for the spec's rules; the debug HUD, gear panel and variants are not carried.

**Blocked by:** 01 (layer and scene data)

**Status:** resolved

- [x] Tiles draw for the overworld and the lobby from whatever art is in scene data (real once 04 and 05 land), at the session render scale, with ring preload and eviction
- [x] The button layer and the canvas agree: a prop's button sits over its drawn rect at every camera position
- [x] Edge-push, suppression, clamp and the 25/12 percent bands (25 in the Moosylvania lobby) behave as specified; push stops when the pointer leaves the window
- [x] Tab to a prop centres the camera on it; reduced motion makes it instant; clicking never pans
- [x] `#belleville` from the signpost pans to Belleville
- [x] Render scale and DPR cap follow the device rules above, including the tablet width rule
- [x] The camera (push band, suppression, clamp) is a pure module stepped with a fake clock and tested that way (seam 2)

## Comments

2026-09-29, resolved in one commit on `main`. The camera is `src/lib/engine/camera.ts`: push band, suppression, clamp, the focus glide, the tile ring and the render scale as pure functions, stepped with a fake clock in `tests/camera.test.ts` (seam 2). The engine is `src/lib/engine/engine.ts`, loaded on mount with a dynamic import so it stays out of the prerender and the first paint. Every placed element in the layer (props, the district `<h2>` over its sign, the venue `<h3>`, the doors, the exits and the signpost) carries its world rect as custom properties from `at()` in `src/lib/scenes/index.ts`. `html.engine` in `app.css` reads those properties, and the build-output test checks them against scene data (seam 3). Tiles are the art pass's background plates, which already paint the props in. They are found by convention at `art/generated/<id>/<id>/<density>/`, through a Vite glob that emits hashed, never-inlined assets. `pushBand` moved to the shared scene shape, and the overworld states its 0.25.

Checked by hand in headless Chrome against the production build:

- Placement: all 27 overworld hit targets sit exactly on their rects.
- Edge-push: about 900 px/s at the edge, easing inside the band, still in the middle. The camera holds 30 px from the marquee, stops when the pointer leaves the window and clamps at the corners. SLU does not push at 15 percent from the edge; the lobby does.
- Focus: Tab centres the focused element. A mouse click opens a card without panning, and Escape's focus return doesn't pan either.
- Fragments: `#belleville` glides there, and cuts there under reduced motion. Direct loads of `/#belleville` and `/#moosylvania` open on them, and a malformed fragment opens on the welcome sign.
- Render scale: under touch emulation a 390 x 844 phone gets 0.6 with DPR 3 capped to 2 and the signpost in the first frame. An 820 px iPad gets 0.8 and a 1024 px iPad 1.0 (before Joe's size rule below).

Calls made here for Joe to confirm or veto:

- **Tablet scale**: a coarse pointer scales by the screen's shorter side, clamped between 0.6 and 1 (`shortSide / 1024`), not by viewport width. A phone turned landscape would otherwise be 844 wide and drawn at tablet scale, and the scale is fixed per session. A tablet in Split View therefore keeps its full-screen scale.
- **OS cursor**: in the unlocked model the OS cursor is hidden over the scene, where the drawn cursor stands in for it (as in the prototype). It shows over cards and the controls, where the drawn cursor hides.
- **Doors**: until 11 measures door rects, each overworld door link covers its whole venue rect, beneath the props and the signpost. Clicking anywhere on a building enters it, the 1900 px Foundry block included.
- **Signpost**: its nine links share the 60 x 120 board in equal slots, about 13 world px each, not over painted arrows.
- **Held camera**: after a keyboard or fragment pan, push stays off until the mouse really moves, so a mouse resting in the band doesn't undo the pan.
- **Skip link**: with the engine running, it sits on the signpost, where it leads.
- **Density and DPR**: tile density follows scale x DPR, so a DPR-1 desktop loads the 1.25 tiles. DPR is read once per session with the scale.

Left for later:

- No `Cache-Control: immutable` rule for `/_app/immutable/*` in `static/_headers`, so tiles revalidate on each visit.
- The drawn cursor is a plain 1.25x arrow until 13's atlas.
- The skip-draw-when-still rule is only partly in place: the scene canvas redraws only when the camera moves or a tile lands, and the overlay only when the cursor moves.
- For 11: focusing the sub-scene `<h1>` never pans, because only placed elements pan the camera.

2026-09-29, Joe's answers to the calls above:

- **Render scale**: 0.6 on a screen under 768 px on its shorter side, else 1, whatever the pointer; `rendering()` and its test follow. An iPad mini (744) now gets 0.6 and an 820 px iPad 1.0. The touch controls are for a device with no mouse or trackpad connected (`(any-pointer: fine)` false); spec gap 5 and tickets 09 and 10 carry the rule.
- **Cursor**: the drawn cursor always shows. It now draws over the controls too, with the OS cursor hidden there. Over a card the OS cursor still shows, until 09 lifts the cursor canvas above the cards.
- **Signpost**: tap targets of at least 48 x 48, filed as ticket 27.
- **Skip link**: open; kept for now, since the spec lists it.
- The rest stands.
