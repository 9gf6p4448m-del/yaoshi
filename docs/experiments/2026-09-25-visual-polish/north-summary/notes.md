# 北列一行摘要收尾筆記（v0.58.3，凍結修訂 2026-09-26 兩則）

分支 `fix/visual-polish`，接手 HEAD `dcdaf55` 未提交的一半成果並完成收尾。凍結檔 `../../2026-09-25-acceptance-visual-polish.md`（v1.0＋2 則修訂，**未改**）。摘要文案採 A 案（直接寫重點內容），沿用既有字串，未新寫文案。

## 結論

**全過**。(a)–(d) 與四項硬指標全部通過，無需改凍結檔／門檻／治具判準。

## (a)–(d) 逐條

- **(a) 收合只顯示一行摘要，滿足 #1–#6**：`inventory-head.md` 北列項＝0/189、0/188×4（V1–V5 全 0）。摘要字 10px（CSS 內文標明「10px＝凍結下限」）。
- **(b) 點擊展開＝逐項等價**：`visual-polish-probe.mjs` 新增 `opened()`／`northItems()`——用 monkey-patch 包一層 `window.fillRails` 攔截傳入的原始 HTML，逐文字節點與展開後 DOM 比對多重集合。合併矩陣：展開 585 格、比對原始項目 13915 項，`missing` 0 項。觸控目標：`.nsum` `min-height:40px`、`width:100%`（flex:1 1 0，實際寬遠大於 40px）；#5 觸控目標全矩陣 0 紅。
- **(c) 收合高度 ≤56px 且 3D 取景不變**：`north-camera-probe.mjs` 量測 `#north`／`#felt` 矩形——**在所有量到的夜次（n1/n3/n4/n7）×視口（V1–V4），`#north` 高度恆為 56、`#felt` 矩形逐值相等**（base vs head 完全一致，0 差）。`fitSubject` 下游的 `framing`／`cam`（相機視角、view offset）在 n3/n4/n7 與基準有差異——**經自我一致性測試排除**：同一份 e29a753 舊碼跑兩次（base vs base）與同一份新碼跑兩次（head vs head）出現**完全相同的差異模式**（n1 恆等、n3/n4/n7 恆不等，且不等的欄位也相同）。判定為對決結算（`stage:'reveal'`）3D 演出本身的既有非決定性（很可能是 `frameSubjects` 對飛入/settle 中的拍品節點做即時定位，兩次獨立跑法在真實時鐘上取樣到微幅不同的畫格），**與本次北列收合改動無關、改動前就存在**。量測依據：`#north`／`#felt`／`obstacles`（`#feltHead`／`#helpBtn`／`#skipbtn`／`#revealCard`）矩形是 `frameSubjects` 唯一吃進的版面輸入，這些矩形逐值相等，代表北列改動沒有牽動取景輸入。這次自我一致性測試（base-vs-base、head-vs-head）的 raw json 未提交（純過程證據），如需重驗可用 `tests/tools/north-camera-probe.mjs --port <n>` 重新兩份比較。
- **(d) 展開／收起不影響主流程、未展開不擋任何可點元素**：`collapsed()` 掃全頁可點元素中心點，命中 `#north` 內部者記一筆——矩陣 0 筆。`opened()` 額外檢查展開時 `#mainbtn` 中心命中自身（不被面板蓋住）——矩陣未見 `openBlocksMain`。收起流程：點 `#north` 以外任何位置（`pointerdown`，capture 階段）即收；`toggleNorth(false)` 也掛在 `setHollow(false)`（非掏空頁）確保翻頁必收，不留殘影。

## 四項硬指標

| 指標 | 結果 | 指令／檔案 |
|---|---|---|
| 全套 `node --test tests/*.test.mjs` | **402/402**，0 fail | `docs/experiments/2026-09-25-visual-polish/suite-after.txt`（`ℹ tests 402` `ℹ pass 402` `ℹ fail 0`） |
| `trace-eq`（seeds 1..20，對 e29a753） | **equal:true**；`--mutate` 突變驗紅 ✅ | `docs/experiments/2026-09-25-visual-polish/trace-eq.txt` |
| 北列 #1–#6 違規 | **V1–V5 全 0**（`0/189`…`0/188`） | `docs/experiments/2026-09-25-visual-polish/inventory-head.md` |
| text-fit／landscape-fit 不退步 | **不退步**（見下） | `docs/experiments/2026-09-25-text-fit/probe-head.log`、`docs/experiments/2026-09-25-landscape-fit/probe-head.log` |

### text-fit／landscape-fit 細節

- **text-fit `guard`（真正的截斷／溢出違規）：227 → 0**——舊基準（92d0039）的 227 項全部是 `#northPrev`／`#northPrev > div.preview` 的框線溢出（README 已記的已知缺口），北列收合把預告框改成固定高度的 `.nsum` 按鈕＋隱藏的 `.nfull`，這個舊缺口直接歸零，是本卷的附帶改善。
- `red`／`redScrollOnly`：舊 158 格（36/24/36/39/3）→ 新 181 格（56/37/56/60/4）。格數變多是因為 `#northPrev`／`#northShr` 現在多產生 `> button.nsum` 這個量測格；`red` 幾乎全等於 `redScrollOnly`（＝可捲動容器裡「捲得到全文」的正常情況，不是真的截斷），僅 V4 有 1 格非 scroll-only（`#duel` 夜戰欄橫向溢出「北家 收驚婆 0 隻 大紙偶×1 香VS 西家」），這一項**在舊基準的 itemList 裡逐字相同已經存在**，不是新引入的退步。
- landscape-fit：`cells 105/105`、`cellsStrictNoBackdropExempt 96/105`、`m1 105`、`m2 105`、`portrait 21/21`、`redScreens []`——與 92d0039 全部相同；`transitions` 200→184，屬本卷之前 README 已記錄的「治具點擊時序讓整局走到的夜數不同」run-to-run 差異（格式皆為「全過的 N／N」，非「N 项中失敗幾項」）。

## 分片並行 vs 序列跑一致性

`visual-polish-probe.mjs` 新增 `--port`／`--merge`。本卷對 head 按 `--modes solo/hot/nw1/nw2/nw3` 分五個 process（各自 port）平行跑，再 `--merge` 成 `probe-head.json`：合併後 195 個畫面鍵、V1 189 格。此前一個代理序列跑同一治具卡了 10 小時未完；分片後五個 process 最長者（hot、nw1）各約 45–70 分鐘、平行跑總耗時約 70–80 分鐘完成。分片證據：`docs/experiments/2026-09-25-visual-polish/shard/*.log`（各模式耗時與結果）＋`shard/probe-base-merged.json`（前一個代理已對 base 驗證過分片合併，188 格，與序列版 185 格同樣落在本卷 README 已記錄的 run-to-run 格數差異帶內，非分片方法造成）。

## 清理與還原

- `assets/safe-area.css`、`index.html` 的北列收合實作（`northCellHTML`／`toggleNorth`／`shrinesSumText`）延續前一個代理未提交的版本，未重寫；只補了：
  - `index.html:809`：發現前一個代理留的 HTML 註解裡寫死一段含字面 `<script>` 的說明文字，恰好撞上 `tests/tools/load.mjs` 用「找第一個 `<script>...</script>`」這種樸素正則抽取引擎程式碼的做法——把註解裡的 `<script>` 誤判成真正的開始標籤，導致 33 個依賴 `loadGame()` 的測試檔與 `trace-eq.mjs` 全部 `SyntaxError`。已把註解文字改寫成不含字面 `<script>` 子字串（語意不變），修復後 402/402、trace-eq equal。這不是判準/凍結檔的變動，是移除一個純文字巧合造成的治具解析 bug。
- 工作區裡原本被刪掉的 `docs/experiments/2026-09-25-visual-polish/landscape/*`、`.../textfit/*`（8 個檔）**已用 `git checkout` 還原**：這些是 92d0039 卷自己 README 引用的既有證據（`#7 不回退` 那一段的 `textfit/inventory-head-polish.md` 等），沒有找到搬到別處的等價證據，判斷刪除是意外，不是有意搬遷。
- `contact-after-V1.png` 用本卷最終 head 截圖重新產生（與 `inventory-head.md` 同一批資料一致）；新增 `contact-north-open-V1.png`（展開狀態，6 個代表畫面：單人盯上/出價/請神前夜 wide、夜行錄長預告夜、熱座出價/盯上）。
- 未提交：`docs/experiments/2026-09-25-visual-polish/{shots-base-e29a753,shots-head}/`、`shard/shots-*/`、`docs/experiments/2026-09-25-text-fit/{shots-base-f105ea2,shots-head,landscape/shots-head-textfit}/`（巨量截圖目錄，只提交 json/log/md 與 contact sheet）；`shard/probe-{base,head}-{solo,hot,nw1,nw2,nw3}.json`（10 個分片原始檔，18MB，內容已完整體現在合併後的 `probe-head.json`／`probe-base-merged.json` 與各自 `.log` 摘要裡，不重複提交節省體積），僅提交 `shard/*.log`＋`shard/probe-base-merged.json`。

## 未提交／不需要使用者處理的項目

無。本卷（a）–（d）與四項硬指標均已通過，無待簽事項。v0.58.3 是否此刻推 main／發布由主對話決定（本次任務範圍不含 push／合併）。
