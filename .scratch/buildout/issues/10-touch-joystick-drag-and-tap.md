# 10: Touch: joystick, drag-to-pan, tap-to-activate

**What to build:** A phone visitor joins with a tap, then roams one-handed with a thumb-sized joystick bottom-right (15 percent dead zone, up to about 600 world px/s, camera following through the push band), drags the scene to pan it (drag left, view moves right; a drag starts after 6 px so taps aren't eaten; inertia decays with tau 0.15 s; the cursor stays put in world space and is carried along at the edge if it would leave the viewport), and taps a prop to move the cursor there and activate it. Hover and clicks from the joystick resolve at the drawn cursor with `elementFromPoint`. Pause on a hidden tab applies to touch, and the Resume tap is where audio will later resume. The joystick counts as an on-screen control for push suppression.

**Blocked by:** 09 (Join and pause)

**Status:** resolved

- [x] On a touch-only device, one with no mouse or trackpad connected (`(any-pointer: fine)` false; Joe, 2026-09-29), the joystick is drawn after Join and moves the cursor; the camera follows. A tablet with a mouse or trackpad gets 09's model instead
- [x] Drag pans with the specified threshold and inertia and never moves the cursor in world space except to carry it at the edge
- [x] Tapping a prop moves the cursor to it and opens its card; tapping Close closes it
- [x] Render scale is 0.6 on a screen under 768 px on its shorter side (08) and the signpost is in the first frame once 04 has placed it
- [x] Chrome device emulation holds 60 fps on the overworld with a flat memory profile over a few minutes of roaming (measured with the prototype's bench, numbers recorded, not asserted)

## Comments

2026-09-29, resolved in one commit on `main`. Join on a device with no mouse or trackpad enters a sixth input state, `touch`, in `src/lib/engine/engine.ts`; a device with one locks as before, and Resume goes back to whichever the device is. The touch pieces are pure functions in `src/lib/engine/camera.ts`, tested with a fake clock in `tests/camera.test.ts` (seam 2):

- `stick()`: the joystick's travel, nothing inside the 15 percent dead zone, then easing linearly to 600 world px/s at the rim, no faster past it.
- `pan()`: a drag moves the camera against the finger, clamped. The cursor keeps its world place unless the drag would take it out of view. Then it is carried with its tip on the top or left edge, or 40 world px (its drawn height) inside the right or bottom edge, so the arrow stays in view. A cursor already past that line is carried where it is, never pulled in.
- `fling()` and `coast()`: a drag let go while moving coasts on at its speed over the last 80 ms, decaying with tau 0.15 s and stopping under 5 px/s. A finger held still before lifting flings nothing.

A touch on the scene is one discriminated union (`none`, `tap`, `drag`, `lifted`). It becomes a drag past 6 px, and the scene then catches up with the finger and stays under it. A tap on a prop, a door or a link moves the cursor to the tap point, and the tap's own click activates it. When a drag stays inside the browser's tap slop, Chrome still sends a click; that click is swallowed, which matters (an 8 px drag from the moose opened its card without it). With a card open, or paused, touch lets go: the joystick, a drag and a fling. `html.engine` sets `touch-action: none`, so the browser neither scrolls nor zooms the scene. A modal card is a scroll container, so its content still scrolls. The joystick is a prerendered, `aria-hidden` element in the layout, shown under `html.engine[data-input='touch']`. It is one of the push-suppressing controls; a control with no box, like the joystick off touch, is now skipped, where before it would have held the camera near the top-left corner. Sticky `:hover` doesn't mark controls on touch.

Tests: `npm run smoke` (seam 4) gains a 390 x 844 phone with real touches through the DevTools protocol. Before Join a drag does nothing and the joystick is hidden, and the signpost is in the first frame. It then covers:

- the Join tap placing the cursor, with no lock;
- a tap on the welcome sign opening its card with the cursor there, and a tap on Close;
- a joystick tap off-centre clicking under the cursor;
- a 4 px wander still tapping, and an 8 px drag from a prop opening nothing;
- a drag panning exactly and leaving the cursor's world place, and no fling after a still finger;
- the carry at the right edge;
- a fling coasting;
- the joystick steering at 360 CSS px/s with the camera following and stopping on release;
- a hidden tab pausing, and Resume returning to touch.

The desktop smoke checks the joystick stays hidden with a mouse.

Performance (seam: measured, not asserted). The prototype's bench hooks prototype-only internals (`runTour`, the panel), so it is rewritten as `npm run bench [minutes]` (`scripts/bench.ts`). It drives the built overworld as a 390 x 844, DPR 3 phone under Chrome's device emulation with real touches: the joystick, drags and flings, lapping the districts. Every 30 s it prints fps, p95 frame time, the share of frames over 25 ms, JS heap, and the resident memory of the renderer and GPU processes, where the tiles' bitmaps live. Three-minute runs on an M2 Max Mac (64 GB), Chrome 153 (the camera ranged x 0 to 6100, the whole width, and y 0 to 1154):

| Run | fps | p95 frame | over 25 ms | JS heap | Resident (renderer + GPU) |
| --- | --- | --- | --- | --- | --- |
| Headless | 60 every window | 16.7 to 16.8 ms | 0 | 3.4 to 4.2 MB | 273 to 288 MB |
| Headed (GPU) | 60 every window | 17.3 to 17.5 ms | 0 to 0.1 % | 3.5 to 4.2 MB | 680 to 688 MB |
| Headed, after the review fixes | 60 every window | 17.4 to 17.7 ms | 0 | 3.8 to 4.3 MB | 671 to 679 MB |

Memory is flat: no growth over the run, so ring eviction holds. `elementFromPoint` now runs every frame on touch as well as under the lock (09's "left for later") and doesn't show.

Calls made here for Joe to confirm or veto:

- **A joystick click is a tap on the stick** that never leaves the dead zone; it clicks the link or button under the drawn cursor. The spec names joystick clicks without a gesture.
- **The joystick's pull is measured from where the thumb lands**, not from the stick's centre, so a tap anywhere on it clicks rather than steering for the length of the tap. The knob shows that pull from the centre, held to the rim.
- **Tap-to-activate moves the cursor to the tap point**, not the prop's centre, and covers doors and signpost links as well as props.
- **On touch the camera follows only a steered cursor** (the joystick or keys). A cursor left in the band after a drag carried it there doesn't push the view back.
- **The joystick can't reach a card**: a modal card makes it inert, so on touch a card's Close and links take taps directly, and the cursor marks nothing in a card. The spec's "clicks resolve at the drawn cursor ... for the locked pointer and the joystick ... including a card's Close" holds for the lock only. The joystick could join the top layer like the cursor canvas if Joe wants it over cards.
- **A drag catches up with the finger** at the 6 px threshold: a small jump, then the scene stays under the finger, rather than trailing it by 6 px for the whole drag.

Left for later:

- The joystick is plainly styled until the art direction reaches it.
- iOS long-press callouts and text selection on the transparent layer aren't suppressed; the properties for that aren't Baseline.

2026-09-29, on a real phone. Joe connected a Pixel 11 Pro over USB, so `npm run bench` gained a device mode: `CDP=http://localhost:<port>` attaches to Chrome on the phone through `adb forward` and serves the build to it through `adb reverse`. It opens its own tab, joins by touch, reads the viewport and render scale from the page, and reads resident memory through adb. The script's header has the commands. A ten-minute soak with the same lap (Chrome 154, a 411 x 748 viewport at DPR 2.625, the display at 60 Hz, on the charger):

| Minutes | fps | p95 frame | over 25 ms | JS heap | Resident (renderer + GPU) |
| --- | --- | --- | --- | --- | --- |
| 0.5 to 10, 20 windows | 60 every window | 16.7 to 16.8 ms | 0, one window 0.1 % | 3.3 to 4.2 MB | 402 to 451 MB, drifting down |

The camera covered the full width (x 0 to 6065, the edge for this viewport) and y 0 to 1303. The battery went from 24.7 to 27.7 °C, and the thermal status stayed 0 (none) throughout. On the same phone:

- Join entered the touch model, since `(any-pointer: fine)` is false.
- The render scale was 0.6.
- A card padded past the screen's height scrolled under a finger: scrollTop 584 after two swipes, with `touch-action: none` on the page. This bears out the modal card as its own scroll container. Today's cards are all short enough not to scroll, but ticket 15's full texts may not be.

The touches are injected through the DevTools protocol, so the display doesn't boost to 120 Hz as a real finger may, and the charger hides battery drain. Still untested: an iPhone, which this can't drive, and real fingers on the joystick's feel.
