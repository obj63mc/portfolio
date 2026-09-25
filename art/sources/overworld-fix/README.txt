Overworld fix sections (cut from art/generated/overworld-master/image.webp, 1983 x 793, native size).

NN-name.png          the original section, unchanged - copy it to NN-name-fixed.png and paint on that to fix by hand
NN-name-marked.png   the same section from the marked-up review image (red loops = defects)
NN-name-mask.png     where a model output is accepted (white); hand fixes ignore it and are pasted whole
NN-name-prompt.txt   the fix instructions given to the model for that section
NN-name-out.png      a model output for the section (written by the Codex run or run-api.sh)
sections.json        section rects in master pixels: {x, y, w, h}, the issues covered and the loop indices

Reassemble:  python3 assemble.py ../../generated/overworld-master/image.webp master-fixed.png
Install:     see art/README.md, "Filling the map" - process overworld-master --source master-fixed.png --force,
             then regenerate overworld and the five derived mattes, sync the geometry and validate.
Codex CLI:   its built-in image tool is fixed to gpt-image-2 (auto quality). For gpt-image-2.5 Sunburst at max
             quality use run-api.sh with OPENAI_API_KEY exported (the Images API edit endpoint with a mask).
