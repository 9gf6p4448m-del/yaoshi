# 對決「近景切鏡」卷 批 1 原型——實作報告（2026-09-07，v0.45）

規格＝`docs/proposals/2026-09-07-duel-closeup.md` §二　驗收凍結＝`docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md`（P0–P9，**未動一個字**）
基準＝`4051dd1`（v0.43.3；本卷起點 `c5128fb` 只多兩份文件，`index.html` 與 `4051dd1` 相同）

## 0. 結論

| 條 | 結果 | 一句話 |
|---|---|---|
| P0 退路等價（雙向） | ✅ | `?closeup=0` 對 seeds 1..3 **各跑完整一局**（14／14／20 場對決），`FXC` 七欄與 `fights[]` 與基準逐欄相同；DOM 四樣都沒長；`trace(1..20)` 逐位元組相等；開啟時 `FXC.focus>0` |
| P1 事件規則 | ✅ | seeds 1..6 共 18 場，每拍 focus ≤2、觸發筆與規則重算逐筆相同；5 場有 hit-focus、14 場有 burn-focus |
| P2 鏡頭曲線 | ✅ | 21 次切鏡：最深 1.76–2.07（門檻 ≤2.75）、回位誤差全 0、反轉 0 次；cancel／doSkip 後 300ms 都回到 4.200 |
| P3 退暗 | ✅ | 配角抽樣 100 筆最大 0.36（門檻 ≤0.40）、主角 16 筆最小 1.00（門檻 ≥0.95）、回全景後 46 筆全部回到原值、燒毀中的 51 筆沒有一筆回升 |
| P4 跳字 | ✅ | 演出的 54 筆交鋒對 54 個 `.dmgfloat`，同時最多 4 個（上限 5）、全部在 `DMG_MS+100` 內移除、位置誤差全在門檻內；doSkip 後 0 個殘留 |
| P5 HUD | ✅ | 三拍燈 54 次抽樣全對（亮數＝拍數、`.cur` 唯一）、量表 17 次與存活數同步（誤差 0）、出手卡 19 次同時 ≤1 且帶法寶名、到期消失 |
| P6 效能 | ✅ | `--n=10 --uncap` 中位 fps 新版 4 次 {101.0, 103.1, 104.2, 97.1}、基準 4 次 {105.3, 114.9, 107.5, 120.5}：中位數比 102.05／111.2 ＝ **0.918 ≥ 0.9**；`--n=8` 103.1 vs 105.3 ＝ 0.979 |
| P7 冒煙 | ✅ | `duel-drive --duels=6` 開／關各一次，console error／pageerror／requestfailed 皆 0；另外 9 支治具跑下來也 0 |
| P8 截圖 | ⚠️ **部分** | 橫式 844×390 同一場對決連拍 10 張＋contact sheet 已產出；**直式 390×844 那兩張是把產品的「請轉橫」蓋板關掉才拍到的**（理由見 §3） |
| P9 範圍 | ✅ | `git diff --stat` 只含凍結檔允許的檔案；既有 8 套測試＋`ash-freeze-probe` 全綠 |

**給使用者看的東西**：`docs/experiments/2026-09-07-closeup-p1-evidence/contact-sheet.png`（單張連拍表，逐格圖說在 §2）。

## 1. 逐條證據

### P0 退路等價
```
node tests/tools/closeup-trace.mjs old.html index.html        # old.html＝git show 4051dd1:index.html
→ {"oldLen":332125,"newLen":332125,"identical":true}

node tests/tools/closeup-drive.mjs "http://127.0.0.1:8981/index.html?paperwar=1&fxcount=1&seed=1&closeup=0" \
     .claude/tmp/out/offfull-1.json --duels=99 --port=8981          # 同樣的指令對 seed 2、3
node tests/tools/closeup-drive.mjs "http://127.0.0.1:8984/index.html?paperwar=1&fxcount=1&seed=1" \
     .claude/tmp/out/basefull-1.json --duels=99 --port=8984 --root=.claude/tmp/base4051   # 基準 worktree
node tests/tools/closeup-judge.mjs <六個 on-*.json> --off=…offfull-1.json --base=…basefull-1.json …
```
| seed | 場數（新／基準） | `burn/burnFig/burnDom/trait/traitFig/beat/duels` | `fights[]` |
|---|---|---|---|
| 1 | 14／14 | 39/30/9/51/51/42/14 全欄相同 | 逐字相同 |
| 2 | 14／14 | 58/48/10/58/58/42/14 全欄相同 | 逐字相同 |
| 3 | 20／20 | 102/83/19/81/80/60/20 全欄相同 | 逐字相同 |

關閉時 `FXC.focus=0`、`FXC.dmgFloat=0`、沒有任何 `ys:fx-focus`；DOM 抽樣（每場開場與收場）`#beatLamps`／`#actorCard`／`#dmgLayer` 皆不存在、`.pwgauge`／`.dmgfloat` 皆 0 個。開啟時六個種子 `FXC.focus` 分別 5/6/5/2/2/1（>0）。

### P1 事件規則
`FXC.fights[].focus[]` 對 `fights[].beatsShown[]`（這一拍實際演出的那幾筆）重算規則，18 場全部逐筆相同；每拍 focus 數最大 2＝`FOCUS_PER_BEAT`。活性：hit-focus 5 場（門檻 ≥3）、burn-focus 14 場（門檻 ≥2）。

### P2 鏡頭曲線（`dist ＝ |camera.position|`）
- 推近深度（原始最小值，含 punch）：burn 15 次 {1.971 1.777 1.86 2.017 1.935 1.764 2.008 1.811 1.793 2.018 2.015 2.071 1.9 2.01 2.06}、hit 6 次 {1.964 1.988 1.945 1.876 1.955 1.913}，全部 ≤ 2.75。
  **為什麼可以用原始值判**：punch 單獨最多從 4.2 減 `PUNCH.dist(0.6)×power(≤2)=1.2 → 3.0`，仍大於門檻，冒名不了。排掉 punch 幀之後的靜幀最小值，burn 這一類正好是 2.600（＝`FOCUS_DIST`）。
- 回位：判得到的 16 次誤差全 **0.0000**（門檻 ≤0.05；判不到的 5 次是「回位還沒完就接上下一次切鏡」，照凍結檔第三句「同一拍第二次 focus 直接接續」）。
- 單調：靜幀序列反轉次數合計 **0**。
- `doSkip()`：`--skipfocus`（切鏡進行中才按跳過）與 `--cancel`（手動派 `ys:fx-trait-cancel`）兩支探針，+300ms 都量到 **4.200**。

### P3 退暗（逐尊 traverse 材質、跳過 AdditiveBlending，取材質比值中位數）
| 分類 | 樣本 | 量到 | 門檻 |
|---|---|---|---|
| 非 actor／target 且未燒毀 | 100 | 最大 **0.36** | ≤0.40 |
| actor／target | 16 | 最小 **1.00** | ≥0.95 |
| 回全景 300ms 後（未燒毀、仍在場） | 46 | 全部＝原值（haunt 0.5／其餘 1.0），誤差 0 | ±0.02 |
| 燒毀中 | 51 | 序列回升 **0** 次 | 不受退暗／復原影響 |

抽樣時間點 80／260／420／`ms+300`ms；`dt=80` 只當參考（切鏡還在 160ms 的進場段），判定用 260 之後那兩筆。被下一次切鏡蓋掉的抽樣、已收起來看不見的尊不列入。

### P4 跳字
54 筆演出的交鋒 → 54 個 `.dmgfloat`（一對一）；文字全部是 `−<amount>` 形；同時存在最多 **4** 個（上限 `MAX_HITS` 5）；54 個全部在 `DMG_MS+100` 內從 DOM 移除；位置：3D 尊在場的與投影點誤差 ≤80px、退路的落在隻數牌 60px 內，54/54 通過。`--skipfocus`：按跳過前畫面上 1 個，之後 +50／+150／+300ms 都是 **0** 個。

### P5 HUD
三拍燈 54 次抽樣：亮數＝拍序、`.cur` 恰好一顆且落在當前拍。量表 17 次：`round(存活/總×100)` 與 `style.width` 誤差 0，低於 1/3 轉紅的旗標也一致。出手卡 19 次：同時 ≤1 張、文字含法寶名（例：`陰虎姑婆指甲`）、`ACTOR_CARD_MS+100` 後消失（被下一張接手的不算殘留）。

### P6 效能
```
node tests/tools/duel-perf.mjs perf <out> --n=10 --uncap         # 新版，跑 4 次
node .claude/tmp/base4051/tests/tools/duel-perf.mjs perf <out> --n=10 --uncap   # 基準，同機同 session 交錯跑 4 次
```
| | 中位 fps（rafMedianFps） | rendersPerSec | 三角形數 |
|---|---|---|---|
| 新版 n=10 | 101.0 / 103.1 / 104.2 / 97.1（中位 102.05） | 438 / 452 / 484 / 454 | 371k–434k |
| 基準 n=10 | 105.3 / 114.9 / 107.5 / 120.5（中位 111.2） | 490 / 500 / 479 / 500 | 371k–434k |
| 新版 n=8 | 103.1 | 483 | 434,554 |
| 基準 n=8 | 105.3 | 477 | 434,554 |

比值 0.918（n=10）／0.979（n=8），都過 0.9。**這個量測本身有輸入變異**：`duel-perf` 沒有固定種子，每次那一場真實對決的組成不同（可見尊數 14–16、三角形 371k–434k）。挑三角形數相同（434,554）的樣本對比是 103.1–104.2 vs 105.3–107.5＝0.97–0.99，比全母體比值更乾淨。

### P7 冒煙
`duel-drive.mjs --duels=6`（預設開）0 error、`--duels=6` 加 `?closeup=0` 0 error。另外 6 支 `closeup-drive` 種子、`--cancel`、`--skipfocus`、`ash-freeze-probe`、`duel-perf` 全部 0 error。

### P9 範圍與既有測試
```
$ git diff --stat 4051dd1
 docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md |  17 ++      （c5128fb 帶進來的凍結檔）
 docs/proposals/2026-09-07-duel-closeup.md                 |  25 ++      （c5128fb 帶進來的規格）
 docs/GAME_DESIGN.md                                       |   +7       （changelog 一則）
 docs/IMPLEMENTATION_GUIDE.md                              |   +25      （§11.22 新一節）
 index.html                                                | 224 ++
 js/camera-director.js                                     | 114 ++
 js/duel-figures.js                                        |  96 ++
 tests/tools/closeup-{drive,judge,shots,trace}.mjs、closeup-sheet.py    （新治具）
 docs/experiments/2026-09-07-closeup-p1-evidence/           （連拍與 contact sheet）
```
既有測試：`aistake 8/0`、`conscap 5/0`、`duel-desync 7 綠`、`legend 17/0`、`lineup-order 5 綠`、`nightrules 16 綠`、`review 28/0`、`wish16 36/0`、`ash-freeze-probe F1 凍結 0／F6 硬切 0 ✅`。

## 2. 連拍（P8）

`docs/experiments/2026-09-07-closeup-p1-evidence/contact-sheet.png`（單張；原圖 10 張橫式＋2 張直式同目錄）。同一場對決（陰間當鋪 5 尊 vs 收驚婆 1 尊），每格底下標的 `dist` 是治具當場量的相機距離。

| 格 | 說明 |
|---|---|
| ① 開場列陣 | 全景 dist 4.11，三拍燈亮 1、兩側量表 100% |
| ② 一拍開打 | 全景 3.92（punch 微推），出手卡剛閃出來 |
| ③ 近景進場 | dist 2.30：出手的虎爺與目標被推近、四尊飄影退暗 |
| ④ 近景停留 | dist 2.10：跳字 2 個（`−9` 在被打那尊頭上）、退暗清楚 |
| ⑤ 停格瞬間 | dist 2.51：跳字＋左側出手卡「陰・虎姑婆指甲」 |
| ⑦ 燒毀跟拍 | dist 2.09：鏡頭跟著化灰那一尊，右側量表已到 0% |
| ⑧ 化灰中 | dist 2.52：灰燼與火星 |
| ⑥ 命中切鏡回位 | dist 2.60——**這一格已經接上下一次（燒毀）切鏡**，所以還在近景，圖說照實寫 |
| ⑨ 回全景 | dist 4.20，二拍燈亮 2 |
| ⑩ 拍末／收場 | dist 4.18，三拍燈亮 3 |
| 直式兩張 | 390×844，捲動高 844／可視高 844（未溢出），HUD 三件都在畫面內 |

## 3. 沒做到的、假設過的、覺得該回頭裁的

1. **P8 的直式兩張不是玩家會看到的畫面**：產品在 `orientation:portrait` 會蓋一整片「請把手機轉橫」（`index.html:39` 的 `#rotateHint`），連點擊都擋掉。凍結檔要求「直式 2 張、HUD 不溢出」在現行產品上無法直接成立，我**沒有改凍結檔、也沒有改產品**，而是在治具裡把蓋板關掉拍兩張，只回答「HUD 在窄畫面會不會溢出」（答：不會，844/844）。**這條要算 ⚠️ 部分達成，請使用者裁**：(甲) 接受這個口徑；(乙) 批 2 讓對決支援直式；(丙) 直式那兩張刪掉不驗。
2. **P2 的「doSkip 後 300ms 內回 4.2」在真實路徑上只在很短的窗內成立**：按下跳過後 `ys:duel-end` 幾乎立刻跟著來，基座機位開始往牌桌的 3.6 走。我量到的 4.200 是「切鏡進行中按跳過、量 +300ms」（`--skipfocus`），以及手動派 `ys:fx-trait-cancel`（`--cancel`）。若使用者要的是「整場都跳過（一開始就按）之後回 4.2」，那在任何版本都不成立（那時鏡頭本來就該回牌桌）。
3. **出手卡的法寶名靠 `ab`／`m` 鍵反查 `POOL`**（`index.html:4545`）。傳說三尊（`LEGENDS`）借用既有模型鍵，撞名時會顯示被借的那一件（例：殘日借 `bow` → 顯示「射日神弓」）。批 1 原型接受；批 2 建議 `duelDetail.armies` 直接把法寶名帶過去，不靠鍵反查。
4. **極少數子物件在退暗開始「之後」才建出來時不會被壓暗**：`setFigureOpacity` 有量化快取（`fig.__op` 相同就 early return），這是既有設計。實測材質比值的中位數是乾淨的 0.36，但個別材質的最大值會是 1.0。批 2 若要做徹底，得讓那層快取認得「材質集合變了」。
5. **P6 沒有量到「切鏡進行中」的 fps**：`duel-perf` 派的是合成的 8v8 `ys:duel`，不會走到 focus。所以量到的是新程式碼的常駐成本（每幀一次包絡計算＋一個分支），退暗那幾幀的 traverse 成本沒有被涵蓋。凍結檔指定的就是這支治具，我照跑，但這個涵蓋缺口要講明。
6. **`realign` 在切鏡期間被凍結**是這一卷能「看起來真的推近」的關鍵（否則人形會等比縮回去、畫面完全不變）。副作用：切鏡那 0.6 秒裡 3D 尊與 DOM 欄位（名字、隻數牌）會分離——看連拍 ③④ 就看得到人形壓過 HUD。這是原型的取捨，試玩時如果覺得突兀，批 2 可以改成「切鏡時把 DOM 那半邊一起淡出」。

## 4. 批 2 建議（依我看到的優先序）

1. **招式（trait）切鏡**：現在招式只有鏡頭輕推＋出手卡，反而是全場最重要的一拍卻沒有近景。
2. **鏡頭跟著灰燼**：燒毀跟拍現在只鎖位置不跟灰，化灰的最後 0.3 秒鏡頭已經回去了。
3. **DOM 半邊在切鏡時淡出／或改成貼在人形旁的浮動標籤**（接 §3.6）。
4. **勝負結算演出**：現在切鏡把注意力拉到交鋒上，反而讓結尾那行字更顯得平。
5. **數值全部【試玩必調】**：`FOCUS_DMG 3`（切太頻繁的話往上調）、`FOCUS_PER_BEAT 2`、`FOCUS_MS 650`、`FOCUS_DIST 2.6`、`FOCUS_DIM 0.35`。手機上會不會暈，只有真機試玩答得出來。
