# v0.60.0 驗收 #11：兩組 grab-probe.mjs --modes=pixel 的逐幀截圖逐像素比對。
# python tests/tools/grab-pixel-diff.py <A 的 pixel 目錄> <B 的 pixel 目錄>
# 兩邊檔名集合必須相同（缺檔＝量不到＝紅）；輸出每對的相異像素數、總和與相異幀數（JSON 一行）。
import sys, os, json
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
fa, fb = sorted(f for f in os.listdir(a) if f.endswith('.png')), sorted(f for f in os.listdir(b) if f.endswith('.png'))
out = {'a': a, 'b': b, 'framesA': len(fa), 'framesB': len(fb), 'sameNames': fa == fb, 'pairs': 0, 'diffFrames': 0, 'diffPixels': 0, 'first': None}
if fa == fb and fa:
    for f in fa:
        ia, ib = Image.open(os.path.join(a, f)).convert('RGB'), Image.open(os.path.join(b, f)).convert('RGB')
        out['pairs'] += 1
        if ia.size != ib.size:
            out['diffFrames'] += 1; out['diffPixels'] += ia.size[0] * ia.size[1]; out['first'] = out['first'] or f + ' size'
            continue
        d = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v else 0)
        n = d.histogram()[255]
        if n:
            out['diffFrames'] += 1; out['diffPixels'] += n; out['first'] = out['first'] or f
print(json.dumps(out))
