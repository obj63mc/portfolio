# Assemble the spec and hand it off

Type: task
Status: resolved
Part of: ../map.md
Blocked by: 16, 17, 18, 19, 20, 22

## Question

Once the remaining decisions are in, write the site spec at `.scratch/stl-cursor-portfolio/spec.md`, drawn from every resolved ticket, the ADRs and `CONTEXT.md`, citing tickets rather than restating their detail where the detail is long. List the prototypes and branches a builder should read and which code, if any, carries over. Check that no ticket's answer contradicts a later one (for example the own-cursor ticket amending cursor identity), and flag any gaps. Output: the spec file, ready to hand to `/to-tickets`.

## Comments

2026-09-24, from [How does the site deploy to Cloudflare, and how is the spend cap watched?](20-deploy-pipeline.md): ADR 0005 supersedes ADR 0004, and Room is redefined in `CONTEXT.md`. Earlier tickets that say one room per scene, 60 live cursors site-wide, spectators, Turnstile or a ~$17 worst case carry amendment notes pointing here. The deploy ticket's answer is the deploy and operations section, with a dashboard checklist.

## Answer

Resolved 2026-09-24 in a wayfinder session. The spec is at [`spec.md`](../spec.md), ready to hand to `/to-tickets`.

- Drawn from all 22 resolved tickets, ADRs 0001 to 0005 and `CONTEXT.md`, in the `/to-spec` shape (problem, solution, 50 user stories, implementation decisions by area, testing decisions with four seams, out of scope, further notes). Long tables (content inventory, beds and one-shots, the dashboard checklist, the moose rig) are cited, not restated.
- Lists the prototype and research branches with heads, what each proved, and which modules carry over (the pointer-lock branch is the superset of cursor-sync and own-cursor; the rendering-camera branch adds tiling and the bench; the art pipeline is on `main`).
- Consistency check: every override is listed in the spec's "Consistency check" (sound on by default; ADR 0005 replacing spectators, Turnstile, 15 Hz and the global cap; the universal modal Join; keys moving the cursor rather than panning, which also overrides ticket 14's focus rule; desktop without drag or wheel; own-cursor sizes times the depth factor; the ticket 22 river rules; the consent popover; monster ears as the name for cosmetic 3).
- Gaps, in the spec's "Gaps and calls made in assembly": one call made (peer river state as a presence bit, for Joe to confirm), the stale premise under the jukebox ruling, three proposed sub-scene slugs, the signpost phone framing left to the art pass, tablet render scale, the unlocked desktop fallback, the keepalive interval, screen sequence lengths, no real-phone numbers, and the art-pass depth and river data still to be produced.
- Seven suggested build phases close the spec as a hint for `/to-tickets`, not as tickets.
- Build tickets go under `.scratch/build/` (its README points back at the spec), so the wayfinder tickets here are left untouched.
