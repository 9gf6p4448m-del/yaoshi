# look-dev 卷 L — 戲台燈光與神性特效（2026-09-04）

驗收條件：`docs/experiments/2026-09-04-acceptance-creature-lookdev.md`（L 段、LD-A3、LD-A4），**未動過**。
量測位置：**headed Playwright ＋ 主機 GPU**（`ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)`），
viewport 900×900、`deviceScaleFactor 1`，與試作卷 CP-A3 同一個量測位置（無頭 SwiftShader 那組不拿來當判準）。

---

## ① LD-A3／LD-A4 一覽

| 條目 | 結果 | 證據 |
|------|------|------|
| LD-A3 前後亮度 after ≥ before×1.5 | **PASS** 交付的那兩張：**0.1422 → 0.2830＝1.990×**；三取樣中位數 0.1414 → 0.2824＝1.997× | §② |
| LD-A3 不過曝 ≤0.85 | **PASS** 0.2830 ≤ 0.85；`maxL` 0.9501、過曝像素 **0.00%** | §② |
| LD-A3 三系特效各一張截圖 | **PASS** | §② 截圖清單 |
| LD-A3 `?n=8` rAF 中位數 ≥50fps | **PASS** `light=1&fx=1` 下 **125.0 fps** | §④ |
| LD-A3 粒子總數貼出 | **PASS** 每隻 **44**（上限 60）；`?n=8` 共 **352** | §④ |
| LD-A4 只動允許路徑 | **PASS** 只有 `js/creature-figures.js`＋`tests/tools/creature-preview.html` 兩個檔與基準不同 | §④（本 worktree 的 HEAD 是 `a8ccfc5` 不是 `b2292f5`，範圍改用內容雜湊比對，理由見 §④） |
| 不動 scene-env／renderer／index.html／duel-figures | **PASS** 四個檔與 HEAD 逐位元組相同 | §④ |
| console 0 error | **PASS** 最終那批 11 次載入（`jobs-final` 10 ＋ `?glb` 驗證 1）全部 `errors: []` | §④ |
| 不 commit 不 push | **PASS** 無任何 commit（`git log` 仍在 `a8ccfc5`） | §④ |

---

## ② 前後亮度數字與截圖

### 遮罩怎麼定義的

1. **背景板** `plate.png`：同一支頁面、同一顆 GLB、同一組相機，讓妖 `burn()` 燒完
   （`group.visible === false`、灰燼也散盡）之後按快門＝**這個鏡頭的純背景**。
2. **遮罩**＝`before` 與 `plate` 逐像素 `max(|ΔR|,|ΔG|,|ΔB|) > 12/255` 的像素集合。
   共 **261,393 px（畫面的 32.27%）**——含妖本體與牠腳下那圈陰影盤。
3. **before 與 after 量的是同一組像素**：遮罩固定取自 `before`，不因為變亮而重算。
   （調參途中真的踩過一次：拿 after 自己當遮罩來源，背景從 0.118 變成 0.044、
   對比從 2.4 變成 5.4，全是遮罩換掉造成的假訊號。治具已改成必須明寫遮罩來源。）
4. **亮度**＝sRGB 顯示值的 Rec.709 相對亮度 `(0.2126R+0.7152G+0.0722B)/255`。
5. 陰影盤留在遮罩裡是**保守**的選擇：它是 `MeshBasicMaterial`（`fog:false`、`toneMapped:false`），
   不吃任何燈，前後都一樣暗，等於一直在拉低 after 的平均值、讓倍率變難達成。

### 數字（各拍 3 張，量訊號穩不穩）

| 圖 | meanL（遮罩區平均亮度） | maxL | 過曝像素 | bgMeanL（遮罩外） | 妖／背景對比 |
|----|------|------|------|------|------|
| `before-1` | **0.1422** | 0.7504 | 0.00% | 0.0688 | 2.068 |
| `before-2` | 0.1395 | 0.7641 | 0.00% | 0.0702 | 1.988 |
| `before-3` | 0.1414 | 0.7866 | 0.00% | 0.0693 | 2.041 |
| `final-after-1` | **0.2830** | 0.9501 | 0.00% | 0.1113 | 2.542 |
| `final-after-2` | 0.2791 | 0.9465 | 0.00% | 0.1129 | 2.473 |
| `final-after-3` | 0.2824 | 0.9465 | 0.00% | 0.1117 | 2.528 |
| `final-lightoff`（新程式碼、`?light=0`） | 0.1419 | 0.9091 | 0.00% | 0.0690 | 2.056 |

**交付的那兩張截圖就是這張表的 `before-1` 與 `final-after-1`**，所以檔案與數字對得起來：

- **`-light-before.png` 0.1422 → `-light-after.png` 0.2830 ＝ 1.990×** ≥ 1.5 ✅；
  0.2830 ≤ 0.85 ✅；過曝像素 0.00% ✅。
- 換成三取樣中位數也一樣過：**0.1414 → 0.2824 ＝ 1.997×**。
- 三張一組的離散度都在 ±1% 以內（before 0.1395–0.1422、after 0.2791–0.2830），
  idle 呼吸造成的抖動遠小於要判的 2 倍差距，這個訊號可信；
  不論取哪一張配哪一張，最小的可能倍率也有 0.2791/0.1422 ＝ 1.963×，離門檻 1.5 還很遠。

### 這個證據有沒有鑑別力（兩個方向都驗了）

- **關掉就回到基準**：同一份新程式碼、只把燈組關掉（`?light=0&fx=0`）＝ **0.1419**，
  與改動前的 0.1414 相差 0.35%（落在 ±1% 的取樣雜訊內）。
  ⇒ 亮度的增益**確實來自三燈組**，不是來自材質改動偷偷把畫面調亮。
- **打開就變亮**：`?light=1` ＝ 0.2824。
- 順帶證明了材質改動在亮度上是中性的：`light=0` 的 `maxL` 從 0.7504 跳到 0.9091，
  就是新加的眼睛自發光（`eye` 材質）——**峰值變了、平均沒變**，正是預期的行為。

### 這一輪的關鍵發現：只是「變亮」不算數

第一版用 **PointLight** 三盞，妖的遮罩區 0.142 → 0.249（1.75×，形式上已經過關），
但**背景同時 0.069 → 0.153**，妖／背景對比反而從 2.07 掉到 **1.63**——
等於把整個戲台一起調亮，形體還是浮不出來，夜市的暗也沒了。
全向光源必然如此。改成**有錐角的 SpotLight** 之後才同時做到：
妖 1.997×、背景只從 0.069 到 0.111、對比 2.07 → **2.53（變好）**。
所以本報告除了驗收要求的 meanL，另外把 `bgMeanL` 與對比一起貼出來——
只看 meanL 的話，第一版那種「整場一起調亮」也會過關。

### 截圖

| 檔案 | 內容 |
|------|------|
| `docs/experiments/2026-09-04-lookdev-light-before.png` | 改動前（試作卷原樣），`?n=1&auto=0` |
| `docs/experiments/2026-09-04-lookdev-light-after.png` | 改動後，`?n=1&auto=0&light=1&fx=0`（同相機、同 `tiger.glb`） |
| `docs/experiments/2026-09-04-lookdev-fx-xianghuo.png` | 香火：香煙＋往上飄的火星 |
| `docs/experiments/2026-09-04-lookdev-fx-zuling.png` | 祖靈：金粉繞身 |
| `docs/experiments/2026-09-04-lookdev-fx-yinqi.png` | 陰氣：冷色鬼火 |
| `docs/experiments/2026-09-04-lookdev-n8.png` | `?n=8&light=1&fx=1` 的效能場景 |

肉眼可讀的差別（before → after）：毛色從「一團橘」回到棕／褐，黑條紋、紅綬帶、
金錢牌、額頭金印各自分得出來；右側身與尾尖出現冷色（fill）與背景切開；
眼睛（`eye` 材質）自發光被 bloom 吃到，變成會發光的金瞳。

---

## ③ 改了哪些檔（檔案:行號）與新 API

只動兩個檔。行號以**改動後**的檔案為準。

### `js/creature-figures.js`

全檔 684 行。

| 行 | 改了什麼 | 為什麼 |
|----|---------|--------|
| 13–19 | 檔頭介面清單補 `bounds()`／`setFactionFx()`／兩個新導出 | 換皮介面多了東西 |
| 27 | `import` 多拿 `SPARK_COLOR` | 三系特效的顏色沿用同一張表，不另立一套色 |
| 33–46 | `RIM`：`power` 3.4→2.6、`strength` 0.62→1.05、`ambient` 0.025→**0.012**（44）、新增 `dir`（44）／`wrap`（45） | 邊光從「全身細鑲邊」改成「偏背光側的寬邊」 |
| 50–54 | 新增 `GLOW`（材質名正則、自發光強度、發光材質的邊光倍率） | `eye`／`mouth_glow`／`glow_*` → emissive |
| 91 | `PARS` 加 `uniform vec3 uRimDir` | 邊光方向性 |
| 116–122 | `TAIL` 的 fresnel 乘上方向項 `_rim *= mix(0.15, 1.0, _face)` | 只有背光那側吃滿邊光 |
| 133–139 | 新增 `EMISSIVE_TAIL`：`totalEmissiveRadiance *= vColor` | 見 §⑤ 第 6 點 |
| 141–174 | `dressMaterial` 認得 glow 材質（146 設邊光倍率、150–153 設 emissive、171 注入 `EMISSIVE_TAIL`） | |
| 195–196 | 新增 `bbox`／`fx` 兩個內部狀態 | |
| 209 | 記下 `bbox` | 特效尺寸按真實包圍盒來，不寫死 1 公尺 |
| 242 | `setRimUniforms` 對 glow 材質用 `GLOW.rim` | 發光材質不再疊邊光，不然瞳孔糊成一團 |
| 267 | `bounds()` | |
| 268–282 | `setFactionFx(faction, opts)` | GLB 未載完先掛預設尺寸，`readyPromise` 回來再 `fit()` |
| 321 | `update(dt)` 推進 fx | 呼叫端不必另外記得餵特效 |
| 326 | 燒毀時 `fx.setFade(1 - p)` | 身體燒到哪，特效淡到哪 |
| 349 | `reset()` 把 fx 淡回來 | |
| 355 | `dispose()` 一併拆掉 fx | |
| 374–382 | `FACTION_ALIAS`／`canonFaction` | 專案裡三系有兩套拼法（`zuli`/`zuling`），兩套都收 |
| 384–418 | 戲台燈光的設計說明＋`FIGURE_LIGHT`（409–413）＋`RIM_FACTION_MIX`（418） | |
| 420–492 | **`createFigureLightRig(opts)`**（宣告在 435） | |
| 494–546 | 三系特效的設定：`FX_MAX`／`FX_DEFAULT_COUNT`／`FACTION_FX`（503）／`getFxDot`（526）／`fxLcg`（542） | |
| 548–635 | `makeAuraLayer`（一層粒子＝一個 `THREE.Points`） | |
| 637–679 | `makeFactionAura`（把一到兩層裝進一個 Group） | |
| 681–684 | **`attachFactionFx(figure, faction, opts)`** | |

### `tests/tools/creature-preview.html`

全檔 235 行。

| 行 | 改了什麼 |
|----|---------|
| 18–20 | 檔頭補 `?glb`／`?light`／`?fx` 三個網址參數的說明 |
| 27–28 | 檔頭補 `particleCount`／`lightCount` 兩個量測掛勾的說明 |
| 59 | `import` 多拿 `createFigureLightRig`／`attachFactionFx` |
| 65–72 | `?light`／`?fx`／`?glb` 解析（`?glb` 擋掉 `../`，不留讀任意檔的路） |
| 128–134 | 掛上三燈組（`N>1` 時 `scale: 1.7` 讓光圈罩得住整排） |
| 137–144 | 掛上三系特效（142 行 `prefers-reduced-motion` 時不掛）＋算 `PARTICLE_TOTAL`／`LIGHT_TOTAL` |
| 170 | `window.__preview` 補 `light`／`fx`／`glb`／`particleCount`／`lightCount` |
| 221–223 | HUD 多顯示 light／fx／粒子數 |

### 新 API 簽名

```js
// 戲台三燈組。回傳 THREE.Group，scene.add(rig) 即可，對任何 GLB 都成立。
createFigureLightRig({
  faction,     // 'xianghuo'|'zuling'|'yinqi'（也吃 xianghu/zuli 與中文）；只染 rim
  rimColor,    // 直接指定 rim 色，優先於 faction
  scale = 1,   // 位置與作用距離一起縮放；一排 8 隻用 1.7
  intensity=1, // 三盞一起的亮度倍率
  castShadow,  // key 投影，預設 false
}) -> THREE.Group & { key, fill, rim, setIntensity(m), setRimColor(hex), setFaction(f), dispose() }

// 三系環境特效。粒子掛在 figure.group 底下，由 figure.update(dt) 自動推進。
attachFactionFx(figure, faction, { count = 44 /* ≤60 */, seed = 12345 })
  -> { points, count, faction, layerCount, fit(box), setFade(0..1), setVisible(b), update(dt), dispose() } | null

// figure 上新增的兩件
figure.bounds()                    // THREE.Box3 或 null（GLB 未載完）
figure.setFactionFx(faction, opts) // attachFactionFx 底下走的就是這支；傳 null 拆掉
```

### 燈組長怎樣（`FIGURE_LIGHT`，全部【試玩必調】）

| 盞 | 顏色 | 位置（相對掛載點） | 瞄準 | intensity | distance | angle | penumbra |
|----|------|------|------|------|------|------|------|
| key | `#ffeacc` 中性暖白 | (−2.10, 2.05, 1.85) 上前左 | (0.10, 0.42, −0.05) | 34.0 | 7.0 | 0.32 | 0.70 |
| fill | `#5f86e0` 冷藍 | (1.30, 0.72, 0.80) 對側 | (0, 0.42, 0) | 3.4→**7.5** | 4.5 | 0.85 | 0.90 |
| rim | `#f0a840` 燈籠色 | (0.50, 1.62, −1.45) 後上 | (0, 0.62, 0) | 10.0 | 4.2 | 0.52 | 0.65 |

分工：key 負責形體（**中性色**才還得了毛色，用系色會又變回單色染）、
fill 負責暗部與冷暖對比、rim 負責把輪廓從夜紫背景切開。
`faction` 只把 rim **混進** 35% 系色，不整盞換掉——0.55 時陰氣系的整條側身與尾巴
都被染成青綠，剛救回來的毛色與條紋又不見了。

---

## ④ 指令與實際輸出

### 本機伺服器（8800 埠）

```
$ python -m http.server 8800 --bind 127.0.0.1   # PID 87498，用完已 kill
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8800/tests/tools/creature-preview.html
200
```

### 截圖與量測

```
$ node .claude/lookdev/shoot.mjs .claude/lookdev/shots .claude/lookdev/jobs-final.json
[
 { "file":"final-after-1.png","query":"n=1&auto=0&light=1&fx=0",
   "fps":129.87,"drawCalls":21,"loadMs":164,"particles":0,"lights":7,
   "gl":"ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)","errors":[] },
 { "file":"final-after-2.png",…,"fps":126.58,"drawCalls":21,"errors":[] },
 { "file":"final-after-3.png",…,"fps":126.58,"drawCalls":21,"errors":[] },
 { "file":"final-lightoff.png","query":"n=1&auto=0&light=0&fx=0","fps":126.58,"drawCalls":21,"lights":4,"errors":[] },
 { "file":"final-fx-xianghuo.png","query":"…&fx=1&rim=xianghu","drawCalls":23,"particles":44,"lights":7,"errors":[] },
 { "file":"final-fx-zuling.png",  "query":"…&fx=1&rim=zuli",   "drawCalls":22,"particles":44,"lights":7,"errors":[] },
 { "file":"final-fx-yinqi.png",   "query":"…&fx=1&rim=yinqi",  "drawCalls":22,"particles":44,"lights":7,"errors":[] },
 { "file":"final-n8.png","query":"n=8&light=1&fx=1",
   "fps":125.0,"drawCalls":149,"loadMs":96,"particles":352,"lights":7,"errors":[] },
 { "file":"final-n8-off.png","query":"n=8&light=0&fx=0",
   "fps":125.0,"drawCalls":133,"loadMs":87,"particles":0,"lights":4,"errors":[] },
 { "file":"final-burn.png","query":"n=1&auto=0&light=1&fx=1","phase":"burn",
   "fps":125.0,"drawCalls":24,"particles":44,"errors":[] }
]
```

```
$ node .claude/lookdev/mask.mjs shots/plate.png shots/before-1.png \
      shots/before-{1,2,3}.png shots/final-after-{1,2,3}.png shots/final-lightoff.png
{ "plate":"plate.png","maskSrc":"before-1.png","maskPixels":261393,"maskPctOfFrame":32.27,"thresh":12,
  "results":[
   {"img":"before-1.png",      "meanL":0.1422,"maxL":0.7504,"clippedPct":0,"bgMeanL":0.0688,"figOverBg":2.068},
   {"img":"before-2.png",      "meanL":0.1395,"maxL":0.7641,"clippedPct":0,"bgMeanL":0.0702,"figOverBg":1.988},
   {"img":"before-3.png",      "meanL":0.1414,"maxL":0.7866,"clippedPct":0,"bgMeanL":0.0693,"figOverBg":2.041},
   {"img":"final-after-1.png", "meanL":0.2830,"maxL":0.9501,"clippedPct":0,"bgMeanL":0.1113,"figOverBg":2.542},
   {"img":"final-after-2.png", "meanL":0.2791,"maxL":0.9465,"clippedPct":0,"bgMeanL":0.1129,"figOverBg":2.473},
   {"img":"final-after-3.png", "meanL":0.2824,"maxL":0.9465,"clippedPct":0,"bgMeanL":0.1117,"figOverBg":2.528},
   {"img":"final-lightoff.png","meanL":0.1419,"maxL":0.9091,"clippedPct":0,"bgMeanL":0.0690,"figOverBg":2.056}]}
```

### 效能（LD-A3）

量測位置：**頁面自己的 rAF 迴圈**（`tests/tools/creature-preview.html:198-203`），
每幀記一次 `now` 差值、取最近 240 筆的中位數；`drawCalls` 是關掉 `renderer.info.autoReset`、
每幀開頭手動 `reset()` 之後讀到的**整幀**數字（含 bloom 四趟）。與試作卷 CP-A3 同一支探針。

| 場景 | fps 中位數 | draw calls | 粒子總數 | 燈數 |
|------|-----------|-----------|---------|------|
| `?n=8&light=0&fx=0`（試作卷基準） | 125.0 | 133 | 0 | 4 |
| `?n=8&light=1&fx=1` | **125.0** ≥50 ✅ | **149**（+16） | **352**（8×44） | 7 |

+16 個 draw call ＝ 8 隻 × 2 層（香火系是煙＋火星兩個 `Points`；另外兩系只有一層，
同樣情境下只會 +8）。三盞燈是同一批 uniform，不增加 draw call；
`customProgramCacheKey` 仍固定成同一支 program，26 隻不會各編一份 shader。

### 燒毀沒被弄壞

`final-burn.png`：dissolve 掃到一半、燒邊發燈籠色的光、灰燼照噴，特效跟著身體淡出。
`draw calls 24`（21 ＋ 特效兩層 ＋ 灰燼）。

### `?glb=` 可用（三個造型方案要靠它拍 LD-A2）

```
$ node .claude/lookdev/shoot.mjs … jobs-glb.json     # ?glb=tiger.glb
  "file": "glbparam.png", "loadMs": 203, "particles": 44, "errors": []
```

### 範圍（LD-A4）

**先講清楚這個 worktree 的狀況**：它的 HEAD 是 `a8ccfc5`，**不是**派工單寫的 `b2292f5`——
建立時 `main` 還沒有試作卷（`3cacb19`）與驗收條件（`b2292f5`）這兩個 commit，
所以 `js/creature-figures.js`、`tests/tools/creature-preview.html`、`assets/creatures/*`
在這個 worktree 裡**一開始並不存在**。我先把 `b2292f5` 裡與本卷相關的路徑
原封不動取進工作樹當基準，再在上面改。

因此 `git diff --stat` 在這裡**沒有意義**（那些檔對 HEAD 而言全是未追蹤的新檔，
diff 是空的）。範圍改用**不依賴 index 的內容雜湊比對**來證明——
把工作樹每個檔的 `git hash-object` 跟基準 commit 的 blob 直接比：

```
$ sh .claude/lookdev/scope.sh
assets/creatures/tiger.claims.json                   SAME  基準原封不動
assets/creatures/tiger.glb                           SAME  基準原封不動
assets/creatures/tiger.json                          SAME  基準原封不動
docs/experiments/2026-09-04-acceptance-creature-lookdev.md SAME  基準原封不動
docs/experiments/2026-09-04-creature-pilot-idle.png  SAME  基準原封不動
docs/experiments/2026-09-04-creature-pilot-report.md SAME  基準原封不動
docs/experiments/2026-09-04-creature-pilot-shoot.json SAME  基準原封不動
js/creature-figures.js                               DIFF  ← 我改的
tests/tools/creature-preview.html                    DIFF  ← 我改的
--- 本卷不准動的四個檔：跟 HEAD 逐位元組比對 ---
js/scene-env.js                                      SAME  與 HEAD 一致
js/renderer.js                                       SAME  與 HEAD 一致
js/duel-figures.js                                   SAME  與 HEAD 一致
index.html                                           SAME  與 HEAD 一致
```

**只有兩個檔是 DIFF，就是本卷被允許動的那兩個**；驗收條件檔、試作卷的 GLB 與報告
一個位元組都沒動；本卷不准動的四個檔跟 HEAD 逐位元組相同。

改動內容還在（未 commit），量得到的規模是 `js/creature-figures.js` +407 行、
`tests/tools/creature-preview.html` +39 行（合併前在 index 尚未清掉時實測的
`git diff --stat`：`2 files changed, 433 insertions(+), 13 deletions(-)`）。

逐檔對應需求：`js/creature-figures.js`＝三燈組＋材質可讀＋emissive＋三系特效鉤子（L 段全部四項）；
`tests/tools/creature-preview.html`＝`?light`／`?fx`／`?glb` 開關與量測掛勾。
牌桌 J7 基準不受影響。**無 commit、無 push**（`git rev-parse HEAD` 仍是 `a8ccfc5`）。

**給合併的人**：index 已經 `git reset -q` 清乾淨（不加 `--hard`，工作樹的改動都在）。
現在 `git status` 裡全部是 `??`；要併的只有 `js/creature-figures.js` 與
`tests/tools/creature-preview.html` 兩個檔的**內容**，其餘 `??` 不是我的產物：
`assets/creatures/*` 與 `2026-09-04-creature-pilot-*`／`-acceptance-creature-lookdev.md`
是從 `b2292f5` 取來的基準（併 `b2292f5` 之後自然就有），
`2026-09-04-lookdev-*` 則是本卷的截圖與這份報告。

---

## ⑤ 取捨與做不到的事

1. **霧：維持吃霧（`fog` 沒關）。** 量了才決定：`FOG_DENSITY.duel = 0.115`，
   hero 距離 2.3m 的洗白量是 `1 - exp(-(0.115×2.3)²) ≈ **6.8%**`，
   遠不足以「把形體吃掉」（真正吃掉形體的是單一橘光，不是霧）。
   關掉 `fog` 換得的 6.8% 對比，不值得賠掉整層空氣感與遠近關係。
   **但 `?n=8` 的後排在 4.5m 處洗白量是 23.5%**——正式接線若要把 26 隻排深，
   到那時再考慮把 figure 材質的霧改成「距離打折」而不是整個關掉。
   環境特效那一層則是 `fog: false`：它們貼在妖身上不到一個身位，吃霧只會讓系色變灰。
2. **`?light=0` 不等於「完全退回改動前」。** 它退掉三燈組，但材質改動（方向性邊光、
   眼睛自發光）仍在。量出來平均亮度只差 0.35%（0.1419 vs 0.1414），
   峰值則從 0.7504 升到 0.9091（就是那顆金瞳）。
   **本報告的 before 一律用改動前的原始程式碼拍的**，不是用 `?light=0` 充數。
3. **`castShadow` 預設關。** SpotLight 的陰影只要一張 shadow map（比 PointLight 的
   cube map 便宜六倍，這也是選 SpotLight 的順帶好處），但仍是每幀多一趟 render，
   而且要呼叫端自己開 `renderer.shadowMap.enabled`、把 mesh 設 `castShadow`、
   桌面設 `receiveShadow`——那會動到 `scene-env.js`，本卷不准動。
   介面留著（`createFigureLightRig({castShadow:true})`），**沒有實測過**。
4. **香火系比另外兩系多一個 draw call。** 煙要大、柔、不發光，火星要小、亮、加光，
   `PointsMaterial` 的 `size` 與 `blending` 都是整組共用的，一個 `Points` 做不到兩種。
   改用自訂 `ShaderMaterial` ＋ per-point size 可以壓回一個，但那要自己重寫
   size attenuation 與 viewport 高度耦合，為了 8 個 draw call 不划算。
5. **頂點色的色彩管理鏈是對的，不是它吃掉對比。** 逐條查過：
   GLTFLoader 在有 `COLOR_0` 時會設 `material.vertexColors = true`（本 GLB 有，
   `hasCOLOR_0: true`）；glTF 的 `COLOR_0` 規格是線性值，three 的 `<color_fragment>`
   直接相乘，**沒有多做一次 sRGB 解碼**；`renderer.toneMapping` 是 `NoToneMapping`，
   render target 是線性，唯一一次 linear→sRGB 由 `js/bloom.js` 的合成 shader 做（外加 ACES）。
   ⇒ 對比不是被色彩管理吃掉的，是**只有一種高飽和橘光**造成的，所以修的是燈不是色彩管理。
   我沒有加任何「拉飽和／拉 gamma」的旋鈕——那會蓋掉三個造型方案自己調的顏色。
6. **自發光為什麼要乘頂點色。** anyCreature 出的 GLB 每顆材質 `baseColorFactor` 都是
   `[1,1,1,1]`，金瞳／火口的顏色**全在 `COLOR_0` 裡**。直接拿 `material.color` 當 emissive
   會得到一顆白燈泡。所以注入 `totalEmissiveRadiance *= vColor`——非發光材質的 emissive
   是黑的，乘什麼都還是黑，**對所有材質注入同一份程式碼是安全的**，那把固定的
   `customProgramCacheKey` 也才保得住（`USE_COLOR` / `USE_COLOR_ALPHA` 兩個分支都寫了，
   三個造型方案的 GLB 不保證 `COLOR_0` 都是 vec3）。
7. **`eye` 的自發光是在 `tiger.glb` 上驗的**（它有 `eye` 材質，見截圖裡發光的金瞳）。
   `mouth_glow`／`glow_*` 兩種命名**只驗到「名字比對的正則會中」，沒有實際模型可試**——
   V-C 妖火虎交出來之後要補拍一次。
8. **沒有在真手機上量過。** 同試作卷 CP-A3 的範圍，只做到桌機（AMD Radeon 780M / D3D11）。
   +16 draw call、+352 顆粒子、+3 盞燈，手機**應該**還好，但這是推論不是量測。
9. **調參途中量錯過一次，已修治具。** `mask.mjs` 原本拿「第一張傳進來的圖」當遮罩來源，
   我少傳一個參數就變成拿 after 自己當遮罩，數字整組漂掉。
   已改成遮罩來源必須是獨立的第 2 個參數、且輸出裡明寫 `maskSrc`。
10. **品味的部分沒有交叉驗證。** 頭頂那圈暖色光暈（額頭金印 `seal` 材質被 key 打到、
    再被 bloom 放大）我當成「神性」留著；也可以讀成「過曝的髒點」。
    `maxL 0.95`、過曝像素 0.00%，數字上不算過曝，但這是**品味判斷**，
    主對話合併後統一重拍時可以一句話推翻（把 `FIGURE_LIGHT.key.intensity` 從 34 調到 26 即可）。
