// 第 2 輪覆審探針（H-1 殘留）：折回段中途來一個 goto 入口會怎樣——**真實頁面、真實 director**。
// 背景：doSkip 同步派 ys:fx-trait-cancel（開始 700ms 折回），playDuel 隨後派 ys:duel-end。
//       實測兩者相隔 0.5–2.2ms（skip-real.mjs），所以多數時候同一幀內處理、foldFrom 還在，接得上；
//       但 rAF 只要落在那 1–2ms 內（每次 SKIP 約 gap/frame ≈ 3–10% 機率），update() 就會把
//       foldFrom 作廢，下一個 goto 的起點退回 target ＝ 折回的**終點**，鏡頭一次跳完剩下的折回量。
// 本探針把那個幀邊界**確定性地**放進去：cancel → 等 1 個 rAF → duel-end，其餘全走真實頁面。
// 對照組 same-frame：cancel 與 duel-end 同一個 task 派（＝實測多數情形）。
// 用法：node docs/experiments/2026-09-06-postfx-review-round2-evidence/fold-race.mjs <out.json> [--port=8906] [--at=900]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const [out] = pos;
const port = Number(opt.port || 8906);
const AT = Number(opt.at || 900);

const SAMPLER = `(() => {
  const S = window.__cs = { rows: [], marks: [] };
  const mark = (n) => S.marks.push({ n, t: performance.now(), i: S.rows.length });
  for (const ev of ['ys:duel','ys:duel-end','ys:fx-trait-cancel']) document.addEventListener(ev, () => mark(ev));
  const tick = () => { try { const c = window.__yaoshi3d && window.__yaoshi3d.camera;
    if (c) S.rows.push({ t: performance.now(), x: c.position.x, y: c.position.y, z: c.position.z }); } catch (e) {}
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();`;

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const results = {};
  for (const mode of ['sameFrame', 'oneFrameApart']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    await page.addInitScript(SAMPLER);
    let res = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        res = await pg.evaluate(async ({ at, mode }) => {
          const S = window.__cs;
          const duel = S.marks.find((m) => m.n === 'ys:duel');
          await new Promise((r) => setTimeout(r, Math.max(0, duel.t + at - performance.now())));
          const i0 = S.rows.length;
          document.dispatchEvent(new CustomEvent('ys:fx-trait-cancel', { detail: {} }));
          if (mode === 'oneFrameApart') await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
          const iEnd = S.rows.length;
          document.dispatchEvent(new CustomEvent('ys:duel-end', { detail: {} }));
          await new Promise((r) => setTimeout(r, 2500));
          const R = S.rows;
          const step = (i) => Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y, R[i].z - R[i - 1].z);
          let m = 0, at2 = -1;
          for (let i = Math.max(1, i0); i < R.length; i++) { const s = step(i); if (s > m) { m = s; at2 = i; } }
          let mEnd = 0;
          for (let i = Math.max(1, iEnd); i < Math.min(R.length, iEnd + 4); i++) mEnd = Math.max(mEnd, step(i));
          return { framesBetween: iEnd - i0, maxStepAfterCancel: +m.toFixed(6), atFrameOffset: at2 - i0,
            maxStepAtDuelEnd_pm4: +mEnd.toFixed(6), totalFrames: R.length };
        }, { at: AT, mode });
      },
    });
    results[mode] = { res, errors: r.errors.slice(0, 5) };
    await page.close();
  }
  if (out) fs.writeFileSync(out, JSON.stringify({ at: AT, results }, null, 1));
  console.log(JSON.stringify({ at: AT, results }, null, 1));
  await browser.close();
} finally { srv.kill(); }
