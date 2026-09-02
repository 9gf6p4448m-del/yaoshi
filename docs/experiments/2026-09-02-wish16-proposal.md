# 心願牌庫餘 16 張——提案（2026-09-02，待使用者裁定；基準 365230a）

事實依據：GAME_DESIGN §六之三 D 只寫 8 張，餘 16 張無規格（「照同樣格式擴充」）。
引擎能判定的本夜統計＝S.wishNight（index.html:1661）：wonCount/wonFacs/yamingLost/poisonHit/totalBid/battleWin/extLoss。
新牌要新增的統計皆為純記錄（不耗亂數、不改結算），標 ★。

## 甲・法寶／陣營類
| # | id | 名 | 條件 | 獎 | canDraw 排除 | AI hook | 新統計 |
|---|---|---|---|---|---|---|---|
| 9 | wish_zuling | 祖靈召喚 | 得標任一祖靈法寶入袋 | +4 | 市場無祖靈 | onAiValue 祖靈 +4 | — |
| 10 | wish_xianghuo | 香火鼎盛 | 得標任一香火法寶入袋 | +4 | 市場無香火 | onAiValue 香火 +4 | — |
| 11 | wish_trinity | 三教歸一 | 本夜有得標，且夜末袋中三系各≥1 | +5 | 袋已三系齊／缺的系市場上沒有 | onAiValue 缺系 +5 | — |
| 12 | wish_bigfish | 一擲千金 | 得標一件戰力≥T(6) 的非詛咒法寶 | +4 | 市場無 p≥T | onAiValue p≥T +4 | ★bigWin |

## 乙・出價行為類
| # | id | 名 | 條件 | 獎 | canDraw 排除 | AI hook | 新統計 |
|---|---|---|---|---|---|---|---|
| 13 | wish_allin | 孤注一擲 | 本夜只下 1 筆有效標且得標 | +4 | 押寶夜(singleStake) | onAiPlan maxPicks=1 | ★bidCount |
| 14 | wish_bargain | 撿漏 | 以出價≤T(2) 得標任一非詛咒法寶 | +4 | — | onAiAmount amt=min(amt,T)、maxPicks=3 | ★cheapWin |
| 15 | wish_yamingwin | 押命得手 | 以押命標得標≥1 件 | +4 | — | onAiAmount type=yaming | ★yamingWon |
| 16 | wish_solo | 獨行俠 | 得標一件無人與你競標的拍品（nBids=1） | +3 | — | onAiValue 冷門(估值低者)+3 | ★soloWin |

## 丙・對手／互動類
| # | id | 名 | 條件 | 獎 | canDraw 排除 | AI hook | 新統計 |
|---|---|---|---|---|---|---|---|
| 17 | wish_rival | 隔岸觀火 | 抽卡當下壽命最高的對手，本夜非自願失血≥T(4) | +4 | 無存活對手 | onAiCurse 毒標鎖該對手 | p.wish.target |
| 18 | wish_crowd | 虎口奪食 | 得標一件≥2 位對手同時出價的拍品（nBids≥3） | +5 | — | onAiValue 高估值品 +3 | ★crowdWin |
| 19 | wish_poisonrival | 禍水東引 | 毒標命中抽卡當下壽命最高的對手 | +5 | 同借刀傷人＋無對手 | onAiCurse intent=poison target=該對手 | p.wish.target |
| 20 | wish_bloodbath | 血流成河 | 至少 2 位對手本夜非自願失血各≥T(3) | +4 | 存活對手<2 | onAiCurse 毒標鎖戰力最高者 | — |

## 丁・戰場／壽命類
| # | id | 名 | 條件 | 獎 | canDraw 排除 | AI hook | 新統計 |
|---|---|---|---|---|---|---|---|
| 21 | wish_unscathed | 全身而退 | 本夜非自願失血 0（對決不敗、袋中無侵蝕） | +3 | 輪空者／袋中有 drain 品 | onAiValue 非詛咒 +2 | — |
| 22 | wish_crush | 大獲全勝 | 結算戰造成傷害≥T(5) | +4 | 輪空者 | onAiValue 非詛咒 +3 | ★dmgDealt |
| 23 | wish_comeback | 東山再起 | 抽卡當下壽命全場最低，且本夜得標任一件 | +5 | 非最低者（同分不發） | onAiValue 全品 +3 | — |
| 24 | wish_exorcise | 驅邪 | 買下銷毀一件詛咒品 | +3 | 市場無詛咒品／收祟夜(禁銷毀) | onAiCurse intent=keep | ★destroyed |

## 驗收條件（凍結草案，使用者同意後寫進 docs/experiments/）
1. WISH_ON=false ⇒ trace(1..20) 與 365230a 逐位元組相等；true ⇒ 必不相等（雙向）
2. 執行期只留原 8 張 id（delete 新 16 鍵）⇒ trace 與 365230a 相等（證明舊牌行為未動）
3. 單元測試：16 張 × 達成／未達成 ＝ 32 案雙向綠；對 365230a 版跑必紅（新牌不存在）
4. 平衡 n≥10000：每張達成率 15%~80%；每張條件勝率（持有者該局勝率）45%~65%；三策略位移 ≤1.5pp
5. Math.random=0；正常頁 2 局＋?sim=1 console 0 error；844×390 心願列無溢出（最長 desc）
6. VERSION 改 0.8；push 後 curl 核對 VERSION 字串
