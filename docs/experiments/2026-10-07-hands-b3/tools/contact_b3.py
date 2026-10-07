# v0.63.0 條件 13 素材（給主對話轉交使用者）：每角色一列「參考圖 | 遊戲截圖（手背朝上）| 遊戲截圖（抓取＝敗方扒錢）」並排 jpg，
# 以及盲讀用的三張無檔名提示單獨截圖 shot-a/b/c.png ＋ answer-key.json（順序固定寫在這裡，不照角色序）。
# python contact_b3.py <raw 資料夾> <tag> <輸出資料夾>
import sys, os, json
from PIL import Image, ImageDraw
raw, tag, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
REF = 'tools/anyCreature/out/ref/hand/batch3-photo/{}-sheet.jpg'
ROLES = ['xiaonv', 'lvshan', 'luzhu']
H = 420
def fit(im, h): return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
def crop_hand(path, box):  # 以手的投影包圍盒為中心裁 2:1，再放大到 H 高（遊戲畫面原解析度 844×390）
    im = Image.open(path).convert('RGB'); x0, y0, w, h = box['x0'], box['y0'], box['w'], box['h']
    cx, cy = x0 + w / 2, y0 + h / 2; hh = max(h, w / 1.6) * 1.5; ww = hh * 1.6
    l, t = max(0, cx - ww / 2), max(0, cy - hh / 2); r, b = min(im.width, l + ww), min(im.height, t + hh)
    return fit(im.crop((int(l), int(t), int(r), int(b))), H)
M = {(r['hand'], r['seat'], r['pose']): r for r in json.load(open(os.path.join(raw, f'{tag}-measure.json'), encoding='utf-8'))['results']}
for role in ROLES:
    ref = Image.open(REF.format(role)).convert('RGB'); ref = ref.crop((0, int(ref.height * 0.1), ref.width, int(ref.height * 0.9)))
    cells = [fit(ref, H)]
    for pose in ['back', 'claw']:
        r = M[(role, 0, pose)]
        cells.append(crop_hand(os.path.join(raw, r['game']), r['handBox']))
    full = [fit(Image.open(os.path.join(raw, M[(role, 0, p)]['game'])).convert('RGB'), H) for p in ['back', 'claw']]
    W = sum(c.width for c in cells) + 10 * (len(cells) - 1)
    W2 = sum(c.width for c in full) + 10
    sheet = Image.new('RGB', (max(W, W2), H * 2 + 40), (18, 18, 20)); x = 0
    for c in cells: sheet.paste(c, (x, 30)); x += c.width + 10
    x = 0
    for c in full: sheet.paste(c, (x, H + 40)); x += c.width + 10
    d = ImageDraw.Draw(sheet); d.text((6, 6), f'{role}: reference | game back-up (crop x) | game grab (crop) ; row 2 = full 844x390 frames', fill=(230, 230, 230))
    sheet.save(os.path.join(out, f'compare-{role}.jpg'), quality=90)
# 並排總表（三角色各一列，只放參考圖與兩張裁切）
rows = [Image.open(os.path.join(out, f'compare-{r}.jpg')).crop((0, 0, None or 10**6, H + 30)) for r in ROLES]
rows = [r.crop((0, 0, r.width, H + 30)) for r in rows]
allw = max(r.width for r in rows); allim = Image.new('RGB', (allw, sum(r.height for r in rows)), (18, 18, 20)); y = 0
for r in rows: allim.paste(r, (0, y)); y += r.height
allim.save(os.path.join(out, 'compare-all.jpg'), quality=90)
# 盲讀：三張單獨截圖（遊戲取景、手背朝上、裁成同一大小，檔名不帶角色）＋答案鍵
ORDER = {'a': 'luzhu', 'b': 'xiaonv', 'c': 'lvshan'}
BL, KEY = os.path.join(out, 'blind'), os.path.join(out, 'blind-key'); os.makedirs(BL, exist_ok=True); os.makedirs(KEY, exist_ok=True)  # 答案鍵與截圖分資料夾
for k, role in ORDER.items():
    r = M[(role, 0, 'back')]; crop_hand(os.path.join(raw, r['nohud']), r['handBox']).save(os.path.join(BL, f'shot-{k}.png'))
json.dump({'shot-a.png': ORDER['a'], 'shot-b.png': ORDER['b'], 'shot-c.png': ORDER['c'], 'note': '遊戲取景 844×390 南席手背朝上（推錢 28 步）、無 HUD 同幀、以手為中心裁切放大；參考圖：tools/anyCreature/out/ref/hand/batch3-photo/{xiaonv,lvshan,luzhu}-sheet.jpg'}, open(os.path.join(KEY, 'answer-key.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', os.listdir(out))
