# Can AI-generated art hold the Moosylvania style consistently across scenes?

Type: prototype
Status: open
Part of: ../map.md
Blocked by: 06, 13

## Question

Generate one district (Maplewood is the richest) and one sub-scene interior using ChatGPT and Nano Banana with the old Moosylvania site as a style reference. Produce a large WebP background, three cut-out transparent props, and one animated prop. Judge: style consistency between the two scenes, whether props cut cleanly, resolution needed at the chosen world size, and how much manual cleanup each asset took. Output: the assets, a repeatable prompt recipe, and a go or no-go on the pipeline. The world size comes from the layout ticket; the animation tool comes from the Rive ticket.

## Comments

2026-09-23, from the animation approach ticket (13): props are canvas-native, no Rive. The "one animated prop" here must be delivered as separated transparent WebP parts with a pivot each (use the moose: body, head, antlers, eye) so the prototype tests whether ChatGPT and Nano Banana can produce clean, style-consistent parts. That is the pipeline's hardest ask and the go or no-go should weigh it. See ADR 0002.
