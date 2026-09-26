# Interiors on the overworld's fix loop

**Verdict:** tooling parity, not art acceptance. See [asset hashes and checks](2026-09-25-interiors.json) and the analysis in issue 05 (`.scratch/buildout/issues/05-sub-scene-art-pass.md`, 2026-09-25 comment).

- Each interior's approved 2048 × 1152 master is committed as `art/sources/<scene>-fix/stitched.png`, the editable source. Its 4× Real-ESRGAN upscale (8192 × 4608, Upscayl `digital-art-4x`) is installed as `<scene>-master` by `SCENE=<scene> scripts/art/overworld/install-master.sh zero`.
- The plates now derive from their masters (`deriveFrom`), as the overworld's does. They replace the Codex clean-plate redraws, which had drifted from the masters along every edge (mean absolute error 2 to 8 %). Objects stay painted in the plate and their cut-outs draw over their own pixels, as the spec's foreground rule expects. The SLU chair and third lobby monitor mattes were re-derived.
- The other cut-outs are Codex redraws. Composited over the new plates they cover their painted originals without a visible ghost at scene scale, but the composite-minus-master difference outlines every one of them (the taps, the diploma frame, the Brennan's casework and chair, the Foundry seats). Issue 05's prop pass replaces them with measured mattes or re-extracts them.
- The overworld reinstalled through the generalized script with every image and tile byte-identical. A throwaway Foundry round ran prepare, stitch (0 px changed), the Codex manifest, a dry run and `detect-master`; it was removed afterwards.

Validation: `art:validate` PASS (50 assets), `art:check`, `art:test` (3), `svelte-check` (0 errors), production build, 16/16 tests. Visual acceptance of the interiors is still Joe's, in `art/review.html`.
