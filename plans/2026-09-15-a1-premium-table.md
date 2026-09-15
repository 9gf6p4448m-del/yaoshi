# A1 開卷：精品牌桌與揭盅

日期：2026-09-15｜主責：Astra｜基準：`eafec13039117a4ce8262430a073e0af994c4b96`（v0.57.10）

狀態：**已開始執行；共同取景、頁籤連動、A 向介面與揭盅生命週期已實作，正在整合驗證。** 最新逐項證據見 [執行紀錄](../docs/experiments/2026-09-15-a1-opening/EXECUTION.md)，尚未宣告發布或真機最終驗收。

入口：[總藍圖](../docs/MASTER_BLUEPRINT.md)｜[驗收凍結](../docs/experiments/2026-09-15-acceptance-a1-premium-table.md)｜[證據／進度](../docs/experiments/2026-09-15-a1-opening/README.md)

## 1. 授權、需求對齊與本卷責任

使用者先要求新舊合併，再明確指定「按照A方向開卷」。這已解決 A/B/C 品味選擇與第一卷優先序，不再重問。A 的具體意義：廟埕暗桌、紅布拍品、暖主光與冷暗外圍、紙紮語言；完整卡閱讀、印籌歸屬、揭盅因果可靠。

R7 對齊結果：

| 問題 | 已有答案／執行邊界 |
|---|---|
| 先做哪卷 | 精品牌桌與揭盅，總藍圖C01/C02/C05、V01/V02/V04–V10、A01/A02 |
| 方向是否需要再選 | 不需要，使用者已選A |
| 是否改玩法 | 本卷只改呈現；D2/D3/D5保持未裁，不動rng、出價、傷害、排名或私有資訊 |
| 先做哪些素材 | 用現有三系法寶、詛咒與席位信物驗構圖；三系／頭像重製不在本卷 |
| 手機基準 | 延續 iPhone14Pro Safari主畫面回饋；同時覆蓋桌機與原直式轉向，不寫死單一機型 |
| 陰影／貼圖／模型尺度 | 按既有ART_BIBLE與原凍結值；A方向不自动授權新管線或縮小模型逃避遮擋 |
| 發布 | 完成必要驗證後沿用直接發布授權；真機回報與機械驗收分階段記錄 |

沒有待問且會阻擋 S1 的新產品決策。若實作發現只有降低字級、改印籌已凍結尺寸或更改規則才能達標，先提出具體反例，不自行移門檻。

## 2. 本卷的可見成果

1. 看貨／盯上／出價：拍品有清楚舞台，資訊帶與側卡不穿過當前主體；完整文字與每槽操作仍可到達。
2. A方向：墨色／漆木介面、舊紙文字、硃紅與金色主動作，與紅布、木桌協調；陣營顏色與數字辨識保持。
3. 揭盅：逐槽推鏡→結算金光→法寶歸屬→結果卡；被強調的當前法寶不碰頂、不藏在HUD後。
4. 卡片切換、印籌、128枚籌碼、快速連點、跳過、重入、reduced與跨裝置仍符合既有契約。

不把調色當成完成全部構圖，也不把修飛行當成美術完成。這兩條分別交證據。

## 3. 現況路徑與可編輯範圍

| 檔案 | 責任與界線 |
|---|---|
| `index.html` | DOM/CSS、階段呈現、資訊帶／結果卡；規則與資料表不改。揭盅入口startReveal約5491，slot→result→card約5532–5563 |
| `assets/safe-area.css` | env安全區、低矮橫屏完整卡、轉向；維持44px名稱按鈕與原字級 |
| `js/camera-director.js` | onRevealSlot約299、onRevealCard約308；只處理視覺機位與回復 |
| `js/table-tray.js` | 拍品投影、選中與得標飛行；不讀寫賽局，不另算winner |
| `js/table-props.js` | 印籌／籌碼視覺接線；原平放尺寸、同槽排列、128上限不動 |
| `js/renderer.js` | 連接視覺幾何／鏡頭所需輸入，不能重送ys:reveal覆蓋逐槽鏡頭 |
| `js/scene-env.js` | A向桌面／燈光呈現；先追溯規範漂移，不順手恢復舊光照參數 |
| `tests/*`、`tests/tools/*` | 對應斷言與既有治具擴充；不更改既有通過門檻／偷偷縮樣本 |
| `docs/*`、本計畫 | 規範來源、證據、使用者裁定與交接 |

禁止本卷新增：CHAINS、多人服務、profile／妖幣、GLB重製、全局shadowMap、全新後製pass、戰鬥規則或時間表。版本字串只在有可發布程式批次時同步更新。

## 4. 視覺基準與構圖策略

### 同一張桌，三種注意力分配

| 畫面 | 前景／中景／背景與資訊配置 |
|---|---|
| 盯上／出價 | 底部自己的命與主動作；兩側完整卡；中間托盤與印籌；風位／月相／心願整合進避開模型的資訊區，內容不刪除 |
| 揭盅推鏡與飛行 | 當前槽位的法寶、錢柱、盯印是主體；非當前內容減少視覺權重但保留必要操作；結果卡尚未出現 |
| 結果卡 | 回到桌面構圖；卡片完整、置中、保持到下一件；讀到贏家、公開的出價與歸屬 |

構圖以實際DOM矩形、env安全區、托盤/法寶投影共同決定；避免為844px或某手機型號寫死一個頂部距離。跨尺寸要保四槽點擊命中與已凍結的印籌安全邊界。

先試移開非主資訊與調整機位／視覺飛行路徑。不能把卡片剪掉、模型隱藏、縮小字級或提早結束飛行當解法。切回看貨後所有樣式与鏡頭狀態都要清除。

美術起點是墨黑漆木、紙色正文、硃紅選中、少量金色主動作；實際色值屬實作調校，不等同驗收門檻。保留ART_BIBLE三系色，不將非選中法寶全體灰化到無法辨認。

## 5. 可獨立交付的步驟

### S0 開卷基線與文檔（本輪）

背景：正式版程式無本輪改動，工作樹已含前輪交接與未追蹤資料，不能一併清掉或提交。

- 總藍圖逐項承接旧七章與Astra新增項，標明已裁A／未裁D2等。
- 保存本機1280×720畫面與原844×390／852×393已看過的基線來源。
- 檢查reveal-table與ui-hierarchy既有測試，保存結果。
- 核對現有工具：scene-shot、market-card-readability、mark-layout-capture、iphone-layout-check、reveal-reentry-probe、trace-eq；除錯介面__yaoshi／__yaoshi3d、FPS工具已存在，不另造同功能工具。

退出：計畫／凍結／基線路徑存在、Astra獨立文件反駁檢視完成。撤回方式：只移除本輪文檔變更，不碰既有工作樹。

### S1 資訊與3D共同構圖

背景：先讀index.html的feltHead／wish／rails／revealCard與safe-area；現在資訊帶能蓋到拍品，手機字卡已有不能退化的768案例。

- 先用固定seed與全部模型投影建立當前失敗證據，擴充既有治具以支援輸出目錄／固定本卷基準，保留原斷言。
- 實作前盤點靜態斷言：`reveal-table.test.mjs`鎖dist1.65/tilt22、look/anchor與結果卡尺寸；`ui-hierarchy.test.mjs`鎖心願所在容器。區分已裁產品條件與實作快照，追溯來源。優先保留原斷言的構圖方案；若必須改已凍結值，提出具體反例依原程序裁定，不以選A當作改測試授權，也不能保留假字串騙過regex。
- 以現有模型建立A方向可執行同景稿，先整合階段資訊與受保護區，再調外觀。
- 改DOM/CSS與所需只讀幾何接線；採一套可清理的階段樣式，不複製遊戲狀態機。
- 驗A1-G1/G2/G3，保存桌機與手機尺寸前後圖。讀完整卡、同槽四印、4槽分布都要看。

責任：Astra主裁；有界CSS/治具可交Sol。檔案：index/safe-area及必要renderer；一批提交。退出：構圖與操作閘門通過，沒有缺失文字／未回復class。撤回：回退本批呈現提交，賽局資料不遷移。

### S2 廟埕暗桌美術整合

背景：S1已有固定構圖；先讀ART_BIBLE、scene-env、renderer色管，不把已有ACES/bloom重列成果。

- 在同一構圖做漆木／紙色／硃紅／金色的UI与桌面統一；既有模型與陣營色維持。
- 精修紅布、木桌與前後景明暗，留住當前拍品與印籌；只用已許可的材質路線。
- A向同景前後圖由Astra逐項看，文字與印字也要看，不只純3D截圖。
- 跑G1–G3與G6受影響部分；任何新增幾何或光照成本要記錄，不在這卷開陰影。

責任：Astra；檔案：index/safe-area/scene-env，必要renderer。不與S1同檔平行寫。退出：G7符合A且可讀，性能與操作未被美術掩蓋。撤回：回退本批美術，不抹去S1構圖成果。

### S3 揭盅完整路徑

背景：onRevealSlot現機位dist1.65/tilt22，固定錨點；原速公開證據有飛行碰頂；結果卡先後順序已由測試守住。

- 對四槽與可得標法寶建立全路徑投影／事件取樣；先重現碰頂，不能只拍出發與落地。
- 分辨既有三條生命週期：普通得標0.86秒、詛咒轉移0.72秒、焚毀0.62秒。G4的0.86秒觀察窗涵蓋全部路徑，但幾何可見與完成後移除是兩種不同狀態；隱藏前終點必須被驗證，不可以null通過。時長不因新治具而拉長或縮短。
- 讓鏡頭與飛行可用區讀同一個幾何語意，保持引擎與公開資訊不變；不改印籌大小逃避問題。
- 測原速slot→result→card；結果卡生成後才回桌面，不在result階段重送廣域reveal。
- 覆蓋正常、reduced、跳過、離開／下一夜与重入；改相位相關接線必跑reentry突變。

責任：Astra定架構與驗收，Sol可做固定規格修補。檔案：camera-director/table-tray/renderer/index和對應測試。退出：G4/G5通過；四槽原速可看完整因果，卡片不提早出現。撤回：獨立回退S3，保留S1/S2。

### S4 整合、覆審與試玩發布

背景：S1–S3各自成立後才跑完整受影響矩陣；維持既有失敗項，不把本卷機械通過寫成全遊戲美術完成。

- 全測、trace seeds1..20及差異canary、版面／印籌／揭盅原速／reentry／性能，保存命令退出碼與環境。
- 專門程式與JS覆審，Astra最終視覺驗收；修補後只重跑受影響項與必要整合。
- 達本卷可發布條件後同步VERSION／RELEASE_VERSION、提交本卷檔案、依持續授權推正式；核對HTML與變更資產以及瀏覽器實載版本。
- 真機回報另列：完整卡切換、盯印歸屬、轉向、背景恢復、原速揭盅、fps。可發布供測不等於真機最終驗收。

責任：Astra；退出：程式送達證據＋本卷已通過／待真機／原有失敗清單分開。撤回：回退相應發布提交並更新版本探針，不能只改首頁版本字。

順序：S0→S1→S2→S3→S4。S2的唯讀參照與S3的反例蒐證可並行，但共用index/renderer/camera的實作順序執行。

## 6. 驗證命令與工具陷阱

基準HTML由eafec13取出到本卷scratchpad；保存基準來源與SHA，不用會跟HEAD漂移的舊fixture當固定oracle。

```powershell
node --test tests/reveal-table.test.mjs tests/ui-hierarchy.test.mjs
node --test tests/*.test.mjs
node tests/tools/trace-eq.mjs scratchpad/a1-baseline/index.html index.html
node tests/tools/trace-eq.mjs index.html --mutate
node tests/tools/mark-layout-capture.mjs --safe --out=docs/experiments/2026-09-15-a1-opening/mark
node tests/tools/reveal-reentry-probe.mjs --json=docs/experiments/2026-09-15-a1-opening/reentry.json
node tests/tools/reveal-reentry-probe.mjs --mutate
git diff --check
```

- `trace-eq --mutate` 實際契約是 **differs=true、exit0**，表示成功檢出差異；原文 exit1 誤記已按原始碼和實跑更正，沒有修改工具或差異判準。
- 卡片與 iPhone 工具已支援 repo 相對 `--out`，原 assertion 保留。卡片 `--baseline` 必須提供 `--baseline-ref=SHA`，只代表 DOM/CSS 比較；完整歷史基準在 `scratchpad/a1-baseline/source/`。
- `scene-shot` 已支援一般截圖 `--seed=37`，並讀回 gameSeed；市場截圖須帶 `--gate`。種子固定內容，燈光仍隨牆鐘閃爍，不宣稱逐像素一致。
- `public-reveal-capture.mjs 3` 已支援 `--url=http://127.0.0.1:PORT/` 與 `--out=docs/...`，預設仍走正式 URL 與原速。
- 性能只單獨跑，不能與其他瀏覽器壓測並行。capped59.9、後製合成1 call不是足够效能證明。參見凍結G6。

## 7. Git／回退與開卷交付

開場main=eafec13；已有dirty交接、AGENTS.md、.codex-worktrees及props圖片，全部保留。Git remote是既有yaoshi GitHub；gh目前未登入，文件與本機工作可正常進行。沒有因未登入而要求使用者重新授權發布，也沒有冒稱已push。

S0 文件與基線之後，使用者已明確要求開始執行並允許依 HUD 空間自動退鏡；實作與驗證進度以執行紀錄為準。只有通過必要檢查後才同步正式版本。
