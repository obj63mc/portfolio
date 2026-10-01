# 05: The angler

**What to build:** The angler on the bank, a standalone cut-out and the door's art, with a canvas-drawn line and bobber that bobs.

**Blocked by:** 01

**Status:** ready-for-human

- [x] Manifest row `angler`, kind `scenery`; layer with the door's hover
- [x] `bob` in `motion.ts`, at rest under reduced motion
- [x] Workshop inspection at both densities and the phone frame; review note; `CONTEXT.md`, `art/README.md`, `art/landmarks.md`

## Comments

### Built, 2026-10-01

- `angler`, kind `scenery`, world `{5973, 325, 40, 31}`: first placed 92 by 72, then 60 by 47, then two thirds of that (Joe: an Easter egg, not overly obvious). The door is `{5956, 296, 80, 80}`, the least a phone's finger needs.
- `Overworld.angler` in scene data; the layer, its line and its bobber in `props.ts`; `bob` in `motion.ts`, drawn to a tenth of a px, at rest under reduced motion.
- `CONTEXT.md`: Big Muddy and Cast. `art/README.md`: the angler and the game's art. `art/landmarks.md`: the angler as an invented fixture.
- Left for Joe: the workshop (`art/review.html`), and whether the hover glow reads at this size.
