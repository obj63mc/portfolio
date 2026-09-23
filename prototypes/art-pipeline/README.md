# Art pipeline prototype (throwaway)

Answers wayfinder ticket 07 on the St. Louis cursor portfolio map: can AI-generated art hold the old Moosylvania flat vector style across a district and a sub-scene, do props cut cleanly, what resolution does the chosen world size need, and how much manual cleanup does each asset take.

Nothing here ships. The branch `prototype/art-pipeline` is the primary source; the ticket holds the verdict.

## Files

- `recipe.md`: the prompt recipe for ChatGPT and Nano Banana, the asset list with filenames, and the keying and WebP commands.
- `review.html`: single-file review harness. Double-click it. Loads the `assets/` folder, then judges style, scene fit at world scale and phone frame, prop edges under a device-accurate magnifier, the moose as a pivoted four-part rig, and writes the ticket answer.
- `assets/`: where generated images go (empty in the repo).
- `reference/`: old-site screenshots used as style references (not committed unless the repo is private).

## Checklist for Joe

The generation and the judgement are yours; the agent cannot drive ChatGPT or Nano Banana, and the go or no-go is a taste call.

1. Save two or three old Moosylvania site screenshots into `reference/`.
2. Work through `recipe.md` sections 1 to 4 in both tools. Save outputs under `assets/` with the given names. Keep a tally of retries and minutes of manual cleanup per asset.
3. Run the section 5 commands to key out magenta and write WebP.
4. Open `review.html`, load the `assets/` folder, and go tab by tab. In Scene, drag the arrival marker onto the welcome sign and confirm the signpost fits the portrait phone frame. In Moose, place the four parts, set pivots, and play the reactions.
5. On the Verdict tab fill in the criteria, tool per asset and cleanup minutes, then copy the generated markdown into `.scratch/stl-cursor-portfolio/issues/07-art-pipeline-prototype.md` under `## Answer`, or hand it to the next `/wayfinder` session to record.
6. Commit the kept assets and the rig JSON to this branch so the rendering prototype (ticket 08) can reuse them.
