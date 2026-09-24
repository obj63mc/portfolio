# Rendering and camera prototype (throwaway)

Answers wayfinder ticket 08 on the St. Louis cursor portfolio map: **does hybrid canvas rendering with
the camera model hold 60 fps on a phone, and should props be DOM elements or live on the canvas with hit
regions?** Nothing here ships. The branch `prototype/rendering-camera` is the primary source; the ticket
holds the verdict.

## Run it

```sh
cd prototypes/rendering-camera
npm install
npm run phone        # production build, served on the LAN at port 4173
```

Open `http://<this Mac's LAN IP>:4173/` on the phone (same Wi-Fi). `npm run art` rebuilds the placeholder
scene tiles in `static/art/` from `../art-pipeline/assets` (needs ImageMagick); the output is committed.

## The three variants (`?variant=A|B|C`, or the pill at the bottom; `[` and `]` on a keyboard)

Camera, input, tiles, peers and prop motion are shared. The variants differ only in where props and
cursors are drawn and hit-tested.

| | Props drawn by | Props hit-tested by | Cursors | HTML for crawlers and screen readers |
| --- | --- | --- | --- | --- |
| **A** | DOM `<button>` of `<img>` layers, CSS matrix per moving part per frame | the DOM | DOM elements from the atlas | the prop buttons themselves, in place |
| **B** | the scene canvas | transparent `<button>`s in a DOM layer that moves with the camera | overlay canvas | the transparent buttons, in place |
| **C** | the scene canvas | per-pixel alpha masks in JS | the scene canvas | a visually hidden list; focus draws a ring on the canvas and pans to the prop |

In every variant the background is 512 world px WebP tiles drawn on a canvas (or `bg=dom` for `<img>`
tiles moved by one CSS transform), loaded one ring beyond the camera and evicted beyond two.

## What's in the scene

- Overworld 5400 x 2700 with the real Maplewood art from ticket 07 and hue-shifted stand-ins for the
  other districts; 14 props including the four-part moose rig (breathing, blink, head turn on hover,
  antler wobble on click), the Foundry marquee (chasing bulbs), the MonsterCommerce eye (blink on click),
  the track rider (sprite sheet moving round the oval) and doors.
- Moosylvania lobby sub-scene at `/maplewood/moosylvania`, entered through the church door, left by
  the exit door or the back button.
- Simulated peers sent at 15 Hz and drawn 100 ms behind with interpolation; off-camera peers are skipped.
- Reduced motion (`rm=1` or the OS setting): ambient motion freezes, click reactions play, hover is a
  highlight only.
- Camera rules from ticket 06: edge push band (25% overworld, 12% sub-scenes) up to 900 px/s, suppressed
  over or within 40 px of a prop; drag after 6 px with touch inertia; wheel, arrows and WASD; joystick at
  600 px/s with a 15% dead zone; render scale 0.6 on phones, 1.0 on desktop.

## Measuring

The HUD (top left, tap to hide) shows live fps, p95 frame time, % of frames that missed a vsync, JS time
per frame, render scale, DPR, tile density and what is on screen.

The gear opens settings (peers, background mode, scale, DPR cap, reduced motion, props x2/x4, camera
tuning) and the benchmark:

- **Run all**: the same 12 s camera tour over every district for A, B and C at 20 and 60 peers (about
  90 s). Hands off, screen on.
- **Soak 10 min**: loops the tour on the current variant, one line per 30 s, to show thermal throttling
  (fps sagging over time). Battery level is recorded where the browser exposes it (Chrome on Android).

Both post their results to `results.jsonl` next to this README when served by `npm run phone`.

## Checklist for Joe

1. Low Power Mode / Battery Saver **off**, brightness mid, not charging if you want battery numbers.
2. On the iPhone and a mid-range Android: open the URL, tap the gear, **Run all**. Then pick the fastest
   variant and **Soak 10 min**; note battery % before and after and whether the phone got warm.
3. Feel test on each phone and on desktop, in whichever variant you like: drag, fling, joystick, tap the
   moose, the signpost and the church door, go into the lobby and back. Does the camera feel right? Is
   the 0.6 scale readable? Anything laggy about your own cursor?
4. Optional stress: settings, peers 120 and props x4, Run all again.
5. Tell the next `/wayfinder` session what you felt; the numbers are already in `results.jsonl`.
