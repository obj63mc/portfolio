Overworld fix data. The tools and the round workflow are in scripts/art/overworld/ (README.md there).

stitched.png                the editable native overworld master (1983 x 793). Every fix is made here; the background
                            is this image upscaled 4x (scripts/art/overworld/install-master.sh).
decals.json                 logos too fine for the native master, composited onto the 4x upscale by install-master.sh:
                            the SLU logomark (slu-logomark.svg, supplied by Joe, TM removed) on McDonnell Douglas
                            Hall's central parapet, placed in native px and sheared to the wall's slope
rounds/round-N.json         every round's spec: tiles, masks, deterministic ops and the fix list sent to the model
rounds/base-N.png           the master before round N, kept aside by prepare (only the last round's is kept)
tilemap.json, tiles/        the last round's working set: t-<name>.png (crop), -marked.png (repaint areas in red),
                            -mask.png (white = repaint), -prompt.txt, -model.png (the redraw), the fill masks, and
                            union.png (every area the last stitch touched; check reads it). Stitch also writes
                            t-<name>-out.png for the standard grid: mark the next round on those.

Cleaned out 2026-09-25 and recoverable from git: round one's base.png and marked.png, the earlier rounds' bases and
markups, the detected loops and the earlier tiles, e.g.
  git show 0cece1a:art/sources/overworld-fix/rounds/base-13.png > rounds/base-13.png
  git show 0cece1a:art/sources/overworld-fix/base.png > base.png      (tiles.py slice, round one only, reads it)
