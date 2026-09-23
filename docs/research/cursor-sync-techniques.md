# Live cursor sync: established techniques and a protocol sketch

Research note, 2026-09-23. Sources are first-party (vendor docs, engineering blogs, repo source at `main`/`master` on that date). Where a claim could not be verified first-party, it says so.

## 1. Send rate and throttling per client

- **Figma**: "clients send updates every 33ms (30 FPS)"; the server batches further for the journal. https://www.figma.com/blog/making-multiplayer-more-reliable/
- **Excalidraw**: pointer broadcast is `throttle(..., CURSOR_SYNC_TIMEOUT)` with `CURSOR_SYNC_TIMEOUT = 33` ms; skipped during multi-touch. https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/app_constants.ts, https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Collab.tsx
- **tldraw**: `COLLABORATIVE_MODE_FPS = 30`, `SOLO_MODE_FPS = 1`; presence is only pushed when other sessions exist (`presenceMode === 'full'`). Server debounces outbound broadcasts at `1000/60`. https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/TLSyncClient.ts, https://github.com/tldraw/tldraw/blob/main/packages/sync/src/useSync.ts, https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/RoomSession.ts
- **Liveblocks**: `throttle` option default 100 ms, allowed range 16-1000 ms; presence keys written in one window coalesce to the last value and flush with storage ops in one frame. https://liveblocks.io/docs/api-reference/liveblocks-client#createClientThrottle, https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-core/src/room.ts
- **PartyKit cursor-party** sends on every `mousemove` with no client throttle and coalesces server-side at `BROADCAST_INTERVAL = 1000 / 60`; PartyKit's own blog calls this the bottleneck: "really those should be debounced, and the updates batched up." https://github.com/partykit/cursor-party, https://blog.partykit.io/posts/dancing-cursors-and-voronoi-diagrams/
- **Cloudflare/Unity demo** sends every 0.2 s (5 Hz) and smooths client-side. https://blog.cloudflare.com/building-real-time-games-using-workers-durable-objects-and-unity/
- Browsers already coalesce `pointermove` (`getCoalescedEvents`), so one sample per frame is the effective input rate. https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents

Consensus: 20-30 Hz uplink, last-write coalescing per client, server fan-out batched per tick.

## 2. Client-side interpolation and smoothing

- **Liveblocks** compares three options: CSS `transition` with `linear` easing, springs ("smooth cursors with a quick response"), and splines/perfect-cursors ("accuracy is preferred and a little delay is acceptable"). Its `<Cursors>` component uses springs and percentage coords. https://liveblocks.io/blog/how-to-animate-multiplayer-cursors, https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Cursors
- **tldraw** and **Excalidraw** do no interpolation: tldraw writes `style.transform` directly via `useTransform`; Excalidraw draws remote cursors on canvas per frame, clamped to viewport edges at `globalAlpha = 0.3` when idle. https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultCursor.tsx, https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/clients.ts
- Game-networking rule: render remote entities one update interval in the past and interpolate between the last two snapshots (Gambetta, 10 Hz example). Valve defaults to 100 ms delay over 20 Hz snapshots, tolerating one lost packet. Fiedler: buffer about 3x the send interval under 2-5% loss. https://www.gabrielgambetta.com/entity-interpolation.html, https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking, https://gafferongames.com/post/snapshot_interpolation/

## 3. Coordinate systems for a pannable world

- **tldraw** presence cursor is in page (world) space; the collaborators layer carries the camera transform so cursors "position in page space exactly as canvas content does", and off-screen peers become edge hint arrows. https://github.com/tldraw/tldraw/blob/main/packages/tlschema/src/createPresenceStateDerivation.ts, https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/LiveCollaborators.tsx
- **Excalidraw** broadcasts `viewportCoordsToSceneCoords(...)` and receivers convert back with `sceneCoordsToViewportCoords` each frame. https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/App.tsx, https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/canvases/InteractiveCanvas.tsx
- **Liveblocks** examples use container-relative pixels or percentages of the container, which suit a fixed page, not a camera. https://github.com/liveblocks/liveblocks/blob/main/examples/nextjs-live-cursors-scroll/pages/index.tsx

For a camera world, send world coordinates; every peer projects through its own camera. Cursor stays under the sender's pointer only if the sender re-sends when its camera moves, even with the mouse still.

## 4. Message encoding

- **JSON text** is the norm: Liveblocks (`stringify(messages)`), tldraw (`JSON.stringify` both directions, no compression), Cloudflare chat demo. https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-core/src/room.ts, https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/ServerSocketAdapter.ts, https://github.com/cloudflare/workers-chat-demo
- **Binary**: cursor-party uses `@msgpack/msgpack`; Cloudflare's Doom port uses raw binary frames with an 8-byte envelope; Excalidraw encrypts JSON bytes with AES-GCM. Figma does not state its wire format. https://github.com/partykit/cursor-party, https://blog.cloudflare.com/doom-multiplayer-workers/, https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Portal.tsx
- Frame overhead is small: 2-byte header plus 4-byte client mask (RFC 6455 s5.2). MessagePack packs small ints in 1 byte, float32 in 5. https://datatracker.ietf.org/doc/html/rfc6455#section-5.2, https://github.com/msgpack/msgpack/blob/master/spec.md

## 5. Room size limits and what breaks first

- **Figma**: 200 cursors, 200 editors, 500 participants; cursors are dropped first, then joiners see a static file. https://help.figma.com/hc/en-us/articles/1500006775761-How-many-people-can-be-in-a-file-at-once
- **tldraw.com**: `MAX_CONNECTIONS = 50` per file Durable Object, closes with `ROOM_FULL`. https://github.com/tldraw/tldraw/blob/main/apps/dotcom/sync-worker/src/TLFileDurableObject.ts
- **Liveblocks**: 10-100 simultaneous connections per room by plan; close code 4005 "room was full". https://liveblocks.io/pricing, https://liveblocks.io/docs/api-reference/liveblocks-client
- **Cloudflare DO**: hard cap 32,768 WebSockets per object; soft limit ~1,000 requests/s per object, then "overloaded" errors; 128 MB memory; "Do not create a single 'global' Durable Object." https://developers.cloudflare.com/durable-objects/api/state/, https://developers.cloudflare.com/durable-objects/platform/limits/, https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- **PartyKit**: ~100 connections per room without hibernation, 32,000 with. https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/

What breaks first is fan-out: N clients at R Hz means N x N x R messages/s out of one object. 50 clients at 20 Hz = 50,000 msg/s, far above the DO soft limit unless batched per tick. Excalidraw and Cursor Camp publish no room caps.

## 6. Hidden tabs and reconnects

- Hidden tabs pause `requestAnimationFrame` and throttle timers to once per second, then once per minute after 5 minutes (Chrome); WebKit and Firefox throttle similarly. https://developer.chrome.com/blog/timer-throttling-in-chrome-88, https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/, https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- **Excalidraw** broadcasts `AWAY` on `document.hidden` and `ACTIVE` on return; `ACTIVE_THRESHOLD = 3_000`, `IDLE_THRESHOLD = 60_000`. https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/constants.ts
- **tldraw** pings every 5 s, resets after 10 s silence; reconnect backoff 500 ms-2 s when visible, up to 5 min when hidden; reconnects on `visibilitychange`/`online`. Idle cursor hidden after 3 s, removed after 60 s. https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/ClientWebSocketAdapter.ts, https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/options.ts
- **Liveblocks** pings every 30 s with a 2 s pong window; backoff 250 ms to 10 s; optional `backgroundKeepAliveTimeout` (min 15 s) disconnects hidden tabs to save room slots; full presence re-broadcast on reconnect. https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-core/src/connection.ts, https://liveblocks.io/docs/api-reference/liveblocks-client#createClientBackgroundKeepAliveTimeout
- **Cloudflare** hibernation keeps sockets open while the object sleeps; `setWebSocketAutoResponse` answers pings without waking; `serializeAttachment` (16 KB) persists per-socket state. tldraw uses all three. https://developers.cloudflare.com/durable-objects/best-practices/websockets/, https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/TLSocketRoom.ts
- Close sockets on `pagehide`, reopen on `pageshow`; iOS backgrounding drops sockets in practice (WebKit advises "handling disconnects ... and reconnecting"). https://web.dev/articles/bfcache, https://bugs.webkit.org/show_bug.cgi?id=245350

## 7. Abuse mitigations

- **Cloudflare chat demo**: per-IP `RateLimiter` DO, one action per 5 s with a 20 s grace burst; 256-char message cap. https://github.com/cloudflare/workers-chat-demo
- **PartyKit**: drop the sender if the previous message was under 1 s ago, or back off/shadow-ban. https://docs.partykit.io/guides/rate-limiting-messages/
- **tldraw.com**: Workers Rate Limiting binding, 600/60 s per user, on connect; closes with `RATE_LIMITED`. https://github.com/tldraw/tldraw/blob/main/apps/dotcom/sync-worker/wrangler.toml
- Workers Rate Limiting is "permissive, eventually consistent"; do per-socket accounting in the room. https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Turnstile at join (token valid 300 s, single use); Origin check per RFC 6455 s10.2 (spoofable by non-browsers); `isTrusted` is client-only. https://developers.cloudflare.com/turnstile/get-started/server-side-validation/, https://datatracker.ietf.org/doc/html/rfc6455#section-10.2, https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
- Server clamps: world bounds, max step per tick, and a fixed uplink budget; Liveblocks defines close code 4002 for message rate but leaves it unused. https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-core/src/types/IWebSocket.ts

## 8. Recommended protocol for this project

One Durable Object per scene room, WebSocket Hibernation API, MessagePack binary frames (JSON accepted in dev). Numbers:

- **Uplink**: client sends at most 20 Hz (50 ms), last-write coalesced, only when world position, camera, or held prop changed. Camera moves re-send position.
- **Downlink**: server ticks at 20 Hz and sends one batched frame of all changed cursors; full snapshot on join.
- **Interpolation**: render peers 100 ms behind (two ticks), lerp between snapshots, spring on the DOM transform; off-screen peers shown as edge markers with flag.
- **Room cap**: 40 active cursors; joiners past 40 get `room_full` and a sibling-room id (`stl-arch-2`). Fan-out at cap: 40 x 20 = 800 batched msg/s, under the DO soft limit.
- **Presence**: heartbeat 15 s via auto-response; `away` on `visibilitychange`; away cursors faded after 3 s, dropped after 60 s; reconnect backoff 0.5 s to 5 min.
- **Abuse**: Turnstile on join; per-socket token bucket 25 msg/s burst 50, then close 4008; 512-byte max frame; server clamps `x,y` to world and rejects steps over 4000 world px per tick; name 24 chars; prop ops validated server-side.

Messages (shown as JSON; encode as MessagePack arrays in production):

```jsonc
// client -> server, on open
{"t":"join","room":"stl-arch","turnstile":"<token>","name":"joe","flag":"US","cos":{"hat":3}}

// client -> server, <= 20 Hz, world coords
{"t":"mv","x":4120.5,"y":1893.0,"cam":[3800,1600,1.0]}

// client -> server, prop interaction (server-authoritative)
{"t":"prop","id":"kayak","op":"grab"}
{"t":"prop","id":"kayak","op":"move","x":4200,"y":1900}
{"t":"prop","id":"kayak","op":"release"}

// client -> server, visibility
{"t":"vis","away":true}

// server -> client, on join
{"t":"hello","id":17,"tick":88120,"room":"stl-arch","rate":20,
 "peers":[{"id":3,"name":"ana","flag":"BR","cos":{"hat":1},"x":900,"y":640,"away":false}],
 "props":{"kayak":{"x":4180,"y":1890,"by":null}}}

// server -> client, one per 20 Hz tick, only changed peers
{"t":"f","tick":88121,"c":[[3,912.0,655.5],[17,4120.5,1893.0]],"p":{"kayak":{"x":4200,"y":1900,"by":17}}}

// server -> client, membership
{"t":"in","id":22,"name":"li","flag":"CN","cos":{}}
{"t":"out","id":3}
{"t":"away","id":22,"away":true}

// server -> client, refusals (then close)
{"t":"room_full","next":"stl-arch-2"}
{"t":"rate_limited","retry_ms":5000}
```
