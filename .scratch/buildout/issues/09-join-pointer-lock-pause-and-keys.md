# 09: Join card, pointer lock, pause and resume, keys

**What to build:** Every device opens on a modal Join card, a prerendered `<dialog>` opened with `showModal()` holding only the Join button, with the scene dimmed and inert behind it: until Join nothing moves, nothing takes input (Tab reaches only the Join button), and the visitor's own cursor is not drawn. The cursor starts where Join was pressed. On a device with a mouse or trackpad connected (`(any-pointer: fine)`, a tablet with one included; Joe, 2026-09-29) the Join click locks the pointer: the drawn cursor moves 1:1 with OS acceleration, held inside the viewport, the OS cursor hidden, so edge-push never misses. Esc, blur, or hiding or switching away from the tab releases the lock and shows a "Paused, click to resume" card; the cursor freezes where it was, the camera stops, keys are ignored, and the scene keeps animating. Resume re-locks with the cursor exactly where it froze; if the browser refuses (Chrome's cooldown after Esc) the card stays up and says to try again in a moment. Once joined, arrow keys and WASD move the cursor at 600 world px/s with normalised diagonals and the camera follows through the push band; keys are ignored while paused or while a card is open. The cursor canvas sits above every card and control; under lock, hover and clicks resolve with `elementFromPoint` at the drawn cursor, the control under it gets a hover mark, and a click activates it, including a card's Close and the links inside it. The element holding the lock lives in the shared layout. External links blur the window and pause.

Carries over the pointer-lock prototype's Join, Paused and lock handling from its layout.

**Blocked by:** 08 (engine)

**Status:** resolved

- [x] Before Join: Tab reaches only the Join button, keys and mouse do nothing to the scene, no cursor is drawn
- [x] Join locks the pointer on desktop and the cursor appears at the press; a refused lock falls back to the unlocked model from 08
- [x] Esc, blur and a hidden tab pause with the card; resume re-locks in place; the cooldown message appears when re-lock is refused
- [x] Keys move the cursor at the specified speed, ignored while paused or a card is open
- [x] With the pointer locked, the drawn cursor can open a card, click its Close and follow a link inside it
- [x] Playwright smoke (seam 4): Join, pause and resume, open and close a card with the keyboard and with the drawn cursor (the real lock stays hands-on)

## Comments

2026-09-29, resolved in one commit on `main`. The Join and Paused cards are prerendered `<dialog>`s in `src/routes/+layout.svelte`, closed, so without the engine or JavaScript they never show; the `<noscript>` rule now opens only the prop cards. `src/lib/engine/engine.ts` drives them from one discriminated union (`join`, `locked`, `unlocked`, `paused { relock }`), every change going through `enter()`, which opens the card the input calls for and closes the other. The scene canvas holds the lock, so it survives venue hops. Locked, `pointermove` moves the drawn cursor by its movement, held inside the viewport, and a click on the canvas goes to the link or button under the drawn cursor, which also carries the `.hot` hover mark. Esc, blur and a hidden tab pause: the lock is released, the keys cleared, the cursor frozen, the camera (push and glide) stopped. Resume re-locks, and a `pointerlockerror` while paused shows "Try again in a moment". Esc on either card reopens it, since Chrome lets a page refuse a close request only after a user gesture. Keys are `steer()` in `src/lib/engine/camera.ts`, by `KeyboardEvent.code`: 600 world px/s, diagonals normalised, ignored while paused or with any card open, modifiers passed through. The cursor canvas is a manual popover in the top layer; a `MutationObserver` on `open` lifts it over each prop card as the card opens.

Tests: `steer()` in `tests/camera.test.ts` (seam 2); the cards prerendered closed, outside the layer, the Join card holding only its button, in `tests/build-output.test.ts` (seam 3); `npm run smoke` (Playwright, `tests/smoke.spec.ts`, seam 4) against `vite preview` of the build, after `npm run build`. Headless Chromium refuses a real lock (`WrongDocumentError`), so the smoke stands in for the Pointer Lock API and sends movement and clicks to the lock element as a real lock does. It covers: nothing moving and no cursor before Join; Join, a card opened and closed and its GitHub link followed by the locked cursor at SLU; Esc, blur and a hidden tab pausing; Resume in place and the refusal note; the unlocked fallback; the keyboard path; and the plain document without JavaScript. Breaking the click forwarding, or letting keys through with a card open, fails it. The smoke is not in `npm run ci`, because Workers Builds has no browser.

Checked in a headed Chromium with a real lock: a lock requested from inside a modal card is granted, and locked `pointermove` and `click` still reach the canvas while a modal card makes it inert. A full real-lock run on the site stayed out of reach here (the headed window didn't get OS focus), so these stay hands-on:

- Join with a mouse locks; the drawn cursor opens a card, gets the hover mark on Close, closes it and follows a link inside it; Esc pauses; Resume within a second shows the note, and a second later locks.
- The same in Firefox and Safari.
- A venue door clicked under the lock hops scenes with the lock held.
- Esc in an open card closes it with no Paused card; a click takes the lock back once Chrome's cooldown passes; Esc on the Join card before any click leaves it up.

Calls made here for Joe to confirm or veto:

- **The cursor canvas sits under the Join and Paused cards,** above every prop card and control. The spec has peers "dimmed behind" the Join card, and while paused the OS cursor works the card, so the frozen cursor is dimmed with the scene.
- **The OS cursor shows** on the Join and Paused cards; joined, it is hidden everywhere, cards included.
- **Hover mark**: a blue outline on the link or button under the cursor in cards and the bottom-left controls, for the unlocked mouse (`:hover`) as well as under the lock (`.hot`). Layer props get it too but show nothing, until ticket 15's reactions.

Left for later:

- In the unlocked fallback, keys move the drawn cursor away from the hidden OS pointer, and a click then lands at the OS pointer (spec: clicks resolve "by DOM pointer events for an unlocked mouse").
- `mark()` runs `elementFromPoint` on every locked frame. Measure it with the bench if it shows up.
- The Join and Paused cards are plainly styled until the art direction reaches them.

2026-09-29, Joe's answers:

- **A keyboard Join locks**, like a click; the cursor starts mid-button.
- **Esc with a card open closes the card instead of pausing.** The browser releases the lock on Esc and no page can stop it: Chrome doesn't even pass the key on, and only the Keyboard Lock API, in fullscreen and in Chromium alone, could keep it. So the engine reads a lock let go while a prop card is open, with the window focused and visible, as Esc in that card. It closes the card and enters a fifth input state, `released`: the drawn cursor holds still, the OS cursor shows and the keys still steer. The next mouse click takes the lock back and does nothing else, since it lands at the OS pointer rather than the drawn cursor. A keyboard click passes, and Chrome's cooldown just leaves the visitor released. Esc with no card open pauses as before, and blur or a hidden tab pauses from `released` too.
- **The Join and Paused cards refuse Esc** both at the keydown and at the `cancel` it becomes. Any close request that can't be refused, such as Android's back gesture before the visitor has interacted, reopens the card.

The smoke's stand-in lock now releases on Esc without passing the key to the page, and its lock element changes as `pointerlockchange` fires, as in a real browser. The keyboard test walks the new path: Join locks; Esc in a card closes it with no Paused card; the keys steer while the mouse doesn't; a click over a prop takes the lock back without opening it; Esc with no card pauses.
