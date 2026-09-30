# Overworld: the rider round the whole lake loop, and what the loop runs behind

**Verdict:** the rider rides the whole Carondelet lake loop, and passes behind the park sign and the three trees that stand over the path, which are measured mattes of the master drawn over it there. `npm run art:validate` passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-09-29, buildout ticket 18) asked for the cyclist to go round the whole track, with a start/finish section, instead of riding out and back on the lower straight (`2026-09-29-overworld-rider.md`, superseded).

- **The loop.** The track is the cream path round the lake, read by eye on gridded crops of the plate every 100 world px or so and each point then centred across the path by colour: 47 points, anticlockwise on screen from the start line, about 5,270 world px round (26 s for the rider). It is `OVERWORLD.track` in `src/lib/scenes/overworld.ts`, which the rider (`src/lib/engine/motion.ts`) and the lap timer (`src/lib/engine/track.ts`) both follow. Behind the park sign and the three trees the path is interpolated from either side.
- **The rider's layout.** It rides the loop at 200 world px/s on server time, facing the way it rides. `sceneLayouts` now places it where it rests under reduced motion, 100 world px past the start line (x 2639, y 2470, 120 × 85), with `travelX` 0: the workshop draws it there, still, and the loop is reviewed on the site. Its wheels meet the path 12 px below the centreline, on the near half, as they did on the straight.
- **What it passes behind.** Drawn over the tiles, the rider would ride over the painted scenery that stands in front of the path. Four cut-outs of the master's own pixels cover it there, ordered against it by base y each frame: `park-tree`, the existing foreground tree, and three new `scenery` mattes, `park-sign` (the Carondelet Park sign with its bushes and rocks, each column traced by colour from the top and the bottom), `track-tree-west` and `track-tree-east` (radial polygons traced by colour round canopy and trunk, as the two foreground trees were). Each was checked on a checkerboard, clean edges and no holes, and over the plate, where it lands on identical pixels. The boathouse, the benches and the trees north of the path stand behind the rider or clear of it and need nothing.
- **Foreground.** The park tree is foreground scenery and covers the rider's travel, as it will cover a cursor behind it (ticket 19). The rider is ambient scenery with no hit target, not an interactive prop, so CLAUDE.md's rule (foreground never covers an interactive prop, including a moving rig's travel) still holds; the validator checks the rider at rest, clear of the tree.
- **The start/finish line.** A chequered band, three checks along the path and four across it, ivory and dark teal from the style contract, drawn by the engine on the ground across the path at the loop's first point (x 2599, y 2534), its sides upright as a north-south line across an east-west path looks from this camera. It is a flat marking, like the poster lights and the bottle glint, not an illustration; the `track` prop's hit target is its 50 × 60 box.
- **Read.** On the site at 3000 × 900 and on a 390 × 844 phone at 0.6, with the clock fixed at ten points of the lap: past the start line, behind the west tree (hidden), behind the sign (its body above the board, its wheels behind it), behind the park tree (hidden), behind the east tree (its head above the crown), in front of the trees on the north side, round both ends, mirrored heading west. Nothing floats and the wheels stay on the path.

## Hashes (SHA-256)

- `art/manifest.json`: `eec5b991b3b79c62e28b9e4eafafe9dbbcced40e4fc7f3bc12cf9b698916f348`
- `art/generated/review.json`: `c0e8883705766a06828b042f7531a6e3ccc815d972e3719e19a668a1bc23c78e`
- `art/generated/overworld/composite.webp`: `db3c7c57548e04ed028726a610fc4332a37d6c1f71e91ebaa4f9ca15f0246127`
- `art/generated/contact-sheet.webp`: `c70fa2fed5c236f1d7d0e636b66fd6458d9514c7639b5d331453eb4cfb49877f`
- `art/generated/overworld/park-sign/image.webp`: `a1eedb2ca1cbf63c35c2d3f132aac7d2957d665b16f533dc82baff85f28f998d`
- `art/generated/overworld/track-tree-west/image.webp`: `48bb954a2cd9325fcc72c5cdc4f5a7de4d11378d4b67d593ecba6332cf2022b4`
- `art/generated/overworld/track-tree-east/image.webp`: `90f82766129d76f61e81e368a75fedf525ecc5b25320e092fde3f5ab9c694a7c`
- `art/generated/overworld/park-tree/image.webp`: `faf71d3be0759cf60bf3a2c8c2e183479a027b6eb12cac88d2289a071c39fde3`
- `art/generated/overworld/rider-rig.json`: `985f6968d58e4046771b4b15554a048543014b914a9b744d7ce1d630e92847ab`
- `art/generated/overworld/overworld-master/image.webp`: `e337c4608624d0cfcbc9f28195d4af6b615f9e56b3c19b61cf14e1442bae3593`
