#!/bin/zsh
# Upscale the native stitched master 4x with Real-ESRGAN and install it as overworld-master, then re-derive the plate, its
# tiles and the five master-derived mattes, sync their world rects into src/lib/scenes/overworld.ts and validate.
# Usage: scripts/art/overworld/install-master.sh <round> ["note for the derivation record"]
#   e.g. scripts/art/overworld/install-master.sh fifteen "Round fifteen redrew ... (rounds/round-15.json)."
# Needs Upscayl (UPSCAYL=<Upscayl.app>/Contents/Resources to override the default install path).
set -e; setopt pipefail
cd "$(dirname "$0")/../../.."
ROUND=${1:?usage: install-master.sh <round> [note]}; NOTE=${2:-}
UP=${UPSCAYL:-/Applications/Upscayl.app/Contents/Resources}; FIX=art/sources/overworld-fix; NATIVE=$FIX/stitched.png
RUN=art/runs/overworld-master/$(date -u +%Y-%m-%dT%H-%M-%S.000Z)-upscale-4x; mkdir -p $RUN/tiles
cp $NATIVE $RUN/native.png
$UP/bin/upscayl-bin -i $NATIVE -o $RUN/source.png -s 4 -m $UP/models -n digital-art-4x >/dev/null 2>&1
magick identify -format "4x source %wx%h\n" $RUN/source.png
# The run keeps the tool, the specs and the tile prompts beside the pixels it installed.
cp scripts/art/overworld/tiles.py $FIX/tilemap.json $FIX/rounds/round-*.json $RUN/; cp $FIX/tiles/*-prompt.txt $RUN/tiles/ 2>/dev/null || true
PREV=$(mktemp); cp art/generated/overworld-master/prompt.txt $PREV
{ echo "OVERWORLD MASTER DERIVATION, $(date -u +%Y-%m-%d) (round $ROUND, upscaled 4x for the background)"; echo
  [[ -n $NOTE ]] && { echo "$NOTE"; echo; }
  echo "The retained image is $NATIVE, the native 1983 x 793 master after the tile-map rounds (round specs in $FIX/rounds/), upscaled 4x to 7932 x 3172 by Real-ESRGAN: Upscayl upscayl-bin, model digital-art-4x. No model redraw; the upscaler only adds resolution. The overworld plate, its tiles and the five master-derived mattes are cut from this 4x source. Every later fix is made on the native stitched.png and re-upscaled."; echo
  cat $PREV; } > $RUN/prompt.txt
npm run -s art -- process overworld-master --source $RUN/source.png --force
cp $RUN/prompt.txt art/generated/overworld-master/prompt.txt
ROUND=$ROUND python3 - "$RUN" "$NATIVE" <<'PY'
import hashlib, json, os, sys
run, native = sys.argv[1:3]; h = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
d = {"sourceSha256": h(run + '/source.png'), "run": run, "provider": "derived",
     "derivation": {"operation": "real-esrgan-4x", "base": f"{native} (native 1983 x 793, tile-map round {os.environ['ROUND']})",
                    "baseSha256": h(run + '/native.png'), "upscaler": "Upscayl upscayl-bin, model digital-art-4x, scale 4",
                    "script": "scripts/art/overworld/install-master.sh"},
     "note": "Prompt references use <repo> as the repository root. Run files and original PNG remain local."}
p = 'art/generated/overworld-master/provenance.json'; json.dump(d, open(p, 'w'), indent=2); open(p, 'a').write('\n')
PY
npm run -s art -- generate overworld --force
for a in eads-bridge maplewood-tree park-tree marquee-bulbs mc-sign; do npm run -s art -- generate $a --force; done
python3 scripts/art/overworld/sync-geometry.py
npm run -s art:validate
echo "Installed. Next: npm run art:review, read the bridge matte over the plate, record the round under art/reviews/."
