# 提案：對決「近景切鏡」卷（大作對戰感）——批 1 原型（2026-09-07）

使用者 2026-09-07 裁定：三方向（甲 近景切鏡／乙 拍序舞台／丙 戰線推進）選**甲＋HUD 配套，乙當非交鋒時的底層排法**；先做一拍原型給他看，再全做。

## 一、現況（事實，來自唯讀調查；行號以 674c093 為準）
- 流程：`resolveBattles`→`paperWar` 產 `war.beats`（`pwRec` 2755：`{beat,side,actor,target,kind,amount,killed,trId?}`，kind＝hit／thorn／bite／bolt／openShot／burn／trait／beatStart）→`playDuel`(4581)→`playDuelWar`(4537)→逐拍 `pwPlayBeat`(4486)→逐筆派 `fx3d` 事件（`ys:fx-punch`／`ys:fx-impact`／`ys:fx-lunge`／`ys:fx-trait`／`ys:fx-burn`／`ys:hitstop`）→`camera-director.js`（只聽事件、`goto()` 補間，機位 `DUEL_SHOT dist 4.2`，三層偏移 PUNCH／ORBIT／LEAN；`duelYaw(a,b)` 是現成「看得到雙方」機位；**沒有聚焦單尊的機位**）／`duel-figures.js`（`onLunge` 餵 hitDir／hitAt／hitPower；`setFigureOpacity(fig,op)`；`figureOf(side,id)`／`figuresOf(side)`）／`trait-fx.js`（招式編舞，`flinch`、燈組 focusK）。
- 全程一顆固定廣角，交鋒只有 lunge 位移＋粒子＋字幕；**沒有逐次傷害跳字**（只在整場結尾一個 dmg 大字）；HUD＝拍名 `#duelBeat`、招式字幕 `#duelMove`、兩側卡（名字／隻數／體型文字／晶片）。
- 快轉：`doSkip()` 設 `SKIP`、叫醒 `PW_WAKE`、派 `ys:fx-trait-cancel`；`pwSleep` 在 SKIP 下立即 resolve。
- 手機約束：`PW_FX.EV_BUDGET_MS 1050`／`MAX_HITS 5`／`HITSTOP_PER_BEAT 1`／`HITSTOP_DMG 3`／`BURN_MS 420`／`MAXFIG 10`；`CROWD_N 5` 時 renderer 關邊緣線。

## 二、批 1 原型要做的（一拍看得出「大作感」的最小集合）
1. **聚焦切鏡**：新事件 `ys:fx-focus {side, actor, foeSide, target, ms, kind}`，由 `pwPlayBeat` 在 (a) 該拍**第一筆** `hit` 且 `amount ≥ PW_FX.FOCUS_DMG`（預設＝HITSTOP_DMG 3）、(b) 每筆 `burn`（跟拍化灰）時派出；一拍最多 `PW_FX.FOCUS_PER_BEAT`（預設 2）次；`ms`＝`PW_FX.FOCUS_MS`（預設 650；burn 用 `BURN_MS+180`）。`camera-director.js` 新增 FOCUS 層：目標點＝actor 與 target 兩尊世界座標中點（讀 `window.__yaoshi3d.duelFigures.figureOf`；找不到任一尊就退回 `duelYaw` 雙方中點）、距離縮到 `FOCUS_DIST`（預設 2.6）、俯角略降（`FOCUS_TILT` 18）、ease-out 進 160ms／ease-in-out 回 220ms；focus 期間 PUNCH／LEAN 照疊，ORBIT 停；`ys:fx-trait-cancel`／`ys:duel-end` 立刻回 `DUEL_SHOT`。同一拍第二次 focus 若前一次未回完，直接接續（不先回全景）。
2. **退暗**：focus 期間非 actor／target 的尊 `setFigureOpacity(f, PW_FX.FOCUS_DIM)`（預設 0.35）並縮 `FOCUS_SHRINK`（0.92）；回全景時復原到該尊原本的不透明度（haunt 是 `hauntOpacity`，燒毀中的走燒毀曲線——**不得**把燒毀中的尊復原成 1）。實作放在 `duel-figures.js` 的一個 `focusState`，主迴圈每幀依它算 opacity（不是一次性設值，才不會被 update 迴圈的 `setFigureOpacity(…,(1-bu))` 蓋掉）。
3. **傷害跳字**：每筆 `hit`／`thorn`／`bite`／`bolt`／`openShot` 在 target 尊的螢幕投影位置（`camera.project`；找不到 3D 尊時退回該側 `#pwn-${tag}` 隻數牌的位置）生一個 `.dmgfloat` DOM（文字 `−{amount}`，killed 時加 `class="kill"` 放大＋系色），WAAPI 上飄＋淡出 `PW_FX.DMG_MS`（600），只動 transform／opacity；同一拍最多 `MAX_HITS` 個；`doSkip` 時全部移除。
4. **HUD 三件**：(a) `#beatLamps` 三顆燈（撞／護／祟）放在 `#duelBeat` 旁，依拍序累積點亮，當前拍那顆呼吸光；(b) 兩側存活量表 `.pwgauge`：寬＝存活／開場總數，隨 `pwBurnOne` 同步縮，低於 1/3 變紅；(c) 出手卡 `#actorCard`：`ys:fx-trait` 與 focus 的 hit 時在出招方那一側閃現「系徽＋法寶名（`POOL`/`LEGENDS` 的 n）」，`ACTOR_CARD_MS` 700 後淡出；同時只顯示一張。
5. **旗標與退路**：`PW_FX.CLOSEUP_ON`（預設 true）、`?closeup=0` 關；關掉時**所有** ys:fx-focus／退暗／跳字／HUD 三件都不出現，演出與 674c093 逐事件相同。`fxcount=1` 時 `FXC.focus`／`FXC.dmgFloat` 計數。

## 三、不做（留批 2）
招式（trait）切鏡、燒毀跟拍的鏡頭跟隨灰燼、聲音、勝負結算演出、直式排版細調、任何引擎改動。

## 四、風險與對策
- 手機切鏡太頻繁會暈：FOCUS_PER_BEAT 2＋只對 ≥FOCUS_DMG 的 hit；試玩必調。
- 3D 未載到（GLB 逾時）：figureOf 回 null → focus 退回雙方中點、跳字退回隻數牌位置，不得報錯。
- SKIP：所有新 await 走 `pwSleep`，不得用 `sleep`；cancel 事件要把 focus／退暗／跳字一次清乾淨。
- 效能：不新建材質；退暗改的是既有材質的 opacity；跳字 DOM ≤ MAX_HITS 個並重用。
