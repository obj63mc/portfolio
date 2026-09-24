# Scene artwork pipeline

Issue 02 provides the same terminal workflow for Codex, Claude Code and a human builder. `codex exec -i` calls authenticated Codex image generation with references attached. No ChatGPT browser session or OpenAI API key is needed for this provider. Generation was exercised with Codex CLI 0.156.1 on 2026-09-24.

Requirements: Node 24+, ImageMagick 7 (`magick`), and authenticated Codex CLI with image generation. Run from the repository root. `npm install` installs the existing TypeScript tooling.

```sh
npm run art -- list
# Generate missing assets, in dependency order.
npm run art -- generate all
# Revise layers while preserving the approved composition.
npm run art -- generate scene:moosylvania --force --keep-masters
npm run art -- generate brennans-chair --force
# Reprocess saved local PNGs after correcting placement (no generation).
npm run art -- process brennans-chair --force
npm run art -- process door --source /absolute/path/to/door.png --force
npm run art:review
python3 -m http.server 4174 --bind 127.0.0.1
```

Open [the scene workshop](http://127.0.0.1:4174/art/review.html). There are **six scenes**: the overworld and five interiors. Maplewood is a district within the overworld. The original prototype remains a historical style reference; it is not a seventh scene.

## Compose first, then separate layers

Each `*-master` reference is a complete composition. Location photos supply architectural details; the original daytime illustration supplies the brighter cyan, green, cream and coral palette. See [landmarks.md](landmarks.md) and [the source ledger](references/locations.json). Photos and satellite screenshots are local references, never shipped artwork. Recreating a master on another machine requires restoring the selected images to the listed `art/references/local/` paths. Missing references produce a clear error; committed outputs and the workshop work without this local photo pack.

1. Generate and inspect a master: `npm run art -- generate moosylvania-master --force`. Judge it against the real room photographs before extracting anything.
2. Choose each movable object's crop in the master. `registration.rect` is that crop in scene world coordinates. The pipeline attaches the exact crop as the final reference. Background edits remove those objects while preserving the room, furniture, perspective and illumination.
3. Generate the layers with `--force --keep-masters`. Do not regenerate an approved master accidentally. An explicit `world` rectangle anchors the trimmed object to measured fixture bounds; otherwise placement derives from its source crop and trim offset. Inspect both: models sometimes recenter or resize extracted objects despite the prompt.
4. For precise extraction without redrawing, `deriveFrom` plus `registration.mask` copies the original composition pixels through a measured polygon matte. Mask points are normalized to the registration crop. The SLU chair and one lobby monitor use this path after generated cutouts lost interior pixels. `deriveFrom` without a mask copies the composition, as used by the overworld.
5. Reprocess after a rectangle change; regenerate dependent layers after a master change, then inspect all placements again. Coordinate annotations belong to that composition, not to arbitrary future camera angles.

The four Moosylvania computer targets are four monitors on existing desks. They are not four cloned furniture sprites. Foreground seats face the Alamo screen; the Side Project tap bank rests on the bar; the Brennan's chair meets the rug and floor in the original perspective. Room furniture may naturally occlude the bottom of another object; the workshop reports bounding-box overlaps for inspection, not as proof that an interactive face is obscured.

`generate backgrounds` selects six plates; `generate furnishings` selects interior props and foreground. Existing outputs are retained unless `--force` is present. `--keep-masters` preserves reference assets even with `--force`. Run one generator per asset at a time; independent scenes may run concurrently after shared dependencies exist. `generate <asset> --dry-run` writes its full prompt and checks available references. Processing stages outputs before replacement so failure leaves the previous asset intact.

## Files and coordinates

- `manifest.json`: prompts, dependencies, crop registration, reviewed placement and overworld rig layout. `style.txt`: brighter location-aware art direction.
- `sources/` and `runs/<asset>/<timestamp>/`: ignored original PNGs, prompts and execution logs. Preserve locally for offline reprocessing.
- `generated/<asset>/image.webp` and `asset.json`: portable retained pixels, source SHA-256, trim offsets, placement and tile inventory. `provenance.json` records the matching generation run or derivation; generated prompts use `<repo>` instead of an absolute machine path.
- Background plates: **2 image px/world px**, plus `upscale.webp` at 2× source size (1.7× for the lobby), and **512 world px tiles** at **1.25×** and **2×**. The raster is resized before tiling. Upscaling adds pixels, not illustration detail.
- Cutouts: existing alpha, 10% magenta key, 2%/98% alpha endpoint clamp, 1 px erosion, tight trim, lossless WebP. Trim offsets remain in the source frame.
- `moose-rig.json` and `rider-rig.json`: prototype-compatible `{parent,x,y,w,h,pivot}` parts plus file paths. Pivots are normalized within the trimmed part; ancestor transforms operate in master space. Both rigs are placed in the overworld.
- `generated/composites/`: stitched inspection images and contact sheet; these do not replace separable layers.

Production geometry overlays come from `src/lib/scenes/overworld.ts` and the five interior modules. Dashed draft rectangles follow the actual assembled artwork. **Production hit targets and river collisions still use the earlier scene data.** Issues 04/05 own promoting artwork and reconciling that geometry; this revision does not switch the production route. The artwork is a coherent starter asset set, not the complete content inventory for those tickets.

## Judge and regenerate — either agent

View each selected reference before judging. Compare **Composition reference** with **Assembled scene**, then both tile densities. Click the scene to inspect a **390 × 844 / 0.6** phone crop. Check props on their furniture, foot contact, perspective, alpha interiors, edges and foreground ordering. Use the geometry toggles to find remaining production alignment work. Inspect moose/rider movement and reduced motion in the overworld. The historical prototype supplies the palette comparison.

If a crop has a hole, fringe or changed shape, reject it even if the validator passes. Correct its prompt, mask or measured bounds and rerun the same command. Save notes and asset hashes under `art/reviews/`. The latest revision supersedes the first batch's visual verdict.

```sh
npm run art:check
npm run art:test
npm run art:validate
npm run check
npm run build
npm test
```

Mechanical checks establish geometry metadata, complete tile coverage, alpha and compatible rig frames. Visual acceptance is a separate decision. Commit accepted layers, prompts, metadata and review notes together. If generation is unavailable, report the failure; do not substitute code-drawn illustrations.

## Explicit API fallback

`npm run art -- generate moosylvania-master --provider api --force` invokes the installed imagegen skill's maintained `image_gen.py`, using the same references and `gpt-image-2`. It requires a locally configured `OPENAI_API_KEY` and the CLI's Python dependencies. `IMAGE_GEN_CLI` overrides the script path; `ART_PYTHON` selects Python. API usage is separately billed; there is no automatic provider switch. Never put credentials in manifests, prompts or committed files.
