# v0.59.2 凍結 #9（修訂）：鑑賞頁改前／改後並排 contact sheet＋丙案燒符揭幕連續幀。
# 讀 appraise-contact.mjs 拍好的原始截圖（base-* 是 86e4676、head-* 是丙案），只排版、不判定。
# 用法：python tests/tools/appraise-c-sheet.py <contact 目錄> <輸出 png>
import os, sys, glob
from PIL import Image, ImageDraw, ImageFont

D, OUT = sys.argv[1], sys.argv[2]
def font(sz):
    for f in ['C:/Windows/Fonts/msjh.ttc', 'C:/Windows/Fonts/msjhbd.ttc', 'C:/Windows/Fonts/mingliu.ttc',
              # Linux（雲端）：Windows 字型不存在時用已安裝的 CJK 字型，避免簽收圖中文缺字（只影響圖上標籤字，不影響截圖本身）
              '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
F, FS = font(22), font(15)
def im(n):
    p = os.path.join(D, n)
    return Image.open(p).convert('RGB') if os.path.exists(p) else None
pairs = [('西籤（改前 86e4676）', 'base-appraise-west.png', '西籤（丙案）', 'head-appraise-west.png'),
         ('東籤（改前 86e4676）', 'base-appraise-east.png', '東籤（丙案）', 'head-appraise-east.png')]
frames = sorted(glob.glob(os.path.join(D, 'head-appraise-enter-f*ms.png')))
W0, H0 = 852, 393
sc = 0.62
tw, th = int(W0 * sc), int(H0 * sc)
cols = 4
rows_f = (len(frames) + cols - 1) // cols
S = Image.new('RGB', (max(2 * tw + 30, cols * tw + 50), 40 + 2 * (th + 34) + 40 + rows_f * (th + 26) + 60), (16, 13, 11))
d = ImageDraw.Draw(S)
d.text((10, 8), '法寶鑑賞頁 丙案（燒符揭幕＋照妖鏡）改前／改後　V1 852×393 solo 第 1 夜出價', font=F, fill=(240, 215, 150))
y = 44
for la, a, lb, b in pairs:
    for k, (lab, n) in enumerate([(la, a), (lb, b)]):
        x = 10 + k * (tw + 10)
        d.text((x, y), lab, font=FS, fill=(220, 200, 160))
        g = im(n)
        if g: S.paste(g.resize((tw, th)), (x, y + 20))
        else: d.text((x, y + 40), '（缺圖）', font=FS, fill=(255, 80, 80))
    y += th + 34
d.text((10, y + 6), f'丙案進場連續幀（點籤後毫秒；假時鐘逐幀推進）共 {len(frames)} 幀', font=F, fill=(240, 215, 150))
y += 40
for i, f in enumerate(frames):
    x = 10 + (i % cols) * (tw + 10); yy = y + (i // cols) * (th + 26)
    d.text((x, yy), os.path.basename(f).split('-f')[1].replace('.png', ''), font=FS, fill=(220, 200, 160))
    S.paste(Image.open(f).convert('RGB').resize((tw, th)), (x, yy + 18))
S.save(OUT)
print('寫入', OUT, len(frames), 'frames')
