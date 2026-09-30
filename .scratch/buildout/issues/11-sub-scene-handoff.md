# 11: Sub-scene handoff: door fade, exit door, browser back, focus

**What to build:** Clicking a venue door (a real link, intercepted client-side so middle-click and crawlers still work) plays a 300 ms fade, places the cursor just inside the sub-scene's door with the camera centred on it, and moves focus to the sub-scene's `<h1>`. The exit door or the browser back button returns the visitor to the overworld at that venue's door, camera centred, focus on the door link. The lock survives the hop because its element lives in the shared layout; pause and Join state carry across. The push band switches to 12 percent inside a sub-scene, except the Moosylvania lobby, which keeps the overworld's 25 percent.

**Blocked by:** 03 (all five sub-scenes), 09 (Join and lock in the layout)

**Status:** resolved

- [x] Door click fades in 300 ms (a cut under reduced motion) and lands the cursor inside the door with the camera centred; the URL is the sub-scene's
- [x] Exit door and browser back both return to the overworld at the venue door with focus on its link (amended 2026-09-30: no focus, below)
- [x] The pointer stays locked across the hop on desktop; on touch the joystick is still there
- [x] Middle-click on a door opens the sub-scene in a new tab as a plain page
- [x] Playwright smoke: venue hop and back, with focus landing where specified

## Comments

2026-09-29, resolved in one commit. The hop is `Engine.show()` in `src/lib/engine/engine.ts`, which the layout's `afterNavigate` already called on every navigation. The doors stay SvelteKit's own client-side links: no `onNavigate`, no View Transitions, no link interception of our own. When the scene changes from another scene, `show()` lands at a door whatever the fragment:

- Into a sub-scene: just inside its exit door, focus on its `<h1>`.
- Back on the overworld, by the exit door or the back button: the door link of the venue left (`#<venue> .door`, the venue id being the sub-scene's), focus on it. This covers `/`, `/#<venue>` and any other fragment the history holds.

The camera is centred on where the visitor lands (clamped). In a sub-scene that is just inside the exit door: the floor a cursor's height (40 world px) below the door's middle, since every exit door stands on a wall with the floor in front of it below, and a cursor there is off the exit link, so a click doesn't leave again (code review: the spec's "just inside", which an earlier reading had put on the exit link itself). On the overworld it is the venue's door, the whole building. A joined cursor is put there, and push waits for the cursor to move, so a door near the scene's edge doesn't carry the camera off it. The scene canvas fades in from the backdrop colour over 300 ms with the Web Animations API, and cuts under reduced motion. `html.engine` now has the backdrop as its background, which the fade starts from. The unlocked mouse's cursor isn't moved, because it stays at the OS pointer, where its clicks land.

Focus: for a URL with a fragment, SvelteKit's own focus reset runs `location.replace('#<venue>')` in a timeout after `afterNavigate`. Chrome's fragment navigation then clears focus, since the venue's `<section>` isn't focusable. The engine therefore focuses in a timeout of its own, queued after the router's. The smoke failed on the exit door's return before this.

Middle click: the door is a plain `<a href>`, so the OS pointer's middle click opens a new tab natively (the unlocked mouse, or no JavaScript). Under the lock the canvas gets the `auxclick`, and the engine opens the link under the drawn cursor with `window.open`. A page can only open the tab in front, so the tab left behind blurs and pauses. Either way the new tab is a page load of its own, with its Join card.

Push band: already done in 08. The overworld and the lobby state 0.25, the other sub-scenes fall to the engine's `?? 0.12`, and `tests/sub-scene-geometry.test.ts` asserts it.

Before Join and while paused:

- **Before Join** the page is inert, so no door can be clicked, but the back and forward buttons still hop. The camera lands on the door and the scene fades in behind the Join card. There is no cursor to place.
- **Paused**, the Paused card stays up across a back or forward hop. The frozen cursor moves to the door, and Resume re-locks it there.
- **Focus behind either card**: the router's focus reset moved focus to the page's body behind the modal card, taking it off Join or Resume. This was already so before this ticket. A hop behind the Join or Paused card now hands focus back to the card's button.
- **A card open** during a back or forward hop leaves with its page.

Tests (seam 4, `tests/smoke.spec.ts`), with the stand-in lock:

- **Desktop**: Join at `/`, then the locked cursor clicks the Moosylvania door. The lobby fades in (a 300 ms animation running on the frame it lands) with the cursor just inside the front doors, centred in the viewport and off the exit link (no hover mark), focus on the `<h1>` and the lock held. The back button returns to `/` at the door, with focus on the door. Enter on that focused door hops the same way. The exit door, a nudge up from where the cursor landed, returns to `/#moosylvania` at the door. Enter and back again returns to that fragment URL, the router's fragment reset included. A middle click under the lock opens `/moosylvania` in a new tab with its Join card.
- **Behind the cards**: the lobby reloaded, back before Join lands at the door with no cursor drawn and focus still on Join. Paused in the lobby, back lands at the door with focus on Resume, and Resume re-locks with the cursor on the door.
- **The unlocked mouse**: a native middle click on a door opens a new tab.
- **Phone, reduced motion**: a tapped door cuts (no animation) to the lobby with focus on the `<h1>`, the cursor just inside the exit and the joystick still there. Back returns to the door with focus on it and the joystick there.

Taking the cursor placement out fails the desktop and phone hop tests. Before this ticket's code, the Join button lost focus on the back hop.

Calls made here for Joe to confirm or veto:

- **The fade is a fade-in** of the new scene from the backdrop, starting as it lands. The old scene doesn't fade out first, which would hold every navigation 150 ms. View Transitions weren't used: their snapshot would carry the top-layer cursor canvas and the cards through the crossfade, and the fade-in is one line.
- **A hop wins over the fragment**: back to `/#midtown` from the Foundry lands at the Foundry's door, not Midtown's sign.
- **Middle click under the lock opens the tab in front** and pauses this one. Cmd or Ctrl-click under the lock still hops in the same tab, and a Mac trackpad has no middle button. Forwarding that as a new tab is a line more if wanted.

Hands-on for Joe (a headless tab can't take a real lock):

- A door clicked under a real lock, in Chrome, Firefox and Safari: the lock holds across the hop, the cursor lands just inside the exit, the exit door returns, and Esc still pauses in the sub-scene.
- The back button with the lock held (Alt+Left or Cmd+[). Then a middle click under a real lock opens the tab and pauses this one.
- The fade on a phone with the tiles coming over the network. The new scene's tiles still load during the fade, so a first visit may show the backdrop for part of it.

Left for later:

- The overworld's door links still cover the whole building (ticket 05's accepted state), so the camera centres on the building.
- "Just inside", checked by eye in all five rooms on a phone: Brennan's, SLU and the lobby land on the floor in front of the door. The Foundry lands on the front row's armrest, the carpet between its door and the seats being narrow. Side Project lands on the lower panel of the painted door, off the link: its exit rect stops at y 970, where the front bar's top begins, while the painted door runs down to about y 1245 beside the bar, so the door's lower part isn't clickable either. Extending that exit rect (a clip-path round the bar's end) is an art-integration call for Joe.
- After a pause that spans a hop, Resume returns focus to the body, since the element focused before the Paused card left with its page.
- Ticket 21's beds crossfade over the same 300 ms.

2026-09-30, amended (Joe): coming back out of a building, the door showed focused with the blue ring. Leaving is the end of that visit: back on the overworld the visitor roams free, so nothing takes focus, whether they left by the exit door (clicked, tapped or Enter) or the back button, and Tab reaches the door again. `show()` still focuses the sub-scene's `<h1>` on entry (visually hidden, so no ring) and still hands focus back to the Join or Paused card's button on a hop behind the card. The smoke's desktop and phone hops now assert the body holds focus with nothing `:focus-visible` once the router's reset has run, and focus the door or exit before each Enter; the desktop hop adds leaving by Enter on the exit door. Both fail on the old code.

2026-09-30, amended (Joe): the hop is an iris wipe in place of the fade. Black closes in from the screen's edges to a point on the door, then the new scene opens out of the black from where the visitor lands, "a bit more seamless". `src/lib/engine/iris.ts` holds its timing as pure functions (closing 450 ms, opening 600 ms, eased in and out), and `cursors.ts` draws it last on the overlay canvas, over the cursors and the controls. It closes on the drawn cursor, which clicked the door, or on the link when Enter follows it. It doesn't close on any other focused element: a sub-scene's h1, focused on arrival, shows as keyboard focus, and the first build closed on it when leaving a building. Landed, it waits up to 800 ms for the tiles in view, so a first visit opens on the room rather than the backdrop. Leaving just after landing, while it still opens, it closes on the new point from the size it had reached. Under reduced motion, or in a hidden tab, it is a cut as before.

The router has to wait for the iris. SvelteKit's `onNavigate` can hold a navigation, but by then the router has taken the new URL, and it lands that page even if a back press starts another navigation meanwhile: `/` showed the lobby. So `+layout.svelte`'s `beforeNavigate` cancels a hop to another scene, lets `Engine.close()` shut the iris and then sends it again, a link by `goto` and back or forward by the same step through history, which the router undid. While the iris closes nothing else navigates, and a back or forward press is undone. Leaving the site is never held, since holding it asks the visitor to confirm. The engine mirrors the iris on `html[data-iris]` (open, closing, shut, opening) for the smoke. It checks the iris closing and opening on the desktop hops, a cut under reduced motion on the phone, the iris closing on the clicked exit door rather than the h1, and a back press while it closes being undone. peers.spec's hop waits for it to open, since its black is opaque on the cursor canvas.
