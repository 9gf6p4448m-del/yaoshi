# 驗收條件凍結 — 3D 量產卷：26 隻妖怪（模板＝丙 妖火虎）＋設計簡報（2026-09-04）
基準 SHA：見 commit。使用者裁定（2026-09-04）：虎爺印三方案選 **丙 妖火虎**（`assets/creatures/tiger_c.*`）為 26 隻量產模板。
主對話裁定的「模板」指**語彙**而非造型：硬轉折（`smooth_angle` 28–34）、炭黑／深色底＋一條高飽和**系別色帶**、1–3 個發光部位（材質名 `eye`／`mouth_glow`／`glow_*`）、系別環境特效由 `attachFactionFx` 供給。
系別色語彙：香火＝陰火橘紅（`--c-xianghu-light`）、祖靈＝金粉土黃／骨白（`--c-zuli-light`＋`--c-gold`）、陰氣＝冷鬼火青綠（`--c-yinqi-light`）；詛咒品＝紫（`--c-curse-light`）。
體型語彙：swarm＝矮小、可橫排 N 隻、左右對稱；elite＝單尊、佔滿高度、招牌部位大；haunt＝下半身虛化／飄浮（骨架可用短腿或無腿）、半透明材質名 `ghost_*`；ward＝矮壯、有盾／符牌／門神感、正面寬。
四件 POOL 沒有 `ab` 鍵的法寶，檔名由主對話指定：巴冷公主珠鍊＝`balen`、山豬牙飾＝`boartusk`、香灰符＝`ashcharm`、陰陽眼銅錢＝`yinyangcoin`。

## 第 0 步：設計簡報（先做、主對話審過才量產）
產出 `docs/experiments/2026-09-04-creature-briefs.md`：26 列（tiger 除外），每列必含：`ab`、法寶名、**召出的妖怪是什麼**（一句，台灣本土神話／民俗／原民／鬼怪語境，與法寶說明對得上）、體型、系別色帶落在哪、1–3 個發光部位、招牌剪影部位（側視一眼認得的那一件）、招式 trait 演出時會動的部位。
驗收 B-A0：26 列一個不缺；B-A1：體型與系別逐列與下表一致；B-A2：招牌剪影 26 個互不重複（同體型同系也分得開）；B-A3：每列 ≤70 字，主對話一眼可審。

## 量產（每批 2 隻平行、opus、各自 worktree；批間主對話合併）
每隻：`assets/creatures/<ab>.{json,glb,claims.json}`（從 `tiger_c.json` 複製起手；claims 的 saturation 帶 10–60）；截圖 `docs/experiments/2026-09-04-creature-<ab>-hero.png` 與 `-stage-lit.png`（用 `tests/tools/creature-shoot.mjs`，`rim=` 依系別 xianghu／zuli／yinqi）。
派工必附：試作報告 §③ 七陷阱＋猛虎報告 ⑤ 六陷阱（含 `shading.noise` 會把近黑擾成高飽和）＋神像虎報告的「坐姿體型要等比 ×0.8 才進得了鏡頭」。
驗收（每隻）：
M-A0 GLB ≤400KB；`idle/move/attack`；judge 全綠；silmetrics 側視＋hero 過。
M-A1 盲讀（context-free ×2，hero＋stage-lit 兩張）：兩位都說出「這是什麼」且與簡報概念同類（讀到「船靈／划船的人」算對拼板舟）；主印象不得為玩具／可愛；最多 3 輪，第 3 輪未過交最佳版標「未過」。
M-A2 體型：swarm 必附 `?n=3` 橫排截圖不穿幫；haunt 必附下半身虛化截圖；ward 必附正面寬度 ≥ 側面寬度的數字。
M-A3 發光部位材質名存在於 GLB materials（列出）。
M-A4 `git diff --stat` 只含自己的 `assets/creatures/<ab>.*` 與截圖；不動其他檔。

## 不得做
不改 index.html／js／既有 creatures；不改 anyCreature 引擎；不 commit 不 push。

## POOL 27 件（自 index.html 抽出，量產 26 隻＝去掉 tiger）
| # | ab(檔名) | 法寶 | 系 | 價 | 體型 | 隻 | atk/hp | 招(trait) | 法寶說明 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | bow | 射日神弓 | zuling | 7 | elite | 1 | 10/8 | eliteOpenShot | 射落烈日的太初之弓 |
| 2 | shield | 百步蛇紋盾 | zuling | 6 | ward | 2 | 1/7 | wardHpFront2 | 排灣祖靈的鱗紋守護 |
| 3 | balen | 巴冷公主珠鍊 | zuling | 6 | elite | 1 | 9/6 | eliteArmor | 人蛇之戀的琉璃信物 |
| 4 | eye | 祖靈之眼 | zuling | 5 | ward | 2 | 1/6 | wardFirst | 注視子孫的山林之眼 |
| 5 | thunder | 雷女之火 | zuling | 5 | elite | 1 | 8/5 | boltGamble | 雷神之女擲下的天火 |
| 6 | boat | 拼板舟 | zuling | 4 | swarm | 3 | 1/2 | swarmHalfSplash | 達悟人渡海的飛魚之舟 |
| 7 | boartusk | 山豬牙飾 | zuling | 4 | swarm | 1 | 2/2 | swarmThorn | 勇士獵得的榮耀之牙 |
| 8 | xianji | 獻祭刀 | zuling | 6 | elite | 1 | 9/7 | eliteSelfCut | 祭儀用的黑曜石刃，割開自己才靈 |
| 9 | shanshen | 山神庇佑 | zuling | 4 | ward | 2 | 1/5 | wardHpAll1 | 山神只護惜命的人 |
| 10 | flag | 媽祖令旗 | xianghuo | 7 | ward | 2 | 1/8 | wardAtkAll1 | 海上聖母的鎮瀾令 |
| 11 | sword | 王爺劍 | xianghuo | 6 | elite | 1 | 9/6 | eliteCleave | 代天巡狩的斬瘟之劍 |
| 12 | wangchuan | 送王船 | xianghuo | 6 | ward | 2 | 1/7 | wardAbsorb4 | 載走瘟神的燒王船 |
| 13 | bell | 千里眼銅鈴 | xianghuo | 5 | ward | 2 | 1/6 | wardImmuneLost | 望盡千里的預示銅鈴 |
| 14 | wuying | 五營旗 | xianghuo | 5 | swarm | 3 | 1/3 | swarmRally | 五方神將的令旗 |
| 15 | tiger | 虎爺印 | xianghuo | 4 | elite | 1 | 7/4 | biteGamble | 咬鬼鎮煞的虎爺神印 |
| 16 | ashcharm | 香灰符 | xianghuo | 4 | ward | 2 | 1/5 | wardHpFirst | 廟裡求來的平安香灰 |
| 17 | fushou | 福壽綿長 | xianghuo | 3 | ward | 2 | 1/4 | wardRegen1 | 添了油的長明燈，越滿越亮 |
| 18 | pojun | 破軍旗 | xianghuo | 2 | swarm | 1 | 1/1 | swarmLastStand | 殘破的軍旗，插在心口才有力氣 |
| 19 | redhat | 魔神仔紅帽 | yinqi | 7 | haunt | 4 | 0/7 | hauntLost | 山中牽人迷途的紅帽 |
| 20 | hairpin | 林投姐髮簪 | yinqi | 6 | haunt | 4 | 0/6 | hauntSteal | 林投樹下的怨情之簪 |
| 21 | chair | 椅仔姑竹椅 | yinqi | 6 | haunt | 3 | 0/6 | hauntSee | 問事通靈的三姑竹椅 |
| 22 | raincoat | 黃色小雨衣 | yinqi | 5 | haunt | 4 | 0/5 | hauntDread1 | 雨夜裡跟在你身後 |
| 23 | buoy | 水鬼浮標 | yinqi | 5 | haunt | 4 | 0/5 | hauntSwap | 渡不了的人留下的 |
| 24 | nail | 虎姑婆指甲 | yinqi | 4 | elite | 1 | 7/4 | eliteVsSwarm | 床下傳來咬手指的聲音 |
| 25 | yinyangcoin | 陰陽眼銅錢 | yinqi | 4 | swarm | 2 | 1/3 | swarmPierce | 貼上眼皮就看得見 |
| 26 | guoyin | 過陰咒 | yinqi | 5 | haunt | 4 | 0/5 | hauntFearX2 | 半條命踩在那邊，才聽得見那邊的話 |
| 27 | sigui | 飼鬼甕 | yinqi | 3 | swarm | 2 | 1/1 | swarmFeed1 | 甕裡養的東西，餓了就吃主人的命 |
