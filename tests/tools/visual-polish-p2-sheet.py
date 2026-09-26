# 畫面精美度第二階段 contact sheet（凍結 p2 #10）
# 用法：python tests/tools/visual-polish-p2-sheet.py <mock 目錄> <基準 shots 目錄> <改後 shots 目錄> <輸出目錄>
#   輸出 contact-mock-vs-impl-V1.png：首頁／出價／揭盅三欄，上＝示意圖、下＝實作（V1）
#         contact-other-before-after-V1.png：夜戰、選角、夜行錄選單、引言卡、本局回顧、局末六列，左＝改前 14ac1f2、右＝改後
import sys, os
from PIL import Image, ImageDraw, ImageFont

mock, base, head, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
try:
    FONT = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 18)
except Exception:
    FONT = ImageFont.load_default()

def pick(d, names):
    for n in names:
        p = os.path.join(d, n)
        if os.path.exists(p):
            return p
    raise SystemExit('找不到：' + d + ' ' + ' / '.join(names))

def label(img, text):
    w, h = img.size
    c = Image.new('RGB', (w, h + 28), (16, 14, 12))
    c.paste(img, (0, 28))
    ImageDraw.Draw(c).text((8, 4), text, fill=(232, 200, 96), font=FONT)
    return c

def grid(rows, path):
    W = sum(i.width for i in rows[0]) + 8 * (len(rows[0]) - 1)
    H = sum(max(i.height for i in r) for r in rows) + 8 * (len(rows) - 1)
    c = Image.new('RGB', (W, H), (40, 36, 30))
    y = 0
    for r in rows:
        x = 0
        for i in r:
            c.paste(i, (x, y)); x += i.width + 8
        y += max(i.height for i in r) + 8
    c.save(path)
    print(path, c.size)

# 1) 示意 vs 實作（V1）
cols = [('首頁', 'a-title.png', ['solo_title-V1.png']),
        ('出價', 'e-bid.png', ['solo_bid_n1-V1.png']),
        ('揭盅（請神結果）', 'e-reveal.png', ['solo_reveal-result-V1.png', 'nw1_reveal-result-V1.png'])]
top = [label(Image.open(os.path.join(mock, m)).convert('RGB'), f'示意：{t}（{m}）') for t, m, _ in cols]
bot = [label(Image.open(pick(head, s)).convert('RGB'), f'實作 v0.59.0：{t}（{os.path.basename(pick(head, s))}）') for t, _, s in cols]
grid([top, bot], os.path.join(out, 'contact-mock-vs-impl-V1.png'))

# 2) 其餘六畫面 改前／改後（V1）
screens = [('夜戰', ['solo_duel-V1.png']), ('選角', ['solo_select-V1.png']), ('夜行錄選單', ['nw1_nw-menu-V1.png']),
           ('引言卡', ['nw1_nw-intro-V1.png']), ('本局回顧', ['solo_review-V1.png']), ('局末', ['solo_end-V1.png'])]
rows = []
for t, s in screens:
    b = label(Image.open(pick(base, s)).convert('RGB'), f'改前 14ac1f2：{t}')
    h = label(Image.open(pick(head, s)).convert('RGB'), f'改後 v0.59.0：{t}')
    rows.append([b, h])
g = os.path.join(out, 'contact-other-before-after-V1.png')
grid(rows, g)
im = Image.open(g); im.resize((im.width // 2, im.height // 2)).save(g)
