# 驗收條件：下一版候選測試補強——關掉只能看的視窗後的托盤距離與「逐件開標中」（2026-11-24，動手前凍結）

**要補的事**（DECISIONS 2026-11-24「v0.66.5 r1 MEDIUM 簽收並上線」：F1／F2 列下一版候選、只改測試，連同 fresh opus 覆審的「托盤沒量距離邊界」一起補）：
- Codex yaoshi-v0.66.5-r1 F1（MEDIUM）：V2b／V2c 只用 3D 幾何挑點，沒確認關窗後 `#tray` 真的收到第二下；667×375 那格關掉後最上層是 `button.sys-zuling`，綠燈沒有證明力（v0.66.5 驗收檔「動手後發現」第 2 點）。
- Codex F2（MEDIUM）：「逐件開標中」視窗只有 V7 數標記，沒有任何測試走過它的關窗。
- fresh opus 覆審（MEDIUM）：托盤這條路沒量距離邊界——V2／V2b／V2c 的第二下都點在同一點，V3 用 `?tray3d=0` 只量點擊那一層；一份只擋「完全同一點」的 `trayTap` 抓不到。

**範圍**：只新增 `tests/view-gate-edges.test.mjs`。產品（`index.html`、`js/`、`assets/`）一行不動；凍結測試 `tests/ux-0665.test.mjs` 一行不動。不單獨出版、不推 main，併下一版照 14 §3 送 Codex（`tests/` 是規則面）。
**GPT：略過**（純技術：測試）。

## 量測（新測試的寫法，凍結）
實頁、觸控模擬、`launchGpu`（走顯示卡）、`YAOSHI_RENDER_ROOT` 換產品樹、埠 `YAOSHI_VGE_PORT`（預設 9782，與現有測試都不同）。量測掛鉤與 `ux-0665` 相同：window capture 記每一下點擊（含被吞的）、document bubble 記沒被吞的、動作函式包一層記呼叫。每一格都先驗量測前提，前提不成立一律寫「量測沒成立」，和行為斷言分開。

- **W1（Codex F1；兩個尺寸、盯上頁、3D 托盤）**：沒有視窗時掃出「最上層是 `#tray`、3D 命中托盤格」的點集 A；打開別人的袋子，掃出落在背景（`#modal` 本身、框外 4px）的點；挑 P1（背景）、P2（∈A）距離 30–90px、最接近 60 的一組。點 P1 關掉袋子，120ms 後點 P2。
  - 前提：P1 那一下關掉了視窗；兩下按下時刻相隔 <500ms；事後量 P2 最上層是 `#tray`。
  - 行為：第二下之後沒有 `pickMark`／`openSheet`、沒有盯上。
  - 活性：守衛過期後（700ms）再點 P2 一次，要呼叫 `pickMark(<P2 的格>)`——證明這一點托盤真的收得到，危險在場。
- **W1c（Codex F1；兩個尺寸、出價頁）**：同 W1。行為：沒有 `openSheet`、出價視窗沒開；活性：過期後再點 P2 要呼叫 `openSheet(<格>)`。
- **W2（覆審 MEDIUM；兩個尺寸、盯上頁、3D 托盤）**：按關閉鈕關掉別人的袋子（落點＝關閉鈕中心 cp），150ms 後點 P2∈A，P2 到 cp 的距離落在四個帶：50–70、80–95px（半徑內）與 105–125、150–175px（半徑外），每帶取最接近帶中點（60、88、115、162）的一點。每個帶各開一頁。
  - 前提同 W1（關掉了、<500ms、P2 最上層是 `#tray`）。
  - 行為：半徑內兩個帶不得 `pickMark`；半徑外兩個帶要呼叫 `pickMark(<P2 的格>)`。
  - 活性（半徑內）：過期後再點 P2 要呼叫 `pickMark`。
- **W3（Codex F2；兩個尺寸、`?tray3d=0`、「逐件開標中」）**：推到出價頁、按主鈕開標，等到 `REVEAL_ANIMATING` 為真且主鈕停在「開標 ▸」（蓋牌開標後第一個停點，開標前公告；可按時才算停住）。每一格：點座位 1 → 要打開「逐件開標中」（前提）；按視窗裡的「關閉」（照文字找，不照 onclick 找）→ **視窗要關掉（行為）**；150ms 後點第二下：
  - ① 同一點（關閉點）→ 吞　② 關閉點正上方 60px → 吞　③ 座位 2（離關閉點 ≥175px）→ 放行
  - 活性（①②）：守衛過期後（700ms）再點同一點，要冒泡——證明「沒冒泡」是守衛擋的，不是那個元素本來就不冒泡。
  - 「吞」＝沒冒泡到 document；「放行」＝冒泡，點座位 2 的那格另要呼叫 `showBag(2)`。
  - 每一格開始前 `REVEAL_ANIMATING` 要還是真（前提）。

## 凍結前基準
（桌機、過閘門；產品＝`4a1d1f17` 的 `index.html`，與線上 v0.66.5 部署 commit `858e85cd` 相同；紀錄在 `tmp/vge/`，不進 git）

**可行性**（`tmp/vge/geom.mjs` → `geom2.log`，不設及格線；第一次 `geom.log` 等錯了主鈕字樣——蓋牌開標後第一個停點是「開標 ▸」不是「下一件拍品 ▸」——844 的開標段逾時、667 沒跑到，修等待條件後重跑）：
| 尺寸 | 沒有視窗時最上層是 `#tray` 且命中托盤格的點（4px 格） | 背景→托盤 30–90px 配對 | 關閉點 | 關閉點→托盤 50–70／80–95／105–125／150–175px 的點數 | 逐件開標中 |
|---|---|---|---|---|---|
| 844×390 | 3758（格 0–3） | 1,332,185（最接近 60：背景 (280,32)→托盤 (284,92) 1 號格） | (422,247) | 202／235／373／627 | 「開標 ▸」停住時 `REVEAL_ANIMATING` 真；座位 1 打開「逐件開標中」；關閉點 (422,221)，關掉後底下 `bidfly`、正上方 60px `bidfly`；座位 2 (63,93) 距離 381px |
| 667×375 | 2557（格 1–3） | 670,661（背景 (196,32)→托盤 (200,92) 1 號格） | (334,240) | 202／231／361／443 | 同上；關閉點 (334,214) 底下 `bidfly`、上 60px `big`；座位 2 距離 297px |
盯上頁與出價頁的托盤幾何相同。`?tray3d=0` 下逐件開標中的落點與 3D 開著時逐格相同、停點較快（2.3 秒 vs 8.3 秒）。pageerror 0。

**凍結測試 `tests/ux-0665.test.mjs` 對改壞版本**（`tmp/vge/base.sh` → `base-summary.txt`；K1 那件第一次閘門等滿 60 分鐘沒放行，`base-k1.sh` 補跑）：
| 改壞版本 | 凍結測試 | 紅在哪 |
|---|---|---|
| K1 托盤只擋完全同一點 | **全綠** | —（V2／V2b／V2c 的第二下都點在同一點，正好被「同一點」擋下） |
| K2 托盤沒有附近判斷 | 紅（部分） | V2 兩個尺寸（`pickMark(1)`）、V2b 844×390（盯上 3 號格）、V2c（打開出價視窗）；**V2b 667×375 綠**＝Codex F1 說的那格 |
| K3 托盤不看距離 | **全綠** | — |
| K4 逐件開標中走整層 | **全綠** | — |
| K5 逐件開標中關閉鈕不關窗 | **全綠** | — |

## 條件（全部要過）
1. **新測試在現行產品上綠**：本分支（產品＝`858e85cd` 的 `index.html`）跑 `tests/view-gate-edges.test.mjs` 連 3 次全綠。
2. **鑑別力**（新測試寫好後做，各 1 次，都要紅在行為斷言，不是逾時或「量測沒成立」）：
   - K1 托盤只擋完全同一點 → W1、W1c 兩個尺寸、W2 半徑內兩帶兩個尺寸紅
   - K2 托盤沒有附近判斷 → W1、W1c 兩個尺寸、W2 半徑內兩帶兩個尺寸紅
   - K3 托盤不看距離（500ms 內一律不收）→ W2 半徑外兩帶兩個尺寸紅
   - K4 「逐件開標中」標記照留、關掉走整層守衛 → W3 放行那格兩個尺寸紅
   - K5 「逐件開標中」的關閉鈕不關窗 → W3 兩個尺寸紅在「視窗要關掉」
   （改壞版本由 `tmp/vge/mkmut.py` 產生，錨點各剛好一處；與本檔同時存在 `tmp/`，不進 git——產生方式照抄在下方附錄。）
3. **產品與凍結測試沒動**：`git diff --stat 4a1d1f17..HEAD -- index.html js assets tests/ux-0665.test.mjs` 為空。
4. **掃描測試**：`tests/browser-launch-scan.test.mjs` 綠（新檔用 `launchGpu`）。
5. **冷讀**：沒有對話史的 fresh opus 讀 diff 與本檔，反駁「新測試補上了 F1、F2、托盤距離邊界三個盲點，沒有放寬任何既有測試」；CRITICAL／HIGH 為 0，或修完後三態複審（最多 3 輪）。
6. **Codex**：不在本分支做，併下一版照 14 §3 送審。全套也併下一版跑。

## 附錄：改壞版本（`tmp/vge/mkmut.py`，對 `index.html` 做單處替換）
```python
TRAY = '  if(viewGateHeld(now,ev.clientX,ev.clientY)) return;   /* v0.66.5：剛關掉只能看的視窗、這一下落在關閉點附近（連按關閉的第二下）→ 不收 */\n'
# K1 托盤只擋「完全同一點」（覆審 MEDIUM 說的那份實作）
make('k1-exact', (TRAY, '  if(VIEW_GATE&&now-VIEW_GATE.at<MAIN_GUARD_MS&&Math.hypot(ev.clientX-VIEW_GATE.x,ev.clientY-VIEW_GATE.y)<1) return;\n'))
# K2 托盤沒有附近判斷
make('k2-notray', (TRAY, ''))
# K3 托盤不看距離（半徑無限大）：關掉只能看的視窗後 500ms 內托盤一律不收
make('k3-trayfar', (TRAY, '  if(VIEW_GATE&&now-VIEW_GATE.at<MAIN_GUARD_MS) return;\n'))
# K4 「逐件開標中」標記照留，但關掉它走整層守衛（Codex F2 的情境）
make('k4-revealglobal', ('function viewOnlyModalOpen(){\n  if(!modalShown()) return false;\n',
                         'function viewOnlyModalOpen(){\n  if(!modalShown()) return false;\n  if(REVEAL_ANIMATING) return false;\n'))
# K5 「逐件開標中」的關閉鈕接成不關窗（Codex F2 的情境）
make('k5-revealnoclose', ('<h2 data-viewonly>逐件開標中</h2><p>本夜拍品揭完後即可查看袋子。</p><button class="bigbtn" style="width:100%" onclick="closeModal()">',
                          '<h2 data-viewonly>逐件開標中</h2><p>本夜拍品揭完後即可查看袋子。</p><button class="bigbtn" style="width:100%" onclick="void 0">'))
```
