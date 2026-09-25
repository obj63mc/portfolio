#!/bin/zsh
# Re-run the section fixes on the Images API with gpt-image-2.5 Sunburst (precision editing) at max quality,
# masked so only the circled areas are repainted. Needs OPENAI_API_KEY in the environment; never write it to a file.
# Usage: ./run-api.sh [section-key ...]      e.g. ./run-api.sh 04-riverfront-stadium
set -e
cd "$(dirname "$0")"
: "${OPENAI_API_KEY:?export OPENAI_API_KEY first}"
MODEL=${IMAGE_MODEL:-gpt-image-2.5-sunburst}; QUALITY=${IMAGE_QUALITY:-max}
keys=("$@"); [[ ${#keys} -eq 0 ]] && keys=(01-maplewood 02-moosylvania-cwe 03-park-lake 04-riverfront-stadium 05-ferris-eads-west 06-eads-east 07-belleville)
for k in $keys; do
  read w h <<< "$(magick identify -format '%w %h' $k.png)"; W=$((w*2)); H=$((h*2))
  magick $k.png -filter Lanczos -resize ${W}x${H}! /tmp/fix-$k-2x.png
  # API masks: transparent = repaint. Our masks are white = repaint, so invert into alpha.
  magick $k-mask.png -resize ${W}x${H}! -negate /tmp/fix-$k-alpha.png
  magick /tmp/fix-$k-2x.png /tmp/fix-$k-alpha.png -alpha off -compose CopyOpacity -composite /tmp/fix-$k-mask.png
  echo "$k -> $MODEL/$QUALITY ${W}x${H}"
  curl -sS https://api.openai.com/v1/images/edits -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F model=$MODEL -F quality=$QUALITY -F size=${W}x${H} -F "image[]=@/tmp/fix-$k-2x.png" -F "image[]=@$k-marked.png" \
    -F "mask=@/tmp/fix-$k-mask.png" -F "prompt=<$k-prompt.txt" -o /tmp/fix-$k.json
  python3 -c "import json,base64,sys; d=json.load(open('/tmp/fix-$k.json')); sys.exit(print(d['error']) or 1) if 'error' in d else open('$k-out.png','wb').write(base64.b64decode(d['data'][0]['b64_json']))"
  rm -f /tmp/fix-$k-2x.png /tmp/fix-$k-alpha.png /tmp/fix-$k-mask.png /tmp/fix-$k.json
done
echo "now: python3 assemble.py ../../generated/overworld-master/image.webp master-fixed.png"
