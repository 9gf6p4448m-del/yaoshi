# v0.61.0 產品拼圖（給使用者看；由示意卷 contact_b1.py 複製，只改輸入輸出路徑與標題）：python contact_v061.py <raw 資料夾> <tag=v061>
# 產出（上層資料夾）：contact-b1.png（南席 4 角色×3 姿勢＋對照列 4 隻既有手）、contact-b1-north.png（北席手背朝上）、
#   compare-<角色>.png（參考圖 vs 渲染）、hud-cover.json（每格手被 HUD 蓋到的比例）。
# 格內的圖＝同一幀、同一台遊戲相機（844×390＋安全區 47/47/21）隱去 HUD 的截圖，裁手的周圍再放大 2×／3× 只為檢視（手本身沒縮放）。
import sys, json, os
from PIL import Image, ImageDraw, ImageFont, ImageChops
import numpy as np
TAG = sys.argv[2] if len(sys.argv) > 2 else 'v061'
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]; OUTD = os.path.join(HERE, '..', 'final'); os.makedirs(OUTD, exist_ok=True)
REF = 'C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/out/ref/hand/batch1-photo'
m = json.load(open(os.path.join(RAW, f'{TAG}-measure.json'), encoding='utf-8'))
F = lambda s: ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', s)
FB = lambda s: ImageFont.truetype('C:/Windows/Fonts/msjhbd.ttc', s)
NAME = {'qingmian': '青面攤主', 'hongyi': '紅衣婆婆', 'duanshou': '斷手書生', 'zutou': '大家樂組頭', 'default': '一般手（預設）', 'shoujing': '收驚婆', 'dangpu': '陰間當鋪', 'hunter': '獵人'}
POSE = {'back': '手背朝上（推錢）', 'claw': '爪形取錢（敗方收）', 'press': '掌心按住（拍令牌）'}
B1 = ['qingmian', 'hongyi', 'duanshou', 'zutou']; CTRL = ['default', 'shoujing', 'dangpu', 'hunter']
def row(h, seat, pose): return [x for x in m['results'] if x['hand'] == h and x['seat'] == seat and x['pose'] == pose][0]
def hud_cover(r):
    a = np.asarray(Image.open(os.path.join(RAW, r['game'])).convert('RGB')).astype(int); b = np.asarray(Image.open(os.path.join(RAW, r['nohud'])).convert('RGB')).astype(int)
    bx = r['handBox']; x0, y0 = max(0, int(bx['x0'])), max(0, int(bx['y0'])); x1, y1 = min(a.shape[1], int(bx['x0'] + bx['w'])), min(a.shape[0], int(bx['y0'] + bx['h']))
    full = max(1, int(bx['w']) * int(bx['h']))
    if x1 <= x0 or y1 <= y0: return 1.0
    d = (np.abs(a[y0:y1, x0:x1] - b[y0:y1, x0:x1]).sum(2) > 24).sum()
    off = full - (x1 - x0) * (y1 - y0)  # 包圍盒落在畫面外的部分也算看不到
    return round(max(0.0, min(1.0, (d + max(0, off)) / full)), 3)
def crop(r, cw, ch, k):
    im = Image.open(os.path.join(RAW, r['nohud'])).convert('RGB'); bx = r['handBox']
    cx, cy = bx['x0'] + bx['w'] / 2, bx['y0'] + bx['h'] / 2
    x0 = int(min(max(0, cx - cw / 2), im.width - cw)); y0 = int(min(max(0, cy - ch / 2), im.height - ch))
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize((cw * k, ch * k), Image.LANCZOS)
covers = {}
# ── 南席 contact ──
CW, CH, K = 190, 120, 2; LW = 150; TH = 46; GAP = 6
hands = B1 + CTRL
W = LW + 3 * (CW * K + GAP) + GAP; H = TH + len(hands) * (CH * K + 30 + GAP) + 60
sheet = Image.new('RGB', (W, H), (18, 16, 20)); d = ImageDraw.Draw(sheet)
d.text((10, 8), 'v0.61.0 批 1 身分變體（產品）— 南席（近側）遊戲取景 844×390＋安全區 47/47/21｜格內＝同一幀隱去 HUD、裁手周圍放大 2×（只為檢視；手未縮放）', font=F(17), fill=(235, 225, 210))
for j, p in enumerate(['back', 'claw', 'press']): d.text((LW + GAP + j * (CW * K + GAP) + 6, TH - 18), POSE[p], font=FB(16), fill=(240, 200, 120))
y = TH + 4
for i, h in enumerate(hands):
    if i == len(B1): d.line((8, y - 3, W - 8, y - 3), fill=(120, 110, 90), width=2); d.text((10, y), '對照列（既有手，v0.61.0 不變）', font=F(13), fill=(170, 160, 140)); y += 18
    d.text((10, y + 10), NAME[h], font=FB(19), fill=(250, 240, 220) if h in B1 else (190, 185, 175))
    for j, p in enumerate(['back', 'claw', 'press']):
        r = row(h, 0, p); c = hud_cover(r); covers[f's0-{h}-{p}'] = c
        x = LW + GAP + j * (CW * K + GAP); sheet.paste(crop(r, CW, CH, K), (x, y))
        cap = f"手寬 {r['handBox']['w']:.0f}px／指根 {r['knucklePx']:.0f}px｜{r['tris']} 面·{r['calls']} draw｜HUD 蓋 {c*100:.0f}%"
        d.text((x + 4, y + CH * K + 4), cap, font=F(13), fill=(255, 140, 120) if c > 0.3 else (200, 195, 185))
    y += CH * K + 30 + GAP
d.text((10, y + 4), '姿勢＝遊戲真實動作：推錢 ys:bid 後 28 步、敗方收 揭盅後 12 步、拍令牌 落地後 11 步（手動時鐘 1/60 秒）。HUD 蓋＝有／無 HUD 兩張同幀截圖在手包圍盒內不同的像素比例（含出畫面部分）。', font=F(13), fill=(170, 165, 155))
d.text((10, y + 24), '紅字＝手的包圍盒超過三成被 HUD 蓋住或出畫面（整張含 HUD 的原圖在 raw/*-game.png）。', font=F(13), fill=(255, 140, 120))
sheet.save(os.path.join(OUTD, f'contact-{TAG}.png'))
# ── 北席 ──
CW2, CH2, K2 = 110, 90, 3
W2 = 4 * (CW2 * K2 + GAP) + GAP; H2 = 40 + 2 * (CH2 * K2 + 56 + GAP)
sh2 = Image.new('RGB', (W2, H2), (18, 16, 20)); d2 = ImageDraw.Draw(sh2)
d2.text((10, 8), '北席（遠側）手背朝上（推錢）— 同一幀隱去 HUD，裁手周圍放大 3×（只為檢視）；下排＝現行對照', font=F(17), fill=(235, 225, 210))
for i, h in enumerate(hands):
    r = row(h, 1, 'back'); c = hud_cover(r); covers[f's1-{h}-back'] = c
    x = GAP + (i % 4) * (CW2 * K2 + GAP); y = 40 + (i // 4) * (CH2 * K2 + 56 + GAP)
    sh2.paste(crop(r, CW2, CH2, K2), (x, y))
    d2.text((x + 4, y + CH2 * K2 + 4), NAME[h], font=FB(16), fill=(250, 240, 220))
    d2.text((x + 4, y + CH2 * K2 + 26), f"手寬 {r['handBox']['w']:.0f}px／指根 {r['knucklePx']:.0f}px｜HUD 蓋 {c*100:.0f}%", font=F(13), fill=(200, 195, 185))
sh2.save(os.path.join(OUTD, f'contact-{TAG}-north.png'))
# ── 參考圖 vs 渲染（每角色一張）──
for h in B1:
    ref = Image.open(os.path.join(REF, f'{h}-sheet.jpg')).convert('RGB'); rw = ref.width // 3
    cells = [ref.crop((k * rw, 0, (k + 1) * rw, ref.height)) for k in range(3)]
    CWc = 420; s_ = Image.new('RGB', (40 + 3 * (CWc + GAP), 60 + 3 * 250 + 40), (18, 16, 20)); dd = ImageDraw.Draw(s_)
    dd.text((10, 8), f'{NAME[h]}｜上：參考圖（Gemini 照片風，只當形狀／比例參考）　中：渲染特寫（固定相對掌心的相機，不經後製）　下：遊戲取景 2×', font=F(16), fill=(235, 225, 210))
    for j, p in enumerate(['back', 'claw', 'press']):
        x = 20 + j * (CWc + GAP)
        c = cells[j]; c = c.resize((int(c.width * 235 / c.height), 235), Image.LANCZOS); s_.paste(c, (x + (CWc - c.width) // 2, 40))  # 整格等比縮進（不裁）
        r = row(h, 0, p)
        cl = Image.open(os.path.join(RAW, r['close'])).convert('RGB'); cl = cl.resize((CWc, int(cl.height * CWc / cl.width)), Image.LANCZOS).crop((0, 0, CWc, 235)); s_.paste(cl, (x, 40 + 250))
        g = crop(r, 210, 117, 2); s_.paste(g, (x, 40 + 500))
        dd.text((x + 4, 40 + 735), POSE[p], font=F(14), fill=(240, 200, 120))
    s_.save(os.path.join(OUTD, f'compare-{h}.png'))
json.dump(covers, open(os.path.join(OUTD, f'hud-cover-{TAG}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(covers, ensure_ascii=False))
