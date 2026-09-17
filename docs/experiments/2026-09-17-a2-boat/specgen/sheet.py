# -*- coding: utf-8 -*-
"""A2 標竿卷 boat 兩案 contact sheet：3 欄（現版／甲／乙）× 3 列（hero／stage-lit／n=3），每格標題。
做法沿用 docs/experiments/2026-09-07-legend-art-evidence/specgen/sheet.py（PIL）。
跑法：python docs/experiments/2026-09-17-a2-boat/specgen/sheet.py
輸出：docs/experiments/2026-09-17-a2-boat/sheet-v1.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
OUT_DIR = os.path.join(ROOT, 'docs', 'experiments', '2026-09-17-a2-boat')

FONT = 'C:/Windows/Fonts/msjh.ttc'
f_title = ImageFont.truetype(FONT, 34)
f_col = ImageFont.truetype(FONT, 26)
f_row = ImageFont.truetype(FONT, 24)
f_small = ImageFont.truetype(FONT, 17)

CW = 560          # cell width
PAD = 18
COLH = 108        # column header block
ROWH = 44         # row header strip

COLS = [
    ('base', '現版 boat（對照）',
     'R-A2 盲讀被讀成「飛船／飛艇／生物頭部」而 FAIL。tris 5456／側視亮度 107.4。'),
    ('a', '甲案 boat_a｜拼板舟·划手',
     '拿掉飛魚鰭、加兩名木雕划手與斜插入水的槳；船眼放大成同心圓太陽紋，舷側三帶（棋盤格／紅黑三角波浪／板縫）。tris 5232。'),
    ('b', '乙案 boat_b｜載靈的舟形神轎',
     '船體立起斜靠在平板轎底上，兩根木抬桿前後貫穿、藤編斜撐與靛藍琉璃珠；船眼與波浪紋保留在轎身上半。tris 4164。'),
]
ROWS = [
    ('hero', 'hero（harness/hero.mjs，1024² 透明底 45°，idle 中間格）', 'hero'),
    ('stage', 'stage-lit（creature-shoot.mjs，戲台三燈＋祖靈邊光 rim=zuli，idle）', 'stage'),
    ('n3', 'n=3 橫排（同上加 &n=3，看 swarm 三隻併排會不會撞在一起）', 'n3'),
]

HERO_H = 560
CROP = {'stage': (344, 0, 1344, 780), 'n3': (180, 120, 1508, 700)}   # 每列各自的裁切框（1688×780 原圖）
SHOT_H = {k: int(CW * (c[3] - c[1]) / (c[2] - c[0])) for k, c in CROP.items()}


def load(kind, key):
    p = os.path.join(OUT_DIR, '%s-%s.png' % (kind, key))
    im = Image.open(p)
    if kind == 'hero':
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (250, 249, 246, 255))
        return Image.alpha_composite(bg, im).convert('RGB').resize((CW, HERO_H), Image.LANCZOS)
    return im.convert('RGB').crop(CROP[kind]).resize((CW, SHOT_H[kind]), Image.LANCZOS)


def wrap(draw, text, font, width):
    lines, cur = [], ''
    for ch in text:
        if draw.textlength(cur + ch, font=font) > width:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


W = PAD + 3 * (CW + PAD)
H = 104 + COLH + 3 * (ROWH + PAD) + HERO_H + SHOT_H['stage'] + SHOT_H['n3'] + PAD * 2
sheet = Image.new('RGB', (W, H), (243, 241, 237))
d = ImageDraw.Draw(sheet)
d.text((PAD, 20), '妖市 A2 標竿卷 — 拼板舟 boat 兩案 contact sheet（2026-09-17）', font=f_title, fill=(30, 28, 26))
d.text((PAD, 64), '三張都是同一顆 GLB、同一組參數拍的，只做置中裁切與縮放，未調色。judge 對各自 claims 全綠。這張只給使用者挑方案，未做盲讀、未自評優劣。',
       font=f_small, fill=(90, 86, 80))

y = 104
# 欄標題
for i, (key, name, desc) in enumerate(COLS):
    x = PAD + i * (CW + PAD)
    d.rectangle([x, y, x + CW - 1, y + COLH - 10], fill=(30, 28, 26))
    d.text((x + 10, y + 6), name, font=f_col, fill=(245, 240, 232))
    cy = y + 38
    for ln in wrap(d, desc, f_small, CW - 20):
        d.text((x + 10, cy), ln, font=f_small, fill=(206, 200, 190))
        cy += 21
y += COLH

for kind, rowtitle, _ in ROWS:
    d.rectangle([PAD, y, W - PAD, y + ROWH - 8], fill=(84, 78, 70))
    d.text((PAD + 10, y + 5), rowtitle, font=f_row, fill=(245, 240, 232))
    y += ROWH
    cell_h = HERO_H if kind == 'hero' else SHOT_H[kind]
    for i, (key, _n, _dsc) in enumerate(COLS):
        x = PAD + i * (CW + PAD)
        sheet.paste(load(kind, key), (x, y))
        d.rectangle([x, y, x + CW - 1, y + cell_h - 1], outline=(200, 196, 190))
        d.text((x + 6, y + 6), '%s-%s.png' % (kind, key), font=f_small, fill=(120, 114, 106))
    y += cell_h + PAD

out = os.path.join(OUT_DIR, 'sheet-v1.png')
sheet.save(out)
print(out, sheet.size)
