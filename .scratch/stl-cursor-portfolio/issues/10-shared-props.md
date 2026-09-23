# Which props are shared and server-authoritative, and what is their state model?

Type: grilling
Status: resolved
Part of: ../map.md
Blocked by: 02, 05

## Question

Pick the one or two props that are shared across visitors in a room (candidates from the content inventory: a projector at The Foundry, a jukebox at Side Project Cellar, a bike race at Carondelet Park), define each prop's state, who may change it, how conflicts resolve, and how it looks to a visitor arriving mid-state. Constrained by what the chosen backend can run server-side. Output: state definitions ready for the spec.

## Answer

Resolved 2026-09-23 in a grilling session.

### The shared set

**One shared prop: the Foundry screen.** The Carondelet bike track, floated as a shared race with a room leaderboard, is a **local prop** (see below). No jukebox at Side Project Cellar: sound is off by default, so a shared prop whose only effect is audio is invisible to most visitors. The overworld therefore has no shared prop; co-presence there comes from cursors alone. Accepted knowingly.

### Foundry screen (theatre sub-scene, shared)

Layout: posters on the wall, screen to the right, projector in the scene.

**State** (held by the theatre's Durable Object, in memory only):

```
idle
playing { title: "fast-five" | "snow-white" | "lorax", startedAt: serverTime }
```

**Op:** `screen.play { title }`, sent when a visitor clicks a poster.

**Authority and conflicts:** any visitor in the room may send the op. The server accepts it only when the screen is `idle`; while `playing` the op is dropped silently and the current reel finishes. No separate cooldown: the sequence length is the busy window. First accepted op wins. Clients make no optimistic change; the screen changes on the server echo.

**Sequence** (fixed length per title, several seconds, exact timing set in the prototype): projector lights up, screen shows "Now Showing", then the title logo, then image and one-line case-study text, then fades out to dark and the state returns to `idle`. The screen is the only place the Universal titles are told; the poster's hover shows the title name only, and the same text sits in the accessible HTML layer under the poster for crawlers and screen readers.

**Arriving mid-sequence:** the join snapshot carries every shared prop's state plus server time. The client keeps a clock offset and joins the sequence at `now - startedAt`.

**Empty room:** state resets to `idle`. Nothing is written to Durable Object storage.

**Attribution:** none. The sequence playing is the whole signal.

**Rendering:** the state is a title id only. How the reel is drawn belongs to the animation-approach ticket, where the screen is the leading candidate for the single hero animated prop.

### Rules that apply to every shared prop

- Server-authoritative, in-memory state in the scene's Durable Object; reset to default when the room empties; no storage writes.
- Any visitor may act; the server rejects ops while the prop is busy or cooling down; first accepted op wins; no optimistic client change.
- Full snapshot of shared-prop state plus server time in the join message.
- **Degradation in layers.** Visitors over the live-cursor cap get a **spectator** socket: they receive cursors and shared-prop state but send nothing, and their clicks on shared props act locally. Outbound is free, so spectators cost nothing beyond a heartbeat. Socket fully down: the prop runs the same state machine locally. On reconnect the server snapshot overwrites local state without animation. This resolves the disagreement between the sync-techniques note (overflow to sibling rooms) and the backend note (single-player beyond the cap): over-cap visitors are spectators.
- No attribution of who acted.

### Ruled local: the Carondelet bike track

A lap timer, client-side only, modelled on Cursor Camp's running track. The client detects the cursor crossing the start line, follows the path around the track, and on re-crossing the line shows the lap time. Each visitor sees only their own timer. A **personal top-ten** of fastest laps lives in localStorage (feeds the persistence-schema fog). No server involvement, no shared leaderboard, no messages. The NPC rider from the inventory stays as clock-synced scenery, positioned from the server time in the join snapshot so every visitor sees it at the same point, and it never touches the timer.

### Hand-offs

- Cursor identity and cosmetics: whether a completed lap grants anything, given the bike helmet sits on Joe's bike; when the 3D glasses are granted (poster click, or watching a full sequence).
- Animation approach: the screen sequence as the hero animated prop candidate.
- Cursor sync prototype: use the screen as the shared prop; include the spectator socket.

### Glossary

Added **Shared prop** and **Local prop** to `CONTEXT.md`.
