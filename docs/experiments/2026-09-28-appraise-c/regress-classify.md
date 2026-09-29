# #8 不回退：399b681b 對 86e4676 的每一筆回退分類（09-29）

來源：`vp-judge.json`（visual-polish-p2-judge，base＝`vp/probe-base.json`＝86e4676、head＝`vp/probe-head.json`＝266887d8，產品碼與 399b681b 相同）、`textfit/probe-{base,head}.json`。
注意：`vp-judge.json` 的 brief 是**上一卷（visual-polish-p2，09-26 凍結）**自己的條件編號；本卷凍結 #8 只引用其中的「第一階段 #1–#6 違規數」＝`#9-phase1`，以及 text-fit／landscape-fit 通過數。p2 的 #2／#6／#8 不是本卷 #8 的條件，照樣逐筆分類。

## 分類表

| 類 | 項目 | 筆數 | 代表例 | 判定依據 |
|---|---|---|---|---|
| 乙 | p2 #2「點籤展開卡」shown=false、內容 missing | 1440（360 格 × 4 籤，全部同型） | `vp-judge.txt:17`「solo\|mark\|n1@V1 展開 railW#0 shown=false … missing=[白虎煞,…]」 | 判定式 `tests/tools/visual-polish-p2-judge.mjs:76` 找舊展開卡 `.railPages .mcard`；0.59.2 依使用者裁定（凍結檔「取代展開卡」）點籤改進鑑賞頁，舊卡結構上不存在。其餘 #2 子項（窄籤全名、截斷、高度、系色條、第一階段 railTabs、對基準缺）head 0 筆。base 自己也有 143 筆（shown=true 但 missing）。 |
| 丙 | p2 #6 字體分工 | head 5460／base 5364 | `vp-judge.txt:103`「#titleScr h1 → LXGW WenKai TC」 | 判定器寫死 `Noto Serif TC`（`visual-polish-p2-judge.mjs:133`），0.59.1 已依使用者裁定換展示字型 LXGW WenKai TC（`fe66d019`）。逐選擇器的 font-family 兩版完全相同；筆數差＝head 格數 906 vs base 890（整局不決定性）。不是回退，也不是本卷條件。 |
| 丙 | p2 #8 其餘畫面只換皮（hot 回顧頁 #reviewbox 高 +10.8px） | 1 | `vp-judge.txt:161` | 回顧頁高度＝本局紀錄長度（內容量），`86e4676..399b681b` 沒有任何一行動到回顧頁；同一判定器量 3cb06240 對 86e4676 的 solo 回顧頁差 867px。整局不決定性。 |
| 甲 | 第一階段 #1 breaks：`#pnl .pnl-sec.{wish,duel,dawn} > .pnl-lab` | V1–V5 各 0→22（110＋110＋49 項次） | `solo\|night-end\|n1@V1` | 面板 Y 段標題 writing-mode 直排，判定式「字換到下一行＝斷行」。已修（逐字區塊，視覺相同）。 |
| 甲 | 第一階段 #2 spill：`.pnl-cell .pnl-head > .pnl-cnt` | V1–V4 各 0→12 | `hot\|shrine\|n1@V1` 23.7px | 熱座長名＋你＋得標 N 擠出等寬欄。已修（欄寬依內容）。 |
| 甲 | 第一階段 #4 contrast：`--pnl-dim`、`.pnl-name.lose` opacity .4、`.pnl-chip.down`、系色字（祖靈 2.44:1） | V1–V5 各 0→56（V3 57） | `solo\|shrine\|n1@V1 .pnl-cnt 2.7/4.5` | 已修（見 commit 5c5bf132）。 |
| 甲 | 第一階段 #5 target：`#railW .railTabs button`（揭盅結果時被成交總覽蓋掉下半）、`#seat2 .roleInfoBtn`（V1 戰況面板左緣切到 ⓘ 命中範圍） | V1 0→34、V3 0→12、V4 0→12 | `hot\|shrine\|n1@V1 魔神仔的芭樂 112x32`；`solo\|night-end\|n1@V1 ⓘ 35x41` | 選擇器不在 #pnl，但遮擋物是 #pnl（dev 量測：面板上緣 183–194 < 窄籤下緣 202；ⓘ 右側 x=227 起 elementFromPoint＝#pnl）。已修。 |
| 丙 | 第一階段 #4 contrast：`#pwch-B > i.pwfac`（nw2\|duel@V3） | 1 | ratio 1.04、op 1 | 夜戰籌碼系字；`86e46763..399b681b` 動到 pwch／pwfac 的行數 0。base 同格同元素量到 op 0.15、標 transient（還在淡入），head 那一幀已淡入完＝截圖時序不同。 |
| 丙 | 第一階段 #3 font@V3 4→5：`#pwch-A/B > i.pwfac` 9px | 1 格 | `nw3\|duel@V3` | 兩版每一個 duel 格都有這兩項（產品既有）；base 的 nw3 那局沒打到 V3 的 duel 格（base duel 格 V3＝4、head＝5）。覆蓋差，不是回退。 |
| 甲 | text-fit：`#pnl` 需要捲動（戰況） | 共同 870 格中 10 格變紅（V5／V2） | `solo\|night-end\|n6@V5` | 戰況面板高上限 min(320px,70vh)，1280×720 也要捲；V1–V4 舊上限伸到底列後面。已修（高＝#felt 內）。 |
| 丙 | text-fit：`#felt` 需要捲動 | 共同格 1 變紅、1 變綠 | — | 同一元素一增一減，內容量不決定性。 |
| 丙 | text-fit 總數 715 < 785 | 格數 895 vs 975 | base 獨有 105 格（night-end 50、mark/bid/shrine 各 15…）、head 獨有 25 格 | 兩次整局走到的畫面集合不同（覆蓋差）；共同格比較見上兩列。 |

## (乙) 需使用者裁定：1 類、1440 筆

p2 #2 的「點籤展開卡逐項可見」是 0.59.1 行為；0.59.2 使用者裁「取代展開卡」。同一件使用者關心的事（點籤後看得到這一件的完整說明）由本卷 #2 涵蓋：
側欄（題字）內容對 86e4676 同籤展開卡逐項等價 missing 0、同側、安全區、截斷 0、越框 0、cut 0（80/80），按盯上後賽局狀態逐字相同（40/40）——見 `head-judge.json`、`mark-eq-raw.json`；新 HEAD 重跑數字見 README。

## 修後（HEAD 751de320，vp/probe-head3.json、textfit/probe-head3.json；原始檔未提交，太大）

- (甲) 全數歸零：第一階段 breaks／spill／contrast／target 的 #pnl 項 0；共同格逐條 head ≤ base（`phase1-common-head3.txt`）。text-fit 共同格 724→726（`textfit-common-head3.txt`）。
- 仍在的差異，全屬 (丙)：align 總數 +8/+9（head 多走到 solo 第 10–12 夜，這類格兩版 100% 紅，共同格 114→113/114）；contrast@V3 `#pwch-B i.pwfac`（夜戰籌碼淡入時序）；target@V1 `hot|reveal #seat2 ⓘ` 39×41（揭盅鏡頭中「盯」章貼近，86e46763..HEAD 該路徑無改動，前兩次跑同格 0）；text-fit 共同格 nw3 第 1 夜戰況 @V2 要捲 1 格（戰況 Y 比舊列表高 54px，V2 #felt 257px 放不下 311px）；p2 #8 回顧頁／#south 高度＝內容量。
- (乙) 不變：p2 #2 展開卡 1570 筆（格數多了），同型。
