# Scene artwork pipeline

Issue 02 turns the prototype recipe into the same terminal workflow for Codex, Claude Code and a human builder. The CLI uses the authenticated **Codex image-generation tool**, with reference images attached through `codex exec -i`. It does not automate ChatGPT in a browser. A live probe on 2026-09-24 with Codex CLI 0.156.1 produced a raster PNG with a reference attached and no API key.

Requirements: Node 24 or newer, ImageMagick 7 (`magick`), and an installed, authenticated Codex CLI with image generation available. Run commands from the repository root. `npm install` installs the existing TypeScript tooling; there are no new JavaScript dependencies.

```sh
# One command: generate → key/erode/trim → WebP → both tile densities.
npm run art -- generate maplewood
npm run art -- generate door
npm run art -- generate scene:maplewood

# Starter assets for all six scenes, plus the standalone Maplewood proof.
npm run art -- generate all
npm run art -- list

# Offline operations on saved source files.
npm run art -- process door --force
npm run art -- process door --source /absolute/path/to/door.png --force
npm run art:check
npm run art:validate
npm run art:review
python3 -m http.server 4174 --bind 127.0.0.1
```

Open [the scene workshop](http://127.0.0.1:4174/art/review.html). The original [prototype harness](../prototypes/art-pipeline/review.html) remains available for its magnifier, palette comparison and rig-placement tools; it links to the new workshop.

`generate backgrounds` selects the seven plates; `generate furnishings` selects the interior props and foreground scenery. Dependencies generate first. Existing outputs are kept unless `--force` is present. Changing a prompt or reference requires `--force` on the affected asset and its dependent props. Run one generator per asset at a time. Different scenes may run independently after shared dependencies exist.

`generate <asset> --dry-run` writes the complete prompt and checks references without making a generation call. Its references must already exist; generate dependencies before dry-running a dependent asset. A failed command exits nonzero and points to the run folder. Restarting `generate all` keeps completed entries and retries missing ones. Processing takes place in a temporary folder before replacing an asset, so failed processing leaves the previous asset intact.

## Files and coordinate contract

- `manifest.json` contains the asset inventory, individual prompts, dependencies, target world rects and rig metadata. `style.txt` begins with the prototype's style paragraph unchanged.
- `sources/` holds original generated PNGs locally. `runs/<asset>/<timestamp>/` retains prompt, raw output, CLI events and result. These are ignored; preserve them locally to reprocess without another generation.
- `generated/<asset>/image.webp` is the retained plate or tightly trimmed transparent cut-out. `asset.json` records source dimensions and SHA-256, trim offsets, output dimensions and tile inventory. Committed WebPs and JSONs are the portable deliverables.
- Backgrounds have a desktop plate at **2 image px/world px**, an `upscale.webp` comparison at 2× source resolution (1.7× for the lobby), and **512 world px tiles** at **1.25×** and **2×**. Partial tiles record their actual world sizes. The raster is resized before cutting; adjacent tile boundaries share exact integer coordinates. Upscaling adds pixels, not new illustration detail.
- Props use the recipe's **10% magenta key and 1 px alpha erosion**, then lossless WebP. Alpha endpoints are clamped at 2%/98% to remove almost-invisible generated specks and almost-opaque interior noise; meaningful intermediate alpha survives. A part's trim offset stays in the untrimmed master's coordinate frame; trimming never silently recenters it.
- `generated/moose-rig.json` and `rider-rig.json` retain the prototype's `{parent,x,y,w,h,pivot}` shape, with a `file` path added. Pivots are normalized within each trimmed part. The renderer applies ancestor transforms in master space. Source frames must match; the validator catches mismatches, and the judge checks joint overlap.
- `generated/composites/` holds assembled review images and a contact sheet. These never replace the separable layers. `npm run art:review` rebuilds them.

Production scene overlays are exported directly from `src/lib/scenes/overworld.ts` and the five modules in `src/lib/scenes/index.ts`. The standalone proof uses `art/scenes/maplewood.ts`, deriving its artwork rectangles from the manifest. Rig placements and draw order are shared by the workshop and saved composites; overlap checks include the rider's full travel range. Draft placement rects from the manifest can also be shown, separately from production hit targets. Tickets **04 and 05** own promoting the accepted art, aligning production prop rects and settling final river geometry. The first batch is a scene and asset starter set; it is not a completed content-prop inventory for those tickets.

## Judge and regenerate — Codex or Claude

1. Read `manifest.json`, `style.txt`, `landmarks.md` and the latest notes in `reviews/`. View the reference images before choosing changes. Every Maplewood district, lobby and Side Project prompt automatically includes the arrival mock. A prop with `opening` automatically receives a fresh crop from its parent plate.
2. Run `npm run art -- generate <asset>` (or `--force` for a revision). Claude invokes exactly the same command; Codex handles image generation behind that boundary. No browser, model-specific Claude image feature, or manual download is required.
3. Run `npm run art:review` and open the workshop. Compare the prototype and current plate; inspect the full scene and **both tile densities**, then the first **390 × 844 / 0.6** phone frame. Its world coverage is 650 × 1406⅔, with the camera clamped to scene bounds.
4. Toggle prop/foreground rects, depth, the water mask, bridge deck, south-end line and Arch reset point. Solid overlays are production geometry; dashed overlays are draft asset placements. The river overlay explicitly clears the deck. Do not accept placeholder production rects just because a background looks finished.
5. Inspect cut-outs on the checkerboard and in the assembled scene. Reject visible magenta/white fringes, wrong door silhouettes, texture/style drift or foreground over a prop. Inspect the parts in motion and at rest; reduced motion freezes ambient animation but the click-reaction button still works. Check all four lobby desk placements, not just a single desk image.
6. Record a concrete verdict and the next correction in the notes panel, download it into `art/reviews/`, and keep the source hashes with the verdict. Change only the failing asset prompt or its placement; rerun the same command with `--force`. If a plate changes, regenerate opening-filling props and any parts whose reference geometry changed.
7. Run `npm run art:check`, `npm run art:validate`, the site checks and build-output tests. A mechanical pass establishes dimensions, complete tile coverage, alpha and frame compatibility; **visual acceptance remains a separate decision**. Commit retained outputs, prompts, scene data and judge notes together.

If a provider cannot attach references or return a raster file, stop the run visibly. Do not substitute SVGs or code-drawn placeholders and call them generated artwork.

## Explicit API fallback

```sh
npm run art -- generate maplewood --provider api --force
```

This calls the installed imagegen skill's maintained `scripts/image_gen.py` using `gpt-image-2`, with the same prompt and references. It requires `OPENAI_API_KEY` set locally and the CLI's Python dependencies (`openai`, Pillow). `IMAGE_GEN_CLI` can point to that script; `ART_PYTHON` selects the Python interpreter. Codex home defaults to `~/.codex` and honors `CODEX_HOME`. Never put a key in a manifest, prompt or repository file. API generation uses separately billed API usage; there is no automatic provider or model switch. This batch was generated through Codex, not the API fallback.

The official [Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli) covers the CLI; the installed `codex exec --help` and imagegen skill are the execution contract verified for this pipeline.
