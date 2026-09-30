# Overworld round seventeen and the start/finish sign

**Verdict:** the bench south of the Carondelet lake loop's start line is gone from the master, and a start/finish sign stands on the lawn in its place, the `track` prop's art and hit target. `npm run art:validate` passes. Workshop acceptance in `art/review.html` is Joe's.

Joe (2026-09-29, buildout ticket 18) asked for the start line to be more distinguished: "We could remove the bench there and have a sign or possibly something else."

- **The bench.** Round seventeen (`sources/overworld-fix/rounds/round-17.json`) paints the bench, its legs and its shadow over with the lawn's own flat colour, (174, 206, 55), which every lawn pixel round it matches within a level, in native px 740 to 786 by 753 to 779; the path's south edge, at y 749 to 752 there, is untouched. A `forcefill` was tried first and rejected: its lawn cloned per cell left blocky tone patches and carried another tree's shadow in. The stitch proves no pixel outside the rectangle changed, and the install listed no Codex extraction as stale.
- **The sign.** `start-sign`, a standalone cut-out generated against the park at bench scale like the bike and the notice board (`manifest.json`; original in `sources/start-sign.png`): one wide banner between two slim dark teal posts, a row of dark teal and ivory checks along its top and bottom, "START FINISH" in bold dark teal capitals between them. The lettering is requested outright, as the style contract requires. First run accepted: on a checkerboard its edges are clean with no holes or fringe, and its banner slopes down to the east as the path does there.
- **Placement.** World rect x 2544, y 2560, 110 × 85, the trim's own aspect: centred on the start line (x 2599), its feet where the bench's were (y 2645), its top at the path's south edge, so it never covers the chequered band the engine paints across the path. It is the `track` prop's art, so it draws in base-y order among the props (over the rider's wheels if they ever dip behind it), glows when hovered and opens the Cycling course card; its rect is the prop's hit target.
- **Read.** On the rebuilt composite and on the site at 1920 × 1080: the sign reads at once beside the line, the lawn where the bench stood is flat and seamless, and the bike, the notice board and the trees are unchanged.

## Hashes (SHA-256)

- `art/manifest.json`: `7cf16557dc21133d3e8e75f33ed1ca67c185213ae0b41d89647fc50995cca9c0`
- `art/generated/review.json`: `0565fb8cb809ba39545851c4e865f76919f6442081c39d2aa2b22ee71938dede`
- `art/generated/overworld/composite.webp`: `3052cd81cfd26d26324a8a3ad5950997e5d6b99ff74cdca04dc9a5e825a8ba7d`
- `art/generated/contact-sheet.webp`: `06fad3887c6187781d383089806b935a8cf0dc4f1ae81685d1816faa50aeb875`
- `art/generated/overworld/start-sign/image.webp`: `c93871b0d5fafe1427cff605f8d99bd9a930e3ea2639baed18711b2b7d7c4154`
- `art/generated/overworld/overworld-master/image.webp`: `4ee09dff0ee5b2d21b08296b829e001ea981b86d7c49e1cd84051d6c882df871`
- `art/sources/overworld-fix/stitched.png`: `1de9d7d616a0d02e8dd94182bd696f9a0a3bddf97a0c7bef86aadef84b991d7c`
- `art/sources/overworld-fix/rounds/round-17.json`: `fff83dbcfd011f5e587e8f9b23180f9ef7d8ee7bc9222a4e9e169b7f99845bd3`
- `art/sources/start-sign.png`: `9c6e7f8df09664294d36a86ad43287577d501820dc4a7146b90a98ae67afd0aa`
