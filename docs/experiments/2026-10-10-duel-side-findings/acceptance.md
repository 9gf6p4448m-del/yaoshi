# 對決字幕修復的四個附帶缺陷（F1–F4）——驗收條件凍結檔

- 日期：2026-10-10；分支 `fix/duel-side-findings`，起點 `0f41bf01`（`fix/duel-undefined-caption` HEAD＝9f6b1e2f＋C6 更新 docs commit）。
- 使用者 2026-10-10 明確同意處理覆審 `review-report.md` 的 F1–F4。本檔在動手改 `index.html`／`tests/tools/trace-eq.mjs` 之前 commit，之後依 `02 §2.1` 凍結。
- 限制：不 push、不動 main、不動版號；不得改任何扣血數值、引擎判定、結算或策略數值（硬規則 3）。
- F1 判定依據（不是猜）：`CHAINS.bloodOath.desc`（index.html:2514）寫「首拍自傷反噬敵前鋒 **1** 血」；`TRUE_DESTINY_RULES.bloodOath.night`（2532）寫真命「**2** 血」；引擎 5390 `n=trueBlood?2:1` 與兩者一致。錯的是字幕：非真命時 pwFire id 仍是 `bloodSacrifice`，撞到 `TRUE_DESTINY_MOVES.bloodSacrifice`。故只改 id／字幕表，不改 n。

| # | 條件 | 量法 | 什麼實作會讓它變紅 |
|---|------|------|--------------------|
| D1 | F1 新測試：沿用 `l1-destiny-night` 血祭夾具（A 袋 `xianji,xianji,guoyin`、B 硬兵，mode `off` 與 `original` 各跑 `paperWar`）。每一筆 `kind:'bloodSacrifice'` 事件（扣 n 血）其後緊接的招式拍，用匯出的 `pwMoveCapText` 組字：`desc` 含「${n} 血」；`item` 以「真・」開頭 ⇔ n===2。活性：off 至少一筆 n=1、original 有 n=2 也有 n=1。修前（0f41bf01）紅在這條行為斷言（非例外），修後綠 | `node --test tests/duel-side-findings.test.mjs` 修前／修後各跑，貼輸出 | 非真命仍用 `bloodSacrifice` id；或新 id 沒進字幕表（退回「法寶：招式」、desc 空）；或真命那筆也被改掉（n=2 失去「真・」）；或夾具沒觸發血祭（活性紅） |
| D2 | F1 扣血不變：`index.html` 的 diff 不碰 `foeFront.hp-=n`／`n=trueBlood?2:1`／`pwRec(...,"bloodSacrifice",n,...)`；`trace-eq` 預設模式（undef-cap HEAD 對修後）所有 `pa`／`pb`／`winnerId`／`dmg`／`aId`／`bId` 逐值相同（差異數＝0），`extra`（log 文字）差異逐項列出並說明；另跑真實頁面一次（袋子含 xianji,guoyin，未覺醒），字幕顯示血祭過陰非真命版、無「真・」 | `git diff 0f41bf01.. -- index.html`；trace 逐欄比對腳本（落 scratchpad）貼 `{nonExtraDiffs:0}`；browser 探針輸出 | 修法動到扣血／亂數消耗／判定；或頁面播放處沒吃到新 id |
| D3 | F2：`trace-eq --beats` 對「兩個同名 index.html、內容不同（一份是 CFG.ROUNDS−1 突變）」判 `equal:false` 並 exit 1；對「兩個同名、內容相同」判 `equal:true` exit 0（健康方向）；修前的 trace-eq 對同一對不同內容檔判 `equal:true`（證明原缺陷存在、測試有鑑別力）；`--mutate` 仍 `differs:true` exit 0 | 新測試 `tests/trace-eq-samename.test.mjs`（spawn 真實腳本、兩個暫存子目錄）修前／修後各跑；`node tests/tools/trace-eq.mjs index.html --mutate` 貼輸出 | 暫存檔名仍只靠 pid＋basename；或改成兩邊讀同一檔；或注入失效（injected:false） |
| D4 | F3 新測試：B 袋 `boat,buoy`、A 精英，seeds 1..20：每場 `r.log` 中任何一行「🛶 怒濤破浪：…」文字不重複出現；活性：至少一場同時有 `swarmHalfSplash` 與 `chainHalfSplash` 招式拍，且有怒濤破浪 log；兩種招式拍仍各自記錄（拍序列不因去重少拍）。修前紅在「重複」行為斷言，修後綠 | 同 D1 | 去重仍分開；或用「整場只印一行怒濤破浪」把不同隊名的合法行也吞掉（另以兩邊皆 boat,buoy 的夾具檢查兩隊名各自至少能印一行——若引擎本來就只印一行則記錄為不適用並說明）；或為去重少記招式拍 |
| D5 | F4 新測試：`pwMoveCapText('__未註冊__')` 與 `pwMoveCapText(undefined)` 的 `move==='招式'`、`item==='法寶'`，三欄皆不含 `undefined`。對突變「`move` 兜底改回 `trId`」紅、原碼綠 | 同 D1；突變體落 scratchpad、用參數化副本指向突變檔跑 | 兜底改回 trId；或回傳 undefined 欄位 |
| D6 | 全套測試（排除 `sfx-wiring`，單批一次跑完）失敗集合與基準相同：基準＝`fix/duel-undefined-caption` HEAD 同指令（預期只有 nightwalk #1）；新測試檔全綠 | `node --test $(ls tests/*.test.mjs \| grep -v sfx-wiring)` 兩邊各跑，比對 `✖` 清單 | 修法改壞其他測試 |
| D7 | 範圍：`git diff --stat 0f41bf01..` 只含本檔、`index.html`、`tests/tools/trace-eq.mjs`、`tests/duel-side-findings.test.mjs`、`tests/trace-eq-samename.test.mjs`；`index.html` 每個 hunk 對應 F1 或 F3；版號字串未動 | 貼 diff --stat 與逐檔一句 | 順手改無關行、動版號 |
| D8 | fresh opus 反駁式覆審，F1–F4 逐條三態（真的修好／表面修好／沒修到），最多 3 輪；另涵蓋 `tests/tier1-push.test.mjs` 的 `pwMoveCapText` 替身那一行不會讓該測試更容易通過 | 覆審報告落檔、結論貼回 | 任一條判表面修好／沒修到且未處理 |
| D9 | commit 在 `fix/duel-side-findings`、結尾有 Co-Authored-By／Claude-Session、未 push | `git log`、`git branch -r --contains HEAD` 為空 | push 或 commit 錯分支 |
