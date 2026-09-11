// 開標後燒香重觸發競標——紅／綠迴圈探針（2026-09-11 真機回饋：「同一夜競標兩次、扣兩次壽命」）
// 用法：node tests/tools/reveal-reentry-probe.mjs [--port=9531] [--seed=1] [--page=index.html] [--json=<out>]
//       node tests/tools/reveal-reentry-probe.mjs --mutate          ← 突變驗紅（見下）
//   --page=<檔名>  要驗的頁面（相對 repo 根）。對照舊版：先 `git show c866b01:index.html > old.html` 再 --page=old.html
//
// `--mutate`：**全綠沒有證明力**——A1／A6 的綠燈可以只來自「交卷時把 .incbar 移除了」，
// 而 BIDS_OPEN 那道閘一行都沒被執行到（2026-09-11 對抗覆審 F1 實際抓到的就是這個）。
// 這個模式造兩個「只刪一行」的突變體（原檔全程唯讀，不做反向 sed）各跑一次：
//   M1＝刪掉 showMarket 的 `if(!BIDS_OPEN) return;`      ⇒ 預期 **A7 紅**（閘真的有在擋）
//   M2＝刪掉 submitHumanBids 裡清 `#south .incbar` 那行  ⇒ 預期 **仍全綠**
//       （按鈕還在、使用者那一下真的按到了，是閘擋下來的——修好的路徑不是只靠把按鈕藏起來）
// 兩個預期都符合才 exit 0。改動本檔或 index.html 的相位閘之後**一定要跑這個模式**。
//
// 走的是**真實 UI**：真的按 #mainbtn、真的用 DOM click 按 .incbar 的「＋」，不呼叫任何引擎內部函式來造狀態。
// 一顆種子跑兩局（同一顆、同樣的操作，只差一個動作）：
//   對照組 control：第 1 夜出價階段按一次「＋」（燒 1 點香）→ 蓋牌開標 → 成交總覽 → 直接按「🕯️ 請神」
//   重現組 bug    ：一模一樣，但在**成交總覽畫面**多按一次 .incbar 的「＋」，再照著畫面往下走
// 量三件事（凍結檔 docs/experiments/2026-09-11-acceptance-reveal-reentry.md）：
//   A1 按下去之後 #mainbtn 有沒有退回「蓋牌開標」、#stage 有沒有重新長出 #market
//   A2 兩組在第 1 夜結束（請神跑完）時四家壽命是否逐位相等
//   A3 重現組第 1 夜 resolveAuction 被呼叫幾次
//   A4-1/A4-2 出價階段按「＋」真的讓 INC.amt +1；對照組燒掉的 1 點真的從壽命扣掉
// resolveAuction 的計數是**包住真函式**（不是重抄一份邏輯）：頁面 script 是 classic script，
// 頂層函式就掛在 window 上，包一層之後 startReveal 裡的呼叫走的還是同一個綁定。
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
const PORT = +(opt.port || 9531);
const SEED = +(opt.seed || 1);
const PAGE = opt.page || 'index.html';

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

const ST = `(() => {
  const b = document.getElementById('mainbtn');
  const S = window.__yaoshi.S;
  return { txt: b ? b.textContent : '', dis: b ? b.disabled : true,
    round: S ? S.round : 0,
    lives: S ? S.players.map(p => p.life) : null,
    incAmt: (typeof INC !== 'undefined' && INC) ? INC.amt : null,
    incEnv: (S && S.incense) ? JSON.stringify(S.incense) : null,
    ra: window.__raCount | 0,
    hasMarket: !!document.getElementById('market'),
    incBtns: document.querySelectorAll('.incbar button').length,
    incPlusDisabled: (() => { const bs = document.querySelectorAll('.incbar button'); return bs.length > 1 ? bs[1].disabled : null; })() };
})()`;

/* 真的用滑鼠語意按「＋」：.incbar 的第二顆按鈕（第一顆是「−」）。回傳按之前／之後的按鈕文字。 */
const CLICK_PLUS = `(() => {
  const bs = [...document.querySelectorAll('.incbar button')];
  if (bs.length < 2) return { ok: 0, why: 'no .incbar button', n: bs.length };
  if (bs[1].disabled) return { ok: 0, why: 'plus disabled', n: bs.length };
  bs[1].click();
  return { ok: 1, n: bs.length };
})()`;

/* 推到「文字符合 re、且按鈕可按」為止。
   ★讀狀態與按鈕點擊必須在同一次 evaluate 裡原子完成★：分成兩次（先讀、再 page.click）會有競態——
   startReveal 收尾是「先寫 textContent、再 disabled=false」，兩步之間讀到的是「目標文字＋停用」，
   於是外圈判定不符、下一拍又看到它變成可按，就把目標畫面那顆鈕一起按掉、衝進下一夜（實測踩過）。
   modal 上的選尊／供奉詢問一併在同一支裡處理。 */
async function driveUntil(page, re, tag, path) {
  const src = re.source;
  for (let i = 0; i < 600; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      /* 熱座交棒遮罩優先：它蓋在畫面上時 #mainbtn 還停在上一位的狀態，先按「開始出價」才算推進 */
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
      return { hit: 0 };
    })()`);
    if (r.hit) return await page.evaluate(ST);
    if (r.clicked) path.push(`${r.round}|${r.txt}`);
  }
  throw new Error(`driveUntil 卡住（${tag}），最後畫面：` + JSON.stringify(await page.evaluate(ST)));
}

/* ★一定要重試★（v0.53.3 之後）：主鈕現在有連點守衛——上一下若在自己的同步執行裡把主鈕換了手，
   接下來 MAIN_GUARD_MS 內的點擊會被吞掉。治具跑得比人快，常常正好撞在那個視窗裡，
   所以「按一下就假設它生效」會靜默走偏（實測：熱座第一席交卷被吞 ⇒ 第二席根本沒換人，
   同一席被按了兩次「＋」，A6 量到 0→1／1→2）。這一支按到畫面真的變了為止。
   注意：它只讓**驅動**變可靠，判準一格沒動；真正卡死仍由 A8_no_stall 抓（突變體 M1 實測會紅）。 */
async function clickMainUntilTakes(page, tag) {
  const b0 = await page.evaluate(ST);
  for (let i = 0; i < 40; i++) {
    await page.click('#mainbtn').catch(() => {});
    await page.waitForTimeout(60);
    const s = await page.evaluate(ST).catch(() => null);
    if (!s) return null;
    const ho = await page.evaluate(`(() => { const h = document.getElementById('handoff');
      return !!(h && getComputedStyle(h).display !== 'none'); })()`).catch(() => false);
    if (ho || s.txt !== b0.txt || s.dis !== b0.dis || s.hasMarket !== b0.hasMarket) return s;
  }
  throw new Error(`clickMainUntilTakes 沒生效（${tag}）`);
}

/* 跑一局到第 1 夜結束（請神演出跑完、#mainbtn＝開戰）。bump2=true 就在成交總覽多按一次「＋」。 */
async function playNight1(page, seed, bump2) {
  const rec = { seed, bump2, path: [] };
  await page.evaluate((sd) => {
    CFG.T = 1;
    const F = window.__yaoshi.PW_FX;
    for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__raCount = 0;
    if (!window.__raWrapped) { const o = window.resolveAuction; window.resolveAuction = function () { window.__raCount++; return o.apply(this, arguments); }; window.__raWrapped = 1; }
    window.__yaoshi.newGame('solo', sd, ['qingmian']);
  }, seed);

  // ① 推到第 1 夜的出價畫面
  const bid = await driveUntil(page, /蓋牌/, '出價畫面', rec.path);
  rec.round = bid.round;
  rec.livesAtBid = bid.lives;
  rec.incAmtBefore = bid.incAmt;
  rec.incBtns = bid.incBtns;
  // ② 出價階段真的按一次「＋」（A4-1）
  rec.plus1 = await page.evaluate(CLICK_PLUS);
  await page.waitForTimeout(30);
  rec.incAmtAfter = (await page.evaluate(ST)).incAmt;

  // ③ 蓋牌開標 → 一路推到「本夜成交總覽」（#mainbtn＝🕯️ 請神／開戰）
  await clickMainUntilTakes(page, '蓋牌開標');
  rec.path.push(`${bid.round}|蓋牌開標`);
  const done = await driveUntil(page, /請神|開戰/, '成交總覽', rec.path);
  rec.atSummary = { txt: done.txt, lives: done.lives, ra: done.ra, incEnv: done.incEnv, incBtns: done.incBtns, incPlusDisabled: done.incPlusDisabled, hasMarket: done.hasMarket };

  // ④ 重現組：在成交總覽畫面按一次「＋」（＝使用者回報的那一下）
  if (bump2) {
    rec.plus2 = await page.evaluate(CLICK_PLUS);
    await page.waitForTimeout(60);
    const after = await page.evaluate(ST);
    rec.afterPlus2 = { txt: after.txt, dis: after.dis, hasMarket: after.hasMarket, round: after.round, lives: after.lives, incAmt: after.incAmt, ra: after.ra };
    rec.A1_rewound = /蓋牌/.test(after.txt) || after.hasMarket;
    // 照著畫面往下走（使用者會做的事）：畫面退回出價就再按一次蓋牌開標，再推到總覽
    if (rec.A1_rewound) {
      const st2 = await driveUntil(page, /請神|開戰|蓋牌/, '第二輪', rec.path);
      if (/蓋牌/.test(st2.txt)) { await clickMainUntilTakes(page, '蓋牌開標(第二次)'); rec.path.push(`${st2.round}|蓋牌開標(第二次)`); }
      const done2 = await driveUntil(page, /請神|開戰/, '第二次成交總覽', rec.path);
      rec.atSummary2 = { txt: done2.txt, lives: done2.lives, ra: done2.ra, incEnv: done2.incEnv };
    }
  }

  // ④' ★直接行使相位閘本身★（覆審 F1：光靠「按鈕被移除」的綠燈，證明不了 BIDS_OPEN 那道閘有在擋——
  //     那行被刪掉探針照樣全綠＝零鑑別力）。這裡在總覽畫面**直接呼叫**三支會被閘擋的函式，
  //     它們正是「按鈕沒被清乾淨時會走到的那三支」，量的是閘擋不擋得住，不是按鈕在不在。
  //     ★只跑在重現組★：對照組要保持「使用者的正常玩法」原樣，才當得起 A2 的基準。
  if (bump2) rec.forced = await page.evaluate(`(() => {
    const S = window.__yaoshi.S;
    const snap = () => ({ txt: document.getElementById('mainbtn').textContent,
      inc: (typeof INC !== 'undefined' && INC) ? INC.amt : null,
      ra: window.__raCount | 0, round: S.round, hasMarket: !!document.getElementById('market') });
    const before = snap(); const err = {};
    try { showMarket(); } catch (e) { err.showMarket = String(e); }
    try { incBump(1); } catch (e) { err.incBump = String(e); }
    try { submitHumanBids(); } catch (e) { err.submitHumanBids = String(e); }
    return { before, after: snap(), err };
  })()`);
  if (bump2) await page.waitForTimeout(60);

  // ⑤ 按「🕯️ 請神」（resolveShrines 在這裡收香火、扣壽命）→ 推到「開戰」
  /* 卡住也要把逐條判定印出來（突變體驗紅時就是卡在這裡：閘被拿掉之後 #mainbtn 被重綁回
     submitHumanBids，而它自己的閘擋下了 ⇒ 畫面推不動）。所以不丟錯，記 stuck 再往下判。 */
  let end;
  try { end = await driveUntil(page, /開戰/, '請神後', rec.path); }
  catch (e) { rec.stuck = String(e.message).slice(0, 300); end = await page.evaluate(ST); }
  rec.atBattle = { lives: end.lives, ra: end.ra, round: end.round };
  rec.raNight1 = end.ra;
  return rec;
}

/* A6 熱座回歸（不變量掃描的一條）：BIDS_OPEN 若恆假／或交棒後沒重開，兩席就出不了價。
   兩席各真按一次「＋」，兩次都要看到 INC.amt 0→1；整夜要走得到「開戰」；總覽畫面按「＋」一樣要無效。 */
async function playHotseatNight1(page, seed) {
  const rec = { seed, path: [], seats: [] };
  await page.evaluate((sd) => {
    CFG.T = 1;
    const F = window.__yaoshi.PW_FX;
    for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__raCount = 0;
    window.__yaoshi.newGame('hotseat', sd, ['qingmian', 'hongyi']);
  }, seed);
  for (let seat = 0; seat < 2; seat++) {
    const bid = await driveUntil(page, /蓋牌/, `熱座第 ${seat + 1} 席出價畫面`, rec.path);
    const before = bid.incAmt;
    const p = await page.evaluate(CLICK_PLUS);
    await page.waitForTimeout(30);
    const after = (await page.evaluate(ST)).incAmt;
    rec.seats.push({ seat, active: bid.txt, before, after, plus: p });
    await clickMainUntilTakes(page, `熱座第 ${seat + 1} 席交卷`);
    rec.path.push(`${bid.round}|${bid.txt}`);
  }
  const sum = await driveUntil(page, /請神|開戰/, '熱座成交總覽', rec.path);
  rec.atSummary = { txt: sum.txt, lives: sum.lives, ra: sum.ra };
  rec.plusAtSummary = await page.evaluate(CLICK_PLUS);
  await page.waitForTimeout(60);
  const after = await page.evaluate(ST);
  rec.afterPlusAtSummary = { txt: after.txt, hasMarket: after.hasMarket };
  let end;
  try { end = await driveUntil(page, /開戰/, '熱座請神後', rec.path); }
  catch (e) { rec.stuck = String(e.message).slice(0, 300); end = await page.evaluate(ST); }
  rec.atBattle = { lives: end.lives, ra: end.ra, round: end.round };
  return rec;
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
    await page.goto(`http://127.0.0.1:${PORT}/${PAGE}`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
    out.version = await page.evaluate(`(() => VERSION)()`);
    out.incMax = await page.evaluate(`(() => CFG.INC_MAX)()`);

    out.control = await playNight1(page, SEED, false);
    out.bug = await playNight1(page, SEED, true);
    out.hotseat = await playHotseatNight1(page, SEED);

    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const c = out.control, b = out.bug;
    out.checks = {
      A1_no_rewind: { pass: !b.A1_rewound, mainbtnAfterPlus: b.afterPlus2 ? b.afterPlus2.txt : null, hasMarket: b.afterPlus2 ? b.afterPlus2.hasMarket : null },
      A2_life_once: { pass: eq(c.atBattle.lives, b.atBattle.lives), control: c.atBattle.lives, bug: b.atBattle.lives,
        humanDelta: (b.atBattle.lives && c.atBattle.lives) ? b.atBattle.lives[0] - c.atBattle.lives[0] : null },
      A3_one_auction: { pass: b.raNight1 === 1, resolveAuctionCalls: b.raNight1, controlCalls: c.raNight1 },
      A4_1_plus_works: { pass: c.incAmtBefore === 0 && c.incAmtAfter === 1, before: c.incAmtBefore, after: c.incAmtAfter },
      A4_2_incense_burns: { pass: c.atBattle.lives[0] === c.atSummary.lives[0] - 1,
        lifeAtSummary: c.atSummary.lives[0], lifeAfterShrine: c.atBattle.lives[0] },
      /* A7：直接行使相位閘（覆審 F1）。只要 BIDS_OPEN 那三道 return 有一道被拿掉，
         showMarket／incBump／submitHumanBids 三支裡就會有一支真的動到狀態，這條立刻紅。 */
      A7_gate_holds: (() => {
        const f = b.forced, B = f.before, A = f.after;
        return { pass: A.ra === B.ra && A.txt === B.txt && A.inc === B.inc && A.round === B.round && !A.hasMarket && !Object.keys(f.err).length,
          before: B, after: A, err: f.err };
      })(),
      A6_hotseat: (() => {
        const h = out.hotseat;
        const bothBurned = h.seats.length === 2 && h.seats.every((s) => s.before === 0 && s.after === 1);
        const noRewind = !/蓋牌/.test(h.afterPlusAtSummary.txt) && !h.afterPlusAtSummary.hasMarket;
        return { pass: bothBurned && noRewind && h.atBattle.round === 1 && h.atBattle.ra === 1,
          seats: h.seats.map((s) => `${s.before}→${s.after}`), afterPlus: h.afterPlusAtSummary, ra: h.atBattle.ra, round: h.atBattle.round };
      })(),
    };
    out.checks.A8_no_stall = { pass: !c.stuck && !b.stuck && !out.hotseat.stuck, control: c.stuck || null, bug: b.stuck || null, hotseat: out.hotseat.stuck || null };
    out.pass = Object.values(out.checks).every((x) => x.pass) && out.pageerrors.length === 0;
  } catch (e) {
    out.fatal = String(e && e.stack || e);
    out.pass = false;
  } finally {
    await browser.close();
    srv.kill();
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 2));
  const c = out.checks || {};
  console.log(`page=${out.page} VERSION=${out.version} seed=${out.seed}`);
  if (out.fatal) console.log('FATAL ' + out.fatal);
  for (const [k, v] of Object.entries(c)) console.log(`  ${v.pass ? '綠 PASS' : '紅 FAIL'} ${k}  ${JSON.stringify(v)}`);
  if (out.pageerrors.length) console.log('  pageerror: ' + out.pageerrors.slice(0, 3).join(' | '));
  console.log(`  控制組壽命軌跡 出價前=${JSON.stringify(out.control && out.control.livesAtBid)} 總覽=${JSON.stringify(out.control && out.control.atSummary && out.control.atSummary.lives)} 請神後=${JSON.stringify(out.control && out.control.atBattle && out.control.atBattle.lives)}`);
  console.log(`  重現組壽命軌跡 出價前=${JSON.stringify(out.bug && out.bug.livesAtBid)} 總覽=${JSON.stringify(out.bug && out.bug.atSummary && out.bug.atSummary.lives)} 請神後=${JSON.stringify(out.bug && out.bug.atBattle && out.bug.atBattle.lives)}`);
  console.log(out.pass ? '★ 全綠 PASS' : '★ 有紅 FAIL');
  process.exit(out.pass ? 0 : 1);
};

/* ---- 突變驗紅：造兩個只刪一行的副本，各用子行程跑一次本檔（原 index.html 全程唯讀） ---- */
function cutLine(txt, needle, tag) {
  const lines = txt.split(/(?<=\n)/);
  const i = lines.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error('找不到要刪的那一行（' + tag + '）：' + needle);
  const gone = lines[i].trim();
  lines.splice(i, 1);
  return { out: lines.join(''), gone };
}
function runChild(page, port) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), `--page=${page}`, `--port=${port}`, `--json=${path.join(ROOT, page)}.json`],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    p.stdout.on('data', (d) => { buf += d; });
    p.on('close', (code) => res({ code, out: buf }));
  });
}
const mutate = async () => {
  const src = path.join(ROOT, 'index.html');
  const txt = fs.readFileSync(src, 'utf8');
  const m1 = cutLine(txt, 'if(!BIDS_OPEN) return;   /* 交卷', 'M1');
  const m2 = cutLine(txt, 'document.querySelectorAll("#south .incbar")', 'M2');
  /* 檔名走 .gitignore 的 old-*.html（閘門治具的暫存快照，不版控） */
  const f1 = 'old-mut1-noguard.html', f2 = 'old-mut2-nodomclean.html';
  let ok = false;
  fs.writeFileSync(path.join(ROOT, f1), m1.out, 'utf8');
  fs.writeFileSync(path.join(ROOT, f2), m2.out, 'utf8');
  try {
    console.log(`M1 刪掉：${m1.gone.slice(0, 60)}\nM2 刪掉：${m2.gone.slice(0, 60)}\n`);
    const r1 = await runChild(f1, PORT + 60);
    const r2 = await runChild(f2, PORT + 61);
    const a7red = /紅 FAIL A7_gate_holds/.test(r1.out);
    const m2green = r2.code === 0;
    /* 兩個子行程的**所有**紅燈都印出來（只挑幾條看會漏掉真正的失敗原因，踩過一次） */
    console.log(r1.out.split('\n').filter((l) => /紅 FAIL|A7_gate_holds|★/.test(l)).map((l) => '  M1 ' + l.trim()).join('\n'));
    console.log(r2.out.split('\n').filter((l) => /紅 FAIL|A1_no_rewind|A7_gate_holds|★/.test(l)).map((l) => '  M2 ' + l.trim()).join('\n'));
    ok = a7red && m2green;
    console.log(JSON.stringify({ mode: 'mutate', M1: { expect: 'A7 紅', got: a7red ? 'A7 紅 ✅' : 'A7 沒紅 ❌（閘沒有鑑別力）', exit: r1.code },
      M2: { expect: '仍全綠', got: m2green ? '全綠 ✅（是閘擋下的，不是靠移除按鈕）' : '有紅 ❌', exit: r2.code },
      verdict: ok ? '突變驗紅 ✅' : '突變沒驗紅 ❌（這組綠燈不可信）' }));
  } finally {
    /* 原檔沒動過，「還原」＝刪掉暫存突變體與它們的 json。
       ★清乾淨之後才 process.exit★：exit 會直接終止行程、finally 不會跑，順序寫反就會留一地暫存檔。 */
    for (const f of [f1, f2, f1 + '.json', f2 + '.json']) fs.rmSync(path.join(ROOT, f), { force: true });
  }
  process.exit(ok ? 0 : 1);
};

if (opt.mutate) mutate(); else main();
