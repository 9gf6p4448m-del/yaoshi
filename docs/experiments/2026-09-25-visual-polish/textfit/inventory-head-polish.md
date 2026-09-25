# 文字截斷盤點：head-polish

來源：`probe-head-polish.json`（`tests/tools/text-fit-probe.mjs`），整理：`tests/tools/text-fit-inventory.mjs`。

- 量測格數（畫面鍵 × 視口）：875（V1 175、V2 175、V3 175、V4 175、V5 175）
- 含非捲動截斷的格數：1（V5 1）
- 盤點項數：8（可縮寫類（可捲動） 7、資訊類 1）
- 作廢格（量測中途畫面換掉）：solo|shrine-run lost8、hot|shrine-run lost9、nw1|shrine-run lost8、nw2|shrine-run lost1、nw3|shrine-run lost1
- pageerror：solo 0、hot 0、nw1 0、nw2 0、nw3 0

| # | 元素 | 分類 | 全文（例） | 顯示文（例） | 格數 | 出現在（模式\|畫面：視口） | 理由／全文位置 |
|---|---|---|---|---|---|---|---|
| 1 | `#modalbox`（可捲） | 可縮寫類（可捲動） | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.3 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.3 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | 5 | solo｜modal:？ 妖市規則:V1V2V3V4V5 | 規則／角色說明視窗，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 5/5） |
| 2 | `#duel` | 資訊類 | 一拍・撞 北家 收驚婆 0 隻 大紙偶×1 香 VS 西家 閭山法師 0 隻 大紙偶×1・戰鬥詛咒已淨化 1 香 −1  | 一拍・撞 北家 收驚婆 0 隻 大紙偶×1 香VS 西家 閭山法師 0 隻 大紙偶×1・戰鬥詛咒已淨化 1 香 | 1 | solo｜duel:V5 | 紙紮夜戰字幕（拍數、名字、隻數、招式、結果）；#duel 本身 overflow:hidden，整欄比視口高時上下各被切 |
| 3 | `#felt`（可捲） | 可縮寫類（可捲動） | 北風・🌓 上弦｜祖靈拍：全隊 HP +1・🧧陰間放貸 ？ 🧧 陰間放貸 陰間錢莊今夜放貸：可密封借 10 壽命（互 | 北風・🌓 上弦｜祖靈拍：全隊 HP +1・🧧陰間放貸 ？ 🧧陰間放貸 陰間錢莊今夜放貸：可密封借 10 壽命（互相 | 138 | solo｜event:V1V3V4；solo｜event-result:V1V2V3V4；solo｜night-end:V1V2V3V4；solo｜end:V1V2V3V4；solo｜review:V1V2V3V4；hot｜night-end:V1V2V3V4；hot｜event:V1V2V3V4；hot｜event-result:V1V3V4；hot｜end:V1V2V3V4；hot｜review:V1V2V3V4；nw1｜night-end:V1V2V3V4；nw1｜event:V1V2V3V4；nw1｜event-result:V1V3V4；nw1｜end:V1V2V3V4；…共 15 種 | 牌桌中央面板（非掏空頁：揭盅結果、夜末戰況、異事、局末）＝overflow-y:auto，內容比面板高時可捲；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 138/138） |
| 4 | `#railW > div.railPages`（可捲） | 可縮寫類（可捲動） | 山豬牙飾 共鳴1拍・小紙人×1祖靈🌓 今夜受惠 夜戰：本隊每拍首次遭攻擊時，反傷攻擊者 2（傷害被吸收為 0 也會觸發 | 山豬牙飾 共鳴1拍・小紙人×1祖靈🌓 今夜受惠 夜戰：本隊每拍首次遭攻擊時，反傷攻擊者 2（傷害被吸收為 0 也會觸發 | 38 | solo｜bid:V1V2V3V4；solo｜shrine:V1V2V3V4；hot｜bid:V1V3V4；hot｜shrine:V1V3V4；nw1｜bid:V1V3V4；nw1｜shrine:V1V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 38/38） |
| 5 | `#railE > div.railPages`（可捲） | 可縮寫類（可捲動） | 👁北西東 射日神弓 共鳴1拍・大紙偶×1祖靈🌓 今夜受惠 ✦ 戰勝時，對手額外 -2 壽命 大紙偶×1・攻 10・血 | 👁北西東 射日神弓 共鳴1拍・大紙偶×1祖靈🌓 今夜受惠 ✦ 戰勝時，對手額外 -2 壽命 大紙偶×1・攻 10・血 | 54 | solo｜bid:V1V2V3V4；solo｜shrine:V1V2V3V4；hot｜bid:V1V2V3V4；hot｜shrine:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜shrine:V1V2V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 54/54） |
| 6 | `#review`（可捲） | 可縮寫類（可捲動） | 本局回顧 下載本局紀錄 複製本局紀錄 關閉 這一局的因果 天亮了，北家・收驚婆 還站在市集裡，傷了些元氣。 失血最多的一 | 本局回顧下載本局紀錄複製本局紀錄關閉 這一局的因果天亮了，北家・收驚婆 還站在市集裡，傷了些元氣。失血最多的一段在第八夜 | 10 | solo｜review:V1V2V3V4V5；hot｜review:V1V2V3V4V5 | 本局回顧整頁，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 10/10） |
| 7 | `#nwScr`（可捲） | 可縮寫類（可捲動） | 夜行錄 返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章 破廟逢青面 主角：青面攤 | 夜行錄返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章破廟逢青面 主角：青面攤主可 | 3 | nw1｜nw-menu:V4；nw2｜nw-menu:V4；nw3｜nw-menu:V4 | 夜行錄章節選單整層 overflow-y:auto（SE 667×375 三張章節卡排成兩列）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 3/3） |
| 8 | `#nwBody > div.stageCard.nwBig`（可捲） | 可縮寫類（可捲動） | 夜行錄・第一章 破廟逢青面 青面攤主 本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向， | 夜行錄・第一章 破廟逢青面 青面攤主本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向，雨 | 12 | nw1｜nw-intro:V1V2V3V4；nw2｜nw-intro:V1V2V3V4；nw3｜nw-intro:V1V2V3V4 | 夜行錄引言卡／殘卷卡本身 overflow-y:auto（按鈕列 sticky 在卡底）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 12/12） |

## 文字條背景不透明度（凍結 #3）

| 文字條 | 樣本 | 自身 alpha 最低 | 疊加 alpha 最低 | 低於 .85 且無字影的格 |
|---|---|---|---|---|
| `#feltHead` | 788 | 0 | 0 | 0 |
| `#feltHead > span.headCompact` | 788 | 0.9 | 0.9 | 0 |
| `#feltHead > div.wishbar` | 375 | 0.9 | 0.9 | 0 |
| `#northPrev > div.preview` | 570 | 0.9 | 0.9 | 0 |
| `#revealCard` | 21 | 0.88 | 0.88 | 0 |
| `#stage > div.stageCard` | 388 | 1 | 1 | 0 |
| `#stage > div.stakebar` | 15 | 0.9 | 0.9 | 0 |
| `#bub3` | 1 | 1 | 1 | 0 |
| `#bub1` | 18 | 1 | 1 | 0 |
