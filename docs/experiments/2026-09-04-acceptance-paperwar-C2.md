# 驗收條件凍結 — 《紙紮夜戰》卷 C2：27 張符咒版畫剪影量產（2026-09-04）
基準 SHA：`9af1fd2`（樣張已併入 `assets/paper/samples/`）。使用者裁定（2026-09-04）：風格＝**丙 符咒版畫**（米黃符紙、粗黑木刻線、白色鑿刀痕分面、朱砂只用在符文欄／印章／該件關鍵物件）。
樣張 `assets/paper/samples/fuzhou/{shengong,pinbanzhou,moshenzai}.svg` 是風格基準，量產不得偏離其線條語彙。一經訂定即凍結。

## 範圍
C2-1 產生器落成 repo 正式工具 `tests/tools/paper-gen.py`（或 `.mjs`）：零件用具名 path 表（parts／cuts／joints／accent），每件一份零件表；重跑輸出逐位元組相同（決定性）。
C2-2 27 張 `assets/paper/fuzhou/<itemId>.svg`，`<itemId>` 逐一對應 `index.html` POOL 的 `id`（27 個，一個不缺、一個不多）。
C2-3 四種體型都要有自己的造型語彙：swarm（群體，左右對稱或留邊、可橫向複製 N 個）、elite（精英，單尊、佔滿高度）、haunt（作祟，飄浮、下半身虛化）、**ward（護法，樣張沒做——要新定：矮壯、有盾／符牌／門神感）**。每張 `data-body`／`data-faction`／`data-item` 屬性齊全。
C2-4 每件的「關鍵物件」（朱砂點綴處）要跟法寶名對得上（如射日神弓＝太陽、魔神仔紅帽＝帽），並列成 27 列表。
C2-5 預覽頁 `docs/experiments/2026-09-04-paperwar-C2-all.html`：27 張依陣營分三區、每張標名稱＋體型；每個 swarm 另示範 ×3 橫排；深色燈籠底、390 寬直式可看。
C2-6 樣張三張若被量產版取代，`samples/` 原檔不動（留當風格基準）。

## 驗收（貼指令原文＋輸出）
C2-A0 對應：POOL id 集合 ＝ `assets/paper/fuzhou/*.svg` 檔名集合（貼 diff 為空）。
C2-A1 規格：27 檔各 ≤12KB；`viewBox="0 0 200 260"` 27/27；`<image`／`href="http`／`<script`／`<foreignObject` 出現 0；`data-body` 值 ∈ {swarm,elite,haunt,ward} 且與 POOL 的 `unit.body` 一致 27/27。
C2-A2 決定性：產生器連跑兩次，27 檔 sha256 逐一相同（貼 `sha256sum` 比對）。
C2-A3 預覽頁 Playwright 390×844 全頁截圖 `docs/experiments/2026-09-04-paperwar-C2-all.png`，console 0 error。
C2-A4 讀圖自審：把截圖縮到 **每張 60px 寬**（手機戲台上的實際尺寸）再截一張 `…-C2-all-60px.png`，逐件回答「60px 下還認得出關鍵物件嗎」，答「否」的列出清單（不得少於誠實數）。
C2-A5 群體複製：每個 swarm ×3 橫排在預覽頁上不重疊穿幫（截圖區塊）。
C2-A6 不動 `index.html`／`js/`／`assets/samples`／既有 assets；`git diff --stat` 只含 `assets/paper/fuzhou/`、產生器、預覽頁與截圖。

## 不得做
不改 index.html、不改 js/、不動樣張、不改風格語彙（想改先寫理由回報）、不 commit 不 push。
