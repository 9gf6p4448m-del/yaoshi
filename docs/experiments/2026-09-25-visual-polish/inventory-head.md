# 盤點：head

來源 `probe-head.json`；941 格（畫面鍵×視口）；lost 10（solo|shrine-run lost7、solo|duel lost5、hot|shrine-run lost6、hot|duel lost6、nw1|shrine-run lost8、nw1|duel lost4、nw2|shrine-run lost1、nw2|duel lost1、nw3|shrine-run lost1、nw3|duel lost1）；pageerror 0。

| 條件 | V1 | V2 | V3 | V4 | V5 | 項數 |
|---|---|---|---|---|---|---|
| #1 斷行位置 | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 33 |
| #2 文字不越框 | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 0 |
| #3 字級 ≥10px | 4/189 | 3/188 | 2/188 | 3/188 | 3/188 | 2 |
| #4 對比 | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 3 |
| #5 觸控目標 ≥40×40 | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 0 |
| #6 同列對齊 ≤2px | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 0 |
| 北列收合 (c)(d)＋(b) 項目 | 0/189 | 0/188 | 0/188 | 0/188 | 0/188 | 0 |

北列展開量測：585 格展開（各視口），逐項比對原北列文字項目 13915 項。「[展開]」標記的項目是展開狀態量到的。

格數＝「含非例外紅項的格／總格」（例外＝凍結點名的刻意兩行、句子（說明文）、disabled 元件、演出暫態；照列於下但不計紅）。

#2 判定採加嚴版（字的 content area 對容器框線內緣 >1px；嚴於字面版）。字面版（em 框對容器外框 >1px）對照格數：V1 0/189、V2 0/188、V3 0/188、V4 0/188、V5 0/188

## #1 斷行位置（33 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#mc0 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」傷\|害 [句子]` | 50 | 「夜戰：本隊攻擊無視送王船的傷 ／ 害吸收」 斷在 傷\|害（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n4@V1、hot/mark/n4@V2、hot/mark/n4@V3、hot/mark/n4@V4、hot/mark/n4@V5、hot/bid/n4@V1 |
| `#mc0 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 40 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n1@V1、hot/mark/n1@V2、hot/mark/n1@V3、hot/mark/n1@V4、hot/mark/n1@V5、hot/bid/n1@V1 |
| `#mc2 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 35 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc2 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 30 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#mc2 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」紙\|紮 [句子]` | 30 | 「第1拍：本方最高基礎攻擊紙 ／ 紮，每件攻擊 −2」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n4@V1、hot/mark/n4@V2、hot/mark/n4@V3、hot/mark/n4@V4、hot/mark/n4@V5、hot/bid/n4@V1 |
| `#mc0 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 30 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n5@V1、hot/mark/n5@V2、hot/mark/n5@V3、hot/mark/n5@V4、hot/mark/n5@V5、hot/bid/n5@V1 |
| `#mc2 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 30 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n7@V1、hot/mark/n7@V2、hot/mark/n7@V3、hot/mark/n7@V4、hot/mark/n7@V5、hot/bid/n7@V1 |
| `#mc0 > div.ab「✦ 整夜未得標任何拍品時，夜末回」末\|回 [句子]` | 25 | 「✦ 整夜未得標任何拍品時，夜末 ／ 回 2 壽命」 斷在 末\|回（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n11@V1、nw1/mark/n11@V2、nw1/mark/n11@V3、nw1/mark/n11@V4、nw1/mark/n11@V5、nw1/bid/n11@V1 |
| `#mc2 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 20 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw2/mark/n1@V1、nw2/mark/n1@V2、nw2/mark/n1@V3、nw2/mark/n1@V4、nw2/mark/n1@V5、nw2/bid/n1@V1 |
| `#mc0 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 15 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4、solo/mark/n4@V5、solo/bid/n4@V1 |
| `#mc2 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 15 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4、solo/mark/n4@V5、solo/bid/n4@V1 |
| `#mc2 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 15 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n3@V1、hot/mark/n3@V2、hot/mark/n3@V3、hot/mark/n3@V4、hot/mark/n3@V5、hot/bid/n3@V1 |
| `#mc2 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 15 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n8@V1、hot/mark/n8@V2、hot/mark/n8@V3、hot/mark/n8@V4、hot/mark/n8@V5、hot/bid/n8@V1 |
| `#mc0 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 15 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n11@V1、hot/mark/n11@V2、hot/mark/n11@V3、hot/mark/n11@V4、hot/mark/n11@V5、hot/bid/n11@V1 |
| `#mc0 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 15 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n5@V1、nw1/mark/n5@V2、nw1/mark/n5@V3、nw1/mark/n5@V4、nw1/mark/n5@V5、nw1/bid/n5@V1 |
| `#mc0 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 15 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n7@V1、nw1/mark/n7@V2、nw1/mark/n7@V3、nw1/mark/n7@V4、nw1/mark/n7@V5、nw1/bid/n7@V1 |
| `#mc1 > div.ab「✦ 被毒標塞中時，下手的人失 2」2\|壽 [句子]` | 13 | 「✦ 被毒標塞中時，下手的人失 2 ／ 壽命」 斷在 2\|壽（句子，非短標籤，不計） | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc0 > div.ab「🚫 本夜不開標・每夜末：每件失」件\|失 [句子]` | 10 | 「🚫 本夜不開標・每夜末：每件 ／ 失 1 壽命」 斷在 件\|失（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/bid/n7@V1、hot/bid/n7@V2、hot/bid/n7@V3、hot/bid/n7@V4、hot/bid/n7@V5、hot/shrine/n7@V1 |
| `#mc1 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 9 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V5；solo/mark/n6@V5、solo/bid/n6@V5、solo/shrine/n6@V5、hot/mark/n5@V5、hot/bid/n5@V5、hot/shrine/n5@V5 |
| `#mc3 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」紙\|紮 [句子]` | 8 | 「第1拍：本方最高基礎攻擊紙 ／ 紮，每件攻擊 −2」 斷在 紙\|紮（句子，非短標籤，不計） | V5；hot/mark/n2@V5、hot/bid/n2@V5、hot/shrine/n2@V5、nw1/mark/n9@V5、nw1/bid/n9@V5、nw1/shrine/n9@V5 |
| `#mc1 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 7 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V5；solo/mark/n5@V5、solo/bid/n5@V5、solo/shrine/n5@V5、nw1/mark/n1@V5、nw1/bid/n1@V5、nw1/reveal@V5 |
| `#mc1 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 6 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V5；solo/mark/n2@V5、solo/bid/n2@V5、solo/shrine/n2@V5、nw1/mark/n10@V5、nw1/bid/n10@V5、nw1/shrine/n10@V5 |
| `#mc3 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 6 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V5；hot/mark/n3@V5、hot/bid/n3@V5、hot/shrine/n3@V5、nw1/mark/n3@V5、nw1/bid/n3@V5、nw1/shrine/n3@V5 |
| `#mc1 > div.ab「✦ 整夜未得標任何拍品時，夜末回」末\|回 [句子]` | 6 | 「✦ 整夜未得標任何拍品時，夜末 ／ 回 2 壽命」 斷在 末\|回（句子，非短標籤，不計） | V5；hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5、nw1/mark/n12@V5、nw1/bid/n12@V5、nw1/shrine/n12@V5 |
| `#mc1 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 6 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V5；hot/mark/n9@V5、hot/bid/n9@V5、hot/shrine/n9@V5、nw1/mark/n6@V5、nw1/bid/n6@V5、nw1/shrine/n6@V5 |
| `#mc3 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 6 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V5；hot/mark/n12@V5、hot/bid/n12@V5、hot/shrine/n12@V5、nw1/mark/n10@V5、nw1/bid/n10@V5、nw1/shrine/n10@V5 |
| `#mc1 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 5 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V5；nw1/mark/n9@V5、nw1/bid/n9@V5、nw1/shrine/n9@V5、nw3/mark/n2@V5、nw3/bid/n2@V5 |
| `#mc3 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 4 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V5；hot/mark/n1@V5、hot/bid/n1@V5、hot/reveal@V5、hot/shrine/n1@V5 |
| `#mc3 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 3 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V5；hot/mark/n10@V5、hot/bid/n10@V5、hot/shrine/n10@V5 |
| `#mc1 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 3 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V5；nw1/mark/n4@V5、nw1/bid/n4@V5、nw1/shrine/n4@V5 |
| `#mc3 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 3 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V5；nw1/mark/n11@V5、nw1/bid/n11@V5、nw1/shrine/n11@V5 |
| `#mc3 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 3 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V5；nw1/mark/n12@V5、nw1/bid/n12@V5、nw1/shrine/n12@V5 |
| `#mc3 > div.ab「🚫 本夜不開標・每夜末：每件失」件\|失 [句子]` | 2 | 「🚫 本夜不開標・每夜末：每件 ／ 失 1 壽命」 斷在 件\|失（句子，非短標籤，不計） | V5；nw1/bid/n7@V5、nw1/shrine/n7@V5 |

## #2 文字不越框（0 項）

無。

## #3 字級 ≥10px（2 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#pwch-B > i.pwfac 9px` | 43 | 9px「香」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V2、solo/duel@V2、solo/duel@V2、solo/duel@V2、solo/duel@V2 |
| `#pwch-A > i.pwfac 9px` | 18 | 9px「肉」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V2、solo/duel@V4、solo/duel@V4、solo/duel@V4、solo/duel@V4 |

## #4 對比（3 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#mainbtn [inactive]` | 40 | 1.62:1 < 3（字 rgb(73,62,42) 底 rgb(109,93,49) opacity 0.4）「進入下一夜」〔disabled，WCAG 豁免〕 | V1 V2 V3 V4 V5；solo/event/n4@V1、solo/event/n4@V2、solo/event/n4@V3、solo/event/n4@V4、solo/event/n4@V5、solo/event/n8@V1 |
| `#pwch-B > i.pwfac [transient]` | 17 | 1:1 < 4.5（字 rgb(20,16,31) 底 rgb(22,13,41)）「陰」〔演出暫態〕 | V1 V2 V3 V4 V5；solo/duel@V2、solo/duel@V2、solo/duel@V3、solo/duel@V3、hot/duel@V1、hot/duel@V3 |
| `#pwch-A > i.pwfac [transient]` | 16 | 1:1 < 4.5（字 rgb(20,16,31) 底 rgb(30,12,31)）「香」〔演出暫態〕 | V1 V2 V3 V4 V5；solo/duel@V2、solo/duel@V2、solo/duel@V3、solo/duel@V3、hot/duel@V2、hot/duel@V3 |

## #5 觸控目標 ≥40×40（0 項）

無。

## #6 同列對齊 ≤2px（0 項）

無。

## 北列收合 (c)(d)＋(b) 項目（0 項）

無。

## #2 對照：字面版（em 框對容器外框，0 項）

| 項 | 次數 | 最大 | 出現（前 6） |
|---|---|---|---|
