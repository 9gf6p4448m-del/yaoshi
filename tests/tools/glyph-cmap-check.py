#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
凍結 docs/experiments/2026-09-27-acceptance-card-dock-font.md #4（2026-09-27 修訂：改 LXGW WenKai TC）：
不用瀏覽器掃描渲染文字，改用 fontTools 讀字檔 cmap，逐字比對「index.html + js/**/*.js 全部漢字」這個超集
（涵蓋所有可能出現在 --font-display 角色裡的字：角色名、拍品名、章名、按鈕字——凡是會被 CJK 正則
掃到的字都算進超集，不去猜哪個字串實際會不會渲染到那 17 個 class，超集比對只會多算不會少算）。

字重：--font-display 的角色有些用 font-weight:bold/700（.mcard .nm、.stakebar .amt、.incamt、
.stageCard .big、.railTabs button），瀏覽器會挑 Bold 那個字檔，所以 Regular 與 Bold 都要各自查 cmap，
「缺字」＝那個字在對應字重的字檔裡都查不到。

用法：python tests/tools/glyph-cmap-check.py <regular.ttf> <bold.ttf> [--out <dir>]
"""
import sys
import os
import re
import json
import argparse
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# CJK Unified Ideographs（含常用擴充 A）＋部分標點全形符號，涵蓋遊戲會用到的所有漢字範圍。
HAN_RE = re.compile(r'[一-鿿㐀-䶿]')


def collect_source_files():
    files = [os.path.join(ROOT, 'index.html')]
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'js')):
        for fn in filenames:
            if fn.endswith('.js'):
                files.append(os.path.join(dirpath, fn))
    return files


def collect_chars(files):
    chars = {}
    for f in files:
        try:
            text = open(f, encoding='utf-8').read()
        except Exception as e:
            print(f'警告：讀不到 {f}：{e}', file=sys.stderr)
            continue
        for m in HAN_RE.finditer(text):
            ch = m.group(0)
            if ch not in chars:
                chars[ch] = os.path.relpath(f, ROOT)
    return chars


def cmap_of(ttf_path):
    font = TTFont(ttf_path)
    return font.getBestCmap()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('regular')
    ap.add_argument('bold')
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs/experiments/2026-09-27-card-dock-font'))
    args = ap.parse_args()

    files = collect_source_files()
    chars = collect_chars(files)
    print(f'原始碼掃到的漢字超集：{len(chars)} 字，來源檔數：{len(files)}')

    cmap_reg = cmap_of(args.regular)
    cmap_bold = cmap_of(args.bold)

    missing_reg = []
    missing_bold = []
    missing_both = []
    for ch, src in sorted(chars.items()):
        cp = ord(ch)
        in_reg = cp in cmap_reg
        in_bold = cp in cmap_bold
        if not in_reg:
            missing_reg.append({'char': ch, 'codepoint': hex(cp), 'firstSeenIn': src})
        if not in_bold:
            missing_bold.append({'char': ch, 'codepoint': hex(cp), 'firstSeenIn': src})
        if not in_reg and not in_bold:
            missing_both.append({'char': ch, 'codepoint': hex(cp), 'firstSeenIn': src})

    result = {
        'font': {'regular': args.regular, 'bold': args.bold},
        'totalChars': len(chars),
        'sourceFiles': len(files),
        'missingRegularCount': len(missing_reg),
        'missingBoldCount': len(missing_bold),
        'missingBothCount': len(missing_both),
        'missingRegular': missing_reg,
        'missingBold': missing_bold,
        'missingBoth': missing_both,
        'pass': len(missing_reg) == 0 and len(missing_bold) == 0,
    }
    os.makedirs(args.out, exist_ok=True)
    out_path = os.path.join(args.out, 'glyph-coverage.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print(f'Regular 缺字：{len(missing_reg)}　Bold 缺字：{len(missing_bold)}　兩者都缺：{len(missing_both)}')
    print(f'結果寫入 {out_path}')
    if not result['pass']:
        print('#4 未過：以上字元至少有一個字重讀不到，依凍結檔規定不得自行換字，停下回報。', file=sys.stderr)
        sys.exit(1)
    print('#4 過：Regular／Bold 都是 0 缺字。')


if __name__ == '__main__':
    main()
