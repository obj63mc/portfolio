# 21: Sound engine, beds, theme and the toggle

**What to build:** From the Join press the visitor hears the bed for where they are, the overworld theme under it, and the crossfade between beds as the camera moves. The Join press creates and resumes the `AudioContext` (`navigator.audioSession.type = 'ambient'` on iOS where supported); nothing is fetched before Join or while muted. The bottom-left Sound toggle mutes by suspending the context and stopping fetches, unmutes inside the same press, and its state persists through the rune module (default on). Eleven beds (five districts, the river and Arch, five sub-scenes) crossfade by camera centre: full gain inside a bed's footprint rect, zero over about 400 world px outside on equal-power curves, stopped at zero; crowd noise never scales with peers. On a scene change the overworld beds fade out over the 300 ms scene fade and the sub-scene bed fades in, and the reverse on leaving. One theme, a 2 to 3 minute loop about 6 dB under the beds, keeps its playhead across scene changes, fades out in sub-scenes with their own music (Brennan's jazz, Side Project, the lobby playlist, the theatre while the screen plays) and continues 12 dB down in the others. Paused ducks beds, theme and music to 30 percent; a hidden tab suspends the context; Resume resumes it (also recovering iOS's `interrupted` state; on touch the Resume tap resumes audio). Reduced motion does not affect sound. Loading follows the spec: the current scene's beds and its music or the theme on Join, a neighbouring bed within about 800 world px of its fade zone, a sub-scene's bed and music on hover or focus of its door, buffers of left scenes dropped after 60 s, a failed fetch is silence. Files are MP3 per the spec's encoding rules, loudness-matched, content-hashed under the static audio folder and cached immutably, produced by one encode script. The engine is plain Web Audio in one Svelte module beside the rune module: the context, a gain per bed, sample-accurate buffer-source loops, and a one-shot pool for ticket 22. No Howler. Sources follow the licence ladder (CC0 Freesound, then ElevenLabs, then Pixabay loops, then AudioJungle bought personally; never the agency's Envato seat, never CC-BY-NC; CC-BY only with a Credits card), and every file gets a row in the audio-sources ledger with certificates kept outside the static folder.

**Blocked by:** 11 (scene changes), 16 (the rune)

**Status:** resolved (2026-09-30); the hands-on listening is listed in the last comment

- [x] Join starts the bed and theme; the toggle mutes and unmutes and persists across reloads; nothing is fetched before Join or while muted
- [ ] Roaming from Maplewood to Belleville crosses every bed with no gap or pop; entering the river brings up its bed (the gains are continuous and tested; no gap or pop is for Joe's ears)
- [x] Hopping into Brennan's fades the theme out and the jazz in; leaving brings the theme back at the playhead it left
- [ ] Pause ducks to 30 percent, a hidden tab suspends, resume restores, on desktop and on a phone (built; hands-on on both)
- [x] All eleven beds, the theme and the four sub-scene music pieces are sourced, encoded by the script, and listed in the ledger with licences (the Foundry's music is its screen's video, ticket 17)
- [x] The crossfade gain per bed is a pure function of camera centre tested with plain inputs (seam 2)

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

Joe downloaded the Pixabay tracks, 2026-09-30: `audio/sources/theme-pixabay-203047.mp3`, `music-brennans-pixabay-592657.mp3` and `music-side-project-pixabay-502969.mp3` (stereo MP3, 256 kbps, as downloaded), and the six starred alternatives under `audio/sources/alternatives/` with Pixabay's own file names. The repository is private, so the originals sit beside the Freesound sources; only this ticket's edited loops are ever served, as Pixabay's licence requires. The beds' Freesound sources are still the picker's 30 s previews, so this ticket's encode fetches each pick's full high-quality preview first (or Joe downloads the originals with a Freesound login).

### Built, 2026-09-30

- **Rules** (`src/lib/loops.ts`, `tests/loops.test.ts`): eleven beds, `bed-<district or scene id>`, each heard at full over its footprint (a district's rect, the river's new `river.footprint` in the overworld's scene data, a sub-scene's whole scene) and fading to nothing 400 world px outside it on a cosine, the equal-power curve; the theme 10 dB down on the overworld (music files are 4 dB hotter than beds, so about 6 dB under them), 12 dB further down in the lab and the idle theatre, gone in the theatre while its screen plays and in the three sub-scenes with music of their own; that music level with its room's bed, ducking 12 dB while a prop's video plays (the meeting TV); everything but the one-shots at 30 percent while paused. Loading: the beds audible at the camera and those within 800 px of their fade zone, and the scene's music or the theme; a door hovered or focused loads a sub-scene's bed and music, or the theme for the overworld. Nothing knows of peers.
- **Engine** (`src/lib/sound.svelte.ts`): each bed and piece of music is a loop, a gain the engine's every frame sets from the camera's centre and the scene (eased, 80 ms time constant; 150 ms as the iris closes on a door, 200 ms as the next scene opens), over passes of its buffer that each overlap the next by 2 s on sine and cosine curves, scheduled 1.5 s ahead as sample-accurate `AudioBufferSourceNode`s. A loop faded to silence stops and keeps its place, so the theme comes back from Brennan's at the playhead it left; a bed at zero is stopped. The beds, theme and music go through one ambience gain, which a pause ducks to 30 percent; the one-shots don't. Muted or hidden, the context is suspended and the loops hold. Buffers the camera or the scene has left behind go a minute later.
- **Engine hooks** (`engine.ts`): `sound.leave(scene)` as the iris closes on a door (the beds fade, the theme heads for its level beyond it) and `sound.step(...)` every frame with the camera's centre, the pause, the Foundry screen playing and a prop's video playing.
- **Files** (`npm run audio`): the Freesound picks' full-length high-quality previews fetched into `audio/sources/` (the ledger says they are previews, not the originals), Joe's three Pixabay downloads, and every row in `audio/sounds.json` with its loop window. A loop row's trim is `[start, start + period]`; the encoder keeps the 2 s past the period that the next pass fades in over, measures loudness (EBU R128) and applies one gain for the whole cut (loudnorm's own pass rides the level, which would leave a loop's two ends apart), then limits the odd transient to a true peak under −1 dBFS. Beds come out at −30.4 LUFS, music at −26.4. `parse` refuses a bed period outside 30 to 45 s or music outside 60 to 120. `static/audio` is 10.1 MB in all; a first visit to the overworld fetches 3.3 MB after Join (the theme, the four beds near the welcome sign, the overworld's one-shots).
- **Loop points, measured**: beds by the 2 s seam (loudness and band spectrum at the loop's start against just past its period) and steadiness (no one-off event far over the median), over every 0.5 s start and 32 to 40 s period. Music tempo-free: for a spread of starts, every period in range scored on the onset envelope over 8 s and the band spectrum over 4 s, then refined on the waveform; arbitrary cuts of the same pieces score 0.0 to 0.06 on the spectrum, the chosen ones 0.46 to 0.97. The beat-grid estimate was misleading (the lobby's lo-fi read 129 BPM against its true 128), so every cut sits on whole bars of the true tempo: the theme 48 bars at 120 BPM from 80 s (96 s; onset 0.91, spectrum 0.72), Brennan's jazz from 16 s (73 s; 0.57, 0.68), Side Project's bossa nova 32 bars at 93 BPM from 20 s (82.6 s; 0.92, 0.70), the lobby's lo-fi 48 bars at 128 BPM from 19 s (90 s; 0.998, 0.97, a piece built of copied bars). Their waveforms don't repeat sample for sample (the lo-fi's comes closest, 0.73), so equal-power crossfades suit the music too.
- **The theme is 96 s, not the 2 to 3 minutes above**: the format rule's 60 to 120 s wins. A decoded loop costs about 37 MB per 96 s of stereo on a phone and the theme stays loaded all over the overworld; and it keeps the served cut under half of the 204 s track, well clear of "substantially as downloaded". Brennan's jazz is the exception to that last point: its best loop is 73 s of a 124 s track (59 percent), still an edited, levelled excerpt inside the site; a 62 s cut from 44 s (50 percent) matched worse (spectrum 0.45 against 0.68).
- **Tests**: `tests/loops.test.ts` (the crossfade, the footprints, the levels, the duck, loading, the passes and their equal-power envelopes), `tests/audio.test.ts` (a row of the right kind for every bed and piece of music, cut to its loop, and the period ranges), and `tests/sound.spec.ts` in the browser (the lab's bed and the theme fetched with its one-shots on Join and not before; the theme giving way to Brennan's jazz and resuming at the playhead it left, fetched once).

**For Joe to decide**: the layered extras the sourcing notes suggested are not mixed in, since he approved the beds as they are: a streetcar bell for the Central West End (freesound.org/s/675315), a bike freewheel for Carondelet Park (156996), a barge horn for the river (208714), a projector for the theatre (412145) and a clock for Brennan's (211192), each once a loop. Carondelet's chosen take is lively: its steadiest window still holds one event 10 dB over its median, which will recur every 34.5 s.

**Hands-on, on desktop and a phone**: roam from Maplewood to Belleville with no gap or pop, and walk into the river to hear its bed come up; hop into Brennan's and back out, the theme returning where it left off; the theatre's theme giving way while a reel plays; the lobby's playlist ducking under the meeting TV; pause (30 percent), a hidden tab (silence) and Resume; the loops' seams, which every pass crosses at its period (the theme's every 96 s); iOS with the silent switch.

### Review fixes, 2026-09-30

The code review's Spec pass found four things, now fixed with tests in `tests/loops.test.ts`:

- **Neighbouring beds at equal power.** The strips between districts are narrower than a bed's 400 px fade, so neighbours' fades reach into each other's footprints and the sum rose up to 3 dB where they met (Midtown and Carondelet Park touch). Where the beds' power together passes one, `gains` scales them back to it; inside any footprint it is exactly one.
- **A loop coming back fades in.** A loop resumed where it stopped (the theme after more than a minute in a scene with music, then the back button; a bed whose buffer was dropped) came in mid-phrase at full level. A resumed pass now fades in from silence over half a second.
- **Music crosses at equal gain.** The music's loop points are cut where it nearly repeats, so its passes are close to copies across the seam and an equal-power cross swelled them; beds keep equal power.
- **The lobby's playlist is low**, 6 dB under a bar's music ("a low playlist in the Moosylvania lobby"), and still ducks 12 dB under the meeting TV.

From the Standards pass: the handoff between scenes is one union (settled, leaving, opening) in place of a nullable and a sentinel time; the leaving rule is `leavingGains` in `loops.ts`, tested; the playing video is read from the videos the sound module already follows, not a DOM query each frame; smaller renames and a type guard for a manifest's trim.

The theme's length, settled by Joe the same day ("it can be longer, just whatever sounds best for the loop"): every bar-aligned loop of 48 to 96 bars in the track was scored on how alike the 2 s after its start and after its end are (log spectra and onset rhythm, each length fine-tuned ±0.6 s), and 64 bars from 24 s, 128 s, scored best (0.94, where the 96 s cut from 80 s scored 0.87; 80 bars, 160 s, came next at 0.92 with a quarter more to hold in memory). The music kind's loops now run to 3 minutes for the theme, and the file is 2.1 MB; the loop is 63 percent of the Pixabay track, an edited loop still, longer at Joe's word.
