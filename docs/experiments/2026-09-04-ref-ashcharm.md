# 真實參照：ashcharm 香灰符（2026-09-05）

依 `docs/design/ART_BIBLE.md` §0.5 真實參照鐵則。**本檔一經寫下不得再改**（造型必做清單）。

## 來源（全部 Wikimedia Commons，已下載並親眼 Read）

| 檔案 | Commons 原始檔 | 說明頁 |
|---|---|---|
| `tools/anyCreature/out/ref/ashcharm/ref1-fu-three-temples.jpg` | `File:中壢仁海宮、彰化南瑤宮與新港奉天宮符咒.jpg` | https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%A3%A2%E4%BB%81%E6%B5%B7%E5%AE%AE%E3%80%81%E5%BD%B0%E5%8C%96%E5%8D%97%E7%91%A4%E5%AE%AE%E8%88%87%E6%96%B0%E6%B8%AF%E5%A5%89%E5%A4%A9%E5%AE%AE%E7%AC%A6%E5%92%92.jpg |
| `tools/anyCreature/out/ref/ashcharm/ref2-fu-on-temple.jpg` | `File:新芳慶安宮-護廟符咒 = 20230409-IMG 3214.jpg` | https://commons.wikimedia.org/wiki/File:%E6%96%B0%E8%8A%B3%E6%85%B6%E5%AE%89%E5%AE%AE-%E8%AD%B7%E5%BB%9F%E7%AC%A6%E5%92%92_%3D_20230409-IMG_3214.jpg |
| `tools/anyCreature/out/ref/ashcharm/ref3-fu-yulian.jpg` | `File:七美玉蓮寺 16 符咒.jpg` | https://commons.wikimedia.org/wiki/File:%E4%B8%83%E7%BE%8E%E7%8E%89%E8%93%AE%E5%AF%BA_16_%E7%AC%A6%E5%92%92.jpg |
| `tools/anyCreature/out/ref/ashcharm/ref4-incense-ash.jpg` | `File:2009-04-20 joss sticks and the ashes in an incense burner.jpg` | https://commons.wikimedia.org/wiki/File:2009-04-20_joss_sticks_and_the_ashes_in_an_incense_burner.jpg |
| `tools/anyCreature/out/ref/ashcharm/ref5-censer-ash.jpg` | `File:三郊營仔脚朝興宮溫陵廟-觀音佛祖爐.jpg` | https://commons.wikimedia.org/wiki/File:%E4%B8%89%E9%83%8A%E7%87%9F%E4%BB%94%E8%84%9A%E6%9C%9D%E8%88%88%E5%AE%AE%E6%BA%AB%E9%99%B5%E5%BB%9F-%E8%A7%80%E9%9F%B3%E4%BD%9B%E7%A5%96%E7%88%90.jpg |

## 一眼特徵清單（5 條，模型上每條都要看得到）

1. **一面由多張長條黃符並排疊成的牆**——ref3 五張符並排、ref1 三張並排；每張是獨立紙片，**上緣參差不齊**（高低錯開、有的翹起掀開），不是一整塊平板。
2. **每張符＝細長長方形黃紙條**，寬高比約 **1:4～1:5**（ref3 全部、ref1 左右兩張），不是方塊、不是三角。
3. **符面上有朱砂紅印與黑色符文字帶**——ref3 每張偏上處一枚矩形紅印，中央一條由上而下的墨黑符文縱帶；ref1 中間那張整片紅印底＋黑字。
4. **身體是灰白偏米的香灰堆**，表面**露出短圓柱狀的斷香灰段**（ref4：整片是斷成一節一節的灰白香骨，粗糙顆粒外露，不是平滑的布或肉）。
5. **數根朱紅香枝從灰堆裡直立插出**（ref4：桃紅／朱紅細直桿，頂端高過灰面），頂端是燃著的火點。

## 色票（自參照取樣）

- 符紙黃：`#e8c832`～`#f0d84a`（ref3 飽和暖黃）
- 朱砂紅印：`#c0342a`～`#d04030`（ref1／ref3）
- 符文墨黑：`#1a1610`
- 香灰：`#a89880`（灰米）／亮處 `#c8c0b0`／暗處 `#4a443c`（ref4）
- 香腳朱紅：`#c02040`～`#e03050`（ref4 桃紅偏朱）
- 系別色帶（凍結檔指定）香火橘 `--c-xianghu-light #f08060` 落在**符邊**。

## 給造型的直接翻譯（不是特徵清單，是做法備忘）

- 特徵 1＋2 → 背後符牆＝**多片細長 fin 橫向並排、往外擴不往上長**（簡報第 50 行凍結：`ashcharm` 背後符牆＝多層小方片橫向疊出去、低於肩），上緣 Y 逐片錯開、末兩片外翻掀起（不對稱，避開 eye 卷「對稱框架被讀成骨架」）。
- 特徵 3 → 每片符用 `colors.arcs` 做「黃底＋中央墨黑縱帶」，紅印用獨立小片疊在符片上緣。
- 特徵 4 → 身體 volume 灰米色＋`faceted`，肩腹外露短圓柱 `spike`／小段當斷香灰。
- 特徵 5 → 頭肩插數根細直朱紅 `spike`／`curve`，尖端 `glow_ash` emissive 當火點。
