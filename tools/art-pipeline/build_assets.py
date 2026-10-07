"""妖市寫實美術素材管線：Gemini 綠／洋紅底原圖 → 去背 → 頭像／圖示／選角大圖 webp。

用法：python -I -X utf8 tools/art-pipeline/build_assets.py --src <素材根目錄> [--out <專案根>] [--sheet <對照圖輸出路徑>]
素材根目錄結構：圖示/<品名>.png、頭像/<角色>_<健康|蒼白|瀕死>.png（媽祖令旗、魔神仔紅帽用 _v2）
品名↔key 對照由本腳本從 index.html 的 POOL／CURSES／CURSE_KIND 解析，不手打；結果寫 tools/art-pipeline/manifest.json。
純標準工具：Pillow＋numpy。可重跑（輸出覆寫同名檔）。
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

# 角色：ROLES id → (CHAR_SVG 檔名 stem, 中文名, 底盤色 --disc 的 fallback hex)
# stem 與 index.html 的 CHAR_SVG 一致（id≠stem 的 5 組：hunter→lieren 等）；底盤色取自各 SVG 的 --disc fallback
ROLES = {
    "qingmian": ("qingmian", "青面攤主", "#c07c30"),
    "hongyi": ("hongyi", "紅衣婆婆", "#3d6e4e"),
    "duanshou": ("duanshou", "斷手書生", "#c84040"),
    "shoujing": ("shoujing", "收驚婆", "#c84040"),
    "dangpu": ("dangpu", "陰間當鋪", "#3d6e4e"),
    "hunter": ("lieren", "獵人", "#8b6040"),
    "xiaonv": ("xiaonu", "孝女白琴", "#3d6e4e"),
    "lvshan": ("lushan", "閭山法師", "#3d6e4e"),
    "zutou": ("zuhe", "大家樂組頭", "#c07c30"),
    "luzhu": ("pud", "普渡爐主", "#c84040"),
}
# 袍色 --cloth（對決人形用）。hongyi 的 SVG 值是 var(--c-xianghu,#c84040)，fallback 為 #c84040
CLOTH = {
    "qingmian": "#7a3020", "hongyi": "#c84040", "duanshou": "#3f4d80", "shoujing": "#5f7358",
    "dangpu": "#1c1a26", "hunter": "#c9a24a", "xiaonv": "#ece6dc", "lvshan": "#2e2a44",
    "zutou": "#2e2a3e", "luzhu": "#d8a038",
}
STATES = {"healthy": "健康", "pale": "蒼白", "dying": "瀕死"}
# 斷手書生、孝女白琴原圖頭部佔比偏小：手調裁切框（1254px 原圖座標，經 2026-10-07 對照圖驗證）
AVATAR_CROP = {"duanshou": (250, 170, 1000, 920), "xiaonv": (250, 200, 1000, 950)}
# 同名有 v2 重生版者以 v2 為準
ITEM_FILE_OVERRIDE = {"媽祖令旗": "媽祖令旗_v2", "魔神仔紅帽": "魔神仔紅帽_v2",
                      # 2026-10-07 盲讀 128px 認不出／符紙互相混淆 → 輪廓重生版
                      "水鬼浮標": "水鬼浮標_v2", "破軍旗": "破軍旗_v2", "抓交替水符": "抓交替水符_v2",
                      "香灰符": "香灰符_v2", "過陰咒": "過陰咒_v2"}
AV_SIZE, BIG_SIZE, ICON_SIZE, ICON_LG_SIZE = 320, 640, 128, 384
WEBP_Q = 85


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def detect_bg(arr):
    """取四角 20×20 區塊中位數，判斷綠底或洋紅底。"""
    h, w = arr.shape[:2]
    blocks = [arr[:20, :20], arr[:20, w - 20:], arr[h - 20:, :20], arr[h - 20:, w - 20:]]
    med = np.median(np.concatenate([b.reshape(-1, 3) for b in blocks]), axis=0)
    r, g, b = med
    # 相對判斷（角落可能被主體邊緣或光暈壓暗，例如中位數 (174,4,129)）
    if g > 120 and g > r + 60 and g > b + 60:
        return "green"
    if r > 100 and b > 100 and g < 60 and min(r, b) > g + 80:
        return "magenta"
    raise ValueError("無法判斷底色，四角中位數=%s" % (med,))


def key_rgba(path):
    """去背並壓底色溢色，回傳 (RGBA Image, 底色名)。"""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(float)
    bg = detect_bg(a)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    if bg == "green":
        m = G - np.maximum(R, B)
        alpha = 1 - np.clip((m - 30) / 90, 0, 1)
        a[..., 1] = np.where(alpha < 1, np.minimum(G, np.maximum(R, B)), G)
    else:
        m = np.minimum(R, B) - G
        alpha = 1 - np.clip((m - 50) / 110, 0, 1)
        spill = np.clip(m, 0, None) * (alpha < 1)
        a[..., 0] -= spill
        a[..., 2] -= spill
    a = np.clip(a, 0, 255)
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA"), bg


def save_webp(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=WEBP_Q, method=6)


def square_pad(im):
    bb = im.getbbox()
    im = im.crop(bb)
    s = max(im.size)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return out


def circle_avatar(im, disc_hex, size):
    """圓形底盤＋圓形裁切：底盤半徑 92.5% 直徑（對齊原 SVG r=74/80），圖與底盤同一圓遮罩，圓外透明。"""
    r = int(size * 0.925)
    off = (size - r) // 2
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(canvas).ellipse((off, off, off + r - 1, off + r - 1), fill=hex2rgb(disc_hex) + (255,))
    t = im.resize((r, r), Image.LANCZOS)
    mask = Image.new("L", (r, r), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, r - 1, r - 1), fill=255)
    t.putalpha(Image.fromarray(np.minimum(np.asarray(t)[..., 3], np.asarray(mask))))
    canvas.alpha_composite(t, (off, off))
    return canvas


def parse_items(index_html):
    t = open(index_html, encoding="utf-8").read()
    i = t.index("const POOL = [")
    pool = t[i:t.index("\n];", i)]
    items = []
    for n, rest in re.findall(r'\{n:"([^"]+)"([^\n]*)', pool):
        ab = re.search(r',ab:"(\w+)"', rest)
        m = re.search(r',m:"(\w+)"', rest)
        key = ab.group(1) if ab else (m.group(1) if m else None)
        if not key:
            raise ValueError("POOL 品項 %s 無 ab／m，無法決定 key" % n)
        items.append((n, key, "pool"))
    k = t.index("const CURSES = [")
    curses = re.findall(r'\{n:"([^"]+)"', t[k:t.index("\n];", k)])
    kinds = json.loads(re.search(r"const CURSE_KIND=(\{[^}]*\})", t).group(1))
    for n in curses:
        if n not in kinds:
            raise ValueError("CURSES 品項 %s 在 CURSE_KIND 沒有對應" % n)
        items.append((n, "curse-" + kinds[n], "curse"))  # 加前綴：白虎煞 kind=tiger 與虎爺印 ab=tiger 同名
    keys = [k for _, k, _ in items]
    dup = {k for k in keys if keys.count(k) > 1}
    if dup:
        raise ValueError("key 重複：%s" % dup)
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default=os.getcwd())
    ap.add_argument("--sheet", default=None, help="輸出 384px 放大對照圖（假字審查用）")
    ap.add_argument("--sheet-names", default=None, help="逗號分隔品名；預設全部詛咒品＋疑慮件")
    args = ap.parse_args()
    out = args.out
    items = parse_items(os.path.join(out, "index.html"))
    manifest = {"items": {}, "characters": {}, "bg": {}}
    sheet_imgs = []
    sheet_default = {"破軍旗", "陰陽眼銅錢", "抓交替水符", "王爺劍", "過陰咒", "香灰符", "縛靈鎖", "福壽綿長", "冥婚紅包", "魔神仔的芭樂", "白虎煞"}
    sheet_names = set(args.sheet_names.split(",")) if args.sheet_names else sheet_default

    for name, key, kind in items:
        stem = ITEM_FILE_OVERRIDE.get(name, name)
        p = os.path.join(args.src, "圖示", stem + ".png")
        im, bg = key_rgba(p)
        sq = square_pad(im)
        save_webp(sq.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS), os.path.join(out, "assets/items", key + ".webp"))
        lg = sq.resize((ICON_LG_SIZE, ICON_LG_SIZE), Image.LANCZOS)
        save_webp(lg, os.path.join(out, "assets/items", key + "-lg.webp"))
        manifest["items"][name] = key
        manifest["bg"][name] = bg
        if name in sheet_names:
            sheet_imgs.append((name, lg))

    for rid, (stem, zh, disc) in ROLES.items():
        manifest["characters"][rid] = {"stem": stem, "name": zh, "disc": disc, "cloth": CLOTH[rid]}
        for st, zhst in STATES.items():
            p = os.path.join(args.src, "頭像", "%s_%s.png" % (zh, zhst))
            im, bg = key_rgba(p)
            manifest["bg"]["%s_%s" % (zh, zhst)] = bg
            crop = AVATAR_CROP.get(rid)
            src = im.crop(crop) if crop else im
            save_webp(circle_avatar(src, disc, AV_SIZE), os.path.join(out, "assets/characters", "%s-%s.webp" % (stem, st)))
            if st == "healthy":
                big = im.resize((BIG_SIZE, BIG_SIZE), Image.LANCZOS)
                save_webp(big, os.path.join(out, "assets/characters", "%s-big.webp" % stem))

    mp = os.path.join(out, "tools/art-pipeline/manifest.json")
    os.makedirs(os.path.dirname(mp), exist_ok=True)
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)

    if args.sheet and sheet_imgs:
        cols = 4
        rows = (len(sheet_imgs) + cols - 1) // cols
        S = ICON_LG_SIZE
        sheet = Image.new("RGB", (cols * S, rows * S), (26, 10, 46))
        for i, (n, im) in enumerate(sheet_imgs):
            tile = Image.new("RGB", (S, S), (26, 10, 46))
            tile.paste(im, (0, 0), im)
            sheet.paste(tile, ((i % cols) * S, (i // cols) * S))
        sheet.save(args.sheet)
        print("對照圖：", args.sheet, [n for n, _ in sheet_imgs])

    n_av = len(ROLES) * 3
    print("圖示 %d 件（×2 尺寸）、頭像 %d、選角大圖 %d" % (len(items), n_av, len(ROLES)))
    print("底色判定：", {k: v for k, v in sorted(manifest["bg"].items())})


if __name__ == "__main__":
    sys.exit(main())
