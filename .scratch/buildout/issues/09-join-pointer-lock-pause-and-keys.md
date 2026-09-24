# 09: Join card, pointer lock, pause and resume, keys

**What to build:** Every device opens on a modal Join card, a prerendered `<dialog>` opened with `showModal()` holding only the Join button, with the scene dimmed and inert behind it: until Join nothing moves, nothing takes input (Tab reaches only the Join button), and the visitor's own cursor is not drawn. The cursor starts where Join was pressed. On a fine pointer the Join click locks the pointer: the drawn cursor moves 1:1 with OS acceleration, held inside the viewport, the OS cursor hidden, so edge-push never misses. Esc, blur, or hiding or switching away from the tab releases the lock and shows a "Paused, click to resume" card; the cursor freezes where it was, the camera stops, keys are ignored, and the scene keeps animating. Resume re-locks with the cursor exactly where it froze; if the browser refuses (Chrome's cooldown after Esc) the card stays up and says to try again in a moment. Once joined, arrow keys and WASD move the cursor at 600 world px/s with normalised diagonals and the camera follows through the push band; keys are ignored while paused or while a card is open. The cursor canvas sits above every card and control; under lock, hover and clicks resolve with `elementFromPoint` at the drawn cursor, the control under it gets a hover mark, and a click activates it, including a card's Close and the links inside it. The element holding the lock lives in the shared layout. External links blur the window and pause.

Carries over the pointer-lock prototype's Join, Paused and lock handling from its layout.

**Blocked by:** 08 (engine)

**Status:** ready-for-agent

- [ ] Before Join: Tab reaches only the Join button, keys and mouse do nothing to the scene, no cursor is drawn
- [ ] Join locks the pointer on desktop and the cursor appears at the press; a refused lock falls back to the unlocked model from 08
- [ ] Esc, blur and a hidden tab pause with the card; resume re-locks in place; the cooldown message appears when re-lock is refused
- [ ] Keys move the cursor at the specified speed, ignored while paused or a card is open
- [ ] With the pointer locked, the drawn cursor can open a card, click its Close and follow a link inside it
- [ ] Playwright smoke (seam 4): Join, pause and resume, open and close a card with the keyboard and with the drawn cursor (the real lock stays hands-on)
