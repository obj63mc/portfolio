# 02: Rules and kept catches

**What to build:** `src/lib/big-muddy/rules.ts`, the original's numbers as pure functions with injected randomness on a fixed step, and the visitor's ten heaviest catches and lure level in `saved.ts`.

**Blocked by:** none

**Status:** resolved

- [x] `start`, `step`, `weigh`, `afterCatch`, `afterSnag`, `Catch`, `isCatch`
- [x] `Saved.catches` and `Saved.lure`, read, merged and narrowed
- [x] `tests/big-muddy.test.ts`

## Comments

### Built, 2026-10-01

`src/lib/big-muddy/rules.ts`, `Saved.catches` and `Saved.lure` in `src/lib/saved.ts`, `tests/big-muddy.test.ts` (10 tests). A fish rises at its mean speed, a constant, where the plan said drawn at spawn and each turn: the original's draw every frame averages to it. Committed by Joe in 770152d.
