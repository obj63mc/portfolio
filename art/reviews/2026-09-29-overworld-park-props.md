# Overworld: Joe's bike and the ride sign by the gazebo, the START FINISH sign as scenery

**Verdict:** Joe's bike and the ride sign (the park notice board) stand on the lawn west of the gazebo north of the Carondelet lake, clear of the lake loop, and the START FINISH sign is scenery that nothing clicks. `npm run art:validate` passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-09-29, buildout ticket 18): on a phone, steering round the loop with the joystick runs into the clickable things beside it; the lap timer is an Easter egg, so the line needs no click, and the bike and the sign should stand round the gazebo north of the lake.

- **Placement.** Both are standalone cut-outs placed by `world` rects, re-placed with `process <id> --force` (not regenerated). The open lawn west of the gazebo, between the brick house, the firehouse's sidewalk and the loop path, holds them: the board at its back edge (x 1992, y 1806, 78 × 94, its posts on the lawn and its roof against the sidewalk and the firehouse lot behind it) and the bike parked in front of it (x 2012, y 1884, 100 × 57), its wheels on the grass above the path's north edge. The gazebo's own plaza and the lawn east of it are crowded with bushes and trees, and round eighteen repaints the trees east of the gazebo.
- **The sign.** `start-sign` is now `kind: scenery` in the manifest, drawn at the line as before but with no hit target.
- **Read.** On the rebuilt composite: the bike stands in front of the board's posts, both on the lawn, the path below untouched; nothing floats.

## Hashes (SHA-256)

- `art/manifest.json`: `73d2af8c6fd484b31c4668b5a471c9b8b1c5751539642a737e8fc7b5a2d6a706`
- `art/generated/review.json`: `bd6de0ba70bfcbce2d32a16d561822013acb76df7f6c3ac436115f5cece0cbc7`
- `art/generated/overworld/composite.webp`: `161f4fb2f7ec065ee46d2d35ac32b08cb2bfb2a30353ff8938556f2399f86114`
- `art/generated/contact-sheet.webp`: `8f7bfa4d9e65215a3495d790ef89110592062a8eb920cbd73f5a26f8f22b375a`
- `art/generated/overworld/bike/asset.json`: `972d08e2d2948d0e114bb7b42078637a6d66934e681d42ccfda91a790799e95e`
- `art/generated/overworld/ride-sign/asset.json`: `ba47e51cc3f99f8679829040a5be8a3e1bae02a1bd88d85fe28f49d2cc933f93`
- `art/generated/overworld/start-sign/asset.json`: `2f204a0dd50569db91ebac713bebafdee9c08bb589f7838fc4fd956c9574029b`
