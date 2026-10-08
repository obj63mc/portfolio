# Card copy

The words on each prop's card, one Markdown file per prop: `<scene>/<prop id>.md`. Edit a file and the card follows;
`npm run dev` shows it as you save.

- The file's name is the prop's `id` in its scene (`src/lib/scenes/<scene>.ts`). The folder only sorts the files.
- The file is everything the card says: a card shows no heading of its own. Start the file with `# A headline` for the
  big gold headline; `## A smaller one` works further down. Leave it out and the card has none.
- What is over the copy, a video, a row of logos or a window of screenshots, is set on the prop in its scene file
  (`video`, `logos`, `screens`), as are the links under it (`links`). A screenshot is a `.webp` in a folder of
  `art/sources/screenshots`, listed with the name its window shows: one alone is a plain image, more are gone through
  with the window's back and forward buttons.
- Plain Markdown: headlines, paragraphs, `**bold**`, `*italic*`, `[links](https://example.com)` and lists. A link to
  another site opens in a new tab.
- `<scene>/about.md` is not a card: it is the scene's write-up, what the place is and what is in it, read under the
  headline when the page is read without the scene (no JavaScript, or the menu's toggle out of exploring).
- A prop that is not a card (a poster, the moose, the TV) has no file. `npm test` fails on a file no card owns and on a
  card with neither copy nor media.
