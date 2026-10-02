# BarMadden.com

My portfolio built as an explorable, multiplayer, illustrated scene of the greater St. Louis region. Visitors move through it as cursors, see each other, and enter places to learn about me. Inspired by Neal.fun's Cursor Camp.

- [BarMadden.com](#barmaddencom)
	- [What it is](#what-it-is)
	- [How it works](#how-it-works)
		- [The canvas engine](#the-canvas-engine)
	- [How it was built](#how-it-was-built)
	- [What the repository contains](#what-the-repository-contains)
	- [Developing](#developing)
		- [Requirements](#requirements)
		- [Running it](#running-it)
		- [Checks](#checks)
		- [Common tasks](#common-tasks)
		- [Coding standards](#coding-standards)
	- [Deploying and operating](#deploying-and-operating)
	- [Further reading](#further-reading)

## What it is

The site opens on the **overworld**: one connected, illustrated map of St. Louis with six districts (Maplewood, Forest Park, Carondelet Park, Central West End, Midtown and Belleville). A visitor clicks **Let's Explore** on the Join card and their cursor enters the scene, visible to everyone else in the same room.

- **Venues and sub-scenes.** Six venues have a door to an interior scene of their own: the Moosylvania lobby, Side Project Cellar, St. Louis Bread Co., Brennan's, Saint Louis University's computer science lab, and the Alamo Drafthouse theatre at the Foundry.
- **Props and cards.** Interactive objects in a scene (a diploma, a bottle on the back bar, a lab workstation) are props. Clicking one opens its card, which holds the career facts, logos, screenshots, videos and links. Props are the only way a scene surfaces that content.
- **Multiplayer.** Each scene has rooms of up to 60 visitors. Cursors are shared at 20 Hz, and a few props are shared too: the Foundry's screen plays one reel for the whole room, and the Moosylvania lobby's TV has one remote.
- **Things to find.** Props grant cosmetics for the cursor (seven in all; earning every one turns the cursor gold). The river carries a cursor downstream, Carondelet Park has a timed lap, and each district has its own ambient sound under one theme.
- **Two games.** Sushi Stand (behind the koi in Forest Park) and Big Muddy (behind the angler on the Mississippi) are pages of their own, with scores kept on the visitor's device.
- **My resume.** A printable page at `/resume`; the PDF at `/resume.pdf`.
- **Without the canvas.** Every scene is prerendered as a plain, styled HTML document. That document is what a screen reader, a crawler, or a visitor without JavaScript reads, and it stays underneath the canvas as the real buttons and dialogs when the engine is running.

`CONTEXT.md` is the project's glossary. It defines each of these terms exactly and lists the words to avoid for them.

## How it works

| Part | What it uses |
| --- | --- |
| Pages | SvelteKit 3 with Svelte 5 (runes) on Vite 8, pre-rendered to static files by `adapter-static` 4 |
| Language | TypeScript, strict; plain nested CSS with no preprocessor or utility framework |
| Scene rendering | The site's own canvas engine in `src/lib/engine/`, drawing tiled backgrounds, props, scenery and cursors |
| Multiplayer | One Cloudflare Worker and Durable Objects over WebSockets (`worker/`) |
| Hosting | Cloudflare Workers static assets for the build; an R2 bucket (`media.barmadden.com`) for videos |
| Artwork | AI-generated illustrations, produced and tracked by the pipeline in `scripts/art/` and `art/` |
| Tests | Node's built-in test runner for logic and build output; Playwright for browser smoke testing |

- **Scene data is the single source.** Each scene is one typed module in `src/lib/scenes/`. The pre-rendered HTML, the canvas engine, the sound engine, analytics and the Worker all read from those modules.
- **Card copy is Markdown.** Each card's words live in `src/lib/content/<scene>/<prop-id>.md` and are compiled to HTML at build time, so no parser ships to the browser.
- **Desktop input is pointer locked.** After Join, the drawn cursor stands in for the OS cursor and pushes the camera at the edges; Esc pauses. Touch devices get a joystick and can drag to pan as well as touch props to activate.
- **Sound.** Looping beds per district and sub-scene blend as the camera moves, under one theme. `npm run audio` encodes and content-hashes every sound from `audio/sounds.json` and writes the licence ledger.

### The canvas engine

The engine (`src/lib/engine/`) loads after the page has mounted and takes over the pre-rendered document. It never re-renders the markup; it draws the scene under it and moves it.

**Three layers, back to front**

1. **The scene canvas** holds the background tiles, then the props and their moving parts drawn over them.
2. **The pre-rendered layer** (`<main>`) sits over that canvas as transparent buttons, links and headings, each placed at its world rect. The camera moves the whole layer with one CSS transform, so every hit target stays over its painted pixels.
3. **The cursor canvas** is on top: every cursor, the scenery that covers cursors, and the iris that closes and opens between scenes.

**Coordinates and scale.** Everything is measured in world pixels. The render scale is fixed for the session: 1 on a screen 768 px or more on its shorter side, 0.6 on anything smaller. The device pixel ratio is capped at 2. The camera is the world point at the view's top-left corner, clamped to the scene's bounds.

**Tiles.** Each scene's background is cut into 512 world-px tiles at two densities, 1.25 and 2 image px per world px, under `art/generated/<scene>/<scene>/<density>/<column>-<row>.webp`. The session uses 1.25 where that covers scale × DPR and 2 otherwise. Each time the camera moves, the engine works out three ranges of tiles from the camera and the view:

- **In view:** fetched at once, at high priority. The iris between scenes waits on these alone.
- **One ring round the view:** queued, and promoted to "at once" if the camera brings one into view.
- **Beyond two rings:** the bitmap is closed and the tile forgotten, and a fetch still in flight is aborted. This keeps memory flat on a phone.

A tile that fails or has no art leaves the night backdrop showing.

**Load order.** One loader (`loader.ts`) orders every image the engine asks for:

1. The tiles in view.
2. The cut-outs standing in the view.
3. The ring of tiles and the cut-outs out of view, a few at a time.
4. What a door in view leads to, fetched into the browser's cache only, so the hop finds it there. This step is skipped for a visitor who has asked their browser to save data.

Nothing in steps 3 or 4 starts while something in view is still coming. How many go at a time adapts to the connection: it starts at 4, grows by one for each image back within 200 ms, up to 16, and halves when one takes over a second.

**The frame loop.** One `requestAnimationFrame` tick per frame does the following, in order:

1. Steers the cursor from the keys, the joystick or the river current.
2. Moves the camera: edge-push from the cursor, a glide to a focused prop or a fragment link, a touch drag and its fling, or the Foundry's zoom.
3. Steps the props' motion and the sound.
4. Redraws the scene canvas only if something on it changed. A camera move or a newly arrived tile redraws the whole view: backdrop, tiles, then props in order of their base y. A prop moving on a still camera redraws only its own area, clipped, so an idle animation never repaints the screen.
5. Redraws the cursor canvas.

Tile edges are rounded to device pixels from world coordinates, so neighboring tiles meet without seams.

**Props.** A prop's art is one or more cut-outs delivered at the two tile densities, or a rig of parts with pivots (the moose, the rider, the marquee) tweened in code (`motion.ts`). Ambient motion freezes on a resting frame under reduced motion. The DOM layer stays the hit target: the engine reads which button is hovered, focused or clicked and plays the matching reaction on the canvas.

**Depth.** Three things give the flat illustration depth, all drawn locally and never sent to the room:

- **Depth regions.** Each scene lists rectangles with a horizon line and a foreground line. A cursor is drawn at full size at the foreground line and shrinks linearly to 0.85 at the horizon. Crossing into a region with a different horizon eases the size over 150 ms rather than snapping.
- **Foreground scenery.** Cut-outs such as a near tree or a lamp post are drawn over every cursor. The scenery is already painted into the tiles; its cut-out is redrawn on the cursor canvas only over a cursor's own pixels, so it never covers a prop.
- **Walk-behind scenery.** A lab desk, a row of theatre seats or a staircase has an outline and a front line. The side a cursor steps onto it from decides whether the cursor is behind it (drawn under the cut-out, and unable to use props standing on it) or in front, until it steps off. On the overworld the bridges work the same way for a cursor in the river.

Cursors behind scenery are drawn first, furthest back first, then everyone else. Peers near the camera are drawn 100 ms behind their latest position, interpolated; peers out of view are not drawn at all.

## How it was built

1. **Research and prototypes.** Cursor Camp's mechanics, realtime backends and animation frameworks were researched, then five throwaway prototypes answered open questions: the art pipeline, canvas rendering and camera, cursor sync on Durable Objects, own-cursor visibility, and pointer lock api.
2. **Spec and tickets.** The decisions were assembled into a site spec and split into numbered implementation tickets, kept as Markdown files under `.scratch/<feature>/`.
3. **Skeleton and scene data.** The SvelteKit skeleton, the scene-data modules and the pre-rendered overworld and sub-scenes came first, so the accessible document existed before any canvas.
4. **Artwork.** Each scene was composed as one complete illustration from location photographs and satellite references, then separated into layers. Prompts fed through Codex to generate individual assets. Defects were fixed in rounds of small tile edits on the native master image, which is then upscaled 4x and cut into tiles. Every accepted asset keeps its prompt, provenance and a review note. Agent Browser was used to capture screenshots and Codex utilized scripts to make videos from gathered portfolio content.
5. **Buildout.** The canvas engine and camera, Join and pointer lock, touch input, rooms and the directory, cursors and cosmetics, props and cards, synced video playback, easter eggs, audio and other content completed ticket by ticket.
6. **Games, resume and fallback.** A Sushi Stand game, fishing game, printable resume, and styled no-JavaScript context for accessibility and fallback.

## What the repository contains

```
src/
  app.html, app.css      The page shell and global styles, including the plain document's look
  routes/                The overworld (/), sub-scenes (/[venue]), the two games, the resume, the error page
  lib/
    scenes/              One typed module per scene: geometry, props, depth, river, walk-behind scenery
    content/             Each card's copy as Markdown, by scene and prop id
    engine/              The canvas engine: camera, tile loader, props, cursors, scenery, laps, projector, TV
    net/                 The socket client, the wire protocol, peers and the shared screen's timeline
    analytics/           Consent and the event tracker
    sushi/, big-muddy/   The games' rules and assets
    *.svelte             Prop, SubScene, VideoPlayer, Screens, Logos, Remote, Consent, LapBoard, SoundToggle
worker/                  The Cloudflare Worker: the socket gate (index.ts), room and directory objects (rooms.ts)
art/                     The art workspace: manifest, style contract, references, sources, generated assets, reviews
audio/                   Sound sources and the manifest (sounds.json)
scripts/                 The art pipeline, audio and video tooling, the phone bench, usage and setup scripts
static/                  Files served as they are: encoded audio, icons, _headers, 404.html, resume.pdf
tests/                   *.test.ts for Node's test runner, *.spec.ts for Playwright
docs/                    ADRs, the performance report, the audio licence ledger, research, agent conventions
CONTEXT.md               The glossary
AGENTS.md, CLAUDE.md     Instructions and coding standards for AI agents (kept in step with each other)
vite.config.ts           Vite's config and SvelteKit's (the `sveltekit()` plugin's options): adapter and page policy
wrangler.toml            The Worker, its static assets and its Durable Objects
```

Two kinds of file are generated and committed, and are never edited by hand:

- `art/generated/` is written by the art pipeline (`npm run art`).
- `static/audio/`, `src/lib/sound-files.json` and `docs/audio-sources.md` are written by `npm run audio`.

Video sources are not in git. They live in the R2 bucket, and `src/lib/video-files.json` maps each file to its key there.

## Developing

### Requirements

- Node 24 or later. The tests and scripts run TypeScript directly with Node's type stripping.
- `npm install` covers the site and its tests. `npx playwright install chromium` is needed once for the browser smokes.
- Only for the work that uses them: ImageMagick 7 and an authenticated Codex CLI for the art pipeline; ffmpeg and lame for `npm run audio`; a Cloudflare login (`npx wrangler login`) for videos and deploy tooling.

### Running it

```sh
npm install
npm run dev        # the site at http://localhost:5173, exploring solo
npm run build      # pre-render to build/
npm run preview    # serve the build at http://localhost:4173
```

The dev and preview servers have no rooms, so the site runs single-player there. To run multiplayer locally, build and then run `npx wrangler dev`, which serves `build/` with the real Worker and Durable Objects.

Card videos need their sources on disk to play locally. `npm run videos pull` fetches them from the media host; the dev and preview servers then answer `/media/<key>` from those files.

### Checks

| Command | What it does |
| --- | --- |
| `npm run check` | Type-checks the site, the Worker, the scripts and the tests |
| `npm test` | Node tests: scene geometry, engine logic, protocol, rooms (through `wrangler dev`) and the shape of the built pages. Needs a build |
| `npm run ci` | `check`, `build`, then `test`. This is what Workers Builds runs |
| `npm run smoke` | Playwright smokes over the built site. Run `npm run build` first |
| `npm run bench [minutes]` | Roams the built overworld as a phone and prints frame rate and memory |

Tests never assert on copy. They locate elements by `href`, class or `data-prop` and check structure, because the wording is Joe's to change freely.

### Common tasks

- **Edit a card's copy.** Change `src/lib/content/<scene>/<prop-id>.md`. A `#` heading becomes the card's gold headline.
- **Edit the resume or the error page.** Their copy is plain HTML in `src/routes/resume/+page.svelte` and `src/routes/+error.svelte`. After changing the resume, print the page to PDF and replace `static/resume.pdf`.
- **Add or change a prop.** Edit the scene's module in `src/lib/scenes/` (its rect, name, gist, links and media), add its Markdown file, and add its cut-out through the art pipeline. The geometry tests will flag a prop that overlaps foreground scenery or lacks art.
- **Add or replace a video.** Put the file in a folder of `art/sources/videos/`, run `npm run videos`, commit the updated map, then push, in that order. `npm run videos status` reports what is missing where.
- **Add or change a sound.** Edit `audio/sounds.json`, run `npm run audio`, and commit all three outputs.
- **Work on artwork.** Read `art/README.md`, `art/landmarks.md`, `art/style.txt` and the latest notes in `art/reviews/` first. The workflow is: fix the native master, reinstall it, reprocess the cut-outs, inspect the result in the scene workshop (`art/review.html`), and record a review. `npm run art:check`, `art:test` and `art:validate` are the mechanical checks; visual acceptance is a separate decision.

### Coding standards

`AGENTS.md` and `CLAUDE.md` hold the full standards. In short:

- **TypeScript:** data crossing a trust boundary enters as `unknown` and is narrowed; state machines are discriminated unions. Modules the Node test runner imports use erasable syntax only (no `enum`, `namespace` or parameter properties).
- **Svelte 5 in runes mode:** `$props`, `$state` and `$derived`, with `$effect` kept for syncing with the outside world.
- **Imports:** `#lib/...` with the file's extension (SvelteKit 3's subpath import, in `package.json`), `$app/env` and `$app/env/public`; the public build variables are declared in `src/env.ts`.
- **CSS:** plain and nested, Baseline features only. Component styles live in the component; global styles in `src/app.css`.
- **Language:** use the glossary's terms from `CONTEXT.md` in code, comments and docs.

## Deploying and operating

Cloudflare Workers Builds deploys the site. A push to `main` runs `npm run ci` and deploys to barmadden.com; any other branch gets a Preview URL, which `scripts/noindex.ts` keeps out of search results. Only a `main` build carries analytics.

- `npm run usage` prints month-to-date Durable Object usage and the bill it projects.
- `npm run multiplayer:off` is the kill switch: every socket is refused and visitors explore solo. `npm run multiplayer:on` restores it.
- `MAX_VISITORS` in `wrangler.toml` is the site-wide visitor ceiling.
- `scripts/cloudflare-setup.sh` is the step-by-step wizard for the one-time account setup.

## Further reading

- `CONTEXT.md`: the glossary.
- `docs/adr/`: the architecture decisions and their reasoning.
- `art/README.md`: the full art workflow, file formats and coordinates.
- `docs/performance.md`: what was slow, what changed and what each change measured.
- `docs/audio-sources.md`: every sound's source and licence.
- `docs/research/cursor-camp-mechanics.md`: the study of the site that inspired the movement and layout.
