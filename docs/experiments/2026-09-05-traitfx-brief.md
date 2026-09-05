# 卷 C3 招式編舞派工簡報（2026-09-05）

> 給寫 `js/trait-fx/{zuling,xianghuo,yinqi}.js` 的人。凍結檔 `2026-09-05-acceptance-traitfx-C3.md`；骨骼清單 `2026-09-05-traitfx-bones.md`。

## 使用者裁定（不得改）
- 每套 **900ms** 內講完（`st.ms`），最後一段 tween 要把姿態帶回 0；**27 套全手寫**：每套是自己的編舞，不寫「原語×參數」的模板、不寫共用的 helper 再讓 8 套呼叫同一段（一套內部可以有自己的小函式）。
- **不動鏡頭**（只准 `st.punch(≤0.5)`）；**受招方輕反應**一律用 `st.flinch(figs,{delay,stagger,strength})`。
- 美術方向（使用者裁定，見 memory feedback_yaoshi_art_no_cute）：**不可愛**。祖靈＝古老神獸、山林、儀式；香火＝威嚴神將、廟會、金火；陰氣＝鬼怪、怨、陰冷、抓人。動作要有重量、有醞釀、有收勢，不是 UI 動效。

## 手感規則（emil-design-eng 濃縮）
- 出招用強 ease-out（`'out'`／`'outQuint'`／`'strike'`＝先小幅後拉再衝出）；回位用 `'inout'`；來回一下用 `'pulse'`／`'snap'`（去快回慢）／`'wind'`（醞釀久、急收）。**不要 ease-in 開頭**（顯得遲鈍）。
- 進場慢、退場快：醞釀 200–320ms → 出手 120–200ms → 餘韻／回位到 900ms。多尊同動作用 **30–80ms stagger**，別全體同時。
- mesh 出現不得從 scale 0 長出來：`grow(from≥0.2)`；消失用 `fade`。
- 每套要有**一個讀得懂的主動作**（招名 desc 講什麼就演什麼：護體→罩、先手→搶步、天雷→劈、迷途→繞圈、偷命→吸）＋系色光（`st.color` 已是該系色）。目標側只做輕反應。

## 舞台 API 摘要（完整見 js/trait-fx.js makeStage）
`st.actor/st.target`（figure 陣列，`f.unit.body`／`f.ab`）；`st.byBody(figs,'swarm')`、`st.biggest(figs)`
骨骼：`st.rot(f,'骨名',x,y,z)`（弧度，疊在 clip 上）、`st.shift(f,'骨名',x,y,z)`、`st.scaleBone(f,'骨名',k)`——**每幀在 tween.update 裡設「當下值」**（不是累加）
整尊：`st.move(f,x,y,z)`（group 空間；用 `st.toward(f)` 拿「朝對面」單位向量）、`st.spin(f,x,y,z)`、`st.scale(f,k)`、`st.rim(f,倍率)`
時序：`st.tween({ms,delay,ease,update(t,e),done})`、`st.at(ms,fn)`；`st.reduced` 時位移類自動 no-op
mesh：`st.ring(pos,r,width,{color,opacity})`、`st.disc`、`st.orb(pos,r)`、`st.dome(pos,r)`、`st.bolt(from,to,{jag,segs,seed})`、`st.beam(from,to)`、自訂 `st.spawn(obj,'kind')`（材質用 `st.glow(color,opacity)`／`st.lineMat`，**不要 new 其他材質**：program 只准這兩支）；`st.fly(obj,from,to,{ms,arc,ease,done})`、`st.fade`、`st.grow`
座標：`st.worldOf(f,'骨名'|null)`、`st.top(f)`、`st.foot(f)`、`st.dir`（世界水平、出招方→對面）、`st.tableY`
粒子／鏡頭：`st.burst(pos,{power,n,color})`、`st.punch(power)`；亂數用 `st.rnd()`（決定性），**禁用 Math.random**

## 每套的驗收（治具機械判）
```
node tests/tools/traitfx-drive.mjs <out.json> --only=trA,trB,... --shots=<png目錄> --port=<你的埠>
```
逐套要 `PASS`：handled、alive（骨骼／model 真的動了或有 mesh／burst）、restored（演完 Δ 歸零、mesh 全拆、包裝數 0）、within（≤1800ms）、err=0、prog+0（沒多編 shader）。
另跑一次 `--reduced`（骨骼／model Δ 必須全 0）與 `--throw`（handled=false）。截圖三格（出招後 130／370／600ms）**自己用 Read 看**：主動作在 370ms 那格要讀得出來；三格若長得一樣＝沒演出來，改。
簽章（`sig=`）27 套兩兩不同——你那 8～9 套之間至少「動到的骨骼集合」或「mesh 種類集合」要不同。

## 交付
只改自己那一個系別檔（不碰 trait-fx.js、index.html、其他系別檔）。回報格式：結論先行；逐套一行「trId：主動作一句話、PASS/FAIL、sig」；out.json 與截圖目錄路徑；做不到的直說。
