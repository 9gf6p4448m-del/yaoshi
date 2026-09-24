// 夜行錄 N1 整局治具（凍結 #7、#12）：Playwright 手機視口 390×844，從首頁點「夜行錄」→ 第 1 章 → 引言卡 → 選角（排除主角）
// → 自動打完整局（驅動器與 tests/tools/replay-export-probe.mjs 同一套：主鈕推進、交棒／供奉／請神視窗、停滯按跳過）→ 真實 endGame。
// 兩條路徑各從首頁跑一次：fail（局末前把真人設成出局）與 pass（局末前把主角設成出局）——掛點只改 S 的存活欄位，局末畫面走真實 endGame。
// 量：pageerror／console error 計數；第 1 章整局 DOM 文字（去掉 script／style 的 body.textContent＋title）掃六個連鎖名與「天命」，
//     每 15 次驅動取樣一次＋每個畫面各一次＋局中主動打開袋子（自己／他席）與規則頁各掃一次；最後在常規狀態打開規則頁做掃描器正對照。
//     三張截圖（章節選單、引言卡、殘卷卡）＋scrollWidth；局末卡文字、主角台詞、存檔值、再挑戰／回章節選單的重載落點。
// ★直式事實★：本遊戲直式（portrait）整頁被 #rotateHint（z-index 99）蓋住要求轉橫，這是既有設計。390×844 下的點擊一律走
//   element.click()（DOM 事件，不經命中測試）；390×844 截圖時治具暫時隱藏 #rotateHint 以拍到底下的版面（檔名 -390x844.png），
//   另拍一張不隱藏的原貌（portrait-raw.png），並把同一畫面在 844×390 橫式再拍一張（-844x390.png，玩家實際看到的方向）。
// 用法：node tests/tools/nightwalk-probe.mjs [輸出目錄=docs/experiments/2026-09-25-n1-nightwalk]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs/experiments/2026-09-25-n1-nightwalk'));
const PORT = 9631;
const W = 390, H = 844;
const NAMES = ['水陸偷渡', '千眼神算', '雙虎滅煞', '血祭過陰', '神王破煞', '長明渡幽', '天命'];
fs.mkdirSync(OUT, { recursive: true });

const SCAN_FN = `(() => {
  const c = document.body.cloneNode(true);
  c.querySelectorAll('script,style,template').forEach((e) => e.remove());
  const t = (document.title || '') + '\\n' + c.textContent;
  return { hits: ${JSON.stringify(NAMES)}.filter((n) => t.includes(n)), len: t.length };
})()`;

async function scan(page, log, where) {
  const r = await page.evaluate(SCAN_FN);
  log.samples++;
  log.chars += r.len;
  if (r.hits.length) log.hits.push({ where, hits: r.hits });
}

async function driveUntil(page, re, log) {
  const src = re.source; let idle = 0;
  for (let i = 0; i < 8000; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0 }; }
      const b = document.getElementById('mainbtn');
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0 }; }
      }
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0 }; }
      }
      return { hit: 0, idle: 1 };
    })()`);
    if (i % 15 === 0) await scan(page, log, 'drive#' + i + ' round ' + await page.evaluate(() => window.__yaoshi.S && window.__yaoshi.S.round));
    if (r.hit) return r.txt;
    idle = r.idle ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  throw new Error('driveUntil 卡住：' + await page.evaluate(() => document.getElementById('mainbtn') && document.getElementById('mainbtn').textContent));
}

/* 版面量測：卡片（cardSel）完整顯示＝框在視口內且內容沒被自己裁掉；否則要有可捲的一層（卡片本身或最近的可捲祖先）。 */
const layoutOf = (page, cardSel) => page.evaluate((cardSel) => {
  const s = document.getElementById('nwScr');
  const card = document.querySelector(cardSel);
  const r = card ? card.getBoundingClientRect() : null;
  let sc = null;
  for (let e = card; e && e !== document.body; e = e.parentElement) {
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 1) { sc = e; break; }
  }
  const fully = !!r && r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5 && card.scrollHeight <= card.clientHeight + 1;
  return {
    viewport: [innerWidth, innerHeight],
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    nwScrollWidth: s ? s.scrollWidth : null, nwClientWidth: s ? s.clientWidth : null,
    nwScrollHeight: s ? s.scrollHeight : null, nwClientHeight: s ? s.clientHeight : null,
    nwOverflowY: s ? getComputedStyle(s).overflowY : null,
    cardRect: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null,
    cardScroll: card ? [card.scrollHeight, card.clientHeight, getComputedStyle(card).overflowY] : null,
    fully, scroller: sc ? (sc === card ? 'card' : '#' + sc.id + '.' + String(sc.className).slice(0, 30)) : null,
    view: s ? s.dataset.view : null,
  };
}, cardSel);
/* 按鈕捲得到：scrollIntoView 之後框在視口內，且框中心點命中的就是它（或它的子元素）＝可點 */
const reach = (page, sels) => page.evaluate((sels) => sels.map((sel) => {
  const el = document.querySelector(sel);
  if (!el) return { sel, found: false, ok: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const inView = r.width > 0 && r.height > 0 && r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5;
  const clickable = !!hit && (hit === el || el.contains(hit));
  return { sel, found: true, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), inView, clickable, hit: hit ? hit.tagName + '#' + hit.id : null, ok: inView && clickable };
}), sels);
const resetScroll = (page) => page.evaluate(() => {
  for (const q of ['#nwScr', '#nwScr .stageCard', '#felt', '#stage', '#stage .stageCard']) { const e = document.querySelector(q); if (e) e.scrollTop = 0; }
});

/* 直式 390×844（暫時隱藏 #rotateHint）＋橫式 844×390 各量一次、各拍一張；橫式卡片沒有完整顯示時，另拍一張「捲到按鈕後」 */
async function shoot(page, name, evid, cardSel, btnSels) {
  const hide = await page.addStyleTag({ content: '#rotateHint{display:none!important}' });
  await page.waitForTimeout(120);
  await resetScroll(page);
  const portrait = await layoutOf(page, cardSel);
  await page.screenshot({ path: path.join(OUT, `probe-${name}-390x844.png`) });
  const portraitBtns = await reach(page, btnSels);
  await hide.evaluate((el) => el.remove());
  await page.setViewportSize({ width: H, height: W });
  await page.waitForTimeout(250);
  await resetScroll(page);
  const landscape = await layoutOf(page, cardSel);
  const files = [`probe-${name}-390x844.png`, `probe-${name}-844x390.png`];
  await page.screenshot({ path: path.join(OUT, files[1]) });
  const landscapeBtns = await reach(page, btnSels);
  if (!landscape.fully) { files.push(`probe-${name}-844x390-btn.png`); await page.screenshot({ path: path.join(OUT, files[2]) }); }
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(200);
  await resetScroll(page);
  /* 凍結 #12 的判準是 documentElement.scrollWidth ≤ 390；另加夜行錄這一層（#nwScr 與卡片）不超寬、卡片完整或可捲、按鈕捲得到且可點。
     body.scrollWidth 只記錄不判：局末北家對話泡（既有 .bubble，white-space:nowrap）在直式會把 body 撐到 522，
     基準 3a0d971 常規局同樣 522（body 是 position:fixed＋overflow:hidden，頁面不會橫捲；直式本來就被 #rotateHint 蓋住）。
     橫式 844×390（協調者加嚴）：documentElement.scrollWidth ≤ 844、卡片完整或可捲、按鈕 scrollIntoView 後在視口內且可點。 */
  const ok = portrait.docScrollWidth <= W && (portrait.nwScrollWidth || 0) <= W
    && !!portrait.cardRect && portrait.cardRect[0] >= 0 && portrait.cardRect[2] <= W
    && (portrait.fully || !!portrait.scroller) && portraitBtns.every((b) => b.ok);
  const okLandscape = landscape.docScrollWidth <= H && (landscape.fully || !!landscape.scroller) && landscapeBtns.every((b) => b.ok);
  evid.shots[name] = { portrait, portraitBtns, landscape, landscapeBtns, ok, okLandscape, files };
}

/* 額外畫面（不在凍結三張內）：直式隱藏 #rotateHint 一張＋橫式一張 */
async function shootExtra(page, name, evid) {
  const hide = await page.addStyleTag({ content: '#rotateHint{display:none!important}' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, `probe-${name}-390x844.png`) });
  await hide.evaluate((el) => el.remove());
  await page.setViewportSize({ width: H, height: W });
  await page.waitForTimeout(250);
  const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: path.join(OUT, `probe-${name}-844x390.png`) });
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(200);
  evid.extraShots[name] = { files: [`probe-${name}-390x844.png`, `probe-${name}-844x390.png`], landscapeDocScrollWidth: docScrollWidth };
}

/* 第 1 夜：推進到出價畫面（盯上畫面按主鈕「不盯任何一件」），在出價畫面取樣對話泡；取樣 3 次後再呼叫一次 showMarket()
   （加減價時產品走的同一支重畫）確認泡還在。盯上畫面上的泡也記下來（只記錄不判）。 */
const BUBBLES_FN = `[...document.querySelectorAll('.bubble.show')].map((e) => ({ id: e.id, text: e.textContent }))`;
async function reachBidAndSample(page, feudOpen) {
  const out = { markScreen: [], bid: [], afterRerender: null, reached: false };
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(50);
    const st = await page.evaluate(`(() => { const b = document.getElementById('mainbtn');
      return { round: window.__yaoshi.S.round, txt: b.textContent, dis: b.disabled, bubbles: ${BUBBLES_FN} }; })()`);
    if (st.round !== 1) break;
    if (/^蓋牌/.test(st.txt)) {
      out.reached = true;
      out.bid.push(st.bubbles);
      if (out.bid.length >= 3) {
        out.afterRerender = await page.evaluate(`(() => { showMarket(); return ${BUBBLES_FN}; })()`);
        break;
      }
      continue;
    }
    out.markScreen.push(st.bubbles);
    await page.evaluate(() => {
      const b = document.getElementById('mainbtn');
      if (b && !b.disabled) { b.click(); return; }
      const sb = [...document.querySelectorAll('#stage button')].find((e) => !e.disabled); if (sb) sb.click();
    });
  }
  const has = (arr) => arr.some((b) => b.text.includes(feudOpen));
  out.hitOnBid = out.bid.some(has);
  out.hitAfterRerender = !!out.afterRerender && has(out.afterRerender);
  out.seenOnMarkScreen = out.markScreen.some(has);
  return out;
}
async function runPath(browser, mode, evid) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const P = { mode, pageerrors: [], consoleErrors: [], scan: { samples: 0, chars: 0, hits: [] } };
  page.on('pageerror', (e) => P.pageerrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') P.consoleErrors.push(m.text()); });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 20000 });
    await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
    P.rotateHintShownInPortrait = await page.evaluate(() => getComputedStyle(document.getElementById('rotateHint')).display !== 'none');
    if (mode === 'fail') await page.screenshot({ path: path.join(OUT, 'probe-portrait-raw.png') });
    /* 常規選角對照：單人入市仍是 10 角色 */
    await page.evaluate(() => document.querySelector('#titleScr .btns button').click());
    await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard').length > 0);
    P.regularSelectCards = await page.evaluate(() => document.querySelectorAll('#selGrid .rcard').length);
    await page.evaluate(() => document.querySelector('#selHead .selback').click());
    /* 首頁 → 夜行錄 */
    P.titleButtons = await page.evaluate(() => [...document.querySelectorAll('#titleScr .btns button')].map((b) => b.textContent));
    if (mode === 'fail') await shootExtra(page, 'title', evid);
    await page.evaluate(() => document.getElementById('nwEntry').click());
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu');
    P.menu = await page.evaluate(() => [...document.querySelectorAll('#nwScr .nwCard')].map((c) => ({ ch: c.dataset.ch, cls: c.className, text: c.innerText.replace(/\s+/g, ' ').trim(), avatarSvg: !!c.querySelector('.nwAv svg') })));
    await scan(page, P.scan, 'menu');
    if (mode === 'fail') await shoot(page, 'menu', evid, '#nwScr .nwGrid', ['#nwScr .nwCard[data-ch="1"] .nwBtns button']);
    /* 第 1 章 → 引言卡 */
    await page.evaluate(() => document.querySelector('#nwScr .nwCard[data-ch="1"] .nwBtns button').click());
    await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro');
    P.intro = await page.evaluate(() => document.querySelector('#nwScr .stageCard').innerText);
    await scan(page, P.scan, 'intro');
    if (mode === 'fail') await shoot(page, 'intro', evid, '#nwScr .stageCard', ['#nwGo']);
    /* 選角（排除主角） */
    await page.evaluate(() => document.getElementById('nwGo').click());
    await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard').length > 0);
    P.select = await page.evaluate(() => ({ title: document.getElementById('selTitle').textContent, cards: [...document.querySelectorAll('#selGrid .rcard .rnm')].map((e) => e.textContent) }));
    await scan(page, P.scan, 'select');
    await page.evaluate((i) => document.querySelectorAll('#selGrid .rcard')[i].click(), mode === 'fail' ? 0 : 4);
    await page.evaluate(() => document.getElementById('selBtn').click());
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.chapter === 1);
    P.game = await page.evaluate(() => { const S = window.__yaoshi.S; return { seed: S.seed, chapter: S.chapter, chainsOff: S.chainsOff, destinyEffectMode: S.destinyEffectMode, destinyAiChase: S.destinyAiChase, seats: S.players.map((p) => ({ role: p.roleId, human: !p.ai })) }; });
    /* 第 1 夜主角開局台詞：出價畫面階段 DOM 內要有含 feud.open 的對話泡（重畫後仍在） */
    P.feudOpen = await page.evaluate(() => window.__yaoshi.nwChapter(1).feud.open[0]);
    P.openBubble = await reachBidAndSample(page, P.feudOpen);
    /* 局中主動打開袋子（自己／北家主角）與規則頁各掃一次 */
    for (const [label, fn] of [['bag-self', 'showBag(0)'], ['bag-boss', 'showBag(1)'], ['help', 'openHelp()']]) {
      await page.evaluate(fn);
      await page.waitForTimeout(50);
      await scan(page, P.scan, 'round1 ' + label);
      if (label === 'help') P.helpSections = await page.evaluate(() => [...document.querySelectorAll('#modalbox div[style*="font-weight:bold"]')].map((e) => e.textContent));
      await page.evaluate(() => closeModal());
    }
    await driveUntil(page, /看最終結果/, P.scan);
    for (const [label, fn] of [['bag-self', 'showBag(0)'], ['help', 'openHelp()']]) {
      await page.evaluate(fn); await page.waitForTimeout(50); await scan(page, P.scan, 'last ' + label); await page.evaluate(() => closeModal());
    }
    /* 掛點：只改存活欄位決定結果；局末畫面走真實 endGame（主鈕的 onclick） */
    P.force = await page.evaluate((m) => {
      const Y = window.__yaoshi, S = Y.S, ch = Y.nwChapter(S.chapter);
      const me = S.players.find((p) => !p.ai), boss = S.players.find((p) => p.ai && p.roleId === ch.boss);
      const natural = { pass: Y.nightwalkPass(S, ch), me: [me.alive, me.life], boss: [boss.alive, boss.life], round: S.round };
      if (m === 'pass') { boss.alive = false; boss.life = 0; me.alive = true; me.life = Math.max(me.life, 5); }
      else { me.alive = false; me.life = 0; }
      return { natural, forced: m };
    }, mode);
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /回章節選單/.test(document.getElementById('mainbtn').textContent), null, { timeout: 20000 });
    await page.waitForTimeout(100);
    P.end = await page.evaluate(() => ({
      card: document.querySelector('#stage .stageCard').innerText,
      verdict: (document.querySelector('#stage .nwVerdict') || {}).textContent || null,
      quote: (document.querySelector('#stage .nwQuote') || {}).textContent || null,
      bubble: (document.getElementById('bub1') || {}).textContent || null,
      readScroll: !!document.getElementById('nwReadScroll'), retry: !!document.getElementById('nwRetry'),
      mainbtn: document.getElementById('mainbtn').textContent,
      reviewButtons: [...document.querySelectorAll('#stage button')].filter((b) => /showReview/.test(b.getAttribute('onclick') || '')).length,
      saved: localStorage.getItem('yaoshi_nightwalk_v1'),
      feud: window.__yaoshi.nwChapter(1).feud,
    }));
    await scan(page, P.scan, 'end');
    await shoot(page, 'end-' + mode, evid, '#stage .stageCard', [mode === 'pass' ? '#nwReadScroll' : '#nwRetry', '#mainbtn']);
    if (mode === 'pass') {
      await page.evaluate(() => document.getElementById('nwReadScroll').click());
      await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'scroll');
      P.scroll = await page.evaluate(() => document.querySelector('#nwScr .stageCard').innerText);
      await scan(page, P.scan, 'scroll');
      await shoot(page, 'scroll', evid, '#nwScr .stageCard', ['#nwScrollClose']);
      await page.evaluate(() => document.getElementById('nwScrollClose').click());
      P.scrollClosed = await page.evaluate(() => !document.getElementById('nwScr').classList.contains('on') && /回章節選單/.test(document.getElementById('mainbtn').textContent));
      /* 回章節選單（重載 ?nw=menu）→ 第 1 章已通關、第 2 章可挑戰、第 3 章仍鎖 */
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.evaluate(() => document.getElementById('mainbtn').click())]);
      await page.waitForFunction(() => document.getElementById('nwScr') && document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu', null, { timeout: 20000 });
      P.afterMenu = await page.evaluate(() => ({ url: location.search, cards: [...document.querySelectorAll('#nwScr .nwCard')].map((c) => ({ ch: c.dataset.ch, cls: c.className, st: (c.querySelector('.nwSt') || {}).textContent })) }));
      await shootExtra(page, 'menu-after-pass', evid);
    } else {
      /* 再挑戰（重載 ?nw=1）→ 第 1 章引言卡 */
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.evaluate(() => document.getElementById('nwRetry').click())]);
      await page.waitForFunction(() => document.getElementById('nwScr') && document.getElementById('nwScr').classList.contains('on'), null, { timeout: 20000 });
      P.afterRetry = await page.evaluate(() => ({ url: location.search, view: document.getElementById('nwScr').dataset.view, title: (document.querySelector('#nwScr .nwH') || {}).textContent }));
    }
    /* 掃描器正對照：同一頁換成常規單人狀態打開規則頁，必須掃到連鎖名與天命 */
    P.scannerPositive = await page.evaluate(`(() => { window.__yaoshi.makeState('solo', 5); openHelp(); const r = ${SCAN_FN}; closeModal(); return r.hits; })()`);
  } finally { await ctx.close(); }
  return P;
}

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const evid = { viewport: `${W}x${H}`, shots: {}, extraShots: {}, paths: {} };
try {
  for (const mode of ['fail', 'pass']) evid.paths[mode] = await runPath(browser, mode, evid);
} finally { await browser.close(); srv.kill(); }

const F = evid.paths.fail, Pp = evid.paths.pass;
const boss = '青面攤主';
const checks = {
  pageerrors0: F.pageerrors.length === 0 && Pp.pageerrors.length === 0,
  consoleErrors0: F.consoleErrors.length === 0 && Pp.consoleErrors.length === 0,
  domScan0: F.scan.hits.length === 0 && Pp.scan.hits.length === 0,
  scanLive: F.scan.samples > 20 && Pp.scan.samples > 20 && F.scannerPositive.length >= 2 && Pp.scannerPositive.includes('天命'),
  failVerdict: /未過關/.test(F.end.verdict || '') && F.end.verdict.includes(boss) && F.end.retry && !F.end.readScroll && F.end.saved === null,
  passVerdict: /過關/.test(Pp.end.verdict || '') && !/未過關/.test(Pp.end.verdict) && Pp.end.verdict.includes(boss) && Pp.end.readScroll && !Pp.end.retry && Pp.end.saved === '{"v":1,"cleared":[1]}',
  bossLines: F.end.bubble === F.end.feud.bossWin[0] && Pp.end.bubble === Pp.end.feud.bossLose[0] && (F.end.quote || '').includes(F.end.feud.bossWin[0]) && (Pp.end.quote || '').includes(Pp.end.feud.bossLose[0]),
  openBubbleOnBid: [F, Pp].every((x) => x.openBubble.reached && x.openBubble.hitOnBid && x.openBubble.hitAfterRerender),
  introQuote: [F, Pp].every((x) => x.intro.includes(x.feudOpen)),
  landscape844: ['menu', 'intro', 'scroll', 'end-fail', 'end-pass'].every((k) => evid.shots[k] && evid.shots[k].okLandscape),
  oneReviewButton: F.end.reviewButtons === 1 && Pp.end.reviewButtons === 1,
  selectExcludesBoss: F.select.cards.length === 9 && !F.select.cards.includes(boss) && F.regularSelectCards === 10,
  bossSeat: F.game.seats.filter((s) => s.role === 'qingmian').length === 1 && F.game.seats[1].role === 'qingmian' && !F.game.seats[1].human && F.game.chainsOff === true && F.game.destinyEffectMode === 'off',
  retryLandsIntro: F.afterRetry.view === 'intro' && F.afterRetry.title === '破廟逢青面' && !/nw=/.test(F.afterRetry.url),
  menuAfterPass: !!Pp.afterMenu && Pp.afterMenu.cards[0].st === '已通關 ✓' && Pp.afterMenu.cards[1].st === '可挑戰' && /locked/.test(Pp.afterMenu.cards[2].cls),
  scrollClosed: Pp.scrollClosed === true,
  screenshots3: ['menu', 'intro', 'scroll'].every((k) => evid.shots[k] && evid.shots[k].files.every((f) => fs.existsSync(path.join(OUT, f)))),
  scrollWidth390: ['menu', 'intro', 'scroll'].every((k) => evid.shots[k] && evid.shots[k].ok), /* 局末卡直式不在凍結 #12 三張內：只記錄 */
};
evid.checks = checks;
evid.allPass = Object.values(checks).every(Boolean);
evid.notes = [
  '直式 390×844 整頁被既有 #rotateHint 蓋住（要求轉橫）；-390x844.png 是治具暫時隱藏 #rotateHint 拍的底下版面，probe-portrait-raw.png 是原貌，-844x390.png 是玩家實際方向。',
  'shots.*.portrait.bodyScrollWidth 只記錄：局末北家對話泡（既有 .bubble nowrap）直式撐到 522，基準 3a0d971 常規局同為 522；documentElement.scrollWidth 恆 390（凍結 #12 判準）。',
  '局末結果由掛點改 S 的存活欄位決定（fail：真人出局；pass：主角出局）；force.natural 記錄改之前的自然結果。',
];
fs.writeFileSync(path.join(OUT, 'probe-result.json'), JSON.stringify(evid, null, 1), 'utf8');
console.log(JSON.stringify({ checks, allPass: evid.allPass,
  openBubble: { fail: F.openBubble, pass: Pp.openBubble },
  landscape: Object.fromEntries(Object.entries(evid.shots).map(([k, v]) => [k, { okLandscape: v.okLandscape, fully: v.landscape.fully, scroller: v.landscape.scroller, docW: v.landscape.docScrollWidth, btns: v.landscapeBtns.map((b) => [b.sel, b.ok, b.rect]) }])),
  fail: { seed: F.game.seed, natural: F.force.natural, verdict: F.end.verdict, pageerrors: F.pageerrors, consoleErrors: F.consoleErrors, scan: { samples: F.scan.samples, hits: F.scan.hits } },
  pass: { seed: Pp.game.seed, natural: Pp.force.natural, verdict: Pp.end.verdict, pageerrors: Pp.pageerrors, consoleErrors: Pp.consoleErrors, scan: { samples: Pp.scan.samples, hits: Pp.scan.hits } },
  rotateHintShownInPortrait: F.rotateHintShownInPortrait, out: OUT }, null, 1));
if (!evid.allPass) process.exitCode = 1;
