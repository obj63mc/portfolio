# 03: The door, the exit and analytics

**What to build:** The welcome sign's card links the page (`src/lib/content/overworld/welcome.md`); the exit lands at the arrival point; a click to `/resume` counts as a resume contact (`src/lib/analytics/consent.ts`); the build and analytics tests follow.

**Blocked by:** 01

**Status:** resolved

- [x] The link in the welcome card, same tab, through the iris
- [x] `contactMethod('/resume')` is `resume`
- [x] `tests/build-output.test.ts`: the resume's shape; the shell tests run on it; `/resume` is never cached
- [x] `tests/resume.spec.ts`: from the card to the page with the engine away, and back with it on

## Comments

### Built, 2026-10-02

- `welcome.md` gains one line linking `/resume`; the Markdown plugin opens only http(s) links in a new tab, so the hop goes through `beforeNavigate` and the iris like a door's.
- The exit is `href="/"`: with no scene to come back from and no hash, `engine.show()` lands on `arrival()`, the welcome sign and signpost together, where the link was clicked.
- `contactMethod` counts a same-origin `/resume` (trailing slash or not) as `resume` beside `.pdf`; the PDF link on the page carries `download`, which the router leaves to the browser and the click listener still sees.
- `tests/build-output.test.ts`: `pages` is `files` plus `resume.html` for the shell tests (cards, analytics, CSP, fonts); the scene-only tests keep `files`, and the Universal clearance test too, since Joe cleared the titles for the resume. The resume's own test reads the markup's shape alone.
- `tests/resume.spec.ts`: first paint with every script aborted, the hop from the card and back, and the print.
