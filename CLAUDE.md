## Agent skills

### Issue tracker

Issues and specs are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Scene artwork

Before generating, editing, placing or reviewing assets, read [the art workflow](art/README.md), [location references](art/landmarks.md), [the style contract](art/style.txt) and the latest applicable [review notes](art/reviews/). Keep this section synchronized between `AGENTS.md` and `CLAUDE.md`; detailed recipes and reference attribution live in `art/`.

### Design decisions

- Build one connected overworld and five interiors. Maplewood is an overworld district: its church entrance, welcome board, signpost and moose belong there. SLU means **McDonnell Douglas Hall**.
- Use actual-location photographs for architecture, furniture and room arrangement, and satellite imagery for relative geography. Keep the highway west of the Arch grounds, Eads Bridge north and the Poplar crossing south. The illustrated map compresses distances; interiors interpret references rather than certify floor plans. Record sources and distinguish verified details from invented portfolio fixtures.
- Use the original daytime illustration for the bright cyan, green, cream and coral palette. Restrict brown to local wood, brick and upholstery. Cursor Camp informs connected paths and coherent composition; follow this project's illustration style.
- Establish a complete scene composition before separating its layers. Props share its camera, perspective, scale and lighting. Monitors sit on existing desks, taps rest on the bar, chairs meet the floor and cinema seats face the screen.
- Every scene's background, the overworld's and each interior's, is cut from a 4× Real-ESRGAN upscale of its native stitched master (`art/sources/<scene>-fix/stitched.png`), installed as `<scene>-master`; the plate derives from it, never from a model redraw. Fix defects on the native image with the tools in `scripts/art/overworld/` (`SCENE=<scene>` for an interior), then reinstall with `scripts/art/overworld/install-master.sh`; see [the art workflow](art/README.md).
- Foreground scenery never covers an interactive prop, including a moving rig's full travel. Separate passive scenery from interactive faces when necessary: Brennan's cabinet is scenery, while its unobscured upper glass face is a prop.

### Creation and review

1. Use the shared terminal pipeline in `art/README.md` for both Codex and Claude. Inspect reference images before prompting. Preserve approved masters with `--keep-masters` when regenerating layers.
2. Register cutouts against their composition crops and measured fixture bounds. Generated extraction can recenter objects or remove dark interior pixels. Use measured original-pixel mattes when needed; preserve existing alpha, trim offsets, rig pivots and source provenance. Reprocess placement edits. Regenerate and visually reassess dependent assets after changing a master.
3. Compare the master with the assembled scene in `art/review.html`; inspect each cutout on a checkerboard and in context. Reject holes, fringes, floating furniture, wrong orientation, inconsistent scale or broken joints even when automated checks pass.
4. Inspect both tile densities, the initial 390 × 844 phone frame at 0.6 scale, arrival/signpost visibility, foreground ordering, ambient motion, click reactions and reduced motion. Rebuild the stitched composites and record the verdict with current asset hashes under `art/reviews/`.
5. Run the documented art checks and relevant site checks before acceptance. Keep prompts, retained layers, metadata, provenance and review notes together. Local reference photos and credentials stay outside committed deliverables.
6. Treat workshop acceptance and production integration separately. Before promotion, reconcile production hit targets, depth regions and river/deck geometry with the accepted artwork; issues 04/05 track that integration.
