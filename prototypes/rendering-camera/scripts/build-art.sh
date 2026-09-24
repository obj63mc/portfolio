#!/usr/bin/env bash
# PROTOTYPE, throwaway. Builds placeholder scene art for the rendering prototype from the
# ticket 07 assets: a 5400x2700 overworld (Maplewood is real art, the other districts are
# hue-shifted copies) and the 2845x1600 lobby, cut into 512 world px tiles at two densities
# (image px per world px): 1.25 for phones at 0.6 x DPR 2, and 2 for desktop at DPR 2.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=../art-pipeline/assets
OUT=static/art
TMP=$(mktemp -d)
rm -rf "$OUT" && mkdir -p "$OUT/props"
cp "$SRC"/{signpost,welcome,door,moose-body,moose-head,moose-antlers,moose-eye}.webp "$OUT/props/"

D=2 # compose at 2 image px per world px
w() { echo $(( $1 * D )); }

# district stand-ins: Maplewood at full size, the rest hue-shifted and smaller
magick "$SRC/maplewood@2x.webp" -resize "$(w 1400)x$(w 933)!" "$TMP/maplewood.png"
magick "$SRC/maplewood@2x.webp" -resize "$(w 1100)x$(w 733)!" -modulate 100,95,70 "$TMP/cwe.png"
magick "$SRC/maplewood@2x.webp" -resize "$(w 1100)x$(w 733)!" -modulate 100,95,130 "$TMP/midtown.png"
magick "$SRC/maplewood@2x.webp" -resize "$(w 1100)x$(w 733)!" -modulate 95,80,160 "$TMP/belleville.png"


magick -size "$(w 5400)x$(w 2700)" xc:'#a9cf86' \
  -fill '#7fb862' -draw "rectangle $(w 1510),0 $(w 1640),$(w 2700)" \
  -fill '#8d8d86' -draw "rectangle 0,$(w 1020) $(w 5400),$(w 1080)" \
  -fill '#5e9fd3' -draw "rectangle $(w 4000),0 $(w 4200),$(w 2700)" \
  -fill '#b9a27f' -draw "rectangle $(w 4000),$(w 1010) $(w 4200),$(w 1090)" \
  -fill none -stroke '#c9ccd1' -strokewidth $(w 14) -draw "path 'M $(w 3860),$(w 1600) Q $(w 3930),$(w 1000) $(w 3990),$(w 1600)'" \
  -stroke none -fill '#6aa84f' -draw "roundrectangle $(w 1900),$(w 1550) $(w 3300),$(w 2483) $(w 60),$(w 60)" \
  -fill none -stroke '#e9e4d6' -strokewidth $(w 22) -draw "ellipse $(w 2600),$(w 2010) $(w 520),$(w 300) 0,360" \
  -stroke none \
  "$TMP/maplewood.png" -geometry +$(w 100)+$(w 900) -composite \
  "$TMP/cwe.png" -geometry +$(w 1700)+$(w 200) -composite \
  "$TMP/midtown.png" -geometry +$(w 2850)+$(w 200) -composite \
  "$TMP/belleville.png" -geometry +$(w 4250)+$(w 600) -composite \
  -font /System/Library/Fonts/Supplemental/Arial.ttf -fill '#1d2b3a' -pointsize $(w 44) \
  -annotate +$(w 1720)+$(w 190) 'Central West End (placeholder art)' \
  -annotate +$(w 2870)+$(w 190) 'Midtown (placeholder art)' \
  -annotate +$(w 4270)+$(w 590) 'Belleville (placeholder art)' \
  -annotate +$(w 1920)+$(w 1540) 'Carondelet Park (placeholder art)' \
  -annotate +$(w 3780)+$(w 1660) 'Arch' \
  -annotate +$(w 1520)+$(w 700) 'Forest Park' \
  -depth 8 "$TMP/overworld.png"

magick "$SRC/lobby.webp" -resize "$(w 2845)x$(w 1600)!" -depth 8 "$TMP/lobby.png"

tile() { # scene density
  local scene=$1 dens=$2 dir px; dir="$OUT/$1/$2"
  px=$(awk "BEGIN{print int(512*$dens)}")
  mkdir -p "$dir"
  if [ "$dens" = "2" ]; then cp "$TMP/$scene.png" "$TMP/$scene-$dens.png"
  else magick "$TMP/$scene.png" -resize "$(awk "BEGIN{print $dens/2*100}")%" "$TMP/$scene-$dens.png"; fi
  magick "$TMP/$scene-$dens.png" -crop "${px}x${px}" +repage -quality 82 "$dir/t_%d.webp"
}

for s in overworld lobby; do for d in 1.25 2; do tile $s $d; done; done

cat > "$OUT/manifest.json" <<JSON
{
  "tile": 512,
  "scenes": {
    "overworld": { "w": 5400, "h": 2700, "cols": 11, "rows": 6 },
    "lobby": { "w": 2845, "h": 1600, "cols": 6, "rows": 4 }
  },
  "densities": [1.25, 2]
}
JSON
rm -rf "$TMP"
du -sh "$OUT"/*/* | sort -k2
