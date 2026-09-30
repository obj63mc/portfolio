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

### Built early for ticket 22, 2026-09-30

Ticket 22's one-shots needed the engine, so part of this ticket is built (ticket 22's comment has the detail):

- `src/lib/sound.svelte.ts`: the `AudioContext` made and resumed inside the Join press, `navigator.audioSession.type = 'ambient'`; the Sound toggle (`src/lib/SoundToggle.svelte`, speaker struck through when off, `aria-pressed`, persisted through the saved state's new `sound` setter, default on), muting by suspending the context and aborting fetches, unmuting inside the press; a hidden tab suspends and the Resume press resumes (touch included, iOS `interrupted` included); nothing fetched before Join or while muted; per-scene loading with door preloading and the 60 s drop, for one-shots; a failed fetch is silence. Everything goes through one master gain, which the beds and music join.
- `npm run audio` (`scripts/audio.ts`) already has the `bed` (stereo 96 kbps, −30 LUFS) and `music` (stereo 128 kbps, −26 LUFS) kinds: a bed or a theme is one more row in `audio/sounds.json`, and the ledger follows. The loudness pass is one-pass `loudnorm`, untried on a real bed yet.

Left for this ticket: the eleven beds, their crossfade gains as a pure function of camera centre, the 2 s overlapped loops, neighbouring-bed loading within 800 px and the sub-scene bed and music on door hover; the theme with its kept playhead, fading out in sub-scenes with music and 12 dB down in the others; the four music pieces and the lobby TV's duck; the scene-change fades; pause ducking to 30 percent; sourcing, encoding and ledger rows for all of them.


### Joe's picks for the beds and music, 2026-09-30

Joe chose these in the sound picker while reviewing ticket 22's one-shots; they wait for this ticket's encode (loop cut, loudness to the spec, the layered extra sound where a note calls for one). Loop windows are the sourcing pass's measured suggestions, in the original file's time.

- `bed-maplewood` (Maplewood): conleec, "AMB_Ext_Residential_Day_Stereo_001.wav", https://freesound.org/people/conleec/sounds/149936/, CC0, loop 21 to 61 s.
- `bed-cwe` (Central West End): dobro2000, "Stadt-Landshut-Cafe-outside-Summer-2017.wav", https://freesound.org/people/dobro2000/sounds/399346/, CC0, loop 93 to 133 s.
- `bed-belleville` (Belleville): johnaudiotech, "Distant train with birds", https://freesound.org/people/johnaudiotech/sounds/347045/, CC0, loop 31 to 71 s.
- `bed-river` (River and Arch): kvgarlic, "RiverBargeJune22012.wav", https://freesound.org/people/kvgarlic/sounds/157369/, CC0, loop 5 to 45 s.
- `bed-slu` (SLU CS lab): SduggySounds, "Typing Office chatter in background", https://freesound.org/people/SduggySounds/sounds/725718/, CC0, loop 10 to 50 s.
- `bed-foundry` (Foundry theatre): kyles, "crowd int light theater audience settling down and waiting light chatter walla and eating.flac", https://freesound.org/people/kyles/sounds/453915/, CC0, loop 56 to 96 s.
- `bed-moosylvania` (Moosylvania lobby): leonelmail, "Office ambience - call center 3", https://freesound.org/people/leonelmail/sounds/579568/, CC0, loop 6 to 46 s.
- `bed-side-project` (Side Project bar): squareal, "General Chatter In Bar", https://freesound.org/people/squareal/sounds/237398/, CC0, loop 13 to 53 s.
- `bed-brennans` (Brennan's): Anya_Media, "QUIET CAFE, CHATTER, MILK FROTHING MACHINE, atmos atmosphere wildtrack ambience.mp3", https://freesound.org/people/Anya_Media/sounds/437461/, CC0, loop 62 to 102 s.
- `music-moosylvania` (Moosylvania lobby playlist): Seth_Makes_Sounds, "Lofi Beat Loop Schmoop", https://freesound.org/people/Seth_Makes_Sounds/sounds/722425/, CC0, loop 0 to 135 s.

Still open, with a third round of candidates being sourced: Carondelet Park ("something with like a lakefront sound"), Midtown (like kvgarlic's campus, 391480, "but less people talking"), the theme ("a bit more up beat... fun and campy like Cursor Camp"), Brennan's jazz (like Pixabay's traditional "Jazz Bar", 592657) and Side Project's music ("more poppy", like Pixabay's "In The Bar", 134219, "but subtler").

Joe settled three more, 2026-09-30:

- `bed-carondelet` (Carondelet Park): Marissrar, "Park ambience.wav", https://freesound.org/people/Marissrar/sounds/366913/, CC0; quiet as recorded (about -45 LUFS), with the bike freewheel (freesound.org/s/156996, CC0) to layer once a loop.
- `bed-midtown` (Midtown): kvgarlic, "CollegeAtmosphereOnABreezyDayApril2017.wav", https://freesound.org/people/kvgarlic/sounds/391480/, CC0.
- `music-brennans` (Brennan's jazz): AurecTheme, "Jazz Bar", https://pixabay.com/music/traditional-jazz-jazz-bar-592657/, Pixabay Content License: served only as an edited loop, never whole. Joe downloads Pixabay picks himself (the site refuses scripts) and saves each as `audio/sources/<id>-pixabay-<track id>.mp3`; the picker's Pixabay downloads list names them.

The theme and Side Project's music have a third round of candidates in the picker, mostly Pixabay: ragtime and Dixieland for a jazzy, campy, St. Louis theme (Joplin wrote The Entertainer in St. Louis), and understated pop for the taproom.

The theme, 2026-09-30: Joe chose Billy_Ziogas's "Everybody needs a little dixieland (Master Track)", https://pixabay.com/music/blues-everybody-needs-a-little-dixieland-master-track-203047/, Pixabay Content License (an edited loop only; the page marks it Content ID registered, which matters only for YouTube). It becomes `audio/sources/theme-pixabay-203047.mp3` once Joe downloads it. Side Project's music is on a fourth round: round three's pop was "too techno style beats", so the next is organic and played on real instruments.

Side Project's music, 2026-09-30: Joe chose MagalyStudio's "Relaxing and Coffee", a laid-back bossa nova, https://pixabay.com/music/bossa-nova-relaxing-and-coffee-502969/, Pixabay Content License (an edited loop only; not marked AI or Content ID). It becomes `audio/sources/music-side-project-pixabay-502969.mp3`. Every bed and music row now has Joe's pick. He asked for a reference pool of 15 to 20 tracks like it, to consider for other places' music.

### Pixabay downloads for Joe, 2026-09-30

Pixabay refuses scripted downloads, so Joe downloads these himself. Save each MP3 in `audio/sources/` under the name given:

- Theme: Billy_Ziogas, "Everybody needs a little dixieland (Master Track)", https://pixabay.com/music/blues-everybody-needs-a-little-dixieland-master-track-203047/ → `theme-pixabay-203047.mp3`
- Brennan's jazz: AurecTheme, "Jazz Bar", https://pixabay.com/music/traditional-jazz-jazz-bar-592657/ → `music-brennans-pixabay-592657.mp3`
- Side Project's music: MagalyStudio, "Relaxing and Coffee", https://pixabay.com/music/bossa-nova-relaxing-and-coffee-502969/ → `music-side-project-pixabay-502969.mp3`

Starred for later, alternatives for other places' music (no place assigned yet; download only when one is):

- funoro, "You're Gonna Like It Here", https://pixabay.com/music/bossa-nova-youx27re-gonna-like-it-here-469728/
- andriih, "Bossa Nova Lounge Music", https://pixabay.com/music/bossa-nova-bossa-nova-lounge-music-599225/
- andriih, "Bossa Nova - Bossa Nova Cafe", https://pixabay.com/music/bossa-nova-bossa-nova-bossa-nova-cafe-575813/
- andriih, "Bossa Nova Morning Music", https://pixabay.com/music/bossa-nova-bossa-nova-morning-music-599227/
- Denis-Pavlov-Music, "Samba Bossa Nova Brazilian Jazz Podcast Music", https://pixabay.com/music/bossa-nova-samba-bossa-nova-brazilian-jazz-podcast-music-520231/
- alex-morgan, "Samba Jazz Cocktail Bar", https://pixabay.com/music/modern-jazz-samba-jazz-cocktail-bar-567546/ (marked AI-generated on Pixabay)
