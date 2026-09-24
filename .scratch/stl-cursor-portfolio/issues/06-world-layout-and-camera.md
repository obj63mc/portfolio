# How big is the overworld, where does each district sit, and how does the camera move?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

Decide the overworld dimensions in world pixels, the placement of the five districts honouring real St. Louis geography (Belleville east across the river, Maplewood west, Carondelet south, Midtown and Central West End central), what fills the space between districts, and whether there is a single zoom level. Settle the camera model precisely: edge-push thresholds and speed, drag-to-pan behaviour (dragging the scene left moves the view right), on-screen joystick placement and sensitivity on touch, and how the camera hands off when a visitor enters a venue's sub-scene. Output: a layout sketch and a camera rules list the prototypes implement.

## Answer

Resolved 2026-09-23 in a two-round grilling session.

### Overworld layout

- **Size**: 4800 x 2700 world pixels nominal. May widen to about 5400 if the park strip and the highway need the room. Never grows beyond that; the art pipeline may shave it. Cursor positions are always in world pixels.
- **Districts**, faithful to real geography, west to east: Maplewood (arrival) at the west edge, Central West End centre-west, Midtown centre-east, the Mississippi with a bridge, Belleville at the east edge. Carondelet Park sits south-centre beneath Midtown and Central West End. Each district has a footprint of roughly 1400 x 1000.
- **Between districts** is scenery only, no props and no room state: the Arch by the river, the Eads or Poplar Street bridge, Forest Park as a narrow strip with a sign between Central West End and Maplewood, Highway 40/64 as a strip of road across the screen. Distances are symbolic, not to scale; districts sit about 200 px apart.
- **District identity**: painted neighbourhood entrance signs in the artwork, like the real Maplewood and Central West End signs, each with a matching HTML heading for the accessible layer. No floating labels.
- **Zoom**: one zoom level, no pinch or wheel zoom. Render scale is fixed per session by device class: 1.0 on desktop, 0.6 on phones as the starting point, final value set by the rendering prototype.

### Camera rules (both scene types)

1. **Edge-push**: one wide band, 25 percent of viewport width and height on the overworld, 12 percent in sub-scenes. Speed eases from 0 at the inner edge of the band to about 900 world px per second at the viewport edge. Push stops when the pointer leaves the window.
2. **Push suppression**: no push while a prop is hovered or the pointer is within 40 px of one, so the camera never runs away from something about to be clicked. No authored push zones.
3. **Continuous pan**, never snapping to district framings.
4. **Hard clamp** at scene bounds, no rubber-banding.
5. **Drag-to-pan** on desktop and touch: dragging the scene left moves the view right. Drag starts after a 6 px move so prop clicks are not eaten. Inertia on touch only, about 300 ms decay.
6. **Wheel, trackpad, arrow keys and WASD** all pan.
7. **Touch joystick** bottom-right, thumb-sized, 15 percent dead zone, moves the visitor's cursor at up to about 600 world px per second. The camera follows through the same edge-push band as desktop, so there is one camera model.
8. **Touch tap** on a prop moves the cursor there and activates it. Touch drag on scenery pans the camera without moving the cursor in world space; if the cursor would leave the viewport it is carried along at the edge.
9. **Arrival**: camera centred on the arrival point at the Moosylvania sign, no intro pan. The signpost must fit inside the first phone frame at 0.6 scale, which constrains the Maplewood art.

### Sub-scene handoff

- Sub-scenes are 2845 x 1600 with the same camera rules, so desktop pans a little and phones more.
- Entering: short fade, cursor placed just inside the door, camera centred on it.
- Leaving: an exit door prop, plus the browser back button. The visitor returns to the overworld at the venue door with the camera centred on it.
- Each scene has its own URL, such as `/maplewood/moosylvania`. Room handoff itself is proven by the cursor sync prototype.

### Recorded elsewhere

- Glossary: added **Camera** and **Scenery** to `CONTEXT.md`.
- ADR: `docs/adr/0001-single-zoom-world-coordinates.md`.

2026-09-24, amended by [Pointer-locked desktop cursor and the river current](22-pointer-lock-and-river-current.md): desktop now joins through a click that locks the pointer, and pauses on Esc or blur. Rule 1: push stops while paused, rather than when the pointer leaves the window, since a locked pointer can't leave. Rule 5: drag-to-pan is touch only. Rule 6: the wheel and trackpad no longer pan. Once joined, arrow keys and WASD move the cursor like the mouse, and the camera follows through the push band; before joining they still pan the camera. The other rules stand.

2026-09-24, amended by [What does each district and prop sound like, and how is sound switched on?](19-sound-design.md): Join is a modal card on every device, so before Join the arrow keys and WASD no longer pan the camera and touch drag does nothing; every input waits for Join. Edge-push is also suppressed while the cursor is within 40 px of an on-screen control, as for props.
