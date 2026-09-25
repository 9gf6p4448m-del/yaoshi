# 文字截斷盤點：base-f105ea2

來源：`probe-base-f105ea2.json`（`tests/tools/text-fit-probe.mjs`），整理：`tests/tools/text-fit-inventory.mjs`。

- 量測格數（畫面鍵 × 視口）：950（V1 190、V2 190、V3 190、V4 190、V5 190）
- 含非捲動截斷的格數：766（V1 179、V2 140、V3 179、V4 176、V5 92）
- 盤點項數：22（資訊類 15、可縮寫類（可捲動） 7）
- 作廢格（量測中途畫面換掉）：solo|shrine-run lost9、hot|shrine-run lost9、nw1|shrine-run lost7、nw2|shrine-run lost1、nw3|shrine-run lost1
- pageerror：solo 0、hot 0、nw1 0、nw2 0、nw3 0

| # | 元素 | 分類 | 全文（例） | 顯示文（例） | 格數 | 出現在（模式\|畫面：視口） | 理由／全文位置 |
|---|---|---|---|---|---|---|---|
| 1 | `#shrines > div.incboard > span.ibgap` | 資訊類 | 你 0・平手 | 你 0・平… | 252 | solo｜mark:V1V2V3V4；solo｜bid:V1V2V3V4；solo｜modal:南家・青面攤主（:V1V3V4；solo｜modal:北家・收驚婆:V1V3V4；solo｜modal:？ 妖市規則:V1V3V4；solo｜reveal:V1V3V4；solo｜shrine:V1V2V3V4；hot｜mark:V1V2V3V4；hot｜bid:V1V2V3V4；hot｜reveal:V1V3V4；hot｜shrine:V1V2V3V4；nw1｜mark:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜reveal:V1V3V4；…共 23 種 | 香火榜「你 N・領先／落後 M」：決定燒不燒香的輸入 |
| 2 | `#shrines > div.incboard > span.ibwhen` | 資訊類 | 第 5 夜請神・倒數 4 夜 | 第 5 夜請神・倒數… | 252 | solo｜mark:V1V2V3V4；solo｜bid:V1V2V3V4；solo｜modal:南家・青面攤主（:V1V3V4；solo｜modal:北家・收驚婆:V1V3V4；solo｜modal:？ 妖市規則:V1V3V4；solo｜reveal:V1V3V4；solo｜shrine:V1V2V3V4；hot｜mark:V1V2V3V4；hot｜bid:V1V2V3V4；hot｜reveal:V1V3V4；hot｜shrine:V1V2V3V4；nw1｜mark:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜reveal:V1V3V4；…共 23 種 | 請神倒數（凍結 #2 點名「請神倒數」） |
| 3 | `div.shcards > div.shcard.fac-xianghuo > span.shname > span.shn` | 資訊類 | 大士爺紙尊 | 大士爺… | 282 | solo｜mark:V1V2V3V4V5；solo｜bid:V1V2V3V4；solo｜modal:南家・青面攤主（:V1V2V3V4；solo｜modal:北家・收驚婆:V1V2V3V4；solo｜modal:？ 妖市規則:V1V2V3V4；solo｜reveal:V1V2V3V4；solo｜shrine:V1V2V3V4；hot｜mark:V1V2V3V4V5；hot｜bid:V1V2V3V4；hot｜reveal:V1V2V3V4；hot｜shrine:V1V2V3V4；nw1｜mark:V1V2V3V4V5；nw1｜bid:V1V2V3V4；nw1｜reveal:V1V2V3V4；…共 23 種 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 4 | `#feltHead > span.headCompact` | 資訊類 | 東風・🌑 朔月｜陰氣拍：全隊 HP +1 | 東風・🌑 朔月｜陰氣拍… | 713 | solo｜mark:V1V2V3V4V5；solo｜bid:V1V2V3V4V5；solo｜modal:南家・青面攤主（:V1V2V3V4V5；solo｜modal:北家・收驚婆:V1V2V3V4V5；solo｜modal:？ 妖市規則:V1V2V3V4V5；solo｜reveal:V1V3V4；solo｜shrine:V1V2V3V4；solo｜reveal-result:V1V3V4；solo｜duel:V3；solo｜night-end:V1V2V3V4；solo｜event:V1V2V3V4；solo｜event-result:V1V2V3V4；solo｜end:V1V3V4；solo｜review:V1V3V4；…共 49 種 | 頂列風位／月相與受惠陣營／異事名／規則名：當夜決策的公開資訊（凍結 #2 點名「夜晚資訊、月相／受惠、規則／異事名」） |
| 5 | `div.shcards > div.shcard.fac-yinqi > span.shname > span.shn` | 資訊類 | 有應公 | 有應… | 117 | solo｜mark:V1V2V3V4V5；solo｜bid:V4；solo｜modal:南家・青面攤主（:V4；solo｜modal:北家・收驚婆:V4；solo｜modal:？ 妖市規則:V4；solo｜reveal:V4；solo｜shrine:V4；hot｜mark:V1V2V3V4V5；hot｜bid:V4；hot｜reveal:V4；hot｜shrine:V4；nw1｜mark:V1V2V3V4V5；nw1｜bid:V4；nw1｜reveal:V4；…共 23 種 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 6 | `#modalbox`（可捲） | 可縮寫類（可捲動） | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.1 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | ？ 妖市規則 🔧 音訊診斷：sfx v0.58.1 ｜ ctx running 48000Hz ｜ 音效 開 聲部 2 | 5 | solo｜modal:？ 妖市規則:V1V2V3V4V5 | 規則／角色說明視窗，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 5/5） |
| 7 | `#duel` | 資訊類 | 一拍・撞 南家 青面攤主 0 隻 小紙人×1 肉 VS 東家・東風 孝女白琴 1 隻 大紙偶×1 祖 −1 隻 | 一拍・撞 南家 青面攤主 0 隻 小紙人×1 肉VS 東家・東風 孝女白琴 1 隻 大紙偶×1 祖 | 10 | solo｜duel:V1V4；hot｜duel:V1V4；nw1｜duel:V1V4；nw2｜duel:V1；nw3｜duel:V1V3V4 | 紙紮夜戰字幕（拍數、名字、隻數、招式、結果）；#duel 本身 overflow:hidden，整欄比視口高時上下各被切 |
| 8 | `#felt`（可捲） | 可縮寫類（可捲動） | 東風・🌑 朔月｜陰氣拍：全隊 HP +1 ？ ⚔️ 第 1 夜・戰況 🌒 你的心願「驅邪」未能達成 🌒 閭山法師  | 東風・🌑 朔月｜陰氣拍：全隊 HP +1 ？ ⚔️ 第 1 夜・戰況🌒 你的心願「驅邪」未能達成🌒 閭山法師 的心 | 139 | solo｜night-end:V1V2V3V4；solo｜event:V1V3V4；solo｜event-result:V1V2V3V4；solo｜end:V1V2V3V4；solo｜review:V1V2V3V4；hot｜night-end:V1V2V3V4V5；hot｜event:V1V2V3V4；hot｜event-result:V1V3V4；hot｜end:V1V2V3V4；hot｜review:V1V2V3V4；nw1｜night-end:V1V2V3V4；nw1｜event:V1V2V3V4；nw1｜event-result:V1V2V3V4；nw1｜end:V1V2V3V4；…共 17 種 | 牌桌中央面板（非掏空頁：揭盅結果、夜末戰況、異事、局末）＝overflow-y:auto，內容比面板高時可捲；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 125/139） |
| 9 | `div.shcards > div.shcard.fac-zuling > span.shname > span.shn` | 資訊類 | 殘日 | 殘… | 18 | solo｜mark:V4；solo｜bid:V4；solo｜shrine:V4；hot｜mark:V4；hot｜bid:V4；hot｜shrine:V4；nw1｜mark:V4；nw1｜bid:V4；nw1｜shrine:V4 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 10 | `#shrines > div.shcards > div.shcard.fac-zuling > span.shmove` | 資訊類 | 餘暉灼目 | 餘暉灼… | 18 | solo｜mark:V4；solo｜bid:V4；solo｜shrine:V4；hot｜mark:V4；hot｜bid:V4；hot｜shrine:V4；nw1｜mark:V4；nw1｜bid:V4；nw1｜shrine:V4 | 待請卡招式名：請神夜前一夜與當夜挑尊的輸入 |
| 11 | `#shrines > div.shcards > div.shcard.fac-xianghuo > span.shmove` | 資訊類 | 普渡 | 普… | 51 | solo｜mark:V1V2V3V4；solo｜bid:V4；solo｜shrine:V4；hot｜mark:V1V2V3V4；hot｜bid:V4；hot｜shrine:V4；nw1｜mark:V1V2V3V4；nw1｜bid:V4；nw1｜shrine:V4 | 待請卡招式名：請神夜前一夜與當夜挑尊的輸入 |
| 12 | `#shrines > div.shcards > div.shcard.fac-yinqi > span.shmove` | 資訊類 | 有求必應 | 有求必… | 57 | solo｜mark:V1V2V3V4；solo｜bid:V4；solo｜shrine:V4；hot｜mark:V1V2V3V4；hot｜bid:V4；hot｜shrine:V4；nw1｜mark:V1V2V3V4；nw1｜bid:V4；nw1｜shrine:V4 | 待請卡招式名：請神夜前一夜與當夜挑尊的輸入 |
| 13 | `#shrines > div.shcards > div.shcard.gone > span.shname` | 資訊類 | 殘日 祖靈 | 殘日祖靈… | 111 | solo｜mark:V1V3V4；solo｜bid:V1V3V4；solo｜shrine:V1V3V4；hot｜mark:V1V3V4；hot｜bid:V1V3V4；hot｜shrine:V1V3V4；nw1｜mark:V1V3V4；nw1｜bid:V1V3V4；nw1｜shrine:V1V3V4 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 14 | `#shrines > div.shcards > div.shcard.gone > span.shtaken` | 資訊類 | 已請走：西家 | 已請走… | 414 | solo｜mark:V1V2V3V4V5；solo｜bid:V1V2V3V4V5；solo｜shrine:V1V2V3V4V5；hot｜mark:V1V2V3V4V5；hot｜bid:V1V2V3V4V5；hot｜shrine:V1V2V3V4V5；nw1｜mark:V1V2V3V4V5；nw1｜bid:V1V2V3V4V5；nw1｜shrine:V1V2V3V4V5 | 「已請走：X 家／已回天」：哪一尊還能請 |
| 15 | `div.shcards > div.shcard.gone > span.shname > span.shn` | 資訊類 | 殘日 | … | 282 | solo｜mark:V1V2V3V4V5；solo｜bid:V1V2V3V4V5；solo｜shrine:V1V2V3V4V5；hot｜mark:V1V2V3V4V5；hot｜bid:V1V2V3V4V5；hot｜shrine:V1V2V3V4V5；nw1｜mark:V1V2V3V4V5；nw1｜bid:V1V2V3V4V5；nw1｜shrine:V1V2V3V4V5 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 16 | `#shrines > div.shcards > div.shcard.fac-yinqi > span.shname` | 資訊類 | 有應公 陰氣 | 有應陰氣… | 3 | solo｜mark:V4；hot｜mark:V4；nw1｜mark:V4 | 三尊待請卡尊名（凍結 #2 點名「尊名」） |
| 17 | `#railE > div.railPages`（可捲） | 可縮寫類（可捲動） | 虎姑婆指甲 共鳴3拍・大紙偶×1陰氣 ✦ 戰勝時回 1 壽命 大紙偶×1・攻 7・血 4・共鳴3拍 | 虎姑婆指甲 共鳴3拍・大紙偶×1陰氣 ✦ 戰勝時回 1 壽命 大紙偶×1・攻 7・血 4・共鳴3拍 | 24 | solo｜bid:V1V2V3V4；solo｜shrine:V1V2V3V4；hot｜bid:V1V2V3V4；hot｜shrine:V1V2V3V4；nw1｜bid:V1V2V3V4；nw1｜shrine:V1V2V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 24/24） |
| 18 | `#review`（可捲） | 可縮寫類（可捲動） | 本局回顧 下載本局紀錄 複製本局紀錄 關閉 這一局的因果 天亮了，東家・孝女白琴 還站在市集裡，元氣未傷。 失血最多的一 | 本局回顧下載本局紀錄複製本局紀錄關閉 這一局的因果天亮了，東家・孝女白琴 還站在市集裡，元氣未傷。失血最多的一段在第十二 | 10 | solo｜review:V1V2V3V4V5；hot｜review:V1V2V3V4V5 | 本局回顧整頁，overflow-y:auto；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 10/10） |
| 19 | `#nwScr`（可捲） | 可縮寫類（可捲動） | 夜行錄 返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章 破廟逢青面 主角：青面攤 | 夜行錄返回 依序挑戰；終局時你還活著，且壽命高過該章主角（或主角先出局），就算過關。 第一章破廟逢青面 主角：青面攤主可 | 3 | nw1｜nw-menu:V4；nw2｜nw-menu:V4；nw3｜nw-menu:V4 | 夜行錄章節選單整層 overflow-y:auto（SE 667×375 三張章節卡排成兩列）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 3/3） |
| 20 | `#nwScr` | 資訊類 | 夜行錄・第一章 破廟逢青面 青面攤主 本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向， | 夜行錄・第一章 破廟逢青面 青面攤主本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向，雨 | 9 | nw1｜nw-intro:V1V2V3；nw2｜nw-intro:V1V2V3；nw3｜nw-intro:V1V2V3 | 夜行錄引言卡／殘卷卡外層（intro／scroll 為 overflow-y:hidden），卡底被切 3px |
| 21 | `#nwBody > div.stageCard.nwBig`（可捲） | 可縮寫類（可捲動） | 夜行錄・第一章 破廟逢青面 青面攤主 本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向， | 夜行錄・第一章 破廟逢青面 青面攤主本章主角，坐北 青面攤主：「少年仔，你今暗買啥，我就搶啥。」 你在山路上迷了方向，雨 | 12 | nw1｜nw-intro:V1V2V3V4；nw2｜nw-intro:V1V2V3V4；nw3｜nw-intro:V1V2V3V4 | 夜行錄引言卡／殘卷卡本身 overflow-y:auto（按鈕列 sticky 在卡底）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 12/12） |
| 22 | `#railW > div.railPages`（可捲） | 可縮寫類（可捲動） | 虎爺印 共鳴2拍・大紙偶×1香火🌕 今夜受惠 ✦ 被毒標塞中時，下手的人失 2 壽命 大紙偶×1・攻 7・血 4・共鳴 | 虎爺印 共鳴2拍・大紙偶×1香火🌕 今夜受惠 ✦ 被毒標塞中時，下手的人失 2 壽命 大紙偶×1・攻 7・血 4・共鳴 | 8 | nw1｜bid:V1V2V3V4；nw1｜shrine:V1V2V3V4 | 側欄拍品卡列，overflow:auto（卡角徽章外掛 3px 產生的橫向可捲量）；**全文位置**：同一容器捲動即見全文（治具 reach：逐字捲過一遍，全部字都曾落在可視框內）（reach 8/8） |

## 文字條背景不透明度（凍結 #3）

| 文字條 | 樣本 | 自身 alpha 最低 | 疊加 alpha 最低 | 低於 .85 且無字影的格 |
|---|---|---|---|---|
| `#feltHead` | 861 | 0 | 0 | 231（solo|reveal-result@V1、solo|reveal-result@V2、solo|reveal-result@V3、solo|reveal-result@V4、solo|reveal-result@V5、solo|duel@V3） |
| `#feltHead > span.headCompact` | 861 | 0 | 0 | 231（solo|reveal-result@V1、solo|reveal-result@V2、solo|reveal-result@V3、solo|reveal-result@V4、solo|reveal-result@V5、solo|duel@V3） |
| `#feltHead > div.wishbar` | 415 | 0.62 | 0.62 | 415（solo|mark@V1、solo|mark@V2、solo|mark@V3、solo|mark@V4、solo|mark@V5、solo|bid@V1） |
| `#northPrev > div.preview` | 630 | 0.25 | 0.25 | 630（solo|mark@V1、solo|mark@V2、solo|mark@V3、solo|mark@V4、solo|mark@V5、solo|bid@V1） |
| `#revealCard` | 17 | 0.88 | 0.88 | 0 |
| `#stage > div.stageCard` | 421 | 1 | 1 | 0 |
| `#stage > div.stakebar` | 15 | 0.62 | 0.62 | 15（solo|bid@V1、solo|bid@V2、solo|bid@V3、solo|bid@V4、solo|bid@V5、hot|bid@V1） |
| `#bub1` | 18 | 1 | 1 | 0 |
