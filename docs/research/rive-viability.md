# Should animated props be built in Rive?

Research note, 2026-09-23. For a Cursor Camp style explorable canvas scene (SvelteKit static, 10 to 30 small looping or state-driven props, mobile first), should props be Rive, a lighter option, or a mix?

## Recommendation

**Default to canvas-native props (sprite sheets plus procedural drawing in the existing scene loop). Do not adopt Rive at launch. Reserve Rive for at most one or two "hero" props later, if a prop genuinely needs skeletal or mesh deformation.**

Reasons, each backed below:

1. The smallest Rive web runtime costs about 454 KB gzipped (95 KB JS + 359 KB wasm) before any artwork. Sprite sheets cost zero library bytes.
2. Exporting `.riv` for a runtime requires a paid plan ($9/seat/mo Cadet). Runtimes themselves are MIT.
3. The art is AI raster. Rive can animate raster layers, but sprite sheets and `drawImage` use those pixels natively with no re-authoring.
4. The site already owns a canvas draw loop. Rive's high-level API wants one `<canvas>` per instance, which its own docs warn about.
5. Rive publishes no mobile benchmarks for many instances, and open memory and Safari issues exist.

Where each prop type belongs:

| Prop | Approach | Why |
|---|---|---|
| Campfire flicker | Procedural (noise-driven scale/alpha of 2 or 3 flame layers) in the scene rAF loop | No assets, trivially state-driven (lit/out) |
| Moose walking | Sprite sheet (6 to 12 WebP frames); position tweened in code | AI raster frames drop straight in |
| Bicycle | Raster body plus wheel images rotated procedurally | One `ctx.rotate`, no frames |
| Projector | Sprite sheet for reel plus procedural light flicker; state (off/on/film N) in plain JS | State machine is a few lines |
| Future hero prop (mesh deformation) | Rive via `@rive-app/canvas-advanced-lite` rendered offscreen, then `drawImage` into the scene | Only case where Rive earns its bytes |

Lottie is not recommended: `lottie-web` is smaller (46 to 76 KB gz) but adds a second animation model with no editor in this pipeline, and `dotlottie-web` carries its own ~500 KB gz wasm.

## Findings

### Web runtime options and bundle size

Measured from npm tarballs on 2026-09-23 (gzip of shipped files), all v2.43.0, all MIT (https://github.com/rive-app/rive-wasm/blob/master/LICENSE):

| Package | JS gz | wasm gz |
|---|---|---|
| `@rive-app/canvas-lite` | 95 KB | 359 KB |
| `@rive-app/canvas` | 103 KB | 805 KB |
| `@rive-app/webgl2` | 104 KB | 907 KB |
| `@rive-app/canvas-advanced-lite` (low-level API) | 17 KB | 359 KB |
| `@rive-app/canvas-single` | 1.16 MB single file, wasm inlined | |

- No `webgl2-lite` or `webgl-lite` exists on npm (404). `@rive-app/webgl` is "deprecated and receives no updates after v2.37.0" (https://rive.app/docs/runtimes/web/canvas-vs-webgl).
- Lite "drops the text, layout, audio, and scripting engines"; webgl2 is "the Rive Renderer on WebGL2" and alone supports vector feathering. Rive recommends webgl2 "for most use cases" but Canvas when "You have several Rive instances on screen" (https://rive.app/docs/runtimes/choose-a-renderer).
- The wasm is fetched at runtime from unpkg by default; self-host with `RuntimeLoader.setWasmUrl()` (https://rive.app/docs/runtimes/web/preloading-wasm).
- No official Svelte wrapper; use `new Rive({ src, canvas, stateMachine })` in `onMount` (https://rive.app/docs/runtimes/web/web-js). No SSR guidance exists.

### Performance and memory, 10 to 30 instances on a phone

- Rive publishes no benchmarks, memory figures or instance-count guidance for web (https://rive.app/docs/runtimes/web/faq, https://rive.app/docs/getting-started/best-practices). Official advice: "Measure on real devices" (https://rive.app/docs/runtimes/web/canvas-vs-webgl).
- High-level instances each get their own canvas. With webgl2, "browsers cap how many WebGL contexts a page can hold at once"; mitigation is `useOffscreenRenderer: true` (https://rive.app/docs/runtimes/web/rive-parameters). WebKit's cap is 16 (https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp). Canvas2D has no such cap.
- The low-level API can "construct a scene of multiple Rive files, artboards ... all in one `<canvas>`" with one renderer and one `requestAnimationFrame` (https://rive.app/docs/runtimes/web/low-level-api-usage). It is the only Rive mode that fits a single-canvas scene, and it drops the convenience API.
- Load once, instantiate many via `riveFile:` (https://rive.app/docs/runtimes/web/caching-a-rive-file). C++ objects "need to be manually deleted to prevent memory leaks" (https://rive.app/docs/runtimes/web/web-js).
- Open issues: memory growth while static (https://github.com/rive-app/rive-wasm/issues/391), Safari canvas leak (https://github.com/rive-app/rive-react/issues/440), mobile Safari webgl2 error (https://github.com/rive-app/rive-wasm/issues/408), frame drops at 4 draws (https://github.com/rive-app/rive-wasm/issues/390).

### Licensing and pricing

- Runtimes: "all open-source and licensed under the MIT License... free to use them for personal and commercial applications" (https://rive.app/docs/runtimes/getting-started). No royalties or attribution beyond MIT.
- Editor plans (https://rive.app/pricing): Free $0 (3 collaborative files, 10 MB per asset), Cadet $9/seat/mo ("Export .riv files"), Voyager $32, Enterprise $120. "Exporting for runtime is available on paid plans" (https://rive.app/docs/editor/exporting/exporting-for-runtime), so a portfolio needs Cadet to ship any `.riv`. The Terms of Service (https://rive.app/docs/legal/terms-of-service) place no commercial restriction on user content. Unverified: whether $9 is the annual or monthly rate.

### Driving state machines from code (shared props over the network)

- Yes. Legacy inputs `rive.stateMachineInputs(name)`, `input.value = x`, `input.fire()` still work but are deprecated in favour of Data Binding (https://rive.app/docs/runtimes/web/rive-parameters).
- Current API: `rive.viewModelInstance` (`autoBind: true`), `vmi.number("p").value`, `vmi.boolean()`, `vmi.trigger("p").trigger()`, `prop.on(cb)` (https://rive.app/docs/runtimes/web/data-binding). Transitions are "conditioned on Data Binding properties" (https://rive.app/docs/runtimes/web/state-machines). Rive to JS: `rive.on(EventType.RiveEvent, cb)` (https://rive.app/docs/runtimes/web/rive-events).
- These are synchronous JS setters, so a WebSocket `onmessage` handler can drive any prop. A hand-rolled `{state, since}` object does the same, so this is not a differentiator.

### What the Rive MCP can do today

- An HTTP MCP server built into the Rive desktop editor (Early Access, Windows and macOS) at `http://127.0.0.1:9791/mcp`; the app must be open. No npm package (https://rive.app/docs/editor/ai/mcp).
- It writes, not just reads. Documented categories: add/rename/resize artboards; query, update, duplicate, reparent, delete nodes; create shapes, paths, layouts; edit animations, state machines, states, transitions, conditions, keyframes; create view models and bindings; edit Luau scripts and shaders. Tool names are not published. Announced 2025-05-22, expanded 2026-06-11 (https://x.com/rive_app/status/2065197395496022108).
- Separate: Rive CLI plus RML (technical preview, 2026-09-10) builds `.riv` from text headlessly with no editor or account (https://rive.app/docs/cli/overview). Whether that bypasses the paid export gate is unverified.

### AI raster art into Rive

- Rive does not require vectors. It imports JPEG, PNG, WebP and layered PSD (https://rive.app/docs/editor/fundamentals/assets-overview). Raster layers can be keyed on transform and opacity, parented to bones, and deformed with meshes (https://rive.app/docs/editor/manipulating-shapes/meshes). Rive recommends WebP and warns assets are the main source of file bloat (https://rive.app/docs/getting-started/best-practices).
- Images can be swapped at runtime without re-export via `assetLoader` with `decodeImage` and `setRenderImage`, or a view-model image property (https://rive.app/docs/runtimes/web/loading-assets), so new ChatGPT or Nano Banana renders could replace a prop's skin without the editor.
- SVG import converts to paths but loses filters, dash arrays, skew and embedded images (https://rive.app/docs/editor/assets/svg). Auto-traced AI vectors are discouraged.

### Alternatives (sizes measured 2026-09-23)

- `lottie-web` 5.13.0 (MIT): `lottie_light` 46.5 KB gz (SVG only), `lottie_light_canvas` 54 KB gz, full 76 KB gz; supports raster layers and can draw into an existing 2D context (https://github.com/airbnb/lottie-web).
- `@lottiefiles/dotlottie-web` 0.80.0 (MIT): 33 KB gz JS plus ~496 KB gz wasm from CDN; dotLottie 2.0 has built-in state machines (https://dotlottie.io/spec/2.0/). Not lighter than Rive lite.
- Sprite sheets: CSS `steps()` (https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/steps) or 9-argument `drawImage` (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage). MDN canvas optimisation: pre-render offscreen, integer coordinates, batch, avoid `shadowBlur` (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).
- Honour `prefers-reduced-motion` (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
- neal.fun/cursor-camp could not be inspected (Cloudflare).

## Open questions

- Real-device frame time for 30 sprite props on mid-range Android.
- Whether the Rive CLI exports runtime `.riv` on the Free plan.
