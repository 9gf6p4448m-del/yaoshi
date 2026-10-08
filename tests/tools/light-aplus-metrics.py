# v0.65.0 光影 A+ 量測（凍結 #3／#5）。輸入＝light-aplus-shoot.mjs 的產出前綴（同一場景）：
#   python light-aplus-metrics.py <base前綴> <aplus前綴> [<fx0前綴>]
# base＝v0.64.0 樹；aplus＝本分支預設（另有 -nosh.png：同幀陰影取樣關掉）；fx0＝本分支 ?fx=0。亮度＝Rec.709 luma（0–255）。
import json, sys
import numpy as np
from PIL import Image

def img(p): return np.asarray(Image.open(p).convert('RGB')).astype(float)
def luma(a): return 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
def rel(a):  # WCAG 相對亮度
    c = a/255.0; c = np.where(c <= 0.03928, c/12.92, ((c+0.055)/1.055)**2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

bp, ap = sys.argv[1], sys.argv[2]; fp = sys.argv[3] if len(sys.argv) > 3 else None
B, A = img(bp+'.png'), img(ap+'.png'); LB, LA = luma(B), luma(A)
h, w = LB.shape; bh, bw = int(h*.15), int(w*.15)
band = np.ones((h, w), bool); band[bh:h-bh, bw:w-bw] = False
# 只取 3D 像素：同一刻把 3D 畫布藏起來的那張（-nocanvas）與正常那張亮度差 >4 的像素（任一案成立即算）＝3D 透得出來的地方。
# 示意 band3d.py 用「五案間差 >4」，其中 A 案幾乎改到每一個 3D 像素；本治具只有兩案（現況／A+），兩案差的遮罩會退化，所以改用畫布遮罩。
live = (np.abs(LB - luma(img(bp+'-nocanvas.png'))) > 4) | (np.abs(LA - luma(img(ap+'-nocanvas.png'))) > 4)
m = band & live
m2 = band & (np.abs(LA-LB) > 4)
out = {'band3d': {'px': int(m.sum()), 'base': round(float(LB[m].mean()), 2), 'aplus': round(float(LA[m].mean()), 2),
                  'pairMaskPx': int(m2.sum())}}
out['band3d']['ratio'] = round(out['band3d']['aplus']/out['band3d']['base'], 3)
# 示意同判準：base 樹同一凍結幀套示意 A／B／C／A+（-mock*.png）加上產品 A+，六案間亮度差 >4 的像素＝3D（＝示意 band3d.py 的五案遮罩＋產品）
import os
mk = {v: bp+'-mock'+v+'.png' for v in ['A', 'B', 'C', 'Aplus', 'base']}
if all(os.path.exists(f) for f in mk.values()):
    ML = {v: luma(img(f)) for v, f in mk.items()}
    st = np.stack([LB, LA] + [ML[v] for v in ['A', 'B', 'C', 'Aplus']])
    m5 = band & ((st.max(0) - st.min(0)) > 4)
    out['band3dMock'] = {'px': int(m5.sum()), 'base': round(float(LB[m5].mean()), 2), 'aplus': round(float(LA[m5].mean()), 2),
                         **{'mock' + v: round(float(ML[v][m5].mean()), 2) for v in ['A', 'C', 'Aplus']}}
    b5 = out['band3dMock']; b5['ratioBase'] = round(b5['aplus']/b5['base'], 3); b5['ratioMockA'] = round(b5['aplus']/b5['mockA'], 3)

cy0, cy1, cx0, cx1 = int(h*.35), int(h*.70), int(w*.25), int(w*.75)
out['center'] = {'baseStd': round(float(LB[cy0:cy1, cx0:cx1].std()), 2), 'aplusStd': round(float(LA[cy0:cy1, cx0:cx1].std()), 2),
                 'baseLum': round(float(LB[cy0:cy1, cx0:cx1].mean()), 2), 'aplusLum': round(float(LA[cy0:cy1, cx0:cx1].mean()), 2)}
if 'band3dMock' in out:
    out['center']['mockAplusStd'] = round(float(ML['Aplus'][cy0:cy1, cx0:cx1].std()), 2)
    out['center']['mockAStd'] = round(float(ML['A'][cy0:cy1, cx0:cx1].std()), 2)
# #3c 法寶投影：同幀「陰影取樣關掉」減「開著」＞6 的像素＝陰影區；取最大的 8 個連通塊（≥80px），鄰帶＝塊外 3–12px、不在任何陰影裡、
# 且無影亮度與該塊無影亮度相近（±25%，排除法寶本體與其他材質）的像素；比的是 A+ 圖上「陰影區 vs 相鄰無影桌布」。
try:
    from scipy import ndimage
except Exception:
    ndimage = None
def shadow_metric(Lshot, N, L):
    sh = (N - L) > 6
    if ndimage is None or sh.sum() == 0: return None
    lab, n = ndimage.label(sh); sizes = ndimage.sum(sh, lab, range(1, n+1))
    res = []
    for k in np.argsort(sizes)[::-1][:8]:
        comp = lab == (k+1)
        if comp.sum() < 80: continue
        ring = ndimage.binary_dilation(comp, iterations=12) & ~ndimage.binary_dilation(comp, iterations=3) & ~sh
        ref = N[comp].mean()
        ring &= np.abs(N - ref) < 0.25*ref
        if ring.sum() < 40: continue
        ys, xs = np.nonzero(comp)
        res.append({'px': int(comp.sum()), 'ringPx': int(ring.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                    'shadowLum': round(float(Lshot[comp].mean()), 2), 'ringLum': round(float(Lshot[ring].mean()), 2),
                    'drop': round(float(1 - Lshot[comp].mean()/Lshot[ring].mean()), 3), 'comp': comp, 'ring': ring})
    return res
try:
    # 陰影「開」與「關」兩張都是凍結後同一狀態直接重畫的（-resh／-nosh），不拿 rAF 那一幀比（凍結 1 秒後導演包絡等以 now 計的量會動）
    N = luma(img(ap+'-nosh.png')); S = luma(img(ap+'-resh.png'))
    comps = shadow_metric(S, N, S) or []
    out['shadow'] = [{k: v for k, v in c.items() if k not in ('comp', 'ring')} for c in comps]
    if fp:
        F = luma(img(fp+'.png'))
        out['shadowFx0'] = [{'px': c['px'], 'shadowLum': round(float(F[c['comp']].mean()), 2), 'ringLum': round(float(F[c['ring']].mean()), 2),
                             'drop': round(float(1 - F[c['comp']].mean()/F[c['ring']].mean()), 3)} for c in comps]
        # 雙向判定：同一塊在 A+ 暗 ≥15%、在 ?fx=0 暗 <15%（排除本來就暗的地方，例如既有的接觸陰影貼花）
        out['shadowPass'] = [i for i, (c, f) in enumerate(zip(out['shadow'], out['shadowFx0'])) if c['drop'] >= 0.15 and f['drop'] < 0.15]
except FileNotFoundError:
    pass
# #5 HUD：各方框內 5%／95% 分位像素的 WCAG 對比（文字對底）與 luma 差；同框兩案比
hud = json.load(open(ap+'.json', encoding='utf-8'))['hud']
RB, RA = rel(B), rel(A)
out['hud'] = {}
for k, r in hud.items():
    if not r: continue
    x0, y0 = max(0, int(r['x'])), max(0, int(r['y'])); x1, y1 = min(w, int(r['x']+r['w'])), min(h, int(r['y']+r['h']))
    if x1 <= x0 or y1 <= y0: continue
    d = {}
    for tag, R, L, I in (('base', RB, LB, B), ('aplus', RA, LA, A)):
        rr = R[y0:y1, x0:x1].ravel(); ll = L[y0:y1, x0:x1].ravel()
        lo, hi = np.percentile(rr, 5), np.percentile(rr, 95)
        d[tag] = {'wcag': round(float((hi+0.05)/(lo+0.05)), 3), 'lumaSpread': round(float(np.percentile(ll, 95)-np.percentile(ll, 5)), 2),
                  'meanRGB': [round(float(v), 1) for v in I[y0:y1, x0:x1].reshape(-1, 3).mean(0)]}
    d['wcagChange'] = round(d['aplus']['wcag']/d['base']['wcag'] - 1, 4)
    d['spreadChange'] = round(d['aplus']['lumaSpread']/d['base']['lumaSpread'] - 1, 4) if d['base']['lumaSpread'] else None
    d['text'] = r.get('text')
    out['hud'][k] = d
if fp:
    F = img(fp+'.png'); diff = np.abs(F - B).max(-1)
    out['fx0VsBase'] = {'diffPx': int((diff > 0).sum()), 'maxDiff': int(diff.max())}
print(json.dumps(out, ensure_ascii=False, indent=1))
