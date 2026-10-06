/* 效能根因定位：node perf-series.mjs --root=<樹> --ver=<標籤> [--rounds=1] [--port=]
   與 grab-probe perf12 同一事件序列（一般得標 4 組 1.8s＋詛咒 12 組 3.2s），逐幀記：T.update 總耗時、hands.update、grabLiftFor（累計）、driveGrab 以外。 */
import fs from 'node:fs'; import path from 'node:path';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PROBE = 'C:/Users/shung/wt/yaoshi/curse-slow/tests/tools/grab-probe.mjs';
const BASE = 'D:/yaoshi-scratch/curse-slow3';
process.argv = [process.argv[0], '/nonexistent-main.mjs', `--root=${opt.root}`, `--port=${opt.port || 8997}`, `--out=${BASE}/probe-out-${opt.ver}`];
const P = await import('file:///' + PROBE);
const ROUNDS = Number(opt.rounds || 1);
const res = { root: opt.root, ver: opt.ver, rounds: [] };
await P.withServer(async () => {
  const browser = await P.chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  try {
    for (let r = 0; r < ROUNDS; r++) {
      const { ctx, page } = await P.openPage(browser, 'V3', opt.q || '');
      await page.evaluate(() => {
        const T = window.__yaoshi3d.tray, H = T.hands; window.__rec = null;
        const wrap = (obj, k, tag) => { const f = obj[k]; if (typeof f !== 'function') return; obj[k] = function (...a) { const t0 = performance.now(); const v = f.apply(this, a); if (window.__rec) window.__rec[tag] = (window.__rec[tag] || 0) + performance.now() - t0; return v; }; };
        wrap(H, 'update', 'hu'); wrap(H, 'grabLiftFor', 'glf'); wrap(H, 'grab', 'hg'); wrap(T.props, 'update', 'pu');
        const u = T.update; T.update = function (dt) { window.__rec = {}; const t0 = performance.now(); u.call(T, dt); const tot = performance.now() - t0; if (window.__ser) window.__ser.push(Object.assign({ tot }, window.__rec)); window.__rec = null; };
      });
      const rows = [];
      const list = [...P.AWARD.filter((x) => !x.extra).map((x) => [x, false]), ...P.CURSE12.filter((x) => !x.extra).map((x) => [x, true])];
      for (const [sc, isC] of list) {
        await page.evaluate(([slot, c, k]) => window.__gp.reset(slot, c, k), [sc.slot, isC, 'wedding']);
        await P.ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await P.step(page, 50);
        await P.ev(page, 'ys:bid', { seat: sc.loser, slot: sc.slot, amount: 4 }); await P.step(page, 70);
        if (isC) { await P.ev(page, 'ys:bid', { seat: sc.target, slot: (sc.slot + 2) % 4, amount: 3 }); await P.step(page, 70); }
        await P.ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await P.step(page, 49);
        const cardMs = await page.evaluate((c) => window.__gp.cardWaitMs(c), isC);
        const grabMs = await page.evaluate(() => window.__gp.grabMsDetail()), curseMs = await page.evaluate(() => window.__gp.curseMsDetail());
        await page.evaluate(() => { window.__ser = []; });
        await P.ev(page, 'ys:reveal-result', { winner: sc.seat, slot: sc.slot, transferTarget: isC ? sc.target : null, destroy: false, grabMs, curseMs, skip: false });
        const N = Math.round((isC ? 3.2 : 1.8) * 60); let cardSent = false;
        for (let f = 0; f <= N; f++) { if (f > 0) await P.step(page, 1); const tms = Math.round(f * 1000 / 60); if (!cardSent && tms >= cardMs) { await P.ev(page, 'ys:reveal-card', { winner: sc.seat }); cardSent = true; } }
        const ser = await page.evaluate(() => { const a = window.__ser; window.__ser = null; return a; });
        rows.push({ name: sc.name, curse: isC, ser });
      }
      res.rounds.push(rows);
      await ctx.close();
      console.log('round', r, 'done');
    }
  } finally { await browser.close(); }
});
fs.writeFileSync(path.join(BASE, `series-${opt.ver}.json`), JSON.stringify(res));
/* 摘要：全體 p50/p95；按幀序（相對 reveal-result）分段的平均 */
const all = res.rounds.flat().flatMap((r) => r.ser.map((x) => x.tot)).sort((a, b) => a - b);
const q = (a, p) => a[Math.floor(a.length * p)];
console.log(opt.ver, 'n', all.length, 'p50', q(all, 0.5).toFixed(2), 'p95', q(all, 0.95).toFixed(2));
for (const k of ['tot', 'hu', 'glf', 'hg', 'pu']) {
  const v = res.rounds.flat().filter((r) => r.curse).flatMap((r) => r.ser.map((x) => x[k] || 0)).sort((a, b) => a - b);
  console.log(' curse', k, 'mean', (v.reduce((s, x) => s + x, 0) / v.length).toFixed(3), 'p50', q(v, 0.5).toFixed(2), 'p95', q(v, 0.95).toFixed(2));
}
const buckets = [[0, 6], [6, 30], [30, 90], [90, 130], [130, 170], [170, 193]];
for (const [a, b] of buckets) {
  const v = res.rounds.flat().filter((r) => r.curse).flatMap((r) => r.ser.slice(a, b));
  const m = (k) => (v.reduce((s, x) => s + (x[k] || 0), 0) / v.length).toFixed(3);
  console.log(` frames ${a}-${b}: tot ${m('tot')} hu ${m('hu')} glf ${m('glf')} hg ${m('hg')}`);
}
