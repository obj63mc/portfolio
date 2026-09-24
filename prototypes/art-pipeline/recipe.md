# Art pipeline prompt recipe (PROTOTYPE, throwaway)

Answers ticket 07: can ChatGPT and Nano Banana hold the old Moosylvania flat vector style across a district and a sub-scene, and cut props cleanly enough for the canvas pipeline in ADR 0002?

Run every prompt in **both** tools. Save each output under `assets/` with the filename given, so `review.html` can load the folder in one go. Record which tool produced the kept version.

## 0. Style reference and style paragraph

Collect two or three screenshots of the old Moosylvania site (Wayback Machine) into `reference/`. Attach them to every prompt as reference images. Do not commit them unless the repo is private; they are style references only, never assets.

Paste this paragraph at the top of every prompt, unchanged. Consistency across assets comes from repeating it verbatim plus the same reference images, not from seeds (the ChatGPT app exposes none).

> STYLE: Flat vector illustration in the style of the attached reference screenshots. Layered flat shapes, no gradients, no outlines, no texture, no drop shadows. Warm palette led by cream, mustard, terracotta, olive and a teal accent; take the exact hues from the reference. Slightly elevated three-quarter view, like looking down a street from a second-floor window. One light source, upper left. Clean hard edges, simple rounded geometry, generous negative space. No people, no animals, no text and no lettering unless the prompt names it. Nothing photographic.

If a tool drifts (adds outlines, gradients, or a different camera angle) restate the failing rule at the end of the next prompt in capitals rather than rewriting the paragraph.

## 1. Maplewood district background

Filename: `assets/maplewood.png` (convert to `maplewood.webp` in step 5).

Always attach `ref-scene-0-arrival-mock.png` to this prompt: it is the only reference that shows the real office.

Target: 1400 x 1000 world px, the district footprint from the layout ticket. Generate at the largest landscape size the tool offers (ChatGPT 1536 x 1024; Nano Banana at 3:2, Pro at 2K if available). Desktop draws at 1.0 render scale, so a 1536 px wide image is about 1.1 image px per world px: sharp at DPR 1, soft at DPR 2. The review harness measures this; if soft, test a 2x upscale (step 5) and judge whether flat shapes survive it.

> STYLE paragraph.
>
> SCENE: A two-block stretch of Marietta Avenue in Maplewood, St. Louis, on a flat, single-colour ground plane that runs off every edge of the image with nothing on it near the edges (the ground colour must be one exact flat fill, because neighbouring scenes are composited onto it). Right of centre: the Moosylvania office, which is the real building shown on the right of `ref-scene-0-arrival-mock.png` and must be drawn faithfully from it: a dark red-brown brick converted church with a tall pointed gable front, a large arched window with vertical cream mullions, two square corner towers with cream caps, a smaller arched entrance reached by a wide flight of steps, and a small side wing. Leave a clear empty patch of ground in front of it, about a fifth of the image wide, where a sign and a moose will be placed later. Left of centre, across the street: a narrow taproom with a dark facade and a small patio, Side Project Cellar. A row of small shop fronts behind. Street trees, a few parked bikes, a painted crosswalk. At the far left edge, a decorative neighbourhood entrance sign in the shape of the real Maplewood sign, but with NO lettering on it. Leave the sky as a flat band of colour, no clouds. No door drawn in the church entrance: leave a plain arched door-shaped gap of the wall colour where the door goes.

Then, in the same conversation, the two edits below (Nano Banana is stronger at edits with the prior image attached):

> Same image. Extend the flat ground colour to fill all four edges completely, remove any object touching an edge.

> Same image. Make the empty patch in front of the agency building fully clear: no bench, no tree, no bike there.

> Same image. Remove ONLY the street tree in the planting bed on the sidewalk just left of the church lawn; the signpost stands there instead.

## 2. Moosylvania lobby interior (sub-scene)

Filename: `assets/lobby.png`.

Target: 2845 x 1600 world px, 16:9. Generate at the largest 16:9 the tool offers; a 1536 x 1024 output needs about 1.85x upscale. This asset is where resolution bites hardest; judge it in the harness at 1.0 scale and DPR 2.

> STYLE paragraph.
>
> SCENE: The interior of a small creative agency lobby, wide view, same camera angle as the exterior. Four identical plain desks in a loose row, each with a monitor showing a blank single-colour screen, no keyboards or clutter. A large flat wall behind them in the terracotta from the palette, with a clear empty rectangle on it where a sign will hang later. A reception counter at the left. An exit door at the far right edge, drawn as a plain door-shaped gap in the wall colour with no door in it. A flat floor colour across the whole bottom edge. No text anywhere. Same palette and shape language as the reference screenshots.

Edit if needed:

> Same image. Remove all lettering and all posters. Keep the wall rectangle empty.

## 3. Three cut-out props (static)

The tools do not reliably emit transparency, so ask for a solid keyable background and key it out in step 5. Magenta (`#FF00FF`) is safest because the palette has no magenta; green clashes with the olive.

Each prop: same paragraph, same reference images, plus the Maplewood output attached as a second reference so scale and angle match. Target sizes are in world px so the prop sits right on the background at 1:1; ask for the object to fill the frame and scale in the harness.

**Signpost**, `assets/signpost.png`, about 180 x 260 world px:

> STYLE paragraph. Attach the Maplewood image as a second reference for angle and palette.
>
> OBJECT: A wooden fingerpost signpost with five directional arrow boards at different heights pointing left and right, and a small square board at the bottom. All boards blank, no lettering. The post stands on a small flat patch of the same ground colour as the reference scene. Centered, filling most of the frame, on a solid flat #FF00FF magenta background. No shadow on the magenta.

**Moosylvania welcome sign**, `assets/welcome.png`, about 260 x 200 world px:

> STYLE paragraph. Attach the Maplewood image as a second reference.
>
> OBJECT: A freestanding agency welcome sign: a wide rounded rectangle board on two short posts, in the mustard from the palette with a teal border. The board is blank, no lettering. Centered on a solid flat #FF00FF magenta background. No shadow on the magenta.

**Moosylvania door**, `assets/door.png`, sized to the church's arched door gap (about 95 x 85 world px at a 1400 footprint, nearly square). Attach a crop of the church entrance from the Maplewood image so the shape matches; a single tall door covers under half the gap.

> STYLE paragraph. Attach the church entrance crop.
>
> OBJECT: A pair of closed double doors that exactly fill that arched doorway: two doors side by side meeting in the middle, each in the teal from the palette with a tall glass panel and a lower flat panel, a thin cream frame, and a shallow arched top that together follows the doorway's arch. The overall shape must be almost square, about 1.1 wide to 1 tall, seen straight on at the same angle as the doorway in the crop. Doors only: no wall, no brick, no steps. Centered on a solid flat #FF00FF magenta background. No shadow on the magenta.

## 4. The moose in four parts (the hard ask)

ADR 0002 needs moving props as separated transparent layers with a pivot each: body, head, antlers, eye. First generate the whole moose as the master, then derive each part from it so the parts match.

**Master**, `assets/moose-master.png` (reference only, not loaded by the harness):

> STYLE paragraph. Attach the Maplewood image as a second reference.
>
> CHARACTER: A friendly cartoon moose standing in side view facing right, four legs, a plain brown body, a lighter muzzle, one visible large round eye with a white and a dark pupil, and broad flat antlers. Simple shapes, no outlines. Centered on a solid flat #FF00FF magenta background. No shadow on the magenta.

Then, attaching the master as the reference, one prompt per part. Same size and framing each time so parts line up in the harness with little nudging.

`assets/moose-body.png`:

> Same moose, same size, same position in the frame. Show ONLY the body, legs and neck. Remove the head, antlers and eye entirely; end the neck with a flat cut. Solid #FF00FF background.

`assets/moose-head.png`:

> Same moose, same size, same position in the frame. Show ONLY the head and the top of the neck, including a short extra length of neck below the head so it can overlap the body. Remove the body, legs, antlers and the eye (fill the eye socket with the head colour). Solid #FF00FF background.

`assets/moose-antlers.png`:

> Same moose, same size, same position in the frame. Show ONLY the antlers, including their short base stubs where they meet the skull. Remove everything else. Solid #FF00FF background.

`assets/moose-eye.png`:

> Same moose, same size, same position in the frame. Show ONLY the eye: the white and the dark pupil, nothing else. Solid #FF00FF background.

Expect this step to need the most retries. Note every retry and every minute of manual repainting: that number decides the go or no-go more than anything else.

## 5. Keying, upscaling and WebP

ImageMagick and cwebp are installed. Run from `prototypes/art-pipeline/assets/`.

Key out magenta and write WebP (adjust `-fuzz` up if magenta specks remain, down if palette colours vanish):

```sh
for f in signpost welcome door moose-body moose-head moose-antlers moose-eye; do
  magick "$f.png" -fuzz 10% -transparent '#FF00FF' -trim +repage "$f.webp"
done
```

If the harness reports a magenta fringe, erode the edge before keying:

```sh
magick moose-head.png -fuzz 10% -transparent '#FF00FF' -channel A -morphology Erode Diamond:1 +channel -trim +repage moose-head.webp
```

Backgrounds, lossy WebP at quality 85, and a 2x upscale candidate to compare in the harness:

```sh
cwebp -q 85 maplewood.png -o maplewood.webp
magick maplewood.png -filter Lanczos -resize 200% maplewood@2x.png && cwebp -q 85 maplewood@2x.png -o maplewood@2x.webp
cwebp -q 85 lobby.png -o lobby.webp
```

Load either the `.png` or `.webp` into the harness; it reads both. Record file sizes: the overworld will hold five districts plus scenery, so a 1400 px district over about 400 KB is a warning sign for the phone.

## 6. Judge in the harness

Open `review.html` in a browser (double-click). Load the `assets/` folder. Work the tabs in order: Assets, Style, Scene, Moose, Verdict. The Verdict tab writes the answer block for the ticket.
