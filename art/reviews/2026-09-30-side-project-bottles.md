# Side Project: the bottles rearranged, beers first

**Verdict:** Joe's order, painted by construction in round two; the eleven bottle mattes and the scene data follow it. Workshop acceptance is Joe's, in `art/review.html`. See [asset hashes and checks](2026-09-30-side-project-bottles.json).

## The shelf

- Joe (2026-09-30) put the beers first and added two. Left to right, the row is now:
  - Bud Light, Sapporo, Anchor and Soonhari
  - then Bacardi, Grey Goose, E&J, Camarena, RumChata, Pink Whitney and New Amsterdam.

  Barefoot leaves the shelf.
- Round two, `rounds/round-2-paint.py`, used no model. The stitch proved 0 px changed outside its mask.
  - **Cutting.** Every bottle was cut from the base through its round-one matte.
  - **Relaying the wall.** The wall and shelf top behind the bottles were relaid row by row from the wall either side, including each old base's contact shadow and the pendant cord that hung onto New Amsterdam's old cap.
  - **Placing.** The bottles went back evenly spaced across native x 234 to 950, inside the upper shelf's brackets. Each moved whole pixels and was raised or dropped with the shelf top's slope (about 1 px in 60), so it stands as far into the shelf as it did.
- **Sapporo and Anchor** are the Bud Light longneck, relabelled from logo files (ledger: `references/locations.json`):
  - Sapporo has the gold star over SAPPORO on black, gold bands, and its neck foil and cap turned gold.
  - Anchor has the navy anchor and wordmark on Anchor's yellow, with navy bands.

  Both labels fill the Bud Light's label, bands included, and their outer columns keep the glass's dark edge.
- `install-master.sh 2` re-derived the plate and every matte. The sign, chalkboard and counters were untouched by the round but re-derive with about 0.1 % mean difference (upscaler noise).

## Mattes and scene data

- Each bottle's registration moved with it: `--manifest` reads round one's mattes from commit 8369f0a. Sapporo and Anchor use the Bud Light's matte, and Barefoot's matte and asset are gone.
- `src/lib/scenes/side-project.ts` lists the eleven bottles in shelf order, each rect its new matte's trim.
- The four beers' cards play their homepage videos from `art/sources/videos/beer`. The video plays in the card alone and stops when the card closes.

## Open points

- The brands' "what we did" lines are still placeholders. The spirits' photos or videos are still to come from Joe.
- Three brown longnecks stand side by side; their labels tell them apart.
