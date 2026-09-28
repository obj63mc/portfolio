# 25: The ATM on the overworld

**What to build:** The ATM left Brennan's when the room was redrawn facing the humidor (ticket 05, 2026-09-28), and becomes a prop on the overworld, for PayPal and Venmo as fintech clients (content inventory). Joe places it.
- A tile-map round on `art/sources/overworld-fix/stitched.png` paints it in the overworld's style, and `scripts/art/overworld/install-master.sh` reinstalls the master.
- A measured prop matte is cut from the master, and the prop and its rect go into `src/lib/scenes/overworld.ts`: inside its venue's box, in reading order, clear of foreground scenery.
- Clicking it plays the receipt printer (sound design table).

Until it is placed, PayPal and Venmo are on no scene.

**Blocked by:** 04 (resolved)

**Status:** needs-info

- [ ] Joe places the ATM (the district, the venue it belongs to and the spot)
- [ ] The ATM painted in by a tile-map round, reinstalled, and judged in the harness with the phone frame
- [ ] A measured prop matte with its rect in the overworld scene data, and the card from the content inventory; the build-output and overworld geometry tests pass
- [ ] Review record with the round and current asset hashes
