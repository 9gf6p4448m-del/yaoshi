# -*- coding: utf-8 -*-
"""把一疊 PNG 拼成 contact sheet（美術甲卷 A6 的人眼對照用）。

跑法：python tests/tools/art-a-sheet.py <out.png> <cols> <每格寬> <png|dir> [<png|dir> ...]
  - 給目錄＝把目錄裡的 *.png 依檔名排序全收
  - 每格等比縮到指定寬度，格子下方印檔名（不裝字型時用 PIL 預設點陣字）
"""
import os
import sys

from PIL import Image, ImageDraw


def collect(args):
    files = []
    for a in args:
        if os.path.isdir(a):
            files += [os.path.join(a, f) for f in sorted(os.listdir(a)) if f.lower().endswith(".png")]
        else:
            files.append(a)
    return files


def main():
    out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    files = collect(sys.argv[4:])
    if not files:
        raise SystemExit("no input png")
    thumbs = []
    for f in files:
        im = Image.open(f).convert("RGB")
        h = max(1, round(im.height * cw / im.width))
        thumbs.append((os.path.basename(f), im.resize((cw, h), Image.LANCZOS)))
    ch = max(t[1].height for t in thumbs)
    lab = 14
    rows = (len(thumbs) + cols - 1) // cols
    pad = 4
    sheet = Image.new("RGB", (cols * (cw + pad) + pad, rows * (ch + lab + pad) + pad), (18, 16, 24))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(thumbs):
        x = pad + (i % cols) * (cw + pad)
        y = pad + (i // cols) * (ch + lab + pad)
        sheet.paste(im, (x, y))
        d.text((x + 2, y + ch + 2), name[:34], fill=(200, 195, 210))
    sheet.save(out)
    print(out, sheet.size, len(thumbs), "tiles")


if __name__ == "__main__":
    main()
