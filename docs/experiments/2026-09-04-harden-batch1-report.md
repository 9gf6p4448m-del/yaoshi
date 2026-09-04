# 硬化批 1 — `redhat`／`nail` 套用 rigid 渲染語言＋nail 加毛茸虎前肢（2026-09-04）

基準＝main `be669eb`（本 worktree 開卷時停在 `63e5a28`，落後三個 commit，已 `git merge --ff-only be669eb` 快轉到基準才動手）。工具在主工作樹 `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/` 執行（worktree 內建 junction 借 `node_modules` 給 `creature-shoot.mjs`，`tools/anyCreature/` 在 `.gitignore` 第 3 行）；下面把 worktree 絕對路徑縮寫成 `<WT>`。

## ① 驗收一覽

| 閘門 | 結果 | 數字 |
|---|---|---|
| H-A0 `redhat` judge 全綠／GLB ≤400KB／三支動畫 | **PASS** | `all claims pass`；**291.7KB**（353.6KB→291.7KB）；`idle/move/attack` |
| H-A0 `nail` judge 全綠／GLB ≤400KB／三支動畫 | **PASS** | `all claims pass`；**303.5KB**（271.7KB→303.5KB）；`idle/move/attack` |
| H-A1 before／after 對照圖 | **PASS** | 四張，路徑見 ④ |
| H-A2 `nail` 盲讀（context-free ×2） | **PASS（達標）** | **B 讀出「貓（或貓科獸人）」→ 命中「虎相關」**；兩位主印象都是「陰森」 |
| H-A3 diff 範圍 | **PASS** | 只有 `redhat.*`、`nail.*`、6 張對照／stage-lit 圖、本報告 |

不 commit 不 push。

## ② ★ 動手中途的一項判斷，需主對話裁定：`build:"rigid"` 單獨是**無作用的**

**事實（實測，不是推測）**：`engine/core/checks.js:106` 是整個引擎唯一讀 `spec.build` 的地方，而它只做一件事——`build !== "rigid"` 時，把 volume 上的 `"faceted": true` 判成 fail。換句話說 **`build:"rigid"` 本身不改任何幾何或法線，它只是「解鎖 `faceted`」的許可證**。`shield` 硬化版的平面感來自 `faceted: true`（`glb.js:94`：`deg = m.faceted ? 0 : smoothAngle`，等於把該 volume 的 smooth_angle 壓成 0），`assets/creatures/shield.json` 四個 volume 全帶 `faceted: true`。

**所以我先照 shield 的完整寫法做了一版（rigid＋全 volume `faceted`＋exp 4.8＋smooth_angle 26），結果撞到 H-A0**：

| 變體 | redhat | nail |
|---|---|---|
| rigid＋`faceted` 全開 | **510.5KB**（verts 7282）**超標** | **436.1KB**（verts 6114）**超標** |
| rigid＋`faceted` 只留頭部與四肢鏈 | **403.3KB**（verts 5453）**仍超標** | 346.7KB（verts 4590） |
| **rigid＋exp 4.8＋smooth_angle 26（本批出貨版）** | **291.7KB**（verts 3549） | **303.5KB**（verts 3751） |

`faceted` 把每個三角形拆成獨立頂點，頂點數約翻倍，GLB 跟著漲 ~70%。想把它塞回 400KB 只有粗化 `ring_step` 一條路（redhat 要 ×1.6 才到 390.1KB、nail 要 ×1.3 到 382.8KB），但**那會動到造型**：redhat 的帽沿破口在 profile 上只佔 t 0.205→0.255（實長約 0.011），比粗化後的一格 ring_step 還短，會被吃掉——派工寫明「造型與配色不動」，我不能為了塞進預算去動它，也不能為了塞進 `faceted` 去放寬 400KB（那是凍結的 H-A0）。

**出貨版因此照派工字面的三件事做**：`build:"rigid"` ＋ 所有 volume profile 列 `exp ≥ 4.8` ＋ 全檔 `smooth_angle` 24–26。實測這三件已經把 redhat 的軀幹與霧裾從圓潤團塊變成硬板（對照圖 ④ 看得很清楚），但**它不等於 shield 那一級的全平面感**。

**要主對話裁定的是**：要不要為了 shield 那一級的平面感，付出「粗化 tessellation」這個造型代價？三個選項——
- (甲) 維持現狀（本批出貨版），把 `faceted` 留給下一輪連同 `ring_step` 一起重新設計 profile；
- (乙) 只在 `nail` 上開 `faceted`（346.7KB 塞得下，redhat 塞不下 403.3KB），代價是兩隻語言不一致；
- (丙) 兩隻都開 `faceted` 並授權粗化 `ring_step`（等於同意動造型），我再逐一核對帽沿等小特徵有沒有被吃掉。

**另外建議修訂凍結檔 17:30 那條模板規則的字面**：「`build:"rigid"`＋斷面 `exp ≥4.5`＋`smooth_angle` 24–30」照字面做出來的東西，跟 shield 硬化版不是同一件事——規則要嘛補上 `faceted: true`（並連帶承認 GLB 預算要重談），要嘛拿掉 `build:"rigid"`（因為它單獨不做事）。這條**我沒有自行改動**。

## ③ 兩隻各改了什麼（`檔案:行號`）

### `assets/creatures/redhat.json`
- `:34` 新增 `"build": "rigid"`
- `:36` `smooth_angle` 12 → **26**；7 個 volume 的 `smooth_angle`（10／10／10／12／12／12／16）與 30 個 part 的（12／14／18／20）全部 → **26**（共 33 處）
- 7 個 volume 的 profile 共 **36 列**，`exp` 缺漏或 <4.8 的一律補到 **4.8**（`body` 原有的 5.0 保留）
- **座標（joints）、chains、attach、touch、palette、colors.arcs、animations 一個字都沒動**

### `assets/creatures/nail.json`
- `:31` 新增 `"build": "rigid"`；`:21` palette 新增 `"fur_arm": {"color": "#a8551c", "rough": 0.94}`
- `:12` 新增 `_tigerarm_note` 說明欄位
- 8 個 volume 的 profile 共 **36 列** `exp` → **4.8**；5 處 `smooth_angle` <24 → **26**（其餘原本就是 24／25，未動）
- `clawarm` volume 的 material `fur_paw` → **`fur_arm`**（橘底只落在持爪那條前臂；`stubarm` 仍是 `fur_paw` 深色殘肢，不對稱保留）
- parts 新增 **12 片黑條紋 fin**（4 道 × `around` 110／190／270）＋ **7 片毛茸短 fin**（上緣，`fur_arm`／`stripe` 交錯）
- **骨架座標、既有 parts、animations、其他 palette 色一個字都沒動**

### `*.claims.json` — **兩隻都沒動**
派工提到「claims 的 saturation 帶 10–70 內」，但 `nail.claims.json` 現行的帶是 **10–60%**（`redhat` 才是 10–70%）。放寬 nail 的帶會提高通過機率＝移動及格線，依 `02 §2.1` 我不能自己動，所以**改成讓橘色去遷就現行的 10–60%**：實測 `hi_sat_share.tq = 0.1266`，在帶內（順帶一提它比硬化前的 0.1383 還**低**，因為 exp 4.8 讓布面吃到的 shading noise 分布變了，橘色進帳沒有蓋過這個下降）。

## ④ 指令原文與實際輸出

### 編譯

```
$ node engine/cli.js <WT>/assets/creatures/redhat.json <WT>/assets/creatures/redhat.glb
{"ok":true,"bytes":298700,"verts":3549,"faces":1703,"joints":27,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.377}}

$ node engine/cli.js <WT>/assets/creatures/nail.json <WT>/assets/creatures/nail.glb
{"ok":true,"bytes":310804,"verts":3751,"faces":1820,"joints":27,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.531}}
```

291.7KB／303.5KB，都 ≤400KB；`checks: all green`；三支動畫齊。

### judge 對 spec 全檢

```
$ node harness/judge.mjs <WT>/assets/creatures/redhat.glb out/harden/judge_redhat redhat \
      --spec <WT>/assets/creatures/redhat.claims.json
"stats":{"triangles":3043,"skinnedMeshes":16,"animations":["idle","move","attack"]}
"lum":{"front":43.6,"side":35.9,"tq":40.7}  "hi_sat_share":{"tq":0.2127}
robe side=0.31536  ghost_skirt side=0.26348  hat side=0.12576 span=0.5166
skin_head side=0.03027  eye side=0.00245  mouth_glow side=0.00271  ghost_wisp side=0.04375
[judge] Spec "魔神仔紅帽 moshenzai_redhat (yinqi/haunt)" — all claims pass.

$ node harness/judge.mjs <WT>/assets/creatures/nail.glb out/harden/judge_nail nail \
      --spec <WT>/assets/creatures/nail.claims.json
"stats":{"triangles":3072,...,"animations":["idle","move","attack"]}
"lum":{"side":21}   "hi_sat_share":{"tq":0.1266}
nail side=0.12216 span=0.7537   fur_face side=0.04446   fur_arm side=0.04338 span=0.3932
cloth_robe side=0.36668  cloth_cape side=0.20872  cloth_hood side=0.12876  muzzle side=0.01382
stripe side=0.02067  eye side=0.00228  mouth_glow side=0.00727  hood_trim side=0.01379
[judge] Spec "虎姑婆指甲 nail_hugupo_zhijia (yinqi/elite)" — all claims pass.
```

`nail` 逐條對門檻：`part_signature` nail share 12.22%（≥6%）✅／`part_visible` fur_face 4.45%（≥4%）✅／`focal_contrast` 12.22 : 4.45 = **2.75×**（≥2）✅／`style_dark` side 21（≤90）✅／`saturation_area` tq **12.66%**（10–60%）✅／`tri_budget` **3072**（1500–5000）✅。

### silmetrics（側視＋hero）

```
$ node harness/silmetrics.mjs <WT>/assets/creatures/redhat.glb out/harden/sil_redhat
{"W_over_H":0.4,"fill":0.355,"mass_thirds":[0.047,0.478,0.475],"torso_depth_max":0.55,
 "mass_contrast":17.19,"turn_count":15,"zigzag_alignment":0.4,
 "front":{"W_over_H":0.32,"fill":0.408},"top":{"W_over_H":0.78,"fill":0.556},
 "hero":{"W_over_H":0.36,"fill":0.476}}

$ node harness/silmetrics.mjs <WT>/assets/creatures/nail.glb out/harden/sil_nail
{"W_over_H":0.77,"fill":0.381,"mass_thirds":[0.096,0.255,0.648],"torso_depth_max":0.9,
 "mass_contrast":14.52,"leg_fraction":0.098,"turn_count":21,"zigzag_alignment":1,
 "front":{"W_over_H":0.58,"fill":0.513},"top":{"W_over_H":0.66,"fill":0.425},
 "hero":{"W_over_H":0.82,"fill":0.431}}
```

（`nail` 的 `leg_fraction` 從硬化前的假值 0.506 掉到 0.098——本隻沒有腿，這個欄位量的是及地的袍，不是任何一條 claim，兩個數字都不必解讀。）

### stage-lit 截圖（遊戲自己的鏡頭）

```
$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden-redhat-stage-lit.png \
      "glb=redhat.glb&light=1&fx=1&rim=yinqi" idle 8814
{"out":"docs/experiments/2026-09-04-harden-redhat-stage-lit.png","fps":59.88,"calls":23,
 "loadMs":267,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden-nail-stage-lit.png \
      "glb=nail.glb&light=1&fx=1&rim=yinqi" idle 8814
{"out":"docs/experiments/2026-09-04-harden-nail-stage-lit.png","fps":59.88,"calls":22,
 "loadMs":194,"particles":44,"errors":[]}
```

`errors` 都是空陣列（console 0 error）。`fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。

### 對照圖（H-A1）

| 檔 | 內容 |
|---|---|
| `docs/experiments/2026-09-04-harden-redhat-before.png` | 硬化前 hero（由基準 `be669eb` 的 `redhat.glb` 直接拍，spec 未動） |
| `docs/experiments/2026-09-04-harden-redhat-after.png` | 硬化後 hero |
| `docs/experiments/2026-09-04-harden-nail-before.png` | 硬化前 hero（由基準 `be669eb` 的 `nail.glb` 直接拍） |
| `docs/experiments/2026-09-04-harden-nail-after.png` | 硬化後＋虎前肢 hero |

我自己看過四張的判讀：**redhat 的差最明顯**——軀幹從有柔和漸層的圓潤團塊變成有明確稜線的方形硬板，霧裾從圓錐變成硬楔，帽子的面與面之間出現清楚的折線。**nail 的差集中在前臂與布身**，臉與兜帽因為原本 `exp` 就已經在 4.0–4.8、`smooth_angle` 24，變化比 redhat 小——這也是 ② 那個裁定重要的原因：nail 這一隻靠 `exp` 拿不到多少，真正需要 `faceted` 的是它。

## ⑤ `nail` 盲讀（H-A2）

方法照前卷：兩位 context-free `sonnet` 子 agent，**只給 after hero 與 stage-lit 兩張**、檔名遮成 `r1-imgA.png`／`r1-imgB.png`、路徑不含 nail／tiger／hag 字樣、prompt 明令不得看其他檔案或推測檔名，問「這是什麼？列特徵。氣質？」。讀完即刪圖。

### 讀者 A 原話（節錄，未修飾）

> **1. 這是什麼？** 一個穿黑色連帽長袍、頭部像老鼠／鼬鼠一類囓齒動物、右手變異成巨大白色利爪的低多邊形（low-poly）3D 遊戲角色。
>
> **2. 列特徵**（節錄）「棕色毛茸茸的鼠類／鼬類臉孔，長口鼻、灰白色鬍鬚（觸鬚）數根向兩側伸出」「**右前臂：橘褐色護甲或獸皮包覆前臂，上面有一排黑色尖刺（釘刺）裝飾**」「右手：異化成五根巨大、修長、乳白色的骨爪／利爪，比例明顯誇張，占畫面很大比重」「黑色連帽斗篷罩住頭頂，帽緣與頭部兩側垂下多條螢光綠色的細長髮絲」
>
> **3. 氣質** 「**陰森**又帶點滑稽的邪典感——像是黑暗奇幻/恐怖題材裡的『**鼠妖**』或『山精野怪』角色，兜帽斗篷和螢光綠色調營造出**邪術、詭異**的氛圍，但誇張的巨爪與低多邊形卡通建模又沖淡了純粹的恐怖感……」

### 讀者 B 原話（節錄，未修飾）

> **1. 這是什麼？** 一隻擬人化、穿黑色連帽長袍的**貓（或貓科獸人）**巫師／術士角色。
>
> **2. 列特徵**（節錄）「頭部：低多邊形風格，**貓臉**，棕褐色毛皮，尖耳藏在兜帽下」「鬍鬚：白色細長直線，左右對稱各數根」「**右手臂：一節橘色帶黑色條紋/尖刺的護甲或蟲節狀袖套，覆蓋前臂**」「手掌：異常誇張放大的白色/米白色尖爪，五指皆為又長又尖的鐮刀狀爪子，是全身最顯眼的部位」
>
> **3. 氣質** 「**陰森**又帶點滑稽的巫術感——黑袍加螢光綠鬍鬚和誇張的爪子，給人一種『森林裡的**邪巫貓**/山怪』既**詭異**又有點笨拙**可愛**的印象。」

### 判讀

| 目標 | 結果 |
|---|---|
| 至少一位讀出「虎」相關（虎／老虎／虎紋／貓科） | **達成——B 的第一句主詞就是「貓（或貓科獸人）」，特徵欄再次寫「貓臉」；A 仍讀成鼠／鼬（未命中）** |
| 主印象詭異／陰森 | **兩位皆達成**——A「陰森又帶點滑稽的邪典感……邪術、詭異」；B「陰森又帶點滑稽的巫術感……詭異」 |
| 「可愛」提及人數（風格牆指標，依 17:30 修訂不單獨否決） | **1 / 2**（B 正文「有點笨拙可愛」，非主印象；主印象是「陰森」）。A 未提。 |

**比硬化前（第 3 輪）的變化**：前一輪六位讀者依序讀成海象×2 → 鼠×2 → 鼠×2，**「貓科」是六輪十二位讀者裡第一次出現**；橘底黑條紋帶兩位都看到了（A「橘褐色護甲或獸皮」、B「橘色帶黑色條紋」），差別在他們把它讀成**護甲／袖套**而不是**毛皮**——見 ⑥-3。

## ⑥ 這一批踩到、下一隻會再遇到的引擎事實

1. **★ `build: "rigid"` 是許可證不是開關**（見 ②）。`checks.js:106` 是唯一使用點；真正改法線的是 volume 上的 `faceted: true`（`glb.js:94` 把它的 smooth angle 設成 0）。**寫了 `rigid` 卻沒寫 `faceted` ＝什麼都沒發生**，別以為 GLB 變了就是它的功勞。
2. **★ `faceted: true` 的成本是「頂點數翻倍」，不是「三角形變多」**。兩隻的 `faces` 完全沒變（redhat 1703、nail 1820），漲的全是 verts（3549→7282、3751→6114），所以 `tri_budget` 那條 claim 一點感覺都沒有、GLB 卻漲 70%。**要估 `faceted` 的預算就看 verts，不要看 tri。**
3. **★ `colors.arcs` 做不出橫向條紋，虎紋只能用 fin**。`compile.js:213–223` 的 arc 判斷式吃的是 `sym`＝**環上的角度**（0–180 對稱），完全沒有 `t` 這個維度——所以 arcs 只能沿著鏈的方向切「縱條」，橫向的環帶（虎紋、手環、關節帶）**在引擎裡沒有 arcs 版本**，只能一片一片掛 fin。本隻用 4 道 × 3 片（`around` 110／190／270）包住可見的三個象限。
4. **★ `clawarm`（斜向手臂鏈）的 `around` 世界法線實測**：110→`(-0.96, 0.03, -0.28)` 幾乎正 −X（就是側視的正面）、190→`(-0.36, 0.83, 0.43)` 上前、270→`(0.83, 0.32, 0.45)` +X 前上、0→`(0.56,-0.72,-0.42)` 下後。**與 `head`（水平鏈）、`sword`（直立鏈）、`shield`（`frame:"up"`）四者互不相同**，`nail` 報告 ⑥-1 那條「只能先編一次讀 info 行」再次成立，我也是這樣做的。
5. **fin 的 `points` 半寬要配宿主半徑**：`conform: true` 的板子是在落點與表面相切，離落點 u 遠處會浮起 `u²/(2r)`。前臂半徑只有 ~0.04，第一版用半寬 0.058 的板子兩端會浮起 0.029（比板厚大三倍）；改成半寬 0.026–0.031、一道拆成三片繞著掛才貼得住。
6. **`parts` 陣列裡不能塞沒有 `type` 的註解物件**——`compile.js` 會直接 `throw new Error('unknown part type "undefined"')`。註解要掛就掛在 spec 層的 `_xxx` 欄位（本檔改成 `_tigerarm_note`）。

## ⑦ 沒做到／留給主對話的事（誠實條）

1. **★ ② 的 `faceted` 裁定沒做**（甲／乙／丙三選一），這是本批最重要的未決項。出貨版是「派工字面版」，不是「shield 等級的平面感」。
2. **「虎」只有一位讀出，而且是「貓科」不是「虎」。** 兩位都把橘底黑紋讀成**護甲／袖套**而不是**毛皮**——原因可查：低多邊形的 fin 是硬邊薄板，邊緣是直線，天生像板甲；而且**臉還是深棕 `#553a16`、只有前臂是橘 `#a8551c`**，同一隻動物身上兩種色，讀者自然把橘的那截歸給「穿戴物」。要真的讀成虎皮，我判斷要把 `fur_face` 也拉到同一族的橘（讓臉與臂同色），但那超出派工的「橘只在前臂」，**我沒有自行擴大**，請主對話裁定。
3. **`redhat` 沒有盲讀**（派工指定併入剪影三秒測試批次補讀），所以「硬化有沒有改變讀者對 redhat 的主印象」目前**沒有量測**，只有我自己看圖的判斷（④ 末段），那不構成證據。
4. **毛茸感是「短刺」不是「毛」。** 上緣 7 片 fin 在 hero 上讀起來接近一排小尖刺（讀者 A 就寫「一排黑色尖刺（釘刺）」）。低多邊形沒有毛的表現手段（`nail` 報告 ⑦-4 同一條），這裡記為部分達成。
5. **`part_overlap` 的 warn 沿用前卷的判斷**：`eye@Brow` 被 `curve@Hood1/2` 蓋 72%／62%、`fin@Snout` 與 `curve@Jaw1` 69%——這些在硬化前就存在、本批沒有新增，`eye` 的側視 share 也維持 0.228%（硬化前 0.229%），沒有惡化。新增的虎前肢 fin **沒有產生任何新的 overlap warn**。
6. **沒有量效能、沒有接進正式對決、沒有做剪影三秒測試**（那是每兩批一次的批次閘門，需要多隻拼圖）。
7. **`_ringstep_tmp.py`／`_partfacet_tmp.py`／`_harden_tmp.py`／`_armblock_tmp.py` 四個一次性腳本用完已刪**（`git status` 已核對乾淨），worktree 內的 `tools/anyCreature` junction 與 `.claude/qa/` 盲讀圖也已移除。

## ⑧ DEVLOG 一行

`gates: H-A0 redhat 291.7KB/nail 303.5KB judge all-green x2, H-A1 4 圖, H-A2 PASS(B 讀出「貓科」=虎相關首見; 兩位主印象皆「陰森」; 「可愛」提及 1/2 非主印象), H-A3 clean | ★裁定待補: build:"rigid" 單獨無作用(checks.js:106 只是 faceted 的許可證)，shield 的平面感來自 faceted:true，全開會讓 redhat 510.5KB/nail 436.1KB 雙雙爆 400KB，塞回去只能粗化 ring_step=動造型 → 甲/乙/丙三選一 | unresolved: 虎讀成「貓科護甲」而非虎皮(臉仍深棕、只有前臂橘，需裁定是否放寬「橘只在前臂」); redhat 未盲讀`
