# How Cursor Camp works

Type: research
Status: resolved
Part of: ../map.md

## Question

How does neal.fun/cursor-camp work from a user's and an engineer's perspective: scene layout, cursor identity, rooms, interactive objects, concurrency behaviour, mobile handling, and what is known about its realtime stack?

## Answer

Resolved 2026-09-23 by a research subagent during charting. Full report with sources: `docs/research/cursor-camp-mechanics.md`.

Gist: wide horizontally scrolling illustrated overworld with buildings as portals into interior scenes, each interior a single 2845x1600 WebP. Cursors carry a server-side GeoIP flag and cosmetics picked up in-scene; your own cursor is not visually distinct (a common complaint). Cursor shrinks toward the horizon and Z-sorts behind buildings. Shared props are visible to all and physics-heavy ones lag. Progress is per tab. Mobile uses an on-screen joystick with reports of high sensitivity and phone heating. Realtime stack is unpublished; the site sits behind a Cloudflare challenge, so it is inferred to be WebSockets, plausibly Durable Objects. Scripted input was not blocked.
