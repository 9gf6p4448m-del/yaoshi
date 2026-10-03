// 開標先看擺錢探針（驗收 docs/experiments/2026-10-03-reveal-chips-first/acceptance.md 條件 1/2/6）
// 用法：node <此檔> --mode=timing|skip|hotseat [--page=index.html] [--q=?handreal=0] [--port=9541] [--seed=1]
// 走真實 openSheet／bump／closeSheet／#mainbtn／#skipbtn 點擊；量的是 #stage 文字與 tray.props.chipCount()，不改頁面內任何東西。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const chromium = req('playwright').chromium;
const opt = {};
for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = +(opt.port || 9541), SEED = +(opt.seed || 1), PAGE = opt.page || 'index.html', Q = opt.q || '', MODE = opt.mode || 'timing';

const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const out = { page: PAGE, q: Q, mode: MODE, seed: SEED, errors: [], pageerrors: [] };
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
  page.on('pageerror', (e) => out.pageerrors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/${PAGE}${Q}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  out.version = await page.evaluate('VERSION');
  out.settleMs = await page.evaluate('CFG.CHIP_SETTLE_MS === undefined ? null : CFG.CHIP_SETTLE_MS');
  const gm = MODE === 'hotseat' ? "'hotseat'" : "'solo'";
  const roles = MODE === 'hotseat' ? "['qingmian','hongyi']" : "['qingmian']";
  await page.evaluate(`window.__yaoshi.newGame(${gm}, ${SEED}, ${roles})`);
  // 等 3D 托盤載好、出價畫面出現
  await page.waitForFunction(`(() => { const t = window.__yaoshi3d && window.__yaoshi3d.tray; return !!t; })()`, { timeout: 30000 }).catch(() => {});
  await page.evaluate(`(async () => { const t = window.__yaoshi3d && window.__yaoshi3d.tray; if (t && t.loaded) await t.loaded(); })()`);
  async function waitBid() {
    for (let i = 0; i < 2000; i++) {
      const r = await page.evaluate(`(() => { const ho = document.getElementById('handoff');
        if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
        const b = document.getElementById('mainbtn');
        if (b && /蓋牌/.test(b.textContent) && !b.disabled) return 1;
        if (b && !b.disabled) { b.click(); return 0; }
        const m = document.getElementById('modal');
        if (m && getComputedStyle(m).display !== 'none') {
          const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
          const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; } }
        return 0; })()`);
      if (r) return;
      await page.waitForTimeout(15);
    }
    throw new Error('等不到蓋牌開標鈕');
  }
  // 人類出價：真實 openSheet／bump／closeSheet
  async function bidHuman() {
    await page.evaluate(`(() => { openSheet(0); bump(1); bump(1); closeSheet(); })()`);
  }
  const PROBE = `(() => { const t = window.__yaoshi3d.tray; const st = t.props.stats();
    const seats = new Set(st.bids.map(b => b.seat));
    return { chips: t.props.chipCount(), seats: seats.size,
      ann: /開標前公告/.test(document.getElementById('stage').textContent),
      stageLen: document.getElementById('stage').innerHTML.length,
      mainDis: document.getElementById('mainbtn').disabled }; })()`;
  if (MODE === 'timing' || MODE === 'skip') {
    await waitBid();
    await bidHuman();
    out.before = await page.evaluate(PROBE);
    // 在頁內按鈕並取樣（避免 playwright 往返延遲污染時間軸）
    out.samples = await page.evaluate(`(async () => {
      const skip = ${MODE === 'skip'};
      const P = () => ${PROBE};
      const s = []; const t0 = performance.now(); let annMs = null, chipMs = null;
      new MutationObserver(() => { if (annMs === null && /開標前公告/.test(document.getElementById('stage').textContent)) annMs = Math.round(performance.now() - t0); })
        .observe(document.getElementById('stage'), { childList: true, subtree: true, characterData: true });
      document.getElementById('mainbtn').click();
      if (window.__yaoshi3d.tray.props.chipCount() > 0) chipMs = Math.round(performance.now() - t0);
      let skippedAt = null;
      await new Promise((res) => {
        const iv = setInterval(() => {
          const t = performance.now() - t0; const p = P(); s.push({ t: Math.round(t), ...p });
          if (skip && skippedAt === null && t >= 500) { skippedAt = t; document.getElementById('skipbtn').click(); }
          if (skip && skippedAt !== null && p.ann) { clearInterval(iv); res(); }
          if (t > 4500) { clearInterval(iv); res(); }
        }, 25);
      });
      return { skippedAt, annMs, chipMsSync: chipMs, firstSamples: s.slice(0, 4).map((x) => x.t), s };
    })()`);
    const S = out.samples;
    if (MODE === 'timing') {
      const at = (ms) => S.s.find((x) => x.t >= ms);
      const settle = out.settleMs == null ? 2000 : out.settleMs;
      const a = at(300), b = at(settle + 300);
      out.at300 = a; out.atSettle300 = b;
      out.cond1 = {
        noAnnAt0_3s: !a.ann && (S.annMs === null || S.annMs >= 300), chipsPushed: a.chips > 0 && a.seats > out.before.seats,
        annAtSettle0_3s: !!b.ann,
        stageEmptyAt0_3s: a.stageLen === 0, mainDisabledAt0_3s: a.mainDis,
      };
      out.cond1.pass = Object.values(out.cond1).every(Boolean);
      out.annAppearedAtMs = S.annMs; out.firstSampleTs = S.firstSamples;
    } else {
      out.skipDelayMs = S.annMs != null && S.skippedAt != null ? Math.round(S.annMs - S.skippedAt) : null;
      out.noAnnBeforeSkip = S.s.filter((x) => x.t < S.skippedAt).every((x) => !x.ann);
      out.cond2 = { pass: out.skipDelayMs != null && out.skipDelayMs < 300, skipDelayMs: out.skipDelayMs };
    }
  } else { // hotseat：兩席各出價，開標走到成交總覽，無 JS error
    const path0 = [];
    for (let seat = 0; seat < 2; seat++) { await waitBid(); await bidHuman();
      await page.evaluate(`document.getElementById('mainbtn').click()`); await page.waitForTimeout(150); }
    let reached = false, ann = false;
    for (let i = 0; i < 1200 && !reached; i++) {
      const r = await page.evaluate(`(() => { const ho = document.getElementById('handoff');
        if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return {h:1}; }
        const b = document.getElementById('mainbtn'); const ann = /開標前公告/.test(document.getElementById('stage').textContent);
        if (b && !b.disabled && /請神|開戰/.test(b.textContent)) return { done: 1, ann };
        if (b && !b.disabled) { b.click(); return { ann }; }
        return { ann }; })()`);
      if (r.ann) ann = true;
      if (r.done) reached = true;
      await page.waitForTimeout(40);
    }
    out.hotseat = { reachedSummary: reached, sawAnnouncement: ann };
  }
} finally { await browser.close(); srv.kill(); }
out.pass = out.errors.length === 0 && out.pageerrors.length === 0;
console.log(JSON.stringify(out, (k, v) => (k === 's' ? undefined : v), 1));
