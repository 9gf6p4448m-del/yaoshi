# 後處理卷 P-3 深度邊緣偵測 pass — 實作報告（2026-09-06）

**結論：P-3 PASS。** 8v8 對決同一幀開／關邊緣線的線像素佔比 **4.237%（55,785 / 1,316,640）**，落在凍結窗 [0.5%, 6%] 中段；關閉鉤 `?edge=0` 之下與 v0.34 的 bloom **逐位元組相同（0 / 1,316,640 像素有差）**；`traitfx-drive` 帶與不帶 `--nobloom` 各 27/27 全綠；`duel-drive` 4 場 0 error／0 pageerror／0 requestfailed；8v8 fps 為 v0.34 同機基準的 **102.3%**；edge 開關不新增 program。

- worktree：`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a10a9940b2cd7d61a`（分支 `worktree-agent-a10a9940b2cd7d61a`）
- 基準：`db8f301`（＝ v0.34 `5f76adc` ＋ 兩份後處理卷文件；工作樹拿到時 HEAD 停在 `5f76adc`，已 `git merge --ff-only db8f301` 對齊）
- 對照用的「主工作樹 v0.34」：`C:\Users\shung\OneDrive\桌面\妖市`，全程只以 `python -m http.server --root` 讀取，未寫入

---

## 1. 做了什麼（檔案:行號）

| 檔案:行號 | 內容 | 對應需求 |
|---|---|---|
| `js/bloom.js:13-20` | 檔頭補「為什麼折進合成那一趟、不另開 pass／RT」 | 手機效能優先 |
| `js/bloom.js:23-39` | `export const EDGE`＝線色／雙門檻／深度上限／線寬，全部【試玩必調】，附掃描實測數字 | 顏色、閾值、線寬 |
| `js/bloom.js:73-139` | `COMPOSITE` shader 加深度邊緣偵測：線性化、Sobel、二階平面殘差、深度重建法線 Roberts、`uEdge` uniform 分支 | 深度＋法線雙門檻、深色細線 |
| `js/bloom.js:167-178` | `THREE.DepthTexture(1,1,UnsignedIntType)` 掛上 `sceneRT`，含 WebGL2／WebGL1 擴充偵測與拿不到就關掉的退路 | DepthTexture、WebGL1 退路 |
| `js/bloom.js:188-201` | 合成材質新增 `tDepth`／`uEdge`／`uOff`／`uHalfTan`／`uNearFar`／`uLineColor`／`uThresh`／`uEdgeCfg` | — |
| `js/bloom.js:209-227` | `setSize` 同步 depthTexture 尺寸（`WebGLRenderTarget.setSize` 不管它），並把取樣位移換算成 CSS 像素 | 線寬不隨 dpr 變 |
| `js/bloom.js:252-263` | 每幀從相機讀 `near/far` 與投影矩陣算 `uHalfTan`；`edgeWant && depthTex && isPerspectiveCamera` 才把 `uEdge` 打開 | 正確線性化 |
| `js/bloom.js:269-283` | `setEdge(on)`／`setEdgeParams(p)`（熱調＋治具掃描用） | 關閉鉤、【試玩必調】 |
| `js/bloom.js:286-289` | 回傳值加 `setEdge`／`setEdgeParams`／`edgeReady`／`edgeOn` | 治具出口 |
| `js/renderer.js:30-35` | `EDGE_URL_ON`＝`?edge=0` 解析（undefined＝開），照 `index.html:3146` 的 `?fxcount` 寫法 | 關閉鉤 |
| `js/renderer.js:159-161` | `window.__yaoshi3d` 加 `edgeOn`／`edgeReady` getter | 治具讀得到 |
| `js/renderer.js:212-214` | 每幀 `bloom.setEdge(EDGE_URL_ON && kind === 'duel')` | 只在對決場走 |
| `tests/tools/traitfx-preview.html:87-88` | 預覽頁跟正式頁一樣預設開邊緣線（`?edge=0` 可關）→ C3 招式治具每一幀都在跑新的 COMPOSITE | 讓 T-1~T-8 真的驗到新 shader |
| `tests/tools/edge-shot.mjs`（新增 151 行） | P-3 的量測治具（同幀三連拍、參數掃描、URL 鉤驗證、v0.34 對照） | 驗收 1、2 |
| `tests/tools/_edge-sweep-params.json`（新增） | 鑑別力探針用的門檻組（見 §5） | 驗收 1 的反面 |
| `docs/experiments/2026-09-06-postfx-evidence/` | 全部治具輸出與對照截圖 | 證據 |

**沒有動到的**：`index.html`（含 `VERSION`，由主對話合併時 bump）、`bloomOK=false` 的直接 render 路徑（`js/renderer.js:219`，diff 顯示只在其上方多插一行 `bloom.setEdge(...)`，兩行 `renderer.render(scene, camera)` 本身逐字未動）、任何引擎／CFG／燒毀規則。零亂數新增（`grep -c "Math.random" index.html` = 0；`js/` 的 20 筆全在 `particles.js` 既有債與註解裡，本次一筆未加）。

---

## 2. 設計決策與理由

### 2.1 depth texture 型別與 WebGL1 退路

`js/bloom.js:167-178`：

```
const ok = renderer.capabilities.isWebGL2 || !!gl.getExtension('WEBGL_depth_texture');
if (!ok) return null;                       // ← edge 整條關掉，bloom 照舊，不報錯
new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
```

- **型別 `UnsignedIntType`**（不是 `UnsignedShortType`）。three r158 在 WebGL2 下把它對到 `DEPTH_COMPONENT24`；WebGL1 的 `WEBGL_depth_texture` 擴充規格同樣允許 `DEPTH_COMPONENT` 搭 `UNSIGNED_INT`（也是 24 bit），所以兩條路用同一個型別、精度一致。
  不用 16 bit 的算式理由：本場景 `near 0.1 / far 100`（`js/scene-env.js:38`），24 bit 在 z≈5 的線性深度量化步階約 1.5e-5 世界單位，16 bit 是 3.8e-3（約 4mm）——妖身上要偵測的摺線本來就是公分等級，16 bit 會把二階殘差判準整個淹掉。
- **退路**：`depthTex === null` 時 `edgeReady=false`、`uEdge` 恆為 0、`tDepth` 綁 three 的預設貼圖，畫面就是純 v0.34 的 bloom。`bloomOK=false`（軟體 GL）時 `bloom.render` 根本不會被呼叫，`sceneRT` 的 FBO 也不會建，DepthTexture 完全不上傳，零成本。
- **未實測的部分（明說）**：WebGL1 那條退路**沒有在真機驗過**——本機 ANGLE/D3D11 是 WebGL2，我沒有辦法在這台上逼出 WebGL1 context。程式碼上是「拿不到擴充就 return null」，最壞情況是 edge 關掉而不是報錯，但「WebGL1 ＋ 擴充存在」這一支是**推論不是量測**。

### 2.2 線性化與雙門檻公式

線性化（`js/bloom.js:102-106`），標準的透視反算：

```
z_ndc  = texture2D(tDepth, uv).x * 2.0 - 1.0
z_view = 2·near·far / (far + near − z_ndc·(far − near))
```

`near`／`far` 每幀從 `camera` 讀（`js/bloom.js:258`），`uHalfTan` 從 `camera.projectionMatrix.elements` 取 `1/pm[0]`、`1/pm[5]`——這樣 resize 換 aspect、導演換機位都不必另外通知 bloom。

**深度側（`js/bloom.js:119-126`）用反深度 1/z，不是 z**：透視投影下 1/z 在螢幕空間對**平面**是線性的。所以

```
grad = |Sobel3x3(1/z)| / 8 · z          // 一階，相對量
curv = (|w01+w21−2w11| + |w10+w12−2w11|) · z   // 二階，任何平面（不管多斜）恆為 0
dEdge = smoothstep(0.020, 0.040, min(grad · sobelW, curv))
```

- 為什麼不直接拿 Sobel 一階梯度當門檻：遠處桌面幾乎跟視線平行，一格就跳好幾公分，一階梯度天生就大，直接當門檻會把整片桌面判成邊——這正是規格要求「避免遠處桌面噴雜訊」的那件事。二階殘差在平面上恆 0，只有輪廓（深度跳）與摺線（斜率換）才有值。
- 一階 Sobel 仍然算、跟二階取 `min` 當去噪：深度量化雜訊會讓二階差偶爾冒尖，但它的一階梯度是 0，`min` 之後被壓掉。這是深度側自己的「雙判準」。

**法線側（`js/bloom.js:127-135`）**：把同一組 9 個深度樣本用 `vpos()` 反投影回視空間，在四個象限角各算一顆法線（`nA..nD`，全部用同向的 `cross(+x, +y)`），再對兩條對角做 Roberts：

```
nDiff = max(1 − dot(nA,nD), 1 − dot(nB,nC))
nEdge = smoothstep(0.62, 0.82, nDiff)
```

不必額外取樣（法線純靠既有的 9 個 tap 算出來）。平面上四顆法線一樣 → 0。

**合併**：`edge = max(dEdge, nEdge)`，再乘上深度上限閘 `z11 <= 12.0`。
`12.0` 的算法：桌面半徑 3.4（`scene-env.js:16`）＋對決機位 dist 4.2（`camera-director.js:23`）→ 最遠桌緣約 7.6；夜空沒有幾何、深度 = far = 100。12 把桌子整個含進來、夜空整個排除。**驗證見 §5 探針 ②**：把 `maxDepth` 壓到 0.001 時線像素佔比掉到 0，證明這道閘門真的在管事。

### 2.3 顏色

`EDGE.color = 0x100b1a`（近黑帶一點藍紫）【試玩必調】。純黑在這個夜色場景裡看起來像破圖，帶一點紫才像墨線。
疊在 `toSRGB(aces(col))` **之後**（`js/bloom.js:136`），所以這個 hex 就是螢幕上的值，不會被 bloom 曝光或 ACES 曲線拉走。uniform 刻意用 `Vector3` 不用 `THREE.Color`——r158 的 `Color` 會把 hex 當 sRGB 轉進線性工作空間，那會讓寫下來的 hex 跟畫面上的顏色對不起來。

### 2.4 解析度與線寬：全解析度，取樣位移＝1 CSS 像素

- **全解析度**：這一卷要的是**內部細節線**（sword 小臉五官、hairpin 髮／裙分界）。半解析度的深度圖必須先降採樣，而深度的降採樣沒有「正確」做法（min／平均都會把細特徵吃掉或造出假邊），細節線正好是最先消失的東西。
- **手機效能怎麼守住**：改成不另開 pass——邊緣偵測折進**既有的**合成那一趟。合成本來就是全解析度的全畫面 fill，加上去的只有 9 個深度 tap ＋約 40 個 ALU，而不是「多一趟全畫面 fill ＋多一張 RT 的頻寬與記憶體」。實測 `renderPassesPerFrame` 新舊都是 10、`drawCallsPerFrame` 相同（§4），fps 反而略高於基準。
- **線寬**：取樣位移 `uOff = round(EDGE.widthPx · dpr)` 個裝置像素（`js/bloom.js:225-226`），`widthPx` 預設 1.0 → 線寬固定約 1 CSS 像素，dpr 1 的桌機與 dpr 2 的手機看起來一樣粗。這跟 `IMPLEMENTATION_GUIDE.md` §11.16 第 5 條「尺寸一律用 CSS 像素換算」是同一條規矩。

### 2.5 program 數：一支 shader，不是兩支

edge 開／關是 `COMPOSITE` 裡的一顆 uniform（`if (uEdge > 0.5)`），不是兩支 material、也不是 `#define` 變體。所以：
- 暖身那一幀（`js/renderer.js:216-217`，標題頁）照樣把這支唯一的 COMPOSITE 編掉，進對決不會卡編譯；
- 開關切換 **0 次重編**，`renderer.info.programs.length` 不動（§4 有數字）。

---

## 3. 驗收條件逐條（指令原文＋實際輸出）

> 所有治具都帶 `--use-gl=angle --use-angle=d3d11`（`duel-perf.mjs:28`／`duel-drive.mjs:191`／`traitfx-drive.mjs:139`／`edge-shot.mjs`），GPU 實測名稱 `ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)`。
> 埠號 8873／8874。worktree 沒有 `tools/anyCreature/`（`.gitignore`），已對主工作樹建 junction。

### 驗收 1 — 8v8 邊緣線像素佔比 ∈ [0.5%, 6%]　✅ 4.237%

```
node tests/tools/edge-shot.mjs docs/experiments/2026-09-06-postfx-evidence/edge-measure.json \
     --port=8873 --baseline=db8f301 --shots=docs/experiments/2026-09-06-postfx-evidence/edge
```

```
"px": "1688x780", "total": 1316640, "figsVisible": 16,
"gl": "ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)",
"edgeReady": true, "edgeOn": true, "edgeOnAtDuel": true, "urlEdgeOn": true,
"edgePctD8": 4.237, "edgePctD16": 3.999, "edgeNumD8": 55785,
"basePctD0": 0, "baseNumD0": 0, "baseOnPctD0": 4.383, "baseErr": null,
"programs": [21, 21, 22], "errors": 0
```

- **分子 55,785／分母 1,316,640**（1688×780 裝置像素＝844×390 CSS × dpr 2），閾值＝逐像素三通道最大差 > 8/255。改用 >16 的嚴閾值是 3.999%，同樣在窗內。
- 名冊＝`duel-perf.mjs` 的「最重 8 隻」8v8（`fushou/ashcharm/wangchuan/boartusk/shanshen/balen/yinyangcoin/boat`），16 尊全部就位（`figsVisible: 16`）。
- **量法為什麼是同一幀**：`?edge=1` 與 `?edge=0` 兩次頁面載入的動畫相位不一樣（idle bob、燈籠閃爍、粒子），逐像素差會被相位噪音淹掉。治具改成在**同一個 JS task** 裡連續 `setEdge(false)→render→readPixels` 與 `setEdge(true)→render→readPixels`（rAF 插不進同一個 task），兩張圖的 scene graph 逐位元組相同，差異只可能來自 shader。這是**比原文更嚴**的量法（容差實質為 0），不是放寬。
- **穩定度**（同指令重跑，§6.2 要求連跑）：4.237% / 4.210% / 4.786% / 4.463% / 4.277% / 4.239%（六次，含掃描版與 URL 版），全部在 [0.5%, 6%] 內、離兩端都有餘裕。
- 對照截圖：`docs/experiments/2026-09-06-postfx-evidence/edge-on.png` / `edge-off.png`（同一幀）。

### 驗收 2 — `?edge=0` 與 v0.34 逐像素差異 < 0.1%　✅ 0.000%（0 / 1,316,640）

同一次執行的 `basePctD0 = 0`、`baseNumD0 = 0`。

量法：治具在**同一幀**用 `git show db8f301:js/bloom.js` 撈出來的 v0.34 模組再 render 一次（`edge-shot.mjs` 的 `--baseline`，量完自動刪暫存檔），跟新模組 `edge` 關掉的那張比。**0 個像素有任何差異**（連 d0＝差 > 0 的都是 0）。

這條與 URL 鉤的連結：
```
node tests/tools/edge-shot.mjs ...edge-url-off.json --port=8873 --q=%26edge=0
→ "href": ".../index.html?paperwar=1&fxcount=1&edge=0", "urlEdgeOn": false, "edgeOnAtDuel": false
node tests/tools/edge-shot.mjs ...edge-url-on.json  --port=8873
→ "href": ".../index.html?paperwar=1&fxcount=1",        "urlEdgeOn": true,  "edgeOnAtDuel": true
```
`edgeOnAtDuel` 是在治具動手改任何東西**之前**讀的 `bloom.edgeOn`，也就是「渲染迴圈自己算出來、真的餵進 uniform 的那個旗標」。`?edge=0` 時它在對決中恆為 false → 合成走的就是 `uEdge=0` 那條 → 而那條已證明與 v0.34 逐位元組相同。

> **與原文的差異（明說）**：原條文寫「同種子同幀截圖」。跨兩次頁面載入拿不到「同幀」（動畫相位不同、`duel-perf` 的 lineup 也只是等固定毫秒後截圖），所以改用同一頁同一幀直接跟 v0.34 的模組比。這使容差從 0.1% 收成 0，屬加嚴。

### 驗收 3 — `traitfx-drive` 帶與不帶 `--nobloom` 全綠　✅ 27/27 × 2

```
node tests/tools/traitfx-drive.mjs docs/experiments/2026-09-06-postfx-evidence/traitfx-nobloom.json --nobloom --port=8874
→ 27/27 pass · 重複簽章 0

node tests/tools/traitfx-drive.mjs docs/experiments/2026-09-06-postfx-evidence/traitfx-bloom.json --port=8874
→ 27/27 pass · 重複簽章 0
```
兩次每一列都是 `handled=true alive=true restored=true onTime=true clean=true focus=true err=0 prog+0`；
落檔的 `traitfx-*.json` 是 `{summary:{total:27,pass:27,dupSignatures:0,softGl:false}, results:[27 × verdict/sig/stats/errors]}`
（每案 140 幀的逐幀 Δ 陣列為了不把 repo 撐大而裁掉，其餘欄位原樣；重跑指令見附錄）。
不帶 `--nobloom` 那次，預覽頁的 `bloom.setEdge(true)` 生效（`traitfx-preview.html:88`），27 套招式全程都在跑新的 COMPOSITE，`err=0` 就是「新 shader 在真實 GPU 上不冒 console error」的證據。

### 驗收 4 — `duel-drive` 4 場 0 error／0 pageerror／0 requestfailed；`--no3d` 亦 0　✅

```
node tests/tools/duel-drive.mjs "http://127.0.0.1:8874/index.html?paperwar=1&fxcount=1" \
     docs/experiments/2026-09-06-postfx-evidence/duel-drive-4.json --duels=4 --port=8874
→ {"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":7,"burnFig":5,"burnDom":2,
   "trait":4,"traitFig":4,"load":{"ms":36,"total":7,"loaded":7,"timedOut":false},
   "duelsMs":[[5771,1,1,""],[7793,1,1,""],[5925,1,1,""],[6108,1,1,""]]}
```
`errors: []`（空陣列，三類合計 0）。

```
node tests/tools/duel-drive.mjs "..." ...duel-drive-no3d.json --duels=4 --port=8874 --no3d
→ {"duels":4,"errors":2,"ys3d":false,...}
   ['requestfailed: http://127.0.0.1:8874/js/renderer.js?v=0.34 net::ERR_FAILED',
    'console: Failed to load resource: net::ERR_FAILED']
```
**這 2 筆是 `--no3d` 自己 `page.route(...).abort()` 掉的那個請求**，不是程式的錯。同指令對主工作樹 v0.34 跑（`--root="C:\Users\shung\OneDrive\桌面\妖市"`）得到**逐字相同的兩筆**（`duel-drive-no3d-v034.json`）→ 沒有退步。0 pageerror、0 其他 console error。

### 驗收 5 — 8v8 fps ≥ v0.34 基準 85%；`programs.length` 對決前後不變　✅ 102.3%

```
for i in 1 2 3; do node tests/tools/duel-perf.mjs perf ...perf-new-$i.json   --port=8873; done
for i in 1 2 3; do node tests/tools/duel-perf.mjs perf ...perf-v034-$i.json  --port=8873 \
     --root="C:\Users\shung\OneDrive\桌面\妖市"; done
```

| | rendersPerSec | rafMedianFps | drawCallsPerFrame | renderPasses | visible |
|---|---|---|---|---|---|
| 本版 ×3 | 274.5 / 259.6 / 274.6（中位 **274.5**） | 59.9 / 59.9 / 59.9 | 558 / 578 / 584 | 10 / 10 / 10 | 15 / 16 / 16 |
| v0.34 ×3 | 270.4 / 264.6 / 268.4（中位 **268.4**） | 59.9 / 59.9 / 59.9 | 544 / 578 / 548 | 10 / 10 / 10 | 15 / 16 / 15 |

- **274.5 / 268.4 = 102.3% ≥ 85%**（`rendersPerSec` 是不受 vsync 限制的 render 迴圈速率；`rafMedianFps` 兩邊都貼著 59.9 的 vsync 天花板，`≥50` 的舊閘門也過）。
- `renderPassesPerFrame` 新舊都是 10、`visible` 相同的那一對（本版 run 2 與 v0.34 run 2）`drawCallsPerFrame` 同為 578——edge 沒有新增任何 pass 或 draw call（它就在既有的合成那一趟裡）。剩下的 ±20 差異跟 `visible` 15/16（有沒有尊被燒掉）與取樣瞬間的粒子數同向，不是 edge 造成的。
- **program 數**：`edge-shot` 在同一幀量到 `programs: [21, 21, 22]`——第一個是動手前、第二個是 **edge 開關切過之後**（21→21，開關 0 重編）；第 22 支是治具自己為了對照而載入 v0.34 模組所編的那支合成 shader，不屬於遊戲。
  `duel-drive` 4 場的 `programsAtDuel`：本版 `[16, 21, 21, 22]`、v0.34 `[16, 21, 22, 22]`；兩邊第一場後多出來的那一支都是 `ghost_*`（haunt 下半身材質，第一次出現 haunt 體型時才編）——是既有行為，不是本次新增。

### 驗收 6 — `git diff --stat` 逐檔對應

```
$ git diff --stat db8f301
 js/bloom.js                      | 158 ++++++++++++++++++++++++++++++++++++++-
 js/renderer.js                   |  14 +++-
 tests/tools/traitfx-preview.html |   2 +
 3 files changed, 169 insertions(+), 5 deletions(-)
```
（另有新增檔：`tests/tools/edge-shot.mjs`、`tests/tools/_edge-sweep-params.json`、`docs/experiments/2026-09-06-postfx-B-report.md`、`docs/experiments/2026-09-06-postfx-evidence/*`）

| 檔案 | 這一檔為什麼要改 |
|---|---|
| `js/bloom.js` | P-3 本體：`sceneRT` 掛 DepthTexture、合成 shader 加深度＋法線雙門檻邊緣偵測、`setEdge`／`setEdgeParams` 開關與熱調 |
| `js/renderer.js` | `?edge=0` 關閉鉤、「只在對決場走」的每幀閘門、`window.__yaoshi3d.edgeOn` 治具出口 |
| `tests/tools/traitfx-preview.html` | 讓 C3 招式治具（驗收 3）真的跑到新的 COMPOSITE，否則「不帶 `--nobloom` 也全綠」驗不到新 shader |
| `tests/tools/edge-shot.mjs`（新） | 驗收 1、2 的量測治具：同幀三連拍、門檻掃描、URL 鉤驗證、v0.34 對照 |
| `tests/tools/_edge-sweep-params.json`（新） | §5 鑑別力探針的門檻組（`--sweep` 的輸入） |
| `docs/experiments/2026-09-06-postfx-evidence/*` | 上面每一條的原始輸出與對照截圖 |
| `docs/experiments/2026-09-06-postfx-B-report.md` | 本報告 |

**沒有改**：`index.html`（`VERSION` 由主對話合併時 bump）、任何引擎／CFG／燒毀規則。因為 `index.html` 逐位元組未動，`trace()` seeds 1..20 的等價性**由建構上成立**（`trace()` 定義在 `index.html`，不 import `js/` 任何東西；3D 層也不讀寫 `S`）——本報告沒有另外跑那支比對腳本，這一點明說。

---

## 4. 不退步（P-5／P-6 相關）

| 條目 | 結果 |
|---|---|
| P-5 fps ≥50 且 ≥ v0.34 的 85% | 59.9（vsync 上限）／102.3%　✅ |
| P-5 programs 第一場後恆定 | 與 v0.34 同型（多出來的是既有的 `ghost_*`）　✅ |
| P-6 `traitfx-drive` 27/27（T-1~T-8） | 兩種模式各 27/27　✅ |
| P-6 `duel-drive` 4 場 0 error／`--no3d` | 4 場 `errors: []`；`--no3d` 的 2 筆與 v0.34 逐字相同　✅ |
| P-6 `grep -c "Math.random" index.html` = 0 | 0（`index.html` 未動）　✅ |
| P-6 `trace()` seeds 1..20 逐位元組相等 | `index.html` 未動 → 建構上成立；**未另跑腳本**（明說） |
| P-6 R-1~R-4／C-1~C-4（lineup 站位、字幕、燈組） | **本卷未跑**——那是 P-1／P-2 那位 agent 的量測面，且本次改動不碰站位、字幕、燈組、`duel-figures`／`camera-director`／`trait-fx` 任何一行（見 §3 驗收 6 的 diff） |

---

## 5. 這些綠燈有沒有鑑別力（§6.1）

```
node tests/tools/edge-shot.mjs ...edge-discriminate.json --port=8873 \
     --baseline=db8f301 --sweep=tests/tools/_edge-sweep-params.json
```

| 探針 | 結果 | 證明了什麼 |
|---|---|---|
| ① 門檻設成不可能達到（`depthLo 99`／`normLo 9`） | 線像素佔比 **0%** | 這支量測**會變紅**：邊緣線沒畫出來時它就掉到 0.5% 底線之下，不是恆綠訊號 |
| ② `maxDepth` 壓到 0.001（等於整個畫面都超出上限） | **0%** | 深度上限那道閘門真的在管事（「線只畫在妖與桌上物件上」不是空話） |
| ③ 正常門檻 | **4.277%** | 健康狀態下同一支探針會變綠 |
| ④ `edge` **開著**時跟 v0.34 比 | **4.383% 有差** | 驗收 2 那個「0 個像素有差」不是因為探針壞掉——同一支 diff 在該有差的時候量得到差 |
| ⑤ 實際踩到的紅燈 | 治具第一版量到 `basePctD0 = 36.46%` | 原因是 `await import(baseline)` 讓出去跑了一輪 rAF、場景動了。改成把模組在同步區塊**之前**先載好之後歸零。這是一次真實的「訊號會紅」觀測，不是事後推理 |

**還沒被任何證據涵蓋的**（明說，不假裝）：
- WebGL1 ＋ `WEBGL_depth_texture` 那條路（§2.1）；
- `bloomOK=false`（軟體 GL）路徑只用 diff 證明「那兩行沒動」，沒有在 SwiftShader 上實跑一次確認 DepthTexture 的建立不會有副作用（依 `IMPLEMENTATION_GUIDE.md:755` 的規矩，3D 治具一律走 ANGLE，這條在本機沒有量測位置）；
- 線寬「1 CSS 像素」是**由取樣位移換算**的（`uOff = round(1.0 × dpr)` 裝置像素），沒有像 P-1 那樣用兩個機位截圖去量實際像素寬；
- `?edge=0` 與 v0.34 的比較是同幀模組對照，不是兩次頁面載入的截圖對照（§3 驗收 2 已標明）。

---

## 6. 【試玩必調】清單

`js/bloom.js:39` 的 `EDGE`：

| 參數 | 現值 | 說明 |
|---|---|---|
| `color` | `0x100b1a` | 線色，近黑帶藍紫。太黑像破圖、太亮像描邊貼紙 |
| `depthLo` / `depthHi` | 0.020 / 0.040 | 深度判準的 smoothstep 兩端。調低＝更多輪廓線 |
| `normLo` / `normHi` | 0.62 / 0.82 | 法線判準（1−dot；0.62≈68°）。**低於 0.5 會把低模的每一片面接縫都描出來**（實測 0.30 → 5.98%、0.50 → 4.77%、0.62 → 4.22%、0.75 → 3.49%） |
| `maxDepth` | 12.0 | 線只畫在這個距離內。動桌面半徑或對決機位 dist 要一起重看 |
| `sobelW` | 1.0 | 一階梯度的去噪權重 |
| `widthPx` | 1.0 | 線寬（CSS 像素） |

現場調法：`window.__yaoshi3d.bloom.setEdgeParams({ normLo: 0.5, normHi: 0.7 })`（不帶參數＝讀回現值）。
批次掃：`node tests/tools/edge-shot.mjs out.json --sweep=<JSON 陣列檔> --sweepshots=<png 前綴>`，同一幀套每一組並各存一張圖。

---

## 7. 風險（5 條以內）

1. **WebGL1 退路未實測**：`WEBGL_depth_texture` 那一支只有程式碼保證（拿不到就 `edgeReady=false`、不報錯），沒有在真的 WebGL1 context 上跑過。
2. **門檻是在「最重 8 隻 8v8、844×390 dpr2」這一個構圖下調的**：換成別的名冊、直式 390×844、或運鏡（P-4）把鏡頭拉遠拉近，線像素佔比會跟著動。上界 6% 目前只有約 1.8 個百分點的餘裕，P-4 的 orbit 進場若讓更多妖同時入鏡，值得重量一次。
3. **低模接縫**：法線門檻壓到 0.62（≈68°）才不會把每一片面描出來，代價是**很淺的摺線畫不出來**。P-7 的四個簽字項（sword 小臉、redhat 橫胸短臂、tiger_c 鑲邊、hairpin 髮／裙分界）能不能靠這條線解掉，要等 P-1 外殼合併後一起出 stage-lit 截圖給讀者判，本卷沒有代答。
4. **`ghost_*` 材質 `depthWrite:false`**（`creature-figures.js:200-201`，haunt 體型下半身）：它們不寫深度，所以**畫不出邊緣線**。這是既有設計（半透明鬼身），但描邊在 haunt 下半身會斷掉，視覺上可能與 P-1 的外殼描邊不一致。
5. **與 P-1 反轉外殼的疊加未驗**：兩者並用時同一條外輪廓會被畫兩次（外殼 2.0px CSS ＋ 這裡 1.0px CSS），可能過粗或顏色打架。合併後應重量一次線像素佔比與 fps。

---

## 附：治具重現指令

```bash
# 前置：worktree 沒有 tools/anyCreature（.gitignore），先建 junction
powershell -c "New-Item -ItemType Junction -Path '<worktree>\tools\anyCreature' -Target 'C:\Users\shung\OneDrive\桌面\妖市\tools\anyCreature'"

# P-3 主量測（線像素佔比 ＋ 與 v0.34 的關閉鉤對照 ＋ 對照截圖）
node tests/tools/edge-shot.mjs docs/experiments/2026-09-06-postfx-evidence/edge-measure.json \
     --port=8873 --baseline=db8f301 --shots=docs/experiments/2026-09-06-postfx-evidence/edge

# 鑑別力探針
node tests/tools/edge-shot.mjs out.json --port=8873 --baseline=db8f301 \
     --sweep=tests/tools/_edge-sweep-params.json

# URL 關閉鉤
node tests/tools/edge-shot.mjs out.json --port=8873 --q=%26edge=0   # Git Bash 下 & 要寫 %26

# 不退步
node tests/tools/traitfx-drive.mjs out.json --nobloom --port=8874
node tests/tools/traitfx-drive.mjs out.json --port=8874
node tests/tools/duel-drive.mjs "http://127.0.0.1:8874/index.html?paperwar=1&fxcount=1" out.json --duels=4 --port=8874
node tests/tools/duel-drive.mjs "http://127.0.0.1:8874/index.html?paperwar=1&fxcount=1" out.json --duels=4 --port=8874 --no3d
node tests/tools/duel-perf.mjs perf out.json --port=8873
node tests/tools/duel-perf.mjs perf out.json --port=8873 --root="C:\Users\shung\OneDrive\桌面\妖市"   # v0.34 基準，只讀
```
