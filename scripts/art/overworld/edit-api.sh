#!/bin/zsh
# Run this round's tiles through gpt-image-2.5 Sunburst (the precision-editing variant) at max quality on the Images API
# edit endpoint, masked so only the marked areas are repainted. Needs OPENAI_API_KEY in the environment; it is never
# written to a file. Usage: [SCENE=<id>] scripts/art/overworld/edit-api.sh [tile-name ...]   e.g. ... lake bridge
set -e; cd "$(dirname "$0")/../../../art/sources/${SCENE:-overworld}-fix"  # the scene's data: tilemap.json and tiles/
: "${OPENAI_API_KEY:?export OPENAI_API_KEY first}"
MODEL=${IMAGE_MODEL:-gpt-image-2.5-sunburst}; QUALITY=${IMAGE_QUALITY:-max}
names=("$@"); [[ ${#names} -eq 0 ]] && names=($(python3 -c "import json; print(' '.join(t['name'] for t in json.load(open('tilemap.json'))['tiles']))"))
for n in $names; do
  t=tiles/t-$n; read w h <<< "$(magick identify -format '%w %h' $t.png)"; W=$((w*2)); H=$((h*2))
  magick $t.png -filter Lanczos -resize ${W}x${H}! /tmp/t-$n-2x.png
  magick $t-marked.png -filter Lanczos -resize ${W}x${H}! /tmp/t-$n-marked-2x.png
  # API mask: transparent = repaint. Ours is white = repaint, so it becomes the inverted alpha of the tile.
  magick /tmp/t-$n-2x.png \( $t-mask.png -resize ${W}x${H}! -negate \) -alpha off -compose CopyOpacity -composite /tmp/t-$n-mask.png
  echo "$n -> $MODEL quality=$QUALITY ${W}x${H}"
  curl -sS https://api.openai.com/v1/images/edits -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F model=$MODEL -F quality=$QUALITY -F size=${W}x${H} -F n=1 -F "image[]=@/tmp/t-$n-2x.png" -F "image[]=@/tmp/t-$n-marked-2x.png" \
    -F "mask=@/tmp/t-$n-mask.png" -F "prompt=<$t-prompt.txt" -o /tmp/t-$n.json
  python3 -c "import json,base64,sys; d=json.load(open('/tmp/t-$n.json')); (print('ERROR', d['error']) or sys.exit(1)) if 'error' in d else open('$t-model.png','wb').write(base64.b64decode(d['data'][0]['b64_json']))"
  rm -f /tmp/t-$n-2x.png /tmp/t-$n-marked-2x.png /tmp/t-$n-mask.png /tmp/t-$n.json
done
echo "now: SCENE=${SCENE:-overworld} python3 scripts/art/overworld/tiles.py stitch"
