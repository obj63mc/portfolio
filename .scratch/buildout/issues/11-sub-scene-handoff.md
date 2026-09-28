# 11: Sub-scene handoff: door fade, exit door, browser back, focus

**What to build:** Clicking a venue door (a real link, intercepted client-side so middle-click and crawlers still work) plays a 300 ms fade, places the cursor just inside the sub-scene's door with the camera centred on it, and moves focus to the sub-scene's `<h1>`. The exit door or the browser back button returns the visitor to the overworld at that venue's door, camera centred, focus on the door link. The lock survives the hop because its element lives in the shared layout; pause and Join state carry across. The push band switches to 12 percent inside a sub-scene, except the Moosylvania lobby, which keeps the overworld's 25 percent.

**Blocked by:** 03 (all five sub-scenes), 09 (Join and lock in the layout)

**Status:** ready-for-agent

- [ ] Door click fades in 300 ms (a cut under reduced motion) and lands the cursor inside the door with the camera centred; the URL is the sub-scene's
- [ ] Exit door and browser back both return to the overworld at the venue door with focus on its link
- [ ] The pointer stays locked across the hop on desktop; on touch the joystick is still there
- [ ] Middle-click on a door opens the sub-scene in a new tab as a plain page
- [ ] Playwright smoke: venue hop and back, with focus landing where specified
