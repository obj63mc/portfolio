#!/bin/zsh
# Upscale a scene's native stitched master 4x with Real-ESRGAN and install it as <scene>-master, then re-derive every asset
# the manifest derives from it (the background plate and its measured mattes), sync the overworld's world rects into
# src/lib/scenes/overworld.ts and validate. Codex extractions whose crop the round changed are listed for regeneration.
# Usage: [SCENE=<id>] scripts/art/overworld/install-master.sh <round> ["note for the derivation record"]
#   e.g. scripts/art/overworld/install-master.sh fifteen "Round fifteen redrew ... (rounds/round-15.json)."
#        SCENE=foundry scripts/art/overworld/install-master.sh 1 "Round one hung the three posters (rounds/round-1.json)."
# Needs Upscayl (UPSCAYL=<Upscayl.app>/Contents/Resources to override the default install path).
set -e; setopt pipefail
cd "$(dirname "$0")/../../.."
ROUND=${1:?usage: install-master.sh <round> [note]}; NOTE=${2:-}; SCENE=${SCENE:-overworld}; MASTER=$SCENE-master
UP=${UPSCAYL:-/Applications/Upscayl.app/Contents/Resources}; FIX=art/sources/$SCENE-fix; NATIVE=$FIX/stitched.png
SIZE=$(magick identify -format "%w x %h" $NATIVE)
RUN=art/runs/$MASTER/$(date -u +%Y-%m-%dT%H-%M-%S.000Z)-upscale-4x; mkdir -p $RUN/tiles
cp $NATIVE $RUN/native.png
$UP/bin/upscayl-bin -i $NATIVE -o $RUN/source.png -s 4 -m $UP/models -n digital-art-4x >/dev/null 2>&1
magick identify -format "4x source %wx%h\n" $RUN/source.png
# The run keeps the tool, the specs and the tile prompts beside the pixels it installed.
cp scripts/art/overworld/tiles.py $FIX/tilemap.json(N) $FIX/rounds/round-*.json(N) $RUN/; prompts=($FIX/tiles/*-prompt.txt(N)); (( $#prompts )) && cp $prompts $RUN/tiles/
PREV=$(mktemp); cp art/generated/$MASTER/prompt.txt $PREV
{ echo "${(U)SCENE} MASTER DERIVATION, $(date -u +%Y-%m-%d) (round $ROUND, upscaled 4x for the background)"; echo
  [[ -n $NOTE ]] && { echo "$NOTE"; echo; }
  echo "The retained image is $NATIVE, the native $SIZE master after the tile-map rounds (round specs in $FIX/rounds/), upscaled 4x by Real-ESRGAN: Upscayl upscayl-bin, model digital-art-4x. No model redraw; the upscaler only adds resolution. The $SCENE plate, its tiles and the master-derived mattes are cut from this 4x source. Every later fix is made on the native stitched.png and re-upscaled."; echo
  cat $PREV; } > $RUN/prompt.txt
npm run -s art -- process $MASTER --source $RUN/source.png --force
cp $RUN/prompt.txt art/generated/$MASTER/prompt.txt
ROUND=$ROUND MASTER=$MASTER SIZE=$SIZE python3 - "$RUN" "$NATIVE" <<'PY'
import hashlib, json, os, sys
run, native = sys.argv[1:3]; h = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
d = {"sourceSha256": h(run + '/source.png'), "run": run, "provider": "derived",
     "derivation": {"operation": "real-esrgan-4x", "base": f"{native} (native {os.environ['SIZE']}, tile-map round {os.environ['ROUND']})",
                    "baseSha256": h(run + '/native.png'), "upscaler": "Upscayl upscayl-bin, model digital-art-4x, scale 4",
                    "script": "scripts/art/overworld/install-master.sh"},
     "note": "Prompt references use <repo> as the repository root. Run files and original PNG remain local."}
p = f"art/generated/{os.environ['MASTER']}/provenance.json"; json.dump(d, open(p, 'w'), indent=2); open(p, 'a').write('\n')
PY
for a in $(node -e "for (const a of require('./art/manifest.json').assets) if (a.deriveFrom === '$MASTER') console.log(a.id)"); do npm run -s art -- generate $a --force; done
[[ $SCENE == overworld ]] && python3 scripts/art/overworld/sync-geometry.py
# A Codex extraction was drawn from the old pixels of its crop: if the round changed them, it no longer matches the plate.
[[ -f $FIX/tilemap.json ]] && python3 - "$FIX/$(node -p "require('./$FIX/tilemap.json').base")" "$NATIVE" "$MASTER" <<'PY'
import json, sys
from PIL import Image, ImageChops
base, now, master = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB'), sys.argv[3]
m = json.load(open('art/manifest.json')); world = next(a['world'] for a in m['assets'] if a['id'] == master); sx, sy = now.width / world['w'], now.height / world['h']
for a in m['assets']:
    r = (a.get('registration') or {}).get('rect')
    if a.get('deriveFrom') or not r or a['registration']['asset'] != master: continue
    box = (int(r['x'] * sx), int(r['y'] * sy), int((r['x'] + r['w']) * sx + 1), int((r['y'] + r['h']) * sy + 1))
    if ImageChops.difference(base.crop(box), now.crop(box)).getbbox():
        print(f"STALE {a['id']}: this round changed its crop; npm run art -- generate {a['id']} --force --keep-masters, then judge it")
        for c in m['assets']:  # a matte cut from that extraction (the Brennan's humidor from its casework) follows it
            if c.get('deriveFrom') == a['id']: print(f"STALE {c['id']}: derived from {a['id']}; npm run art -- generate {c['id']} --force after it")
PY
npm run -s art:validate
echo "Installed. Next: npm run art:review, read the mattes over the plate in art/review.html, record the round under art/reviews/."
