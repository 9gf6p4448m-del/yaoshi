# v0.57.13 取景鏈去重：描邊外殼不再重複計算骨骼包絡

狀態：產品提交 `bc6359d`（v0.57.13）；公開送達見本檔末段。凍結驗收：[acceptance.md](acceptance.md)（含執行紀錄與 #3 的修正說明）。這是 A1 效能診斷的第一個有證據的單一修補；**A1 相對效能 32 枚 gate 仍 RED**，本卷不宣告 A1 通過。

## 修補內容

`js/table-framing.js`：`posedBounds(mesh, shared)` 多一個「每次取景一份」的 Map。描邊外殼由 `js/creature-figures.js:609-625` 以同 geometry／同 skeleton／同 bindMatrix 掛在本體之下（attached bind 每幀等於本體），其骨骼包絡與本體逐位元組相同；同一次 `subjectCorners` 內第二次遇到同 geometry 且 skeleton 相同、`bindMatrix`／`bindMatrixInverse` 相等的網格就直接重用，不再對每根骨頭再轉一次 Box3。skeleton 不同（獨立骨架）或 bind 不同者照原路徑計算。不改模型尺寸、FOV、時長、HUD 契約、規則或亂數。

## 證據（依驗收條目）

| # | 條件 | 結果 |
|---|---|---|
| 1 | 單元 RED→GREEN | 修補前 `8960aeb`：`4 !== 2`（外殼讓 Box3 轉換翻倍，行為斷言先紅）；修補後綠；負例（獨立骨架、不同姿勢）呼叫數加倍且包絡變寬，前後皆綠。`tests/table-framing.test.mjs` |
| 2 | 全套測試 | 87/87、0 skip（85 既有＋2 新增），[tests-all.txt](tests-all.txt)，在最終程式（含 0.57.13 版本字串）上跑 |
| 3 | 1599 取景矩陣 | 修補前 399＋399＋402＋399＝1599/1599、修補後 1599/1599，failures=[]、pageErrors=[]（`framing-pre-slot*.json`／`framing-post-slot*.json`，`--match=slot0..3` 四塊互斥聯集為全矩陣）。逐案比對見下段「#3 修正」 |
| 4 | 微基準（Node／Three 0.180） | 交錯 5 次：修補前中位 232.92 µs/call、修補後 225.02（−3.4%，4/5 勝）；每幀 Box3 轉換 100→50；10 份結果 hash 全部相同。[bench-ab.json](bench-ab.json) |
| 5 | trace-eq seeds 1–20 | 對 main 的 index.html 相等（346441/346441 bytes），[trace-eq-0.57.13.json](trace-eq-0.57.13.json) |
| 6 | 正式五輪 | 見下表；門檻 0.40 未改 |
| 7 | 瀏覽器 CPU profile（歸因） | 修補後 slot1：frameSubjects 246.1 µs/frame（前輪候選 319.1）、fitSubject 191.6（264.5）、posedBounds 子樹 76.8（133.8）。單一樣本、含 profiler 負擔，只作歸因 |
| 8 | 發布與送達 | 見末段 |

### #3 修正（依 `02 §2.1` 例外，事後回報）

原條件寫「逐案數值逐位元組相等」。實跑發現矩陣工具本身逐次不確定：**同一份修補前程式跑兩次**（`framing-pre-slot0.json` vs `framing-pre2-slot0.json`，後者由未修補的主 checkout 跑）就有 2362 處數值差異，p99 0.0073 px、最大 1（push 幀數），2 處 >0.5 px。修補前 vs 修補後同塊為 1227 處、p99 0.0082 px、最大 1、1 處 >0.5 px，最壞欄位同樣是 bow／shield 的 0.02 px 級終點位置與 push 幀數，看不出系統性偏移。因此 #3 改判為「差異分佈不超過同版重跑」——這個修正不會讓改壞取景的實作通過：真的改了取景，retreat／shift 會反映成像素級、跨案例一致的差異，而不是與同版重跑同量級的 0.01 px 噪聲。逐位元組相等由 #1（deepEqual）與 #4（600 幀真實銅錢＋外殼 hash 相同）在函式層面補上。比對工具 `tests/tools/framing-report-diff.mjs`，輸出 `framing-diff-pre-vs-pre2-slot0.json`、`framing-diff-pre-vs-post-slot0.json`、全矩陣 `framing-diff.json`。

### 正式五輪（同工具、844×390 DPR2、seed 1、初夜、三變體交錯、GPU 獨占）

| 報告 | 最壞 hover renders/s 中位 | 空場中位 | 比值 | paired ≥.40 | calls／tris／pass | 結果 |
|---|---:|---:|---:|---:|---|---|
| perf32-dedupe.json（bc6359d 核心） | 380.4（306.2–392.8） | 1117.9 | .3403 | 0/5 | 94／30281／1 | **RED** |
| perf128-dedupe.json | 437.3（358–440.5） | 1085.0 | .4030 | 3/5 | 79／30061／1 | 中位數 gate 通過（`gate128.pass=true`、exit 0）；09-14 逐輪口徑未過 |
| 前輪 perf32-07124ed | 401.0 | 1115.0 | .3596 | 0/5 | 同 | RED |
| 前輪 perf128-07124ed | 370.6 | 1101.2 | .3365 | 0/5 | 同 | RED |

判讀：
- 32 枚仍 RED，且 .3403 與前輪 .3596 落在同一波動帶（hover 五輪 306–392，首輪 306 是離群值）；本修補省下的約 70 µs/幀 CPU 不足以撼動門檻，不能宣稱改善。
- 128 枚首次過目前可執行的中位數 gate，但 128 模式 `pressureOutlines` 關閉描邊外殼（`js/table-tray.js:469`），去重路徑根本不生效——**這是 session 量測波動，不是本修補的功勞**；逐輪 3/5 也未過 09-14 凍結文字，規格差異照 EXECUTION 既有註記保留。
- 本輪 `table3d=lite` 比值 .3369／.4251 與預設幾乎相同：0.40 門檻卡的是托盤 3D 場景對空場的共同底成本，不在描邊或取景鏈。

## 下一個待驗假設（未實作、未裁）

修補後 profile 每幀仍有 `getParameters` self ≈153 µs 與 `upload`／native `texSubImage2D` ≈114／130 µs，兩者在前輪候選與 eafec13 基準都存在。`getParameters` 只在 `getProgram()` 內被呼叫，若每幀都進 `getProgram`，表示有物件每幀被判定 `needsProgramChange`（fog／envMap／skinning／morph 等屬性比對）；`texSubImage2D` 每幀出現則可能是骨骼貼圖（`skeleton.update()` 後 `boneTexture.needsUpdate`）或其他貼圖每幀重傳。兩者各是一條可單獨驗證的成本來源，先在真實頁面計數（每幀 `getProgram` 次數、`texSubImage2D` 次數與來源貼圖）再決定修法；不得憑 profile 百分比直接動材質管線。

## 工具

- `node tests/tools/framing-bench.mjs [--framing=<另一份 table-framing.js>] [--frames=N] [--rounds=N] [--json]`：真實 yinyangcoin GLB＋13 外殼＋32 印籌固定動畫的 fitSubject 微基準，輸出 µs/call、每幀 Box3 轉換數與結果 hash。`table-framing-pre.js` 為 `23c2e73` 的修補前原檔。
- `node tests/tools/framing-report-diff.mjs --pre=a.json,b.json --post=c.json,d.json`：取景矩陣逐案比對與數值差異分佈。
- 矩陣分塊跑法（前景每塊約 6–7 分鐘）：`node tests/tools/table-framing-check.mjs --all --match=slotN --out=...`，N=0..3。背景整跑會被低記憶體看門狗中止（本機此時 32 GB 僅餘約 1.2 GB，OneDrive 與多個 session 的 MCP 伺服器佔用；未動任何非本 session 的行程）。
- `scratchpad/a1-hover-cpu-profile.mjs` 的 ROOT 以自身檔案路徑計算，經 junction 執行會被 Node 還原到主 checkout；在 worktree 量測要加 `--root=.claude/worktrees/<name> --outdir=.claude/worktrees/<name>/docs/...`（皆相對主 checkout）。

## 公開送達

[published-delivery.json](published-delivery.json)：2026-09-17 04:26 UTC（台灣 12:26）核對，main `a8afe07` 已推送；公開 `index.html`（RELEASE_VERSION 0.57.13）與 `js/table-framing.js?v=0.57.13` 均 HTTP 200，正規化換行後與本機逐位元組一致；GitHub Pages 部署 6495578428 對應 `a8afe07`（04:25:25Z）。這是公開站短驗證，未冒稱真機整局。[開啟試玩](https://9gf6p4448m-del.github.io/yaoshi/?v=0.57.13)。
