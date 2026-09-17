# A1 取景鏈去重修補：凍結驗收（2026-09-17）

建立時 worktree 基準：`23c2e73`（與 main 相同程式）。修補範圍：`js/table-framing.js` 內 `subjectCorners`／`posedBounds` 同一幀對共用 geometry／skeleton／bindMatrix 的蒙皮網格（本體與描邊外殼）只計算一次骨骼包絡。不改模型尺寸、FOV、演出時長、HUD 契約、任何規則或亂數；不改門檻。

證據來源：`docs/experiments/2026-09-15-a1-performance-followup/candidate-hover-slot1.cpuprofile` 重析（`fitSubject` 264.5 µs/frame，其中 `posedBounds` 子樹 133.8 µs；hover 時 13 顆本體＋13 顆可見外殼各算一次，外殼由 `js/creature-figures.js:621-625` 以同 geometry／skeleton／bindMatrix 掛在本體之下，結果必然相同）。

一經訂定不得為了通過縮案例、降門檻或改口徑；要改依 `02 §2.1`。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 新增單元測試：共用 geometry／skeleton／bind 的子外殼在一次 `projectSubject` 內，`Box3.prototype.applyMatrix4` 呼叫數＝受影響骨數（不是 2 倍），且外殼角點與只投影本體時逐位元組相等；負例：獨立骨架、不同姿勢的第二顆網格仍各自計算（呼叫數加倍、包絡不同）。修補前必須紅、修補後綠。 | 沒去重（紅）、去重過寬把不同骨架也共用（負例紅） |
| 2 | `node --test tests/*.test.mjs` 全綠，數量＝既有 85 ＋ 本卷新增，0 skip。 | 任一既有契約被改壞 |
| 3 | `tests/tools/table-framing-check.mjs --all` 修補前（本 worktree 未改程式時）與修補後各跑一次：案例數相同、全部 pass、failures=[]、pageErrors=[]；逐案 bounds／retreat／shift／終點幾何數值逐位元組相等（比對腳本差異數＝0）。 | 去重改變任何取景數值 |
| 4 | `node tests/tools/framing-bench.mjs`（真實 yinyangcoin GLB＋13 外殼＋32 印籌、固定動畫、600 幀×5 輪）：修補後 `fitSubject` µs/call 中位數低於修補前，結果 hash 與修補前相等，每幀 Box3 轉換次數減半。 | 結果 hash 不同、或沒有變快 |
| 5 | `tests/tools/trace-eq.mjs` 對 main 的 `index.html` seeds 1–20 逐位元組相等（本卷不改引擎；版本字串若更動仍須相等）。 | 任何引擎差異 |
| 6 | 正式五輪 `scene-shot --perf --runs=5` 32 枚與 128 枚，原工具、原口徑（844×390 DPR2、seed 1、獨占 GPU browser），記錄 `ratio.defaultOnHover` 與 paired；門檻 0.40 不變，未達照記 RED，不以基準亦 RED 改判。 | 改工具、改口徑、挑輪次 |
| 7 | `scratchpad/a1-hover-cpu-profile.mjs` 對修補後版本重採一份 slot1 profile：`posedBounds` inclusive µs/frame 低於 133.8；只作歸因，不作放行。 | 沒下降＝修補未命中成本來源 |
| 8 | 發布（持續授權）：1–5 全綠、6 已記錄（允許 RED）、7 已記錄後，以 0.57.13 發布並核對公開 HTML／`js/table-framing.js` 與本機一致；RED 狀態在交接明示。 | 未核對送達就稱已更新 |
