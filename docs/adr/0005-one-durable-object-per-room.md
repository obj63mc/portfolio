---
status: accepted
---

# One Durable Object per room, 60 visitors per room

Each room is its own Cloudflare Durable Object, named by scene and number (`overworld:1`, `overworld:2`, `foundry:1`). A room holds up to 60 visitors, and when every room of a scene is full the next visitor opens a new one, so any number of people can use the site while each sees at most 60 others. A small directory object counts visitors per room from joins and leaves only, places each visitor in the fullest room of their scene with space, and enforces a site-wide visitor ceiling set in config (default 1,000), past which visitors get single-player. This supersedes ADR 0004, which put every room in one object to hold the worst-case bill near $17 with a global 60-cursor cap. Joe wants a crowd to be able to use the site, not to be turned away at 60, and accepts a bill bounded by real traffic, the configurable ceiling and a manual kill switch rather than by code alone. One object can't hold much more than 60 moving cursors at 20 Hz (the ticket 09 stress test held 60 at about 1,185 messages a second), so rooms stay at 60 rather than growing.

## Consequences

- Changing scene closes one socket and opens another, as the cursor sync prototype first built and verified. With Turnstile dropped (deploy pipeline ticket), a reconnect is only socket setup.
- Visitors are never moved between rooms. Rooms consolidate as visitors change scene or reconnect, since every placement is fill first.
- Duration is billed per awake room. About 30 visitors online around the clock is roughly $11 a month; 5,000 online around the clock for a whole month would be about $1,400, which is what the ceiling and kill switch are for.
- The spectator socket (shared props ticket) is retired: nobody waits for a slot.
- Each room's Foundry screen is its own shared prop state.
