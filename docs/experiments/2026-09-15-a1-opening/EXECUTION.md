# A1 執行紀錄（持續更新）

基準：eafec13039117a4ce8262430a073e0af994c4b96 / v0.57.10。
目前：執行中，尚未宣告全卷通過或發布。

## 已完成的程式批次

- 固定 seed 的正常 UI 截圖（scene-shot），正向 seed37 讀回 gameSeed37；其他卡片／裝置／揭盅工具沿用明示的合成 fixture。
- 證據 out 目錄防逸出、空 seed 驗錯；卡片 baseline-ref 明確標記 DOM/CSS-only。完整歷史基線另由 eafec13 archive 保存至 scratchpad/a1-baseline/source。
- 逐槽相機依真正可見模型與 HUD 矩形自動退鏡／移動投影。使用者已批准修訂，見驗收 v1.1。每幀還原原始相機後才重算，不累積位移。取樣含骨骼當前姿態及原始幾何的保守包絡。
- 取景在模型 update 後、同幀 hidden 前完成；原飛行路徑和時長不變。
- A 向介面候選：漆木中性色與紙色文字、硃紅選中 tab；陣營色、字級不變。

## 已有驗證／紅綠紀錄

- 全部 tests/*.test.mjs：骨骼同步修正後 53/53 通過、0 跳過；若後續版本或程式改動需再驗受影響範圍。
- 最新單元／原揭盅／UI／印籌組：骨骼同步前 19/19 通過；framing 新增 attached-skin 真實姿勢測試後 5/5。
- tools options + perf128 + framing 組：當時 14/14 通過。
- 原印籌 256 assignments：3/3 測試通過，全部分配保留。
- cards-candidate-final：768 samples、9/9 checks、errors=[]；最高卡為第 12 夜「飼鬼甕」，高 104.75px、bottom 275.875 ≤ railBottom 306，無溢出。
- iphone-candidate 首跑：24/25；擴大桌機 DOM 到 1280 違反舊 960px 比較，未放寬測試，撤回該 CSS。
- iphone-candidate-r2：25/25、6 captures、errors=[]，桌機保持 x160/width960。
- table-framing-check 已知手機 normal fixture：原先 push/flight 170 個位置違規；接線及骨骼包絡修正後 0 違規，含 hidden 前 terminal 真實幾何，0.86 秒生命週期保持。這仍只是單一案例，不代表全部種類通過。
- trace-eq：歷史 archive 對候選 seeds 1–20 相等（357285/357285 bytes，exit 0）；`index.html --mutate` 為 357285/341041 bytes、differs=true，實際 exit 0 代表 mutation 已被偵測，不是漏抓。
- reveal-reentry normal：8/8 checks、errors=[]、pageerrors=[]、exit 0；control 與 bug 最終生命均為 [49,30,43,45]，拍賣只結算一次，hotseat 亦只結算一次。mutate 外層 exit 0：M1 命中 A7（並連帶 A2/A8）紅、M2 全綠，表示 mutation 已被偵測；外層治具不保留 `--json` 子行程暫存檔。
- market-focus-green：safe 852×393、seed 1、slot 2 焦點通過；256 assignments 全檢，0 failures，包絡 x=276.662–575.338、bottom=299.999，仍在原 x=227–625／bottom≤310 門檻內。
- market-focus-tabs-green（d86d9fc）：四個 rail tab 的 DOM 點擊都使 `tray.hover()` 等於各自 `data-slot`，四案 `JSON.stringify(S)` 前後相等；整體 pass=true、errors=[]。
- `market-focus-visual.json` 與同 stem 五張 PNG：四個實際頁籤均切到對應卡片與 3D 外框，賽局狀態不變、四模型仍 visible；focus／256 種印籌分配全過。Astra 已開啟 focus／slot0／slot3 圖檢視，safe59 手機版保留完整卡與所屬木籌槽。
- 骨骼當幀反例：`table-framing-balen-ab563b7.json` 桌機曾碰資訊欄 0.317px。Three 的 attached skin 矩陣在 `updateMatrixWorld` override 更新，原 helper 只呼叫 `updateWorldMatrix` 導致取景與渲染不同步。0601f31 修正後 `table-framing-balen-skinfix.json` 三尺寸全過，未修改斷言或再增加 padding。
- 跳過原速／reduced：共同取景與最後 .3 秒釋放通過；reduced run 47 個 flight frames、0 unframed、viewOffsetRestored=true、errors=0。轉直式清除橫式投影、回橫式重新 fit 的 RED／GREEN 亦已保存。
- `cam-unit` 原 gate 因 module 層漏 import `msOf` 在啟動前 exit1，已保留 RED，僅補 import（f559aa1）。以原 5f76adc camera-director 還原基準後實跑 `cam-unit-reduced-gate.json`：ALL_PASS=true、errors=0、A6/A9 reduced no-op 通過。
- `natural-seed3-final/capture.json`：當前 core、CFG.T=650 前後不變、正常按鍵不跳過，四槽均按 slot→result→card；errors=[]。Astra 已開啟 slot2 push／gold 與 slot3 push 檢視，當前主體在 HUD 開口內；此時版本字仍 0.57.10，不冒稱公開 v0.57.11 證據。
- `seed37-baseline-market-table.png`（完整 eafec13 archive）對 `seed37-final-market-table.png`：1280×720、同 seed37、--gate，Astra 實際開圖比較；席位與操作列已由紫轉漆木／紙色，原卡片陣營色與版面保留。

## 尚待獨佔執行的正式性能命令

以下兩支需在其他 Playwright／GPU browser 全停後依序執行。工具會自行用同一支 uncapped Chromium 交錯 `?tray3d=0`／預設／`?table3d=lite` 各五輪；`--w=844 --h=390` 配合 dpr=2，seed 1，第 1 夜出價頁。JSON 由 stdout 保存；每支執行後另記 `$LASTEXITCODE`。

```powershell
node tests/tools/scene-shot.mjs docs/experiments/2026-09-15-a1-opening/perf32-final --gate --perf --runs=5 --seed=1 --coins=32 --w=844 --h=390 --port=8895 > docs/experiments/2026-09-15-a1-opening/perf32-final.json

node tests/tools/scene-shot.mjs docs/experiments/2026-09-15-a1-opening/perf128-final --gate --perf --runs=5 --seed=1 --coins=128 --gate128 --w=844 --h=390 --port=8895 > docs/experiments/2026-09-15-a1-opening/perf128-final.json
```

### 原 32 枚 T3 口徑

- 場景用產品 `props.bid`：四席各自在同號槽放 8 枚，共 32 枚；另有四枚令牌與四席信物。四槽逐一 hover，單輪取 triangles 最大的一槽。
- `out.default.onHover.callsPerFrame` ≤ 135、`trianglesPerFrame` ≤ 33000、`passesPerFrame` = 1；這三欄是五輪各值的中位數。
- `out.ratio.defaultOnHover` ≥ 0.40。工具的精確算法是「預設最壞 hover 五輪 renders/s 中位數 ÷ `tray3d=0` 無 hover 五輪中位數」，四捨五入到四位小數；逐輪 paired array 另完整回報供診斷。
- `table3d=lite` 的 calls 應明顯低於預設並記錄同表；三變體 console／page／request errors 均須為 0。
- perf 取樣在 `info.autoReset=false; info.reset()` 後等兩次 rAF，工具已把 calls／triangles／passes 的兩幀和除以 2。不可再除一次，也不可引用非 perf 後製的 1 call 或 capped 約 59.9 renders/s。
- `--perf` 會直接進 `perfMain()`，因此命令中的 `--gate` 不會自動判 135／33000／1；沒有 `--gate128` 時 exit 只反映 errors。原 32 枚 T3 必須依上述欄位人工判定，不能用 exit 0 單獨宣告通過。

### 128 枚壓力 gate 口徑

- `--coins=128` 以產品 `props.bid(seat, slot, 8)` 填滿四席×四槽×每格八枚；不是直接改 InstancedMesh count。各變體量測前先 compile／render 真實 scene，再量穩態。
- `gate128.pass` 要求：coins 模式確為 128；預設與 lite 共十個 pressure samples 全部 `chips=128` 且 `dropped=0`；預設五輪每一輪的最壞 hover 都是 calls≤140、triangles≤42000、passes=1；三變體 errors 總數為 0。
- 目前可執行 gate 的速度條件是 `out.ratio.defaultOnHover >= 0.40`，即上述五輪中位數比值；`tests/perf128.test.mjs` 也明確排除以 `defaultOnHoverPaired.every(...)` 擋單一排程離群值。
- 09-14 凍結檔仍寫「預設最壞 hover 每一次配對比值 ≥0.40」，與目前工具／測試的中位數 gate 不同。逐輪 `defaultOnHoverPaired` 仍在 JSON 中；最終宣告前需明示採用目前可執行 gate，或先處理這項規格文字差異。
- `--gate128` 未搭配 `--perf` 會直接報錯；搭配後只有完整符合上述條件才 exit 0。

## 證據適用範圍

- `a1-flight-projection-probe.json`／初版 mobile baseline 沒成功套用 synthetic inset，不能引用為 safe59；有效重測是 `a1-flight-projection-probe-safe59.json`。
- `seed37-*-desktop-table.png` 是教學入口，不當成市場驗收；市場截圖需 scene-shot --gate。
- 固定 seed 固定內容，環境燈光仍依牆鐘閃爍；PNG 是相同內容的外觀對照，並非逐像素 deterministic render。
- scene-shot 非 performance 報告中若 info.calls=1，是後製合成結果，不能當作牌桌成本。牌桌 gate.table 或專用五輪交錯 perf 才適用。

## 待完成

完整 1599 組幾何、上述獨占性能門檻、版本更新及正式送達。code/JS 有界覆審已覆蓋 market union／instance matrix／頁籤／骨骼同步，未有剩餘 HIGH；最終新增修改仍需按範圍覆核。真機逐項與歷史未過項另列。
