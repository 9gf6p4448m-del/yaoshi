# 條件 8 彙整（由批 1 c6_summary.py 複製）：每次跑的各情境 occlusionMax（拍品被手遮住比例的最大值）、是否 ≤10%、活性（有手的取樣數）。
import json, glob, os, sys
d = sys.argv[1]
for f in sorted(glob.glob(os.path.join(d, '*.json'))):
    j = json.load(open(f, encoding='utf-8'))
    runs = j['runs']; mx = max(r['occlusionMax'] for r in runs)
    print(os.path.basename(f), 'max=%.4f' % mx, 'pass=%s' % j.get('pass'), ' '.join('%s:%.4f(n%d)' % (r['name'], r['occlusionMax'], r['samplesWithHands']) for r in runs))
