# How do production multiplayer-cursor apps sync and protect cursors?

Type: research
Status: resolved
Part of: ../map.md

## Question

What are the established techniques for live cursor sync in the browser, from primary sources (Figma, Liveblocks, tldraw, Excalidraw engineering posts and docs, Cloudflare Durable Objects examples): send rate and throttling per client, client-side interpolation and smoothing, coordinate systems for a pannable world (world versus viewport coordinates), message encoding (JSON versus binary), room size limits and what breaks first, handling of hidden tabs and reconnects, and abuse mitigations against scripted input and flooding. Produce a recommended protocol sketch for this project: message shapes, rates, and room caps.

## Answer

Resolved 2026-09-23 by a research subagent. Full note with sources on branch `research/cursor-sync-techniques` at `docs/research/cursor-sync-techniques.md` (commit 710a2da).

Key findings from primary sources:
- Send rate consensus is 20 to 30 Hz uplink (Figma 33 ms, Excalidraw 33 ms, tldraw 30 fps dropping to 1 Hz when alone, Liveblocks default 100 ms) with last-write coalescing and batched server fan-out per tick.
- Room caps: Figma shows 200 cursors of 500 participants and drops cursors first; tldraw.com caps 50 connections per Durable Object; Liveblocks 10 to 100 by plan. Fan-out (N × N × rate) breaks before socket limits.
- Encoding: JSON is the norm; PartyKit's cursor demo used MessagePack; Figma does not document its wire format.
- Interpolation: render about 100 ms behind and lerp between snapshots; Liveblocks recommends springs.

Recommended protocol for this project: one room per scene, MessagePack, world coordinates, 20 Hz uplink and 20 Hz batched downlink, 100 ms interpolation delay, 40-cursor room cap with overflow to sibling rooms, 15 s heartbeat, away state on visibilitychange, Turnstile on join, per-socket token bucket 25 msg/s with burst 50, server-side clamping of positions and prop ops. Concrete message examples are at the end of the note. Cursor Camp publishes no verifiable numbers.

## Comments

2026-09-24, amended by [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): Turnstile on join is dropped. The site has no form, and the Origin check (at the WAF edge and in the Worker), the token bucket, 60-visitor rooms and the visitor ceiling guard the socket. Rooms overflow into sibling rooms of the same scene at 60, which is close to this note's overflow idea (ADR 0005).
