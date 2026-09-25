# 文字截斷盤點：head

來源：`probe-head.json`（`tests/tools/text-fit-probe.mjs`），整理：`tests/tools/text-fit-inventory.mjs`。

- 量測格數（畫面鍵 × 視口）：790（V1 158、V2 158、V3 158、V4 158、V5 158）
- 含非捲動截斷的格數：0（無）
- 盤點項數：7（可縮寫類（可捲動） 7）
- 作廢格（量測中途畫面換掉）：solo|shrine-run lost8、solo|duel lost1、hot|shrine-run lost9、nw1|shrine-run lost8、nw2|shrine-run lost1、nw3|shrine-run lost1
- pageerror：solo 0、hot 0、nw1 0、nw2 0、nw3 0

| # | 元素 | 分類 | 全文（例） | 顯示文（例） | 格數 | 出現在（模式\|畫面：視口） | 理由／全文位置 |
|---|---|---|---|---|---|---|---|
| 1 | `#modalbox`（可捲） | 可縮寫類（可捲動） | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.2 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.2 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | 5 | solo｜modal:？ 妖市規則:V1V2V3V4V5 | 規則／角色說明視窗，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 5/5） |
| 2 | `#felt`（可捲） | 可縮寫類（可捲動） | 東風・🌑 朔月｜陰氣拍：全隊 HP +1 ？ ⚔️ 第 1 夜・戰況 🌒 你的心願「驅邪」未能達成 🌒 閭山法師  | 東風・🌑 朔月｜陰氣拍：全隊 HP +1 ？ ⚔️ 第 1 夜・戰況🌒 你的心願「驅邪」未能達成🌒 閭山法師 的心 | 92 | solo｜night-end:V1V2V3V4；solo｜event:V1V3V4；solo｜event-result:V1V2V3V4；solo｜end:V1V2V3V4；solo｜review:V1V2V3V4；hot｜night-end:V1V2V3V4；hot｜event:V1V2V3V4；hot｜event-result:V1V3V4；hot｜end:V1V2V3V4；hot｜review:V1V2V3V4；nw1｜night-end:V1V2V3V4；nw1｜event:V1V2V3V4；nw1｜event-result:V1V3V4；nw1｜end:V1V2V3V4；…共 15 種 | 牌桌中央面板（非掏空頁：揭盅結果、夜末戰況、異事、局末）＝overflow-y:auto，內容比面板高時可捲；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 92/92） |
| 3 | `#railW > div.railPages`（可捲） | 可縮寫類（可捲動） | 虎姑婆指甲 共鳴3拍・大紙偶×1陰氣 ✦ 戰勝時回 1 壽命 大紙偶×1・攻 7・血 4・共鳴3拍 | 虎姑婆指甲 共鳴3拍・大紙偶×1陰氣 ✦ 戰勝時回 1 壽命 大紙偶×1・攻 7・血 4・共鳴3拍 | 16 | solo｜bid:V1V2V3V4；solo｜shrine:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜shrine:V1V2V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 16/16） |
| 4 | `#railE > div.railPages`（可捲） | 可縮寫類（可捲動） | 千里眼銅鈴 共鳴2拍・護法紙人×2香火🌕 今夜受惠 ✦ 明夜預告顯示兩件拍品 護法紙人×2・攻 1・血 6・共鳴2拍 | 千里眼銅鈴 共鳴2拍・護法紙人×2香火🌕 今夜受惠 ✦ 明夜預告顯示兩件拍品 護法紙人×2・攻 1・血 6・共鳴2拍 | 24 | solo｜bid:V1V2V3V4；solo｜shrine:V1V2V3V4；hot｜bid:V1V2V3V4；hot｜shrine:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜shrine:V1V2V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 24/24） |
| 5 | `#review`（可捲） | 可縮寫類（可捲動） | 本局回顧 下載本局紀錄 複製本局紀錄 關閉 這一局的因果 天亮了，東家・孝女白琴 還站在市集裡，元氣未傷。 失血最多的一 | 本局回顧下載本局紀錄複製本局紀錄關閉 這一局的因果天亮了，東家・孝女白琴 還站在市集裡，元氣未傷。失血最多的一段在第六夜 | 10 | solo｜review:V1V2V3V4V5；hot｜review:V1V2V3V4V5 | 本局回顧整頁，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 10/10） |
| 6 | `#nwScr`（可捲） | 可縮寫類（可捲動） | 夜行錄 返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章 破廟逢青面 主角：青面攤 | 夜行錄返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章破廟逢青面 主角：青面攤主可 | 3 | nw1｜nw-menu:V4；nw2｜nw-menu:V4；nw3｜nw-menu:V4 | 夜行錄章節選單整層 overflow-y:auto（SE 667×375 三張章節卡排成兩列）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 3/3） |
| 7 | `#nwBody > div.stageCard.nwBig`（可捲） | 可縮寫類（可捲動） | 夜行錄・第一章 破廟逢青面 青面攤主 本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向， | 夜行錄・第一章 破廟逢青面 青面攤主本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向，雨 | 12 | nw1｜nw-intro:V1V2V3V4；nw2｜nw-intro:V1V2V3V4；nw3｜nw-intro:V1V2V3V4 | 夜行錄引言卡／殘卷卡本身 overflow-y:auto（按鈕列 sticky 在卡底）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 12/12） |

## 文字條背景不透明度（凍結 #3）

| 文字條 | 樣本 | 自身 alpha 最低 | 疊加 alpha 最低 | 低於 .85 且無字影的格 |
|---|---|---|---|---|
| `#feltHead` | 701 | 0 | 0 | 0 |
| `#feltHead > span.headCompact` | 701 | 0.9 | 0.9 | 0 |
| `#feltHead > div.wishbar` | 355 | 0.9 | 0.9 | 0 |
| `#northPrev > div.preview` | 540 | 0.9 | 0.9 | 0 |
| `#revealCard` | 21 | 0.88 | 0.88 | 0 |
| `#stage > div.stageCard` | 321 | 1 | 1 | 0 |
| `#stage > div.stakebar` | 15 | 0.9 | 0.9 | 0 |
| `#bub1` | 18 | 1 | 1 | 0 |
