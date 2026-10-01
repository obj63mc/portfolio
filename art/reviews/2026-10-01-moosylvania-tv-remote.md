# Moosylvania lobby: the TV's remote on the meeting table

**Verdict:** the remote lies on the meeting table's top, left of the plant, as a standalone cut-out the site can take off the table; the master, the plate and the lobby's other twenty-four cut-outs are untouched. `npm run art:check`, `npm run art:test` and `npm run art:validate` pass (111 assets). Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-10-01): the meeting TV is a television that plays by itself, and a TV remote on the table changes its channel. One visitor of the room holds the remote at a time, and while they do it is gone from the table for everyone.

- **Why not in the plate.** Every other lobby prop is a measured matte of the master, painted into the plate. The remote has to leave the table, so it is a standalone cut-out placed by its `world` rect (x 1000, y 4262, 100.4 × 58.3), like the overworld's bike, and re-placed with `npm run art -- process moosylvania-tv-remote --force`.
- **Drawn by construction, not by a model.** `art/sources/moosylvania-tv-remote.svg` is flat filled polygons with baked coordinates: a rounded slab 112 × 36 × 9 world px, turned 52° from the table's front edge and foreshortened to 0.42 of its depth, as the tabletop itself is drawn, with its thickness straight down and its shadow falling right and forward, the light being upper left. The cream is the plant pot's lit and shaded cream, the shadow the pot's shadow on the slate, the power button the style contract's coral and the keys its dark teal and turquoise. The SVG's header gives the ImageMagick command that rendered `art/sources/moosylvania-tv-remote.png`, which `process` reads.
- **Scale.** At the room's true scale a remote would be about 55 world px long and too small to press. It is drawn about twice that, roughly the plant pot's size: 100 × 58 world px, 60 × 35 CSS px on the phone frame at 0.6. Smaller on its short side than the 44 px the plan aimed at; a larger one read as out of scale beside the pot. Joe's to judge.
- **Read.** On a checkerboard at both delivery sizes (126 × 73 at 1.25, 201 × 117 at 2, both lossless): clean edges, no fringe, no holes. On the rebuilt composite and on the built site in Chrome at 1280 × 1100 and at 390 × 844: it lies flat on the slate in the table's perspective, its shadow on the tabletop, clear of the plant and its shadow; with the remote taken, the table under it is the plate's bare slate.
- **In the scene.** The meeting table is no longer walk-behind scenery (Joe, 2026-10-01: it was too easy to go underneath it), so the table stays in the plate with every cursor over it and the remote is in reach from every side. Its cut-out, `moosylvania-meeting-table`, is retained in the manifest and the workshop but the site no longer draws it. Hover glows round the remote and a click pops it, as any prop.
- **Not checked here.** Safari, and a real phone.

## Hashes (SHA-256)

- `art/manifest.json`: `4fda66d8602eec1e02a9b86e415b0c49ae4830c363737d73762e5389b73bbebf`
- `art/generated/review.json`: `8181813acde1d130f05c212eaa6e04fb69a50fe62b95044be45120ebc6c4ad96`
- `art/generated/moosylvania/composite.webp`: `5db9934e1de9e34836f4ffafd192d7debbdf79df3b664fcc6887dc9834677d1b`
- `art/generated/contact-sheet.webp`: `ceb65e88b7ac1dd523f6eccb98c98c284e84ff84d0cbc5fbe863650b10dbadef`
- `art/generated/moosylvania/moosylvania-tv-remote/asset.json`: `09c5abfb64619e2d510dde5ee750d8b8658a4d167e75ef335fae9ada244568fb`
- `art/generated/moosylvania/moosylvania-tv-remote/image.webp`: `4829894a9cd66f9b1875fff20223d337b001977b41b6cbde0f28d0c7811093ad`
- `art/sources/moosylvania-tv-remote.svg`: `7959923a74fc492d9908893da118477e4b4a6e2fa3d786f53ba9d7ff04ec5e13`
- `art/sources/moosylvania-tv-remote.png`: `8fa14841e0296787165912057e9664d7444f15b7bc2566ab2adf54112f81a5e3`
- `art/sources/moosylvania-fix/stitched.png` (unchanged): `f95d7f9138064cae2b5df6984861779d86cea8c258f53c2ef88962ecad3c348f`
