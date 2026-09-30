# Overworld: the rider's travel on the park's lower straight

**Superseded** by [the rider round the whole loop](2026-09-29-overworld-track.md) (buildout ticket 18). **Verdict:** the rider rides the cream path of the lake loop's lower straight, x 2440 to 2780 (rect x 2550 ± 110 in `art/manifest.json`'s `sceneLayouts`), clear of the painted tree west of the straight and the foreground park tree at x 2784. `npm run art:validate` passes. Workshop acceptance in `art/review.html` is Joe's.

Buildout ticket 15 put the rider on the scene canvas, riding out and back on server time (`RIDER` in `src/lib/engine/motion.ts`, held to the manifest by `tests/props.test.ts`).

- **Why it moved.** At the old layout, x 2400 ± 150, the rider's west end (x 2250) rode through the trunk of the painted tree west of the straight, where the path runs behind the tree.
- **Read.** On the rebuilt overworld composite, cropped to world x 2300 to 2920 and y 2380 to 2680, the rider sits on the path at x 2550 with its wheels on the cream surface. Both ends of its travel stay on the visible straight: the west end is past the left tree's canopy, and the east end is short of the park tree's crown.
- **Unchanged.** The rider's rig and its parts. The rebuilt outputs are `review.json`, the overworld composite and the contact sheet.

## Hashes (SHA-256)

- `art/manifest.json`: `4e44a1ff5caf2f43cdfb54a21e027aef184965a487a03842c72e5b5c78088455`
- `art/generated/review.json`: `28ef3a8dbffd8da2ca9cba603d92930744aef11217cffbcb6a33a31ee3fff910`
- `art/generated/overworld/composite.webp`: `28124fddf1ade2321f2c7d97e9156c0af5a88da2a6d6e3001cc9b5607e22b532`
- `art/generated/contact-sheet.webp`: `7a4995370359a8751efa5c4ac0bd569117a338f539e8eafc2819caf224a9ec63`
- `art/generated/overworld/rider-rig.json`: `985f6968d58e4046771b4b15554a048543014b914a9b744d7ce1d630e92847ab`
- `art/generated/overworld/rider-body/image.webp`: `3cbbf50cb026b7ef0520492dadb572efc11d1cf9bd911cee5fd73fbaecba3c32`
- `art/generated/overworld/rider-front-wheel/image.webp`: `cc0e685017c5d3caa8c02a5fb0eea15739fa5f1dd20cb33ec92a41ad8d59cacd`
- `art/generated/overworld/rider-rear-wheel/image.webp`: `12c4b992ab0409e81bfd5be3b4b1567d9fbc5fae480a726b03259e169884bbcb`
