# How does your own cursor stand out in a crowd on a phone?

Type: prototype
Status: resolved
Part of: ../map.md
Blocked by: 11

## Question

In the cursor sync prototype, Joe tried a phone at 0.6 scale with 20 bots and found his own cursor hard to find. The cursor identity ticket gave the own cursor only a blue halo and a "you" tag that fades after about two seconds, and draws it at the same 32 px as every other cursor. Joe's direction is to make it stand out more, perhaps a bit larger than other visitors' cursors. Decide the treatment and test it on a phone in a crowd. Options to try: scale (for example 1.25x to 1.5x, drawn in world px so it stays consistent with ADR 0001), a stronger or animated halo, a persistent marker, dimming or shrinking peer cursors instead, and an arrow that points to your cursor from the screen edge. Settle whether size changes other visitors' view of you (it shouldn't: bigger on your own screen only). Output: the own-cursor rules that amend the cursor identity ticket. Prototype on top of `prototype/cursor-sync` (`renderers/draw-cursors.ts`, `npm run bots -- --hz 20`).

## Answer

Resolved 2026-09-24 in a prototype session. Joe picked a combination of two variants after trying five on a switcher.

### Own-cursor rules (amend the cursor identity ticket)

- Your own cursor is drawn at **1.25x** (40 world px instead of 32), scaled about the arrow tip so the hotspot stays on the same world point. Its cosmetic and flag scale with it.
- Every other visitor's cursor is drawn at **0.75x** (24 world px) on your screen, cosmetic and flag included, at **full opacity**. No fading or dimming.
- Together these make your cursor about 1.67x the size of any peer.
- The blue halo and the "you" tag that fades after about two seconds on arrival and on scene entry stay as the cursor identity ticket set them.
- These sizes are local drawing only. Nothing changes on the wire. Every visitor sees their own cursor at 1.25x and everyone else at 0.75x, so each client draws the same 32 px base asymmetrically. Sizes are in world px (ADR 0001), so they apply on desktop too, not only on phones.

### Tried and not adopted

- **Beacon**: a solid blue ring around the arrow with a pulse every 2 s.
- **Persistent "you" bubble** above the tip. It also collides with head-anchored cosmetics.
- **Fading peers**: peers at 55% opacity. Joe kept the smaller size and dropped the fade.
- **Edge arrow pointing to your cursor**: not built. On a phone, a touch drag keeps your cursor on screen (it is clamped to the view), and on desktop your cursor is your mouse, so the arrow would never show.

### Consequence to carry into the build

At the phone's 0.6 render scale, a 0.75x peer's flag badge is about 7 x 4.5 CSS px. In the prototype you could still tell flags apart. The final flag and cosmetic sprites should keep strong contrast at that size.

### Assets

- Prototype on branch `prototype/own-cursor` (commit `ec3ddbe`), built on `prototype/cursor-sync`, under `prototypes/cursor-sync/`. `?own=` picks treatments by letter (A to E, combinable); the default is the chosen `BD` with `?ownk=1.25&peerk=0.75`. The change is in `src/lib/proto/renderers/draw-cursors.ts`.
