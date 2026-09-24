# How is the prop button layer structured for crawlers, screen readers and keyboards?

Type: grilling
Status: resolved
Part of: ../map.md
Blocked by: 05, 06, 08

## Question

ADR 0003 makes each prop a transparent `<button>` over the canvas, and that button layer is the site's accessible and crawlable HTML. It must be prerendered. Decide how it is structured per scene URL (`/`, `/maplewood/moosylvania` and the other sub-scenes):

- the heading hierarchy (scene, district, venue), and how the painted district signs map to real headings;
- what a prop's markup holds: the button's accessible name only, or the full content from the content inventory (05), and how the reveal card is exposed as a dialog;
- which props are links rather than buttons (resume PDF, LinkedIn, GitHub, Strava, email, venue doors that change URL);
- keyboard order across districts, skip links, and how focus pans the camera (the prototype centres the camera on the focused prop on `:focus-visible`);
- what screen readers are told about the canvas itself and about other visitors' cursors;
- how SvelteKit prerenders the layer (the prototype ran with `ssr = false`).

Output: a markup outline per scene type, ready for the spec.

## Answer

Resolved 2026-09-24 in a two-round grilling session. Joe accepted every recommendation, with one clarification on the build.

### Build

- SvelteKit `adapter-static`, `prerender = true`, SSR left on **at build time only**. Every scene URL is written to plain HTML at build with its headings, prop buttons, links, card dialogs, `<title>` and meta description. After deploy the site is static files, with no server rendering at runtime. (`ssr = false`, as the prototype used, would ship an empty shell and is ruled out.)
- The layer is rendered from one typed scene-data module per scene (world rect, accessible name and card content per prop). The canvas engine starts in `onMount` and never re-renders the layer.
- **Plain-document fallback**: before the engine starts, without JS, or if the canvas fails, the same markup shows as a normal readable document: headings, text and links in flow. The engine adds a class on start that turns the layer into absolutely positioned, transparent hit targets. This is not a separate mobile site (still out of scope); it is the same markup, unstyled for the scene.

### Markup outline: overworld `/`

```
<a class="skip" href="#signpost-districts">Skip to districts</a>   visually hidden until focused
<canvas aria-hidden="true">                                       scene art
<main>                                                            the camera-moved layer
  <h1>Joe Madden, St. Louis</h1>
  <nav id="signpost" aria-label="Signpost">                       Maplewood, at the arrival point
    <a href="/resume.pdf">Resume</a> <a href="mailto:…">Email</a> <a>LinkedIn</a> <a>GitHub</a>
    <ul id="signpost-districts">
      <li><a href="#maplewood">Maplewood</a> … one per district
  <section id="maplewood" aria-labelledby>                        districts by centre x, west to east:
    <h2>Maplewood</h2>                                            Maplewood, Central West End,
    <section aria-labelledby>                                     Carondelet Park, Midtown, Belleville
      <h3>Moosylvania</h3>                                        box over the painted building
      <button aria-haspopup="dialog">Welcome sign: …</button>     one per prop, left to right
      <dialog>…full card content and links…</dialog>
      <a href="/maplewood/moosylvania">Enter Moosylvania</a>      venue door
    …
<p class="presence">12 here</p>                                   plain text, not a live region
<div role="status" aria-live="polite">                            own events only
<canvas aria-hidden="true">                                       cursor overlay
```

- District `<h2>` and venue `<h3>` boxes sit in world coordinates over the painted entrance sign or building, with transparent text, in the same layer as the buttons. That way touch exploration finds "Maplewood" where the sign is drawn. Scenery between districts has no markup.
- Exterior-only venues (MonsterCommerce, the park) have the same `<h3>` section with no door link.

### Markup outline: sub-scene, such as `/maplewood/moosylvania`

```
<canvas aria-hidden="true">
<main>
  <h1 tabindex="-1">Moosylvania</h1>                              focus lands here on entry
  <button aria-haspopup="dialog">Frontend desk: …</button> <dialog>…</dialog>   props left to right
  …
  <a href="/#moosylvania">Back to Maplewood</a>                   exit door
<p class="presence"> <div role="status"> <canvas aria-hidden="true">
```

The district goes in the `<title>` ("Moosylvania, Maplewood") and in the exit link, not in a heading.

### Props, cards and links

- **Button**: the accessible name is the prop plus its gist, such as "Diploma: BS Computer Science with Honors, 2005", with `aria-haspopup="dialog"`.
- **Card**: each prop has its own prerendered native `<dialog>` holding the full content-inventory text and any links. It is drawn in screen space, not world space, and opened with `showModal()`. Focus trapping, Escape and returning focus to the button are all native. Opening the card counts as the click for cosmetic grants and click reactions.
- **Links, not buttons**: the signpost's resume, email, LinkedIn and GitHub arrows are separate direct `<a>` targets. The signpost's district arrows are fragment links (`#belleville`) that pan the camera. Venue doors are real `<a href>` links to the sub-scene URL, so crawlers follow them and middle-click works; client navigation intercepts them to play the fade. Exit doors link to `/#<venue>`.
- **Stay buttons**: every other prop, including the lab workstation (GitHub) and Joe's bike (Strava). The external link lives inside the card, so the click still grants the cosmetic before anyone leaves.

### Keyboard and focus

- DOM order is tab order: skip link, signpost, then districts west to east by centre x, with props left to right within each venue.
- `:focus-visible` centres the camera on the focused element. The pan is smooth, or instant under reduced motion. A mouse click never pans.
- Arrow keys and WASD still pan the camera while a prop button has focus, but not while a card is open.
- Keyboard focus plays a prop's hover reaction, and Enter or Space plays its click reaction. Under reduced motion, focus shows the plain highlight.
- **Scene change**: entering a sub-scene moves focus to its `<h1>`. Leaving by the exit door or the back button returns focus to that venue's door link on the overworld, with the camera centred on it.

### Screen readers

- Both canvases are `aria-hidden`; the layer carries everything.
- Other visitors are not announced. A visible "N here" counter is plain text.
- The shared Foundry screen's button name reflects its state, such as "Screen, now playing Fast Five". Nothing is announced when someone else starts it.
- One polite live region announces only the visitor's own events, such as "You earned the graduation cap" and "Offline, exploring solo".

### Recorded elsewhere

- Glossary: added **Card** to `CONTEXT.md`.

2026-09-24, from [Pointer-locked desktop cursor and the river current](22-pointer-lock-and-river-current.md): desktop mouse visitors pass a Join gate that locks the pointer. The gate never blocks the accessible layer: keyboard users can Tab into prop buttons and cards without joining, and focus still pans the camera.

2026-09-24, from [Pointer-locked desktop cursor and the river current](22-pointer-lock-and-river-current.md): cards stay the prerendered `<dialog>` described above, styled to the scene, and are never painted on the canvas. Under pointer lock, the drawn cursor is drawn above every card and control. It gives the element under it a hover state, and a click activates it. That covers the close button, the links inside a card and any other control.

2026-09-24, amended by [What does each district and prop sound like, and how is sound switched on?](19-sound-design.md): the Join card is a modal `<dialog>` opened with `showModal()` on every device, so until Join the page behind it is inert and Tab reaches only the Join button (and, for European visitors, the analytics consent popover above it). The Tab order, focus pans and live region above apply from Join onward. Visitors without JavaScript never see the card and get the plain document. The sound toggle in the bottom-left cluster is a prerendered `<button aria-pressed>` named "Sound".
