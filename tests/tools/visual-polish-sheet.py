# V1 關鍵畫面 contact sheet（凍結 visual-polish #7：首頁、夜行錄選單、引言、出價、夜戰、局末、回顧）
# 用法：python tests/tools/visual-polish-sheet.py <shots 目錄> <輸出 png> <標題>
import sys, os
from PIL import Image, ImageDraw, ImageFont

src, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
PICK = [('首頁', 'solo_title-V1.png'), ('夜行錄選單', 'nw1_nw-menu-V1.png'), ('引言', 'nw1_nw-intro-V1.png'),
        ('出價（第 1 夜）', 'solo_bid_n1-V1.png'), ('夜戰', 'solo_duel-V1.png'), ('局末', 'solo_end-V1.png'), ('本局回顧', 'solo_review-V1.png'),
        ('出價（夜行錄第 7 夜）', 'nw1_bid_n7-V1.png')]
W, H, S = 852, 393, 0.75
tw, th = int(W * S), int(H * S)
cols, rows = 2, (len(PICK) + 1) // 2
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 18)
except Exception:
    font = ImageFont.load_default()
sheet = Image.new('RGB', (cols * (tw + 12) + 12, rows * (th + 36) + 48), (24, 20, 32))
d = ImageDraw.Draw(sheet)
d.text((12, 12), title, fill=(240, 220, 160), font=font)
for i, (lab, fn) in enumerate(PICK):
    x, y = 12 + (i % cols) * (tw + 12), 48 + (i // cols) * (th + 36)
    d.text((x, y), lab + '  ' + fn, fill=(220, 220, 220), font=font)
    p = os.path.join(src, fn)
    if os.path.exists(p):
        sheet.paste(Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y + 26))
    else:
        d.text((x + 10, y + 60), '（缺）', fill=(255, 100, 100), font=font)
sheet.save(out)
print(out, sheet.size)
