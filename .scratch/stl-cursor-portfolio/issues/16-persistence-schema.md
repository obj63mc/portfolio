# What does the visitor's localStorage look like, and how is it versioned?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

The cursor identity ticket fixed the fields: the worn cosmetic id and the earned set. The shared props ticket added the bike track's personal top-ten lap times. Charting fixed sound as off by default with a toggle, and that preference has to live somewhere. Decide the localStorage layout: one namespaced key or several, key names, the shape of each value, a schema version and what happens on a mismatch (migrate, or drop and start fresh), how unknown cosmetic ids from a newer or older build are handled, and what the scene does when storage throws or is empty (private windows, blocked site data). Also decide whether anything else earns a place, such as the last scene visited, and rule out anything that shouldn't persist. Output: the storage schema as it will appear in the spec, plus the failure rules.

## Answer

Resolved 2026-09-24 in a grilling session with Joe.

### Schema

One localStorage key, `stl-portfolio`, holding one JSON object:

```ts
{
  v: 1,
  worn: number,            // 0 to 7, 0 is no cosmetic
  earned: number[],        // sorted cosmetic ids
  laps: { track: 1, best: { ms: number, at: number }[] },  // fastest first, at most ten, at is epoch ms
  sound: boolean           // default false
}
```

Nothing else is stored. Ruled out: the last scene visited (the URL per scene owns location, and a bare visit lands on the arrival point), camera position, visited props or opened cards, whether the "you" tag has been seen, and any reset control (clearing site data is the reset).

### Ownership

A single Svelte 5 rune module (`$state` in a `.svelte.ts`) is the only code that touches the key. The scene engine and UI read from its reactive state and write through it.

### Reading and validation

- Each field is validated on its own; a bad field resets to its default without touching the others.
- Unparseable JSON, or a `v` newer than the build knows, starts fresh. Migration code is written only when a breaking schema change needs it; no chain up front.
- Earned ids unknown to this build are ignored for drawing and gold, but kept in storage so an older deploy never erases a newer grant.
- A worn id that is not in the earned set, or not known to the build, becomes 0.
- Gold is derived as "holds every cosmetic this build knows", never stored. Adding an eighth cosmetic later takes gold away until it is earned, matching the glossary.
- Laps stored under a different `track` version are dropped, since a redrawn course makes times incomparable. Entries whose `ms` is not finite and positive are dropped. No anti-cheat: only the visitor ever sees their laps.
- A stored `sound: true` means the visitor's first click or tap starts audio; the gesture requirement still applies. The toggle itself belongs to the sound design ticket.

### Writing

- Write on every change (grant, wear, a lap entering the top ten, sound toggle), never on unload, which mobile Safari does not fire reliably.
- Before each write the module re-reads the key and merges: earned is a union, laps merge and keep the fastest ten, worn and sound are last-writer-wins. This covers two tabs writing in the same instant.
- Every read and write is wrapped in try/catch.

### Failure

If storage throws or is missing (private windows, blocked site data), the session runs from memory: cosmetics, laps and sound work until the tab closes, with no message to the visitor.

### Tabs

The module listens for the window `storage` event and updates its state live. A cosmetic earned in another tab is applied fully here: the earned set and worn cosmetic update, this tab's cursor sends a presence update so its room sees the 300 ms pop, and no sound plays.

### Not changed

No glossary terms and no ADR: earned set and top-ten stay implementation words, and nothing here is hard to reverse.

## Context

2026-09-24, from the analytics ticket (17): the schema gains `analytics: 'granted' | 'denied'`, left out while the visitor hasn't chosen. It is validated per field like the others (a bad value counts as missing), merges on write with last writer wins, syncs across tabs through the `storage` event, and falls back to memory when storage throws. Global Privacy Control overrides it.

2026-09-24, amended by [What does each district and prop sound like, and how is sound switched on?](19-sound-design.md): `sound` now defaults to `true` (a missing or invalid value means on). A stored `false` keeps the visitor silent on Join; the Join press is the gesture that starts audio.
