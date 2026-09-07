# 驗收凍結檔：美術甲「夜市燈火」渲染基礎包（2026-09-07，v0.46）

基準 SHA：`5565364`。規格＝`docs/proposals/2026-09-07-art-direction-study.md` §二 甲（使用者裁定甲→乙→丙）。依 `threejs-visual-loop` skill 5-1／5-2／5-4／5-5 做，**陰影不開**（手機）。所有數值【試玩必調】，本卷先給合理預設。

## 範圍
1. **渲染器**：`renderer.toneMapping = ACESFilmicToneMapping`、`toneMappingExposure` 1.1（`PW_FX`／`ENV` 常數化）、`outputColorSpace = SRGBColorSpace` 明寫；`js/bloom.js` 合成 shader 手刻的 sRGB＋ACES 拿掉（避免雙重映射；bloom 的亮部萃取閾值要依新曲線重調，對決畫面觀感不得退步——用 A6 的前後對照人眼判）。
2. **牌桌光**：加 `HemisphereLight`（天空色偏紫藍、地面色暖褐，強度常數化）；四盞燈籠改**四種色溫與亮度**（東 青白／南 橘／西 琥珀／北 暗紅，常數表），`renderer.js` 的燈籠閃爍沿用；戲台三燈不動。
3. **背景**：純色改「漸層穹頂」（大球 BackSide、頂點色或小 shader：上 藍紫、地平 暗紅、下 近黑），`scene.fog` 顏色改跟地平色；`scene.background` 仍設同色當退路。
4. **遠景剪影**：3～5 片低成本 billboard（廟宇屋脊、牌樓、榕樹、屋簷燈籠串）繞桌一圈、放在霧裡（距離 8～14 單位），程序化幾何或 Canvas 畫的黑色剪影貼圖，帶 `name:"far-*"`；對決機位下不得擋到人形（用 `duel` 機位截圖驗）。
5. **暈角**：CSS 覆蓋層（`#vignette`，radial-gradient，pointer-events:none，透明度常數）疊在 canvas 上、UI 之下；不進 shader。
6. **`?fps=1` 回填欄位**：規則頁音訊診斷區旁加一行「fps 中位（最近 2s）／draw calls／三角形／機型（UA 精簡）」，只在 `?fps=1` 顯示；純顯示、不記錄。
7. VERSION 0.46；GAME_DESIGN changelog；GUIDE 新一節；ART_BIBLE 加「燈光與色調」小節（常數表與理由）。
不在本卷：陰影、AO、乙／丙、27 隻模型本身、UI 配色 token。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **A1 渲染器讀值**（`tests/tools/scene-shot.mjs` 已印 `toneMapping/exposure/colorSpace/lights`）：新版 `toneMapping=4`（ACES）、`exposure` 等於常數、`colorSpace="srgb"`；基準 `5565364` 讀到 `toneMapping=0`。`grep -c "ACES\|aces" js/bloom.js` 的手刻映射段已移除（報告貼 diff）。
- **A2 燈光**：治具讀 scene 光源列表：新增 1 顆 `HemisphereLight`；4 顆 `PointLight` 顏色**兩兩不同**（hex 互異）且強度非全等；戲台三燈參數與基準逐值相同。
- **A3 背景漸層**：牌桌截圖（844×390，intro 關掉後的市集畫面）取畫面上 10% 與下 10% 列的平均 RGB，ΔE（CIE76）≥ 15；基準版 ΔE < 5（純色＋霧）。同一治具在對決截圖也量一次只報。
- **A4 遠景剪影**：treverse 找 `name` 以 `far-` 開頭的物件 ≥3 個且在牌桌機位視錐內、`visible`；對決機位截圖中人形包圍盒與任一 `far-` 物件投影不重疊（治具算 2D 包圍盒）。
- **A5 暈角**：`#vignette` 存在、`pointer-events:none`、z-index 在 canvas 之上 HUD 之下；截圖四角 5% 區域平均亮度 < 中心 20% 區域平均亮度 × 0.8；基準版比值 ≥ 0.9（因為背景本來就暗，若基準也 <0.8 要改量「有無疊層」並記 §2.1——訂的當下承認此風險）。
- **A6 Lookdev 前後對照（人眼）**：`tests/tools/creature-shoot.mjs`（或既有 27 隻預覽治具）對基準與新版各拍 27 隻 contact sheet；牌桌／市集／對決三張前後對照 contact sheet；放 `docs/experiments/2026-09-07-art-a-evidence/`。主對話親看：27 隻沒有一隻「糊成一團或曝掉」、對決 bloom 觀感不退步、牌桌能看出一側較暗。
- **A7 效能**：`duel-perf.mjs perf --n=10 --uncap` 與 `--n=8` 中位 fps ≥ 基準 ×0.9（同機同 session 對 `5565364`）；牌桌 draw calls 增加 ≤ 10（治具讀 `renderer.info` 在牌桌機位）。
- **A8 `?fps=1`**：不帶參數時 DOM 無該元素；帶參數時元素存在且 2s 後數字非 0；`lineup-order`／`duel-desync` 等 8 套測試綠；`ash-freeze-probe.mjs` 綠；`duel-drive --duels=6` 0 error。
- **A9 引擎等價**：`trace(1..20)` 與基準逐位元組相等（純渲染卷）。
- **A10 範圍**：`git diff --stat 5565364` 只含 `js/scene-env.js`、`js/renderer.js`、`js/bloom.js`、`index.html`（VERSION、`#vignette` CSS／DOM、`?fps=1` 段）、`assets/theme.css`（若暈角常數放這）、`tests/tools/scene-shot.mjs`（加 A3/A4/A5 量測）、新治具、`docs/design/ART_BIBLE.md`、`docs/GAME_DESIGN.md`、`docs/IMPLEMENTATION_GUIDE.md`、本檔、證據目錄。

什麼實作會讓 A1 紅：只在 bloom shader 裡加 ACES（牌桌吃不到）。什麼實作會讓 A4 紅：剪影放在桌面高度擋到對決人形。什麼實作會讓 A6 退步：曝光 1.1 讓 27 隻頂點色全部發白——那時要調 exposure 而不是調 A 條門檻。
