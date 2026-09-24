# How does your own cursor stand out in a crowd on a phone?

Type: prototype
Status: open
Part of: ../map.md
Blocked by: 11

## Question

In the cursor sync prototype, Joe tried a phone at 0.6 scale with 20 bots and found his own cursor hard to find. The cursor identity ticket gave the own cursor only a blue halo and a "you" tag that fades after about two seconds, and draws it at the same 32 px as every other cursor. Joe's direction is to make it stand out more, perhaps a bit larger than other visitors' cursors. Decide the treatment and test it on a phone in a crowd. Options to try: scale (for example 1.25x to 1.5x, drawn in world px so it stays consistent with ADR 0001), a stronger or animated halo, a persistent marker, dimming or shrinking peer cursors instead, and an arrow that points to your cursor from the screen edge. Settle whether size changes other visitors' view of you (it shouldn't: bigger on your own screen only). Output: the own-cursor rules that amend the cursor identity ticket. Prototype on top of `prototype/cursor-sync` (`renderers/draw-cursors.ts`, `npm run bots -- --hz 20`).
