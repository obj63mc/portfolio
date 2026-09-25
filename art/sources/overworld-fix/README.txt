Overworld fix tile map. base.png is the master Joe marked up (commit 2bfad09, 1983 x 793, native size);
marked.png is his review image aligned to it. Nothing here is upscaled or run through a model except the tile edits.

tiles/t-<name>.png          exact crop of base.png (512 px squares; the lake tile is 768 x 512 so the loop path is one drawing)
tiles/t-<name>-marked.png   the same crop of marked.png (red loops = defects)
tiles/t-<name>-mask.png     white = repaint; filled from the red loops (plus the lake shore band). Black pixels are never touched.
tiles/t-<name>-prompt.txt   the fix list for that tile; tiles without one need no edit
tiles/t-<name>-out.png      the edited tile (any size; it is resized back to the tile size when stitched)
tilemap.json                every tile's rect in base pixels, its loops and repaint count

Columns start at x = 0, 500, 1000, 1471 and rows at y = 0, 281, so tiles overlap by a few pixels; each defect belongs
to exactly one tile, so no repaint crosses a tile edge.

1. python3 tiles.py slice          rebuilds tiles/ from base.png and marked.png (ImageMagick crops)
2. ./edit-api.sh [tile ...]        gpt-image-2.5 Sunburst, quality max, Images API edit endpoint with the mask
                                   (OPENAI_API_KEY exported in the shell; never written to a file)
   or fix a tile by hand: paint on a copy of t-<name>.png and save it as t-<name>-out.png
3. python3 tiles.py stitch         ImageMagick pastes each -out.png back, only inside its mask, into stitched.png and
                                   prints how many pixels changed outside the masks (must be 0)
4. install stitched.png as the master: see art/README.md, "Filling the map" (process overworld-master --source ...,
   then regenerate overworld and the five derived mattes, sync the geometry, validate)

The Codex CLI cannot do step 2: its built-in image tool is fixed to gpt-image-2 at automatic quality.
