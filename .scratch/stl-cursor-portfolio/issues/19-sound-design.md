# What does each district and prop sound like, and how is sound switched on?

Type: grilling
Status: open
Part of: ../map.md

## Question

Charting fixed sound as ambient per district plus prop sounds, off by default with a toggle. Decide the rest: the ambient bed for each district and sub-scene and how beds crossfade as the camera pans across district boundaries, which props from the content inventory get a sound on click, where the sounds come from (AI-generated, licensed libraries, recorded) and their licence terms, the file format and loading strategy (formats that play on Safari as well as Chrome, lazy loading per district, total budget), where the toggle sits and how it is labelled for screen readers, how the first tap unlocks audio on mobile, whether peers' actions (the shared Foundry screen playing) are audible, and how sound behaves when reduced motion is on. Output: the sound section of the spec with a per-district and per-prop list.

## Context

2026-09-24, from the persistence schema ticket (16): the toggle state persists as `sound: boolean` (default false). A stored `true` means the first click or tap starts audio.

2026-09-24, from the analytics ticket (17): a small analytics icon ("Analytics settings") sits next to the sound toggle for every visitor and reopens the consent bar. Wherever this ticket places the toggle, leave room for the icon beside it. The consent bar itself is pinned to the top of the screen.
