// 卷 C3（2026-09-05）：27 套招式演出的機械驗收（T-1／T-2／T-3／T-4③／T-7／T-8）＋ 三格截圖。
// 用法：node tests/tools/traitfx-drive.mjs <out.json> [--only=trId,trId] [--reduced] [--throw] [--cancel=15] [--count=8] [--dt=50]
//                                            [--shots=<png 目錄>] [--port=8841] [--tier=2] [--nobloom] [--block=<ab>]
//                                            [--sigdump=<sig 序列檔>] [--root=<靜態根目錄>] [--fxvocab=1]
// --fxvocab=1  打開 v0.55 招式語彙（四支示範招的徽記剪影版）。不帶＝index.html 的
//         PW_FX.VOCAB_ON 預設值 false＝0.54 演出。傳法比照 --tier／--nobloom：接在治具頁的
//         查詢字串上（js/trait-fx.js 在治具頁讀的就是 location.search，見該檔的 VOCAB_ON）。
//                                            [--proto=tigerA|tigerB|tigerC]
// --proto 只是把同名網址參數轉給治具頁（虎爺印原型卷 2026-09-12）：**純轉送**，判定邏輯一行不動。
// --root  http.server 的根目錄與 index.html 的來源（預設＝repo 根）。照 duel-drive.mjs:5 的寫法補的
//         （覆審 r2 N3）：--sigdump 要拿來當「js/trait-fx* 有沒有被動到」的等價證據，就得能對
//         **基準樹**跑同一支治具（基準 SHA 的治具本身沒有 --sigdump，只能由本樹的治具去跑它的靜態檔）。
//         用法：git worktree add --detach <路徑> <基準SHA>（或 git archive 解出來），再 --root=<路徑>。
// v0.54 三級視覺分級（凍結檔 F2／F10）：
//   --tier=1  27 支專屬短版（260ms）。case 集合排除三尊（它們恆 tier 3）。
//   --tier=2  27 支完整版（900ms）＋三尊完整版：與 v0.53 的回歸對照。
//   --tier=3  三尊大招（1400ms）。
//   時長一律由 tests/tools/fx-consts.mjs 取（--ms 已移除），並與 index.html 的 PW_FX 逐鍵比對。
//   --block=<ab>  擋掉那一顆 GLB（T-4 ②）：擋到出招方→該套必須退回 fallback（handled=false）；擋到對面→照演、不炸
//   出招方名冊由 index.html 的 POOL 反查（唯一事實來源，不另抄一份）：trait → {ab|m, body, count, fac}
//   每套：pass A（不出招）錄 N 幀 → resetB → 第 FIRE_AT 幀出招 → pass B 逐幀比 Δ
//   判定（寫進 out.json 的 verdict）：
//     handled     3D 舞台接了（--throw／缺編舞時應為 false）
//     alive       出招後到演完之間任一幀 Δ>EPS 或 mesh>0 或 burst（活性）
//     restored    演完（active==0）之後所有幀 Δ<EPS、mesh==0、wrapped==0（歸零）
//     within      演完的幀 ≤ FIRE_AT + ceil(ms×2/16.67)+2（保險絲之內）
//     reducedOK   --reduced 時 Δ 全程 <EPS（骨骼／model 位移全免），mesh 或 burst 仍可有
//     msOK        頁面實際跑的 run.ms 等於 fx-consts 的 msOf(tier)（防「--tier=1 其實還在跑 900」）
//     rateOK      run.maxRate ≤1.0（tier 1 專用：短版必須原生塞進 260ms，不得靠加速硬擠）
//     actionsOK   非 flinch 的補間條數 ≥2（F10：防「只剩一個閃光」的偷懶短版）
//     sizeState   徽記世界尺寸斷言，**三態**（覆審 r4 MEDIUM-2：made=0 時判 ok 是空真）：
//                 'n/a'＝這一套沒有產出徽記（23 支未改招、--throw／--block，以及 v0.55.1 之後
//                       **不帶 --fxvocab=1 時的四支示範招**（跑的是 0.54 本體）都是這一態，不進總判定）
//                 'ok' ＝violations===0 且 iconLocked===iconMade 且 sizeAudits>0
//                 逐套印的 `u<N>+d<M>` 是**依量測位置分開的稽核次數**（r3 N-2）：
//                 u＝traitFx.update 末、d＝onAfterRender（剛送進 GPU）。這支治具的 d 恆為 0
//                 （治具頁逐幀 step() 但不逐幀 render()），draw 位置的主場是 fx-contrast／duel-drive
//                 'fail'＝其中任一不成立，或拿不到 stats
//                 量的是**效果**：js/trait-fx.js 的 auditSizes() 每幀對每個徽記做
//                 updateWorldMatrix(true,true)＋matrixWorld.decompose()，把世界縮放對「積木自己
//                 最後一次合法寫進去的值（祖先鏈連乘）」比對，並檢查 geometry 身分與父層縮放。
//                 父層 Group 縮放／置換 geometry／自寫 matrix／繞過 scale 鎖四條路都逃不掉。
//                 記帳線是必要的：tween 的 try/catch 會吃掉 throw，pageerror 看不到
//     fillOK      sig.horizon >= run.ms * 0.85（R1 覆審 M1：擋「演完之後乾等」——一版三尊的
//                 horizon 只有 929／1067／1013 對 run.ms 1400，最後三分之一畫面上沒東西在動，
//                 而 clean／onTime／within 全是上界，一條都擋不住）
// 依賴：tools/anyCreature/node_modules/playwright；自起 python http.server。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
/* R2 覆審 N8：worktree 裡沒有 tools/（那是主 repo 的目錄），硬寫一條路會直接 MODULE_NOT_FOUND。
   同 repo 的 duel-drive／lbox-probe／t3-shot／pace-ab 都有兩段候選路徑，這兩支補齊。 */
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

/* 「這一支招會不會產出徽記」——★從原始碼推導，不再靠手工名單★（覆審 r2 L2）。
   r4 MEDIUM-2 的修法是一份寫死的 `EMBLEM_CASES`，但批 1–3 只要忘了把新招加進去，
   那一支的防線失效時一個紅都不會有——手工名單本身就是下一個靜默漏測。
   作法：讀三個系別檔，切到 `export const V054` 之前（0.54 本體不算），
   用 2 空白縮排的 `  trId(st) {` 切出每一支的函式體，看它有沒有呼叫 st.icon／st.icons／st.mark。
   ★只在 `--fxvocab=1` 下成立★：預設（`PW_FX.VOCAB_ON=false`）跑的是 0.54 本體，
   那一版本來就沒有徽記 ⇒ `n/a` 是正確狀態；判紅會是假警報，而假警報會訓練使用者忽略訊號。 */
/** 去掉區塊註解與行註解（★覆審 r1 MEDIUM-1★：不剝註解的話，`xianghuo.js` 裡一段**說明文字**
 *  含字面 `const seal = st.icon(…)`，會讓 `biteGamble`（E 正式版，實際一個 st.icon 都沒呼叫）
 *  被推導成「用到徽記的招」——後果一是 `fx-contrast --only=biteGamble` 判假警報（治具自己的註解寫過
 *  「假警報會訓練使用者忽略這個訊號」），後果二是活性下限對那一格失去鑑別力
 *  （把 V055 那份改名，biteGamble 仍留在名單裡、下限照樣通過）。 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** 逐招掃原始碼，回傳「函式體裡出現過 re 的招名」（**已剝註解**）。 */
function movesMatching(root, re) {
  const out = new Set();
  for (const f of ['zuling.js', 'xianghuo.js', 'yinqi.js']) {
    let src = stripComments(fs.readFileSync(path.join(root, 'js/trait-fx', f), 'utf8'));
    const cut = src.indexOf('export const V054');
    if (cut > 0) src = src.slice(0, cut);
    const heads = [...src.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*\(st\)\s*\{/gm)];
    heads.forEach((h, i) => {
      const body = src.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : src.length);
      if (re.test(body)) out.add(h[1]);
    });
  }
  return out;
}

/** ★P2 的適用範圍（覆審 r1 HIGH-3）★：原始碼裡**真的呼叫過** `st.phase(` 的招。
 *  沒有打點的招（27 支裡還沒轉正、走 0.54 演出的那些）不在名單裡——那不是它們的缺陷，是還沒做。
 *  ★活性下限★：本批轉正的 9 支香火招必須都在名單裡；少一支＝打點被刪光或解析壞了，當場 throw
 *  （沒有這個下限，「把 st.phase 整組刪掉」會讓 P2 的斷言靜默失效＝同一個病換個形狀）。 */
export function phaseCasesFromSource(root) {
  const list = [...movesMatching(root, /\bst\.phase\s*\(/)].sort();
  const MUST = ['biteGamble', 'eliteCleave', 'eliteSelfCut', 'swarmLastStand', 'swarmRally',
    'wardAbsorb4', 'wardAtkAll1', 'wardHpFirst', 'wardImmuneLost', 'wardRegen1'];
  const missing = MUST.filter((t) => list.indexOf(t) < 0);
  if (missing.length) {
    throw new Error(`phaseCasesFromSource 解析壞了或打點被刪光：推導出 ${list.length} 支（${list.join(' ') || '無'}），`
      + `缺少必含的 ${missing.join(' ')}。`);
  }
  return list;
}

/** 預設路徑（`VOCAB_ON=false`、不帶 `--fxvocab=1`）下被 `V054` 覆蓋掉的招。
 *  它們跑的是 0.54 的演出（沒有 `st.phase` 打點），所以 P2 的斷言在預設路徑上不適用——
 *  ★這不是放寬★：同一支招帶 `--fxvocab=1` 時跑的是有打點的那一份，照樣被約束。 */
export function v054CasesFromSource(root) {
  const out = new Set();
  for (const f of ['zuling.js', 'xianghuo.js', 'yinqi.js']) {
    const src = stripComments(fs.readFileSync(path.join(root, 'js/trait-fx', f), 'utf8'));
    const cut = src.indexOf('export const V054');
    if (cut < 0) continue;
    for (const m of src.slice(cut).matchAll(/^ {2}([A-Za-z_$][\w$]*)_v054\s*\(st\)\s*\{/gm)) out.add(m[1]);
  }
  return [...out].sort();
}

/** `--fxvocab=1` 路徑（`VOCAB_ON=true`）下被 `V055` 覆蓋掉的招（＝v0.55 批 0 的徽記剪影版）。
 *  它們是**轉正之前**那一版演出，身分可辨語彙（`st.stance`／`st.groundMark`，2026-09-13）比它們晚，
 *  所以 `stanceOK` 在那條路上不適用——★這不是放寬★：同一支招不帶 `--fxvocab=1` 時跑的是
 *  轉正後那一份，照樣被約束（與上面 `v054CasesFromSource` 對 P2 的處置完全同一條）。
 *  刪光 `st.stance` 想繞過去的由 `tests/fxvocab.test.mjs` 的原始碼掃描擋（少一支就紅）。 */
export function v055CasesFromSource(root) {
  const out = new Set();
  for (const f of ['zuling.js', 'xianghuo.js', 'yinqi.js']) {
    const src = stripComments(fs.readFileSync(path.join(root, 'js/trait-fx', f), 'utf8'));
    const cut = src.indexOf('export const V055');
    if (cut < 0) continue;
    for (const m of src.slice(cut).matchAll(/^ {2}([A-Za-z_$][\w$]*)_v055\s*\(st\)\s*\{/gm)) out.add(m[1]);
  }
  return [...out].sort();
}

export function emblemCasesFromSource(root) {
  const out = movesMatching(root, /\bst\.(icon|icons|mark)\s*\(/);
  const list = [...out].sort();
  /* ★活性下限（覆審 r3 N-3）★：這支推導取代的是手工名單，而手工名單被判有問題的理由就是
     「忘了加就沒有紅」。推導壞掉（縮排變了、`export const V054` 切點位移、正則失配）會**靜默**回 `[]`，
     `sg.expected`／`sg.missing` 跟著變空 ⇒ 「用到徽記卻 n/a」那條判紅恆不成立，同一個病換個形狀。
     對照：`tests/fxvocab.test.mjs` 同一族掃描有三個活性下限，這支原本一個都沒有。
     下限＝批 0 的四支示範招必須在名單裡（它們是 0.55 語彙唯一在用的四支）；
     批 1–3 鋪開之後只會變多，不會變少。少一支就是解析壞了，當場 throw，不留靜默退路。 */
  /* ★2026-09-13 演出卷批 1：`|| <trId>_v055` 這一段是**修一條已經恆假的條件**，不是放寬★
     招式演出卷把招一支一支轉正（`st.paperStamp`／`st.paperProps` 取代平面徽記），
     0.55 的徽記版原地改名搬進 `V055`。轉正之後 `biteGamble`／`wardImmuneLost` 這兩個名字
     **再也不可能**出現在「有呼叫 st.icon／icons／mark 的函式」名單裡——不論實作對錯都過不了，
     那正是 `02 §2.1` 例外條款說的「錯到無論實作對錯都不可能通過」。
     下限的**用意沒有變**：0.55 語彙那四支示範招各要有一份在名單裡（住 MOVES 或住 V055 都算），
     推導壞掉回空陣列照樣當場 throw。祖靈／陰氣那兩批轉正後也走同一條。 */
  const MUST = ['biteGamble', 'eliteSelfCut', 'hauntLost', 'wardImmuneLost'];
  const missing = MUST.filter((t) => list.indexOf(t) < 0 && list.indexOf(t + '_v055') < 0);
  if (missing.length) {
    throw new Error(`emblemCasesFromSource 解析壞了：推導出 ${list.length} 支（${list.join(' ') || '無'}），`
      + `缺少必含的 ${missing.join(' ')}。這支推導沒有活性下限時會靜默回空陣列，`
      + '「用到徽記卻 n/a」那條判紅就恆不成立（覆審 r3 N-3）。');
  }
  return list;
}

const EPS = 1e-3;
const FIRE_AT = 12; // 第幾幀出招（前面幾幀讓 idle 站穩）
let DT_MS = 1000 / 60; // --dt=<ms> 覆寫（治具頁同步吃 &dt=）

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

/** `--fxvocab=1` → 治具頁的 `&fxvocab=1`（v0.55 徽記剪影版）；不帶或 `--fxvocab=0` → 不加參數
 *  ＝ index.html `PW_FX.VOCAB_ON` 的預設值 false ＝ 0.54 演出。
 *  三支走 traitfx-preview.html 的治具（本檔／blindread-sheet／fx-contrast）共用這一支，不各寫一份。 */
export function fxvocabQ(opt) { return (opt && (opt.fxvocab === '1' || opt.fxvocab === true)) ? '&fxvocab=1' : ''; }

/** 從 index.html 的 POOL 反查 27 個 trait 的出招方名冊 */
export function casesFromIndex(html) {
  const out = [];
  const re = /\{n:"([^"]+)",(?:m:"([a-z_]+)",)?f:"([a-z]+)",p:-?\d+,(?:ab:"([a-z_]+)",)?d:"[^"]*",unit:\{body:"([a-z]+)",count:(\d+),atk:\d+,hp:\d+,trait:"([A-Za-z0-9]+)"\}\}/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1], ab: m[4] || m[2], fac: m[3], body: m[5], count: parseInt(m[6], 10), trait: m[7] });
  // 傳說三尊（2026-09-07 美術卷）：LEGENDS 的欄位順序與 POOL 不同（legend:true 夾在 p 與 m 之間），
  // 上面那條 regex 抓不到。它們的 GLB 名＝m（沒有 ab），三招也要走同一組機械驗收。
  // ★v0.54 修：請神 2.0（2026-09-07）在 d 與 unit 之間插了一整段 eff:{...hooks...}，舊 regex 從那天起
  //   一套都抓不到（跑起來只印一行「LEGENDS 反查到 0 套」的 warn，三尊靜默漏測近一個月）。
  //   改成不假設 d 與 unit 相鄰：從 legend:true 起，非貪婪吃到第一個 unit:{...}。★
  // ★2026-09-13 請神存在感卷：LEGENDS 在 n 與 f 之間插了一個純演出欄位 `sn`（頭頂尊名牌的短名），
  //   舊 regex 當場抓到 0 套——這道 `!== 3` 的斷言把它擋紅了（正是它該做的事）。這裡只放寬「n 與 f
  //   之間可以有 sn」，**3 套的下限與其餘欄位一格不動**。 */
  const reL = /\{n:"([^"]+)",(?:sn:"[^"]*",)?f:"([a-z]+)",p:-?\d+,legend:true,m:"([a-z_]+)",[\s\S]*?unit:\{body:"([a-z]+)",count:(\d+),atk:\d+,hp:\d+,trait:"([A-Za-z0-9]+)"\}\}/g;
  while ((m = reL.exec(html))) out.push({ name: m[1], ab: m[3], fac: m[2], body: m[4], count: parseInt(m[5], 10), trait: m[6], legend: true });
  return out;
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function runCase(browser, base, c, opt) {
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier); // 唯一來源＝fx-consts.mjs（已與頁面 PW_FX 逐鍵比對過）
  const N = FIRE_AT + Math.ceil((ms * 2) / DT_MS) + 20; // 保險絲之後再多錄 20 幀看歸零
  const ctx = await browser.newContext({ viewport: { width: 720, height: 405 }, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${opt.count || c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${DT_MS}${opt.throw ? '&throw=1' : ''}${opt.nobloom ? '&bloom=0' : ''}${fxvocabQ(opt)}${opt.proto ? '&proto=' + opt.proto : ''}`;
  if (opt.block) await page.route(`**/assets/creatures/${opt.block}.glb`, (route) => route.abort());
  await page.goto(url, { waitUntil: 'load' });
  // module script 有 top-level await（CDN 的 three ＋ 動態 import），load 之後才慢慢評估完
  try { await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 }); }
  catch (e) { throw new Error(`__tfx 沒出現：${errors.join(' | ').slice(0, 600)}`); }
  await page.evaluate(() => window.__tfx.ready);
  const nA = await page.evaluate((n) => window.__tfx.stepA(n), N);
  await page.evaluate(() => window.__tfx.resetB());
  const programs0 = await page.evaluate(() => window.__tfx.render());
  const progList0 = await page.evaluate(() => window.__tfx.programList());
  const pre = await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  const frames = pre.slice();
  const shots = [];
  // 出招後三格：**依這一 tier 的時長按比例換算幀**（v0.54）。以前寫死 8／22／36，
  // 那是 900ms 的 20%／45%／75%；tier 1 只有 260ms（≈16 幀），22／36 兩格會落在演完之後，
  // contact sheet 就會拍到三張空畫面——「看不出是哪一招」的假象來自截圖點，不是短版本身。
  const shotAt = [0.2, 0.45, 0.75].map((f) => Math.max(1, Math.round((ms * f) / DT_MS)));
  let stepped = 0;
  const cancelAt = opt.cancel ? parseInt(opt.cancel, 10) : -1;
  const plan = [];
  const marks = [...shotAt, ...(cancelAt > 0 ? [cancelAt] : [])].sort((a, b) => a - b);
  for (const m of marks) { if (m > stepped) { plan.push({ n: m - stepped, mark: m }); stepped = m; } }
  plan.push({ n: N - FIRE_AT - stepped, mark: null });
  for (const p of plan) {
    if (p.n > 0) frames.push(...await page.evaluate((n) => window.__tfx.stepB(n), p.n));
    if (p.mark !== null && shotAt.includes(p.mark) && opt.shots) {
      await page.evaluate(() => window.__tfx.render());
      const file = path.join(opt.shots, `${c.trait}-${p.mark}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
    if (p.mark === cancelAt) await page.evaluate(() => window.__tfx.cancel());
  }
  const programs1 = await page.evaluate(() => window.__tfx.render());
  const progList1 = await page.evaluate(() => window.__tfx.programList());
  const pool0 = progList0.slice();
  const newPrograms = progList1.filter((x) => { const i = pool0.indexOf(x); if (i >= 0) { pool0.splice(i, 1); return false; } return true; });
  const sig = await page.evaluate(() => window.__tfx.sig());
  const moves = await page.evaluate(() => window.__tfx.moves);
  const softGl = await page.evaluate(() => window.__tfx.softGl);
  const stats = await page.evaluate(() => window.__tfx.stats());
  await ctx.close();

  const after = frames.filter((f) => f.i >= FIRE_AT);
  const endIdx = after.findIndex((f) => f.active === 0);
  const endFrame = endIdx >= 0 ? after[endIdx].i : -1;
  const during = endIdx >= 0 ? after.slice(0, endIdx) : after;
  const tail = endIdx >= 0 ? after.slice(endIdx) : [];
  const maxD = Math.max(0, ...after.map((f) => (Number.isFinite(f.d) ? f.d : 0)));
  const alive = during.some((f) => f.d > EPS || f.mesh > 0 || f.burst);
  const restored = tail.length > 0 && tail.every((f) => f.d < EPS && f.mesh === 0 && f.wrapped === 0);
  const fuseFrames = Math.ceil((ms * 2) / DT_MS) + 2;
  const within = endFrame >= 0 && endFrame <= FIRE_AT + fuseFrames;
  // 覆審 HIGH-1：演出必須在 TRAIT_MS 內收工（index 只等這麼久），不是只在保險絲內
  const onTime = endFrame >= 0 && endFrame <= FIRE_AT + Math.ceil(ms / DT_MS) + 2;
  const reducedOK = !opt.reduced || after.every((f) => !(f.d > EPS));
  // 演出可讀性小卷 C-2：燈組在出招後 ≤9 幀（150ms）內位移 ≥0.5，收工後 ≤9 幀回到 <0.05
  const rigEarly = after.slice(0, 10).some((f) => f.rig >= 0.5);
  const rigBack = endIdx >= 0 ? after.slice(endIdx + 9).every((f) => f.rig < 0.05) : false;
  const focus = fired.handled ? rigEarly && rigBack : true;
  // 覆審第 3 輪 M-1：stats 要進判定——收工時還有沒演完的（cut）或撞保險絲（fused）都算紅
  const clean = !!stats && stats.cut === 0 && stats.fused === 0;
  // v0.54 F2／F10：run.ms 必須真的是這個 tier 的時長（防「--tier=1 其實還在跑 900」的假綠）、
  // 短版不得靠加速擠進去（maxRate ≤1.0）、時間軸至少兩條非 flinch 的動作。
  // sig 是 null（招式沒演成／沒收工）時三項一律不通過——不拿 null 當通過。
  const msOK = !!sig && sig.ms === ms && sig.tier === tier;
  const rateOK = !!sig && sig.maxRate <= 1.0;
  const acts = sig ? sig.acts : 0;
  const actionsOK = acts >= 2;
  // R1 M1：時間軸要真的填滿這個 tier 的預算，不能演完之後乾等（sig 為 null 一律不過）
  const fill = sig ? sig.horizon / ms : 0;
  const fillOK = !!sig && fill >= 0.85;
  /* ★M1（覆審 r1）：react 是不是量在出招方自己身上★
     js/trait-fx.js 的 evalPhases 註解②：「場上只有他一個人時就量他自己」（不這樣寫這條會恆假）。
     凍結檔 L2 的假綠清單要求「增益招的 react 量在**受益方**身上」，所以 solo 的那一格
     **不算在條文指定的情境下驗過**——它不是紅，是「這一格沒有證據」。
     治具的解法：對自益招（獻祭刀 eliteSelfCut 在 POOL 的 count=1）用 --count=2 再跑一次，
     場上有隊友時 react 就會量在受益方身上（reactSolo=false）。 */
  const reactClaim = sig && sig.phaseDetail ? sig.phaseDetail.find((c) => c.name === 'react') : null;
  const reactSolo = reactClaim ? !!reactClaim.solo : null;
  /* ★P2（因果三段）的機械斷言（覆審 r1 HIGH-3）★
     凍結檔 L2 寫「tier 1 每支 ≥2 段、tier 2 每支 ＝3 段」、計畫 §5 的 P2 寫「phase gate **機械判**」，
     但在這一條加進 pass 之前，那兩句話**沒有任何紅燈**：實測把 `swarmRally` 的 `st.phase('react')`
     整行註解掉，這支治具照樣印 PASS、exit 0，唯一的變化是 `--sigdump` 那一行少了 `react:1`
     ——「三段」是人工讀 sigdump 讀出來的，不是量出來的。
     ★這一條只會讓「段數不夠／該有的段沒打點」的招變紅，不會讓任何壞實作變綠★：
     它是在既有的 pass 上**再 AND 一個條件**，沒有放寬任何既有項；
     `phaseDetail` 是引擎端 evalPhases 逐段量出來的（bone/model/moved vs need），不是喊了就算。
     `--count=2` 時另加一條：react 不得是 solo（solo＝那一格只有施招者自己動過，
     凍結檔 L2 的假綠清單第 3 條講的就是這個情境，見上面 reactSolo 那段註解）。 */
  const phaseOf = (n) => (sig && sig.phaseDetail ? sig.phaseDetail.find((c) => c.name === n) : null);
  const phaseOK = (n) => { const c = phaseOf(n); return !!(c && c.ok); };
  const needThree = tier === 2 || tier === 3;
  /* ★覆審 r2 N3★：solo 的紅燈原本只綁 CLI 的 `--count`，例行批跑（不帶那個旗標）永遠不會紅。
     改成取「**這一套實際上場幾尊**」——CLI 覆寫優先，沒帶就用案例自己的 `c.count`（POOL 的數量）。
     這是**加嚴**：POOL 裡 count≥2 的招（護法×2、兵×3）從此在例行批跑就會被檢查 react 不是 solo。 */
  const countN = Math.max(1, parseInt(opt.count || '0', 10) || (c.count | 0) || 1);
  /* ★適用範圍★：只約束**原始碼裡真的呼叫過 `st.phase(`** 的招（`phaseCasesFromSource`）。
     27 支裡還沒轉正、走 0.54 演出的那些一個打點都沒有——那不是它們的缺陷，是還沒做，
     把它們一起判紅會讓這條斷言一週內被改掉（＝把防線做死）。
     刪光打點想繞過去的那一條由 `phaseCasesFromSource` 的活性下限擋（少一支就 throw）。 */
  const vocabOn = fxvocabQ(opt) !== '';
  const inPhaseScope = (opt.phaseMoves || []).indexOf(c.trait) >= 0
    && !(!vocabOn && (opt.v054Moves || []).indexOf(c.trait) >= 0);
  const phasesOK = !inPhaseScope ? true : (needThree
    ? (phaseOK('windup') && phaseOK('travel') && phaseOK('react') && !(countN >= 2 && reactSolo))
    : (['windup', 'travel', 'react'].filter((n) => phaseOK(n)).length >= 2));
  /* ★身分可辨語彙的執行期斷言（2026-09-13 祖靈批階段 A，語彙檔 §A9）★
     香火批 1 P4 三輪的紅集中在 Q2「作用對象」：2v2 同系同型下讀者分不出誰施招、誰受益。
     語彙的修法是「施招者在**蓄勢段**就有專屬姿態＋腳下系別光語彙」，這一條是它的機械抓手：
       stance.kind   擺了哪一型（`vocab.js` 的 `STANCE_VOCAB`）——null＝根本沒擺
       stance.peak   幅度峰值，要 ≥ `STANCE_GATE.minPeak`（引擎端把門檻一起送出來，治具不另寫一份）
       stance.ground 腳下語彙是哪一種（`FAC_GROUND`）——null＝沒立起來
       onTarget／extra 有沒有人把姿態套到受招方／第二個人身上（積木會 throw，這裡留帳）
     ★適用範圍與 phasesOK 同一條★：只約束原始碼裡真的呼叫過 `st.phase(` 的招（＝已轉正的），
     還沒鋪的 17 支不在範圍內；刪光 `st.stance` 想繞過去的由 `tests/fxvocab.test.mjs` 的
     「已轉正的招必須呼叫 st.stance／st.groundMark」那條擋（那裡是原始碼掃描，這裡是執行期效果）。 */
  const sc = (sig && sig.stance) || null;
  /* ★「有打點」不等於「已轉正」★：
     ① 還留著 `V054` 退路的招（`hauntLost`——陰氣批還沒開）住在 MOVES 的是**批 0 徽記版**，
        它有 `st.phase` 打點但沒有身分可辨語彙（那一版比它早）；`--fxvocab=1` 時跑到的就是它。
     ② `--fxvocab=1` 跑的是 `V055`（批 0 徽記版），同理不在範圍內。
     兩條都**不是放寬**：同一支招轉正之後 V054 退路會被移除、預設路徑跑的是有姿態的那一份，照樣被約束。
     刪光 `st.stance` 想繞過去的由 `tests/fxvocab.test.mjs` 的原始碼掃描擋（少一支就紅）。 */
  const inStanceScope = inPhaseScope
    && (opt.v054Moves || []).indexOf(c.trait) < 0
    && !(vocabOn && (opt.v055Moves || []).indexOf(c.trait) >= 0);
  const stanceOK = !inStanceScope ? true : !!(sc && sc.kind && sc.ground
    && sc.peak >= (sc.minPeak === undefined ? 0.12 : sc.minPeak) && !sc.onTarget && (sc.extra | 0) === 0);
  /* ★徽記**世界尺寸**的執行期斷言（覆審 r3 N11 → r4 HIGH-1 修補批）★
     引擎端 js/trait-fx.js 的 auditSizes() 每幀量效果本身（世界縮放 × geometry 單位寬），
     和「積木自己最後一次合法寫進去的值」比對；違規記進 stats，治具在這裡判。
     為什麼記帳線是必要的：run 的 tween 迴圈對 update 是 try/catch（一段壞了不擋整招），
     光 throw 會被吃掉、pageerror 也看不到。
     ★為什麼斷言不是「world scale === ICON.sizeOf(kind)」★：四支示範招都有合法的呼吸縮放
     （ICON 基準 × 相對倍率），那種等式在健康態就是假的（會變成恆紅的儀式）。
     ★三態（r4 MEDIUM-2）★：made===0 時 violations===0 且 locked===made 恆成立＝空真，
     所以那一套判 'n/a'（沒量到），不計進總判定；四支示範招若掉到 'n/a' 由 main() 判紅。 */
  const sizeGuard = {
    violations: stats ? (stats.sizeViolations | 0) : -1,
    made: stats ? (stats.iconMade | 0) : -1,
    locked: stats ? (stats.iconLocked | 0) : -1,
    audits: stats ? (stats.sizeAudits | 0) : -1,
    auditsUpdate: stats ? (stats.auditsUpdate | 0) : -1,
    auditsDraw: stats ? (stats.auditsDraw | 0) : -1,
    msg: stats ? (stats.sizeViolationMsg || null) : null,
    worldRange: stats ? (stats.sizeWorldRange || null) : null,
    boxDiag: stats ? (stats.sizeBoxDiag || null) : null,
    // r4 MEDIUM-1：編舞在 tween／timer／done 裡丟出來的例外（含被鎖屬性被 defineProperty 硬蓋的 TypeError）
    tweenErrors: stats ? (stats.tweenErrors | 0) : -1,
    tweenErrorMsg: stats ? (stats.tweenErrorMsg || null) : null,
  };
  const sizeState = !stats ? 'fail'
    : sizeGuard.made === 0 ? 'n/a'
      : (sizeGuard.violations === 0 && sizeGuard.locked === sizeGuard.made && sizeGuard.audits > 0) ? 'ok' : 'fail';
  /* tweenErrors 與 sizeState 分開判：前者管「編舞有沒有安靜地死掉一段」，
     每一套（含 23 支沒有徽記的）都要是 0，所以不走三態。 */
  const tweenOK = !!stats && sizeGuard.tweenErrors === 0;
  /* r2 L2：紅不能只出現在 summary 與 exit code——「用到徽記的招卻沒產出徽記」那一套自己要印 FAIL。
     `opt.emblemMoves` 由 main() 從原始碼推導後塞進來（`--only` 子集跑也照樣有效）。 */
  const needEmblem = !!(opt.emblemMoves && opt.emblemMoves.indexOf(c.trait) >= 0)
    && !!fxvocabQ(opt) && !opt.throw && !opt.block;
  const sizeOK = sizeState !== 'fail' && tweenOK && !(needEmblem && sizeState === 'n/a');
  const verdict = { handled: fired.handled, hasMove: fired.hasMove, alive, restored, within, onTime, clean, reducedOK, focus, tier, ms, msOK, rateOK, acts, actionsOK, horizon: sig ? sig.horizon : null, fill: +fill.toFixed(3), fillOK, endFrame, maxD: +maxD.toFixed(4), errors: errors.length, programsGrew: programs1 - programs0, reactSolo, phasesOK, stanceOK, stance: sc, phases: sig && sig.phaseDetail ? sig.phaseDetail.map((c) => `${c.name}:${c.ok ? 1 : 0}${c.solo ? '(solo)' : ''}`).join(',') : null, sizeGuard, sizeState, tweenOK, sizeOK };
  const blockActor = opt.block && String(opt.block) === c.ab;
  verdict.blocked = opt.block || null;
  if (opt.throw || blockActor) verdict.pass = !fired.handled && restored && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else if (cancelAt > 0) verdict.pass = fired.handled && endFrame >= 0 && endFrame <= FIRE_AT + cancelAt + 1 && restored && errors.length === 0;
  else if (opt.block) verdict.pass = fired.handled && alive && restored && within && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else {
    // rateOK／actionsOK 是「短版原生合身」的門檻，只對 tier 1 納入 pass：
    // tier 2 的完整版在滿編錯開時本來就會被 run.rate 等比加速（v0.53 既有設計，rateMax 2.2）。
    /* ★R3 覆審 H-3★：一版把 rateOK 的適用範圍從「30 套」縮到「tier 1 的 27 套」，
       而被排除的那 3 套**恰好就是唯一 rate >1.0 的 3 套**（三尊在 tier 3 是 1.04–1.06）
       ——那是 02 §2.1 的「縮小實際跑到的範圍」＝移動及格線。現在改成：
       **tier 1 與 tier 3 都驗 `rate ≤1.0`**（凍結檔 F2 的字面），三尊的時間軸已原生壓進 1400ms；
       tier 2 的完整版在滿編錯開時本來就會被等比加速（v0.53 既有行為，rateMax 2.2，L4 已記錄）
       ⇒ tier 2 只把 maxRate 印出來當記錄，不進 pass。
       actionsOK（F10 的「≥2 個非 flinch 動作」）仍只約束 tier 1 的短版。 */
    const shortOK = (tier === 1 ? (rateOK && actionsOK) : true) && (tier === 3 ? rateOK : true);
    // fillOK 對每個 tier 都要求：短版填滿 260、完整版填滿 900、大招填滿 1400
    verdict.pass = fired.handled && alive && restored && within && onTime && clean && reducedOK && focus && msOK && shortOK && fillOK && phasesOK && stanceOK && sizeOK && errors.length === 0 && programs1 - programs0 === 0;
  }
  return { case: c, url, nA, fired, verdict, sig, stats, errors, shots, moves, softGl, newPrograms, frames: frames.map((f) => [f.i, f.d, f.mesh, f.burst ? 1 : 0, f.active, f.wrapped, f.rig]) };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const out = pos[0] || path.join(ROOT, 'scratchpad', 'traitfx-run.json');
  const port = parseInt(opt.port || '8841', 10);
  if (opt.dt) DT_MS = Math.max(1, Math.min(100, parseFloat(opt.dt) || DT_MS));
  const root = opt.root ? path.resolve(opt.root) : ROOT; // 覆審 r2 N3：靜態根目錄可指到基準樹
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error(`--root=${root} 底下沒有 index.html`);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tier = parseInt(opt.tier || '2', 10);
  // F1：治具與頁面的常數分岔就當場停（不是印個 warn 繼續跑）
  assertPageConsts(pageConstsFromHtml(html));
  let cases = casesFromIndex(html);
  const poolN = cases.filter((c) => !c.legend).length;
  // 反查不到就是 regex 又與資料表分岔了（2026-09-07 的 eff:{} 讓三尊靜默漏測近一個月）——
  // 這種「少測幾套」的失敗一定要紅，不能只印 warn。
  if (poolN !== 27) throw new Error(`POOL 反查到 ${poolN} 套（預期 27）：casesFromIndex 的 regex 與 index.html 分岔了`);
  if (cases.length - poolN !== 3) throw new Error(`LEGENDS 反查到 ${cases.length - poolN} 套（預期 3）：casesFromIndex 的 regex 與 index.html 分岔了`);
  // tier 1＝27 支專屬短版（三尊恆 tier 3，不在此列）；tier 3＝三尊大招；tier 2＝全部 30 套（回歸對照）
  if (!opt.only) {
    if (tier === 1) cases = cases.filter((c) => !c.legend);
    else if (tier === 3) cases = cases.filter((c) => c.legend);
  }
  if (opt.only) { const set = new Set(String(opt.only).split(',')); cases = cases.filter((c) => set.has(c.trait)); }
  opt.emblemMoves = emblemCasesFromSource(root); // 逐套判定要用（r2 L2）
  opt.phaseMoves = phaseCasesFromSource(root); // P2 的適用範圍（覆審 r1 HIGH-3）：只約束「真的有打點」的招
  opt.v054Moves = v054CasesFromSource(root); // 預設路徑下走 0.54 演出的那幾支，P2 在那條路上不適用
  opt.v055Moves = v055CasesFromSource(root); // --fxvocab=1 下走批 0 徽記版的那幾支，stanceOK 在那條路上不適用
  if (opt.shots) fs.mkdirSync(opt.shots, { recursive: true });
  const srv = await serve(root, port);
  if (root !== ROOT) console.log(`★--root=${root}（靜態檔與 index.html 都從這裡取；治具程式仍是本樹的）★`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const c of cases) {
      const t0 = Date.now();
      const r = await runCase(browser, `http://127.0.0.1:${port}`, c, opt);
      r.ms = Date.now() - t0;
      results.push(r);
      const v = r.verdict;
      console.log(`${v.pass ? 'PASS' : 'FAIL'} ${c.trait.padEnd(16)} ${c.ab.padEnd(12)} t${v.tier}/${v.ms}ms msOK=${v.msOK} rate=${r.sig ? r.sig.maxRate : '-'} fill=${v.fill} acts=${v.acts} handled=${v.handled} alive=${v.alive} restored=${v.restored} onTime=${v.onTime} clean=${v.clean} focus=${v.focus} size=${v.sizeState}(${v.sizeGuard.violations}v/${v.sizeGuard.locked}of${v.sizeGuard.made}/u${v.sizeGuard.auditsUpdate}+d${v.sizeGuard.auditsDraw}) twErr=${v.sizeGuard.tweenErrors} end=${v.endFrame} maxD=${v.maxD} err=${v.errors} prog+${v.programsGrew} sig=${r.sig ? r.sig.bones.length + 'b/' + r.sig.meshes.join('+') + (r.sig.target ? '/T' : '') : '-'} ${r.ms}ms`);
      if (r.errors.length) r.errors.slice(0, 3).forEach((e) => console.log('   ! ' + e.slice(0, 200)));
      if (r.newPrograms && r.newPrograms.length) r.newPrograms.forEach((e) => console.log('   +program ' + e));
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  // T-1：27 個 trId 與編舞表集合相等；T-3：簽章兩兩不同
  const moves = results.length ? results[results.length - 1].moves || [] : [];
  const allCases = casesFromIndex(html).map((c) => c.trait);
  const t1 = { missing: allCases.filter((t) => !moves.includes(t)), extra: moves.filter((t) => !allCases.includes(t)) };
  const sigs = results.filter((r) => r.sig).map((r) => `${r.sig.bones.join(',')}|${r.sig.meshes.join(',')}|${r.sig.target}`);
  const dupSig = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  // F10 的表：逐招印非 flinch 的動作數（＜2 就是偷懶短版）
  const actsTable = results.map((r) => ({ trait: r.case.trait, acts: r.verdict.acts, ok: r.verdict.actionsOK, maxRate: r.sig ? r.sig.maxRate : null, runMs: r.sig ? r.sig.ms : null, horizon: r.verdict.horizon, fill: r.verdict.fill }));
  // M1：react 量在出招方自己身上的那幾套（solo）＝「未在條文情境下驗證」，逐套列名
  const soloReact = results.filter((r) => r.verdict.reactSolo === true).map((r) => r.case.trait);
  /* ★徽記世界尺寸斷言的彙總（r4 MEDIUM-2：三態，不拿空真當通過）★
     逐套三態；總判定只對 made>0 的套算；**四支示範招若沒量到就判紅**——
     「這一套沒產出徽記」與「這一套通過」是兩件事，混在一起就是空真。
     批 1–3 每把一支招換成新語彙，就要把它的 trId 加進 EMBLEM_CASES。 */
  const sg = results.reduce((a, r) => ({
    violations: a.violations + Math.max(0, r.verdict.sizeGuard.violations),
    made: a.made + Math.max(0, r.verdict.sizeGuard.made),
    locked: a.locked + Math.max(0, r.verdict.sizeGuard.locked),
    audits: a.audits + Math.max(0, r.verdict.sizeGuard.audits),
    auditsUpdate: a.auditsUpdate + Math.max(0, r.verdict.sizeGuard.auditsUpdate),
    auditsDraw: a.auditsDraw + Math.max(0, r.verdict.sizeGuard.auditsDraw),
  }), { violations: 0, made: 0, locked: 0, audits: 0, auditsUpdate: 0, auditsDraw: 0 });
  const sgHit = results.find((r) => r.verdict.sizeGuard.msg);
  sg.msg = sgHit ? sgHit.verdict.sizeGuard.msg : null;
  sg.states = { ok: 0, 'n/a': 0, fail: 0 };
  results.forEach((r) => { sg.states[r.verdict.sizeState]++; });
  sg.measured = sg.states.ok + sg.states.fail > 0;
  sg.failed = results.filter((r) => r.verdict.sizeState === 'fail').map((r) => r.case.trait);
  // 用到徽記語彙的招（批 1–3 逐支加進來）：跑到它們卻沒量到＝防線在那支上失效
  /* `--fxvocab=1` 才有 0.55 的徽記；不帶＝0.54 演出，四支示範招沒有徽記，n/a 是對的。 */
  sg.fxvocab = !!fxvocabQ(opt);
  sg.emblemMoves = emblemCasesFromSource(root); // 從原始碼推導（r2 L2），不是手工名單
  sg.expected = sg.fxvocab ? sg.emblemMoves.filter((t) => results.some((r) => r.case.trait === t)) : [];
  sg.missing = (opt.throw || opt.block) ? [] : sg.expected.filter((t) => {
    const r = results.find((x) => x.case.trait === t);
    return r && r.verdict.sizeState === 'n/a';
  });
  sg.worldRange = (results.find((r) => r.verdict.sizeGuard.worldRange && Object.keys(r.verdict.sizeGuard.worldRange).length) || { verdict: { sizeGuard: {} } }).verdict.sizeGuard.worldRange || null;
  sg.tweenErrors = results.reduce((a, r) => a + Math.max(0, r.verdict.sizeGuard.tweenErrors), 0);
  const twHit = results.find((r) => r.verdict.sizeGuard.tweenErrorMsg);
  sg.tweenErrorMsg = twHit ? twHit.verdict.sizeGuard.tweenErrorMsg : null;
  sg.tweenErrorCases = results.filter((r) => r.verdict.sizeGuard.tweenErrors > 0).map((r) => r.case.trait);
  const summary = { total: results.length, pass: results.filter((r) => r.verdict.pass).length, dupSignatures: dupSig.length, t1, softGl: results.length ? results[0].softGl : null, tier, ms: msOf(tier), actsTable, soloReact, sizeGuard: sg, opts: opt };
  console.log(`\n徽記世界尺寸斷言${sg.fxvocab ? '（--fxvocab=1：0.55 徽記版）' : '（預設 0.54 演出，四支示範招本來就沒有徽記 ⇒ n\u002fa 是正確狀態）'}：`
    + `ok ${sg.states.ok}／n\u002fa ${sg.states['n/a']}／fail ${sg.states.fail}`
    + `　（違規 ${sg.violations} 次、鎖上 ${sg.locked} of 產出 ${sg.made}、`
    + `稽核 update ${sg.auditsUpdate} 次／draw ${sg.auditsDraw} 次）`
    + `${sg.measured ? '' : '　★這一跑沒有任何招產出徽記＝這條斷言未量到，不得當成通過★'}`);
  /* r3 N-2：draw 那個量測位置在這支治具上**一次都不會觸發**（治具頁逐幀 step() 但不逐幀 render()）。
     不標出來的話，單一個「稽核 N 次」看起來像兩個位置都量過了——`02 §6.1` 第 5 條：
     代理指標「沒響」只在它的量測位置上有效。draw 位置的主場是 fx-contrast 與 duel-drive。 */
  if (sg.made > 0 && sg.auditsDraw === 0) {
    console.log('  ★draw 量測位置本跑未觸發（traitfx-preview 逐幀 step() 但不逐幀 render()）：'
      + '這一跑只證明了 update 那個位置；draw 位置請看 fx-contrast／duel-drive★');
  }
  if (sg.worldRange) console.log('  世界寬度區間（診斷，不進判定）：' + JSON.stringify(sg.worldRange));
  if (sg.msg) console.log('  ! ' + String(sg.msg).slice(0, 300));
  if (sg.failed.length) console.log('  fail 的套：' + sg.failed.join(' '));
  console.log(`  用到徽記語彙的招（由原始碼推導，非手工名單）：${sg.emblemMoves.join(' ') || '（無）'}`);
  if (sg.missing.length) console.log('  ★用到徽記的招卻是 n/a：' + sg.missing.join(' ') + '（防線在那幾支上失效）');
  if (sg.tweenErrors) {
    console.log(`  ★編舞在 tween／timer／done 裡安靜死掉 ${sg.tweenErrors} 次（${sg.tweenErrorCases.join(' ')}）：` + String(sg.tweenErrorMsg).slice(0, 240));
  }
  if (sg.violations > 0 || sg.states.fail > 0 || sg.missing.length || sg.tweenErrors > 0) {
    console.log('★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★'); process.exitCode = 1;
  }
  console.log(`\nF10 動作數（非 flinch 的 tween／fly／fade／grow）：` + actsTable.map((a) => `${a.trait}=${a.acts}${a.ok ? '' : '✗'}`).join(' '));
  if (soloReact.length) {
    console.log(`\n★M1 未在條文情境下驗證（react 量在出招方自己身上，場上只有他一個人）：${soloReact.join(' ')}`);
    console.log('  自益招要量在受益方身上，請另跑一次 --only=<trId> --count=2（凍結檔 L2 假綠清單第 3 條）');
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  /* ★H1（覆審 r1）：--sigdump=<檔>★
     L5 的 trace-eq 只抽 index.html 的第一個 <script> 在 node 裡跑，**完全不載入 js/**，
     所以本批 index.html 零 diff ⇒ 那條「逐位元組相等」恆真，證明不了 js/trait-fx* 有沒有被動到。
     這支 dump 把每套的簽章（骨骼／spawn 物／徽記 kind／三段）正規化成一行，
     批 1–3 可以用 `diff` 直接比出「哪一套的演出真的變了」——那才是對 js/ 有鑑別力的等價證據。 */
  if (opt.sigdump) {
    const TAB = '\t';
    const lines = results.map((r) => {
      const g = r.sig;
      if (!g) return r.case.trait + TAB + 'NO_SIG';
      const ph = (g.phaseDetail || []).map((c) => `${c.name}:${c.ok ? 1 : 0}${c.solo ? '(solo)' : ''}`).join(',');
      return [r.case.trait, `tier=${g.tier}`, `ms=${g.ms}`, `bones=${(g.bones || []).join('+')}`,
        `meshes=${(g.meshes || []).join('+')}`, `target=${g.target ? 1 : 0}`, `phases=${ph}`,
        `acts=${g.acts}`, `horizon=${g.horizon}`, `maxRate=${g.maxRate}`].join(TAB);
    });
    fs.mkdirSync(path.dirname(opt.sigdump), { recursive: true });
    fs.writeFileSync(opt.sigdump, lines.sort().join('\n') + '\n');
    console.log(`sig 序列 → ${opt.sigdump}（${lines.length} 行；批 1–3 用 diff 比這份，不要只比 trace-eq）`);
  }
  fs.writeFileSync(out, JSON.stringify({ summary, results }, null, 1));
  console.log(`\n${summary.pass}/${summary.total} pass · 重複簽章 ${dupSig.length} · ${out}`);
  void moves;
}

// 被別的腳本 import（traitfx-sheet.mjs 借 casesFromIndex）時不要跑 main
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
