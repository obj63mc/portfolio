# Issue 02 location-fidelity code review

Fixed point: `0de5e05fdecdfbc82dd8983da1e818ff8b225720`. Main implementation: `20bc1ac`. Standards and spec were reviewed independently using the code-review skill.

## Standards

The initial review found three issues, all corrected:

- Foreground acceptance language conflicted with the domain rule. The stationary Brennan's cabinet is now scenery; its unobscured upper glass face is a separate prop. Foreground/prop bounds are validated, including the full horizontal travel of moose/rider placements.
- Missing derivative provenance could bypass stale-master detection after offline reprocessing. Matching evidence now survives reprocessing; missing, mismatched or stale evidence fails validation.
- Opening and registration crops duplicated coordinate conversion. Both now use one crop function based on actual source dimensions and world origin.

A follow-up confirmed the original findings were addressed and found that moving rig placements were absent from the new overlap validator. Rig rectangles and their travel bounds were added, with a regression covering an overlap that occurs only during travel.

Final verification: three raster tests pass, covering placement/trim, source alpha and provenance, and scenery versus interactive-prop/rig overlap. Art typechecking and all 41 assets/372 tiles pass validation.

## Spec

The independent spec review found no actionable gaps, scope creep or incorrect implementation. It compared the contact sheet and overworld composite with selected actual Moosylvania, Side Project, Brennan's, Alamo and SLU photographs. The recognizable room details, cinema seat orientation, bar/monitor placement and separate Arch lawn match the requested direction. Maplewood is within the overworld; the SLU room uses McDonnell Douglas Hall.

Production artwork promotion, hit-target reconciliation and river geometry remain the explicitly separate issues 04/05.

Standards: four findings resolved, none outstanding. Spec: zero findings.
