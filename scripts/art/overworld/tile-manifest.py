#!/usr/bin/env python3
"""Write the Codex manifest for one tile-map round, after `tiles.py prepare`, and print the commands that run it.

  python3 scripts/art/overworld/tile-manifest.py rounds/round-15.json [variants, default abc]

Each tile of the round becomes one asset per variant (overworld-fix-r<N>-<tile><v>) whose references are the tile and
its red-outlined copy, and whose prompt is the preamble, the tile's numbered fix list and a strict-registration line
(naming the tile's optional "keep" text, the objects that must not move). The manifest is written next to the spec as
rounds/codex-<N>.json. Outputs land in art/sources/overworld-fix-r<N>-<tile><v>.png; copy the one you keep to
tiles/t-<tile>-model.png, then run tiles.py stitch (its drift check rejects a zoomed or panned output)."""
import json, os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
D = f'{ROOT}/art/sources/overworld-fix'
PRE = ("REGIONAL FIX of one tile of a flat-colour isometric illustrated city map. Reference 1 is the tile, an exact crop of the "
       "approved master. Reference 2 is the same tile with the areas to change outlined in red. Output reference 1 pixel for "
       "pixel: same framing, scale, camera, palette and line weight, with no changes outside the red outlines. Do not zoom, crop, "
       "pan or rescale: every building, tree and path outside the outlines stays in the same place at the same size. Inside the "
       "outlines make only the listed changes. Every object inside an outline is complete: whole trees, whole bushes, whole "
       "buildings, never cut. Every road or footpath inside an outline runs continuously and joins the roads outside it cleanly, "
       "never ending in lawn. Never draw the red outlines. Do not add signs or lettering. Fill the canvas edge to edge.")
# The Codex image tool returns one of these native canvases; pick the one nearest the tile's aspect ratio.
CANVASES = {'1024x1024': 1.0, '1536x1024': 1.5, '1983x793': 2.5}

spec_path = sys.argv[1] if os.path.exists(sys.argv[1]) else f'{D}/{sys.argv[1]}'
variants = sys.argv[2] if len(sys.argv) > 2 else 'abc'
spec = json.load(open(spec_path)); n = spec['round']; assets = []
for name, t in spec['tiles'].items():
    x, y, w, h = t['rect']; size = min(CANVASES, key=lambda c: abs(CANVASES[c] - w / h))
    keep = t.get('keep', 'every building, sign, tree and road outside the outlines')
    reg = (f"STRICT REGISTRATION: the output is the same {w} x {h} area as reference 1 at the same scale: {keep} stay at exactly "
           "the same pixel positions and sizes. Do not zoom in, do not enlarge anything, do not pan.")
    fixes = '\n'.join(f'{i + 1}. {f}' for i, f in enumerate(t['fixes']))
    for v in variants:
        assets.append({'id': f'overworld-fix-r{n}-{name}{v}', 'kind': 'reference', 'scene': 'overworld', 'size': size,
                       'references': [f'art/sources/overworld-fix/tiles/t-{name}.png', f'art/sources/overworld-fix/tiles/t-{name}-marked.png'],
                       'prompt': f'{PRE}\n{fixes}\n{reg}'})
out = f'{D}/rounds/codex-{n}.json'
json.dump({'version': 1, 'style': 'art/style.txt', 'references': [], 'assets': assets}, open(out, 'w'), indent=1)
rel = os.path.relpath(out, ROOT); print('wrote', rel)
for a in assets: print(f"npm run art -- generate {a['id']} --manifest {rel} --force")
