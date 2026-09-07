# 驗收凍結檔：請神小卷 N1（同香火擲序改洗牌）＋N7（天井免燒即可請）（2026-09-07）

基準 SHA：`ff227a7`（v0.43.1 合併 commit）。
起因：傳說三尊實作卷六版報告 `docs/experiments/2026-09-06-legend3-impl-report.md` §6.4 的未解清單，使用者 2026-09-07 裁定：
- **N1 裁乙**：同香火（並列）者的擲骰先後改用 `S.rng()` 洗牌，取代「從本夜風位家起順時針」（`shrineOrderKey`）。
  理由：報告實測 3000 局 1643 組並列，座位 0 拿到公平份額 1.183 倍、座位 1 只有 0.770 倍（χ²=37.53，df=3），風位輪轉字面上「不固定在同一家」但公平意義不成立。
- **N7 裁甲**：對某龕累計香火 h≥`CFG.INC_PITY` 者，**本夜免燒香也具擲骰資格**（必成）。
  理由：燒香上限＝壽命−1（前一輪裁定甲）的必然後果是「壽命剩 1 的人到了天井卻永遠請不走」（天井鎖死）。

規則現文（改前）：`index.html` `resolveShrines()`（約 2600–2625 行）的 `rollers` 篩選＝「本夜對該龕燒香 amt>0 的活人」，排序＝`h` 降冪、同 `h` 依 `shrineOrderKey`；規則頁第 3715 行那句「本夜有燒香的人才有資格擲；香火一樣多的，從本夜風位家起順時針」；`tests/legend.test.mjs` 第 16 案守的是風位擲序（**本卷要改寫它，屬使用者已同意的規則改動，記在下方 §2.1 欄**）。

## 範圍
- **N1**：`resolveShrines` 內同 `h` 並列組的先後改成以 `S.rng()` 做 Fisher–Yates 洗牌（**不得**用 `sort` 的隨機比較子、**不得**碰 `Math.random`）；只有並列組人數 ≥2 才消耗亂數，人數 1 不消耗；不同 `h` 之間仍嚴格 `h` 降冪。`shrineOrderKey` 若因此無人使用則連同匯出一併移除（GUIDE §11.20 第 6 點改寫），不得留死碼。
- **N7**：`rollers` 改為「本夜對該龕燒香 amt>0 的活人」∪「對該龕 `h≥CFG.INC_PITY` 的活人（不論本夜有沒有燒、封籤選的是哪一龕）」。天井者仍走同一條迴圈（`pity=true`、必成），排序規則同上。**假設（派工時採用、回報時點名讓使用者確認）**：天井者若本夜封籤燒在別的龕，兩龕各自結算，他在天井龕免費必請、在另一龕照常擲；「每夜一尊」的字面沒有被破壞（封籤仍只能選一尊燒）。
- **N7 附帶**：`aiIncense` 對自己已達天井的龕不再燒香（amt 0 或改投其他開放龕），否則 AI 會白燒壽命；規則頁與請神結算卡／燒香 UI 的文字要改口徑（「h 到天井者今夜免燒也必請」）。
- **UI**：燒香面板對天井龕顯示「已達天井・今夜免燒也必請」；規則頁那兩句改寫；其餘不動。
- **不在本卷**：`INC_K`／`INC_PITY`／`INC_MAX` 數值、階段獎勵、對決引擎、共鳴、任何 `LEGEND_ON=false` 路徑。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **A0 kill switch 雙向（本卷起預設改開，使用者 2026-09-07 裁定）**：`CFG.LEGEND_ON` 預設 `false→true`；顯式 `LEGEND_ON=false` 下 `trace(1..20)` 與基準 SHA（其預設為 false）逐位元組相等；預設（`true`）下不相等且 `S.shrines` 非空。`?legend=0` 仍可關（`?legend=1` 保留不報錯）。什麼實作會讓它紅：關閉路徑仍消耗 `S.rng` 或仍建 `S.shrines`。（跑法同 `tests/tools/legend-gate.mjs --only=L0`，治具的「預設」與「顯式」兩支要跟著對調口徑。）
- **A0-b 預設開的可見面**：首頁／規則頁不再寫「請神預設關、?legend=1 試玩」（VERSION_NOTE、規則頁、GUIDE §11.20 第 1 點三處同步改口徑）；`legend-drive.mjs` 不帶 `--legend` 也要走到「請走」與「回天」。
- **A1 N1 公平性（n=10000，顯式 `LEGEND_ON=true`，預設 AI 桌）**：只數並列組（同龕同 `h` 人數 ≥2），四個座位「實際先擲次數 ÷ 公平期望（每組 1/m）」各落在 **[0.92, 1.08]**，且 χ²（df=3）**≤ 11.34**。什麼實作會讓它紅：保留風位序（報告實測 1.183／0.770）；用 `sort((a,b)=>S.rng()-0.5)`（偏倚洗牌）；洗牌只洗前兩名。
- **A2 N1 決定性**：同一 seed 連跑兩次 `trace(1..20)`（顯式 `LEGEND_ON=true`）逐位元組相等；`grep -c "Math.random" index.html` 與基準相同。什麼實作會讓它紅：用 `Math.random`、用 `S.rngUi`。
- **A3 N1 鑑別力（`tests/legend.test.mjs` 第 16 案改寫）**：固定 `round`、四家對同一龕同 `h`（未達天井、K 極大讓沒人擲中，或直接讀 `out.rolls[0].pid`），跑 seeds 1..200：每一家至少先擲 1 次、沒有任何一家 >50%；`h` 不同時 `out.rolls` 順序恆為 `h` 降冪且與 seed 無關。**對基準 SHA 必紅在「每家至少先擲一次」這條行為斷言**（風位序下同一 round 永遠同一家先）。
- **A4 N7 鑑別力（新案）**：某家 `life=1`、對龕 0 的 `h=CFG.INC_PITY`、本夜封籤 amt 0（或根本沒封）→ `resolveShrines()` 後龕 0 `takenBy` 是他、`out.rolls` 有他且 `pity:true`、`out.burn` 沒有他、壽命仍 1。**對基準 SHA 必紅在 `takenBy`**。另一案：天井者本夜封籤燒在龕 1 → 龕 0 免費請走、龕 1 照常擲（`out.rolls` 兩筆）。
- **A5 N7 AI 不白燒**：`aiIncense(p)` 在 `p` 對某龕 `h≥INC_PITY` 時，回傳的 `shrine` 不是那一龕或 `amt=0`（單元測試，seeds 1..50 掃）。
- **A6 天井鎖死歸零（n=10000，顯式開）**：`settleShrinesEnd` 回天結清的紀錄裡，「`h≥INC_PITY` 且該龕仍 open」的筆數＝**0**（改前理論上可發生；報告 1500 局 0 次是樣本太少，此條是不變量而非主要鑑別力）。
- **A7 既有閘門重跑（門檻以 `docs/experiments/2026-09-06-acceptance-legend3-impl.md` 現文含 §2.1 修訂為準，不得動）**：`legend-gate.mjs 10000` 的 **L2 活性、L4 無支配策略**須綠；**L1″** 重跑只報不判（狀態① 是單夜快照結構性紅，裁預設開前另議多夜模型；但其餘狀態不得由綠轉紅）；L3′ 重跑只報。
- **A8 測試與 Playwright**：既有 6 套測試＋`tests/legend.test.mjs`（改寫後 ≥17 案）全綠；`node tests/tools/legend-drive.mjs <out.json>` 0 console error／pageerror，走到「請走」與「天亮回天」各一次；橫式／直式橫向溢出 0。
- **A9 範圍與版本**：`git diff --stat` 只含 `index.html`、`tests/legend.test.mjs`、`tests/tools/legend-gate.mjs`（若需加 A1/A6 計數）、`docs/GAME_DESIGN.md`（changelog 一行）、`docs/IMPLEMENTATION_GUIDE.md`（§11.20 第 1、6 點與新增一點）、`tests/tools/legend-drive.mjs`（僅預設口徑）、本檔；`VERSION="0.44"`，`CFG.LEGEND_ON: true`（預設開）。

什麼實作會讓 A0 紅：洗牌或天井資格判斷放在 `LEGEND_ON` 檢查之前、或在關閉時仍消耗 `S.rng`。

## §2.1 修訂紀錄
- 2026-09-07（動手前）：`tests/legend.test.mjs` 第 16 案「同香火依風位」是上一輪裁定甲的守衛，本卷依使用者裁乙改寫成 A3——這是規則改動經使用者明確同意，不是為了過而動測試。
