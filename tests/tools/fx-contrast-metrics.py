# -*- coding: utf-8 -*-
"""L3 對比閘門的差圖統計（v0.55 招式可辨性卷，凍結檔 2026-09-11-acceptance-fx-legibility.md L3）。

跑法：python tests/tools/fx-contrast-metrics.py <fx-contrast 的輸出目錄> [--json=<存檔路徑>]

輸入：fx-contrast.mjs 拍的 `<trId>-A.png`（徽記可見）與 `<trId>-B.png`（只把徽記/拖尾/印記切成
      invisible，同一次載入、同一格畫面、其餘一切不動）＋ 同目錄的 shots.json。

量法（凍結檔 L3 第 3–4 步，門檻一字不改）：
  1. 特效像素 = |ΔLuma| >= 6 的像素（Luma 走 Rec.709，0-255 尺度）；
  2. area% = 特效像素數 / 全畫面像素數，門檻 **>= 0.8%**；
  3. 這些像素「A 對同座標 B」的 **CIE76 ΔE 中位數**，門檻 **>= 28**。
     用中位數不用最大值——只取最亮那幾顆像素就會讓一枚針尖大的白點通過。
  `srgb_to_lab` 沿用 tests/tools/art-a-metrics.py:24-36 那一支（不重寫，避免兩份實作分岔）。

活性（不是門檻，是「這次量測有沒有意義」）：
  shots.json 的 `hidden` = 那一招被切掉的特效物件數。**hidden==0 一律判 DEAD**：
  兩張圖會逐位元組相同、area 0%，看起來像「沒過」，實際上是根本沒量到東西。

輸出：每招一行 JSON，最後一行是總表；任何一招沒過就 exit 1。
"""
import json
import os
import sys

import numpy as np
from PIL import Image


def srgb_to_lab(rgb):
    """與 tests/tools/art-a-metrics.py:24-36 同一支公式，只是改成吃 (...,3) 的陣列。"""
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ m.T
    white = np.array([0.95047, 1.0, 1.08883])
    t = xyz / white
    f = np.where(t > (6 / 29) ** 3, np.cbrt(t), t / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)


def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


AREA_MIN = 0.8   # %
DE_MIN = 28.0
LUMA_EPS = 6.0


def measure(path_a, path_b):
    a = np.asarray(Image.open(path_a).convert('RGB'), dtype=np.float64)
    b = np.asarray(Image.open(path_b).convert('RGB'), dtype=np.float64)
    if a.shape != b.shape:
        raise SystemExit('A/B 尺寸不同：%s %s' % (a.shape, b.shape))
    total = a.shape[0] * a.shape[1]
    mask = np.abs(luma(a) - luma(b)) >= LUMA_EPS
    n = int(mask.sum())
    area = 100.0 * n / total
    if n == 0:
        return {'area_pct': 0.0, 'px': 0, 'total': total, 'de_median': 0.0, 'de_p90': 0.0}
    lab_a = srgb_to_lab(a[mask])
    lab_b = srgb_to_lab(b[mask])
    de = np.sqrt(((lab_a - lab_b) ** 2).sum(axis=-1))
    return {'area_pct': round(area, 4), 'px': n, 'total': total,
            'de_median': round(float(np.median(de)), 2), 'de_p90': round(float(np.percentile(de, 90)), 2)}


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    jsonout = next((x[7:] for x in sys.argv[1:] if x.startswith('--json=')), None)
    if not args:
        raise SystemExit('need <fx-contrast 輸出目錄>')
    d = args[0]
    shots = json.load(open(os.path.join(d, 'shots.json'), encoding='utf-8'))
    rows = []
    bad = []
    for c in shots['cases']:
        trait = c['trait']
        fa, fb = c['fileA'], c['fileB']
        if not (os.path.exists(fa) and os.path.exists(fb)):
            raise SystemExit('缺圖：%s / %s' % (fa, fb))
        m = measure(fa, fb)
        dead = c.get('hidden', 0) == 0
        ok = (not dead) and m['area_pct'] >= AREA_MIN and m['de_median'] >= DE_MIN
        row = dict(trait=trait, tier=c['tier'], at_ms=c['atMs'], hidden=c.get('hidden', 0),
                   dead=dead, ok=ok, **m)
        rows.append(row)
        if not ok:
            bad.append(trait)
        print(json.dumps(row, ensure_ascii=False))
    summary = {'gate': {'area_pct_min': AREA_MIN, 'de_median_min': DE_MIN, 'luma_eps': LUMA_EPS},
               'n': len(rows), 'pass': len(rows) - len(bad), 'failed': bad,
               'view': shots.get('view'), 'seed': shots.get('seed'),
               'product_bloom': shots.get('productBloom'), 'bthr_override': shots.get('bthrOverride'),
               'programs': shots['cases'][0].get('programs') if shots['cases'] else None,
               'bloom': shots['cases'][0].get('bloomCfg') if shots['cases'] else None}
    print(json.dumps(summary, ensure_ascii=False))
    if jsonout:
        with open(jsonout, 'w', encoding='utf-8') as f:
            json.dump({'summary': summary, 'rows': rows}, f, ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
