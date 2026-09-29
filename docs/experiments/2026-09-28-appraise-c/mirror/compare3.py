# 照妖鏡 改前（399b681b）／改後／示意乙 三張並排（V1 852×393、solo 第 1 夜出價、西籤虎爺印）。只排版、不判定。
# 用法：python compare3.py <改前.png> <改後.png> <示意.png> <輸出.png>
import sys
from PIL import Image, ImageDraw, ImageFont
old, new, mock, out = sys.argv[1:5]
ims = [Image.open(p).convert('RGB') for p in (old, new, mock)]
labels = ['改前 399b681b', '改後（本卷）', '示意乙 b-west.png']
W, H = ims[0].size
try:
    F = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 22)
except Exception:
    F = ImageFont.load_default()
sheet = Image.new('RGB', (W, (H + 36) * 3), (20, 16, 12))
d = ImageDraw.Draw(sheet)
for k, (im, lb) in enumerate(zip(ims, labels)):
    y = k * (H + 36)
    d.text((8, y + 6), lb, font=F, fill=(230, 210, 160))
    sheet.paste(im.resize((W, H)), (0, y + 36))
sheet.save(out)
print('寫入', out)
