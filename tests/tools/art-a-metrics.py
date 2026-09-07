# -*- coding: utf-8 -*-
"""美術甲卷（2026-09-07）的畫素量測：A3 背景漸層、A5 暈角。凍結檔 docs/experiments/2026-09-07-acceptance-art-a.md。

跑法：python tests/tools/art-a-metrics.py <png> [<png> ...]
輸出：每張圖一行 JSON——
  a3_top / a3_bottom：畫面「上 10% 列」與「下 10% 列」的平均 RGB（0-255）
  a3_deltaE        ：兩者的 CIE76 ΔE（sRGB→線性→XYZ(D65)→Lab）。A3 門檻：新版 ≥15、基準 <5
  a5_corner        ：四角各 5%（寬 5% × 高 5%）區域的平均亮度（Rec.709 相對亮度，0-255 尺度）
  a5_center        ：中央 20%（寬 20% × 高 20%）區域的平均亮度
  a5_ratio         ：a5_corner / a5_center。A5 門檻：新版 <0.8、基準 ≥0.9
量測位置＝玩家實際看到的那張截圖（含 DOM 面板），不是只有 canvas——A3/A5 條文寫的就是「截圖」。
"""
import json
import sys

import numpy as np
from PIL import Image


def srgb_to_lab(rgb255):
    c = np.asarray(rgb255, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = m @ lin
    white = np.array([0.95047, 1.0, 1.08883])
    t = xyz / white
    f = np.where(t > (6 / 29) ** 3, np.cbrt(t), t / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])


def luma(block):
    return float((block[..., 0] * 0.2126 + block[..., 1] * 0.7152 + block[..., 2] * 0.0722).mean())


def measure(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im, dtype=np.float64)
    h, w = a.shape[0], a.shape[1]
    rows = max(1, int(round(h * 0.10)))
    top = a[:rows].reshape(-1, 3).mean(axis=0)
    bot = a[h - rows:].reshape(-1, 3).mean(axis=0)
    dE = float(np.linalg.norm(srgb_to_lab(top) - srgb_to_lab(bot)))

    cw, ch = max(1, int(round(w * 0.05))), max(1, int(round(h * 0.05)))
    corners = [a[:ch, :cw], a[:ch, w - cw:], a[h - ch:, :cw], a[h - ch:, w - cw:]]
    corner_l = float(np.mean([luma(c) for c in corners]))
    x0, x1 = int(round(w * 0.40)), int(round(w * 0.60))
    y0, y1 = int(round(h * 0.40)), int(round(h * 0.60))
    center_l = luma(a[y0:y1, x0:x1])
    return {
        "png": path,
        "size": [w, h],
        "a3_top": [round(v, 2) for v in top],
        "a3_bottom": [round(v, 2) for v in bot],
        "a3_deltaE": round(dE, 2),
        "a5_corner": round(corner_l, 3),
        "a5_center": round(center_l, 3),
        "a5_ratio": round(corner_l / center_l, 4) if center_l else None,
    }


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(json.dumps(measure(p), ensure_ascii=False))
