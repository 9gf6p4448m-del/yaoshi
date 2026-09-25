# 橫向版面入框（v0.58.1）證據

凍結檔：`../2026-09-25-acceptance-landscape-fit.md`（v1.0＋#6 修訂）。治具：`tests/tools/landscape-fit-probe.mjs`。

## 結果

| 條 | 基準 51c986e | 修正後 |
|---|---|---|
| #1＋#2 矩陣（17 畫面，21 個畫面鍵 × V1–V5） | 68/105 | **105/105** |
| 同上，不套「純背景」豁免的嚴格數字 | 68/105 | 96/105（差的 9 格＝袋子／角色 ⓘ／規則的 `#modal` 全螢幕半透明底層，V1–V3） |
| #2 主按鈕可點 | 105/105 | 105/105 |
| #3 每次畫面切換後 #1（V1） | 73/163 | **200/200** |
| #3 P→V1、V1→V3（出價、夜戰、局末、引言卡 × 2 步，含 canvas 尺寸） | 3/4 情境 | **4/4 情境（8/8 步）** |
| #6b 直式 393×852 `#rotateHint` 最上層（中心＋四角） | 21/21 | 21/21 |
| pageerror | 0 | 0 |
| #4 trace-eq（seeds 1..20，對 51c986e） | — | equal；`--mutate` 突變驗紅 ✅ |
| #5 全套 `node --test tests/*.test.mjs` | 402/402（`suite-before.txt`） | 402/402，改前通過案 0 遺失（`suite-after.txt`） |

改後第一次全套 393/396 紅（`suite-after-crlf-incident.txt`）：我用腳本改寫 index.html 時把工作樹 CRLF 轉成 LF，`tests/tools/l1-destiny-focus.mjs` 以 CRLF（`\r\n`）為錨點改寫產品碼而失敗（git 正規化，提交內容不受影響）；另兩案 `scene-shot` 子行程在機器重負載下逾時（單獨重跑 0.9 秒過）。轉回 CRLF 後完整重跑 402/402。

鑑別：基準 V1「第 1 夜盯上」「出價」（常規與第 1 章）皆紅，紅元素含右側座位 `#seat3`、`#railE` 拍品卡、請神列 `#shrines`、主鈕 `#mainbtn`；`#table` 欄寬 `168px 496px 168px`（可用 734）。截圖 `shots-base-51c986e/mark-V1.png` 與使用者截圖同一現象。

## 歸因

- `index.html:89`（基準）`#table.t3d{grid-template-columns:168px 1fr 168px}`：`1fr`＝`minmax(auto,1fr)`；掏空的 `#felt.hollow{overflow:visible}` 使自動最小寬＝min-content。
- `index.html:338`（基準）`#feltHead{flex-wrap:nowrap;padding-right:115px}`：月相 132＋縮寫 68＋心願條 147＋間距 10＋讓位 115＝472，加 `#felt` 內距與框線＝496。
- 844 無安全區：桌心可分 836−336−8＝492（心願條短時夠，本局種子其實也溢出 4px）；iPhone 15 Pro 852−59×2＝734 ⇒ 桌心只分到 390，grid 撐寬 106px，右側被 `html,body{overflow:hidden}` 切掉。

## 基準盤點中其他紅畫面

- 夜行錄章節選單（V1–V3）：`#nwScr` 沒吃安全區，左右各 42px 在瀏海下。
- 揭盅、請神夜、袋子／角色 ⓘ／規則（底下牌桌同一個溢出）。
- 請神前夜（`#north.shwide`）預告框在窄寬度只剩 149px，長預告 5 行 66px 頂出上緣（修正後才看得到，基準被 grid 溢出蓋過）。
- V4 夜行錄北席開場台詞泡右緣超出 15px。

## 量測程序說明（改產品前定下）

- 安全區以覆寫 `--safe-*` 模擬（重建模型，不是真機）。
- 可捲容器內的元素以 `scrollIntoView({block:'center'})` 捲到後量（`nearest` 只貼齊實體螢幕邊、落在安全區內，使用者其實可再捲）。
- 「純背景不在此限」：全螢幕、`position:fixed`、本身無文字的底層不量外框（逐格記在 `backdrops`），其內容照量；嚴格數字見上表。
- 夜戰切換測試若夜戰在切換中途結束則作廢、下一場重做（本輪 0 次作廢）。

## #6c 直式提示期間會自動推進的計時器

`startBattle`（index.html:7312）與 `startShrine`（:6524）以 `sleep`（:3004）／`pwSleep`（:6738）演完夜戰與請神結算，演完停在等主鈕，不會替玩家跨過決策點；揭盅逐件等 `waitMain`（:2764），異事開盅 `revealEventUI`（:5761）無等待。未暫停（改 `sleep` 會動到演出時序與 3D hitstop 同步，不確定安全），照實記錄。其餘計時器（更新探針、泡泡消失、特效清除）不推進遊戲；`js/` 無計時器。
