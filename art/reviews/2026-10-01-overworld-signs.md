# Overworld: the welcome board carries the badge, and a directory board replaces the fingerpost

**Verdict:** both Maplewood signs are redrawn by construction and placed; the master, the plate and every other cut-out are untouched. `npm run art:check`, `npm run art:test` and `npm run art:validate` pass (111 assets). Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-10-01): the welcome sign should carry the site's logo, its background changed if need be; the signpost should be much larger, each link at least 48 × 48 px, and link to the districts alone, the resume and the contacts moving into the welcome sign's copy.

- **Drawn by construction, not by a model.** `scripts/art/overworld/signs.py` draws both as flat filled shapes in the style contract's palette and the old signs' own teal and brown, face on as the fingerpost was, lit from the upper left, at 8 image px a world px, halved to the 4 px a world px sources `art/sources/welcome.png` and `art/sources/signpost.png`. `process` re-places them; nothing is generated.
- **Welcome board.** 160 × 114 world px (was 120 × 77), its left post where the old one stood, right of the church steps: the old teal frame and brown posts, an ivory face in place of the mustard, under a round crown, with the site's badge (`art/sources/brand/icon.png` cut to a circle, 76 world px across) in the middle. The mustard face fought the badge's sky and gold; ivory is the ground the badge was designed on.
- **Directory board.** 270 × 336 world px (the fingerpost was 60 × 120), on the lawn left of the church steps: a dark teal board on two brown posts, EXPLORE ST. LOUIS across its head, and six plaques in ivory, gold and sky, three rows of two, lettered with the districts west to east in Barlow Condensed Bold, one size for all six. Each plaque is 123 × 80 world px; each link is its plaque and half the gap round it, 127 × 85 world px, 76 × 51 CSS px on a phone at 0.6 and 127 × 85 at desktop scale. The links' box is `OVERWORLD.signpost.rect`; `tests/overworld-geometry.test.ts` holds it to the board and to the 48 px floor.
- **What it covers.** The board stands in front of the lawn's two trees: the right one is behind it entirely, the left one shows to its left with its trunk's foot under the board. It stops short of the church's left wall and the steps. Nowhere else in the first phone frame takes a board this size without covering the church's entrance, the moose or a house.
- **Arrival.** The first frame was centred on the welcome sign, which left a board this far west half out of a phone's view; it is now centred on the welcome sign and the signpost together (`arrival` in `src/lib/scenes/index.ts`), and the same test asserts both, and the moose, fit the 390 × 844 frame at 0.6.
- **Read.** On the built site in Chrome at 1440 × 900 and at 390 × 844 (0.6): both signs sit on the lawn at the church's scale of detail, the lettering is legible at both, the badge reads on the phone, and the six links measure 127 × 85 and 76 × 51 CSS px. Delivery sizes: signpost 338 × 420 and 540 × 672, welcome 200 × 143 and 320 × 228.
- **Not checked here.** Safari and a real phone; hover and click reactions beyond the pointing hand over a link.

## Hashes (SHA-256)

- `art/manifest.json`: `a09b2eedf6ae179ee180eca92746583af30346336d478610d4374f17d0d50dc1`
- `art/generated/review.json`: `013b0757003f09abc3a9444455bcdd252aa646c19b9ac98649b430001f4d2c35`
- `art/generated/overworld/composite.webp`: `4a432e7e60de7baf2f8540b9b07c7b727d3eca004e89d2b926ddb6b78222efbd`
- `art/generated/contact-sheet.webp`: `d504301b91f34c8846d5c63efafdcda78301d7d75900ebb55ede66bf4c33e20b`
- `art/generated/overworld/welcome/asset.json`: `64d0e7f52e196c644c74609b2217a703b2b762188a13763dd86b33eab3737919`
- `art/generated/overworld/welcome/image.webp`: `1bd77b0d50f541369611c9b80273f9238493d0a8fdca391791dcf82fcd595c35`
- `art/generated/overworld/signpost/asset.json`: `d7275afd5ca13789ca97811f8eaa61e5b5c26aa16b2bf766b502a7f0c1e46a92`
- `art/generated/overworld/signpost/image.webp`: `088d5d140a4d3f907af533d2e509777552cb6e391dc37c035117e089b162311d`
- `art/sources/welcome.png`: `2d471bc7bb689225109f81f8499f425d2f14385669456d6b4cdc4d2b66c7db63`
- `art/sources/signpost.png`: `6b491f14a44d43396474e3bad0520f91094cbcf9f309c42ba005663e3de99365`
- `scripts/art/overworld/signs.py`: `a48456c9e248d243a55a2d9fcdf033356ff126c25fd57d601f246c080532f837`
- `art/sources/overworld-fix/stitched.png` (unchanged): `bee9381822c522e4d0bd0ffc2bbd1b01cc67f6e87600c713f72a51f40473570c`
