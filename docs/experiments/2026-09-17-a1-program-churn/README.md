# v0.57.15 兩趟繪製修補：桌面 decal 與招式特效模板改單趟，每幀 getParameters 10→0、draw call 94→89

狀態：產品提交見交接（v0.57.15）；公開送達見末段。凍結驗收：[acceptance.md](acceptance.md)（含執行紀錄）。這是 A1 效能診斷的第三個單一修補，接前卷交接「每幀仍有 `getParameters` ≈150 µs、`setProgram` 重走 getProgram 的原因未查明」。32 枚與 128 枚正式 gate 再次通過（比值 .6585／.6943，配對 5/5）；A1 最終驗收仍待真機與原未過項，本卷不宣告 A1 完成。

## 怎麼找到的

`tests/tools/gl-frame-probe.mjs` 新增 program churn 掃描：Three 0.158 的 `WebGLPrograms.getParameters` 每次都會呼叫 `material.customProgramCacheKey()`，在頁面裡包住 `Material.prototype` 那一支就能逐材質**精確**計數「這一幀 setProgram 重走了 getProgram」，並在呼叫當下快照 `renderer.properties.get(material)`（此時仍是上一次 getProgram 寫入的值），連續兩次快照之間變動的欄位＝`setProgram` 判 `needsProgramChange` 的條件。第二段再對這些材質攔截 `version` 寫入抓呼叫堆疊。

結果（[gl-probe-churn-slot1-pre.json](gl-probe-churn-slot1-pre.json)，hover slot1、32 枚、120 幀）：

| 每幀 | v0.57.14（修補前） | 本卷 v0.57.15 |
|---|---:|---:|
| `getParameters` 呼叫 | 10（5 顆材質 × 2） | **0** |
| draw call（drawElements／instanced／drawArrays／instanced） | 94（68／4／17／5） | **89**（66／2／17／4） |
| `useProgram` | 27 | 21 |
| `renderer.info.programs.length` | 35 | 30 |
| `texSubImage2D`（骨骼貼圖） | 4＋1 | 4＋1（不變） |
| distinct Skeleton／textures | 5／10 | 5／10（不變） |

5 顆材質全是 `MeshBasicMaterial`，每顆每幀 2 次、`material.version` 每次 +1、program 在兩支之間交替（快照只有 `side`、`program`、`__version` 在變）；`version` 寫入的堆疊全部落在 `three.module.js:29725` 與 `:29729`——`renderObject()` 對 `transparent === true && side === DoubleSide && forceSinglePass === false` 的材質**分 BackSide／FrontSide 兩趟**畫，每趟先 `needsUpdate = true`。五顆是：`prop-contact-shadows`（`js/table-props.js:403` 接觸陰影 decal 池）、`tray-cinnabar-runes`（`js/table-tray.js:407` 硃砂符）、`tray-moon-benefit`（`js/table-tray.js:412` 月印環）、以及 `js/trait-fx.js:187／198` 的 MAT_GLOW／MAT_SOLID 模板（各有一個常駐桌底的暖身 PlaneGeometry）。桌面平貼 decal 只有正面朝相機，兩趟裡 BackSide 那趟畫不出東西，卻照付 getParameters／cache key／program 切換與一次 draw。

## 修補內容

五顆材質的建構參數各加 `forceSinglePass: true`（Three 官方旗標，`Material.copy` 會帶到 clone，trait-fx 的 27 套 clone 自然跟到）。DoubleSide 保留：只是不再拆成兩趟，剔除仍是關的，模型繞法寫反也不會消失。不改幾何、顏色、混合、動畫、規則、亂數、演出時長或任何門檻。版本 0.57.15。

## 證據（依驗收條目）

| # | 條件 | 結果 |
|---|---|---|
| 1 | 單元 RED→GREEN（`tests/single-pass-decals.test.mjs`，經 `tests/tools/three-node-resolver.mjs` 把 `three` 對到 tools 副本後**真的建構** tray／props／trait-fx，掃場景斷言旗標） | 修補前兩條都紅在行為斷言 `false !== true`（`tray-cinnabar-runes 必須 forceSinglePass=true`；`Mesh#27（blending=2）必須 forceSinglePass=true`，trait-fx 那條是暫時還原旗標驗的）；修補後 2/2 |
| 2 | 全套測試 | 91/91、0 skip（89＋2），[tests-all.txt](tests-all.txt)，最終程式（含 0.57.15 版本字串） |
| 3 | 真實頁面探針 | getParameters 10→0、materialsCalled 5→0、draw 94→89、texSubImage2D 維持 5、textures 10→10、errors=[]（[gl-probe-churn-slot1-post.json](gl-probe-churn-slot1-post.json)） |
| 4 | 同幀像素 A/B（slot0–3） | 翻轉旗標：4 槽皆 **0 相異像素**；同旗標重渲染 0（決定性）；BackSide 負對照 27487–28192 像素（2.09–2.14%）、最大 Δ154（比對看得見剔除）；1688×780、非零像素 1316640。修補前 [pre](gl-probe-churn-slot1-pre.json) 與修補後 [post](gl-probe-churn-slot1-post.json) 的翻轉比較互為鏡像，結果相同 |
| 5 | 取景矩陣 slot1 一塊＋trace-eq | 399/399，failures=[]、pageErrors=[]（[framing-slot1.json](framing-slot1.json)）；trace-eq seeds 1–20 對 main 的 index.html 相等（[trace-eq-0.57.15.json](trace-eq-0.57.15.json)） |
| 6 | 正式五輪 | 見下表 |
| 7 | 分母交代 | 見下段 |
| 8 | 發布與送達 | 見末段 |

### 正式五輪（同工具、844×390 DPR2、seed 1、初夜、三變體交錯、本機無其他 Playwright／Chromium）

| 報告 | hover renders/s（五輪） | 空場 renders/s（五輪） | 比值 | paired ≥.40 | calls／tris／pass | 結果 |
|---|---|---|---:|---:|---|---|
| [perf32-singlepass.json](perf32-singlepass.json) | 536.9–666.2 | 844.2–969.4 | **.6585** | **5/5**（.5538–.7459） | 89／29477／1 | **GREEN** |
| [perf128-singlepass.json](perf128-singlepass.json) | 555.9–682.7 | 761.2–983.8 | **.6943** | **5/5**（.6316–.7303） | 75／29577／1 | **GREEN**，`gate128.pass=true`、dropped 0 |
| v0.57.14 perf32／128（前卷） | 477.7–527.7／495.1–585.5 | 中位 1170.3／1166.5 | .4270／.4660 | 5/5／5/5 | 94／30281／1、79／30061／1 | GREEN |

判讀：calls 與 tris 的下降（94→89、30281→29477；128 枚 79→75）剛好對應五顆 decal 少畫一趟，是修補命中的路徑。**比值的上升要打折看**：這輪空場分母（844–984）比前卷（1166–1170）低約 20%，量測時本機有 Edge 與 WebView2 共 19 個行程，落在工具註明的跨 run ±30% 帶內；hover 分子（537–683）也高於前卷（478–586）。工具只認同一支瀏覽器交錯配對的相對比值，本卷照原口徑記錄，不把絕對 renders/s 的差當成本修補的效果量。這是桌機 Chromium 的相對速度比，不等於 Safari fps，真機仍待玩家回報。

### #7 分母交代（`grep -rn DoubleSide js/` 共 14 處）

| 位置 | transparent | 本輪 | 理由 |
|---|---|---|---|
| `table-props.js:403` 接觸陰影 | 是 | **已修** | 真實頁面量到 |
| `table-tray.js:407` 硃砂符、`:412` 月印 | 是 | **已修** | 同上 |
| `trait-fx.js:187` MAT_GLOW、`:198` MAT_SOLID | 是 | **已修** | 同上（暖身物件常駐桌面；對決 27 套 clone 同受惠） |
| `creature-figures.js:893` 腳下水面（碟／緣光／漣漪） | 是 | 未修 | 對決專用、不在 A1 牌桌路徑；單趟前需在對決畫面做同幀像素 A/B（下一卷候選） |
| `duel-figures.js:176` flatMat（邊光 :244／:245、地影 :285 帶 transparent）、`:516` 餘暉碟、`:480` 裂芒（淡入時 `:225` 暫時 transparent） | 是／暫時 | 未修 | 同上，對決專用 |
| `scene-env.js:295` table-decor、`table-props.js:625` 十件信物、`table-tray.js:175` 布面、`:299` 詛咒造型 | 否（MeshStandard，不透明） | 不適用 | 不透明材質不走兩趟；探針在牌桌只量到上述 5 顆，與此一致 |
| `scene-env.js:318–319`、`table-props.js:622`、`trait-fx.js:1533` | 註解 | 不適用 | `scene-env.js:318` 早已為遠景剪影記載兩趟成本並改 FrontSide |

## 工具

- `node tests/tools/gl-frame-probe.mjs --out=<json> [--slot=1] [--frames=120] [--coins=32|128] [--disposeRounds=5] [--pixelAB=1] [--port=8896]`：既有計數之外新增 `programChurn`（逐材質 getParameters 次數、變動欄位、version 寫入堆疊）與 `pixelAB`（同幀翻轉 forceSinglePass 的像素比對，附同旗標重渲染與 BackSide 兩個對照）。
- `tests/tools/three-node-resolver.mjs`：Node 測試用 resolve hook，讓遊戲模組的裸 `three` 在 Node 直接建構（只做旗標／結構斷言，不拿 0.180 的渲染結果當 0.158 證據）。

## 公開送達

[published-delivery.json](published-delivery.json)：2026-09-17 06:13 UTC（台灣 14:13）核對，main `1748edb` 已推送；公開 `index.html`（RELEASE_VERSION 0.57.15）、`js/table-props.js?v=0.57.15`、`js/table-tray.js?v=0.57.15`、`js/trait-fx.js?v=0.57.15` 均 HTTP 200，正規化換行後與本機逐位元組一致；GitHub Pages 部署 6496763204 對應 `1748edb`（2026-09-17T06:12:50Z）。公開站短驗證，未冒稱真機整局。[開啟試玩](https://9gf6p4448m-del.github.io/yaoshi/?v=0.57.15)。
