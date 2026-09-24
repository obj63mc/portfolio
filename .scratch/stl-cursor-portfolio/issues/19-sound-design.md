# What does each district and prop sound like, and how is sound switched on?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

Charting fixed sound as ambient per district plus prop sounds, off by default with a toggle. Decide the rest: the ambient bed for each district and sub-scene and how beds crossfade as the camera pans across district boundaries, which props from the content inventory get a sound on click, where the sounds come from (AI-generated, licensed libraries, recorded) and their licence terms, the file format and loading strategy (formats that play on Safari as well as Chrome, lazy loading per district, total budget), where the toggle sits and how it is labelled for screen readers, how the first tap unlocks audio on mobile, whether peers' actions (the shared Foundry screen playing) are audible, and how sound behaves when reduced motion is on. Output: the sound section of the spec with a per-district and per-prop list.

## Context

2026-09-24, from the persistence schema ticket (16): the toggle state persists as `sound: boolean` (default false). A stored `true` means the first click or tap starts audio.

2026-09-24, from the analytics ticket (17): a small analytics icon ("Analytics settings") sits next to the sound toggle for every visitor and reopens the consent bar. Wherever this ticket places the toggle, leave room for the icon beside it. The consent bar itself is pinned to the top of the screen.

## Answer

Resolved 2026-09-24 in a five-round grilling session. Facts on formats, iOS audio and licences came from two fact-finding subagents (sources summarised in the comments below).

### Getting in, and switching sound

- **Join is a modal card on every device.** The scene animates dimmed behind it; nothing moves, takes input (Tab, keys, drag, joystick) or is sent until Join. The cursor starts where Join was clicked or tapped. The card holds only the Join button.
- **European visitors' analytics consent bar** opens as a `popover` stacked above the Join card's backdrop, so it stays operable; answering it is not joining. The analytics ticket is otherwise unchanged.
- **Sound is on by default after Join.** The Join press creates and resumes the `AudioContext`. A stored `sound: false` keeps the visitor silent; a missing value means on. On iOS set `navigator.audioSession.type = 'ambient'` where supported, which respects the silent switch and mixes with the visitor's own audio.
- **Toggle**: bottom-left cluster, the sound toggle then the analytics icon, same place on every scene. A prerendered `<button aria-pressed>` named "Sound" with a speaker icon, struck through when off. No volume slider, no keyboard shortcut. Muting suspends the context and stops further fetches; unmuting resumes it inside that press.
- **Edge-push is suppressed while the cursor is within 40 px of a control**, the same rule props have.
- **Paused** (Esc, blur, or switching away from the tab, touch included): beds, theme and music duck to 30 percent. A hidden tab suspends the context entirely; the Resume press resumes it, which also recovers iOS's `interrupted` state.
- **Reduced motion does not affect sound.**

### Beds

Eleven looping beds, no bed for the scenery strips (they are where neighbours overlap):

| Place | Bed |
| --- | --- |
| Maplewood | Small-town street, birds |
| Central West End | Café patios, a streetcar bell |
| Midtown | City traffic, campus |
| Belleville | Quiet suburb, a distant train |
| Carondelet Park | Wind, birds, bike freewheel |
| River and Arch | Water, an occasional barge horn |
| CS lab | Fans, keyboards |
| Theatre | Murmuring crowd, projector |
| Moosylvania lobby | Office murmur |
| Side Project bar | Bar walla |
| Brennan's | Quiet bar, a clock |

- **Crossfade is driven by the camera centre**, not the cursor: a bed is at full gain inside its footprint rect and fades to zero over about 400 world px outside it, on equal-power curves. Beds at zero are stopped. Crowd noise never scales with the number of peers.
- **Scene change**: the overworld beds fade out over the 300 ms scene fade and the sub-scene bed fades in, no overlap; the reverse on leaving.

### Music

- **One overworld theme**, a 2 to 3 minute loop mixed about 6 dB under the beds, the same across the overworld.
- **Diegetic tracks**: jazz in Brennan's, a bed at Side Project, a low playlist in the Moosylvania lobby, and a trailer cue from the Foundry screen while it plays a title.
- The theme fades out in sub-scenes with their own music (Brennan's, Side Project, the lobby, the theatre while the screen plays) and continues 12 dB down in the others (the CS lab, the theatre while the screen is idle). It keeps its playhead across scene changes and never restarts.

### One-shots

- **Every card**: a soft paper or card-slide on open and on close.
- **Signature sound per prop**:

| Prop | Sound |
| --- | --- |
| The moose | Antler wobble or a low moose call |
| MonsterCommerce eye | Blink squelch |
| Server rack | Fan whir |
| Side Project taps | Pour |
| Chalkboard | Chalk tap |
| Humidor | Wooden lid creak |
| Brennan's ATM | Receipt printer |
| Joe's bike | Bell ding |
| Ride sign | Wood knock |
| Bike track | Finish-line beep on a new personal best |
| Foundry posters | Film projector start |
| Marquee | Bulb buzz |
| Diploma | Paper |
| Whiteboard | Marker squeak |
| Lab workstation | Keyboard clack |
| Welcome sign, signpost | Wood knock |
| Lobby desks | Desk tap |
| Venue doors, exit doors | Door open, door close |

- **Cosmetic earned**: one chime. **Gold cursor**: a short fanfare. A cosmetic applied from another tab plays nothing (persistence ticket).
- **Hover is silent.**

### Peers

- Only the **Foundry screen** is audible to everyone in the theatre: the projector start and the trailer cue play for the whole room when a title starts, not only for the visitor who clicked. Everything else a peer does is silent.

### Sources and licences

In order of preference, free as in free beer first:

1. **Freesound, CC0 only**, for beds and effects.
2. **ElevenLabs Sound Effects** on a paid plan (Starter, $6/month, for as long as authoring takes) for one-shots CC0 cannot cover. Paid output needs no attribution and has no redistribution clause; the free plan is non-commercial with a title credit, so is not used.
3. **Pixabay music**, only edited into loops, never served substantially as downloaded (its terms forbid standalone distribution).
4. **AudioJungle**, bought personally with a Music Standard or SFX Single Use licence, when nothing free fits. Both name websites as end products. Prefer looped, non-P.R.O. tracks. Keep costs modest.

Not used: the agency's Envato Elements seat (the licensee is the agency, and a personal portfolio is neither its project nor its client's), Envato Elements generally (music licensed only as a sync, and unfinished end products lose their licence on cancellation), Sonniss GDC and CC-BY-NC. CC-BY is allowed only if a Credits card is added to the signpost.

Every file gets a row in `docs/audio-sources.md`: file, source URL, licence, edits made. Licence certificates are kept in the repo outside `static/`. If any AudioJungle item is used, the site terms gain one line that the audio may not be extracted or reused.

### Format

- **MP3 only**, one file per sound, no fallback: the only single format that decodes everywhere back to iOS 16 (Opus needs iOS 17.4 plus a fallback).
- Beds: stereo, 96 kbps, 30 to 45 s loops; each pass starts 2 s before the last ends, overlapped on equal-power curves, which also hides encoder padding.
- Music: stereo, 128 kbps, 60 to 120 s loop edits.
- One-shots: mono, 96 kbps, under 2 s.
- Every file is trimmed, loudness-matched (beds about −30 LUFS, music about −26 LUFS, one-shots peaking at −6 dBFS) and re-encoded, never served as downloaded. Encoded with a LAME header so decoders trim padding.
- Files live in `static/audio/`, content-hashed, cached immutably.

### Loading

- Nothing is fetched before Join or while muted.
- On Join: the current scene's audible beds, that scene's one-shots, the theme or the scene's music, and the global one-shots (card open and close, cosmetic chime). Beds fade in as they arrive.
- While panning: a neighbouring bed once the camera is within about 800 world px of its fade zone.
- A sub-scene's bed and music on hover or focus of its venue door, else on entry.
- Decoded buffers of scenes left behind are dropped after 60 s.
- A failed or slow fetch is silence, never a blocked scene.
- No fixed byte budget; the rule is never to load everything at once.

### Engine

Plain Web Audio in one Svelte module beside the persistence rune module, reading and writing `sound` through it. The module holds the context, a gain per bed, sample-accurate `AudioBufferSourceNode` loops and a one-shot pool. No Howler.

### Recorded elsewhere

- Glossary: **Join** made device-neutral; **Paused** gains switching away from the tab; **Bed** and **Theme** added.
- Amendment notes on the charting, world layout, accessible layer, persistence schema, analytics and pointer lock tickets.
- No ADR: every choice here is easy to reverse.

## Comments

2026-09-24, wayfinder session (claimed, grilling in progress). Round 1 accepted as recommended except music:
- Beds: 11 (five districts, the river, five sub-scenes); scenery strips are where neighbours overlap.
- Crossfade driven by the camera centre: full inside a bed's footprint, fading to zero over about 400 world px, equal power; sub-scene beds swap during the 300 ms scene fade.
- Prop sounds: soft generic card open/close for every card, a signature sound per prop (moose, eye blink, taps pour, humidor, ATM receipt, bike bell, poster projector, marquee buzz, diploma, marker, keyboard, server fans, signpost knock, doors, personal-best beep), a cosmetic chime and a gold fanfare. Hover is silent.
- Peers: only the Foundry screen is audible to the whole theatre; everything else a peer does is silent.
- Toggle: bottom-left cluster (sound, then analytics icon), `<button aria-pressed>` named "Sound", prerendered; edge-push suppressed within 40 px of a control; no slider, no shortcut.
- Start: no context or fetch while off; the enabling gesture creates and resumes the context; `audioSession.type = 'ambient'` on iOS.
- Hidden tab suspends (resume on `visibilitychange`, iOS `interrupted`); Paused ducks beds to about 30 percent; reduced motion does not affect sound.
- Engine: plain Web Audio in one Svelte module reading `sound` from the persistence rune.
- Music: Joe wants music, royalty free or from an Envato licence. Open in round 2.
- Fact-finding (formats, gapless loops, iOS audio session, licences) done by subagent; Envato terms being checked.

2026-09-24, round 2 answers:
- Join gate on touch as well as desktop, for one universal experience (amends the pointer lock ticket's "touch has no gate"). Glossary **Join** made device-neutral. The Join tap is the audio gesture on every device.
- Music: diegetic tracks (Brennan's jazz, Side Project bed, lobby playlist, Foundry screen trailer cue) plus one overworld theme under the district beds.
- Sources: Joe prefers royalty-free assets where possible. Envato findings: the agency's Elements seat is not covered for a personal site; Elements' web terms are weak; AudioJungle Standard/SFX licences bought personally clearly cover a website and forbid end-user extraction.
- Format: MP3 everywhere as recommended in round 2 (stereo 96 kbps beds, 128 kbps music, mono 96 kbps one-shots; trimmed, loudness-matched, re-encoded, content-hashed in `static/audio/`).
- Loading: lazy as recommended; no hard byte budget, just never load everything at once.

2026-09-24, round 3 answers:
- Join card is a modal dialog over the whole page: nothing moves and nothing can be done until Join (details being confirmed in round 4, as it amends the pointer lock ticket's pre-join keyboard panning and Tab access).
- Paused on touch: switching away from the tab pauses; the Resume tap restarts audio (covers iOS `interrupted`). Accepted.
- Theme mix: one 2–3 minute loop about 6 dB under the beds; fades out in sub-scenes with their own music (Brennan's, Side Project, lobby, theatre while the screen plays), carries on 12 dB down in the others; ducks with pause; never restarts on scene change. Accepted.
- Sources: free as in free beer preferred (CC0 Freesound, ElevenLabs for gaps, Pixabay music only edited into loops), paying is fine for music or effects as long as the cost is modest; AudioJungle bought personally when nothing free fits. Ledger in `docs/audio-sources.md`.

Fact-finding sources (subagents, 2026-09-24): formats and gapless decoding from MDN, caniuse and WebKit bugs 226922, 227110, 228140 and the Safari 17.4 and 18.4 release notes; `navigator.audioSession` from the Safari 16.4 release notes and WebKit bug 237322; activation events from the HTML spec; licences from elevenlabs.io legal and pricing pages, freesound.org FAQ, sonniss.com GDC licence, pixabay.com terms, the Envato Elements licence and FAQ (revised 8 Dec 2025), and audiojungle.net Music Standard and SFX licences.

2026-09-24, rounds 4 and 5: Join modal is universal including keyboard and screen readers (inert until Join); no sound switch on the Join card, sound simply starts on Join; the analytics consent bar is a popover above the Join card (an opt-out analytics toggle on the card was ruled out because pre-ticked consent is invalid in the EU, CJEU C-673/17 Planet49). Joe confirmed the summary.
