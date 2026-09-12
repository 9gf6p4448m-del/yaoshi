# ROADMAP_V2 進度對照（2026-09-12，基準 main `417b197` v0.55）

> 讀者：製作人。目的：回答「藍圖每一項落地到哪、還剩什麼、照什麼順序做完」。
> 三態只依證據（commit SHA／檔案:行號），由 fresh Explore agent 蒐證、主對話覆核；蒐證原檔見 §4。
> 藍圖本文 `docs/ROADMAP_V2.md` 不動；§1 已知過時處見覆審 `2026-09-10-roadmap-v2-review.md` §11。

## 0. 一句話
**38 項：已上線 6、部分 1、未動 31。** 已落地的集中在 Top 2 步驟 1（三級分級 0.54）與 Top 1 步驟 1（掏空 0.56a）；Top 3 整段（幽靈／夜行錄／妖幣）與 §2 留存層零起步。

## 1. 逐項三態（38 列）
| 藍圖章節 | 項目 | 狀態 | 證據 | 相關計畫/覆審檔 |
|---|---|---|---|---|
| §2.1 | 角色與法寶初始全開（無數值碾壓） | 已上線 | index.html:1057 ROLES 10 筆全數可選、index.html:170 一帶皆無 unlock／gate 邏輯（僅 .rcard.taken＝同局已被別人選走，非解鎖機制）；查過關鍵字 unlock/解鎖/gate 皆無進度門檻碼 | 無專屬提案（既有基準事實，非本次交付） |
| §2.2 | 角色熟練度橫向流派分支切換（3選1） | 未動 | 查過關鍵字「熟練度」「mastery」「流派」「Side-grade」「variants」於 index.html／js/*.js：僅命中 d9b2e22（選角說明排版「流派徽章」＝UI 文字排版，與熟練度系統無關，經 git show d9b2e22 核實）；git log --all -i --grep 同關鍵字亦僅此一筆無關 commit | docs/proposals/2026-09-10-roadmap-v2-review.md §9（僅「建議」設計，未落地：「無玩家檔案物件」「ROLES 是單版本被動，沒有 variants／loadout 這類切換層」） |
| §2.3 | 角色道地語音包 | 未動 | 查過關鍵字「語音包」「台語」「閩南語」「voicePack」於 index.html／js/*.js：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2 第6點（「語音包…先做字幕版台詞，語音後補」，未做） |
| §2.3 | 紙紮戰鬥特效VFX（異色鬼火/命中特效/碳化灰燼） | 未動 | 查過關鍵字「幽綠冷火」「純黑煞炎」「純白淨火」「skinId」「cosmetic」於 index.html／js/*.js：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2 第5點（「沒有『皮膚 id』抽象層」） |
| §2.3 | 牌桌個性化外觀（桌布/桌面/燈籠皮） | 未動 | 查過關鍵字「老檜木桌」「八卦黃絹」「停屍石板」「燈籠皮」於 index.html／js/*.js：零命中；--table/--table2 僅單一固定值（index.html:21-25），無 SKINS 切換表 | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2 第5點 |
| §2.3 | 專屬「盯」字印章 | 未動 | 查過關鍵字「硃砂血玉印」「青銅饕餮印」「生鏽引魂鈴」於 index.html／js/*.js：零命中；markStampHTML（index.html:4090-4094）為單一固定 src，無皮膚表 | docs/proposals/2026-09-10-roadmap-v2-review.md §9.1（「沒有『皮膚 id』抽象層」） |
| §2.3 | 角色桌面實體信物 | 未動 | 查過關鍵字「香爐」「算盤」「字花明牌」「信物」於 index.html／js/*.js：零命中（唯一「信物」命中為法寶名「巴冷公主珠鍊」index.html:1980，與本項無關） | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2 第5點（「角色桌面信物是3D資產…走美術卷」，未排程） |
| §3.1 | 法寶連鎖（Artifact Chains） | 未動 | 查過關鍵字「CHAINS」「連鎖」「Artifact Chain」「雙虎滅煞」「千眼神算」「水陸偷渡」於 index.html／js/*.js：僅命中 index.html:3066「得標後的連鎖」（既有毒標塞入袋子機制的既有連鎖字義，與跨系法寶連鎖系統無關）；git log --all -i --grep="連鎖\|CHAINS\|雙虎滅煞" 零相關 commit | docs/proposals/2026-09-10-roadmap-v2-review.md §2（僅「建議設計：一張 CHAINS 表」，明白是提案，未實作） |
| §3.2 | 誅心（Bluff Slam） | 未動 | 查過關鍵字「誅心」「Bluff Slam」於 index.html／js/*.js：零命中；git log --all -i --grep 同關鍵字零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §12.1（僅列出可用的既有資料點，判定函式與轉場均未寫） |
| §3.2 | 借刀（Poison Kill） | 未動 | 查過關鍵字「借刀」「Poison Kill」：僅命中既有心願卡「借刀傷人」wish_poison（index.html:1466，屬既有心願系統，非本轉場演出）；無鏡頭切受害者／批紅文字的轉場代碼 | docs/proposals/2026-09-10-roadmap-v2-review.md §12.1 |
| §3.2 | 連鎖破陣（Chain Awakening） | 未動 | 依附法寶連鎖系統，該系統本身未實作（見上）；git log --all -i --grep="連鎖破陣\|Chain Awakening" 零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §12.1（「連鎖本身未實作」原句） |
| §3.2 | 命懸一線（Death's Edge） | 未動 | 查過關鍵字「命懸一線」：僅命中既有 UI 文字標籤 faceLbl()（index.html:4221，壽命≤1/3時的臉色描述字串），非「壽命≤5逆轉獲勝」全屏破曉轉場演出；git log --all -i --grep 無相關 commit | docs/proposals/2026-09-10-roadmap-v2-review.md §12.1 |
| §3.3 | Tier 1（常規攻擊減法提速 200~300ms） | 已上線 | index.html:4327 TRAIT_MS_BY_TIER:{1:260,2:900,3:1400}；commit cbbcfca「v0.54 祖靈系 9 支 Tier 1 短版（260ms 原生時間軸）」、107bce8（香火系）、0a9a9ab（陰氣系）；VERSION_NOTE（index.html:2091）：「一般拍…走 27 支專屬 260ms 短版時間軸」 | docs/proposals/2026-09-10-plan-fx-tiers.md；docs/experiments/2026-09-10-acceptance-fx-tiers.md |
| §3.3 | Tier 2（單位燒毀中型節奏，實際900ms） | 已上線 | index.html:4327 「2:900」；commit 8204f97「v0.54 合併招式三級視覺分級（拍級三級 260/900/1400…）」 | docs/proposals/2026-09-10-plan-fx-tiers.md；docs/experiments/2026-09-10-acceptance-fx-tiers.md |
| §3.3 | Tier 3（請神傳奇三尊/法寶連鎖全屏大招） | 已上線（連鎖部分未動） | index.html:4327 「3:1400」；js/camera-director.js:128 CINEMA 機位；commit 4ea8a19「v0.54 Tier 3：CINEMA機位…+1400ms」；三尊大招 eliteBlind／wardGuardAll／hauntAnswer 見 VERSION_NOTE | docs/proposals/2026-09-10-plan-fx-tiers.md；docs/experiments/2026-09-10-acceptance-fx-tiers.md（法寶連鎖大招因§3.1未做而不適用） |
| §4.1 | 單機模式：妖市夜行錄／角色列傳 | 未動 | 查過關鍵字「夜行錄」「角色列傳」於 index.html／js/*.js：零命中（僅 docs/ROADMAP_V2.md 本文與覆審檔提及）；現有 solo 模式僅為「打AI」，無章節解鎖/劇本 | docs/proposals/2026-09-10-roadmap-v2-review.md §10（列為「補」，僅建議） |
| §4.1 | 休閒自由桌（PVP） | 未動 | 查過「WebSocket」「fetch」聯機相關：零連線碼命中（fetch 僅載入 SVG／音檔）；mode 僅有 solo／hotseat（同機），無任何多人連線對戰 | docs/proposals/2026-09-10-roadmap-v2-review.md §13.1（「零連線碼：WebSocket／XMLHttpRequest／BroadcastChannel 零命中」原句） |
| §4.1 | 排位天梯賽 | 未動 | 查過關鍵字「天梯」「ladder」「排位」於 index.html／js/*.js：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §10 |
| §4.2 | 民俗段位天梯階級 | 未動 | 查過關鍵字「生人」「引路客」「通幽使」「開壇法師」「陰陽掌櫃」「夜巡城隍」「判官玉印」於 index.html／js/*.js：零命中；av 僅為單一 emoji 字串（index.html:942），無頭像框掛點 | docs/proposals/2026-09-10-roadmap-v2-review.md §10（補）、§11 勘誤（「av 是單一 emoji 字串，沒有框的掛點」） |
| §5.2 | 非同步幽靈PVP（Ghost Draft）技術規格 | 未動 | 查過關鍵字「Ghost Draft」「幽靈殘影」「ghostDraft」「GHOST_」於 index.html／js/*.js：僅命中既有事件機制 CFG.GHOST_DMG（index.html:806起，「厲鬼索命」異事，與非同步幽靈PVP無關）；「Supabase」「Cloudflare」零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §4（「建議：幽靈＝同種子桌…」，僅設計提案未落地） |
| §5.3 | 即時連線（Real-Time WebSockets） | 未動 | 查過「WebSocket」「房間碼」：零命中，同§4.1休閒自由桌證據 | docs/proposals/2026-09-10-roadmap-v2-review.md §13（「零連線碼」「引擎完全同步（同機）」） |
| §6.1 | 老檜木供桌木紋反光 | 未動 | 查過關鍵字「木紋」「檜木」於 js/scene-env.js／js/renderer.js：零命中；桌面材質為 MeshStandardMaterial(0x6b3418) 純色無貼圖 | docs/proposals/2026-09-10-roadmap-v2-review.md §14.1（「桌面是純色 MeshStandardMaterial，無貼圖」原句）、§14.2（D8待裁，未做） |
| §6.1 | 燈籠點光源軟陰影（PCFSoftShadowMap） | 未動 | 查過關鍵字「PCFSoft」於 index.html／js/*.js：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §14.1（「shadowMap 從未啟用」原句，renderer.js:80-93） |
| §6.1 | 桌角香灰、符咒殘卷 | 未動 | 查過關鍵字「香灰」「符咒殘卷」於 js/scene-env.js：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §14.2（「香灰與符咒＝幾何片＋頂點色可做」，屬待做建議） |
| §6.2 | 桌心3D托盤陳列 | 未動 | 查過「table-tray」「托盤」：無 js/table-tray.js 檔案（find . -iname "*table-tray*" 零結果）；index.html:170 「#tray{display:none}」（「非掏空頁與直式一律不存在意義」）；VERSION_NOTE 明言「桌面本身仍是平面，托盤／木紋是 0.56b」而 0.56b 未見合併 commit | docs/proposals/2026-09-10-plan-table3d.md（0.55b／0.56b 段落，檔案清單含 js/table-tray.js 新檔，尚未建立） |
| §6.2 | UI穿透與Raycaster解決方案 | 未動 | 查過「Raycaster」於 index.html／js/*.js：僅命中註解 index.html:685「#tray 是掏空後桌心的透明命中層，0.55b 才接 Raycaster」，代表尚未實作；index.html:2422 同樣是「0.55b 會在這裡算 NDC→hitTest」的未來式規劃註解 | docs/proposals/2026-09-10-plan-table3d.md |
| §6.2 | 3D銅錢/木製籌碼下標 | 未動 | 查過關鍵字「銅錢」「木製籌碼」於 index.html／js/*.js：零相關命中（「陰陽眼銅錢」為既有法寶名 index.html:2002，與下標籌碼演出無關） | docs/proposals/2026-09-10-roadmap-v2-review.md §3／§12（「銅錢與令牌＝演出事件」，列為待做） |
| §6.2 | 血玉令牌「盯」上拍桌動畫 | 未動 | 查過關鍵字「血玉令牌」於 index.html／js/*.js：零命中 | docs/experiments/2026-09-10-acceptance-table3d.md（使用者裁定 Q9「血印令 3D 拍桌另開 0.55c」，該卷未見合併 commit） |
| §6.2 | 桌角對手信物 | 未動 | 查過關鍵字「香爐」「算盤」「字花明牌」於 index.html／js/*.js：零命中（同§2.3角色桌面實體信物證據） | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2 第5點 |
| §7 Top1步驟1 | 重構#table／#felt DOM佈局掏空 | 已上線 | commit 262c157「v0.56a 合併拍賣桌整片掏空版面卷（出價／盯上頁掏空、側欄168px、?table3d=0、觸控逐一tap回歸）」；index.html:156-170 #felt.hollow CSS；index.html:2381 TABLE3D kill switch | docs/proposals/2026-09-10-plan-table3d.md；docs/experiments/2026-09-10-acceptance-table3d.md |
| §7 Top1步驟2 | js/scene-env.js增加拍賣階段3D托盤位置＋複用assets/creatures/*.glb | 未動 | 同「§6.2桌心3D托盤陳列」證據：無js/table-tray.js，js/scene-env.js未見托盤/GLB載入拍品程式碼 | docs/proposals/2026-09-10-plan-table3d.md（0.55b段落列為待做檔案，未建立） |
| §7 Top1步驟3 | Raycaster點擊檢視＋「盯上血印令」拍桌實體動畫 | 未動 | 同「§6.2 UI穿透與Raycaster」「§6.2血玉令牌」證據：僅有未來式規劃註解，無實作 | docs/proposals/2026-09-10-plan-table3d.md；docs/experiments/2026-09-10-acceptance-table3d.md Q9 |
| §7 Top2步驟1 | trait-fx/*.js 27套招式提速至200~300ms | 已上線 | 同「§3.3 Tier 1」證據：index.html:4327 TRAIT_MS_BY_TIER:{1:260}；commits cbbcfca/107bce8/0a9a9ab | docs/proposals/2026-09-10-plan-fx-tiers.md；docs/experiments/2026-09-10-acceptance-fx-tiers.md |
| §7 Top2步驟2 | 設計首批6組跨系法寶連鎖＋市集UI金光引線動態提示 | 未動 | 同「§3.1法寶連鎖」證據：CHAINS表未建立，零commit | docs/proposals/2026-09-10-roadmap-v2-review.md §2（僅建議設計） |
| §7 Top2步驟3 | 傳奇三尊與連鎖大招製作（camera-director.js Letterbox壓暗＋45度仰視特寫） | 部分 | 已落地：CINEMA低角度仰視機位（js/camera-director.js:128，commit 4ea8a19）與三尊大招演出（VERSION_NOTE eliteBlind/wardGuardAll/hauntAnswer）；未落地：Letterbox黑條已被移除——commit 1516b9a「v0.54收尾版：黑邊letterbox移出本卷（§2.1修訂七）」，且VERSION_NOTE（index.html:2091）原句「黑條letterbox經五輪覆審後由使用者裁定移出本卷」；「連鎖大招」因法寶連鎖系統未做而不存在 | docs/proposals/2026-09-10-plan-fx-tiers.md；docs/experiments/2026-09-10-acceptance-fx-tiers.md |
| §7 Top3步驟1 | 建立Supabase／Cloudflare Worker幽靈上傳與拉取端點 | 未動 | 查過關鍵字「Supabase」「Cloudflare」「WebSocket」於index.html／js/*.js／docs/*.md（除ROADMAP與覆審檔本身）：零命中，fetch僅用於載入靜態資源 | docs/proposals/2026-09-10-roadmap-v2-review.md §4.2第6點（「後端：…上傳要一個寫入端點（Cloudflare Worker + KV／D1最簡）」，屬建議未做） |
| §7 Top3步驟2 | 搭建「妖市夜行錄」前3章單機關卡（青面/收驚婆/紅衣婆婆） | 未動 | 同「§4.1單機模式：妖市夜行錄」證據：零命中 | docs/proposals/2026-09-10-roadmap-v2-review.md §10 |
| §7 Top3步驟3 | 接入「妖幣」局後結算與首期外觀抽卡介面 | 未動 | 查過關鍵字「妖幣」「gacha」「扭蛋」於index.html／js/*.js：零命中；reviewSummary()（index.html:3793-3804）回傳欄位不含幣值/抽卡 | docs/proposals/2026-09-10-roadmap-v2-review.md §9.2第4點（「妖幣結算＝一支純函式…」，屬建議未做） |


補充（主對話覆核）：
- §6.1「牌桌大氣環境」的**燈光層**已有：全域 ACES 色調映射、四盞燈籠不同色溫、漸層夜空＋遠景剪影、暈角（VERSION_NOTE「夜市燈火」）；藍圖點名的三個子項（木紋反光／軟陰影／香灰符咒）才是未動。
- §6.2 五個子項與 Top 1 步驟 2／3，使用者 2026-09-12 裁定**全部做真 3D、歸 0.56b 上桌卷**（見 memory `project_yaoshi_0906_design` 09-12 段）；table3d 凍結檔裡的 0.55b／0.55c 編號一律併入 0.56b。
- §3.3 Tier 3「Letterbox 壓暗」被 0.54 §2.1 修訂七移出（`1516b9a`），使用者裁定留給招式可辨性卷連同對決版面安全區重做——它仍是待辦，掛在可辨性卷。

## 2. 剩餘工作分卷與建議順序

順序依覆審 D4（Top 2 步驟 1 → Top 1 → 連鎖 → 幽靈最後）與 09-12 裁定排；每卷開卷走 R7 拷問＋凍結檔，本表只定「哪些藍圖項歸哪一卷」。

| 序 | 卷 | 涵蓋藍圖項 | 前置／依賴 | 狀態 |
|---|---|---|---|---|
| 1 | **招式演出卷**（取代可辨性卷批 1–3，計畫 `2026-09-12-plan-fx-performance.md`） | Top 2 步驟 1 的品質收尾（27 支「本體動作＋紙紮道具＋受招反應」）；Tier 3 的 letterbox 安全區重做 | 09-12 晚方向重定；語彙定稿；香火批 1（9 支）**已上線 v0.55.6**（機械閘門全綠、三輪覆審；P4 三輪未過記已知＝身分可辨系統問題）；祖靈批階段 A **已上線 v0.55.7**（身分可辨語彙 §A9、`st.pillar`、範本獻祭刀簽字、香火套用）；階段 B 進行中（8 支＋道具 anchor＋祖靈真值表＋18 支 P4 材料），之後香火＋祖靈一起重跑 P4（新的三輪） | **進行中** |
| 1b | **三尊在場感小卷**（2026-09-12 晚遊玩回饋：請神三尊不明顯、被前排擋） | 不屬藍圖項；補 §1.2 第 7 系統的在場感 | 事實：三尊零特殊待遇（倍率共用、小前大後排陣、矮模型不放大、有應公半透明無影、無常駐光效）；裁甲＋乙（站位第二排中央＋紙紮基座＋legend 倍率 1.35＋實體化；待機光效＋尊名牌＋進場一次低角度）；新治具量遮擋比例；丙（鏡頭）記待辦 | 進行中 |
| 2 | **0.56b 上桌卷** | §6.2 托盤陳列／Raycaster／銅錢籌碼／血玉令牌／四席信物；Top 1 步驟 2、3；§2.3「信物」的 3D 基底 | 0.56a 已上線；需 R7 拷問（托盤上幾件、信物四席各是什麼物件、令牌音效） | 未開卷 |
| 3 | **連鎖卷** | §3.1 CHAINS＋首批組數＋金光引線；§3.2③ 連鎖破陣；Top 2 步驟 2、步驟 3 的「連鎖大招」 | **硬規則 3：改賽局規則，開卷前要使用者裁 D2（公開性、3 組或 6 組）**；六之四優勢策略窮舉當閘門 | 未開卷 |
| 4 | **轉場卷** | §3.2 ①誅心 ②借刀 ④命懸一線 | 覆審 §12 已列各自的既有資料點；純演出 | 未開卷 |
| 5 | **環境卷** | §6.1 木紋反光／軟陰影／香灰符咒 | D8（ART_BIBLE 無貼圖要不要為環境開例外）；陰影只能牌桌開對決關（覆審 §14） | 未開卷 |
| 6 | **幽靈卷** | §5.2 幽靈 payload／Worker 端點／同種子桶匹配；Top 3 步驟 1 | D3（建議甲：同種子桶精確重播）；策略契約要補異事選擇與選尊入口（覆審 §4.2，可順連鎖卷補欄位） | 未開卷 |
| 7 | **夜行錄卷** | §4.1 單機章節前 3 章；Top 3 步驟 2 | 章節＝固定 seed＋固定對手＋台語志怪劇本（覆審 §10）；座位參數是新參數（`SELECT_ON`、`MODES.seats`） | 未開卷 |
| 8 | **妖幣與皮膚卷** | §2.3 五類皮＋妖幣結算；Top 3 步驟 3；§2.2 流派（D5） | 先做「皮膚 id 抽象層」；PROFILE 撞到 C-A6「localStorage 無新增 key」凍結條，要先解凍（覆審 §7.5） | 未開卷 |
| 9 | **天梯卷** | §4.1 排位天梯；§4.2 段位／賽季／頭像框 | D6（建議甲：幽靈上線後先做非同步天梯、匿名 id）；`av` 要加 `frame` 欄位 | 未開卷 |
| 10 | **即時連線卷** | §5.3 WebSocket／好友房／Ghost Fallback；§4.1 休閒自由桌 | 鎖步同步、逾時裁決為權威輸入、commit-reveal 三相位（覆審 §13）；最後做 | 未開卷 |

## 3. 開卷前要製作人拍板的題（覆審 §7 八題的現況）

| 題 | 內容 | 現況 |
|---|---|---|
| D1 桌心 3D 範圍 | 甲視窗／乙整片掏空／丙先不做 | **已裁乙**（0.56a 整片掏空上線） |
| D4 開卷順序與 Tier 1 數字 | 0.54 先做；甲 500ms 保留個性／乙 260ms 通用短招 | **已裁**：0.54 走「27 支專屬 260ms 短版」（兩者之外的第三條，已上線） |
| D2 連鎖公開性與首批規模 | 建議「公開啟動、不公開內容」＋首批 3 組 | **待裁**（卷 3 開卷前） |
| D3 幽靈匹配模型 | 建議甲 同種子桶精確重播 | 待裁（卷 6） |
| D5 流派與全開公平 | 建議甲 流派一開始三選一全開、熟練度只解鎖皮膚與章節 | 待裁（卷 8） |
| D6 天梯與帳號時機 | 建議甲 幽靈後做非同步天梯、Worker 匿名 id | 待裁（卷 9） |
| D7 送神決策時機 | 建議甲 夜初密封預先宣告；單機期不必動 | 待裁（卷 10 才需要） |
| D8 環境貼圖例外 | 建議甲 先試頂點色＋幾何 | 待裁（卷 5） |

## 4. 蒐證原檔與方法
- 蒐證 agent：Explore（sonnet），2026-09-12；方法＝`git log --oneline --all -i --grep=<關鍵字>`、`grep -n` index.html／js/、docs/experiments 與 docs/proposals 檔名與首段、`index.html:2091` VERSION_NOTE。
- 每個「未動」列都寫明查過的關鍵字與檔案；每個「已上線」列都有 SHA 或 檔案:行號。
- 主對話覆核：§6.1 燈光層、0.55b/0.55c → 0.56b 併卷、letterbox 去向三處補充（見 §1 補充）。

## 5. 待辦（不屬任何藍圖項，順手記）
- `judgePix`（`tests/tools/dmg-readability.mjs`）側三件既有缺陷，見 `docs/experiments/2026-09-12-l10-determinism-report.md` §5.5；排在招式演出卷之後（修訂六 ⑤）。
