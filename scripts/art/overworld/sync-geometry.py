#!/usr/bin/env python3
"""Copy each master-derived extraction's world rect (art/generated/overworld/<id>/asset.json) into src/lib/scenes/overworld.ts.
Run after the overworld master and its extractions are re-derived (install-master.sh does)."""
import json, os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
p = 'src/lib/scenes/overworld.ts'; s = open(p).read()
def rect(id):
    w = json.load(open(f'art/generated/overworld/{id}/asset.json'))['world']
    x, y = int(w['x']), int(w['y']); return f"{{ x: {x}, y: {y}, w: {int(w['x'] + w['w'] + 0.999) - x}, h: {int(w['y'] + w['h'] + 0.999) - y} }}"
for id in ['mc-sign', 'server-rack', 'bike', 'ride-sign', 'welcome']:
    s, n = re.subn(rf"(id: '{id}',(?:.|\n)*?rect: )\{{[^}}]*\}}", lambda m: m.group(1) + rect(id), s, count=1); assert n == 1, id
for key in ['maplewood-tree', 'park-tree']:
    s, n = re.subn(rf"(key: '{key}', rect: )\{{[^}}]*\}}", lambda m: m.group(1) + rect(key), s); assert n == 1, key
s, n = re.subn(r"(bridge: \{ key: 'eads-bridge', rect: )\{[^}]*\}", lambda m: m.group(1) + rect('eads-bridge'), s); assert n == 1
open(p, 'w').write(s); print('synced', p)
