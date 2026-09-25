#!/usr/bin/env python3
"""Paste the section fixes back onto the overworld master.

For each section in sections.json, in order:
  NN-name-fixed.png   a hand-fixed copy of NN-name.png: pasted whole (edit it in place, same size)
  NN-name-out.png     a model output (any size): resized to the section and pasted only inside NN-name-mask.png
Usage: python3 assemble.py <master.webp> <out.png> [section-name ...]
"""
import json, os, sys
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
master = Image.open(sys.argv[1]).convert('RGB')
only = set(sys.argv[3:])
for s in json.load(open(f'{D}/sections.json')):
    key = f"{s['n']}-{s['name']}"
    if only and s['name'] not in only and key not in only: continue
    x, y, w, h = s['rect']; box = (x, y, min(master.width, x + w), min(master.height, y + h)); w, h = box[2] - x, box[3] - y
    fixed, out = f'{D}/{key}-fixed.png', f'{D}/{key}-out.png'
    if os.path.exists(fixed):
        master.paste(Image.open(fixed).convert('RGB').resize((w, h), Image.LANCZOS), box); print(key, 'hand fix pasted whole')
    elif os.path.exists(out):
        patch = Image.open(out).convert('RGB').resize((w, h), Image.LANCZOS)
        mask = Image.open(f'{D}/{key}-mask.png').convert('L').resize((w, h)).filter(ImageFilter.GaussianBlur(1.5))
        master.paste(patch, box, mask); print(key, 'model output pasted inside mask')
    else: print(key, 'no fix, kept')
master.save(sys.argv[2])
