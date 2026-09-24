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
