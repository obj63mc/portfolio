# 01: The page

**What to build:** `src/routes/resume/+page.svelte`: the copy as plain HTML on the night board, in the document's flow; the first-paint exemption and the layout's chrome handled in `src/app.css`.

**Blocked by:** none

**Status:** resolved

- [x] The header bar: BarMadden.com, Download PDF, Print, the round exit to `/`
- [x] The sheet: name, headline, contacts; Summary, Skills, Experience, Projects, Education, Off the clock
- [x] Shows before and without JavaScript; the room's count, the Sound toggle and the joystick hidden; the body's padding gone
- [x] A phone at 390 px: dates under titles, a group's name over its list

## Comments

### Built, 2026-10-02

- `src/routes/resume/+page.svelte`: the copy is the markup, nothing scripted but the Print button's `window.print()`. The root is `article.resume` in the flow, never fixed, so the page scrolls and prints; the layout's `<main>` is the page's.
- The bar is the games' header (logo, round exit) with the two buttons at card size; the sheet is the games' board. Links in the sheet read as a card's, gold and underlined.
- An entry is a grid: the h3 and its `.when` on one line, the employer under them, then the points. Under 36rem it is one column.
- `src/app.css`: the first-paint rule is `:not(:has(.game, .resume))`; `html:has(.resume)` sets the lighter night, zeroes the body's padding and hides `.presence`, `.controls` and `.joystick` (Joe, 2026-10-02: a plain document has no use for the engine's controls; the games keep theirs).
- Seen in headless Chromium at 1280 x 900 and 390 x 844 (full-page captures).
