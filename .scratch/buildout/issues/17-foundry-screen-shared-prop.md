# 17: Foundry screen shared prop

**What to build:** In the theatre, clicking a poster sends `screen.play { title }`; the room object accepts it only while the screen is `idle`, drops it silently while `playing`, first accepted wins, and echoes the new state to the room. Every visitor's screen then runs the same timeline from server time (projector lights up, "Now Showing", the title logo, the image and one line of case-study text, fade to dark, back to `idle`), with a fixed length per title set here from the prototype's values (spec gap 8). A visitor arriving mid-sequence lands at `now - startedAt` from the `hello` snapshot. State resets to `idle` when the room empties and on deploy; clients make no optimistic change. Offline, the same timeline runs locally from the visitor's own click. The screen button's name reflects its state. No attribution. Each room has its own screen.

Carries over the prototype's screen module (state machine and local fallback) and the server-side state in the Room object.

**Blocked by:** 13 (net client and `hello`), 15 (the poster click)

**Status:** ready-for-agent

- [ ] Two browsers in the theatre see the same title play from one poster click; a second click during play does nothing for anyone
- [ ] A third browser joining mid-play sees the screen partway through the same title
- [ ] The screen returns to idle at the sequence's end and when the room empties
- [ ] Offline, a poster click plays the timeline locally
- [ ] Seam 1: the op is accepted only while idle and the snapshot carries state and server time; seam 2: the timeline is a pure function of server time with one test per title length

## Comments

### The screen and the projector in the art, 2026-09-28

The Foundry art pass (ticket 05) redrew the theatre as a small isometric auditorium, so the projector, its beam and the whole screen share one view. `src/lib/scenes/foundry.ts` exports what the timeline needs:

- **`SCREEN_SURFACE`:** the screen's painted quad, clockwise from the top left. The camera sees the right wall at an angle, so the quad is not a rectangle, and not a parallelogram either: its bottom edge falls more steeply than its top. Draw the sequence through a projective mapping of the quad, or two triangles, not a plain rect.
- **`PROJECTOR_LENS`:** the end of the lens barrel on the ledge at the lower left, pointing up-right at the screen. "Projector lights up" starts the beam here, a cone to the four corners of `SCREEN_SURFACE`.
- **Idle:** the screen is painted idle, a blank, dim ivory surface; the room's lighting is dimmer than the daytime palette at Joe's request.
- **Walk-behind:** the seat rows the beam crosses are walk-behind scenery (ticket 19). Draw the beam over the scene canvas and under the cursors.
