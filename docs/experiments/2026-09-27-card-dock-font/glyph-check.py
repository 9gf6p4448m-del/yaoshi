#!/usr/bin/env python3
# 凍結 #4：逐字查 Yuji Boku 字檔 cmap（fonttools），不得用肉眼。
# 用法：python glyph-check.py glyph-chars.json /path/to/YujiBoku.ttf
import json, sys
from fontTools.ttLib import TTFont

chars_path, font_path = sys.argv[1], sys.argv[2]
data = json.load(open(chars_path, encoding='utf-8'))
chars = data['chars']
samples = data.get('samples', {})

font = TTFont(font_path)
cmap = font.getBestCmap()  # codepoint(int) -> glyph name

missing = []
for ch in chars:
    cp = ord(ch)
    if cp in (0x20,):
        continue
    if cp not in cmap:
        missing.append({'char': ch, 'codepoint': hex(cp), 'sample': samples.get(ch, {})})

print(json.dumps({
    'font': font_path,
    'totalChars': len(chars),
    'missingCount': len(missing),
    'missing': missing,
}, ensure_ascii=False, indent=1))
