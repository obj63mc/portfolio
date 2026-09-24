# One Durable Object hosts every room

All scene rooms (the overworld and every sub-scene) live inside a single Cloudflare Durable Object. Each room is a set of sockets keyed by scene id, with its own 20 Hz fan-out and its own shared props. We chose this over one object per scene, which the backend research proposed and the cursor sync prototype (ticket 09) first built. Duration is billed per awake object, and the per-room caps limit messages but not how many rooms are awake. Six objects kept busy all month would bill about $19.60 in duration alone and push the worst case to about $36, over the $25 ceiling. A single object can never exceed the 400k GB-s allowance, so the worst case is about $17, and the 60-cursor cap becomes one global count with no coordination. The prototype's stress test put 60 always-moving cursors at 20 Hz into one object: about 1,185 inbound messages a second with no drops and no latency change.

## Consequences

- Every visitor connects to one location, placed near whoever woke the object. Visitors far from it see more lag. We accept this for a St. Louis portfolio.
- Changing scene is a message on the open socket, not a reconnect, so the join and Turnstile cost is paid once per visit.
- One object is a single-threaded ceiling of roughly 1,000 to 1,200 inbound messages a second. That is the headroom above 60 live cursors at 20 Hz. Raising the cap or the rate means revisiting this ADR.
