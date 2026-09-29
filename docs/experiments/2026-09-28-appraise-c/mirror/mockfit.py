# 示意 b-west.png 的鏡子幾何擬合（#11(f) 用）：示意碼 phase2-mock/appraise/mock-b.js 的連珠紋畫在 0.955R，
# 找「半徑 1px 細環平均亮度最高」的圓心與半徑 ⇒ R＝連珠半徑／0.955；鏡面＝0.73R（mock-b.js 鏡面半徑）。
# 結果寫在 tests/tools/appraise-c-lib.mjs 的 MOCK_B_WEST；疊圖 mockfit.png（青＝0.735R 鏡面金線、藍＝0.745R、紅＝0.9R 八卦環外緣、綠＝R）。
import numpy as np
from PIL import Image, ImageDraw
import os
HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, 'b-west.png')).convert('RGB')
L = np.asarray(im).astype(float).mean(axis=2); H, W = L.shape
def ringmean(cx, cy, r, n=360):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    s = []
    for rr in (r - 0.5, r + 0.5):
        x = np.clip((cx + rr * np.cos(t)).round().astype(int), 0, W - 1); y = np.clip((cy + rr * np.sin(t)).round().astype(int), 0, H - 1)
        s.append(L[y, x])
    return np.mean(s)
best = None
for rb in np.arange(125, 150, 0.5):
    for cx in range(517, 538):
        for cy in range(178, 200):
            s = ringmean(cx, cy, rb)
            if best is None or s > best[0]: best = (s, cx, cy, rb)
s, cx, cy, rb = best; R = rb / 0.955
print({'cx': cx, 'cy': cy, 'beadR': rb, 'R': round(R, 2)})
d = ImageDraw.Draw(im)
for f, col in [(0.735, 'cyan'), (0.745, 'blue'), (0.9, 'red'), (1.0, 'lime')]:
    r = f * R; d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col)
im.save(os.path.join(HERE, 'mockfit.png'))
