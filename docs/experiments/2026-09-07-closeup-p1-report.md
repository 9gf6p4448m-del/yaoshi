# 對決「近景切鏡」卷 批 1 原型——實作報告（2026-09-07，v0.45）

> **二版（冷讀對抗審查修補）**：§5 是逐條三態與證據；§1 的 P0–P7 數字已用二版程式重跑並就地更新，
> §2 的連拍與 contact sheet 也重拍過。一版的原始判讀留在 git 歷史（commit `affdb69`）。

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

---

## 5. 二版：冷讀對抗審查的逐條處置（2026-09-07）

分支同 `feat/duel-closeup-p1`。三態＝真的修好／表面修好／沒修到。

| # | 項目 | 三態 | 證據 |
|---|---|---|---|
| HIGH-1 | 人形端 `endFocusEv`／`focusEnvelope` 少了 `focusFall` | **真的修好** | 先建訊號再修：`closeup-drive` 在 `ys:fx-trait-cancel` 當下與 +80/+160/+300ms 取逐尊材質 opacity，`closeup-judge` P3 加「300ms 內回原值＋期間不得更暗」。**修復前**（`--cancel` 探針）B0／B1 在 dt 0/80/160 全是 0.36、dt300 只回到 **0.80** → P3=FAIL（`cancel-not-restored` 0/2）；**修復後** 0.36 → 0.48 → 0.96 → **1.00**，P3=PASS（back 4/4、deeper 0）。另在決定性治具上以「拿掉 focusFall 的壞版本」複驗：`backAfterEnd/backAfterCancel = 0.0611 > 0.05` 變紅，修好的版本 = 0 |
| MEDIUM-1 | P4 位置量法循環論證（治具重抄 `pwScreenOf`） | **真的修好** | 改量「跳字中心 → 那一尊的畫面方框」：方框由**世界包圍盒八角投影＋canvas `getBoundingClientRect`**算（與被測邏輯的局部座標／0.9×scale／innerWidth 不同路），另加 `elementFromPoint` 旁證「跳字落在目標那一側的欄位或舞台」。「每筆演出交鋒＝一個跳字」由只印改成硬斷言：**54 = 54**。量不到方框的記 `unmeasured` 不當通過（本輪 0 筆）。實測 54/54 在門檻內、`under` 0 違規 |
| MEDIUM-2 | P2 單調子句零鑑別力（hit 類 3/6 次 quiet=0） | **真的修好（改走替代路徑，原提議法被自檢否掉）** | ① 靜幀版加前提 `quiet≥8`，不足標 `null`：本輪 **16/16** 可判且全過（全是 burn 類），hit 類只有 1 次可判 ② 提議的「扣掉 punch 解析包絡」照做並附自檢——**非 focus 期間扣完應回 4.2，實測殘差 p50 0.054／p95 1.00**，重建不可信（renderer 夾 dt＋hitstop 歸零，導演內部時鐘與牆鐘對不起來），依 `02 §6.1` 第 4 條**只揭露不判** ③ hit 類的曲線形狀改由新治具 `closeup-cam-unit.mjs`（同一支 director、固定 dt、虛擬時鐘、只派 focus 不派 punch）驗：U1 最低 2.600、反轉 0、870ms 回 4.2 誤差 0；U2（focus-end）／U3（cancel）回位誤差 0。該治具對「拿掉 focusFall」的壞版本會紅（見 HIGH-1） |
| MEDIUM-3 | 招式被退暗蓋掉（focus 窗內接 trait） | **真的修好** | 招式那一筆先派**新事件** `ys:fx-focus-end`（`index.html:4709`），`camera-director`／`duel-figures` 各自提前收（220ms 回位段）。不用 `ys:fx-trait-cancel` 是因為它還會清 orbit／lean、中斷 trait-fx 編舞。證據：決定性治具 U2 = focus-end 後回 4.2 誤差 0；真實路徑上招式接手後的抽樣量到 op 0.94（正在回原值）。關掉近景時一個事件都不派 → P0 仍逐欄相同 |
| MEDIUM-4 | `pwActorCard` 直接 `FAC[fac].n[0]` 會炸 | **真的修好（防禦性，沒有能重現的種子）** | 改 `const fm=FAC[fac]; fm?fm.n[0]:"肉"`，`fac-${fac}` class 也只在 `fm` 存在時加。要踩到得同時「有法寶名、fac 卻查不到」（`pwEvFac` 會回 `"lantern"`），六個種子沒撞到，所以**沒有修復前的紅燈**，只有程式碼與 P7 全程 0 error |
| 傳說出手卡（3/3 錯名） | `ab`／`m` 反查撞名 | **真的修好** | 名字改由資料帶：`pwArmyView` 依 bag 順序對位取 `x.n`（並核 `ab` 相符才採用）掛在單位上，`pwItemOf` 直接讀，反查表 `AB_ITEM` 刪除。實測（`.claude/tmp/namecheck.mjs`）：只有殘日→「殘日」；射日神弓＋殘日→「射日神弓」「殘日」；詛咒品夾在中間仍正確；空袋兜底隊→空字串 |
| L-1 | focus 記錄改吃 `?fxcount=1` | **真的修好** | 新增 `FX_COUNT_ON`（與 `window.__ysFxCount` 同一支旗標），`PW_FOCUS_LOG`／`PW_BEAT_LOG` 只在它為真時建 |
| L-2 | focus 期間 dist 下限 | **真的修好** | `FOCUS_FLOOR = 1.6`，`update()` 內 `focusK>0` 時用它，並註明理由（近景 2.6＋punch 1.2 也才 1.4，撞到 0.6 只可能是別處算爛了） |
| L-3 | HUD 三件加 SKIP 守衛 | **真的修好（一處取捨要講）** | `pwLamps`／`pwActorCard`／`pwGauge` 都加了 `||SKIP`。取捨：`pwGauge` 被擋掉之後，按跳過的那幾百毫秒內若還有紙紮被燒，隻數牌會減、量表停在最後一次的值（下一場 `pwArenaHTML` 重建就恢復）。照審查指示照做，但這一點記在案 |
| L-4 | `pwCloseupClear()` 清三拍燈 | **真的修好** | 清場時把 `#beatLamps` 每顆燈的 class 清空 |
| P8 直式 | 凍結檔 §2.1 修訂 | **真的修好** | 凍結檔補了修訂紀錄（原標準錯在哪、為什麼現在才知道、使用者裁甲）；直式截圖改名 `p-norotate-*.png`、`shots-portrait.json` 加 `caveat`、contact sheet 的那一行圖說改成「非產品畫面」 |

### 二版重跑（全部用二版程式）

| 條 | 結果 | 關鍵數字 |
|---|---|---|
| P0 | ✅ | `closeup-trace` identical=true（332,125 字元）；`?closeup=0` 對 seeds 1–3 各跑完整一局（14／14／20 場），七欄與 `fights[]` 與 `4051dd1` 逐欄相同；DOM 四樣皆無；開啟時 `FXC.focus>0` |
| P1 | ✅ | 18 場、每拍 ≤2、規則重算逐筆相同；hit-focus 5 場／burn-focus 14 場 |
| P2 | ✅ | 21 次切鏡 deepOk 21/21、回位 16/16 誤差 0、`monoQuiet` 16/16（判準：quiet≥8）、cancel／doSkip +300ms 皆 4.200；決定性治具 U1/U2/U3 全過；`monoCorr` 0/21 **只揭露不判**（重建自檢殘差 p95 1.00） |
| P3 | ✅ | 配角 96 筆最大 0.36、主角 keptMin 1.00、回全景後 38 筆全回原值、燒毀中 burnRise 0；**中斷後**：2 次抽樣、deeper 0、back 4/4 |
| P4 | ✅ | 54 個跳字＝54 筆演出交鋒（硬斷言）、同時最多 4、移除 54/54、位置 54/54（方框量法）、`under` 0 違規、跳過後 0 殘留 |
| P5 | ✅ | 燈 54／量表 17／卡 19，bad 0 |
| P6 | ✅ | **同一 session 交錯**跑（新／基準各 4 次，`--n=10 --uncap`）：新 {89.3, 83.3, 91.7, 91.7} 中位 **90.5**；基準 {92.6, 91.7, 96.2, 92.6} 中位 **92.6** → 比值 **0.977 ≥ 0.9**。注意整台機器這一輪比一版那一輪慢（基準自己從 111 掉到 92.6），所以只有交錯樣本可比、跨 session 的絕對值不可比 |
| P7 | ✅ | `duel-drive --duels=6` 開／關各一次 0 error；另 10 支治具 0 error |
| P8 | ✅（依 §2.1 修訂後的口徑） | 橫式 10 張重拍、contact sheet 重產；直式改名並標註非產品畫面 |
| P9 | ✅ | 既有 8 套測試全綠、`ash-freeze-probe` F1/F6 綠（141 段） |

### 二版新增／修改的檔案

- `js/duel-figures.js:388,405,414,420` `focusFall`；`:561` 接 `ys:fx-focus-end`
- `js/camera-director.js:98` `FOCUS_FLOOR`；`:406` 接 `ys:fx-focus-end`；`:471` focus 期間的 dist 下限
- `index.html:4709` 招式先派 `ys:fx-focus-end`；`:4650` 出手卡 FAC 防禦；`pwArmyView` 對位帶法寶名；
  `FX_COUNT_ON`；`pwLamps`／`pwGauge`／`pwActorCard` 的 SKIP 守衛；`pwCloseupClear` 清燈
- `tests/tools/closeup-drive.mjs`（cancel 抽樣、方框量法、`under` 旁證、多錄兩個事件）、
  `closeup-judge.mjs`（P3 中斷子句與歸屬、P4 硬斷言、P2 分母與重建自檢、併入決定性治具）、
  `closeup-cam-unit.mjs`（**新**）、`closeup-shots.mjs`／`closeup-sheet.py`（直式標註）
- `docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md` §2.1 修訂紀錄（P8 直式，使用者裁甲）
