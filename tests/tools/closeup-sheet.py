# -*- coding: utf-8 -*-
"""近景切鏡卷 批 1（v0.45）P8：把 closeup-shots.mjs 拍的連拍拼成一張 contact sheet。

用法：
    python tests/tools/closeup-sheet.py <橫式目錄> <直式目錄> <輸出目錄>

每一格底下標「時間點／事件名／量到的相機距離」——圖說用的是治具當場記在 shots.json 的數字，
不是事後回想的（dist＝|camera.position|，4.2＝全景、2.6＝近景滿幅、更小的是 punch 疊上去）。
需要 Pillow（python -c "import PIL"）。
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

CAPS = {
    "01-lineup": "① 開場列陣（全景）",
    "02-beat1-wide": "② 一拍開打",
    "03-focus-in": "③ 近景進場：出手者與目標推近",
    "04-focus-hold": "④ 近景停留：其餘尊退暗、傷害跳字",
    "05-focus-dmg": "⑤ 停格瞬間：跳字＋出手卡",
    "07-burn-follow": "⑦ 燒毀跟拍：鏡頭跟著化灰那一尊",
    "08-burn-ash": "⑧ 化灰中",
    "06-focus-back": "⑥ 命中切鏡回位（此格已接上燒毀切鏡）",
    "09-burn-back": "⑨ 回全景",
    "10-duel-end": "⑩ 拍末／收場",
}
ORDER = ["01-lineup", "02-beat1-wide", "03-focus-in", "04-focus-hold", "05-focus-dmg",
         "07-burn-follow", "08-burn-ash", "06-focus-back", "09-burn-back", "10-duel-end"]

FONT = "C:/Windows/Fonts/msjh.ttc"


def load(font_size):
    try:
        return ImageFont.truetype(FONT, font_size)
    except Exception:
        return ImageFont.load_default()


def main():
    land, port, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(outdir, exist_ok=True)
    li = json.load(open(os.path.join(land, "shots.json"), encoding="utf-8"))
    pi = json.load(open(os.path.join(port, "shots-portrait.json"), encoding="utf-8"))
    info = {s["name"]: s for s in li["shots"]}
    pinfo = {s["name"]: s for s in pi["shots"]}

    cw, ch = 640, 296          # 每格圖片大小（844×390 等比縮到 640 寬）
    cap_h = 46                 # 圖說高度
    cols, gap, pad = 2, 14, 18
    rows = (len(ORDER) + cols - 1) // cols
    pw, ph = 296, 640          # 直式縮圖
    head = 62
    W = pad * 2 + cols * cw + gap
    H = head + pad + rows * (ch + cap_h + gap) + (ph + cap_h + gap + 24) + pad

    sheet = Image.new("RGB", (W, H), (16, 13, 24))
    d = ImageDraw.Draw(sheet)
    f_t, f_c, f_s = load(26), load(17), load(14)
    d.text((pad, 16), "妖市 v0.45 對決近景切鏡・批 1 原型（844×390 連拍，一場對決）", font=f_t, fill=(240, 216, 160))

    y = head + pad
    for i, name in enumerate(ORDER):
        s = info.get(name)
        if not s or not os.path.exists(s["file"]):
            continue
        im = Image.open(s["file"]).convert("RGB").resize((cw, ch))
        x = pad + (i % cols) * (cw + gap)
        yy = y + (i // cols) * (ch + cap_h + gap)
        sheet.paste(im, (x, yy))
        d.rectangle([x, yy, x + cw - 1, yy + ch - 1], outline=(70, 60, 96))
        nfo = s.get("info") or {}
        d.text((x + 2, yy + ch + 4), CAPS.get(name, name), font=f_c, fill=(236, 230, 240))
        sub = "dist=%s　三拍燈亮 %s　跳字 %s　出手卡 %s　量表 %s" % (
            nfo.get("dist"), nfo.get("lamps"), nfo.get("floats"), nfo.get("card"),
            "/".join(nfo.get("gauge") or []))
        d.text((x + 2, yy + ch + 24), sub, font=f_s, fill=(160, 152, 176))

    y2 = y + rows * (ch + cap_h + gap)
    d.text((pad, y2 - 6), "390×844 直式（產品在直式本來會蓋「請轉橫」提示，這兩張是把蓋板關掉拍的，只為看 HUD 會不會溢出）",
           font=f_c, fill=(240, 216, 160))
    px = pad
    for name in ["01-lineup", "04-focus-hold"]:
        s = pinfo.get("p-" + name) or pinfo.get(name)
        if not s or not os.path.exists(s["file"]):
            continue
        im = Image.open(s["file"]).convert("RGB").resize((pw, ph))
        sheet.paste(im, (px, y2 + 22))
        d.rectangle([px, y2 + 22, px + pw - 1, y2 + 22 + ph - 1], outline=(70, 60, 96))
        nfo = s.get("info") or {}
        d.text((px + 2, y2 + 26 + ph), CAPS.get(name, name), font=f_c, fill=(236, 230, 240))
        scroll = nfo.get("scroll") or [0, 0]
        d.text((px + 2, y2 + 46 + ph), "捲動高 %s／可視高 %s" % (scroll[0], scroll[1]), font=f_s, fill=(160, 152, 176))
        px += pw + gap

    out = os.path.join(outdir, "contact-sheet.png")
    sheet.save(out)
    print(json.dumps({"out": out, "size": sheet.size, "frames": len(ORDER)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
