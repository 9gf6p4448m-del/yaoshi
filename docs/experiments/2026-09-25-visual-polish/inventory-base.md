# 盤點：base-e29a753

來源 `probe-base-e29a753.json`；894 格（畫面鍵×視口）；lost 10（solo|shrine-run lost8、solo|duel lost1、hot|shrine-run lost7、hot|duel lost2、nw1|shrine-run lost9、nw1|duel lost3、nw2|shrine-run lost1、nw2|duel lost1、nw3|shrine-run lost1、nw3|duel lost1）；pageerror 0。

| 條件 | V1 | V2 | V3 | V4 | V5 | 項數 |
|---|---|---|---|---|---|---|
| #1 斷行位置 | 149/180 | 84/179 | 146/179 | 162/178 | 39/178 | 95 |
| #2 文字不越框 | 114/180 | 114/179 | 114/179 | 115/178 | 114/178 | 11 |
| #3 字級 ≥10px | 171/180 | 170/179 | 170/179 | 169/178 | 169/178 | 62 |
| #4 對比 | 87/180 | 88/179 | 89/179 | 89/178 | 111/178 | 38 |
| #5 觸控目標 ≥40×40 | 170/180 | 170/179 | 170/179 | 170/178 | 170/178 | 23 |
| #6 同列對齊 ≤2px | 114/180 | 114/179 | 114/179 | 114/178 | 114/178 | 3 |

格數＝「含非例外紅項的格／總格」（例外＝凍結點名的刻意兩行、句子（說明文）、disabled 元件、演出暫態；照列於下但不計紅）。

#2 判定採加嚴版（字的 content area 對容器框線內緣 >1px；嚴於字面版）。字面版（em 框對容器外框 >1px）對照格數：V1 8/180、V2 1/179、V3 7/179、V4 14/178、V5 0/178

## #1 斷行位置（95 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#south > button.side「袋子」袋\|子` | 572 | 「袋 ／ 子」 斷在 袋\|子 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/bid/n1@V1、solo/bid/n1@V2 |
| `#myPow「部隊 1 隻・攻 1・血 3」攻\|1` | 198 | 「部隊 1 隻・攻 ／ 1・血 3」 斷在 攻\|1 | V1 V2 V3 V4 V5；solo/mark/n1@V4、solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V3、solo/modal:南家・青面攤主（@V1、solo/modal:南家・青面攤主（@V2 |
| `#myPow「部隊 1 隻・攻 1・血 3」血\|3` | 134 | 「部隊 1 隻・攻 1・血 ／ 3」 斷在 血\|3 | V1 V2 V3 V5；solo/mark/n1@V2、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V1 |
| `#mainbtn「蓋牌開標」牌\|開 [例外]` | 92 | 「蓋牌 ／ 開標」 斷在 牌\|開（凍結點名例外） | V1 V2 V3 V4；solo/bid/n1@V1、solo/bid/n1@V3、solo/bid/n1@V4、solo/modal:南家・青面攤主（@V1、solo/modal:南家・青面攤主（@V3、solo/modal:南家・青面攤主（@V4 |
| `#mainbtn「🕯️ 請神」請\|神` | 82 | 「🕯️ 請 ／ 神」 斷在 請\|神 | V1 V2 V3 V4；solo/shrine/n1@V4、solo/shrine/n2@V1、solo/shrine/n2@V3、solo/shrine/n2@V4、solo/shrine/n3@V4、solo/shrine/n4@V1 |
| `#mc0 > div.ab「每次戰敗：每件額外失 1 壽命（」減\|傷 [句子]` | 80 | 「每次戰敗：每件額外失 1 壽命（減 ／ 傷前）」 斷在 減\|傷（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mainbtn「進入下一夜」一\|夜` | 74 | 「進入下一 ／ 夜」 斷在 一\|夜 | V1 V2 V3 V4；solo/night-end/n1@V1、solo/night-end/n1@V3、solo/night-end/n1@V4、solo/event/n4@V1、solo/event/n4@V3、solo/event/n4@V4 |
| `#myDir「南・青面攤主」攤\|主` | 73 | 「南・青面攤 ／ 主」 斷在 攤\|主 | V1 V2 V3 V4 V5；solo/mark/n1@V2、solo/mark/n1@V3、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5 |
| `#myDir「南・紅衣婆婆」婆\|婆` | 73 | 「南・紅衣婆 ／ 婆」 斷在 婆\|婆 | V1 V2 V3 V4 V5；nw1/mark/n1@V1、nw1/mark/n1@V3、nw1/bid/n1@V5、nw1/reveal@V1、nw1/reveal@V3、nw1/shrine/n1@V4 |
| `#mainbtn「不盯任何一件」一\|件` | 71 | 「不盯任何一 ／ 件」 斷在 一\|件 | V1 V2 V3；solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n2@V2、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n4@V2 |
| `#myDir「南・青面攤主」面\|攤` | 61 | 「南・青面 ／ 攤主」 斷在 面\|攤 | V1 V2 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V3、solo/modal:南家・青面攤主（@V1 |
| `#myDir「南・玩家一・青面攤主」面\|攤` | 61 | 「南・玩家一・青面 ／ 攤主」 斷在 面\|攤 | V1 V3 V4 V5；hot/mark/n1@V1、hot/bid/n1@V4、hot/bid/n1@V5、hot/reveal@V1、hot/reveal@V3、hot/shrine/n1@V1 |
| `#mainbtn「不盯任何一件」何\|一` | 55 | 「不盯任何 ／ 一件」 斷在 何\|一 | V1 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n2@V1、solo/mark/n2@V3、solo/mark/n3@V1、solo/mark/n3@V4 |
| `#mainbtn「蓋牌開標」開\|標` | 51 | 「蓋牌開 ／ 標」 斷在 開\|標 | V1 V2 V3 V4 V5；solo/bid/n1@V2、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V2、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V2、solo/modal:北家・收驚婆@V5 |
| `#myDir「南・紅衣婆婆」衣\|婆` | 45 | 「南・紅衣 ／ 婆婆」 斷在 衣\|婆 | V1 V2 V3 V4；nw1/mark/n1@V4、nw1/bid/n1@V1、nw1/bid/n1@V2、nw1/bid/n1@V3、nw1/reveal@V4、nw1/night-end/n1@V4 |
| `#myDir「南・玩家一・青面攤主」攤\|主` | 44 | 「南・玩家一・青面攤 ／ 主」 斷在 攤\|主 | V1 V2 V3；hot/mark/n1@V3、hot/bid/n1@V1、hot/bid/n1@V3、hot/reveal@V2、hot/shrine/n1@V3、hot/reveal-result@V1 |
| `#mc2 > div.ab「✦ 被毒標塞中時，下手的人失 2」壽\|命 [句子]` | 35 | 「✦ 被毒標塞中時，下手的人失 2 壽 ／ 命」 斷在 壽\|命（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n6@V1、nw1/mark/n6@V2、nw1/mark/n6@V3、nw1/mark/n6@V4、nw1/mark/n6@V5、nw1/bid/n6@V1 |
| `#mc2 > div.ab「✦ 整夜未得標任何拍品時，夜末回」回\|2 [句子]` | 30 | 「✦ 整夜未得標任何拍品時，夜末回 ／ 2 壽命」 斷在 回\|2（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n4@V1、hot/mark/n4@V2、hot/mark/n4@V3、hot/mark/n4@V4、hot/mark/n4@V5、hot/bid/n4@V1 |
| `#mc0 > div.ab「✦ 壽命低於 15 時，本夜共鳴」加\|倍 [句子]` | 30 | 「✦ 壽命低於 15 時，本夜共鳴效果加 ／ 倍」 斷在 加\|倍（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n7@V1、hot/mark/n7@V2、hot/mark/n7@V3、hot/mark/n7@V4、hot/mark/n7@V5、hot/bid/n7@V1 |
| `#myDir「南・玩家一・青面攤主」青\|面` | 26 | 「南・玩家一・青 ／ 面攤主」 斷在 青\|面 | V1 V4；hot/mark/n1@V4、hot/shrine/n1@V4、hot/reveal-result@V4、hot/night-end/n1@V4、hot/mark/n3@V4、hot/shrine/n3@V4 |
| `#mainbtn「進入下一夜」下\|一` | 23 | 「進入下 ／ 一夜」 斷在 下\|一 | V1 V3 V4；solo/night-end/n5@V4、solo/night-end/n6@V4、solo/event/n8@V4、hot/night-end/n1@V4、hot/night-end/n2@V1、hot/night-end/n2@V4 |
| `#myDir「南・玩家一・青面攤主」家\|一` | 23 | 「南・玩家 ／ 一・青面攤 ／ 主」 斷在 家\|一 | V1 V3 V4；hot/bid/n1@V1、hot/bid/n1@V3、hot/bid/n1@V4、hot/bid/n3@V1、hot/bid/n3@V3、hot/bid/n3@V4 |
| `#mainbtn「蓋牌，交給下一位」交\|給` | 20 | 「蓋牌，交 ／ 給下一位」 斷在 交\|給 | V1 V3；hot/bid/n1@V1、hot/bid/n1@V3、hot/bid/n2@V1、hot/bid/n2@V3、hot/bid/n3@V1、hot/bid/n3@V3 |
| `#mainbtn「蓋牌，交給下一位」下\|一` | 20 | 「蓋牌， ／ 交給下 ／ 一位」 斷在 下\|一 | V4 V5；hot/bid/n1@V4、hot/bid/n1@V5、hot/bid/n2@V4、hot/bid/n2@V5、hot/bid/n3@V4、hot/bid/n3@V5 |
| `#mc0 > div.ab「✦ 你的毒標比價時視為 +2（實」不\|變 [句子]` | 20 | 「✦ 你的毒標比價時視為 +2（實付不 ／ 變）」 斷在 不\|變（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n1@V1、nw1/mark/n1@V2、nw1/mark/n1@V3、nw1/mark/n1@V4、nw1/mark/n1@V5、nw1/bid/n1@V1 |
| `#mc2 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」害\|吸 [句子]` | 20 | 「夜戰：本隊攻擊無視送王船的傷害 ／ 吸收」 斷在 害\|吸（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw2/mark/n1@V1、nw2/mark/n1@V2、nw2/mark/n1@V3、nw2/mark/n1@V4、nw2/mark/n1@V5、nw2/bid/n1@V1 |
| `#myDir「南・青面攤主」青\|面` | 19 | 「南・青 ／ 面攤主」 斷在 青\|面 | V1 V3 V4；solo/bid/n1@V4、solo/modal:南家・青面攤主（@V4、solo/modal:北家・收驚婆@V4、solo/modal:？ 妖市規則@V4、solo/bid/n3@V4、solo/bid/n4@V1 |
| `#mainbtn「前往拍賣」拍\|賣` | 19 | 「前往拍 ／ 賣」 斷在 拍\|賣 | V1 V2 V3 V4；solo/event-result/n4@V1、solo/event-result/n4@V4、solo/event-result/n8@V1、solo/event-result/n8@V3、solo/event-result/n8@V4、hot/event-result/n4@V1 |
| `#myDir「南・紅衣婆婆（南風）」南\|風` | 17 | 「南・紅衣婆婆（南 ／ 風）」 斷在 南\|風 | V1 V2 V3 V5；nw1/mark/n2@V1、nw1/mark/n2@V3、nw1/bid/n2@V5、nw1/shrine/n2@V1、nw1/night-end/n2@V1、nw1/night-end/n2@V3 |
| `#myDir「南・青面攤主（南風）」南\|風` | 15 | 「南・青面攤主（南 ／ 風）」 斷在 南\|風 | V1 V2 V3 V5；solo/mark/n2@V2、solo/bid/n2@V5、solo/shrine/n2@V1、solo/mark/n6@V2、solo/bid/n6@V5、solo/shrine/n6@V1 |
| `#mc2 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」每\|件 [句子]` | 15 | 「第1拍：本方最高基礎攻擊紙紮，每 ／ 件攻擊 −2」 斷在 每\|件（句子，非短標籤，不計） | V1 V2 V3 V4 V5；solo/mark/n8@V1、solo/mark/n8@V2、solo/mark/n8@V3、solo/mark/n8@V4、solo/mark/n8@V5、solo/bid/n8@V1 |
| `#mc0 > div.ab「✦ 你的保守標上限提高 50%（」下\|取 [句子]` | 15 | 「✦ 你的保守標上限提高 50%（向下 ／ 取整）」 斷在 下\|取（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n2@V1、hot/mark/n2@V2、hot/mark/n2@V3、hot/mark/n2@V4、hot/mark/n2@V5、hot/bid/n2@V1 |
| `#mc2 > div.ab「✦ 你的毒標比價時視為 +2（實」不\|變 [句子]` | 15 | 「✦ 你的毒標比價時視為 +2（實付不 ／ 變）」 斷在 不\|變（句子，非短標籤，不計） | V1 V2 V3 V4 V5；hot/mark/n5@V1、hot/mark/n5@V2、hot/mark/n5@V3、hot/mark/n5@V4、hot/mark/n5@V5、hot/bid/n5@V1 |
| `#mc2 > div.ab「每次戰敗：每件額外失 1 壽命（」減\|傷 [句子]` | 15 | 「每次戰敗：每件額外失 1 壽命（減 ／ 傷前）」 斷在 減\|傷（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n3@V1、nw1/mark/n3@V2、nw1/mark/n3@V3、nw1/mark/n3@V4、nw1/mark/n3@V5、nw1/bid/n3@V1 |
| `#mc0 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」害\|吸 [句子]` | 15 | 「夜戰：本隊攻擊無視送王船的傷害 ／ 吸收」 斷在 害\|吸（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n11@V1、nw1/mark/n11@V2、nw1/mark/n11@V3、nw1/mark/n11@V4、nw1/mark/n11@V5、nw1/bid/n11@V1 |
| `#mc2 > div.ab「✦ 你的保守標上限提高 50%（」下\|取 [句子]` | 15 | 「✦ 你的保守標上限提高 50%（向下 ／ 取整）」 斷在 下\|取（句子，非短標籤，不計） | V1 V2 V3 V4 V5；nw1/mark/n11@V1、nw1/mark/n11@V2、nw1/mark/n11@V3、nw1/mark/n11@V4、nw1/mark/n11@V5、nw1/bid/n11@V1 |
| `#myDir「南・紅衣婆婆」紅\|衣` | 13 | 「南・紅 ／ 衣婆婆」 斷在 紅\|衣 | V1 V3 V4；nw1/bid/n1@V4、nw1/bid/n3@V4、nw1/bid/n4@V4、nw1/bid/n5@V4、nw1/bid/n7@V4、nw1/bid/n8@V1 |
| `#myPow「部隊 1 隻・攻 1・血 3」1\|隻` | 12 | 「部隊 1 ／ 隻・攻 1・ ／ 血 3」 斷在 1\|隻 | V4；solo/bid/n6@V4、hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V4、hot/bid/n4@V4、hot/bid/n5@V4 |
| `#mainbtn「再入妖市」妖\|市` | 12 | 「再入妖 ／ 市」 斷在 妖\|市 | V1 V2 V3 V4；solo/end@V1、solo/end@V3、solo/end@V4、solo/review@V1、solo/review@V3、solo/review@V4 |
| `#myDir「南・玩家一・青面攤主（南風）」南\|風` | 11 | 「南・玩家一・青面攤主（南 ／ 風）」 斷在 南\|風 | V2 V4；hot/mark/n2@V2、hot/bid/n2@V4、hot/shrine/n2@V2、hot/night-end/n2@V2、hot/mark/n6@V2、hot/bid/n6@V4 |
| `#mc1 > div.ab「✦ 被毒標塞中時，下手的人失 2」壽\|命 [句子]` | 10 | 「✦ 被毒標塞中時，下手的人失 2 壽 ／ 命」 斷在 壽\|命（句子，非短標籤，不計） | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mainbtn「蓋牌，交給下一位」給\|下` | 10 | 「蓋牌，交給 ／ 下一位」 斷在 給\|下 | V2；hot/bid/n1@V2、hot/bid/n2@V2、hot/bid/n3@V2、hot/bid/n4@V2、hot/bid/n5@V2、hot/bid/n6@V2 |
| `#mc3 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」每\|件 [句子]` | 9 | 「第1拍：本方最高基礎攻擊紙紮，每 ／ 件攻擊 −2」 斷在 每\|件（句子，非短標籤，不計） | V5；hot/mark/n2@V5、hot/bid/n2@V5、hot/shrine/n2@V5、hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5 |
| `#myPow「部隊 1 隻・攻 1・血 3・�」血\|3` | 9 | 「部隊 1 隻・攻 1・血 ／ 3・💀出局」 斷在 血\|3 | V1 V2 V3 V4；hot/night-end/n10@V1、hot/night-end/n10@V3、hot/event/n11@V4、hot/event-result/n11@V4、hot/mark/n11@V4、hot/bid/n11@V2 |
| `#mainbtn「開戰」開\|戰` | 8 | 「開 ／ 戰」 斷在 開\|戰 | V1 V3 V4；solo/reveal-result@V4、hot/reveal-result@V1、hot/reveal-result@V3、hot/reveal-result@V4、hot/duel@V4、nw1/reveal-result@V4 |
| `#myPow「部隊 1 隻・攻 1・血 3・�」出\|局` | 8 | 「部隊 1 隻・攻 1・血 3・💀出 ／ 局」 斷在 出\|局 | V2 V3 V4；solo/end@V3、solo/review@V3、hot/event-result/n11@V2、hot/mark/n11@V2、hot/bid/n11@V4、hot/shrine/n11@V2 |
| `#myDir「南・玩家一・青面攤主（南風）」攤\|主` | 8 | 「南・玩家一・青面攤 ／ 主（南風）」 斷在 攤\|主 | V4；hot/mark/n2@V4、hot/shrine/n2@V4、hot/night-end/n2@V4、hot/mark/n6@V4、hot/shrine/n6@V4、hot/night-end/n6@V4 |
| `#myLife「命懸一線」一\|線` | 7 | 「命懸一 ／ 線」 斷在 一\|線 | V1 V2 V3 V4；hot/mark/n9@V4、hot/bid/n9@V1、hot/bid/n9@V2、hot/bid/n9@V3、hot/shrine/n9@V4、hot/night-end/n9@V4 |
| `#mc3 > div.ab「✦ 被毒標塞中時，下手的人失 2」壽\|命 [句子]` | 7 | 「✦ 被毒標塞中時，下手的人失 2 壽 ／ 命」 斷在 壽\|命（句子，非短標籤，不計） | V5；nw1/mark/n10@V5、nw1/bid/n10@V5、nw1/shrine/n10@V5、nw2/mark/n1@V5、nw2/bid/n1@V5、nw2/reveal@V5 |
| `#mc3 > div.ab「✦ 你的保守標上限提高 50%（」下\|取 [句子]` | 6 | 「✦ 你的保守標上限提高 50%（向下 ／ 取整）」 斷在 下\|取（句子，非短標籤，不計） | V5；solo/mark/n7@V5、solo/bid/n7@V5、solo/shrine/n7@V5、hot/mark/n7@V5、hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#myDir「南・玩家一・青面攤主（南風）」青\|面` | 6 | 「南・玩家一・青 ／ 面攤主（南風）」 斷在 青\|面 | V1 V3；hot/bid/n2@V1、hot/bid/n2@V3、hot/bid/n6@V1、hot/bid/n6@V3、hot/bid/n10@V1、hot/bid/n10@V3 |
| `#mc1 > div.ab「夜戰：本隊攻擊無視送王船的傷害吸」害\|吸 [句子]` | 6 | 「夜戰：本隊攻擊無視送王船的傷害 ／ 吸收」 斷在 害\|吸（句子，非短標籤，不計） | V5；hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5、nw1/mark/n5@V5、nw1/bid/n5@V5、nw1/shrine/n5@V5 |
| `#mainbtn「下一件拍品 ▸」拍\|品` | 5 | 「下一件拍 ／ 品 ▸」 斷在 拍\|品 | V4；solo/reveal@V4、hot/reveal@V4、nw1/reveal@V4、nw2/reveal@V4、nw3/reveal@V4 |
| `#reviewbox > div.rvTiles > div.rvTile > div.w「最多：東・孝女白琴 2 次」2\|次` | 5 | 「最多：東・孝女白琴 2 ／ 次」 斷在 2\|次 | V1 V2 V3 V4 V5；solo/review@V1、solo/review@V2、solo/review@V3、solo/review@V4、solo/review@V5 |
| `#mainbtn「不盯任何一件」任\|何` | 4 | 「不盯任 ／ 何一件」 斷在 任\|何 | V4；solo/mark/n2@V4、solo/mark/n6@V4、nw1/mark/n10@V4、nw3/mark/n2@V4 |
| `#myDir「南・青面攤主（南風）」攤\|主` | 4 | 「南・青面攤 ／ 主（南風）」 斷在 攤\|主 | V4；solo/bid/n2@V4、solo/bid/n6@V4、nw2/bid/n2@V4、nw3/bid/n2@V4 |
| `#myDir「南・玩家一・青面攤主（南風）」面\|攤` | 4 | 「南・玩家一・青面 ／ 攤主（南風）」 斷在 面\|攤 | V2 V4；hot/bid/n2@V2、hot/bid/n6@V2、hot/bid/n10@V2、hot/night-end/n10@V4 |
| `#mainbtn「回章節選單」選\|單` | 4 | 「回章節選 ／ 單」 斷在 選\|單 | V1 V3；nw1/end@V1、nw1/end@V3、nw1/nw-scroll@V1、nw1/nw-scroll@V3 |
| `#mc3 > div.ab「✦ 你的毒標比價時視為 +2（實」不\|變 [句子]` | 3 | 「✦ 你的毒標比價時視為 +2（實付不 ／ 變）」 斷在 不\|變（句子，非短標籤，不計） | V5；solo/mark/n6@V5、solo/bid/n6@V5、solo/shrine/n6@V5 |
| `#myPow「部隊 1 隻・攻 1・血 3・�」💀\|出` | 3 | 「部隊 1 隻・攻 1・血 3・💀 ／ 出局」 斷在 💀\|出 | V1 V2；solo/end@V1、solo/review@V1、hot/event/n11@V2 |
| `#mainbtn「前往拍賣」往\|拍` | 3 | 「前往 ／ 拍賣」 斷在 往\|拍 | V4；hot/event-result/n4@V4、hot/event-result/n8@V4、hot/event-result/n11@V4 |
| `#mc1 > div.ab「✦ 你的保守標上限提高 50%（」下\|取 [句子]` | 3 | 「✦ 你的保守標上限提高 50%（向下 ／ 取整）」 斷在 下\|取（句子，非短標籤，不計） | V5；nw1/mark/n2@V5、nw1/bid/n2@V5、nw1/shrine/n2@V5 |
| `#myDir「南・紅衣婆婆（南風）」婆\|婆` | 3 | 「南・紅衣婆 ／ 婆（南風）」 斷在 婆\|婆 | V4；nw1/bid/n2@V4、nw1/bid/n6@V4、nw1/bid/n10@V4 |
| `#mc1 > div.ab「第1拍：本方最高基礎攻擊紙紮，每」每\|件 [句子]` | 3 | 「第1拍：本方最高基礎攻擊紙紮，每 ／ 件攻擊 −2」 斷在 每\|件（句子，非短標籤，不計） | V5；nw1/mark/n3@V5、nw1/bid/n3@V5、nw1/shrine/n3@V5 |
| `#mc3 > div.ab「✦ 壽命低於 15 時，本夜共鳴」加\|倍 [句子]` | 3 | 「✦ 壽命低於 15 時，本夜共鳴效果加 ／ 倍」 斷在 加\|倍（句子，非短標籤，不計） | V5；nw1/mark/n5@V5、nw1/bid/n5@V5、nw1/shrine/n5@V5 |
| `#mc1 > div.ab「✦ 壽命低於 15 時，本夜共鳴」加\|倍 [句子]` | 3 | 「✦ 壽命低於 15 時，本夜共鳴效果加 ／ 倍」 斷在 加\|倍（句子，非短標籤，不計） | V5；nw1/mark/n6@V5、nw1/bid/n6@V5、nw1/shrine/n6@V5 |
| `#mc1 > div.ab「✦ 你的毒標比價時視為 +2（實」不\|變 [句子]` | 3 | 「✦ 你的毒標比價時視為 +2（實付不 ／ 變）」 斷在 不\|變（句子，非短標籤，不計） | V5；nw1/mark/n10@V5、nw1/bid/n10@V5、nw1/shrine/n10@V5 |
| `#stage > div.stakebar > div.stakerow > span「🎲 押寶夜・今夜這一注」今\|夜` | 2 | 「🎲 押寶夜・今 ／ 夜這一注」 斷在 今\|夜 | V2；solo/bid/n7@V2、hot/bid/n7@V2 |
| `#stage > div.stakebar > div.stakerow > span「🎲 押寶夜・今夜這一注」寶\|夜` | 2 | 「🎲 押寶 ／ 夜・今夜 ／ 這一注」 斷在 寶\|夜 | V4；solo/bid/n7@V4、hot/bid/n7@V4 |
| `#stage > div.stakebar > div.stakerow > span「🎲 押寶夜・今夜這一注」夜\|這` | 2 | 「🎲 押寶 ／ 夜・今夜 ／ 這一注」 斷在 夜\|這 | V4；solo/bid/n7@V4、hot/bid/n7@V4 |
| `#stage > div.stakebar > div.stakerow > span「🎲 押寶夜・今夜這一注」一\|注` | 2 | 「🎲 押寶夜・今夜這一 ／ 注」 斷在 一\|注 | V5；solo/bid/n7@V5、hot/bid/n7@V5 |
| `#stage > div.stageCard > div.endrank「1. 北家・收驚婆 — 壽命 3」血\|9` | 2 | 「1. 北家・收驚婆 — 壽命 35（16 隻・血 ／ 94）」 斷在 血\|9 | V4；solo/end@V4、solo/review@V4 |
| `#stage > div.stageCard > div.endrank「2. 東家・孝女白琴 — 壽命 」血\|1` | 2 | 「2. 東家・孝女白琴 — 壽命 24（18 隻・血 ／ 118）」 斷在 血\|1 | V4；solo/end@V4、solo/review@V4 |
| `#stage > div.stageCard > div.bidfly > span「魔神仔的芭樂 🕸」芭\|樂` | 2 | 「魔神仔的芭 ／ 樂 🕸」 斷在 芭\|樂 | V4；hot/shrine/n1@V4、nw1/shrine/n7@V4 |
| `#mc1 > div.ab「🚫 本夜不開標・每夜有得標：每」件\|付 [句子]` | 2 | 「🚫 本夜不開標・每夜有得標：每件 ／ 付 1 壽命禮金」 斷在 件\|付（句子，非短標籤，不計） | V5；hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#stage > div.stageCard > div.endrank「1. 東家・閭山法師 — 壽命 」血\|1` | 2 | 「1. 東家・閭山法師 — 壽命 21（25 隻・血 ／ 151）」 斷在 血\|1 | V4；hot/end@V4、hot/review@V4 |
| `#stage > div.stageCard > div.endrank「2. 南家・玩家一・青面攤主 —」1\|隻` | 2 | 「2. 南家・玩家一・青面攤主 — 出局（1 ／ 隻・血 3）」 斷在 1\|隻 | V4；hot/end@V4、hot/review@V4 |
| `#mainbtn「再入妖市」入\|妖` | 2 | 「再入 ／ 妖市」 斷在 入\|妖 | V4；hot/end@V4、hot/review@V4 |
| `#stage > div.stageCard > div.bidfly > span「縛靈鎖 🕸」靈\|鎖` | 2 | 「縛靈 ／ 鎖 🕸」 斷在 靈\|鎖 | V4；nw1/shrine/n3@V4、nw1/shrine/n8@V4 |
| `#mainbtn「回章節選單」節\|選` | 2 | 「回章節 ／ 選單」 斷在 節\|選 | V4；nw1/end@V4、nw1/nw-scroll@V4 |
| `#stage > div.stageCard > div.bidfly > span「冥婚紅包 🕸」紅\|包` | 2 | 「冥婚紅 ／ 包 🕸」 斷在 紅\|包 | V4；nw2/shrine/n1@V4、nw3/shrine/n1@V4 |
| `#stage > div.stageCard > div.bidfly > span「白虎煞 🕸」虎\|煞` | 1 | 「白虎 ／ 煞 🕸」 斷在 虎\|煞 | V4；solo/shrine/n1@V4 |
| `#stage > div.stageCard > div.bidfly > span「魔神仔的芭樂 🕸」的\|芭` | 1 | 「魔神仔的 ／ 芭樂 🕸」 斷在 的\|芭 | V4；solo/shrine/n5@V4 |
| `#stage > div.stageCard > div.bidfly > span「閭山法師 買下銷毀（自保）（5・」實\|付` | 1 | 「閭山法師 買下銷毀（自保）（5・實 ／ 付 6）」 斷在 實\|付 | V4；solo/shrine/n6@V4 |
| `#stage > div.stageCard > div.bidfly > span「閭山法師 買下銷毀（自保）（4・」付\|5` | 1 | 「閭山法師 買下銷毀（自保）（4・實付 ／ 5）」 斷在 付\|5 | V4；solo/shrine/n8@V4 |
| `#stage > div.stageCard > div.bidfly > span「閭山法師 買下銷毀（自保）（4・」付\|3` | 1 | 「閭山法師 買下銷毀（自保）（4・實付 ／ 3）」 斷在 付\|3 | V4；hot/shrine/n6@V4 |
| `#myLife「命懸一線」懸\|一` | 1 | 「命懸 ／ 一線」 斷在 懸\|一 | V4；hot/bid/n9@V4 |
| `#myPow「部隊 1 隻・攻 1・血 3・�」攻\|1` | 1 | 「部隊 1 隻・攻 ／ 1・血 3・💀出 ／ 局」 斷在 攻\|1 | V4；hot/bid/n11@V4 |
| `#mainbtn「蓋牌開標」蓋\|牌` | 1 | 「蓋 ／ 牌 ／ 開」 斷在 蓋\|牌 | V4；hot/bid/n11@V4 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 閭山法」實\|付` | 1 | 「獵人 毒標得手 → 塞進 閭山法師 的袋子（5・實 ／ 付 6）」 斷在 實\|付 | V1；nw2/shrine/n1@V1 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 閭山法」付\|6` | 1 | 「獵人 毒標得手 → 塞進 閭山法師 的袋子（5・實付 ／ 6）」 斷在 付\|6 | V3；nw2/shrine/n1@V3 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 閭山法」袋\|子` | 1 | 「獵人 毒標得手 → 塞進 閭山法師 的袋 ／ 子（5・實付 6）」 斷在 袋\|子 | V4；nw2/shrine/n1@V4 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 青面攤」實\|付` | 1 | 「獵人 毒標得手 → 塞進 青面攤主 的袋子（5・實 ／ 付 6）」 斷在 實\|付 | V1；nw3/shrine/n1@V1 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 青面攤」付\|6` | 1 | 「獵人 毒標得手 → 塞進 青面攤主 的袋子（5・實付 ／ 6）」 斷在 付\|6 | V3；nw3/shrine/n1@V3 |
| `#stage > div.stageCard > div.bidfly > span「獵人 毒標得手 → 塞進 青面攤」袋\|子` | 1 | 「獵人 毒標得手 → 塞進 青面攤主 的袋 ／ 子（5・實付 6）」 斷在 袋\|子 | V4；nw3/shrine/n1@V4 |

## #2 文字不越框（11 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.mut` | 469 | 加嚴版超出 1.3px（B）／字面版 0px（）「盯主標還是誘餌？看底列每隻對手的反應。」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview` | 279 | 加嚴版超出 2px（T）／字面版 0px（）「👁」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V1 |
| `#northPrev > div.preview ⊃ div.preview > span.credin > b > span.mut` | 162 | 加嚴版超出 2px（T）／字面版 0px（）「（還沒有紀錄）」 | V1 V2 V3 V4 V5；solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V5、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V3 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > b` | 84 | 加嚴版超出 2px（T）／字面版 0px（）「盯上宣告」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.rulein > span.mut` | 70 | 加嚴版超出 1.3px（B）／字面版 0px（）「（詳見右上 ？）」 | V1 V2 V3 V4 V5；solo/mark/n3@V1、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n3@V4、solo/mark/n3@V5、solo/bid/n3@V1 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin` | 56 | 加嚴版超出 2px（T）／字面版 0px（）「🤝」 | V1 V2 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin > b` | 51 | 加嚴版超出 2px（T）／字面版 0px（）「你的信譽 1.00」 | V1 V2 V3 V4；solo/mark/n1@V1、solo/mark/n1@V4、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4 |
| `#south ⊃ #myDir` | 30 | 加嚴版超出 15px（T）／字面版 11.5px（T）「南・玩家一・青面攤主」 | V1 V2 V3 V4；hot/bid/n1@V1、hot/bid/n1@V3、hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V1、hot/bid/n3@V3 |
| `#south ⊃ #myLife` | 30 | 加嚴版超出 19px（B）／字面版 13.5px（B）「命懸一線」 | V1 V2 V3 V4；hot/bid/n1@V1、hot/bid/n1@V3、hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V1、hot/bid/n3@V3 |
| `#mainbtn ⊃ #mainbtn` | 11 | 加嚴版超出 13px（B）／字面版 13px（B）「蓋牌，交給下一位」 | V4；hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V4、hot/bid/n4@V4、hot/bid/n5@V4、hot/bid/n6@V4 |
| `#northPrev > div.preview ⊃ #northPrev > div.preview > span.credin > span.mut` | 4 | 加嚴版超出 2px（T）／字面版 0px（）「（近 4 次宣告；怎麼算看 ？）」 | V5；solo/mark/n1@V5、nw1/mark/n1@V5、nw2/mark/n1@V5、nw3/mark/n1@V5 |

## #3 字級 ≥10px（62 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#shrines > div.incboard > span.ibh > span 7.5px` | 1440 | 7.5px「南」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.incboard > span.ibh > span > b 7.5px` | 1440 | 7.5px「0」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.shcards > div.shcard > span.shname > span.shn 8px` | 1320 | 8px「殘日」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2、solo/mark/n1@V2 |
| `div.shcards > div.shcard > span.shname > span.shfac 8px` | 1320 | 8px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V2、solo/mark/n1@V2 |
| `#shrines > div.incboard > span.ibh > span.on 7.5px` | 840 | 7.5px「北」 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V2、solo/mark/n2@V2 |
| `div.incboard > span.ibh > span.on > b 7.5px` | 840 | 7.5px「1」 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V2、solo/mark/n2@V2 |
| `#seat2 > div > div.st 9px` | 809 | 9px「氣色紅潤」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#seat3 > div > div.st 9px` | 809 | 9px「氣色紅潤」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#shrines > div.incboard > span.ibgap 8px` | 570 | 8px「你 0・平手」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc0 > div.ab 9px` | 570 | 9px「每次戰敗：每件額外失 1 壽命（減傷前）」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc0 > div.uline.stat 9px` | 570 | 9px「🕸 詛咒品不召喚（只算纏身）」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc2 > div.ab 9px` | 570 | 9px「夜戰：本隊精英的第二目標濺射，改為當次攻擊力全額」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc2 > div.uline.stat 9px` | 570 | 9px「大紙偶×1・攻 9・血 6・共鳴2拍」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#shrines > div.shcards > div.shcard > span.shmove 8px` | 510 | 8px「餘暉灼目」 | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V1、solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V2、solo/mark/n4@V2 |
| `#shrines > div.incboard > span.ibwhen 8px` | 450 | 8px「第 5 夜請神・倒數 4 夜」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#northPrev > div.preview 8.5px` | 445 | 8.5px「🔮 明夜預告：「雷女之火」」 | V1 V2 V3 V4 V5；solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V3、solo/bid/n1@V4、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V1 |
| `div.shcards > div.shcard.gone > span.shname > span.shn 8px` | 390 | 8px「殘日」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `div.shcards > div.shcard.gone > span.shname > span.shfac 8px` | 390 | 8px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#shrines > div.shcards > div.shcard.gone > span.shtaken 8px` | 390 | 8px「已請走：西家」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#selGrid > div.rcard > div.rlf 9px` | 210 | 9px「壽命 50」 | V1 V2 V3 V4 V5；solo/select@V1、solo/select@V1、solo/select@V1、solo/select@V1、solo/select@V1、solo/select@V1 |
| `#northPrev > div.preview > span.rulein > b 8.5px` | 210 | 8.5px「今夜市集規則：落魄夜」 | V1 V2 V3 V4 V5；solo/mark/n3@V1、solo/mark/n3@V1、solo/mark/n3@V2、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n3@V3 |
| `#mc2 > div > span.fchip.f-zuling 8.5px` | 190 | 8.5px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n4@V1、solo/mark/n4@V2、solo/mark/n4@V3、solo/mark/n4@V4、solo/mark/n4@V5、solo/bid/n4@V1 |
| `#northPrev > div.preview > b 8.5px` | 180 | 8.5px「盯上宣告」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/mark/n2@V1 |
| `#northPrev > div.preview > span.credin > b 8.5px` | 180 | 8.5px「你的信譽 1.00」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/mark/n2@V1 |
| `#mc2 > div > span.fchip.f-xianghuo 8.5px` | 180 | 8.5px「香火」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc0 > div > span.fchip.f-yinqi 8.5px` | 180 | 8.5px「陰氣」 | V1 V2 V3 V4 V5；solo/mark/n3@V1、solo/mark/n3@V2、solo/mark/n3@V3、solo/mark/n3@V4、solo/mark/n3@V5、solo/bid/n3@V1 |
| `#mc0 > div > span.fchip.f-curse 8.5px` | 160 | 8.5px「詛咒」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#mc2 > div > span.fchip.f-yinqi 8.5px` | 145 | 8.5px「陰氣」 | V1 V2 V3 V4 V5；solo/mark/n7@V1、solo/mark/n7@V2、solo/mark/n7@V3、solo/mark/n7@V4、solo/mark/n7@V5、solo/bid/n7@V1 |
| `#mc2 > span.markb 9.5px` | 130 | 9.5px「👁北西東」 | V1 V2 V3 V4 V5；solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V3、solo/bid/n1@V4、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V1 |
| `#mc0 > span.markb 9.5px` | 130 | 9.5px「👁東」 | V1 V2 V3 V4 V5；solo/bid/n2@V1、solo/bid/n2@V2、solo/bid/n2@V3、solo/bid/n2@V4、solo/bid/n2@V5、solo/shrine/n2@V1 |
| `#shrines > div.incboard > span.ibwhen > b 8px` | 120 | 8px「今夜請神」 | V1 V2 V3 V4 V5；solo/mark/n5@V1、solo/mark/n5@V2、solo/mark/n5@V3、solo/mark/n5@V4、solo/mark/n5@V5、solo/bid/n5@V1 |
| `#mc0 > div > span.fchip.f-zuling 8.5px` | 115 | 8.5px「祖靈」 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V3、solo/mark/n2@V4、solo/mark/n2@V5、solo/bid/n2@V1 |
| `#mc2 > div > span.moonCue 8.5px` | 115 | 8.5px「🌓 今夜受惠」 | V1 V2 V3 V4 V5；solo/bid/n4@V1、solo/bid/n4@V2、solo/bid/n4@V3、solo/bid/n4@V4、solo/bid/n4@V5、solo/shrine/n4@V1 |
| `#mc0 > div > span.fchip.f-xianghuo 8.5px` | 115 | 8.5px「香火」 | V1 V2 V3 V4 V5；solo/mark/n9@V1、solo/mark/n9@V2、solo/mark/n9@V3、solo/mark/n9@V4、solo/mark/n9@V5、solo/bid/n9@V1 |
| `#mc1 > div.ab 9px` | 114 | 9px「✦ 被毒標塞中時，下手的人失 2 壽命」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc1 > div.uline.stat 9px` | 114 | 9px「大紙偶×1・攻 7・血 4・共鳴2拍」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc3 > div.ab 9px` | 114 | 9px「夜戰：本隊每拍首次在吸收後仍有 2 點以上傷害時，減傷 2（」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc3 > div.uline.stat 9px` | 114 | 9px「大紙偶×1・攻 9・血 6・共鳴1拍」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc0 > div > span.moonCue 8.5px` | 55 | 8.5px「🌓 今夜受惠」 | V1 V2 V3 V4 V5；solo/bid/n2@V1、solo/bid/n2@V2、solo/bid/n2@V3、solo/bid/n2@V4、solo/bid/n2@V5、solo/shrine/n2@V1 |
| `#mc2 > div > span.fchip.f-curse 8.5px` | 55 | 8.5px「詛咒」 | V1 V2 V3 V4 V5；solo/mark/n8@V1、solo/mark/n8@V2、solo/mark/n8@V3、solo/mark/n8@V4、solo/mark/n8@V5、solo/bid/n8@V1 |
| `#mc1 > div > span.fchip.f-xianghuo 8.5px` | 42 | 8.5px「香火」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#mc3 > div > span.fchip.f-xianghuo 8.5px` | 34 | 8.5px「香火」 | V5；solo/mark/n7@V5、solo/bid/n7@V5、solo/shrine/n7@V5、solo/mark/n8@V5、solo/bid/n8@V5、solo/shrine/n8@V5 |
| `#mc1 > span.markb 9.5px` | 33 | 9.5px「👁北西」 | V5；solo/bid/n3@V5、solo/shrine/n3@V5、solo/bid/n4@V5、solo/shrine/n4@V5、solo/bid/n9@V5、solo/shrine/n9@V5 |
| `#mc3 > span.markb 9.5px` | 31 | 9.5px「👁東」 | V5；solo/bid/n3@V5、solo/shrine/n3@V5、solo/bid/n6@V5、solo/shrine/n6@V5、solo/bid/n7@V5、solo/shrine/n7@V5 |
| `#mc3 > div > span.fchip.f-yinqi 8.5px` | 30 | 8.5px「陰氣」 | V5；solo/mark/n2@V5、solo/bid/n2@V5、solo/shrine/n2@V5、solo/mark/n4@V5、solo/bid/n4@V5、solo/shrine/n4@V5 |
| `#selGrid > div.rcard.sel > div.rlf 9px` | 25 | 9px「壽命 50」 | V1 V2 V3 V4 V5；solo/select@V1、solo/select@V2、solo/select@V3、solo/select@V4、solo/select@V5、hot/select@V1 |
| `#mc3 > div > span.fchip.f-zuling 8.5px` | 25 | 8.5px「祖靈」 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |
| `#pwch-B > i.pwfac 9px` | 25 | 9px「祖」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V2、solo/duel@V3、solo/duel@V4、solo/duel@V5、hot/duel@V1 |
| `#mc1 > div > span.fchip.f-zuling 8.5px` | 25 | 8.5px「祖靈」 | V5；solo/mark/n2@V5、solo/bid/n2@V5、solo/shrine/n2@V5、solo/mark/n4@V5、solo/bid/n4@V5、solo/shrine/n4@V5 |
| `#mc3 > div > span.fchip.f-curse 8.5px` | 25 | 8.5px「詛咒」 | V5；solo/mark/n5@V5、solo/bid/n5@V5、solo/shrine/n5@V5、hot/mark/n2@V5、hot/bid/n2@V5、hot/shrine/n2@V5 |
| `#mc1 > div > span.fchip.f-yinqi 8.5px` | 24 | 8.5px「陰氣」 | V5；solo/mark/n6@V5、solo/bid/n6@V5、solo/shrine/n6@V5、hot/mark/n4@V5、hot/bid/n4@V5、hot/shrine/n4@V5 |
| `#mc1 > div > span.fchip.f-curse 8.5px` | 23 | 8.5px「詛咒」 | V5；solo/mark/n7@V5、solo/bid/n7@V5、solo/shrine/n7@V5、hot/mark/n1@V5、hot/bid/n1@V5、hot/reveal@V5 |
| `#pwch-A > i.pwfac 9px` | 16 | 9px「肉」 | V1 V2 V3 V4 V5；solo/duel@V1、solo/duel@V3、solo/duel@V4、hot/duel@V1、hot/duel@V2、hot/duel@V3 |
| `#mc1 > div > span.moonCue 8.5px` | 14 | 8.5px「🌓 今夜受惠」 | V5；solo/bid/n2@V5、solo/shrine/n2@V5、solo/bid/n4@V5、solo/shrine/n4@V5、solo/bid/n8@V5、solo/shrine/n8@V5 |
| `#mc3 > div > span.moonCue 8.5px` | 12 | 8.5px「🌓 今夜受惠」 | V5；solo/bid/n3@V5、solo/shrine/n3@V5、solo/bid/n7@V5、solo/shrine/n7@V5、solo/bid/n8@V5、solo/shrine/n8@V5 |
| `#revealCard > div.big > span.fchip.f-curse 9px` | 9 | 9px「詛咒」 | V1 V2 V3 V4 V5；nw2/reveal@V1、nw2/reveal@V2、nw2/reveal@V3、nw2/reveal@V4、nw2/reveal@V5、nw3/reveal@V2 |
| `#revealCard > div.big > span.fchip.f-zuling 9px` | 5 | 9px「祖靈」 | V1 V2 V3 V4 V5；hot/reveal@V1、hot/reveal@V2、hot/reveal@V3、hot/reveal@V4、hot/reveal@V5 |
| `#revealCard > div.big > span.fchip.f-yinqi 9px` | 5 | 9px「陰氣」 | V1 V2 V3 V4 V5；nw1/reveal@V1、nw1/reveal@V2、nw1/reveal@V3、nw1/reveal@V4、nw1/reveal@V5 |
| `#revealCard > div.big > span.fchip.f-xianghuo 9px` | 4 | 9px「香火」 | V2 V3 V4 V5；solo/reveal@V2、solo/reveal@V3、solo/reveal@V4、solo/reveal@V5 |
| `#pwch-A > i.pwfac 9.6px` | 1 | 9.6px「肉」 | V2；solo/duel@V2 |
| `#pwch-A > i.pwfac 9.39px` | 1 | 9.39px「肉」 | V5；solo/duel@V5 |
| `#pwch-A > i.pwfac 9.31px` | 1 | 9.31px「肉」 | V2；nw3/duel@V2 |

## #4 對比（38 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `div.shcards > div.shcard.gone > span.shname > span.shfac` | 390 | 1.7:1 < 4.5（字 rgb(74,42,52) 底 rgb(128,68,72) opacity 0.5）「香火」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#shrines > div.shcards > div.shcard.gone > span.shtaken` | 390 | 3.48:1 < 4.5（字 rgb(141,114,67) 底 rgb(49,28,37) opacity 0.5）「已請走：東家」 | V1 V2 V3 V4 V5；solo/mark/n6@V1、solo/mark/n6@V2、solo/mark/n6@V3、solo/mark/n6@V4、solo/mark/n6@V5、solo/bid/n6@V1 |
| `#seat2 > div > div.st` | 180 | 2:1 < 4.5（字 rgb(74,66,65) 底 rgb(11,9,24) opacity 0.35）「出局」 | V1 V2 V3 V4 V5；hot/end@V1、hot/end@V1、hot/end@V2、hot/end@V2、hot/end@V3、hot/end@V3 |
| `#mc0 > div > span.fchip.f-curse` | 145 | 4.4:1 < 4.5（字 rgb(255,255,255) 底 rgb(144,96,208)）「詛咒」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#seat2 > div > div.nm` | 90 | 2.78:1 < 4.5（字 rgb(91,87,92) 底 rgb(11,9,25) opacity 0.35）「普渡爐主 💀」 | V1 V2 V3 V4 V5；hot/end@V1、hot/end@V2、hot/end@V3、hot/end@V4、hot/end@V5、nw1/mark/n9@V1 |
| `#mc2 > div > span.fchip.f-curse` | 55 | 4.4:1 < 4.5（字 rgb(255,255,255) 底 rgb(144,96,208)）「詛咒」 | V1 V2 V3 V4 V5；solo/mark/n8@V1、solo/mark/n8@V2、solo/mark/n8@V3、solo/mark/n8@V4、solo/mark/n8@V5、solo/bid/n8@V1 |
| `#mainbtn [inactive]` | 40 | 1.62:1 < 3（字 rgb(73,62,42) 底 rgb(109,93,49) opacity 0.4）「進入下一夜」〔disabled，WCAG 豁免〕 | V1 V2 V3 V4 V5；solo/event/n4@V1、solo/event/n4@V2、solo/event/n4@V3、solo/event/n4@V4、solo/event/n4@V5、solo/event/n8@V1 |
| `#seat2 > span.windb` | 35 | 1.31:1 < 4.5（字 rgb(60,49,41) 底 rgb(82,66,47) opacity 0.35）「西風」 | V1 V2 V3 V4 V5；hot/end@V1、hot/end@V2、hot/end@V3、hot/end@V4、hot/end@V5、nw1/event/n11@V1 |
| `#selHead > button.selback` | 25 | 4.26:1 < 4.5（字 rgb(160,144,112) 底 rgb(58,34,96)）「返回」 | V1 V2 V3 V4 V5；solo/select@V1、solo/select@V2、solo/select@V3、solo/select@V4、solo/select@V5、hot/select@V1 |
| `#mc3 > div > span.fchip.f-curse` | 25 | 4.4:1 < 4.5（字 rgb(255,255,255) 底 rgb(144,96,208)）「詛咒」 | V5；solo/mark/n5@V5、solo/bid/n5@V5、solo/shrine/n5@V5、hot/mark/n2@V5、hot/bid/n2@V5、hot/shrine/n2@V5 |
| `#mc1 > div > span.fchip.f-curse` | 23 | 3.87:1 < 4.5（字 rgb(165,153,189) 底 rgb(74,50,122) opacity 0.5）「詛咒」 | V5；solo/mark/n7@V5、solo/bid/n7@V5、solo/shrine/n7@V5、hot/mark/n1@V5、hot/bid/n1@V5、hot/reveal@V5 |
| `#seat1 > div > div.st` | 20 | 2:1 < 4.5（字 rgb(74,66,63) 底 rgb(11,9,20) opacity 0.35）「出局」 | V1 V2 V3 V4 V5；hot/end@V1、hot/end@V1、hot/end@V2、hot/end@V2、hot/end@V3、hot/end@V3 |
| `div.shcards > div.shcard.gone > span.shname > span.shn` | 16 | 4.04:1 < 4.5（字 rgb(152,134,129) 底 rgb(63,36,42) opacity 0.5）「殘日」 | V1 V2 V3 V4 V5；solo/bid/n6@V2、solo/bid/n8@V3、solo/mark/n9@V2、hot/mark/n9@V2、hot/bid/n9@V2、hot/shrine/n9@V3 |
| `#nwBody > div.nwHead > button.selback` | 15 | 4.26:1 < 4.5（字 rgb(160,144,112) 底 rgb(58,34,96)）「返回」 | V1 V2 V3 V4 V5；nw1/nw-menu@V1、nw1/nw-menu@V2、nw1/nw-menu@V3、nw1/nw-menu@V4、nw1/nw-menu@V5、nw2/nw-menu@V1 |
| `#pwch-B > i.pwfac [transient]` | 10 | 1:1 < 4.5（字 rgb(35,17,36) 底 rgb(36,17,36) opacity 0.06）「肉」〔演出暫態〕 | V1 V2 V3 V5；solo/duel@V2、solo/duel@V3、hot/duel@V1、hot/duel@V3、nw1/duel@V2、nw1/duel@V3 |
| `#seat1 > div > div.nm` | 10 | 2.78:1 < 4.5（字 rgb(91,87,91) 底 rgb(11,9,24) opacity 0.35）「玩家二・紅衣婆婆 💀」 | V1 V2 V3 V4 V5；hot/end@V1、hot/end@V2、hot/end@V3、hot/end@V4、hot/end@V5、nw1/end@V1 |
| `#pwch-A > i.pwfac [transient]` | 9 | 1:1 < 4.5（字 rgb(17,9,34) 底 rgb(17,9,34) opacity 0.06）「肉」〔演出暫態〕 | V1 V2 V3 V5；solo/duel@V2、solo/duel@V3、hot/duel@V1、nw1/duel@V2、nw1/duel@V3、nw1/duel@V5 |
| `#revealCard > div.big > span.fchip.f-curse` | 9 | 4.4:1 < 4.5（字 rgb(255,255,255) 底 rgb(144,96,208)）「詛咒」 | V1 V2 V3 V4 V5；nw2/reveal@V1、nw2/reveal@V2、nw2/reveal@V3、nw2/reveal@V4、nw2/reveal@V5、nw3/reveal@V2 |
| `#seat1 > span.windb` | 5 | 1.32:1 < 4.5（字 rgb(61,49,43) 底 rgb(83,67,50) opacity 0.35）「北風」 | V1 V2 V3 V4 V5；nw1/end@V1、nw1/end@V2、nw1/end@V3、nw1/end@V4、nw1/end@V5 |
| `#mc1 > div.nm` | 4 | 4.43:1 < 4.5（字 rgb(134,125,138) 底 rgb(28,17,60) opacity 0.5）「抓交替水符」 | V5；solo/bid/n7@V5、solo/shrine/n7@V5、hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#mc1 > div > span.pw` | 4 | 3.54:1 < 4.5（字 rgb(130,109,78) 底 rgb(28,17,59) opacity 0.5）「詛咒・纏身」 | V5；solo/bid/n7@V5、solo/shrine/n7@V5、hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#mc1 > div.ab` | 4 | 2.89:1 < 4.5（字 rgb(109,94,100) 底 rgb(27,17,57) opacity 0.5）「🚫 本夜不開標・每戰首次折損：牽連另一隻紙紮，每件傷害 1」 | V5；solo/bid/n7@V5、solo/shrine/n7@V5、hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#mc1 > div.uline.stat` | 4 | 2.89:1 < 4.5（字 rgb(109,94,99) 底 rgb(27,16,56) opacity 0.5）「🕸 詛咒品不召喚（只算纏身）」 | V5；solo/bid/n7@V5、solo/shrine/n7@V5、hot/bid/n7@V5、hot/shrine/n7@V5 |
| `#dL > div.fdir [transient]` | 3 | 1.11:1 < 4.5（字 rgb(51,23,38) 底 rgb(40,12,34) opacity 0.06）「北家」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、nw1/duel@V3 |
| `#dL > div.fnm [transient]` | 3 | 1.12:1 < 4.5（字 rgb(33,25,56) 底 rgb(20,12,46) opacity 0.06）「玩家二・紅衣婆婆」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、nw1/duel@V3 |
| `#dL > div > span.pwunit [transient]` | 3 | 1.06:1 < 4.5（字 rgb(27,19,46) 底 rgb(19,11,42) opacity 0.06）「隻」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、nw1/duel@V3 |
| `#dL > div.pwbody [transient]` | 3 | 1.06:1 < 4.5（字 rgb(26,18,41) 底 rgb(18,10,37) opacity 0.06）「小紙人×1」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、nw1/duel@V3 |
| `#dR > div.fdir [transient]` | 3 | 1.11:1 < 4.5（字 rgb(51,22,37) 底 rgb(40,11,33) opacity 0.06）「西家」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、hot/duel@V3 |
| `#dR > div > span.pwunit [transient]` | 3 | 1.08:1 < 4.5（字 rgb(46,29,47) 底 rgb(39,22,43) opacity 0.06）「隻」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、hot/duel@V3 |
| `#dR > div.pwbody [transient]` | 3 | 1.08:1 < 4.5（字 rgb(58,35,45) 底 rgb(52,28,41) opacity 0.06）「小紙人×1」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1、hot/duel@V3 |
| `#mainbtn [transient]` | 2 | 2.9:1 < 3（字 rgb(20,16,31) 底 rgb(109,93,51)）「下一件拍品 ▸」〔演出暫態〕 | V1；solo/reveal@V1、nw3/reveal@V1 |
| `#pwn-A [transient]` | 2 | 1.09:1 < 3（字 rgb(31,22,46) 底 rgb(19,11,43) opacity 0.06）「1」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1 |
| `#duelArena > div.vsbig [transient]` | 2 | 1.17:1 < 3（字 rgb(47,38,38) 底 rgb(33,25,29) opacity 0.11）「VS」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1 |
| `#dR > div.fnm [transient]` | 2 | 1.13:1 < 4.5（字 rgb(37,27,57) 底 rgb(24,14,47) opacity 0.06）「普渡爐主」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1 |
| `#pwn-B [transient]` | 2 | 1.12:1 < 3（字 rgb(61,30,48) 底 rgb(50,20,45) opacity 0.06）「1」〔演出暫態〕 | V1 V3；solo/duel@V3、hot/duel@V1 |
| `#duelResult > span.mut [transient]` | 1 | 1.35:1 < 4.5（字 rgb(64,51,52) 底 rgb(40,28,37) opacity 0.2）「勢均力敵，互不失血」〔演出暫態〕 | V3；solo/duel@V3 |
| `#duelArena > div.vsbig` | 1 | 2.61:1 < 3（字 rgb(160,144,112) 底 rgb(118,65,49)）「VS」 | V4；solo/duel@V4 |
| `#pwch-A > i.pwfac` | 1 | 1.04:1 < 4.5（字 rgb(20,16,31) 底 rgb(14,9,29)）「肉」 | V3；hot/duel@V3 |

## #5 觸控目標 ≥40×40（23 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `#seat1 > span.roleInfoBtn` | 775 | 命中 24×18（框 23×17）「ⓘ」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#seat2 > span.roleInfoBtn` | 775 | 命中 24×18（框 23×17）「ⓘ」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#helpBtn` | 775 | 命中 34×34（框 34×34）「？」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#seat3 > span.roleInfoBtn` | 775 | 命中 24×18（框 23×17）「ⓘ」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#south > button.side` | 775 | 命中 46×38（框 46×38）「袋子」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#south > button.side.roleInfoBtn` | 774 | 命中 32×38（框 31×38）「ⓘ」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#sfxBtn` | 671 | 命中 43×38（框 42×38）「🔊」 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `#budget > span.incbar > button` | 350 | 命中 20×20（框 20×20）「−」 | V1 V2 V3 V4 V5；solo/bid/n1@V1、solo/bid/n1@V1、solo/bid/n1@V2、solo/bid/n1@V2、solo/bid/n1@V3、solo/bid/n1@V3 |
| `div.nwCard > div.nwInfo > div.nwBtns > button.bigbtn` | 45 | 命中 54×36（框 54×36）「挑戰」 | V1 V2 V3 V4 V5；nw1/nw-menu@V1、nw1/nw-menu@V1、nw1/nw-menu@V1、nw1/nw-menu@V2、nw1/nw-menu@V2、nw1/nw-menu@V2 |
| `#selHead > button.selback` | 25 | 命中 50×30（框 50×30）「返回」 | V1 V2 V3 V4 V5；solo/select@V1、solo/select@V2、solo/select@V3、solo/select@V4、solo/select@V5、hot/select@V1 |
| `#skipbtn` | 25 | 命中 58×22（框 57×21）「跳過 ≫」 | V1 V2 V3 V4 V5；solo/reveal@V1、solo/reveal@V2、solo/reveal@V3、solo/reveal@V4、solo/reveal@V5、hot/reveal@V1 |
| `div.stakebar > div.stakerow > div.stepper > button` | 20 | 命中 16×30（框 16×30）「−」 | V1 V2 V3 V4 V5；solo/bid/n7@V1、solo/bid/n7@V1、solo/bid/n7@V2、solo/bid/n7@V2、solo/bid/n7@V3、solo/bid/n7@V3 |
| `#nwBody > div.nwHead > button.selback` | 15 | 命中 50×30（框 50×30）「返回」 | V1 V2 V3 V4 V5；nw1/nw-menu@V1、nw1/nw-menu@V2、nw1/nw-menu@V3、nw1/nw-menu@V4、nw1/nw-menu@V5、nw2/nw-menu@V1 |
| `#nwGo` | 15 | 命中 80×36（框 80×36）「選角入市」 | V1 V2 V3 V4 V5；nw1/nw-intro@V1、nw1/nw-intro@V2、nw1/nw-intro@V3、nw1/nw-intro@V4、nw1/nw-intro@V5、nw2/nw-intro@V1 |
| `#nwBody > div.stageCard.nwBig > div.nwBtns > button.bigbtn.alt` | 15 | 命中 82×36（框 82×36）「返回章節」 | V1 V2 V3 V4 V5；nw1/nw-intro@V1、nw1/nw-intro@V2、nw1/nw-intro@V3、nw1/nw-intro@V4、nw1/nw-intro@V5、nw2/nw-intro@V1 |
| `#stage > div.stakebar > div.stakerow > button.typebtn` | 10 | 命中 58×30（框 58×30）「保守標」 | V1 V2 V3 V4 V5；solo/bid/n7@V1、solo/bid/n7@V2、solo/bid/n7@V3、solo/bid/n7@V4、solo/bid/n7@V5、hot/bid/n7@V1 |
| `#rvDl` | 10 | 命中 114×34（框 114×34）「下載本局紀錄」 | V1 V2 V3 V4 V5；solo/review@V1、solo/review@V2、solo/review@V3、solo/review@V4、solo/review@V5、hot/review@V1 |
| `#rvCopy` | 10 | 命中 116×34（框 116×34）「複製本局紀錄」 | V1 V2 V3 V4 V5；solo/review@V1、solo/review@V2、solo/review@V3、solo/review@V4、solo/review@V5、hot/review@V1 |
| `#reviewbox > div.rvTop > div.rvTopBtns > button.bigbtn.alt` | 10 | 命中 60×34（框 60×34）「關閉」 | V1 V2 V3 V4 V5；solo/review@V1、solo/review@V2、solo/review@V3、solo/review@V4、solo/review@V5、hot/review@V1 |
| `#fpsToggle` | 5 | 命中 84×22（框 84×21）「顯示效能資訊」 | V1 V2 V3 V4 V5；solo/modal:？ 妖市規則@V1、solo/modal:？ 妖市規則@V2、solo/modal:？ 妖市規則@V3、solo/modal:？ 妖市規則@V4、solo/modal:？ 妖市規則@V5 |
| `#nwScrollClose` | 5 | 命中 82×36（框 82×36）「收起殘卷」 | V1 V2 V3 V4 V5；nw1/nw-scroll@V1、nw1/nw-scroll@V2、nw1/nw-scroll@V3、nw1/nw-scroll@V4、nw1/nw-scroll@V5 |
| `#stage > div.stageCard > button.bigbtn.alt` | 3 | 命中 121×38（框 434×38）「看完整回顧」 | V5；solo/end@V5、hot/end@V5、nw1/end@V5 |
| `#nwReadScroll` | 1 | 命中 121×38（框 434×38）「讀殘卷」 | V5；nw1/end@V5 |

## #6 同列對齊 ≤2px（3 項）

| 項 | 次數 | 例 | 出現（前 6） |
|---|---|---|---|
| `north` | 570 | 上緣差 21.6・下緣差 21.6・高度差 43.3｜#northPrev（格內有框聯集） 24-40；#northSeat（格內有框聯集） 4-60；#northShr（格內有框聯集） 3-61 | V1 V2 V3 V4 V5；solo/mark/n1@V1、solo/mark/n1@V2、solo/mark/n1@V3、solo/mark/n1@V4、solo/mark/n1@V5、solo/bid/n1@V1 |
| `railCards` | 400 | 上緣差 0・下緣差 31.3・高度差 31.3｜#mc0 172-246；#mc2 172-277 | V1 V2 V3 V4 V5；solo/mark/n2@V1、solo/mark/n2@V2、solo/mark/n2@V3、solo/mark/n2@V4、solo/bid/n2@V1、solo/bid/n2@V2 |
| `railCards2` | 76 | 上緣差 8・下緣差 36・高度差 28｜#mc1 257-373；#mc3 249-337 | V5；solo/mark/n1@V5、solo/bid/n1@V5、solo/modal:南家・青面攤主（@V5、solo/modal:北家・收驚婆@V5、solo/modal:？ 妖市規則@V5、solo/reveal@V5 |

## #2 對照：字面版（em 框對容器外框，3 項）

| 項 | 次數 | 最大 | 出現（前 6） |
|---|---|---|---|
| `#south ⊃ #myLife` | 30 | 13.5px B「命懸一線」 | hot/bid/n1@V1、hot/bid/n1@V3、hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V1、hot/bid/n3@V3 |
| `#mainbtn ⊃ #mainbtn` | 11 | 13px B「蓋牌，交給下一位」 | hot/bid/n1@V4、hot/bid/n2@V4、hot/bid/n3@V4、hot/bid/n4@V4、hot/bid/n5@V4、hot/bid/n6@V4 |
| `#south ⊃ #myDir` | 8 | 11.5px T「南・玩家一・青面攤主」 | hot/mark/n9@V4、hot/bid/n9@V1、hot/bid/n9@V2、hot/bid/n9@V3、hot/bid/n9@V4、hot/shrine/n9@V4 |
