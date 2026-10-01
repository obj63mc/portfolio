# 01: The door and the two-game seams

**What to build:** A second page with no scene beside Sushi Stand. `GAME` becomes `SUSHI`, `BIG_MUDDY` and `GAMES`; Belleville grows north to the Illinois bank and takes a venue whose door is `/big-muddy`; the river mask's east-bank rows 250 to 450 are re-traced to the painted bank, which they now count as water. The engine remembers which game's door it left by and lands back on it; the first-paint exemption, the entry sound and the game's sounds and loops are per game. A stub page at `/big-muddy`.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `GAMES` in scene data; Sushi Stand's door still returns to the koi
- [ ] Belleville venue `big-muddy`, its door ashore and at least 80 by 80 world px; mask re-traced; river tests pass
- [ ] `engine.suspend(pathname)`, the landing and the entry sound by game
- [ ] `.game` root class for first paint; `sound.game(id | null)` with per-game sounds and loops; unsourced rows in `audio/sounds.json`
- [ ] `tests/big-muddy.spec.ts`: the door opens the page, the engine is away, the exit lands back

## Comments
