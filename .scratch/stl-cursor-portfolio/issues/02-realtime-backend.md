# Which realtime backend hosts cursor rooms under $25/month?

Type: research
Status: resolved
Part of: ../map.md

## Question

Which WebSocket/realtime service should host presence rooms and low-latency cursor broadcast for the portfolio, given: PartyKit is excluded; total hosting must stay under $25/month with a hard spend cap so a traffic spike cannot run up a bill; one room per scene (overworld plus roughly seven sub-scenes); a small number of server-authoritative shared props per room; and a GeoIP country code must be available per visitor for the cursor flag. The frontend is a SvelteKit static site, so the backend is separate from the page host.

Compare at least: Cloudflare Workers with Durable Objects (WebSocket hibernation, no PartyKit), Supabase Realtime (presence and broadcast), Ably, Liveblocks, Pusher, Convex, and a self-hosted Bun or uWebSockets server on Fly.io or Hetzner. For each: pricing at 20, 200 and 2,000 concurrent visitors, whether a hard spend cap exists, message rate limits, presence support, GeoIP availability, server-side logic for shared props, and static-host pairing (Cloudflare Pages, Netlify, Vercel). End with one recommendation and one fallback.

## Answer

Resolved 2026-09-23 by a research subagent. Full comparison with pricing arithmetic and sources on branch `research/realtime-backend` at `docs/research/realtime-backend.md` (commit 9f84717).

**Recommendation: Cloudflare Workers + Durable Objects using the WebSocket Hibernation API, one Durable Object per scene, paired with Cloudflare Pages for the static site.** Outgoing WebSocket messages are free and inbound is billed at 20:1, `request.cf.country` gives GeoIP for free, and the Durable Object holds authoritative shared-prop state. Rough monthly cost: about $15 at 20 concurrent visitors at 25 Hz, about $102 at 200, about $977 at 2,000, because cost scales with inbound messages.

**Spend cap caveat:** Cloudflare has no hard billing cap; budget alerts are informational. The cap must be enforced in code: a 15 Hz client send rate plus a global cap of 60 live cursors bounds worst-case spend at about $22/month even with 60 visitors connected around the clock. Visitors beyond the cap get single-player mode.

**Fallback:** Bun with uWebSockets on a Hetzner CX23 (about €6/month, fixed price, 20 TB included) behind the free Cloudflare proxy for `CF-IPCountry` and TLS. Costs are fixed but it is single-region and carries ops burden.

**Ruled out:** Supabase Realtime, Ably, Pusher, Liveblocks and Convex. Fan-out billing or per-room limits put even 20 visitors in the thousands per month, or block 25 Hz outright (Pusher caps client events at 10/s, Liveblocks caps 10 connections per room on lower tiers).

**Open tension for the sync prototype:** the sync-techniques note recommends 20 Hz and 40-cursor rooms; this note's cost bound assumes 15 Hz and 60 live cursors globally. The prototype should measure whether 15 Hz feels acceptable and settle the rate and caps together.

## Comments

2026-09-24, amended by [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): the spend cap is no longer held in code. Rooms hold 60 visitors each, with one Durable Object per room and overflow into new rooms per scene (ADR 0005, superseding ADR 0004). Cost is bounded by real traffic, a configurable site-wide visitor ceiling (default 1,000) and a manual kill switch script.
