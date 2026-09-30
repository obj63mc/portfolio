# 17: Foundry screen shared prop

**What to build:** In the theatre, clicking a poster sends `screen.play { title }`; the room object accepts it only while the screen is `idle`, drops it silently while `playing`, first accepted wins, and echoes the new state to the room. Every visitor's screen then runs the same timeline from server time (projector lights up, "Now Showing", the title logo, the image and one line of case-study text, fade to dark, back to `idle`), with a fixed length per title set here from the prototype's values (spec gap 8). A visitor arriving mid-sequence lands at `now - startedAt` from the `hello` snapshot. State resets to `idle` when the room empties and on deploy; clients make no optimistic change. Offline, the same timeline runs locally from the visitor's own click. The screen button's name reflects its state. No attribution. Each room has its own screen.

Carries over the prototype's screen module (state machine and local fallback) and the server-side state in the Room object.

**Blocked by:** 13 (net client and `hello`), 15 (the poster click)

**Status:** resolved (2026-09-29); the hands-on checks are listed in the last comment

- [x] Two browsers in the theatre see the same title play from one poster click; a second click during play does nothing for anyone
- [x] A third browser joining mid-play sees the screen partway through the same title
- [x] The screen returns to idle at the sequence's end and when the room empties
- [x] Offline, a poster click plays the timeline locally
- [x] Seam 1: the op is accepted only while idle and the snapshot carries state and server time; seam 2: the timeline is a pure function of server time with one test per title length

## Comments

### The screen and the projector in the art, 2026-09-28

The Foundry art pass (ticket 05) redrew the theatre as a small isometric auditorium, so the projector, its beam and the whole screen share one view. `src/lib/scenes/foundry.ts` exports what the timeline needs:

- **`SCREEN_SURFACE`:** the screen's painted quad, clockwise from the top left. The camera sees the right wall at an angle, so the quad is not a rectangle, and not a parallelogram either: its bottom edge falls more steeply than its top. Draw the sequence through a projective mapping of the quad, or two triangles, not a plain rect.
- **`PROJECTOR_LENS`:** the end of the lens barrel on the ledge at the lower left, pointing up-right at the screen. "Projector lights up" starts the beam here, a cone to the four corners of `SCREEN_SURFACE`.
- **Idle:** the screen is painted idle, a blank, dim ivory surface; the room's lighting is dimmer than the daytime palette at Joe's request.
- **Walk-behind:** the seat rows the beam crosses are walk-behind scenery (ticket 19). Draw the beam over the scene canvas and under the cursors.

### The screen plays the games' demo videos, 2026-09-29

Joe supplied a demo video of each title's game in `art/sources/videos`, one per poster. The timeline's image is now that video, played on the screen through `SCREEN_SURFACE`'s projective mapping. `SCREEN_VIDEOS` in `src/lib/scenes/foundry.ts` maps each title to its file: Fast Five is `fastfive-demo-full`, Snow White and the Huntsman is `swath-demo-tour` and The Lorax is `lorax-demo-tour`. `Prop.svelte`'s glob already hashes all three into the build (ticket 15). *Proposed, for Joe to confirm:* set each title's sequence length from its video's (58, 35 and 36 s) rather than the prototype's values (spec gap 8), and let the video's own sound stand in for the trailer cue, since the screen is audible to the room.

### Built, 2026-09-29

Joe's direction with the build: a poster click plays the title's demo video on the screen, with the projector projecting it, and while it plays the camera zooms out so the projector and the whole screen are in view, on every device. His call also settles the proposal above and spec gap 8.

- **The reel** (`src/lib/net/screen.ts`, pure, read by the room and the client): the beam comes up over 1.2 s on the blank screen, "Now Showing" and the title for 2 s, the demo video for its own length, the case-study line for 3 s, then 1.5 s fading to dark. Fast Five runs 65.87 s, Snow White and the Huntsman 42.77 s, The Lorax 44.1 s. `SCREEN_VIDEOS` in `foundry.ts` now carries each video's length (ffprobe) beside its file.
- **The wire**: `{"t":"screen.play","title"}` up; `{"t":"screen","title","at"}` down to everyone, the sender included, when the room accepts it; `hello.screen` is `{ title, at }` while a reel runs, else null. `readControl` and `readServer` narrow both. A play outside a Foundry room is dropped.
- **The room** holds the screen in memory and writes it into every socket's attachment on each play, so a room that hibernates mid-reel wakes with it; it empties to idle. No storage, no attribution.
- **The client**: `Net.screen` follows `hello` and the echoes; `Net.play()` sends the op when live and runs the state machine locally otherwise, and a scene change forgets the screen. `src/lib/engine/projector.ts` draws the reel over the props and under the cursors: the beam as a cone from `PROJECTOR_LENS` to the screen's corners, screened over the room round the screen, with a glow at the lens; the title card, video and case study are drawn on a 1280 × 720 film, which is mapped onto `SCREEN_SURFACE` through its projective map (Heckbert's square-to-quad, `onQuad`) as an 8 × 6 mesh of triangles, each placed by its affine map into an offscreen canvas at alpha 1, a device px wider than itself so no hairlines show, and composited with the reel's light. The video element is made in script, loads only when a reel starts, is let go when it ends, and is seeked back into step whenever it drifts half a second from server time. It plays with sound; where the browser refuses sound without a gesture (behind the Join card, iOS) it plays muted rather than not at all. The screen button's name follows the reel ("Screen: now playing The Lorax").
- **The zoom** (`framing` and `zoom` in `camera.ts`, seam 2): while a reel plays the camera eases (time constant 0.15 s, about 600 ms) out to `REEL_FRAME`, the projector's body (x 100 to 390, y 1010 to 1250 on the master) and the whole screen with 40 px to spare, at the largest scale that fits and never closer than the session's: 0.54 on a 1440 × 900 desktop, 0.147 on a 390 × 844 phone. It eases back on the visitor's cursor when the reel ends, a cut under reduced motion. It runs behind the Join and Paused cards too. Edge-push, the keyboard glide and drag are off while it holds the camera; the cursor keeps its world place (the unlocked mouse's stays at the OS pointer) and its size. ADR 0001 and the spec's Camera section carry the amendment.
- **Art data**: `SCREEN_SURFACE`'s top edge moved up 3 px, re-measured on the master (the ivory starts 3.3 px above the first trace); the other edges sit within the film's 2 px bleed.
- **Tests**: `tests/screen.test.ts` (the reel per title, a clock behind the server's, the quad map), `protocol.test.ts` (the op and the snapshot), `rooms.test.ts` (plays accepted only while idle and only in the Foundry, the echo, the mid-reel snapshot, idle once the room empties), `camera.test.ts` (framing and the zoom), `sub-scene-geometry.test.ts` (the frame holds the lens, the projector and the screen) and `tests/screen.spec.ts` (two browsers on wrangler dev, a third arriving mid-reel, and offline on a 390 × 844 phone: framed whole, idle and back at 0.6 when it ends). Playwright's Chromium has no H.264, so the smoke checks the reel's pixels, not the video's; the video on the quad was looked at in Chrome (desktop and phone).

Hands-on, for Joe:

- The reel with sound in two real browsers, and on an iPhone, where it will likely play muted even for the visitor who tapped the poster: the video starts when the room's echo arrives, outside the tap's gesture. Whether Safari draws a video element made in script onto the canvas is also untested.
- Hibernation mid-reel: `wrangler dev` never hibernated a room in testing, so waking with the screen from the attachments is untested.
- The poster click opens the poster's card, as every prop's does, so the visitor who starts a reel sees it behind the card until they close it.

