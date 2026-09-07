# -*- coding: utf-8 -*-
"""請神 2.0 版面卷（v0.47）G7／G11：把 layout-shot.mjs／legend-drive.mjs 拍的圖拼成一張 contact sheet。

用法：
    python tests/tools/legend-v2-sheet.py <證據目錄> <輸出 png>

每一格底下標「這一張要用人眼確認什麼」——圖說寫的是凍結檔 G7／G11 的檢查點，
不是事後回想的形容詞。需要 Pillow。
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

CAPS = [
    ("g7-n1.png",        "① 第 1 夜出價頁：北家在頂端正中、西東對稱；三龕整排在法寶卡正上方；四家香火一行"),
    ("g7-preshrine.png", "② 請神夜前一夜：神龕卡寫「第 N 夜請・倒數 1 夜」"),
    ("g7-mark2.png",     "③ 第 2 夜盯上宣告：說明已收成一行（第 1 夜才是完整教學版）"),
    ("g7-bag.png",       "④ 袋子部隊預覽：逐件 隻數／攻／血／拍／招式＋總計一行（含共鳴 hp）"),
    ("g7-market.png",    "⑤ 市集卡特寫：每張卡多一行部隊預覽（與袋子同一支 buildArmy＋TRAITS）"),
    ("lineup-arena.png", "⑥ 10v10 對決：與 v0.45 一致（本卷未動對決演出）"),
    ("g7-portrait.png",  "⑦ 直式：蓋板（請轉橫）行為未變"),
]

COLS = 2
PAD = 14
CAPH = 34
BG = (20, 16, 31)
FG = (235, 228, 214)


def font(sz):
    for p in (r"C:\Windows\Fonts\msjh.ttc", r"C:\Windows\Fonts\msjh.ttf",
              r"C:\Windows\Fonts\mingliu.ttc", r"C:\Windows\Fonts\arial.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


def main():
    src, out = sys.argv[1], sys.argv[2]
    items = [(n, c) for n, c in CAPS if os.path.exists(os.path.join(src, n))]
    if not items:
        print("找不到任何圖")
        return 1
    imgs = [Image.open(os.path.join(src, n)).convert("RGB") for n, _ in items]
    w = 700
    scaled = []
    for im in imgs:
        h = max(1, round(im.height * w / im.width))
        scaled.append(im.resize((w, h), Image.LANCZOS))
    rows = (len(scaled) + COLS - 1) // COLS
    rowh = [max(scaled[r * COLS + c].height for c in range(COLS) if r * COLS + c < len(scaled)) + CAPH
            for r in range(rows)]
    W = COLS * w + (COLS + 1) * PAD
    H = sum(rowh) + (rows + 1) * PAD
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    f = font(15)
    y = PAD
    for r in range(rows):
        x = PAD
        for c in range(COLS):
            i = r * COLS + c
            if i >= len(scaled):
                break
            sheet.paste(scaled[i], (x, y))
            d.text((x, y + scaled[i].height + 7), items[i][1], font=f, fill=FG)
            x += w + PAD
        y += rowh[r] + PAD
    sheet.save(out)
    print("contact sheet →", out, sheet.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
