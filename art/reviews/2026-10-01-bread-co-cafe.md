# St. Louis Bread Co.: the café

**Verdict:** a sixth interior, built to the format of Brennan's and Side Project and measured from its own master. The composition, the three props' look, the placeholder names and copy, the opening camera and the walk-behind feel are Joe's to accept in `art/review.html` and on the site; nothing here was approved by him yet. See [asset hashes](2026-10-01-bread-co-cafe.json).

Joe (2026-10-01): a St. Louis Bread Co. café holding the work for three Moosylvania clients: PayPal on an ATM, Venmo on a scan-to-pay stand, UX testing for PayPal and Panera on a laptop.

## References

Three visitor photographs of the café at 6607 Chippewa St, from its Restaurant Guru listing (photographers not credited there; 648 to 750 px wide), kept in ignored `references/local/places/st-louis-bread-co/` and logged in `references/locations.json` under `bread-co`: the dining room toward the counter, the counter's end with the bakery behind it, and a customer's table with a laptop. No Google Places key was used. `landmarks.md` lists what the scene takes from them and what is invented.

- **From the photographs:** golden-yellow and terracotta walls, the counter's reddish wood-panel front under a dark top, the glass pastry case, wire bread racks, the stainless oven, the row of menu-board panels, round wood-top tables on black pedestals, wooden chairs with brown seats, the tall wood-backed booth and the olive circle-patterned upholstery, black track lights, the magenta drum pendant, the tan-and-cream checkerboard tile by the counter and carpet beyond it.
- **Invented:** the ATM, the scan-to-pay stand and the usability test (laptop, cup, clipboard, pencil); the room's arrangement in one view, the entrance door and the street through it, the menu boards' food pictures, the carpet's sage green (dark in the photographs), the coffee urns and the sprig. No fireplace appears in the photographs, so none is drawn. No lettering or brand marks anywhere in the room.

## Composition

Six Codex drafts (`codex exec`, codex-cli 0.159.2, its built-in image tool), each the tool's native 1672 × 941, unresized; kept in `references/local/drafts/bread-co-<a..f>.png`. Both prompts are in the master's `prompt.txt`.

- **a, b, c**, from the three photographs and Brennan's master for rendering and scale. All three cut the laptop table's pedestal and chairs off at the bottom edge. In a and c the laptop's screen met the counter's base; in b a plant covered the ATM's foot; in c the left table was cut by the frame. Rejected.
- **d, e, f**, draft a redrawn from a fix list (it had the cleanest door, ATM, counter and stand): both table sets a fifth smaller, the laptop table whole inside the frame with floor between its laptop and the counter, the other table moved off the door.
- **e is kept:** the widest band of floor between the laptop and the counter, the most carpet under the laptop table's feet, and open floor in front of both the door and the ATM. In d and f the left chair stands in front of the door. It added a potted sprig to the left table, kept.

Against the existing interiors, read side by side with Brennan's and Side Project's masters: the same flat rendering, camera and furniture scale. Weaker than them in one respect: its two table sets are the same model twice, where Brennan's furniture is varied.

## Decal

The stand's QR code was 46 native px, about 2 px a module, and came out of the upscale as blobs. `sources/bread-co-fix/rounds/qr-decal.py` redraws the card's white with square modules as `scan-qr.svg`, in native px, and `decals.json` places it. It is a QR-shaped pattern, not a code: finder squares, timing lines and a seeded field, with no format information or error correction. OpenCV's QR detector locates it and decodes nothing; a real code decoded in the same run. No phone's reader was tried.

## Cut-outs

Eight measured mattes of the master (`deriveFrom` plus `registration.mask`), traced by `sources/bread-co-fix/rounds/mattes.py`, which also writes their manifest entries.

- **Props:** `bread-co-atm`; `bread-co-venmo-stand`; and for the `ux-laptop` prop three drawn as one layer, `bread-co-ux-laptop`, `bread-co-ux-cup` and `bread-co-ux-clipboard`. The pencil is not cut out: its dark tip and cap run into its own shadow, and a keyed matte lost both ends, so it stays painted on the table.
- **Walk-behind scenery:** `bread-co-counter` (with the pastry case, the register and the stand), `bread-co-table-left`, `bread-co-table-laptop`.
- **How each was traced:** the table sets and the ATM by colour key against seed points on what stands behind them, each seed read back as a flat patch before it was used; the laptop and cup by the same key plus a ramp from the table's wood to its cast shadow, so the shadows stay on the table; the stand, the clipboard and the counter by hand polygons, their straight edges found on pixel profiles and the rest read off crops gridded every 20 px.
- **Defects found and fixed while tracing:** a first key treated the tile's cream as background everywhere and cut holes in a chair seat's highlight and the clipboard's paper (tile is now keyed only where it joins the tile strip); the pot's lower half and a strip of baseboard beside the ATM were lost or gained by colour and are set by hand; a sliver of table edge beside the cup's handle is cut away.
- **Registration.** The first set of cut-outs sat 1 to 2 px low and was resampled: a 1672 × 941 master is not exactly the world's shape, so the rects are now computed per axis, as the pipeline cuts its crop. Checked on the final assets: every visible pixel of all eight equals the master's at the place it is drawn (maximum difference 0), and no alpha over 32/255 lies outside its traced mask.
- **Known, left:** the table mattes' zero-width slits leave a few faint pixels, 3 beyond the left table's mask and a 26 px line at alpha 243 inside the laptop table's. Each is drawn over the plate's identical pixels, so nothing shows at rest. The cup is solid, so the carpet seen through its handle glows with it on hover.

## Scene data

`src/lib/scenes/bread-co.ts`, 2845 × 1600:

- **Props, left to right:** `atm` 428,488 198 × 450; `ux-laptop` 1468,1004 445 × 259; `venmo-stand` 1722,541 136 × 164.
- **Exit:** the entrance door at the far left, 0,60 382 × 865, its frame found on pixel profiles.
- **Depth:** one region, the horizon at the back wall's foot (905).
- **Walk-behind:** the counter (its own polygon; front line the foot of its kick), the left table set and the laptop table set (each its convex hull; front line through its feet). No foreground cut-out.
- **No prop stands on a unit.** The counter's outline is notched round the stand and the laptop table's round the laptop, cup and clipboard, so a cursor over a prop is never behind anything. The alternative, listing each prop on its unit, would have taken the stand away from a cursor that came along the staff side and the laptop from one that came straight down from the counter.
- **Workshop camera:** `sceneLayouts.bread-co.arrival` is (1690, 860), between the stand and the usability test; its phone frame holds both. A default for Joe to adjust.

## Review

- **Master against assembled scene:** the composite differs from the plate by more than 24/255 on 11,776 px of 4.55 million, all along cut-out edges; by the same measure Brennan's differs on 19,446 and Side Project on 47,431.
- **Cut-outs on a checkerboard** (magenta, since the first grey one hid holes that were the carpet's own tone): no holes or fringes in the eight after the fixes above; the floor shows between every chair's legs.
- **Tile densities:** 24 tiles each at 1.25× and 2×, stitched with no gap; the QR pattern's modules are square at both.
- **Real Chrome** (154, headless, against `vite dev`; the pointer lock refused, so the drawn cursor follows the mouse):
  - At 2880 × 1620, the whole scene in view: each prop hovers with a glow round its silhouette and opens its card on a click, from the floor in front, the stand also from the staff side, the laptop also straight down from the counter, and on the cup and the clipboard. Under reduced motion the ATM takes a plain highlight and still opens.
  - The cursor is hidden behind the counter from the staff side and behind each table set from above, and drawn over them from below.
  - At 1440 × 900 the scene opens on the door, the ATM and the pastry case. The exit door leads to `/#bread-co` on the overworld, and Enter on the overworld's door returns.
  - Phone, 390 × 844 at 0.6 with touch: the first frame holds the door and the ATM; the joystick shows; the stand's hit target is 81.6 × 98.4 CSS px, the laptop's 267 × 155, the ATM's 119 × 270; a tap on the ATM opens its card.
  - No console errors or failed requests.

## The cards' media (added after the room, the same day)

- `atm`: four PayPal screenshots (the holiday coffee micro site halved to 1440 px wide, the two Citi emails split from their side-by-side original, the PayPal Credit banner). `venmo-stand`: fourteen Venmo screenshots, the three in-app messages and eleven emails, each email the light half of its side-by-side original at 1240 px wide, with the Debit Card email's dark half after its light one (Joe: show one dark-mode email). `ux-laptop`: the PayPal Credit UX video from the media host, over copy that covers Panera's testing too. All lossy WebP, quality 84, delivery copies at the top of `art/sources/screenshots/paypal/` and `venmo/`; the originals in the folders below them are untouched. Names, gists and copy are drafts for Joe.
- Read on the built site in Chrome at 1440 × 900: each card opens with its media and copy; the Venmo card's fifth slide is the dark-mode email.

- `art/sources/screenshots/paypal/01-holiday-coffee-site.webp`: `998c53d38505e5d47006f4efcafe0ee87cc7d66f8e04903585a7a170b9ed9694`
- `art/sources/screenshots/paypal/02-email-citi-preferred.webp`: `434129aaaa73f0f8ac3244a4d91cf11ce2ae26b45b986587deb3f08d5201c913`
- `art/sources/screenshots/paypal/03-email-citi-premier.webp`: `520e88cde3b1ae4b1f124c06fef71059c30fdcbdd7626a651e607bb5aa5a85b9`
- `art/sources/screenshots/paypal/04-credit-banner.webp`: `2c67a0fbff8ff61907c966a55b7f76fd7c34ced72c09663864a7b5705015f12b`
- `art/sources/screenshots/venmo/01-in-app-starbucks.webp`: `8e95c786fd41dc57ccc9b33669044f9e894e959de7202c0531fc22cdb4447279`
- `art/sources/screenshots/venmo/02-in-app-fanduel.webp`: `763432d23d8fa2788a8b409f093e4e7f2879f73f946eb0320f654a8c6614d9c5`
- `art/sources/screenshots/venmo/03-in-app-burger-king.webp`: `75a8c4b8e274775d313d4c0c11a3977406d7e97a63e7079ab5269c7c5580a645`
- `art/sources/screenshots/venmo/04-email-debit-reload.webp`: `718f5ec8d9b430fec6e5878fb11640d3197853f817aaf14f7a4f7dbe7d9995cc`
- `art/sources/screenshots/venmo/05-email-debit-reload-dark.webp`: `54e94a95ee46908fe8cf906e58341e0a546bfc78dcb27b0dea447dbfcfacd454`
- `art/sources/screenshots/venmo/06-email-welcome.webp`: `e55b6cab51aec6e82443332e1312cc0f14d2834a5e231bd29c781ee9065215a2`
- `art/sources/screenshots/venmo/07-email-refer-a-friend.webp`: `d545f2a794a4dfea63a7d79ea7fa677df25a41bcc7348a4566f61cb41b1189f0`
- `art/sources/screenshots/venmo/08-email-credit-card.webp`: `d7306d38173122d6fd896f510a1cc9cc2d03758abf320f6226d3be669be554fe`
- `art/sources/screenshots/venmo/09-email-crypto.webp`: `2657004813dd3cf09d2ad995394f1e1d6d543b1305da27dfcc8980613a787045`
- `art/sources/screenshots/venmo/10-email-tipping.webp`: `3157fbf68b912b488ab21100b8bf4558d54c0832942051485b4b6783b329ac55`
- `art/sources/screenshots/venmo/11-email-qr-kit.webp`: `346bc08983a6b71d56ded6230b20c1e1b5ded382bb15143676571ff78634bc9a`
- `art/sources/screenshots/venmo/12-email-purchase-protection.webp`: `66e9883baeefc1fcc0b306a572031574385e83683a71317cf96d110900551a67`
- `art/sources/screenshots/venmo/13-email-doordash.webp`: `23aa3fe986254369bc31da3b79111c7ad2c5b96637b4c1f898505d08aa858d0b`
- `art/sources/screenshots/venmo/14-email-holiday.webp`: `46ffa2f5abaf3656ce9d103ba05f92713e9ea0764c87ad1c2dae3195f2abdc3c`

## Not verified

- Joe has not seen the room. `art/review.html` itself was not opened; the composite, the tiles and the site stood in for it.
- A real pointer lock, real phones, Safari and Firefox. The stand and the laptop were not tapped on the phone, being off its first frame.
- Whether any real phone decodes the QR pattern.
- The overworld door's rect is the repainted building's, 1225,1615 229 × 138 (set after overworld rounds twenty and twenty-one); Maplewood's rect is back at its 900.
- Sound: the café has no bed and no music; it plays the theme low, as the lab does. The laptop clicks; the ATM and the stand have no signature.

## Checks

`art:validate` PASS (121 assets), `art:check`, `art:test` (5), `npm run ci` (svelte-check 0 errors, build, 256 tests pass), Playwright `smoke.spec.ts` and `props.spec.ts` (21 pass).
