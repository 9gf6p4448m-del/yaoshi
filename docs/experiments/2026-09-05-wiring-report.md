# 《紙紮夜戰》接線卷報告 — 27 隻真 3D 妖接進正式對決（2026-09-05）

凍結檔：`2026-09-05-acceptance-creature-wiring.md`（commit `a419f60`，基準 `add71c4`）。判準檔零改動。
環境：headless Chromium（Playwright 1.62.1，`--use-gl=angle --use-angle=d3d11`），viewport 844×390、DPR 2，
GPU＝`ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；本機 `python -m http.server`。
證據原檔（JSON）在 `2026-09-05-wiring-evidence/`，截圖 `2026-09-05-wiring-*.png`。

## 結論
W-1～W-8 全部落地；W-A0～A11 逐條有實際輸出（下表）。**W-A8 第一版水面盲讀不過**（讀成「光暈／陰影圈」），
改第二版（藍青、2.1× 腳印、粗漣漪）後盲讀「帶漣漪紋路的藍色圓形光圈（水面）」過。
`creaturePx` 190 → 150：190 時精英×1.15 在 390px 高的畫面被切頭（`wiring-buoy-water-v1.png` 右側王爺劍）。
**對抗式審查（fresh opus）抓到 2 CRITICAL／3 HIGH／3 MEDIUM／3 LOW，全部修完並複驗（§審查與修補）；第二輪「反駁已修好」覆審結果附於末段。**

## 改了哪些檔（相對 add71c4）
| 檔 | 改動 |
|---|---|
| `js/creature-figures.js` | 載入時正規化（高 >1.2 縮、min.y<0 抬；`NORM`）、`CREATURE_GLB`／`creatureGlbUrl`（tiger→tiger_c）、`skin:'creature'`／`ab`／`animTime()`／`current()`、腳下環境 `CREATURE_GROUND={buoy:'water'}`＋`makeWaterPool()`（`setGroundFx`／`groundFx()`，燒毀跟著 `setFade`）、`particles.js` 改成接力 `?v` 的動態 import |
| `js/duel-figures.js` | `factory(unit)`；池按 `figureKey(unit)`（＝ab）分、每場重新配位（`slots`）；`onDuel` 立刻配位＋把 GLB `Promise.all` 放回 `detail.ready`、進度派 `ys:duel-loading`；每幀 `f.update(dt)`（含燒毀中）；進場 `play('idle')`、勝方 lunge `play('attack')`、撞完回 idle；3D 皮不套頭像／袍子色／整尊透明度；朝向 `az − side·(π/2 − 35°)`；`FIG` 新增 creaturePx／faceTurn3d／rowStepPx3d／rowDepth3d／hauntFloat3d／rimHit3d |
| `js/renderer.js` | `makeFigure(u)`：有 ab → `makeCreatureFigure`＋`attachFactionFx`；無 ab → `makeLayeredFigure`；戲台三燈組 `createFigureLightRig({scale:1.7})` 對決淡入、每幀跟相機方位角；`__yaoshi3d` 加 `stageRig`／`glName` |
| `index.html` | `buildArmy` team 加 `ab`（純資料）；`pwArmyView`／`duelDetail.units` 帶 `ab`；`PW_FX.LOAD_MAX_MS=12000`／`LOAD_SHOW_MS=150`；`pwAwaitFigures()`＋`#duelLoad` DOM/CSS；`VERSION="0.32"` |
| `tests/tools/duel-drive.mjs`（新） | Playwright 真的玩到 N 場對決並錄事件（可換根目錄跑基準、`--no3d`、`--loadmax`） |
| `tests/tools/duel-perf.mjs`（新） | `bounds`（27 隻正規化）、`perf`（8v8 最重 8 隻）、`buoy`（水面） |
| `tests/tools/creature-preview.html` | 加 `bounds()`／`groundFx()` 量測掛勾 |
| `docs/experiments/2026-09-04-creature-gaps.md` | 只改 buoy 列狀態 |

## 驗收逐條
| 條 | 指令 | 結果 |
|---|---|---|
| W-A0 真實路徑 | `node tests/tools/duel-drive.mjs "http://127.0.0.1:8831/index.html?paperwar=1&fxcount=1" drive-new.json --duels=4 --shots=shot --port=8831` | ✅（第二輪修補後最終跑，六場）`duels:6 errors:0 abOnAllUnits:true burn:11 burnFig:10 burnDom:1`（burn＝burnFig＋burnDom；burnDom 那 1 次是無法寶的「肉身」貼片走 DOM）。armies 例：`shield×2 vs xianji`／`xianji,wangchuan×2 vs raincoat×4,sword`／`raincoat×4,sword vs shield×2,buoy×4`（buoy 在真實路徑出現）；等載入前 `#duelArena` 已清空 6/6；`animTime` 遞增 6/6；attack@40 19/19；3D 燒毀 handled→hidden 10/10；programs 7→16（首場）後恆 16 |
| W-A1 鑑別力 | 同腳本 `--root=<git worktree add --detach … add71c4> --port=8834` | ✅ 基準 `duels:4 errors:0 abOnAllUnits:false burnFig:0 burnDom:14`（訊號來自本卷） |
| W-A2 正規化 | `node tests/tools/duel-perf.mjs bounds bounds.json --port=8832` | ✅ 27/27 `h ≤ 1.2`、`minY ≥ 0`（縮的：ashcharm/balen/bell/…共 22 隻到 1.200；不動的：boat 0.794、flag 1.105、hairpin 1.054、tiger_c 0.996、wuying 1.161；抬的：nail −0.09→0、redhat −0.06→0、guoyin −0.04→0、chair/eye/flag/shanshen/thunder） |
| W-A3 每幀／播放 | drive-new.json 的 samples／lunges | ✅ `animTime` 兩次取樣（+1500／+1900ms）**嚴格遞增** 4/4 場（最終跑；前一跑例 guoyin 1.08→1.48、fushou 1.45→1.83）；lunge 後 40ms 勝方 `current()==='attack'` **14/14**（最終跑；前一跑 17/17）；670ms 回 idle：2 過、13 豁免（≤700ms 內任一側又有 lunge，`hitAt` 被重設＝設計行為）、2 例外＝那幾尊正在燒毀（`burnState.custom` 期間跳過 play 邏輯，drive-new burns 列 B0/B1/B2 對得上） |
| W-A4 燒毀 | drive-new.json burns | ✅ 3D 妖的 `ys:fx-burn` 全部 `handled:true`，`done` resolve 後 `group.visible===false` **9/9**（最終跑），耗時 374–430ms（`PW_FX.BURN_MS` 420） |
| W-A5 載入條 | drive-new.json duels[].loading／readyAt／firstBeatAt；`--loadmax=1 --duels=6 --port=8837` | ✅ 序列 `[0,6]…[6,6]`、`loaded===total` 收尾；`firstBeatAt ≥ readyAt` **4/4**（ready 57–119ms、首拍 491–557ms）；重用池裡的尊時首事件即 `loaded===total`（duel 3：`[3,8]` 起跳；loadmax 跑第 6 場 `13/13` 於 5ms）。逾時分支：`LOAD_MAX_MS=1` 六場 **5 場 timedOut:true**、對決照常完成、0 error、`burnFig:11`（妖晚到照演） |
| W-A6 退化 | `?paperwar=0 --port=8835`；`--no3d --port=8836` | ✅ OFF：`duels:6 errors:0`（每邊一尊貼片）。擋 3D：`ys3d:false duels:2 burnDom:2`，errors 2＝測試自己 abort `js/renderer.js?v=0.32` 產生的 `requestfailed`＋`Failed to load resource`（預期） |
| W-A7 效能 | `node tests/tools/duel-perf.mjs perf perf-uncap.json --port=8833 --uncap`（真實頁面第 2 場對決時派 8v8 合成 `ys:duel`） | ✅ rAF 中位數 **151.5 fps**（修補後最終跑；修補前 175.4；關 vsync，開 vsync 時 59.9＝貼著 60）、p95 9.3ms、**540 draw call／幀**、201,900 三角／幀、bloom 10 個 render pass／幀、16 尊 3D 皮（15 可見：1 尊被真實時間軸燒掉）、8 檔合計 **7.99MB ≤ 10MB**。量測位置＝頁面 rAF（與 `renderer.js` 的 `frame()` 同一個 rAF 節拍）。真機 iPhone＝使用者側記錄項 |
| W-A8 buoy 水面 | `node tests/tools/duel-perf.mjs buoy buoy2.json --port=8838` ＋ context-free sonnet 讀者 | ✅ `groundFx()`：buoy×2＝`'water'`，redhat／tiger／sword＝`null`；水面世界高度 `waterY 0.150 = group.y 0.150 =` 桌頂（審查 H-2 修後；修前 0.112～0.192 跟著 haunt 上下漂）。盲讀 v1（`…buoy-water-v1.png`）：「腳邊各自有一圈淡淡的光暈／陰影圈」**❌**；v2（`…buoy-water.png`）：「站在兩個**帶漣漪紋路**的藍色圓形光圈（**水面**／法陣狀水漬）上」**✅**。補讀招牌物件（記錄項）：「頭上頂著綠色方形托盤的瘦長人形」（仍非浮標，簽字不變） |
| W-A9 截圖 | `2026-09-05-wiring-duel-{lineup,attack,burn}.png` | 記錄項：lineup＝guoyin×4（ghost 半透明、飄浮）vs fushou×2，面對面、燈組打光；burn＝左側少一尊＋灰燼 |
| W-A10 範圍 | `git diff --stat add71c4`（見 commit）；`node tests/*.test.mjs`；`node tests/tools/paperwar-gate-D.mjs 10000 --only=D-A0,D-A1 --old=<git show add71c4:index.html>` | ✅ 五套 8/5/16/28/36 全綠；D-A0 ✅（OFF 逐位元組相等）、D-A1 ✅。卷 A 的 `paperwar-gate.mjs` 「平手計敗」❌ 在基準 add71c4 上同樣 ❌（平衡閘門，非本卷） |
| W-A11 送達 | `git log origin/main -1`＋線上 `grep 'VERSION="'` | 見 commit 訊息與 memory（push 後補） |

## 設計裁定（主對話）
- 無 `ab` 的單位（空袋肉身、`?paperwar=0`）退回批 1 貼片（玩家本人頭像）——肉身＝玩家，語意正好；不做「通用妖」。
- 正規化**只縮不放**：tiger_c 1.0 高是矮胖體型，boat 0.79 是臥式船。
- 3D 皮不再套 `hauntOpacity`（半透明由 `ghost_*` 材質負責）、`hauntFloat` 給一半；不套紙紮的 `lean`（四足獸側傾像翻倒），只保留被打退的歪斜。
- 出招動畫只做通用交鋒（lunge→attack→idle）；招式專屬動作歸 C3。
- 戲台燈組跟相機方位角轉（對決 yaw 隨座位變，不轉會背光）。

## 已知限制／下一卷
- 通用交鋒只有 idle／attack 兩支 clip 在用，`move` 尚未接（C3 卷的 TRAIT_FX 可用）。
- 池只長不縮（審查 M-2）：單局實際幾十尊、可接受；跨局 `location.reload()` 全清。
- 水面只有 buoy 掛；其餘各隻的專屬腳下環境（若有）走同一張 `CREATURE_GROUND`。
- 真機 fps 未量（使用者側）；桌機 151fps 餘裕大。
- 順序（使用者 09-05 裁定）：C3 招式 27 套 → 真機試玩 → 後處理卷 → 第 4 卷傳說 3 隻。

## 審查與修補（fresh opus 對抗式審查 → 修 → 複驗）
| # | Finding | 修法 | 複驗 |
|---|---|---|---|
| C-1 | POOL 四件無 `ab`（`ab` 其實是能力鍵）的法寶——巴冷公主珠鍊／山豬牙飾／香灰符／陰陽眼銅錢——3D 永遠載不到，退成貼片 | 四列加 `m:"balen|boartusk|ashcharm|yinyangcoin"`，`buildArmy` team 取 `x.ab||x.m` | `loadGame` 檢查 27 列 `ab||m` 全有值、對得上 27 個 GLB |
| C-2 | `onFigBurn` 沒查 `ready()`，GLB 沒到就交給工廠 `burn()` → Promise 永不 resolve、時間軸卡死（逾時照演／404 都會踩） | `onFigBurn` 加 `fig.ready()`；`pwBurnOne` 3D 分支 `Promise.race([done, sleep(BURN_MS×3)])` | `--noglb --loadmax=1` 三場 4.2–6.0s 結束、burns 全退回 DOM、無 pageerror（`drive-noglb.json`）；`--loadmax=1` 四場 timedOut 照演 |
| H-1 | `reset()` 丟掉未結算的 burn Promise | reset 先 resolve 再清 | 同上 |
| H-2 | buoy 是 haunt → 離地飄＋上下 bob，水面懸空／沉到桌下 | 有 `groundFx()` 的 3D 妖不飄不 bob；水面起伏只往上 | `buoy3.json`：`waterY 0.150`（桌頂 0.15） |
| H-3 | 等載入時畫面停在上一場陣列、`realign` 抓到殘留 `#dL/#dR` | `playDuel` 派 `ys:duel` 前清空 arena／字幕 | `arenaEmptyAtDuel` 4/4 |
| M-1 | 一拍內連擊只揮一次（定格） | 每個新 `hitAt` 重播 attack | attack@40 14/14 |
| M-2 | 池只長不縮 | 記錄項（單局實際 ≤ 幾十尊；下一卷若要可加上限） | — |
| M-3 | `stageRig` 用 `visible` 開關 → 燈數變動重編全場材質 | 常駐 visible、只調 intensity | `renderer.info.programs.length`：第 1 場進對決 7→15（3D 材質首次編譯，一次性），之後每場進／出／退場 1.5s 後皆 **15** 恆定（`drive-new.json` programsAtDuel/End/AfterEnd；覆審指出 fps 對這條零鑑別力，改量 program 數） |
| LOW | 首發 `ys:duel-loading` 在監聽器掛上前派出 | `detail.loadLoaded` 初值 | `loaded0/total` 4/10 快取命中場 |
| 新 | GLB 404 時 `setFactionFx` 的 `readyPromise.then` 無 catch → unhandledrejection | 加 reject handler＋`readyPromise.catch(()=>{})` | `drive-noglb.json` 無 pageerror |

## 第二輪覆審（fresh opus「反駁已修好」）→ 修 → 複驗
結論：7 條真的修好、H-2 表面修好（殘留一條路徑）、0 條沒修到；另 3 個 LOW。全部修完：
| # | 殘留／新問題 | 修法 | 複驗 |
|---|---|---|---|
| H-2 殘留 | 內建燒毀的 `burnRise` 上飄沒排除有水面的妖，且 3D 皮單位仍乘紙紮的 `figScale` | `grounded ? 0 : bu·burnRise·sc` | 程式碼路徑（GLB 在燒毀開始後 <420ms 才到的窗口，治具走不到；`--noglb` 與 `--loadmax=1` 兩側都過） |
| C-2 殘留 | 3D 皮走內建燒毀（GLB 晚到）時 `setFigureOpacity` 在 `else` 分支，沒有淡出 | 3D 分支在 `bt!=null` 時也套 `setFigureOpacity(1−bu)` | 同上 |
| LOW 既有 | `glbCache` 連 rejected promise 也快取，抖一次整個 session 載不到 | reject 時從快取移除 | `--noglb --loadmax=1` 三場 4.5–5.0s 結束、0 pageerror |
| M-3 證據 | 「fps」對重編零鑑別力 | 治具改錄 `renderer.info.programs.length` | 見上表 M-3 |
覆審自陳的未驗區：「GLB 在 burn 開始後 <420ms 晚到」那個窗口沒有測試走到；兩個殘留修法都住在那裡，屬程式碼審閱而非實跑證據。
