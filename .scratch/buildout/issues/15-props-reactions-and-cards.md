# 15: Props drawn on the canvas with reactions, ambient motion and cards through the engine

**What to build:** Every prop is drawn on the scene canvas from its cut-out, ordered by base y, with the placeholder cut-outs of any scene whose art pass hasn't landed. Ambient motion plays with no input: the rider looping the track (sprite sheet), the marquee lights chasing, the moose breathing, a glint along the Side Project bottles; moving props are pivoted transparent WebP layers tweened in the scene loop (the moose rig: body, head, antlers, eye). Reactions play on hover and click: the moose head turn and antler wobble, the MonsterCommerce eye blink, and a hover state for every prop. Opening a prop's card is the click: hover reaction on focus, click reaction on Enter, Space, a click or a tap. Under reduced motion ambient motion freezes on a resting frame, click reactions still play, and hover reactions become a plain highlight. Production skips the draw when the camera, visible peers and visible ambient motion are all still. Irregular props get a `clip-path` on their button. Any prop's external link (GitHub on the workstation, Strava on the bike) lives inside its card.

Carries over the rendering prototype's prop module, the moose rig and rider sprite handling, and its reduced-motion handling.

**Blocked by:** 03 (every prop in scene data), 08 (engine)

**Status:** ready-for-agent

- [ ] Every prop on every scene is drawn at its rect and its button sits over it
- [ ] Ambient motion runs for the rider, marquee, moose and the Side Project bottles; it freezes on a resting frame under reduced motion
- [ ] Hover, focus, click, Enter and Space play the specified reactions; the click opens the card; reduced motion swaps hover reactions for a highlight
- [ ] With nothing moving on screen no frame is drawn
- [ ] The Playwright card test from 09 still passes with props drawn

## Comments

### The Foundry posters' hover light, 2026-09-28

Joe had the picture lights over the three Foundry posters painted switched off, so that hovering a poster can turn its light on. `POSTER_LAMPS` in `src/lib/scenes/foundry.ts` gives each lamp's point, at the top of its poster's rect (a test holds it there). Each poster's cut-out includes its lamp. The hover reaction is a warm pool of light from the lamp down over the poster. Under reduced motion it becomes the plain highlight, and focus plays it like a hover.

### The Moosylvania meeting TV, 2026-09-28

The lobby's `meeting-tv` prop plays a video Joe will provide, for the visitor who clicks it (spec: "Local prop, the Moosylvania meeting TV"). Nothing crosses the wire, and peers see the TV dark.
- **The card:** it holds the video in a native `<video controls>` with captions, the keyboard and screen-reader route.
- **One video element serves both:** it is drawn onto the TV's rect in the scene and keeps playing there after the card closes, until it ends.
- **Loading:** the file loads only on that click.
- **Scene data:** `src/lib/scenes/moosylvania.ts` has the TV's rect, the matte of its panel. It gets a `video` field when the file exists; until then the card holds a placeholder line. Moved here from ticket 05.

