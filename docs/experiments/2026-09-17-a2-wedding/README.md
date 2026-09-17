# A2 S6「冥婚紅包」造型：甲／乙兩案（方案階段，未入正式資產）

狀態：**出方案＋拍圖階段**。本卷**沒有動任何產品檔**——`js/`、`index.html`、`tests/*.test.mjs` 零 diff，
兩個變體只活在 `variants/` 底下的完整副本裡，靠新治具 `tests/tools/a2-curse-sheet.mjs` 的靜態覆蓋根跑起來。
盲讀（凍結 #7 的「讀者說出詛咒／不祥 2/2」「三情境並排指認 ≥5/6」）與正式接入由主對話另外做，本檔不宣稱那兩項過。

## 現況為什麼要改

現行 `addWedding`（`js/table-tray.js:212-218`）只有 4 個 quad／8 個三角形：一片扁紅封＋一塊金印，
包圍盒 `y 0.014–0.040`——**整件貼在桌面上、幾乎沒有剪影**，在 844×390 的實際桌面大小讀成「桌上一張紅色紙牌」，
語意是喜氣紅包而不是詛咒。兩案都從「加剪影」與「把喜事符號替換成殮葬材質」兩件事下手。

## 甲案「綑屍紅包」（`variants/addWedding-a.js`，副本 `variants/a/table-tray.js:212-273`）

- **主意象**：一只**幾乎直立的紅封被兩道白麻繩十字捆死**，封口燒成焦黑並往下滲三條黑舌，底下兩只扁紅包歪疊著。
- **元素清單**：① 底層兩只歪疊扁紅包（躺平 xz 面）② 立起的紅封＝前後兩面＋四條側緣的薄盒
  ③ 燒焦撕裂的封口＋三條黑舌 ④ **撕成兩半、上下錯開的黑囍** ⑤ 兩道橫繩各繞整圈＋一條縱繩
  ⑥ 繩結與兩條往外斜甩的短麻穗 ⑦ 桌面上一灘黑漬。
- **色票**：硃紅 `0xb03127`／暗紅 `0x5a1417`／受光 `0xc4412f`／焦黑 `0x181210`／麻繩 `0xcdc3a8`＋`0x8b826f`／黑囍 `0x14100e`。
  紅仍是紅包的紅但比紅布 `0x6e1616` 亮一階才跳得出來；不祥元素走白麻與焦黑，**麻繩只做細條不鋪大面**（避開白虎面具的米白大面）。
- **三角形數 86**（既有最大者芭樂 114 × 1.3 = 148.2，通過）。包圍盒 `x −0.225…0.230、y 0…0.292、z −0.105…0.135`。
- **與既有六種的區辨點**：唯一一件「被繩子綁住」的；紅色系只有它與 base wedding（base 本身要被取代）；
  白虎是米白大面具、王船是褐色紙舟、鐵鎖是灰鐵鏈環、芭樂是綠黃果體、水符是藍狹長折尾、符紙堆是泛黃紙疊——顏色與剪影都不撞。

## 乙案「紙新娘紅包」（`variants/addWedding-b.js`，副本 `variants/b/table-tray.js:212-272`）

- **主意象**：紅包口掀開，裡面**立起一尊蓋頭紙新娘**——紅蓋頭底下不是臉而是骨白的空臉，
  一縷黑髮從紅包口垂出來拖到桌面，旁邊斜插一支白骨髮簪。
- **元素清單**：① 底座紅包＋被掀開的封口蓋片＋燒焦的封口 ② 裙擺→腰→肩兩段六邊錐台
  ③ 頭與頭頂 ④ 紅蓋頭（六面**只留正面那一片開口**）⑤ 骨白空臉＋兩個黑眼窩＋一道黑口
  ⑥ 背面垂到腰的長黑髮、蓋頭兩側兩縷、紅包口拖出的一縷 ⑦ 白骨髮簪與簪頭骨節 ⑧ 桌面黑漬。
- **色票**：硃紅 `0xb03127`／暗紅 `0x5a1417`／蓋頭 `0xbb3730`／骨白 `0xdcd6c2`＋`0xb8b1a0`／黑髮 `0x120f0e`／焦黑 `0x1a1412`。
  骨白只用在空臉與髮簪兩塊小面；暗面刻意偏灰不偏褐，偏褐會讀成木棍、撞王船紙舟。
- **三角形數 100**（≤148，通過）。包圍盒 `x −0.200…0.232、y 0.004…0.296、z −0.152…0.158`。
- **與既有六種的區辨點**：唯一一件有**人形**的；白虎是平面面具、王船是舟、其餘都是物件，沒有一件是站著的人。
  側面看仍是紅色錐形人影＋背後的長黑髮，不是一片消失的薄片。

## 兩案的主剪影差異（使用者要挑的就是這一點）

| | 甲 | 乙 |
|---|---|---|
|正面剪影|橫向十字（兩道繩）＋外甩的短穗|直立錐形人影＋斜出的簪子|
|主角|紅包本身（被綁住的物）|從紅包裡站起來的人|
|不祥語彙|喪事白麻＋燒焦＋撕開的囍|骨白空臉＋黑髮＋白骨簪|

## 尺寸與預算（全部由治具實測，不是估的）

既有六種（同一支治具在 base 上量的，`metrics-base.json` 的 `lineup1`／`lineup2`）：

|kind|三角形|高（max y）|最寬（max \|x\|）|
|---|---|---|---|
|generic 符紙堆|52|0.182|0.227|
|guava 芭樂|**114（最大）**|0.294|0.147|
|water 水符|20|0.310|0.120|
|lock 鐵鎖|64|0.255|0.167|
|tiger 白虎面具|36|**0.345（最高）**|0.205|
|boat 紙舟|8|0.285|**0.250（最寬）**|
|wedding（現行）|8|0.040|0.230|
|**甲**|**86**|0.292|0.230|
|**乙**|**100**|0.296|0.232|

上限：三角形 ≤ 114 × 1.3 = **148.2**（甲 86、乙 100 通過）；高 ≤ 0.35 且不得高過白虎 0.345（甲 0.292、乙 0.296 通過）；
footprint ±0.25（甲 0.230、乙 0.232 通過）。draw call 三版一律 30（table／side／mobile）與 28（lineup2）——**沒有新增 draw call**。

## metrics（`metrics-{base,a,b}.json`；errors 全為空陣列）

|情境|base calls／tris|甲 calls／tris|乙 calls／tris|
|---|---|---|---|
|table 844×390 DSF2 hover slot1|30／2341|30／2653|30／2709|
|side 同視口・轉 90°|30／2341|30／2653|30／2709|
|mobile 852×393 safe59|30／2341|30／2653|30／2709|
|lineup1 generic/guava/water/lock|30／2559|30／2559|30／2559|
|lineup2 tiger/boat/wedding|28／2361|28／2439|28／2453|

`tris` 是 `renderer.info.render.triangles` 的單幀快照（整個場景，含紅布／桌面／道具），**不是 fps 證據**。
lineup1 三欄相同是應然的（那一張不含 wedding），可當這支治具沒有把不相干的東西一起改掉的旁證。

## 指令原文

```
node tests/tools/a2-curse-sheet.mjs --name=base --out=docs/experiments/2026-09-17-a2-wedding --port=9201
node tests/tools/a2-curse-sheet.mjs --name=a --js=docs/experiments/2026-09-17-a2-wedding/variants/a/table-tray.js --out=docs/experiments/2026-09-17-a2-wedding --port=9204
node tests/tools/a2-curse-sheet.mjs --name=b --js=docs/experiments/2026-09-17-a2-wedding/variants/b/table-tray.js --out=docs/experiments/2026-09-17-a2-wedding --port=9205
python tests/tools/a2-curse-sheet.py docs/experiments/2026-09-17-a2-wedding/sheet-ab.png base a b --dir=docs/experiments/2026-09-17-a2-wedding
# 兩個變體各自暫時換進 js/ 跑完即還原（js/ 的 md5 前後相同、git status 空）
node --test tests/curse-migration.test.mjs                       # → tests-migration-{a,b}.txt
node tests/tools/table-framing-check.mjs --all --curse-only --match=冥婚 --out=docs/experiments/2026-09-17-a2-wedding/framing-wedding-{a,b}.json
```

## 驗證結果

- `tests-migration-a.txt`／`tests-migration-b.txt`：各 **12/12 pass、fail 0**。
  ★這條的鑑別力要說清楚★：`tests/curse-migration.test.mjs` 走 `tests/tools/load.mjs`，
  它只把 `index.html` 的 inline `<script>` 在 Node 裡跑起來，**根本不載入 `js/table-tray.js`**——
  所以它對「造型改了什麼」是 0 鑑別力，綠燈只證明「沒有順手改到規則」。
- 補上真正會紅的那一支：`framing-wedding-{a,b}.json` 各 **60/60 pass、failed 0、pageErrors 0**
  （冥婚紅包 × 4 槽 × (4 個轉手目標＋燒毀) × 3 視口）。這支把真實 mesh 的包圍盒投影到螢幕，
  驗「落在紅布可用區內、不壓到 HUD、終局姿勢還在畫面上」——造型長歪或超框會在這裡紅。
- 5 情境 × 3 版 = 15 張 png，每張對應的 metrics `errors` 皆為 `[]`（0 console error／0 page error）。

## 圖

- `sheet-ab.png`：欄＝base／甲／乙，列＝table／side／mobile／lineup2（1932×1116）。
- `lineup1-*.png`、`lineup2-*.png`：**圖上刻意不標名稱**，給之後的盲讀指認用；答案在 `lineup-key.json`（讀者不要先看）。
  托盤一次只有 4 格，所以七種分兩張：lineup1＝generic／guava／water／lock，lineup2＝tiger／boat／wedding（第 4 格空著）。

## 已知限制／做不到的

- **托盤側面**：`tray` 沒有公開設定 spin 的 API，hover 自轉是 `s.spin += HOVER_SPIN * dt`，
  角度會隨「等了幾毫秒」而變、三案之間對不齊。治具改成包一層 `tray.update`，每幀之後把四個占位 group 的
  `rotation.y` 釘在「靜止時的基準 yaw ＋ 90°」。這是 page context 裡的治具行為，產品碼零 diff。
- 甲案的側面（`side-a.png`）明顯比正面弱：立封轉成側向後只剩一條有厚度的紅板＋兩側的繩圈，
  「被捆住」讀得出來、「紅包」讀不太出來。乙案側面仍是紅錐人影＋長黑髮，掉得比較少。這一點請在挑案時一併看。
- 本卷**沒有**做盲讀，也沒有跑 768 卡面（凍結 #7 的第三項）——卡面走的是 DOM 文案不是 3D 造型，
  但既然凍結把它列進同一條，接入正式資產那一輪要補跑，本卷不代跑、不代宣稱。
- 兩案都**不取亂數**（座標全寫死），所以也沒有耗用 `rnd(seed)`；決定性由「沒有隨機源」保證。

---

# r2 回修（2026-09-17，使用者挑甲之後）

使用者挑了甲「綑屍紅包」並接進正式 `js/table-tray.js`，r1 送 8 位 context-free 讀者後**未過**
（桌面可辨 1/2、七種並排指認 3/6；答卷在 `blindread-r1/`）。r2 只回修造型，**概念仍是甲**，不改成乙。
本輪改的是正式 `js/table-tray.js:212-287`（註解 212-225、函式 226-287），**其他六種造型一行不動**。

## r1 為什麼沒過（讀者原話歸納）

- 桌面 1/2：兩位都**沒說出「紅包」**。麻繩被讀成「淺褐色木條交叉的 X 支架／轎桿」，焦黑封口被讀成「黑色門洞／開口」，
  本體因此被讀成「紅色小木箱／小神龕／供品箱」；opus 讀者說「沒有喜字、金邊、花紋，看起來是中性紅色道具箱」→ 選「都不是」。
- 並排 3/6：三位 sonnet **一致把第 4 格的縛靈鎖當成紅包**——「第 4 格與第 7 格都是紅褐／暗紅方塊＋十字繩帶，只差深淺」。
  鐵鎖的 `ironLit 0x8d7652` 在小尺寸下就是褐色箱＋X 紋，甲案 r1 的褐麻繩十字正好撞上。

## r1 → r2 改動表

| # | r1（未過） | r2 | 為什麼 |
|---|---|---|---|
|1|綁帶＝泛黃麻繩 `0xcdc3a8`／`0x8b826f`，細條，**兩道橫繩＋兩條外甩短穗**|**冷白寬布帶** `0xe6e0d2`／`0xb9b3a4`，帶寬由 0.022 加到 0.029，只留**一橫一縱＋交會處結塊**，短穗整組拿掉|白是喪事語彙，一眼跟褐色的縛靈鎖分開；外甩短穗正是被讀成「X 支架」的那兩條|
|2|本體半厚 `t=0.018`、正立、無任何紅包符號|半厚收到 `t=0.008`（不到一半）、半寬 0.115→0.125、**微後仰**（頂端往 −z 偏 0.045，正對俯視相機），正面中上加**金印方塊** `0xd0a34a`＋壓暗的印心 `0x9c7733`|薄扁＋金印＝「紅包」的身分證；後仰讓正面朝向俯視相機，不再讀成立方體箱子|
|3|正面主紅 `0xb03127`|`0xc7392c`（背面 `0x9a2a25`、側緣 `0x71191a`、頂緣受光 `0xd8503a`）|比紅布 `0x6e1616` 再亮一階，小尺寸下才跳得出來|
|4|封口＝一條橫焦黑帶＋三條黑舌|拿掉；改成**從白帶上緣往下流的三條黑滴＋兩顆積在底部的黑珠**（`0x120f0e`，前後各一份）|橫黑帶被讀成「黑色門洞」，反而幫箱子坐實；黑滴細長、起點在白帶上，讀的是「在流」|
|5|—|新增**一縷黑髮**：從封口垂到本體一半高（v=1.0→0.50），兩段略彎，前後各一份|冥婚的直接語彙，且是既有六種都沒有的元素|
|6|撕成兩半的黑囍（8 quad）|整段拿掉|小尺寸讀不出字，只剩下會被讀成人形的碎片|

## r2 硬指標（治具實測）

- **三角形 80**（r1 是 86；上限＝既有最大者芭樂 114 × 1.3 = **148.2**）。
- 包圍盒 `x −0.225…0.230、y 0…0.285、z −0.105…0.135` ⇒ 高 0.285 < 白虎 0.345 ✓、footprint 0.230 ≤ 0.25 ✓。
- draw call 與 base／r1 完全相同：table／side／mobile 皆 **30**、lineup2 皆 **28** ⇒ 零新增 draw call。
- 白帶、金印、黑滴、黑髮一律 `both()` 放 ±z 兩份 ⇒ 正反面都讀得出。

|情境|r2 calls／tris|
|---|---|
|table 844×390 DSF2 hover slot1|30／2629|
|side 同視口・轉 90°|30／2629|
|mobile 852×393 safe59|30／2629|
|lineup1 generic/guava/water/lock|30／2559|
|lineup2 tiger/boat/wedding|28／2433|

## r2 指令原文與結果

```
node tests/tools/a2-curse-sheet.mjs --name=r2 --out=docs/experiments/2026-09-17-a2-wedding --port=9221
  → table-r2.png／side-r2.png／mobile-r2.png／lineup1-r2.png／lineup2-r2.png／metrics-r2.json，errors: []
node --test tests/*.test.mjs
  → tests 96 / pass 96 / fail 0
node tests/tools/table-framing-check.mjs --all --curse-only --match=冥婚 --out=docs/experiments/2026-09-17-a2-wedding/framing-wedding-r2.json
  → cases 60 / passed 60 / failed 0 / pageErrors 0
python tests/tools/a2-curse-sheet.py docs/experiments/2026-09-17-a2-wedding/sheet-r1r2.png base a r2 --dir=docs/experiments/2026-09-17-a2-wedding
```

`table-framing-check.mjs` **沒有 `--port` 參數**（埠寫死 8992，未知旗標會被靜默吃掉），所以那一行沒帶 `--port=9222`。

## r2 還沒做的

- **r2 的盲讀還沒送**（本輪只有回修＋拍圖＋硬指標）。凍結 #7 的「桌面 2/2」「並排 ≥5/6」要重新送 8 位 context-free 讀者才算數。
- 768 卡面 9 項仍未跑（走 DOM 文案不是 3D 造型，接入發布那一輪要補）。

---

# r3 回修（2026-09-17，最後一輪）

r2 盲讀：**七種並排指認 6/6 過**（六位都靠「唯一鮮紅＋扁方像紅包袋」）；**桌面可辨仍 1/2**——
sonnet 讀成「紅色小神椅／迷你寶座」（白帶→扶手、黑髮→飄帶）但仍選不祥；
opus **這次讀出「紅包袋／紅信封」了**卻選「都不是」，原話：「紅配金有喜氣底子，但上面橫著的白棒子（讀成兩根筷子）
和垂下的黑線（讀成墨痕）讓它說不上吉利，偏中性儀式道具，既不明確喜慶也不到恐怖」。

所以 r3 **只加強死亡／喪事訊號**：紅包身分（薄扁亮紅＋金印）與白帶一律保留，
並排已過的紅／金／扁方**一個像素都不動**。三項改動的共同判準是「**從細線升級成有面積的量體**」——
r2 失敗的三件（白帶、黑滴、黑髮）都是因為在 844×390 下細到只剩線條，線條就會被腦補成筷子／墨痕／飄帶。
本輪改的是正式 `js/table-tray.js:212-297`（註解 212-228、函式 229-297），其他六種造型一行不動。

## r2 → r3 改動表

| # | r2（桌面 1/2 未過） | r3 | 為什麼 |
|---|---|---|---|
|1|白帶只有「一橫一縱＋結」，最寬處 0.029|保留橫帶與結，**從結塊往下垂一條寬布尾**：上緣 u±0.184（≈橫帶寬的 1.5 倍）、下襬外張到 u±0.238，垂過底緣，再在底板上**攤成一灘**（`xz` 兩層，含一道摺影）|有垂墜、有攤開才是布；筷子與扶手不會垂也不會攤。正反面各一份|
|2|三條細黑滴（寬 0.042–0.052 u）＋兩顆黑珠|全拿掉；改成**一整片上窄下寬的血黑漬** `0x2a0a0c`（＋更暗的核心 `0x16050a`）：從金印下緣 v=0.58 淌到底緣 v=0.02，底寬 0.66 u ≈ 正面寬的 1/3；**刻意偏左**（中心 u≈−0.44），讓縱帶與髮束各有位置；腳下再積一灘**扁黑池**（兩層 `xz` 薄片，比底板小一圈）|面積夠大才從「墨痕」變成「淌出來的東西」；近黑帶紅不是純黑——純黑在暗紅布上只會讀成陰影|
|3|一縷黑髮（2 段、單綹、到本體一半高）|**三綹一束**：從封口上緣**越過去**（一條橫跨厚度的帶子真的翻過頂緣）再垂到底板，末端三綹散開到 u 0.44–1.12；中間那綹用 `0x231d1b` 提亮一格，才看得出是「幾綹」不是一塊|r2 的單線被讀成「飄帶」；一束、有粗細、末端散開，844×390 下才讀得出是頭髮|

## r3 硬指標（治具實測）

- **三角形 100**（r2 是 80；上限＝既有最大者芭樂 114 × 1.3 = **148.2**）✓
- 包圍盒 `x −0.225…0.230、y 0…0.2956、z −0.105…0.120` ⇒ 高 0.2956 < 白虎 0.345 ✓、footprint 0.230 ≤ 0.25 ✓
- **draw call 與 base／r1／r2 完全相同**：table／side／mobile 皆 **30**、lineup2 皆 **28** ⇒ 零新增 draw call ✓
- 布尾、血漬、髮束全部用 `bothQ()` 鋪 ±z 兩份，髮束另有一條橫跨厚度的帶子 ⇒ 正反面都讀得出 ✓

|情境|r3 calls／tris|
|---|---|
|table 844×390 DSF2 hover slot1|30／2709|
|side 同視口・轉 90°|30／2709|
|mobile 852×393 safe59|30／2709|
|lineup1 generic/guava/water/lock|30／2559|
|lineup2 tiger/boat/wedding|28／2453|

## r3 指令原文與結果

```
node tests/tools/a2-curse-sheet.mjs --name=r3 --out=docs/experiments/2026-09-17-a2-wedding --port=9231
  → table-r3.png／side-r3.png／mobile-r3.png／lineup1-r3.png／lineup2-r3.png／metrics-r3.json，errors: []
node --test tests/*.test.mjs
  → tests 96 / pass 96 / fail 0
node tests/tools/table-framing-check.mjs --all --curse-only --match=冥婚 --out=docs/experiments/2026-09-17-a2-wedding/framing-wedding-r3.json
  → cases 60 / passed 60 / failed 0 / pageErrors 0
python tests/tools/a2-curse-sheet.py docs/experiments/2026-09-17-a2-wedding/sheet-r2r3.png r1 r2 r3 --dir=docs/experiments/2026-09-17-a2-wedding
```

## r3 還沒做的

- **r3 的盲讀還沒送**——凍結 #7 的「桌面 2/2」要重新送讀者；並排那一條 r2 已 6/6 過，
  r3 沒動紅／金／扁方，但既然幾何有變，保守作法是並排一併重讀。
- 768 卡面 9 項仍未跑（走 DOM 文案不是 3D 造型，接入發布那一輪要補）。

## S6 結果：甲案三輪盲讀（主對話，2026-09-18）

使用者挑甲（原話「甲」）→ 甲案 `addWedding` 接入正式 `js/table-tray.js`；同方案三輪（凍結 #3 同法上限三輪），每輪 8 位 context-free 讀者：桌面可辨 2 位（只看 844×390 hover 圖，Q3 三選一「吉祥喜氣／不祥詛咒／都不是」）＋七種並排指認 6 位（lineup1／lineup2 不標名、給七個名稱逐格指認）；命中口徑送讀前寫死於各輪 `blindread-r*/criterion.md`，答卷 `blindread-r{1,2,3}/`。

| 輪 | 改動 | 桌面「不祥」 | 桌面主印象 | 並排指到冥婚紅包 | 可愛／玩具 |
|---|---|---|---|---|---|
| r1 | 甲案原版（褐麻繩十字、焦黑封口、撕囍） | 1/2 | 紅木箱／小神龕（麻繩→木條 X 支架） | 3/6（sonnet 三位全指到縛靈鎖：「紅褐方塊＋十字繩帶只差深淺」） | 0／略有模型感 |
| r2 | 繩改冷白寬帶＋結、本體薄扁後仰＋金印、黑滴＋一縷黑髮、刪撕囍 | 1/2（opus 讀出「紅包袋」但「不到恐怖」） | 紅色小神椅／紅包袋 | **6/6 過** | 0／略有 |
| r3 | 白帶加寬布垂尾攤在底板、黑滴改整片血黑漬＋腳下黑池、黑髮改三綹一束越過封口 | **2/2 過** | 白身紙紮小人偶立在紅底座／紙紮人偶張臂立在紅牌位前 | **6/6 過** | 0／輕微棋子感 |

**依凍結 #7 過**：①桌面可辨「詛咒／不祥」2/2 ②三情境並排指認 6/6（≥5/6）③768 卡面 9/9 ＋ curse-migration／curse-effects 既有測試綠（見下表）。有過就停，不加第四輪。**如實記**：r3 兩位桌面讀者把「白布帶＋垂尾」讀成「攤開雙臂的白紙人」，不是設計本意（綑屍白布），但語意落在冥婚／紙紮上；「紅包」身分在桌面題沒被說出，靠並排題的紅色＋金印撐住（六位依據都是「唯一鮮紅」）。

### 硬指標（r3＝出貨版 0.57.22）

| 指標 | 值 | 門檻／來源 |
|---|---:|---|
| tris（詛咒 mesh） | 100 | ≤ 148.2（芭樂 114 ×1.3）；r1 86、r2 80 |
| 高／footprint | 0.296／0.230 | ≤ 0.345（白虎）／≤ 0.25 |
| draw calls | table／side／mobile 30、lineup2 28 | 與 base 逐值相同 |
| 取景矩陣 `--all --curse-only --match=冥婚` | 60/60 | [framing-wedding-r3.json](framing-wedding-r3.json) |
| 768 卡面 9 項 | 9/9、0 error | [cards-s6/result.json](cards-s6/result.json) |
| `node --test`（含 curse-migration／curse-effects） | 96/96 | [tests-all-s6.txt](tests-all-s6.txt) |
| trace-eq seeds 1–20 | equal | [trace-eq-0.57.22.txt](trace-eq-0.57.22.txt) |
| perf32 五輪配對 | .4938／.6418／.5216／.5170／.5270（5/5 ≥ .40） | [perf32-0.57.22.json](perf32-0.57.22.json) |
| console／page error | 0 | 所有治具 |

### 順帶記下
- `tests/curse-migration.test.mjs` 不載入 `js/table-tray.js`，對造型是零鑑別力（agent 查出）；造型的機械證據是取景矩陣 `--curse-only`。
- `table-framing-check.mjs` 沒有 `--port` 參數（埠寫死 8992），未知旗標被靜默吃掉。

