#!/usr/bin/env python3
"""The Foundry marquee's face (Joe, 2026-09-30): Doto, a dot-matrix font whose letters are rows of dots like a marquee's
bulbs, fixed at its roundest dots (ROND 100) and its black weight (wght 900). A canvas can't set a font's variation axes,
so the letter board (src/lib/engine/props.ts) draws this static instance. Its source is the latin subset of the
@fontsource-variable/doto package, OFL-1.1 (src/lib/fonts/OFL-Doto.txt). Needs fontTools and brotli:
python3 -m pip install fonttools brotli."""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
font = instantiateVariableFont(TTFont('node_modules/@fontsource-variable/doto/files/doto-latin-full-normal.woff2', recalcTimestamp=False), {'ROND': 100, 'wght': 900})
font.flavor = 'woff2'
font.save('src/lib/fonts/doto-marquee.woff2'); print('wrote src/lib/fonts/doto-marquee.woff2')
