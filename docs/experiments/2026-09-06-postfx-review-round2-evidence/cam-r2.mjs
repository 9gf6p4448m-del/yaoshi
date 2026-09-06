// 第 2 輪對抗覆審探針（2026-09-06）：不採信 cam-unit 的量測窗，逐幀量整段。
// 兩台 director（新版 + v0.34 基準）同頁同事件同 dt；每個情境都從「牌桌靜止」重新定場，
// 情境窗＝事件當幀起到情境結束的**全部**幀，不挑窗。
// 用法：node docs/experiments/2026-09-06-postfx-review-round2-evidence/cam-r2.mjs <out.json>
//        [--port=8902] [--new=/js/camera-director.js] [--base=<v0.34 camera-director.js>]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

function parseArgs(argv) { const pos = [], opt = {}; for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); } return { pos, opt }; }

const PAGE = `<!doctype html><meta charset="utf-8"><title>cam-r2</title>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.158.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.158.0/examples/jsm/"}}</script>
<body>cam-r2</body>`;

const HARNESS = (newUrl, baseUrl) => `
import * as THREE from 'three';
import { createCameraDirector as N } from '${newUrl}';
import { createCameraDirector as O } from '${baseUrl}';
window.__camr2 = (async () => {
  const mkCam = () => ({ position: new THREE.Vector3(), lookAt() {} });
  const lanterns = [{}, {}, {}, {}];
  const camN = mkCam(), camO = mkCam();
  const DT = 1 / 60, MS = 1000 / 60;
  let now = 1000;
  performance.now = () => now;
  const dirO = O(camO, lanterns);
  const dirN = N(camN, lanterns);
  const log = [];
  function step(n, tag) {
    for (let i = 0; i < n; i++) {
      now += MS;
      dirO.update(DT, now); dirN.update(DT, now);
      const a = camN.position, b = camO.position;
      log.push({ t: +now.toFixed(3), tag: tag || '',
        nx: a.x, ny: a.y, nz: a.z, ox: b.x, oy: b.y, oz: b.z,
        nl: Math.hypot(a.x, a.y, a.z), ol: Math.hypot(b.x, b.y, b.z),
        nyaw: Math.atan2(a.x, a.z) * 180 / Math.PI });
    }
  }
  const fire = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  return { step, fire, log, len: () => log.length };
})();
`;

async function run(page, url, newUrl, baseUrl) {
  await page.goto(url, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS(newUrl, baseUrl) });
  await page.waitForFunction(() => !!window.__camr2, null, { timeout: 20000 });
  return page.evaluate(async () => {
    const H = await window.__camr2;
    const out = { scenes: {} };
    const settle = () => { H.fire('ys:duel-end', {}); H.step(180, 'settle'); H.fire('ys:table', {}); H.step(180, 'settle'); };
    const watch = (name, i0, n) => {
      const L = H.log, to = Math.min(L.length, i0 + n);
      let mn = 0, mo = 0, mlen = 0, atN = -1, atL = -1;
      const dN = (i) => Math.hypot(L[i].nx - L[i - 1].nx, L[i].ny - L[i - 1].ny, L[i].nz - L[i - 1].nz);
      const dO = (i) => Math.hypot(L[i].ox - L[i - 1].ox, L[i].oy - L[i - 1].oy, L[i].oz - L[i - 1].oz);
      for (let i = i0; i < to; i++) {
        const a = dN(i); if (a > mn) { mn = a; atN = i - i0; }
        mo = Math.max(mo, dO(i));
        const dl = Math.abs(L[i].nl - L[i - 1].nl); if (dl > mlen) { mlen = dl; atL = i - i0; }
      }
      out.scenes[name] = { f1_new: +dN(i0).toFixed(6), f1_old: +dO(i0).toFixed(6),
        max_new: +mn.toFixed(6), atFrame_new: atN, max_old: +mo.toFixed(6),
        dLenMax: +mlen.toExponential(4), atFrame_len: atL, frames: to - i0 };
    };
    let i0;

    // ── A 組：六個清除入口（orbit 進行中），逐幀量 240 幀（4 秒 >> 折回 700ms）
    for (const [name, ev, det] of [
      ['A1_duelEnd', 'ys:duel-end', {}], ['A2_traitCancel', 'ys:fx-trait-cancel', {}],
      ['A3_table', 'ys:table', {}], ['A4_reveal', 'ys:reveal', { winner: 0 }],
      ['A5_end', 'ys:end', {}], ['A6_duel2', 'ys:duel', { a: 1, b: 2 }],
    ]) {
      settle();
      H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'orb');
      i0 = H.len(); H.fire(ev, det); H.step(240, name);
      watch(name + '_during_orbit', i0, 240);
    }
    // A7：orbit ＋ lean 同時在跑時清除（cam-unit 的 S4 情境，但 A7 斷言集不含它）
    settle();
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'orb');
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(6, 'lean');
    i0 = H.len(); H.fire('ys:fx-trait-cancel', {}); H.step(240, 'A7');
    watch('A7_traitCancel_during_orbit_AND_lean', i0, 240);

    // ── B 組：清除發生在基座推進段（t<1、orbitHold 滿幅）
    for (const [name, ev, det] of [
      ['B1_duelEnd', 'ys:duel-end', {}], ['B2_traitCancel', 'ys:fx-trait-cancel', {}],
    ]) {
      settle();
      H.fire('ys:duel', { a: 0, b: 3 }); H.step(12, 'push');
      i0 = H.len(); H.fire(ev, det); H.step(240, name);
      watch(name + '_during_push', i0, 240);
    }

    // ── C 組：折回段中途再來事件
    const foldSetup = () => { settle(); H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'orb'); H.fire('ys:fx-trait-cancel', {}); };
    for (const [name, wait, ev, det] of [
      ['C1_punch_midFold', 10, 'ys:fx-punch', { power: 1 }],
      ['C2_burn_midFold', 10, 'ys:fx-burn', {}],
      ['C3_trait_midFold', 10, 'ys:fx-trait', { side: 'B', ms: 900 }],
      ['C4_duel_midFold', 10, 'ys:duel', { a: 1, b: 2 }],
      ['C5_cancel_midFold', 10, 'ys:fx-trait-cancel', {}],
      ['C6_duelEnd_midFold', 10, 'ys:duel-end', {}],
      ['C7_trait_then_cancel_midFold', 10, 'ys:fx-trait', { side: 'A', ms: 900 }],
    ]) {
      foldSetup(); H.step(wait, 'fold');
      i0 = H.len(); H.fire(ev, det);
      if (name === 'C7_trait_then_cancel_midFold') { H.step(3, 'x'); H.fire('ys:fx-trait-cancel', {}); }
      H.step(240, name);
      watch(name, i0, 240);
    }

    // ── D 組：punch／burn／lean 的**上升沿**（A7 只量清除、不量上升沿）
    settle(); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'quiet');
    i0 = H.len(); H.fire('ys:fx-punch', { power: 1 }); H.step(60, 'D1');
    watch('D1_punch_onset', i0, 60);
    H.step(120, 'q');
    i0 = H.len(); H.fire('ys:fx-burn', {}); H.step(60, 'D2');
    watch('D2_burn_onset', i0, 60);
    H.step(120, 'q');
    i0 = H.len(); H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(90, 'D3');
    watch('D3_lean_onset', i0, 90);
    H.step(120, 'q');

    // ── E 組：M-2 閘門。lean／burn／punch 各自窗內 |Δ camera.position.length()|
    settle(); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'quiet');
    const eBase = H.len();
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(90, 'E_lean');
    watch('E1_lean_window', eBase, 90);
    const eB = H.len(); H.fire('ys:fx-burn', {}); H.step(90, 'E_burn');
    watch('E2_burn_window', eB, 90);
    const eP = H.len(); H.fire('ys:fx-punch', { power: 1 }); H.step(90, 'E_punch');
    watch('E3_punch_window', eP, 90);

    // ── F：折回時距離是否恆定（鎖排法閘門）
    settle(); H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'orb');
    const f1 = H.len(); H.fire('ys:fx-trait-cancel', {}); H.step(60, 'F1');
    watch('F1_fold_after_orbit_cancel', f1, 60);

    // ── G：長基座補間中 lean 被 cancel → 折回時間只由 yaw 差算，dist/tilt 被壓縮
    settle();
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'q');
    H.fire('ys:end', {}); H.step(6, 'g');
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(3, 'g');
    i0 = H.len(); H.fire('ys:fx-trait-cancel', {}); H.step(240, 'G1');
    watch('G1_cancel_during_long_tween', i0, 240);
    settle();
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'q');
    i0 = H.len(); H.fire('ys:end', {}); H.step(240, 'G0');
    watch('G0_end_tween_baseline', i0, 240);

    // ── H：duel-end 與下一個 duel 同幀
    settle();
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'h');
    i0 = H.len(); H.fire('ys:duel-end', {}); H.fire('ys:duel', { a: 1, b: 2 }); H.step(240, 'H1');
    watch('H1_duelEnd_then_duel_sameFrame', i0, 240);

    return out;
  });
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0]; if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8902);
const baseFile = path.resolve(opt.base || path.join(ROOT, '_scratch/camdir-v034.js'));
const newUrl = opt.new || '/js/camera-director.js';
const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errs = []; const results = {};
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', (e) => { errs.push('pageerror: ' + String(e)); console.error('[page] ' + String(e)); });
    page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); console.error('[console] ' + m.text()); } });
    await page.route('**/base/camera-director.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(baseFile, 'utf8') }));
    await page.route('**/cam-r2.html', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: PAGE }));
    results[reduced ? 'reduced' : 'normal'] = await run(page, `http://127.0.0.1:${port}/cam-r2.html`, newUrl, '/base/camera-director.js');
    await page.close();
  }
  const LIMIT = 0.2;
  const table = {};
  for (const k of Object.keys(results.normal.scenes)) {
    const n = results.normal.scenes[k], r = results.reduced.scenes[k];
    table[k] = { f1: n.f1_new, max: n.max_new, at: n.atFrame_new, old_max: n.max_old, dLenMax: n.dLenMax,
      over: n.max_new > LIMIT, reduced_f1: r.f1_new, reduced_max: r.max_new, reduced_dLenMax: r.dLenMax };
  }
  fs.writeFileSync(out, JSON.stringify({ limit: LIMIT, table, errors: errs, scenesFull: results }, null, 1));
  console.log(JSON.stringify({ limit: LIMIT, table, errors: errs.slice(0, 5) }, null, 1));
  await browser.close();
} finally { srv.kill(); }
