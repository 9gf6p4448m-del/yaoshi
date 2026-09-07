# 傳說三尊美術卷 V1 證據（2026-09-07，第一段：三方案截圖）

凍結檔：`docs/experiments/2026-09-07-acceptance-legend-art.md`。基準 `38aa437`（v0.48）。
**做到這裡停下來等使用者挑**（可混搭）；V2 之後不在本段。

## 內容
| 路徑 | 是什麼 |
|---|---|
| `sheet-v1.png` | 3 尊 × 3 方案 × 2 圖的 contact sheet（上 hero／下 stage-lit），每格標方案一句話與差異點 |
| `specgen/build_{canri,dashiye,youyinggong}.mjs` | 三支 spec 產生器。`node <檔> ` 會把 `r1a|r1b|r1c` 的 `.json` 與 `.claims.json` 寫進 `tools/anyCreature/out/<id>/`；claims 與 spec 由同一次執行寫出，在第一次編譯之前 |
| `specgen/sheet.py` | 拼 contact sheet 的腳本（PIL） |
| `specs/*.json` | 九份 spec 與九份 claims 的副本（`tools/anyCreature/` 在 `.gitignore`，所以在這裡留一份可版控的） |

## 重跑步驟
```
node docs/experiments/2026-09-07-legend-art-evidence/specgen/build_canri.mjs
node tools/anyCreature/engine/cli.js tools/anyCreature/out/canri/r1a.json tools/anyCreature/out/canri/r1a.glb
node tools/anyCreature/harness/judge.mjs tools/anyCreature/out/canri/r1a.glb tools/anyCreature/out/canri/j_r1a canri_r1a --spec tools/anyCreature/out/canri/r1a.claims.json
node tools/anyCreature/harness/hero.mjs tools/anyCreature/out/canri/r1a.glb tools/anyCreature/out/canri/hero_r1a
node tests/tools/creature-shoot.mjs tools/anyCreature/out/canri/stage_r1a.png "glb=/tools/anyCreature/out/canri/r1a.glb&light=1&fx=1&rim=zuli" idle 9081
python docs/experiments/2026-09-07-legend-art-evidence/specgen/sheet.py
```
- **`judge.mjs` 一律不帶 `--stage`**（量產凍結檔 2026-09-05 加嚴條款）。
- **`creature-shoot.mjs` 的 `glb=/tools/...` 絕對路徑不能從 Git Bash 呼叫**：MSYS 會把開頭的 `/` 改寫成 `C:/Program Files/Git/tools/...`，GLB 變成 404 的 HTML，GLTFLoader 報 `Unexpected token '<'`。從 PowerShell 呼叫，或加 `MSYS_NO_PATHCONV=1`。
- 本卷在 worktree 裡用 `New-Item -ItemType Junction` 把 `tools/anyCreature` 指向主樹（該路徑在 `.gitignore`，junction 全程沒進過 diff）。

## 本卷踩到的引擎限制（寫給第二段）
1. **`part_attachment` 量的是「所有頂點到宿主鏈心的最小距離 − 該環的最大半徑」**，所以**任何四角外挑的簷／盤**（每個頂點都在宿主的角半徑之外）掛在 chain 關節上必 BLOCK。三尊的日盤、小龕的簷、瓦頂、香爐一律改掛**鬆散關節**（`joints` 裡給絕對座標、不屬任何 chain、由 `attach` 掛到宿主關節；`compile.js` 讓 `hostChain=null`，`checks.js` 整條略過）——同 `bow._loose_joints`。**代價：這幾件的貼合沒有機器在守**，只有肉眼與 hero 圖。
2. **薄板 fin 的「高與厚同量級」會在 bind pose 生翻面**：有應公的正脊高 0.046／厚 0.034 → `mesh_integrity: bind pose has 2 flipped tris`；改成高 0.088／厚 0.018 立刻綠。歸因＝封口三角的頂點法線被側面法線壓過去。**診斷法**：逐一拿掉零件重編（`.claude/tmp/bisect.mjs` 那種），但要看 `mesh_integrity` 那一行而不是 `anim_integrity`——後者每個關鍵影格都報一次，會蓋掉真正的靜態成因。
3. **外擴斜率 > 約 0.4 必翻面**（boartusk `_traps` ⑫ 複驗成立）：殘日的肩從 0.054→0.135 走 0.10 弧長（斜率 0.79）直接 BLOCK，壓到 0.25 以下才綠。
4. **`mirrored: true` 是對世界 X=0 鏡射，不是對宿主鏡射**：有應公 r1b 的香爐擺在 x=+0.215，`mirrored` 的爐耳掉到左邊空中（hero 上一支孤立的金鉤）。偏離中線的掛件要明寫兩份。
5. **`saturation_area` 的分母是生物的像素，不是整張圖**：大士爺把青面（S=0.56）算進去就 64.6%／75.9% 超 60% 上限。**支撐質量一律去飽和，高飽和只留在招牌部位**——這正是 judge 訊息自己說的處置。
6. **judge 的 `view` 只認 `front/side/tq/reartq/top`**：claims 寫 `fq` 會讓 judge 直接 crash（`Cannot read properties of undefined (reading 'bodyPx')`），不是紅燈是當掉。本卷第一版 claims 誤寫 `fq`，在**第一次成功 judge 之前**改成 `front`（識別視角的敘述本來就寫 front），此後三尊九份 claims 一格未動。

## 假設（第二段要驗）
- 三尊的識別視角都取**正視 front**（殘日的盤、大士爺的臉與滾邊、有應公的龕口都在正面），與 27 隻多半取側視不同；`part_visible`／`share_hierarchy` 的門檻據此訂。
- 有應公的龕口內裡取近黑（`bow._traps_3B ④`「近黑＝洞、亮＝器官」），只在深處留一小片 `mouth_glow`。若第二段盲讀讀成「一張臉」，要動的是那一小片而不是龕口。
- 三尊都**沒有做過盲讀**（V2 才做）。本段的「讀起來像什麼」全部是我自己看 hero 的第一印象，不構成 M-A1 證據。
