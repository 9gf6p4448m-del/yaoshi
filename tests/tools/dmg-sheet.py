# -*- coding: utf-8 -*-
"""傷害可讀性批 2-a（v0.49）R7：把 dmg-readability.mjs pix 模式拍的凍幀拼成一張 contact sheet。

用法：
    python tests/tools/dmg-sheet.py <pix 輸出目錄> <輸出 png> [格子清單 json]

格子＝六張：命中前／閃紅瞬間／跳字彈出／量表殘影／擊殺跳字／SKIP 後乾淨。
每一格底下的圖說寫的是治具當場記在 pix.json 的東西（檔名、量到的紅偏量或對比度），
不是事後回想的。需要 Pillow。
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for p in (r"C:\Windows\Fonts\msjh.ttc", r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simsun.ttc"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main():
    src, out = sys.argv[1], sys.argv[2]
    cells = json.load(open(sys.argv[3], encoding="utf-8")) if len(sys.argv) > 3 else json.load(open(os.path.join(src, "sheet-cells.json"), encoding="utf-8"))
    cols, pad, capH = 2, 10, 46
    imgs = []
    for c in cells:
        p = os.path.join(src, "frames", c["file"]) if not os.path.isabs(c["file"]) else c["file"]
        if not os.path.exists(p):
            p = os.path.join(src, c["file"])
        imgs.append((Image.open(p).convert("RGB"), c))
    w = max(i.width for i, _ in imgs)
    h = max(i.height for i, _ in imgs)
    rows = (len(imgs) + cols - 1) // cols
    W = cols * w + (cols + 1) * pad
    H = rows * (h + capH) + (rows + 1) * pad
    sheet = Image.new("RGB", (W, H), (18, 14, 26))
    d = ImageDraw.Draw(sheet)
    f1, f2 = font(17), font(14)
    for k, (im, c) in enumerate(imgs):
        r, q = divmod(k, cols)
        x = pad + q * (w + pad)
        y = pad + r * (h + capH + pad)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + h + 4), c["title"], font=f1, fill=(255, 226, 180))
        d.text((x + 4, y + h + 24), c["note"], font=f2, fill=(190, 185, 200))
    sheet.save(out)
    print(json.dumps({"out": out, "cells": len(imgs), "size": [W, H]}, ensure_ascii=False))


main()
