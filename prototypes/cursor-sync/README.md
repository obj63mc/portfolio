# Cursor sync prototype (throwaway)

Answers wayfinder ticket 09 on the St. Louis cursor portfolio map: **does cursor sync on Cloudflare
Durable Objects feel right and degrade safely?** Built on the ticket 08 renderer (variant B: canvas
props, DOM hit targets, cursor overlay canvas), with its simulated peers swapped for a real socket.
Nothing here ships. The branch `prototype/cursor-sync` is the primary source; the ticket holds the verdict.

Live at **https://cursor-sync-proto.joe-3ed.workers.dev** (Workers Paid, `joe-3ed` account).

## Run it

```sh
cd prototypes/cursor-sync
npm install
npm run deploy                       # build, then wrangler deploy (static assets + Worker + Durable Object)
npm run local                        # the same on http://localhost:8787 (and the LAN) via wrangler dev
npm run bots -- --url wss://cursor-sync-proto.joe-3ed.workers.dev --n 20 --hz 15 --secs 60
```

## What's here

- `worker/index.ts`: the Worker serves the static build and upgrades `/ws/<room>?hz=` to the room's
  Durable Object after checking Origin and a Turnstile token (test keys, always pass). `/stats/<room>?hz=`
  returns the room's counters and a per-visitor-hour projection. GeoIP comes from `request.cf.country`.
- `Room` Durable Object: WebSocket Hibernation API, **no storage calls at all**. Positions sit in memory
  and are copied into socket attachments when the room goes still, so a room that woke from hibernation
  still knows where everyone is. A tick at the room rate sends one binary frame of changed cursors to
  every socket, and stops after two still seconds so the object can hibernate. Each socket has a token
  bucket (2x rate, burst 4x) and is closed with 4008 if it runs dry. Positions are clamped to the scene.
- Caps: 30 live cursors on the overworld, 6 per sub-scene (30 + 5 x 6 = 60, the global bound). Visitors
  past the cap are **spectators**: they receive everything and send nothing, and the longest-waiting
  one is promoted when a live cursor leaves.
- Foundry screen at `/midtown/foundry` (placeholder art from the lobby, lights down): three posters, one
  shared screen, state `null | { title, startedAt }` in memory, first accepted `play` wins, ops dropped
  while busy, no optimistic change, reset when the room empties, snapshot in `hello`.
- `src/lib/proto/protocol.ts`: the wire format shared by all of the above. Moves up are 5 bytes
  (`[1, x u16, y u16]`), frames down are `3 + 6n` bytes; control messages are small JSON text frames.
- `src/lib/proto/net.ts`: the client socket. Sends at most `hz` a second and only when the cursor moved;
  interpolates peers `delay` ms behind; culls off-camera peers; measures RTT, echo (its own move coming
  back in a frame, so including the tick wait), join time and downlink. Socket down: peers vanish, the
  screen runs locally, reconnect with backoff 0.5 s to 30 s plus jitter; the next `hello` overwrites the
  local screen without animation. Hidden tab: stops sending at once, gives up its slot after 60 s.
- `scripts/bots.mjs`: simulated visitors (wander, pause about a third of the time), with echo latency,
  downlink per bot and the inbound message rate per visitor-hour.

## Test controls

HUD (top left) lines 3 to 5 are the network. Gear: **Drop socket for 10 s**, send rate (10 / 15 / 20 Hz;
rooms at different rates are separate objects, so compare on the same rate), interpolation delay,
Turnstile on/off, and ticket 08's simulated peers instead of the socket.

## Measured (bots on Joe's Mac to the deployed edge, 20 bots, 45 s each)

| rate | echo p50 / p95 | downlink per visitor | frames/s | inbound msgs per visitor-hour |
| --- | --- | --- | --- | --- |
| 10 Hz | 89 / 121 ms | 0.55 kB/s | 10 | 16,100 |
| 15 Hz | 62 / 87 ms | 0.8 kB/s | 15 | 24,800 |
| 20 Hz | 49 / 73 ms | 1.15 kB/s | 20 | 35,700 |

Locally: 35 bots gave 30 live + 5 spectators, spectators promoted as live bots left; socket drop,
local screen, snapshot overwrite and the overworld/theatre handoff all behaved in the browser.
The first 10 Hz run right after a deploy failed every socket with 1006 before `hello`; the rerun was
clean. Watch for it after deploys.

## Ticket 15: own cursor in a crowd (branch `prototype/own-cursor`)

`?own=` picks own-cursor treatments by letter, combinable: A baseline (halo + fading "you" tag),
B bigger own cursor (`?ownk=`), C beacon ring and ping, D smaller peer cursors (`?peerk=`), E persistent
"you" bubble. The floating switcher cycles A to E and BD. All of it is local drawing; nothing is on the wire.
Try it with `npm run dev`, then `http://<mac-ip>:5173/?bots=20` on a phone.

Verdict (Joe, 2026-09-24): **BD**. Own cursor at 1.25x, peers at 0.75x, peers stay fully opaque, on top of
the baseline halo and fading tag. This is now the default.
