# 19: Horizon scaling and foreground scenery

**What to build:** Cursors shrink toward the horizon: a depth factor `d` runs linearly from 1.0 at a depth region's `foregroundY` to 0.85 at its `horizonY`, holding at 0.85 above the horizon and 1 outside every region, computed locally from world y, with a 150 ms ease when crossing regions; drawn size is own 1.25 x `d`, peer 0.75 x `d`, about the tip, with cosmetic and flag scaling too. Foreground scenery from scene data (the keyed cut-outs with world rects, already painted into the tiles) is drawn on the overlay canvas after every cursor, own included, with no outline or fade. No general Z-sorting.

**Blocked by:** 04 (depth regions and cut-outs in scene data), 13 (cursors drawn), 15 (props drawn)

**Status:** ready-for-agent

- [ ] Walking toward a district's horizon shrinks the own cursor and peers by the specified factor; crossing into another region eases over 150 ms
- [ ] Hover and click stay tip-based at every scale
- [ ] A cursor behind a foreground tree is covered by it, for the visitor's own cursor and for peers
- [ ] The depth factor is a pure function with tests at `foregroundY`, `horizonY`, above the horizon and outside every region (seam 2)
