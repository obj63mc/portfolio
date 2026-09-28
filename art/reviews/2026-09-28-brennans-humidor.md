# Brennan's: facing the humidor

**Verdict:** the composition, the logos and the added café table are Joe's calls, and the props, walk-behind furniture, foreground sofa and scene data are measured from the result. Workshop acceptance of the assembled scene, the walk-behind feel and the opening camera is still Joe's, in `art/review.html`. See [asset hashes and checks](2026-09-28-brennans-humidor.json).

## Composition

- Joe turned the camera from the view down the centre aisle to the humidor, and asked for larger cigar boxes with their labels. The ATM leaves the room: Joe will add it to the overworld as a new asset (content inventory, 2026-09-28).
- Six Codex drafts tried two cameras, each with the five brand boxes in one row (the STG plaque on the humidor's crown) or in a grid of two rows of three glass doors (the plaque behind the sixth):
  - three true isometric cutaways (a), in the camera of the SLU lab and the Foundry
  - three gentle three-quarter views nearly face-on to the humidor wall (b), the camera of the Side Project bar.
  The references were Brennan's humidor photograph (`08.jpg`), its room photograph (`06.jpg`), the approved Side Project or SLU master for rendering, and a local sheet of the five cigar logos and the STG mark.
- Joe chose **b1**:
  - the red-brick humidor wall seen nearly face-on, the humidor built into it with five glass doors, one brand box on an easel at eye level behind each
  - the STG plaque on the crown
  - Brennan's teal front door at the far left
  - the cream lounge chair, the coffee table and the caramel banquette with its two tables at the right, below the teal bookshelves.
- The native master is Codex's own 16:9 canvas, 1672 × 941, unresized.

## Round one: the café table, the lids and the plaque

It pasted inside its masks, and the stitch proved 0 px changed outside them.

- **Café table** (Joe: more objects in depth for the cursor to walk in front of and behind). A Codex tile on the open floor in front of the humidor: a square cream table on a dark pedestal, with a candle and a sprig in a vase, and two bistro chairs with caramel seats turned toward it, matching the banquette tables. Attempt b of four was kept: its chairs face the table, and the floor's sunlight stripes run on behind them. Its drift outside the repaint area is 4.5, inside the stitch's limit.
- **Lids**, painted by construction in `rounds/round-1-paint.py`. Each lid is repainted from the brand's logo file: the face laid out flat at 8× on the draft lid's own ground, then warped onto its quad, since the boxes lean back on their easels.
  - Cohiba is the wordmark Joe supplied (`cohiba-new.svg`; the first file looked off). Its letters take the page's colour, so they are drawn white with the red O, straight on the black lacquer as on the real boxes, in place of the draft's cream label.
  - Punch is Joe's new crest (`punch-new.svg`), without REAL FABRICA DE TABACOS and EST. 1840, which are under 4 px on a lid.
  - Macanudo drops MONTEGO Y CIA and Partagas drops Y NADA MÁS, for the same reason.
  - La Gloria Cubana is Joe's new emblem (`lgc.png`). A test upscale turned its ring lettering (about 5 px) into LA OLODIA CUBANS, and thickening it made no difference. The letters and the two thin rims either side of them are cleared to the band's yellow. LA GLORIA CUBANA is set along the ring in Futura Condensed ExtraBold, across the band's full width (caps about 7 px on the lid), LA before the feather and GLORIA CUBANA after it, as on the logo. The lady's feather, cape and hand go back over the band. It reads after the upscale.
- **Plaque.** A first pass repainted it level. Joe pointed out that the draft had drawn it in the wall's perspective, since the wall recedes a little to the right, and it should stay in line with the wall like the boxes. It keeps the draft's frame. Its face is warped onto the draft face's quad like a lid, with STG's lion mark and red bar over the wordmark.
- `install-master.sh 1` upscaled the master 4× to 6688 × 3764 and re-derived the plate.

## Props, walk-behind furniture and scene data

- The Codex casework, humidor-face, ATM and chair cut-outs of the old master were removed.
- **Six props**, measured mattes on the native master (`deriveFrom` plus `registration.mask`), each crop 1:1 with the 4× master, where each differs from it by 0.00/255: the five boxes (each lid quad and the box's edge, clear of the easel and the lit shelf) and the plaque (the draft's frame quad, in perspective).
- **Two walk-behind units:**
  - `brennans-cafe`: the café table and its two chairs
  - `brennans-lounge`: the lounge chair with the coffee table, its plant, books and candle.
  Their mattes are traced from the pixels, since polygons drawn by eye would include the floor between the legs, where a cursor behind them would vanish.
  - The new furniture was separated by its difference from the draft, and the lounge by colour (the rug's teal, the floor's warm grey).
  - The chair backs are painted in the humidor doors' own brown, so they were drawn by hand.
  - Each matte is one polygon, as a registration mask must be: the outer contour with its holes (the floor between the legs) joined by zero-width slits, simplified to about ¾ px.
  - The outline, where a cursor counts as on the unit, is the unit's convex hull, so a cursor keeps its side until it steps off the whole piece and shows between the legs when behind. The front line runs through the front feet, and for the lounge up its right end (below).
- **One foreground cut-out,** `brennans-sofa`: the leather sofa cut by the lower right corner. Its feet are below the frame, so a cursor is always behind it. It covers no prop.
- **Scene data** in `src/lib/scenes/brennans.ts`:
  - the props, left to right: the five boxes, each granting the cigar, and the STG plaque
  - the exit is the teal front door at the far left, 0,94 378 × 1148
  - one depth region, with the horizon at the humidor's base (1200)
  - the sofa as foreground and the two walk-behind units
  - `sceneLayouts.brennans.arrival` is (1145, 800), the humidor's centre. The first phone frame shows the STG plaque over the Macanudo, Partagas and La Gloria Cubana boxes, with the café set below them. This camera is a default for Joe to adjust.
- **Tests:** a Brennan's test checks:
  - five boxes in one row on one shelf, none overlapping
  - the cigar granted by the boxes alone
  - the plaque above the boxes and within their span
  - the furniture below the shelf
  - the door left of the humidor
  - no ATM in the room.

  The inventory test no longer lists `atm` until it is placed on the overworld.

## Open points

- The ATM (PayPal and Venmo) is on no scene until Joe places it on the overworld.
- The boxes' and plaque's "what we did" lines are placeholders for Joe.
- La Gloria Cubana's ring lettering is reset in Futura rather than the logo's own letterforms, and its thin inner rims are gone. At lid size this is the price of legibility; the emblem is otherwise Joe's file.
- The banquette tables are left in the plate, not walk-behind.

## After the code review, 2026-09-28

The lounge's front line ran flat to the right edge at the rug, below where its outline rises toward the sofa. A cursor stepping onto the coffee table from the open rug on its right counted as behind it. The line now follows the outline's lower edge up that end. The chair's back, on the left, still counts as behind. A test checks both.

Validation: `art:validate` PASS (77 assets), `art:check`, `art:test` (3), `svelte-check` (0 errors), production build, `npm test` 22/22.
