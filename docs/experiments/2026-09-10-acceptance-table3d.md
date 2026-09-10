# 驗收凍結：拍賣桌整片掏空 v0.55a／0.55b（ROADMAP_V2 Top 1，2026-09-10）

> 使用者 2026-09-10 裁 **D1 乙整片掏空**；計畫 `docs/proposals/2026-09-10-plan-table3d.md`（唯讀 opus 產出，主對話親讀 §5／§6 Q4／§7）。同日使用者對 §7 九題逐題裁定（**Q4 單獨簽准**）：
> - **Q1 甲**：只掏空出價頁與盯上頁；開標／請神／異事／夜末／局末／教學維持玻璃面板。
> - **Q2 甲＋丙**（0.55b）：`sceneKind()` 黑名單拿掉 `'sheet'` 一個字串；出價視窗改右側抽屜、不蓋桌心、不加全螢幕遮罩。
> - **Q3 丙**：托盤模型掛描邊；另給 `?table3d=lite` 降級（不掛描邊）；預設值由使用者實機三張截圖決定，實機甲不過而 lite 過 ⇒ lite 翻成預設（收緊視覺，自行記錄）。
> - **Q4 甲（使用者單獨簽准，2026-09-10）**：fps 閘門的 ≥0.90 **量在 iPhone 實機 capped fps**（同機同頁三張 `?fps=1` 截圖，分母＝`?table3d=0` 的 55–58）；桌機 deterministic 硬門檻（每幀 calls／tris／passes）＋桌機 uncapped 比值地板 0.40／0.60 為記錄項。**桌機 capped fps 不得當通過依據**（有無托盤皆 59.9）。代價：沒有實機截圖，0.55b 不得宣告完成。
> - **Q5 甲** 側欄 168px；**Q6 甲** 直式維持 v0.53 版面；**Q7 甲** 木紋／香灰用頂點色＋幾何（ART_BIBLE 不動）；**Q8 甲** 0.55a 版面卷／0.55b 上桌卷分別合併上線；**Q9 甲** 血印令 3D 拍桌另開 0.55c。
> 使用者動機原話：「想做遊戲大作、不想做出垃圾遊戲、野心大一點、看 Fable 5.1 極限」——模糊處往「更有大作感」取捨。本檔訂下後即凍結（`02 §2.1`）。

## 範圍
依計畫檔 §1 檔案清單、§2 介面（DOM id／CSS 值／函式簽名／URL 旗標／治具 CLI 已寫死，實作不得自行改名）、§3 不做什麼。0.55a＝掏空＋版面重排＋觸控／治具重寫（桌面先平面）；0.55b＝托盤、Raycaster、木紋香灰、右側抽屜。

> 訂下即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」＋使用者針對那一條的明確同意一條路。
> 基準＝`main` `7c19e98`（v0.53 規則碼，同 `4b7dadd`；量測數字取自計畫檔 §6 Q4）。**沒帶基準的一律不算通過。**

### 0.55a（版面卷）

**T0 引擎逐位元組相等（兩卷都適用）**
`trace-eq.mjs <基準> index.html` 對 seeds 1..20 `equal:true`；同一支腳本 `--mutate` 必須 `differs:true`。
*什麼實作會讓它假綠*：把 `trace()` 的輸出欄位砍掉幾個再比；只比 seed 1；跳過 `--mutate` 那半邊（相等性斷言本身沒有證明力，`02 §6.1` 第 1 條）。

**T1 kill switch 雙向**
`?table3d=0` 下，`#table` 的 `grid-template-columns` computed 值＝`120px … 120px`、`#felt` 的 `classList` 不含 `hollow`、`#tray` 的 `display` 為 `none`、`#railW`/`#railE` 的 `childElementCount` 為 0，且 `#market` 內有 4 張 `.mcard`；預設（不帶旗標）四項全反。
*假綠*：只驗「有沒有這個旗標被讀到」（讀到不等於生效）；只驗開不驗關（單向＝反向探針，`02 §6.1` 第 1 條）。

**T2 `#felt` 直向溢出恆 0（比基準加嚴）**
`felt-probe --seeds=1,3 --rounds=3 --sel=#felt`：12 格**全部**為 0。基準 v0.53 是 11 格 0＋1 格 54（seed 1 第 3 夜出價頁，實測見 §6 Q4）。
*假綠*：把 `#feltHead`／`.preview` 改成 `position:absolute` 讓它不計入 `scrollHeight`——那是把高度藏起來不是搬走。**配套斷言**：`#felt` 的 `scrollHeight` 必須 ≤ 260（掏空後只剩浮字條；若有人把整個 `#stage` 塞回去，`scrollHeight` 會超過而 `over` 仍是 0，因為它會撐開⋯所以兩個一起量）。

**T3 側欄與北列不溢出**
同一次 `felt-probe --sel=#west,#east,#north`：三個容器 12 格全部 `scrollHeight − clientHeight ＝ 0`。
*假綠*：對 `.rail` 加 `overflow:hidden` 把第二張卡切掉一半——**配套人眼**：T9 的 contact sheet 上，四張卡的名稱、戰力、系別 chip、招式行**四樣都完整可見**（不得 ellipsis 到看不出招式名）。

**T4 橫向溢出 0**
`legend-drive --all --seeds=1..6`：`#table`／`#north`／`#shrines`／`.incboard`／`.shcards`／`#felt`／`#stage`／`#south`／`#railW`／`#railE`／`.incbar`／`.preview` 每一個的 `scrollWidth − clientWidth ＝ 0`；`0 console error／pageerror／requestfailed`。
*假綠*：把新加的兩條 rail 從選擇器清單裡漏掉（清單在 `legend-drive.mjs:61`，改了要一起加）。

**T5 觸控命中回歸（逐一 tap，不是數數量）**
`legend-drive --taps`：在第 1～3 夜的出價頁與盯上頁，對**每一個** `#table [onclick]` 元素各 `page.tap()` 一次，記錄「這一 tap 有沒有讓對應的處理函式被呼叫」（在頁面端包一層計數 proxy）。基準 v0.53 同治具跑一次得到分母（實測 25 個，見 §6 Q2），新版必須**同一份清單全部命中**，且新增的 `#tray` 不得吃掉任何一個原本可點元素的事件（tap 在 `.mcard`／`#skipbtn`／`#helpBtn`／`#south` 任何鈕上時，`trayTap` 的呼叫次數必須為 0）。
*假綠*：只數 `document.querySelectorAll('[onclick]').length` 相等——元素還在不代表點得到（`#tray` 蓋在上面就會全滅）。這一條的鑑別力檢查：把 `#tray` 的 `top:26px` 故意改成 `top:0`（蓋住 `#feltHead`）與 `z-index:9`（蓋住 helpBtn），必須紅。

**T6 直式蓋板行為不變**
390×844 下：`#rotateHint` 的 computed `display` ＝ `flex`；`#table` 的 `grid-template-columns` ＝ `120px … 120px`；`.rail` 的 `display` ＝ `none`；`#table` 橫向溢出 0。對基準逐項相同。
*假綠*：只截圖看「有沒有蓋住」——蓋板底下版面爆掉仍然看不出來，所以要量 computed 值。

### 0.55b（上桌卷）

**T7 托盤內容＝今夜市集，且槽位落在掏空窗內**
`?tray3d=1` 下，第 1～3 夜各驗一次：`__yaoshi3d.tray` 的槽位數＝4；每個非詛咒槽掛著的 GLB URL ＝ `assets/creatures/<it.ab||it.m>.glb`（★對照 `S.market` 逐槽比對，不是比對數量★）；詛咒槽掛占位物不掛 GLB；`tray.slotScreen(i)` 的 4 個點**全部**落在 `#tray` 的 `getBoundingClientRect()` 之內（含 20px 內縮邊界）。
*假綠*：用 `it.ab` 當唯一鍵——POOL 27 件裡有 4 件沒有 `ab` 只有 `m`（§6 Q3），只驗 `ab` 的話那 4 件會靜默變成空槽而測試照樣綠；只驗「槽位數＝4」不驗內容。

**T8 Raycaster 命中率與相位分派**
Playwright 對 4 個槽位的 `slotScreen(i)` 各 tap 20 次（共 80 次）：出價頁 `openSheet` 被呼叫 80 次且 `i` 全對；盯上頁 `pickMark` 被呼叫 80 次且 `i` 全對；`openSheet` 在盯上頁的呼叫次數＝0（反之亦然）。另對 `#tray` 的四個角落（模型之外的空白）各 tap 10 次：`hitTest` 回 −1、`openSheet`／`pickMark` 呼叫次數＝0。
*假綠*：只驗「有沒有被呼叫」不驗 `i`（四槽全部誤判成槽 0 也會綠）；不驗空白區（把整片 `#tray` 當成槽 0 也會綠）。

**T9 效能硬門檻（deterministic，桌機端主閘門）**
`scene-shot --gate --perf --runs=5`，844×390 dpr=2、第 1 夜出價頁、uncapped。**全部換算成每幀值**（`info.reset()` 之後等兩次 rAF ⇒ 讀到的是兩幀的和，除以 2）：
- 預設（描邊開）：`calls` ≤ **135**、`triangles` ≤ **33000**、render passes/frame ＝ **1**
- `?table3d=lite`：`calls` ≤ **85**、`triangles` ≤ **19000**、passes/frame ＝ **1**
- `?table3d=0`：`calls` ＝ **14**、`triangles` ＝ **855**（＝ v0.53 基準；**桌機與 iPhone 實機逐值相同**，見 §6 Q4）
*基準值來源*：本檔 §6 Q4 的實測（每幀 14／855；4 尊 GLB 描邊開 133／31906、描邊關 82／18248）＋ `docs/experiments/2026-09-10-iphone-fps/README.md`。
*假綠*：量到 bloom 合成那一趟的 1 個 call（`info.autoReset` 預設只留最後一趟——必須 `autoReset=false; reset();` 再等兩次 rAF 才讀，`duel-perf.mjs:99-103` 是現成寫法）；**忘了除以 2**（會讓門檻鬆一倍）；在 `?tray3d=0` 下量預設值；把模型 `visible=false` 之後才量（實測踩過：`makeCreatureFigure` 的 `group.visible` 預設 **false**，`creature-figures.js:567`，忘了打開會量到 delta＝0 的假綠）。

**T10 fps：iPhone 是判定，桌機是早期警報**
- **（判定）iPhone 實機**，同一支機（iOS 18.7 Safari，852×339 dpr 3，非 standalone）、同一個時點（盯上頁）、`?fps=1`：`?table3d=0` 量到的 fps 當分母（09-10 已回填＝**55–58**），預設版的 fps ≥ 分母 × **0.90**（⇒ ≥50）。三張規則頁截圖為證。
  *為什麼這裡的 capped fps 有鑑別力*：iPhone 的牌桌基準是 55–58，**本來就沒有貼在 60 上**，托盤壓下去會直接反映在這個數字上。
- **（記錄項）桌機 uncapped 比值**：`renders/s ÷ passes-per-frame`，`?table3d=0` 與預設**同一頁交錯**各量 5 次取中位，地板 ≥ **0.40**（描邊開）／≥ **0.60**（lite），5 次全距一併印出。實測 0.437／0.666。這一條**只擋災難**，不當通過依據。
*假綠（最重要的一條）*：**拿桌機的 capped `rafMedianFps` 宣告通過**——本檔實測它在「有托盤」與「沒托盤」下**都是 59.9**（撞 vsync），零鑑別力。任何以桌機 capped fps 當通過依據的回報一律退回。
*噪音處置*：桌機同一組設定跨 run 的基準實測落在 653.8～864.6 renders/s（±30%），所以只認同頁交錯、5 次中位（`02 §6.2`：先歸因再處置——這裡歸到量測環境，處置是交錯＋中位，不是加 retry 或拉長 timeout）。

**T11 對決沒被拖累**
`duel-perf perf --uncap`：`drawCallsPerFrame` ≤ 970（基準 965）、`rafMedianFps` ≥ 102（基準 113.6 ×0.9）、`renderPassesPerFrame` ＝ 10（＝基準，證明沒動 bloom）、`renderer.info.programs.length` 在對決前後不變。
*假綠*：只跑一場（第 1 場的 shader 還沒編完，數字偏低反而「更好看」）——沿用 `duel-perf` 既有的「量第 2 場」規則。

**T12 人眼（844×390 contact sheet）**
六張圖交使用者：第 1 夜出價頁、第 2 夜盯上頁、請神夜前一夜出價頁、袋子面板、側欄卡片特寫、直式蓋板。逐項看：① 中央看得到木紋、香灰、紅布托盤與 4 尊拍品 ② 四張側欄卡的四樣資訊完整 ③ `#vignette`（`:40`，外圈 `rgba(0,0,0,.62)`）沒有把托盤壓成一團黑 ④ 掏空頁與非掏空頁（開標揭盅那一張）切換時沒有閃白或版面跳動。
*假綠*：只交「好看的那一張」——六張缺一即未過（`03 R2` 第 1 項：逐條有證據）。

---

## §2.1 修訂紀錄
（無）
