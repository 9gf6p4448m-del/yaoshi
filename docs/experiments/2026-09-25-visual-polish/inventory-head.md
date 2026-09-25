# 盤點：head

來源 `probe-head.json`；891 格（畫面鍵×視口）；lost 10（solo|shrine-run lost8、solo|duel lost1、hot|shrine-run lost7、hot|duel lost1、nw1|shrine-run lost9、nw1|duel lost1、nw2|shrine-run lost1、nw2|duel lost1、nw3|shrine-run lost1、nw3|duel lost1）；pageerror 0。

| 條件 | V1 | V2 | V3 | V4 | V5 | 項數 |
|---|---|---|---|---|---|---|
| #1 斷行位置 | 0/179 | 0/179 | 0/178 | 0/178 | 0/177 | 39 |
| #2 文字不越框 | 114/179 | 114/179 | 114/178 | 114/178 | 114/177 | 8 |
| #3 字級 ≥10px | 119/179 | 119/179 | 118/178 | 118/178 | 115/177 | 19 |
| #4 對比 | 0/179 | 0/179 | 1/178 | 0/178 | 0/177 | 19 |
| #5 觸控目標 ≥40×40 | 0/179 | 0/179 | 0/178 | 0/178 | 0/177 | 0 |
| #6 同列對齊 ≤2px | 114/179 | 114/179 | 114/178 | 114/178 | 114/177 | 1 |

格數＝「含非例外紅項的格／總格」（例外＝凍結點名的刻意兩行、句子（說明文）、disabled 元件、演出暫態；照列於下但不計紅）。

#2 判定採加嚴版（字的 content area 對容器框線內緣 >1px；嚴於字面版）。字面版（em 框對容器外框 >1px）對照格數：V1 0/179、V2 0/179、V3 0/178、V4 0/178、V5 0/177

## #1 斷行位置（39 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#mc2 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 50 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc0 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 40 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#mc2 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 35 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4、solo/mark/n4@V5、solo/bid/n4@V1 |
| `#mc2 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 35 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n8@V1、hot/mark/n8@V2、hot/mark/n8@V3、hot/mark/n8@V4、hot/mark/n8@V5、hot/bid/n8@V1 |
| `#mc2 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 30 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n9@V1、solo/mark/n9@V2、solo/mark/n9@V3、solo/mark/n9@V4、solo/mark/n9@V5、solo/bid/n9@V1 |
| `#mc0 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 30 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n7@V1、hot/mark/n7@V2、hot/mark/n7@V3、hot/mark/n7@V4、hot/mark/n7@V5、hot/bid/n7@V1 |
| `#mc0 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 20 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n1@V1、hot/mark/n1@V2、hot/mark/n1@V3、hot/mark/n1@V4、hot/mark/n1@V5、hot/bid/n1@V1 |
| `#mc0 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 15 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4、solo/mark/n4@V5、solo/bid/n4@V1 |
| `#mc2 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 15 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#mc2 > div.ab「✦ 整夜未得標任何拍品時，夜末回」末\|回 [句子]` | 15 | 「✦ 整夜未得標任何拍品時，夜末 ／ 回 2 壽命」 斷在 末\|回（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n4@V1、hot/mark/n4@V2、hot/mark/n4@V3、hot/mark/n4@V4、hot/mark/n4@V5、hot/bid/n4@V1 |
| `#mc2 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 15 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n5@V1、hot/mark/n5@V2、hot/mark/n5@V3、hot/mark/n5@V4、hot/mark/n5@V5、hot/bid/n5@V1 |
| `#mc0 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」紙\|紮 [句子]` | 15 | 「第1拍：本方最高基礎攻擊紙 ／ 紮，每件攻擊 −2」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n2@V1、nw1/mark/n2@V2、nw1/mark/n2@V3、nw1/mark/n2@V4、nw1/mark/n2@V5、nw1/bid/n2@V1 |
| `#mc0 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 15 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n8@V1、nw1/mark/n8@V2、nw1/mark/n8@V3、nw1/mark/n8@V4、nw1/mark/n8@V5、nw1/bid/n8@V1 |
| `#mc2 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 15 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n9@V1、nw1/mark/n9@V2、nw1/mark/n9@V3、nw1/mark/n9@V4、nw1/mark/n9@V5、nw1/bid/n9@V1 |
| `#mc0 > div.ab「✦ 被毒標塞中時，下手的人失 2」2\|壽 [句子]` | 15 | 「✦ 被毒標塞中時，下手的人失 2 ／ 壽命」 斷在 2\|壽（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n10@V1、nw1/mark/n10@V2、nw1/mark/n10@V3、nw1/mark/n10@V4、nw1/mark/n10@V5、nw1/bid/n10@V1 |
| `#mc1 > div.ab「✦ 被毒標塞中時，下手的人失 2」2\|壽 [句子]` | 10 | 「✦ 被毒標塞中時，下手的人失 2 ／ 壽命」 斷在 2\|壽（句子，非短標籤，不計） | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc0 > div.ab「🚫 本夜不開標・每夜末：每件失」件\|失 [句子]` | 10 | 「🚫 本夜不開標・每夜末：每件 ／ 失 1 壽命」 斷在 件\|失（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/bid/n7@V1、solo/bid/n7@V2、solo/bid/n7@V3、solo/bid/n7@V4、solo/bid/n7@V5、solo/shrine/n7@V1 |
| `#mc3 > div.ab「✦ 你的押命標落標時免標額損失，」損\|失 [句子]` | 10 | 「✦ 你的押命標落標時免標額損 ／ 失，買路錢照收」 斷在 損\|失（句子，非短標籤，不計） | V5；hot/mark/n5@V5、hot/bid/n5@V5、hot/shrine/n5@V5、nw1/mark/n7@V5、nw1/bid/n7@V5、nw1/shrine/n7@V5 |
| `#mc2 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」傷\|害 [句子]` | 10 | 「夜戰：本隊攻擊無視送王船的傷 ／ 害吸收」 斷在 傷\|害（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw2/mark/n2@V1、nw2/mark/n2@V2、nw2/mark/n2@V3、nw2/mark/n2@V4、nw2/mark/n2@V5、nw2/bid/n2@V1 |
| `#mc3 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 7 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V5；hot/mark/n3@V5、hot/bid/n3@V5、hot/shrine/n3@V5、nw1/mark/n1@V5、nw1/bid/n1@V5、nw1/reveal@V5 |
| `#mc3 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」紙\|紮 [句子]` | 6 | 「第1拍：本方最高基礎攻擊紙 ／ 紮，每件攻擊 −2」 斷在 紙\|紮（句子，非短標籤，不計） | V5；hot/mark/n2@V5、hot/bid/n2@V5、hot/shrine/n2@V5、hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5 |
| `#mc1 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」傷\|害 [句子]` | 6 | 「夜戰：本隊攻擊無視送王船的傷 ／ 害吸收」 斷在 傷\|害（句子，非短標籤，不計） | V5；hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5、nw1/mark/n8@V5、nw1/bid/n8@V5、nw1/shrine/n8@V5 |
| `#mc1 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 6 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V5；hot/mark/n11@V5、hot/bid/n11@V5、hot/shrine/n11@V5、nw1/mark/n2@V5、nw1/bid/n2@V5、nw1/shrine/n2@V5 |
| `#mc2 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」紙\|紮 [句子]` | 5 | 「第1拍：本方最高基礎攻擊紙 ／ 紮，每件攻擊 −2」 斷在 紙\|紮（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n7@V1、nw1/mark/n7@V2、nw1/mark/n7@V3、nw1/mark/n7@V4、nw1/mark/n7@V5 |
| `#mc3 > div.ab「✦ 戰敗時少失 2 壽命，最低仍」失\|1 [句子]` | 4 | 「✦ 戰敗時少失 2 壽命，最低仍失 ／ 1」 斷在 失\|1（句子，非短標籤，不計） | V5；hot/mark/n1@V5、hot/bid/n1@V5、hot/reveal@V5、hot/shrine/n1@V5 |
| `#mc1 > div.ab「✦ 壽命 30 以上時，共鳴加成」額\|外 [句子]` | 3 | 「✦ 壽命 30 以上時，共鳴加成額 ／ 外 +50%」 斷在 額\|外（句子，非短標籤，不計） | V5；solo/mark/n2@V5、solo/bid/n2@V5、solo/shrine/n2@V5 |
| `#mc1 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 3 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V5；solo/mark/n5@V5、solo/bid/n5@V5、solo/shrine/n5@V5 |
| `#mc1 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 3 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V5；solo/mark/n9@V5、solo/bid/n9@V5、solo/shrine/n9@V5 |
| `#mc1 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 3 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V5；hot/mark/n10@V5、hot/bid/n10@V5、hot/shrine/n10@V5 |
| `#mc3 > div.ab「夜戰：本隊只剩 1 隻存活紙紮時」紮\|時 [句子]` | 3 | 「夜戰：本隊只剩 1 隻存活紙紮 ／ 時，該隻每次攻擊 +1」 斷在 紮\|時（句子，非短標籤，不計） | V5；hot/mark/n10@V5、hot/bid/n10@V5、hot/shrine/n10@V5 |
| `#mc3 > div.ab「✦ 被毒標塞中時，下手的人失 2」2\|壽 [句子]` | 3 | 「✦ 被毒標塞中時，下手的人失 2 ／ 壽命」 斷在 2\|壽（句子，非短標籤，不計） | V5；nw1/mark/n2@V5、nw1/bid/n2@V5、nw1/shrine/n2@V5 |
| `#mc1 > div.ab「每戰首次折損：牽連另一隻紙紮，每」紙\|紮 [句子]` | 3 | 「每戰首次折損：牽連另一隻紙 ／ 紮，每件傷害 1」 斷在 紙\|紮（句子，非短標籤，不計） | V5；nw1/mark/n3@V5、nw1/bid/n3@V5、nw1/shrine/n3@V5 |
| `#mc1 > div.ab「✦ 壽命低於 15 時，本夜共鳴」效\|果 [句子]` | 3 | 「✦ 壽命低於 15 時，本夜共鳴效 ／ 果加倍」 斷在 效\|果（句子，非短標籤，不計） | V5；nw1/mark/n4@V5、nw1/bid/n4@V5、nw1/shrine/n4@V5 |
| `#mc1 > div.ab「✦ 整夜未得標任何拍品時，夜末回」末\|回 [句子]` | 3 | 「✦ 整夜未得標任何拍品時，夜末 ／ 回 2 壽命」 斷在 末\|回（句子，非短標籤，不計） | V5；nw1/mark/n5@V5、nw1/bid/n5@V5、nw1/shrine/n5@V5 |
| `#mc3 > div.ab「夜戰：本隊精英的第二目標濺射，改」濺\|射 [句子]` | 3 | 「夜戰：本隊精英的第二目標濺 ／ 射，改為當次攻擊力全額」 斷在 濺\|射（句子，非短標籤，不計） | V5；nw1/mark/n11@V5、nw1/bid/n11@V5、nw1/shrine/n11@V5 |
| `#mc3 > div.ab「✦ 整夜未得標任何拍品時，夜末回」末\|回 [句子]` | 3 | 「✦ 整夜未得標任何拍品時，夜末 ／ 回 2 壽命」 斷在 末\|回（句子，非短標籤，不計） | V5；nw1/mark/n12@V5、nw1/bid/n12@V5、nw1/shrine/n12@V5 |
| `#mc3 > div.ab「✦ 你的毒標比價時視為 +2（實」實\|付 [句子]` | 2 | 「✦ 你的毒標比價時視為 +2（實 ／ 付不變）」 斷在 實\|付（句子，非短標籤，不計） | V5；nw3/mark/n2@V5、nw3/bid/n2@V5 |
| `#stage > div.stageCard > div.big「👹 青面攤主 以 5 壽命自保」離\|去 [句子]` | 1 | 「👹 青面攤主 以 5 壽命自保，厲鬼悻然離 ／ 去」 斷在 離\|去（句子，非短標籤，不計） | V4；nw1/event-result/n11@V4 |
| `#bub1「驚啥？妖市的驚，阮收慣矣。」慣\|矣 [句子]` | 1 | 「驚啥？妖市的驚，阮收慣 ／ 矣。」 斷在 慣\|矣（句子，非短標籤，不計） | V4；nw2/bid/n1@V4 |

## #2 文字不越框（8 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.mut` | 479 | 加嚴版超出 1.3px（B）／字面版 0px（）「盯主標還是誘餌？看底列每隻對手的反應。」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview` | 279 | 加嚴版超出 2px（T）／字面版 0px（）「👁」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V1 |
| `#northPrev > div.preview ⊃ div.preview > span.credin > b > span.mut` | 162 | 加嚴版超出 2px（T）／字面版 0px（）「（還沒有紀錄）」 | V1 V2 V3 V4 V5；solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V5、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V3 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > b` | 84 | 加嚴版超出 2px（T）／字面版 0px（）「盯上宣告」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.rulein > span.mut` | 60 | 加嚴版超出 1.3px（B）／字面版 0px（）「（詳見右上 ？）」 | V1 V2 V3 V4 V5；solo/mark/n3@V1、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n3@V4、solo/mark/n3@V5、solo/bid/n3@V1 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin` | 56 | 加嚴版超出 2px（T）／字面版 0px（）「🤝」 | V1 V2 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin > b` | 51 | 加嚴版超出 2px（T）／字面版 0px（）「你的信譽 1.00」 | V1 V2 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin > span.mut` | 4 | 加嚴版超出 2px（T）／字面版 0px（）「（近 4 次宣告；怎麼算看 ？）」 | V5；solo/mark/n1@V5、nw1/mark/n1@V5、nw2/mark/n1@V5、nw3/mark/n1@V5 |

## #3 字級 ≥10px（19 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#shrines > div.incboard > span.ibh > span 7.5px` | 1440 | 7.5px「南」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.incboard > span.ibh > span > b 7.5px` | 1440 | 7.5px「0」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.shcards > div.shcard > span.shname > span.shn 8px` | 1320 | 8px「殘日」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.shcards > div.shcard > span.shname > span.shfac 8px` | 1320 | 8px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2、solo/mark/n1@V2 |
| `#shrines > div.incboard > span.ibh > span.on 7.5px` | 840 | 7.5px「北」 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V2、solo/mark/n2@V2 |
| `div.incboard > span.ibh > span.on > b 7.5px` | 840 | 7.5px「1」 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V2、solo/mark/n2@V2 |
| `#shrines > div.incboard > span.ibgap 8px` | 570 | 8px「你 0・平手」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#shrines > div.shcards > div.shcard > span.shmove 8px` | 510 | 8px「餘暉灼目」 | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V1、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V2、solo/mark/n4@V2 |
| `#shrines > div.incboard > span.ibwhen 8px` | 450 | 8px「第 5 夜請神・倒數 4 夜」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#northPrev > div.preview 8.5px` | 445 | 8.5px「🔮 明夜預告：「雷女之火」」 | V1 V2 V3 V4 V5；solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V3、solo/bid/n1@V4、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V1 |
| `div.shcards > div.shcard.gone > span.shname > span.shn 8px` | 390 | 8px「殘日」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `div.shcards > div.shcard.gone > span.shname > span.shfac 8px` | 390 | 8px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#shrines > div.shcards > div.shcard.gone > span.shtaken 8px` | 390 | 8px「已請走：西家」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#northPrev > div.preview > span.rulein > b 8.5px` | 195 | 8.5px「今夜市集規則：落魄夜」 | V1 V2 V3 V4 V5；solo/mark/n3@V1、solo/mark/n3@V1、solo/mark/n3@V2、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n3@V3 |
| `#northPrev > div.preview > b 8.5px` | 180 | 8.5px「盯上宣告」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/mark/n2@V1 |
| `#northPrev > div.preview > span.credin > b 8.5px` | 180 | 8.5px「你的信譽 1.00」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/mark/n2@V1 |
| `#shrines > div.incboard > span.ibwhen > b 8px` | 120 | 8px「今夜請神」 | V1 V2 V3 V4 V5；solo/mark/n5@V1、solo/mark/n5@V2、solo/mark/n5@V3、solo/mark/n5@V4、solo/mark/n5@V5、solo/bid/n5@V1 |
| `#pwch-B > i.pwfac 9px` | 21 | 9px「祖」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V2、solo/duel@V3、solo/duel@V4、solo/duel@V5、hot/duel@V1 |
| `#pwch-A > i.pwfac 9px` | 19 | 9px「肉」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V2、solo/duel@V3、solo/duel@V4、solo/duel@V5、hot/duel@V1 |

## #4 對比（19 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#mainbtn [inactive]` | 40 | 1.62:1 < 3（字 rgb(73,62,42) 底 rgb(109,93,49) opacity 0.4）「進入下一夜」〔disabled，WCAG 豁免〕 | V1 V2 V3 V4 V5；solo/event/n4@V1、solo/event/n4@V2、solo/event/n4@V3、solo/event/n4@V4、solo/event/n4@V5、solo/event/n8@V1 |
| `#pwch-B > i.pwfac [transient]` | 9 | 1.01:1 < 4.5（字 rgb(20,16,31) 底 rgb(21,17,33)）「祖」〔演出暫態〕 | V2 V3 V4 V5；solo/duel@V3、solo/duel@V5、solo/duel@V5、hot/duel@V2、nw1/duel@V2、nw1/duel@V3 |
| `#pwch-A > i.pwfac [transient]` | 8 | 1.02:1 < 4.5（字 rgb(20,16,31) 底 rgb(16,11,37)）「香」〔演出暫態〕 | V2 V3 V4 V5；solo/duel@V3、solo/duel@V5、hot/duel@V2、nw1/duel@V2、nw1/duel@V4、nw2/duel@V2 |
| `#flyzone > div.bidfly > span [transient]` | 4 | 1.01:1 < 4.5（字 rgb(58,15,37) 底 rgb(57,14,36) opacity 0.01）「⚖ 1 人比標」〔演出暫態〕 | V1；hot/reveal@V1、hot/reveal@V1、nw3/reveal@V1、nw3/reveal@V1 |
| `#flyzone > div.bidPills > span.bidPill.win [transient]` | 3 | 1.03:1 < 4.5（字 rgb(53,15,29) 底 rgb(59,15,33) opacity 0.16）「普渡爐主：3🪙 👑」〔演出暫態〕 | V1；solo/reveal@V1、hot/reveal@V1、nw3/reveal@V1 |
| `#mainbtn [transient]` | 3 | 2.9:1 < 3（字 rgb(20,16,31) 底 rgb(109,93,51)）「下一件拍品 ▸」〔演出暫態〕 | V1；solo/reveal@V1、hot/reveal@V1、nw3/reveal@V1 |
| `#dL > div.fdir [transient]` | 3 | 3.51:1 < 4.5（字 rgb(142,106,63) 底 rgb(52,13,31) opacity 0.5）「北家」〔演出暫態〕 | V2 V4；nw1/duel@V4、nw3/duel@V2、nw3/duel@V4 |
| `#outzone > div.outcome [transient]` | 2 | 1.34:1 < 4.5（字 rgb(45,38,52) 底 rgb(8,6,43) opacity 0.16）「普渡爐主 買下銷毀（自保）」〔演出暫態〕 | V1；solo/reveal@V1、hot/reveal@V1 |
| `#dL > div.fnm [transient]` | 2 | 3.89:1 < 4.5（字 rgb(240,232,216) 底 rgb(146,108,58)）「普渡爐主」〔演出暫態〕 | V2 V5；hot/duel@V5、nw3/duel@V2 |
| `#dR > div.fdir [transient]` | 2 | 3.36:1 < 4.5（字 rgb(142,119,63) 底 rgb(52,38,31) opacity 0.5）「西家」〔演出暫態〕 | V2 V3；nw1/duel@V3、nw3/duel@V2 |
| `#revealCard > div.big > span.fchip.f-xianghuo [transient]` | 1 | 1.1:1 < 4.5（字 rgb(26,16,32) 底 rgb(54,14,37) opacity 0.83）「香火」〔演出暫態〕 | V1；solo/reveal@V1 |
| `#flyzone > div.bidPills > span.mut [transient]` | 1 | 2.7:1 < 4.5（字 rgb(197,145,182) 底 rgb(174,31,22) opacity 0.74）「vs」〔演出暫態〕 | V1；hot/reveal@V1 |
| `#pwch-A > i.pwfac` | 1 | 1.04:1 < 4.5（字 rgb(20,16,31) 底 rgb(14,9,29)）「香」 | V3；nw1/duel@V3 |
| `#dL > div.fdir > span [transient]` | 1 | 4.2:1 < 4.5（字 rgb(132,113,60) 底 rgb(10,6,17) opacity 0.55）「・南風」〔演出暫態〕 | V4；nw1/duel@V4 |
| `#revealCard > div.big [transient]` | 1 | 1.54:1 < 4.5（字 rgb(110,65,71) 底 rgb(85,32,42) opacity 0.16）「獻祭刀」〔演出暫態〕 | V1；nw3/reveal@V1 |
| `#revealCard > div.big > span.fchip.f-zuling [transient]` | 1 | 1.01:1 < 4.5（字 rgb(36,13,41) 底 rgb(39,12,43) opacity 0.16）「祖靈」〔演出暫態〕 | V1；nw3/reveal@V1 |
| `#revealCard > div.big > span.mut [transient]` | 1 | 1.4:1 < 4.5（字 rgb(66,40,75) 底 rgb(39,12,43) opacity 0.16）「✦ 出價階段可放血：第 n 次花 2×n 壽命，所有存活對手」〔演出暫態〕 | V1；nw3/reveal@V1 |
| `#revealCard > div.mut [transient]` | 1 | 1.4:1 < 4.5（字 rgb(74,41,72) 底 rgb(48,13,40) opacity 0.16）「1 人出價」〔演出暫態〕 | V1；nw3/reveal@V1 |
| `#dR > div.fnm [transient]` | 1 | 4.45:1 < 4.5（字 rgb(134,127,130) 底 rgb(28,22,45) opacity 0.5）「普渡爐主」〔演出暫態〕 | V2；nw3/duel@V2 |

## #5 觸控目標 ≥40×40（0 項）

無。

## #6 同列對齊 ≤2px（1 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `north` | 570 | 上緣差 21.6・下緣差 21.6・高度差 43.3｜#northPrev（格內有框聯集） 24-40；#northSeat（格內有框聯集） 4-60；#northShr（格內有框聯集） 3-61 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |

## #2 對照：字面版（em 框對容器外框，0 項）

| 項 | 次數 | 最大 | 出現（前 6） |
|---|---|---|---|
