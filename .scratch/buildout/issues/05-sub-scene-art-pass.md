# 05: Sub-scene art pass

**What to build:** The five sub-scenes (CS lab, Foundry theatre, Moosylvania lobby, Side Project bar, Brennan's), each 2845 x 1600 world px (the Moosylvania lobby 2400 x 4800, scrolled like the overworld; Joe, 2026-09-28), regenerated through the pipeline in the settled style, with every prop's cut-out and world rect, one or more depth regions per scene, foreground scenery cut-outs and the door and exit door placements written into each scene-data module. The theatre screen gets its idle art and the space the timeline draws into; the posters are three trimmed cut-outs.

**Blocked by:** 02 (pipeline and harness), 03 (the sub-scene modules exist)

**Status:** ready-for-human

- [ ] Tiles at both densities for all five sub-scenes, judged in the harness (tiles done; Joe's harness check remains, see "Ready to close" below)
- [x] Every sub-scene prop has a trimmed cut-out and its rect in scene data; the build-output test passes
- [x] Depth regions and foreground scenery cut-outs written to scene data, none overlapping a prop rect
- [x] Exit door rect written to scene data for every sub-scene, and the venue door rect on the overworld matches its building
- [x] Prompts and judge notes recorded per scene

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

### SLU: the computer science lab, 2026-09-28

The first scene of the pass. **Decisions (Joe):** the scene is the lab itself, not the lobby: an isometric room with four desks in two pairs facing the whiteboard. The whiteboard carries the basis-path-testing graph with node numbers and "V(G) = 3", so the board is lettered. The lit monitor, showing a GitHub-style page, is on the near-left desk, so that the whiteboard (upper left), diploma (upper right, the far right wall) and monitor (lower left) spread across the room. The floor is solid blue carpet.

**Done:** the new native master `sources/slu-fix/stitched.png` (1672 × 941, Codex draft A2 revised as r3 plus one hand fix), installed 4×. The whiteboard, workstation and diploma are measured prop mattes; the lobby cut-outs are gone. `src/lib/scenes/slu.ts` has the measured prop rects, the exit (the blond doors at the far left) and one depth region (horizon 537). The workshop's opening camera (`sceneLayouts.slu.arrival`, 604, 768) is Joe's framing: part of the doors, the whiteboard's graph and part of the lit monitor.

**Walk-behind desks (Joe, 2026-09-28):** the two foreground chairs were dropped. Instead the four desks, each with its monitor, keyboard and chair, are walk-behind scenery: a cursor stepping onto a desk from between the rows is covered by it and cannot use its monitor, one stepping on from the chair side is drawn over it and can. Four measured scenery mattes (`slu-desk-front-left`, `-front-right`, `-back-left`, `-back-right`; front row by the whiteboard) with outlines and front lines in `slu.ts`; the back-left desk holds the workstation. The engine rule is in ticket 19's comment; the workshop previews it (Walk the cursor with the mouse); `tests/sub-scene-geometry.test.ts` checks the data. Record: `art/reviews/2026-09-28-slu-lab.md`.

**Open for SLU:** Joe's workshop acceptance of the assembled scene and of the walk-behind feel; a 2 to 3 px sliver of desk in the monitor matte. The overworld's SLU venue rect is unchanged: the venue's exterior did not change.

### Foundry: a small Alamo auditorium, 2026-09-28

**Decisions (Joe):**
- The theatre is a much smaller room seen from above, so the projector, its beam and the whole screen share one view: the screen will animate the selected title from the projector.
- Isometric like the lab, laid out to read left to right: the three posters to click on the left wall, the screen they play on across the right wall.
- Three rows of seats on stadium tiers with walkways between them, walked round like the lab's desks.
- The picture lights over the posters are painted off, so a hover can light them.
- The whole room is dimmer than the daytime palette.
- The projector turned to face the screen.
- The stairs descend toward the screen like the tiers: the tallest landing beside the projector, one step down at each row, and the floor at the front row and the door. The wall's black border steps down with them in right angles, like a stair profile, and each step's light line meets the wall at its corner.

**Done:**
- The new native master `sources/foundry-fix/stitched.png` (1672 × 941): Codex draft A1, revised as r4, plus three fix rounds (the projector; the stairs, one Codex round, then rebuilt as geometry by a script), installed 4×.
- The three posters and the screen are measured prop mattes. The three rows and the projector ledge are walk-behind scenery; no prop stands on them.
- `src/lib/scenes/foundry.ts` has:
  - the measured props, left to right
  - the exit (the door beside the screen)
  - one depth region (horizon 641)
  - the walk-behind rows and ledge
  - `SCREEN_SURFACE`, the quad the timeline draws into
  - `PROJECTOR_LENS`, where the beam starts
  - `POSTER_LAMPS`, for the hover light.
- The old Codex projector and seat-band cut-outs are gone.
- Record: `art/reviews/2026-09-28-foundry-theatre.md`.

**Open for the Foundry:**
- Joe's workshop acceptance of the assembled scene, the walk-behind rows and the opening camera (`sceneLayouts.foundry.arrival`, a first guess at 1000, 760).
- The overworld's Foundry venue rect is unchanged, since the exterior did not change.

### Side Project: the front bar and its bottles, 2026-09-28

**Decisions (Joe):**
- The ten brands are bottles with their logos on the back bar, not taps (the content inventory, spec and tickets 11, 13, 15 and 19 are amended; the props are `bottle-<brand>`).
- The scene faces the front bar at a slight angle, after the Cellar's photograph of it: the navy wall of bottles fills the picture, with a little of the back bar at the right. The bottles stand out, each with its brand's logo.
- Draft b1 of six: one lit row of ten bottles on the lower shelf, nearly face-on.
- A round sign with the Side Project light-bulb logo on the door of the back bar's cooler, like draft a2's round plaques. Clicking it grants the beer mug (before: any tap).

**Done:**
- The new native master `sources/side-project-fix/stitched.png` (1672 × 941): Codex draft b1 plus one fix round painted by a script (`rounds/round-1-paint.py`): the ten labels repainted from the brands' logo files, and the door sign. Installed 4×.
- The ten bottles, the sign and the chalkboard are measured prop mattes. The front and back bar counters are walk-behind scenery; no prop stands on them.
- `src/lib/scenes/side-project.ts` has:
  - the measured props, left to right (bottles, the sign `brewery-sign` with the beer mug, the chalkboard)
  - the exit (the door at the far left)
  - one depth region (horizon 1140)
  - the walk-behind counters.
- The old Codex tap-bank and stool cut-outs are gone.
- Record: `art/reviews/2026-09-28-side-project-bar.md`.

**Open for Side Project:**
- Joe's workshop acceptance of the assembled scene and the walk-behind counters. The opening camera is Joe's: a phone opens on the Side Project sign (`sceneLayouts['side-project'].arrival`, 2069, 701, the sign's centre).
- The sign's card line and the brands' "what we did" lines.
- The chalkboard is still blank; "stouts and barleywines" could be lettered on it.
- The overworld's Side Project venue rect is unchanged, since the exterior did not change.

### Brennan's: facing the humidor, 2026-09-28

**Decisions (Joe):**
- The camera turns from the centre aisle to the humidor, with larger cigar boxes carrying their labels.
- The ATM leaves Brennan's. Joe will add it to the overworld as a new asset, to give the overworld more interactivity (content inventory and ticket 19 amended).
- Draft b1 of six: the humidor wall nearly face-on, one brand box on an easel at eye level behind each of five glass doors, the STG plaque on the crown.
- New logo files for Punch, La Gloria Cubana and Cohiba (`art/references/local/brands/`, in the ledger).
- An extra café table with chairs, so the room has more furniture a cursor walks in front of and behind.
- The STG plaque stays in the wall's perspective, like the boxes, not squared to the viewer.

**Done:**
- The new native master `sources/brennans-fix/stitched.png` (1672 × 941): Codex draft b1 plus one fix round, installed 4×:
  - the café table and two chairs, a Codex tile
  - the five lids and the plaque's face, repainted from the logo files by a script (`rounds/round-1-paint.py`). La Gloria Cubana's ring lettering is reset larger, since the upscale garbled it.
- The five boxes and the plaque are measured prop mattes.
- The café set and the lounge chair with its coffee table are walk-behind scenery. Their mattes are traced from the pixels with the floor between the legs cut out, and their outlines are convex hulls. The sofa in the lower right corner is foreground. No prop stands on any of them.
- `src/lib/scenes/brennans.ts` has:
  - the measured props (the boxes, each granting the cigar, and `stg-logo`)
  - the exit (the teal front door at the far left)
  - one depth region (horizon 1200)
  - the foreground sofa and the two walk-behind units.

  The ATM prop is gone from the scene data and the inventory test.
- The old Codex casework, humidor-face, ATM and chair cut-outs are gone.
- Record: `art/reviews/2026-09-28-brennans-humidor.md`.

**Open for Brennan's:**
- Joe's workshop acceptance of the assembled scene and the walk-behind furniture.
- The opening camera, `sceneLayouts.brennans.arrival` (1145, 800), is a default on the humidor's centre: a phone opens on the STG plaque over the Macanudo, Partagas and La Gloria Cubana boxes.
- The boxes' and plaque's "what we did" lines.
- The ATM on the overworld: PayPal and Venmo are on no scene until it is placed.
- The overworld's Brennan's venue rect is unchanged, since the exterior did not change.

### Moosylvania: the whole lobby, 2026-09-28

**Decisions (Joe):**
- The lobby works more like the overworld, to show more items: one larger scene to scroll through along the nave of the converted church, from the meeting area behind the front desk, past the front desk and the round sofas, up the stairs to the desks in the loft. It is more overhead but still at an angle, with spaces enlarged where needed. It scrolls like the overworld (spec: its 25 percent push band; tickets 08 and 11 amended).
- Draft t1 of six, the view of Joe's overhead photograph, revised:
  - a bigger loft to scroll past, with loosely arranged desks
  - the area behind the desk running to the bottom edge, with no steps down.
- Props:
  - A mini moose statue on the front desk says what Moosylvania is; its text is Joe's.
  - The meeting TV plays a video Joe will provide, for the visitor who clicks it only (spec: "Local prop, the Moosylvania meeting TV"; ticket 19 amended).
  - The four stack computers live in the loft.
- Fixes on the drafts:
  - the stair tops open onto the loft
  - glass only along the hall into the building, not across the offices' fronts
  - no floating railing
  - the front desk bows out from the glass wall toward the sofas
  - its monitor faces the receptionist
  - the statue sits wholly on the counter.

**Done:**
- The new native master `sources/moosylvania-fix/stitched.png` (887 × 1774, Codex's 1:2 canvas), installed 4×: revision r1a plus three fix rounds of Codex tiles. The world is 2400 × 4800.
- Six measured prop mattes: the four lit computers, the statue and the TV.
- Fourteen walk-behind units: the five loft desks, the lounge armchairs, the moose wall with the TV panel, the two round sofas and their table, and the meeting sofa, table and two armchair pairs. They are traced from the pixels, and their outlines are convex hulls. Each computer stands on its desk and the TV on the wall.
- The reception desk stays in the plate, so the statue is always in reach.
- The two lantern groups are foreground.
- `src/lib/scenes/moosylvania.ts` has:
  - the props, renamed `computer-*` from `desk-*`, plus `moose-statue` and `meeting-tv`
  - the exit (the arched front doors beneath the loft)
  - one depth region
  - the foreground and the walk-behind units
  - `pushBand: 0.25`.
- A scene taller than wide reads its props top to bottom (`readingOrder`, spec amended).
- The old lobby monitors and plant cut-outs are gone.
- Record: `art/reviews/2026-09-28-moosylvania-lobby.md`.

**Open for Moosylvania:**
- Joe's workshop acceptance of the assembled scene and the walk-behind furniture.
- The opening camera, `sceneLayouts.moosylvania.arrival` (1200, 1900), is a default just inside the front doors.
- The statue's text.
- The TV's video file; the scene data gets a video field when it exists.
- The engine (ticket 08) must read `pushBand` and draw the TV's video into its screen.

### Ready to close: checked 2026-09-28

Every room is drawn and every prop placed. Each checklist item was checked against the repo:

- **Tiles:** all five rooms at both densities (24 tiles per density for a 2845 × 1600 room, 50 for the lobby). `art:validate` passes with exact tile coverage (94 assets), and the composites are rebuilt.
- **Props:**
  - All 31 props have a measured matte cut from their room's 4× master: SLU 3, Foundry 4, Side Project 12, Brennan's 6, Moosylvania 6.
  - Each matte's trim equals the prop's rect in scene data to within 0.5 world px, and no matte is left without a prop.
  - All 60 interior mattes (props, walk-behind scenery and foreground) are 1:1 with their masters (mean difference 0.00/255).
  - `npm test` passes 24 of 24, with one todo for the overworld ATM (ticket 25), including the build-output test.
- **Depth and foreground:**
  - One depth region per room.
  - The foreground is Brennan's sofa and the lobby's two lantern groups; the geometry test holds them clear of every prop rect.
  - Each of the 26 walk-behind units is a scenery matte.
- **Exits and doors:**
  - Every room has its exit rect.
  - On the overworld master, the five door venue rects frame their buildings: the church, the Cellar, Brennan's, McDonnell Douglas Hall and the Foundry. No exterior changed in this pass.
- **Prompts and judge notes:**
  - Each `<scene>-master/prompt.txt` carries its derivation chain, and each room has a review record dated 2026-09-28, after the 2026-09-25 analysis.
  - All 75 asset and native-master hashes in the records match the files.

**Fixed while checking:** the SLU workstation matte. On a checkerboard it held a strip of wall, wedges of desk and a corner of the chair behind the monitor, not just the sliver noted above. It is now the monitor alone, still 1:1 with the master; its rect is 793,1021 284 × 239. The record is `art/reviews/2026-09-28-slu-lab.md`.

**Fixed after the code review:**
- **Scenery over props:** five props' rects reached behind other scenery: the SLU whiteboard and workstation, the lobby's backend computer and meeting TV, and the Foundry screen. A cursor hidden behind that scenery could still hover them. Each now has a clip-path, its rect less that scenery's outline.
- **Side Project:** the exit stops at the front bar's counter top, and the two counters are listed back to front.
- **Front lines:** the lobby's round sofas and meeting armchairs, and Brennan's lounge, now run up the side facing their table, so stepping on from the table is from in front.
- **Tests:** the geometry tests check every prop's hit area and the exit against every walk-behind outline, and the draw order of overlapping cut-outs. The build-output test states the reading order itself instead of calling the code it checks.

The review records carry the details.

**Why ready-for-human:** as with ticket 04, the harness check is Joe's. Serve the repo (`python3 -m http.server 4174 --bind 127.0.0.1`) and open `art/review.html`. For each room, check:
- the assembled scene against its master
- the walk-behind feel, by ticking Walk and stepping onto furniture from either side
- the phone frame at the opening camera.

The opening cameras for SLU (604, 768) and Side Project (2069, 701) are Joe's. The Foundry (1000, 760), Brennan's (1145, 800) and Moosylvania (1200, 1900) cameras are defaults to adjust there. Then tick the first item and resolve the ticket.

**Moved out of this ticket.** None of these is art for this pass, and each now has an owner:
- **Card copy:** the statue's text, the "what we did" lines for the boxes, plaque and bottles, and the Side Project sign's line. These are rows in the content inventory, checked in the launch content review (24).
- **The meeting TV:**
  - The video file is Joe's (content inventory); the scene data gets a `video` field when the file exists.
  - Playback and its card are in ticket 15's comment; the playlist duck is in ticket 21's.
- **The lobby's 25 percent push band:** ticket 08's checklist.
- **The walk-behind engine rule:** ticket 19.
- **The ATM that left Brennan's:** new ticket 25, waiting on Joe's placement.
- **Optional:** lettering "stouts and barleywines" on the Side Project chalkboard, one tile round, if Joe wants it.
