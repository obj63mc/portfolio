# 15: Props drawn on the canvas with reactions, ambient motion and cards through the engine

**What to build:** Every prop is drawn on the scene canvas from its cut-out, ordered by base y, with the placeholder cut-outs of any scene whose art pass hasn't landed. Ambient motion plays with no input: the rider looping the track (sprite sheet), the marquee lights chasing, the moose breathing, the taps; moving props are pivoted transparent WebP layers tweened in the scene loop (the moose rig: body, head, antlers, eye). Reactions play on hover and click: the moose head turn and antler wobble, the MonsterCommerce eye blink, and a hover state for every prop. Opening a prop's card is the click: hover reaction on focus, click reaction on Enter, Space, a click or a tap. Under reduced motion ambient motion freezes on a resting frame, click reactions still play, and hover reactions become a plain highlight. Production skips the draw when the camera, visible peers and visible ambient motion are all still. Irregular props get a `clip-path` on their button. Any prop's external link (GitHub on the workstation, Strava on the bike) lives inside its card.

Carries over the rendering prototype's prop module, the moose rig and rider sprite handling, and its reduced-motion handling.

**Blocked by:** 03 (every prop in scene data), 08 (engine)

**Status:** ready-for-agent

- [ ] Every prop on every scene is drawn at its rect and its button sits over it
- [ ] Ambient motion runs for the rider, marquee, moose and taps; it freezes on a resting frame under reduced motion
- [ ] Hover, focus, click, Enter and Space play the specified reactions; the click opens the card; reduced motion swaps hover reactions for a highlight
- [ ] With nothing moving on screen no frame is drawn
- [ ] The Playwright card test from 09 still passes with props drawn
