# Pointer-locked desktop cursor and the river current: do the gate, the pause and the drift feel right?

Type: prototype
Status: resolved
Part of: ../map.md
Blocked by: 18

## Question

Desktop input is moving to pointer lock, the way Cursor Camp works. This is settled before prototyping (see below). A flick of the mouse can no longer carry the pointer out of the window, so edge-push never misses. Under lock the drawn cursor is the only cursor, so the river current just moves it. The old question of a drawn cursor pulling away from a hidden real pointer is gone.

Build the settled rules and decide the rest by feel:

- Does the join gate read as an invitation or as a wall?
- Does the pause and resume loop feel smooth? That includes Chrome refusing to re-lock for about a second after Esc.
- Does the edge-push band from the world-layout ticket still feel right when the cursor can be pinned against the viewport edge? The band width or top speed may need retuning.
- Does the river current at 150 world px/s read as play, and is the fade to the Arch clear?
- What happens when a drifting visitor presses Esc: does the drift continue while paused?

Output: the desktop input rules and the desktop river current rules for the spec. Build on top of `prototype/cursor-sync`, with a stand-in river strip and bridge.

## Settled before prototyping (2026-09-24, with Joe)

Cursor Camp was checked in the browser: its live scene and other visitors' cursors run behind a small "Enter" card.

- **Scope**: the gate and lock are desktop only (any fine pointer). Touch devices skip the gate and keep the joystick and drag. A desktop browser that refuses pointer lock falls back to the current unlocked behaviour.
- **Join gate**: on landing, the live scene runs behind a dimmed card with a Join button. Other visitors' cursors are visible and moving. The visitor's own cursor is not sent to anyone until they join. Keyboard users can Tab into the prop buttons and cards without joining, so the accessible layer never depends on the gate.
- **Locked movement**: the cursor is drawn exactly as the cursor identity and own-cursor tickets decided. Mouse movement moves it 1:1 in screen pixels with the OS acceleration kept, so it tracks the physical mouse like a normal pointer. It is held inside the viewport. Edge-push reads the drawn cursor, so holding it against an edge keeps the camera pushing. Clicks and hover go to whatever sits under the drawn position, which is how the joystick already works.
- **Pause**: Esc, switching to another window, or hiding the tab releases the lock and shows a "Paused, click to resume" card. While paused:
  - the cursor freezes where it was, and peers see it idle there;
  - the camera stops;
  - the scene keeps animating;
  - the hidden-tab rule from the cursor sync ticket still applies: stop sending, and close after 60 s.
- **Resume**: clicking Resume re-locks with the cursor exactly where it stopped. If the browser refuses (Chrome's cooldown after Esc), the card stays up and says to try again in a moment.
- **Camera input on desktop**: only edge-push. Arrow keys and WASD move the cursor, not the camera (amended below). Drag-to-pan, wheel panning and trackpad panning are removed on desktop. Drag stays on touch only.
- **Navigation**: the element that holds the lock sits in the shared layout, so entering a venue or leaving through an exit door keeps the lock. A link that opens another site blurs the window and pauses as above.

## Prototype

Branch `prototype/pointer-lock` (commit 25503d9), built on `prototype/own-cursor`, in `prototypes/cursor-sync/`. Run `npm run dev` and open `/?bots=20`, or use `npm run local` for the real socket. Settings: `?lock=0` turns the gate off for comparison, `?current=` sets the river speed, and `?pdrift=1` keeps the drift going while paused. The same controls are in the gear panel.

- The stand-in Mississippi is a blue strip at world x 3980 to 4200, with a bridge deck at y 1180 to 1290 and the Arch on the west bank.
- Peers snap on jumps over 400 world px.
- Checked in a headless tab by stepping the loop (the automation tab can't take a real lock):
  - Join places the cursor at the click point.
  - Mouse deltas are held to the viewport.
  - Edge-push runs about 900 px/s when the cursor is pinned to an edge.
  - The wheel no longer pans.
  - While paused, the cursor and camera freeze, and keys are ignored.
  - Resume returns to the frozen spot.
  - Clicking under lock opens the prop beneath the drawn cursor.
  - The river drifts at 150 px/s and the camera doesn't follow.
  - The bridge doesn't drift.
  - A cursor washes out after about 3 s and is put back at the Arch.
- Still needs Joe's hands for the real lock, the Esc cooldown and the feel questions above.

2026-09-24: deployed to https://cursor-sync-proto.barmadden.workers.dev (version b23256f8), replacing the ticket 09 build there. It uses the real socket, so Join, pause and the river can be tried with other visitors. Add `?current=`, `?pdrift=1` or `?lock=0` to the URL to change settings.

2026-09-24, Joe's first remote run: Join, pause, resume and the river all worked well. One problem: a prop's card could not be clicked. The drawn cursor was painted under the card and the other controls, so with the OS cursor hidden there was nothing to aim with. Joe's rule: cards (and every on-screen control) are part of the scene interaction. The locked cursor is drawn above them and operates them. The fix is commit 32451f3, deployed as version 6b736a9d:
- the cursor canvas sits above all UI;
- the control under the cursor gets a hover mark;
- a click activates it.
Checked on the live site: the card opens, Close is marked on hover, and a click closes it. Joe chose to keep the card as the prerendered `<dialog>` from the accessible layer ticket, styled to the scene, as long as the locked cursor can click it. The text is not painted on the canvas. The prototype already works this way.

2026-09-24, Joe's second remote run: panning with the keys stopped working once the camera hit a scene edge. The keys moved the camera, and a clamped camera left nothing to move. Joe's rule: while locked, arrow keys and WASD move the cursor exactly as the mouse does, and the camera follows through the edge-push band. At a world edge the cursor keeps travelling to the scene edge.
- Cursor speed on the keys is 600 world px/s, the joystick speed, set with `?keyspd=`. Diagonals are normalised.
- Before joining, keys still pan the camera, since there is no cursor yet. Keyboard users Tab through props there.
- Commit 3cb8a08, deployed as version dc0a118b.
- Checked on the live site by stepping the loop:
  - a quarter-second tap moves the cursor 150 px and leaves the camera still;
  - holding left, the camera stops at x 0 and the cursor carries on to the scene edge;
  - holding right, the camera follows once the cursor reaches the band.

2026-09-24, Joe's third remote run: being dropped at the Arch just because the drift took the cursor out of view felt wrong while steering. Joe's rules:
- The reset happens only when you reach the river's end while in the river.
- The bridge is foreground when you are in the river, so you pass under it, and you walk on top of it when you are crossing.

Built in commit c37b652, deployed as version d755556c:
- the river logic moved to `river.ts`, with an in-the-river state that holds while under the deck;
- the drift is held inside the viewport and the camera follows it through the push band;
- the wash-out now triggers only at the south end, at world y 2676 and below;
- the overlay draws the bridge after your cursor when you are in the river, and peers on the deck stay on top;
- the stand-in bridge and Arch point now line up with the road crossing and Arch already painted in the placeholder art.

Checked by stepping the loop:
- walking from the west bank onto the deck stays out of the river, with no drift;
- stepping off the deck onto water enters the river;
- the drift passes under the deck and stays in the river, and the cursor is hidden by the bridge (screenshot checked);
- steering onto the east bank leaves the river and stops the drift;
- left to drift, the cursor stays on screen, the camera follows, and it washes out at the end after about 3.5 s from mid-river on a tall viewport.

The detail is recorded as an amendment on the depth effects ticket.

## Answer

2026-09-24, Joe signed off after three remote runs on the deployed prototype: the rules below go into the spec. The detail, and how each rule was reached, is in the sections above.

**Desktop input (any fine pointer; touch keeps the joystick and drag, with no gate)**
- **Join gate:** the live scene and peers run behind a dimmed Join card. Nothing is sent and no own cursor is drawn until Join. Keyboard users can Tab to props and cards without joining. A browser that refuses the lock falls back to unlocked behaviour.
- **Locked cursor:** the drawn cursor is moved 1:1 by mouse movement (OS acceleration kept) and is held inside the viewport. It starts where Join was clicked.
- **Keys:** once joined, arrow keys and WASD move the cursor at 600 world px/s, with diagonals normalised. Before joining they pan the camera.
- **Camera:** it follows the cursor through the edge-push band (unchanged: 25 / 12 percent, 900 px/s). There is no drag, wheel or trackpad panning on desktop.
- **Drawing order:** the cursor is drawn above every card and control.
- **Hover and click:** hover and clicks resolve at the drawn position. That includes cards, which stay prerendered `<dialog>` elements styled to the scene, never painted on the canvas.
- **Pause:** Esc, blur or a hidden tab shows a Paused card. The cursor, the camera and the keys freeze, and the scene keeps animating. Resume re-locks with the cursor where it froze. A refused re-lock (Chrome's cooldown) keeps the card up and asks the visitor to wait a moment. The drift does not continue while paused.
- **Navigation:** the lock lives on the shared layout, so it survives venue hops. External links blur the window and pause.

**River current (replaces the version in the depth effects ticket)**
- **Getting in:** a cursor is in the river once it moves onto the water from a bank or off the bridge deck. It stays in the river under the deck, and leaves by reaching either bank.
- **The drift:** in the river the cursor drifts south at 150 world px/s. The camera follows through the push band, and steering is never punished.
- **The reset:** only reaching the river's south end fades the visitor back to the Arch (a cut under reduced motion). Peers snap on jumps over 400 world px.
- **The bridge:** it is drawn over a cursor in the river and under a cursor crossing it.
- **Left to the spec:** whether a peer's river state is derived locally or sent as a presence bit, so that peers also pass under the bridge.

Prototype: branch `prototype/pointer-lock`, last commit c37b652, live at https://cursor-sync-proto.barmadden.workers.dev.

2026-09-24, amended by [What does each district and prop sound like, and how is sound switched on?](19-sound-design.md): the Join gate applies on touch as well, for one universal experience. Join is a modal card on every device: nothing moves, takes input or is sent until Join, including keyboard Tab and key panning, which this ticket had allowed before Join. On touch, drag and the joystick wait for Join too, and the cursor starts where Join was tapped. Switching away from the tab pauses on touch, and the Resume tap also resumes audio. The Join press starts sound unless the visitor stored it off.
