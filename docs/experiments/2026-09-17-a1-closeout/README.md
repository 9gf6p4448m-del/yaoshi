# A1 精品牌桌與揭盅：結案卷（2026-09-17）

狀態：**A1 完成（未解項如下列）**，2026-09-17 結案。依凍結檔 [A1 驗收 v1.1](../2026-09-15-acceptance-a1-premium-table.md) G0–G8 逐條列**最新**證據，附玩家真機回報與未解清單；不重置原 P4／M-A1 門檻、不重跑沒改到的檢查。使用者 2026-09-17 裁定「開 A1 結案卷……宣告 A1 完成並列未解項」（[交接信九題裁定](../../handoffs/2026-09-15-a1-premium-table.md)）。

版本範圍：開卷基準 `eafec13`（v0.57.10）→ 結案候選 v0.57.17（main `3aac488`＋本卷提交）。A1 期間的產品提交：0.57.11 共同取景／退鏡／頁籤同步／漆木介面、0.57.12 六種詛咒造型與戰力退役、0.57.13–0.57.17 效能診斷五卷（取景去重、骨架共用、牌桌與對決單趟繪製、外殼合併）。

## G0–G8 證據對照（依凍結檔 bullet 編號）

類型：桌機＝本機 Chromium 機械證據；真機＝玩家裝置；目視＝人／模型看圖；文件＝條文或裁定。

| 條目 | 凍結要求（摘） | 最新證據 | 結果 |
|---|---|---|---|
| G0-1 | 基準／候選 SHA、diff 只在計畫範圍、不動引擎／rng／時長 | 每卷 README 首段與 acceptance 建立時基準；trace-eq 逐卷相等（最新 [outline-merge](../2026-09-17-a1-outline-merge/trace-eq-0.57.17.txt)） | 過（桌機） |
| G1-1 | 全套測試、trace seeds 1–20 相等、`--mutate` 檢出差異 | 96/96（[tests-all](../2026-09-17-a1-outline-merge/tests-all.txt)）；trace-eq equal；`--mutate` 於 0.57.17 重跑 differs=true（[trace-mutate.txt](trace-mutate.txt)） | 過（桌機） |
| G1-2 | card tab 不觸發盯／出價 | [a1-opening EXECUTION:28](../2026-09-15-a1-opening/EXECUTION.md)（四真實頁籤點擊，賽局狀態不變） | 過（桌機，0.57.11 後 tab 邏輯未動） |
| G1-3 | reveal-reentry M1 紅／M2 綠 | [EXECUTION:25](../2026-09-15-a1-opening/EXECUTION.md) | 過（桌機） |
| G2-1 | 768 卡 9 項＋手機 25 項不縮 | [curse-migration:32](../2026-09-15-curse-migration/README.md) 768 案 9/9；[iphone-standalone:10](../2026-09-15-iphone-standalone/README.md) 25/25（**桌機模擬手機尺寸，非真機**） | 過（桌機） |
| G2-2／G2-3 | 字級不縮、不被 overflow 裁；env() 通用非硬編 59px | [iphone-standalone:7–8](../2026-09-15-iphone-standalone/README.md) | 過（桌機） |
| G2-4 | 舊已知失敗照記錄 | 本卷未解清單（P4） | 依條文列出 |
| G3-1～G3-3 | 256 分配不相疊、印籌尺寸與 128 枚上限、盯字／座位／歸屬不只靠色 | [table-stamps:22–26](../2026-09-15-table-stamps.md)（含開圖檢視四人同槽、2+2、3+1） | 過（桌機＋目視，主責非 Astra 具名） |
| G4-1 | 身分關鍵區不被文字帶蓋 | [EXECUTION:28](../2026-09-15-a1-opening/EXECUTION.md) Astra 開 focus／slot0／slot3 圖（0.57.10–11） | 過（目視，舊版；本卷補 0.57.17 同景圖見下） |
| G4-2／G4-3 | 完整模型投影全程不被 HUD 遮、讀真實幾何非 null | 1599 矩陣（0.57.14 [交接:110](../../handoffs/2026-09-15-a1-premium-table.md)）；0.57.17 slot1 塊 399/399（[outline-merge](../2026-09-17-a1-outline-merge/framing-slot1.json)）；本卷 0.57.17 全矩陣重跑見下 | 過（桌機） |
| G4-4 | 不縮模型／印籌換通過 | 各卷 acceptance「不改幾何、顏色、門檻」條文＋trace 相等 | 過（文件） |
| G4-5／G4-L1／G4-L2 | 全種類×4 槽樣本、原時長、終點先量再隱藏、無殘留 | 矩陣每案記 push／flight 取樣、`terminal.beforeHide`、`hiddenAfterObservation`、`durationKept`（0.86／0.72／0.62 s）；disposeRounds 5 輪 geometries／textures 不變 | 過（桌機） |
| G5-1～G5-3 | 時序不改、結果卡置中保留、normal／reduced／skip 清理 | [EXECUTION:47,111](../2026-09-15-a1-opening/EXECUTION.md)（seed3 四槽 slot→result→card、CFG.T 650、三模式 pass） | 過（桌機，0.57.11；時序碼此後未動） |
| G5-4 | 原速事件記錄區分命中、停留、移除 | 矩陣逐案三段：`summary.push/flight`（停留取樣數）、`terminal.beforeHide`（命中終點幾何）、`hiddenAfterObservation`（移除）；seed3 公開 capture 為自然序列 | 過（桌機，以矩陣生命週期欄位對應） |
| G6-1～G6-5 | 沿用 table3d 門檻；calls／tris／pass／比值；128 走原規程；不開 shadowMap；dispose 不增 | 0.57.17：perf32 .585、perf128 .6069（paired 5/5）、calls 77／tris 29477／pass 1；disposeRounds 不增（[outline-merge #6](../2026-09-17-a1-outline-merge/README.md)）。128 枚口徑依裁定改逐輪（[09-13 凍結檔 §2.1 修訂](../2026-09-13-acceptance-table3d-b.md)） | 過（桌機）；原 P7／真機 fps 門檻不在此宣告 |
| G7-1～G7-4 | 同景前後圖＋Astra 目視 | Astra 目視只到 0.57.11（[EXECUTION:33–34,112](../2026-09-15-a1-opening/EXECUTION.md)），早於詛咒造型與五卷效能修補；本卷補 0.57.17 同景圖（table／reveal／portrait）＋fresh-context 目視紀錄（見下），**不冒稱 Astra 覆審** | 部分（目視）——列未解 |
| G7-5 | 不做 M-A1／P4 宣告 | 九題裁定：M-A1 三尊已簽字、P4 記 10/18 | 依條文另列 |
| G8-1～G8-3 | 文件齊、本機候選有證據、發布核對 | 計畫／基線／凍結／交接齊；逐卷 published-delivery.json | 過（文件＋桌機） |
| G8-4 | 最終驗收：真機項實測、未解項列出 | 玩家回報 0.57.16 真機通過（口頭）；未解清單見下 | 見「真機」與「未解清單」 |

## 本卷補做（0.57.17）

- **`--mutate` 判準重跑**：differs=true、exit 0（[trace-mutate.txt](trace-mutate.txt)）。
- **全 1599 取景矩陣重跑**（`table-framing-check.mjs --all`，0.57.17）：1599/1599、failures=[]、pageErrors=[]（[framing-all-0.57.17.json](framing-all-0.57.17.json)）。工具加了每案前固定 240 步沉澱與 `--reverse`（見下一條），不改任何判定門檻。
- **矩陣工具跑序依賴**：診斷結果在 [framing-tool-settle](../2026-09-17-a1-framing-tool-settle/README.md)——桌機 launch 值同序重跑也漂（6/81 案差 108–171 px），不是跑序問題；沉澱沒消掉；通過判定不受影響。列未解 #5。
- **同景截圖（0.57.17）**：`scene-shot --gate` 五張（title／select／table／table3d／mid，[shots-0.57.17-*.png](.)）＋公開站 seed 5 原速揭盅四槽 push／gold／card 12 張（`public-reveal-capture.mjs`，CFG.T 650、errors 0，[public-0.57.17/](public-0.57.17/)；seed 3 已不再出現「3 人出價」案例，seed 5 取代；seed 4 為治具等待逾時非遊戲錯誤）。
- **fresh-context 目視紀錄**（兩位 context-free 讀者模型，只看圖）：
  - 牌桌五張：四題皆「部分」——純 3D 鏡頭主次清楚、桌面三張紅布／暗木／金邊一致；但 table／mid 的 UI 密度讓中央人偶份量偏弱，select 底色與「詛咒」標籤、「雙人熱座」鈕的靛紫被讀成外來色；小物件在平台外緣地面、歸屬感弱。總評「美術氛圍近精品，但 UI 密度與紫色破壞主次」。
  - 揭盅六張：Q1 主體完整不被 HUD 遮、push→gold 主次清楚＝是；Q2 結果卡置中完整、色系一致、無紫框＝是；Q3 木籌／銅錢貼桌有影＝是（樣本未拍到得標者席位特寫）；Q4 得標指向光看靜圖看不出、靠卡片文字＝否（飛行是動態，靜圖本來不含）。總評「主體聚焦與色調統一已達精品感，得標指向仍靠文字」。
  - 這是 G7「同景前後圖＋目視」的**替代**：Astra 目視未做，不冒稱覆審。讀者指出的靛紫外來色、UI 密度、得標指向三點記入未解 #3，供 A2／A3 取材。

## 真機

玩家 2026-09-17 回報 **0.57.16 真機通過**（口頭，無量測明細）。計畫檔 S4 列的真機項：完整卡切換、盯印歸屬、轉向、背景恢復、原速揭盅、fps。本卷以玩家回報為準記「通過」，逐項明細未取得——若使用者要逐項確認，結案後補。0.57.17 只改描邊外殼繪製方式（像素相同），沿用同一回報。

## 未解清單（依凍結檔要求具體列出，不重置門檻）

1. **P4 盲讀**：10/18，8 支對象題未過（獻祭刀、拼板舟、福壽綿長、送王船、破軍旗、祖靈之眼、香灰符、虎爺印效果）。根因：增益對象語意（罩兩尊／只亮施招者）、送王船金箔帆下降被讀成減益箭頭。**回修併入 A2**。
2. **M-A1 傳說三尊**：三輪未過，2026-09-17 已簽字（殘日收現況；大士爺舌／龕＝引擎限制、護心鏡回修排 A2；有應公＝haunt 體型限制）。
3. **G7 目視**：Astra 目視停在 0.57.11，本卷以兩位 fresh-context 讀者代替（結果「部分」）；具體未解：select／詛咒標籤／雙人熱座鈕的靛紫與紅金主調不同系、盯上／出價畫面 UI 密度壓過中央主體、得標歸屬靜圖看不出（飛行動態才有）。Astra 覆審未做。
4. **原 P7／真機 fps 門檻**：桌機相對 gate 四卷 GREEN，Safari fps 未量；玩家口頭通過。
5. **矩陣工具桌機 launch 值不穩定**：同序重跑 6/81 案差 108–171 px，沉澱修補無效，兩個未排除假設（待機動作相位來自真實時間；第一個取樣落在哪個 rAF）記在 [framing-tool-settle](../2026-09-17-a1-framing-tool-settle/README.md)。通過判定不受影響；跨版本逐案分佈仍不得當等價證據。

## 結案宣告

**A1 精品牌桌與揭盅完成**（2026-09-17，v0.57.17）：G0–G6、G8 的本機可測部分逐條有最新證據；G7 以 fresh-context 目視替代並列未解；玩家回報 0.57.16 真機通過（口頭）；原 P4／M-A1 不重置，依 2026-09-17 簽字與處置列入未解清單。桌機相對效能 gate 自 0.57.14 起連四卷 GREEN（perf32 .4270／.6585／.6058／.585，paired 5/5），效能診斷到此收工。未解五條上列，其中 P4 8 支、大士爺護心鏡、紫色外來色與得標指向進 A2／A3 取材；矩陣工具不穩定與 Astra 覆審留待。藍圖 §5 A1 狀態同步改寫。
