# 條件 7／8 盲讀圖組（同示意第一輪 A 組做法：遊戲取景 844×390＋安全區 47/47/21、南席近側推錢手背朝上，
# 同一幀隱去 HUD 的截圖，以手的投影包圍盒中心裁 190×120、放大 2×（只為檢視；手本身未縮放））。
# python blind_set.py <measure.json> <raw 資料夾> <輸出資料夾> <答案鍵 json> <組名> <hand1,hand2,...> <種子>
# 檔名打亂（固定種子），答案鍵另存——不得交給讀者。
import sys, json, os, random
from PIL import Image
meas, raw, outd, keyf, grp, hands, seed = sys.argv[1:8]
m = json.load(open(meas, encoding='utf-8'))
hands = hands.split(',')
rng = random.Random(int(seed)); order = hands[:]; rng.shuffle(order)
os.makedirs(outd, exist_ok=True)
key = {}
CW, CH, K = 190, 120, 2
for i, h in enumerate(order):
    r = [x for x in m['results'] if x['hand'] == h and x['seat'] == 0 and x['pose'] == 'back'][0]
    im = Image.open(os.path.join(raw, r['nohud'])).convert('RGB'); bx = r['handBox']
    cx, cy = bx['x0'] + bx['w'] / 2, bx['y0'] + bx['h'] / 2
    x0 = int(min(max(0, cx - CW / 2), im.width - CW)); y0 = int(min(max(0, cy - CH / 2), im.height - CH))
    name = f'{grp}{i + 1}.png'
    im.crop((x0, y0, x0 + CW, y0 + CH)).resize((CW * K, CH * K), Image.LANCZOS).save(os.path.join(outd, name))
    key[name] = h
k = json.load(open(keyf, encoding='utf-8')) if os.path.exists(keyf) else {}
k[grp] = {'seed': int(seed), 'source': os.path.basename(meas), 'files': key}
json.dump(k, open(keyf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', len(key), 'images to', outd)
