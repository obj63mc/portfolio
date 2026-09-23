# Canvas-native props, Rive not adopted

Animated props are drawn by the scene's own canvas loop: a prop is one or more transparent WebP layers with a pivot each, tweened in code, with a sprite sheet only where a frame cycle is unavoidable. We chose this over Rive, the animation tool Joe's teams already use, because no prop in the inventory needs bone or mesh deformation, the smallest Rive web runtime is about 454 KB gzipped before any art, and its editor and MCP sit on a paid plan ($17 per seat per month, or $108 a year) while the free CLI is a technical preview. The cost is that moving props must be produced as separated parts by the AI art pipeline, and ambient motion is limited to what pivoted layers and frame cycles can express.

## Consequences

- A prop may be built in Rive only when it needs bone or mesh deformation that pivoted layers cannot fake, and it lives in a sub-scene, so the runtime loads lazily and the overworld never pays for it. Tool subscriptions used while authoring assets are outside the $25 per month hosting ceiling, so a paid Rive plan is permitted for authoring; the runtime is MIT and exported files keep working after a plan lapses.
- The art pipeline must deliver moving props as separated transparent parts (for the moose: body, head, antlers, eye).
- Shared prop sequences such as the Foundry screen are timelines in plain code driven from the server's time, not animation files.
