# v0.61.1 詛咒放慢給使用者看的連拍：python tests/tools/curse-slow-sheet.py <連拍目錄> <前綴（slow-／kinds-）> <輸出目錄> [組合名,...]
# 吃 grab-probe.mjs --shots 存的 <前綴><組合>-<序號>-<毫秒>ms.png（每 100ms 一張）。
#   每個組合一條：<輸出目錄>/strip-<組合>.jpg（每 200ms 一格、6 欄、半尺寸）
#   一張總表：<輸出目錄>/contact-sheet.jpg（每組合一列、取 0／400／800／1200／1600／2000／2400／2800ms 八格）
import sys, glob, os, re
from PIL import Image, ImageDraw, ImageFont
d, pre, out = sys.argv[1], sys.argv[2], sys.argv[3]
names = sys.argv[4].split(',') if len(sys.argv) > 4 else None
os.makedirs(out, exist_ok=True)
SEAT = {'S': '南', 'N': '北', 'W': '西', 'E': '東'}
def label(n):
    m = re.match(r'c([SNWE])([SNWE])(\d?)(?:-(\w+))?$', n)
    if not m: return n
    s = f'{SEAT[m.group(1)]}塞{SEAT[m.group(2)]}'
    if m.group(3): s += f'（槽 {m.group(3)}）'
    if m.group(4): s += f'・{m.group(4)}'
    return f'{n}  {s}'
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 13); big = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 16)
except Exception:
    font = big = ImageFont.load_default()
files = sorted(glob.glob(os.path.join(d, pre + '*-[0-9][0-9]-*ms.png')))
by = {}
for f in files:
    m = re.match(re.escape(pre) + r'(.+)-(\d\d)-(\d+)ms\.png$', os.path.basename(f))
    if m: by.setdefault(m.group(1), []).append((int(m.group(3)), f))
combos = names or sorted(by)
def strip(n, fr, every_ms=200, cols=6, sc=0.5):
    fr = [x for x in sorted(fr) if x[0] % every_ms < 50]
    ims = [Image.open(f).convert('RGB') for _, f in fr]
    w, h = int(ims[0].width * sc), int(ims[0].height * sc)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, 26 + rows * (h + 18)), (20, 16, 14)); dr = ImageDraw.Draw(S)
    dr.text((6, 4), label(n) + '　（每格 200ms；CURSE_MS＝2000：約 2.0s 落定、按住到 2.7s、3.0s 收手完）', fill=(235, 220, 190), font=big)
    for i, ((ms, _), im) in enumerate(zip(fr, ims)):
        x, y = (i % cols) * w, 26 + (i // cols) * (h + 18)
        S.paste(im.resize((w, h)), (x, y + 18)); dr.text((x + 4, y + 2), f'{ms}ms', fill=(235, 220, 190), font=font)
    p = os.path.join(out, f'strip-{n}.jpg'); S.save(p, quality=82); return p
for n in combos:
    if n in by: print(strip(n, by[n]))
KEY = [0, 400, 800, 1200, 1600, 2000, 2400, 2800]
sc = 0.3; ims0 = Image.open(files[0]); w, h = int(ims0.width * sc), int(ims0.height * sc); LW = 150
rows = [n for n in combos if n in by]
S = Image.new('RGB', (LW + len(KEY) * w, 24 + len(rows) * (h + 4)), (20, 16, 14)); dr = ImageDraw.Draw(S)
for j, ms in enumerate(KEY): dr.text((LW + j * w + 4, 4), f'{ms}ms', fill=(235, 220, 190), font=font)
for i, n in enumerate(rows):
    y = 24 + i * (h + 4); dr.text((4, y + h // 2 - 8), label(n), fill=(235, 220, 190), font=font)
    for j, ms in enumerate(KEY):
        best = min(by[n], key=lambda x: abs(x[0] - ms))
        S.paste(Image.open(best[1]).convert('RGB').resize((w, h)), (LW + j * w, y))
p = os.path.join(out, 'contact-sheet.jpg'); S.save(p, quality=85); print(p)
