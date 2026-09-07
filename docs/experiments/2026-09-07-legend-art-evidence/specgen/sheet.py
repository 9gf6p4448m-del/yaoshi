# -*- coding: utf-8 -*-
"""傳說三尊 V1 contact sheet：3 尊 × 3 方案 × 2 圖（hero 上／stage-lit 下），每格標方案一句話與差異點。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
OUT_DIR = os.path.join(ROOT, 'docs', 'experiments', '2026-09-07-legend-art-evidence')
os.makedirs(OUT_DIR, exist_ok=True)

FONT = 'C:/Windows/Fonts/msjh.ttc'
f_title = ImageFont.truetype(FONT, 34)
f_row = ImageFont.truetype(FONT, 27)
f_cap = ImageFont.truetype(FONT, 19)
f_small = ImageFont.truetype(FONT, 16)

CW, HH, SH = 560, 560, 400          # cell width / hero height / stage height
CAPH = 168                           # caption block height
PAD, ROWH = 18, 50                   # gap / row header

ROWS = [
    ('canri', '殘日 canri｜祖靈 elite｜rim=zuli', [
        ('r1a 圓盤裂芒獨眼',
         '完整焦盤＋七道不等長裂芒；白熱獨眼偏心咬在盤上，靛藍餘燼弧沿盤緣、粗細不均。',
         '差異：盤是完整的圓；亮點只有一顆、偏心；芒最多（7 道）繞滿一圈。'),
        ('r1b 半蝕新月＋滴落的光',
         '外弧完好、右側被咬掉的月牙，內緣一排崩壞鋸齒；白熱眼縮到上弦角尖，光從下弦角一顆一顆掉下來。',
         '差異：不是圓是月牙；輪廓有一個大缺口；多了一串往下掉的餘燼。'),
        ('r1c 火球裂成兩半',
         '整顆從中線裂成兩半、上下錯開，裂縫裡露出一條熔線與一顆白熱的眼；裂芒只長在外緣。',
         '差異：一條貫穿的紅裂縫是主角；眼被夾在縫裡；兩半上下不對稱。'),
    ]),
    ('dashiye', '大士爺紙尊 dashiye｜香火 ward｜rim=xianghu', [
        ('r1a 高瘦紙紮鬼王',
         '窄長紙軀；火焰形鋸齒背光張在頭兩側，頭頂立一座金簷小龕，長舌垂到胸腹，袍緣與腰各一排剪刀鋸齒。',
         '差異：身最窄、頭最完整；輪廓靠頭部總成撐開。'),
        ('r1b 方正紙紮牌樓體',
         '整尊是一座紙紮牌樓：方正寬扁的身、三層外挑的紅黑簷、兩根紅柱當腿，臉從牌樓頂探出來。',
         '差異：最寬；橫向的簷是主要輪廓；讀起來先是建築後是神。'),
        ('r1c 吐舌大頭',
         '頭佔近一半全高的大頭紙尊；青臉、獠牙、舌一路垂到腹下，兩支外捲金角把輪廓拉到身寬兩倍。',
         '差異：頭身比最誇張；舌最長；護心鏡露得最完整。'),
    ]),
    ('youyinggong', '有應公 youyinggong｜陰氣 haunt｜rim=yinqi', [
        ('r1a 小祠＋紅布＋香爐（無臉）',
         '一整座路旁小祠站起來：正面一個深黑的方龕口取代臉，朱瓦頂帶瓦壟與翹簷，腰上一圈紅布；腰以下化成香灰霧，腳邊一只三足金耳香爐。',
         '差異：唯一有「黑洞當臉」的一版；瓦頂最完整。'),
        ('r1b 紅布裹枯骨堆',
         '沒有祠也沒有臉，只有一束向外斜插的枯骨、一圈勒緊的紅布與頭頂一小片殘瓦；下緣散成灰。',
         '差異：唯一有骨的一版；輪廓被四射的骨打斷，最不對稱。'),
        ('r1c 牌位化身',
         '一面站起來的無名牌位：碑首壓一條朱瓦碑額、碑面空白（沒有名字也沒有臉），紅布斜披過肩，碑座壓在霧上。',
         '差異：最扁最直；沒有簷；臉的位置是一片空白碑面而不是洞。'),
    ]),
]

STAGE_CROP = (470, 0, 1220, 700)


def cell_img(cid, var):
    hero = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'hero_%s' % var, 'hero.png')).convert('RGBA')
    bg = Image.new('RGBA', hero.size, (250, 249, 246, 255))
    hero = Image.alpha_composite(bg, hero).convert('RGB').resize((CW, HH), Image.LANCZOS)
    st = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'stage_%s.png' % var)).convert('RGB')
    st = st.crop(STAGE_CROP).resize((CW, SH), Image.LANCZOS)
    return hero, st


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
H = 96 + 3 * (ROWH + HH + SH + CAPH + PAD * 2)
sheet = Image.new('RGB', (W, H), (243, 241, 237))
d = ImageDraw.Draw(sheet)
d.text((PAD, 22), '妖市 傳說三尊 美術卷 V1 三方案 contact sheet（2026-09-07）', font=f_title, fill=(30, 28, 26))
d.text((PAD, 64), '每格上＝hero（1024² 中性底，盲讀材料之一）／下＝stage-lit（戲台燈＋系別邊光，原圖只做一次純裁切與縮放，未調色）。judge 全綠、GLB ≤1.5MB／三角 ≤8000。',
       font=f_small, fill=(90, 86, 80))

y = 96
for cid, rowtitle, cells in ROWS:
    d.rectangle([PAD, y, W - PAD, y + ROWH - 8], fill=(30, 28, 26))
    d.text((PAD + 12, y + 4), rowtitle, font=f_row, fill=(245, 240, 232))
    y += ROWH
    for i, (name, desc, diff) in enumerate(cells):
        x = PAD + i * (CW + PAD)
        hero, st = cell_img(cid, ['r1a', 'r1b', 'r1c'][i])
        sheet.paste(hero, (x, y))
        sheet.paste(st, (x, y + HH))
        d.rectangle([x, y, x + CW - 1, y + HH + SH - 1], outline=(200, 196, 190))
        cy = y + HH + SH + 8
        d.text((x + 4, cy), name, font=f_cap, fill=(20, 18, 16)); cy += 26
        for ln in wrap(d, desc, f_small, CW - 10):
            d.text((x + 4, cy), ln, font=f_small, fill=(60, 57, 52)); cy += 22
        cy += 4
        for ln in wrap(d, diff, f_small, CW - 10):
            d.text((x + 4, cy), ln, font=f_small, fill=(150, 60, 40)); cy += 22
    y += HH + SH + CAPH + PAD * 2

out = os.path.join(OUT_DIR, 'sheet-v1.png')
sheet.save(out)
print(out, sheet.size)
