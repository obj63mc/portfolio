# 01: Skeleton: static build, scene-data module, prerendered overworld and Moosylvania lobby

**What to build:** A SvelteKit static site (`adapter-static`, `prerender = true`, Svelte 5 runes, TypeScript, native CSS) that writes two scene URLs, `/` and `/moosylvania`, as plain HTML at build time from one typed scene-data module per scene. A crawler, a screen reader or a visitor without JavaScript gets the complete document: headings placed per district and venue, every prop as a named button with its full card as a native `<dialog>`, the signpost links, the door from the Moosylvania building to the lobby and the exit back. Cards open and close by keyboard with no engine present. Nothing is drawn yet: the canvases exist, empty and `aria-hidden`.

Sub-scene URLs are flat venue slugs (`/moosylvania`), not `/<district>/<venue>` as the spec proposed, because a visitor who trims the URL to `/maplewood` must not land on a 404. The district still appears in the `<title>` and the exit link (`/#moosylvania`). This overrides the spec's URL section.

The scene-data module shape settles here and every later ticket reads from it: world rect; per prop the world rect, accessible name, gist, card content and links, optional `clip-path`; heading boxes; depth regions; foreground scenery cut-outs; and for the overworld the river water mask, bridge deck rect, south-end line and Arch reset point. Rects are placeholders until the art passes; content is real, from the content inventory.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `npm run build` writes prerendered HTML for `/` and `/moosylvania` with `<title>`, meta description and no runtime rendering of the layer
- [x] Overworld markup matches the spec: skip link, `aria-hidden` scene canvas, `<main>` with `<h1>Joe Madden, St. Louis</h1>`, signpost `<nav>` (resume PDF, email, LinkedIn, GitHub, then fragment links per district), a `<section>` with `<h2>` per district west to east, a `<section>` with `<h3>` per venue, props left to right as `<button aria-haspopup="dialog">` named prop plus gist, a door link for Moosylvania, "N here" text, one polite live region, `aria-hidden` cursor canvas, the bottom-left controls cluster (Sound `aria-pressed`, Analytics settings)
- [x] Lobby markup: `<h1 tabindex="-1">` with the venue name, the four desk props, exit link to `/#moosylvania`
- [x] Every card is its own prerendered `<dialog>` with the inventory text and links, opened with `showModal()`; Escape, a Close button and focus return work with no engine
- [x] Links versus buttons per the spec: signpost contacts, district arrows, doors and exits are links; everything else is a button with any external link inside its card
- [x] Without JavaScript the page reads as a normal document; with the engine class absent the layer is in flow
- [x] A build-output test (seam 3) over every prerendered URL asserts the heading hierarchy, one button plus one dialog per prop from the scene-data module, the link-versus-button rule, door and exit links, `<title>` and description
- [x] Type-check, tests and build run from one npm script that CI will call

## Comments

2026-09-24, resolved in one commit on `main`. Card titles use `<h4>` on the overworld and `<h2>` in a sub-scene so the no-JS inline document keeps its heading hierarchy; the no-JS fallback is a `<noscript>` stylesheet, so nothing flashes when JS loads. `District` gained a `sign` rect for the `<h2>` box; `Venue.door` is the sub-scene URL. Left for Joe: the signpost email and LinkedIn hrefs are `TODO` (nothing on record), `static/resume.pdf` is a placeholder, and the moose card line is unwritten per the inventory. Deferred: the skip link renders inside `<main>` after the canvas rather than before it (tab order unaffected).
