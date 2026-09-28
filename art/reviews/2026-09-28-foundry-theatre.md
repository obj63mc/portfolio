# Foundry: a small Alamo auditorium

**Verdict:** the composition, the projector's direction and the stairs are Joe's calls, and the props, walk-behind rows and scene data are measured from the result. Workshop acceptance of the assembled scene, the walk-behind rows and the opening camera is still Joe's, in `art/review.html`. See [asset hashes and checks](2026-09-28-foundry-theatre.json).

## Composition

- The Foundry scene is now a small auditorium, not the large house of 2026-09-24: small enough that the projector, the air its beam crosses and the whole screen share one view, since the screen will animate the selected title from the projector. Six Codex drafts tried two cameras: four true isometric cutaways (A, in the SLU lab's camera) and two raised views from the back of the room (B). Joe chose **A1** because it reads left to right: the posters to click on the left wall, the screen they play on filling the right wall. The exit door with its green sign is on the left wall beside the screen, and the projector is on a railed ledge at the lower left.
- A1 was revised with Joe's fix list, A1 as the final composition reference, the Alamo auditorium photo for the stadium steps and draft A2 for the colour of its floor light strips. Joe chose **r4** of four for its seating:
  - three rows on stadium tiers, with no lines on the floor between them
  - turquoise step lights
  - the picture lights over the posters switched off, so a hover can turn them on
  - the whole room dimmed; Joe asked for dimmer lighting, a departure from the bright daytime palette.
  Asking for half the brightness came out no darker than a third: r2 was darkest at 27 % below A1, r4 about 21 %.
- The native master is Codex's own 16:9 canvas, 1672 × 941, unresized.

## Fix rounds

Each round pasted inside its mask, and the stitch proved 0 px changed outside it.

- **Round one, the projector.** Joe: it did not point at the screen; turn it 90° counter-clockwise. Its lens faced down-right, along the screen wall. One Codex tile, attempt a of four, turned it: the long body now runs up-right, and the lens barrel pokes above the railing toward the screen. The first seat of the back row, partly hidden behind the old lens, was completed.
- **Rounds two and three, the stairs.** Joe: the stairs went the wrong way, up toward the screen, while the seats beside them step down toward it. They should run from the tallest landing beside the projector, a step down at the back row, another at the middle row, and the lowest step, the floor, at the front row and the door.
  - Round two: Codex's first four attempts kept a riser face under every step, which reads as climbing. Told the change as 2D shapes instead (erase the riser bands, shade beyond each strip, step the skirting), attempt g of four more descended the right way. It came back uniformly about 17 levels brighter, so it was tone-matched (a per-channel gain and offset fitted outside the mask) before pasting.
  - Round three, because g's strips sat where the old ones had been. A first hand-painted version inpainted the old strips and stepped only the carpet's line under a straight wall edge. Joe found artifacts beside the seats and an inconsistent join to the wall.
  - He asked for the wall's black border to step down in right angles like a stair profile, after his reference: a flat stair-step silhouette, one straight section per level, the next just below it, with the blue lines meeting the wall at the right angles.
  - Round three was then rebuilt as geometry by `rounds/round-3-paint.py`, replacing everything in the aisle:
    - four levels 10 px apart, about the height of a seat tier's end face
    - the black border keeps its painted 22 px height and steps down one level at each drop, its sections straight along the wall and its drops vertical, each drop's end given the border's rim
    - each glowing edge runs along its row's tier-edge line (the row's lower edge carried up to the wall), from the right-angle corner where that line meets the upper level's floor line: (15, 514) for the landing, (203, 463) for the back row, (466, 411) for the middle row
    - edges drawn at 4×, with a 13 px shadow on the lower tread.
  - The treads are carpet: a colour plane fitted to the plain carpet around the aisle, plus the floor's own departure from that plane carried in from the aisle's edge, so the repaint meets the floor around it without a seam, and the carpet's fine pattern taken from open floor.
  - The mask is grown 4 px round the floor, and only floor-coloured pixels are repainted inside that margin, so the new carpet reaches the seats' own edges and no old floor is left beside them.
  - The landing's corner falls near the picture's left edge, because the back row's tier edge meets the landing's floor line there; the landing itself shows as the floor beside the projector ledge.
- The fix folder keeps, as the overworld's does, the round specs, the Codex tile manifests and the last round's working set, plus `rounds/base-2.png`, which the round-three script reads for the border's profile. Earlier bases and tiles are not kept; the Codex attempts stay local and ignored.
- `install-master.sh 3` upscaled the master 4×, to 6688 × 3764. Its stale-extraction check needs Pillow, which the system `python3` lacks, and it stopped before `art:validate`, which was then run by hand. The Foundry has no Codex extractions left for that check to list.

## Props, walk-behind rows and scene data

- The Codex projector and seat-band cut-outs of the old master were removed.
- **Four props:**
  - The three posters and the screen are measured mattes, polygons on the native master (`deriveFrom` plus `registration.mask`), each crop 1:1 with the 4× master.
  - Each poster's matte includes its picture light and the strip of wall between them. The screen's matte is its ivory surface grown by 3 px.
  - In `src/lib/scenes/foundry.ts` the props read left to right: Fast Five 247,187 262 × 507; Snow White and the Huntsman 543,129 245 × 474; The Lorax 822,70 225 × 454; the screen 1656,85 1016 × 833.
- **Walk-behind scenery:**
  - The three seat rows (`foundry-row-front`, nearest the screen, `-middle`, `-back`) and the projector ledge with its projector are scenery mattes. No prop stands on them.
  - Each row was traced from the carpet gaps around it and simplified to about 60 points. Each row's front line is its lower edge; the ledge's is the foot of its right face.
  - The ledge's outline takes in the projector's lens barrel above the railing. The back row's matte stops at the ledge, which stands in front of its first seats.
  - Listed back to front, the draw order.
- **Registration:** composited over the 2× plate, the mean difference per cut-out is 0.4 to 1.1/255 for the screen, rows and ledge, and 2.3 to 3.3/255 for the posters. That is only resampling of their fine detail; there is no offset.
- **Screen and projector data** in `foundry.ts`:
  - `SCREEN_SURFACE` is the screen's painted quad, the space the timeline draws into. It is not a rectangle, and not a parallelogram: its bottom edge falls more steeply than its top.
  - `PROJECTOR_LENS` is the end of the lens barrel, where the beam starts.
  - `POSTER_LAMPS` holds the three picture lights, painted off.
- **Exit, depth and camera:**
  - The exit is the door, 1198,233 158 × 420.
  - One depth region, with the horizon at the back-corner floor line (641).
  - No foreground scenery.
  - `sceneLayouts.foundry.arrival` is (1000, 760), a first guess at the opening camera. The first phone frame shows the Lorax poster, the exit door, the top step of the aisle and the rows.
- **Tests:**
  - `tests/sub-scene-geometry.test.ts` now also checks that no walk-behind scenery covers a prop it doesn't carry, in every scene.
  - A Foundry test checks: posters left to right before the screen, each lamp at the top of its poster, the screen surface inside the screen's rect, and the lens on the ledge down-left of the screen.
  - The build-output clearance test takes the cards in their new document order.

## Open points

- The opening camera is a first guess; Joe sets it in the workshop, as for SLU.
- The poster art is a flat rendition of each film's poster with its title lettered, and no real faces. Whether titles are painted was left open in issue 05.
- A faint glow shows where the back row's step light meets the ledge's railing corner.
- As in the lab, the depth factor shrinks a cursor toward the back corner although the isometric room draws the rows the same size.

## After the code review, 2026-09-28

The screen's rect reaches down past the screen to the floor, where the front row's seat backs are painted. A cursor behind those seats would have been hidden while still over the screen's button. The screen now has a clip-path: its rect less the front row's outline, 1.5 px clear, 99.7 % of the rect. A geometry test checks that no walk-behind outline covers any part of a prop's hit area.

Validation: `art:validate` PASS (60 assets), `art:check`, `art:test` (3), `svelte-check` (0 errors), production build, `npm test` 20/20.
