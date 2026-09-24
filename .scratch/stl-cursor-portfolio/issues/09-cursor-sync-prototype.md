# Does cursor sync on the chosen backend feel right and degrade safely?

Type: prototype
Status: claimed
Part of: ../map.md
Blocked by: 02, 04, 12

## Question

Build a throwaway prototype on the recommended backend: one overworld room and one sub-scene room, cursors sent in world coordinates with the protocol from the sync-techniques ticket, GeoIP flag on each cursor, room handoff on entering a venue, and single-player degradation when the socket drops. Test with 20 simulated visitors. Judge latency, smoothness, bandwidth and the bill projection. Output: the prototype on a branch and a go or no-go on the backend.

## Comments

2026-09-23, from the shared-props ticket (10): the one shared prop is the Foundry screen, state `idle | playing { title, startedAt }`, op accepted only while idle, first accepted wins, no optimistic client change, in-memory only, reset on empty room, join snapshot carries prop state plus server time. Prove it with the screen. Also include the spectator socket for over-cap visitors: receive cursors and prop state, send nothing.


2026-09-23, from the cursor identity ticket (11): drop the `name` field. Presence per visitor is id, server-assigned flag, worn cosmetic id 0 to 7, gold bit; cosmetic changes go as a presence update, not per tick. Clients ignore position updates for peers outside the camera. Idle peers are never faded or removed client-side; they leave when the socket closes. Flag fallback for unknown geo is the St. Louis city flag.

2026-09-23, from a pricing review with Joe: on Durable Objects, incoming WebSocket messages bill as compute requests at 20:1 ($0.15 per million) and outgoing messages are free, but any storage API call (SQL, `put()`, `delete()`, `setAlarm()`) bills as a row write at $1 per million with no discount. Persisting cursor positions would turn 1.3 billion messages a month into a four-figure bill. Rule for the prototype: the Durable Object must never call storage on the message path; room and shared prop state stay in memory. Also note duration is billed while a room is occupied (the object does not hibernate under continuous traffic); the 400,000 GB-s allowance covers about 890 room-hours a month. The Workers Free plan (100,000 requests and 13,000 GB-s per day, hard stop) is a genuine $0 hard cap worth measuring against: about 37 visitor-hours of movement per day before multiplayer drops to single-player until UTC midnight.

2026-09-24, from the rendering prototype ticket (08): cursors are drawn on an overlay canvas above the prop button layer (ADR 0003). The rendering prototype on branch `prototype/rendering-camera` already has the client half of this: simulated peers sent at 15 Hz, drawn 100 ms behind with interpolation, off-camera peers culled (`src/lib/proto/peers.ts`), plus the atlas drawing (`renderers/draw-cursors.ts`) and the lobby URL handoff. Swap the simulated peers for the real socket rather than rebuilding the renderer.

2026-09-24, from the provisioning ticket (12): the account is ready. It is on Workers Paid, deploys to `joe-3ed.workers.dev`, and has a $20 budget alert that only notifies. Wrangler is logged in locally through OAuth; use `npx wrangler@4` because wrangler isn't installed globally. The prototype's `wrangler.toml` needs a Durable Object binding with a `new_sqlite_classes` migration. For Turnstile, use the test site key `1x00000000000000000000AA`.

2026-09-24, prototype built (claimed, awaiting Joe's phone run): branch `prototype/cursor-sync`, `prototypes/cursor-sync/`, live at https://cursor-sync-proto.joe-3ed.workers.dev. It is ticket 08's variant B with the simulated peers swapped for a real socket, plus a Worker (Turnstile and Origin check on join, GeoIP from `request.cf.country`) and one `Room` Durable Object per scene per rate, with no storage calls. The Foundry theatre at `/midtown/foundry` has the shared screen, and the spectator overflow is in. The wire format is hand-packed binary for moves (5 bytes up, 3 + 6n bytes per frame down) and JSON for the rare control messages, not MessagePack. The bots measured this against the deployed edge (20 bots, 45 s):

| rate | echo p50 / p95 | down per visitor | inbound msgs per visitor-hour |
| --- | --- | --- | --- |
| 10 Hz | 89 / 121 ms | 0.55 kB/s | 16,100 |
| 15 Hz | 62 / 87 ms | 0.8 kB/s | 24,800 |
| 20 Hz | 49 / 73 ms | 1.15 kB/s | 35,700 |

Verified locally in two browsers and with bots: 30 live plus 5 spectators with promotion, the shared screen in step on both clients, socket drop to single-player with a local screen, the reconnect snapshot overwriting the local reel, and the overworld to theatre room handoff.

Cost finding: at 15 Hz, requests cost about $8 a month even with all 60 live slots full around the clock. Duration is the larger term. Six scene objects, all occupied and awake all month, cost 6 x 730 h x 450 GB-s = 1.97M GB-s, about $19.60 over the 400k allowance. With the $5 base the worst case is about $33, over the $25 ceiling. The per-room caps bound messages, not room-hours. A single Durable Object hosting every scene as a room inside it would cap duration at 730 h x 450 = 328k GB-s, inside the allowance, for a worst case of about $13. That would also make the 60 cap a true global cap. Open for Joe to decide in the feel session.
