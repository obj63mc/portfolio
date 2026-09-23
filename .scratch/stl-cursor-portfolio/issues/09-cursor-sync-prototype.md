# Does cursor sync on the chosen backend feel right and degrade safely?

Type: prototype
Status: open
Part of: ../map.md
Blocked by: 02, 04, 12

## Question

Build a throwaway prototype on the recommended backend: one overworld room and one sub-scene room, cursors sent in world coordinates with the protocol from the sync-techniques ticket, GeoIP flag on each cursor, room handoff on entering a venue, and single-player degradation when the socket drops. Test with 20 simulated visitors. Judge latency, smoothness, bandwidth and the bill projection. Output: the prototype on a branch and a go or no-go on the backend.

## Comments

2026-09-23, from the shared-props ticket (10): the one shared prop is the Foundry screen, state `idle | playing { title, startedAt }`, op accepted only while idle, first accepted wins, no optimistic client change, in-memory only, reset on empty room, join snapshot carries prop state plus server time. Prove it with the screen. Also include the spectator socket for over-cap visitors: receive cursors and prop state, send nothing.


2026-09-23, from the cursor identity ticket (11): drop the `name` field. Presence per visitor is id, server-assigned flag, worn cosmetic id 0 to 7, gold bit; cosmetic changes go as a presence update, not per tick. Clients ignore position updates for peers outside the camera. Idle peers are never faded or removed client-side; they leave when the socket closes. Flag fallback for unknown geo is the St. Louis city flag.

2026-09-23, from a pricing review with Joe: on Durable Objects, incoming WebSocket messages bill as compute requests at 20:1 ($0.15 per million) and outgoing messages are free, but any storage API call (SQL, `put()`, `delete()`, `setAlarm()`) bills as a row write at $1 per million with no discount. Persisting cursor positions would turn 1.3 billion messages a month into a four-figure bill. Rule for the prototype: the Durable Object must never call storage on the message path; room and shared prop state stay in memory. Also note duration is billed while a room is occupied (the object does not hibernate under continuous traffic); the 400,000 GB-s allowance covers about 890 room-hours a month. The Workers Free plan (100,000 requests and 13,000 GB-s per day, hard stop) is a genuine $0 hard cap worth measuring against: about 37 visitor-hours of movement per day before multiplayer drops to single-player until UTC midnight.
