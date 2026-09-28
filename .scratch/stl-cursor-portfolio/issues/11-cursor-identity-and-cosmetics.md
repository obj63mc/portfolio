# What does a visitor's cursor look like, and which cosmetics exist?

Type: grilling
Status: resolved
Part of: ../map.md
Blocked by: 05

## Question

Design the cursor: base shape, how the GeoIP flag attaches, how the visitor's own cursor is distinguished from others (a known Cursor Camp complaint), and the full list of cosmetics with the prop that grants each one (from the content inventory). Decide how cosmetics render on other visitors' screens and how they persist in localStorage. Output: a cursor and cosmetics spec.

## Comments

2026-09-23, from the shared-props ticket (10): the bike track is a local lap timer with a personal top-ten. Decide whether completing a lap grants anything, given the bike helmet sits on Joe's bike. Also decide when the 3D glasses are granted: on the poster click that starts the screen sequence, or on watching a sequence through.

## Answer

Resolved 2026-09-23 in a grilling session.

### Base cursor

- A drawn arrow pointer in the flat vector style, about 32 world px tall, white body with a dark outline. The native OS cursor is hidden over the scene; the visitor's own cursor is drawn like everyone else's.
- Three anchor points on the arrow: head, face, side. Each cosmetic attaches to exactly one.
- No names. Identity is flag plus cosmetic only. The `name` field from the sync research sketch is dropped from the wire format.
- Clicking another visitor's cursor does nothing. On a phone the same cursor is driven by the joystick.

### Your own cursor

- A halo in a single fixed accent colour, the St. Louis city-flag blue, drawn only on your own cursor. It composes with both the white and gold bodies.
- A "you" tag beside your cursor on arrival and on every scene entry, fading after about two seconds.
- Spectator visitors (over the room cap) still see and drive their own cursor and can earn cosmetics; the halo and tag apply to them too.

### Flag

- A small country-flag badge at the arrow's lower right, the same anchor on every cursor so no cosmetic covers it.
- Assigned by the server from GeoIP at join, never client-supplied. No self-assigned or special flags for anyone, Joe included.
- Unknown or non-country geo (private range, Tor, lookup failure) shows the St. Louis city flag.

### Cosmetics

Seven, one worn at a time. Earning a new one replaces the worn one. There is no way to remove a cosmetic; re-clicking a granting prop replays the prop and re-wears its cosmetic. Grant is on the first interaction with the prop, with no watching or skill required.

| Id | Cosmetic | Anchor | Granting prop | Trigger |
| --- | --- | --- | --- | --- |
| 1 | Graduation cap | head | Diploma, CS lab | click |
| 2 | 3D glasses | face | Foundry poster (any of the three) | the poster click that sends the screen op, granted whether or not the op is accepted |
| 3 | Monster hat: two purple pointed cat-like ears on a band, in the MonsterCommerce mascot's purple | head | MonsterCommerce logo sign; the "O" is the mascot's eyeball | click the eye, it blinks shut |
| 4 | Antlers | head | The moose, Moosylvania exterior | click |
| 5 | Beer mug | side | The Side Project sign on the cooler door | click |
| 6 | Cigar | side | Any humidor box at Brennan's | click |
| 7 | Bike helmet | head | Joe's bike, Carondelet Park | click |

Id 0 is no cosmetic. The MonsterCommerce sign does not flip to Network Solutions; the acquisition text lives in the sign's content, not its artwork. A completed bike-track lap grants nothing beyond the personal top-ten.

### Gold cursor

When a visitor has earned all seven, their cursor body is gold instead of white. Gold is derived from the earned set and never stored on its own. It is the only completion reward.

### Grant feedback

The cosmetic pops onto the cursor with a scale-in of about 300 ms. Everyone in the room sees the same pop, because the change arrives as a presence update. A prop sound plays only if the visitor has turned sound on.

### Other visitors' cursors

- Presence per visitor: id, flag, worn cosmetic id (0 to 7), gold bit. Cosmetic and gold changes are sent as a presence update when they happen, never in the per-tick position message.
- Every client draws every cursor from one local sprite atlas keyed by cosmetic id. No image data or URLs cross the wire; a peer can only pick an id. The server validates the id range. The gold bit is client-asserted, since gold has nothing worth defending.
- Peers outside the camera are neither drawn nor interpolated. The client ignores their position updates until they enter the view. No edge markers, no "others are nearby" hint.
- Idle peers on screen stay at full opacity, frozen where they stopped, until their socket closes. No idle fade, no idle removal.

### Persistence

localStorage holds two cosmetic fields: the worn cosmetic id and the earned set (seven bits). A returning visitor arrives wearing what they last wore, gold if they had finished. Key naming and versioning are settled with the persistence-schema fog item alongside the bike top-ten.

### Not decided here, deliberately

- A picker to switch between earned cosmetics. Ruled out for this map by the single-cosmetic model.
- Overlay implementation (DOM elements or a canvas layer) belongs to the rendering prototype.

2026-09-24, from the cursor sync ticket (09): on a phone with 20 bots, Joe found his own cursor hard to see. The own-cursor rules above (halo plus a fading "you" tag at the same size as peers) are being revisited in the ticket "How does your own cursor stand out in a crowd on a phone?" (`15-own-cursor-in-a-crowd.md`).

2026-09-24, amended by the ticket "How does your own cursor stand out in a crowd on a phone?" (`15-own-cursor-in-a-crowd.md`): the halo and fading tag stay, but your own cursor is drawn at 1.25x and every peer at 0.75x on your screen, at full opacity. This is local drawing only. The rules live in that ticket.

2026-09-24, amended by [Pointer-locked desktop cursor and the river current](22-pointer-lock-and-river-current.md): on desktop the pointer is locked after the visitor joins. The drawn cursor looks exactly as decided here, but it is moved by mouse movement instead of following the OS pointer position. Before joining, and while paused, the visitor's own cursor is not moving; peers see it idle, or not at all before the first join.

2026-09-24, amended by [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): spectators no longer exist (ADR 0005). A visitor past the site-wide ceiling is single-player, and still sees and drives their own cursor, earns cosmetics and gets the halo and tag.
