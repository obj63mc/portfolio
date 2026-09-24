# 18: Carondelet lap timer and the rider from server time

**What to build:** In Carondelet Park the cursor crossing the track's start line starts a lap; the client follows the cursor around the track path and, on re-crossing, shows the lap time and the personal best. A personal top ten lives in the rune module's `laps` field (fastest first, at most ten, dropped if the track version changes). A new best is where the finish-line beep will fire (ticket 22). No server involvement. The NPC rider is ambient motion positioned from server time so every visitor in the room sees it at the same point, and it never touches the timer. The track path and start line come from the overworld scene data (the art pass placed the track).

**Blocked by:** 04 (track geometry), 16 (the rune)

**Status:** ready-for-agent

- [ ] Crossing the start line and completing the loop shows a lap time; leaving the path cancels the lap
- [ ] The top ten persists across reloads and merges across tabs keeping the fastest ten
- [ ] Two browsers in the room see the rider at the same point on the track
- [ ] The lap timer is a pure module stepped with a fake clock and tested (seam 2)
