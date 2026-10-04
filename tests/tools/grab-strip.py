# v0.60.0 抓取連拍條：python tests/tools/grab-strip.py <連拍目錄> <檔名前綴> <輸出.png> [每列張數=6] [縮放=0.5] [標題] [每幾張取一張=1]
# 吃 grab-probe.mjs --shots 存的 <前綴><情境>-<序號>-<毫秒>ms.png，依序排成一張（每格左上標序號與毫秒）。
import sys, glob, os, re
from PIL import Image, ImageDraw, ImageFont
d, pre, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
title = sys.argv[6] if len(sys.argv) > 6 else ''
every = int(sys.argv[7]) if len(sys.argv) > 7 else 1
fs = sorted(glob.glob(os.path.join(d, pre + '-[0-9][0-9]-*.png')))[::every]
if not fs:
    sys.exit('沒有符合的連拍：' + os.path.join(d, pre + '-NN-*.png'))
ims = [Image.open(f) for f in fs]
w, h = int(ims[0].width * sc), int(ims[0].height * sc)
rows = (len(ims) + cols - 1) // cols
top = 26 if title else 0
S = Image.new('RGB', (cols * w, top + rows * (h + 18)), (20, 16, 14))
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 13)
    big = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 16)
except Exception:
    font = big = ImageFont.load_default()
dr = ImageDraw.Draw(S)
if title:
    dr.text((6, 4), title, fill=(235, 220, 190), font=big)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, top + (i // cols) * (h + 18)
    S.paste(im.resize((w, h)), (x, y + 18))
    m = re.search(r'-(\d\d)-(\d+)ms', f)
    dr.text((x + 4, y + 2), f'#{m.group(1)}  {int(m.group(2))}ms', fill=(235, 220, 190), font=font)
S.save(out)
print(out, len(fs))
