# 06: Sound

**What to build:** Three candidates a row within the licence ladder for `music-big-muddy` (delta blues), `bed-big-muddy` (underwater), `reel`, `snag` and `lure-up`; Joe picks.

**Blocked by:** 01

**Status:** resolved

- [x] Candidates listed with source, author and licence
- [x] Joe's picks approved in `audio/sounds.json`; `npm run audio`

## Comments

### Candidates, 2026-10-01

All Freesound, each page read as Creative Commons 0. None has been listened to or downloaded: the trims are to be measured once Joe picks. Best first in each row.

**`music-big-muddy`** (the weak row: Freesound has next to no CC0 delta slide)
1. "Blue Sloop.wav", BaDoink, 1:13, acoustic guitar A minor blues loop: https://freesound.org/people/BaDoink/sounds/566219/
2. "Morphagene Slide Guitar.wav", Extraborg, 2:44, solo acoustic slide, free time: https://freesound.org/people/Extraborg/sounds/541082/
3. "GotMoBluez 120 Am.wav", BaDoink, 2:08, a band with drums at 120 BPM: https://freesound.org/people/BaDoink/sounds/575020/
- Also: "Harmonica Jammin.wav", Vibratair: https://freesound.org/people/Vibratair/sounds/403113/ ; "Campfire Guitar", ImmergoMedia: https://freesound.org/people/ImmergoMedia/sounds/670001/
- If none will do, the ladder's next rungs are an ElevenLabs piece on a paid plan or a Pixabay track Joe downloads himself.

**`bed-big-muddy`**
1. "Underwater Ambience", Kinoton, 5:11, low rumble and bubbling from an Elbe recording: https://freesound.org/people/Kinoton/sounds/393819/
2. "Underwater Bubble Flow Loop", KolbyRFX, 1:39, made as a loop: https://freesound.org/people/KolbyRFX/sounds/852478/
3. "Underwater_rumble_CsG.wav", csaszi, 0:58, low rumble alone: https://freesound.org/people/csaszi/sounds/336470/

**`reel`**
1. "Fishing_Reel_1", Mythmazter, 0:07, a reel spun in bursts: https://freesound.org/people/Mythmazter/sounds/708225/
2. "Angel Fly Fish Reel Slow Wind_1.wav", paulprit, 0:07, a fly reel's ratchet: https://freesound.org/people/paulprit/sounds/507078/
3. "reel.wav", j1987, 0:18, a whirr: https://freesound.org/people/j1987/sounds/95564/

**`snag`**
1. "Veggie Snap, stale", HenKonen, 0.55 s, "a half-rotten tree branch snapping in a swamp": https://freesound.org/people/HenKonen/sounds/757246/
2. "WATRImpt_Impact12", InMotionAudio, 0.65 s, a hydrophone's underwater knock: https://freesound.org/people/InMotionAudio/sounds/718503/
3. "Wooden Thud (Mono)", Breviceps, 0.5 s: https://freesound.org/people/Breviceps/sounds/449955/

**`lure-up`**
1. "blues lick in A #2.wav", Sub-d, 2.1 s, a guitar lick: https://freesound.org/people/Sub-d/sounds/47040/
2. "Harmonica-C … steccato chord 9", Sadiquecat, 1.1 s, a blues harp stab: https://freesound.org/people/Sadiquecat/sounds/792628/
3. "LevelUp.wav", Kenneth_Cooney, 0.6 s, the classic 8-bit blip: https://freesound.org/people/Kenneth_Cooney/sounds/609335/

Until picks are in, the five rows are unsourced and the game plays `splash`, `tap` and `star` alone.

### The picker, 2026-10-01

Joe asked for a picker like the overworld's and Sushi Stand's: https://claude.ai/artifact/CaMGyPUXCMfg5thuUMnWGn (Big Muddy Sound Picks). Twenty-one Freesound candidates with previews, four to a row and five for the music, plus one Pixabay track with no preview ("The Delta Blues"; a second, "Acoustic Guitar Blues", is marked AI-generated and Content ID registered on its page, so it was left out). Picks are kept in the page's database, collection `picks`, a document a row: `{ choice, title, url, note }`.

The candidates' Freesound previews were downloaded with Joe's leave to this session's scratch folder, not the repo; a pick's file goes to `audio/sources/<id>-freesound-<n>.mp3` when its row is filled in. The windows in the picker: `reel` 0 to 1.6, 0.5 to 2.0, 5.75 to 7.5, 0 to 1.6; `lure-up` 0.25 to 2.1, whole, whole, 0.45 to 2.4; `snag` whole files; the bed's four at 26, 12, 16 and 70 s for 36 s; the music's as the whole file (72.9 s), 0 to 90, 0 to 64, 0 to 80 and 2 to 56. A loop's period is measured on its bars once picked.

### Joe's picks, round one, 2026-10-01

- `bed-big-muddy`: "Underwater Ambience", Kinoton, 26 to 62 s. `snag`: "Veggie Snap, stale", HenKonen, the whole file. `lure-up`: the C harmonica's staccato chord, Sadiquecat, the whole file. All three approved and encoded (`npm run audio`).
- Fish on: none of the reels. Joe: use the power-up from Sushi Stand, so a catch plays `star`, and `reel` is gone from the sounds. A catch that earns the next lure plays `lure-up` in its place; a new heaviest catch has no sound of its own.
- `music-big-muddy`: none of these. Joe's note, which the picker did not keep: find the Zelda fishing theme or something like it. The themes themselves are Nintendo's and no rung of the licence ladder covers them, a cover included, so round two looks for original music in their spirit: calm, playful, pastoral, a guitar and a flute or ocarina, made to loop. The delta blues brief is dropped. Still unsourced, so the game's music is silent until round two.

### Round two of the music, 2026-10-01

In the same picker, the music row alone: nine CC0 pieces with previews and four Pixabay tracks to open there. None is Nintendo's or names a commercial soundtrack as its source; those that did were left out ("The guitar Village", "Shop Theme", "Ocarina Of Time", "Oasitic Village" and others), as were tracks Pixabay marks AI-generated.

- OpenGameArt, CC0: "Cozy Puzzle In-Game 3" (MintoDog, 124 s, stated loopable), "RPG Town" and "RPG Overworld" from "2 Whimsical RPG Themes" (KarateStudios, 67 and 59 s), "Gone Fishin'" (Memoraphile, 108 s, written for a fishing game), "Town Theme RPG" (cynicmusic, 97 s), "A Small Fire Will Do" (Trex0n, 64 s), "Recorder Jam" (Of Far Different Nature, 32 s, under the 50 s floor).
- Freesound, CC0: "Calm_Game_Music_1.MP3" (Airwolf89, 346454, 171 s; made from Magix Music Maker's stock samples, whose terms are unchecked), "calm_happy_rpgTownBackground.mp3" (SciCodeDev, 442911, 82 s).
- Pixabay, no preview: "Lets Go Fishing" (Emmraan), "Farm and Tavern RPG Music" (BenVibrant), "Village Morning" (IgorLisul), "Watermill in the old town" (HarumachiMusic, Content ID registered).

The nine files were downloaded with Joe's leave to the session's scratch folder. An OpenGameArt pick is saved as `audio/sources/music-big-muddy-opengameart-<slug>.<ext>`. The picker now keeps a note a moment after the typing stops: round one's was lost because it was kept only when the box lost focus.

### The music picked, 2026-10-01

Joe picked "Watermill in the old town (Loopable)", HarumachiMusic, from Pixabay and downloaded it himself: `audio/sources/music-big-muddy-pixabay-325123.mp3`, 65.49 s. Its loop is 22 bars of 2.727 s, 60.000 s from the file's start: the opening comes round again at 60 s (measured to a tenth of a millisecond on the waveform) and the file runs on 5 s past it, so the 2 s the next pass crosses over is the same music. Trim `[0, 60]`. Pixabay marks the track Content ID registered: a video of the site put on YouTube could draw a claim, which Joe picked it knowing. Every row is now approved and encoded; nothing in the game is silent.
