# 第 4 卷「請神」冷讀對抗式覆審（fresh context，2026-09-07）

覆審者沒有實作者的對話史，只讀 diff、規格、凍結檔與程式碼，另跑 headless 探針。
目標：找實作者自己那一輪覆審**沒抓到**的東西。

## 0. 我實際覆審的是哪一版（先講清楚，因為目標在移動）

| 項目 | 值 |
|---|---|
| 委派指定的最終 SHA | `57d7c2d` |
| worktree 實際 `HEAD` | **`b8901a7`**（「請神三版：L1′→L1″，只動治具與文件」） |
| 工作區狀態 | **髒的**：`index.html`、`tests/legend.test.mjs`、`tests/tools/legend-gate.mjs`、4 份 docs 有未提交改動；另有未追蹤的 `pw5.log`、`gate-10000-v4.md` |
| 未提交的 `index.html` 改動 | 新增 `shrineOrderKey()`＋把 `resolveShrines` 的同分排序鍵換掉（＝下面的 H1 正在被修） |
| 實作報告狀態 | §零之前「四版」已寫好，但閘門表還是 `<!--V4TABLE-->` 佔位符 |

**因此**：本報告的靜態分析同時涵蓋 `57d7c2d` 與工作區；每條 finding 都標明證據跑在哪一份。
`02 §7`「同一 repo 同時只允許一個會寫檔的 agent，否則覆審員量到的是移動中的目標」在這一輪成立了。

探針全部在 `C:\Users\shung\AppData\Local\Temp\claude\C--Users-shung\f080092c-c701-4325-911e-8f7aed6af769\scratchpad\review-legend\`：
`p1-killswitch.mjs`／`p2-ledger.mjs`／`p3-adversarial.mjs`／`p4-gatepower.mjs`／`p5-mutant.mjs`／
`p6-parity-history.mjs`／`p7-gift.mjs`／`p8-cost.mjs`／`p9-tie.mjs`／`p10-tie2.mjs`／`p11-57-gate.mjs`。
全部走 `tests/tools/load.mjs` 載入真的 `index.html`，呼叫真的 `simulate`／`playPolicyGame`／`runMany`／`resolveShrines`／`duelBags`。

## 1. 分級總表

| # | 級 | 一句話 | 在哪一版 |
|---|---|---|---|
| H1 | HIGH | 同香火平手的擲骰順序沒照凍結檔做，先手權**永久固定給南家（真人座位）**、北家一次都輪不到 | `57d7c2d`（工作區已在修） |
| H2 | HIGH | 閘門 L3′② 是**恆真斷言**：分子算局、分母算人次，理論上限 52% < 門檻 55%，怎麼壞都綠 | 兩版皆是 |
| H3 | HIGH | 閘門 L4 只設上限、量不到「**不燒香＝被支配**」：`incenseNever` 15.5%，比同出價法的 `splitter` 低 8.8pp | 兩版皆是 |
| H4 | HIGH | 機制倒錯：**請到神的人燒光壽命必死且零補償，同一夜落敗的人反而被階段獎勵救活**，那一尊隨死者永久退場 | 兩版皆是 |
| M1 | MEDIUM | 熱座交棒的「雙保險」清單漏掉 `.incbar`，上一位的密封燒香內容留在 DOM | 兩版皆是 |
| M2 | MEDIUM | 因燒香而死的人不會進 `H.deaths`，局末回顧的「☠ 出局」永遠看不到這類死亡 | 兩版皆是 |
| M3 | MEDIUM | 閘門 L1″ 的 payoff／stageReward 是**重抄一份**請神規則的模型，不是真實路徑 | 兩版皆是 |
| M4 | MEDIUM | 階段獎勵的小法寶直接改變 `facCount`／共鳴，沒有任何閘門在量它 | 兩版皆是 |
| L1 | LOW | `shrineOrderKey` 的 `w==null` 分支恆假，規則頁卻向玩家描述那個不存在的情況 | 工作區 |
| L2 | LOW | `out.rolls` 沒進 `S.history`，局末回顧看不到「誰擲了沒中」 | 兩版皆是 |
| L3 | LOW | 報告說 ON／OFF 的溢出「逐值相同」，但逐步清單是不同種子、不成對；真正成立的只有固定頁對照 | 兩版皆是 |

**CRITICAL：0 條。** 委派指定的三類 CRITICAL（白拿傳說／燒香零成本／關閉旗標仍改變賽局）我都用真實路徑證偽了，
證據列在 §3。

---

## 2. 逐條 finding

### H1（HIGH）同香火平手的先手權永久固定給南家，北家一次都輪不到

**情境**：`resolveShrines` 逐龕排序想決定「誰先擲」。凍結檔「範圍」段明文寫死：
> 同 h 的擲骰順序＝從本夜風位家起順時針（`WIND_SEQ` 次序），**不依座位 id**；沒有風位的夜從 `WIND_SEQ[round % 人數]` 起算——使用者 2026-09-07 裁定甲

**檔案:行號**：`57d7c2d` 的 `index.html:2570`
```js
const rollers=S.players.filter(...).sort((a,b)=>sh.h[b.id]-sh.h[a.id]||a.id-b.id);
```
`a.id-b.id`＝座位 id 升冪，南家 id 0 永遠排第一、北家 id 3 永遠排最後。

**證據**（`p10-tie2.mjs`，3000 局 `simulate`，只數「本夜最高香火有並列」的龕夜）：

| 版本 | 並列龕夜 | 並列者座位次數池 | 實際先擲的座位 | 先擲即請走 |
|---|---|---|---|---|
| `57d7c2d`（座位 id 序） | 1983 | `[892,1030,1069,1050]` | **`[892,728,363,0]`** | **`[153,114,66,0]`** |
| 工作區（`WIND_SEQ` 序） | 1976 | `[887,1027,1069,1052]` | `[500,401,573,502]` | `[73,76,95,89]` |

並列的機會四家幾乎一樣多（次數池近乎均勻），但在 `57d7c2d` 上：
南家只要並列就 **892/892＝100% 先擲**、北家 **0/1050 次一次都沒先擲過**；
折算成實際多請走的尊數是 153 : 114 : 66 : **0**。南家＝真人座位。

**這條同時是驗收缺口**：凍結檔把這件事寫進「範圍」，L0–L7 卻沒有任何一條在檢查它，
所以 `57d7c2d` 的報告可以在「閘門全綠」的情況下漏掉一條使用者明訂的裁定。

**建議修法**：工作區未提交的 `shrineOrderKey()`（`index.html:2549-2556`，排序鍵在 `2584`）就是對的修法，數據也證明它把偏差抹平了——
把它提交進來即可。另外請把「同分擲序」補成一條可機械判定的驗收（`tests/legend.test.mjs` 第 16 案已經是）。

---

### H2（HIGH）閘門 L3′② 是恆真斷言，零鑑別力

**情境**：`tests/tools/legend-gate.mjs` L3′ 第 ② 條標題是「持有任一尊者最終勝率 ≤55%」。

**檔案:行號**：`tests/tools/legend-gate.mjs`（L3 段）
```js
games.forEach(g=>{ ...; hold+=g.holders.length; if(g.holders.includes(g.winnerId)) holdWin++; });
const hw=hold?holdWin/hold:0;   const okB=hw<=0.55;
```
分子 `holdWin` 每局最多 +1（冠軍只有一個），分母 `hold` 每局 +「本局不同持有者人數」（最多 3）。

**證據 A——理論上限**（`p4-gatepower.mjs`，n=2000 `playPolicyGame`）：
```
總 holders 人次= 3755  有 holder 的局= 1954  holders/局分布= {"0":46,"1":516,"2":1075,"3":363}
實測 hw = 0.3933 (1477/3755)   門檻 ≤0.55
★理論上限（假設「只要有人請到，冠軍必是持有者」）= 0.5204
→ 門檻 0.55 在所有合法輸入下必然通過（恆真）： true
```
`57d7c2d` 上覆核（`p11-57-gate.mjs`，n=1500）：`hw=39.42%`、上限 `52.12%`——同樣恆真。

**證據 B——反面（把系統換到「壞掉」狀態，這個證據會不會變紅）**（`p5-mutant.mjs`，n=1500／L4 n=600）：
把三尊改成 `atk 99 / hp 99 / count 5`（＝明顯支配，只動資料表不動引擎）：

| 閘門 | 原版 | 突變版（三尊壓倒性強） |
|---|---|---|
| L2 至少一尊被請走 | 97.7% ✅ | 97.7% ✅ |
| L3① 平均位移 | 33.9／41.6／57.2 pp ✅ | 33.9／41.6／85.8 pp ✅ |
| **L3② hw** | 39.42%（上限 52.12%）✅ | **44.95%（上限 52.89%）仍 ✅** |
| L4 winRate | incenseMax 31.83% ✅ | **incenseMax 57.83% ❌紅** |

L4 有鑑別力（紅了），**L3② 在「傳說完全支配賽局」的狀態下依然是綠的**。

**建議修法**：這個比值想量的是「請到神的人是不是就贏定了」。正確口徑二選一——
① 分母改成「有持有者的局數」，門檻按「四人局中冠軍是持有者的機率」重訂（隨機基準＝ `E[holders]/4`≈48%）；
② 或直接改量「持有者 vs 未持有者的最終名次分佈」，每局每人一筆，基準 2.5 名。
無論選哪個都要附「突變版會變紅」的實測，不然換一條門檻只是換一個恆真式。

---

### H3（HIGH）L4「無支配策略」只設上限，量不到「不燒香＝被支配」

**情境**：L4 的判定是「座位 0 勝率各 ≤40%」。這只擋得住「某策略太強」，擋不住「某策略弱到不能選」。

**證據**（`p8-cost.mjs`／`p11-57-gate.mjs`，`runMany` 真實路徑；`incenseMax` 與 `incenseNever` 出價法**完全相同**都是 `policySplitter`，唯一差別是燒不燒香）：

| 版本 | n | incenseMax | incenseNever | splitter（＝預設啟發式） |
|---|---|---|---|---|
| `57d7c2d` | 600 | 31.83% | **15.50%** | 24.33% |
| 工作區 | 500 | 32.8% | **15.6%** | 23.8% |

四人局的隨機基準是 25%。也就是說：把「燒香」這一個旋鈕從「燒滿」轉到「不燒」，
勝率從 +7.8pp 掉到 **−9.4pp**，而且**低於同一份出價法的 `splitter` 8.8pp**——
`incenseNever` 是被 `splitter` 嚴格支配的策略，燒香實質上是強制動作。
凍結檔 L1 原文要的正是「『永不燒』『每夜燒滿』都要被某個對手組合打敗」，
但 L1″ 量的是**單夜快照**的弱優勢，L4 量的是整局勝率卻只判上限——兩條合起來剛好漏掉「永不燒被支配」這一格。

**附帶（把「燒香零成本」這個假設證偽）**（`p8-cost.mjs`，n=500）：

| 變體 | incenseMax | incenseNever | splitter |
|---|---|---|---|
| 原版 | 32.8% | 15.6% | 23.8% |
| 三尊改成 `atk0/hp1/×1/無 trait` | **14.8%** | 22.4% | 22.2% |
| 階段獎勵關掉（`INC_PITY→100000`） | 29.4% | 15.6% | 24.0% |

三尊變廢物之後燒香立刻變成**負收益**（14.8% vs 22.4%）⇒ 燒香確實有成本，優勢來自傳說本體；
階段獎勵只值約 3.4pp。**「燒香零成本／負成本」這條 CRITICAL 不成立。**

**建議修法**：L4 加一條下限判定（例如「任一列出的策略勝率不得低於 18%」或「`incenseNever` 相對 `splitter` 的位移不得低於 −5pp」），
並在凍結檔 §2.1 走一次「加嚴」的記錄（加嚴不需要使用者同意，但要留紀錄）。

---

### H4（HIGH）請到神的人燒光壽命必死且零補償，同一夜落敗的人反而被救活

**情境**：`resolveShrines` 的死亡掃描刻意放在最後一行（實作者自己那輪覆審的 H1 修法：讓已達天井的人不會被剝奪必成的請神）。
但這個順序造成的下游語意沒有人檢查：
- 贏家：`sh.h[win.id]=0` 之後才 `shrineClose(sh,out.rewards)`，`shrineClose` 的 `if(!h) return` 讓**贏家領不到任何階段獎勵** → 壽命停在 0 → 最後一行判死。
- 輸家：h 還在 → 領 `⌈h/2⌉` 回血 → 壽命回正 → 存活。

**檔案:行號**（工作區；`57d7c2d` 相同，行號 −14）：`index.html:2600-2601`（勝者歸零＋`shrineClose`）、`index.html:2603`（死亡掃描）。

**證據**（`p6-parity-history.mjs`，直接呼叫真的 `resolveShrines`）：
```
p0：life 1、h 10（燒最後 1 點 → h 11）           p1：life 1、h 11（燒最後 1 點 → h 12＝天井）
擲: [{"pid":1,"shrine":0,"h":12,"chance":1,"hit":true,"pity":true}]
請走: [{"pid":1,"shrine":0,"h":12}]   獎勵: [{"pid":0,"shrine":0,"h":11,"back":6,"gift":"山豬牙飾"}]
贏家 p1 life= 0 alive= false          ← 請到「殘日」，當場出局，尊隨他退場
輸家 p0 life= 6 alive= true           ← 沒請到，反而 +6 壽命活下來＋白拿一件小法寶
```
另一條（`p3-adversarial.mjs` (a)）：單人燒到 0 天井請走 → `p0 life=0 alive=false，bag 含傳說=['殘日']，神龕0 open=false`。
那一尊被鎖在死人袋裡，全桌永遠少一尊。

**真人按得到嗎——按得到，而且沒有警示**：`updateBudget`（`index.html:4098-4106`）把燒香算進 `tot`，
判定是 `el.className=tot>cap?"over":""`／`$("mainbtn").disabled=tot>cap`，**`tot===cap` 是放行的**，
`cap=budgetFor(ap)=p.life`。所以「壽命 3、燒 3」按得下去，畫面上沒有任何一個字說「這會讓你出局」。
AI 不會踩（`aiIncense` 的 `life<LIFE*0.3`＋`amt<1` 兩道閘，實測 life≤12 一律回 `null`），
`policyIncenseMax` 會踩——也就是**只有真人和閘門策略會掉進這個坑**。

**建議修法**（擇一，但要是**明示的裁定**而不是掃描位置的副作用）：
① 燒香夾成「至少留 1 壽命」（與放血的 `BLOOD_FLOOR` 同一條慣例）；
② 或讓請到者也走一次結清（等同退 `⌈h/2⌉`），把「贏家零補償」這件事拿掉；
③ 或最低限度：`incbarHTML` 在 `INC.amt >= ap.life − 已出價` 時加紅字警示。
現況是「贏家死、輸家活」，這件事沒有寫進規則頁、也沒有任何測試在守（`tests/legend.test.mjs` 第 14 案只斷言「還請得走」，沒斷言生死）。

---

### M1（MEDIUM）熱座交棒的「雙保險」漏掉燒香列

**檔案:行號**：`index.html:3877`
```js
document.querySelectorAll("#stage .wishbar,#stage .stakebar,#stage .mybid,#stage .pickbox").forEach(el=>el.remove());
```
註解自己寫明這是「避免任何遮罩失效情境（透明主題、截圖工具）漏出對方心願」的雙保險。
但 `.incbar` 由 `showMarket`（`index.html:3905`）寫進**同一個 `#stage`**，內容是本席的**密封**選擇：
拜哪一尊（`.on` 的按鈕）、燒幾點（`.incamt`）、加上去之後的香火與成功率。`showHandoff` 沒有把它移掉。

**建議修法**：選擇器加 `#stage .incbar`。一行。

---

### M2（MEDIUM）因燒香而死的人不會進 `H.deaths`，局末回顧永遠看不到這類出局

**檔案:行號**：`index.html:3221`（`resolveBattles` 的 `deaths`）
```js
const deaths=[]; S.players.forEach(p=>{ if(p.alive&&p.life<=0){ p.alive=false;p.life=0;deaths.push(p);} });
```
只收「此刻**仍** `alive` 且 `life<=0`」的人。`resolveShrines`（`index.html:2603`）已經把旗子蓋掉了，
所以燒香致死者不在 `R.deaths`、不在 `recordNightEnd` 的 `H.deaths`、不在回顧的「☠ 出局」列。
`showReview` 因此會出現「某家最後是死的，但十二夜逐夜清單裡沒有任何一夜標他出局」。

同一個洞在 `resolveAuction`（`index.html:2474`）就已經存在＝**既有行為**，這一卷不是始作俑者；
但請神新增了一整類死亡（H4 說明它在真人手上是按得到的），洞被放大了。

**建議修法**：把三處死亡掃描收斂成一支 `sweepDeaths()` 回傳死者陣列（`02 §6.1` 第 7 條的「首選收斂」），
`resolveShrines` 把它的死者併進 `recordShrines`／`recordNightEnd`。分母＝目前 4 處（`resolveAuction`、`resolveShrines`、`settleShrinesEnd`、`resolveBattles`），數得出來。

---

### M3（MEDIUM）L1″ 的 payoff 是重抄的模型，不是真實路徑

**檔案:行號**：`tests/tools/legend-gate.mjs` 的 `payoff()` 與 `stageReward()`。
`payoff()` 自己重寫了「依 h 排序 → 逐一擲 → 第一個成功者關龕 → 其餘領階段獎勵」整條規則；
`stageReward()` 另抄一份 `P/3`／`2P/3` 區間，還把小法寶折成「1 點壽命當量（保守估）」。
四版已經把排序鍵改成呼叫引擎的 `G.shrineOrderKey`（做得對），但擲／關龕／階段獎勵仍是複本。

`02 §6.1` 第 4 條：重抄一份被測邏輯做成的探針**不得用於否證**。L1″ 的紅綠不是在真實路徑上取得的——
引擎哪天改了關龕或獎勵語意（例如 H4 的修法），L1″ 會安靜地繼續綠。

**建議修法**：`stageReward` 直接呼叫匯出的 `G.shrineReward`（已經在 `window.__yaoshi` 裡了）；
擲／關龕那一段改成呼叫真的 `resolveShrines`（用 `makeState` 造快照、`S.rng` 換成固定序列取期望值），
或至少在治具裡加一條「模型 vs 引擎在 N 組隨機快照上逐值相同」的自檢。

---

### M4（MEDIUM）階段獎勵的小法寶會改變共鳴，沒有閘門在量

**母體實測**（`p7-gift.mjs`）：
```
zuling   拼板舟(p4 ab:boat) / 山豬牙飾(p4) / 山神庇佑(p4 ab:shanshen)
xianghuo 虎爺印(p4 ab:tiger) / 香灰符(p4) / 福壽綿長(p3 ab:fushou) / 破軍旗(p2 ab:pojun)
yinqi    虎姑婆指甲(p4 ab:nail) / 陰陽眼銅錢(p4) / 飼鬼甕(p3 ab:sigui)
```
**好消息**：件數上限是 3（三龕各關一次），不會無上限增長；沒有 `drain`／`endStrip` 的負面件；
3000 局掃描 0 次抽到 `p>INC_GIFT_P` 或跨系（§3 表）。
**問題**：小法寶進袋直接讓 `facCount(p,f)` +1，可能剛好跨過 `CFG.SET_MIN` 觸發共鳴（`pwResLv`）；
而且母體裡 6/10 件是帶 `ab` 能力的。閘門 L1–L5 沒有任何一條在量「階段獎勵造成的共鳴／能力位移」，
`p8-cost.mjs` 量到階段獎勵整體只值 3.4pp，數字不大，但那是聚合值，不是共鳴跨門檻那一格。

**建議修法**：加一條記錄項（不必判）：`playPolicyGame` 統計「因小法寶而首次跨過 `SET_MIN` 的次數」。

---

### L1（LOW）`shrineOrderKey` 的 `w==null` 分支恆假，規則頁卻寫給玩家看

`index.html:1751` `const windPid=r=>WIND_SEQ[(r-1)%4];` ——**恆有值**。
`index.html:2552` 的 `(w==null)?...` 分支永遠走不到（`02 §6.1` 第 6 條的恆假式），
而規則頁（`index.html:3684`）卻對玩家說「沒有風位的夜從第 N 夜對應的位子起算」——描述一個不存在的情況。
建議：拿掉分支與那半句，或把 `windPid` 的契約改成真的可能回 `null`。

### L2（LOW）`out.rolls` 沒有進 `S.history`

`recordShrines`（`index.html:3256`）只存 `burn/taken/rewards`。局末回顧因此看得到「誰燒了幾點」「誰請走」「誰領香火散」，
但看不到「誰擲了沒中、機率多少」——那正是玩家最想事後回味的一格（即時演出 `startShrine` 有顯示）。

### L3（LOW）報告的「ON／OFF 溢出逐值相同」用語過寬

我用同一支 `legend-drive.mjs` 重跑（`--seeds=1 --port=8873`，輸出 `drive-on.log`／`drive-on.json`）：
```
console error 0、pageerror 0、requestfailed 0 → ✅
固定頁對照（同一局同一頁「蓋牌開標」）：橫式 []　直式 [{"sel":"#stage",...,"over":6},{"sel":"#market",...,"over":6}]
橫向溢出：橫式 4 筆、直式 2 筆 → ❌
```
逐步清單我量到 `body/#table over 19／3／7`，實作者留存的 `legend-drive-OFF.json` 是 `19／2`——
**不是逐值相同**，因為兩邊是不同種子、不同市集，本來就不成對。
真正成立、也是實作者結論所依賴的是**固定頁對照**（同一局同一頁）：ON 與 OFF 的 `landscapeFixed` 都是 `[]`。
結論（神龕列與燒香列沒有把 844×390 撐開、溢出來自既有的 `#south`／`#market`）我覆核**成立**，
但報告 §7.2 表格那句「逐值相同」建議改成「固定頁對照兩邊都無溢出」。

（另註：`legend-drive.mjs` 的 `OVERFLOW` 探針依 `overflow-x:auto/scroll` 放行自捲容器，
所以 `.incbar` **永遠**不會被報出來；直式 `@media(orientation:portrait){#shrines{display:none}}` 也讓直式的神龕列量測恆為 0。
兩者都是刻意設計，但「神龕列在直式會不會溢出」這個問題因此是空問句——量到的 0 沒有訊息量。）

---

## 3. 我證偽掉的 CRITICAL 假設（＝這些路我走過了，沒有洞）

### 3.1 白拿傳說：3000 局帳本掃描，18 條不變量 0 違規

`p2-ledger.mjs`：跑 `simulate(1..3000)`（真實路徑），逐夜讀 `nights[].shrine` 的 `burn/rolls/taken/rewards`
與**請神前**的 `mid` 快照（`snapPlayers()` 在 `resolveAuction` 之後、`resolveShrines` 之前，量測位置正確）：

```
{"N":3000,"games":3000,"nightsWithShrine":29754,"taken":7094,"rewards":757,"gifts":8,
 "burnLifeTot":47943,"backTot":1553}
違規計數：{"twoInNight":0,"takeNoBurn":0,"takeZeroH":0,"deadBurn":0,"deadRoll":0,"deadTake":0,
 "deadReward":0,"rewardNoH":0,"netGain":0,"giftHighP":0,"giftWrongFac":0,"takenTwice":0,
 "rollAfterClose":0,"legendInPool":0,"chanceMismatch":0,"rewardToWinner":0,"burnGtLife":0,"pityNotTaken":0}
```
逐條對應委派的問題：
- 不燒香／燒 0 就請到 → `takeNoBurn`／`takeZeroH` 0
- 請到不扣壽命 → 帳本上每一筆 `taken` 的 pid 當夜都有 `burn`；`burnLifeTot 47943` vs `backTot 1553`
- 一夜請兩尊 → `twoInNight` 0（`p3` (b) 另手工驗：兩尊都到天井也只請得到一尊，第二尊要等次夜再燒 1）
- 同尊被請兩次 → `takenTwice`／`rollAfterClose` 0
- 死者燒香／擲／請到／領獎 → `deadBurn`/`deadRoll`/`deadTake`/`deadReward` 全 0
- 負成本（退的 ≥ 燒的） → `netGain` 0（`back` 上限恆為 `⌈h/2⌉`）
- 小法寶抽到 p 高的或跨系 → `giftHighP`／`giftWrongFac` 0
- 機率與 `h/(h+K)` 不符、天井沒必中 → `chanceMismatch`／`pityNotTaken` 0
- 贏家自己領階段獎勵 → `rewardToWinner` 0

### 3.2 重入安全（同一夜連呼叫兩次 `resolveShrines`）

`p3-adversarial.mjs` (c)：
```
第一次燒: [{"pid":0,"shrine":0,"amt":3,"h":3}]  life= 27  h= 3
第二次燒: []                                    life= 27  h= 3
```
`S.incense={}` 的收尾生效（實作者覆審 M2 的修法有效）。UI 那側 `startShrine` 第一行也 `disabled=true`。

### 3.3 kill switch（`LEGEND_ON=false`）

`p1-killswitch.mjs`：
```
L0 預設 vs 基準 ca14065 逐位元組相等： true
L0 顯式 ON vs 基準不等：             true
OFF 後 S 的新欄位： []                     ← 沒有 shrines／incense／shrineStat
OFF 後 history 是否有 shrineDawn： false
ON  後 S 的新欄位： [ 'shrines', 'incense', 'shrineStat' ]
```
UI 側逐點覆核（讀碼）：`shrinesHTML`／`incbarHTML` 回空字串、`initIncense` 把 `INC` 設 `null`、
`updateBudget` 的 `inc` 恆 0、`submitHumanBids` 有旗標守衛、`startReveal` 走原本的「開戰」分支、
`openHelp` 的請神節是 `CFG.LEGEND_ON?sec(...):""`、`showReview` 的 `dawnRows`／`n.shrine` 都是 falsy。
實作者留存的 `legend-drive-default-off.json` 也記到 `legendOn=false`、`#shrines` 與 `.incbar` 都不存在。

### 3.4 兩條 headless 迴圈的請神結果一致

`p6-parity-history.mjs`：`simulate(s)` 與 `playPolicyGame(s,{})` 在 **500 顆種子**上
`shrines[].{i,takenBy,round}` **逐局相同（不一致 0 局）**。
（第三條是真人 `beginRound`——真人自己選燒多少，亂數流本來就會分岔，能驗的是「呼叫位置相同」：
`startReveal→resolveAuction` → `startShrine→resolveShrines` → `startBattle→resolveBattles`，
與 `simulate`／`playPolicyGame` 的 `resolveAuction → resolveShrines → resolveBattles` 同一位置，讀碼確認。）

### 3.5 `S.history` 不變量與兩條收尾路徑

`p6-parity-history.mjs`：400 局 `playPolicyGame`＋`finalizeHistory`：
```
不變量 life.length===nights.length+1 破的局數 = 0    末筆≠現值 = 0    有回天結清的局 = 76
```
「異事夜殺到剩一人」那條路：`settleShrinesEnd` 的 `sealed` 守衛要求 `HN.round===S.round`，
該路徑沒有 `recordAuction`／`recordNightEnd`，末筆停在前一夜 ⇒ `sealed=false` ⇒ 不覆寫，交回 `finalizeHistory` 補一筆。
兩個 `endGame` 綁定點（`index.html:3781` 異事路徑、`index.html:4643` 正常路徑）都會走到 `settleShrinesEnd`。

### 3.6 AI 不會把自己燒死；三尊都被領先時停手

`p3-adversarial.mjs` (e)（`CFG.LIFE=50`）：
```
三尊皆被領先 → aiIncense = null
life=30 → {"shrine":0,"amt":2}   life=20 → {"shrine":0,"amt":1}
life=12 → null   life=7 → null   life=5 → null   life=1 → null
```
兩道閘：`life < LIFE*0.3`（=15）不拜；`floor(life*aggr/div) < 1` 不拜。
`aiIncense` 的第一行 `if(!S.shrines||!p.alive) return null;` ⇒ `LEGEND_ON=false` 時不會寫任何欄位。

### 3.7 燒香扣壽命與出價上限的順序沒有繞過空間

`resolveAuction`（付標金）→ `resolveShrines`（燒香），所以 `consCapFor(p)`／`budgetFor(p)` 在出價當下讀到的是**扣香火前**的壽命；
但 `updateBudget` 把 `INC.amt` 一起算進 `tot` 並用同一個 `cap=budgetFor(ap)=life` 夾住，總額不會超過壽命。
`resolveShrines` 另有 `if(amt>p.life) amt=p.life`（帳本 `burnGtLife` 0 次）。**沒有「燒到 0 再出價」或「出價後再燒」的漏洞。**
（唯一的副作用就是 H4：`tot===cap` 放行 ⇒ 燒到 0 ⇒ 死。）

### 3.8 規則頁與引擎同一條公式

`index.html:3684`：機率表 `Array.from({length:CFG.INC_PITY-1},...)` 逐格現算 `h/(h+CFG.INC_K)`（h=1..11），
天井那格明寫「不擲骰、直接請下來……不要自己去算 P/(P+K)」——與引擎 `const chance=h/(h+CFG.INC_K); const pity=h>=CFG.INC_PITY;` 一致。
三段區間界寫成 `⌈P/3⌉`／`⌈2P/3⌉−1`／`⌈2P/3⌉`／`P−1`，與引擎的 `h<P/3`／`h<2P/3` 在 P=12（整除）與 P=13（不整除）兩種情況下都逐格相同（手算覆核）。
`?legend=1/0` 只認這兩個字串、其餘值落回 `CFG` 預設，只影響這一次載入（無持久化）。

---

## 4. 給主對話的一句話

`57d7c2d` 的**機制本身**經得起白拿／零成本／kill switch 三類攻擊（§3 全部證偽）；
但 **H1 是一條使用者明訂卻沒實作、也沒有任何閘門在守的裁定**（工作區正在修），
**H2／H3 說明「閘門全綠」這件事在 L3②／L4 這兩格上證明力不足**（H2 已用突變版證明恆真），
**H4 是一個沒人裁定過、真人按得到、也沒寫進規則頁的機制倒錯**。
建議：H1 提交修法後補一條擲序驗收；H2／H3 依 `02 §2.1` 走「加嚴」記錄後重訂；H4 需要使用者裁定（`03 R3` 路徑 1：這是風控數值等級的機制決定）。
