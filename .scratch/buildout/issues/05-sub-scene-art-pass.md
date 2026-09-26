# 05: Sub-scene art pass

**What to build:** The five sub-scenes (CS lab, Foundry theatre, Moosylvania lobby, Side Project bar, Brennan's), each 2845 x 1600 world px, regenerated through the pipeline in the settled style, with every prop's cut-out and world rect, one or more depth regions per scene, foreground scenery cut-outs and the door and exit door placements written into each scene-data module. The theatre screen gets its idle art and the space the timeline draws into; the posters are three trimmed cut-outs.

**Blocked by:** 02 (pipeline and harness), 03 (the sub-scene modules exist)

**Status:** needs-info

- [ ] Tiles at both densities for all five sub-scenes, judged in the harness
- [ ] Every sub-scene prop has a trimmed cut-out and its rect in scene data; the build-output test passes
- [ ] Depth regions and foreground scenery cut-outs written to scene data, none overlapping a prop rect
- [ ] Exit door rect written to scene data for every sub-scene, and the venue door rect on the overworld matches its building
- [ ] Prompts and judge notes recorded per scene

## Comments

### Analysis of the existing interiors, and the overworld's fix loop for them, 2026-09-25

**What exists.** The five masters (2048 × 1152 Codex images of 2026-09-24, from the location photos in `art/landmarks.md`) are strong compositions in the settled style: the Moosylvania church studio, the McDonnell Douglas Hall lobby with the lab behind glass doors, the Alamo auditorium, the Side Project Cellar bar and the long Brennan's room. Cut-outs: four lobby monitors and the lobby plant; the SLU diploma, workstation and chair; the Foundry projector and seat band; the Side Project tap bank and stool; the Brennan's casework, humidor glass face, ATM and chair. The five scene-data modules (`src/lib/scenes/<scene>.ts`) are still placeholders: invented prop rects, the same exit rect `{100, 1000, 120, 220}` and one depth region (horizon 500) in every scene, no foreground.

**Iteration (done in this pass).** The interiors could not be changed the way the overworld was:
- Each plate was a Codex clean-plate redraw of the whole room with the props removed. Every edge had drifted a pixel or two from its master (mean absolute error 2 to 8 %), and any fix would have meant another whole-room redraw.
- The masters' lossless PNGs lived only in ignored `art/sources/`.
- The fix tools were wired to the overworld's paths and its 1983 × 793 size.

Now every interior works like the overworld. `art/sources/<scene>-fix/stitched.png` is the committed native master. `<scene>-master` is its 4× Real-ESRGAN upscale (8192 × 4608), and the plate derives from it (`deriveFrom`, as the overworld's does), so objects stay painted in and cut-outs draw over their own pixels. `tiles.py`, `tile-manifest.py`, `edit-api.sh` and `install-master.sh` take `SCENE=<scene>`:
- The interior grid is 4 × 3 tiles of 512 px.
- Prompts describe a room interior. The overworld prompts are byte-identical to before.
- The install re-derives every asset the manifest derives from the master, and lists any Codex extraction whose crop a round changed.

Proven with a throwaway Foundry round (prepare, an identity model tile, stitch with 0 px changed, the Codex manifest and a dry run, `detect-master` on a marked copy). The overworld was also reinstalled through the generalized script, and every image and tile was byte-identical. Record: `art/reviews/2026-09-25-interiors.md`.

**Structural findings for the prop pass:**
- Every interior cut-out except the SLU chair and the third lobby monitor (measured mattes of the master) is a Codex redraw; the humidor glass face is a matte of the Codex casework. Each covers its painted original at scene scale, but none matches it pixel for pixel: the taps sit a few pixels up and left, the diploma frame is drawn larger, and the Brennan's casework holds a different bottle layout. Convert them to measured mattes as on the overworld, or re-extract them after the art changes below.
- The Foundry seat band is one foreground cut-out over x 0 to 2570, y 724 to 1600, about half the room. Every cursor vanishes behind it anywhere in the seating. Limit foreground to the front row or two, or drop it.
- The lobby monitors are 73 to 192 world px and the Brennan's ATM is a 29 × 133 px sliver on the brick wall. At the phone's 0.6 scale they are hard to find and to hit.
- Doors: only Brennan's (the front door at the far end) and SLU (the glass entry at the far left) paint a plausible exit. The lobby, the Foundry and Side Project need one drawn.

**Story gaps against the content inventory** (what the tour has to show, scene by scene):
- **Moosylvania lobby** (2011 to present, Chief Architect): a handsome studio with nothing that says Moosylvania (no moose, no mark). The four desks (frontend, backend, CMS, data) are four identical teal monitors.
- **SLU** (BS Computer Science with Honors, 2005): reads as a modern lobby, not a CS lab. The diploma is a generic framed sun-and-bars picture. There is no whiteboard for the senior project (basis path testing); the dark wall display is the obvious candidate.
- **Foundry** (Universal Pictures Home Entertainment): the three posters (Fast Five, Snow White and the Huntsman, The Lorax) are not painted anywhere. The screen is plain cream with no idle state, and the orange wall panels between the sconces are the natural poster wall. This room is also the darkest palette of the six.
- **Side Project** (ten alcohol brands, favourite brewery): about a dozen identical chrome faucets on one bank, where the inventory wants one tap per brand (ten). The chalkboard on the cooler is blank; "stouts and barleywines" belongs there.
- **Brennan's** (five cigar brands, STG, PayPal and Venmo): the humidor case is mostly wine bottles with four cigar boxes. It needs five brand boxes and the Scandinavian Tobacco Group logo. The ATM is not readable as an ATM.

**Decisions for Joe before the next rounds:** the story beat and identity element for each room (moose mark, SLU accent, brand tap handles and boxes, whether brand names and logos are painted or only named in cards), lettering where wanted (the chalkboard; poster titles, though the spec tells the Universal titles' story on the screen only, with the text under the posters in the accessible layer), the Foundry foreground, and where each exit door goes. Each change is then a tile round on that scene's `stitched.png`; mark a scene's first round on a copy of the whole master (`tiles.py detect-master`), since its grid tiles are only written by a stitch. Status is needs-info until those calls are made.
