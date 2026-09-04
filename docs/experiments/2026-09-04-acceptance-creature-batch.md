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

## 2026-09-04 修訂（主對話，使用者授權的美術決策者；使用者可否決）
**M-A1 對 haunt 體型的口徑**：原文「主印象不得為玩具／可愛」是以精英（虎爺）為對象寫的；作祟類的民俗身分本就是小妖（魔神仔＝牽人迷途的小妖、椅仔姑＝少女、黃色小雨衣＝孩童），「可愛」與「詭異」在這類角色上並存才是對的。
改為：haunt 的兩位盲讀主印象**須含詭異／不祥／陰森／幽靈任一**，「可愛」不單獨否決；其餘體型維持原文。
為什麼現在才知道：redhat 三輪六位讀者 6/6 讀成妖怪／幽靈、5/6 讀到漂浮，卡的只有「可愛」一詞——量到的是體型的民俗身分，不是品質。
依此口徑 redhat 通過（6/6 幽靈／妖怪、5/6 漂浮、「詭異漂浮妖怪」出現於第 2 輪）。已出貨版 r16 收貨。

## 2026-09-04 使用者指示後的美術守則（全 27 隻適用，優先於上面 haunt 口徑修訂）
使用者原話：「遊戲的設計理念是精緻且要往遊戲大作去走，可愛不是我們想要看到的，妖怪有妖怪的樣子，符合妖市這個設計風格，全程交給你來設計。」
主對話據此定調：**這些是深夜妖市裡真的會害死你的東西。** 每隻都要讓讀者第一句說出「詭異／兇／威／不祥」之一，「可愛」不得出現在任何一位讀者的主印象——haunt 的 2026-09-04 修訂只保留「不要求威嚇」，其餘回到原文（可愛＝未過）。
**手段（每隻至少用三項）**：①比例拉長或壓扁——頭身比離開玩偶區（頭 ≤ 身高 1/4 或 ≥ 1/2，不落中間）②尖：耳、指、牙、帽、鰭一律尖端外露 ③眼：空洞、單眼、豎瞳、無眼或發光點，禁圓大眼 ④不對稱：一側殘缺、一肢特長、歪頭 ⑤骨感：肋、脊、關節外露 ⑥細長指或爪 ⑦嘴：裂到耳、無嘴、縫合 ⑧色：深底＋一條高飽和帶，禁粉嫩／糖果色。
**禁止**：圓臉圓眼、短胖圓潤剪影、微笑、Q 版比例、亮麗淺色底、玩偶式對稱站姿。
**smooth_angle 統一 24–30**（更硬），profile 允許凹段（配 `caps:"none"`）。
**回修卷**：redhat 已收貨但列入回修——拉長身形、指爪、帽沿破口、眼改空洞，時機＝26 隻做完後與其他「可愛」項一起回修。
