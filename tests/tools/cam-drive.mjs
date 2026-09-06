// 後處理卷 P-4（2026-09-06）：真頁面的運鏡量測。
// 借 duel-drive 的 drive() 把一局真的玩到 N 場對決，另外逐幀錄 camera.position 與運鏡事件時戳，
// 用來驗「orbit 期間 dist 恆定」「招式輕推的方向與回位」是在真實路徑上成立，不只在單元治具裡。
//
// 用法：node tests/tools/cam-drive.mjs "<url>" <out.json> [--duels=4] [--port=8876] [--root=] [--skip]
//   url 例：http://127.0.0.1:8876/index.html?paperwar=1&fxcount=1&seed=7
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

// 逐幀取樣：跟著 rAF 走，讀「上一次 render 之後」的相機。director.update 與 renderer 的 frame()
// 在同一個 rAF 鏈上，所以這裡拿到的就是每一幀寫進去的值。
const CAM_REC = `document.addEventListener('DOMContentLoaded',()=>{
  const C = window.__camrec = { f: [], ev: [] };
  const mark = (n) => (e) => { const d = (e && e.detail) || {}; C.ev.push({ n, t: performance.now(), side: d.side, ms: d.ms, power: d.power, a: d.a, b: d.b }); };
  for (const n of ['ys:duel','ys:duel-end','ys:fx-trait','ys:fx-trait-cancel','ys:fx-burn','ys:fx-punch','ys:reveal','ys:table','ys:end']) document.addEventListener(n, mark(n));
  const tick = () => {
    try { const Y = window.__yaoshi3d; if (Y && Y.camera) { const p = Y.camera.position;
      C.f.push({ t: performance.now(), x: p.x, y: p.y, z: p.z, l: Math.hypot(p.x, p.y, p.z) }); } } catch (e) {}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});`;

const DEG = 180 / Math.PI;
const wrap = (d) => ((((d % 360) + 540) % 360) - 180);

const { pos, opt } = parseArgs(process.argv.slice(2));
const [url, out] = pos;
if (!url || !out) { console.error('need <url> <out.json>'); process.exit(2); }
const port = Number(opt.port || (url.match(/:(\d+)\//) || [])[1] || 8876);
const root = opt.root ? path.resolve(opt.root) : ROOT;

const srv = await serve(root, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await page.addInitScript(CAM_REC);
  const r = await drive(page, url, { duels: Number(opt.duels || 4), skip: !!opt.skip });
  const cam = await page.evaluate(() => window.__camrec || { f: [], ev: [] });
  await browser.close();

  // ── 判讀 ────────────────────────────────────────────────────────────────
  const F = cam.f, EV = cam.ev;
  const yawAt = (s) => Math.atan2(s.x, s.z) * DEG;
  const duels = EV.filter((e) => e.n === 'ys:duel');
  const ends = EV.filter((e) => e.n === 'ys:duel-end');
  const PUNCH_MS = 420;
  const rows = duels.map((d, i) => {
    const endT = (ends.find((e) => e.t > d.t) || { t: Infinity }).t;
    const win = F.filter((s) => s.t >= d.t && s.t <= Math.min(endT, d.t + 60000));
    if (win.length < 3) return { i: i + 1, frames: win.length, note: '這一場取樣不足（多半是 SKIP 直接快轉掉）' };
    // 這一場的「基準 yaw／dist」＝全場中位數。orbit 與 lean／punch 都是短暫偏離，中位數就是基座那組值。
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
    const busy = (t) => EV.some((e) => (e.n === 'ys:fx-punch' || e.n === 'ys:fx-burn') && t >= e.t && t <= e.t + PUNCH_MS)
      || EV.some((e) => e.n === 'ys:fx-trait' && t >= e.t && t <= e.t + (e.ms || 900));
    const yaw0 = med(win.map(yawAt));
    // 基準 dist 只取沒有 punch／lean 在跑的幀：像 duel 4 那種 10 秒內十幾次 punch 的場，
    // 全母體中位數會被 punch 幀拉低 0.08，量回位時就會冤枉判成沒回去。
    const quiet = win.filter((s) => !busy(s.t));
    const rest = med((quiet.length > 20 ? quiet : win).map((s) => s.l));
    // orbit 段的界線不能用牆鐘時間直接切：renderer.js:161 把 dt 夾在 0.1s，幀率一慢，
    // 700ms 的推進補間就會拖過 700ms 牆鐘，用牆鐘切窗會把「還在推進」的幀算成 orbit。
    // 改成用 director 自己看到的那把尺——逐幀把 min(Δ牆鐘, 0.1s) 累加起來（＝它 t 的積分），
    // 累到 700ms＝推進結束＝orbit 起點，再累 1500ms＝orbit 終點。純時間、與 dist／yaw 都無關。
    let acc = 0, sIdx = -1, eIdx = win.length - 1;
    for (let k = 1; k < win.length; k++) {
      acc += Math.min((win[k].t - win[k - 1].t) / 1000, 0.1) * 1000;
      if (sIdx < 0 && acc >= 700) sIdx = k;
      if (sIdx >= 0 && acc >= 700 + 1500) { eIdx = k; break; }
    }
    if (sIdx < 0) sIdx = win.length - 1;
    const orb = win.slice(sIdx, eIdx + 1).filter((s) => !busy(s.t));
    let dLen = 0, pairs = 0;
    for (let k = 1; k < orb.length; k++) {
      if (orb[k].t - orb[k - 1].t > 120) continue; // 中間被 busy 排掉的幀不算「相鄰」
      dLen = Math.max(dLen, Math.abs(orb[k].l - orb[k - 1].l)); pairs++;
    }
    const orbEndT = win[eIdx].t;
    // 招式輕推：量「這一招造成的改變」——先用事件前 250ms 的幀做線性擬合當基線，
    // 再看事後 200ms 的殘差極值。招式落在 orbit 還在轉的期間時，orbit 的漂移就是這條斜線，
    // 扣掉之後剩下的才是 lean 本身（duel 4 第一招就在 orbit 進行中，不扣會被 −38 度的 orbit 蓋掉）。
    const traits = EV.filter((e) => e.n === 'ys:fx-trait' && e.t >= d.t && e.t <= endT).map((e) => {
      const ms = e.ms || 900;
      const pre = F.filter((s) => s.t >= e.t - 250 && s.t <= e.t);
      let a = yaw0, b = 0;
      if (pre.length >= 3) { // 最小平方擬合 yaw = a + b·(t − e.t)
        const xs = pre.map((s) => s.t - e.t), ys = pre.map((s) => wrap(yawAt(s) - yaw0));
        const n = xs.length, sx = xs.reduce((p, c) => p + c, 0), sy = ys.reduce((p, c) => p + c, 0);
        const sxx = xs.reduce((p, c) => p + c * c, 0), sxy = xs.reduce((p, c, k) => p + c * ys[k], 0);
        const den = n * sxx - sx * sx;
        b = den ? (n * sxy - sx * sy) / den : 0; a = (sy - b * sx) / n;
      } else { a = pre.length ? wrap(yawAt(pre[pre.length - 1]) - yaw0) : 0; }
      const base = (t) => a + b * (t - e.t);
      const w = F.filter((s) => s.t > e.t && s.t <= e.t + 200);
      let peak = 0, peakRaw = 0;
      for (const s of w) {
        const v = wrap(yawAt(s) - yaw0) - base(s.t); if (Math.abs(v) > Math.abs(peak)) peak = v;
        const r = wrap(yawAt(s) - yaw0); if (Math.abs(r) > Math.abs(peakRaw)) peakRaw = r;
      }
      // 回位：用 dist 驗最乾淨（orbit 不碰 dist）。只在該時點沒有 punch 在跑時才算得準。
      // 註（2026-09-06 修復卷）：LEAN.dist 已改成 0（第 1 輪覆審 M-2），所以下面的 distDip
      // **不再是 lean 的量**——它量到的是 hitstop 把 punch 的牆鐘時長拖過 420ms 排除窗之後
      // 漏進來的 punch 殘量（實測改前 0.2817／改後 0.2818，逐值不變＝與 lean 無關）。
      // 「lean 不動 dist」改由 cam-unit.mjs 的 A8 決定性斷言驗（|Δlength| < 1e-3）。
      // 回位窗放寬到 ms+400ms：低幀率＋連續 punch 時，ms 那一刻常常整段都被 punch 蓋住，
      // 往後找第一批乾淨的幀才量得到。lean 在 ms 就歸零了，往後看只會更接近 0，不會放水。
      const bw = F.filter((s) => s.t >= e.t + ms && s.t <= e.t + ms + 400 && !EV.some((x) => (x.n === 'ys:fx-punch' || x.n === 'ys:fx-burn') && s.t >= x.t && s.t <= x.t + PUNCH_MS));
      const backDist = bw.length ? +Math.min(...bw.map((s) => Math.abs(s.l - rest))).toFixed(4) : null;
      const backYaw = bw.length && e.t + ms > orbEndT ? +Math.min(...bw.map((s) => Math.abs(wrap(yawAt(s) - yaw0)))).toFixed(3) : null;
      const dipW = F.filter((s) => s.t > e.t && s.t <= e.t + 200 && !EV.some((x) => (x.n === 'ys:fx-punch' || x.n === 'ys:fx-burn') && s.t >= x.t && s.t <= x.t + PUNCH_MS));
      return { side: e.side, ms, inOrbit: e.t < orbEndT,
        peak: +peak.toFixed(3), peakRaw: +peakRaw.toFixed(3),
        distDip: dipW.length ? +Math.max(...dipW.map((s) => rest - s.l)).toFixed(4) : null,
        backDist, backYaw,
        signOk: e.side === 'B' ? peak > 3 : e.side === 'A' ? peak < -3 : null,
        backOk: (backDist !== null && backDist < 0.02) || (backYaw !== null && backYaw < 0.5) };
    });
    // SKIP：ys:fx-trait-cancel 之後、ys:duel-end 之前的那幾幀，偏離基準 yaw 要立刻掉到 0
    const cancel = EV.find((e) => e.n === 'ys:fx-trait-cancel' && e.t >= d.t && e.t <= endT);
    const afterCancel = cancel ? F.filter((s) => s.t > cancel.t && s.t <= Math.min(endT, cancel.t + 200)) : [];
    const cancelDev = afterCancel.length ? +Math.max(...afterCancel.map((s) => Math.abs(wrap(yawAt(s) - yaw0)))).toFixed(3) : null;
    return { i: i + 1, frames: win.length, orbitFrames: orb.length, orbitPairs: pairs,
      orbit_dLenMax: +dLen.toExponential(3), yaw0: +yaw0.toFixed(3), rest: +rest.toFixed(6),
      orbitStartDev: +wrap(yawAt(win[sIdx]) - yaw0).toFixed(3),
      orbitEndDev: +wrap(yawAt(win[eIdx]) - yaw0).toFixed(3),
      orbitSpanMs: +(win[eIdx].t - win[sIdx].t).toFixed(0),
      traits, cancelDevMax: cancelDev };
  });
  const allTraits = rows.flatMap((x) => x.traits || []);
  const summary = {
    url, duels: rows.length, frames: F.length, gl: r.gl, ver: r.ver,
    errors: r.errors.length, errorList: r.errors.slice(0, 10),
    duelsMs: r.rec.duels.map((x) => x.dur),
    orbit_dLenMax_all: rows.length ? Math.max(...rows.map((x) => x.orbit_dLenMax)) : null,
    orbit_dLen_PASS: rows.filter((x) => x.orbitPairs > 10).length >= 2 && rows.every((x) => x.orbit_dLenMax === undefined || x.orbit_dLenMax < 1e-3),
    traits_n: allTraits.length,
    traits_signOk: allTraits.filter((x) => x.signOk).length,
    traits_backOk: allTraits.filter((x) => x.backOk).length,
    trait_PASS: allTraits.length > 0 && allTraits.every((x) => x.signOk && x.backOk),
    cancelDevMax: rows.map((x) => x.cancelDevMax === undefined ? null : x.cancelDevMax),
    underSampled: rows.filter((x) => (x.orbitPairs || 0) <= 10).map((x) => x.i),
    rows,
  };
  fs.writeFileSync(out, JSON.stringify({ summary, cam, rec: r.rec, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ ...summary, rows: rows.map((x) => ({ i: x.i, orbitFrames: x.orbitFrames, orbitPairs: x.orbitPairs, dLenMax: x.orbit_dLenMax, startDev: x.orbitStartDev, endDev: x.orbitEndDev, spanMs: x.orbitSpanMs, traits: (x.traits || []).map((t) => `${t.side}${t.inOrbit ? '*' : ''} peak=${t.peak} dip=${t.distDip} back=${t.backDist}/${t.backYaw}`), cancelDevMax: x.cancelDevMax })) }, null, 1));
} finally { srv.kill(); }
