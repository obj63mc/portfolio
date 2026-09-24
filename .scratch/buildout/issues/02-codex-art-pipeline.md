# 02: Scripted art pipeline through the Codex CLI

**What to build:** The art-pipeline prototype's recipe turned into a script a builder runs from the terminal: for each asset in a manifest it calls the Codex CLI non-interactively with the recipe's style paragraph, the asset prompt and the reference images (the arrival mock on every Maplewood prompt, the opening crop for any prop that fills an opening), receives the image, then keys it on magenta with the 1 px alpha erode, trims it, upscales backgrounds 2x (the lobby about 1.7x), encodes WebP, and cuts backgrounds into 512 world px tiles at 1.25 and 2 image px per world px. Moving props come out as separated parts with a pivot each (moose: body, head, antlers, eye; rider: body, wheels). The judging harness (`review.html`) is extended with overlays for depth regions, foreground scenery rects, prop rects, the river mask, bridge deck, south-end line and Arch reset point, and the first phone frame (390 x 844 at 0.6 scale) so a judge can accept or reject against the spec's criteria.

Proven by regenerating Maplewood end to end and comparing it in the harness with the prototype's assets. ChatGPT in the browser is no longer part of the loop.

Assumption to verify first: the Codex CLI can produce an image file with reference images attached at the sizes the recipe needs. If it cannot, the same script calls the OpenAI Images API directly with the same prompts and the ticket still stands.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] One command generates, keys, trims, upscales, encodes and tiles an asset from a manifest entry, with no manual step between prompt and tile
- [x] Reference images attach per the recipe's working rules (arrival mock on Maplewood prompts, opening crop for opening-filling props)
- [x] Moving props are produced as separated transparent parts with pivots, in the moose rig JSON shape from the prototype
- [x] The harness shows depth region, foreground scenery, prop rect, river geometry and phone-frame overlays read from the scene-data module
- [x] Maplewood regenerated through the pipeline passes the prototype's criteria in the harness (dimensions, fringe and halo, palette)
- [x] The judge-and-regenerate loop is documented in one place a Claude agent can follow: judge in the harness, adjust the prompt, rerun the one command

## Answer

Implemented in `scripts/art.ts` and `art/`. Authenticated Codex CLI image generation was verified with attached references and used for all 32 retained starter assets: seven plates, separated props/foreground, and moose/rider rigs. The pipeline produces 384 background tiles across both densities, keeps source hashes/prompts, and supports offline reprocessing.

The workshop at `art/review.html` assembles layers, reads scene geometry, previews phone/tile/rig states, and compares Maplewood with the prototype. See `art/README.md` for the identical Codex/Claude command workflow, `art/landmarks.md` for references, and `art/reviews/2026-09-24-assets.json` for the visual verdict and source hashes. Assembled images are in `art/generated/composites/`.

The broader scene set is a starter draft. Issues 04/05 still own production promotion, complete content props, exact hit-target placement and final river geometry. No production route was switched to draft artwork.

## Comments

### Location-fidelity revision — 2026-09-24

User feedback supersedes the standalone Maplewood proof and first batch's room direction. The current deliverable has **six scenes, 41 assets and 372 tiles**: Maplewood is part of the overworld, with five photo-guided interiors. References now use the specified Moosylvania, Side Project Cellar, Brennan's, Foundry/Alamo and **McDonnell Douglas Hall** locations, plus satellite views for the Arch/highway relationship and district placement.

Composed masters establish perspective before layers are separated. Registration crops and measured fixture bounds place props back into their rooms; precise crop mattes preserve original pixels where model extraction damaged dark interiors. The workshop compares the master and assembled scene, and displays both rigs on the overworld. The palette returns to brighter cyan, green, cream and coral with localized wood/brick colors.

The current visual verdict and source hashes are in `art/reviews/2026-09-24-location-fidelity.json`; earlier review files are historical. Actual photo sources/attribution are recorded in `art/references/locations.json`. `art/README.md` documents the identical Codex/Claude workflow, including preserving masters during layer revisions. Production geometry promotion remains in issues 04/05.
