# 批 1 前置回修：刀／印／帽三枚徽記剪影（2026-09-12）

> 依凍結檔 `docs/experiments/2026-09-11-acceptance-fx-legibility.md` §2.1 **修訂三 ④**：
> 「刀 `knife`／印 `seal`／帽 `hat` 三枚剪影回修（六位讀者：刀→王爺劍、印→旗／竹椅、帽→舟／旗），
> 回修後三枚以本材料跑小盲讀（依①三對），過了才鋪到 23 支。」
> 本卷只負責 **回修＋產材料＋機械閘門**。**讀者盲讀不在本卷**——主對話另派六位 context-free 讀者，
> 本卷的執行者是修者，依 L4「修者兼讀者（禁）」不得自己扮讀者下結論。
>
> 基準（改前）＝ `417b197`（v0.55，批 0 合併上線）。worktree：
> `C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a05138c68ae6c7806`（分支 `worktree-agent-a05138c68ae6c7806`，**未合併 main、未 push**）。

---

## 0. 一句話結論

三枚剪影**全部回修完成**；七條驗收 **1／2／3／5／6／7 全綠**，**第 4 條（盲讀材料）已產出且全綠，但材料的人眼判定不在本卷**。
另有一條**必須揭露的量測事實**：驗收 3 字面指定的突變「`ICON.size` 改 0.02」對這四支示範招**完全沒有鑑別力**
（實測面積與 ΔE 逐位數不變、exit 0）——因為 knife／bell／seal／hat 四個 kind 都有 `ICON.byKind` 覆寫。
真正打得到的 canary 是凍結檔與 `IMPLEMENTATION_GUIDE` §11.29 寫的 `ICON.sizeOf()` 固定回 0.02，
本卷**兩個都跑了**：前者綠（記錄「這條突變在這四支上是恆綠的儀式」），後者 4/4 紅（鑑別力成立）。詳見 §4。

---

## 1. 改了哪些檔（`檔案:行號`）

| 檔案:行號 | 改了什麼 | 對應範圍哪一條 |
|---|---|---|
| `js/trait-fx/emblems.js:40` | `knife` 頂點表（13 頂點 → **16 頂點**）＋註解 | 範圍①「只改 knife／seal／hat 三個 kind 的頂點」 |
| `js/trait-fx/emblems.js:51` | `seal` 頂點表（10 頂點 → **12 頂點**）＋註解 | 同上 |
| `js/trait-fx/emblems.js:62` | `hat` 頂點表（11 頂點 → **22 頂點**）＋註解 | 同上 |
| `tests/emblem-collision.test.mjs:61,64`（改前行號） | `CROSS_DEBT` **刪掉兩筆死豁免**：`['seal','urn']`、`['knife','tablet']` | 範圍③「tests 治具：只在必要時修 bug」——見 §6 逐行說明 |
| `tests/emblem-collision.test.mjs:10-12` | 檔頭「五組人眼互撞的名次」記錄補上回修後的名次 | 同上（純註解，不進判定） |
| `docs/experiments/2026-09-12-emblem-fix-report.md`（本檔）、`docs/experiments/2026-09-12-emblem-fix-evidence/` | 新增 | 範圍④ |

**`js/trait-fx/vocab.js` 一個位元組都沒動**（`git status --porcelain js/trait-fx/vocab.js` 無輸出）。
範圍②允許改 `ICON.byKind` 三個數字以拿到 ≥1.0% 的餘裕，但**回修後的實測就已經全部 ≥1.0%**（§4），
沒有調整的理由就不調——順帶避開「改 `byKind` 就要同步改 `docs/experiments/2026-09-11-fx-vocab.md` 第 5 節」
（`tests/fxvocab.test.mjs` 把兩邊釘在一起）這條連帶改動。

**27 支招的編舞函式（`zuling.js`／`xianghuo.js`／`yinqi.js`）、`index.html`、引擎、`VERSION` 一律未動**——
以 `git diff --stat 417b197..HEAD` 證明（§7 驗收 6），不是以宣稱。

---

## 2. 三枚剪影怎麼改的，為什麼這樣改

三枚都是**幾何回修**，不動編舞、不動尺寸表。設計判準來自六位讀者的原話誤讀（`2026-09-12-fx-legibility-b0-report.md` §9）
與 ART_BIBLE §10.2「剪影是低多邊形唯一剩下的辨識手段」。

改前／改後的剪影並排圖：`docs/experiments/2026-09-12-emblem-fix-evidence/shapes-after.png`
（八個形狀並排：knife／blade／seal／tornflag／chair／hat／boat／wave，可直接對照「誤讀對象」）。

### 2.1 `knife` 獻祭刀 — 被讀成「王爺劍」（blade）

**改前**：`[0,1, 0.3,0.3, 0.28,-0.18, …]` —— **左右完全對稱**的長條刃＋窄護手＋細長柄。
對稱長條就是 `blade` 王爺劍的語彙，只是比例小一號；讀者第 3 輪兩位都寫「藍色刀刃」＝劍。

**改後**（單刃放血祭刀）：
- **刀尖偏右**（0.24, 1.0），不在中軸上 —— 打掉「對稱」這個最強的劍訊號；
- **右側是外凸的刀背弧**（0.4,0.62 → 0.5,0.18 → 0.46,−0.18），左側刃口近直線斜收（0.06,0.62 → −0.06,0.2 → −0.14,−0.2）
  ⇒ 剖面是「上窄下寬的單刃楔形」，這是設計提示裡「刀＝單刃、有明顯刀背弧」那一條；
- **護手只有左邊一顆**（−0.44,−0.3 → −0.42,−0.16）＝單側鐔，對照 `blade` 的 ±0.66 對稱寬護手；
- 柄與柄頭維持細長（±0.13），不與刃同寬。

為什麼不用血槽挖洞：挖洞會同時（a）吃掉 L3 的 `area_pct` 餘裕、（b）在 844×390 上只剩幾個像素。
刀背弧已滿足設計提示的「或」。

### 2.2 `seal` 虎爺印 — 被讀成「破軍旗」（tornflag）／「椅仔姑竹椅」（chair）

**改前**：一塊大方板（y −0.9…−0.15）＋**高度佔一半的高鈕**（y −0.15…0.9）。
「一根高的＋一大片的」就是旗（桿＋旗面）的語彙，讀者原話「一大片紅色旗面」。

**改後**（三階往上收窄的印）：
- **印台**（最寬最重）x ±1.0、y −0.92…−0.3；
- **印身柄**（中）x ±0.45、y −0.3…0.45；
- **虎鈕**（最小）x ±0.22→±0.18、y 0.45…0.9。
單調往上收窄 ⇒ 沒有「桿＋飄邊」也沒有「腳」，重心在下。

**這裡踩到一個必須寫下來的坑**：第一版回修把它做成「一塊實心方塊＋小鈕」——語意上最像印章，
但**實心塊之間在灰階 IoU 上幾乎只剩長寬比可分**，實測依序撞上
`crag` 0.8333／`crown` 0.9000／`claw` 0.8000／`sun` 0.8235（全是新的 ≥0.80 跨系互撞，`tests/emblem-collision.test.mjs` 第 4/5 條會判紅）。
壓扁到 1.9×1.14 可以閃掉 `crag`，但換成撞 `crown` 0.90。
**三階收窄**是唯一同時擋掉「旗／椅」與「跟每一個實心塊都像」的形狀；
搜尋過程與 243→972 組候選見 `docs/experiments/2026-09-12-emblem-fix-evidence/seal-search.mjs`（原檔唯讀、只在記憶體裡組頂點）。

### 2.3 `hat` 魔神仔紅帽 — 被讀成「拼板舟」（wave／boat）／「五營旗」（banner5）

**改前**：`[0.06,1, 0.3,0.2, 0.46,-0.24, 0.98,-0.36, 0.98,-0.56, …]` —— 矮三角（高 1.64）＋**水平大簷**（寬 1.96），
簷比帽還顯眼，而且簷是「兩端平、下緣直」⇒ 旋轉起來就是讀者原話的「紅色扁平剪影兩端翹起」。

**改後**（細高錐帽）：
- **帽冠高 1.38、冠下緣半寬只有 0.34**（高 ≫ 寬），對比改前的矮三角；
- **帽箍那一階**（0.23,−0.2 → 0.31,−0.22）＝「這是帽子不是山」的第二個訊號；
- **帽簷往下垂**：外緣 y=−0.74、中央 y=−0.46 ⇒ **兩端比中央低**。
  這一條是直接對著誤讀寫的：boat／wave 的語彙是「下凸弧＋兩端翹」，把它反過來就從根上避開。
- 帽簷尖端做成小平頭（0.86,−0.62 → 0.82,−0.74）而不是單點，減少旋轉時的「星芒」感。

參數搜尋（120 組，三個指名對＋無新互撞）見 `docs/experiments/2026-09-12-emblem-fix-evidence/hat-search.mjs`。

### 2.4 已知限制（不在本卷處置，交主對話與批 1）

- `hauntLost` 的編舞讓紅帽**整圈自轉**（`js/trait-fx/yinqi.js` 的 `F.mesh.userData.fxRoll = 3.1 + t*2π`）。
  剪影只能保證「靜態時是帽子」，**旋轉到 90° 附近仍然可能讀成別的東西**——那要動編舞，不在本卷範圍。
- 本卷的相似度全部走 `tests/tools/emblem-sim.mjs` 的**灰階 IoU**。依該檔與 `tests/emblem-collision.test.mjs`
  的校準記錄：**純幾何量不到六位讀者的誤讀**（五組人眼互撞在任何幾何門檻下都排不到 bell 同系配對的前面）。
  所以 §3 的「每一對都變低了」**不等於「讀者不會再讀錯」**，人眼閘門仍然是小盲讀。

---

## 3. 驗收 5：三枚剪影的相似度，改前／改後並排

指令原文（兩次都跑同一支腳本、同一個度量）：
```bash
node docs/experiments/2026-09-12-emblem-fix-evidence/pairs.mjs scratchpad/base417   # 改前（417b197 的簽出樹）
node docs/experiments/2026-09-12-emblem-fix-evidence/pairs.mjs .                    # 改後
```
（`pairs.mjs` 不另算一份相似度，直接呼叫 `tests/tools/emblem-sim.mjs` 的 `allPairs()`。
改前的數字**同時用兩條路各量一次**：①動手前在本 worktree 的乾淨 `417b197` 樹上量（`pairs-before.txt`）
②`git worktree add --detach scratchpad/base417 417b197` 另簽一棵樹再量（`pairs-before-basetree.txt`），
兩份**除了第一行的樹路徑以外逐行相同**（`diff` 無輸出）。）

| 指名對（讀者實際的誤讀） | 改前 IoU（名次／435） | 改後 IoU（名次／435） | 判定 |
|---|---|---|---|
| `knife`~`blade` 獻祭刀→王爺劍 | **0.5000**（第 227） | **0.4722**（第 234） | ✅ 變低 |
| `seal`~`tornflag` 虎爺印→破軍旗 | **0.3784**（第 337） | **0.3583**（第 349） | ✅ 變低 |
| `seal`~`chair` 虎爺印→竹椅 | **0.3275**（第 374） | **0.3117**（第 388） | ✅ 變低 |
| `hat`~`wave` 紅帽→拼板舟（浪弧） | **0.4247**（第 292） | **0.2651**（第 416） | ✅ 變低 |
| `hat`~`banner5` 紅帽→五營旗 | **0.4864**（第 241） | **0.3306**（第 370） | ✅ 變低 |
| `hat`~`boat` 紅帽→送王船 | **0.5539**（第 185） | **0.4679**（第 242） | ✅ 變低 |

**六對全部變低**（驗收 5 要求的加嚴成立）。

附帶（不在指名清單、但是「新剪影不得更像另一個 kind」這條要看的）——三枚各自最像的鄰居：

| kind | 改前最像的 5 個 | 改後最像的 5 個 |
|---|---|---|
| `knife` | tablet 0.8000／talis 0.7471／lamp 0.7198／shade 0.7174／rhomb 0.7111 | bolt 0.5900／rhomb 0.5700／drop 0.5588／talis 0.5578／buoy 0.5561 |
| `seal` | urn 0.8118／crag 0.7931／drop 0.7727／claw 0.7684／shade 0.7459 | urn 0.7263／crag 0.7202／bell 0.7041／shade 0.6970／crown 0.6834 |
| `hat` | seal 0.7263／crown 0.7021／urn 0.7011／crag 0.6952／drop 0.6425 | shade 0.5577／seal 0.5514／lamp 0.5507／bell 0.5481／claw 0.5142 |

三枚**改後的最大鄰居值都比改前低**，而且**沒有任何一對 ≥0.80**。
全表 ≥0.80 的配對從 **16 對降到 14 對**（少掉的正是 `seal~urn` 與 `knife~tablet`，見 §6）；
其餘 14 對一個都沒動（都不含 knife／seal／hat）。完整 435 對：`sim-before.txt`／`sim-after.txt`（含 `.json`）。

---

## 4. 驗收 3：L3 對比閘門，改前／改後並排＋突變驗紅

量測位置（照抄 `tests/tools/fx-contrast.mjs` 檔頭與 metrics summary 的實測值，`02 §6.1` 第 5 條）：
**視口 CSS 844×390 @ deviceScaleFactor 2（像素緩衝 1688×780、全畫面 329,160 px）· seed 7 ·
bloom `{strength:1.05, threshold:0.7, knee:0.3, radius:1.7, scale:0.5}`（治具頁回報的 live 值與產品 `js/renderer.js` 的 `BLOOM` 逐鍵相同，不一致當場 throw）· `nobloom:false` · tier 2 · 凍幀點＝travel 中點 430ms（第 26 幀）**。

指令原文：
```bash
# 改前（動手前，本 worktree 乾淨的 417b197 樹）
node tests/tools/fx-contrast.mjs docs/experiments/2026-09-12-emblem-fix-evidence/l3-before \
     --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost --seed=7
python tests/tools/fx-contrast-metrics.py docs/experiments/2026-09-12-emblem-fix-evidence/l3-before \
     --json=docs/experiments/2026-09-12-emblem-fix-evidence/l3-before/metrics.json
# 改後（同一組指令，只換輸出目錄）
node tests/tools/fx-contrast.mjs docs/experiments/2026-09-12-emblem-fix-evidence/l3-after \
     --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost --seed=7
python tests/tools/fx-contrast-metrics.py docs/experiments/2026-09-12-emblem-fix-evidence/l3-after \
     --json=docs/experiments/2026-09-12-emblem-fix-evidence/l3-after/metrics.json
```

| 招（kind） | 改前 `area_pct` | 改後 `area_pct` | 改後 ΔE 中位 | `hidden` | 門檻 0.8%／ΔE 28 | 餘裕 ≥25%（即 ≥1.0%） |
|---|---|---|---|---|---|---|
| `eliteSelfCut` 獻祭刀（knife） | 0.9728% | **1.1365%** | 63.35 | 2 | ✅ | ✅（改前 0.9728 是**不足**的） |
| `wardImmuneLost` 千里眼銅鈴（bell，對照，未改） | 1.2210% | **1.2210%** | 107.27 | 4 | ✅ | ✅（逐位數不變＝沒被波及） |
| `biteGamble` 虎爺印（seal） | 1.9519% | **2.6413%** | 64.18 | 3 | ✅ | ✅ |
| `hauntLost` 魔神仔紅帽（hat） | 2.1682% | **1.1860%** | 82.02 | 5 | ✅ | ✅ |

改前 summary：`{"n":4,"pass":4,"failed":[],"nobloom":false,…}`（exit 0）
改後 summary：`{"n":4,"pass":4,"failed":[],"nobloom":false,…}`（exit 0）
全文：`l3-before.txt`／`l3-after.txt`（`.../l3-*/metrics.json` 有逐招 JSON）。

**四支全過、knife／seal／hat 的 `area_pct` 全部 ≥1.0%** ⇒ `ICON.byKind` 不需要動（§1）。
`bell` 是未改的對照招，改前改後**逐位數相同**（1.2210%／ΔE 107.27／px 4019）——這是「我只動了三個 kind」的活性旁證。

### 突變驗紅（`02 §6.1` 第 1 條）

備份／還原一律用副本，不做反向 sed：`cp js/trait-fx/vocab.js scratchpad/vocab-backup.js` → 改 → `cp scratchpad/vocab-backup.js js/trait-fx/vocab.js`，
還原後 `git status --porcelain js/trait-fx/vocab.js` **無輸出**（＝與 `417b197` 逐位元組相同）。

| 突變 | 預期 | 實測 | 結論 |
|---|---|---|---|
| **A：`ICON.size` 0.44 → 0.02**（＝驗收 3 字面指定的那一個） | 紅 | **綠**：`pass 4`、四支的 `area_pct`／`px`／`de_median` 與健康狀態**逐位數相同**（1.1365/1.2210/2.6413/1.1860），exit 0 | ❌ **這條突變對這四支沒有鑑別力**。原因：knife 0.56／bell 0.46／seal 0.62／hat 0.40 四個 kind 都在 `ICON.byKind` 有覆寫，`sizeOf()` 根本不會讀到 `ICON.size`。這正是凍結檔 §2.1 修訂三③與覆審 r1 C1 記錄過的同一個坑；`ICON.size` 只打得到走預設值的那 23 支。 |
| **B：`ICON.sizeOf()` 固定回 0.02**（＝凍結檔與 `IMPLEMENTATION_GUIDE` §11.29 指名的 canary 位置） | 紅 | **紅**：`pass 0`、`failed:["eliteSelfCut","wardImmuneLost","biteGamble","hauntLost"]`，`area_pct` 掉到 0.0586／0.0507／0.0012／0.0389%，exit 1 | ✅ 鑑別力成立 |

**反面（健康狀態會不會變綠）**：同一組指令在健康狀態下 4/4 綠（上表「改後」那一欄），exit 0。
證據：`l3-mutA.txt`（綠，含逐招 JSON）、`l3-mutB.txt`（紅）。

> **這件事要交裁**：驗收 3 的字面（「把 `ICON.size` 改 0.02 重跑一次預期紅」）在這四支示範招上是**恆綠的儀式**。
> 本卷沒有改驗收條件，而是**兩個都跑並如實揭露**；真正證明 L3 有鑑別力的是突變 B。
> 這與凍結檔 §2.1 修訂三⑧「N11／N12 尺寸防線在批 1 開工前必做」是同一條線索。

---

## 5. 驗收 4：盲讀材料

指令原文（**視口未改**，`SHOT = 844×390`、`SHOT_DSF = 2`、`FRAME_AT` 六格幀位、`CELL`／`SHEET` 一律沿用凍結值）：
```bash
# 改前（動手前、乾淨的 417b197 樹）
node tests/tools/blindread-sheet.mjs docs/experiments/2026-09-12-emblem-fix-evidence/sheets-before \
     --only=eliteSelfCut,biteGamble,hauntLost,wardImmuneLost --tiers=1,2 --seed=20260921
# 改後
node tests/tools/blindread-sheet.mjs docs/experiments/2026-09-12-emblem-fix-evidence/sheets-after \
     --only=eliteSelfCut,biteGamble,hauntLost,wardImmuneLost --tiers=1,2 --seed=20260922
```
兩次都 `handled=true err=0`（8/8 張）。**截圖走真實引擎路徑**：`tests/tools/traitfx-preview.html` 逐幀步進 → 編舞呼叫 `st.icon(st.kind, …)` → `emblems.js` 的 `geomOf(kind)`，沒有任何手繪材料；HUD 由治具 `#hud{display:none!important}` 藏掉（不在材料上印招名）。

| 目錄 | 內容 | 對應表 |
|---|---|---|
| `docs/experiments/2026-09-12-emblem-fix-evidence/sheets-before/` | `a01.png`…`a08.png`（基準 417b197 的 knife／seal／hat 各 t1＋t2，加 `bell` 對照） | `sheets-before/mapping-HIDDEN.json`（**讀者不得看**） |
| `docs/experiments/2026-09-12-emblem-fix-evidence/sheets-after/` | `a01.png`…`a08.png`（回修後同一組） | `sheets-after/mapping-HIDDEN.json`（**讀者不得看**） |

**兩個目錄用不同的混洗 seed**（20260921／20260922），所以同一個編號在兩邊**不是同一支招**——
避免讀者若同時看到兩組材料時，從編號對齊反推出「這是同一支招的前後版」。

逐張（此表等同 mapping，**只給主對話派工用，不得隨材料交給讀者**）：

| 檔 | sheets-before | sheets-after |
|---|---|---|
| `a01.png` | biteGamble t2（印） | biteGamble t2（印） |
| `a02.png` | hauntLost t2（帽） | wardImmuneLost t1（鈴·對照） |
| `a03.png` | biteGamble t1（印） | hauntLost t2（帽） |
| `a04.png` | wardImmuneLost t1（鈴·對照） | eliteSelfCut t1（刀） |
| `a05.png` | eliteSelfCut t2（刀） | hauntLost t1（帽） |
| `a06.png` | hauntLost t1（帽） | biteGamble t1（印） |
| `a07.png` | eliteSelfCut t1（刀） | eliteSelfCut t2（刀） |
| `a08.png` | wardImmuneLost t2（鈴·對照） | wardImmuneLost t2（鈴·對照） |

**本卷不判人眼結果**（L4「修者兼讀者（禁）」）。依 §2.1 修訂三①，小盲讀的判準是
「**三對讀者（六位）取多數**：三對中 ≥2 對滿足『兩位 Q1 皆對且 Q2 皆 ≥4』」，
反向判準是「改前材料同招 Q2 中位數須比改後低 ≥1 分」——`sheets-before/` 就是為這個反向判準準備的。

---

## 6. 驗收 1／治具改動：為什麼刪那兩筆 `CROSS_DEBT`，逐行說明「這行為什麼不會提高通過機率」

`tests/emblem-collision.test.mjs` 的 `CROSS_DEBT` 是**豁免表**，它自己第 5 條寫著
「表裡的每一對都必須現在仍然超標（**死豁免判紅**）」、檔頭寫著「**這張表只能縮不能長**」。
回修之後兩對掉到門檻以下，測試**當場判紅並指名要刪**：

```
FAIL  跨系記錄清單裡的每一對現在仍然真的超標（死豁免判紅）
      — 這幾對已經不超標了，請把它們從 CROSS_DEBT 刪掉：seal~urn=0.7113 knife~tablet=0.5613
```
（上面是中途某一版的數字；**最終版**是 `seal~urn 0.8118 → 0.7263`、`knife~tablet 0.8000 → 0.5068`。）

逐行：

| 改動的行 | 這行為什麼**不會**提高通過機率 |
|---|---|
| 刪 `['seal','urn'], // 0.8118` | 刪掉的是**豁免**，不是門檻。刪掉之後這一對從「被允許超標」變成「一旦再超標就判紅」——**約束變嚴不是變鬆**。而且不刪就是紅（死豁免判紅），刪是唯一讓測試回到「反映真實狀態」的動作。 |
| 刪 `['knife','tablet'], // 0.8000` | 同上。 |
| 檔頭 `第 227／337／374／292／241 名` 那段補一行回修後的名次 | 純註解、不進判定；補的是**新的實測名次**（第 234／349／388／416／370），沒有刪掉原本的記錄，也沒有改任何斷言。第 3 條「校準記錄」的斷言 `min(人眼互撞) < max(bell 同系)` 一字未動，回修後仍然成立（0.2651 < 0.8352）。 |

**沒有動到的**：`GATE = 0.80`、同系 `KNOWN_DEBT` 三筆（`urn~drop`／`bell~lamp`／`drop~shade`，回修後仍全部超標、全部留著）、
第 1–5 條的判準與斷言、`tests/tools/emblem-sim.mjs` 的度量（`GRID 12`／`SS 4`／`HALF 1.9`／面積歸一）一個字都沒改。
`tests/tools/blindread-sheet.mjs`、`tests/tools/fx-contrast.mjs`、`tests/tools/fx-contrast-metrics.py`、`tests/fxvocab.test.mjs` **完全未動**。

### 鑑別力（刪了豁免之後這支測試還抓不抓得到東西）

```bash
node tests/emblem-collision.test.mjs --mutate=1   # 記憶體裡把 lamp 的頂點換成 talis 的
```
→ `結果：5 綠 ／ 4 紅`（exit 1），四條紅分別是「新的同系互撞 talis~lamp=1」「KNOWN_DEBT 死豁免 bell~lamp=0.6526」
「新的跨系互撞 rhomb~lamp／lamp~tablet」「CROSS_DEBT 死豁免 lamp~shade」。證據：`collision-mut1.txt`。

---

## 7. 七條驗收逐條結果

### 驗收 1 — 單元測試全綠（含 N5 互撞檢查）：✅ 綠

```bash
node --test tests/fxvocab.test.mjs      # ✔ tests 1 / pass 1 / fail 0（內層自報「結果：15 綠 ／ 0 紅」）
node tests/fxvocab.test.mjs             # 結果：15 綠 ／ 0 紅（exit 0）  ← 檔頭寫的等價指令
node tests/emblem-collision.test.mjs    # 結果：9 綠 ／ 0 紅（exit 0）   ← N5 同系＋跨系互撞檢查在這一支
node tests/fxtier.test.mjs              # 結果：14 綠 ／ 0 紅（exit 0）
node tests/review.test.mjs              # 通過 28　失敗 0（exit 0）
```
突變驗紅（證明上面的綠不是恆綠）：
`node tests/fxvocab.test.mjs --mutate=1` → 11 綠／4 紅（exit 1）；`--mutate=4` → 14 綠／1 紅（exit 1）；
`node tests/emblem-collision.test.mjs --mutate=1` → 5 綠／4 紅（exit 1）。
輸出：`fxvocab-after.txt`／`fxvocab-mut1.txt`／`fxvocab-mut4.txt`／`collision-after.txt`／`collision-mut1.txt`。

> 註：`tests/fxvocab.test.mjs` 是自帶 runner 的腳本（不是 `node:test` 案例），`node --test` 只會把整支當一個 case。
> 判定依據是它自己印的「15 綠 ／ 0 紅」與 exit code，兩種跑法結果一致。

### 驗收 2 — `trace-eq` 對基準逐位元組相等：✅ 綠

```bash
git show 417b197:index.html > old.html
node tests/tools/trace-eq.mjs old.html index.html
# {"old":"old.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}   exit 0
node tests/tools/trace-eq.mjs index.html --mutate
# {"mode":"mutate","mutation":"CFG.ROUNDS 12 -> 11","bytesSrc":357285,"bytesMutant":341041,"differs":true,
#  "verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}   exit 0（依凍結檔「條文筆誤更正」，`--mutate` 的綠＝`differs:true`）
```
證據：`trace-eq.txt`／`trace-eq-mutate.txt`。（`old.html` 是 `.gitignore` 列名的中間產物，跑完已刪。）

### 驗收 3 — L3 對比閘門（改前／改後並排＋突變驗紅）：✅ 綠（含一條必須揭露的量測事實，見 §4）

### 驗收 4 — 盲讀材料：✅ 材料已產出（人眼判定不在本卷，見 §5）

### 驗收 5 — 三枚剪影相似度改前改後並排、每一對都變低：✅ 綠（見 §3）

### 驗收 6 — `git diff --stat 417b197..HEAD`

```
 docs/experiments/2026-09-12-emblem-fix-evidence/…   （新增：材料與證據）
 docs/experiments/2026-09-12-emblem-fix-report.md    （新增：本檔）
 js/trait-fx/emblems.js          | 6 +++---
 tests/emblem-collision.test.mjs | 9 ++++++---
```
（實際輸出見 §8 的最終 commit 紀錄；`js/`＋`tests/` 只有這兩個檔。）

| 檔 | 對應範圍哪一條 |
|---|---|
| `js/trait-fx/emblems.js` | 範圍①：只改 `knife`／`seal`／`hat` 三個 kind 的頂點（＋各自的註解） |
| `tests/emblem-collision.test.mjs` | 範圍③：治具的必要修正——刪兩筆死豁免（測試自己指名要刪），逐行說明見 §6 |
| `docs/experiments/2026-09-12-emblem-fix-report.md` | 範圍④：新增報告 |
| `docs/experiments/2026-09-12-emblem-fix-evidence/` | 範圍④：新增證據目錄（材料、量測輸出、三支搜尋腳本） |
| **未出現**：`js/trait-fx/vocab.js`／三個編舞檔／`index.html`／引擎／`VERSION` | 範圍②未用到（§1）；「不動」那一條成立 |

### 驗收 7 — 每步 commit、繁體中文、不合併不 push：✅（見 §8）

---

## 8. Commit 與樹

- worktree：`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a05138c68ae6c7806`
- 分支：`worktree-agent-a05138c68ae6c7806`（基準 `417b197`）
- **未合併 main、未 push**。
- 量測用的基準樹 `scratchpad/base417`（`git worktree add --detach … 417b197`）在 `.gitignore` 的 `scratchpad/` 底下，不進版控，量完移除。

Commit（三步，繁體中文）：

| SHA | 訊息首行 |
|---|---|
| `3b864e0` | 批 1 前置回修：刀／印／帽三枚徽記剪影（凍結檔 §2.1 修訂三 ④） |
| `0134bd1` | 互撞測試：刪掉兩筆死豁免（回修後不再超標，是這張表「只能縮」的規則在執行） |
| `d253252` | 回修報告與證據：L3 改前改後、突變驗紅、小盲讀材料（讀者判定不在本卷） |
| `（本節補上 SHA 的那一筆）` | 報告補 commit 清單 |

`git diff --stat 417b197..HEAD` 的程式碼部分（其餘 82 筆全部在 `docs/experiments/2026-09-12-emblem-fix-*` 底下，
共 84 files changed, 10351 insertions(+), 6 deletions(-)）：

```
 js/trait-fx/emblems.js          | 6 +-
 tests/emblem-collision.test.mjs | 9 ++-
```

**`js/` 只有 `emblems.js` 一個檔、`tests/` 只有 `emblem-collision.test.mjs` 一個檔；
`js/trait-fx/vocab.js`、三個編舞檔、`index.html`、引擎、`VERSION` 一個位元組都沒出現在 diff 裡。**

---

## 9. 證據檔一覽（`docs/experiments/2026-09-12-emblem-fix-evidence/`）

| 檔 | 是什麼 |
|---|---|
| `shapes-after.png` | 回修後的 knife／seal／hat 與五個誤讀對象並排剪影圖 |
| `pairs.mjs` | 指名六對的相似度報表（呼叫 `emblem-sim.mjs` 的 `allPairs()`，不另抄度量） |
| `pairs-before.txt`／`pairs-before-basetree.txt`／`pairs-after.txt` | 改前（就地／另簽一棵樹，兩份逐行相同）／改後 |
| `sim-before.txt`／`sim-after.txt`（＋`.json`） | 全 435 對相似度 |
| `aspect-sweep.mjs`／`seal-search.mjs`／`hat-search.mjs` | 形狀參數搜尋（原檔唯讀，只在記憶體裡組頂點） |
| `l3-before/`／`l3-after/`（`*-A.png`／`*-B.png`／`shots.json`／`metrics.json`）＋ `l3-before.txt`／`l3-after.txt` | L3 凍幀 A/B 與統計 |
| `l3-mutA/`＋`l3-mutA.txt` | 突變 A（`ICON.size`→0.02）＝**綠，無鑑別力**的實測紀錄 |
| `l3-mutB/`＋`l3-mutB.txt` | 突變 B（`ICON.sizeOf()`→0.02）＝4/4 紅 |
| `sheets-before/`／`sheets-after/`（各 8 張＋`mapping-HIDDEN.json`） | 小盲讀材料 |
| `fxvocab-before/after/mut1/mut4.txt`、`collision-before/after/mut1.txt` | 單元測試輸出 |
| `trace-eq.txt`／`trace-eq-mutate.txt` | 等價與突變驗紅 |

## 10. 做不到／交裁的事

1. **人眼小盲讀不在本卷**（凍結檔 L4「修者兼讀者（禁）」）——材料已備妥，判定由主對話另派六位 context-free 讀者，依 §2.1 修訂三①的三對取多數。
2. **驗收 3 字面指定的突變在這四支上恆綠**（§4）。本卷不改驗收條件，只如實揭露並補跑真正有鑑別力的那一個（`sizeOf()`→0.02）。
3. **旋轉中的紅帽**（§2.4）：剪影只保證靜態可辨；`hauntLost` 的整圈自轉是編舞的事，超出本卷範圍。
4. `tests/emblem-collision.test.mjs` 的兩筆死豁免刪除雖然是測試自己指名的、且方向是加嚴，仍屬「動到判準檔」——逐行說明在 §6，請主對話覆核。
