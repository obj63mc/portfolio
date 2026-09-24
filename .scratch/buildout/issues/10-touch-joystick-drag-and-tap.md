# 10: Touch: joystick, drag-to-pan, tap-to-activate

**What to build:** A phone visitor joins with a tap, then roams one-handed with a thumb-sized joystick bottom-right (15 percent dead zone, up to about 600 world px/s, camera following through the push band), drags the scene to pan it (drag left, view moves right; a drag starts after 6 px so taps aren't eaten; inertia decays with tau 0.15 s; the cursor stays put in world space and is carried along at the edge if it would leave the viewport), and taps a prop to move the cursor there and activate it. Hover and clicks from the joystick resolve at the drawn cursor with `elementFromPoint`. Pause on a hidden tab applies to touch, and the Resume tap is where audio will later resume. The joystick counts as an on-screen control for push suppression.

**Blocked by:** 09 (Join and pause)

**Status:** ready-for-agent

- [ ] On a coarse pointer the joystick is drawn after Join and moves the cursor; the camera follows
- [ ] Drag pans with the specified threshold and inertia and never moves the cursor in world space except to carry it at the edge
- [ ] Tapping a prop moves the cursor to it and opens its card; tapping Close closes it
- [ ] Render scale is 0.6 on phones and the signpost is in the first frame once 04 has placed it
- [ ] Chrome device emulation holds 60 fps on the overworld with a flat memory profile over a few minutes of roaming (measured with the prototype's bench, numbers recorded, not asserted)
