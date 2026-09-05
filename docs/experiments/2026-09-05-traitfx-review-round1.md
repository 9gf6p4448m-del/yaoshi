# 卷 C3「招式演出」對抗式覆審 — 第 1 輪（冷讀 41b7cf1..1c26b61）

**（以被指定的 41b7cf1..1c26b61 計）CRITICAL 0／HIGH 1／MEDIUM 3／LOW 3；其中 2 條 MEDIUM 已被覆審途中落地的 50fad6d 修掉，見文末附記 → 對 HEAD 而言是 CRITICAL 0／HIGH 1／MEDIUM 1／LOW 3。**

被審範圍：index.html、js/renderer.js、js/trait-fx.js、js/trait-fx/{zuling,xianghuo,yinqi}.js、tests/tools/traitfx-{preview.html,drive.mjs}、tests/tools/duel-drive.mjs；一併讀了未改的 js/duel-figures.js:490-608、js/creature-figures.js:300-420、js/particles.js:160-290。

---

## [HIGH] 滿編時 6/6 抽測的招式演出超過 TRAIT_MS，時間軸不等它就走下一筆事件

**觸發情境**：任一側場上該 body 的 3D 妖 >=5 尊（PW_FX.MAXFIG=8，中後期常態）。逐尊錯開的 lag／delay 會隨隻數線性長，但 run.ms 固定 900、finish 的條件是「run.t>=ms 且沒有 tween 也沒有 timer」（js/trait-fx.js:399），所以演出一路演到最後一條 tween 結束為止。index 這邊只固定睡 900ms（index.html:4052 `await pwSleep(staged?PW_FX.TRAIT_MS:...)`）就 continue 到下一筆事件。

**實測（治具實跑，非推論）**：scratchpad/review-overlap.mjs（自寫，走官方 traitfx-preview.html），出招方 8 尊、對面 8 尊，量「active 歸 0 的幀」：

| 招 | 檔案:行號（lag 來源） | 演出實際長度 | 超出 900ms |
|---|---|---|---|
| wardHpFront2 | js/trait-fx/zuling.js:65 `lag = gi*70` ＋ :96 delay `lag+240` ms 580 | **1317ms** | +417 |
| hauntSteal | js/trait-fx/yinqi.js:40 `st.at(560+i*40)` ms 320 | 1167ms | +267 |
| swarmFeed1 | js/trait-fx/yinqi.js:434 delay `620+i*40` ms 260 | 1150ms | +250 |
| wardAtkAll1 | js/trait-fx/xianghuo.js:90 delay `60*i` ms 420 | 1134ms | +234 |
| hauntFearX2 | js/trait-fx/yinqi.js:401 delay `j*30` ms 460 | 1034ms | +134 |
| eliteVsSwarm | js/trait-fx/yinqi.js:301 `st.at(380+j*85)` ＋ flinch 240 | 900ms（我的對面只有 4 隻小兵；8 隻時 380+7x85+240=1215ms） | — |

連 POOL 原編制（27 套官方治具跑）都已經有兩套超時：wardHpFirst end=71（983ms）、hauntSteal end=72（1000ms）。

**為什麼現有守衛擋不住**：① 保險絲是 ms x TFX.fuseMul = 1800ms（js/trait-fx.js:39,356），1317ms 摸不到；② 凍結檔 T-2③ 只要求「<=TRAIT_MS x2 內歸零」，1317 < 1800 所以治具照樣 PASS；③ 27 套只有官方治具那組固定編制被量過，隻數一多就沒人量。也就是說這條在現有驗收下是綠燈盲區。

**具體壞掉的東西**：pwSleep(900) 一到就跑下一筆通用交鋒 → fxLunge 讓 duel-figures 在同一尊上播 attack clip 並推位移（js/duel-figures.js:530-533），而 trait-fx 還在同一尊上疊骨骼 delta 與 rimMul（js/trait-fx.js:397 `run.wraps.forEach(apply)`、:130 包裝過的 setRim），最長 0.42 秒兩套演出同時驅動同一批骨骼與邊光倍率相乘。招式若是本拍最後一筆，收勢還會壓在燒毀那一段上。

**明確不是 CRITICAL 的理由（我實測否證過）**：狀態面乾淨。我照 index 的節拍在同一尊上連發兩次（間隔正好 54 幀=900ms），滿編 8v8，六套全部 restored=true / tailMaxD=0.00000 / wrapped=0 / finished=2；重疊期間再按 SKIP 也是下一格就 active=0、mesh=0、Δ=0。restore→mixer→capture→apply 的順序（js/renderer.js:178）是對的。

**建議修法（一句）**：把逐尊錯開的 lag 依隻數壓縮（`lag = i * Math.min(70, 300/Math.max(1,n))`）讓最後一條 tween 收在 st.ms 內，或把 run.ms 當真正的死線（超時把剩下的 tween 直接推到 t=1 收勢），二選一。

---

## [MEDIUM] eliteCleave 的劍光 mesh 永遠不會被 dispose（每次斬瘟漏一份 geometry ＋ material）

**觸發情境**：任何一場打出「王爺劍・斬瘟」。js/trait-fx/xianghuo.js:27 把 `new THREE.Group()` 交給 st.spawn，真正帶幾何的 blade 是 :29-32 掛在 pivot 底下的子節點，**沒有進 run.meshes**。js/trait-fx.js:368-371 的 finish() 只對 run.meshes 的頂層元素做 `m.geometry.dispose()／m.material.dispose()`，Group 沒有這兩個屬性 → `scene.remove(pivot)` 之後 blade 的 PlaneGeometry（VBO）與 clone 出來的 MeshBasicMaterial 一直留在 GPU。

這是 27 套裡唯一一處巢狀 Group（我 grep 過 `st.spawn(`／`new THREE.Group`／`.add(`，js/trait-fx/*.js 只有這一筆）。program cache 不受影響（三場真玩 renderer.info.programs 都停在 21、沒增），漏的是 geometry/material 物件本身。

**證據等級**：讀碼推論（renderer.info.memory 在治具頁沒有出口，我沒法直接量）；但 dispose 路徑只有那三行，沒有第二條會碰到子節點。

**建議修法**：finish() 改成 `m.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); })`，順手把整個 spawn 家族一起蓋掉。

---

## [MEDIUM] 沒有 3D 時的招式時長與「有招式那一拍」的通用交鋒節奏都變了，凍結檔 T-6 的公式沒把這一段算進去

index.html:4036-4038：evMs 的分母從 show.length（含招式）改成 hits（不含招式）；:4052 招式在沒有 3D 時固定睡 EV_MAX_MS=260，不再是 evMs。

**算術**：一拍 1 招 ＋ 5 次交鋒 → v0.32 每筆 round(1050/6)=175ms；現在通用交鋒每筆 round(1050/5)=210ms（x5 = +175ms），招式那筆 175→260（+85ms），單拍 +260ms，三拍最多 +780ms。凍結檔 T-6 只允許「v0.32 基準 ＋ (900-260) x 招式數 ＋ 150ms」，這 +780ms 完全落在誤差項外面；而且在 --no3d 時（招式數 x 640ms 那一項為 0）整段都是純超支。

**證據等級**：讀碼 ＋ 算術。我這一輪量到的是本版數據（3 場真玩 dur/招式數：[4571,0]、[7548,4]、[7580,4]；--no3d 3 場：[4796,0]、[5260,1]、[4445,0]，0 pageerror、0 requestfailed），**沒有 41b7cf1 同機基準可比**，所以我無法宣稱 T-6 已經紅了，只能說公式漏了一項。

**建議修法**：要嘛把 T-6 的公式補上 evMs 重分配那一項（走 02 §2.1，這會讓通過機率上升、需使用者簽准），要嘛把 hits 改回 show.length 讓通用交鋒的節奏與 v0.32 逐項相同。

---

## [MEDIUM] 工作區有 2 處未提交的 index.html 改動，落在被審 commit 之外

`git diff -- index.html`（HEAD=1c26b61）還有沒進 commit 的兩段：

- index.html:3141-3142 新增 FX_SEED（`?fxcount=1&seed=N` → 固定亂數種子）
- index.html:4411 `newGame(SEL.mode, FX_SEED, SEL.picks)`（原本第二個參數是 undefined），註解自稱「卷 C3 T-6 逐場比對」

三個問題：① 這個鉤子是 T-6「逐場比對 v0.32」唯一可能的機制，但它不在被審的 diff 裡，等於那條驗收的證據是用沒進版控的碼跑出來的；② 我這一輪所有治具跑的是工作區版本、不是 1c26b61 本身（差異僅這兩段、與招式路徑無關，但要記在案）；③ 正式頁面也帶著這段（要同時 fxcount=1 才生效，風險低，但等於把遊戲種子開放給網址參數）。

**建議修法**：這兩段要嘛進 commit（並在凍結檔補記 T-6 的比對用了它），要嘛在宣告完成前還原。

---

## [LOW] st.rim 是單一純量、沒有疊加語意，兩條 tween 同時寫時後押的完全蓋掉先押的

js/trait-fx.js:252 `rim(fig,mul){ wrapOf(fig).rimMul = mul }`，而 :333 的 flinch 也直接寫 w.rimMul。update 依 run.tweens 陣列序跑（:390），所以後 push 的那條贏。

- js/trait-fx/yinqi.js:353 先 push「被穿的邊光 1+1.8·sin(πt)」，:354 的 `st.flinch(foes,…)` 後 push → 重疊的 240ms 內 353 那條完全沒有效果。
- 同型：js/trait-fx/yinqi.js:141（rim 脈衝）對 :143（flinch）。

純視覺、不留殘值（兩者末格都回 1）。建議 rim 改成累乘（w.rimMul *= mul、每幀先歸 1）或編舞端自己合併。

---

## [LOW] T-2② 的 alive 沒有單獨驗到「出招方真的動了」

tests/tools/traitfx-preview.html:126-136 的 snapshot() 把敵我所有 figure 的 matrixWorld 攤在同一個陣列，maxDiff 只出一個純量；tests/tools/traitfx-drive.mjs:105 的 `alive = d>EPS || mesh>0 || burst`。受招方只要 flinch 了（27 套裡 14 套會叫 st.flinch），d>EPS 就成立，跟出招方有沒有動無關；mesh／burst 又是 OR 的另外兩條腿。也就是說「出招方一動不動、只噴粒子＋讓對面 flinch」的假編舞會拿到 alive=true。

**這不是違反凍結檔**——T-2② 白紙黑字就是「兩者擇一即活性成立」，是那條訂寬了。附帶查證：burst 這條腿本身有鑑別力（js/particles.js:200 初始 visible=false、:256 沒活粒子就關；27 套裡 hauntLost／hauntDread1 的簽章確實沒有 burst），不是恆真訊號。

建議下一版治具把 snapshot 拆成 actor／target 兩段各出一個 d。

---

## [LOW] lastSig 是單一全域插槽，且編舞 throw 的半套結果也會寫進去

js/trait-fx.js:376 在 finish() 裡無條件覆寫 lastSig，而 :359 編舞 throw 時也走 finish(run)。兩個 run 重疊時（見 HIGH 那條，滿編下是常態）後結束的會蓋掉前一個；--throw 模式下 lastSig 是半套的。目前治具每個 case 開新分頁、單一 run，所以摸不到；一旦有人拿 lastSig() 在真對決裡做判定就會踩到。

同一段還有一個潛在項：finish() 只在 w.runs 空掉時才 unwrap，**不清自己那些 w.over 條目**。目前 27 套的收勢 tween 末格我逐套推過都回 0（swarmPierce 那個 6π 的 Euler 等價 identity，js/trait-fx/yinqi.js:339），所以殘值約 0、雙發實測 tailMaxD=0；但若哪天有一套被保險絲硬切在半途、而同一尊還被另一個 run 抓著，被切住的 delta 會凍到後一個 run 收工為止。現在 27 套最長 tail 約 1330ms < 1800ms，摸不到，是靠「沒人寫超過 1.8 秒的招」在守。

---

# 各類追過但沒找到的路徑

**第 1 類 對決卡死／時間軸拖慢**：追 pwTraitFx（index.html:3896-3906，同步派送、只讀 det.handled、**從不 await det.done**）→ pwSleep（:3937，SKIP 時直接 resolve）→ trait-fx 的三條收尾（finish 的 t>=ms 與 t>=fuse、cancelAll 掛在 ys:fx-trait-cancel 與 ys:duel-end，js/trait-fx.js:398-411）。hitstop 只把 dt 歸零（js/renderer.js:163）→ 凍住 run.t 但凍不住 pwSleep 的 setTimeout，所以只會讓演出更晚結束、不會讓下一拍不來。分頁切到背景 rAF 停、visibilitychange 回來會重設 lastT 並重啟（js/renderer.js:214-220），dt 被 Math.min(...,0.1) 夾住。GLB 晚到走 live() 的 f.ready() 過濾（js/trait-fx.js:346）→ 退 fallback。三場真玩 0 pageerror／0 requestfailed。**沒找到卡死路徑。**

**第 2 類 下一拍動作被污染（狀態面）**：追 wrapFig→restore/capture/apply→unwrap（js/trait-fx.js:115-175）、js/renderer.js:177-178 的呼叫順序、js/duel-figures.js:514-518（burn 中的那尊 f.update(dt) 仍會被呼叫，restore 不會斷）、js/creature-figures.js:389-400（burn() 只推 dissolve、不動 model transform，所以跟 apply 不打架）、ys:duel-end→cancelAll 在下一場 ys:duel 重配池位之前一定先跑（index.html:4180）。TRAIT_MOVES 用 Object.create(null)（js/trait-fx.js:35）擋掉 __proto__／constructor 這種 trId。滿編 8v8 雙發 ＋ 重疊取消實測：restored=true／tailMaxD=0.00000／wrapped=0。**除了 HIGH 那條的暫時性視覺重疊，狀態面沒找到污染。**

**第 3 類 SKIP 後殘留**：doSkip()（index.html:1736）三行是同步的——PW_WAKE() 只是 resolve 一個 Promise（microtask，排在 fx3d("ys:fx-trait-cancel") 之後才跑），所以 cancelAll 一定先執行；「SKIP 在派送之後、await pwSleep 之前」在單執行緒下不存在（fx3d 與 await 之間沒有 await 點）。pwTraitFx 開頭的 `if(SKIP) return false` 與 v0.32 等價——v0.32 走的 pwTraitFxDefault 裡 fxFlash／fxImpact 各自有 SKIP guard（index.html:3174／:3164），本來就什麼都不演。finish() 會清 meshes／tweens／timers 三個陣列（:368-373），所以 st.at 排的 timer 在 finish 後不會執行、也不會再 spawn。實測（--cancel 語意，含兩個 run 重疊時取消）：下一格 active=0、mesh=0、wrapped=0、Δ=0。**沒找到殘留。**

**第 4 類 無 3D／DOM 退路**：--no3d 三場 → traitFig=0、trait 照計、0 pageerror（只有刻意擋掉的 renderer.js requestfailed）。我另外實測擋掉單一系別檔的兩種壞法（route.abort() 的 404，與回一段語法錯的 JS）：兩種都是 moves=18、祖靈那套 handled=false／fallback=1／wrapped=0 退回通用 fallback、陰氣那套照演（handled=true、8 尊被包裝）、**0 pageerror**——js/trait-fx.js:27 的 `import(...).then(ok, ()=>({}))` 守得住。編舞 throw 走 js/trait-fx.js:359 `stats.thrown++ → finish(run) → return null` → handled=false。figuresOf 拋錯被 :346 的 try/catch 吃掉回 []。FXC.trait 的計數點（index.html:4044）一行沒動。**沒找到退化路徑的破口。**

**第 5 類 效能與資源**：三場真玩 renderer.info.programs 全部停在 21（第一場之後沒再增），27 套官方治具每套 prog+0——js/trait-fx.js:97-106 那組常駐暖身物件有效。粒子池單套最多可能要到 272 顆（eliteVsSwarm n=34 x 8）超過 burstPool=260，但 js/particles.js:227-228 的 cursor 環繞有 alive-- 補償，只會把最老的幾顆提前收掉、不會炸。wrapFig 裡那個 `children.find(...traverse...)`（js/trait-fx.js:120）是**每次包裝一次、不是每幀**，每幀只有 apply 的 Euler→Quaternion 乘法（最多 45 骨 x 2 尊）。**只找到 eliteCleave 的 dispose 漏洞（見 MEDIUM）。**

**第 6 類 編舞層共通錯誤**：我把 27 套函式本體逐一切出來，對 docs/experiments/2026-09-05-traitfx-bones.md 的 GLB joints 清單機械比對（含 'Body'+i／'Trunk'+i 這種動態拼接的索引範圍）→ **0 個不存在的骨名**；Math.random 0 處；自建 `new THREE.*Material` 0 處（只用 st.glow／st.lineMat）。27 套的收勢 tween 末格我逐套代進去推過都回 0（snap(1)=0、pulse(1)=0、wind(1)=0、1-out(1)=0；swarmPierce 的 spin=6π 是等價 identity）→ 不靠 finish 硬還原、不會跳格。最長的 tail（wardHpFront2 滿編 1330ms）仍在保險絲 1800ms 內，沒有招式會被硬切。**只找到 rim 覆寫（LOW）。**

**第 7 類 與凍結檔的落差**：T-1 `{missing:[],extra:[]}`（27/27）通過。T-2 27/27 handled/alive/restored/within 全 PASS（但 alive 的鑑別力見 LOW）。T-3① 我自己重算：27 個函式本體去空白兩兩不同、0 重複；T-3② 治具 dupSignatures=0。T-4① --no3d 通過、② --block 由原治具涵蓋、③ --throw 由原治具涵蓋。T-8 reduced 的邏輯我追過：st.rot/shift/scaleBone/move/spin/scale 都在 run.reduced 時早退且**不呼叫 wrapOf**（js/trait-fx.js:231-251），flinch 的位移也被 `if(!run.reduced)` 包住（:333）→ Δ 應為 0，與治具 reducedOK 的判法一致。T-9 版本字串已到 0.33。**我無法確認的兩條**：T-5 的 rAF 中位（沒有 41b7cf1 同機基準，我沒跑 duel-perf）、T-6 的時長（同上，且公式本身有 MEDIUM 那個缺口）。

---

## 我這一輪跑過的東西（可重跑）

    node tests/tools/traitfx-drive.mjs <out> --port=8891                       # 27/27 PASS, dup 0, T-1 空
    node tests/tools/duel-drive.mjs "...?paperwar=1&fxcount=1" <out> --duels=3 --port=8896
    node tests/tools/duel-drive.mjs "...?paperwar=1&fxcount=1&seed=7" <out> --duels=3 --port=8895 --no3d
    node scratchpad/review-overlap.mjs     # 自寫：8v8 滿編 endFrame ＋ 900ms 雙發 ＋ 重疊中 SKIP
    node scratchpad/review-modblock.mjs    # 自寫：系別檔 404／語法錯 → 退 fallback
    node scratchpad/review-bonecheck.mjs   # 自寫：骨名 x GLB joints 機械比對

輸出：scratchpad/review-all27.json、review-duel3.json、review-no3d.json。
我沒有修改 repo 內任何檔案（自寫的三支治具都在 scratchpad）。

---

# 附記：覆審進行中 HEAD 又動了（50fad6d）

我開始審之後 repo 多了一個 commit `50fad6d`（`git diff --stat 1c26b61..HEAD` = index.html 17 行、duel-drive.mjs 6 行；js/trait-fx*.js **一行都沒動**）。它獨立地把我上面兩條 MEDIUM 修掉了：

- **evMs 攤分那條**：`index.html:4037-4040` 已把分母改回 `show.length`（與 v0.32 逐字相同），`:4054` 改成 `if(staged){ await pwSleep(TRAIT_MS); continue; }`，fallback 落回 evMs。commit message 說「同種子實測原版本每場多 100-400ms 超出 T-6」——與我算的 +260ms/拍 同向、同量級，互相印證。→ **這條在 HEAD 已解**。
- **未提交改動那條**：FX_SEED 與 `newGame(SEL.mode,FX_SEED,…)` 已進 commit。→ **這條在 HEAD 已解**（但凍結檔 T-6 是否要補記「逐場比對靠這個種子鉤」還沒補）。

**沒被 50fad6d 碰到、仍然成立的**：HIGH（滿編超時）、MEDIUM（eliteCleave dispose 漏洞）、三條 LOW——這四條全部落在 `js/trait-fx.js` 與 `js/trait-fx/*.js`，那兩檔在 1c26b61..HEAD 完全沒動。

**對我證據的影響**：我的治具全部跑在「1c26b61 ＋ 當時的工作區（＝後來的 50fad6d 內容）」上。差異只在 index.html 的節奏與種子鉤，跟我量的 endFrame／restored／Δ／骨名／dispose 路徑無關，結論不受影響。要重跑請以 HEAD 為準。

**修正後的計數：CRITICAL 0／HIGH 1／MEDIUM 1（另 2 條已於 50fad6d 解決）／LOW 3。**
