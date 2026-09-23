# Cursor Camp (neal.fun/cursor-camp) mechanics

Researched 2026-09-23 for the St. Louis cursor portfolio map. Ticket: `.scratch/stl-cursor-portfolio/issues/01-cursor-camp-mechanics.md`.

**Access caveat:** neal.fun's HTML is behind a Cloudflare managed challenge (curl and headless Chrome both got a 403 Turnstile page), so the app bundle and its WebSocket could not be observed. Static assets under `/cursor-camp/optimized/maps/*.webp` and `/cursor-camp/sounds/*.mp3` are served openly (`server: cloudflare`, `cf-cache-status`). Everything about the realtime backend below is therefore **inferred**, not verified.

## Verified (from sources)

**What it is.** Launched Apr 29, 2026; Neal's post: "Introducing Cursor Camp, a website to hang out with other cursors" (https://x.com/nealagarwal/status/2049503458844200992). No chat, usernames or profiles; you're a cursor among others (Boing Boing, https://boingboing.net/2026/05/05/cursor-camp-is-a-wholesome-no-chat-online-hangout-spot.html).

**Identity.** Each cursor carries a small **country flag**; HN users noticed it mismatches VPN location, implying server-side GeoIP (https://news.ycombinator.com/item?id=47949939). Cosmetics persist on the cursor once picked up: hat (house bedroom), sunglasses/shorts, 3D glasses for the movie theater (https://x.com/nealagarwal/status/2050962423960526856). One complaint: your own cursor isn't visually distinct from others.

**Scene layout.** An illustrated overworld ("wide map", fandom wiki; "horizontal scrolling", https://www.cursorcamp.org/guides/controls) with buildings/props acting as portals to interior scenes. Scenes listed from source: `default, sauna, tent, cave, treehouse, house-main, house-cafeteria, house-bedroom, house-trophey, boat, telescope`. Interior images are single **2845x1600 WebP** files (tent, sauna, boat, treehouse confirmed). The main overworld image size is unconfirmed. Depth illusion: cursor shrinks and slows toward the horizon, hides under bridges/behind buildings, and Z-sorts correctly on the race-track overpass. Doors "teleport" the cursor; slides and the lazy river take control of the cursor entirely; water adds drag.

**Interactive objects.** Tetherball, soccer ball (Goal! badge), fire pit + marshmallow bucket (hover ~10s), cat, chairs, diving board, metal detector/treasure, seashells (currency), mushroom stew (visual effects), dance floor, DJ/piano, projector showing public-domain films, radio antenna with ~2-min audio messages, telescope star map, cave paintings, treehouse book, locked door. Nine badges. Progress and effects appear session/browser-scoped: "ephemeral — close the tab and it's gone" (https://dev.to/dundunup/i-built-a-sandbox-for-nealfuns-cursor-camp-heres-what-happened-276k).

**Concurrency effects.** Shared objects are visible to all: the radio message gets interrupted by someone else changing the antenna; the soccer area "feels like there's a lot of delay"; one user ran a script to auto-play on the piano and drew an emoji-reacting crowd, so emoji reactions exist and scripted input was **not** blocked.

**Mobile.** Works on phones with an on-screen **joystick**; reports of iPhones heating up and "wildly high" mobile sensitivity (https://news.ycombinator.com/item?id=47926652). Firefox+touchpad is sluggish; Firefox Android drops to ~15fps on the map's left side.

**Abuse/perf mitigations verified:** Cloudflare fronting with a managed bot challenge on the HTML; that's all that could be confirmed.

## Inferred (not verified)

- Realtime transport is almost certainly WebSockets, plausibly Cloudflare Durable Objects/PartyKit (Neal already hosts on Cloudflare). No source states this.
- Scenes are likely separate rooms/channels, with cursor positions sent in world coordinates relative to the scene image, so scroll offset is handled client-side. The soccer lag suggests object physics is server-authoritative or reconciled, while cursor motion is client-interpolated.
- Number of cursors shown per room, tick/throttle rate, sharding by load, and any rate limiting: **no public data found.**

## Other sources

- Aftermath: https://aftermath.site/cursor-camp-impressions/
- Fandom wiki: https://neal-fun.fandom.com/wiki/Cursor_Camp
- bontegames: https://www.bontegames.com/2026/04/cursor-camp-browser.html
- cursorcampguide: https://cursorcampguide.com/secrets/
