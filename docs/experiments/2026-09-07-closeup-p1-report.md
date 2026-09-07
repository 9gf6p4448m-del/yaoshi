# 對決「近景切鏡」卷 批 1 原型——實作報告（2026-09-07，v0.45）

> **二版（冷讀對抗審查修補）**：§5 是逐條三態與證據；§1 的 P0–P7 數字已用二版程式重跑並就地更新，
> §2 的連拍與 contact sheet 也重拍過。
> **三版（第二輪覆審修補）**：§6。
> **合併 v0.44 之後的重跑**：§7（新基準＝`0c80537`）。
> **四版（第三輪覆審，治具修補）**：§8——這一輪**只動 `tests/tools`**，產品碼（`index.html`／`js/*`）一行未改。
> 一版／二版／三版的原始判讀留在 git 歷史（`affdb69`／`b065d4e`／`b37df9c`）。

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
| HIGH-1 | 人形端 `endFocusEv`／`focusEnvelope` 少了 `focusFall` | **真的修好** | 先建訊號再修：`closeup-drive` 在 `ys:fx-trait-cancel` 當下與 +80/+160/+300ms 取逐尊材質 opacity，`closeup-judge` P3 加「300ms 內回原值＋期間不得更暗」。**修復前**（`--cancel` 探針）B0／B1 在 dt 0/80/160 全是 0.36、dt300 只回到 **0.80** → P3=FAIL（`cancel-not-restored` 0/2）；**修復後** 0.36 → 0.48 → 0.96 → **1.00**，P3=PASS（back 4/4、deeper 0）。**突變驗紅打在正確的落點上**：HIGH-1 的落點是 `js/duel-figures.js`，紅燈就是上面那組 `closeup-drive --cancel` 的實測（MUTANT＝修好前的 duel-figures：dt300 **0.80**；修好後 **1.00**）。（`closeup-cam-unit.mjs` 打的是 `camera-director.js`，它在 `affdb69` 就有 `focusFall`，**不能拿來當 HIGH-1 的紅燈**——二版報告曾誤引，三版更正） |
| MEDIUM-1 | P4 位置量法循環論證（治具重抄 `pwScreenOf`） | **真的修好** | 改量「跳字中心 → 那一尊的畫面方框」：方框由**世界包圍盒八角投影＋canvas `getBoundingClientRect`**算（與被測邏輯的局部座標／0.9×scale／innerWidth 不同路），另加 `elementFromPoint` 旁證「跳字落在目標那一側的欄位或舞台」。「每筆演出交鋒＝一個跳字」由只印改成硬斷言：**54 = 54**。量不到方框的記 `unmeasured` 不當通過（本輪 0 筆）。實測 54/54 在門檻內、`under` 0 違規 |
| MEDIUM-2 | P2 單調子句零鑑別力（hit 類 3/6 次 quiet=0） | **真的修好（改走替代路徑，原提議法被自檢否掉）** | ① 靜幀版加前提 `quiet≥8`，不足標 `null`：本輪 **16/16** 可判且全過（全是 burn 類），hit 類只有 1 次可判 ② 提議的「扣掉 punch 解析包絡」照做並附自檢——**非 focus 期間扣完應回 4.2，實測殘差 p50 0.054／p95 1.00**，重建不可信（renderer 夾 dt＋hitstop 歸零，導演內部時鐘與牆鐘對不起來），依 `02 §6.1` 第 4 條**只揭露不判** ③ hit 類的曲線形狀改由新治具 `closeup-cam-unit.mjs`（同一支 director、固定 dt、虛擬時鐘、只派 focus 不派 punch）驗：U1 最低 2.600、反轉 0、870ms 回 4.2 誤差 0；U2（focus-end）／U3（cancel）回位誤差 0。該治具對「拿掉 focusFall」的壞版本會紅（見 HIGH-1） |
| MEDIUM-3 | 招式被退暗蓋掉（focus 窗內接 trait） | **真的修好** | 招式那一筆先派**新事件** `ys:fx-focus-end`（`index.html:4709`），`camera-director`／`duel-figures` 各自提前收（220ms 回位段）。不用 `ys:fx-trait-cancel` 是因為它還會清 orbit／lean、中斷 trait-fx 編舞。證據：決定性治具 U2＝focus-end 後回 4.2 誤差 0；真實路徑上 focus-end 之後 62ms 起的逐尊序列 **0.36 → 0.42 → 1.0**（正在回亮）。關掉近景時一個事件都不派 → P0 仍逐欄相同。**要揭露**：P3 的 `cancelDeeper`（中斷後不得更暗）對 HIGH-1 這個 bug **零鑑別力**——那次中斷發生在 `focusK` 已滿幅時，壞版本也不可能更暗；真正抓到它的是「300ms 內回原值」，而防線目前只靠 `--cancel` 探針的**單一時間點、單一場對決**（三版量到 1 次中斷、2 尊）。要更厚得多打幾個中斷時間點（批 2） |
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

---

## 6. 三版：第二輪覆審的處置（2026-09-07）

| # | 項目 | 三態 | 紅→綠證據 |
|---|---|---|---|
| 1 | P4 `under` 旁證誤紅 | **真的修好** | 根因：治具只記 `tagName+#id`，`.fighter` 裡的 `fdir/fav/fnm/pwbody` 都是沒有 id 的 div → 記成 `"DIV"`、白名單一律不 match。**紅**：seed=5 `--duels=10` → `P4=FAIL`（`under:"DIV" want:"DIV#dR"`）。**修**：治具改記 `el.closest('#dL,#dR')` 的 id，judge 白名單改判「祖先鏈含目標欄／`#duel`／canvas」。**綠**：seeds 1/3/5 各 10 場、115 筆 → `P4=PASS`（`under` 0 違規） |
| 1b | 跳字「沒移除」誤紅（同一輪抓到的第二個治具缺陷） | **真的修好** | 根因：跳字 DOM 是**重用池**，同一個節點被下一筆再用，`document.contains(node)` 在檢查點又是 true。**紅**：seed=5 那一輪 2 筆 `not-removed`（−4、−4）。**修**：每次冒出來蓋流水號 `probeSeq`，並用 MutationObserver 的 `removedNodes` 記真正的移除時刻。**綠**：115/115 全部移除，最慢 **674ms**（門檻 `DMG_MS+100 = 700ms`） |
| 1c | 退暗抽樣讀到舊幀（新發現） | **真的修好** | 根因：退暗是每幀寫的，卡幀時抽樣讀到的是幾十毫秒前那一幀。**紅**：seed=1 duel6 一次 **229ms 頓幀**，`dt=260` 抽樣落後最後一幀 **209ms**，讀到 focus+51ms 的中途值 **0.52**（＝包絡 k≈0.74），10 筆 `dim>0.40`。**修**：judge 對「落後最後一幀 >60ms」的抽樣不判並計數。**綠**：同一批資料重判 → 配角 695 筆最大 **0.36**、`staleSkipped=5`、`bad 0` |
| 2 | `FOCUS_FLOOR` 1.6 算錯 | **真的修好** | 合法最低＝`FOCUS.dist 2.6 − PUNCH.dist 0.6 × 上限 2 = 1.4`（bolt 到得了：`1.5 × fxPower ≤1.6 = 2.4 → 夾成 2`）。治具加 U4（切鏡滿幅後派 `power=2` punch）。**紅**（floor 1.6）：`min |position| = 1.6766`。**綠**（floor 1.4）：**1.6139**，與解析值一致（60fps 第一幀 pk=1.771 → dist 1.537，微震 +0.077），差 **0.063** 就是被夾掉的量。註解算術一併改正 |
| 3 | 報告 §5 的證據歸屬 | **真的修好** | HIGH-1 欄改引 `closeup-drive --cancel` 對 duel-figures MUTANT 的 0.80 紅／1.00 綠，並註明決定性治具打的是 camera-director、不能當 HIGH-1 的紅燈；M-3 欄改成覆審量到的序列 0.36 → 0.42 → 1.0，並揭露 `cancelDeeper` 的零鑑別力與防線厚度 |
| 4 | P2「focus 與 ORBIT 疊加」子句 | **已揭露，不改門檻** | 凍結檔 P2 的「什麼實作會讓它紅：focus 與 ORBIT 疊加造成 dist 抖動」在現行架構下**恆真**：ORBIT 只加 yaw，而 `|camera.position|` 與 yaw 無關（`position=(sin·h, sin(tilt)·d, cos·h)`，平方和＝d²），那一條在任何實作下都不會紅——**這是凍結檔原有的零鑑別力子句，不是二版造成的**；決定性治具的 U1 同樣對 ORBIT 零鑑別力。門檻一字未動，只在此揭露 |
| 5 | P4 量法改「距方框 ≤80px」 | **已寫進凍結檔 §2.1 修訂 2** | 使用者裁定「都照建議」同意（主對話轉述）。改前／改後：22 筆中 1 筆距框心 107.5px（舊法紅）但距框 0px；三版 115/115 綠 |
| 6 | P3 判定窗併入截斷 | **已寫進凍結檔 §2.1 修訂 3** | 同上。改前／改後：39 筆丟 4 筆，其中 1 筆 `dt260 op=[0.62, 0.36]` 在舊窗下會紅；新窗下配角 695 筆最大 0.36、bad 0 |

### 三版重跑（seeds 1/3/5 各 `--duels=10`，共 26 場對決）

- `P1 ✅` 26 場、hit-focus 17 場、burn-focus 24 場、每拍 ≤2、規則逐筆相同
- `P2 ✅` deepOk 全過、`monoQuiet` 全過、決定性治具 U1–U4 全過
- `P3 ✅` 配角 695 筆 ≤0.36、主角 66 筆 ≥1.00、回全景 127 筆回原值、burnRise 0、中斷 back 2/2、stale 5 筆不判
- `P4 ✅` 115 = 115、同時最多 5、移除 115/115（最慢 674ms）、位置 115/115、`under` 0 違規
- `P5 ✅`　`P7 ✅`（0 error）

---

## 7. 合併 v0.44（`0c80537`）之後的重跑

合併方式：`git merge 0c80537` 進本分支。衝突只有 `index.html` 的 VERSION 行，取
`VERSION="0.45", VERSION_NOTE="近景切鏡批 1（?closeup=0 可關）；請神預設開，?legend=0 可關"`；
`docs/GAME_DESIGN.md` 兩條 changelog 都留（各自在原本的位置）；`tests/legend.test.mjs`／`legend-gate.mjs` 取 main 版（`git diff 0c80537` 為空）。

| 條 | 結果 | 數字 |
|---|---|---|
| P0 | ✅ | `closeup-trace` 對 `0c80537:index.html` **identical=true**（386,483 字元）；`?closeup=0` seeds 1–3 各跑完整一局（14／14／20 場）與 `0c80537` 實跑比對：`fights[]` 逐字相同、七欄相同（seed 3 見下方「收尾邊界」） |
| P1 | ✅ | 重數活性：seeds 1–6 共 **36 場**，hit-focus **18 場**、burn-focus **33 場**（門檻 6／3／2），每拍 ≤2、規則重算逐筆相同 |
| P2 | ✅ | 67 次切鏡：deepOk 67/67、回位 45/45 誤差 0、`monoQuiet` 49/49、cancel／doSkip +300ms 皆 4.200；決定性治具 U1–U4 全過（U4 min 1.6139，未被夾） |
| P3 | ✅ | 配角 787 筆最大 **0.36**、主角最小 **1.00**、回全景 188 筆回原值、burnRise **0**、中斷 back 2/2、stale 3 筆不判 |
| P4 | ✅ | **149 = 149**（每筆演出交鋒一個跳字）、同時最多 4、移除 149/149（最慢 674ms）、位置 149/149、`under` 0 違規、跳過後 0 殘留 |
| P5 | ✅ | 燈 108／量表 60／卡 83 次抽樣，bad 0 |
| P6 | ✅ | 同 session 交錯：`--n=10` 新 {91.7, 99.0, 97.1} 中位 **97.1**／基準 {114.9, 103.1, 98.0} 中位 **103.1** → **0.942**；`--n=8` 新 {103.1, 104.2} 中位 103.65／基準 {106.4, 100.0} 中位 103.2 → **1.004**。兩檔都過 0.9 |
| P7 | ✅ | `duel-drive --duels=6` 開／關各一次 0 error；另 11 支治具 0 error |
| P9 | ✅ | 8 套測試全綠（aistake 8／conscap 5／duel-desync 7／**legend 20**（v0.44 加了 3 條）／lineup-order 5／nightrules 16／review 28／wish16 36）；`ash-freeze-probe` F1 0／F6 0 綠 |
| 旗標互斥 | ✅ | `?legend` 與 `?closeup` 互不干擾：預設 (true,true)／`?legend=0` (false,true)／`?closeup=0` (true,false)／兩個都帶 (false,false)／`?legend=1&closeup=1` (true,true) |

### 收尾邊界（seed 3；量測邊界的決定，列出來請使用者確認）

seed 3 的**全域**計數器有 4 欄各差 1（`burn 91/92`、`burnDom 26/27`、`trait 87/88`、`traitFig 71/72`），
但 `fights[]` 逐字相同、`beat`／`duels` 相同。根因不是行為差：兩邊的驅動器停手時**都已經開了第 21 場對決但沒演完**
（`ys:duel` 21 次、`ys:duel-end` 20 次），那一場不會進 `fights[]`（push 在 `playDuelWar` 最後）但全域計數器已經加過；
而且 `FXC` 與治具的事件快照是先後兩次 `page.evaluate` 讀的，中間那一場又往前跑了幾筆
（尾段事件：off `{duel:1, trait:1}`／base `{duel:1, trait:1, punch:3, hitstop:2, burn:1}`）。

處置：P0 的計數器比對改在**已完成的對決**這個共同切點上做（`fights[]` 逐字相同 ＋ 各計數器在 fights 上的合計相同
＋ `beat`／`duels` 仍比原始值），原始總數與尾段事件一併揭露。切點上：`burn 91=91`、`burnDom 26=26`、`burnFig 65=65`、`trait 87=87`。
**這是量測邊界的決定，不是門檻**——它沒有放過任何一場演完的對決；但因為它讓 seed 3 從「紅」變成「綠」，
按 `02 §2.1` 的判準仍請使用者確認：(甲) 接受此切點；(乙) 要求改治具讓兩邊在同一場次收手再比原始總數。

### ash-freeze 的活性

第一次跑「遞補有動（burn>MAXFIG）」是 `false`（那一局沒有出現燒毀數 > MAXFIG 的對決，遞補路徑沒被行使），
F1／F6 仍綠；再跑一次為 `true`（`runs 共 126 段`）。兩次都 0 error。

---

## 8. 四版：第三輪覆審的治具修補（2026-09-07）

**這一輪沒有動產品碼**：`git diff de8c3be -- index.html js/` 為空，改的全在 `tests/tools/`（量測與判準）。

| # | 項目 | 三態 | 紅→綠證據 |
|---|---|---|---|
| A | P0 切點漏了 `beat` | **真的修好（改走乙案，切點表整個拿掉）** | 二版的切點只涵蓋 `burn/burnDom/burnFig/trait`，而 `FXC.beat++` 在 `pwPlayBeat` 內、第 21 場一開演就污染 → 覆審重跑 seed 3 `P0=FAIL`（beat 60 vs 61）。**修**：`closeup-drive` 在**每一次 `ys:duel-end` 當下**對 `FXC` 存一份深拷貝（`C.snaps[已演完幾場]`），judge 取兩邊都達到過的最大場次當共同切點，**比原始七欄**，切點 escape（`'cut'`）整段刪除。**綠**：seed 3 切在第 19 場 → `burn 84/84、burnFig 58/58、burnDom 26/26、trait 79/79、traitFig 64/64、beat 57/57、duels 19/19`、`fights[]` 逐字相同 → `P0=PASS` |
| B | cancel 子句缺「下一次 focus」守衛 | **真的修好** | seed 7 實測中斷後 97ms 就來新 focus，B 側被正確地再退暗卻被判成 `cancel-deeper`／`not-restored`。**修**：cancel 迴圈與 P2 的 `backAfter` 都補上「這一筆抽樣之後若已有新的 `ys:fx-focus` 就不判」，另補 `ys:duel-end`（基座機位已在往 3.6 走）與 punch（同 P2 主窗的 `busy()` 規則）兩支守衛，並逐項計數揭露。`--cancel` 探針改成**每一次 focus 都派一次**（上限 20）、`--skipfocus` 改成**每一場按一次**。**綠**：cancel 樣本 11 筆（判 5、排除 6：新 focus 1／punch 5）全部 4.200；skip 樣本 4 筆（判 1、排除 3 都是 duel-end 已發）4.200；P3 的中斷子句 22 次、`cancelBack 177/177`、`cancelSkippedByNextFocus 3`。0 樣本仍是 fail-closed |
| C | stale 過濾＝丟樣本 | **真的修好（改成重算期望值，不丟）** | 二版對「落後最後一幀 >60ms」的抽樣直接 `continue`，那是第四次放寬且沒記 §2.1。**修**：改用**最後畫的那一幀的時刻**重算該時刻的包絡期望退暗量（`envK`：進 160ms／停 ms／回 220ms，與 `duel-figures` 同一組常數），容差 0.08（量化 1/50 ＋幀間誤差），樣本照判。**綠**：本輪 360 筆抽樣中 17 筆 stale、其中 48 個 fig 列改走期望值判定，`bad 0`；新鮮樣本仍照凍結檔的 `≤0.40` 判（實測最大 0.36） |
| D | 招式截斷的回位段沒進 P3 | **真的修好** | `closeup-drive` 對 `ys:fx-focus-end` 也做同一組（0／80／160／300ms）逐尊抽樣。本輪 22 筆中斷抽樣裡有 10 筆來自 `focus-end`、11 筆來自 `trait-cancel` |
| D2 | §2.1 修訂 3 的「不是不驗」措辭 | **真的修好** | 改成準確措辭：截斷後**被這組抽樣涵蓋到的時點**有驗；沒被任何抽樣涵蓋的幀（兩次抽樣之間、或中斷後立刻又來新 focus 的那幾幀）是**涵蓋缺口**，不是「已驗證」 |
| E | `underCol===null` 當萬用通行證 | **真的修好** | 改成三分：落在目標欄或 `#duel` → 過；落在**對面那一欄** → 紅；`null`（連 `#duel` 都不在，多半是 3D canvas）→ 過但**計數揭露**。本輪 184 筆中 `underOutsideDuel = 3` |
| F | 抽樣筆數 vs fig 列數混在一起 | **真的修好** | P3 現在分開印：`samples`（一次 `snapFigs` 算一筆）與 `figRowsDimmed`（逐尊列數）。本輪 **360 筆抽樣 / 1133 個退暗 fig 列** |

### 四版全量重跑（seeds 1/3/5/7/9 各 `--duels=10`）

`VERDICT P0=PASS P1=PASS P2=PASS P3=PASS P4=PASS P5=PASS P7=PASS`

- **P0**（`?closeup=0` seed 3 vs `0c80537`）：共同切點＝第 19 場，七欄逐欄相同、`fights[]` 逐字相同、DOM 四樣皆無
- **P1**：**42 場**、hit-focus **28 場**、burn-focus **40 場**、每拍 ≤2、規則逐筆相同
- **P2**：90 次切鏡 deepOk 90/90、回位 60/60、`monoQuiet` 62/62、hit 類可判 37 次；cancel 5/5＝4.200、skip 1/1＝4.200；決定性治具 U1–U4 全過
- **P3**：360 筆抽樣（stale 17，其中 48 fig 列走期望值判定）、1133 個退暗 fig 列最大 **0.36**、主角最小 **1.00**、回全景 254 筆回原值、`burnRise 0`、中斷 22 次 `cancelBack 177/177`、`bad 0`
- **P4**：**184 = 184**、同時最多 5、移除 184/184（觀察者上界 724ms，判準是 +700ms 那一刻已不在 DOM）、位置 184/184、`under` 0 違規（`outsideDuel 3` 已揭露）、跳過後 0 殘留
- **P5**：燈 126／量表 106／卡 132，bad 0　**P7**：8 份紀錄 0 error
- **P9**：8 套測試全綠（aistake 8／conscap 5／duel-desync 7／legend 20／lineup-order 5／nightrules 16／review 28／wish16 36）
