# N1 連鎖／天命擋點分母（動手前 grep，行號以 3a0d971 為準）

凍結 #3／#7 與計畫 §2「連鎖關閉」：`02 §6.1` 第 7 條「先寫下分母」。

## 分母

指令（在 3a0d971 的 `index.html`、`js/`、`assets/theme.css` 上跑）：

```
grep -n -E 'CHAINS|activeChains|chainsCompletedBy|\.requirements|aiBonus|[dD]estiny|天命' index.html   → 171 行
grep -rn -E '（同上）' js assets/theme.css                                                           → 0 行
grep -rn -i 'chain' js                                                                              → js/table-tray.js:451/528/602（托盤共鳴環讀 market3dItems().chain，衍生自 index.html:2784）
```

**N = 171**（index.html）。分類：擋點源頭 8 處（G0–G7，共 32 行），衍生（經擋點自動失效）102 行，不擋 37 行。

## 擋法摘要（能在源頭擋就不逐處補）

| 擋點 | 位置 | 擋法 | 蓋到哪些 |
|---|---|---|---|
| G0 | `makeState` | 只有帶章節 opts 時：`destinyEffectMode` 依章節（1、2 章 `"off"`、3 章 `"original"`）、`destinyAiChase` 同步；加 `S.chapter`／`S.chainsOff`。常規局一行不走 | `activeTrueDestiny` 全部真效果（白天／夜戰／提示）、`destinyChaseBonus` |
| G1 | `activeChains` | `S.chainsOff` 時回 `[]` | `chainsCompletedBy`、`collectEffects`（→`hasFlag`／`traitMax`／`applyHooks`）、`destinyRecipeHeld`、AI `aiBonus`、補件提示、托盤共鳴環、覺醒橫幅、夜末連鎖列、水陸擋毒 |
| G2 | `buildArmy` | `S.chainsOff` 時跳過連鎖合陣 | 雙虎合陣（不經 activeChains，直接比對 requirements） |
| G3 | `chainStatusDisclosureHTML` | `S.chainsOff` 時回 `""` | 袋子裡「普通連鎖進度 x/6」與六組清單（`chainStatusHTML` 直接列舉 CHAINS） |
| G4 | `openHelp` 連鎖配方段 | `S.chainsOff` 時整段不出 | 規則頁六組配方 |
| G5 | `awakenDestinyOnAuction` | 天命關的章節局回 `null` | 第 2 章（連鎖開、天命關）的覺醒、`destinyPublic`、「🌟 天命覺醒」橫幅、回顧／匯出紀錄 |
| G6 | `destinyLetterHTML` | 天命關的章節局回 `""` | 袋子與他席資訊的「天命密函」 |
| G7 | `openHelp` 天命密函段 | 天命關的章節局整段不出 | 規則頁天命說明 |

「天命關的章節局」＝`S.chapter` 有值且 `S.destinyEffectMode==="off"`；常規 headless（`simulate` 用 `"off"`）不受 G5–G7 影響，所以 trace 與既有量測工具行為不變。

## 逐行表（N=171）

| 檔:行 | 決定 | 理由 | 原文（截 70 字） |
|---|---|---|---|
| index.html:2045 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `const CHAINS={` |
| index.html:2047 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `desc:"出價免買路錢；毒標詛咒入袋銷毀；抓交替免損己身、全隊濺射減半",aiBonus:2,` |
| index.html:2050 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `desc:"明夜預告 3 件；標下預告拍品折讓 1 命；首拍全員先手且敵前鋒 −2 攻",aiBonus:2,` |
| index.html:2052 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `twinTiger:{id:"twinTiger",name:"雙虎滅煞",desc:"虎爺印與虎姑婆指甲合陣，金斑黑虎橫掃撕甲；盯上拍品對` |
| index.html:2056 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `desc:"押命標比價 eff +1；殘血（≤25）全隊 atk +2，首拍自傷反噬敵前鋒 1 血",aiBonus:2,` |
| index.html:2060 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `desc:"入夜免費進獻香火 1（無請神則回 1 命）；開場射日升級為 3 點真傷狙擊且王爺劍撕甲",aiBonus:3,` |
| index.html:2063 | 不擋 | CHAINS 資料表本身；生效與否一律經 activeChains（G1）或 buildArmy（G2）判定 | `desc:"每夜競標開銷返還 1 命；每拍開場本方全隊回 1 血",aiBonus:2,` |
| index.html:2067 | 不擋 | 註解 | `/* 真效果是另一層 effect；普通 CHAINS 不因暗抽而改寫。 */` |
| index.html:2077 | **擋 G1（源頭）** | activeChains：`S.chainsOff` 時回 []；chainsCompletedBy／collectEffects／hasFlag／traitMax／applyHooks／AI 加值／提示全部經此 | `function activeChains(p){` |
| index.html:2080 | **擋 G1（源頭）** | activeChains：`S.chainsOff` 時回 []；chainsCompletedBy／collectEffects／hasFlag／traitMax／applyHooks／AI 加值／提示全部經此 | `return Object.values(CHAINS).filter(chain=>chain.requirements.every(ab` |
| index.html:2083 | 不擋 | drawDestinies：只抽命函 id（crypto，不耗 S.rng）、無介面；第 1、2 章命函不生效由 G0／G5–G7 處理 | `const ids=Object.keys(CHAINS);` |
| index.html:2086 | 不擋 | drawDestinies：只抽命函 id（crypto，不耗 S.rng）、無介面；第 1、2 章命函不生效由 G0／G5–G7 處理 | `throw Error("invalid private destiny draws");` |
| index.html:2089 | 不擋 | drawDestinies：只抽命函 id（crypto，不耗 S.rng）、無介面；第 1、2 章命函不生效由 G0／G5–G7 處理 | `throw Error("invalid private destiny draws");` |
| index.html:2096 | 不擋 | drawDestinies：只抽命函 id（crypto，不耗 S.rng）、無介面；第 1、2 章命函不生效由 G0／G5–G7 處理 | `if(!secure||typeof secure.getRandomValues!=="function") throw Error("s` |
| index.html:2103 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `const DESTINY_DRAW_KEY="yaoshi-private-destiny-v1:";` |
| index.html:2104 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `const destinyDrawMemory=new Map();` |
| index.html:2105 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `function privateDestinyDrawsForSeed(seed,n){` |
| index.html:2106 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `if(destinyDrawMemory.has(seed)) return [...destinyDrawMemory.get(seed)` |
| index.html:2112 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `destinyDrawMemory.set(seed,draws);` |
| index.html:2117 | 不擋 | privateDestinyDrawsForSeed：同上，只存一把命函鍵，無畫面 | `destinyDrawMemory.set(seed,draws);` |
| index.html:2121 | 衍生（G1） | destinyRecipeHeld 經 activeChains | `function destinyRecipeHeld(p){` |
| index.html:2122 | 衍生（G1） | destinyRecipeHeld 經 activeChains | `return !!(p&&CHAINS[p.destiny]&&activeChains(p).includes(CHAINS[p.dest` |
| index.html:2124 | 衍生（G0） | activeTrueDestiny：destinyEffectMode="off" 恆 false（第 1、2 章） | `function activeTrueDestiny(p,id){` |
| index.html:2125 | 衍生（G0） | activeTrueDestiny：destinyEffectMode="off" 恆 false（第 1、2 章） | `return !!(S&&S.destinyEffectMode!=="off"&&p&&p.alive!==false&&p.destin` |
| index.html:2126 | 衍生（G0） | activeTrueDestiny：destinyEffectMode="off" 恆 false（第 1、2 章） | `p.destiny===id&&destinyRecipeHeld(p));` |
| index.html:2129 | **擋 G5** | awakenDestinyOnAuction：第 2 章連鎖開、天命關時仍會覺醒並公告「天命覺醒」→ 章節局天命關時回 null | `function awakenDestinyOnAuction(p,it,wasHeld){` |
| index.html:2130 | **擋 G5** | awakenDestinyOnAuction：第 2 章連鎖開、天命關時仍會覺醒並公告「天命覺醒」→ 章節局天命關時回 null | `if(!p||!it||it.curse||!it.ab||wasHeld||p.destinyAwakened||` |
| index.html:2131 | **擋 G5** | awakenDestinyOnAuction：第 2 章連鎖開、天命關時仍會覺醒並公告「天命覺醒」→ 章節局天命關時回 null | `!CHAINS[p.destiny]?.requirements.includes(it.ab)||!destinyRecipeHeld(p` |
| index.html:2132 | **擋 G5** | awakenDestinyOnAuction：第 2 章連鎖開、天命關時仍會覺醒並公告「天命覺醒」→ 章節局天命關時回 null | `p.destinyAwakened=true;` |
| index.html:2133 | **擋 G5** | awakenDestinyOnAuction：第 2 章連鎖開、天命關時仍會覺醒並公告「天命覺醒」→ 章節局天命關時回 null | `return {pid:p.id,chainId:p.destiny};` |
| index.html:2141 | 衍生（G1） | observeBagMutation（opt-in 量測記錄器）經 activeChains | `for(const chain of activeChains(p)){` |
| index.html:2155 | 衍生（G1） | chainsCompletedBy 前後兩次都經 activeChains | `function chainsCompletedBy(p,item){` |
| index.html:2157 | 衍生（G1） | chainsCompletedBy 前後兩次都經 activeChains | `const active=new Set(activeChains(p));` |
| index.html:2158 | 衍生（G1） | chainsCompletedBy 前後兩次都經 activeChains | `const after=activeChains({...p,bag:[...(p.bag||[]),item]});` |
| index.html:2171 | 衍生（G1/G0） | collectEffects：chains() 經 activeChains；真效果經 activeTrueDestiny | `for(const chain of activeChains(p)) add(chain);` |
| index.html:2172 | 衍生（G1/G0） | collectEffects：chains() 經 activeChains；真效果經 activeTrueDestiny | `if(p&&activeTrueDestiny(p,p.destiny)) add(TRUE_DESTINY_EFFECTS[p.desti` |
| index.html:2341 | 衍生（G6） | destinyProjection 只被 destinyLetterHTML 使用 | `function destinyProjection(p,{viewer=ACTIVE,phase=PRIVATE_PHASE}={}){` |
| index.html:2343 | 衍生（G6） | destinyProjection 只被 destinyLetterHTML 使用 | `const published=!!(S&&S.destinyPublic&&S.destinyPublic[p.id]);` |
| index.html:2345 | 衍生（G6） | destinyProjection 只被 destinyLetterHTML 使用 | `return {chainId:(published||own)?p.destiny:null,awakened:published,pri` |
| index.html:2347 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `function destinyLetterHTML(p,view){` |
| index.html:2348 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `const d=destinyProjection(p,view);` |
| index.html:2349 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `if(!d.chainId) return '<div class="chainStatus">📜 天命密函：？？？（隱密未揭）</div` |
| index.html:2350 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `const c=CHAINS[d.chainId];` |
| index.html:2352 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `const recipe=c.requirements.map(ab=>POOL.find(x=>x.ab===ab)?.n||ab).jo` |
| index.html:2353 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `const paused=d.private&&d.awakened&&!destinyRecipeHeld(p);` |
| index.html:2355 | **擋 G6** | destinyLetterHTML：天命關的章節局回 ""（袋子／他席資訊不出現「天命密函」） | `return '<div class="chainStatus${d.awakened&&!paused?' chainActive':''` |
| index.html:2358 | 衍生（G5） | publishDestinyReveal：沒有覺醒事件就不公開 | `function publishDestinyReveal(result){` |
| index.html:2359 | 衍生（G5） | publishDestinyReveal：沒有覺醒事件就不公開 | `if(!S||!result||!Array.isArray(result.destinyAwakenings)) return false` |
| index.html:2363 | 衍生（G5） | publishDestinyReveal：沒有覺醒事件就不公開 | `for(const event of result.destinyAwakenings){` |
| index.html:2365 | 衍生（G5） | publishDestinyReveal：沒有覺醒事件就不公開 | `if(!p||!p.destinyAwakened||p.destiny!==event.chainId||S.destinyPublic[` |
| index.html:2366 | 衍生（G5） | publishDestinyReveal：沒有覺醒事件就不公開 | `S.destinyPublic[p.id]=true; changed=true;` |
| index.html:2375 | **擋 G3**（在呼叫端） | chainStatusHTML 直接列舉 CHAINS 六組名；唯一呼叫端 chainStatusDisclosureHTML 在 chainsOff 時回 "" | `return Object.values(CHAINS).map(c=>{` |
| index.html:2377 | **擋 G3**（在呼叫端） | chainStatusHTML 直接列舉 CHAINS 六組名；唯一呼叫端 chainStatusDisclosureHTML 在 chainsOff 時回 "" | `const missing=c.requirements.filter(ab=>!owned.has(ab));` |
| index.html:2379 | **擋 G3**（在呼叫端） | chainStatusHTML 直接列舉 CHAINS 六組名；唯一呼叫端 chainStatusDisclosureHTML 在 chainsOff 時回 "" | `return '<div class="chainStatus${active?" chainActive":""}">${active?"` |
| index.html:2383 | 衍生（G1） | chainHintHTML 經 chainsCompletedBy | `return chainsCompletedBy(p,it).map(c=>'<span class="chainHint">✦ 補齊 ${` |
| index.html:2388 | 不擋 | VERSION_NOTE 字串常數，畫面不顯示（grep 只有定義與註解）；本卷 bump 改寫 | `const VERSION="0.57.42", VERSION_NOTE="0.57.42：千眼可讀性——手機橫式打開袋子／私函時「關閉」` |
| index.html:2784 | 衍生（G1） | market3dItems.chain 經 chainsCompletedBy → js/table-tray.js:528 托盤共鳴環 | `chain: (ap && typeof chainsCompletedBy==="function") ? chainsCompleted` |
| index.html:3155 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `function makeState(mode,seed,picks,privateDestinyDraws,destinyEffectMo` |
| index.html:3156 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `if(!["off","original","candidate"].includes(destinyEffectMode))` |
| index.html:3157 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `throw Error("invalid destiny effect mode");` |
| index.html:3167 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `players:seats.map(mkPlayer), destinyPublic:seats.map(()=>false),destin` |
| index.html:3173 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `const destinyDraws=privateDestinyDraws===undefined` |
| index.html:3174 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `?privateDestinyDrawsForSeed(sd,S.players.length)` |
| index.html:3175 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `:drawDestinies(S.players.length,privateDestinyDraws);` |
| index.html:3176 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `destinyDraws.forEach((id,i)=>{` |
| index.html:3177 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `S.players[i].destiny=id;` |
| index.html:3178 | **G0 源頭設定** | makeState：只有帶章節 opts 時覆寫 destinyEffectMode／destinyAiChase 並加 S.chapter／S.chainsOff；常規局不動 | `S.players[i].destinyAwakened=false;` |
| index.html:3227 | 不擋 | newGame 的「無法安全抽取天命密函」只在 crypto 缺失的錯誤路徑、開局前；Chromium／Node 皆有 crypto | `if(e.message!=="secure destiny draw unavailable") throw e;` |
| index.html:3231 | 不擋 | newGame 的「無法安全抽取天命密函」只在 crypto 缺失的錯誤路徑、開局前；Chromium／Node 皆有 crypto | `if(message){message.setAttribute("role","alert");message.textContent="` |
| index.html:3285 | 衍生（G0） | destinyChaseBonus：destinyAiChase=false 即回 0 | `function destinyChaseBonus(p,it){` |
| index.html:3286 | 衍生（G0） | destinyChaseBonus：destinyAiChase=false 即回 0 | `if(!S?.destinyAiChase||!p||p.life<18||!it?.ab) return 0;` |
| index.html:3287 | 衍生（G0） | destinyChaseBonus：destinyAiChase=false 即回 0 | `const recipe=CHAINS[p.destiny]?.requirements;` |
| index.html:3342 | 衍生（G1/G0） | AI 估值：aiBonus 經 chainsCompletedBy；天命追件經 destinyChaseBonus | `base+=chainsCompletedBy(p,it).reduce((sum,chain)=>sum+(chain.aiBonus||` |
| index.html:3343 | 衍生（G1/G0） | AI 估值：aiBonus 經 chainsCompletedBy；天命追件經 destinyChaseBonus | `base+=destinyChaseBonus(p,it);` |
| index.html:3462 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `if(type==="yaming"&&activeTrueDestiny(p,"bloodOath")) base=Math.ceil(a` |
| index.html:3463 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `if(type==="cons"&&S.marks&&S.players.some(op=>op.id!==p.id&&S.marks[op` |
| index.html:3465 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `base=S.destinyEffectMode==="candidate"?Math.min(raised,base+2):raised;` |
| index.html:3470 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `const seen=activeTrueDestiny(p,"eyes")?S.prevPreviewByPid?.[p.id]:S.pr` |
| index.html:3471 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `return !!(seen&&(activeTrueDestiny(p,"eyes")?seen.includes(it):seen.so` |
| index.html:3478 | 衍生（G0） | 白天真效果全經 activeTrueDestiny；destinyDayEvents 只是清空陣列 | `S.destinyDayEvents=[];` |
| index.html:3541 | 衍生（G5） | 開標收集 destinyAwakenings | `const entries=[], withdrawn=[], destinyAwakenings=[];` |
| index.html:3594 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `op.id!==e.p.id&&S.marks[op.id]===i&&activeTrueDestiny(op,"twinTiger")&` |
| index.html:3595 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `(S.destinyEffectMode!=="candidate"||entries.some(x=>x.p.id===op.id))))` |
| index.html:3597 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `baseCost=S.destinyEffectMode==="candidate"` |
| index.html:3599 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `S.destinyDayEvents.push({pid:e.p.id,chainId:"twinTiger",kind:"losePena` |
| index.html:3601 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `if(!isWinner&&e.type==="yaming"&&activeTrueDestiny(e.p,"bloodOath")&&` |
| index.html:3602 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `(S.destinyEffectMode!=="candidate"||!bloodDiscountUsed.has(e.p.id))){` |
| index.html:3605 | 衍生（G0） | 真雙虎／真血祭落標費經 activeTrueDestiny；candidate 分支章節局不會走到 | `S.destinyDayEvents.push({pid:e.p.id,chainId:"bloodOath",kind:"loseGrac` |
| index.html:3637 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `const ward=activeChains(target).find(chain=>chain.flags&&chain.flags.i` |
| index.html:3642 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `const hadRecipe=destinyRecipeHeld(target);` |
| index.html:3645 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `const awakening=awakenDestinyOnAuction(target,it,hadRecipe);` |
| index.html:3646 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `if(awakening) destinyAwakenings.push(awakening);` |
| index.html:3655 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `const hadRecipe=destinyRecipeHeld(winner.p);` |
| index.html:3658 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `const awakening=awakenDestinyOnAuction(winner.p,it,hadRecipe);` |
| index.html:3659 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `if(awakening) destinyAwakenings.push(awakening);` |
| index.html:3668 | 衍生（G1/G5） | 水陸擋毒經 activeChains；覺醒經 destinyRecipeHeld＋G5 | `reveal.push({it,entries,winner,outcome,events,destinyAwakenings,...(po` |
| index.html:3675 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `if(activeTrueDestiny(p,"water")&&S.bidAny.has(p.id)&&!S.wonAny.has(p.i` |
| index.html:3676 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `(S.destinyEffectMode!=="candidate"||paidBy(p.id)>0)){` |
| index.html:3678 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `S.destinyDayEvents.push({pid:p.id,chainId:"water",kind:"emptyHandRelie` |
| index.html:3683 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `const eligible=alive.filter(p=>p.life===lowest&&activeTrueDestiny(p,"e` |
| index.html:3684 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `(S.destinyEffectMode!=="candidate"||(S.bidAny.has(p.id)&&paidBy(p.id)>` |
| index.html:3685 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `const chosen=S.destinyEffectMode==="candidate"&&eligible.length>1` |
| index.html:3690 | 衍生（G0） | 真水陸／真長明經 activeTrueDestiny | `S.destinyDayEvents.push({pid,chainId:"eternalFlame",kind:"lowestRelief` |
| index.html:3831 | 衍生（G0） | 真神王經 activeTrueDestiny | `if(activeTrueDestiny(win,"godKing")){` |
| index.html:3833 | 衍生（G0） | 真神王經 activeTrueDestiny | `if(S.destinyEffectMode==="original") win.destinyTitheExemptRound=S.rou` |
| index.html:3834 | 衍生（G0） | 真神王經 activeTrueDestiny | `(S.destinyDayEvents=S.destinyDayEvents||[]).push({pid:win.id,chainId:"` |
| index.html:3835 | 衍生（G0） | 真神王經 activeTrueDestiny | `kind:"legendGrace",amount:7,exempt:S.destinyEffectMode==="original"});` |
| index.html:3979 | 衍生（G0） | destinyTitheExemptRound 只由真神王設定 | `if(p.destinyTitheExemptRound===S.round){` |
| index.html:3980 | 衍生（G0） | destinyTitheExemptRound 只由真神王設定 | `out.push({pid:p.id,item:x.n,paid:0,destinyExempt:true});` |
| index.html:4090 | **擋 G2** | buildArmy 的連鎖合陣（雙虎）不經 activeChains，直接比對 requirements → chainsOff 時跳過合陣 | `for(const chain of Object.values(CHAINS)){` |
| index.html:4092 | **擋 G2** | buildArmy 的連鎖合陣（雙虎）不經 activeChains，直接比對 requirements → chainsOff 時跳過合陣 | `const found=chain.requirements.map(ab=>items.findIndex((it,i)=>!skippe` |
| index.html:4306 | 衍生（G0） | destinyShield 只由真長明設定 | `if(tgt.destinyShield>0&&amt>0){` |
| index.html:4307 | 衍生（G0） | destinyShield 只由真長明設定 | `const k=Math.min(tgt.destinyShield,amt); tgt.destinyShield-=k; amt-=k;` |
| index.html:4439 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `const trueBlood=activeTrueDestiny(sd.p,"bloodOath")&&!sd.trueBloodUsed` |
| index.html:4455 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(v.hp<=0&&pwBurn(v,foe,env)&&activeTrueDestiny(sd.p,"godKing")&&!sd.` |
| index.html:4495 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(activeTrueDestiny(sd.p,"water")&&` |
| index.html:4496 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `(S?.destinyEffectMode!=="candidate"||(sourceAlive&&!sd.trueWaterUsed))` |
| index.html:4536 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `let a=u.atk+sd.mod+(t.bonus||0)-(u.curseLock||0)-(u.destinyTigerWeaken` |
| index.html:4537 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(sd.trueGodKingBonus&&(S?.destinyEffectMode!=="candidate"||beat===1)` |
| index.html:4544 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `const trueEyes=beat===1&&activeTrueDestiny(sd.p,"eyes");` |
| index.html:4596 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(activeTrueDestiny(sd.p,"eternalFlame")&&` |
| index.html:4597 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `(S?.destinyEffectMode!=="candidate"||sourceAlive)){` |
| index.html:4600 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `u.destinyShield=(u.destinyShield||0)+3;` |
| index.html:4601 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(S?.destinyEffectMode==="candidate"){` |
| index.html:4602 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `u.destinyShield=Math.min(2,u.destinyShield);` |
| index.html:4603 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `u.destinyShieldExpiry=env.beat+1;` |
| index.html:4605 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `pwFire(env,{id:"trueEternalShield",name:"長明渡幽"},'🕯️ 餓鬼進食：${sd.p.name}` |
| index.html:4619 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(S?.destinyEffectMode==="candidate") for(const sd of [X,Y]) for(cons` |
| index.html:4620 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(u.destinyShieldExpiry===beat){ u.destinyShield=0; u.destinyShieldEx` |
| index.html:4641 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(beat===1) for(const [sd,foe] of [[X,Y],[Y,X]]) if(activeTrueDestiny` |
| index.html:4643 | 衍生（G0） | 夜戰真效果（血祭／神王／水陸／千眼／長明／雙虎）全經 activeTrueDestiny 或只由其設定的欄位 | `if(u){ u.destinyTigerWeaken=1;` |
| index.html:4893 | 衍生（G5） | recordAuction 記錄 destinyAwakenings（G5 使其為空） | `...(r.destinyAwakenings&&r.destinyAwakenings.length?{destinyAwakenings` |
| index.html:4943 | 衍生（G5） | replayExport 只輸出已公開的覺醒 | `if(!a.destinyAwakenings) return a;` |
| index.html:4944 | 衍生（G5） | replayExport 只輸出已公開的覺醒 | `const publicEvents=a.destinyAwakenings.filter(e=>S.destinyPublic[e.pid` |
| index.html:4945 | 衍生（G5） | replayExport 只輸出已公開的覺醒 | `const {destinyAwakenings,...rest}=a;` |
| index.html:4946 | 衍生（G5） | replayExport 只輸出已公開的覺醒 | `return publicEvents.length?{...rest,destinyAwakenings:publicEvents.map` |
| index.html:5600 | **擋 G4** | openHelp「✦ 連鎖配方」段逐條列六組連鎖名 → chainsOff 時整段不出 | `${sec("✦ 連鎖配方",Object.values(CHAINS).map(c=>'<div class="descRow"><b>$` |
| index.html:5601 | **擋 G7** | openHelp「🌟 天命密函」段 → 天命關的章節局整段不出 | `${sec("🌟 天命密函",'開局每席私抽一封，可抽到相同連鎖。只有你的指定配方在拍賣入袋時補齊，才公開覺醒；材料離袋後真效果暫停，補回` |
| index.html:5740 | 衍生（G1） | showMarkUI 連鎖覺醒橫幅經 activeChains | `const newChains=activeChains(ap).filter(c=>!CHAIN_SEEN.has('${ap.id}:$` |
| index.html:5759 | 衍生（G1） | showMarkUI 連鎖覺醒橫幅經 activeChains | `const awaken=newChains.map(c=>'<div class="chainAwaken" aria-live="pol` |
| index.html:5846 | 衍生（G1/G0） | showMarket 連鎖覺醒橫幅經 activeChains；「千眼多看」經 activeTrueDestiny | `const newChains=activeChains(ap).filter(c=>!CHAIN_SEEN.has('${ap.id}:$` |
| index.html:5856 | 衍生（G1/G0） | showMarket 連鎖覺醒橫幅經 activeChains；「千眼多看」經 activeTrueDestiny | `const prev='<div class="preview">${who}🔮 明夜預告：${pv.map((x,i)=>'「${x.n` |
| index.html:5865 | 衍生（G1/G0） | showMarket 連鎖覺醒橫幅經 activeChains；「千眼多看」經 activeTrueDestiny | `const awaken=newChains.map(c=>'<div class="chainAwaken" aria-live="pol` |
| index.html:6120 | 衍生（G0） | 真雙虎提示經 activeTrueDestiny | `S.marks[op.id]===sheetIdx&&S.destinyPublic[op.id]&&activeTrueDestiny(o` |
| index.html:6143 | 衍生（G0） | 出價面板落標費說明經 activeTrueDestiny／candidate | `?(S.destinyEffectMode==="candidate"` |
| index.html:6149 | 衍生（G0） | 出價面板落標費說明經 activeTrueDestiny／candidate | `:ruleLose||(activeTrueDestiny(ap,"bloodOath")` |
| index.html:6150 | 衍生（G0） | 出價面板落標費說明經 activeTrueDestiny／candidate | `?(S.destinyEffectMode==="candidate"?"本夜首筆押命落標付 35%，其餘付 50%":"押命落標付 35%` |
| index.html:6345 | 衍生（G5） | 「🌟 天命覺醒」橫幅只在 publishDestinyReveal 有變化時 | `if(publishDestinyReveal(r)) for(const d of r.destinyAwakenings){` |
| index.html:6346 | 衍生（G5） | 「🌟 天命覺醒」橫幅只在 publishDestinyReveal 有變化時 | `const p=S.players[d.pid],c=CHAINS[d.chainId];` |
| index.html:6347 | 衍生（G5） | 「🌟 天命覺醒」橫幅只在 publishDestinyReveal 有變化時 | `$("outzone").insertAdjacentHTML("beforeend",'<div class="outcome chain` |
| index.html:6481 | 不擋 | TRAIT_ITEM 查表；雙虎招名只在 G2 擋掉的合陣隊出場時被讀 | `const TRAIT_ITEM=(()=>{ const m={}; for(const x of POOL) if(x.unit&&x.` |
| index.html:7017 | 衍生（G0） | 「真・連鎖名」招式只由真效果產生 | `const nm=tr?'真・${CHAINS[tr.chain].name}':(TRAIT_ITEM[b.trId]||"法寶");` |
| index.html:7226 | 衍生（G1） | 夜末連鎖列 chainLines 經 activeChains | `const chainLines=aliveHumans().flatMap(p=>activeChains(p).map(c=>'✦ ${` |
| index.html:7487 | **擋 G3** | chainStatusDisclosureHTML：「普通連鎖進度 x/6」與六組清單 → chainsOff 時回 "" | `const active=activeChains(p).length;` |
| index.html:7519 | 衍生（G6） | showBag 的兩處 destinyLetterHTML 呼叫 | `$("modalbox").innerHTML='<h2>${DIRS[pid]}家・${p.name}</h2>${destinyLett` |
| index.html:7533 | 衍生（G6） | showBag 的兩處 destinyLetterHTML 呼叫 | `${destinyLetterHTML(p)}` |
| index.html:7798 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `const otherEffects=collectEffects(p).filter(e=>e!==CHAINS.eyes&&e!==TR` |
| index.html:7820 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `makeState("solo",seed,picks,options?.privateDestinyDraws,options?.true` |
| index.html:7835 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `const destinyNights=options?.recordDestinyEvidence===true?[]:null;` |
| index.html:7845 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `if(destinyNights) destinyNights.push({round:S.round,awakenings:[],dayE` |
| index.html:7874 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `if(destinyNights) destinyNights.push({round:S.round,` |
| index.html:7875 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `awakenings:reveal.flatMap(r=>r.destinyAwakenings.map(e=>({...e}))),` |
| index.html:7876 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `dayEvents:S.destinyDayEvents.map(e=>({...e})),` |
| index.html:7925 | 不擋 | playPolicyGame（headless 量測工具）不走章節 | `...(destinyNights?{destinyNights}:{}),` |
| index.html:8162 | 不擋 | simulate／trace（常規 trace，#1 要求逐位元組不變） | `makeState("solo",seed,undefined,options?.privateDestinyDraws,options?.` |
| index.html:8216 | 不擋 | simulate／trace（常規 trace，#1 要求逐位元組不變） | `{privateDestinyDraws:privateDrawsBySeed?.[s]}))};` |
| index.html:8219 | 不擋 | 測試出口 | `CFG, POOL, CURSES, ABILITIES, CHAINS, TRUE_DESTINY_RULES, TRUE_DESTINY` |
| index.html:8220 | 不擋 | 測試出口 | `collectEffects, activeChains, chainsCompletedBy, canViewPrivateBag, ey` |
| index.html:8221 | 不擋 | 測試出口 | `drawDestinies, destinyRecipeHeld, activeTrueDestiny, previewedItem,` |
| index.html:8223 | 不擋 | 測試出口 | `destinyProjection, destinyLetterHTML, publishDestinyReveal, observeBag` |
| index.html:8241 | 不擋 | 測試出口 | `paperWar, pwSide, pwDeal, pwHaunt, pwFeed, pwClash, duelBags, phaseFor` |
