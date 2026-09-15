# Tier 1 每拍主角輕推

2026-09-15 使用者接受「每拍主角輕推一次」。

- 主角定義：演出順序中該拍第一支 tier 1 招式；同拍第二支不再推，也取消短招原本逐招左右 lean。
- 距離 4.2 → 4.1 → 4.2（最大約 2.4%），招式前半進、後半回，全部在原本 300ms 內。900／1400ms 不改。
- 不使用 FOCUS 的退暗、追焦或 CINEMA；`closeup=0`、reduced motion 不新增推鏡。
- skip 的 `ys:fx-trait-cancel`、duel-end、table、end 從當前幅度在 100ms 內平滑歸零。
- `framingDistance()` 只加回短推的距離差，避免 duel-figures 排陣跟著縮小、反向抵消短推。FOCUS/CINEMA 原有 reflow gate 不變。

## 已執行

1. `node tests/tier1-push.test.mjs`：修改前主角推鏡斷言 **RED**；修改後 **PASS**。包含實際 camera-director 包絡、距離上限、排陣距離、tier、reduced motion、退出事件，以及執行真實 `pwPlayBeat` 兩拍各兩招取得 `[true,false,true,false]`。
2. `node tests/fxtier.test.mjs`：**14/14 PASS**。
3. `node tests/tools/closeup-cam-unit.mjs docs/experiments/2026-09-15-tier1-push/closeup-camera.json`：**U1–U4 PASS**，既有 focus 進停回、提前收、skip、重 punch 不退化。

以上為決定性合成鏡頭／演出函式測試，不是自然遊玩命中，不代替滿編畫面與 iPhone 14 Pro Safari 主畫面真機驗收。

## 真頁面滿編鏡頭截圖（合成演出）

`node tests/tools/tier1-push-capture.mjs` 第二次完整跑 **exit 0**。`capture.json` 含 852×393、1280×720 × on／closeup0／reduced，共 6 組、18 幀。另獨立核對 6 個精確 case key、每組 `[0,150,300]`、距離與可見性，全部通過。

- on：兩視口均 4.2 → 4.1 → 4.2，k=0 → 1 → 0。
- closeup0／reduced：均維持 4.2（浮點誤差 < 1e-6）。
- 每幀 16 尊都有獨立純色 mask 的實際像素；全部生物 mesh 頂點投影在 x/y/z 裁切範圍內。排除描邊、系別特效、腳下環境與傳說名牌／基座，故這是生物本體裁切驗證，不是 HUD 或特效的版面驗收。
- 18 幀最低可見像素 **31 px**；推鏡峰值手機最低 **40 px**、桌機 **513 px**。這只證明每尊仍有畫面，不能把小面積殘露宣稱成「16 尊都清楚可辨」；手機滿編互相遮擋仍存在。
- 圖片在真實遊戲 renderer 中注入固定 8v8 名冊，rAF 停止後以可控 0／150／300ms 更新 director 與 duelFigures、走原 bloom render。僅合成鏡頭，不播放自然招式編舞。
- 原本實局的 DOM 計時仍會走，部分桌機圖的 HUD／結果字會被原實局更新，因此其隻數、勝負字樣不描述這組合成名冊；請勿把圖當成自然遊玩命中。治具已另加獨立固定說明條，避免未來 capture 被遊戲 DOM 覆蓋；本輪無為此重跑耗時全場。

主圖：[手機峰值](852x393-on-150ms.png)、[桌機峰值](1280x720-on-150ms.png)。同檔名前綴的 `0ms`／`300ms` 是起點與回位；`closeup0`／`reduced` 是不推對照。

第一跑 `capture-first-pass.json` 保留治具漏 `baseMs` 的錯誤記錄，該跑 **exit 1**，不算通過；修正事件 contract 後完整重跑無 pageerror。覆審另補「6 組不能缺樣」和 browser launch 失敗清 server 的守衛，syntax check 通過；既有完整結果另行重驗，未為這些守衛重跑全場。
