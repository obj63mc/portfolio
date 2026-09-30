# Overworld round nineteen: three buildings whole, the Forest Park sign and picnic tables as decals

**Verdict:** the office north of the Arch and the Illinois riverside warehouse stand whole with the lawn at their feet, the Maplewood storefront row reads crisp with one awning per shop and no ghosts, and the FOREST PARK sign and the three picnic tables north-west of it are sharp at every zoom. Every automated check passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-09-30), from screenshots: the building north of the Arch is cut into by the ground; the building across the river is cut into by the ground; the Maplewood storefronts have ghosting of their awnings between the buildings and need sharpening; the Forest Park sign and the Forest Park picnic tables need cleaning up.

- **The round.** `sources/overworld-fix/rounds/round-19.json`, three Codex tiles, three attempts each. The stitch aligned every kept output (drift at most 8.0) and changed no pixel outside the masks; `tiles.py check` found no dead-end road.
  - `landing` (256 px at native 1140, 60): the small cream office at native x 1245 to 1287, y 163 to 207, whose east half the lawn swallowed. Attempt b is kept: the building whole with blue windows on both walls and a clean east corner, its three small trees in front, the diagonal footpath east of it untouched. Attempt a left a yellow smear on the east corner; c was close to b.
  - `warehouse` (256 px at native 1590, 170): the warehouse's east end, native x 1714 to 1751, y 279 to 319, where the lawn faded over the gable wall and the front wall's right part. Attempt a is kept: the front wall runs on in cream to a clean corner, the gable wall is whole with its dark door, and the lawn strip begins at the building's foot. Attempt c left a green blotch on the wall.
  - `storefronts` (320 × 128 at native 185, 212, Codex's 2.5:1 canvas): the whole row, the church at its east end protected. Attempt c is kept: the same roof line, parapets and arched windows, one clean awning over each shop door (red, red, red, green, green, yellow, terracotta, green, blue, blue), the street trees and shrubs whole on the sidewalk, and no faded awnings between the shops. Attempts a and b were also clean; c's awnings were the most regular.
- **Deterministic touches.** Three flat `paints` of the lawn's own colour (192, 208, 56, and 190, 207, 57 on the lowest) cover the old picnic tables, native x 240 to 294, y 176 to 197; the decal draws the tables back.
- **Decals.** At 9 to 13 native px the sign's lettering and the tables come out of the 4× upscale wobbly, so both are vector decals in `decals.json`, each drawn in native px (its viewBox is the master's own coordinates) and composited onto the upscale at full resolution. `forest-park-sign.svg` is the board's face between its posts, inset about 1 px from its dark rims, with FOREST PARK in Barlow Condensed 700 (the site's headline face, SIL OFL) as outlines, skewed with the board's slope (−0.036); the posts, rims and bushes stay the plate's own. `picnic-tables.svg` holds three tables in the map's bench colours (orange-brown planks, a dark brown rim, a soft shadow on the lawn), each modelled as a top and two benches on A-frame legs, turned 9° to 16° with the streets and projected to the map's camera. ImageMagick's own SVG renderer, which the install uses, ignores strokes and nested transforms, so both files are filled shapes with baked coordinates and each rim is a darker, mitred, slightly larger polygon behind its plank.
- **Install.** `install-master.sh nineteen` upscaled the master 4×, composited the three decals, re-derived the plate, its tiles at both densities and the master-derived mattes, and synced no geometry change. It listed `mc-eye` STALE: its registration crop (native x 1734 to 1922, y 258 to 446) reaches the warehouse's east end, but the eye's own pixels, on the MonsterCommerce O, are unchanged, and it is drawn from `sources/mc-eye.png` at its world rect, so it is not regenerated.
- **Read.** At 4× on the installed master: the office is a whole box with its trees in front; the warehouse's east end is a clean corner on the paving; the storefront row is sharp from end to end and meets the church as before; the sign's lettering is crisp and level with its board; the tables stand on the lawn with their shadows, no trace of the old blobs.

## Hashes (SHA-256)

- `art/manifest.json`: `a9fbbaf558c1cc6ed3308bf9e9afe193a78394c1cf829357e3601eb2426f9bbb`
- `art/generated/review.json`: `297b6255d17e1aa9442cf7ad7e079bb978fbf268f41656623dce97d99c6bb9d9`
- `art/generated/overworld/composite.webp`: `f5edb20e289ca80f0f2c3f3c80d56b03329017e677589d014b53c9258252c922`
- `art/generated/contact-sheet.webp`: `f580d4743cd6ff67000ce50d47345d4734b8a0f4985ae1090cbea48873e11314`
- `art/generated/overworld/overworld-master/image.webp`: `f663e38a30426057fa205f9329b546cb103573490b3b356c34669d7cba920a5b`
- `art/sources/overworld-fix/stitched.png`: `bee9381822c522e4d0bd0ffc2bbd1b01cc67f6e87600c713f72a51f40473570c`
- `art/sources/overworld-fix/rounds/round-19.json`: `242c80335912abafec55708b001b423999f33007a00b9715dfd39beef203a79f`
- `art/sources/overworld-fix/decals.json`: `9bf5d63deae47c59c58af870bed902315914871c837a07430b198389ddd51ef1`
- `art/sources/overworld-fix/forest-park-sign.svg`: `48049de136faf0721b9c50cefccae142c69a4cfec7ecffdd43e82299ad098091`
- `art/sources/overworld-fix/picnic-tables.svg`: `a8310a2dc6075e487b15066f5e8661a13367f9bb62900d57e3f48714cfc9d4c2`
- `art/sources/overworld-fix/tiles/t-landing-model.png`: `791f668f3ab62d9c43ae1d44cafdb3e8c3070a15e23b4ecc288a06a8ac870a14`
- `art/sources/overworld-fix/tiles/t-warehouse-model.png`: `aa890d1db5f161deb61693f1a7f40fda9ad390f89434158a751a67d42347291b`
- `art/sources/overworld-fix/tiles/t-storefronts-model.png`: `4d85a6ceca73bc71e89f99b0c29fd0b43a87bae5314f8c70acce2e1983f341d4`
