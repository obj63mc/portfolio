# 13: Peers on screen: net client, cursor atlas, own cursor, degradation and reconnect

**What to build:** After Join, a visitor sees every other visitor in their room moving, and is seen: the client opens the socket on the scene's URL, sends moves at 20 Hz only when the cursor moved, draws peers 100 ms behind with interpolation, pins the last position one interval back after a pause, snaps on any jump over 400 world px, and neither draws nor interpolates peers outside the camera (no edge markers). Every cursor is drawn from one local sprite atlas: the flat-style arrow, 32 world px tall, white with a dark outline, a country-flag badge at the lower right (the St. Louis flag for unknown geo), cosmetic anchors reserved. The visitor's own cursor is drawn at 1.25x about the tip with a St. Louis blue halo and a "you" tag that fades after about two seconds on arrival, on every scene entry and after an Arch reset; peers at 0.75x, full opacity, idle where they stopped until their socket closes. Changing scene closes one socket and opens another. Degradation: when the socket is down, refused, over the ceiling or killed, peers vanish, the live region says "Offline, exploring solo", there is no reconnecting UI, reconnect uses jittered backoff from 0.5 s to 30 s, a close within the first second after `hello` is an ordinary drop, a hidden tab stops sending at once and closes after 60 s, and the next `hello` snapshot overwrites local state without animation. "N here" is derived from `hello`, `in` and `out`. Clicking another cursor does nothing. Bots (buildout ticket 07):
- The edge adds `Server-Timing: bot` to a bot's responses. A page whose navigation response carries it never opens a socket: it is single-player from the start, announces nothing and never retries.
- Read the flag with `performance.getEntriesByType('navigation')[0]?.serverTiming.some((t) => t.name === 'bot')`.
- The header exists only on barmadden.com, so `wrangler dev` and Previews always connect. The WAF also blocks `/ws` for the same bots, so this is the page's half of one rule.

Carries over the prototype's net, peers and cursor-drawing modules.

**Blocked by:** 11 (scene changes), 12 (rooms)

**Status:** resolved

- [x] Two browsers on `wrangler dev` see each other move with the specified sizes, halo, tag and flag badge; the tag fades and returns on scene entry
- [x] Hopping into a sub-scene joins that scene's room; the overworld peers are gone and the new room's appear
- [x] Killing the socket mid-session removes peers, announces "Offline, exploring solo" once, keeps the scene fully usable, and reconnects with backoff when the server returns
- [x] A hidden tab stops sending immediately and closes after 60 s; showing it reconnects
- [x] "N here" matches the room count
- [x] Playwright smoke: single-player when the socket is refused
- [x] A page flagged `Server-Timing: bot` opens no socket, announces nothing and never retries

## Comments

### Built, 2026-09-29

- **Client:** `src/lib/net/net.ts`, one socket on `/ws/<scene id>` from the first frame, so peers move behind the Join card; moves only from Join on. Backoff doubles from 0.5 s to 30 s with ±20 % jitter and resets once a socket has lived a second past its `hello`; 4008 waits 5 s. Keepalive is the `ping` text frame every **30 s** (spec gap 7), well inside Cloudflare's idle timeout. Server messages are narrowed by `readServer()` in `protocol.ts`. `serverNow()` is Date.now() plus the offset from the last `hello`, ignoring its one-way latency (tens of ms); it holds through a drop and is Date.now() before any `hello`.
- **Interpolation:** `src/lib/net/peers.ts`, pure and tested with a fake clock (`tests/peers.test.ts`).
- **Atlas:** `src/lib/engine/cursors.ts` rasterizes the white and gold bodies and the halo once at the session's scale; peers draw it scaled down. The own cursor's tag shows for 2 s and fades over 0.5 s. Cosmetic anchors are exported for ticket 16 (`ANCHORS`), clear of the flag badge.
- **Flags:** a sheet of every two-letter flag from the MIT `flag-icons` package (a devDependency), St. Louis first, rendered once by Chromium with `npm run flags` into `src/lib/engine/flags.webp` (81 KB) and `flags.json`. Loading each flag's SVG at run time won't do: Firefox can't draw an SVG without a width and height onto a canvas, and the CSP allows no `data:` or `blob:` images. Unknown geo (`XX`), Tor (`T1`) and any code without a flag wear the St. Louis flag, drawn simplified in the script.
- **Tests:** `tests/peers.spec.ts` runs two browsers against `wrangler dev` serving the build (sizes, tag, badge, a hop between rooms, the server killed and restarted, a hidden tab) and, on vite preview, the refused socket and a bot's page (the document fulfilled with `Server-Timing: bot`). The hidden tab is emulated: `document.hidden` overridden and Playwright's clock fast-forwarded past the minute. The smoke's `tip()` now reads only opaque pixels, past the halo's glow.
- **Hands-on for Joe:** the halo, tag and badge on a real phone; a real hidden tab; the bot flag on barmadden.com itself (the header exists only there); a Preview's socket under the CSP's `'self'`.
