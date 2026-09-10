# 《妖市》ROADMAP_V2 架構評審報告（Design & Architecture Review）

> 角色：主系統架構師與資深遊戲製作人。Plan Mode，不動任何程式碼。
> 基準：線上 v0.53（`d400b33`，請神 3.0 香火池）。評審對象：`docs/ROADMAP_V2.md`（2026-09-09）七章。
> 依據：`docs/GAME_DESIGN.md` 三支柱／§5.1／六之四閘門、`docs/ARCH_SPEC.md` §2–§5／§8、`index.html` 五張表與 `playDuelWar`、`js/`。

## Context（為什麼做這份評審）
製作人用 Antigravity 梳理出 ROADMAP_V2 七章與 Top 3 優先序，要求在寫任何代碼前先做一次架構評審：四個技術維度的可行性與設計、亮點、工程地雷、以及需要製作人拍板的 2～3 個關鍵決策。本報告的產出是**決策清單與各題的建議落地路徑**，不是實作計畫；製作人拍板後各題再依 `02 §2` 各自開卷（提案＋凍結檔）。

**先講結論（給只看三行的人）**
1. 四題技術上都可行，而且都有現成骨架可接：時間軸與引擎已分離、hook 表已是單一入口、3D canvas 整局都在、`S.history` 已記到每筆出價。**沒有一題需要重寫底層。**
2. 真正的地雷不在技術，在四件事：①招式時長 900 這個數字散在 **20 處**（runtime 4、治具 16），改一處漏十九處；②既有縮時有 2.2× 天花板，藍圖的 200–300ms 做不到，**500ms 是不換內容的上限**；③桌心掏空會撞到 `#felt` 零餘裕的高度預算，而且 `#felt` 不能拆（三樣既有假設綁著它）；④幽靈殘影的策略契約缺異事與選尊入口，且在「規則每週改版」的專案裡，**版本相容**比後端更難。
3. 建議把 Top 2 的第一步（Tier 1 提速）**抽出來當 0.54 小卷先做**：20 處收斂＋Tier 1 改 500ms＋`traitfx-drive clean` 與 5 秒閘門，兩三天，感受最大；Top 1 照序但範圍縮成「桌心視窗＋市集卡兩行條」而不是整片掏空。
4. 製作人追問後補上 §9–§14（熟練度流派與妖幣、夜行錄與天梯、§1 勘誤、四大轉場、即時連線、老廟神案），全藍圖逐條對照在 §0。**你要的 2～3 個關鍵拍板＝D4（開卷順序與 Tier 1 的數字）、D1（桌心範圍）、D5（進度系統與全開公平的邊界）**；其餘 D2／D3／D6／D7／D8 是各卷開卷時再裁也來得及的。兩輪第二意見的反駁紀錄在 §7.5。

## 0. 藍圖逐條覆蓋對照（製作人問「還有什麼沒評到」——這張表是答案）
| 藍圖章節 | 項目 | 本報告 | 備註 |
|---|---|---|---|
| §1.1–1.2 代碼現狀 | 核心玩法、12 夜時序、九大系統 | §11 **勘誤** | 有三處已過時：請神「天井保底與階梯法寶餽贈」（2.0 移除天井、3.0 移除階梯獎勵）、時序「傳說請神（累積燒香奪傳奇）」現為香火池、「33 尊 GLB」數字待核 |
| §2.1 | 角色與法寶初始全開 | §9 | 與 §2.2 流派解鎖的張力見 D5 |
| §2.2 | 熟練度→3 選 1 流派被動 | §9 **補** | 資料結構＋平衡閘門＋持久化 |
| §2.3 | 妖幣＋外觀抽卡（語音包／VFX／桌布／印章／信物） | §9 **補** | 五類皮各自掛點 |
| §3.1 | 法寶連鎖 | §2 | 已評（含第二意見修正） |
| §3.2 | 四大轉場（誅心／借刀／連鎖破陣／命懸一線） | §12 **補** | 每個轉場要哪個既有資料點 |
| §3.3 | 三級視覺分級 | §1 | 已評（Tier 1 改 500ms） |
| §4.1 | 夜行錄單機章節、休閒桌／天梯 | §10 **補** | 章節＝固定 seed＋固定對手 |
| §4.2 | 段位階級、賽季 | §10 **補** | 需要帳號與後端 |
| §5.1–5.2 | 幽靈殘影 | §4 | 已評（要擴策略契約） |
| §5.3 | 即時 WebSocket、好友房、語音表情、Ghost Fallback | §13 **補** | 鎖步同步可行性 |
| §6.1 | 老廟神案：軟陰影、木紋、香灰符咒 | §14 **補** | 渲染成本 |
| §6.2 | 桌心托盤、Raycaster | §3 | 已評 |
| §6.2 | 3D 銅錢下標、血玉令牌、對手信物 | §3／§12 | 銅錢與令牌＝演出事件；信物＝§9 皮系統 |
| §7 | Top 3 | §7 D4 | 已評 |

## 1. 戰鬥與視覺升級的技術可行性

### 1.1 現況事實（行號）
- 演出與引擎**確認分離**：`TRAITS`（`index.html:1921-1955`）只有規則欄位；`pwPlayBeat`（`:5320-5418`）按 `war.beats` 順序叫演出積木，註解明講「引擎一行未動」（`:4913-4918, 5112`）。`tests/duel-desync.test.mjs`／`lineup-order.test.mjs` **沒有任何毫秒斷言**（只斷 `beats[].kind/side/trId`、存活數、排序）→ 改時長不會讓引擎測試紅。
- 27 套招式＝三系各 9 支純函式（`js/trait-fx/{zuling,xianghuo,yinqi}.js`，`TRAIT_MOVES` 字典 `js/trait-fx.js:35`）。**沒有每招時長欄位**：全部吃同一個 `PW_FX.TRAIT_MS=900`（`index.html:3976`），`pwTraitFx` 塞進 `det.ms`（`:4951`），`trait-fx.js:366` 夾成 `run.ms=max(100, det.ms||900)`。招式內部節拍是絕對毫秒（例 `eliteBlind` 0→260→680→900，`zuling.js:28,36,58`）。
- 時間軸常數全在 `PW_FX`（`:3961-3998`）：命中路徑已經很快（`EV_MAX_MS 260`／`DMG_POP_MS 120`／`HIT_FLASH_MS 120`／`HITSTOP 70`），**900ms 的招式是唯一離群值**；`BEAT_MIN_MS 900`、`BURN_MS 420`、`FOCUS_MS 650`。
- **同一個 900 至少抄了 20 處**（第二意見數的分母，我原稿只數到 3）：runtime 四處——`PW_FX.TRAIT_MS`（`index.html:3976`）、`js/trait-fx.js:366` 的 `Number(det.ms)||900`、`camera-director.js:74` 的 `LEAN.ms=900`（註解自承「＝index.html 的 PW_FX.TRAIT_MS」）與 `:18` 的 `table` shot `ms:900`；治具十六處——`traitfx-drive.mjs:54`（預設 `--ms=900`，算 `onTime`／`within`，`:111-114`）、`cam-drive.mjs:62,90`、`cam-unit.mjs` 12 處寫死 `ms:900`、`closeup-cam-unit.mjs:78`、`closeup-judge.mjs:116`。不算分母的 900：`font-weight:900`、`BEAT_MIN_MS`（另一語意）、十餘處 `setTimeout(r,900)` 開服延遲。
- **時間縮放已經存在，而且有天花板**：`trait-fx.js:415-425` 的 `run.vt/run.rate`（「排程塞不下就整套等比變快」），被 `TFX.rateMax:2.2`（`:42`）夾住；超過就 `stats.cut++`（`:438`）→ `finish()` 把骨骼覆寫**瞬間歸零**（`:396-397`）。900→260 需要 3.46×，必撞。另外三個絕對常數不隨 rate 縮：`flinchMs:240`（`:44`，27 支裡 16 個 `st.flinch` 全沒帶 ms）、`atReserve:160`（72 個 `st.at` 各加 160 虛擬 ms）、`endMargin:60`。內部節拍 119/120 個 `tween`、76/76 個 `fly/fade/grow` 是絕對毫秒。
- 鏡頭：`camera-director.js` 有 `SHOTS`（table/reveal/end，`:17-21`）、`DUEL_SHOT`、`FOCUS`（dist 2.6／tilt 18，`:111-117`）、`PUNCH`／`ORBIT`／`LEAN` 疊加層；事件掛點 `ys:fx-trait`／`ys:fx-focus`／`ys:fx-punch`／`ys:fx-burn`（`:404-411`）。**沒有 letterbox**；bloom／ACES 在 `js/bloom.js`＋`renderer.js:91,140,253`，vignette 是 DOM `#vignette`。
- 骨架：GLB 只有 `idle/move/attack` 三支 clip（`creature-figures.js:174,625,744`）；招式演出是 mixer 之後疊一層骨骼 delta（`trait-fx.js:138-170`）＋兩支共用材質（`MAT_GLOW`／`MAT_LINE`，`:100-101`），**不是各招各自 shader**。

### 1.2 建議：分級靠資料欄位，時長靠一張表，大招走新機位
1. **`TRAITS[].tier`**（1／2／3，預設 1；`LEGENDS` 三招與未來連鎖招標 3）。`pwTraitFx` 依 `PW_FX.TRAIT_MS_BY_TIER={1:500, 2:700, 3:1400}` 決定 `det.ms`。零內容字串、零新 hook。
2. **Tier 1 的數字是 500，不是藍圖的 200–300**：既有縮放 `run.rate` 的天花板 2.2× 只能把 900 壓到 ≈410，再往下就是 `cut`（收勢硬切）。做法是 rate ≤1.8（500ms）＋把 `flinchMs`／`atReserve`／`endMargin` 三個常數改成**隨 rate 等比**（`trait-fx.js` 一處改，27 支不動）。要真的到 260ms 只有一條路：另寫**一支通用短招**（刀光＋火星，`TRAIT_MOVES` 的 tier-1 退路），27 支專屬招式只在 tier 2／3 場合播——這是內容決策，見 D4。
3. **Tier 1 減法的真正內容**不是重寫招式，是「不等它演完」：命中路徑照舊 260ms 預算，招式改成伴隨（`EV_BUDGET_MS` 內並行），拍末 `BEAT_MIN_MS` 由 900 降到 ≈500。`closeup-judge.mjs:116` 的分析視窗跟著 `nextT` 縮，會撞到「靜幀 ≥8 幀才判、不足回 null」（`:129-130`）——那條治具要先改成讀拍長，否則會靜默變 null（恆綠）。
4. **Tier 3 大招＝新機位＋DOM 黑邊**：`camera-director.js` 加 `CINEMA` shot（低角度仰視、dist 拉近），letterbox 用兩條 DOM 黑條（與 `#vignette` 同層，不進 shader，手機零成本），時長 1.2–1.5s 只給 tier 3。三尊已有三招演出函式，大招是「同一支函式 + CINEMA 機位 + 1400ms」，不是三支新招。
5. **20 處 900 先收斂再改**（`02 §6.1` 第 7 條「先寫下分母」）：runtime 四處收成 `PW_FX.TRAIT_MS_BY_TIER` 一個來源，事件一律帶 `detail.ms`（`camera-director`／`trait-fx.js:366` 的退路刪掉，沒帶就 throw）；治具十六處改讀頁面常數或共用一個 `tests/tools/fx-consts.mjs`。分母歸一之後才允許改數字。

### 1.3 閘門雛形（開卷時凍結）
- **節奏**：`duel-drive` 的 `duelsMs`（現況 4 場約 5–10 秒）中位 ≤ 5 s（8v8 基礎戰）；tier 3 出場的對決 ≤ 8 s。
- **等價**：`trace-eq` 逐位元組相等（純演出卷）；`duel-desync`／`lineup-order` 9 套綠。
- **可讀性不退**：批 2-a 的 `dmg-readability` R1／R2 重跑仍綠（招式變快不能把閃紅與跳字擠掉）。
- **治具跟著讀**：`traitfx-drive` 30 套 `onTime` 全過**且 `clean`（`cut===0 && fused===0`，`:121`）全過**——`clean` 才是縮時最容易紅的那條；它讀的必須是頁面常數不是自己寫死的 900（否則整批錯位）。`closeup-judge` P 系列不得因視窗縮短而回 null。
- **fps**：`?fps=1` 手機回填（至今沒有 iPhone 數字，`00` 待辦）。

### 1.4 這一題的地雷
- **20 處 900** 就是分岔的證據；還沒改就已經有兩處 runtime 退路（`LEAN.ms`、`trait-fx.js:366`）靠人肉同步。
- **ROADMAP 說「取消每招 900ms 木偶抽動」**——招式的骨骼 delta 是所有 27 支共用的機制，砍掉它等於全部變成純粒子；建議是縮時，不是拿掉。
- 大招「地面裂為深淵、萬千枯骨竄出」這類是**新資產**（mesh／貼圖），不是時間軸；要走 3D 美術卷（盲讀），預算另計。
## 2. 法寶連鎖（CHAINS）的資料結構設計

### 2.1 現況事實（行號）
- 五張表＋三張：`ABILITIES` 23 筆（`index.html:782-883`，`order` 欄位只有四把武器 10/20/30/40 在用）、`ROLES` 11、`WISHES` 24（`canDraw` 防恆假）、`EVENTS` 8、`NIGHTRULES` 3、`LEGENDS` 3（各帶 `eff.hooks.onFacCount`，`:1900-1910`）、`TRAITS` 30、`POOL` 27（`:1861-1889`）。
- `collectEffects`（`:1816-1830`）順序契約固定：**角色 → 道具（袋中順序）→ 心願 → 夜規 → 異事**；`applyHooks`（`:1832-1849`）。ARCH_SPEC §2 明文「順序必須固定，否則結果不可重現」。
- hook 分母 **20 支**（`grep -oE 'applyHooks\("[A-Za-z]+"' | sort -u`）：引擎 13 支（`onItemValue`／`onFacCount`／`onPowerCalc`／`onBidCap`／`onBudget`／`onBidEff`／`onBidSettle`／`onWinItem`／`onBattle`／`onNightEnd`／`onMarketDraw`／`onReveal`／`onNightEndGlobal`）＋ AI 7 支（`onAiMark`／`onAiCurse`／`onAiValue`／`onAiPlan`／`onAiAmount`／`onAiExtraBids`／`onAiStake`，只在 `aiBids()` 觸發）。全部是「單值累加器」模式（`ctx.value`／`ctx.count`／`ctx.cost`）。
- 共鳴：`facCount`（`:2390`）→ `power()` 的 `resonance += c*c`（`:2404-2411`，`SET_MIN=2`）→ 紙紮夜戰 `pwResLv`（`:3171-3179`，`PW_RES_CAP=3`）。傳說「算 2 件」＝本體 1 件＋`eff.onFacCount ctx.count++`，**沒有開新 hook**。
- `buildArmy(bag)`（`:3092-3109`）逐件展開 `x.unit||pwDefaultUnit(x)`，`unitRow`／`unitRowText`／`bagPreviewHTML` 都經它取值（`:3110-3113` 標「★單一事實來源★」）。
- ARCH_SPEC 硬約束：「新增內容只能往表加一筆，不得在引擎寫 `if(id==='xxx')`」（§1:47）、「不得自行更動 hook 名稱、參數形狀與呼叫順序」（:1-4）、「不要為了寫狀態新開 hook」（§8.6）。
- **POOL 沒有 `id` 欄位**：法寶靠 `n`（名）與 `ab`（能力 id）識別，27 件中 4 件沒有 `ab`。

### 2.2 建議設計：一張 `CHAINS` 表＋零新 hook＋兩支引擎查詢函式
```js
const CHAINS = [
  { id:"twinTiger", name:"雙虎滅煞", pair:["tigerSeal","tigerNail"],   // 兩個 ABILITIES id（不是名字）
    desc:"…", tier:3,                                                  // tier 3 = 全屏大招（§1 的分級用）
    eff:{ hooks:{ /* 與 LEGENDS.eff 同形：掛既有 hook */ } },
    army:{ fuse:true, unit:{ body:"tiger_c", count:1, atk:9, hp:8, trait:"cleave" } },  // 可選：替換兩件的部隊
    fx:"chain_twinTiger" },                                             // 演出鍵（trait-fx 登記）
  …
];
```
- **啟動判準是純資料**：`activeChains(p)` ＝ `CHAINS.filter(c => c.pair.every(ab => p.bag.some(x => x.ab===ab && !x.curse)))`。決定性、零 rng、零內容字串。
- **接進 `collectEffects`**：在「道具」之後、「心願」之前**追加**一段 `activeChains(p).map(c=>c.eff)`。順序契約要走 ARCH_SPEC 修訂（多一層，不是改既有層），而且 `eff` 形狀與 `LEGENDS.eff` 完全相同，`applyHooks` 一行不改。
- **三個範例對照既有 hook（第二意見修正後）**：
  - 千眼神算：**不能走 `onMarketDraw`**——它是全域 hook，`applyHooks("onMarketDraw", ctx, null)`（`:2387`）只收夜規與異事，玩家的 `eff` 收不進來（ARCH_SPEC §2:66 明文）。千里眼銅鈴其實是**靜態 trait** `bell:{traits:{preview:2}}`（`:817`），沒有 hook。所以連鎖的「預告 3 件」走同一條：`CHAINS[].traits={preview:3}`，把連鎖的 `traits` 併進 `traitMax(owner,…)` 的聚合（一支引擎 helper）。「看穿第二高價」要新增 `onReveal` 的 ctx 欄位（`:4739` 形狀凍結在 ARCH_SPEC §3.12），**等同開新契約**——建議這一半先不做，或改成「揭盅時第二高價的型態（保守／押命）可見」之類既有欄位能表達的效果。
  - 水陸偷渡：`onWinItem`（`:2731`，ctx `{winner,item,target,events}`，`ctx.target` 有值＝毒標塞入）→ 直接標記銷毀，與送王船（`:802-813`）同一格。**可行。**
  - 雙虎滅煞：**唯一要動引擎的一處**——`buildArmy` 展開時查 `activeChains`，`army.fuse` 為真就用 `unit` 取代那兩件的部隊（仍是查表，不是 id 比對）。`unitRow`／預覽自動跟著對（單一事實來源）。
- **AI 與 UI 共用一支「潛在連鎖」查詢**：`chainsCompletedBy(p, item)` ＝ 拿到這件會啟動哪些連鎖。`onAiValue` 的 ctx 加一個讀值（AI 估值加成走 `CHAINS[].aiBonus`），市集卡的「金光引線」也讀同一支——兩邊不會分岔。
- **識別鍵**：用 `ab`。4 件沒有 `ab` 的法寶先不進連鎖（或補 `ab`，但那是 27 列 schema 改動＋測試，另開卷）。

### 2.3 必過的閘門（開卷時寫進凍結檔）
1. **六之四優勢策略窮舉**：每組連鎖上線前跑窮舉器（GAME_DESIGN 六之四是強制閘門，「靠眼睛看不算數」）。
2. **共鳴 vs 連鎖的張力量測**：跨系連鎖會拉低同系件數。用 `resonance-gate` 同型治具量「追連鎖策略」對 splitter 的勝率差，帶 [−8, +5]pp（沿用 H1 口徑）；連鎖持有者優勢帶 [+3, +10]pp（沿用 H9）。
3. **等價性**：`CHAINS=[]` 時 `trace(1..20)` 與基準逐位元組相等（沿用 H0 手法）。
4. **AI 不重抄規則**：`onAiValue` 只讀 `chainsCompletedBy`，測試對基準紅。

### 2.4 這一題的地雷
- 兩件式連鎖 ＝ **27×26/2 的估值空間**，AI 的 `onAiValue` 若對每件都掃 CHAINS 是 O(n)，沒問題；但 6 組之後每加一組都要重跑窮舉＋H1／H9 同型閘門（每輪 n=10000 約 1 小時），內容成本是「一組一卷」。
- 「合體單位」若做成新 `body`（金斑黑虎），要走 3D 美術卷（GLB＋盲讀），不是資料表一行。
- 連鎖啟動要不要**公開**（對手看得到你湊成了）：影響毒標與盯上的博弈。袋子現況不公開（09-07 裁「乙不公開袋子」）。→ 決策 D2。
## 3. 拍賣桌 3D 實體化的圖層穿透

### 3.1 現況事實（行號）
- **3D canvas 整局都在跑**，不是只在對決：`renderer.js:54-72` 建在 `document.body`，`position:fixed; z-index:-2; pointer-events:none`；牌桌時 opacity 0.38、對決 1.0，由 `playerBridge.update()` 回傳的 `kind` 補間（`renderer.js:216-246`：透明度、霧、線香煙、戲台燈、遠景全部插值）。`#vignette` 在 `z-index:-1`。
- 牌桌是 CSS grid（`#table`，`index.html:51-54`，無 z-index）；`#felt` 是**玻璃面板**：`position:relative; overflow-y:auto; backdrop-filter:blur(7px)`＋半透明底（`:194-197, 58-64`）——3D 已經從它後面透出來，只是被磨砂了。`#modal` z 20／`#sheet` z 30／`#duel` z 40。
- `scene-env.js` 純視覺、不讀遊戲狀態（`:2`）：穹頂、五片遠景剪影、**桌面 mesh 已存在**（八角柱 r=3.4，`:257-261`）、四盞方位燈籠、霧表。沒有拍品托盤節點。
- GLB：`creatureGlbUrl(ab)`→`assets/creatures/<ab>.glb`，`loadGlb()` 用 `Map` 快取 Promise（`creature-figures.js:97-135`），逾時 `LOAD_MAX_MS=12000`。**鍵是 `ab`**，4 件無 `ab` 的法寶沒有模型。
- 觸控：全域 `touchmove` 只放行 5 個可捲容器，**白名單字串在兩處各抄一份**（`index.html:34` 與 `:6425-6433`）；出價／燒香／開卡全是行內 `onclick` 字串（`:4545-4596`）。
- `#felt` 高度預算是**零餘裕**：v0.50 神龕列搬進來時直向溢出 47–77px，覆審 HIGH-1 甲之後才壓到「平常一列」（`:3794-3797` 註解）。

### 3.2 建議：不動 canvas 的 z 序，做「桌心視窗」＋一個透明命中層；`#felt` 不拆
1. **canvas 留在 z −2、pointer-events none**——把它抬到 UI 之上再逐個元件放行，是把一份白名單變三份。反過來做：在 `#felt` 裡放一個 `#tray` 區塊（流內、固定高、透明、`pointer-events:auto`），**它自己不畫東西**，只把 `pointerdown/move` 座標轉 NDC 丟給 Raycaster（對 `scene-env` 新增的 `trayGroup` 射線）。兩側出價卡與 stepper 的 `onclick` 一行不動。
2. **玻璃從 `#felt` 搬到它的子元素，`#felt` 本身保持一個透明的捲動容器**——不是拆成三塊（第二意見指出拆了會同時打死三樣東西：觸控白名單兩處字串以 `#felt` 為單位、`felt-probe.mjs:32` 寫死量 `#felt`、以及 `backdrop-filter` 讓 fixed 子元素改以 `#felt` 為容器的既有副作用 `:203`）。卡片列、香火榜、底列各自套玻璃，`#tray` 不套。
3. **`#vignette`（`index.html:40`，`z-index:-1`，外圈 `rgba(0,0,0,.62)`）夾在 canvas 與 UI 之間**：視窗在畫面中央，落在漸層最亮處，但仍要實測；必要時 vignette 改成四邊 DOM 條而不是全幅漸層。
4. **canvas 透明度是單一 CSS opacity（`renderer.js:233`：牌桌 0.38／對決 1.0）**，視窗裡不可能單獨 1.0 → 改成 canvas 常駐 1.0、玻璃子元素自己壓暗。這會動到美術甲（v0.46）的觀感，lookdev 要重拍——所以這一卷**不是純 CSS**，是「疊層不動、觀感重調」。
5. **拍品上桌**：`scene-env` 加 `trayGroup`（4–5 個槽位，桌面 mesh 上方），拍品模型走同一支 `loadGlb(creatureGlbUrl(it.ab))`，無 `ab` 的 4 件與詛咒品用紙牌/陰火占位。每夜 `drawMarket` 之後由**演出層**（不是引擎）依 `S.market` 擺位；`trace-eq` 必須逐位元組相等。
6. **點擊＝既有函式**：Raycaster 命中槽位 i → 呼叫現有 `openSheet(i)`（`:4596`）；hover 只做浮空微旋＋自發光（`MAT_GLOW` 已有）。「盯上血印令拍桌」是第二批：`S.marks` 更新後的演出事件，走 `ys:fx-*` 同型事件。
7. **高度從哪裡來**：`#felt` 零餘裕，視窗每 1px 都是從市集卡拿的。唯一不作弊的做法是**市集卡變成模型下方的兩行條**（名稱＋戰力＋系；招式行 v0.50 已移進卡片詳情），視窗高度＝原本卡片高度減兩行條。這就是 D1 甲案的真實內容，不是「卡片不動另外開窗」。

### 3.3 閘門雛形
- `trace-eq` 逐位元組相等（純演出）；`felt-probe --seeds=1,3` 直向仍量同一個 `#felt`：第 1 夜 0、其餘 ≤ 基準同格＋0（不給 slack）；卡片兩行條的字級不小於現行卡片說明（人眼）。
- Raycaster 命中率：Playwright 對 4 個槽位各點 20 次，`openSheet(i)` 的 i 全對；點在卡片與 stepper 上的事件**零漏到 3D**（現有 `legend-drive` 的按鈕計數當對照）。
- fps：`renders/raf` 中位 ≥0.90（V6 口徑）；桌面模型數 ≤5、三角形數上限寫死。
- 觸控白名單兩處一致（或先收斂成一處）。
- 844×390 人眼 contact sheet；直式蓋板不變。

### 3.4 地雷
- **高度預算**是這一題最大的風險，不是 Raycaster。視窗每長 1px，卡片就少 1px；v0.50 剛為 47px 打了三輪覆審。→ 決策 D1。
- 每夜載 4–5 個 GLB 到桌上，加上對決的 8v8，iPhone 上的數字至今沒有（`?fps=1` 未回填）。先回填再開卷。
- 觸控白名單兩份、`onclick` 字串一百多處：任何「改事件模型」的念頭都會撞到它們；本卷不碰事件模型。

## 4. 非同步幽靈（Ghost）的資料結構輕量化

### 4.1 現況事實（行號）
- `S.history` 已經記到**每夜每件每人的出價**：`nights[]={round, rule, event(只有名字), marks[{pid,item}], auction[{item,fac,p,curse,winnerId,amt,type,intent,targetId,bids[{pid,amt,type,intent,cost}]}], fights[], bye, wishes[{pid,id,done}], deaths[], shrine{burn,taken,…}, closed}`（`recordAuction :3739-3757`、`recordShrines :3760-3771`、`recordNightEnd :3772-3785`）；`life[]` 每夜快照。`review.test.mjs` 守 `life.length===nights.length+1` 與 `finalizeHistory` 冪等。
- **實測大小**：跑滿 12 夜的局 JSON 平均 **16,865 B**（max 18,269 B）——比藍圖假設的 30KB 小四成；主要體積是 `auction[].bids[]`（四家全部出價明細）。
- **沒記的**：異事的個別選擇分支（只記事件名）、市集規則的選擇（押寶夜的 X 與勾選）、請神 3.0 的選尊 idx（可從 `shrine.taken` 反推）、送神回天／危急提示的答案、買下銷毀之外的 UI 序列。
- **決定性**：`S.rng`（玩法）與 `S.rngUi`（演出）分離（`:2091-2092, 2316, 2321`）。重播一局需要 `seed + mode + picks`；**真人逐夜決策沒有重播 API**——`myBids`／`INC`／`S.marks` 都是當夜暫存（`:1969, 4605, 2183`），`trace(seeds)`／`simulate(seed)` 全程走 AI（`:6304, 6355`）。唯一能餵決策的入口是 `playPolicyGame(seed, policies, picks)`：`policies[pid]` 是**策略函式**（`pol(p)` 回出價、`pol.inc(p)` 回燒香，`:5989, 6010-6017`）。

### 4.2 建議：幽靈＝「同種子桌」＋一支由紀錄驅動的策略函式，不做行為模型
1. **關鍵洞察**：藍圖的 payload 用 `item:"bow"` 當鍵，隱含「幽靈的市集跟我的一樣」。這只有**同種子**才成立（不同 seed 拍品不同，幽靈的出價無處對應）。所以匹配單位不是段位，是 **(version, seed) 桶**：每小時／每天固定幾顆公開種子，同桶的真人殘影可以逐夜逐件精確重播。這比「行為模型（攻擊性／偏系／毒標率）」便宜十倍，而且忠實——支柱三「你的隨機是對手設計的」在這裡是字面成立：對手真的是那個人。
2. **引擎側要加的不只一支函式（第二意見修正）**：`playPolicyGame` 的策略契約現在只有三個掛點 `pol(p)`／`pol.inc(p)`／`pol.mark(p)`（`:6010-6015, 2190`）。**異事選擇**在 headless 一律走 AI（`runEventPhaseHeadless` `:2245` → `fillEventChoices(ctx,true)` `:2234`，`policies` 繞不進去）；**請神 3.0 選尊**也沒有策略入口（`:6013-6014` 註解自承「沒掛就跑預設啟發式」）。所以幽靈卷要**擴契約**：加 `pol.event(p, ctx)` 與 `pol.pick(p, openShrines)` 兩個掛點，`runEventPhaseHeadless` 與 `resolveShrines` 各改一處讀它。這是動引擎的契約層（ARCH_SPEC §8 要走修訂），不是零改動。`ghostPolicy(record)` 再實作這五個掛點。
3. **要補的紀錄欄位（缺漏標記，已核實：異事選擇存在 `ctx.choices` 但兩個呼叫端 `:6004, :6311` 都把回傳值丟掉，沒進 history）**：`event.choice`（每人）、`rule.choice`（押寶夜 X 與勾選）、`shrine.pick`（選尊 idx）、`shrine.release`（送神／危急答案）、`marks` 已有、`wishes` 已有、`S.history.shrineDawn`（`:3042`）已有。全部掛在既有 `recordAuction`／`recordShrines`／`recordNightEnd`，不新開結構；`review.test.mjs` 的不變量照守。
4. **payload 瘦身**：幽靈只需要**那一席**的決策，不需要四家全部 `bids[]`。抽出 `{ver, seed, mode, roleId, pid, nights[{round, mark, bids[{item,amt,type,intent,targetId}], incense, pick?, choice?}]}` 約 **3–5KB**（`S.history` 全量 16.5KB 是上限）。
5. **版本欄位是硬需求**：這個專案一週改三次規則（0.50→0.53），`ver` 不同的殘影**不得**進同一桶——重播會在第一個規則差異處分岔（`S.rng` 消耗不同）。幽靈池要隨版本作廢，這是產品面的代價，要講清楚。
6. **後端**：GitHub Pages 是純靜態，上傳要一個寫入端點（Cloudflare Worker + KV／D1 最簡）；讀取可以是靜態 JSON 分桶檔（每桶一檔、CDN 快取）。客戶端無金鑰，Worker 做速率限制與 schema 驗證（拒收 `ver` 不在白名單的）。

### 4.3 閘門雛形
- **重播等價**：同 (ver, seed, picks) 下，真人局的 `S.history` 餵回 `ghostPolicy` 重跑，四家 `life[]`／`auction[].winnerId` 逐夜相等（缺任何一個決策欄位就會分岔——這條同時驗證 4.2-3 的欄位補齊了沒）。
- **跨版本拒收**：`ver` 不同的殘影進桶必須被拒，測試對「不檢查 ver」的版本紅。
- **大小**：payload ≤ 8KB；`S.history` 全量 ≤ 20KB（現況 16.5–18.3KB，加欄位後量 delta）。
- **決定性**：`grep Math.random` 零；`S.rngUi` 不進紀錄。

### 4.4 地雷
- 「段位匹配」與「同種子桶」互斥：同桶人數不夠時只能退回 AI（或跨段位）。冷啟動期桶會空——要先有幾週單機流量才有幽靈可拉。
- 熱座（hotseat）兩位真人的紀錄要分席存，現況 `pid` 在。
- 幽靈是**可被讀出的**（同桶的人看得到你每夜出價）：對手用你的殘影練習抓你習慣，這是設計特色也是隱私邊界，payload 不放任何帳號資訊。

## 5. 藍圖亮點（值得押注的）
1. **三級分級**是對支柱一「戰場只是計分板」最誠實的實作：Tier 1 縮到看不清細節正好，因為玩家不該在戰場做決策。
2. **法寶連鎖**直接擴大 §5.1「價值非線性」的組合空間，而且跟共鳴形成張力（跨系 vs 同系），這是拍賣桌的深度，不是戰場的。
3. **同種子幽靈**把「零等待 PvP」和「對手是真人」同時做到，且成本是一個 Worker。這是整份藍圖裡投報比最高的一項。
4. **桌心視窗**解決「80% 時間像網頁」的痛點，而且既有 canvas 已經整局在跑——技術債幾乎為零，難的是版面預算。

## 6. 工程地雷（總表）
| # | 地雷 | 在哪 | 對策 |
|---|---|---|---|
| 1 | 招式 900ms 至少 20 處（runtime 4＋治具 16） | `index.html:3976`／`trait-fx.js:366`／`camera-director.js:18,74`／`cam-unit.mjs` 12 處等 | 先收斂成一處再改數字（`02 §6.1` 第 7 條） |
| 1b | 縮時天花板 `rateMax 2.2`＋三個不隨 rate 的常數 | `trait-fx.js:40-50, 346, 415-438` | Tier 1 取 500ms；260ms 要另寫通用短招 |
| 2 | `#felt` 高度零餘裕；且不能拆（白名單、felt-probe、backdrop-filter 三樣都綁它） | `index.html:34, 196, 203, 3794, 6430`；`felt-probe.mjs:32` | 玻璃下放到子元素、視窗高度從卡片兩行條省出來 |
| 2b | `#vignette` 夾在 canvas 與 UI 之間；canvas opacity 是單一 CSS 值 | `index.html:40`；`renderer.js:233` | canvas 常駐 1.0、面板自壓暗；lookdev 重拍 |
| 2c | 幽靈策略契約沒有異事與選尊入口 | `index.html:2234, 2245, 6004, 6010-6015` | 擴 `pol.event`／`pol.pick` 兩掛點（ARCH_SPEC §8 修訂） |
| 2d | `onMarketDraw` 是全域 hook、`onReveal` ctx 形狀凍結 | `index.html:2387, 4739`；ARCH_SPEC §2:66、§3.12 | 連鎖的預告走 `traits.preview` 聚合；看穿出價那一半先不做 |
| 3 | 觸控白名單兩份 | `index.html:34` 與 `:6425` | 任何新可捲容器兩處同步；本卷不動事件模型 |
| 4 | 4 件法寶無 `ab`＝無模型鍵、無法進連鎖 | `POOL :1861-1889` | 補 `ab` 是 27 列 schema 卷，先用占位 |
| 5 | 幽靈的版本相容 | 規則週週改 | `ver` 進桶鍵，池隨版本作廢 |
| 6 | iPhone fps 至今無數字 | `?fps=1` 未回填 | Top 1 開卷前先回填一次 |
| 7 | 每加一組連鎖＝一輪窮舉＋兩條 n=10000 閘門（約 1 小時） | 六之四強制閘門 | 首批 3 組不是 6 組 |
| 8 | 大招的新資產（深淵、枯骨、金烏光矢）是美術卷不是時間軸 | ROADMAP §3.3 | 分開估，走盲讀 |

## 7. 需要製作人拍板的關鍵決策
**D1 桌心 3D 的範圍**：甲「桌心視窗＋市集卡縮成模型下的兩行條」（`#felt` 不拆、視窗高度＝卡片減兩行）／乙「整片掏空」（卡片退到左右與底列，照藍圖；要拆 `#felt`，打死觸控白名單、felt-probe 與 backdrop-filter 三樣既有假設）／丙「先不做，等 iPhone fps 回填與 Tier 1 小卷之後再議」。➡️ 建議甲，但先做丙的前置（fps 回填）。
**D2 法寶連鎖的公開性與首批規模**：連鎖啟動要不要公開給對手（袋子現況不公開，09-07 裁乙）；首批 3 組還是 6 組。➡️ 建議「公開啟動、不公開內容」（對手看到你亮了「雙虎滅煞」，但看不到袋子其他東西）＋首批 3 組，各過六之四窮舉再加。
**D3 幽靈的匹配模型**：甲「同種子桶精確重播」／乙「段位＋行為模型」。➡️ 建議甲；乙要先做一個 AI 個性擬合層，且不忠實。
**D4 開卷順序與 Tier 1 的數字**：藍圖是 Top 1→2→3。➡️ 建議把 Top 2 第一步「20 處 900 收斂＋Tier 1 改 500ms（rate ≤1.8，三常數隨 rate）」抽成 **0.54 小卷先做**（兩到三天、純演出、trace-eq＋traitfx-drive `clean` 守），再開 Top 1 桌心視窗，再連鎖，幽靈最後（它要擴策略契約＋補紀錄欄位，欄位補齊可順著連鎖卷做）。**藍圖的 200–300ms 只有「另寫一支通用短招給 tier 1、27 支專屬招保留給 tier 2／3」才做得到**——要不要走這條是內容決策：甲 500ms 保留 27 支個性／乙 260ms 通用短招、專屬招退居高光時刻。➡️ 建議先甲，試玩後再議乙。

**D5 進度系統與「全開公平」的邊界**：甲「熟練度只解鎖皮膚與章節，被動流派一開始就三選一全開」／乙「照藍圖：流派靠熟練度解鎖，但跨距閘門 ≤8pp 守住不是變強」／丙「不做流派，熟練度純外觀」。➡️ 建議甲：保住 §2.1 純競技這條線，流派仍有「選擇」的深度，又不必靠閘門去證明「解鎖沒有更強」（那是很難自證的命題）。
**D6 天梯與帳號的時機**：甲「幽靈上線後先做非同步天梯（同種子桶名次積分），帳號用 Worker 匿名 id」／乙「直接做即時天梯」。➡️ 建議甲；乙見 §13。

**D7 供奉「送神」的決策時機**：甲「改成夜初密封的預先宣告（下一夜末要不要繼續供奉）」／乙「維持播放期彈窗（你 09-10 剛裁定留著），連線版另開即時通道」／丙「自動規則：付後 ≤TITHE_WARN 自動送神，不問」。➡️ 建議甲，但**這與你今天裁的「彈窗留著」不衝突**：彈窗照樣跳，只是跳在下一夜出價前而不是夜戰後；連線版才需要它。單機期不必動。

**D8 美術聖經「無貼圖」是否為環境物件開例外**：甲「維持頂點色＋幾何做木紋與香灰（符合 ART_BIBLE）」／乙「修訂 ART_BIBLE：環境可貼圖、角色不可」。➡️ 建議甲先試一版，看不出差別就不開例外；美術方向的品味題，最後由你看圖裁。

## 7.5 第二意見（fresh opus 反駁）紀錄
第二輪（§9–§14、D5–D7）：**成立六條**——流派要整個 effect 物件且五個頂層讀取點要定歸屬；PROFILE 撞到 C-A6 凍結條「localStorage 無新增 key」（且 `:745` 那條被我誤讀成通則）；章節座位是新參數不是升級（`SELECT_ON` 常數、`MODES.seats` 無 `human`、rng 消耗數不同）；`S.rng()` 47 處、逾時裁決必須是權威輸入；破口三個（選尊兩段式、異事相位、送神）；commit-reveal 要 nonce 與三相位；木紋貼圖是改 ART_BIBLE、陰影不能牌桌開對決關。**半成立一條**——§0 對照表漏了賽季獎勵／頭像框與天梯積分的名次定義（已補）。**未能反駁**——§12.1 的三個資料點對照全部正確，但轉場掛點要改到 UI 側（已改）。
第一輪（§1–§7）：七個主張送去反駁：**成立五條**（縮放天花板與三常數、900 分母 20 處、`#vignette`／單一 opacity／`#felt` 不可拆、幽靈契約缺異事與選尊入口、`onMarketDraw` 全域與 `onReveal` 形狀凍結），**未能反駁一條**（異事選擇確實沒進 history；兩個呼叫端都丟掉回傳值），**半成立一條**（Tier 1 小卷：`ash-freeze` 無關，但 `closeup-judge` 視窗與 `traitfx-drive` 的 `clean` 會紅）。以上全部已改進正文；改動最大的是 §1.2（260→500）、§3.2（`#felt` 不拆）、§4.2（要擴契約）。

## 9. 熟練度流派（§2.2）與妖幣外觀抽卡（§2.3）——製作人指出原稿漏評，補

### 9.1 現況事實（行號）
- **持久化幾乎沒有**：`localStorage` 只有兩個 key——音效開關 `SFX_KEY`（`index.html:4104,4122`）與教學看過 `yaoshi_intro_v1`（`:4177-4178`）；`:745` 註解是明確裁定「設定刻意不寫 localStorage」。無 service worker（manifest 只做到加到主畫面）。**沒有玩家檔案物件。**
- **ROLES 是單版本被動**：一筆＝`{id,name,av,pool,desc,ai:{aggr,spite,markReact},hooks:{…},lines:{…}}`（紅衣婆婆 `:981-1000`），被動全部走 hooks，沒有 `variants`／`loadout` 這類切換層。`ROLES[*].ai` 只是 AI 風格數值。
- **角色平衡的既有閘門**：勝率帶 **[18%, 33%]**（`docs/experiments/2026-09-07-acceptance-role-balance.md` B1，基準 25%），治具 `tests/tools/role-measure.mjs` n=10000；v0.47／0.48 剛把 10 角色調到 9/10 在帶。
- **局末沒有名次**：`reviewSummary()`（`:3793-3804`）回 `{maxBid,poison,poisonBy,burned,wins,nights,curveLen}`；存活夜數要從 `S.history.life[]` 掃（`showReview` `:5679-5681` 已在算 `dead`），心願達成數在 `H.nights[].wishes[].done`（`:5721`）。
- **可換皮的掛點**：盯字印章＝單一 `src`（`markStampHTML` `:4090-4094`）；BGM＝`TRACKS` 路徑表（`assets/audio/bgm.js:26-31`，`bgm/alt/` 已有四首備選但無程式引用）；桌布＝`:root` 的 `--table/--table2`（`:21-25`）；音效＝`sfx.js:63` 純合成參數；角色妖語＝`VOICE_PROFILES`（`:4155-4167`，每角色一組參數，已是「id→參數」表）。**沒有「皮膚 id」抽象層。**

### 9.2 建議
1. **流派＝資料表一層，不是三份角色，但 variant 必須是「整個 effect 物件」不是只有 hooks**（第二意見修正）：`collectEffects` 加進去的是整個 `ROLES[id]`（`:1819`），`applyHooks` 排序讀 `e.order`（`:1846`）、`traitMax` 讀 `e.traits`（`:1854`）、`hasFlag` 讀 `e.flags`（`:1851`）——陰間當鋪 `order:95`（`:1224`）與閭山 `traits:{curseWard:1}`（`:1178`，`legend.test.mjs:630` 在守）都靠這些欄位。所以 `variants=[{id,name,hooks,traits,flags,order,unlock}]`，`role()` 改成 `add(variantOf(p))`；另外 **五個頂層讀取點要各自決定歸屬**：`roleLife0`（`life0d`，`:940`）、`ai`（`:2753`）、`desc`（`roleDescHTML :5763`）、`lines`（`:4146`）、`av`。建議 `life0d`／`ai` 可逐流派覆寫、`desc` 由流派提供、`lines`／`av` 留角色。index 0 逐位元組等價要**對這五處都驗**，不是改一處。
2. **每一個流派都是一個新被動＝一次角色平衡量測**：10 角色 × 3 流派＝30 個被動要各自落在 [18,33] 帶（同角色三流派互相之間差距也要有上限，建議 ≤8pp，否則「解鎖＝變強」違反 §2.1 全開公平）。用現成 `role-measure.mjs`，一輪 n=10000 約 20 分鐘／角色。這是內容成本的主體，不是程式。
3. **持久化要從零蓋，但先蓋最小的**：一個 `PROFILE` 物件（`{ver, roles:{[id]:{games, wins, level}}, coins, skins:{…}, unlocked:{…}}`），`ver` 欄位＋遷移函式；**帳號、雲端、防作弊全部不在這一卷**。兩個更正：① `index.html:745` 那條「刻意不寫 localStorage」只針對 `?paperwar=1` 這個 URL 開關，不是通則（§9.1 原稿誤述）；② **真正的障礙是一條凍結中的驗收**——`docs/experiments/2026-09-04-acceptance-paperwar-C1.md:31` C-A6「`localStorage` 無新增 key（前後 key 清單相同）」，PROFILE 一落地它就紅。要嘛走 `02 §2.1` 修訂 C-A6（原標準守的是「紙紮夜戰不偷存設定」，PROFILE 是另一件事，理由充分），要嘛 PROFILE 走 IndexedDB。建議修訂 C-A6，明寫允許的 key 清單。天梯需要帳號時再上後端（§10）。
4. **妖幣結算＝一支純函式** `coinsFor(history, pid)`（存活夜數、心願數、名次），名次規則要先定義（存活→剩餘壽命→戰力）。它讀 `S.history` 原始資料，不讀 `reviewSummary()`。
5. **皮膚＝一張 `SKINS` 表＋一個生效函式**：`{id, kind:"stamp"|"bgm"|"felt"|"sfx"|"voice"|"token", apply:{…}}`；印章與 BGM 改動最小（改 src／改路徑），桌布是 CSS class 切 `--table`，音效與妖語是參數覆寫（照 `VOICE_PROFILES` 的形狀）。「角色桌面信物」是 3D 資產（§3 的 `trayGroup` 旁多一個槽），走美術卷。
6. **語音包**：現在全部是 Web Audio 合成、沒有音檔播放路徑（BGM 有 `fetch` m4a，可借）；「台語志怪台詞」是錄音資產＋播放器，跟合成器是兩套。先做字幕版台詞（`ROLES.lines` 擴充，成本最低），語音後補。

### 9.3 閘門雛形
- 流派 index 0 與現行逐位元組等價（`trace-eq`）；每個流派勝率在 [18,33]、同角色三流派跨距 ≤8pp（n=10000）。
- `PROFILE` 讀寫：壞掉／舊版／缺欄位三種輸入都不得炸（fail-safe 回預設），`ver` 遷移有測試。
- 六之四：流派被動若涉及「選擇」（例如 3 選 1 當場選），要過優勢策略窮舉。

### 9.4 地雷與衝突
- **§2.1「全開純競技」與 §2.2「熟練度解鎖流派」互相拉扯**：解鎖的東西只要在任何局面下更強，就是進度優勢。「橫向 side-grade」要靠上面的跨距閘門守，不是靠說。→ D5。
- 30 個被動的平衡量測是 10 小時級的 CPU 時間，且每次改共鳴／連鎖都要重跑。建議首批只做 3 角色（藍圖也只寫了紅衣一例）。
- localStorage 熟練度可被手改；接天梯前要把「熟練度影響對局」這件事拿掉或搬到伺服器驗證。

## 10. 夜行錄單機章節（§4.1）與天梯段位（§4.2）——補

### 10.1 現況事實（行號）
- **固定 seed 開局是現成的**：`newGame(mode,seed,picks)`→`makeState()`（`:2313-2318`），治具頁 `?fxcount=1&seed=N` 已驗證。
- **固定對手不行**：`picks` 只是真人的角色（`:2294-2312`），`rosterSeats()` 把其餘 9 選 3 **洗牌**（`:2304-2308`）；`MODES[md].seats` 那條寫死座位表只在 `SELECT_ON=false` 時走（`:2318`，v0.5 遺留）。
- **台詞管線可重用**：`ROLES[id].lines`（6 個 key）→`sayFrom(id,key)`（`:4143-4151`）用 `S.rngUi` 挑→`say()`＋`babble()`；`VOICE_PROFILES` 每角色一組音色。**只有 AI 席會說**（`:4145` `if(!p.ai)return`）。
- 劇情／章節／殘卷：引擎零命中；GAME_DESIGN `:233` 明文「賽季／天梯留待真人非同步版上線後再議」。
- 局末回顧是戰報（壽命曲線、四個 tile、逐夜得標、請神、心願），無名次。

### 10.2 建議
1. **章節＝一張 `CHAPTERS` 表**：`{id, title, seed, opponents:[roleA,roleB,roleC], rules:{CFG 覆寫}, intro:[…], outro:[…], unlock:{prev}}`。引擎要開**一個新參數**穿過 `newGame→makeState`（`:2372, :2313`）指定座位表——第二意見指出 `MODES[md].seats` 那條分支**不能升級**：`SELECT_ON` 是模組層 `const true`（`:760`）runtime 恆走 `rosterSeats`；`MODES.solo.seats`（`:1299`）四席沒有 `human:true`（`mkPlayer :2286` 會把真人建成 AI）；而且繞過 `rosterSeats` 少消耗 4 次以上 `S.rng()`（`:2317`），同一顆 seed 的牌堆與市集會和一般局不同。所以是**新入口**，且要決定「章節座位表是否也消耗同樣的 rng 次數」（建議：是，讓章節 seed 與 `?seed=N` 治具桌同構，可直接用既有治具驗）。固定 seed 讓章節可重現、可出攻略、可當教學。
2. **敘事資產＝文字先行**：開場引言／恩怨台詞／志怪殘卷都是 `CHAPTERS` 與 `ROLES.lines` 的字串陣列，用既有 `say()` 演；「真人席不說話」那條要放寬（章節裡真人是主角）。台語配音是 §9.2-6 的後補。
3. **天梯要三樣目前都沒有的東西**：帳號、伺服器端對局驗證、匹配。在幽靈殘影（§4）的 Worker 上長出來最順：先做「非同步天梯」（同種子桶內的名次積分），即時天梯（§13）之後。段位名稱是純表。**藍圖 §4.1「前兩名加分、後兩名扣分」需要局末名次的正式定義**——現行 `endGame` 與 `playPolicyGame` 的排序鍵已一致（`(b.alive-a.alive)||b.life-a.life`，`:5643`／`:6061`，且都在 `settleShrinesEnd`＋`stripEndgameItems` 之後排），天梯積分與 §9.2-4 `coinsFor` 的名次**必須用同一支 `rankOf(S)`**，不得各抄一份。**§4.2 賽季獎勵（專屬皮膚、判官玉印、頭像框）**：皮膚與印章走 §9 的 `SKINS`；頭像框沒有掛點——`av` 是單一 emoji 字串（`:942`），`mkPlayer :2284` 只讀 `seat.av||R.av`，要加一個 `frame` 欄位與渲染層。
4. **休閒桌 vs 天梯**在單機期無差別；等幽靈上線才有意義。

### 10.3 閘門雛形
- 章節可重現：同章節連跑兩次 `S.history` 逐位元組相等；指定對手三隻確實入座（測試對「洗牌版」紅）。
- 前 3 章通關率（AI 對 AI 模擬真人＝incenseAi＋splitter）落在可調帶內（不是 0% 也不是 100%）。
- 六之四對章節專屬規則（`rules` 覆寫）逐章跑。

### 10.4 地雷
- 章節 `rules` 覆寫 CFG＝策略數值（硬規則 3 要問）；每章一組數值＝每章一次平衡。
- 「解鎖 10 位角色」與 §2.1「初始全開」衝突：建議章節解鎖的是**流派與皮膚**，不是角色。→ D5。

## 11. §1 代碼現狀的勘誤（藍圖描述已過時的地方）
| 藍圖原文 | 現況（v0.53） | 影響 |
|---|---|---|
| 「傳說請神（`SHRINES`）…累積競奪、天井保底與階梯法寶餽贈」 | 2.0 移除天井與擲骰；3.0 移除階梯獎勵；現為香火池、最高者得、自選、落空保留（`docs/GAME_DESIGN.md` §5.9） | §3.3 Tier 3「請神大招」的觸發點是「得主自選後入袋」那一夜，不是「累積燒香奪傳奇」 |
| 12 夜時序「傳說請神（累積燒香奪傳奇）→密封競標」 | 燒香在出價列裡（同一格），結算在第 5／8／11 夜開標後、夜戰前 | 轉場「連鎖破陣」與「請神降臨」要排在同一格，見 §12 |
| 「33 尊 GLB 模型」 | 核過：`assets/creatures/` 正好 33 個 `.glb`（含三尊與 tiger_a/b/c 變體）——**正確** | 23 件有 `ab` 的法寶＋三尊都有模型可上桌 |
| 「27 件法寶」 | 27 件，但只有 23 件有 `ab`（模型鍵／能力 id） | 連鎖與托盤都以 23 件為分母 |
| §5.1 標題「兩階段演進路徑」 | 內文 timeline 是三階段（幽靈→好友房→即時天梯） | 藍圖筆誤，改標題即可 |
| §4.2「頭像框」 | `av` 是單一 emoji 字串（`:942`），沒有框的掛點 | 要加 `frame` 欄位與渲染層（§10.2-3） |

## 12. 四大高光轉場（§3.2）——補

### 12.1 資料點都在，不必動引擎
| 轉場 | 判定條件 | 既有資料點（行號） |
|---|---|---|
| 誅心（盯上嚇退） | 我盯上的那件，其他人零出價或只剩保守標 | `S.marks`（`:2183-2190`）；`resolveAuction` 每件的 `entries`（`:2637`）過濾 `S.marks[e.p.id]!==i`（`:2654`）→ 非盯上者出價數 |
| 誅心（低價撿漏） | 得標價 ≤ 門檻 | **現成旗標** `S.wishNight.cheapWin[pid]`（`:2727`，門檻 `CFG.WISH_T2.bargainAmt`） |
| 借刀（毒標斃命） | 毒標目標當夜死亡 | `history.auction[].intent/targetId`（`:3751-3752`）對同夜 `H.deaths[]`（`:3781`）；死亡判定 `:3726` |
| 連鎖破陣 | 首次啟動連鎖 | 沒有旗標（連鎖本身未實作）；掛在 §2 的 `activeChains` 從 0→1 那一夜（`onWinItem` 之後） |
| 命懸一線 | 贏家曾壽命 ≤5 | `S.history.life[]`（`:3784`）掃贏家 pid；真人局贏家＝`endGame()` 的 `rank[0]`（`:5638-5662`，沒有 `winnerId` 變數，要另取） |

### 12.2 建議
- 四個轉場全部做成**演出層的觸發表** `CUTS=[{id, when:"reveal"|"nightEnd"|"gameEnd", test:(H, S)=>bool, fx}]`，掛在**真人頁的三個消費點**：`startReveal`（`:4731`，`resolveAuction` 同步跑完之後）、真人頁消費 `resolveBattles` 回傳值的那一格（**不是 `recordNightEnd`**——它是引擎共用的純紀錄層，`:3738` 註解「三條迴圈共用、不耗亂數、UI 只讀不寫」，掛在那裡 `simulate`／`playPolicyGame` 每夜都會觸發演出判定）、`endGame`（`:5638`）。判定函式只讀 `S.history` 與 `S.wishNight`（每夜在 `resolveAuction` 開頭重建 `:2582`，開標時可讀），**不進引擎**（`trace-eq` 逐位元組相等）。第二意見已核：`recordAuction` 與 `recordNightEnd` 寫的是同一個夜物件（`:3742`／`:3775`），`endGame` 的 `rank[0].id` 與 `winnerId` 定義相同。
- 演出：黑白水墨＝CSS filter 疊層（`grayscale+contrast`）＋單皮鼓 sfx（合成器可做）；批紅文字＝DOM；鏡頭切受害者＝`camera-director` 的 `FOCUS` 已有。**四個都不需要 3D 新資產**，是最便宜的高光。
- 頻率要守：同一局最多各觸發 1 次（否則變噪音）；閘門用 n=2000 統計每局觸發次數分布。

## 13. 即時連線（§5.3）：鎖步同步可行，但要先把「送神」搬回夜初——補

### 13.1 現況事實（行號）
- **零連線碼**：`WebSocket`／`XMLHttpRequest`／`BroadcastChannel` 零命中；`fetch` 只載 SVG 與音檔。`mode` 只有 `solo`／`hotseat`（同機）。
- **引擎完全同步**：`resolveAuction`（`:2575`）、`resolveShrines`（`:2876`）、`resolveBattles`（`:3611`）內部零 `await`；`startReveal` 的 async 只是演出節奏。
- **輸入按座位讀回，不按送出順序**：`S.humanBids[p.id]`（`:2593-2597`）、盯上／異事／心願都按 `S.players.forEach` 固定序。**但 `S.rng()` 全檔 47 處，不是三處**（第二意見修正）：AI 席每夜都在耗——`aiBids` 的閒置機率（`:2497`）、押命判定（`:2510`）、毒標對象（`:2439,2441`）、八張 `EVENTS[].ai`（`:1538…1685`）、盯上虛張（`:2178`）、抽市集（`:2380`）；平標（`:2666`）、`paperWar`（`:3622`）、局末小法寶（`:3019`）只是真人也會碰到的那幾處。結論仍成立——**(seed, 四家輸入, 哪些席是 AI) 決定整夜結算**——但「哪些席是 AI／誰逾時被補」必須是全桌一致的事實。
- hotseat 交棒流程 `proceedToBids`→`showHandoff`→`submitHumanBids`（`:4281-4287, 4453-4466, 4710-4724`）就是「四個人各自密封、最後一人觸發開盅」的本機版。
- **三個破口，不是一個**：① `resolveShrines` 對真人得主是**兩段式**——`:2936` 回 `out.pending` 就 return，`:4884-4885` `await showLegendPick` 之後才 `finishShrines(out,idx)`（`:2945`）：得主只有開盅後才知道，選尊是夜中央的第二次輸入；② 異事是獨立相位（`:4291-4335` 密封→開盅→再進拍賣）；③ `showTitheAsk()`（`:5596-5622`）在夜戰後彈窗問「繼續供奉／送神」。§4.2-2 已寫「選尊沒有策略入口」，這裡與它一致。

### 13.2 建議：鎖步（lockstep）而不是伺服器權威，因為引擎已經是決定性的
1. **協定**：房間發 seed；一夜**三個相位**各自密封（盯上→異事選擇→出價＋燒香＋押寶勾選，後一相位依賴前一相位揭曉）；伺服器做中繼、計時，**而且逾時裁決是它廣播的一筆權威輸入**（「席 2 逾時、以這包補入」）——不能讓四端各自看牆鐘判斷，否則 AI 補入與否不同 ⇒ `S.rng` 流分岔 ⇒ 全桌 desync。四端各自跑同一支引擎，AI 席由四端各自算（決定性保證一致）。逾時補入用 §4 的 `ghostPolicy` 或 AI。
2. **兩個夜中央輸入要改成預先宣告**：選尊改成「若我得標則選第 X 尊」隨出價包密封（沒得標就作廢）；送神改成「下一夜末是否繼續供奉」隨出價包密封。兩者都是規則層面的時機變更 → D7。不改就各多一次通訊往返，鎖步變三段。
3. **反作弊＝commit-reveal，但不是幾十行**：(a) 標書空間很小（`amt≤life`×兩種型態×意圖×4 目標×5 件＋燒香 ≤3），沒有每人一次性 **nonce 鹽**的 hash 毫秒級就被窮舉；(b) 一夜三相位各一輪 commit-reveal；(c) hash 要涵蓋 `{amt,type,intent,target,stake}×件`＋`INC.amt`＋押寶夜 `YB.{amt,type,pick[]}`（`:4713` 交卷時才展開）。Worker 驗 hash 與 nonce。已核：開盅後 `myBids` 改不到（`:2596` 在第一個 await 前已複製走）。
4. **好友房＋語音＋表情**：語音是 WebRTC 另一條線，與對局協定無關，後排。
5. **與 §4 幽靈共用同一顆 Worker**：幽靈桶、非同步天梯、房間中繼三者共用「(ver, seed) 桶」這個鍵，一次蓋好。

### 13.3 閘門雛形
- 鎖步等價：四個 headless client 各跑同 seed＋同輸入，`S.history` 四份逐位元組相等（對「有一端 rng 多消耗一次」的突變紅）。
- 送神改夜初後 `trace-eq` 對現行**不相等**（規則變了）且 H 系列閘門重跑。
- 斷線重連：從第 k 夜的四包輸入重放到現況（本來就是重播）。

### 13.4 地雷
- 規則週週改＝四端版本必須一致，房間鍵含 `ver`（同 §4）。
- 20 秒心跳 vs 現在單機一夜可以想很久：節奏會變另一個遊戲，先在幽靈版量真人平均決策時間再定秒數。

## 14. 老廟神案寫實質感（§6.1）——補

### 14.1 現況事實（行號）
- `renderer.js:80-93`：`antialias:true`、`pixelRatio ≤2`、ACES、exposure 1.1（`scene-env.js:30`）、sRGB。**`shadowMap` 從未啟用**；`creature-figures.js:961-963` 留了 `opts.castShadow` 開關但註解自陳「預設關：多一張 1024² shadow map＝每幀多一趟 render，26 隻同場不划算」。現在的影子是貼地圓形假影（`duel-figures.js:263-270`）。
- 燈源：四盞 `PointLight`（`scene-env.js:270-279`）＋ Ambient＋Hemisphere，**都沒有 `castShadow`**。桌面是純色 `MeshStandardMaterial`（`:257-261`，`0x6b3418`，無貼圖）。
- 後處理：自製 bloom＋深度邊緣線（`bloom.js`），**只在對決開**，牌桌直接 render（`renderer.js:24-27,254-259`）；vignette 是 CSS。
- 美術甲 A7 門檻：`duel-perf` 中位 fps ≥ 基準 ×0.9；牌桌 draw calls 增加 ≤10。iPhone 實測至今為零。

### 14.2 建議
1. **PCFSoftShadowMap 四盞點光＝四張 cube shadow map＝每幀多 4×6 趟深度 render**，在手機上是自殺。要做「拉長晃動的鬼影」用**一盞** `DirectionalLight` 或 `SpotLight` 投影（一張 map）＋燈籠只當顏色光，視覺上分不出來。**不能「牌桌開、對決關」**（第二意見修正）：`shadowMap.enabled` 切換會重編所有材質 program，而 `renderer.js:250-256` 正是用暖身幀守住「對決前後 `programs.length` 不變」的紀律；陰影要嘛整局常開（三尊與 26 隻紙紮明確 `castShadow=false`），要嘛不開。
2. **木紋貼圖＝改 ART_BIBLE，不是資產卷**（第二意見修正）：`docs/design/ART_BIBLE.md:8-9,78` 是全案前提——「引擎沒有貼圖」「材質語言全部翻成幾何＋頂點色」「剪影、主色、材質語言是僅剩的辨識手段」，`creature-figures.js:23` 同。桌面要有木紋只有兩條路：頂點色＋幾何（八角柱加木紋幾何刻痕，符合美術聖經）或正式修訂 ART_BIBLE 開放「環境物件可貼圖、角色不可」。香灰與符咒＝幾何片＋頂點色可做。→ D8。
3. **先量再開**：`?fps=1` 的 iPhone 數字回填之前，任何多一趟 render 的東西都不該開。閘門沿用 A7。

### 14.3 地雷
- `shadowMap.enabled` 是全域開關，一開所有 `castShadow` 物件都進深度 pass；三尊與 26 隻紙紮要明確 `castShadow=false`，否則對決 fps 直接崩。
- 軟陰影＋pixelRatio 2 在 844×390 的手機上等於 1688×780 的 shadow 取樣，`pixelRatio` 可能要降到 1.5 換陰影。

## 15. 驗證方式總表（每一卷開卷時寫進凍結檔；各節閘門雛形的彙整）
- 純演出卷（Tier 分級、桌心視窗）：`trace-eq` 逐位元組相等＋突變驗紅；`duel-drive` 0 error；`felt-probe` 直向；`dmg-readability` R1/R2 不退；fps 比值 ≥0.90；844×390 contact sheet 人眼。
- 規則卷（連鎖）：六之四優勢策略窮舉；`legend-gate` 同型 n=10000（追連鎖策略 vs splitter 帶 [−8,+5]、持有者優勢帶 [+3,+10]）；`CHAINS=[]` 等價；單元測試對基準紅在行為斷言。
- 幽靈卷：重播等價（四家 `life[]` 逐夜相等）；跨版本拒收；payload 大小；Worker 端 schema 驗證的紅綠測試。
- 全部沿用 `02 §6.1`：改前改後各跑、對基準紅、fresh 覆審三輪上限。
