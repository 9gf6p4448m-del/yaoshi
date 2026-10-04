# v0.60.0 得標「手抓回」＋詛咒「推過去按住＋紙錢繩」實作卷報告

分支 `feat/v0600-grab`（基於 155a7e7f，未 push）。凍結驗收：[acceptance.md](acceptance.md)。基準 worktree：`C:/Users/shung/wt/yaoshi/grab-base`（`git worktree add --detach … 155a7e7f`）。
最終證據跑在 HEAD `ad725089`＋治具判定修正（掙扎判定，見 #2）上，log 全在 [evidence/](evidence/)，進度與時間戳在 `evidence/progress.log`。

## 結論：13 條裡 11 過、#9 紅、#13 只完成版本字串（送達不在本卷）

| # | 結果 | 證據（指令 → 實際輸出） | 基準 155a7e7f |
|---|---|---|---|
| 1 | 過 | `node tests/tools/grab-trace-check.mjs <base>/index.html --mutate` → equalOn/equalOff true、Math.random 基準／開／關 0/0/0、突變（ROUNDS−1）抓得到差異（`c1-trace.log`） | ＝參照 |
| 2 | 過 | `grab-probe --modes=award`：四席＋兩件更遠越線 6/6 落定 1267ms（從 reveal-result 那一幀起算，GRAB_MS 1260＋取樣量化）、掙扎交替峰 5–7、振幅 0.020–0.022（`c2-struggle-rejudge.log`） | 紅 6/6（落定 867 但掙扎峰 0） |
| 3 | 過 | `grab-probe --modes=hud`：V1–V5 × 8 情境 40/40，抓取幀法寶可見包圍框與 #north／#feltHead／#south／安全區重疊 0px（`c3-hud-head.log`） | 紅 0/40——**但只因落地那一幀法寶已隱藏＝量不到判紅**，可見幀裡舊拋物線並沒有真的壓到 HUD；鑑別力另用突變證明：關掉取景的突變樹 6/6 紅、每幀都疊 #north／#feltHead（`c3-mutant-noframe.log`） |
| 4 | 過 | 抓取類的手（得標席、詛咒施放者與受害者）穿入非被抓拍品外接盒 0 點、最低點 ≥ 桌面 0.152（8/8，`c2348-head.log`；V1–V5 也 40/40） | 東席兩例紅（19408／19071 點） |
| 5 | 過 | 越中線：西／東抓取手在 x 越線且不在被抓那件水平外框內的點，全都高於拍品頂（0 點違規，8/8）；擺錢逐幀相等：`grab-legacy-eq.mjs` 四格×出價／盯上／開標 2080 幀 sha256 新舊相同、活性含 push/slam/rake/hold；突變 RAKE.DELAY 0.22→0.23 雜湊即變（`c5-legacy-eq.log`）；`hands-queue-timing` 新舊 JSON 逐位元相同（`hqt-*.json`） | ＝參照 |
| 6 | 過 | `grab-probe --modes=skip` 30/30（四席 × 6 個時刻＋兩組詛咒 × 推／按住／收手）：下一幀法寶在終點、四手全不可見；真 UI `table-framing-skip-check` 改寫後 pass：0 幀飛行、0 幀手可見、卡後鏡頭還原（`c6-*-head.log`） | 紅（0/30；真 UI 飛 43 幀、手 53 幀） |
| 7 | 過 | 事件治具 8/8：卡片 1350ms ≥ 落定 1267ms、搬運中掌心在掏空窗內；真實流程 `grab-realflow.mjs`（不跳過、真時序）2/2 件：落定 1236／1252ms、卡片 1351／1352ms、搬運幀 100% 在取景中（`c7-realflow-head.log`） | 紅（量不到落定；`?grab=0` 卡片回到 912ms＝舊等待） |
| 8 | 過 | 北塞南、西塞東：推的手＝毒標得標席、落定 983ms、被按住階段受害者手抖（交替峰 17／14、振幅 0.008–0.009）、繩只在按住階段出現（20 幀、階段外 0 幀）、844 寬繩粗 7.7／4.0px、繩幾何 uuid 全程 1 個；程式掃描：`new THREE.TubeGeometry` 全檔 1 處、在 ropeMesh 的已建守衛之後（`tests/grab-motion.test.mjs`） | 紅 2/2 |
| 9 | **紅** | 三輪 fresh agent 盲讀：r1 0/4·0/2、r2 3/4·1/2、r3 1/4·0/2，見 [blindread/README.md](blindread/README.md) | — |
| 10 | 過 | `grab-probe --modes=perf --rounds=5`（headless，tray+hands update，動作中每幀）：p95 中位數 新 4.40ms／舊 5.40ms＝0.815（門檻 1.25）。**iPhone 未驗** | ＝參照 |
| 11 | 過 | `grab-probe --modes=pixel` 222 幀：`?grab=0` 對基準 0 幀 0 像素相異；`?grab=1` 對基準 216 幀相異（`c11-diff-*.log`） | ＝參照 |
| 12 | 過（待簽一處） | `node --test tests/*.test.mjs` → 470/470（`c12-suite.log`）。列名改寫：reveal-table.test.mjs:25（對基準紅：「抓取終態：法寶停在終點並隱藏」，`c12-reveal-table-on-base.log`）、table-framing-skip-check（對基準紅，見 #6）。**列名外改了一處**：`tests/ui-hierarchy.test.mjs` 的發布版本釘 0.59.12→0.60.0（每次發布都跟著改的那一行，#13 逼出來的），請使用者簽 | — |
| 13 | 部分 | VERSION／RELEASE_VERSION＝0.60.0，theme.css／safe-area.css 的 ?v= 同步；推 main 與送達查核依指示不做 | — |

## 判定器口徑（凍結條文沒寫死的地方，我怎麼量）
- 包圍框（#3）：法寶看得見的每個頂點（蒙皮件套這一幀骨架）投影後的外框。原本用 Box3 世界外接盒投影，角點會投到比實物大一圈，靜止時就疊到 HUD——改成逐頂點後才是「法寶在畫面上的框」。共用骨架的 boneMatrices 要先刷新，否則讀到舊姿勢。
- 掙扎（#2）：法寶相對「席位→原位」直線的側向位移，扣掉頭尾連線後的正負交替峰（≥2、>0.002）。第一版拿掌心骨當參考，舊版會因為停一拍的手收走而假綠，已換掉並重判（同一批原始幀）。
- 越中線（#5）：只看西／東席的抓取手；落在被抓那件水平外框內的點（手指扣住那件本身）豁免，其餘越線點都要高於那件的頂。
- #4 只判抓取類的手；敗方扒回（rake）屬 #5 凍結為與基準逐幀相等的舊動作，它在 Wfar 情境穿入槽 2 的 147 點新舊相同，另列 legacyInOther。
- #11 兩邊都把環境香煙／火星藏起來再比：它們的 Math.random 消耗會隨 GLB 載入先後漂（基準自己跑兩次也不同），與抓取無關；桌面、拍品、錢、令牌、手、繩照常比。

## 已知問題與範圍外（只記錄）
- #9 讀不出來：寫實手在牌桌鏡頭下小、膚色近紙紮人偶；鏡頭貼近時抓起看不出位移、退遠時手更小；詛咒的「推過去→受害者拖回」被讀成「拿走」。要過大概得動鏡頭重設計或手的尺寸，都在本卷範圍外。
- 西／東施放者把符紙堆推過中線時，為守「越中線只從上方」整隻手連堆抬高約 0.15。
- 抓取演出期間取景會退到看得見整段路徑（外包盒）；這改了抓取那 1.8 秒的鏡頭距離。
- 修訂記錄（使用者對 #12 清單與上線方式的簽核）要寫進 acceptance.md 的那一行，我被權限擋下（凍結檔不能由子代理依主對話轉述改），請主對話處理。

## 檔案
- 產品：js/grab-motion.js（新）、js/hand-motion.js、js/table-hands.js、js/table-tray.js、js/renderer.js、index.html
- 測試／治具：tests/grab-motion.test.mjs、tests/tools/grab-probe.mjs、grab-trace-check.mjs、grab-legacy-eq.mjs、grab-realflow.mjs、grab-pixel-diff.py、grab-strip.py；改寫 tests/reveal-table.test.mjs、tests/tools/table-framing-skip-check.mjs、tests/ui-hierarchy.test.mjs
- 給使用者看：evidence/strips/head-*.jpg（新版連拍，每格 100ms）對照 evidence/strips/base-*.jpg；blindread/r2/clip-*.png
