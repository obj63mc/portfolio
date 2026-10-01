# Big Muddy

Status: ready-for-human (the art's look, real devices)

Lunker Lake, the fishing game made for the Punch Cigars and Bassmaster giveaway (`~/Sites/old/bassmaster.moosebeta.com`,
ImpactJS on SilverStripe), rebuilt in Svelte and TypeScript as Big Muddy, behind an angler fishing the Mississippi from
the Illinois bank beside the grain elevator (Joe, 2026-10-01). A page of its own with no scene, as Sushi Stand is.

## Decided (Joe, 2026-10-01)

- Name and route: Big Muddy, `/big-muddy`. "Lunker Lake" was the campaign's own title.
- Fish: largemouth bass, blue catfish (the carp's numbers), alligator gar (the pike's).
- Steering: the lure chases the mouse pointer left and right at the original's 400 px/s; Arrow, A and D keys; on touch,
  a joystick. The camera keeps the lure centred, as the original's did, so the pointer steers by which side of the lure
  it is on, full speed 100 units out.
- Drawn natively on a 2D canvas, no library. Pixi is the way up if shader effects are wanted, a swap inside `draw.ts`.
- Music: first delta blues, then, on hearing the candidates, something in the spirit of the Zelda fishing themes; Joe
  picked "Watermill in the old town" from Pixabay. A catch plays Sushi Stand's star.
- All new art, through Codex. Nothing of the original's is carried over: no sprite, photo, campaign copy, lure name,
  age gate, sweepstakes, share link or analytics, and never its database dump.
- The leaderboard is the visitor's own ten heaviest catches, kept on the device. No name is asked for.

## The rules, from the original

The lure sinks by itself and is steered left and right; fish and snags rise past it; the first touch ends the cast.

- Lure levels 1 to 4 sink from 50, 100, 200, 300 units/s, gaining 10, 15, 20, 30 units/s², to 3000 at most. A depth of
  300 units is a foot.
- A fish's weight is set as it appears, from the depth then: `ratio = max(0.2, (10 * depth + 1) / per + 0.05 or 0.10)`,
  `lb = floor(ratio * factor to one decimal)`. Bass: per 400, factor 7.5, 1 lb at least. Catfish: 1000 and 22.5. Gar:
  1000 and 21. It is drawn `ratio` its size, to 1.5 at most. (`10 * depth + 1` is the original's `depth + 1` on a
  string.)
- A catch of 10 lb or more on lure 1, 30 on lure 2, 50 on lure 3 earns the next lure. A snag costs one, never the
  first. The lure is kept between casts and visits.

Changed on purpose:

- A fixed view of 800 by 1200 units with the lure 200 down, letterboxed, where the original's was the window: the same
  look-ahead on every device.
- A fish rises at its mean speed (bass 170, catfish 102, gar 85 units/s), where the original drew one of four speeds
  every frame, which averaged to the same.
- A fish or snag is taken away once wholly above the view, where the original's went 96 px above its top, in sight
  when large.
- Five of each fish and eight snags from the first frame; the original reached those numbers over its first seconds.
- A fish's box is its new picture's shape at the area of the original's frame: the bass 250 by 99, the catfish 396 by
  132 (the carp's was 300 by 174), the gar 554 by 105 (the pike's 500 by 116).
- Everything the lure can touch, and the lure, has an ivory outline, and the water starts a shade under the style's
  turquoise, so the outline stands 3 to 1 against it at every depth (Joe, 2026-10-01).
- Three tiers of result line, small, medium and big; the original's big tier could never show.

## Slices

`issues/01` to `07`.
