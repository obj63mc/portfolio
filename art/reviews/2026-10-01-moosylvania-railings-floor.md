# Moosylvania lobby, round five: the railings, the stair treads and the office floors

**Verdict:** the loft railing, both staircases' railings and the floor of the two offices beneath the loft are clean on the installed master, the plate's tiles at both densities and the rebuilt composite. Nothing moved: the twenty-four master-derived cut-outs keep their alpha pixel for pixel, with their sizes, trims and world rects, so `src/lib/scenes/moosylvania.ts` needs no change. `npm run art:check`, `npm run art:test` (5 of 5) and `npm run art:validate` (111 assets) pass. Workshop acceptance in `art/review.html` and a look on the running site are Joe's; the site was not built or run here.

Joe (2026-10-01), from four screenshots of the running site:
- the loft railing's mesh is a wobbly grid with smudged cells, broken lines and blobs, and its top rail cracked
- the staircases' railing infill is a crackle of veins in the far railing and a chain of broken orange blobs in the near one, with ragged tread edges and a stepped seam on the lower treads
- the floor where the two desks stand beneath the loft is smeared: ghosted plank bands at inconsistent angles, soft rectangular patches of another tone, soft blobs.

## Where each defect came from

- **Loft railing: the upscale, from a master too fine for it.** The native master draws the mesh as a 5 px grid of one-pixel lines with five posts at uneven spacing (bays of 39, 57, 65, 66, 58 and 41 px). It reads as a rough grid at native size; Real-ESRGAN turns it into the wobble, the smudges and the dots.
- **Stair railings: the same.** The native infill is a diagonal hatch of one-pixel lines. The upscale invents veins from it where it stands against the wall and orange blobs where treads show between the lines.
- **Stair treads: the native master.** Each tread's back edge carries a pale sliver a row or two tall along part of its length, no two the same, and the edge wanders a pixel up and down. The upscale sharpens both into ragged, stepped edges.
- **Office floors: the native master.** The smear is in the master itself: plank bands at three different angles, a pale diagonal band running from the left office into the hall, soft blobs under the chairs. The upscale only sharpens it.

## What was done

No model drew anything. `scripts/art/overworld/lobby-railings-floor.py` relays all three by construction and writes the round's five tiles (`rounds/round-5.json`); `tiles.py stitch` pasted them with 0 px changed outside their masks (66,681 native px changed inside); `SCENE=moosylvania install-master.sh 5` upscaled and installed the master and re-derived the plate (4800 × 9600, 100 tiles) and the mattes. The script's output is the installed `stitched.png` byte for byte in its pixels, so the round can be rerun.

- **Loft railing.** On the native master the old posts and mesh are painted out with the loft floor's flat tone. The infill is a decal, `loft-railing.svg`, composited onto the 4× upscale: a straight sub-rail and bottom rail, five posts making six even bays, eleven balusters to a bay, in the rails' navy (`#0b1c30`). The end posts, the top rail and the slab are the master's own. The five intermediate posts moved, by up to 16 native px, to even spacing, as Joe asked; nothing in the scene data refers to them.
- **Stair railings.** Each stair has four runs of infill (the outer railing against the wall, the inner one in front of the treads, and both lower runs) and a short bay at its top. Each run's opening was measured on the 4× upscale between the handrail's underside and the stringer's top. On the native master the old infill is painted out with what stands behind it: the cream wall and the oak wainscot, the treads and risers carried on along their own slope, or the hall floor's planks. The new infill is two decals, `stairs-left-railings.svg` and `stairs-right-railings.svg`: two sub-rails following the handrail and the stringer, and vertical balusters at the loft railing's pitch, closer where a run climbs steeply. Handrails, stringers and newel posts keep their pixels.
- **Stair treads.** From the fourth tread down, each back edge is fitted with one straight line (least squares over the whole edge) and redrawn on it: the riser's navy above, the tread's two shaded rows below. Three specks the colour tests could not tell from a handrail's edge are set by hand in the script.
- **Office floors.** The floor of each office and in front of it is relaid as planks. Every seam of the good floor below was read off the master at the row where the relaid floor ends and carried up its own line to the planks' vanishing point (x 438, y −100 native, fitted to seams tracked beside both stairs), so the boards run on unbroken. Each board is one flat tone, the offices' own shaded honey varied a few per cent from board to board as the hall's are, easing over its last 16 rows into the colour the same board has below. The chairs, pots, desk panels, glass panes and stairs keep their pixels; each chair and pot gets one flat contact shadow, a little to its right, the light being upper left. The left zone runs on to the seam at x 425.5 in the open hall, where the same pale band crossed it.

## Read

Crops before and after, at native scale and on the installed 4× master, are in `art/runs/moosylvania-railings-floor/` (ignored), with the rebuilt composite, the plate's tiles at both densities over rows 2 to 4, the first phone frame at 0.6, and each stair cut-out on a checkerboard.

- **Loft railing: accept.** Straight rails, even posts, even balusters, one flat floor tone behind them. It reads cleanly at 1.25×, at 2× and in the 390 × 844 frame at 0.6, where it is the first thing in view. A regular mesh (nine balusters and six rows to a bay) was rendered for comparison and plain balusters kept.
- **Stair railings: accept.** No veins, no blobs; every run reads as the same railing as the loft's. The treads show through the two runs that stand in front of them.
- **Stair treads: accept, with a note.** Back edges are straight and the stepped seam on the lower left treads is gone. The top three treads of each stair had no slivers and are untouched.
- **Office floors: accept.** Boards run in the hall's direction at its widths, with no ghost bands, patches or blobs, and join the floor below without a visible seam.
- **Cut-outs.** All twenty-four master-derived cut-outs have the same alpha as before the round (0 px differ), the same sizes and trims; only the stairs' colour pixels changed (and every cut-out's by the upscaler's small drift near the edited areas). On a checkerboard both stairs are whole, with no holes or fringes; the wall and floor seen through the outer railing are inside the matte, as they were. `moosylvania-tv-remote` is untouched and not painted into the master; `moosylvania-meeting-table` stays in the manifest.

## Left imperfect

- **The hall's centre.** The pale sheen down the middle of the hall, from the doors to the sofas, is the master's own lighting and was left alone. Its soft edges are of the same family as the smear Joe marked; if he wants it gone, the same script can relay that floor.
- **Through the glass.** The strip of office floor seen through each glass partition's pane keeps the master's soft pixels, so the tint of the glass is not redrawn.
- **Stair treads.** A few back edges still dip by a pixel where they meet a handrail, and the inner railing's upper run shows the treads behind it slightly soft, being cloned from beside the rail.
- **Upscaler drift.** Real-ESRGAN works in tiles, so pixels up to about 24 native px from an edit change by a few levels (none by more than 16 beyond that distance). Not visible.
- **Not checked here.** The running site (hover outlines, walk-behind on the stairs, both densities in a browser), Safari, a real phone.

## Hashes (SHA-256)

- `art/sources/moosylvania-fix/stitched.png`: `c393f53eda2fb321597335cd1fcb364a6a557857c4a48151299148db453e62c9`
- `art/sources/moosylvania-fix/rounds/base-5.png` (the master before the round): `f95d7f9138064cae2b5df6984861779d86cea8c258f53c2ef88962ecad3c348f`
- `art/sources/moosylvania-fix/rounds/round-5.json`: `14aba1ea0d843d6999740087a05b311839014300ad72a67e7fe91b2228ebfebf`
- `art/sources/moosylvania-fix/decals.json`: `84b6b31326aba5187c23a058d6d9f65ec924e2a36c00626983fb4a7f264b9f12`
- `art/sources/moosylvania-fix/loft-railing.svg`: `28259c0ac9ba8ebd7fd10844b42a0c8ccd9f10cf1ee16c86543a3ad4edd724b1`
- `art/sources/moosylvania-fix/stairs-left-railings.svg`: `c072536bb18e9ea12f346c73f925b1b2082d6ad930b31a9322c6cb5791d9e3ae`
- `art/sources/moosylvania-fix/stairs-right-railings.svg`: `b30dee743e0d972ff7484d8b6f9e4e4dcf777870a38ba3868e7917f7457b4d42`
- `scripts/art/overworld/lobby-railings-floor.py`: `00721fb9b9e0e55b07f50e992cf901664f724f1502f8bef13d9d6b6f8471b336`
- `art/generated/moosylvania/moosylvania-master/image.webp`: `ac08a95cc9c1bb093c32894703ab87f89d5a424bca3810d51634e0e5edc0bdd3`
- `art/generated/moosylvania/moosylvania/image.webp` (the plate): `9c09c1778c19026bc83043061114413794922707072634327437edb4d30ad4b0`
- `art/generated/moosylvania/moosylvania/asset.json`: `906f0b1a14068e7ec8d7dce05080b5fac1ddca26ffc4cbab61b7500872ec1e27`
- `art/generated/moosylvania/moosylvania-stairs-left/image.webp`: `0bd8f14fa2f215a749a3c5f66dd14d29613c73796f3dd4a872a2e0c8e45ae470`
- `art/generated/moosylvania/moosylvania-stairs-right/image.webp`: `eceba6bd930827dcad02a305fcbeef686750f1a93823cc7e9d5bc056b2f30496`
- `art/generated/moosylvania/composite.webp`: `2f83931ffbce76b19a39b00b77382cd7969e93639b351294000f6b4bf5836e0c`
- `art/generated/contact-sheet.webp`: `a2f5e94ded3a4527c398460f20068437bf65b778df687c62b2f7b9e423b6a0fb`
- `art/generated/review.json`: `32d1dbcd827967fec1c3c548a30f1143ea0e6c0f0b6aa8d1faad09a1052471bb`
- `art/manifest.json` (unchanged by this round): `4fda66d8602eec1e02a9b86e415b0c49ae4830c363737d73762e5389b73bbebf`
- `art/generated/moosylvania/moosylvania-tv-remote/image.webp` (unchanged): `4829894a9cd66f9b1875fff20223d337b001977b41b6cbde0f28d0c7811093ad`
