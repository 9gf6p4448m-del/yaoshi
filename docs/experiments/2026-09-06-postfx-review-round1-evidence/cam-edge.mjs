// 覆審探針：cam-unit.mjs 沒涵蓋的邊界（duel-end 撞 lean、連兩個 ys:duel 沒有 duel-end、
// duel-end 與 ys:duel 同幀、reveal 撞 orbit）。量的是「相鄰兩幀相機位置的最大跳動」，
// 跟同一場景下平滑補間的跳動量比：突然大一階＝畫面上看得到的鏡頭彈跳。
// 新舊兩支 director 同時餵同一組事件（同 cam-unit.mjs），舊版當對照。
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const HARNESS = `
import * as THREE from 'three';
import { createCameraDirector as N } from '/js/camera-director.js';
import { createCameraDirector as O } from '/base/camera-director.js';
window.__camunit = (async () => {
  const mkCam = () => ({ position: new THREE.Vector3(), lookAt() {} });
  const lanterns = [{}, {}, {}, {}];
  const camN = mkCam(), camO = mkCam();
  const dirO = O(camO, lanterns);
  const dirN = N(camN, lanterns);
  const DT = 1 / 60, MS = 1000 / 60;
  let now = 1000;
  const log = [];
  function step(n, tag) {
    for (let i = 0; i < n; i++) {
      now += MS;
      dirO.update(DT, now); dirN.update(DT, now);
      const a = camN.position, b = camO.position;
      log.push({ t: now, tag: tag || '', nx: a.x, ny: a.y, nz: a.z, ox: b.x, oy: b.y, oz: b.z });
    }
  }
  const fire = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  return { step, fire, log, reset: () => { log.length = 0; } };
})();
`;

const port = Number(process.argv[3] || 8893);
const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const body = execFileSync('git', ['show', '5f76adc:js/camera-director.js'], { cwd: ROOT, maxBuffer: 8 << 20 }).toString('utf8');
  await page.route('**/base/camera-director.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body }));
  await page.goto(`http://127.0.0.1:${port}/tests/tools/cam-unit.html`, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS });
  await page.waitForFunction(() => !!window.__camunit, null, { timeout: 20000 });

  const out = await page.evaluate(async () => {
    const H = await window.__camunit;
    const res = {};
    const jump = (from, to, key) => {
      const d = (i, k) => {
        const a = H.log[i], p = H.log[i - 1];
        return k === 'n' ? Math.hypot(a.nx - p.nx, a.ny - p.ny, a.nz - p.nz) : Math.hypot(a.ox - p.ox, a.oy - p.oy, a.oz - p.oz);
      };
      let mn = 0, mo = 0, atN = -1;
      for (let i = from; i < to; i++) {
        if (d(i, 'n') > mn) { mn = d(i, 'n'); atN = i - from; }
        if (d(i, 'o') > mo) mo = d(i, 'o');
      }
      // 第一幀（事件當幀寫入的位置 vs 事件前最後一幀）＝真正的「彈跳」
      const f1n = d(from, 'n'), f1o = d(from, 'o');
      let m5n = 0, m5o = 0;
      for (let i = from; i <= Math.min(from + 4, to - 1); i++) { m5n = Math.max(m5n, d(i, 'n')); m5o = Math.max(m5o, d(i, 'o')); }
      return {
        [key]: { f1_new: +f1n.toFixed(6), f1_old: +f1o.toFixed(6), max5_new: +m5n.toFixed(6), max5_old: +m5o.toFixed(6), max_new: +mn.toFixed(6), max_old: +mo.toFixed(6), maxAtFrame: atN },
      };
    };

    // ── 基準線：一場乾淨的對決，沒有任何 lean/punch，duel-end 時三層本來就是零
    H.step(90);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);   // 進場＋orbit 都跑完，靜止
    let i0 = H.log.length;
    H.fire('ys:duel-end', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'S0_clean_duelEnd'));

    // ── SA：lean 正在最大時收 duel-end
    H.step(60);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(6); // lean 接近峰值
    i0 = H.log.length;
    H.fire('ys:duel-end', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SA_leanPeak_duelEnd'));

    // ── SB：連兩個 ys:duel，中間沒有 duel-end（orbit 還在轉）
    H.step(120);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);
    H.fire('ys:duel', { a: 1, b: 2 }); H.step(60);  // 第二場，orbit 正在轉
    i0 = H.log.length;
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(120); // 第三場，第二場的 orbit 沒轉完
    Object.assign(res, jump(i0, H.log.length, 'SB_duel_during_orbit'));

    // ── SC：duel-end 與 ys:duel 同一幀（同步 dispatch，中間不 step）
    H.step(180);
    i0 = H.log.length;
    H.fire('ys:duel-end', {});
    H.fire('ys:duel', { a: 1, b: 2 });
    H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SC_duelEnd_then_duel_sameFrame'));

    // ── SD：orbit 正在轉時來 ys:reveal
    H.step(180);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60); // orbit 進行中
    i0 = H.log.length;
    H.fire('ys:reveal', { winner: 0 }); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SD_reveal_during_orbit'));

    // ── SE：lean 正在最大時來 ys:table（換到牌桌）
    H.step(180);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);
    H.fire('ys:fx-trait', { side: 'A', ms: 900 }); H.step(6);
    i0 = H.log.length;
    H.fire('ys:table', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SE_leanPeak_table'));

    // ── SF：ys:fx-trait 帶負的 ms
    H.step(180);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);
    i0 = H.log.length;
    H.fire('ys:fx-trait', { side: 'B', ms: -5 }); H.step(20);
    Object.assign(res, jump(i0, H.log.length, 'SF_trait_negativeMs'));

    // ── SG：orbit 還在轉時就收 duel-end（＝使用者在 2.2s 內按 SKIP）
    H.step(180);
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60); // 1.0s：基座到位、orbit 轉了 300ms
    i0 = H.log.length;
    H.fire('ys:duel-end', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SG_duelEnd_during_orbit'));

    // ── SH：orbit 還在轉時來 ys:fx-trait-cancel（doSkip 的清場）
    H.step(180);
    H.fire('ys:duel', { a: 1, b: 2 }); H.step(60);
    i0 = H.log.length;
    H.fire('ys:fx-trait-cancel', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SH_traitCancel_during_orbit'));
    H.fire('ys:duel-end', {}); H.step(180);

    // ── SI：對照——既有的 punch 在峰值時收 duel-end（新舊都有這條路徑）
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300);
    H.fire('ys:fx-punch', { power: 1 }); H.step(3);
    i0 = H.log.length;
    H.fire('ys:duel-end', {}); H.step(120);
    Object.assign(res, jump(i0, H.log.length, 'SI_punchPeak_duelEnd_baseline'));

    return res;
  });
  console.log(JSON.stringify({ out, errors: errs.slice(0, 5) }, null, 1));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ out, errors: errs }, null, 1));
  await browser.close();
} finally { srv.kill(); }
