# Issue 02 code review — 2026-09-24

Baseline: `b46dca2` (existing issue 03 work). Reviewed implementation commit `d04517f`, then the corrective working diff. Two independent reviewers ran under the implement skill's required code-review workflow.

## Standards

Initial findings:

- **[P2] Rig props omitted from overlap verdict.** `artProps` contained only static layers, so foreground over the moose or rider could receive a false pass against CONTEXT.md's rule that foreground never covers a prop.
- **Heuristic: duplicated rig composition knowledge.** Browser and composite renderers independently selected rig placement and draw order.
- **Heuristic: duplicated draft placement data.** Maplewood's scene module and manifest repeated rectangles, allowing foreground overlays to diverge from artwork.

Follow-up reviewer verification:

> Verified all three fixes in the diff and regenerated `review.json`:
>
> - Moose and rider now participate in overlap checks; rider bounds cover its full horizontal travel.
> - Browser and composites share rig placement and draw order.
> - Maplewood placements derive from the manifest; current overlays and rendered layer rectangles match.
>
> No remaining actionable findings from this standards review.

## Spec

No actionable issue 02 spec deviations found.

- **Missing/partial requirements:** None within the agreed starter scope. Generation, attached references, opening crops, magenta key/erosion/trim, WebP processing, both tile densities, separated moose/rider parts and pivots, scene-data overlays, phone framing, and the documented Claude/Codex workflow are implemented.
- **Unasked scope creep:** None. The broader seven-plate starter collection, furnishings, rig previews and composite review images support the user's explicit request for all scenes.
- **Implemented incorrectly:** None established. The reviewer inspected the Maplewood composite and full contact sheet, compared the prototype, and traced manifest-to-processing-to-review code.

Production placement, complete prop inventory, foreground integration and river alignment remain issues 04/05. The API fallback was not exercised; live Codex generation satisfies the primary path.

Standards: 3 initial findings (worst: P2), all resolved, 0 remaining. Spec: 0 findings.
