"""A2 標竿 contact sheet（2026-09-17）：把每個方案的 hero／stage-lit／實際桌面大小／滿編 四張圖拼成一張
（欄＝方案、列＝情境），給使用者挑方案與給 context-free 讀者看。只做拼圖，不改任何來源圖。

用法：python tests/tools/a2-sheet.py <輸出 png> <方案名1> <方案名2> ... [--dir=docs/experiments/2026-09-17-a2-boat] [--cell=520x300]
  每個方案在 --dir 底下找 hero-<名>.png、stage-<名>.png、table-<名>.png、duel-<名>.png；缺的格畫灰底標「缺」。
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROWS = [("hero", "英雄視角"), ("stage", "stage-lit"), ("table", "實際桌面大小 844×390 hover"), ("duel", "滿編 8v8")]


def load_font(size: int) -> ImageFont.ImageFont:
    for cand in ("C:/Windows/Fonts/msjh.ttc", "C:/Windows/Fonts/msjhbd.ttc", "C:/Windows/Fonts/mingliu.ttc"):
        try:
            return ImageFont.truetype(cand, size)
        except OSError:
            continue
    return ImageFont.load_default()


def fit(img: Image.Image, w: int, h: int) -> Image.Image:
    scale = min(w / img.width, h / img.height)
    resized = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), (24, 20, 28))
    canvas.paste(resized, ((w - resized.width) // 2, (h - resized.height) // 2))
    return canvas


def main(argv: list[str]) -> int:
    out = None
    names: list[str] = []
    base = Path("docs/experiments/2026-09-17-a2-boat")
    cell_w, cell_h = 520, 300
    for a in argv:
        if a.startswith("--dir="):
            base = Path(a[6:])
        elif a.startswith("--cell="):
            cell_w, cell_h = (int(v) for v in a[7:].split("x"))
        elif out is None:
            out = Path(a)
        else:
            names.append(a)
    if out is None or not names:
        print(__doc__)
        return 2
    font = load_font(20)
    small = load_font(15)
    head_h, left_w, pad = 36, 200, 8
    width = left_w + len(names) * (cell_w + pad) + pad
    height = head_h + len(ROWS) * (cell_h + pad) + pad
    sheet = Image.new("RGB", (width, height), (14, 12, 18))
    draw = ImageDraw.Draw(sheet)
    for ci, name in enumerate(names):
        x = left_w + pad + ci * (cell_w + pad)
        draw.text((x + 6, 8), name, fill=(240, 220, 170), font=font)
        for ri, (key, label) in enumerate(ROWS):
            y = head_h + pad + ri * (cell_h + pad)
            if ci == 0:
                draw.text((8, y + 8), label, fill=(200, 200, 200), font=small)
            src = base / f"{key}-{name}.png"
            if src.exists():
                sheet.paste(fit(Image.open(src).convert("RGB"), cell_w, cell_h), (x, y))
            else:
                draw.rectangle((x, y, x + cell_w, y + cell_h), fill=(40, 36, 44))
                draw.text((x + 12, y + 12), f"缺 {src.name}", fill=(180, 120, 120), font=small)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"wrote {out} ({width}x{height}) columns={names}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
