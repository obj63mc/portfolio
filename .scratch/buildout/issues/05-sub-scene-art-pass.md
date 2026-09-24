# 05: Sub-scene art pass

**What to build:** The five sub-scenes (CS lab, Foundry theatre, Moosylvania lobby, Side Project bar, Brennan's), each 2845 x 1600 world px, regenerated through the pipeline in the settled style, with every prop's cut-out and world rect, one or more depth regions per scene, foreground scenery cut-outs and the door and exit door placements written into each scene-data module. The theatre screen gets its idle art and the space the timeline draws into; the posters are three trimmed cut-outs.

**Blocked by:** 02 (pipeline and harness), 03 (the sub-scene modules exist)

**Status:** ready-for-agent

- [ ] Tiles at both densities for all five sub-scenes, judged in the harness
- [ ] Every sub-scene prop has a trimmed cut-out and its rect in scene data; the build-output test passes
- [ ] Depth regions and foreground scenery cut-outs written to scene data, none overlapping a prop rect
- [ ] Exit door rect written to scene data for every sub-scene, and the venue door rect on the overworld matches its building
- [ ] Prompts and judge notes recorded per scene
