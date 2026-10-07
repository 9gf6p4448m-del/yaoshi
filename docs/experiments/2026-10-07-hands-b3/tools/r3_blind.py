# R3 三方盲讀素材：孝女／閭山／爐主 遊戲取景（844×390 南席手背朝上推錢 28 步、無 HUD 同幀）以手為中心裁切放大，中性檔名、Fisher-Yates 打亂，答案鍵另資料夾。
# python r3_blind.py <shoot-b3 輸出資料夾> <tag> <截圖資料夾> <答案鍵資料夾> <seed>
import sys, os, json, random
from PIL import Image
raw, tag, out, keyd, seed = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
os.makedirs(out, exist_ok=True); os.makedirs(keyd, exist_ok=True)
M = {(r['hand'], r['seat'], r['pose']): r for r in json.load(open(os.path.join(raw, f'{tag}-measure.json'), encoding='utf-8'))['results']}
def crop_hand(path, box, H=420):  # 同 contact_b3.py
    im = Image.open(path).convert('RGB'); x0, y0, w, h = box['x0'], box['y0'], box['w'], box['h']
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(im.width, x0 + w), min(im.height, y0 + h); cx, cy = (xa + xb) / 2, (ya + yb) / 2
    ww = min(520, max(260, min(w, im.width) * 1.25)); hh = ww / 1.6
    l, t = max(0, min(im.width - ww, cx - ww / 2)), max(0, min(im.height - hh, cy - hh / 2)); c = im.crop((int(l), int(t), int(l + ww), int(t + hh)))
    return c.resize((round(c.width * H / c.height), H), Image.LANCZOS)
roles = ['xiaonv', 'lvshan', 'luzhu']; rng = random.Random(seed); order = roles[:]
for i in range(len(order) - 1, 0, -1): k = rng.randint(0, i); order[i], order[k] = order[k], order[i]
key = {}
for i, r in enumerate(order):
    n = f'shot-{"abc"[i]}.png'; crop_hand(os.path.join(raw, M[(r, 0, 'back')]['nohud']), M[(r, 0, 'back')]['handBox']).save(os.path.join(out, n)); key[n] = r
json.dump({'answer': key, 'seed': seed, 'shuffle': f'random.Random({seed}) Fisher-Yates', 'refs': 'tools/anyCreature/out/ref/hand/batch3-photo/{xiaonv,lvshan,luzhu}-sheet.jpg', 'framing': '844x390 南席手背朝上推錢 28 步、無 HUD、以手為中心裁切放大'}, open(os.path.join(keyd, 'answer-key.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(os.listdir(out))
