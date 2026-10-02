# Performance report, 30 September to 1 October 2026

What was slow on barmadden.com, what was changed, and what each change measured. The work came in two rounds: the
first (commit `f4017f4`) dealt with caching and the weight of the pictures, the second with how many requests go at a
time, the processor while nothing moves, and the sound.

## Summary

| | Before | After |
| --- | --- | --- |
| Caching of the build's hashed files | asked for again on every visit (`max-age=0, must-revalidate`) | kept a year, `immutable` |
| Return to a scene already seen | 47 to 61 round trips | none |
| Overworld's first load, phone on slow 4G | 5.2 MB in 27.5 s | 1.6 MB in 9.8 s |
| Overworld's first load, desktop on 4G | 5.6 MB in 5.6 s | 2.3 MB in 2.7 s |
| Hop into Moosylvania, phone on slow 4G | 3.1 MB, iris open at 2.2 s | 1.0 MB, iris open at 1.2 s |
| Cut-outs in the build | 13.7 MiB of lossless originals | 2.4 MiB at 1.25x, 3.2 MiB at 2x |
| The build | 44 MB | 35 MB |
| Images round the view on a quick connection | four at a time | up to sixteen at a time |
| GPU process, standing still at Maplewood | 23% of a core | 9% |
| Sound held decoded at Join, overworld | 123 MB | 38 MB, and the theme's 2 MB file |
| Sound decoding at Join | 0.85 s of processor, the slowest file 0.33 s | 0.35 s, the slowest 0.07 s |
| The thirteen beds | 5.4 MB, stereo | 3.6 MB, mono |

Phone means a 390 x 844 viewport at 3x; desktop, 1440 x 900 at 2x. Slow 4G is 150 ms of latency and 1.6 Mbps down; 4G
is 60 ms and 9 Mbps. Processor figures are from an Apple M4 with its real GPU. See "How it was measured".

## What was wrong

Measured on production before any change:

- **Nothing was cached but the sounds.** Every file was sent `max-age=0, must-revalidate`, the content-hashed tiles,
  cut-outs, scripts and fonts included, so each return to a scene cost 47 to 61 round trips to be told nothing had
  changed.
- **The cut-outs were fetched as lossless originals**, up to eleven times the size they are drawn, and resized in the
  browser: about 4 MB of the overworld's 5 MB first load.
- **Everything was asked for at once.** The tiles in view queued behind megabytes of cut-outs out of it, and a hop's
  iris opened on a bare backdrop after its 800 ms wait.
- **The sound was decoded whole.** Six loops at Join, five minutes of sound, became 123 MB of samples, the theme alone
  50 MB.
- **A breathing moose repainted its corner of the scene sixty times a second** for a twentieth of a pixel of movement
  a frame.

The main thread was never the problem: standing still it is 96% idle, and panning holds 60 frames a second at about
10% of a core.

## Round one: caching and the pictures (`f4017f4`)

### Caching headers

`static/_headers` keeps everything under `/_app/immutable/` and `/audio/` for a year, `immutable`: every name there
carries its content's hash, so a name never changes its bytes. The icons and the web manifest, which keep their names,
are kept a day. The pages and the résumé are still asked for each time, so a deploy shows at once.
`tests/build-output.test.ts` checks what each file of the build is cached for.

### Cut-outs at the size they are drawn

The art pipeline writes each cut-out's delivery files beside its original, `1.25.webp` and `2.webp`, at the size the
site draws it at each tile density (`scripts/art/deliver.ts`). Over 256 x 256 px they are lossy like the tiles, quality
90 with exact alpha; smaller ones are lossless. `image.webp` stays the retained original and is no longer in the build.
94 cut-outs, 188 delivery files. Before and after stills of 42 views differ by at most 44 px of 5 million (worst PSNR
45.8 dB); the verdict and hashes are in `art/reviews/2026-09-30-cutout-delivery-sizes.md`.

### One loader, in the order the visitor needs

`src/lib/engine/loader.ts` fetches every image of the engine: the tiles in view at once, then the cut-outs standing in
it, then the ring of tiles round the view and the rest a few at a time. A tile the camera has left is called off. From
Join on, a door in view has what its hop lands on fetched ahead into the browser's cache, and a sub-scene its exit's;
none of that for a visitor who asked their browser to save data. The sound's loops are asked for at low priority, behind
the pictures.

| Slow 4G, phone | Before | After |
| --- | --- | --- |
| Overworld, first load | 5.2 MB, 27.5 s | 1.6 MB, 9.9 s |
| Hop into Moosylvania | 3.1 MB, 16.7 s, iris 2.2 s | 1.0 MB, 6.0 s, iris 1.3 s |
| Hop into the Foundry | 2.4 MB, 13.1 s, iris 2.0 s | 0.2 MB, 2.0 s, iris 1.2 s |
| Hop into Side Project | 4.3 MB, 22.3 s, iris 2.0 s | 2.6 MB, 13.6 s, iris 1.9 s |

## Round two: requests, the idle processor and the sound

### How many requests go at a time

The question was whether too many small files were queueing behind a browser's limit of a few connections to a host.
They are not: production answers over HTTP/3 on one connection, where that limit doesn't apply.

| 84 tiles from production, 2.1 MB, cache bypassed | Time |
| --- | --- |
| All asked for at once | 0.12 to 0.24 s |
| Six at a time, as HTTP/1.1 would | 0.64 s |
| One file of the same weight | 0.07 to 0.08 s |

The limit that did exist was the loader's own. It sent what is round the view four at a time, which on production's
quick connection spread the overworld's 32 cut-outs over eight round trips and 0.84 s. The window now follows the
connection: four to begin with, one more for each image back within 200 ms, up to sixteen, and halved by any that takes
over a second. What a door leads to goes half as many at a time.

| Images all in, emulated connection | Before | After |
| --- | --- | --- |
| Desktop, 80 ms and 100 Mbps: first load | 1.86 s | 1.43 s |
| Desktop, 80 ms and 100 Mbps: fetched ahead after Join | 1.70 s | 0.96 s |
| Desktop, 20 ms and 100 Mbps: first load | 0.60 s | 0.48 s |
| Phone, slow 4G: first load | 9.72 s | 9.63 s |

The slow connection is unchanged on purpose: there each image in flight takes bandwidth from what the view asks for
next.

### Standing still

The moose at Maplewood, the first thing every visitor sees, breathes: its back rises a world pixel and a quarter over
a second and a half. Its redraw was keyed by the time, so its part of the scene was repainted every frame, which costs
little on the page's own thread and a good deal in the GPU process. It is now keyed by its pose, to a tenth of a world
pixel (`motion.ts` `breath`): about 17 repaints a second, and every frame of a blink. The lap start line, which was drawn
on every repaint wherever the camera was, is drawn only where it shows.

| Standing still after Join, % of one core | Renderer | GPU process |
| --- | --- | --- |
| Maplewood, before | 12 | 23 |
| Maplewood, after | 9 | 9 |
| Carondelet Park (the rider) | 11 | 9 |
| Midtown (the marquee) | 12 | 13 |
| Belleville (the river) | 9 | 6 |
| Forest Park (the koi) | 13 | 13 |
| Moosylvania (nothing moving) | 6 | 2 |

Panning costs about 22% of a core in the renderer and 12% in the GPU process at 60 frames a second. The rider and the
koi travel, so they are still drawn every frame.

### The sound

**The beds are mono.** A decoded sound is held whole, four bytes a sample for each channel at the output's rate,
whatever its bitrate; so one channel halves what the beds hold, five of them at Join. They are encoded at 64 kbps,
which gives the one channel more bits than each of two had at 96, and levelled as two speakers play them, so they are
as loud as they were (−30.4 LUFS before and after). About 290 kB each where they were 430.

**The theme and the scenes' music are streamed.** Each piece plays from audio elements, which decode it as it plays,
through the same gains as before, so the levels, the ducking, the fades across a door and the mute are unchanged. The
file is still fetched by the page, once, at low priority, and handed to the element from memory: an element fetching
for itself asks the host for byte ranges, which this host doesn't answer. Four elements are made inside the Join press,
which is what lets iOS play them later without a touch.

A loop's seam needs care, since an element can only be started now, not at a time. The player measures how long this
browser's elements take to sound when the piece first begins (none in Chrome, a tenth of a second in iOS Safari),
starts each next pass that much early, and crosses the two over half a second at equal power. Changing an element's
playback rate to bring it into step was tried and dropped: iOS stutters at any rate but its own.

| Overworld, Join | Before | After |
| --- | --- | --- |
| Loops decoded | 6, 314 s of sound | 5 beds, 184 s |
| Held decoded | 123 MB | 38 MB, and a 2.1 MB file |
| Decoding, summed | 0.85 s | 0.35 s |
| Slowest single file | 0.33 s | 0.07 s |
| Sound fetched at Join, desktop on 4G | 4.3 MB | 3.6 MB |
| Join's downloads all in, phone on slow 4G | 33.9 s | 29.4 s |

Across a pan of the whole overworld the page had decoded 564 s of sound, 214 MB; it now decodes 342 s, 66 MB.

| The seam: how far the next pass is from the last | First | Second |
| --- | --- | --- |
| Chromium | 13 ms | 4 ms |
| iOS 18.5 Safari | 16 ms | 5 ms |
| iOS 26 Safari | 16 ms | 7 ms |
| iOS 27 Safari | 3 ms | 3 ms |

No silence through any of them.

## Round three: the signpost's glide (2026-10-02)

On a first visit to a desktop, Join and then the signpost's Belleville at once arrived on blank tiles: a glide takes
about a second, and a tile was only asked for once the camera was within one ring of it. Two changes:

- **The rest of the scene follows into the cache.** Once the view, its ring and the cut-outs are in, every other
  background tile of the scene is fetched into the browser's cache, nearest first, behind the Join card too: the
  overworld's 84 tiles are 3.8 MB at density 2 and 2.5 MB at 1.25. What a door in view leads to goes ahead of any of
  it still waiting. None of it for a visitor saving data.
- **Where a glide is headed is asked for at once.** The tiles in view at a glide's goal are fetched and decoded from
  the click, and kept while the glide lasts. With every tile held back 600 ms, Belleville's twelve were asked for 8 ms
  after the click and were all drawn when the glide ended.

## Looked at and left alone

- **Bigger tiles.** Simulated from the real tile files: 1024 px tiles would cut a phone's view from 8 requests to 3.6
  but raise its bytes from 274 kB to 445 kB and its decoded size from 13 MB to 21 MB. Requests aren't the constraint,
  so this only costs.
- **Sprite sheets for cut-outs.** A sheet arrives whole before anything draws, can't put the cut-outs in view first, and
  one changed cut-out throws the cached sheet away. The flags and the cursor's parts, small and always used together,
  are sheets already.
- **Audio sprites.** The one-shots are a dozen files, 160 kB between them, and arrive together. The weight is the
  loops, which a sprite would have fetched and decoded all at once.
- **Decoding images in a worker**, as Cursor Camp does. Chrome already decodes them off the main thread: the slowest
  took 14 ms.
- **Cursor Camp**, for comparison: 512 px tiles as here, one file for every object, flag and hat, one MP3 a sound, no
  sprite sheets, and its images cached for 8 hours with revalidation, where this site's are now kept for good.

## Still open

- **Streaming the music from the media host.** The R2 bucket answers byte ranges, so an element could begin the theme
  before the whole file is down, which on slow 4G is some seconds sooner. It would need a CORS rule on the bucket (an
  element feeding the audio graph is silent across origins without one) and the loops moved out of `npm run audio`.
  The memory is already saved without it.
- **Real devices.** The simulator shows that iOS Safari plays the music and what its seams measure, not how it sounds on
  a phone's speaker or what a phone's processor makes of the scene. The mono beds and the lossy cut-outs are still to
  be heard and looked at.
- **Desktop Safari and Firefox** were not run against the streamed music.
- **120 Hz screens** run every frame's work twice as often; no figure here is from one.

## How it was measured

- Network and timing: Playwright's Chromium over the Chrome DevTools Protocol, with its network throttled as above,
  against production for the "before" of round one and against local builds of the commit before and after each change.
- Processor: the same, with the real GPU (`--use-angle=metal`), reading each process's CPU time over a fixed window, and
  Chrome traces for where it went.
- Fidelity: stills of every scene before and after, compared pixel by pixel.
- The seam: the page's own audio elements and the music's gain, sampled every 25 ms through two seams brought forward.
- iOS: Safari in the simulators for iOS 18.5, 26 and 27, driven by a UI test with real touches: Join, two seams, the Sound
  toggle off and on, Home and back with Resume, and a hop into Brennan's and back. An element no touch had reached was
  refused in each, so the rule that makes the pool necessary is in force there.

The measuring scripts were throwaway and are not in the repository.

## Tests

`tests/loader.test.ts` covers the loader's order, calling off, fetching ahead and its window; `tests/props.test.ts` the
delivery sizes and the moose's redraw key; `tests/build-output.test.ts` the caching headers and the page policy;
`tests/loops.test.ts` which loops are streamed and when a streamed pass starts; `tests/sound.spec.ts` that nothing is
fetched before Join or while muted and that the theme gives way to a sub-scene's music and resumes where it left off.

`npm run ci` passes (245 pass, 1 todo), here and as Workers Builds runs it. Over nine whole runs of the Playwright
suite on this machine five were clean, three failed only the river's float to the bottom edge, which fails as often
without these changes, and one failed the door-hop test once, which did not recur in eight further whole runs or three
repeats of its spec.
