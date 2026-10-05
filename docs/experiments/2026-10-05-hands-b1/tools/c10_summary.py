# 條件 10 彙整：各輪 A（批 1 四角色席；基準樹＝同四個角色的預設手＝一般手）／B（既有三角色＋一般手）的 hands.update p95，取 5 輪中位。
import json, glob, sys, statistics as st
pre = sys.argv[1]; d = sys.argv[2] if len(sys.argv) > 2 else 'c10'
def load(tag):
    j = json.load(open(f'{d}/{tag}-perf.json', encoding='utf-8'))['summary']; v = list(j.values()); return v[0], v[1]
rows = {}
for side in ['base', 'new']:
    A = [load(f'{pre}{side}-{i}')[0]['p95'] for i in range(1, 6)]; B = [load(f'{pre}{side}-{i}')[1]['p95'] for i in range(1, 6)]
    rows[side] = (A, st.median(A), B, st.median(B))
    print(side, 'A p95', A, 'median', st.median(A), '| B p95', B, 'median', st.median(B))
g = rows['base'][1] * 1.25
print('門檻＝基準一般手（A 段）p95 中位 %.3f ×1.25 = %.3f；新版 A 段中位 %.3f ⇒ %s' % (rows['base'][1], g, rows['new'][1], '過' if rows['new'][1] <= g else '紅'))
print('新版 B 段（既有手）中位 %.3f ⇒ %s' % (rows['new'][3], '過' if rows['new'][3] <= g else '紅'))
