// 主鈕相位切換吃第二下點擊——紅／綠迴圈探針（2026-09-11 覆審 F4，v0.53.2）
// 用法：node tests/tools/mainbtn-dblclick-probe.mjs [--port=9591] [--seed=1] [--page=index.html] [--json=<out>]
//       node tests/tools/mainbtn-dblclick-probe.mjs --mutate      ← 突變驗紅（見下）
//   --page=<檔名>  要驗的頁面（相對 repo 根）。對照舊版：`git show b005974:index.html > old-b005974.html` 再 --page=old-b005974.html
//
// 危險的效果（凍結檔 docs/experiments/2026-09-11-acceptance-mainbtn-dblclick.md）：
//   「這一下點擊在它自己的**同步執行**裡把 #mainbtn 重新綁了手，使用者還沒看過新的動作，第二下就落在上面。」
//   分母 N=4：進入下一夜／不盯任何一件／前往拍賣／看最終結果。前三者的第二下＝0 出價交卷開標（整夜白費），
//   第四個的第二下＝location.reload（整局沒了）。
// 做的事（全走真實 UI，真的 dispatch 兩次 click，不呼叫任何引擎函式來造狀態）：
//   B1 夜末「進入下一夜」間隔 120ms 點兩下 ⇒ resolveAuction 次數不得增加、畫面要停在出價畫面
//   B2 「不盯任何一件」同樣點兩下 ⇒ 同上
//   B3 CFG.ROUNDS=1 走到「看最終結果」點兩下 ⇒ window 上的哨兵必須還在（頁面沒被 reload）
//   B4 活性：同一個轉場之後隔 800ms 再按「蓋牌開標」⇒ resolveAuction 必須 +1（守衛沒把主鈕鎖死）
//   B5 一夜單點走完不得卡住
//
// `--mutate`：全綠沒有證明力。這個模式把守衛那一行刪掉（只刪一行，原 index.html 全程唯讀）再跑一次，
// 預期 **B1／B2／B3 紅**；不紅就代表這組綠燈跟守衛無關，不可信。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fs.existsSync(c)) return createRequire(c)('playwright').chromium;
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
}
const argv = process.argv.slice(2);
const opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = +(opt.port || 9591);
const SEED = +(opt.seed || 1);
const PAGE = opt.page || 'index.html';
const GAP_FAST = 120;   /* 快按兩下的間隔（凍結：不得為了過而調大） */
const GAP_SLOW = 800;   /* 刻意的第二次點擊（必須生效） */

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

const ST = `(() => {
  const b = document.getElementById('mainbtn');
  const S = window.__yaoshi.S;
  return { txt: b ? b.textContent : '', dis: b ? b.disabled : true,
    round: S ? S.round : 0, lives: S ? S.players.map(p => p.life) : null,
    ra: window.__raCount | 0, sentinel: window.__sentinel || null,
    marks: (S && S.marks) ? JSON.stringify(S.marks) : null,
    swapAgo: (typeof MAIN_SWAP_AT === 'number') ? (performance.now() - MAIN_SWAP_AT) : null,
    hasMarket: !!document.getElementById('market'),
    bidSum: (() => { try { return myBids.reduce((s, x) => s + x.amt, 0); } catch (e) { return null; } })() };
})()`;

/* 推到「文字符合 re、且按鈕可按」為止。讀狀態與點擊在同一次 evaluate 裡原子完成
   （startReveal 收尾是「先寫 textContent、再 disabled=false」，分兩次會有競態，實測踩過）。 */
async function driveUntil(page, re, tag, path) {
  const src = re.source;
  for (let i = 0; i < 900; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0, handoff: 1 }; }
      const b = document.getElementById('mainbtn');
      const S = window.__yaoshi.S;
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0, clicked: 1, txt, round: S ? S.round : 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0, modal: 1 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0, modal: 2 }; }
      }
      /* 異事夜（B8）與開場三卡：按鈕在 #stage 裡、#mainbtn 這時是停用的，不處理會卡死 */
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || ''))
                || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0, stage: 1 }; }
      }
      return { hit: 0 };
    })()`);
    if (r.hit) return await page.evaluate(ST);
    if (r.clicked) path.push(`${r.round}|${r.txt}`);
  }
  throw new Error(`driveUntil 卡住（${tag}），最後畫面：` + JSON.stringify(await page.evaluate(ST)));
}

/* ★真的按兩下★：兩次獨立的 page.click（Playwright 會做可見／可按的 actionability 檢查再送真事件）。
   不用 page.dblclick——那多送一個 dblclick 事件，跟使用者「快按兩下」的 click,click 不同形。
   ★中間取一次樣（mid）★：判準因此可以寫成**通用**的「第二下不得生效」（第二下前後的畫面要一模一樣），
   而不是去猜「第二下會落在哪個動作上」——第一版就是猜錯了（以為是交卷，實際第二夜先進盯上宣告頁，
   第二下落在 pickMark(null) 把盯上宣告整個跳過），那種寫法對壞掉的實作也會綠＝零鑑別力。 */
/* 取樣要能撐過「頁面被重載」——B3 的第二下就是 location.reload()，evaluate 會直接炸
   （Execution context was destroyed）。那正是要量的現象，不能讓它把整支探針帶走。 */
const GONE = { txt: '', dis: true, round: 0, lives: null, ra: 0, sentinel: null, marks: null, hasMarket: false, bidSum: null, navigated: true };
async function snap(page) {
  try { return await page.evaluate(ST); } catch (e) { return { ...GONE, navError: String(e.message).slice(0, 90) }; }
}
/* ★整個雙擊在**單一 page.evaluate** 裡完成★（2026-09-11：這一段換過兩版，理由要留著）
   第一版用 page.click：每次都做 actionability 檢查，把「間隔 120ms」撐成 300～535ms。
   第二版改 page.mouse.click：多數情況 140～270ms，但固定條件連跑 5 次仍出現一次 785ms
   ——Node↔瀏覽器的每一次來回都可能卡在頁面主執行緒（Three.js 重繪、GC）後面。
   波動來源歸因：**量測治具本身**（不是受測物；受測物在同一組樣本裡行為一致）。
   對症處置＝把兩下之間的等待交給頁面自己的 setTimeout，不再跨行程來回 ⇒ 間隔由主執行緒直接控。
   ★用 b.click() 而不是真事件★：守衛掛在 click listener 上，b.click() 走的是**同一條** listener→handler 鏈；
   全檔 grep `isTrusted` ＝ 0 次、沒有任何 mousedown／pointerdown 監聽，所以 isTrusted 不在因果路徑上。
   真事件（page.click）那條路由 B4 活性與 driveUntil 全程涵蓋。
   ★gapOk 前提斷言★：第二下必須真的落在守衛視窗內，這次量測才算數——量不到就紅，不讓它錯過視窗偷偷綠。 */
async function tapTwice(page, gap) {
  const SNAP = `{ txt:b.textContent, dis:b.disabled, round:S()?S().round:0,
    lives:S()?S().players.map(p=>p.life):null, ra:window.__raCount|0,
    sentinel:window.__sentinel||null, marks:(S()&&S().marks)?JSON.stringify(S().marks):null,
    swapAgo:(typeof MAIN_SWAP_AT==='number')?(performance.now()-MAIN_SWAP_AT):null,
    hasMarket:!!document.getElementById('market') }`;
  const code = `(async (g) => {
    const S = () => window.__yaoshi.S;
    const b = document.getElementById('mainbtn');
    const snap = () => (${SNAP});
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    b.click();                                   /* 第一下 */
    await sleep(Math.round(g * 0.5));
    const mid = snap();
    await sleep(Math.round(g * 0.5));
    const armedAgo = (typeof MAIN_SWAP_AT === 'number') ? Math.round(performance.now() - MAIN_SWAP_AT) : null;
    /* 第二下可能把整頁 reload 掉（B3），evaluate 的回傳就沒了 ⇒ 先寄放在 sessionStorage（跨重載存活） */
    try { sessionStorage.setItem('__tap', JSON.stringify({ mid, armedAgo })); } catch (e) {}
    b.click();                                   /* 第二下 */
    await sleep(250);
    return { mid, after: snap(), armedAgo };
  })(${gap})`;
  try { return await page.evaluate(code); }
  catch (e) {
    /* 頁面被重載：從 sessionStorage 撈回第一下之後的樣本，after 記成「context 沒了」 */
    const kept = await page.evaluate(`(() => { try { return sessionStorage.getItem('__tap'); } catch (e) { return null; } })()`).catch(() => null);
    const rec = kept ? JSON.parse(kept) : { mid: { ...GONE }, armedAgo: null };
    return { mid: rec.mid, armedAgo: rec.armedAgo, after: { ...GONE, navError: String(e.message).slice(0, 90) } };
  }
}
/* 第二下有沒有生效：畫面文字／市集在不在／開標次數／盯上紀錄，四項有任何一項變了就是生效了 */
const secondTookEffect = (mid, after) => !(after.txt === mid.txt && after.hasMarket === mid.hasMarket
  && after.ra === mid.ra && after.marks === mid.marks && after.sentinel === mid.sentinel);

let ROUNDS_DEFAULT = 0;   /* 開場記下 CFG.ROUNDS 的原值，每一局明確還原 */
let EVENT_NIGHTS_DEFAULT = null;   /* 同理：B8 會把 EVENT_NIGHTS 改成 [1]，其餘案例要還原 */
async function newGame(page, seed, rounds, eventNights) {
  /* B3 之後頁面可能已被重載（那是待測的現象），所以每一局開場都重新等腳本就緒 */
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  /* ★一定要明確還原 CFG.ROUNDS★：B3 把它設成 1，不還原的話後面的案例會在第 1 夜就終局。
     舊版之所以沒踩到，是因為 B3 的第二下真的把頁面 reload 了、順便把 CFG 重置——
     修好之後不再 reload，這個順序依賴就露出來了。 */
  await page.evaluate(({ sd, rd, dft, ev, evd }) => {
    CFG.T = 1;
    CFG.ROUNDS = rd || dft;
    if (ev) CFG.EVENT_NIGHTS = ev; else if (evd) CFG.EVENT_NIGHTS = evd;
    const F = window.__yaoshi.PW_FX;
    for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__raCount = 0;
    if (!window.__raWrapped) { const o = window.resolveAuction; window.resolveAuction = function () { window.__raCount++; return o.apply(this, arguments); }; window.__raWrapped = 1; }
    window.__sentinel = 'alive';
    window.__yaoshi.newGame('solo', sd, ['qingmian']);
  }, { sd: seed, rd: rounds || 0, dft: ROUNDS_DEFAULT, ev: eventNights || null, evd: EVENT_NIGHTS_DEFAULT });
}

/* B1（＋B4 活性）：走到第 1 夜末的「進入下一夜」，快按兩下。 */
async function caseNextRound(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /進入下一夜|看最終結果/, 'B1 第 1 夜末', rec.path);
  rec.before = await page.evaluate(ST);
  Object.assign(rec, await tapTwice(page, GAP_FAST));
  /* B4 活性：守衛不是永久鎖死——推到出價畫面，隔 800ms 再按一次「蓋牌開標」，這一下**必須**交卷開標 */
  await driveUntil(page, /蓋牌/, 'B4 出價畫面', rec.path);
  const raBefore = (await page.evaluate(ST)).ra;
  await page.waitForTimeout(GAP_SLOW);
  await page.click('#mainbtn').catch(() => {});
  await page.waitForTimeout(400);
  rec.afterSlow = await page.evaluate(ST);
  rec.liveness = { raBefore, raAfter: rec.afterSlow.ra };
  return rec;
}

/* B2：「不盯任何一件」（盯上宣告頁），快按兩下——這一個的第二下正是「0 出價、0 燒香交卷開標」。 */
async function caseMarkUI(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /不盯任何一件/, 'B2 盯上宣告頁', rec.path);
  rec.before = await page.evaluate(ST);
  Object.assign(rec, await tapTwice(page, GAP_FAST));
  return rec;
}

/* B3：CFG.ROUNDS=1 ⇒ 第 1 夜末就是「看最終結果」，快按兩下。
   ★判準用「主框架有沒有導航」而不是「250ms 後哨兵還在不在」★：location.reload() 是**非同步**的
   （導航排進佇列才送出），只看事後快照會忽紅忽綠——舊版連跑 3 次就出現 紅／紅／綠。
   波動來源歸因：量測時機（受測物每次都真的呼叫了 reload）。對症＝數 framenavigated 事件，
   並給導航 1.2 秒落地時間。 */
let NAV = 0;
async function caseEndGame(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed, 1);
  await driveUntil(page, /看最終結果/, 'B3 終局畫面', rec.path);
  rec.before = await page.evaluate(ST);
  const nav0 = NAV;
  Object.assign(rec, await tapTwice(page, GAP_FAST));
  await page.waitForTimeout(1200);
  rec.navDelta = NAV - nav0;
  rec.settled = await snap(page);
  rec.navigated = rec.navDelta > 0 || rec.settled.sentinel !== 'alive';
  return rec;
}

/* B6：★開標演出的武裝行為，逐項驗兩句話★
   ★上一版這條是零鑑別力★：它在 `driveUntil(/開標 ▸/)` **之後**才讀基準線，而武裝正好發生在抵達
   「開標 ▸」的那一下 ⇒ 基準線取在污染之後，`swapBefore===swapAfter` 恆成立，第一句話根本沒被驗到。
   現在基準線取在按「蓋牌開標」**之前**，分兩段量：
     ① 蓋牌開標 → 開標 ▸：**應該武裝**（startReveal 在第一個 await 之前就同步呼叫 waitMain）
     ② 開標 ▸ → 成交總覽：**不得再武裝**（之後的換手都在 await 之後）⇒ 玩家連按推演出照舊 */
const SWAP_AT = `(() => (typeof MAIN_SWAP_AT === 'number') ? MAIN_SWAP_AT : null)()`;
async function caseRevealMash(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /蓋牌/, 'B6 出價畫面', rec.path);
  rec.swapAtBid = await page.evaluate(SWAP_AT);
  await driveUntil(page, /開標 ▸/, 'B6 開標前公告', rec.path);
  rec.swapAtReveal = await page.evaluate(SWAP_AT);
  const n0 = rec.path.length;
  await driveUntil(page, /請神|開戰/, 'B6 成交總覽', rec.path);
  rec.swapAtSummary = await page.evaluate(SWAP_AT);
  rec.clicksInReveal = rec.path.length - n0;
  rec.armedByBid = rec.swapAtBid !== rec.swapAtReveal;        /* ① 應為 true */
  rec.armedInReveal = rec.swapAtReveal !== rec.swapAtSummary; /* ② 應為 false */
  return rec;
}

/* B7：★主執行緒凍住時，排隊中的第二下仍要被擋★（驗 e.timeStamp 那條修法，覆審 Q4-5 的證據缺口）
   相位切換的 handler 會同步重畫市集＋更新 3D，實測可凍住主執行緒數百毫秒。真人在凍結期間按的第二下
   會排隊、解凍後才派送——若守衛比的是「listener 跑到的時刻」就擋不到。
   做法：在頁面裡按第一下、緊接著 busy-loop 把主執行緒卡住 700ms（>500ms 視窗）；
   **卡住期間**從 Node 送一個真滑鼠點擊（Chrome 會把它排進佇列、timeStamp 記的是按下的時刻）。
   解凍後這一下必須被吞掉。舊版（沒有守衛）不適用。 */
async function caseBlockedQueuedClick(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /進入下一夜|看最終結果/, 'B7 第 1 夜末', rec.path);
  const box = await page.locator('#mainbtn').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  /* 不 await：讓它在頁面裡跑，Node 這邊趁卡住的時候送點擊 */
  const blocking = page.evaluate(`(() => {
    const b = document.getElementById('mainbtn');
    b.click();                                   /* 第一下：換手、武裝 */
    const t0 = performance.now();
    while (performance.now() - t0 < 700) {}      /* 把主執行緒卡住，比守衛視窗長 */
    return { blockedMs: Math.round(performance.now() - t0) };
  })()`);
  await page.waitForTimeout(120);                /* 此刻主執行緒正卡著 */
  const clicking = page.mouse.click(cx, cy).catch(() => {});
  rec.block = await blocking;
  await clicking;
  await page.waitForTimeout(400);
  rec.mid = await snap(page);                    /* 第一下之後、第二下（排隊的）派送之後 */
  rec.state = rec.mid;
  return rec;
}

/* B8：★入口 ③「前往拍賣」（異事夜）★——覆審 Q4-2：原本這個入口從沒被走到（EVENT_NIGHTS=[4,8,11]，
   而探針只跑第 1–2 夜）。把 EVENT_NIGHTS 設成 [1] 純粹是為了**走到這條路**，不動任何判定門檻。 */
async function caseEventNight(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed, 0, [1]);
  await driveUntil(page, /前往拍賣/, 'B8 異事開盅後', rec.path);
  rec.before = await page.evaluate(ST);
  Object.assign(rec, await tapTwice(page, GAP_FAST));
  return rec;
}

/* B5：一夜單點走完不得卡住（守衛設太緊會讓畫面推不動）。 */
async function caseWalkNight(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  const t0 = Date.now();
  await driveUntil(page, /進入下一夜|看最終結果/, 'B5 第 1 夜末', rec.path);
  /* ★中繼目標不能省★：直接 page.click 一下就往下走，會被守衛吞掉而毫無察覺
     （下一個 driveUntil 的目標還是「夜末」，當場就滿足、round 停在 1）。
     改成先推到**第 2 夜的出價畫面**（driveUntil 自己會重試），再推到第 2 夜末。 */
  await driveUntil(page, /蓋牌/, 'B5 第 2 夜出價畫面', rec.path);
  await driveUntil(page, /進入下一夜|看最終結果/, 'B5 第 2 夜末', rec.path);
  rec.ms = Date.now() - t0;
  rec.end = await page.evaluate(ST);
  return rec;
}

/* ★量不到就重來，量得到就一翻兩瞪眼★（`02 §6.2`：先歸因再處置）
   波動來源已經歸清楚：相位切換的 handler 會同步重畫市集＋更新 3D，主執行緒可能凍住數百毫秒，
   連頁面自己的 setTimeout 都會被拖到 500ms 視窗之外——那是**量測沒成立**，不是受測物的行為。
   所以這裡重試的是「把第二下送進視窗內」這個**前置條件**，不是重試一個已經失敗的判準：
   `armedAgo < MAIN_GUARD_MS` 成立就立刻採用該次結果（不管綠紅），成立不了才換一局重來，
   三次都送不進去就讓它紅（訊息寫明是量測失敗）。舊版沒有守衛（guardMs=null）時不重試。 */
async function withGoodGap(runCase, page, seed, guardMs, tag) {
  let last = null;
  for (let k = 0; k < 3; k++) {
    const r = await runCase(page, seed);
    last = r;
    /* navDelta>0（頁面真的被重載）本身就是「第二下生效了」的最強證據，不必再要求 gap 量得到 */
    if (guardMs == null || r.navDelta > 0 || (r.armedAgo != null && r.armedAgo < guardMs)) { r.attempts = k + 1; return r; }
  }
  last.attempts = 3;
  last.gapMissed = true;
  return last;
}

const main = async () => {
  const srv = await serve(ROOT, PORT);
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const out = { page: PAGE, seed: SEED, errors: [], pageerrors: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
    page.on('pageerror', (e) => out.pageerrors.push(String(e)));
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) NAV++; });
    await page.goto(`http://127.0.0.1:${PORT}/${PAGE}`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
    out.version = await page.evaluate(`(() => VERSION)()`);
    out.guardMs = await page.evaluate(`(() => (typeof MAIN_GUARD_MS === 'number') ? MAIN_GUARD_MS : null)()`);
    ROUNDS_DEFAULT = await page.evaluate(`(() => CFG.ROUNDS)()`);
    EVENT_NIGHTS_DEFAULT = await page.evaluate(`(() => CFG.EVENT_NIGHTS.slice())()`);
    out.roundsDefault = ROUNDS_DEFAULT;
    out.eventNightsDefault = EVENT_NIGHTS_DEFAULT;

    out.b1 = await withGoodGap(caseNextRound, page, SEED, out.guardMs, 'B1');
    out.b2 = await withGoodGap(caseMarkUI, page, SEED, out.guardMs, 'B2');
    out.b3 = await withGoodGap(caseEndGame, page, SEED, out.guardMs, 'B3');
    out.b5 = await caseWalkNight(page, SEED);
    out.b6 = await caseRevealMash(page, SEED);
    if (out.guardMs != null) out.b7 = await caseBlockedQueuedClick(page, SEED);
    out.b8 = await withGoodGap(caseEventNight, page, SEED, out.guardMs, 'B8');

    const b1 = out.b1, b2 = out.b2, b3 = out.b3;
    /* 前提斷言：第二下必須真的落在守衛視窗（MAIN_GUARD_MS）之內，這次量測才算數。
       舊版沒有守衛、armedAgo 是 null 或很大 ⇒ 這條不適用，只在有守衛時把關。 */
    const gapOk = (r) => out.guardMs == null || r.navDelta > 0 || (r.armedAgo != null && r.armedAgo < out.guardMs);
    const shot = (r) => ({ 第一下後: `${r.mid.txt}｜市集${r.mid.hasMarket ? "在" : "無"}｜開標${r.mid.ra}次｜盯上${r.mid.marks}`,
      第二下後: `${r.after.txt}｜市集${r.after.hasMarket ? "在" : "無"}｜開標${r.after.ra}次｜盯上${r.after.marks}`,
      第二下距換手: `${r.armedAgo}ms／視窗 ${out.guardMs}ms${r.gapMissed ? "（三次都沒送進視窗＝量測失敗）" : ""}${r.attempts > 1 ? `・第 ${r.attempts} 次量到` : ""}` });
    out.checks = {
      /* 「進入下一夜」：第二下落在盯上宣告頁的「不盯任何一件」上 ⇒ 玩家的盯上宣告被無聲跳過 */
      B1_nextround_2nd_ignored: { pass: gapOk(b1) && !secondTookEffect(b1.mid, b1.after) && b1.after.round === b1.before.round + 1,
        round: `${b1.before.round}→${b1.after.round}`, ...shot(b1) },
      /* 「不盯任何一件」：第二下落在 submitHumanBids 上 ⇒ 0 出價、0 燒香交卷開標＝整夜白費 */
      B2_markui_2nd_ignored: { pass: gapOk(b2) && !secondTookEffect(b2.mid, b2.after), ...shot(b2) },
      /* 「看最終結果」：第二下落在 ()=>location.reload() 上 ⇒ 整頁重載、局直接沒了 */
      B3_endgame_no_reload: { pass: gapOk(b3) && !b3.navigated && !secondTookEffect(b3.mid, b3.settled),
        導航次數: b3.navDelta, sentinel: b3.settled.sentinel, ...shot(b3) },
      B4_liveness: { pass: b1.liveness.raAfter === b1.liveness.raBefore + 1, ...b1.liveness },
      B5_walk_two_nights: { pass: out.b5.end.round >= 2, round: out.b5.end.round, ms: out.b5.ms },
      /* ① 蓋牌開標那一下**應該**武裝（實測如此，別照直覺推）；② 開標演出**之後**不得再武裝 ⇒ 連按推進照舊 */
      B6_reveal_arming: { pass: out.guardMs == null || (out.b6.armedByBid === true && out.b6.armedInReveal === false),
        蓋牌開標有武裝: out.b6.armedByBid, 演出中又被武裝: out.b6.armedInReveal, 演出中點擊次數: out.b6.clicksInReveal },
      /* 主執行緒凍住 700ms、排隊中的真滑鼠點擊仍要被吞（驗 e.timeStamp 那條修法） */
      /* 第一下（進入下一夜）會把畫面推到第 2 夜的盯上宣告頁。排隊中的第二下若沒被吞，
         就會落在「不盯任何一件」上、把畫面推進出價頁（文字變「蓋牌開標」）⇒ 出現「蓋牌」就是沒擋住。 */
      B7_blocked_queued_click: out.guardMs == null ? { pass: true, skip: '舊版沒有守衛，本條不適用' }
        : { pass: !/蓋牌/.test(out.b7.state.txt) && out.b7.state.round === 2,
            主執行緒凍住ms: out.b7.block.blockedMs, 第二下之後: `第 ${out.b7.state.round} 夜「${out.b7.state.txt}」｜開標${out.b7.state.ra}次` },
      /* 入口 ③ 異事夜「前往拍賣」（CFG.EVENT_NIGHTS=[1] 只為走到這條路，不動門檻） */
      B8_eventnight_2nd_ignored: { pass: gapOk(out.b8) && !secondTookEffect(out.b8.mid, out.b8.after), ...shot(out.b8) },
    };
    out.pass = Object.values(out.checks).every((x) => x.pass) && out.pageerrors.length === 0;
  } catch (e) {
    out.fatal = String((e && e.stack) || e);
    out.pass = false;
  } finally {
    await browser.close();
    srv.kill();
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 2));
  console.log(`page=${out.page} VERSION=${out.version} seed=${out.seed} MAIN_GUARD_MS=${out.guardMs}`);
  if (out.fatal) console.log('FATAL ' + out.fatal.split('\n').slice(0, 3).join(' / '));
  for (const [k, v] of Object.entries(out.checks || {})) console.log(`  ${v.pass ? '綠 PASS' : '紅 FAIL'} ${k}  ${JSON.stringify(v)}`);
  if (out.pageerrors.length) console.log('  pageerror: ' + out.pageerrors.slice(0, 3).join(' | '));
  console.log(out.pass ? '★ 全綠 PASS' : '★ 有紅 FAIL');
  process.exit(out.pass ? 0 : 1);
};

/* ---- 突變驗紅：刪掉守衛那一行的副本跑一次，預期 B1/B2/B3 紅（原檔全程唯讀） ---- */
function runChild(page, port) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), `--page=${page}`, `--port=${port}`],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    p.stdout.on('data', (d) => { buf += d; });
    p.on('close', (code) => res({ code, out: buf }));
  });
}
const mutate = async () => {
  const txt = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  /* 只抓「<MAIN_GUARD_MS) return;」這一段，守衛那行的前半（時間怎麼取）以後還會改，比對整行會脆 */
  const needle = '<MAIN_GUARD_MS) return;';
  const src = txt.split(/(?<=\n)/);
  const i = src.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error('找不到守衛那一行：' + needle);
  const gone = src[i].trim();
  const m1 = src.slice(); m1.splice(i, 1);
  const f = 'old-mut-noguard-dbl.html';   /* .gitignore 的 old-*.html */
  fs.writeFileSync(path.join(ROOT, f), m1.join(''), 'utf8');
  /* M2：只把「用按下時刻（e.timeStamp）」換回「用現在（nowMs）」——專門驗 B7 的鑑別力。
     B1/B2/B3 那種正常速度的雙擊兩種寫法都擋得到，只有「主執行緒凍住、第二下排隊」分得出來。 */
  const m2 = src.slice();
  const j = m2.findIndex((l) => l.includes('e.timeStamp==="number"'));
  if (j < 0) throw new Error('找不到 e.timeStamp 那一行');
  const gone2 = m2[j].trim();
  /* ★替換式要跟著程式碼搬家★：v0.53.4 把時間戳邏輯抽成共用的 gStamp，那個 scope 裡只有 gNow、沒有 nowMs
     ——沿用舊字串會讓 gStamp 拋 ReferenceError（每一下點擊都當掉），B7 於是變成「什麼都沒發生」而**假綠**。
     實測踩過：M2 一度回報「B7 沒紅」。改字串時務必確認突變體真的只換掉「時間怎麼取」。 */
  m2[j] = '  let t=gNow();\n';
  const f2 = 'old-mut-nostamp-dbl.html';
  fs.writeFileSync(path.join(ROOT, f2), m2.join(''), 'utf8');
  let ok = false;
  try {
    console.log('突變：刪掉 ' + gone.slice(0, 70) + '\n');
    const r = await runChild(f, PORT + 60);
    const red = (k) => new RegExp('紅 FAIL ' + k).test(r.out);
    const b1 = red('B1_nextround_2nd_ignored'), b2 = red('B2_markui_2nd_ignored'), b3 = red('B3_endgame_no_reload');
    console.log(r.out.split('\n').filter((l) => /B1_|B2_|B3_|B4_|★/.test(l)).map((l) => '  突變體 ' + l.trim()).join('\n'));
    console.log('\n突變 M2：' + gone2.slice(0, 60) + ' → let t=gNow();');
    const rB = await runChild(f2, PORT + 61);
    const b7 = /紅 FAIL B7_blocked_queued_click/.test(rB.out);
    console.log(rB.out.split('\n').filter((l) => /B7_|★/.test(l)).map((l) => '  M2 ' + l.trim()).join('\n'));
    ok = b1 && b2 && b3 && b7;
    console.log(JSON.stringify({ mode: 'mutate',
      M1: { mutation: '刪掉守衛那一行', expect: 'B1/B2/B3 三條都紅',
        got: { B1: b1 ? '紅 ✅' : '沒紅 ❌', B2: b2 ? '紅 ✅' : '沒紅 ❌', B3: b3 ? '紅 ✅' : '沒紅 ❌' } },
      M2: { mutation: 'e.timeStamp → nowMs（按下時刻換成派送時刻）', expect: 'B7 紅',
        got: b7 ? '紅 ✅（B7 真的在驗 timeStamp 那條路）' : '沒紅 ❌（B7 零鑑別力）' },
      verdict: ok ? '突變驗紅 ✅' : '突變沒驗紅 ❌（這組綠燈不可信）' }));
  } finally {
    /* 原檔沒動過，「還原」＝刪掉暫存突變體。★清完才 exit★（exit 會直接終止行程、finally 不會跑） */
    for (const x of [f, f2]) fs.rmSync(path.join(ROOT, x), { force: true });
  }
  process.exit(ok ? 0 : 1);
};

if (opt.mutate) mutate(); else main();
