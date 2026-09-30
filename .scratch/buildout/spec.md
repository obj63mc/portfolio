# St. Louis cursor portfolio: spec

Status: ready-for-agent
Assembled: 2026-09-24, from [the map](map.md) and its 22 resolved tickets, `CONTEXT.md` and ADRs 0001 to 0005.

This spec is the hand-off from the wayfinder map to `/to-tickets`. It states every decision a builder needs and links the ticket that holds the detail where the detail is long (content tables, sound tables, the dashboard checklist). Terms are the glossary's (`CONTEXT.md`): overworld, district, venue, sub-scene, scene, camera, prop, shared prop, local prop, card, scenery, foreground scenery, cosmetic, gold cursor, arrival point, ambient motion, reaction, river current, bed, theme, visitor, Join, paused, room.

## Problem Statement

Joe Madden needs a portfolio that a hiring manager or agency peer will actually explore, that puts his career facts, client work, resume and contact details within reach in seconds, and that shows rather than tells what he builds. A plain resume page does none of that. He wants the feel of neal.fun's Cursor Camp: an illustrated world of the greater St. Louis region where visitors move as cursors, see each other, enter the places he has worked and pick up small rewards along the way, and he wants it to run on a phone as well as a desktop, for a bounded monthly cost, without a separate "mobile site".

## Solution

One explorable, multiplayer, illustrated overworld of St. Louis, 4800 x 2700 world pixels, with five districts laid out to real geography and five enterable sub-scenes. Every visitor is a drawn cursor with a GeoIP flag and one wearable cosmetic. Career facts, client work, links, resume and contact live only in props; clicking a prop opens a card with the full content, and every prop is real, prerendered HTML under the canvas, so crawlers, screen readers and keyboards get the same content.

The site is a SvelteKit static build served by one Cloudflare Worker that also runs the realtime rooms as Durable Objects. Rooms hold 60 visitors and a scene opens another room when full; the scene degrades to single-player whenever the socket is down or the site is over its visitor ceiling. Every device opens on a Join card; desktop then runs under pointer lock, touch under a joystick and drag. Sound is on from the Join press with a toggle to mute. Art is AI-generated in the flat style of the old Moosylvania site; animated props are canvas-native, no Rive.

## User Stories

Visitors

1. As a visitor, I want to land in a living scene with other people's cursors already moving behind a Join card, so that I know at once this is a shared place.
2. As a visitor, I want a single Join click or tap to bring my cursor in where I pressed, so that getting started is one gesture.
3. As a visitor, I want my cursor to arrive at the Moosylvania welcome sign with the signpost in view, so that I see Joe's current chapter and the ways to the rest.
4. As a visitor, I want the camera to follow my cursor when I push toward a screen edge, so that I can roam without a scrollbar.
5. As a visitor, I want the camera to hold still while I'm about to click a prop or a control, so that the scene never runs away from what I'm aiming at.
6. As a visitor, I want the flag of my country on my cursor and a St. Louis flag if that can't be worked out, so that I'm placed but never named.
7. As a visitor, I want my own cursor drawn larger with a blue halo and a brief "you" tag, so that I can find myself in a crowd.
8. As a visitor, I want to hover a prop and see it react, and click it to open its card, so that exploring rewards curiosity.
9. As a visitor, I want the card to close with Escape, a close button or a click on Close, and put me back where I was, so that reading never traps me.
10. As a visitor, I want to enter a venue through its door with a short fade and come out again by an exit door or the browser back button, so that sub-scenes feel like rooms in the same world.
11. As a visitor, I want a cosmetic to pop onto my cursor when I first click the prop that grants it, and for everyone in the room to see it, so that exploring has visible rewards.
12. As a visitor, I want my cursor to turn gold when I've earned all seven cosmetics, so that finishing means something.
13. As a visitor, I want to click a poster in the Foundry theatre and see the screen play that title for everyone in the room, so that there is one thing we can do together.
14. As a visitor arriving mid-reel, I want the screen to be partway through the same title everyone else sees, so that the room is in step.
15. As a visitor, I want to ride a lap of the Carondelet track and see my time and my personal best, so that the park is a place to play.
16. As a visitor, I want to be carried downstream if I step into the Mississippi, pass under the bridge, and get put back at the Arch only if I reach the river's end, so that the river is a playful hazard, not a punishment.
17. As a visitor, I want to walk across the bridge without drifting, so that the river is always crossable.
18. As a visitor, I want ambient sound for where I am, music under it, and a sound for each prop I touch, starting from my Join press, so that the world feels inhabited.
19. As a visitor, I want a sound toggle that remembers my choice, so that I can explore silently at work.
20. As a visitor, I want the scene to keep working alone if my connection drops, with peers simply vanishing, so that a bad network never breaks the site.
21. As a visitor who comes back, I want my worn cosmetic, earned set, best laps and sound choice restored, so that progress is mine to keep.
22. As a visitor with reduced motion on, I want ambient motion frozen but click reactions kept, so that the scene is still and still responsive.

Desktop

23. As a desktop visitor, I want my pointer locked after Join so my drawn cursor is the only cursor and can be held against a screen edge, so that edge-push never misses.
24. As a desktop visitor, I want Esc or leaving the window to pause me with a Resume card and freeze my cursor where it was, so that stepping away is safe and coming back is one click.
25. As a desktop visitor, I want arrow keys and WASD to move my cursor like the mouse, so that I can steer without a mouse.
26. As a desktop visitor, I want my locked cursor drawn above cards and controls and able to click them, so that pointer lock never leaves me unable to close a card.

Phone and touch

27. As a phone visitor, I want a thumb-sized joystick bottom-right that moves my cursor, so that I can roam one-handed.
28. As a phone visitor, I want to drag the scene to pan it (drag left, view moves right) with a little inertia, so that moving around feels native.
29. As a phone visitor, I want to tap a prop to move my cursor there and open it, so that I don't have to steer to everything.
30. As a phone visitor, I want the whole scene at a fixed 0.6 render scale with 60 fps and a flat memory footprint, so that my phone stays cool and the site stays smooth.
31. As a phone visitor, I want the signpost in my first frame, so that contact is reachable without exploring.

Keyboard and screen reader

32. As a keyboard user, I want to Tab through the signpost and every prop west to east with the camera centring on what has focus, so that the scene is navigable without a pointer.
33. As a screen-reader user, I want headings for the site, each district and each venue placed where they are painted, and each prop as a button with a real name and a real dialog, so that touch exploration and the reading order both make sense.
34. As a screen-reader user, I want only my own events announced ("You earned the graduation cap", "Offline, exploring solo") and never other visitors' movements, so that the scene isn't noise.
35. As a visitor without JavaScript, I want the same content as a plain readable document, so that nothing is lost.

Hiring managers and recruiters

36. As a recruiter, I want the resume PDF, email, LinkedIn and GitHub on the signpost at the arrival point, so that I reach contact in under ten seconds.
37. As a hiring manager, I want at least one concrete career fact at every venue, so that a tour is a career story: SLU 2005, MonsterCommerce 2004 to 2011 and the Network Solutions acquisition, Moosylvania 2011 to present as Chief Architect, the client work at Side Project, Brennan's and the Foundry.
38. As an agency peer, I want to see the client brands Joe has worked with, cleared for display, so that the work is credible.

European visitors

39. As a visitor in a European timezone, I want to be asked once, above the Join card, whether Google Analytics may count my visit, with Allow and No thanks as equal choices, so that my consent is real.
40. As a visitor with Global Privacy Control on, I want analytics never to load, so that my browser setting is honoured.
41. As any visitor, I want an analytics icon beside the sound toggle that reopens the choice, so that I can change my mind.

Crawlers

42. As a search crawler, I want every scene URL to be a prerendered page with a title, description, headings, prop text and real links between scenes, so that the site is indexable.
43. As a link-preview bot, I want to fetch pages unchallenged, so that shared links unfurl.

Joe as owner and operator

44. As Joe, I want the site on barmadden.com with deploys from `main` and a public preview per PR, so that shipping is a merge.
45. As Joe, I want the bill bounded by real traffic, a configurable visitor ceiling and a kill switch I can run by hand, so that a spike can never surprise me past what I chose.
46. As Joe, I want `npm run usage` to print month-to-date usage and the projected bill, so that I can watch spend without the dashboard.
47. As Joe, I want AI crawlers blocked but search and preview bots allowed, so that the content is indexable without being scraped for training.
48. As Joe, I want every sound file's source and licence recorded, so that the audio is safe to ship.

Builders

49. As a builder, I want one typed scene-data module per scene (world rects, prop names, card content, depth regions, river data), so that the accessible layer, the canvas and the sound engine all read from one source.
50. As a builder, I want the prototypes' room protocol, cursor renderer, camera, river and art recipe to carry over rather than be rebuilt, so that the build starts from proven code.

## Implementation Decisions

### Stack and shape

- **Frontend**: SvelteKit with `adapter-static`, `prerender = true`, SSR at build time only. Svelte 5 runes. Native modern CSS with nesting, no preprocessor. TypeScript. ([Charting](issues/00-charting-decisions.md), [Accessible layer](issues/14-accessible-html-layer.md))
- **Backend and hosting**: one Cloudflare Worker, `barmadden`, serves the prerendered build as static assets (`run_worker_first = ["/ws/*"]`, so only the socket path invokes the Worker) and runs the Durable Objects. Pages is not used. ([Deploy](issues/20-deploy-pipeline.md), [ADR 0005](../../docs/adr/0005-one-durable-object-per-room.md))
- **Rendering**: hybrid. Artwork and props are drawn on the scene canvas; each prop has a transparent `<button>` with its real text in one camera-moved DOM layer; cursors are on an overlay canvas above that layer with `pointer-events: none`. ([ADR 0003](../../docs/adr/0003-canvas-props-dom-hit-targets.md), [Rendering prototype](issues/08-rendering-and-camera-prototype.md))
- **Animation**: canvas-native for every prop; Rive is not adopted. ([ADR 0002](../../docs/adr/0002-canvas-native-props.md), [Animation approach](issues/13-animation-approach.md))
- **Coordinates**: one zoom level, world pixels everywhere, per-session render scale (1.0 desktop, 0.6 phone). ([ADR 0001](../../docs/adr/0001-single-zoom-world-coordinates.md))
- **Multiplayer is a hard requirement**, and the scene must run single-player whenever the socket is down, refused or over the ceiling.

### World, scenes and URLs

- **Overworld**: 4800 x 2700 world px nominal, may widen to about 5400, never more; the art pass may shave it. Districts west to east: Maplewood (arrival) at the west edge, Central West End centre-west, Midtown centre-east, the Mississippi with the Arch and a bridge, Belleville at the east edge; Carondelet Park south-centre beneath Midtown and Central West End. Each district footprint is roughly 1400 x 1000; districts sit about 200 px apart with scenery only between them (Forest Park strip with a sign, Highway 40/64 strip, river, Arch, bridge). Painted neighbourhood entrance signs give district identity; no floating labels. ([World layout](issues/06-world-layout-and-camera.md))
- **Sub-scenes**: five, each 2845 x 1600 except the Moosylvania lobby: the SLU CS lab, the Foundry theatre, the Moosylvania lobby, the Side Project bar, Brennan's. The lobby is a larger, taller scene, 2400 x 4800, that scrolls like the overworld, up the nave from the meeting area behind the front desk to the loft (Joe, 2026-09-28). MonsterCommerce and Carondelet Park are exterior only. ([Content inventory](issues/05-content-inventory.md))
- **Arrival point**: the Moosylvania welcome sign, camera centred on it, no intro pan. The signpost sits beside it and must fit the first portrait phone frame at 0.6 scale; this constrains the Maplewood art and is settled in the art regeneration pass (see Gaps).
- **One URL per scene**, prerendered. The overworld is `/`. Sub-scene URLs are `/<district>/<venue>`: `/maplewood/moosylvania` and `/midtown/foundry` are fixed by the prototypes; the remaining three are proposed as `/midtown/slu`, `/maplewood/side-project` and `/central-west-end/brennans` (see Gaps). Scene ids for rooms are the venue slug, with `overworld` for `/`.
- **Scene data**: one typed module per scene holding the world rect; every prop's world rect, accessible name, card content and links; heading boxes; depth regions; foreground scenery cut-outs; and, for the overworld, the river water mask, bridge deck rect, river south-end line and Arch reset point. The accessible layer, the canvas engine, the sound engine and the analytics ids all read from it. ([Accessible layer](issues/14-accessible-html-layer.md), [Depth effects](issues/18-depth-effects.md))

### Camera

One camera model for every device and scene type. ([World layout](issues/06-world-layout-and-camera.md), as amended by [Pointer lock](issues/22-pointer-lock-and-river-current.md) and [Sound design](issues/19-sound-design.md); implemented unchanged in the [rendering prototype](issues/08-rendering-and-camera-prototype.md))

- **Edge-push**: one band, 25 percent of viewport width and height on the overworld and in the Moosylvania lobby, which scrolls like it, 12 percent in the other sub-scenes. Speed eases from 0 at the band's inner edge to about 900 world px/s at the viewport edge. Push reads the drawn cursor. Push stops while paused.
- **Push suppression**: no push while a prop is hovered, or while the cursor is within 40 px of a prop or of an on-screen control (the Join, Paused and consent cards, and the bottom-left toggles for a mouse). On touch the toggles and the joystick are the finger's: the drawn cursor over them neither holds the camera nor marks or clicks them (Joe, 2026-09-29, buildout ticket 10). Suppression also lifts while steering (the joystick, the keys or the locked mouse) presses the cursor against the viewport's edge, since it can't be aiming any further out and a prop beside a pinned cursor would otherwise stop the camera for good (buildout ticket 10, from Joe's phone testing, 2026-09-29).
- **Continuous pan**, never snapping to district framings. **Hard clamp** at scene bounds, no rubber-banding.
- **Desktop has no drag, wheel or trackpad panning.** The camera follows the cursor by edge-push only.
- **Touch drag-to-pan**: dragging the scene left moves the view right; a drag starts after 6 px so prop taps aren't eaten; inertia decays over about 300 ms (tau 0.15 s). Drag pans the camera without moving the cursor in world space; if the cursor would leave the viewport it is carried along at the edge.
- **Touch joystick**: bottom-right, thumb-sized, 15 percent dead zone, moves the cursor at up to about 600 world px/s; the camera follows through the push band.
- **Touch tap** on a prop moves the cursor there and activates it.
- **Keyboard focus** (`:focus-visible`) centres the camera on the focused element, smoothly, or instantly under reduced motion. A mouse click never pans.
- **Fragment links** from the signpost (`#belleville`) pan the camera to that district.
- **Render scale** is fixed per session: 0.6 on a screen under 768 px on its shorter side, 1.0 on anything larger, whatever its pointer (Joe, 2026-09-29, buildout ticket 08). DPR is capped at 2.
- **The reel's zoom**, the one exception to a single zoom level: while the Foundry screen plays, every visitor in the theatre sees the camera ease out over about 600 ms (a cut under reduced motion) to frame the projector and the whole screen, at whatever scale fits the viewport and never closer than the session's, on every device down to a portrait phone; it eases back to the session's scale, on the visitor's cursor, when the reel ends. Edge-push and drag are off while it holds the camera; the cursor keeps its world place and its on-screen size, and hover and clicks stay at the drawn cursor (Joe, 2026-09-29, buildout ticket 17; ADR 0001 amended).
- **Sub-scene handoff**: entering is a short (300 ms) fade with the cursor placed just inside the door and the camera centred on it; leaving (exit door or browser back) returns the visitor to the overworld at the venue door, camera centred on it. The new scene fades in from the backdrop, a cut under reduced motion. Just inside a sub-scene's door is the floor a cursor's height below the door, off it, so a click there doesn't leave again; back on the overworld the cursor lands on the venue door. A hop lands at the door whatever fragment the URL carries (buildout ticket 11).

### Input: Join, pointer lock, keys and touch

([Pointer lock](issues/22-pointer-lock-and-river-current.md), as amended by [Sound design](issues/19-sound-design.md))

- **Join is a modal card on every device**, a prerendered `<dialog>` opened with `showModal()`, holding only the Join button. The live scene and peers animate dimmed behind it. Until Join nothing moves, nothing takes input (Tab, keys, drag, joystick) and nothing is sent; the page behind the card is inert. The visitor's own cursor is not drawn or sent before Join. The cursor starts where Join was clicked or tapped. Visitors without JavaScript never see the card and get the plain document.
- **Desktop (any fine pointer)**: Join locks the pointer, pressed from the keyboard too (Joe, 2026-09-29, buildout ticket 09). The drawn cursor is moved 1:1 by mouse movement with OS acceleration kept, held inside the viewport. The native OS cursor is hidden over the scene. A browser that refuses the lock falls back to unlocked behaviour: the drawn cursor follows the OS pointer, and push stops when the pointer leaves the window (see Gaps).
- **Keys**: once joined, arrow keys and WASD move the cursor at 600 world px/s with diagonals normalised, and the camera follows through the push band; at a world edge the cursor keeps travelling to the scene edge. Keys are ignored while paused or while a card is open.
- **Pause**: Esc, blur, or hiding or switching away from the tab (touch included) releases the lock and shows a "Paused, click to resume" card. The cursor freezes where it was (peers see it idle there), the camera stops, the keys are ignored, the river drift does not continue, and the scene keeps animating. The hidden-tab socket rule still applies (stop sending, close after 60 s). Esc with a card open closes the card instead of pausing (Joe, 2026-09-29, buildout ticket 09). The lock is still released, because a page can't hold it through Esc. The drawn cursor holds still with the OS cursor showing, the keys still steer, and the next mouse click takes the lock back and does nothing else. The Join and Paused cards never close on Esc.
- **Resume**: re-locks with the cursor exactly where it froze. If the browser refuses (Chrome's cooldown after Esc), the card stays up and says to try again in a moment. On touch the Resume tap also resumes audio.
- **Drawing order and hit resolution**: the cursor canvas sits above every card and control. Hover and clicks resolve at the drawn cursor's position (`elementFromPoint`) for the locked pointer and the joystick, and by DOM pointer events for an unlocked mouse. The control under the cursor gets a hover mark, and a click activates it, including a card's Close and the links inside it.
- **Navigation**: the element holding the lock lives in the shared layout, so it survives venue hops. External links blur the window and pause. Under the lock a middle click opens the link under the drawn cursor in a new tab; a page can only open it in front, so the page left behind pauses (buildout ticket 11).

### Cursor identity, own cursor and depth

([Cursor identity](issues/11-cursor-identity-and-cosmetics.md), amended by [Own cursor](issues/15-own-cursor-in-a-crowd.md) and [Depth effects](issues/18-depth-effects.md))

- **Base cursor**: a drawn arrow in the flat style, 32 world px tall, white body with a dark outline, with three cosmetic anchors (head, face, side) and a country-flag badge at the lower right that no cosmetic covers. No names. Clicking another visitor's cursor does nothing.
- **Flag**: assigned by the server from `request.cf.country` at join, never client-supplied, no special flags for anyone. Unknown or non-country geo shows the St. Louis city flag.
- **Own cursor**: a halo in St. Louis city-flag blue and a "you" tag that fades after about two seconds on arrival, on every scene entry and after an Arch reset. Drawn at 1.25x (40 world px); every peer is drawn at 0.75x (24 world px) at full opacity. Scaling is about the arrow tip so the hotspot never moves; cosmetic and flag scale with it. This is local drawing only, nothing on the wire, and applies on desktop as well as phones.
- **Horizon scaling**: a depth factor `d` runs linearly from 1.0 at a depth region's `foregroundY` to 0.85 at its `horizonY`, holding at 0.85 above the horizon; outside every region `d` = 1. Drawn size is own 1.25 x `d`, peer 0.75 x `d`, computed locally from world y. Crossing regions eases the scale over about 150 ms. Hover and click stay tip-based.
- **Foreground scenery, no general Z-sorting**: some scenery is drawn above every cursor, the visitor's own included, with no outline or fade. It is painted into the tiles and also shipped as keyed WebP cut-outs with world rects; the overlay canvas draws the cut-outs after the cursors. Foreground scenery never overlaps a prop's rect. Which pieces are foreground is decided by the art regeneration pass.
- **Cosmetics**: seven, one worn at a time, the most recently granted; earning a new one replaces the worn one; re-clicking a granting prop replays it and re-wears its cosmetic. Grant is on the first interaction (opening the card counts as the click), with no watching or skill required. Ids and granting props:

  | Id | Cosmetic | Anchor | Granting prop |
  | --- | --- | --- | --- |
  | 1 | Graduation cap | head | Diploma, CS lab |
  | 2 | 3D glasses | face | Any Foundry poster; the click that sends the screen op, granted whether or not the op is accepted |
  | 3 | Monster ears (two purple pointed ears on a band; "monster hat" in earlier tickets) | head | The eyeball "O" in the MonsterCommerce sign; clicking blinks it |
  | 4 | Antlers | head | The moose, Moosylvania exterior |
  | 5 | Beer mug | side | The Side Project sign on the cooler door |
  | 6 | Cigar | side | Any humidor box at Brennan's |
  | 7 | Bike helmet | head | Joe's bike, Carondelet Park |

  Id 0 is no cosmetic. A completed lap grants nothing. A grant pops onto the cursor with a 300 ms scale-in, seen by the whole room through a presence update, with a chime for the visitor.
- **Gold cursor**: body gold instead of white once every cosmetic the build knows is earned; derived, never stored; the only completion reward, with a short fanfare.
- **Drawing peers**: every client draws every cursor from one local sprite atlas keyed by cosmetic id; only ids cross the wire, and the server validates the range. The gold bit is client-asserted. Peers outside the camera are neither drawn nor interpolated, with no edge markers. Idle peers stay at full opacity where they stopped until their socket closes. Peers snap rather than interpolate on any jump over about 400 world px.
- **Flag and cosmetic sprites need strong contrast**: the smallest peer case is about 20 world px, its flag about 6 x 4 CSS px on a phone.

### Rooms, protocol and degradation

([Cursor sync prototype](issues/09-cursor-sync-prototype.md), [Deploy](issues/20-deploy-pipeline.md), [ADR 0005](../../docs/adr/0005-one-durable-object-per-room.md); the protocol sketch in [Sync techniques](issues/04-cursor-sync-techniques.md) is superseded where they differ)

- **Rooms**: each room is its own Durable Object named `scene:n` (`overworld:1`, `foundry:2`) and holds up to 60 visitors. A **directory** Durable Object hears only joins and leaves, places each visitor fill-first (the fullest room of their scene with space, else a new room) and enforces a site-wide ceiling `MAX_VISITORS` from the wrangler config, default 1,000; visitors past it get single-player. Nobody is ever moved between rooms, and rooms consolidate as visitors change scene. There are no spectators. Both object classes use the declarative `exports` config with the SQLite storage type; **neither ever calls storage** (no SQL, `put`, `delete` or `setAlarm` on any path; positions are copied into socket attachments when a room goes still so the object can hibernate; the tick stops after two still seconds; no `setInterval`).
- **Changing scene** closes one socket and opens another, on the new scene's URL: `/ws/<scene id>` on the page's own origin, the id `overworld` or a sub-scene's slug (buildout ticket 12).
- **Rate**: 20 Hz up (only when the cursor moved) and 20 Hz down (one frame of the changed cursors per server tick). Peers are drawn 100 ms behind with interpolation; after a pause the last position is pinned one interval back.
- **Wire format**: hand-packed binary for the hot path and JSON text for control. A move up is 5 bytes, `[1, x u16, y u16]`, whole world px. A frame down is `3 + 6n` bytes, `[2, n u16, (id u16, x u16, y u16) * n]`. JSON messages: `hello` (id, country code, server time, rate, cap, room name, peers, shared-prop snapshot), `in`, `out`, a presence update (worn cosmetic id 0 to 7, gold bit, river bit), the shared-prop op and its echo, and `ping`/`pong`. Keepalive is a `ping` text frame every 30 s, answered by the hibernation auto-response so the object isn't woken; it keeps a visitor who is only watching (minutes of video, no move) in the room. A room drops a socket that has gone 90 s without one (a sleeping laptop, a lost signal), checking only when a join or a message has woken it anyway. No MessagePack.
- **Presence** per visitor: id, flag, worn cosmetic id, gold bit, river bit. Presence changes are sent when they happen, never in the per-tick position message.
- **Guards**: an Origin check at the WAF edge and in the Worker; a per-socket token bucket at twice the rate with a four-second burst, then close 4008 and a 5 s client wait; positions clamped to the scene; JSON frames over 256 bytes and unknown ops dropped; the 60-per-room cap and the visitor ceiling. No Turnstile. No per-IP limits.
- **Degradation**: socket down (or refused, or over the ceiling, or `MULTIPLAYER=off`), peers vanish and every shared prop runs its state machine locally; the live region says "Offline, exploring solo"; there is no reconnecting UI. Reconnect uses jittered backoff from 0.5 s to 30 s; a close within the first second after `hello` is treated like any other drop. The next `hello` snapshot overwrites local shared-prop state without animation. A hidden tab stops sending at once and closes after 60 s, reconnecting when visible. A deploy restarts every room and drops every socket; clients reconnect and each room's shared props reset. A page whose navigation response carries the edge's bot flag (`Server-Timing: bot`, read from the navigation entry's `serverTiming`) never opens a socket: it is single-player from the start, with no announcement and no reconnect (buildout ticket 07).
- **Room count**: the "N here" counter is derived from `hello`, `in` and `out`.

### Shared prop and local props

([Shared props](issues/10-shared-props.md), as amended by [Deploy](issues/20-deploy-pipeline.md))

- **One shared prop: the Foundry screen** in the theatre sub-scene. State, held in the room object's memory: `idle` or `playing { title: "fast-five" | "snow-white" | "lorax", startedAt: serverTime }`. Op `screen.play { title }` on a poster click, sent once the clicker is seated: the click first glides their own cursor over about 700 ms (a cut under reduced motion) to a seat in the second row, one per visitor by room id, and their steering (keys, joystick, mouse, touch drag and tap) and pointer clicks in the scene stay off for the first 5 s of the reel they sat down for (from when they first see it running), then come back so they may leave while it plays, the camera still framing it; they come back too when it ends, or 3 s after asking if none runs; Tab and Enter still reach everything, and pause and resume still work (Joe, 2026-09-29, buildout ticket 17). Any visitor may send it; the server accepts it only while `idle`, drops it silently while `playing`, first accepted wins, no cooldown beyond the sequence length. Clients make no optimistic change. The sequence is a timeline in plain code driven from server time (projector lights up, "Now Showing" and the title, the title's game demo video played on the screen, one line of case-study text, fade to dark, back to `idle`), with a fixed length per title set in the build: the video's own plus 3.2 s before it and 4.5 s after (Joe, 2026-09-29, buildout ticket 17). The projector's beam fans from its lens to the screen's corners while the reel runs, and the reel is mapped onto the screen's painted quad in perspective. Every client plays the video in step with server time, with its sound, muted where the browser refuses sound without a gesture. A joiner mid-sequence lands at `now - startedAt` from the snapshot's server time. State resets to `idle` when the room empties. No attribution. Each room has its own screen. The projector start and the video's own sound, which stands in for the trailer cue, are audible to the whole room. The room keeps the screen in its sockets' attachments too, so a room that hibernates mid-reel wakes with it.
- **Rules for any future shared prop**: server-authoritative in-memory state in the room object; reset when the room empties; no storage; any visitor may act; ops rejected while busy; first accepted wins; no optimistic change; full snapshot plus server time in `hello`; local state machine when offline; no attribution.
- **Local prop, the Carondelet bike track**: a client-side lap timer. The client detects the cursor crossing the start line, follows the path around the track and shows the lap time on re-crossing; a personal top-ten lives in localStorage; a new personal best plays a finish-line beep. No server involvement. The NPC rider is ambient motion positioned from server time so every visitor in the room sees it at the same point; it never touches the timer. The track is the whole lake loop, and the rider rides all of it, passing behind the park sign and the trees over the path; a chequered start/finish line crosses the lower straight, and a START FINISH sign stands on the lawn beside it where a bench stood, the track prop's art and hit target (Joe, 2026-09-29, buildout ticket 18). The timer is forgiving, for a thumb on a phone's joystick (Joe's call, 2026-09-29; the numbers and the rules below are the build's tuning, buildout ticket 18, for him to adjust): the cursor counts as on the track within 70 world px beyond the painted path's edge, and may leave that for up to a second, rejoining within 600 world px of the path from where it left, before the lap is lost. A lap counts either way round once the cursor has gone the whole loop that way, so cutting across the lake or crossing the line back and forth never finishes one; each finish starts the next lap. A pause, a card or a sub-scene loses a running lap. A clock shows the running time, then the lap and the best at the finish, which alone is announced.
- **Local prop, the Moosylvania meeting TV**: plays a video Joe provides (file to come) for the visitor who clicks it, with sound; nothing crosses the wire, and peers see the TV dark. Its card, opened by the click like any card, holds the video in a native `<video controls>` with captions, the keyboard and screen-reader route. One video element serves both: it is drawn onto the TV's screen rect in the scene and keeps playing there after the card closes, until it ends. The file loads only on that click; the lobby playlist ducks while it plays.
- Every other prop is local.

### Props, cards and the accessible layer

([Accessible layer](issues/14-accessible-html-layer.md), [ADR 0003](../../docs/adr/0003-canvas-props-dom-hit-targets.md), content per venue in [Content inventory](issues/05-content-inventory.md))

- **Prerendered**: every scene URL is written to plain HTML at build with its headings, prop buttons, links, card dialogs, `<title>` and meta description. The canvas engine starts in `onMount` and never re-renders the layer. Before the engine starts, without JS, or if the canvas fails, the markup reads as a normal document; the engine adds a class that turns the layer into absolutely positioned, transparent hit targets.
- **Overworld markup**: a visually hidden skip link to the district list; an `aria-hidden` scene canvas; `<main>` as the camera-moved layer with `<h1>Joe Madden, St. Louis</h1>`, a signpost `<nav>` (resume PDF, email, LinkedIn, GitHub as direct links, then fragment links to each district), then a `<section>` per district ordered by centre x west to east, each with an `<h2>` over its painted sign and a `<section>` per venue with an `<h3>` over the building, its props left to right, and a door link for venues with a sub-scene; a plain-text "N here" presence count; one polite live region; an `aria-hidden` cursor overlay canvas. Scenery has no markup.
- **Sub-scene markup**: `<h1 tabindex="-1">` with the venue name (focus lands here on entry), props left to right (top to bottom in the tall Moosylvania lobby, so focus pans the camera one way), an exit-door link to `/#<venue>`; the district appears in the `<title>` and the exit link only.
- **Props**: each is a `<button aria-haspopup="dialog">` named prop plus gist ("Diploma: BS Computer Science with Honors, 2005"), sized to the prop's world rect; an irregular prop gets a `clip-path`. The hit area is the rect, not the painted pixels, so prop art is tightly trimmed. The Foundry has no cards (Joe, 2026-09-29, buildout ticket 17): its posters are buttons whose click only starts the reel, named for it ("Fast Five poster: play it on the screen"), and the shared screen is no button but a line of text over it that reflects its state ("Screen: now playing Fast Five"). Their text content moves to another prop later.
- **Cards**: each prop has its own prerendered native `<dialog>` with the full content-inventory text and links, drawn in screen space, styled to the scene, opened with `showModal()`, never painted on the canvas; focus trapping, Escape and focus return are native. Opening the card is the click for cosmetic grants, click reactions and the card sound; a Foundry poster's click, which opens none, is that click too.
- **Links, not buttons**: the signpost's contact arrows; the district arrows (fragment links); venue doors (real `<a href>` to the sub-scene URL, intercepted client-side to play the fade, so middle-click and crawlers work); exit doors. Everything else, including the lab workstation (GitHub) and Joe's bike (Strava), stays a button whose external link lives inside the card.
- **Keyboard and focus**: DOM order is tab order. Focus plays a prop's hover reaction; Enter or Space plays its click reaction; under reduced motion focus shows a plain highlight. Entering a sub-scene moves focus to its `<h1>`; leaving returns focus to that venue's door link with the camera centred on it. Before Join, Tab reaches only the Join button (and the consent popover for European visitors).
- **Screen readers**: both canvases `aria-hidden`; other visitors never announced; one polite live region for the visitor's own events only.
- **Controls**: a bottom-left cluster, prerendered, with the sound toggle (`<button aria-pressed>` named "Sound", speaker icon struck through when off) then the analytics icon ("Analytics settings").
- **Motion**: ambient motion (rider, marquee, moose breathing, a glint along the Side Project bottles) plays with no input; reactions play on hover and click (moose head turn and antler wobble, MonsterCommerce blink). Under reduced motion ambient motion freezes on a resting frame, click reactions still play, hover reactions become a plain highlight. Moving props are pivoted transparent WebP layers tweened in the scene loop, the rider included: its body and wheels are a rig like the moose's, not a sprite sheet (buildout ticket 15); it rides the whole lake loop, drawn in its place among the props by its base y each frame (buildout ticket 18). Production skips the draw when the camera, visible peers and visible ambient motion are all still, and redraws only the props' area when they alone moved.

### River current

([Pointer lock](issues/22-pointer-lock-and-river-current.md), replacing the version in [Depth effects](issues/18-depth-effects.md))

- A cursor is **in the river** once it moves onto the water mask from a bank or off the end of the bridge deck. It stays in the river while passing under the deck and leaves by reaching either bank. The bridge deck rect is excluded from the water mask, so walking across never drifts.
- In the river the cursor drifts south at about 150 world px/s. The visitor's own input still moves it, so they can paddle out; the joystick and keys add to the drift. The camera follows through the normal push band. The drift does not run while paused.
- Only reaching the river's south end resets the visitor: a short fade (a cut under reduced motion), the cursor placed at the Arch reset point, the camera centred on it, the "you" tag shown again. Peers snap on the jump.
- The owning client computes the drift and sends the resulting position as a normal move.
- The bridge is drawn over a cursor in the river and under a cursor crossing it, for the visitor's own cursor and for peers. It is the one piece of scenery whose layer depends on the cursor.
- **Peer river state is a presence bit** (decided in assembly, see Gaps): sent when a visitor enters or leaves the river, carried in `hello` for late joiners, not validated by the server. Position alone can't tell a peer under the deck from one on it, and a late joiner has no path to derive it from.

### Persistence

([Persistence schema](issues/16-persistence-schema.md), amended by [Analytics](issues/17-analytics.md) and [Sound design](issues/19-sound-design.md))

One localStorage key, `stl-portfolio`, holding one JSON object (shape from the ticket):

```ts
{
  v: 1,
  worn: number,            // 0 to 7, 0 is no cosmetic
  earned: number[],        // sorted cosmetic ids
  laps: { track: 1, best: { ms: number, at: number }[] },  // fastest first, at most ten, at is epoch ms
  sound: boolean,          // default true
  analytics?: 'granted' | 'denied'   // absent until the visitor chooses
}
```

- Nothing else is stored: not the last scene, camera, visited props, opened cards, the "you" tag, and there is no reset control.
- A single Svelte 5 rune module (`$state` in a `.svelte.ts`) is the only code that touches the key; the engine, sound module, analytics module and UI read and write through it.
- Read: each field validated on its own, a bad field resetting to its default. Unparseable JSON or a `v` newer than the build starts fresh; migration code is written only when a breaking change needs it. Unknown earned ids are ignored for drawing and gold but kept. A worn id not in the earned set, or unknown, becomes 0. Gold is derived as "every cosmetic this build knows". Laps under a different `track` version, or with a non-finite or non-positive `ms`, are dropped. A missing or invalid `sound` means on. A bad `analytics` counts as missing.
- Write on every change (grant, wear, a lap entering the top ten, sound toggle, consent choice), never on unload. Before each write re-read and merge: earned is a union, laps merge and keep the fastest ten, worn, sound and analytics are last-writer-wins, except that a writer with no analytics choice keeps the stored one (buildout ticket 16). Every read and write is wrapped in try/catch.
- If storage throws or is missing, the session runs from memory with no message.
- The module listens for the window `storage` event: a cosmetic earned in another tab updates this tab's earned set and worn cosmetic, sends a presence update so the room sees the pop, and plays no sound; a consent denial there sends `consent update denied` here.

### Sound

([Sound design](issues/19-sound-design.md) holds the per-place bed table, the per-prop one-shot table and the licence rules)

- **Start**: the Join press creates and resumes the `AudioContext`; sound is on unless `sound` is stored `false`. On iOS set `navigator.audioSession.type = 'ambient'` where supported. Nothing is fetched before Join or while muted.
- **Toggle**: the bottom-left "Sound" button. Muting suspends the context and stops further fetches; unmuting resumes inside that press. No slider, no shortcut.
- **Paused** ducks beds, theme and music to 30 percent; a hidden tab suspends the context; Resume resumes it (which also recovers iOS's `interrupted` state). Reduced motion does not affect sound.
- **Beds**: eleven loops (five districts, the river and Arch, five sub-scenes), no bed for the scenery strips. Crossfade is driven by the camera centre: full gain inside a bed's footprint rect, fading to zero over about 400 world px outside it on equal-power curves; beds at zero are stopped. Crowd noise never scales with peers. On a scene change the overworld beds fade out over the 300 ms scene fade and the sub-scene bed fades in, and the reverse on leaving.
- **Music**: one overworld theme, a 2 to 3 minute loop about 6 dB under the beds, keeping its playhead across scene changes and never restarting; it fades out in sub-scenes with their own music (Brennan's jazz, Side Project, the lobby playlist, the theatre while the screen plays) and continues 12 dB down in the others. The Foundry screen plays a trailer cue while a title runs.
- **One-shots**: a soft card sound on open and close for every card; a signature sound per prop (table in the ticket); a chime on a cosmetic grant and a fanfare on gold; a finish-line beep on a personal best; door open and close on venue and exit doors. Hover is silent. A cosmetic applied from another tab plays nothing.
- **Peers**: only the Foundry screen is audible to everyone in the theatre; everything else a peer does is silent.
- **Format and loading**: MP3 only, one file per sound, no fallback; beds stereo 96 kbps 30 to 45 s loops overlapped 2 s on equal-power curves; music stereo 128 kbps 60 to 120 s loops; one-shots mono 96 kbps under 2 s; all trimmed, loudness-matched (beds about -30 LUFS, music about -26 LUFS, one-shots peaking at -6 dBFS), re-encoded with a LAME header, content-hashed under `static/audio/`, cached immutably. On Join load the current scene's audible beds, its one-shots, the theme or its music, and the global one-shots; a neighbouring bed once the camera is within about 800 world px of its fade zone; a sub-scene's bed and music on hover or focus of its door, else on entry; decoded buffers of scenes left behind dropped after 60 s. A failed or slow fetch is silence, never a blocked scene.
- **Engine**: plain Web Audio in one Svelte module beside the persistence rune module: the context, a gain per bed, sample-accurate `AudioBufferSourceNode` loops and a one-shot pool. No Howler.
- **Sources and licences**: CC0 Freesound first, then ElevenLabs Sound Effects on a paid plan, then Pixabay music edited into loops, then AudioJungle bought personally; never the agency's Envato seat, never CC-BY-NC; CC-BY only with a Credits card on the signpost. Every file gets a row in `docs/audio-sources.md` with licence certificates kept in the repo outside `static/`; an AudioJungle item adds a no-extraction line to the site terms.

### Analytics

([Analytics](issues/17-analytics.md), amended by [Sound design](issues/19-sound-design.md) and [Deploy](issues/20-deploy-pipeline.md))

- GA4 with enhanced measurement off entirely. `page_view` sent manually from `afterNavigate` on every pathname change including the first load; fragment links never count.
- Events: `page_view` (scene path); `card_open` (`prop_id`, `scene`); `contact_click` (`method`: resume, email, linkedin, github, strava); `cosmetic_earned` (`cosmetic_id`, first grant only); `gold_cursor`; `screen_play` (`title`, when the visitor's own poster click is accepted). Nothing about hovers, pans, laps, the sound toggle, input type, socket state or peers; never the flag, socket id or any user id.
- Loading: a bundled `dataLayer` and `gtag()` queue from the start, never an inline script; gtag.js injected after the first frame on `requestIdleCallback` with a 3 s timeout; production only via `PUBLIC_GA_ID` from `$env/static/public`, passed through by the Workers Builds build script only when `WORKERS_CI_BRANCH` is `main`. With no ID there is no script and no queue.
- Consent: ad signals denied everywhere, Google Signals off. Timezone check for `Europe/*`, the Atlantic EU zones and `Africa/Ceuta`. Those visitors with no stored choice see a one-line bar ("Can I count visits with Google Analytics? No ads, no tracking elsewhere.") with equal Allow and No thanks buttons, opened as a `popover` stacked above the Join card so it stays operable; answering it is not joining. Before a choice events queue in memory; Allow loads gtag and flushes the queue; No thanks discards it and gtag never loads. Every other timezone loads GA with no bar. A region-denied `consent default` for EEA, UK and CH is the backstop. The analytics icon reopens the bar with the current choice pressed; choosing No thanks after gtag has loaded sends `consent update denied`.
- Global Privacy Control true means GA never loads anywhere; the bar then shows both buttons disabled with a note. `Navigator` is widened with an optional `globalPrivacyControl?: boolean`. Do Not Track is ignored.

### Art pipeline and assets

([Art pipeline prototype](issues/07-art-pipeline-prototype.md) holds the recipe, criteria and measurements; [Rendering prototype](issues/08-rendering-and-camera-prototype.md) the tiling)

- Art is generated with ChatGPT in the flat, outline-free style of the old Moosylvania site; the original assets are style references only. Nano Banana was not needed.
- Working rules: attach the arrival mock to every Maplewood prompt so the real church office is drawn; give any prop that fills an opening a crop of that opening; prop cut-outs are keyed on magenta with a 1 px alpha erode; backgrounds ship with a 2x upscale for DPR 2; the lobby needs about 1.7x. Keying, trimming, upscaling and WebP encoding are scripted (`recipe.md`); `review.html` is the judging harness.
- Moving props are delivered as separated transparent WebP parts with a pivot each (moose: body, head, antlers, eye; rider: body, wheels). The moose rig JSON in the ticket is the reference shape.
- Backgrounds are cut into 512 world px WebP tiles at two densities, 1.25 image px per world px for phones and 2 for desktop, preloaded one ring beyond the camera and evicted beyond two rings with `ImageBitmap.close()`.
- **Every scene is regenerated in one pass** so neighbouring scenes join up, run as a Claude judge-and-regenerate loop. That pass settles placement (including the signpost's phone framing) and delivers per scene: depth regions (rects with `horizonY` and `foregroundY`, one per district, one for the park, any strip that needs one, one or more per sub-scene); foreground scenery cut-outs with world rects, also painted into the tiles, none overlapping a prop rect; and for the overworld the river water mask polygon, the bridge deck rect, a bridge cut-out, the river's south-end line and the Arch reset point. The review harness checks these as overlays.
- Content and clearance per venue are in the [Content inventory](issues/05-content-inventory.md): logos shown only where the work is public or Joe has cleared it; alcohol and cigar venues are "brands I worked with", no age gating; the Universal Home titles are told only on the Foundry screen and its posters (the case-study lines play on the screen; with no cards in the Foundry, their accessible text waits on the prop Joe moves it to).

### Deploy and operations

([Deploy](issues/20-deploy-pipeline.md) is the full section and holds the nine-step dashboard checklist and sources; [Provisioning](issues/12-provision-accounts.md) the account facts)

- Cloudflare account on Workers Paid, subdomain `barmadden.workers.dev`, wrangler OAuth token outside the repo. Wrangler (4.135 or later) pinned in `devDependencies`; local work uses `wrangler dev`.
- **Domain**: barmadden.com stays registered at GoDaddy; its DNS moves to a Cloudflare zone on the Free plan with the Google Workspace records carried over; the Worker is a Custom Domain on the apex; `www` redirects 301 to the apex; `workers_dev = false` in production.
- **CI**: Workers Builds connected to `obj63mc/portfolio`, `main` as production; the build command runs type-checks, tests and the build; deploy `npx wrangler deploy`, preview `npx wrangler preview`. No CI API token.
- **Previews**: every non-production branch gets a public Worker Preview posted on the PR, with its own isolated Durable Object namespace; the room objects reached through `ctx.exports` and `MAX_VISITORS` repeated under `[previews.vars]`; non-`main` builds append `X-Robots-Tag: noindex` to `_headers`; the Origin check is same-origin, so a Preview's own URL passes with no override (buildout ticket 06); previews load no GA.
- **Edge protection**: every bot reads every page but never joins a room (Joe, 2026-09-29, buildout ticket 07). One bot test, `cf.client.bot` or a user agent containing `bot/`, `spider`, `crawl` or `headless`, drives two rules. A WAF custom rule blocks `/ws*` for it, beside the rule blocking `/ws*` without `Origin: https://barmadden.com`. A Response Header Transform Rule adds `Server-Timing: bot` to its responses, which the page reads so that it never opens a socket (see Degradation). AI bot policies block Training on all pages and allow Search and Agent; they replace the Block AI bots toggle, retired 2026-09-15. Bot Fight Mode is off so crawlers are never challenged.
- **Headers**: one CSP in one place, preferably SvelteKit's `kit.csp` in hash mode (fallback: a `_headers` CSP with `'unsafe-inline'` in `script-src`), allowing `'self'`, the GA hosts (`script-src https://www.googletagmanager.com`; `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`; `img-src https://*.google-analytics.com https://*.googletagmanager.com`) and `wss://barmadden.com` in `connect-src`. `_headers` also sets `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy` turning off camera, microphone and geolocation; the `/ws` path sets its own headers.
- **Operations**: Joe manages budget alerts himself. Scripts: `npm run usage` (GraphQL Analytics API, `CF_ANALYTICS_TOKEN` from an Account Analytics Read token kept in `~/.config/barmadden/.env`, prints month-to-date usage and the projected bill); `npm run multiplayer:off` (`wrangler secret put MULTIPLAYER off`, after which the Worker refuses `/ws` upgrades and everyone is single-player) and `npm run multiplayer:on`. `MAX_VISITORS` is a config change and a push. Cost: about $0.0003 per visitor-hour in messages plus about $4 per room object awake all month past the allowance; 30 people online around the clock about $11 a month; the 1,000 ceiling about $0.40 an hour.

## Testing Decisions

- **A good test exercises external behaviour** through a seam a builder would use anyway: a socket, a scene-data module, a prerendered page, a DOM. Not renderer internals, not private state.
- **Seam 1, the room protocol**: the Room and directory Durable Objects are tested through their WebSocket contract against `wrangler dev`, with a bot client that joins, moves, changes scene, sends the screen op and disconnects. This is the existing bots harness from the cursor sync prototype (`npm run bots`) turned into assertions: fill-first placement and overflow at 60, the ceiling, the token-bucket close, the no-storage rule (assert no storage API is ever invoked), the screen state machine and its snapshot, and the frame encoding round trip.
- **Seam 2, pure scene logic as functions of a fake clock**: the camera (push band, suppression, clamp, drag carry), the river state machine, horizon scaling, the screen timeline, the lap timer, the bed crossfade gains and the persistence rune's read-merge-write and validation are pure modules with no DOM, tested with plain inputs. The pointer-lock prototype already stepped its loop headlessly this way (`river.ts`, `engine.ts`).
- **Seam 3, the build output**: a test over the prerendered HTML of every scene URL asserts the heading hierarchy, one button plus one dialog per prop from the scene-data module, the link-versus-button rule, the door and exit links, the `<title>` and description, and no GA script in a preview build. This is the crawler's and screen reader's view and needs no browser.
- **Seam 4, browser smoke**: a small Playwright run covers Join, pause and resume (a headless tab can't take a real lock, so the lock itself stays hands-on), opening and closing a card with a keyboard and with the drawn cursor, a venue hop and back, the consent popover in a European timezone, and single-player when the socket is refused.
- **Performance** is measured, not asserted: `npm run bench [minutes]` (buildout ticket 10, replacing the rendering prototype's in-engine bench and 10-minute soak) roams the overworld with real touches, under Chrome's device emulation or on an Android phone over USB, and is the way to get phone numbers when a scene gets heavier. The first real-phone numbers are a Pixel 11 Pro's (ticket 10); iPhones are untested, and the phone verdict still rests on Joe's hands-on runs.
- **Art** is judged in `review.html`: dimensions against targets, fringe and halo on cut-outs, palette overlap, phone framing, depth-region and river overlays.
- Prior art: `prototypes/cursor-sync/src/lib/proto/bench.ts` and the bots script on `prototype/pointer-lock`; `prototypes/rendering-camera/src/lib/proto/bench.ts`; `prototypes/art-pipeline/review.html`.

## Out of Scope

- Building the production site was out of scope for the map; it is exactly what `/to-tickets` now breaks down.
- Accounts, chat, names, or any visitor-to-visitor messaging.
- A CMS or admin UI; content is authored in the repo.
- A separate plain-page site for mobile; the plain-document fallback is the same markup, not a second site.
- Pinch or wheel zoom; per-cursor Z-sorting; a cosmetic picker; edge markers for off-screen peers; a shared leaderboard; a jukebox; Turnstile; per-IP limits; an automated kill switch; a privacy page; a preview GA property; Partytown; Howler; Rive (admitted later only for bone or mesh deformation inside a sub-scene, per ADR 0002).
- Transferring the barmadden.com registration to Cloudflare Registrar (optional, later).

## Further Notes

### Prototypes and branches a builder should read, and what carries over

All prototypes are throwaway by charter; the code below is what the tickets named as worth keeping. Everything else in them (variants A and C, the debug HUD, the gear panel, the bench buttons, the URL switches) is prototype-only.

| Branch (head) | What it proved | Carry over |
| --- | --- | --- |
| `prototype/pointer-lock` (c37b652), live at https://cursor-sync-proto.barmadden.workers.dev; built on `prototype/own-cursor` (7e9dcee) on `prototype/cursor-sync` (a80bd4d); all under `prototypes/cursor-sync/` | Tickets 09, 15 and 22: the room protocol on Durable Objects, own-cursor sizing, Join and pause under pointer lock, key movement, the river current, the Foundry screen | `worker/index.ts` (Origin check, GeoIP, upgrade) and the Room object minus Turnstile and spectators, restructured per room with a directory object (ADR 0005); `protocol.ts` (binary moves and frames, JSON control); `net.ts` (send-on-move, backoff, hidden-tab rules); `peers.ts` (100 ms interpolation, culling, 400 px snap); `renderers/draw-cursors.ts` (atlas drawing, halo, tag, 1.25x / 0.75x); `screen.ts` (shared screen state machine and local fallback); `river.ts` (in-the-river state, drift, south-end reset, bridge layering); the Join, Paused and pointer-lock handling in `+layout.svelte`; the bots script and `wrangler.toml` shape |
| `prototype/rendering-camera` (a2577a1), `prototypes/rendering-camera/` | Ticket 08: variant B, the camera rules, tiled background | `engine.ts` camera (every ticket 06 rule as implemented, now amended for pointer lock), the tile loader with ring preload and eviction, `renderers/canvas-props.ts` (props drawn by base y, the button layer transform), `props.ts` and the moose rig and rider sprite handling, reduced-motion handling, the lobby URL handoff; `bench.ts` as the performance harness. The cursor-sync branches already contain this code, so read the pointer-lock branch first and this one for the tiling and bench |
| `prototype/art-pipeline` (a3d3529), merged to `main` under `prototypes/art-pipeline/` | Ticket 07: GO on ChatGPT art | `recipe.md` (style paragraph, per-asset prompts, keying and WebP commands), `review.html` (the judging harness, to be extended with depth and river overlays), the WebP assets and the moose rig JSON as the first real assets |
| `research/realtime-backend` (9f84717), `research/cursor-sync-techniques` (710a2da), `research/rive-viability` (e90fa8c) | Tickets 02, 04, 03 | Reading only; `docs/research/cursor-camp-mechanics.md` is on `main` |

### Consistency check

Every earlier ticket that a later one amended carries an amendment note, and this spec states the later rule. The overrides, in case a builder reads an early ticket first:

- Sound is **on** by default from Join (ticket 19), not off (charting, 10, 16). Depth effects are in the **first build** (18), not a later phase (charting). **Canvas-native**, not Rive (13, ADR 0002).
- **20 Hz**, one Durable Object **per room** of 60, a directory object, a site-wide ceiling, **no spectators, no Turnstile** (09, 20, ADR 0005) replace 15 Hz, a global 60-cursor cap, spectators and Turnstile (02, 04, 10, 11, 12, ADR 0004).
- The **Join card is universal and modal** (19): before Join nothing takes input, including Tab, key panning and touch drag, which 22 and 14 had allowed. Keyboard users join like everyone else.
- After Join, **keys move the cursor**, not the camera (22); this also replaces ticket 14's "arrow keys and WASD still pan the camera while a prop button has focus". Focus still centres the camera; keys steer the cursor.
- Desktop has **no drag, wheel or trackpad panning** (22); ticket 06 rules 5 and 6 apply to touch only.
- Own cursor **1.25x, peers 0.75x** (15) times the depth factor `d` (18), replacing same-size cursors (11).
- The **river** rules in 22 replace those in 18: the camera follows the drift; only the south end resets; the bridge layers by river state; no "drift out of view" reset.
- The MonsterCommerce sign **does not flip** (11); its cosmetic is called "monster hat" in 11's table and "monster ears" in 05's comment and the map. This spec uses **monster ears** with id 3.
- The **consent bar** is a popover above the Join card (19), not a top-pinned bar in flow (17); its copy and rules are unchanged.
- The persistence schema gains `analytics` (17) and `sound` defaults **true** (19).

### Gaps and calls made in assembly

Nothing here blocks ticketing, but each is a decision Joe hasn't explicitly made or a fact the build will need.

1. **Peer river state**: ticket 22 left "derive locally or send a presence bit" to the spec. This spec chooses the **presence bit** (in, out, and in `hello`), because a late joiner has no path history and a position under the deck is ambiguous. Joe to confirm or veto.
2. **The jukebox ruling rests on a stale premise**: ticket 10 kept Side Project's jukebox out of the shared set because sound was off by default. Sound is now on by default, and 19 gave the bar a bed and diegetic music, so nothing is missing; if Joe wants a second shared prop, the bar's music is the obvious candidate, and the shared-prop rules already cover it. Not reopened here.
3. **Three sub-scene URL slugs** are proposed above (`/midtown/slu`, `/maplewood/side-project`, `/central-west-end/brennans`) and not fixed by any ticket.
4. **Signpost phone framing** is unresolved by design: ticket 07 deferred it to the art regeneration pass, which must place the signpost inside the first 390 x 844 portrait frame at 0.6 scale with the camera on the welcome sign.
5. **Tablets and coarse-pointer laptops**: render scale is 1.0 for desktop and 0.6 for phones "by device class", and pointer lock applies to "any fine pointer". A touch tablet gets the touch input model; its render scale should be chosen by viewport width in the build (a tablet at 0.6 would see far too little). *Settled by Joe, 2026-09-29:* the touch controls are for a device with no mouse or trackpad connected (`(any-pointer: fine)` false); any device with one, a tablet included, gets the mouse and keyboard model. The scale is 0.6 on a screen under 768 px on its shorter side and 1.0 otherwise.
6. **Unlocked desktop fallback** when a browser refuses pointer lock is named in 22 but not detailed: the intended behaviour is the pre-lock model (drawn cursor follows the OS pointer, keys move the cursor, push stops when the pointer leaves the window, no drag or wheel).
7. **Keepalive interval** is "as the prototype" (ticket 04 suggested 15 s); ticket 09 fixed the mechanism (a `ping` text frame with auto-response), not the number. *Settled by Joe, 2026-09-29:* keep a watching visitor connected without spending the room's CPU, and let vanished ones go. Every 30 s, with a room dropping a socket silent for 90 s (see Wire format). The prototype's 2 s ping also synced the clock, which the auto-response's fixed `pong` can't.
8. **Screen sequence lengths per title** are "set in the prototype" (10); the prototype's values are the starting point and the trailer cues (19) must fit them. *Settled by Joe, 2026-09-29 (buildout ticket 17):* each title's reel is its demo video's length (Fast Five 58.17 s, Snow White and the Huntsman 35.07 s, The Lorax 36.4 s) plus 7.7 s of projector, title card, case study and fade, and the video's own sound is the trailer cue.
9. **No real-phone performance numbers** exist; the phone verdict is Joe's hands-on test. The bench and soak remain the way to get them. *Partly filled, 2026-09-29 (buildout ticket 10):* a 10-minute soak on a Pixel 11 Pro (Chrome 154) held 60 fps with flat memory; no iPhone numbers yet.
10. **Foreground scenery selection, depth region values and the river geometry** are art-pass outputs, not yet produced; the pointer-lock prototype's stand-in river (x 3980 to 4200, deck y 1180 to 1290, south end y 2676) is a placeholder.

### Suggested build phases

A hint for `/to-tickets`, not the ticket list. Each phase should still be cut into tracer-bullet slices, and the earliest slice of each phase can start as soon as its inputs exist.

1. **Skeleton and deploy**: SvelteKit static build with the scene-data module shape, the prerendered accessible layer for the overworld and one sub-scene with placeholder rects, the Worker serving assets, Workers Builds, the domain and DNS checklist, headers and CSP, the noindex previews. Ships a crawlable, keyboard-navigable site with no canvas yet.
2. **Engine and camera**: canvas tiles, the button layer transform, the Join card, pointer lock and pause, keys, touch joystick and drag, edge-push, the sub-scene fade, reduced motion. Single-player only, placeholder art.
3. **Rooms and cursors**: the Room and directory objects, the protocol, presence, the cursor atlas with flag, halo, tag, sizes and depth factor, degradation and reconnect, the kill switch and usage scripts.
4. **Props, cards and cosmetics**: props drawn with hover and click reactions, cards, the seven grants, gold, the persistence rune, the lap timer, the Foundry screen as the shared prop.
5. **Art regeneration pass**: every scene regenerated to join up via the judge-and-regenerate loop, delivering tiles, prop cut-outs, moving-prop parts, depth regions, foreground scenery and the river geometry; the river current and foreground layering land with it.
6. **Sound and analytics**: the Web Audio module, beds, theme and music, one-shots, the toggle, the audio-sources ledger; GA4 events, deferred loading, the consent popover, GPC.
7. **Launch**: the dashboard checklist verification, a phone soak, content review against the inventory and clearances.
