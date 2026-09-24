# Canvas-drawn props with DOM hit targets

Props are drawn by the scene canvas, and each prop also has a transparent `<button>` holding its real text. The buttons sit in one DOM layer, sized to each prop's world rect, and the camera moves the whole layer with a single transform per frame. Cursors are drawn on an overlay canvas above that layer. We chose this over DOM props (a CSS transform per moving part and per cursor every frame, against ADR 0002) and over an all-canvas scene with alpha hit regions. In the all-canvas version the HTML lives in a hidden list, so screen-reader touch exploration finds nothing where a prop is drawn, and focus rings and hit masks become our own code. The rendering prototype (ticket 08) held 60 fps for all three approaches in emulation, so the choice rests on native semantics in place, not on speed.

## Consequences

- A prop's hit area is its rect, not its painted pixels. Prop art stays tightly trimmed, and an irregular prop gets a `clip-path` on its button.
- The button layer is the accessible and crawlable HTML, so it must be prerendered, not built by script after load.
- Hover comes from DOM pointer events for a mouse, and from `elementFromPoint` at the drawn cursor for the joystick.
