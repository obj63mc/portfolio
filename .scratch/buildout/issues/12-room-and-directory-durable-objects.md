# 12: Room and directory Durable Objects, wire protocol, guards, ceiling, kill switch

**What to build:** The Worker upgrades `/ws` into rooms: each room is its own Durable Object named `scene:n` holding up to 60 visitors, and a directory object that hears only joins and leaves places each visitor fill-first (the fullest room of their scene with space, else a new room) and enforces the site-wide `MAX_VISITORS` ceiling from wrangler config (default 1,000), past which the upgrade is refused. Two bot clients through `wrangler dev` see each other's moves. Wire format per the spec: 5-byte moves up, `3 + 6n`-byte frames down at 20 Hz of changed cursors, JSON control (`hello` with id, country, server time, rate, cap, peers and the shared-prop snapshot; `in`; `out`; presence with worn id, gold bit and river bit; `ping`/`pong`). The flag comes from `request.cf.country` at join, never from the client. Guards: Origin check in the Worker (with the `previews` override), a per-socket token bucket at twice the rate with a four-second burst then close 4008, positions clamped to the scene, JSON over 256 bytes and unknown ops dropped, cosmetic ids validated 0 to 7, the 60 cap and the ceiling. Hibernation: keepalive is a `ping` text frame answered by the auto-response; positions are copied into socket attachments when the room goes still; the tick stops after two still seconds; no `setInterval`; neither object ever calls storage on any path. Both classes use the declarative `exports` config with the SQLite storage type. A `MULTIPLAYER` secret set to `off` makes the Worker refuse `/ws` upgrades; `npm run multiplayer:off` and `npm run multiplayer:on` set and delete it.

Carries over the pointer-lock prototype's Worker (Origin check, GeoIP, upgrade), Room object and protocol module, minus Turnstile and spectators, restructured per room with the directory object (ADR 0005). The prototype's bots script becomes the seam 1 test.

**Blocked by:** 06 (the Worker)

**Status:** ready-for-agent

- [ ] Two bot clients in `wrangler dev` exchange moves through a room; a third on another scene lands in a different room
- [ ] Seam 1 assertions against `wrangler dev`: fill-first placement and overflow at 60, the ceiling refusing the 1,001st, the token-bucket 4008 close, the frame encoding round trip, and that no storage API is ever invoked on any path
- [ ] `hello` carries the server-assigned country code and server time; presence updates are validated and fanned out when they happen, never in the tick frame
- [ ] A foreign `Origin` is refused by the Worker itself; a Preview origin is accepted through the override
- [ ] `npm run multiplayer:off` makes `/ws` refuse upgrades; `multiplayer:on` restores them
- [ ] `MAX_VISITORS` is a wrangler config value
