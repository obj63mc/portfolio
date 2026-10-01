# 03: The page

**What to build:** `src/routes/big-muddy/+page.svelte` and `src/lib/big-muddy/draw.ts`: the intro, the cast on a 2D canvas, the result and the top ten. Pointer, keys and a touch joystick; pause; reduced motion.

**Blocked by:** 01, 02

**Status:** resolved

- [x] Intro, play, result and board; the lure and its level kept
- [x] Mouse, Arrow/A/D and the joystick steer; Esc, a button and a hidden tab pause
- [x] The spec plays a seeded cast to its result and finds the catch stored

## Comments

### Built, 2026-10-01

- `src/routes/big-muddy/+page.svelte`, `src/lib/big-muddy/draw.ts`. Native 2D canvas, no library (Joe asked; Pixi is the way up, inside `draw.ts`).
- The canvas fills the water; the view is 1200 units tall on every device, and a wider window only sees more to the sides.
- Mouse: full speed 100 units either side of the lure, none once a key steers, until it moves again. Keys: Arrow, A, D. Touch: a joystick with the scenes' look (`.joystick.on`, lifted out of the engine's rule in `app.css`).
- Pause: the header's button, Esc, a hidden tab; a native dialog, Resume or Esc to go on.
- The result is a dialog whose Cast again takes focus, so Enter and Space cast again as the original's did.
- The snags are drawn, branching twigs like the original's, coral when caught (Joe, 2026-10-01), not cut-outs; the lure, line and bubbles are drawn too.
- Reduced motion: the cast runs; the bubbles and the fish's swim wave rest, and the page's opening iris is a cut.
- `tests/big-muddy.spec.ts`: a seeded cast ends as the rules say for the same dice, its catch stored and heading the top ten; a snag costs the lure; Esc holds the cast until Resume.
- Seen in headless Chromium at 1280 x 800 and as an iPhone 13. Real phones are ticket 07.
