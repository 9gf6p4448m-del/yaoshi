# -*- coding: utf-8 -*-
"""V4 收尾 contact sheet：三尊最終出貨版 hero＋stage-lit（各一格）。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
OUT_DIR = os.path.join(ROOT, 'docs', 'experiments', '2026-09-07-legend-art-evidence')
FONT = 'C:/Windows/Fonts/msjh.ttc'
f_title = ImageFont.truetype(FONT, 34)
f_cap = ImageFont.truetype(FONT, 21)
f_small = ImageFont.truetype(FONT, 16)

CW, HH, SH, CAPH, PAD = 600, 600, 430, 190, 20
CELLS = [
    ('canri', 'r1a', '殘日 canri（祖靈 elite×1・rim=zuli）',
     '出貨版＝V1 甲案經 V2 三輪回修：軀幹翻成上寬下窄（消滅不倒翁讀法）、裂芒 11 道長細、盤緣一圈粗細不均的亮環、'
     '冷藍餘燼改暖紅褐、白熱獨眼加暖暈。招式 eliteBlind「餘暉灼目」。',
     'M-A1 未過（概念）：R3 兩位 Q1＝神像／人形立像，特徵 3/5、玩具 0/2、Q2「太陽光芒」2/2。'),
    ('dashiye', 'r1a', '大士爺紙尊 dashiye（香火 ward×1・rim=xianghu）',
     '出貨版＝V1 甲案經 V2 三輪回修：頭頂小龕縮到 0.58× 並抬高改暗赭（原灰白被讀成面罩）、新做嘴（近黑口腔＋'
     '加大 1.9× 獠牙）、舌亮一階加中央縱溝與鈍圓舌尖。招式 wardGuardAll「普渡」。',
     'M-A1 未過（特徵 2/5）：概念 2/2 對，但舌 0/6、龕 0/6、護心鏡 0/6。'),
    ('youyinggong', 'r1b', '有應公 youyinggong（陰氣 haunt×2・rim=yinqi）',
     '出貨版＝V1 乙案經 V2 三輪回修：骨改兩端骨骺膨大 2.9×＋肋弧＋紅布捆、頂端對稱瓦帽改歪斜殘瓦、'
     '香爐補爐口與三支香、紅布改 18 片貼面窄帶。招式 hauntAnswer「有求必應」。',
     'M-A1 未過（三項全差）：R3 兩位 Q1 都是「陀螺」，特徵 2/5（龕口 2/2、紅布 1/2）。'),
]
STAGE_CROP = (470, 0, 1220, 700)


def wrap(draw, text, font, width):
    lines, cur = [], ''
    for ch in text:
        if draw.textlength(cur + ch, font=font) > width:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


W = PAD + 3 * (CW + PAD)
H = 104 + HH + SH + CAPH + PAD
sheet = Image.new('RGB', (W, H), (243, 241, 237))
d = ImageDraw.Draw(sheet)
d.text((PAD, 22), '妖市 傳說三尊 出貨版（v0.51・2026-09-07）', font=f_title, fill=(30, 28, 26))
d.text((PAD, 66), '上＝hero（1024² 中性底）／下＝stage-lit（戲台燈＋系別邊光，原圖只做一次純裁切與縮放，未調色）。'
                  '三尊 M-A1 盲讀三輪皆未過，依凍結檔交最佳版標「未過」待簽字。',
       font=f_small, fill=(90, 86, 80))

y = 104
for i, (cid, var, title, desc, verdict) in enumerate(CELLS):
    x = PAD + i * (CW + PAD)
    hero = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'hero_%s' % var, 'hero.png')).convert('RGBA')
    bg = Image.new('RGBA', hero.size, (250, 249, 246, 255))
    hero = Image.alpha_composite(bg, hero).convert('RGB').resize((CW, HH), Image.LANCZOS)
    st = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'stage_%s.png' % var)).convert('RGB')
    st = st.crop(STAGE_CROP).resize((CW, SH), Image.LANCZOS)
    sheet.paste(hero, (x, y)); sheet.paste(st, (x, y + HH))
    d.rectangle([x, y, x + CW - 1, y + HH + SH - 1], outline=(200, 196, 190))
    cy = y + HH + SH + 10
    d.text((x + 4, cy), title, font=f_cap, fill=(20, 18, 16)); cy += 30
    for ln in wrap(d, desc, f_small, CW - 10):
        d.text((x + 4, cy), ln, font=f_small, fill=(60, 57, 52)); cy += 22
    cy += 4
    for ln in wrap(d, verdict, f_small, CW - 10):
        d.text((x + 4, cy), ln, font=f_small, fill=(150, 60, 40)); cy += 22

out = os.path.join(OUT_DIR, 'sheet-final.png')
sheet.save(out)
print(out, sheet.size)
