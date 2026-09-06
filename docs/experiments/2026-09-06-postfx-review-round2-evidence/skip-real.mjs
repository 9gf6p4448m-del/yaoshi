// 第 2 輪覆審探針：**真實頁面**上的 SKIP 路徑（不是單元治具）。
// 目的：驗「折回段（最長 CLEAR_MS_MAX 700ms）還在跑的時候，doSkip 之後緊接而來的
//       ys:duel-end 會不會讓鏡頭再跳一次」——cam-unit 的 E2／S4 在 ys:fx-trait-cancel
//       之後一律 step 120 幀（2s）才發 duel-end，剛好把折回窗整個跳過去。
// 做法：頁面裡掛逐幀取樣器（rAF，取 __yaoshi3d.camera.position）＋事件時戳；
//       ys:duel 之後等 --skipat ms 按下 #skipbtn（＝doSkip → ys:fx-trait-cancel），
//       量 cancel → duel-end 的間隔，以及 duel-end 當幀的位移。
// 用法：node docs/experiments/2026-09-06-postfx-review-round2-evidence/skip-real.mjs <out.json>
//        [--port=8903] [--skipat=900] [--seed=7]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0]; if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8903);
const SKIP_AT = Number(opt.skipat || 900);
const SEED = opt.seed || '7';

const SAMPLER = `(() => {
  const S = window.__camsample = { rows: [], marks: [] };
  const mark = (n) => S.marks.push({ n, t: performance.now(), i: S.rows.length });
  for (const ev of ['ys:duel','ys:duel-end','ys:fx-trait','ys:fx-trait-cancel','ys:fx-burn','ys:fx-punch','ys:table','ys:reveal','ys:end'])
    document.addEventListener(ev, () => mark(ev));
  const tick = () => {
    try {
      const c = window.__yaoshi3d && window.__yaoshi3d.camera;
      if (c) S.rows.push({ t: performance.now(), x: c.position.x, y: c.position.y, z: c.position.z });
    } catch (e) {}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // ys:duel 之後 SKIP_AT ms 按下跳過（只按一次）
  let armed = true;
  document.addEventListener('ys:duel', () => {
    if (!armed) return; armed = false;
    setTimeout(() => { const b = document.getElementById('skipbtn'); if (b) { window.__skipClickedAt = performance.now(); b.click(); } }, ${SKIP_AT});
  });
})();`;

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(SAMPLER);
  await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, { waitUntil: 'load' });
  await page.click('button:has-text("單人入市")');
  await page.waitForSelector('#selectScr.on');
  await page.click('#selGrid .rcard');
  await page.click('#selBtn:not([disabled])');

  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const st = await page.evaluate(() => {
      const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
      const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
      const mb = document.getElementById('mainbtn'), ho = document.getElementById('hoBtn');
      const S = window.__camsample;
      return { stageOk: !!sb, hoOk: vis(ho), mainOk: vis(mb),
        duelEnded: S.marks.some((m) => m.n === 'ys:duel-end'), duelSeen: S.marks.some((m) => m.n === 'ys:duel') };
    });
    if (st.duelEnded) break;
    if (!st.duelSeen) {
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
    }
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(3000);

  const res = await page.evaluate(() => {
    const S = window.__camsample, R = S.rows;
    if (!R.length) return { err: 'no frames' };
    const step = (i) => Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y, R[i].z - R[i - 1].z);
    const len = (i) => Math.hypot(R[i].x, R[i].y, R[i].z);
    const duel = S.marks.find((m) => m.n === 'ys:duel');
    if (!duel) return { err: 'no ys:duel', marks: S.marks.map((m) => m.n) };
    const cancel = S.marks.find((m) => m.n === 'ys:fx-trait-cancel' && m.t >= duel.t);
    const dend = S.marks.find((m) => m.n === 'ys:duel-end' && m.t >= duel.t);
    const iAt = (t) => { for (let i = 0; i < R.length; i++) if (R[i].t >= t) return i; return R.length - 1; };
    const win = (a, b) => { let m = 0, at = -1; for (let i = Math.max(1, a); i < Math.min(R.length, b); i++) { const s = step(i); if (s > m) { m = s; at = i; } } return { max: +m.toFixed(6), atMsFromDuel: at > 0 ? +(R[at].t - duel.t).toFixed(1) : null }; };
    const iCancel = cancel ? iAt(cancel.t) : -1, iEnd = dend ? iAt(dend.t) : -1;
    const iFoldEnd = cancel ? iAt(cancel.t + 700) : -1;
    return {
      frames: R.length, fps: +(R.length / ((R[R.length - 1].t - R[0].t) / 1000)).toFixed(1),
      cancelAtMs: cancel ? +(cancel.t - duel.t).toFixed(1) : null,
      duelEndAtMs: dend ? +(dend.t - duel.t).toFixed(1) : null,
      duelEndMinusCancelMs: cancel && dend ? +(dend.t - cancel.t).toFixed(1) : null,
      duelEndInsideFoldWindow: !!(cancel && dend && dend.t - cancel.t < 700),
      beforeSkip: win(iAt(duel.t) + 1, iCancel),
      foldWindow_cancel_to_700ms: win(iCancel, iFoldEnd),
      stepAtDuelEndFrame: iEnd > 1 ? +step(iEnd).toFixed(6) : null,
      maxAroundDuelEnd_pm4: win(iEnd - 1, iEnd + 4),
      wholeRun: win(1, R.length),
      lenAtCancel: iCancel > 0 ? +len(iCancel).toFixed(4) : null,
      lenAtDuelEnd: iEnd > 0 ? +len(iEnd).toFixed(4) : null,
      marks: S.marks.map((m) => ({ n: m.n, ms: +(m.t - duel.t).toFixed(1) })).slice(0, 80),
    };
  });
  fs.writeFileSync(out, JSON.stringify({ skipAt: SKIP_AT, res, errors: errs }, null, 1));
  console.log(JSON.stringify({ skipAt: SKIP_AT, res, errors: errs.slice(0, 5) }, null, 1));
  await browser.close();
} finally { srv.kill(); }
