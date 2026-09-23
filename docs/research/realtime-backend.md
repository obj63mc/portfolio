# Realtime backend for cursor rooms

Date: 2026-09-23. Question: which WebSocket/realtime service should host presence rooms and cursor broadcast for the portfolio (Cursor Camp style scene, ~8 rooms, a few server-authoritative shared props, GeoIP country per visitor, hard spend cap, under $25/month, PartyKit excluded)? Frontend is a SvelteKit static site on a separate host. All prices were read from vendor pages on 2026-09-23.

## Arithmetic base (used for every vendor)

- Seconds per month: 30 x 86,400 = 2,592,000.
- Send rate: 25 cursor messages/s per visitor.
- Inbound messages/month = N x 25 x 2,592,000 = N x 64.8M.
  N=20: 1.296B. N=200: 12.96B. N=2,000: 129.6B.
- Room size = N / 8 rooms: 2.5, 25, 250.
- Fan-out deliveries = inbound x (room - 1): 1.944B, 311B, 32.27T.
- "Counted" messages where a vendor bills publish + each delivery = inbound x room: 3.24B, 324B, 32.4T.

Decisive fact: every metered pub/sub vendor bills fan-out, so cost grows with N squared. Only Cloudflare Durable Objects (outgoing free) and a self-hosted box grow linearly.

## Comparison

| Service | $/mo at 20 | $/mo at 200 | $/mo at 2,000 | Hard spend cap | Rate limits | Presence | GeoIP | Server logic for props | Static-host pairing |
|---|---|---|---|---|---|---|---|---|---|
| Cloudflare Workers + DO (hibernation) | ~$15 | ~$102 | ~$977 | No (budget alerts only) | 1,000 req/s soft per DO; 32,768 sockets per DO | Build in DO memory | Yes, `request.cf.country` | Yes (DO is the authority) | Pages/Workers static assets free; any host via wss |
| Supabase Realtime | ~$8,112 | ~$810k | ~$81M | Yes (Pro Spend Cap, blocks at quota) | 500 msg/s Pro; presence 5 calls/client/30 s | Yes (not for cursors) | No | Yes (DB triggers, REST broadcast) | Any |
| Ably | ~$8,129 | ~$810k | ~$81M | No | 50 msg/s per connection and per channel publish | Yes | No | Own server or LiveObjects | Any |
| Pusher Channels | over top tier ($1,199) | n/a | n/a | Yes (rejects at 120%) | 10 client events/s per connection | Yes (100 members) | No | Own server via HTTP API | Any |
| Liveblocks | ~$1,698 | ~$17,250 | ~$172,770 | Free: yes; Pro: no | 10 connections per room (Free/Pro); throttle min 16 ms | Yes, native | No | Node SDK `mutateStorage` | Any (public key or auth endpoint) |
| Convex | ~$6,505 | ~$648k | ~$64.8M | Yes (team disable threshold) | 16 concurrent mutations (S16); 1,000 sessions | DB-backed component | No | Yes (mutations) | Any |
| Self-hosted Bun on Hetzner CX23 | ~$7 | ~$7 | ~$7 + traffic | Compute fixed; traffic overage €1/TB | Whatever you code; NIC bound | Build it | Via Cloudflare proxy `CF-IPCountry` or MaxMind | Yes | Any |
| Self-hosted Bun on Fly.io | ~$6 | ~$377 (raw) / ~$17 (batched) | ~$38.7k (raw) / ~$130 (batched) | No | Whatever you code | Build it | No header; MaxMind or Cloudflare proxy | Yes | Any |

## Per-vendor working

### Cloudflare Workers + Durable Objects

- Workers Paid $5/mo. DO requests: 1M included, then $0.15/M. Duration: 400,000 GB-s included, then $12.50/M GB-s, metered at 128 MB. https://developers.cloudflare.com/durable-objects/platform/pricing/
- WebSocket billing: "a 20:1 ratio is applied to incoming WebSocket messages" and "There is no charge for outgoing WebSocket messages." Objects "idle and eligible for hibernation are not billed for duration"; `setTimeout`/`setInterval` prevent hibernation. https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Requests: inbound / 20 = 64.8M, 648M, 6.48B billed. Cost = (billed - 1M) x $0.15/M = $9.57, $97.05, $971.85, plus $5 base. Duration is ~$0 if the DO only reacts to messages (no timers). Worst case, 8 DOs awake 24/7: 8 x 0.125 GB x 2,592,000 s = 2.59M GB-s, minus 0.4M included, x $12.50/M = +$27.40.
- At N=2,000 a 250-visitor room sends 6,250 msg/s, above the 1,000 req/s soft limit per object, so rooms would need sharding. https://developers.cloudflare.com/durable-objects/platform/limits/
- No spend cap: "Budget alerts are informational only. They do not pause or cap usage." https://developers.cloudflare.com/billing/manage/budget-alerts/ The Free plan hard-fails at 100,000 DO requests/day (2M messages, about one visitor), a cap but not a usable one.
- GeoIP: `request.cf.country` equals the `CF-IPCountry` header. https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
- Pairing: Pages and Workers static requests are free and unlimited; a Worker with assets binds a DO directly, Pages needs a separate DO Worker. https://developers.cloudflare.com/workers/static-assets/compatibility-matrix/ Browsers do not apply CORS to WebSocket upgrades, so Netlify/Vercel pages connect too (validate `Origin` yourself).

### Supabase Realtime

- Pro $25/mo includes 5M messages, then $2.50/M; 500 peak connections, then $10 per 1,000. "Each broadcast message counts as one message sent plus one message per subscribed client that receives it." https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages and https://supabase.com/pricing
- N=20: 3,240M counted, (3,240M - 5M) x $2.50/M = $8,087.50 + $25. The Spend Cap (on by default) covers Realtime messages and "further usage of that item is disallowed until the next billing cycle": the 5M quota is gone in about 3 hours at N=20. https://supabase.com/docs/guides/platform/cost-control
- Limits: Pro 500 msg/s counting deliveries. Presence is limited to 5 calls per client per 30 s and the docs say not to use it for cursors. https://supabase.com/docs/guides/realtime/limits

### Ably

- Standard $29/mo + $2.50/M messages + $1/M connection-minutes; Free 6M messages, 500 msg/s. Counting is inbound + one outbound per subscriber (echo on by default adds one more). https://ably.com/docs/platform/pricing/message-counting and https://ably.com/pricing
- N=20: $29 + 3,240M x $2.50/M = $8,129. Per-channel publish limit is 50/s; a 2.5-visitor room publishes 62.5/s. No hard cap: Ably "won't penalize your success by blocking usage". https://ably.com/docs/platform/pricing/limits

### Pusher Channels

- Sandbox 100 connections / 200k msgs/day; Startup $49 = 1M/day; top tier Growth Plus $1,199 = 90M/day. https://pusher.com/channels/pricing
- N=20 is 3.24B/30 = 108M messages/day, above every listed tier. Client events are capped at 10/s per connection, so 25 Hz publishing is impossible without a relay server. https://pusher.com/docs/channels/using_channels/events/ Hard cap exists (paid plans limited at 120%, then rejected).

### Liveblocks

- Billing is per "realtime collaboration minute": $0.002/min when 2+ people share a room, solo is free; Pro $30/mo with $30 credits; Free 3,000 minutes and hard caps. https://liveblocks.io/pricing and https://liveblocks.io/docs/pricing/limits
- Minutes = N x 43,200/mo: 864k, 8.64M, 86.4M x $0.002 = $1,728, $17,280, $172,800 (minus $30 credit). Presence updates are not metered; time is. Rooms allow 10 simultaneous connections on Free and Pro, so 25 and 250 per room are impossible.

### Convex

- Professional $25/dev/mo, 25M function calls, $2/M after; "subscription updates" count as calls. https://docs.convex.dev/production/state/limits and https://www.convex.dev/pricing
- N=20: 1.296B mutations + 1.944B subscription re-runs = 3.24B calls x $2/M = $6,480 + $25. Spending limits exist; the disable threshold is a true hard cap. https://docs.convex.dev/dashboard/teams#spending-limits
- Presence component is DB-backed with heartbeats, not an ephemeral channel. https://github.com/get-convex/presence

### Self-hosted Bun (uWebSockets) on Hetzner or Fly

- Bun's WebSocket server "is built on uWebSockets", with topic pub/sub and backpressure controls. https://bun.sh/docs/api/websockets
- Hetzner CX23 (2 vCPU, 4 GB) €5.49/mo + IPv4 €0.50, 20 TB included, overage €1/TB. "Your server's bill will never exceed its monthly price cap" covers compute; traffic overage is separate, and cost alerts are "a convenience feature rather than a spending limit". https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ , https://docs.hetzner.com/cloud/billing/faq/
- Fly shared-cpu-1x 256 MB ~$2/mo, IPv4 $2, egress $0.02/GB (NA/EU), no free tier, "We don't support billing alerts (yet)". https://fly.io/docs/about/pricing/ , https://fly.io/docs/about/cost-management/
- Egress at 60 B/message, raw fan-out: 117 GB, 18.7 TB, 1,936 TB/mo. Hetzner: €0, €0, ~€1,916. Fly: $2.33, $373, $38.7k. With server-side 20 Hz room snapshots (one packet per visitor per tick): 62 GB, 622 GB, 6.2 TB, inside Hetzner's 20 TB. A 250-cursor snapshot is ~3 KB not 60 B, so N=2,000 needs culling or a connection cap anywhere.
- GeoIP: Fly injects `Fly-Region` but no country header. https://fly.io/docs/networking/request-headers/ Cloudflare's free proxy in front (WebSockets on all plans) gives `CF-IPCountry`. https://developers.cloudflare.com/network/websockets/

## Recommendation

**Cloudflare Workers + Durable Objects with the WebSocket Hibernation API, one DO per scene, fronted by Cloudflare Pages.** It is the only managed option that fits: outgoing messages are free, inbound is billed at 20:1, GeoIP is free on the upgrade request, the DO holds the authoritative props, and N=20 costs about $15/mo.

Cloudflare has no billing cap, so enforce it in code; spend is a function of two numbers the DO controls, connections and inbound rate. Budget $20 above the $5 base = 133M billed requests = 2.66B inbound messages/month = ~1,030 msg/s sustained. Enforce: clients send at most 15 Hz (the DO drops faster senders); global cap of 60 live cursors across all rooms (extra visitors get read-only spectator mode); no `setInterval` so the DO stays hibernation-eligible. Worst case 60 x 15 x 2,592,000 / 20 = 116.6M requests = $17.34 + $5 = $22.34/mo even with 60 visitors 24/7. Add a Cloudflare budget alert at $20 as a backstop.

## Fallback

**Bun on a Hetzner CX23 behind the Cloudflare free proxy** (~€6/mo fixed, 20 TB included, `CF-IPCountry` for flags). Same 15 Hz throttle and connection cap keep bandwidth inside 20 TB. Cost is effectively fixed, but you own TLS, deploys, monitoring and a single region.

Supabase, Ably, Pusher, Liveblocks and Convex are ruled out at 25 Hz: fan-out billing or per-room limits put even N=20 in the thousands of dollars per month, or below the required message rate.
