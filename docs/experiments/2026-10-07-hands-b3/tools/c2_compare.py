# 條件 2 比對：c2-pixels.mjs 兩組輸出逐格逐像素比（RGB 任一通道不同＝差 1 像素）。
# python c2_compare.py <資料夾> <out.json> 對照組名…（例：base1 base2 new1 new2）
import sys, json, os
import numpy as np
d, outp, tags = sys.argv[1], sys.argv[2], sys.argv[3:]
J = {t: {(r['hand'], r['seat'], r['pose']): r for r in json.load(open(os.path.join(d, f'{t}-pixels.json'), encoding='utf-8'))['results']} for t in tags}
def px(t, k): r = J[t][k]; return np.fromfile(os.path.join(d, r['file']), dtype=np.uint8).reshape(r['h'], r['w'], 4)[:, :, :3]
EXIST = ['default', 'shoujing', 'dangpu', 'hunter', 'qingmian', 'hongyi', 'duanshou', 'zutou']; B1 = ['xiaonv', 'lvshan', 'luzhu']  # v0.63.0：既有＝一般＋收驚婆／當鋪／獵人＋批 1 四角色；正對照＝批 3
def cmp(a, b, hands):
    rows = {}
    for k in sorted(J[a]):
        if k[0] not in hands: continue
        diff = int((px(a, k) != px(b, k)).any(axis=2).sum())
        rows[f'{k[0]}-s{k[1]}-{k[2]}'] = {'diffPx': diff, 'handPx': J[a][k]['handPx'], 'state': J[a][k]['state']['kind']}
    return {'cells': len(rows), 'cellsZeroDiff': sum(1 for v in rows.values() if v['diffPx'] == 0), 'rows': rows}
out = {}
pairs = [('base1', 'base2'), ('new1', 'new2'), ('new1', 'base1'), ('new2', 'base2'), ('new3', 'new4'), ('new3', 'base1'), ('new4', 'base2')]  # v0.63.0：new3／new4＝條件 10 修正後重拍
for a, b in pairs:
    if a in J and b in J:
        out[f'{a} vs {b}'] = {'既有手（一般＋收驚婆／當鋪／獵人＋批1四角色）': cmp(a, b, EXIST), '批3三角色（正對照）': cmp(a, b, B1)}
json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in out.items(): print(k, {kk: f"{vv['cellsZeroDiff']}/{vv['cells']} 格 0 差" for kk, vv in v.items()})
