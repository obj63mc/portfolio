# Does cursor sync on the chosen backend feel right and degrade safely?

Type: prototype
Status: resolved
Part of: ../map.md
Blocked by: 02, 04, 12

## Question

Build a throwaway prototype on the recommended backend: one overworld room and one sub-scene room, cursors sent in world coordinates with the protocol from the sync-techniques ticket, GeoIP flag on each cursor, room handoff on entering a venue, and single-player degradation when the socket drops. Test with 20 simulated visitors. Judge latency, smoothness, bandwidth and the bill projection. Output: the prototype on a branch and a go or no-go on the backend.

## Answer

Resolved 2026-09-24. **GO on Cloudflare Durable Objects**, with one object hosting every scene's room (ADR 0004). The prototype is on branch `prototype/cursor-sync` at `prototypes/cursor-sync/`, live at https://cursor-sync-proto.barmadden.workers.dev. Its README has the run steps and measurements.

### Rate and feel

- **20 Hz up and 20 Hz down.** Joe tested on a phone: 20 Hz looked right, and 10 and 15 Hz looked jumpy. Clients send only when the cursor moved. The server ticks at 20 Hz and sends one frame of the changed cursors. Peers are drawn 100 ms behind with interpolation, and after a pause the last position is pinned one interval back so a peer doesn't slide across the gap.
- Edge echo (a visitor's own move coming back in a frame, including the tick wait) at 20 Hz was 49 ms median and 73 ms p95 with 20 bots, and 52 / 77 ms with 60. At 10 Hz it was 89 / 121 ms and at 15 Hz 62 / 87 ms.

### Hosting and caps

- **One Durable Object for the whole site.** Each scene is a room inside it, keyed by scene id, with its own fan-out and shared props. This caps duration at one object-month (about 328k GB-s, inside the 400k allowance). One object per scene could reach about $19.60 a month in duration if every room stayed occupied. Trade-off accepted: every visitor connects to one location, placed near whoever woke the object.
- **Global cap of 60 live cursors**, with spectators past that (ticket 10). The stress test put 60 always-moving bots into one object at 20 Hz: about 1,185 inbound messages a second, with no rate-limit closes, no dropped messages and no latency change. Downlink was 6.9 kB/s per client with all 60 on screen. Spectators are promoted longest-waiting first when a live cursor leaves.
- **Worst-case bill at 20 Hz with all 60 slots full around the clock: about $17 a month** ($5 base, about $11.60 for requests, $0 for duration). The real inbound rate was 35,700 messages per visitor-hour with bots idle a third of the time, and 70,600 with bots never idle.
- **No storage calls anywhere.** Room and shared-prop state stay in memory. Positions are copied into socket attachments when the room goes still, so the object can hibernate and still know where everyone is when it wakes. The tick stops after two still seconds.

### Wire format

Moves and frames are hand-packed binary. A move up is 5 bytes: `[1, x u16, y u16]`, whole world px. A frame down is `3 + 6n` bytes: `[2, n u16, (id u16, x u16, y u16) * n]`. Rare messages are JSON text: `hello` (id, country code, server time, rate, cap, peers, screen), `in`, `out`, `cos`, `live` (promotion), `screen`, and `ping`/`pong`. This replaces the MessagePack in the sync-techniques sketch: it needs no dependency and is smaller. Keepalive is a `"ping"` text frame answered by auto-response, so the object isn't woken.

### Protection

- Turnstile token checked in the Worker before the upgrade, plus an Origin check. Measured join time with Turnstile was 1.7 to 1.9 s, and the scene is single-player until `hello` arrives.
- A per-socket token bucket at twice the rate with a burst of four seconds, then close 4008. The client waits 5 s before reconnecting.
- Positions are clamped to the scene. JSON frames over 256 bytes and unknown ops are dropped, and spectator messages are ignored.
- GeoIP from `request.cf.country`, with the St. Louis flag as the fallback.

### Degradation (verified in two browsers)

- Socket down: peers vanish and the Foundry screen runs locally. Reconnect uses backoff from 0.5 s to 30 s with jitter. The next `hello` snapshot overwrites local screen state without animation.
- Hidden tab: stops sending at once and closes after 60 s to free its slot. It reconnects when visible again.
- Room handoff (overworld to theatre and back) closes one socket and opens the next. In the single-object design this becomes a `join <scene>` message on one socket. The prototype still uses one object per scene, which the stress test stood in for.

### Shared screen (ticket 10) held as specified

The first accepted `play` wins, ops are dropped while the reel is busy, there is no optimistic change, state resets when the room empties, and the snapshot lets a late joiner land mid-reel. Two clients stayed in step.

### Surfaced

- Joe, on a phone with 20 bots: your own cursor is hard to find in a crowd and should stand out more, perhaps larger than other visitors' cursors. This is the new own-cursor ticket.
- Cloudflare has no billing cap, so the $17 worst case holds only while the code limits hold: 20 Hz, 60 live cursors, one object. Monitoring stays with the deploy fog.
- After one deploy, every socket closed with 1006 before `hello` on the first run, and the rerun was clean. Watch for it in the deploy pipeline.

## Comments

2026-09-23, from the shared-props ticket (10): the one shared prop is the Foundry screen, state `idle | playing { title, startedAt }`, op accepted only while idle, first accepted wins, no optimistic client change, in-memory only, reset on empty room, join snapshot carries prop state plus server time. Prove it with the screen. Also include the spectator socket for over-cap visitors: receive cursors and prop state, send nothing.


2026-09-23, from the cursor identity ticket (11): drop the `name` field. Presence per visitor is id, server-assigned flag, worn cosmetic id 0 to 7, gold bit; cosmetic changes go as a presence update, not per tick. Clients ignore position updates for peers outside the camera. Idle peers are never faded or removed client-side; they leave when the socket closes. Flag fallback for unknown geo is the St. Louis city flag.

2026-09-23, from a pricing review with Joe: on Durable Objects, incoming WebSocket messages bill as compute requests at 20:1 ($0.15 per million) and outgoing messages are free, but any storage API call (SQL, `put()`, `delete()`, `setAlarm()`) bills as a row write at $1 per million with no discount. Persisting cursor positions would turn 1.3 billion messages a month into a four-figure bill. Rule for the prototype: the Durable Object must never call storage on the message path; room and shared prop state stay in memory. Also note duration is billed while a room is occupied (the object does not hibernate under continuous traffic); the 400,000 GB-s allowance covers about 890 room-hours a month. The Workers Free plan (100,000 requests and 13,000 GB-s per day, hard stop) is a genuine $0 hard cap worth measuring against: about 37 visitor-hours of movement per day before multiplayer drops to single-player until UTC midnight.

2026-09-24, from the rendering prototype ticket (08): cursors are drawn on an overlay canvas above the prop button layer (ADR 0003). The rendering prototype on branch `prototype/rendering-camera` already has the client half of this: simulated peers sent at 15 Hz, drawn 100 ms behind with interpolation, off-camera peers culled (`src/lib/proto/peers.ts`), plus the atlas drawing (`renderers/draw-cursors.ts`) and the lobby URL handoff. Swap the simulated peers for the real socket rather than rebuilding the renderer.

2026-09-24, from the provisioning ticket (12): the account is ready. It is on Workers Paid, deploys to `barmadden.workers.dev`, and has a $20 budget alert that only notifies. Wrangler is logged in locally through OAuth; use `npx wrangler@4` because wrangler isn't installed globally. The prototype's `wrangler.toml` needs a Durable Object binding with a `new_sqlite_classes` migration. For Turnstile, use the test site key `1x00000000000000000000AA`.

2026-09-24, prototype built (claimed, awaiting Joe's phone run): branch `prototype/cursor-sync`, `prototypes/cursor-sync/`, live at https://cursor-sync-proto.barmadden.workers.dev. It is ticket 08's variant B with the simulated peers swapped for a real socket, plus a Worker (Turnstile and Origin check on join, GeoIP from `request.cf.country`) and one `Room` Durable Object per scene per rate, with no storage calls. The Foundry theatre at `/midtown/foundry` has the shared screen, and the spectator overflow is in. The wire format is hand-packed binary for moves (5 bytes up, 3 + 6n bytes per frame down) and JSON for the rare control messages, not MessagePack. The bots measured this against the deployed edge (20 bots, 45 s):

| rate | echo p50 / p95 | down per visitor | inbound msgs per visitor-hour |
| --- | --- | --- | --- |
| 10 Hz | 89 / 121 ms | 0.55 kB/s | 16,100 |
| 15 Hz | 62 / 87 ms | 0.8 kB/s | 24,800 |
| 20 Hz | 49 / 73 ms | 1.15 kB/s | 35,700 |

Verified locally in two browsers and with bots: 30 live plus 5 spectators with promotion, the shared screen in step on both clients, socket drop to single-player with a local screen, the reconnect snapshot overwriting the local reel, and the overworld to theatre room handoff.

Cost finding: at 15 Hz, requests cost about $8 a month even with all 60 live slots full around the clock. Duration is the larger term. Six scene objects, all occupied and awake all month, cost 6 x 730 h x 450 GB-s = 1.97M GB-s, about $19.60 over the 400k allowance. With the $5 base the worst case is about $33, over the $25 ceiling. The per-room caps bound messages, not room-hours. A single Durable Object hosting every scene as a room inside it would cap duration at 730 h x 450 = 328k GB-s, inside the allowance, for a worst case of about $13. That would also make the 60 cap a true global cap. Open for Joe to decide in the feel session.
