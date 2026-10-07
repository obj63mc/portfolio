# Overworld round twenty-two: the MIDTOWN and BELLEVILLE signs relettered, FOREST PARK's lettering white

**Verdict:** both boards read as the MAPLEWOOD and CENTRAL WEST END boards' wood, with clean, level, white lettering at every zoom, and FOREST PARK's lettering is pure white. Every automated check passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-10-07), from screenshots: the MIDTOWN and BELLEVILLE signs' letters are not all clean like the other signs'; the lettering is to be white, FOREST PARK's too, which was not full white.

- **Why these two.** They are the smallest painted boards: their lettering is 15 native px tall, and the 4× upscale drew its strokes uneven, as it did FOREST PARK's at 9 px. The fix is the same one: the name as a vector decal.
- **The round.** `sources/overworld-fix/rounds/round-22.json`, two 256 px tiles drawn by hand, no model. `scripts/art/overworld/district-signs.py` relays each board's whole front face on the native master, under its top edge, between its ends and down behind the bushes (MIDTOWN native x 812 to 924, BELLEVILLE x 1793 to 1896): the MAPLEWOOD and CENTRAL WEST END boards' wood, read off the native master (Joe, the same day: those two are what to shoot for): their flat red-brown (133, 68, 31), streaked along the board by no more than 3 % of its tone, crossed by two thin dark plank seams that start at an end and die away behind the lettering, with a nail head inside each top corner. Bush pixels below the lettering keep theirs. The stitch aligned both (drift 0) and changed no pixel outside the masks; `tiles.py check` found no dead-end road. The boards' own lighter, orange wood went with the lettering; their top edges, ends and bushes are the master's own.
- **Decals.** `midtown-sign.svg` and `belleville-sign.svg`, written by the same script: the name alone in Barlow Condensed 700 (the site's headline face, SIL OFL) as one white (`#ffffff`) outline path, between the old cap line and baseline, centred on the old lettering and sheared with the board's slope (0.104 and 0.119). BELLEVILLE is set a little smaller than its old cap height so that it is no wider than the old lettering. `forest-park-sign.svg`'s lettering went from `#f7ecd2` to `#ffffff`.
- **Rejected first (Joe, both).** A decal that relaid each face in flat bands under the lettering read as a layer clipped on top of the wood. Painting only the lettering's quad out of the native master, with the wood from either side of it, still showed in the upscale: a different tone, ghosting, and on BELLEVILLE a hard line below the name. A part repaint of a board shows its edges; the whole face relaid does not have any. The whole face as one flat gradient of the board's own colour had no edges but did not read as wood; a dense grain of streaks over it read as wood but not as the other signs' wood.
- **Install.** `install-master.sh twenty-two` upscaled the master 4×, composited the six decals, re-derived the plate, its tiles at both densities and the master-derived mattes, synced no geometry change and validated. (An install interrupted earlier the same day had left `eads-bridge/2.webp` unreadable; it was deleted and rewritten.)
- **Read.** At 4× on the installed master: beside crops of MAPLEWOOD and CENTRAL WEST END, each board is the same red-brown with its seams and nail heads, no trace of the old lettering or of a patch, the bushes whole at its foot; the three names are crisp and white.
- **Checks.** `art:check`, `art:test`, `art:validate`, `check`, `build` and `npm test` pass.

## Hashes (SHA-256)

- `art/manifest.json`: `de9fd17e232d6243da76a1f4d6f6fb2fb703a022e086254e424988e105b5138e`
- `art/generated/review.json`: `ec9b3d6be0017d73f124a81cf93de1e5640f5840148207d31d699241bb27f4de`
- `art/generated/overworld/composite.webp`: `633324d89e6a1515f5b08be777abd8898d2abfc423cf4eb028007ff1fdafc3c4`
- `art/generated/contact-sheet.webp`: `e41a6a064ac015416e3ce309354a8364a71516a3658be622fe1aece8b08e6bcd`
- `art/generated/overworld/overworld-master/image.webp`: `4bc7bb8fcc710ee73dbd79a1c9de1ca236f91f7eecdc83482993591ec3180e0b`
- `art/sources/overworld-fix/stitched.png`: `0e5a761d4eb73b4f9449cdd52f4f986522b3a0d5b127c39fd6fffeae596a6a4c`
- `art/sources/overworld-fix/rounds/round-22.json`: `c52dff2e6d999ddfa0f7d96b5778665ee0553126c9cd992d6c33e41242e66734`
- `art/sources/overworld-fix/decals.json`: `13607b23f9ae309bb8d0596aea845cf9a55364de2928117a940a2148df89eaea`
- `art/sources/overworld-fix/forest-park-sign.svg`: `de6f24eb40833f16563e6f511f1ca5971f81906d5a04a49139ede861e59fb05e`
- `art/sources/overworld-fix/midtown-sign.svg`: `c26c4aa52e2ca4aea47bf56397af3c8e35d4b107e27e43283ae9885912086ddb`
- `art/sources/overworld-fix/belleville-sign.svg`: `d89fe378f09da1f1cc5f50e3cee2f27672056b2e0587dfe7b60dddb53a76ec22`
- `art/sources/overworld-fix/tiles/t-midtown-model.png`: `242dd84b128d8cbfccc89642483866365d98fd753e05f6c3127f43e7e948d80d`
- `art/sources/overworld-fix/tiles/t-belleville-model.png`: `8a445c6bbce6b24bf53f3bdba07c283f992e9d66e5526775c17dfa2563effc60`
