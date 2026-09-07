# -*- coding: utf-8 -*-
"""把選定的三尊 hero＋stage-lit 複製成中性檔名，給 context-free 盲讀者用。
檔名不得洩漏尊名／系別／方案代號。"""
import os
import sys
from PIL import Image

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
rnd = sys.argv[1] if len(sys.argv) > 1 else 'r1'
DST = os.path.join(ROOT, '.claude', 'tmp', 'blind', rnd)
os.makedirs(DST, exist_ok=True)

# 中性 id → (資料夾, 方案)
PICK = {'S1': ('canri', 'r1a'), 'S2': ('dashiye', 'r1a'), 'S3': ('youyinggong', 'r1b')}
CROP = (470, 0, 1220, 700)

for sid, (cid, var) in PICK.items():
    h = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'hero_%s' % var, 'hero.png')).convert('RGBA')
    bg = Image.new('RGBA', h.size, (250, 249, 246, 255))
    Image.alpha_composite(bg, h).convert('RGB').save(os.path.join(DST, '%s-a.png' % sid))
    st = Image.open(os.path.join(ROOT, 'tools', 'anyCreature', 'out', cid, 'stage_%s.png' % var)).convert('RGB')
    st.crop(CROP).save(os.path.join(DST, '%s-b.png' % sid))
    print(sid, '<-', cid, var)
print(DST)
