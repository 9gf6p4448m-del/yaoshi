# 妖市續接：盯牌縮放與驗收

## 本次要求

三種轉場各一張命中；有應公盲讀；tier 1 短推鏡；P4 滿編真機；玩家照片回報盯牌擠窄。連鎖／幽靈 PVP 等 D2／D3。

## 已落地但未提交／未推送

- `js/table-props.js`：令牌 `Sv` 重新初始化，修陰影縮放污染。測試 `tests/mark-token-scale.test.mjs`。
- `index.html`：低血冠軍轉場要求 `winner.alive`，四家全滅不得播「活到天明」；`tests/highlight-cuts.test.mjs` 先紅後綠。高光印章改不透明背景、放大標題，解底字透入問題。
- 新工具：`tests/tools/highlight-capture.mjs`（自然遊戲路徑），`tests/tools/mark-size-options.mjs`（route-only 尺寸比較）。
- 三種命中已齊：seed114 第5夜誅心、第7夜借刀；seed5276 第9夜低血存活冠軍（北家先前4命、局末13命）。各有命中與自然移除圖，兩場 errors=[]。詳 `docs/experiments/2026-09-15-highlight-evidence/README.md`。命中圖在自然觸發後搜尋原動畫首個全不透明影格並暫停取樣（本輪110ms），原1280ms移除timer不變；這是靜態畫面驗收，不是原動畫時長／淡出驗收。
- 有應公現版重拍、兩位 context-free AI 讀者續驗仍未過：`docs/experiments/2026-09-15-youyinggong-blindread/RESULT.md`。未改模型，不重置先前三輪上限。
- 公開 v0.57.8 三人揭盅補齊同槽三圖：seed3 槽1 虎爺印（收驚婆2／閭山法師5／孝女白琴2）。原CFG.T=650、未跳過、errors=[]。見 `docs/experiments/2026-09-15-public-reveal-evidence/README.md`；勝方飛行上半部碰到頂部HUD／出框，仍列視覺限制。

## 等使用者資料／方向

1. **盯牌尺寸**：已展示 `docs/experiments/2026-09-15-mark-readability-evidence/size-options-sheet.png`。A 現尺寸過大；建議 B 中型；C 小型。原尺寸在縮放 bug 下訂定，正常比例後遮拍品。產品尚保留 A 尺寸。多席同槽也需處理重疊。縮放修復不等於美術完成。
2. **tier 1 推鏡**：既定紀錄是待辦，沒有已裁定的距離／時長。已詢問每拍主角一次（建議）或每次小招。未改鏡頭、未將 tier 1 升 CINEMA；現有 300/900/1400ms 不動。
3. **P4 真機**：已詢問手機型號、瀏覽器、能否這輪開測試頁。桌機 8v8 已量 59.9fps、16/16 可見、errors=[]，詳 `desktop-full-army.json`，不能代替手機或三對 fresh 讀者原 P4。

## 保留未完成項

- 公開三人揭盅的證據已补，飛行模型碰頂的視覺限制尚未修；高光工具用快轉的證據不能與這份混用。
- 有應公 M-A1 未過；不得未經裁定反覆修模型／更改概念標準。
- P4 已知未過與三輪紀錄保留；新滿編手機観察不是修改原 2v2 盲讀材料標準。
- D2／D3 未裁，連鎖與幽靈 PVP 均未開工。

## 工作樹

基底仍為本地 main `48f644c`，前次交接為 ahead 2。未 push。開場已有 dirty handoff docs、未追蹤 AGENTS.md、`.codex-worktrees/` 與 props-*.png；均保留，不混入本輪新修改。

## 驗證

- 最終 `node --test tests/*.test.mjs`：35/35 通過，詳 `docs/experiments/2026-09-15-mark-readability-evidence/tests-final.txt`。
- `git diff --check` 通過，只有 Git LF→CRLF 提示。
- `trace(1..20)` 與 `48f644c` 完全相等，詳 `trace-equivalence.json`。
- 縮放與存活條件的獨立 code review 均 APPROVE；縮放測試覆審指出的假 fixture 已修正。

## 2026-09-15 接受建議後續（覆蓋上文待選狀態）

使用者已選 B 中型盯牌＋每拍主角輕推一次；設備為 iPhone 14 Pro、Safari 加到主畫面。另明確要求產品以未來多人、跨裝置與上架為前提，不能為單一手機寫死安全邊距。

- B 尺寸與同槽排版已完成：同槽2×2、跨槽排距、前排收進桌心，256個座位／槽位組合投影不重疊且避開保守資訊窗。見 `docs/experiments/2026-09-15-mark-b-layout/README.md`。
- Tier1 已完成：每拍第一支短招一次，4.2→4.1→4.2、300ms內收回；closeup=0/reduced不推，skip/end等收回，framingDistance防排陣反向縮小。滿編合成影格另見 `docs/experiments/2026-09-15-tier1-push/README.md`，不替代自然遊玩與真機。
- 通用安全區 `assets/safe-area.css` 讀 `env()`，無UA偵測／固定機型留白；背景滿版。安全空間變矮時側欄可捲，底按鈕維持可見。零inset桌機6容器對照相同。
- 主畫面可由「？」即時切換效能資訊，不reload；只記開關偏好，不上傳資料，診斷區分standalone／分頁。
- 新安全區／FPS檢查25/25通過；原fpsdiag D1/D2/D3過。全測37/37過、trace1..20與48f644c相等、diff check過。
- 本次仍未提交／未部署。P4真機需要公開版更新後由實體iPhone驗證；不得將Chromium手機尺寸或合成安全區當Safari真機通過。
- 保留：有應公M-A1未過、公開揭盅飛行碰頂、D2/D3未裁。

## 下一句

### 持續發布授權（2026-09-15）

v0.57.9 已完成正式發布：origin/main=`4837452`，公開 HTML 與四個變更資產內容一致，Chromium 實載首頁 v0.57.9、3D 就緒且 errors=[]。P4 真機等待玩家試玩回報。下方較早「待推送／待確認」紀錄已被本項覆蓋。

使用者明確指示：「推送，之後直接更新正式推上去讓我試玩就好。」這覆蓋先前「不可自行 push」的限制。本專案後續已完成必要驗證的試玩更新，可直接提交並推送正式站，不必逐次詢問發布；仍須驗證公開版本及資產後才回報送達。此授權不代表修改既定設計門檻，亦不代表未完成的 P4／M-A1 已通過。

2026-09-15 發布準備續接：已提交本機候選 `4837452`（v0.57.9），尚未推送。額外修正 VERSION／RELEASE_VERSION 不一致造成更新提示失效；故障測試先 2/2 紅、修正後綠，全套 39/39 過，獨立覆審無 findings。發布內容與手機操作步驟見 `docs/experiments/2026-09-15-release-0.57.9.md`。遠端 main 仍為 `3a0c8d3`；前次明文禁止自行 push，待使用者確認正式發布後推送並驗證公開版。

`/handoff 妖市：B盯牌、tier1每拍短推與通用安全區已本機驗證；接發布與iPhone14Pro Safari主畫面P4真機，保留M-A1未過，連鎖／幽靈等D2／D3。`
