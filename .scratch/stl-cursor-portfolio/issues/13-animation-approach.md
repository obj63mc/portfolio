# Rive, canvas-native, or a mix for animated props?

Type: grilling
Status: resolved
Part of: ../map.md

## Question

The Rive research found the runtime costs about 454 KB gzipped, runtime export needs a $9/month Cadet plan, mobile multi-instance performance is unbenchmarked, but raster art animates fine and the MCP can author state machines. The subagent recommends canvas-native props (procedural drawing plus WebP sprite sheets) with Rive reserved for one hero prop. Joe's standing preference is Rive via its MCP for a Cursor Camp feel. Decide: Rive for all animated props, canvas-native for all, or a mix with a stated rule for which prop goes where. Weigh authoring speed and the MCP workflow against bundle size, phone performance and the monthly cost against the $25 ceiling. Output: the animation approach and, if a mix, the rule, so the art pipeline and rendering prototypes know what to build.

## Answer

Resolved 2026-09-23 in a grilling session. Recorded as [ADR 0002, Canvas-native props, Rive not adopted](../../../docs/adr/0002-canvas-native-props.md).

**Decision: canvas-native for every prop at launch. Rive is not adopted.**

- Every prop is drawn by the scene's canvas loop. Moving props are separated transparent WebP layers with a pivot each (moose: body, head, antlers, eye; rider: body, wheels), tweened in code. Sprite sheets only where a frame cycle is unavoidable. Non-moving props are single images with hover feedback.
- What Joe wants from "Cursor Camp feel" is lively reactions plus a few ambient loops, with some character-style life done simply through pivoted layers, not rigs.
- Props with motion today: the track rider (ambient), the Foundry marquee (ambient), the Foundry screen sequence (shared prop, a timeline in code driven from server time), the moose (stands and reacts: head turn, antler wobble), the MonsterCommerce eye (blink on click), and the Side Project bottles (a glint along the shelf). More may be added later.
- Admission rule for Rive, should a future prop need it: it needs bone or mesh deformation that pivoted layers cannot fake, and it lives in a sub-scene so the runtime loads lazily and the overworld first paint stays runtime-free. Authoring tooling is Joe's choice: the free CLI works without a plan, and a paid editor plan is allowed because tool subscriptions during asset creation are outside the $25 per month hosting ceiling.
- Reduced motion: ambient motion freezes on a resting frame, click reactions still play, hover reactions become a plain highlight.
- Glossary: **ambient motion** and **reaction** added to `CONTEXT.md`.

Why not Rive: nothing in the inventory needs a rig; the smallest runtime is 454 KB gzipped before art; the MCP requires the Early Access app, which is Cadet or above ($17 per seat monthly, $108 a year); the free CLI is a technical preview. Rive's pull was team familiarity and the MCP, and neither outweighs those costs for zero rig-worthy props.

## Comments

2026-09-23, from the shared-props ticket (10): the Foundry screen plays a timed sequence (projector lights up, "Now Showing", title logo, image and text, fade out) driven by a title id from the server. It is the leading candidate for the single hero animated prop the Rive research recommended. Decide with that in view.

2026-09-23, fact-check by a research subagent during this ticket (primary sources):
- Cadet at $9/seat/month is the annual-billed rate ($108 upfront). Monthly billing is $17/seat/month (rive.app/docs/account-admin/pricing).
- The Rive CLI / RML technical preview builds runtime-loadable `.riv` files locally with no sign-in, no license key and no plan (rive.app/docs/cli/getting-started). Only `--publish` needs a login; files with Luau scripts must be published to run on the web, and Free-plan published files carry a Rive splash screen. Script-free `.riv` files built locally have no watermark.
- The Rive MCP needs the Early Access desktop app, which is available only to Cadet, Voyager and Enterprise customers. So the MCP is effectively paid.
- Exported `.riv` files do not phone home and keep working in the MIT runtime after a plan lapses (community announcements, wording confirmed via search snippets only).
