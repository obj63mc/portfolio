# Sushi Stand

Status: ready-for-human (sound picks)

Sushi Star, the 2018 International Sushi Day game for Sapporo (`~/Sites/old/sapporobeer.com/internationalsushiday`), rebuilt
in Svelte and TypeScript as Sushi Stand, behind a koi swimming in Forest Park's Grand Basin (Joe, 2026-09-30).

## Built

- Rules: `src/lib/sushi/rules.ts`, the original's numbers, tested in `tests/sushi.test.ts`. Two bugs fixed: the outdoor
  festival could never come up (`floor(random * 3)` over four events), and dinner's demand used lunch's prices, so any
  dinner price sold as well as lunch's.
- Page: `src/routes/sushi-stand/+page.svelte`, the whole window, the site's night boards, gold and sky. The original's
  art is reused from `src/lib/sushi/img` (WebP) and its two service films. No picture said "Sapporo Sushi": that was the
  old default name typed over the blank sign, so the stand's name is lettered over the sign here, and the logo is the
  original "Sushi" script with STAND set in the headline face. No image model edit was needed.
- Top ten: the visitor's own, in `saved.ts` (`stands`), shown like the lap board. No global board, share links, sweeps
  or official rules.
- The koi: drawn on the scene canvas (`props.ts` `drawKoi`, `motion.ts` `koi`), in the new Forest Park district's one
  venue, whose door is `/sushi-stand`. The engine `suspend`s on that page (room left, lock let go, canvases away) and
  `show` lands back at the koi, a locked cursor behind the Paused card.
- Smoke: `tests/sushi.spec.ts`.

## Sound (Joe's picks, 2026-09-30)

- One-shots: `splash` (the koi, into the game), `tap` (every press; the fish market's chop reuses it, per Joe),
  `service-bell`, `register`, `profit`, `loss`, `rain`, and `star` on the final results (round two, in place of a gong). The engine plays `splash` in place of the door on the koi.
- Loops: `music-sushi-stand` (a 52 s loop, so music's floor is now 50 s) throughout the game, `bed-sushi-service` under a
  service and its sales, `bed-forest-park` on the overworld. The game steps them on a timer (`sound.game`), since the
  engine draws no frames while it is up.

## Waiting on Joe

- Hands-on: the real pointer lock round trip (koi, game, back to the Paused card), which headless browsers refuse, and a
  listen to the Forest Park bed's loop for the portable speaker the recording has somewhere.
