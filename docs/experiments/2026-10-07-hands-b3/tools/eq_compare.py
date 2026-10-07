# 條件 11 比對：eq-frames 輸出的「手的 GPU 輸入」逐幀雜湊（hands 欄：每席 骨＋世界矩陣:幾何:shader）。
# python eq_compare.py <資料夾> <參照 tag> <tag…>   印出每個 tag 對參照的相等幀數與不等幀的標籤／不等的是哪一欄。
import sys, json, os
d, ref, tags = sys.argv[1], sys.argv[2], sys.argv[3:]
L = lambda t: json.load(open(os.path.join(d, t + '-frames.json'), encoding='utf-8'))
R = L(ref)['frames']
for t in tags:
    x = L(t); fr = x['frames']
    bad = [a['label'] for a, b in zip(fr, R) if a['hands'] != b['hands']]
    col = set()
    for a, b in zip(fr, R):
        for ha, hb in zip(a['hands'], b['hands']):
            if ha != hb:
                pa, pb = ha.split(':'), hb.split(':')
                for i, nm in enumerate(['矩陣', '幾何', 'shader']):
                    if len(pa) > i and len(pb) > i and pa[i] != pb[i]: col.add(nm)
                if len(pa) != len(pb): col.add('可見')
    rng = (bad[0] + '…' + bad[-1]) if bad else ''
    print(f"{t}: {len(fr) - len(bad)}/{len(fr)} 相等  start={x.get('clock', {}).get('start')}  不等={len(bad)} {rng} 欄={sorted(col)}")
