# Map: St. Louis cursor portfolio

Label: wayfinder:map
Created: 2026-09-23

## Destination

A written spec for the site plus locked stack decisions (SvelteKit static, realtime backend, hosting, art and Rive pipeline), with a committed throwaway prototype proving cursor sync on the chosen backend and the hybrid rendering plus camera model working on desktop and phone. Building the site itself is beyond this map.

## Notes

- Domain glossary lives in `CONTEXT.md`. Use its terms (overworld, district, venue, sub-scene, prop, visitor, room).
- Issue tracker is local markdown (`docs/agents/issue-tracker.md`). Tickets are `issues/NN-<slug>.md` in this folder.
- Skills per ticket type: research → `research`; prototype → `prototype`; grilling → `grilling` + `domain-modeling`.
- Standing preferences (settled while charting, detail in the charting ticket):
  - Frontend: SvelteKit, static adapter. CSS is native modern CSS with nesting, no preprocessor.
  - No PartyKit. Realtime backend to be chosen. Hosting ceiling $25/month with a hard spend cap; tool subscriptions used while authoring assets are outside that ceiling.
  - Multiplayer is a hard requirement; the scene must degrade to single-player when the socket is down.
  - Rendering is hybrid: artwork drawn on canvas, props clickable like Cursor Camp with real HTML underneath for SEO and screen readers, cursors on an overlay.
  - Mobile is considered from the start: on-screen joystick plus drag-to-pan (drag scene left, view moves right). Not a later phase.
  - Art is AI-generated (ChatGPT, Nano Banana) in the flat vector style of the old Moosylvania site; original assets are style references only. Animated props via Rive.
  - Sub-scenes are separate rooms. Cursor shows a GeoIP flag plus one cosmetic granted by a prop. Cosmetics and progress persist in localStorage.
  - Only a small set of props are shared, server-authoritative state; the rest are local.
  - Sound: ambient per district plus prop sounds, off by default. Depth effects are a later phase after art.
  - ADRs so far: 0001 single zoom with world coordinates, 0002 canvas-native props, 0003 canvas-drawn props with DOM hit targets, 0004 one Durable Object for every room.

## Decisions so far

- [Charting: destination and standing decisions](issues/00-charting-decisions.md): destination named, seven glossary terms fixed, stack and behaviour preferences recorded above.
- [How Cursor Camp works](issues/01-cursor-camp-mechanics.md): wide horizontally scrolling overworld with portal buildings into 2845x1600 interiors, GeoIP flag cursors with in-scene cosmetics, per-scene rooms, shared props with visible lag, joystick on mobile; realtime stack unpublished. Full report in `docs/research/cursor-camp-mechanics.md`.
- [How production multiplayer-cursor apps sync and protect cursors](issues/04-cursor-sync-techniques.md): 20 Hz up and down, MessagePack, world coordinates, 100 ms interpolation, 40-cursor rooms with overflow, token-bucket rate limit and Turnstile on join. Note on branch `research/cursor-sync-techniques`.
- [Which realtime backend hosts cursor rooms under $25/month](issues/02-realtime-backend.md): Cloudflare Durable Objects with WebSocket hibernation, one per scene, on Cloudflare Pages; spend capped in code (15 Hz, 60 live cursors) since Cloudflare has no billing cap; fallback is Bun on Hetzner behind Cloudflare. Managed presence services are priced out. Note on branch `research/realtime-backend`.
- [Is Rive viable for animated props, and what does its MCP actually do](issues/03-rive-viability.md): runtime is about 454 KB gzipped, export needs a $9/month plan, raster art animates without vectorising, MCP can author state machines; subagent recommends canvas-native props with Rive reserved for one hero prop. Decision graduated to the animation-approach ticket. Note on branch `research/rive-viability`.
- [What does each venue say, and through which props](issues/05-content-inventory.md): full prop-by-prop inventory for seven venues, five sub-scenes (CS lab, theatre, Moosylvania lobby, Side Project bar, Brennan's), arrival at the Moosylvania sign with a signpost for resume and contact, seven cosmetics, and brand clearance notes.

- [How big is the overworld, where does each district sit, and how does the camera move?](issues/06-world-layout-and-camera.md): 4800 x 2700 overworld (up to about 5400 wide), districts west to east Maplewood, Central West End, Midtown, river, Belleville with Carondelet Park south, symbolic scenery between; single zoom with per-device render scale; one camera model with a wide prop-aware push band, continuous pan, drag, wheel, keys and joystick; sub-scenes 2845 x 1600 with fade in, exit door and back button, URL per scene. ADR 0001.
- [Which props are shared and server-authoritative, and what is their state model?](issues/10-shared-props.md): one shared prop, the Foundry screen, idle or playing a title from a server time; poster click sends the op, server drops ops while busy, first accepted wins, no optimistic change, in-memory only, reset on empty room, snapshot plus server time on join; over-cap visitors get a spectator socket; bike track is a local lap timer with a personal top-ten in localStorage; shared prop and local prop added to the glossary.
- [What does a visitor's cursor look like, and which cosmetics exist?](issues/11-cursor-identity-and-cosmetics.md): 32 px drawn arrow, no names, server-assigned flag badge with the St. Louis flag as fallback, own cursor gets a blue halo and a fading "you" tag; seven cosmetics with ids and granting props, one worn at a time, granted on first click (poster click for the glasses, eye blink on the MonsterCommerce logo for the monster ears), gold cursor body once all seven are earned; presence carries flag, cosmetic id and gold bit, drawn from a local sprite atlas; off-screen peers are not drawn or interpolated, idle peers never fade; localStorage keeps worn id and earned set.
- [Rive, canvas-native, or a mix for animated props?](issues/13-animation-approach.md): canvas-native for every prop, Rive not adopted; moving props are pivoted WebP layers tweened in the scene loop, sprite sheets only for frame cycles; Rive admitted later only for bone or mesh deformation inside a sub-scene; reduced motion freezes ambient motion and keeps click reactions; ambient motion and reaction added to the glossary. ADR 0002.
- [Can AI-generated art hold the Moosylvania style consistently across scenes?](issues/07-art-pipeline-prototype.md): GO with ChatGPT only; Maplewood (with the real church office), lobby, three keyed props and a four-part moose rig all held the old flat style with zero manual repainting; magenta key plus a 1 px erode cuts cleanly; backgrounds need the 2x upscale for DPR 2 phones; placement and phone framing get settled when every scene is regenerated to join up, via a Claude judge-and-regenerate loop. Recipe, review harness and WebP assets on `main` under `prototypes/art-pipeline/`.
- [Does hybrid canvas rendering with the camera model hold 60fps on a phone?](issues/08-rendering-and-camera-prototype.md): variant B. Props and tiles are drawn on the canvas, each prop has a transparent button with real text in one camera-moved DOM layer, and cursors are on an overlay canvas. The background uses 512 px WebP tiles at 1.25x density on phones and 2x on desktop with ring eviction. The ticket 06 camera rules held unchanged at 0.6 phone scale. Emulated 60 fps for every variant, and Joe confirmed movement by hand; there are no real-phone numbers. ADR 0003. Prototype on branch `prototype/rendering-camera`.

- [Does cursor sync on the chosen backend feel right and degrade safely?](issues/09-cursor-sync-prototype.md): GO on Durable Objects. Sync runs at 20 Hz both ways (Joe found 10 and 15 Hz jumpy on a phone) with 100 ms interpolation. One object hosts every room (ADR 0004), with 60 live cursors site-wide and spectators past that, for a worst case of about $17 a month. Moves and frames are hand-packed binary and control messages are JSON. Turnstile and a token bucket guard the socket, and nothing touches storage. Degradation, the shared screen and room handoff all verified; 60 bots in one object held at 52 / 77 ms. Prototype on branch `prototype/cursor-sync`.

- [Provision the backend accounts](issues/12-provision-accounts.md): Cloudflare account on Workers Paid with a $20 budget alert (notification only; the in-code 15 Hz / 60-cursor limits are the real cap), subdomain `joe-3ed.workers.dev`, wrangler OAuth token outside the repo; no CI token or Turnstile widget yet.

- [How is the prop button layer structured for crawlers, screen readers and keyboards?](issues/14-accessible-html-layer.md): prerendered at build with `adapter-static`, fully static after deploy, with a plain-document fallback before the engine starts; `<h1>` per scene, `<h2>` per district and `<h3>` per venue, placed over the painted signs; each prop is a button plus its own prerendered `<dialog>` card; signpost contact arrows, venue doors and exit doors are links, and everything else is a button; tab order runs west to east and focus pans the camera; canvases are `aria-hidden`, and a live region covers only the visitor's own events. Card added to the glossary.

- [How does your own cursor stand out in a crowd on a phone?](issues/15-own-cursor-in-a-crowd.md): your own cursor is drawn at 1.25x and every peer at 0.75x at full opacity, on your own screen only (nothing on the wire), on top of the existing halo and fading tag; beacon ring, persistent bubble, faded peers and edge arrow not adopted. Amends the cursor identity ticket. Prototype on branch `prototype/own-cursor`.

## Not yet specified

- Depth effects: horizon scaling of cursors, Z-sorting behind buildings, water drag. Depends on art having defined depth bands.
- Sound design: what each district and prop sounds like, toggle UI.
- Persistence schema in localStorage: key naming and versioning for the worn cosmetic id and earned set (fields decided in the cursor identity ticket) plus the bike track's personal top-ten lap times and any other progress.
- Deploy pipeline and domain on Cloudflare Pages plus Workers (including a scoped CI API token), and how the in-code spend cap is monitored beyond the $20 budget alert. The ~$17 worst case holds only while 20 Hz, 60 live cursors and one object hold (cursor sync ticket).
- Analytics, if any.
- Final spec assembly and hand-off to `/to-tickets`.

## Out of scope

- Building the production site. The map ends at a spec and proving prototypes.
- Accounts, chat, or any visitor-to-visitor messaging.
- A CMS or admin UI for content; content is authored in the repo.
- A separate plain-page site for mobile. Mobile gets the scene.
