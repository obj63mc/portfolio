# 04: Game art

**What to build:** The three fish, two snags and the intro's backdrop, through `npm run art` and Codex, in the style contract's palette.

**Blocked by:** 03 (wiring; generation can start at any time)

**Status:** ready-for-human

- [x] Manifest rows under scene `big-muddy`; cut-outs judged on a checkerboard
- [x] The page draws them; review note with hashes

## Comments

### Built, 2026-10-01

- `big-muddy-bass`, `big-muddy-catfish`, `big-muddy-gar` and `big-muddy-master` (the title picture; first named `-backdrop`, renamed so the engine's cut-out glob, which reads a world rect from every asset but a master, passes it by). Each accepted on its first Codex run. Review: `art/reviews/2026-10-01-big-muddy.md`.
- No snag cut-outs: the snags are drawn by the page as branching twigs, as Joe asked on seeing the placeholders.
- The page draws each fish at its picture's own shape with an ivory outline, 4.5 units at any size; the water's surface is `#188f8a`, so ivory is 3.6 to 1 there and more below (Joe: contrast, or an outline). The rules' fish boxes follow the pictures' shapes.
- Left for Joe: the look of the fish, the picture and the outline in play.
