# 凍結 #11(i) 使用者簽收用圖：V1 西籤、東籤各一張「本版 vs 示意乙」並排，另附卷軸展開逐幀（≥6 幀）。
# 讀 appraise-contact.mjs --slots 1,3 拍好的 head-appraise-{west,east}.png 與 head-appraise-enter-f*ms.png，
# 示意乙取 phase2-mock/appraise/b-{west,east}.png（同一局 V1 852×393、solo 第 1 夜出價、西籤虎爺印／東籤巴冷公主珠鍊）。
# 只排版、不判定（品味題由使用者簽收）。
# 用法：python tests/tools/appraise-signoff-sheet.py <contact 目錄> <示意目錄> <輸出目錄>
import os, sys, glob, re
from PIL import Image, ImageDraw, ImageFont

D, MOCK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
def font(sz):
    for f in ['C:/Windows/Fonts/msjh.ttc', 'C:/Windows/Fonts/msjhbd.ttc', 'C:/Windows/Fonts/mingliu.ttc',
              # Linux（雲端）：Windows 字型不存在時用已安裝的 CJK 字型，避免簽收圖中文缺字（只影響圖上標籤字，不影響截圖本身）
              '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
F, FS = font(22), font(16)
BG, INK = (16, 13, 11), (240, 215, 150)

def pair(name, a, b, la, lb, title):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    W, H = A.size
    S = Image.new('RGB', (W * 2 + 30, H + 80), BG)
    d = ImageDraw.Draw(S)
    d.text((10, 8), title, font=F, fill=INK)
    for k, (im, lb_) in enumerate([(A, la), (B.resize((W, H)), lb)]):
        x = 10 + k * (W + 10)
        d.text((x, 44), lb_, font=FS, fill=(220, 200, 160))
        S.paste(im, (x, 70))
    p = os.path.join(OUT, name); S.save(p); print('寫入', p)

pair('signoff-west.png', os.path.join(D, 'head-appraise-west.png'), os.path.join(MOCK, 'b-west.png'),
     '本版（v0.59.2 卷軸題字＋照妖鏡）', '示意乙 b-west.png', '#11(i) 西籤 虎爺印　V1 852×393　solo 第 1 夜出價　本版 vs 示意乙')
pair('signoff-east.png', os.path.join(D, 'head-appraise-east.png'), os.path.join(MOCK, 'b-east.png'),
     '本版（v0.59.2 卷軸題字＋照妖鏡）', '示意乙 b-east.png', '#11(i) 東籤 巴冷公主珠鍊　V1 852×393　solo 第 1 夜出價　本版 vs 示意乙')

# 卷軸展開逐幀：取點籤後 ≥ 400ms 的幀（卷軸 420ms 起淡入、560–1060ms 展開），整張縮 0.62 排四欄
fr = []
for f in sorted(glob.glob(os.path.join(D, 'head-appraise-enter-f*ms.png'))):
    m = re.search(r'-(\d+)ms\.png$', f)
    if m and int(m.group(1)) >= 400: fr.append((int(m.group(1)), f))
fr.sort()
sc, cols = 0.62, 4
tw, th = int(852 * sc), int(393 * sc)
rows = (len(fr) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 10) + 10, 50 + rows * (th + 28) + 10), BG)
d = ImageDraw.Draw(S)
d.text((10, 8), f'#11(i) 卷軸展開逐幀（西籤虎爺印，點籤後毫秒，假時鐘逐幀；共 {len(fr)} 幀）', font=F, fill=INK)
for i, (ms, f) in enumerate(fr):
    x, y = 10 + (i % cols) * (tw + 10), 50 + (i // cols) * (th + 28)
    d.text((x, y), f'{ms} ms', font=FS, fill=(220, 200, 160))
    S.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, y + 22))
p = os.path.join(OUT, 'signoff-scroll-frames.png'); S.save(p); print('寫入', p, len(fr), 'frames')
