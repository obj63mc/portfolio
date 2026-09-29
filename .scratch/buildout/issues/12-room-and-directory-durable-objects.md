# 12: Room and directory Durable Objects, wire protocol, guards, ceiling, kill switch

**What to build:** The Worker upgrades `/ws` into rooms: each room is its own Durable Object named `scene:n` holding up to 60 visitors, and a directory object that hears only joins and leaves places each visitor fill-first (the fullest room of their scene with space, else a new room) and enforces the site-wide `MAX_VISITORS` ceiling from wrangler config (default 1,000), past which the upgrade is refused. Two bot clients through `wrangler dev` see each other's moves. Wire format per the spec: 5-byte moves up, `3 + 6n`-byte frames down at 20 Hz of changed cursors, JSON control (`hello` with id, country, server time, rate, cap, peers and the shared-prop snapshot; `in`; `out`; presence with worn id, gold bit and river bit; `ping`/`pong`). The flag comes from `request.cf.country` at join, never from the client. Guards: Origin check in the Worker (same-origin, from ticket 06: no `previews` var needed, so the client builds the socket URL from `location`), a per-socket token bucket at twice the rate with a four-second burst then close 4008, positions clamped to the scene, JSON over 256 bytes and unknown ops dropped, cosmetic ids validated 0 to 7, the 60 cap and the ceiling. Hibernation: keepalive is a `ping` text frame answered by the auto-response; positions are copied into socket attachments when the room goes still; the tick stops after two still seconds; no `setInterval`; neither object ever calls storage on any path. Both classes use the declarative `exports` config with the SQLite storage type. A `MULTIPLAYER` secret set to `off` makes the Worker refuse `/ws` upgrades; `npm run multiplayer:off` and `npm run multiplayer:on` set and delete it.

Carries over the pointer-lock prototype's Worker (Origin check, GeoIP, upgrade), Room object and protocol module, minus Turnstile and spectators, restructured per room with the directory object (ADR 0005). The prototype's bots script becomes the seam 1 test.

**Blocked by:** 06 (the Worker)

**Status:** ready-for-human

- [x] Two bot clients in `wrangler dev` exchange moves through a room; a third on another scene lands in a different room
- [x] Seam 1 assertions against `wrangler dev`: fill-first placement and overflow at 60, the ceiling refusing the 1,001st, the token-bucket 4008 close, the frame encoding round trip, and that no storage API is ever invoked on any path
- [x] `hello` carries the server-assigned country code and server time; presence updates are validated and fanned out when they happen, never in the tick frame
- [x] A foreign `Origin` is refused by the Worker itself; a Preview origin is accepted through the override
- [ ] `npm run multiplayer:off` makes `/ws` refuse upgrades; `multiplayer:on` restores them
- [x] `MAX_VISITORS` is a wrangler config value

## Comments

2026-09-29, implemented in one commit. The kill-switch box waits on Joe: the Worker side is verified locally, but the scripts set and delete a secret on the deployed Worker, which doesn't exist until 06's deploy (see the end).

**Shape.** `worker/index.ts` is the fetch handler alone, so Node's test runner can import it. `worker/rooms.ts` is the Worker's entry (`main`): it holds `Room` and `Directory` and re-exports the handler. Both classes extend `DurableObject` from `cloudflare:workers`, which `ctx.exports` requires and Node can't load. `src/lib/net/protocol.ts` is the wire protocol, in erasable syntax, for ticket 13's client to import. `worker/cloudflare.d.ts` declares the few runtime types used, instead of installing `@cloudflare/workers-types`, whose globals clash with the DOM library the site's check loads.

**Socket URL.** `/ws/<scene id>` on the page's own origin; the id is `overworld` or a sub-scene's slug from `SUB_SCENES` (spec bullet updated). The Worker checks, in order: same origin (403), `MULTIPLAYER=off` (503), a known scene (404), an upgrade (426). It then asks the directory for a room (503 past the ceiling) and forwards the upgrade to `https://room/?room=<scene:n>&cc=<country>`, a URL built fresh so nothing from the client's URL reaches the room. The country is `request.cf.country`, or `XX` without one. Scene sizes for the clamp come from the scene modules; the bundle is 54 KiB, mostly their text.

**Config.** `[exports.Room]` and `[exports.Directory]`, each `type = "durable-object"` and `storage = "sqlite"`, with no bindings or migrations (wrangler rejects `exports` beside `migrations`). Under `wrangler dev` both namespaces appear on `ctx.exports`, in the Worker and inside the objects, and `wrangler deploy --dry-run` accepts the config. `exports` is top-level only (the `previews` schema has no such key); each Preview gets its own namespaces through `ctx.exports`. `MAX_VISITORS = 1000` is in `[vars]` and in `[previews.vars]`, which replaced the empty `[previews]` block. A missing or non-numeric ceiling refuses everyone rather than lifting the bound.

**Preview origin (stale box wording).** 06 replaced the `previews` override with the same-origin rule, so there is no override. The box is met by that rule: `tests/deploy.test.ts` sends a Preview's own workers.dev origin to its own URL and it reaches a room.

**Directory.** One object, named `directory`, with counts in memory:

- `place(scene)` returns the fullest room of that scene under 60, else the lowest free `scene:n`, and counts the placement. It returns null once the site total reaches `MAX_VISITORS`.
- Rooms report their true count with `size(room, n)` after every join and leave, and when they refuse a joiner for being full, each room through one directory stub so that its reports arrive in order. The report overwrites the directory's count, which corrects any placement that never arrived. An empty room is forgotten and its number reused. (Join reports came from the code review: with only leaves and refusals reporting, a placement whose upgrade never arrived stayed counted, and a restarted directory relearned a room only when someone left it.)
- **Restart:** an idle directory is evicted and starts empty. Rooms keep working throughout, and the directory relearns each room from that room's next join, leave or refusal. Until then it undercounts the ceiling, and it can place a joiner in a room that is really full. That room refuses them (single-player) and corrects the count, so their backoff retry lands elsewhere. This is marked `ponytail:` in the code; if it ever matters, rooms can report joins too.

**Room.**

- Hibernation API: `acceptWebSocket`, with `setWebSocketAutoResponse('ping', 'pong')` for keepalives. Each socket's attachment, `{ room, peer }`, is saved on join, on a presence change and when the room goes still, and the constructor rebuilds the room from it.
- The tick is a `setTimeout` chain at 20 Hz. It sends one frame of the moved cursors to everyone, the mover included, and stops after 40 still ticks (2 s). Moves are clamped to the scene's w and h.
- Ids are the lowest free in the room, which is all a client needs: a reused id always follows the old one's `out`.
- Token bucket, the prototype's values: 80 tokens (four seconds at the rate), refilled at 40 a second. Every message counts (keepalive pings never reach the handler). Past it, close 4008 (`RATE_LIMITED`).
- Presence: `{"t":"presence","cos","gold","river"}` up, validated by `readControl` (at most 256 bytes, a known op, `cos` an integer 0 to 7, two booleans). A change fans out to the others as `{"t":"presence","id",...}`. A joiner starts at cosmetic 0 and sends its presence after `hello`, so there is no presence in the URL. An unchanged repeat is dropped (code review), so a client can't make the room fan out 40 JSON messages a second to 59 peers.
- `hello` adds `room` (its `scene:n`) to the spec's fields; `screen: null` is the shared-prop slot that 17 fills.
- A leave is reported to the directory before `out` goes to the room, so a peer that sees `out` knows the directory has counted it. The tests rely on this.
- **Close handshake (found by hand):** under `wrangler dev` the runtime doesn't answer a client's close frame on a hibernatable socket, although `web_socket_auto_reply_to_close` has been the default since 2026-04-07. A Node client took 11 s to close. `webSocketClose` now calls `ws.close()`, and the close takes 5 ms.
- **Hibernation (checked by hand, not in the suite):** a temporary log in the constructor. Two bots moved, then went still. About 10 s later the room was evicted, and pings every 5 s got `pong` without waking it. The next move rebuilt it from the attachments with the last position and presence, and a joiner then saw both.

**Kill switch.** `npm run multiplayer:off` runs `echo off | wrangler secret put MULTIPLAYER` (wrangler trims the piped value), and `multiplayer:on` runs `wrangler secret delete MULTIPLAYER`, which asks to confirm. Verified locally: `wrangler dev --var MULTIPLAYER:off` answers `/ws/overworld` with 503 "multiplayer is off", and without the var the rooms test connects. The secret is production's only; Previews have their own (`wrangler preview secret`).

**Tests.**

- `tests/protocol.test.ts` (pure): move and frame round trips, and malformed bytes. `readControl` keeps only a presence update's own fields, and drops a bad cosmetic id, non-boolean bits, unknown ops, bad JSON, over 256 characters, and over 256 bytes within 256 characters.
- `tests/deploy.test.ts` (the gate, with stand-ins for `ctx.exports`): a foreign or missing Origin gets 403. Its own origin reaches `scene:1` in production, on a Preview URL and on localhost, with the geolocated country and nothing from the client's query. It gets 503 with multiplayer off and past the ceiling, 404 for an unknown scene (including `/ws/constructor`) and 426 without an upgrade, all with `nosniff`.
- `tests/rooms.test.ts` (seam 1, the prototype's bots as assertions): it boots `wrangler dev` on free ports with `--var MAX_VISITORS:70` and a temporary `--persist-to`; the bots are Node WebSockets sending the Origin header.
  - `hello`'s fields, including a country that isn't the client's `?cc=ZZ`.
  - Two bots exchange moves, clamped to the overworld's size; a bot in `foundry:1` hears nothing from the overworld.
  - Presence: invalid updates dropped, a valid one fanned out and not echoed, and present in a later joiner's `hello`.
  - The token bucket: 80 moves at once pass, 20 more close 4008.
  - Placement: 60 concurrent joins to `slu:1`, the 61st to `slu:2`, and a freed seat in `slu:1` filled first.
  - The ceiling: the 71st visitor is refused with 503 and admitted after a leave. This is the "1,001st" box, with the ceiling set low for the test.
  - Hibernation (added at Joe's request, 2026-09-29, after Cloudflare's hibernation example): statically, sockets are accepted with `this.ctx.acceptWebSocket`, with no `ws.accept()`, socket listeners or `setInterval` to pin the room in memory; at run time a `ping` gets `pong` from the runtime's auto-response, which the room's own handler can't send. Removing the auto-response or adding a `setInterval` each fails it. Eviction itself stays the hand check below, since no API forces it under `wrangler dev`.
  - Changing scene: a bot leaves the overworld's room, whose peer sees its `out`, and joins the Foundry's (added in the code review).
  - A foreign Origin refused by the real Worker.
  - The file keeps a ledger of the visitors the directory counts; a bot leaves it once a peer has seen its `out`, so the ceiling test is exact.
- **No storage, asserted three ways.** The type-check: the local `DurableObjectState` has no `storage`, so `this.ctx.storage` fails `npm run check`. A static check: the code in `rooms.ts`, comments stripped, never names storage, SQL or alarms. At run time, after every path above: each object's local SQLite file holds only wrangler's own `__miniflare_do_name` table, and `_cf_ALARM` is empty. Each was tried against a deliberate `this.ctx.storage.put`: the type-check errs, the static check fails, and the runtime check finds `_cf_KV`.
- **The rooms test runs in `npm test`, so in `npm run ci`.** It takes about 1.8 s (the whole suite 2.3 s of wall time), passed eight runs in a row and leaves no workerd behind. `tests/dev-server.test.ts` already boots Vite the same way. It creates an empty `build/` if there is none. The one risk is whether `wrangler dev` starts inside the Workers Builds container, which the first build there will show. If it doesn't, move the file to a `test:rooms` script.

Results: `npm run check` 0 errors, `npm run build`, `npm test` 63 tests with 62 passing and 1 todo (ticket 25's ATM).

**Left for Joe**, once the Worker is deployed (06, 07) and wrangler is logged in: `npm run multiplayer:off`, confirm a socket on `wss://barmadden.com/ws/overworld` is refused and the site runs solo, then `npm run multiplayer:on`, and tick the box. The first Workers Build also shows whether the rooms test runs there.
