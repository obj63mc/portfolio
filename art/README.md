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

1. Generate and inspect a master: `npm run art -- generate moosylvania-master --force`. Judge it against the real room photographs before extracting anything. To iterate on an accepted draft, copy it to `references/local/drafts/`, attach it as a composition reference and give the prompt a short fix list; the overworld master was settled this way in two runs.
2. Choose each movable object's crop in the master. `registration.rect` is that crop in scene world coordinates. The pipeline attaches the exact crop as the final reference. Background edits remove those objects while preserving the room, furniture, perspective and illumination.
3. Generate the layers with `--force --keep-masters`. Do not regenerate an approved master accidentally. An explicit `world` rectangle anchors the trimmed object to measured fixture bounds; otherwise placement derives from its source crop and trim offset. Inspect both: models sometimes recenter or resize extracted objects despite the prompt.
4. For precise extraction without redrawing, `deriveFrom` plus `registration.mask` copies the original composition pixels through a measured polygon matte. Mask points are normalized to the registration crop. The SLU chair and one lobby monitor use this path after generated cutouts lost interior pixels. `deriveFrom` without a mask copies the composition, as the overworld plate does. The overworld's two foreground trees, the marquee bulb string and the Eads Bridge are masked mattes: Codex redrew all four when asked to extract them, so their cut-outs are the master's own pixels through a traced or hand-measured polygon (a thin halo of surrounding plate pixels is invisible at rest because it lands on identical pixels).
5. Reprocess after a rectangle change; regenerate dependent layers after a master change, then inspect all placements again. Coordinate annotations belong to that composition, not to arbitrary future camera angles.

The four Moosylvania computer targets are four monitors on existing desks. They are not four cloned furniture sprites. Foreground seats face the Alamo screen; the Side Project tap bank rests on the bar; the Brennan's chair meets the rug and floor in the original perspective. Foreground scenery never covers a prop. Brennan's stationary cabinet is scenery, with its unobscured upper glass face extracted as a separate prop for highlighting and interaction. The foreground chair can overlap passive casework while remaining clear of that face. The validator rejects foreground/prop bounding-box overlaps.

The Codex image tool accepts **at most five reference images** (the registration crop counts as one; the pipeline refuses more) and returns its own native size: about 1774 × 887 for a 2:1 prompt, 1983 × 793 for 2.5:1, 1254 × 1254 for a square; `size` values in the manifest are those native canvases. It cannot be told a pixel size; earlier 2048 and 2304 wide masters were `sips` upscales made by the Codex agent, and the pipeline now asks for the native file unresized. Upscaling to the plate size is the pipeline's job.

`generate backgrounds` selects six plates; `generate furnishings` selects interior scenery, props and foreground. Existing outputs are retained unless `--force` is present. `--keep-masters` preserves reference assets even with `--force`. Run one generator per asset at a time; independent scenes may run concurrently after shared dependencies exist. `generate <asset> --dry-run` writes its full prompt and checks available references. Processing stages outputs before replacement so failure leaves the previous asset intact.

## The overworld

### Filling the map and sharpening it

The accepted overworld master is a chain of regional edits on one composition, each recorded in the master's `prompt.txt` and `provenance.json`: crop a region of the current master to a native canvas (`references/local/drafts/fill-crop-<region>.png`), hand-prepare it when placement or scale matters (clear an area to flat lawn, paste a scaled-down building, mark a footprint), let Codex redraw the crop with a preserve-list and a change-list, then paste it back with a feathered border (`sources/overworld-fix/assembly/assemble.py`, `assemble2.py`, with `regions.json`; a hard cut where a seam crosses a structure such as the Eads Bridge, and protected rectangles where a prop's ground must not move). Codex keeps what the crop shows and ignores size prose, so scale corrections are done in the prepared crop, not the prompt. Fill scenery between the key scenes follows real St. Louis (Google Places photos under `references/local/places/fill/`, attributions in `references/locations.json`): Forest Park, the medical campus, downtown, Laclede's Landing, the Arch grounds, Soulard and the brewery, the Illinois riverside and Belleville, plus ordinary housing, shops and schools; main scenes stay large, background landmarks sit at roughly their real proportion to the Arch.

Seams are where regional edits fail: an edit redraws a road, a roof or a bridge a few pixels off, and the feathered paste leaves a ghost. Clip each edit to the ground it was meant to change (a road's top edge, a roof line, a bridge deck band) and keep the base elsewhere; where a structure crosses a seam, copy it back wholesale from the base along a band that hugs its outline (the Eads Bridge). Super-resolution does not hide seams: a Real-ESRGAN 4× pass sharpened seam blur into visible artifacts, which is why the seams were fixed first on the tile map below.

**The overworld background is a 4× upscale of the stitched master (2026-09-25, keep it).** The editable source of truth is the native 1983 × 793 `sources/overworld-fix/stitched.png`; every fix is made there. `generated/overworld-master/image.webp` is that image upscaled 4× to 7932 × 3172 by Real-ESRGAN (Upscayl 2.15 `upscayl-bin`, model `digital-art-4x`; Lanczos stays soft and `ultrasharp` invents texture). The scrollable background plate (13500 × 5400), its tiles at both densities and the five master-derived mattes are all cut from that 4× master, so the plate is a 1.7× resize of sharp pixels instead of a 6.8× resize of the native one. Registration rects are in world coordinates and scale to any master size, so scene geometry does not change. After every fix round, re-upscale and reinstall:

```sh
UP=/Applications/Upscayl.app/Contents/Resources
RUN=art/runs/overworld-master/$(date -u +%Y-%m-%dT%H-%M-%S.000Z)-upscale-4x; mkdir -p $RUN
$UP/bin/upscayl-bin -i art/sources/overworld-fix/stitched.png -o $RUN/source.png -s 4 -m $UP/models -n digital-art-4x
npm run art -- process overworld-master --source $RUN/source.png --force
npm run art -- generate overworld --force
for a in eads-bridge maplewood-tree park-tree marquee-bulbs mc-sign; do npm run art -- generate $a --force; done
npm run art:validate
```

Record the upscale in the master's `prompt.txt` and `provenance.json` (operation `real-esrgan-4x`, the native base's SHA-256), then sync the extractions' world rects into `src/lib/scenes/overworld.ts` and read the bridge matte over the plate.

Small defects are fixed on an exact tile map, never by regional redraws (2026-09-25). `sources/overworld-fix/` (committed, unlike the rest of `sources/`, so the tiles are reachable from any machine) holds the base master Joe marked up, his review image aligned to it, and `tiles.py`: ImageMagick cuts the base into 512 px square tiles (columns at 0, 500, 1000 and 1471, rows at 0 and 281, so every marked defect sits inside one tile with margin) plus wider tiles where one drawing must stay whole (the lake and its ring path, the Eads Bridge deck), and writes for each a repaint mask (white = repaint) and a prompt listing that tile's fixes. Each tile goes to the model with the same tile outlined in red as a second reference. The paste and its proof are ImageMagick: each output is resized back to its tile, pasted onto the round's base inside its mask with a 0.7 px feather, and the script proves that no pixel outside the masks changed. Rounds chain: the stitched result becomes the next round's base, every tile is written back out as `t-<name>-out.png` for Joe to mark again, `tiles.py detect <ref>` fills each new red loop as a master-size mask, and `rounds/round-N.json` says which tile takes which loop, plus extra rectangles, polygons (the deck band), protected rectangles and the lake shore band. Two rules keep roads straight: a repaint area ends well inside its tile and crosses a road only at a junction, because the model lines its redraw up with what the reference shows beyond the area (the lake ring's exits stepped at a tile edge until the tile was widened), and `tiles.py check` lists every road that reaches a repaint boundary and no longer continues inside it. Single trees the art director wants gone are not sent to the model at all, because it keeps drawing a new tree in their place: `lawn_fill` in `tiles.py` deletes the tree's pixels (whole blobs mostly inside the loop, trunks and shadows included, and for a half-transparent ghost tree the lawn-like pixels far from the surrounding lawn), never a footpath, road, water or a neighbouring tree the loop merely overlaps, and refills them with real lawn cloned by translation, per 28 px cell with a tone match to the lawn beside it, so the lawn's grain and shading carry through with no flat patch. The same refill serves `blurfill` (only off-colour lawn replaced), `forcefill` (everything but water), `waterfill` (everything in the loop becomes the lake's water) and `shore_fill`, which rebuilds a single shoreline: the water region smoothed, the whole strip up to the footpath relaid as cloned lawn, and an anti-aliased two-pixel sand rim in the lake's own colour. Each model output is drift-checked against the base outside its mask and rejected when the model has zoomed or panned (a whole-park redraw came back scaled up 7 % once; the strict-registration rerun aligned), and `tiles.py check` lists any road that dead-ends at a repaint boundary. Where a base path stops a few pixels short of a redrawn one, a `bridge` carries it straight on in its own colour and width until it meets the path beyond; where the base connectors do not match the redraw at all, the accepted outline is extended to the next real junction instead. A `restore` entry can also take its pixels from an earlier round's kept base (`{rect, src}`), which undoes one round's damage exactly; `tones` evens a lawn tone step with a shift that fades out (or, colour-keyed, moves only pixels towards one colour, such as a light yard back to lawn), and `shorebands` redraws a jagged north-facing shore path as one anti-aliased band (lawn strip and path at fixed widths) on the water edge smoothed column by column, keeping connector columns. A protected rectangle keeps every pixel inside it, haze included, and an object that reaches past it gets cut straight at its edge; read each protect edge in the 4x upscale and give a cut object or a kept haze its own tile. The Codex CLI's built-in image tool is fixed to `gpt-image-2` at automatic quality (`codex-rs/ext/image-generation/src/tool.rs`); `gpt-image-2.5-sunburst`, the precision-editing variant with `xhigh` and `max` quality, is only reachable through the Images API edit endpoint with a transparent-means-repaint mask, which `sources/overworld-fix/edit-api.sh` does with `OPENAI_API_KEY` exported and never written to a file.


The overworld master is one Cursor Camp style diorama: an elevated three-quarter view, north up, one continuous ground plane with a thin skyline band, about a dozen large landmarks and connected cream footpaths, so a 32 world px cursor reads as person scale beside an 80 px doorway. A Cursor Camp screenshot (`references/local/cursor-camp/`, logged in `references/locations.json`) is attached only for camera angle and object scale; the style and palette still come from the original daytime illustration. The five district signs and the MonsterCommerce roof sign are the only lettering requested.

Static props are painted into the composition and extracted by registration crop, the same as the interiors: the church door, marquee (canopy and its string of bulbs as separate layers), MonsterCommerce sign and the monster's eye (separate layers, so a blink draws over the purple monster head that forms the O), server rack, two foreground trees (one south of the church, one on the park's lower straight) and the Eads Bridge cut-out (deck, abutments and piers; the steel arches stay in the plate, under a cursor crossing the deck). Square crops use `1024x1024`; the marquee uses a 3:2 crop with `1536x1024` and the bridge a 2.5:1 crop with `1983x793`, because the extraction canvas must keep the crop's aspect ratio. The welcome board, fingerpost, bike, park notice board, moose rig and rider rig are standalone cut-outs placed by `world` rects and `sceneLayouts` (the accepted master paints no bike or notice board, so both are generated against the park at bench scale); they are re-placed with `process <id> --force`, not regenerated, when the master changes. The rider's `travelX` sweeps the lower straight of the lake loop west of the park tree.

`src/lib/scenes/overworld.ts` carries the measured geometry: district and venue rects, prop rects copied from each extraction's `asset.json`, seven depth regions that tile the ground with one shared horizon (250) and foreground line (2700), the foreground tree rects, the river water polygon, the Eads deck and bridge cut-out, the Poplar Street south-end line and the Arch reset point. `tests/overworld-geometry.test.ts` checks those rules, including the signpost and moose inside the first phone frame centred on the welcome board.

## Files and coordinates

- `manifest.json`: prompts, dependencies, crop registration, reviewed placement and overworld rig layout. `style.txt`: brighter location-aware art direction.
- `sources/` and `runs/<asset>/<timestamp>/`: ignored original PNGs, prompts and execution logs. Preserve locally for offline reprocessing. The exception is `sources/overworld-fix/`, committed so the overworld's editable native master, its tile map, round specs and assembly scripts are reachable from any machine.
- `generated/<asset>/image.webp` and `asset.json`: portable retained pixels, source SHA-256, trim offsets, placement and tile inventory. `provenance.json` records the matching generation run or derivation; generated prompts use `<repo>` instead of an absolute machine path.
- Background plates: **2 image px/world px**, plus `upscale.webp` at 2× source size (1.7× for the lobby) while the source is smaller than the plate, and **512 world px tiles** at **1.25×** and **2×**. The raster is resized before tiling. Upscaling adds pixels, not illustration detail.
- Cutouts: existing alpha, 10% magenta key, 2%/98% alpha endpoint clamp, 1 px erosion, tight trim, lossless WebP. Trim offsets remain in the source frame.
- `moose-rig.json` and `rider-rig.json`: prototype-compatible `{parent,x,y,w,h,pivot}` parts plus file paths. Pivots are normalized within the trimmed part; ancestor transforms operate in master space. Both rigs are placed in the overworld.
- `generated/overworld-master/image.webp`: the 4× Real-ESRGAN upscale (7932 × 3172) of `sources/overworld-fix/stitched.png`, the overworld background's source. Edit the native stitched image, never the upscale.
- `generated/composites/`: stitched inspection images and contact sheet; these do not replace separable layers.

Production geometry overlays come from `src/lib/scenes/overworld.ts` and the five interior modules. Dashed draft rectangles follow the actual assembled artwork. The overworld's production geometry now matches its artwork (issue 04); the interiors' hit targets still use the earlier scene data until issue 05 promotes them.

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
