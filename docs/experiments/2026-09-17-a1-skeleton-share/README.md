# v0.57.14 骨架共用：同一尊網格共用一副 Skeleton，骨骼貼圖上傳 51→5 次/幀

狀態：產品提交見交接（v0.57.14）；公開送達見末段。凍結驗收：[acceptance.md](acceptance.md)（含執行紀錄與 #4 的歸因說明）。這是 A1 效能診斷的第二個單一修補，**32 枚與 128 枚正式 gate 首次都通過（中位數與逐輪口徑皆過）**；A1 最終驗收仍待真機與原未過項，本卷不宣告 A1 完成。

## 怎麼找到的

前一卷（[取景鏈去重](../2026-09-17-a1-framing-dedupe/README.md)）修補後，`table3d=lite` 與預設比值幾乎相同，門檻卡在托盤 3D 場景的共同底成本。新工具 `tests/tools/gl-frame-probe.mjs` 在真實頁面改寫 `WebGL2RenderingContext.prototype` 逐幀計數（[gl-probe-slot1.json](../2026-09-17-a1-framing-dedupe/gl-probe-slot1.json)，v0.57.13）：

| 每幀 | v0.57.13 | 本卷 v0.57.14 |
|---|---:|---:|
| `texSubImage2D`（16×16 RGBA float 骨骼貼圖） | 50 ＋ 1 張 4×4 | 4 ＋ 1 |
| `texParameteri`／`pixelStorei` | 204／204 | 20／20 |
| `bindTexture` | 67 | 10 |
| 可見 SkinnedMesh／distinct Skeleton | 64／51 | 64／5 |
| `renderer.info.memory.textures` | 56 | 10 |
| drawElements／drawArrays／instanced | 68／17／9 | 68／17／9（不變） |

骨架掃描：51 副 Skeleton 只有 5 組不同的骨頭集合（26／31／27／33 根各一尊＋1 根暖身），同一尊 13 顆網格用同一組 Bone 物件、相同 boneInverses，卻各持一副骨架——`SkeletonUtils.clone` 逐 mesh 重建骨架（`js/creature-figures.js:831` 註解早已記載）。每幀 51 次 `skeleton.update()` 各算 26–33 根骨的矩陣並各上傳一張貼圖。

## 修補內容

`js/skeleton-share.js`（無 three 依賴）`shareSkeletons(root)`：同一 root 內 bone 陣列逐項同物件、boneInverses 逐項 `equals` 的 SkinnedMesh 改 `bind` 到第一副 Skeleton，多出來的骨架 `dispose()`（此時尚未渲染、boneTexture 為 null）。只在單一實例內比對，不跨實例；骨頭集合不同者各自保留。`js/creature-figures.js` 在 `cloneSkinned(gltf.scene)` 之後呼叫一次。描邊外殼仍 `bind(o.skeleton, o.bindMatrix)`，自然跟到共用骨架。不改模型、動畫、材質、規則、亂數、時長、門檻。

## 證據（依驗收條目）

| # | 條件 | 結果 |
|---|---|---|
| 1 | 單元 RED→GREEN（`tests/skeleton-share.test.mjs`，真實 yinyangcoin GLB 經 tools 的 `SkeletonUtils.clone`） | 修補前 `13 !== 1`（行為斷言先紅，負例綠）；修補後 2/2：骨架 13→1、動畫 0.37 s 取樣頂點 `getVertexPosition` 逐位元組相等、0.91 s 姿勢確實不同（活性）；兩個獨立實例不共用、互不拉扯 |
| 2 | 全套測試 | 89/89、0 skip（87＋2），[tests-all.txt](tests-all.txt)，最終程式（含 0.57.14 版本字串） |
| 3 | 真實頁面探針 | slot1／32 枚：上傳 51→5、骨架 51→5、textures 56→10，errors=[]（[gl-probe-slot1-post.json](gl-probe-slot1-post.json)）；128 枚同樣 5 副骨架、5 次上傳（[gl-probe-slot1-128.json](gl-probe-slot1-128.json)） |
| 4 | 1599 取景矩陣 | 四塊 399＋399＋402＋399＝1599/1599，failures=[]、pageErrors=[]（`framing-slot*.json`）。逐案比對見下段「#4 歸因」 |
| 5 | trace-eq seeds 1–20 | 對 main 的 index.html 相等（346441 bytes），[trace-eq-0.57.14.json](trace-eq-0.57.14.json) |
| 6 | 正式五輪 | 見下表 |
| 7 | dispose 不漏 | 同批拍品清空再擺回 5 輪：textures 固定 10、geometries 固定 79、readyCount 4（`gl-probe-slot1-post.json` 的 `disposeRounds`），原 C-1 每輪 +50 的路徑未復發 |
| 8 | 發布與送達 | 見末段 |

### #4 歸因（1599 全過；逐案「差異分佈不超過同版重跑」這一句無法在跨版本比較上成立）

- 同版重跑（本版 slot0 兩次、v0.57.13 slot0 兩次）：0 案 >1 px，最大差 1（push 幀數 ±1）。
- 跨版本（v0.57.13 vs 本版）slot0：35 案 >1 px、最大 175 px，全部在桌機視口，且都是 launch（部分加 terminal）整框上下平移、寬高不變；兩次本版重跑得到同一組 35 案。v0.57.13 修補前 vs 修補後（取景鏈已證明逐位元組相同）全矩陣同樣有 43 案 >1 px（thunder slot2 等）。
- 把受影響案例**單獨跑**（`--match=` 單案，[iso-*.json](.)）：eye slot0 winner0 桌機 launch.top 兩版 157.02 vs 157.00；hairpin 174.88 vs 174.88；thunder slot2 winner2 terminal.left 344.84 vs 344.83——而矩陣連跑時同一案例分別是 124.7→204.8、298→123、差 226。單獨跑的值與任一連跑值都不同。
- Node 端（Three 0.180）對 eye／hairpin／bow／shield／yinyangcoin 各 61 個動畫時間，共用前後 `fitSubject`／`projectSubject` 輸出逐位元組相同（臨時腳本，結果記於本段）。
- 結論：桌機視口 launch／terminal 的絕對數值依賴矩陣跑序留下的狀態（相機 overlay／release 與 ±1 幀相位），任何版本差異（含只改取景鏈或版本字串等級的改動）都會讓它換一組案例跳動，跨版本逐案相等在此工具上**無論實作對錯都不可能成立**；同版重跑穩定、單案隔離相等與 Node 逐位元組相等三者共同證明修補沒有改變幾何。依 `02 §2.1` 例外自行修正並在此回報：#4 以「1599 全過＋同版重跑 0 案 >1 px＋受影響案例單獨跑相等＋Node 逐位元組相等」判綠，不採跨版本逐案分佈。此工具的跑序依賴列為後續待修（工具問題，不在本卷）。

### 正式五輪（同工具、844×390 DPR2、seed 1、初夜、三變體交錯、GPU 獨占）

| 報告 | 最壞 hover renders/s 中位 | 空場中位 | 比值 | paired ≥.40 | calls／tris／pass | 結果 |
|---|---:|---:|---:|---:|---|---|
| perf32-share.json | 499.7（477.7–527.7） | 1170.3 | **.4270** | **5/5**（.4185–.4457） | 94／30281／1 | **GREEN**（中位數與逐輪口徑皆過） |
| perf128-share.json | 543.6（495.1–585.5） | 1166.5 | **.4660** | **5/5**（.4165–.5469） | 79／30061／1 | **GREEN**，`gate128.pass=true` |
| v0.57.13 perf32-dedupe | 380.4 | 1117.9 | .3403 | 0/5 | 同 | RED |
| v0.57.13 perf128-dedupe | 437.3 | 1085.0 | .4030 | 3/5 | 同 | 中位過、逐輪未過 |
| 07124ed perf32／128 | 401.0／370.6 | 1115.0／1101.2 | .3596／.3365 | 0/5／0/5 | 同 | RED |

判讀：空場分母與前幾輪相近（1085–1170），hover 分子由 380–401 升到 500–544，變化落在修補命中的路徑上（骨架 update 與貼圖上傳從 51 降到 5），且 lite／default 無 hover 比值同步上升（.34→.55、.37→.53）。這是本機桌機 Chromium 的相對速度比；不能換算 Safari fps，真機仍待玩家回報。09-14 凍結文字的「每一次配對比值 ≥.40」與目前工具的中位數口徑這次同時滿足，規格文字差異仍留待裁定，本卷不改寫。

## 工具

- `node tests/tools/gl-frame-probe.mjs --out=<json> [--slot=1] [--frames=120] [--coins=32|128] [--disposeRounds=5] [--port=8896]`：真實頁面逐幀 gl 呼叫計數、貼圖上傳分類、材質共用掃描、骨架掃描、dispose 回歸。
- 矩陣分塊與比對同前卷；跨版本逐案分佈**不再**作為純呈現改動的等價證據（見 #4 歸因）。

## 公開送達

見 [published-delivery.json](published-delivery.json)。
