# 01: The door and the two-game seams

**What to build:** A second page with no scene beside Sushi Stand. `GAME` becomes `SUSHI`, `BIG_MUDDY` and `GAMES`; Belleville grows north to the Illinois bank and takes a venue whose door is `/big-muddy`; the river mask's east-bank rows 250 to 450 are re-traced to the painted bank, which they now count as water. The engine remembers which game's door it left by and lands back on it; the first-paint exemption, the entry sound and the game's sounds and loops are per game. A stub page at `/big-muddy`.

**Blocked by:** none

**Status:** resolved

- [x] `GAMES` in scene data; Sushi Stand's door still returns to the koi
- [x] Belleville venue `big-muddy`, its door ashore and at least 80 by 80 world px; mask re-traced; river tests pass
- [x] `engine.suspend(pathname)`, the landing and the entry sound by game
- [x] `.game` root class for first paint; `sound.game(id | null)` with per-game sounds and loops; unsourced rows in `audio/sounds.json`
- [x] `tests/big-muddy.spec.ts`: the door opens the page, the engine is away, the exit lands back

## Comments

### Built, 2026-10-01

- `src/lib/scenes/overworld.ts`: `SUSHI`, `BIG_MUDDY`, `GAMES`, `GameId`, `gameAt`. Belleville is `{5800, 250, 950, 1600}`; its venue `big-muddy` was `{5960, 300, 100, 90}`, door `/big-muddy`, and is `{5956, 296, 80, 80}` since the angler was made small (ticket 05). The mask's east-bank rows 250 to 450 are now 5900, 5990, 5975, 6090, 6227, read on a gridded crop of the master.
- The door's centre is ashore and its west edge over the water (`tests/overworld-geometry.test.ts`), not every corner as first written: the angler's line goes in the water, and the visitor lands at the centre.
- `engine.suspend(pathname)` keeps the game left; `show` lands at its door; `close` plays `splash` into either game. A page with no scene that is no game now lands at the fragment or the arrival, where it landed at the koi.
- `.game` on both games' roots for first paint. `GAME_SOUNDS`, `GAME_LOOPS`, `gameGains` by game; `sound.game(id | null)`.
- `audio/sounds.json`: `reel`, `snag`, `lure-up`, `bed-big-muddy`, `music-big-muddy`, provisional and unsourced, so silent until ticket 06.
- `tests/big-muddy.spec.ts`: the door opens the page, the engine away, the exit lands back, and Sushi Stand's exit still goes to the koi.
- Also: `tests/build-output.test.ts` pinned the diploma card's headline text, which Joe's copy commit changed; it now checks the heading's level alone.
