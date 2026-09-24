# 02: Scripted art pipeline through the Codex CLI

**What to build:** The art-pipeline prototype's recipe turned into a script a builder runs from the terminal: for each asset in a manifest it calls the Codex CLI non-interactively with the recipe's style paragraph, the asset prompt and the reference images (the arrival mock on every Maplewood prompt, the opening crop for any prop that fills an opening), receives the image, then keys it on magenta with the 1 px alpha erode, trims it, upscales backgrounds 2x (the lobby about 1.7x), encodes WebP, and cuts backgrounds into 512 world px tiles at 1.25 and 2 image px per world px. Moving props come out as separated parts with a pivot each (moose: body, head, antlers, eye; rider: body, wheels). The judging harness (`review.html`) is extended with overlays for depth regions, foreground scenery rects, prop rects, the river mask, bridge deck, south-end line and Arch reset point, and the first phone frame (390 x 844 at 0.6 scale) so a judge can accept or reject against the spec's criteria.

Proven by regenerating Maplewood end to end and comparing it in the harness with the prototype's assets. ChatGPT in the browser is no longer part of the loop.

Assumption to verify first: the Codex CLI can produce an image file with reference images attached at the sizes the recipe needs. If it cannot, the same script calls the OpenAI Images API directly with the same prompts and the ticket still stands.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One command generates, keys, trims, upscales, encodes and tiles an asset from a manifest entry, with no manual step between prompt and tile
- [ ] Reference images attach per the recipe's working rules (arrival mock on Maplewood prompts, opening crop for opening-filling props)
- [ ] Moving props are produced as separated transparent parts with pivots, in the moose rig JSON shape from the prototype
- [ ] The harness shows depth region, foreground scenery, prop rect, river geometry and phone-frame overlays read from the scene-data module
- [ ] Maplewood regenerated through the pipeline passes the prototype's criteria in the harness (dimensions, fringe and halo, palette)
- [ ] The judge-and-regenerate loop is documented in one place a Claude agent can follow: judge in the harness, adjust the prompt, rerun the one command
