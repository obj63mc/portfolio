# Can AI-generated art hold the Moosylvania style consistently across scenes?

Type: prototype
Status: resolved
Part of: ../map.md
Blocked by: 06, 13

## Question

Generate one district (Maplewood is the richest) and one sub-scene interior using ChatGPT and Nano Banana with the old Moosylvania site as a style reference. Produce a large WebP background, three cut-out transparent props, and one animated prop. Judge: style consistency between the two scenes, whether props cut cleanly, resolution needed at the chosen world size, and how much manual cleanup each asset took. Output: the assets, a repeatable prompt recipe, and a go or no-go on the pipeline. The world size comes from the layout ticket; the animation tool comes from the Rive ticket.

## Answer

Resolved 2026-09-23 with the art pipeline prototype on branch `prototype/art-pipeline` (`prototypes/art-pipeline/`).

**Verdict: GO.** ChatGPT only: Nano Banana was not run because the ChatGPT style and generation were judged good enough. Working rules for production: attach the arrival mock to every Maplewood prompt so the real church office is drawn; give any prop that fills an opening a crop of that opening; ship backgrounds with the 2x upscale or accept slight softness on DPR 2 phones; upscale the lobby about 1.7x. Every scene will be regenerated anyway so neighbouring scenes join up, and that pass (run as a Claude judge-and-regenerate loop) is where placement such as the signpost's phone framing gets settled.

### Criteria

| Criterion | Result | Notes |
| --- | --- | --- |
| Style consistency: district and sub-scene read as one illustrator, and both read as the old Moosylvania site | pass | Maplewood, lobby and props share the flat, outline-free palette of the old site; the office is the real brick church from the arrival mock. The lobby is a little plainer than the street. |
| Camera angle and light direction match across every asset | soft | Maplewood and the lobby share the elevated three-quarter view and upper-left light. Props came out closer to straight-on; they read fine at prop size but the door and welcome sign are frontal. |
| Props cut cleanly: no fringe or halo visible at 4x on the real background | pass | Magenta key plus a 1 px alpha erode leaves 0 magenta pixels on every prop. A faint reddish seam shows where the moose head overlaps the body; worth a second look at phone scale. |
| Resolution: background sharp at desktop 1.0 / DPR 2, or acceptable after a 2x upscale | soft | Maplewood is 1536 px for a 1400 px footprint: 1.10 image px per world px, soft at phone 0.6 x DPR 2 (x0.91) and at desktop DPR 2. A 2x Lanczos upscale WebP exists and is under 200 KB. The lobby is 1672 px for 2845 px (needs about 1.7x). |
| Phone: signpost fits the portrait frame at 0.6 with the camera on the arrival point | deferred | With arrival on the welcome sign (grass right of the church) the portrait frame does not reach the signpost at the old tree spot. A placement question, not an art failure: Joe's call is to fix it when the scenes are regenerated to join up. |
| Moose parts assemble with no gaps and move as one through head turn, wobble and blink | pass | All four parts came from one 1254 px frame, so trim offsets seat them exactly; head turn, antler wobble and blink hold together with no gaps. |
| Repeatability: the recipe reproduces the style on a second run without new prompt surgery | soft | Worked, but needed prompt surgery: the office had to be described and the arrival mock attached, the edge-fill edit misread and shrank the scene, and the door needed a crop of the church entrance and two regenerations. |
| Effort: total cleanup for the nine assets is under about two hours | pass | No manual repainting. Every fix was a prompt retry or an edit in ChatGPT; keying, trimming and WebP are scripted. |

### Per asset

| Asset | Tool kept | Retries | Cleanup min |
| --- | --- | --- | --- |
| maplewood | ChatGPT | 6 | 0 |
| lobby | ChatGPT | 0 | 0 |
| signpost | ChatGPT | 0 | 0 |
| welcome | ChatGPT | 0 | 0 |
| door | ChatGPT | 2 | 0 |
| moose-body | ChatGPT | 0 | 0 |
| moose-head | ChatGPT | 0 | 0 |
| moose-antlers | ChatGPT | 0 | 0 |
| moose-eye | ChatGPT | 0 | 0 |
| **total** | | | **0** |

### Measured in the harness

- ref:ref-scene-0-arrival-mock.png: ref-scene-0-arrival-mock.png: 1800x1150, 275 KB, png
- ref:ref-scene-1-day.png: ref-scene-1-day.png: 1800x1720, 262 KB, png
- ref:ref-scene-4-office.png: ref-scene-4-office.png: 1800x1570, 225 KB, png
- door: door.webp: 1022x859, 15 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- scene: world 1400x933 from 1536x1024 → 1.10 image px per world px; device needs 1.20 (scale 0.6 × DPR 2): SOFT, ×0.91; frame 390x844 at 0.6 = 650x933 world px, centred on arrival (1300, 560); signpost DOES NOT FIT the frame; signpost at (614, 376) 91x170 world px, 7.85 image px per world px; welcome at (1225, 512) 150x88 world px, 8.18 image px per world px; door at (989, 360) 98x82 world px, 10.43 image px per world px; door 98x82 vs church door gap 95x85: covers 103% of the gap width
- signpost: signpost.webp: 715x1335, 16 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- body: moose-body.webp: 728x726, 12 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- maplewood: maplewood.webp: 1536x1024, 93 KB, webp; covers 1400x1000: 1.10 image px per world px at 1.0 scale; aspect 1.50 (target 1.40)
- antlers: moose-antlers.webp: 568x255, 6 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- eye: moose-eye.webp: 48x46, 1 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- welcome: welcome.webp: 1227x716, 10 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- lobby: lobby.webp: 1672x941, 28 KB, webp; UNDER 2845x1600: 0.59 image px per world px at 1.0 scale; aspect 1.78 (target 1.78)
- head: moose-head.webp: 437x375, 6 KB, webp; fringe 0.0% of edge · white halo 0% of fringe · magenta px 0
- style: Maplewood vs lobby: 3 of 8 colours shared; Maplewood vs ref-scene-0-arrival-mock.png: 7 of 8 shared; lobby vs ref-scene-0-arrival-mock.png: 6 of 8 shared; Maplewood vs ref-scene-1-day.png: 7 of 8 shared; lobby vs ref-scene-1-day.png: 5 of 8 shared; Maplewood vs ref-scene-4-office.png: 3 of 8 shared; lobby vs ref-scene-4-office.png: 6 of 8 shared

### Moose rig

```json
{
 "body": {
  "parent": null,
  "x": 200,
  "y": 181,
  "w": 728,
  "h": 726,
  "pivot": [
   0.5,
   1
  ]
 },
 "antlers": {
  "parent": "head",
  "x": 319,
  "y": 41,
  "w": 568,
  "h": 255,
  "pivot": [
   0.78,
   0.95
  ]
 },
 "head": {
  "parent": "body",
  "x": 452,
  "y": 152,
  "w": 437,
  "h": 375,
  "pivot": [
   0.15,
   0.85
  ]
 },
 "eye": {
  "parent": "head",
  "x": 558,
  "y": 180,
  "w": 48,
  "h": 46,
  "pivot": [
   0.5,
   0.5
  ]
 }
}
```

## Comments

2026-09-23, from the animation approach ticket (13): props are canvas-native, no Rive. The "one animated prop" here must be delivered as separated transparent WebP parts with a pivot each (use the moose: body, head, antlers, eye) so the prototype tests whether ChatGPT and Nano Banana can produce clean, style-consistent parts. That is the pipeline's hardest ask and the go or no-go should weigh it. See ADR 0002.

2026-09-23, wayfinder session (claimed, waiting on Joe): the prototype scaffolding is on branch `prototype/art-pipeline` at `prototypes/art-pipeline/` (commit bc81ef0). It holds `recipe.md` (the style paragraph, one prompt per asset with filenames, the four-part moose derivation, and the ImageMagick and cwebp keying, upscale and WebP commands, all tested on synthetic fixtures), `review.html` (a single-file harness: loads the assets folder, reports dimensions against the 1400x1000 district and 2845x1600 sub-scene targets plus fringe and halo on cut-outs, compares eight-colour palettes across reference, district and lobby, composes Maplewood at world scale with the props and a camera frame clamped like the real camera to check the signpost fits the portrait phone at 0.6, magnifies the pixels a device would actually draw at a chosen render scale and DPR, assembles the moose as a pivoted body, head, antlers and eye rig with head turn, antler wobble, blink, idle breathing and reduced motion, and writes the answer markdown from a criteria table and per-asset tool, retry and cleanup counts), and `README.md` with the hand-off checklist. The harness was exercised end to end in a browser with fixtures and produced no errors.

What remains is human-in-the-loop: generate the assets in ChatGPT and Nano Banana per the recipe, judge them in the harness, and paste the Verdict tab's markdown here under `## Answer`. Then set `Status: resolved` and add the gist to the map's Decisions so far. If the moose parts need more than about an hour of repainting, that alone argues for a NO-GO on separated-part animation and should feed back into the rendering prototype (08).
