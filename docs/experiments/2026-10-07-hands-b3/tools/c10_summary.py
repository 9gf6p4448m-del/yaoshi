# v0.63.0 條件 10 彙整（由批 1 c10_summary.py 複製，門檻改成凍結檔的 ×1.15、基準＝85c38c6a 同情境）。原：條件 10 彙整：各輪 A（批 1 四角色席；基準樹＝同四個角色的預設手＝一般手）／B（既有三角色＋一般手）的 hands.update p95，取 5 輪中位。
import json, glob, sys, statistics as st
pre = sys.argv[1]; d = sys.argv[2] if len(sys.argv) > 2 else 'c10'
def load(tag):
    j = json.load(open(f'{d}/{tag}-perf.json', encoding='utf-8'))['summary']; v = list(j.values()); return v[0], v[1]
rows = {}
for side in ['base', 'new']:
    A = [load(f'{pre}{side}-{i}')[0]['p95'] for i in range(1, 6)]; B = [load(f'{pre}{side}-{i}')[1]['p95'] for i in range(1, 6)]
    rows[side] = (A, st.median(A), B, st.median(B))
    print(side, 'A p95', A, 'median', st.median(A), '| B p95', B, 'median', st.median(B))
g = rows['base'][1] * 1.15  # v0.63.0 條件 10：≤ 85c38c6a 同情境（A 段＝同四個角色）×1.15
print('門檻＝85c38c6a 同情境（A 段）p95 中位 %.3f ×1.15 = %.3f；新版 A 段中位 %.3f ⇒ %s' % (rows['base'][1], g, rows['new'][1], '過' if rows['new'][1] <= g else '紅'))
print('參考：B 段（既有手）基準中位 %.3f／新版中位 %.3f' % (rows['base'][3], rows['new'][3]))
