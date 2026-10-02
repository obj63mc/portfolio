---
status: accepted
---

# A printable resume page, the PDF its print

The resume is a page of its own at `/resume` with no scene or room, like the games: its copy is plain HTML in `src/routes/resume/+page.svelte`, styled for the night board on screen and for Letter paper in print, and the PDF at `/resume.pdf` is the browser's print of that page, replaced by hand when the copy changes. It is reached from the welcome sign's card, where the resume has always been meant to live, and its exit lands back at the arrival point. Alternatives: keeping the resume only as a PDF behind a card's link (unreadable on a phone, not crawlable, and a second source of truth to keep in step); a card whose copy is Markdown like the others (a resume is rows of roles, dates and grouped skills, which the cards' Markdown can't lay out, and a card is not a page to print); a typed data module rendered by the page (Joe, 2026-10-02: harder to add to and edit than copy, for no gain, since the tests read the markup's shape and never its words); and a PDF built at build time with Playwright (deferred: a print from Chrome does for now, and the script is cheap to add once the page settles).

## Consequences

- The glossary's rule that props alone surface career facts is amended: the resume page is the one page outside the scenes that carries them (CONTEXT.md).
- `static/resume.pdf` is regenerated from the page, never edited on its own; a change to the copy is a reprint.
- The first-paint rule in app.css keys on `.resume` as it does on `.game`, so the page shows before and without JavaScript.
- A click to `/resume` counts as a resume contact in analytics, as the PDF's does.
- Tests read the page's shape (sections, entries, dates, the contacts' hosts, the PDF and the exit), never its words.
