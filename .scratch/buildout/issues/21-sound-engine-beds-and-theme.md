# 21: Sound engine, beds, theme and the toggle

**What to build:** From the Join press the visitor hears the bed for where they are, the overworld theme under it, and the crossfade between beds as the camera moves. The Join press creates and resumes the `AudioContext` (`navigator.audioSession.type = 'ambient'` on iOS where supported); nothing is fetched before Join or while muted. The bottom-left Sound toggle mutes by suspending the context and stopping fetches, unmutes inside the same press, and its state persists through the rune module (default on). Eleven beds (five districts, the river and Arch, five sub-scenes) crossfade by camera centre: full gain inside a bed's footprint rect, zero over about 400 world px outside on equal-power curves, stopped at zero; crowd noise never scales with peers. On a scene change the overworld beds fade out over the 300 ms scene fade and the sub-scene bed fades in, and the reverse on leaving. One theme, a 2 to 3 minute loop about 6 dB under the beds, keeps its playhead across scene changes, fades out in sub-scenes with their own music (Brennan's jazz, Side Project, the lobby playlist, the theatre while the screen plays) and continues 12 dB down in the others. Paused ducks beds, theme and music to 30 percent; a hidden tab suspends the context; Resume resumes it (also recovering iOS's `interrupted` state; on touch the Resume tap resumes audio). Reduced motion does not affect sound. Loading follows the spec: the current scene's beds and its music or the theme on Join, a neighbouring bed within about 800 world px of its fade zone, a sub-scene's bed and music on hover or focus of its door, buffers of left scenes dropped after 60 s, a failed fetch is silence. Files are MP3 per the spec's encoding rules, loudness-matched, content-hashed under the static audio folder and cached immutably, produced by one encode script. The engine is plain Web Audio in one Svelte module beside the rune module: the context, a gain per bed, sample-accurate buffer-source loops, and a one-shot pool for ticket 22. No Howler. Sources follow the licence ladder (CC0 Freesound, then ElevenLabs, then Pixabay loops, then AudioJungle bought personally; never the agency's Envato seat, never CC-BY-NC; CC-BY only with a Credits card), and every file gets a row in the audio-sources ledger with certificates kept outside the static folder.

**Blocked by:** 11 (scene changes), 16 (the rune)

**Status:** ready-for-agent

- [ ] Join starts the bed and theme; the toggle mutes and unmutes and persists across reloads; nothing is fetched before Join or while muted
- [ ] Roaming from Maplewood to Belleville crosses every bed with no gap or pop; entering the river brings up its bed
- [ ] Hopping into Brennan's fades the theme out and the jazz in; leaving brings the theme back at the playhead it left
- [ ] Pause ducks to 30 percent, a hidden tab suspends, resume restores, on desktop and on a phone
- [ ] All eleven beds, the theme and the four sub-scene music pieces are sourced, encoded by the script, and listed in the ledger with licences
- [ ] The crossfade gain per bed is a pure function of camera centre tested with plain inputs (seam 2)

## Comments

### The lobby playlist ducks under the meeting TV, 2026-09-28

While the Moosylvania meeting TV plays its video (ticket 15's comment, spec: "Local prop, the Moosylvania meeting TV"), the lobby playlist ducks and the video's own sound plays. The row is in the sound design table (`../stl-cursor-portfolio/issues/19-sound-design.md`). Moved here from ticket 05.

