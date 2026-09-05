# 卷 C3「招式演出」對抗式覆審 — 第 2 輪（反駁「我已修好」；冷讀 1c26b61..1ff3c21）

**真的修好 4／表面修好 0／沒修到 0；新 finding CRITICAL 0／HIGH 0／MEDIUM 2／LOW 2。**

被審宣稱：H-1、M-1、L-3 在 `1ff3c21` 修，M-2／M-3 在 `50fad6d` 修，L-1／L-2 不修。
本輪未修改 repo 任何檔案；治具輸出、對照樹、自寫探針全在 `…/scratchpad/review2-*`。

---

## H-1（滿編演出超過 900ms）：**真的修好**

**雙向鑑別力（本輪最重要的一項證據）**：`git archive HEAD` 到 `scratchpad/prefix`，**只把 `js/trait-fx.js` 換回 `1c26b61` 那一版**（其餘檔含治具一律 HEAD，所以 onTime 的判法兩邊相同），同一支 `tests/tools/traitfx-drive.mjs`、同一組 6 套、同樣 `--count=8`：

| 套 | 壞版（1c26b61 的 trait-fx.js） | HEAD |
|---|---|---|
| wardHpFront2 | end=**91**（1317ms）onTime=false | end=66 onTime=true |
| wardHpAll1 | end=**87**（1250ms）onTime=false | end=66 |
| hauntSteal | end=**82**（1167ms）onTime=false | end=66 |
| swarmFeed1 | end=**81**（1150ms）onTime=false | end=66 |
| eliteCleave / eliteVsSwarm | end=66（本來就沒超） | end=66 |

壞版 2/6 pass、好版 6/6 pass → 訊號會紅也會綠，不是恆綠。
（`review2-prefix-count8.json`、`review2-count8.json`；HEAD 不帶 `--count` 另跑一趟 6/6 end=66，`review2-default.json`，maxD 與已提交的 `all.json` 逐值相同 → 治具是決定性的。）

**① 被砍的是哪一段、主動作還在嗎**
- 被壓縮的一律是**晚 stagger 的那幾筆**：出招方的**收勢**與受招方的**退縮**。醞釀／出手（delay < 400ms）不受影響。
- `--count=8` 截圖（`review2-shots8/`）：`wardHpFront2-36.png` 前排護罩、地紋環都在；`hauntSteal-22.png` 銀絲、偷命姿勢都在 → **主動作還在**（`-22` 那格是出招後 167ms、屬醞釀段，本來就還沒到罩／環）。
- 但「壓縮」的實質是**砍演出**而不是排進預算，見新 finding 1／2。

**② 硬收工那一幀會不會跳格：不會**
`update()` 的 tween 迴圈（`js/trait-fx.js:405-410`，`t = Math.min(1, …)`）排在 `if (run.t >= run.ms) … finish(run)`（:414-415）**之前**，收工那一幀一定先把每條 tween 套到 t=1 的終值再收。實測：`all-count8.json` 27 套第 65／66 幀與其後 tail 的 Δ 全部 0.000，`stats.cut=0`（沒有任何一套在收工當幀還有未跑完的 tween／timer）。

**③ hitstop 讓 run.t 落後 → 重疊仍會發生？這條路我否證了**
`fxHitstop` 是 await 的（`index.html:4058／4067／4162`），而且它在自己的 setTimeout 裡**先派 `ys:hitstop{ms:0}` 再 resolve**（`index.html:3148-3158`）；全檔只有它派 `ys:hitstop`（`renderer.js:123` 接收、`index.html:3152/3155` 派送）。招式那一筆走 `if(staged){ await pwSleep(TRAIT_MS); continue; }`（:4054），它的 900ms 視窗內沒有任何未 await 的 hitstop 來源 → **3D 的 dt 不會在招式期間被歸零**。
殘留的 run.t 落後只剩兩條、都不是 hitstop：單幀 >100ms 被 `Math.min(dt,0.1)` 夾掉（`renderer.js:162`）、分頁切背景 rAF 停（:214-220）。
即使真的重疊，狀態面乾淨——自寫探針 `review2-probe2.mjs`（8 尊對面、第 12 幀發第一套、第 57 幀再發同一套）：6/6 第二套在第 **111** 幀（＝發招後 54 幀）收工、restored=true、cut=0、fused=0、0 pageerror；重疊區 Δ 連續無凹陷（wardHpFront2 第 65→66 幀 4.157→4.187、hauntSteal 1.658→1.721）。

---

## M-1（遞迴 dispose 會不會誤殺材質模板）：**真的修好**

- 修法在 `js/trait-fx.js:374-378`：`m.traverse(c => { c.geometry?.dispose(); c.material?.dispose(); })`，蓋住 `js/trait-fx/xianghuo.js:27` 那個 `st.spawn(new THREE.Group(),'slash')` 的子節點（帶 PlaneGeometry 的 blade 在 :31 建、:32 掛進去）。
- **模板不會被 dispose**：`grep MAT_ js/trait-fx/*.js` → 0 命中；所有 mesh 的材質都走 `st.glow`／`st.lineMat` 的 clone（`js/trait-fx.js:267-268`）。唯一直接用 `MAT_GLOW`／`MAT_LINE` 本體的是常駐暖身物件 warm（:97-105），它是 `scene.add(warm)`、**從不進 run.meshes**，traverse 摸不到。
- moves 裡的 `.add(` 只有 `xianghuo.js:32 pivot.add(blade)` 是場景節點，其餘 4 處（`xianghuo.js:146/258`、`yinqi.js:178/388`）是 `Vector3.add`，不會把共用物件掛進 spawn 樹。
- 實跑：eliteCleave 三趟（default／`--count=8`／foe=8）全 PASS、err=0、prog+0、restored=true。
- 證據等級：`renderer.info.memory` 在 preview 治具沒有出口，我沒直接量到 geometries 歸零；但 dispose 路徑只有這三行、可達物件集合已窮舉。
- 一句提醒（不是 finding）：traverse 現在會 dispose **任何被 spawn 進來的子樹**；日後若有人把 figure 的 model 掛進 spawn 的 Group，就會把遊戲資產 dispose 掉。

---

## L-3（同尊仍有別套在演時把 w.over 歸零）：**真的修好**

**會不會清掉別套正在寫的值？順序上不會。** runs 是 Set、先開的先進（`js/trait-fx.js:366`），`update()` 用 `Array.from(runs)` 依序跑（:401），`finish(A)` 落在 A 那一輪的**最後**（:414-415），後開的 B 的 tween 在**同一幀稍後**才 update＋apply（:405-412）→ 被歸零的值同幀就被 B 重寫，畫面取不到那個中間態。
**唯一「靜態設定、沒有 tween 每幀重寫」的覆寫，全庫只有 1 處**：`js/trait-fx/yinqi.js:35` 的 `done(){ …; st.rim(g, 2.2); }`（我寫腳本掃三個系別檔所有 `st.rot/shift/scaleBone/move/spin/scale/rim` 呼叫點、判定最近的外層 callback 是 update／done／at，只有這一筆在 done 裡）。它若剛好落在別套 finish 的那一幀會被歸成 1，下一次收勢 tween（`yinqi.js:40`，560+i*40 起）會重寫 → 最壞是少閃一次邊光，純視覺、不留殘值。
**實測**（`review2-probe2.mjs` overlap 模式，6 套）：第 57–65 幀 active=2（兩套真的並存）、第 66 幀 A 收工，Δ 序列連續、**0 dips**（判準：前一幀 >0.05、當幀 <15%、下一幀又回到 >50%）；兩套都 finish（stats.finished=2）、restored=true、wrapped 最後歸 0。

---

## M-2（evMs 公式退回 v0.32）：**真的修好**

- `git diff 41b7cf1 -- index.html`：show（`index.html:4036`）與 evMs（:4039-4040）三行都是 **context、逐字未動**，只多了上方一段註解。
- fallback 確實等 evMs：staged 為 false 時不 continue（:4054），流程落到迴圈尾 `await pwSleep(evMs)`（:4064）。
- **回歸抽查（duel-drive 4 場，seed=20260905）**：每場 trait 數 **1/2/1/3** ✅、`FXC.trait=7`、**traitFig=7** ✅、burn 8（fig 6／dom 2）、errors=0、ys3d=true、版本字串 v0.33。
  時長 5756/6878/5960/8343 vs 已提交基準 `bl3-v033-seed.json` 的 5782/6860/5933/8363（每場 ≤ ±30ms，重現成功）；v0.32 基準 5093/5413/5331/6233。
  T-6 凍結原文是「**中位**」（`docs/experiments/2026-09-05-acceptance-traitfx-C3.md:25`）：扣 640×n 後 v0.33 中位 5437 ≤ 5372+150 ✅；逐場 d2／d4 各超 17／60ms 這件事**報告 T-6 欄自己寫出來了**，不是隱瞞，也沒有動凍結條件。

---

# 新發現（本輪自己找到的）

## [MEDIUM] 壓縮是「砍演出」不是「排進預算」：晚 stagger 的受招退縮／收勢被壓成 2–4 幀

`st.at` 夾到 `run.ms-40`（`js/trait-fx.js:265`）、`st.tween` 依 `room = run.ms - run.t` 等比壓（:257-262），最後幾筆只剩 room 可用：
- **hauntSteal 8 尊**：第 8 尊收勢 timer 在 840ms（`yinqi.js:40` 的 `560+i*40`），room=60 → 320ms 的收勢 tween 被壓成 **60ms（3.6 幀）**。痕跡量得到：`all-count8.json` 該套第 63→64 幀 Δ 由 1.382 掉到 0.354（單幀落差 1.03，同套原編制只有 0.49），第 65 幀 0.000——收勢在最後兩幀硬收。
- **eliteVsSwarm 對面 8 隻**（`yinqi.js:301` 的 `st.at(380+j*85)`）：j=6/7 的 890／975ms 被夾到 860ms，其 `st.flinch`（`TFX.flinchMs=240`）room=40 → 壓成 **40ms（2.4 幀）**；受招輕反應是使用者裁定的功能，那兩隻等於沒演。我的 foe=8 探針量到該套 compressed=6。
- 官方治具驗不到：onTime／alive／restored 只問「有沒有動、有沒有歸零、幾點收工」，不問「那一段還看得見嗎」。

**建議修法**：把 stagger 間距依隻數先縮（`lag = i * Math.min(base, budget/n)`）讓整套自然收在 900ms 內，而不是讓最後幾筆被壓到 2–4 幀；或給壓縮一個保底 ms（≥ 2 幀）並反推整體 stagger。

## [MEDIUM] tween 壓縮把 delay 也等比縮 → 晚位的「醞釀」被提早開演的「收勢」蓋掉（≥6–7 尊同 body 才踩得到）

`js/trait-fx.js:260` 的 `delay *= f` 會**把後段整條往前拉**，而同一尊早段的 tween 沒被壓（它沒超預算）→ 兩條重疊，且後 push 的每幀後寫者勝（:405-412 依陣列序、`overOf().rot.set()` 是絕對寫入）。
- **wardHpFront2 第 8 尊**（`zuling.js:65` lag=490）：收勢 tween（`zuling.js:96`，delay=730、ms=580；開演時 run.t=0 → room=900）f=900/1310=0.687 → delay **501**、ms 398；醞釀 tween（`zuling.js:78`，delay=490、ms=240，730≤900 沒被壓）卻要跑到 730。兩條在 501–730 重疊，收勢後 push → 第 501ms 那一幀姿勢從 `out((501-490)/240)=13.7%` **直接跳到 100%**（收勢 t=0 時 k=1），之後才衰減；醞釀那 240ms 等於被吃掉。
- **wardHpAll1 第 8 尊**同型（`zuling.js:117` 起，收勢 delay 740→537、跳點 47%→100%）。這兩套正是 `--count=8` 壓縮段數最高的（22／18）。
- 官方治具看不到：Δ 是敵我全體 matrixWorld 的 **max**，第 8 尊的跳格被前幾尊的幅度蓋住。

**建議修法**：壓縮只縮 ms，delay 改成 `Math.min(delay, room - minMs)` 夾住（不要等比往前拉）；或整套在 run 層級算一個共同 f，保住相位關係。

## [LOW] 官方 --count 只加出招方，foe 側滿編從沒被量過

`tests/tools/traitfx-drive.mjs:57` 只把 count 帶進 URL，preview 的 FOE 固定「boat:swarm:zuling:3, sword:elite:xianghuo:1」（`tests/tools/traitfx-preview.html:62`）。所以 round-1 舉的最壞案例（eliteVsSwarm 對面 8 隻 → 1215ms）在 `all-count8.json` 裡是 compressed=0，等於「滿編」那條驗收只涵蓋一半。
我補跑 `foe=boat:swarm:zuling:8`（`review2-probe2.mjs`）：6 套全部 end=66、onTime、restored、cut=0、err=0，**結論不變**；但證據夾裡缺這一份。
**建議**：`drive.mjs` 加 `--foecount`，補一份 `all-foe8.json` 進 `2026-09-05-traitfx-evidence/`。

## [LOW] room ≤ 0 時 tween 會被壓成 ms=1（只跑 update(0) 一幀就被清掉）

`js/trait-fx.js:260` 的 `ms = Math.max(1, ms * f)`，而 `f = Math.max(0, room)/(delay+ms)` 可為 0。可達路徑：`done()`／巢狀 `st.at` 在 `run.t ≥ run.ms` 的那一幀再排 tween（`xianghuo.js:397/452`、`yinqi.js:34/449`、`zuling.js:40` 都是 fly 的 done）。目前 27 套最晚的 fly 收在 840ms（swarmFeed1 j=7），踩不到；stats.cut 現在記得到（27 套 `--count=8` 皆 0）。這條靠「沒人寫更晚的 fly」在守。
**建議**：ms 下限提到一幀以上（如 33ms），或 `room <= 0` 時直接不排並記 stats.dropped。

---

# 我跑過的東西（可重跑，全部寫在 scratchpad）

    node tests/tools/traitfx-drive.mjs …/review2-count8.json --only=wardHpFront2,wardHpAll1,swarmFeed1,eliteVsSwarm,eliteCleave,hauntSteal --count=8 --shots=…/review2-shots8 --port=8893   # 6/6 PASS end=66
    node tests/tools/traitfx-drive.mjs …/review2-default.json --only=<同上> --port=8895                 # 6/6 PASS end=66（maxD 與 all.json 逐值相同）
    # scratchpad/prefix ＝ HEAD 樹 ＋ 1c26b61 的 js/trait-fx.js（NODE_PATH 指到 repo 的 playwright）
    node tests/tools/traitfx-drive.mjs …/review2-prefix-count8.json --only=<同上> --count=8 --port=8896  # 2/6 PASS，end 91/87/82/81
    node tests/tools/duel-drive.mjs "http://127.0.0.1:8894/index.html?paperwar=1&fxcount=1&seed=20260905" …/review2-duel4.json --duels=4 --port=8894   # trait 1/2/1/3、traitFig 7、err 0
    node …/review2-probe2.mjs …/review2-probe2.json 8897    # 自寫：foe=8 滿編 ＋ 同尊兩套重疊（各 6 套）

輸出：`review2-count8.json`、`review2-default.json`、`review2-prefix-count8.json`、`review2-duel4.json`、`review2-probe2.json`、`review2-shots8/`、對照樹 `prefix/`。
未修改 repo 任何檔案（`git status --short` 空）。

# 附記：覆審進行中工作區又動了（不影響結論）

`git status --short` 在我開審時是乾淨的，收尾時多了一筆未提交改動：`docs/experiments/2026-09-05-traitfx-report.md`（1 行，T-2 那格的證據敘述由 `within=true（結束幀 66–72）` 改成 `onTime=true（原編制與 --count=8 都在第 66 幀）`）。
- 只動文件敘述，`js/`、`index.html`、`tests/` 一行未動 → 我所有實跑證據不受影響。
- 但這一行**還沒進 commit**：`1ff3c21` 裡的報告 T-2 欄仍寫著舊的 within 敘述。宣告完成前要嘛提交，要嘛還原（同 round-1 M-3 那條的教訓）。
