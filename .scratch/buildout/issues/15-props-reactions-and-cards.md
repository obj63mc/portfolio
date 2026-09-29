# 15: Props drawn on the canvas with reactions, ambient motion and cards through the engine

**What to build:** Every prop is drawn on the scene canvas from its cut-out, ordered by base y, with the placeholder cut-outs of any scene whose art pass hasn't landed. Ambient motion plays with no input: the rider looping the track (sprite sheet), the marquee lights chasing, the moose breathing, a glint along the Side Project bottles; moving props are pivoted transparent WebP layers tweened in the scene loop (the moose rig: body, head, antlers, eye). Reactions play on hover and click: the moose head turn and antler wobble, the MonsterCommerce eye blink, and a hover state for every prop. Opening a prop's card is the click: hover reaction on focus, click reaction on Enter, Space, a click or a tap. Under reduced motion ambient motion freezes on a resting frame, click reactions still play, and hover reactions become a plain highlight. Production skips the draw when the camera, visible peers and visible ambient motion are all still. Irregular props get a `clip-path` on their button. Any prop's external link (GitHub on the workstation, Strava on the bike) lives inside its card.

Carries over the rendering prototype's prop module, the moose rig and rider sprite handling, and its reduced-motion handling.

**Blocked by:** 03 (every prop in scene data), 08 (engine)

**Status:** resolved

- [x] Every prop on every scene is drawn at its rect and its button sits over it
- [x] Ambient motion runs for the rider, marquee, moose and the Side Project bottles; it freezes on a resting frame under reduced motion
- [x] Hover, focus, click, Enter and Space play the specified reactions; the click opens the card; reduced motion swaps hover reactions for a highlight
- [x] With nothing moving on screen no frame is drawn
- [x] The Playwright card test from 09 still passes with props drawn

## Comments

### The Foundry posters' hover light, 2026-09-28

Joe had the picture lights over the three Foundry posters painted switched off, so that hovering a poster can turn its light on. `POSTER_LAMPS` in `src/lib/scenes/foundry.ts` gives each lamp's point, at the top of its poster's rect (a test holds it there). Each poster's cut-out includes its lamp. The hover reaction is a warm pool of light from the lamp down over the poster. Under reduced motion it becomes the plain highlight, and focus plays it like a hover.

### The Moosylvania meeting TV, 2026-09-28

The lobby's `meeting-tv` prop plays a video Joe will provide, for the visitor who clicks it (spec: "Local prop, the Moosylvania meeting TV"). Nothing crosses the wire, and peers see the TV dark.
- **The card:** it holds the video in a native `<video controls>` with captions, the keyboard and screen-reader route.
- **One video element serves both:** it is drawn onto the TV's rect in the scene and keeps playing there after the card closes, until it ends.
- **Loading:** the file loads only on that click.
- **Scene data:** `src/lib/scenes/moosylvania.ts` has the TV's rect, the matte of its panel. It gets a `video` field when the file exists; until then the card holds a placeholder line. Moved here from ticket 05.

### Built, 2026-09-29

- **Where:** `src/lib/engine/props.ts` loads each prop's cut-outs from art/generated at the session's density, draws them on the scene canvas after the tiles in order of base y, and plays their reactions; `src/lib/engine/motion.ts` holds the timing as pure functions of time and state (`tests/props.test.ts`). The engine calls it from `show()` and each frame.
- **Cut-outs:** a prop's art is its id on the overworld and `<scene>-<id>` in a sub-scene. Scene data names the exceptions in a new `art` field: the marquee's bulbs, the MonsterCommerce eye, the moose statue, the TV, the Side Project sign, Brennan's boxes and plaque, and the track, which has none (the rider is its motion). Each cut-out is drawn at its asset.json world rect, so it covers its painted original exactly. The plate paints none of the signpost, the church door, the welcome board, the bike, the ride sign, the moose or the rider, so the overworld draws the signpost and door as scenery too. A test checks every prop resolves to its art.
- **Rider:** the art is a rig (a body and two wheels), not a sprite sheet (spec Motion bullet updated). It rides out and back along the park's lower straight on server time, once every 12 s. It faces the way it rides, and its wheels turn by the distance ridden. The manifest's layout (x 2400 ± 150) took it through the painted tree's trunk west of the straight, where the path runs behind the tree. It is now x 2550 ± 110 in `art/manifest.json` and `RIDER`, a test holding the two together. Its full travel, 2440 to 2780, stays on the visible straight and clear of the foreground park tree at 2784, which `art:validate` checks. The review data and overworld composite are rebuilt.
- **Reactions:**
  - **Hover:** every prop glows round its silhouette. The glow is painted first and the prop again over it, so the moose's head never lightens its body. A poster lights its picture light instead, a warm pool masked to the poster's own pixels, since its rect takes in the wall.
  - **Moose:** it lifts its head on hover, and a click wobbles its antlers and blinks it. It breathes and blinks on its own.
  - **MonsterCommerce:** a click shuts the eye over a lid in the monster's purple.
  - **Click:** every other prop pops (scales up about its centre, 300 ms).
  - **Marquee:** its bulbs chase in thirds, brightening only the bulbs' own pixels.
  - **Side Project bottles:** a white glint sweeps the row every 7 s on the bottles' pixels.
- **Reduced motion:** ambient motion rests (the rider mid-straight facing east). Hover is the glow at once, with no head lift or picture light. Click reactions still play.
- **Hover and click sources:** hover is the free mouse's `:hover`, the engine's `.hot` for a locked or steered cursor, or `:focus-visible`, read from the `data-prop` wrapper. The click is any click on the prop's button, which is what opens its card.
- **Irregular props:** they now clip their buttons: `--clip` from scene data, applied only under the engine, so the plain document isn't cut. The focus ring sits inside the button, where a clip-path leaves it showing.
- **No frame when still:** each layer keeps a key of what it last drew. The scene canvas is drawn only when the camera moved, a tile or cut-out arrived, or a visible layer's key changed. When only props changed, just their area is drawn again, clipped to whole device px, so the moose breathing doesn't repaint the screen. A settled partial redraw was checked equal to a full one pixel for pixel. `tests/props.spec.ts` counts the scene canvas's drawings: none in the still lab, some while a hover fades in, none once held, continuous for the moose, none under reduced motion, and a click's wobble still drawn.
- **The meeting TV:** its card holds a native `<video controls preload="none">` of the Fast Five demo, a stand-in until Joe's video. The click that opens the card plays it. Props draws it onto the TV's screen, the dark inset measured on its matte, fitted inside it, until it ends, the card closed or not. The videos are served by Vite from `art/sources/videos`, hashed into the build (`fs.allow` for the dev server), and a smoke checks nothing loads before the click. There is no captions track until Joe supplies the real video and its captions (TODO in `moosylvania.ts`).
- **Smoke timing:** the phone smoke's fling now stamps its touches a frame apart. While the moose breathes, headless Chrome acknowledges each sent touch a few frames late, which spread the moves past `fling()`'s 80 ms window. A real finger moves every frame whatever the page draws.
- **Hands-on for Joe:**
  - Under the lock, the drawn cursor can't work the video's native controls, which are no link or button. The keyboard and the card's Close work.
  - The TV video on iOS Safari.
  - The look of the glow, lamp, chase and glint on a phone.
  - Whether the rider's shorter straight reads well.
