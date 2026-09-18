# A3 完整體驗切片：執行計畫（2026-09-18 開卷）

使用者 2026-09-18 對 A3 六題「按照建議」裁定（[交接信末節](../docs/handoffs/2026-09-15-a1-premium-table.md)）。範圍依 [總藍圖 §4 A04／A06／A07、§5 A3](../docs/MASTER_BLUEPRINT.md)：**聲音、角色反應、因果帳本、滿編構圖、再玩研究**五段，順序固定。凍結驗收：[2026-09-18-acceptance-a3-experience-slice.md](../docs/experiments/2026-09-18-acceptance-a3-experience-slice.md)。建立時基準：v0.57.23（main `997006b`）。

## 0. 已裁與不裁

- ①**聲音**：只做聆聽驗收＋補「落籌／封標／揭盅／受咒」四種**互相聽得出差別**的音效；語音（E08 台語）留 E1。BGM 四首不動（使用者聽了點名要換才另立小卷，走 `docs/bgm-prompts.md` 流程）。
- ②**角色反應**＝對手依**公開事件**回一句台詞：純文字、禁虛構、不改 AI 決策、不跨局記憶（跨局另裁）。
- ③**因果帳本**＝局末回顧新增一段由公開事件生成的恩怨短敘事（樣板句），只讀 `S.history`。
- ④**再玩研究**＝使用者＋家人 3 人各 2 局；指標「能說出主要勝敗因果」與「下一局想換打法」各 ≥2/3；門檻自凍結檔建立起凍結。
- ⑤**滿編構圖**併本卷小卷：只准兩種改法——同型單位錯位排列、描邊改主色；不動模型、色票。
- ⑥順序：聲音→台詞→因果→滿編構圖→再玩研究。前一段「過」或「未過已簽字」才進下一段。
- 不動：規則、亂數（音效／台詞只用 `S.rngUi`，`S.rng` 一次都不多耗）、演出時長契約 `PW_FX.TRAIT_MS_BY_TIER`、A1 構圖契約、A2 標竿模型與 ART_BIBLE 色票、iOS 喚醒三招（`unlock`／`release`／`close`）。
- 排本卷之後：材質卷（鏡／猴臉／划手）、P4 對象語彙重設計、D2 連鎖、D3 幽靈。
- 聲音是品味題（`03 R6`）：四支新音各出**甲／乙兩案**在聽板讓使用者挑，挑定後才做盲聽；不自定稿。

## 1. 步驟

| 步驟 | 交付 | 退出條件 |
|---|---|---|
| S0 聲音盤點 | 12 支音效→觸發事件對照表（本檔 §4）；四個目標事件現況與缺口 | 表落檔、四缺口逐一指到 `index.html` 行號 |
| S1 聽板治具 | `tests/tools/sfx-board.html`（靜態頁，只載 `assets/audio/sfx.js`，不動產品碼）：A 盲聽四選一（固定種子、產出 JSON）、B 逐支「留／換／關」、C 一夜序列連播、D 甲／乙挑選；`tests/tools/sfx-render.mjs`：headless Chromium 用 OfflineAudioContext 渲染每支音，量有效時長／頻譜質心／峰值 | 對現有 12 支跑通、0 console error、JSON 含三特徵欄位；聽板公開網址在手機打得開 |
| S2 四支新音 | 每支甲／乙兩案 → 使用者挑 → 機械差別閘（凍結 #3）→ 接線（凍結 #6）→ bump VERSION | 凍結 #3／#6 過 |
| S3 使用者聆聽驗收 | 盲聽指認（凍結 #4，≤3 輪）＋ 12 支逐支留換（#5）＋ 一夜序列（#6）＋ 真機實玩一局 | #4 過或三輪上限標「未過」交簽字；#5 使用者逐支回答落檔 |
| S4 角色台詞 | `ROLES.lines` 擴充：每角色對每類公開事件 ≥2 句、每句附 evRef；機械測試＋讀者對應題 | 凍結 #8 過 |
| S5 因果短敘事 | 局末回顧新增一段 3–6 句樣板敘事，只從 `S.history` 生成；決定性、空局不 crash | 凍結 #9 過 |
| S6 滿編構圖小卷 | 8v8 同型錯位排列＋描邊改主色；三件重讀（拼板舟／福壽綿長／紅帽） | 凍結 #10 過或兩輪上限 |
| S7 再玩研究 | 3 人各 2 局（手機、正式線上版）；每局 `S.history` JSON＋兩題原話落檔 | 凍結 #11 逐人逐局有紀錄 |
| S8 收卷 | 報告、送達核對、藍圖 §5 A3 狀態、交接 | 凍結 #1–#12 逐條有證據；未過項列出 |

每段一個子卷目錄 `docs/experiments/2026-09-XX-a3-<stage>/`（sound／lines／ledger／lineup／replay），含執行紀錄、材料、讀者或聽者 JSON 原始檔。

## 2. 既有治具與來源（不重造）

- 音效：`assets/audio/sfx.js`（`VOICES` 12 支：gong／woodfish／cymbal／stamp／woodslam／bell／whoosh／hurt／dawn／death／babble／wind；`SFX.play(name,{rnd,…})`）；產品端包裝 `index.html:4810` `sfx()`、`:4809` `sfxOn()`；BGM `assets/audio/bgm.js`（`TRACKS` title／market／duel／review，`FADE` 1.2、`volume` 0.45）。iOS 喚醒與診斷：`art-integration-guide.md` §8.x、規則頁 `audioDiag()`。
- 公開記錄層：`S.history`（`index.html:2916` 建立；`recordAuction` `:4388` 起每夜 push `{round, auction[{intent,targetId,…}], deaths, …}`；`life[]` 逐夜壽命快照；不變量 `life.length===nights.length+1` 由 `tests/review.test.mjs` 守）。三高光 `CUTS` `:5546`／`playCut` `:5559` 已示範「只從 `S.history` 判定」的寫法。
- 角色台詞：`ROLES.*.lines`（`:1135` 起，現有 `win`／`lose`／`poisoned` 三類）；恩怨數值 `p.grudge`（`:1054–1174`，只在 hook 累加）。
- 滿編：`tests/tools/duel-perf.mjs`、`gl-duel-probe.mjs --drawBudget=1`、`legend-presence.mjs`（遮擋率）、A2 讀者材料與規程 `docs/experiments/2026-09-17-a2-closeout/duel-readers/`。
- 引擎不變證據：`tests/baseline-traces.json` seeds 1–20 trace-eq；`node --test`；perf32。
- 歷史教訓（改音必讀）：09-03 iPhone 主畫面沒聲音六輪（根因 AudioContext 數量硬上限＋工作階段未釋放，`release()` 走 `ctx.close()`）——新音不得新開 AudioContext，一律走既有 `ctx`。

## 3. 風險

- **聽板與遊戲脫鉤**：聽板過了、遊戲裡沒接線或被 `SKIP`／`BIDS_OPEN` 相位吞掉。對策＝凍結 #6 的接線測試（攔 `YS_SFX.play` 記名稱序列）＋真機實玩一局看 `audioDiag` 播過次數。
- **四支新音只是同一支改音高**：人耳在手機喇叭上分不出。對策＝凍結 #3 機械差別閘先於聆聽，質心或時長兩維至少一維拉開。
- **揭盅與開市鑼共用 gong**：揭盅換新音後，開市鑼保留 gong；序列聽（#6）專門抓「兩聲糊在一起」。
- **台詞／敘事洩私**：模板若引用他人密封出價金額、心願、袋中未公開物＝違反藍圖 A04「禁洩漏私有資訊」。對策＝凍結 #8／#9 的私有欄位比對測試。
- **再玩研究樣本小**（3 人）：門檻已凍結為「以人為單位、兩局取一」，結果不好也照實記，不改口徑、不加人數湊數。
- **手機喇叭 vs 桌機**：聆聽驗收以手機（iPhone Safari 或主畫面）為主、桌機為對照；只在桌機過不算過。

## 4. 聲音盤點（S0，2026-09-18 事實）

| 音 | 觸發（`index.html`） | 事件 |
|---|---|---|
| woodfish | `:4825` 任何 `<button>` click | 通用鍵音 |
| woodslam | `:2567` `slamSfx()` | 盯印落桌（3D 托盤關閉時直接發聲） |
| stamp | `:4802` 盯印首次顯示；`:6313`／`:6340` 夜戰招式 | 印記／招式 |
| gong | `:5618` 開市鑼；`:5628` 每件得標揭曉 | **開市與揭盅共用** |
| bell | `:5666` 請神得主 | 請神 |
| cymbal | `:5763` 請神結算有人請走；`:6494` 對決命中 | 請神／命中 |
| hurt | `:6376`／`:6415`／`:6500` | 受擊 |
| whoosh | `:6459` 對決進場 | 對決 |
| death | `:6530` 壽命耗盡 | 淘汰 |
| dawn | `:6614` 天明 | 天明 |
| babble | `:4881` AI 嘟囔 | 角色 |
| wind | `:4845` 每 7 秒環境風 | 環境 |

四個目標事件現況：**落籌**（出價「＋」／勾選）＝只有通用 woodfish；**封標**（`submitHumanBids` 交卷）＝只有通用 woodfish；**揭盅**（每件得標揭曉 `:5628`）＝與開市鑼同一支 gong；**受咒**（毒標塞入成功、`pwCurseFeedback` `:6134`）＝無專屬音。四支新音的材質語言候選（甲／乙各一，S2 出案）：落籌＝籌碼落桌（玉／木短擊）；封標＝紙封＋落印（紙摩擦＋悶印）；揭盅＝陶盅揭蓋（瓷滑＋短亮）；受咒＝陰氣下沉（低頻滑落＋氣音）。
