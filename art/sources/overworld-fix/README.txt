Overworld fix tile map. base.png is the master Joe marked up (commit 2bfad09, 1983 x 793, native size) and marked.png
his review image aligned to it; each later round starts from the previous stitched.png, kept aside as rounds/base-N.png.
Nothing here is upscaled or run through a model except the tile edits; the stitch is ImageMagick only. The 4x upscale of stitched.png
is the overworld master itself (art/generated/overworld-master/image.webp), the background's source: see art/README.md.
A repaint area must end well inside its tile and should not cross a road except at a junction: the model lines
its redraw up with what it can see in the reference, so a road that leaves the area needs its continuation in the
tile, or it steps at the boundary (tiles.py check finds these).

tiles/t-<name>.png          exact crop of the round's base (512 px squares; wider tiles where one drawing must stay whole)
tiles/t-<name>-marked.png   the same crop with this round's repaint areas outlined in red (round 1: Joe's own loops)
tiles/t-<name>-mask.png     white = repaint. Black pixels are never touched.
tiles/t-<name>-prompt.txt   the fix list for that tile
tiles/t-<name>-model.png    the model's edited tile (any size; resized back to the tile when stitched)
tiles/t-<name>-out.png      that tile cut from the stitched result. MARK THE NEXT ROUND ON THESE (red loops).
tilemap.json                this round's tiles: rect in master pixels, loop ids, repaint count
rounds/round-N.json         the round's spec: base, tiles, which detected loops each tile takes, extra rectangles,
                            polygons, protected rectangles, the lake band, the fix list; loops skipped and why;
                            lawnfill / ghostfill / cleanup: loops fixed without a model by lawn_fill (a single tree
                            deleted and refilled with the surrounding lawn; ghostfill also takes a half-transparent
                            tree's lawn-like pixels; cleanup runs after a tile's paste), each with optional
                            <kind>Extra and <kind>Protect rectangles
rounds/detected/<id>.png    each red loop found by `detect`, filled, as a master-size mask (rounds/detected.json)

A round:
1. draw red loops on tiles/t-<name>-out.png (or -marked.png for a tile with no output yet), commit, push
2. python3 tiles.py detect <git-ref>     loops drawn since that commit -> rounds/detected/
3. write rounds/round-N.json (base "stitched.png"), then python3 tiles.py prepare rounds/round-N.json
4. ./edit-api.sh [tile ...]              gpt-image-2.5 Sunburst, quality max, Images API edit endpoint with the mask
                                         (OPENAI_API_KEY exported in the shell; never written to a file)
   or the Codex tool through the art pipeline (gpt-image-2; the CLI cannot select 2.5), or fix a tile by hand:
   paint on a copy of t-<name>.png and save it as t-<name>-model.png
5. python3 tiles.py stitch               pastes each -model.png back only inside its mask onto the round's base, prints
                                         how many pixels changed outside the masks (must be 0), refreshes every -out.png
   python3 tiles.py check                lists every road or footpath that reaches a repaint boundary and no longer
                                         continues inside it (a cut or stepped road); widen the mask to a junction,
                                         enlarge the tile so the road's continuation is in the reference, or rerun
   A round spec can also carry deterministic ops that run after the pastes: lawnfill / ghostfill / blurfill / forcefill /
   waterfill / shorefill loops (with <kind>Extra rectangles, <kind>Polygons and <kind>Protect), restore rectangles (base
   (a tile's keepBaseWater, true or a list of master rects, keeps the base wherever base and model are both water),
   pixels put back, or {rect, src} from an earlier round's rounds/base-N.png), tones (a lawn tone shift in a rect or polygon,
   optionally fading out along x, or colour-keyed with from/to so only pixels towards `from` move, e.g. a yard back to lawn), shorebands (a jagged shore path redrawn as one band on the smoothed water edge),
   roadbands (a road redrawn as one clean band from its fitted edges, flat surface, evenly spaced centre dashes),
   paints (a flat colour; a polygon paint touches only light pixels unless `all`), stamps (a tree cloned from elsewhere), bridges (a path stub carried on to the
   path beyond) and corridors on a tile (the base path's own line handed to the repaint area up to its junction).
6. upscale stitched.png 4x and install it as the master: see art/README.md, "Filling the map" (process overworld-master --source ...,
   then regenerate overworld and the five derived mattes, sync the geometry, validate)
