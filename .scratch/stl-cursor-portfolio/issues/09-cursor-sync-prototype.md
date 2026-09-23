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
