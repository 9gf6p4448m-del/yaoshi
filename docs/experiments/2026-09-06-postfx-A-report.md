# 後處理卷 A 段報告：反轉外殼描邊（P-1）＋陣營盲讀治具（P-2）

日期 2026-09-06　基準 `db8f301`（內容等同 v0.34 `5f76adc`）　worktree `.claude/worktrees/agent-a8f480ae15618e752`
凍結驗收＝`docs/experiments/2026-09-06-acceptance-postfx.md`；事實表＝`2026-09-06-postfx-facts.md`

## 結論

- **P-1 外殼描邊：PASS**（線寬 2.0 CSS px、dist 3.6 與 4.2 差 0%；6/6 合成燒毀＋7/7 真實燒毀後外殼 `visible===false`；兩支突變都驗紅）
- **P-2 盲讀治具：PASS（但版面偏離凍結條件）**——16 尊編號齊全、on／off 站位逐尊相同、`?outline=0` 真的關掉（外殼 228→0）；**截圖在 844×390 而不是凍結檔寫的 390×844**，理由與代價見 §6。
- **不退步**：`traitfx-drive` 27/27、`duel-drive` 4 場 console 0、programs 第一場後恆定（比基準還穩）、draw calls 1.83×（≤2.2）。
- **一項要主對話裁定**：關掉 vsync 量的 fps 從 153.8 掉到 111.1（72.2%），低於 P-5 的「≥基準 85%」；沿用既有閘門（不關 vsync）則兩邊都是 59.9 fps。見 §5 與 §7 風險 1。

---

## 1. 架構決定

| 決定 | 做法 | 為什麼 |
|------|------|--------|
| 外殼掛在哪 | 每顆本體 mesh 底下掛一顆子節點（`creature-figures.js:456-470`） | 子節點的 `matrixWorld` 逐幀等於本體。SkinnedMesh 預設 `attached` bindMode 每幀拿 `matrixWorld` 重算 `bindMatrixInverse`（three r158 `SkinnedMesh.updateMatrixWorld`），掛成兄弟節點要自己同步矩陣才不脫節 |
| 骨架 | `sh.bind(o.skeleton, o.bindMatrix)`，reuse `o.geometry` | 事實表風險 2：再跑一次 `SkeletonUtils.clone` 會生第二副不同步骨架；也會讓 `trait-fx.js:129` 的 model 偵測抓錯節點 |
| `trait-fx` 偵測 | **沒有動**（`group.children` 頂層結構不變，外殼在 model 底下第 2 層以下、不是 Bone） | 27/27 招式全綠、`prog+0`，見 §5 |
| 材質 | `MeshBasicMaterial` ＋ `onBeforeCompile`，`side: BackSide`（`creature-figures.js:333-360`） | 蒙皮（`USE_SKINNING`）、霧、色彩空間（對決走 bloom 的 RT 是 linear、直接輸出是 sRGB）全交給 three 的標準管線；自己寫 `ShaderMaterial` 這三件要重抄一遍 |
| cache key | `'yaoshi-creature-outline'`（本體是 `'yaoshi-creature-rim-burn'`） | 事實表風險 3 |
| 一尊一顆材質 | 整尊 10–19 顆 mesh 共用一顆外殼材質 | 一份 uniform（`uDissolve`／`uOutlineColor`）、兩支 program 打死 |
| 燒毀 | `setDissolve()` 同步餵 `shellU.uDissolve`（`:487`）；燒完 `shells.forEach(s => s.visible = false)`（`:610`）、`reset()` 收回（`:623`） | 外殼與本體共用同一段 `DISSOLVE_CUT` GLSL＝同一條門檻、同一組雜訊，逐像素同時破 |
| `setRim`／`setCloth` | 只動 `uniforms[]`（本體），完全不碰 `shellU` | 凍結條件 |
| 關閉鉤 | `?outline=0`（`creature-figures.js:263-265`），解析方式抄 `index.html:3146` 的 `?fxcount`；正式頁沒帶＝開 | P-2 對照組 |
| 暖身 | `createOutlineWarmup()`（`:362-380`），renderer.js 在 `stageRig` 之後 `scene.add()` | 照 `trait-fx.js:104-114`：`renderer.compile()` 只編「直接輸出」那一支，bloom RT 那一支要靠常駐、關 frustumCulled 的物件每幀真的被畫才會編 |

**重構（唯一動到既有程式碼的地方）**：把雜訊函式抽成 `NOISE_GLSL`、把燒毀切口抽成 `DISSOLVE_CUT`，本體與外殼共用。
組出來的本體 shader **逐位元組相同**（實測：`PARS` 739 chars、`TAIL` 850 chars，新舊字串相等，指令見 §5.7）。

## 2. 線寬換算公式

在 clip space 沿「投影後的法線方向」推固定的螢幕像素（`creature-figures.js:319-330`）：

```glsl
vec4 _oClip = projectionMatrix * mvPosition;
vec3 _oN    = normalize( normalMatrix * _shellNormal );   // view space 法線（蒙皮後）
vec2 _oC    = ( projectionMatrix * vec4( _oN, 0.0 ) ).xy; // 法線投影到螢幕的方向
vec2 _oDir  = dot(_oC,_oC) > 1e-12 ? normalize(_oC) : vec2(0.0);
_oClip.xy  += _oDir * ( uOutlinePx * 2.0 / uOutlineRes ) * _oClip.w;
```

- `× 2.0 / uOutlineRes`：CSS 像素 → NDC（NDC 全寬是 2，視窗寬 `uOutlineRes.x` 個 CSS 像素）。
- `× _oClip.w`：抵銷後面的透視除法 → 位移量不隨深度縮放，**線寬與距離無關**（這是 P-1 那條驗收的來源）。
- `uOutlineRes` 每幀由 `syncOutlineRes()` 從 `window.innerWidth/innerHeight` 更新（只在真的變了才寫），全場共用一個 uniform 物件。
- 法線正對鏡頭時 `_oC.xy≈0`，`normalize` 會是 NaN，所以有 `dot>1e-12` 的守衛。

## 3. 系色選值與理由

`OUTLINE = { px: 2.0, satMul: 1.6, lum: 0.42 }`（`creature-figures.js:243-247`，全部標【試玩必調】）。
`outlineColorOf(faction)`（`:277-283`）取既有 `FACTION_RIM`，在 sRGB 的 HSL 上**色相不動**、飽和度 ×1.6、明度壓到 0.42：

| 系 | `FACTION_RIM` | HSL(sRGB) | 描邊色 | rgb |
|----|--------------|-----------|--------|-----|
| 祖靈 zuli | `#d4a870` | h 33.6° s .538 l .635 | **`#c7760f`** | 199,118,15 |
| 香火 xianghu | `#f08060` | h 13.3° s .828 l .659 | **`#d63000`** | 214,48,0 |
| 陰氣 yinqi | `#70b080` | h 135.0° s .288 l .565 | **`#3a9d52`** | 58,157,82 |

- **沒有新增第 7 份系色複製品**：只有一張 `RIM_KEY` 索引轉換表（`canonFaction` 的 `zuling/xianghuo/yinqi` → `FACTION_RIM` 的 `zuli/xianghu/yinqi`），色值一律由 `FACTION_RIM` 算出來。
- **為什麼要壓暗（處理香火 vs 燈籠橘相撞，事實表 C 段 `creature-figures.js:566-571`）**：燈籠光暈是 `#f0a840`（h 33.8° **l .596**）。香火原色 `#f08060` 只比它暗一點、色相也接近，整隻被燈籠照橘之後描邊也是橘的＝沒有邊。壓到 l=.42 之後三系都明顯比燈籠暗，描邊讀成「一條線」而不是「一層光」。
- **為什麼三系用同一個絕對明度而不是各自打折**：等亮才是在比色相。各自 ×0.6 的話陰氣會比香火暗一截，讀者會先分成「亮的／暗的」兩堆。
- **8v8 截圖上肉眼分不分得出來（我自己看 `faction-on.png`）**：分得出三色——1／9／10／12 一圈金褐、11／13 一圈正紅、6／15／16 一圈綠。**最弱的一對是祖靈 vs 香火**（色相只差 20.3°），靠 G 通道（118 vs 48）撐開；祖靈又跟燈籠同色相，只靠明度差。這一點寫進風險，讓盲讀去裁。

## 4. 治具

| 檔 | 用途 |
|----|------|
| `tests/tools/outline-probe.mjs` | `width`＝兩個機位量描邊像素寬；`burn`＝燒毀後外殼 `visible` |
| `tests/tools/faction-sheet.mjs` | P-2 的 8v8 對照圖＋`faction-key.json` |

三個共同的量測污染源，都在治具裡處理掉了（教訓④）：

1. **真對決的時間軸還在跑**：`ys:fx-burn`／`fx-punch`／`fx-lunge`／`fx-impact`／`duel-end`／後續 `ys:duel` 一律在 capture 攔掉。第一版沒攔 `fx-impact`，其中一張正好拍到桌心那團橘火星，整張圖泛橘。
2. **DOM 蓋在 canvas 上而且不吃 hitstop**：拍數字幕、隻數牌在兩張截圖之間換字。第一版量到的「差異」有一大半是那幾團字（`diffPx` 28k vs 41k）。改成量測前把 `body` 的非 canvas 子節點 `visibility:hidden`（不動 `display`＝不動版面與 `sceneKind()`／`realign()`）。
3. **兩輪之間 idle 動畫相位不同**：頭頂投影差 1–3 px，標籤避讓規則在臨界點翻面，同一個號碼在兩張圖差到 69 px（#8 hairpin 實測）。改成標籤座標算一次、兩張共用。

## 5. 逐條驗收（指令原文＋實際輸出摘要）

### 5.1 P-1 線寬（凍結：dist 3.6 與 4.2 同一尊外殼像素寬差 ≤30%）

```
node tests/tools/outline-probe.mjs width <out.json> --port=8877 --dists=3.6,4.2
```
量法：同一次載入、`ys:hitstop` 凍住時間軸，同一格畫面切 `shell.visible` 拍兩張；逐條水平掃描線取
「開描邊之後變得更綠」的像素，只算**由左／由右進來的第一段**（外輪廓），縱向取中段 60%，取中位。
量的那尊固定陰氣（描邊綠，全畫面唯一的綠）。viewport 844×390、dpr 2。

| dist | camLen | 中位（device px） | 中位（CSS px） |
|------|--------|------------------|---------------|
| 3.6 | 3.600 | 4 | **2.00** |
| 4.2 | 4.200 | 4 | **2.00** |

`spreadRatio = 1.000`（差 0%）≤ 30% → **PASS**。console errors 0。
兩個機位的遮罩 bbox 高 420 vs 416 px（尊在畫面上一樣大，`figScale3d` 沒被 clamp 咬到）。

**鑑別力（§6.1 第 1 條）——這一段要看清楚：**

| 版本 | dists 3.6/4.2 | dists 2.4/5.4 |
|------|---------------|---------------|
| 本實作 | 4 / 4 → 1.00 **綠** | 4 / 4 → 1.00 **綠** |
| 突變：把 clip-space 推位改成固定世界位移 `mvPosition.xyz += _oN * 0.0201` | 4 / 4 → 1.00 **也綠** | 6 / 3 → **2.00 紅** |
| 正控：`OUTLINE.px` 2.0 → 8.0 | 13 / 13（度量會動，非飽和） | — |

**凍結檔那一對（3.6/4.2）對「線寬隨距離縮放」這個壞法沒有鑑別力**——1/dist 只差 16.7%，落在
4→5 device px 的量化格內。真正驗得出來的是 2.4/5.4 那一對（2.25× 距離範圍），本實作在它上面也是 1.00。
兩組數字都留在報告裡，不拿窄的那一組當「已驗證」。（凍結條件本身沒有改：3.6/4.2 照跑照過。）

### 5.2 P-1 燒毀（凍結：燒完外殼跟本體一起消）

```
node tests/tools/outline-probe.mjs burn <out.json> --port=8878 --duels=4
```
```
{"realBurns":10,"realHandled":7,"realBad":0,"synthBurned":6,"synthBad":0,"errors":0,"pass":true}
```
- ①真實路徑：4 場共 10 次 `ys:fx-burn`，其中 7 次走 3D 妖（`skin=creature`、`handled=true`）；
  7/7 在 `detail.done` 之後 `outlines().every(s => !s.visible)` 且 `group.visible===false`。
  另 3 次是空袋的「肉身」貼片人形（`skin=layered`），本來就沒有外殼。
- ②合成名冊（bow／sword／redhat／tiger／nail／shield 六尊，走真實的 `ys:fx-burn` 事件）：
  6/6 `handled=true`、燒前外殼全可見、燒後全 `false`、`group.visible=false`。

**鑑別力**：把 `creature-figures.js:610` 的 `shells.forEach(s => s.visible = false)` 拿掉重跑
→ `realBad 7、synthBad 6、pass:false`。真實路徑與合成路徑**都**驗紅。

### 5.3 P-2 兩張圖與 key

```
node tests/tools/faction-sheet.mjs docs/experiments/2026-09-06-postfx-evidence --port=8873 --w=844 --h=390 --seed=7
node tests/tools/faction-sheet.mjs docs/experiments/2026-09-06-postfx-evidence --port=8875 --w=390 --h=844 --seed=7 --tag=-390
```
```
{"n":16,"labelsOutsideBbox":[],"sameLayoutOnOff":true,"camLenOn":4.2,"camLenOff":4.2,
 "settleOn":{"frames":46},"settleOff":{"frames":45},"shellsOn":228,"shellsOff":0,"errors":0}
```
- 產物：`faction-on.png`／`faction-off.png`／`faction-key.json`（844×390，主用）
  ＋`faction-on-390.png`／`faction-off-390.png`／`faction-key-390.json`（390×844，見 §6）。
- 名冊（每隊每系 ≥2；體型一律 elite，讓大小與隻數不帶訊息）：
  A＝bow・shanshen・boartusk（祖靈）／sword・bell（香火）／redhat・nail・hairpin（陰氣）
  B＝shield・eye（祖靈）／flag・wangchuan・tiger（香火）／chair・raincoat・buoy（陰氣）
  合計 祖靈 5／香火 5／陰氣 6。
- 16 尊都有編號、`labelsOutsideBbox` 空（每個標籤中心都落在該尊 bbox 的螢幕投影內）。
- `sameLayoutOnOff:true`：on／off 兩張的 16 個標籤座標差 <5 px（座標本來就是同一份）。
- `shellsOn=228 / shellsOff=0`：`?outline=0` 真的把外殼關掉了（不是只變透明）。
- 兩張都等到「GLB 全就位 ＋ 相機距離與 16 尊座標連 30 幀完全不動」才截（`settle.frames` 46／45）。
- **盲讀本身不由我做**（會污染），交主對話派 context-free 讀者。

### 5.4 不退步：招式

```
node tests/tools/traitfx-drive.mjs <out.json> --port=8872
→ 27/27 pass · 重複簽章 0
```
27 條全部 `handled=true alive=true restored=true onTime=true clean=true focus=true err=0 **prog+0**`，
簽章（`sig=NNb/…`）與基準逐條相同。

### 5.5 不退步：效能（`duel-perf.mjs perf` 8v8，AMD 780M / ANGLE D3D11）

沿用既有閘門（**不關 vsync**，就是凍結檔寫的那一支指令）：

| | rafMedianFps | rendersPerSec | drawCalls | triangles |
|---|---|---|---|---|
| v0.34 基準 | 59.9 | 276.7 | 544 | 201,908 |
| 加描邊 | **59.9** | 276.8 | **998** | 403,070 |

- fps ≥50 ✔；≥基準 85% ✔（100%）。
- **draw calls 998/544 = 1.835 ≤ 2.2** ✔（一尊多一份 mesh，符合預期）。triangles 2.00×。

**但這個數字被 vsync 夾住了（59.9＝60Hz 上限），對效能退步沒有鑑別力。**加 `--uncap` 再量一次：

| | rafMedianFps | drawCalls |
|---|---|---|
| v0.34 基準（`git checkout -- js/` 後同機重跑） | 153.8 | 548 |
| 加描邊 | **111.1** | 1000 |

111.1 / 153.8 = **72.2%**，低於 P-5 的「≥基準 85%」。111 fps 仍遠高於 50 fps 的絕對線。
**沿用凍結檔指定的那支指令是過的；換成有鑑別力的量法是不過的。**這一條我不自己裁——見 §7 風險 1。

### 5.6 不退步：console 與 program

```
node tests/tools/duel-drive.mjs "http://127.0.0.1:8872/index.html?paperwar=1&fxcount=1" <out.json> --duels=4 --port=8872
→ {"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":4,"burnFig":1,"burnDom":3,"trait":4,"traitFig":4}
```
`errors` 蒐集的是 console error ＋ pageerror ＋ requestfailed 三種，**0**。

`renderer.info.programs.length`（每場 `[開場, 收場, 收場+1.5s]`）：

| | 第 1 場 | 第 2 場 | 第 3 場 | 第 4 場 |
|---|---|---|---|---|
| v0.34 基準 | 16 → 20 | 20 → 21 → 21 | 21 → 21 | 21 → 22 → 22 |
| 加描邊 | **18** → 23 | 23 → 23 → 23 | 23 → 23 | 23 → 23 → 23 |

- 加描邊之後**第一場之後恆定 23**；基準自己反而不恆定（第 4 場還在 +1）。沒有退步，還變穩。
- 逐支數 cacheKey：`yaoshi-creature-outline` 的兩支（直接輸出 / bloom RT 兩種色彩空間）
  **在第一場開場前就已經是 2**（暖身有效）；四場之間一直是 2。
  本體的 `yaoshi-creature-rim-burn` 仍是第一場才編 1 支——那是 v0.34 原本的行為，本卷沒動。
- **暖身的鑑別力**：把 `renderer.js:110` 的 `scene.add(createOutlineWarmup())` 拿掉重跑
  → 第 1 場開場 outline program **0**、第 2 場收場才 **1**（另一支還沒編）。驗紅。

### 5.7 其餘凍結條

- `grep -c "Math.random" index.html` → **0**。`js/*.js`：我動到的兩支（`creature-figures.js`／`renderer.js`）
  各 1 行是**註解裡提到這個字**、`grep -c "Math\.random("` 皆 **0**。
  `js/particles.js` 有 15 處真呼叫（環境煙／餘燼），**是 v0.34 就有的**
  （`git show HEAD:js/particles.js | grep -c "Math.random"` ＝ 18，與現況同數），本卷一行沒動。
  → 凍結檔寫的「js/ 亦 0」在 v0.34 本來就不成立；本卷**新增 0 處**。
- `trace()` seeds 1..20 等價：`index.html` 本卷**一個位元組都沒動**（`git diff db8f301 -- index.html` 空），
  所以新舊 JSON 逐位元組相等是由構造保證的，不必再跑一次規程。
- 本體 shader GLSL 逐位元組相同（重構沒改語意）：
  ```
  git show db8f301:js/creature-figures.js > old-cf.js
  # 抽出兩版的 PARS／TAIL 組裝結果比對
  → PARS identical: True (739/739)   TAIL identical: True (850/850)
  ```

## 6. 沒做到／偏離凍結條件的地方（明說）

1. **P-2 的 `--w 390 --h 844`（直式）沒有當主用版面。**
   妖市**只有橫持一種版面**：`index.html:39` 是 `@media (orientation:portrait){ #rotateHint{display:flex} }`，
   直式會整頁蓋上「請把手機轉橫進入妖市」，`art-integration-guide.md` §6-4 寫的也是「844×390（橫持）」，
   所有既有 3D 治具的 viewport 都是 844×390。治具把那層蓋板藏起來之後直式是跑得起來的，但實測
   （`faction-on-390.png`）**16 尊只看得到 9 個編號、其餘掉出畫面左右緣、前排整個蓋住後排**——
   在那張圖上做盲讀，量到的是「有沒有被擋住」不是「分不分得出系」。
   **我的處置**：主用 844×390（`faction-on.png`／`faction-off.png`），直式那組留成 `-390` 的檔案一起附上。
   這是動到凍結條件的量測設定，**不是我能自己決定的**（`02 §2.1`）——請主對話裁定要用哪一組去盲讀。
   註：任務單把妖市寫成「手機直式網頁遊戲」，與 repo 現況不符，一併回報。
2. **P-5 的 85% 我只在「沿用既有閘門」的量法下過**（§5.5）。關掉 vsync 的量法是 72.2%。
3. **盲讀（P-2 的純度數字）沒有做**——按任務分工由主對話派 context-free 讀者，我不讀自己的圖。
4. **`--no3d` 那條沒跑**（P-6 的一部分，不在我這段的驗收清單裡）。本卷只動 `js/`，`--no3d` 會把
   `js/renderer.js` 整支擋掉，理論上不受影響，但我沒實測，不當作已驗證。
5. **只在 AMD 780M / ANGLE D3D11 上量過**。軟體 GL（`bloomOK=false`）路徑沒特別測；外殼走的是
   `MeshBasicMaterial` 的標準管線，不像自製 bloom 那樣挑實作，但同樣沒實測。

## 7. 風險

1. **效能**：關掉 vsync 後 fps 153.8 → 111.1（−28%），draw calls 1.83×、triangles 2.0×。
   桌機同款 GPU 還有很多餘裕，**手機沒有**。要不要收（例如只給 elite／只在鏡頭近時開、或做成 LOD）
   得先有一次真機試玩。
2. **祖靈 vs 香火是最弱的一對**：色相只差 20.3°，而且祖靈 `#c7760f` 跟燈籠光暈 `#f0a840` 同色相
   （只差明度）。盲讀如果掉在這一對上，優先調的是 `OUTLINE.satMul`／`lum`（單一常數、一處），
   不是換系色（換就變成第 7 份複製品）。
3. **反轉外殼在凹處與硬邊會從本體縫裡透出碎段**（看 `faction-on.png` 的虎爺頭部）。這是反轉外殼法
   的長相不是 bug，但配上 `ghost_*` 那些半透明材質（霧裾／髮瀑）時，外殼會從半透明後面透出一條暗線。
   目前**沒有**為 ghost 材質關掉外殼——留給試玩判斷。
4. **`OUTLINE.px` 是全場一個值**：8v8 時後排的尊在畫面上只有 30–40 px 高，2 px 的邊佔比很重；
   前排大隻反而顯細。若試玩覺得後排糊掉，要改成隨螢幕尺寸或隨尊的螢幕高度調，那會動到「線寬與距離無關」
   這條凍結條件，要先問使用者。
5. **`faction-sheet` 的合成對決是疊在真對決的時間軸上跑的**（沿用 `lineup` 的做法）。我攔掉了六種會動到
   量測的事件，但這是「列舉式」防線；日後新增 `ys:` 事件時這張清單要跟著補，否則會安靜地污染截圖。
