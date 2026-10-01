# Every scene: the cut-outs' delivery sizes

**Verdict:** accepted on the measurements and the site screenshots below, read in headless Chrome. Joe's own look on a phone and a Retina screen is still to come: hover a prop in each scene and walk behind the furniture.

Joe (2026-09-30), from production: the site hangs at times, on the CPU or the network, while the image assets stream down.

Measured on production as a 390 × 844 phone on slow 4G (1.6 Mbit/s, 150 ms): the overworld's first load fetched 5.0 MB of images over 28 s, and about 4 MB of that was cut-outs. A hop into a venue streamed 2.4 to 4.3 MB over 13 to 22 s, and its iris opened on the bare backdrop after its 800 ms wait. The site fetched each cut-out's lossless original, up to eleven times the pixels it draws (the bike, 1167 px for a 100 world px prop), decoded it whole and resized it in the browser: 48 MB of decoded pixels for the overworld, 100 MB for the Foundry.

- **The change.** `scripts/art/deliver.ts` writes `1.25.webp` and `2.webp` beside each cut-out's `image.webp`, and the site fetches only those. The originals, the masters, the plates, the tiles and every world rect are untouched; no model drew anything.
  - Size: the cut-out's world rect times the density, or a rig part as its rig is fitted into its `sceneLayouts` rect; never larger than the original (the bridges and the lobby's cut-outs at 2× are delivered at their own size).
  - Resize: Lanczos, as the tiles are cut.
  - Encoding: over 256 × 256 px, lossy at quality 90 with sharp chroma and exact alpha; at or under it, lossless. 112 are lossy, 76 lossless.
- **Bytes.** The 94 cut-outs' originals are 13.7 MiB; their deliveries are 2.4 MiB at 1.25× and 3.2 MiB at 2×. The overworld's went from 3.9 MiB to 0.42 and 0.63 MiB, each interior's from 1.3 to 2.4 MiB to 0.26 to 0.67 MiB.
- **Fidelity,** each delivery against a lossless Lanczos resize of its original to the same size, both over the path's cream:
  - Alpha is identical in all 188, so every silhouette is its original's.
  - The 112 lossy ones: PSNR 37.1 dB at worst (`brennans-box-la-gloria-cubana` at 2×), 45.8 dB at the median.
  - The first pass encoded every one lossy, and the small ones read worst: the rider's pedal frames at 32 to 35 dB, the thin blue tubes of its frame softened at 5× magnification. Those are now lossless.
- **On the site,** the build before against the build after, still frames under reduced motion at 1440 × 900 at 2× and 1× and at 390 × 844 on a phone, 42 frames: the overworld at the welcome board and centred on each district, the Foundry, MonsterCommerce and SLU, and the five interiors where a hop lands.
  - PSNR 45.8 dB at worst (the Foundry at 1×), and at most 44 px of a 5.2 million px frame differ by more than 8 %.
  - The MonsterCommerce eye, which the site splits into its ball and iris by colour, reads the same at 3× magnification; the signpost, the welcome board and the moose read the same at their own size.
  - Not read: a hovered prop's glow, the bottles' glint and the posters' lamps, which are drawn from the same bitmaps; a cursor behind walk-behind scenery, which `tests/river.spec.ts` covers for the bridges and `tests/props.spec.ts` for an SLU desk.
- **Checks.** `art:check`, `art:test` (5, one new for the delivery sizes) and `art:validate` (110 assets) pass; `npm run ci` passes (240, 1 todo); the Playwright suite passes but for the river's float to the bottom edge, which fails in about half the whole-suite runs on this machine with or without this change (two of four runs of the commit before it) and passes alone.

## Hashes (SHA-256)

- `scripts/art/deliver.ts`: `19e657e68a0cb59889755ee5bc7fcc710d2ef31355ff15e0a7f5f3edc9836376`
- `art/manifest.json`: `d0ded8a58a67fe35766c53079805bbd2e5404ca7e5a7c88b2fb2b3f0c51c1f95` (unchanged)
- The 188 delivery files, as one digest: `44501bef14b7d99f26ec170802c886aca62586f1aeea693ac3707f0c4389efae`, from

  ```sh
  find art/generated -mindepth 3 -maxdepth 3 -type f \( -name 1.25.webp -o -name 2.webp \) | sort | xargs shasum -a 256 | shasum -a 256
  ```
