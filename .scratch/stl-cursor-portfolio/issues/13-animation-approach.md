# Rive, canvas-native, or a mix for animated props?

Type: grilling
Status: open
Part of: ../map.md

## Question

The Rive research found the runtime costs about 454 KB gzipped, runtime export needs a $9/month Cadet plan, mobile multi-instance performance is unbenchmarked, but raster art animates fine and the MCP can author state machines. The subagent recommends canvas-native props (procedural drawing plus WebP sprite sheets) with Rive reserved for one hero prop. Joe's standing preference is Rive via its MCP for a Cursor Camp feel. Decide: Rive for all animated props, canvas-native for all, or a mix with a stated rule for which prop goes where. Weigh authoring speed and the MCP workflow against bundle size, phone performance and the monthly cost against the $25 ceiling. Output: the animation approach and, if a mix, the rule, so the art pipeline and rendering prototypes know what to build.

## Comments

2026-09-23, from the shared-props ticket (10): the Foundry screen plays a timed sequence (projector lights up, "Now Showing", title logo, image and text, fade out) driven by a title id from the server. It is the leading candidate for the single hero animated prop the Rive research recommended. Decide with that in view.
