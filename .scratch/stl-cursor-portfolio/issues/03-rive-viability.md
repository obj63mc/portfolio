# Is Rive viable for animated props, and what does its MCP actually do?

Type: research
Status: resolved
Part of: ../map.md

## Question

Should animated props be built in Rive? Establish from primary sources: web runtime options and bundle size (`@rive-app/canvas`, `@rive-app/webgl2`, lite variants); performance and memory with 10 to 30 simultaneous instances on a phone; licensing and pricing tiers for a personal portfolio and whether runtime use is free; whether state machines can be driven from code and therefore from network events for shared props; and what the Rive MCP can do today (create files, edit artboards, author state machines, or only read). Also assess the pipeline from AI-generated raster art (ChatGPT, Nano Banana) into Rive: does Rive need vectors, or can it animate raster layers? Recommend Rive, a lighter alternative (Lottie, CSS sprite sheets, hand SVG animation), or a mix, and say which prop types belong in which.

## Answer

Resolved 2026-09-23 by a research subagent. Full note with sources on branch `research/rive-viability` at `docs/research/rive-viability.md` (commit e90fa8c).

Verified facts:
- Smallest web runtime is about 454 KB gzipped (`@rive-app/canvas-lite`: 95 KB JS plus 359 KB wasm, measured from v2.43.0). There is no webgl2-lite. Runtimes are MIT.
- Exporting `.riv` files for runtime use requires a paid plan (Cadet, $9 per seat per month, per rive.app docs).
- Rive publishes no multi-instance mobile benchmarks and warns against many WebGL contexts; the safe pattern is one offscreen renderer drawn into the scene canvas.
- State machines are fully code-drivable through the Data Binding API, so network events can drive shared props.
- The Rive MCP is a write-capable server inside the desktop editor (Early Access) that can create artboards, shapes, animations and state machines.
- Rive imports and animates PNG, WebP and PSD raster layers with bones and meshes, and images can be swapped at runtime, so AI-generated raster art does not need vectorising.

Subagent's recommendation: do not adopt Rive at launch. Build props canvas-native inside the scene's animation loop: procedural drawing for flicker, wheels and projector light; WebP sprite sheets for walk cycles and reels; state in plain JS so network events drive shared props directly. Reserve Rive for at most one future hero prop needing bone or mesh deformation, via `canvas-advanced-lite` rendered offscreen. Lottie is not recommended (dotlottie-web carries its own ~500 KB wasm; lottie-web adds a second animation model with no editor in this pipeline).

This contradicts the standing preference for Rive, so the choice is a decision for Joe, not this ticket. It graduates to a grilling ticket: [Rive, canvas-native, or a mix for animated props?](13-animation-approach.md).
