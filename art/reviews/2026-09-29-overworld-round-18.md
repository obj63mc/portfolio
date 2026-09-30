# Overworld round eighteen: the house east of the Carondelet gazebo, whole

**Verdict:** the small pink house north of the Carondelet lake, east of the gazebo, reads whole again, with the two trees that hid it standing beside it on the lawn. Every automated check passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-09-29): "To the right of the gazebo there is a house where a tree is cutting off the view of the building incorrectly that needs fixed." A big tree's crown (trunk at about world x 2680, y 1995) covered the house's right half and a small tree clipped its porch at the left.

- **The round.** `sources/overworld-fix/rounds/round-18.json`: one 256 px tile (`house`, native 654, 430) with a polygon round the house and both crowns (native x 721 to 843, y 522 to 593), stopping above the lake loop's path and taking in only the sidewalk and road edge the old crown covered. Codex drew three attempts from the tile and its marked copy. All three drew the house whole and moved the tree east. The stitch aligned each (drift 5.2, 7.7 and 5.1) and changed no pixel outside the mask. Attempt c is kept (`tiles/t-house-model.png`): its house matches the visible left half's scale, roof peak at the same height, with a full hip roof, two rows of windows and a cream porch across the front; the big tree stands on the lawn east of it with a gap, its trunk just above the path; the small tree stands west of the porch, clear of it; the road and sidewalk run unbroken where the crown was. Attempt a's house came out larger than the original, and b's longer, with its tree further east.
- **Deterministic touches.** The old trunk's foot lay just outside the mask, on the lawn's last row above the path (native 782 to 793, 585 to 588): a `lawnfill` rectangle relaid its tree-like pixels, and two flat `paints` (173, 201, 57 over rows 585 to 586; 160, 192, 51 on row 587, the darker rim above the path) took its shadow, matching the lawn either side. The path itself is untouched.
- **Install.** `install-master.sh eighteen` upscaled the master 4x, re-derived the plate, its tiles at both densities and the master-derived mattes, synced no geometry change and validated; no Codex extraction went stale. The lake loop, the rider's route, the gazebo and its bushes, the road above and the red-brick blocks beyond are as they were.
- **Read.** At 8x on the native master, on the rebuilt composite and on the site at 1920 × 1080: the house is whole and symmetrical, both trees stand on the lawn beside it, and nothing floats or is cut.

## Hashes (SHA-256)

- `art/manifest.json`: `7cf16557dc21133d3e8e75f33ed1ca67c185213ae0b41d89647fc50995cca9c0`
- `art/generated/review.json`: `c74baa8d7bb8d47c2b3b9f2d7503bedb0215e9388f88e14b1381ef6672d051ec`
- `art/generated/overworld/composite.webp`: `ef701923d8c51a86bd6625c1617784ba076ab9bea3682194ebc08eeeacca172a`
- `art/generated/contact-sheet.webp`: `b9e2c803095762d603d359dbe30b498c015f8366c2a7da90b339e0936a8e7f91`
- `art/generated/overworld/overworld-master/image.webp`: `d60a9f9bfe771c802cf03570d2a55c57c87e1685c1d24c854ef1aba39b139f9d`
- `art/sources/overworld-fix/stitched.png`: `37fa2f4188095bc54b09959558c22aa11b30ce4e7bba04f90eef627becc831c3`
- `art/sources/overworld-fix/rounds/round-18.json`: `2017459a77e21a321d10b770af1e061e064ba3012678464a9615d8c9a303a8d7`
- `art/sources/overworld-fix/tiles/t-house-model.png`: `a6a991571f6d59f828c135ac8a48d190182b27354d937ffad1417fe266e9ce9c`
