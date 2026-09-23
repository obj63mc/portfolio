# Charting: destination and standing decisions

Type: grilling
Status: resolved
Part of: ../map.md

## Question

What is this effort finding its way to, and which decisions can be locked before any ticket is worked?

## Answer

Resolved in the charting session on 2026-09-23 through two grilling rounds.

**Destination.** A spec plus locked stack decisions, with a committed cursor-sync prototype and a rendering/camera prototype as proof. Building the site is out of scope.

**Product shape.**
- The scene is the whole site. Resume, links and contact are surfaced only through props. No separate plain page.
- One overworld of the greater St. Louis region, free exploration in both axes, geography honoured by layout. Five districts: Midtown (Saint Louis University, The Foundry), Belleville (MonsterCommerce), Maplewood (Moosylvania, Side Project Cellar), Central West End (Brennan's), Carondelet Park (personal: cycling).
- Venues open sub-scenes (SLU opens a CS lab). Each sub-scene is its own room.
- Primary audience is hiring managers and agency peers. Every venue carries at least one concrete career fact.
- Multiplayer is a hard requirement with single-player degradation when the socket is down.
- Camera: edge-push when the cursor nears a viewport edge, drag-to-pan (drag scene left moves the view right), on-screen joystick on touch. Mobile is designed for from the start.
- Cursor: GeoIP country flag plus cosmetics granted by props.
- Shared state: cursors always; a small set of props server-authoritative; the rest local.
- Persistence: localStorage for cosmetics and progress.
- Sound: ambient per district plus prop sounds, off by default with a toggle.
- Depth effects (horizon scaling, Z-sorting, water drag) are a later phase.
- Client content: show logos only where the work is public; treat alcohol and cigar venues as "brands I worked with", no age gating.
- Findability: props render real HTML under the illustration.

**Stack.**
- SvelteKit with the static adapter. Native modern CSS with nesting.
- Rendering hybrid: artwork on canvas, props clickable, cursors on an overlay canvas, Rive for animated props.
- Realtime backend undecided; PartyKit excluded. Hosting follows the backend. Ceiling $25/month.
- Art: AI-generated with ChatGPT and Nano Banana in the flat vector style of the old Moosylvania site (warm palette, layered flat shapes). Original assets are style references only. Backgrounds as large WebP, props as separate transparent layers.

**Glossary** fixed in `CONTEXT.md`: overworld, district, venue, sub-scene, scene, prop, visitor, room.
