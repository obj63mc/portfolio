# 22: One-shots: cards, prop signatures, chime, fanfare, beep, doors, projector cue

**What to build:** Every event in the sound design's one-shot table plays its sound through the one-shot pool: a soft card sound on open and close for every card; a signature sound per prop from the table; a chime on a cosmetic grant and a fanfare on gold; a finish-line beep on a new personal best; door open and close on venue and exit doors; the projector start and trailer cue audible to the whole theatre room while a title runs. Hover is silent, a cosmetic applied from another tab plays nothing, and nothing a peer does is audible except the screen. One-shots are mono MP3 under 2 s peaking at -6 dBFS, loaded with the scene per the loading rules, and each has a ledger row.

**Blocked by:** 17 (screen cue), 18 (best-lap beep), 21 (engine and pool)

**Status:** ready-for-human: built, and every one-shot is Joe's pick (2026-09-30); the hands-on listening on desktop, a phone and two browsers in one Foundry room remains

- [x] Every row of the one-shot table has a sourced, encoded file wired to its event, with a ledger row (the marquee is scenery now, so it has no click to sound; the ATM's waits until Joe places it)
- [ ] Card open and close, grant, gold, best lap and doors sound on desktop and on a phone; hover is silent
- [ ] The projector cue plays for every visitor in the theatre when the screen starts, and for a mid-sequence joiner from the right point
- [x] A cosmetic earned in another tab makes no sound here

## Comments

### Built with provisional picks, 2026-09-30

Ticket 21 isn't built, so this ticket built the part of it the one-shots can't run without; ticket 21's comment says what that is and what is left.

- **Rules** (`src/lib/sound.ts`, tested in `tests/sound.test.ts`): the twenty one-shot ids; `PROP_SOUNDS`, each prop's signature from the sound design table as a plain table keyed by prop id (one more row gives a prop a sound); `SILENT`, the props with none on purpose (the Side Project sign and the STG logo have no row, the meeting TV's sound is its video, the posters are heard through the screen, the screen is no button), and a test that every prop in scene data is in exactly one of the two. What a click, a grant and the screen sound like; the one-shots each scene loads; when a left scene's buffers go.
- **Events**: every card's open (the click that opens it) and close (its `close` event, whatever closed it); a prop's signature with its card; a signpost link's knock; the chime as a cosmetic goes on, earned or worn again, and **the fanfare in place of the chime** on the grant that turns the cursor gold (one sound, not two stacked); the beep on a new personal best (`laps.ts`); the door opening as a hop leaves (`engine.close`, the back button included) and closing as it lands (`engine.show`); the projector start when the Foundry screen goes to playing, for everyone in the room since it follows the room's screen state, from `now - startedAt` for a visitor who arrives while it still sounds (`projectorCue`). A poster's click makes no sound of its own, so its clicker hears the projector once, with the room. Hover is silent, a cosmetic from another tab plays nothing, and nothing a peer does sounds but the screen. Not wired: the ATM (no prop yet; Joe places it) and the marquee (scenery now, nothing clicks it).
- **Engine** (`src/lib/sound.svelte.ts`, plain Web Audio): the context made and resumed inside the Join press, `navigator.audioSession.type = 'ambient'` where there is one; a master gain (ticket 21's beds and music join it); a pool of at most eight voices, a new one stopping the oldest. On Join the scene's one-shots and the global ones load; a door hovered, focused or under the locked or steered cursor loads its scene's ahead of the hop, else they load on entry; a scene's buffers go a minute after it is left unless the scene the visitor is in needs them. Nothing is fetched before Join or while muted, and a failed fetch is silence.
- **Sound toggle** (`src/lib/SoundToggle.svelte`): the speaker icon, struck through when off, named "Sound" by a hidden label, `aria-pressed` from the saved state, which gains a `sound` setter. Muting stops every voice, aborts the fetches in flight and suspends the context; unmuting resumes it inside the press and loads the scene. Another tab's toggle is followed here, except that a hidden tab stays suspended. A hidden tab suspends the context and the Resume press resumes it, on touch as on desktop, iOS's `interrupted` included.
- **Files**: `npm run audio` (`scripts/audio.ts`, needs ffmpeg and lame) reads `audio/sounds.json`, trims, downmixes and levels each source in float (one-shots to a −6 dBFS peak), encodes it with lame (mono 96 kbps, a LAME header), content-hashes it into `static/audio/<id>.<hash>.mp3`, and writes `src/lib/sound-files.json` (id to URL, which the engine imports) and the ledger, `docs/audio-sources.md`, from the same rows. A row off the licence ladder is refused (CC-BY waits for a Credits card). Reruns give the same bytes. `/audio/*` is cached immutably (`static/_headers`). `tests/audio.test.ts` holds the manifest, the files served and the ledger to each other.
- **Provisional picks**: every one-shot's first candidate from the sourcing pass, all CC0 Freesound, encoded from Freesound's high-quality preview MP3 (the original downloads need an account), each ledger row marked as awaiting Joe's approval. The encoded one-shots come to 254 KB.

Checks: `tests/sound.test.ts`, `tests/audio.test.ts`, the build-output test (the toggle's markup, the cache rule) and `tests/sound.spec.ts` (Playwright over the build: nothing fetched before Join or while muted, the toggle kept across a reload and unmuting inside its press, a card's open, signature, chime and close, hover and another tab's cosmetic silent, a poster's reel playing the projector start). `npm run ci` passes.

Hands-on, for Joe: approve or swap each pick; hear the gold fanfare, the best-lap beep and the doors; the projector start in two browsers in one Foundry room against `wrangler dev`, one joining mid-start; all of it on a phone, and the toggle on iOS with the silent switch.

### Joe's picks, round one, 2026-09-30

Joe listened to three candidates per row in the sound picker (a claude.ai page whose picks Claude reads back) and chose:

- **Approved**: the card (MTJohnson's sliding envelope, 444431), chime (243701), fanfare (397355), bell (bsumusictech's bike bell, 81875), squelch (578806), knock (Weak_Hero's knock on wood, 584941, trimmed to the one knock), marker (321137), moose (C-V's jaw-harp boing, 518645), projector (videofueralle's 8 mm projector switches and motor, 613832), chalk (447925) and creak (422975).
- **One sound for several**: one card sound opens and closes every card, so `card-open` and `card-close` are now `card`. The diploma's paper is its card's own sound, so it has no signature of its own. One mouse click serves every computer, the lobby loft's four and the lab workstation, so `desk-tap` and `keys` are now `click`.
- **Props the table left out**: the Side Project sign on the cooler door closes a fridge door (`cooler`, qubodup, 442999), and Brennan's STG logo strikes a lighter (`lighter`, Capt.Jack, 742836).
- **Round two, still provisional**: best lap (something that says completion or success, unlike the chime and fanfare), the mouse click, door open and a door close to match it, the server rack (a retro computer starting up) and a short quick pour.

`npm run audio` re-encoded the set; the ledger marks each row approved or provisional.

### Review fix: videos follow the Sound toggle, 2026-09-30

Muting suspended the audio context, but the Foundry screen's video (its sound is the trailer cue) and the meeting TV's play outside it, so they stayed audible with Sound off. Both now register with the sound module: muted while the toggle is off or the tab is hidden, and unmuted only inside a press (the toggle or Resume), since a browser pauses a video unmuted without one. `tests/sound.spec.ts` checks the meeting TV.

### Joe's picks, round two, 2026-09-30

From four new candidates a row: best lap is Fupicat's "Congrats" jingle (607207), the mouse click Pixeliota's (678248), the doors one recording of Ryding's wooden door opening and shutting (125958, both rows cut from the one file), the server rack guitarguy1985's mid-90s PC starting up (52050, the switch and the spin-up) and the pour Ezcah's quick glass fill (206016). Every one-shot is now approved; `npm run audio` re-encoded them.
