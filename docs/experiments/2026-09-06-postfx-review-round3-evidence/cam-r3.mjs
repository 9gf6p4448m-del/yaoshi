// 後處理卷 第 3 輪對抗覆審（2026-09-06）：序列探針。
// 目的：反駁「goto 一律從 cur* 出發之後構造上不可能跳」這個宣稱。
// 與 cam-unit.mjs 的差別：
//   ① 每個情境都建**全新的一對 director**，所以量得到「事件在第一次 update 之前就到」
//      （cur* 還沒被寫過）這一類 cam-unit 量不到的情形；相機初值照 scene-env 的真實開場機位設。
//   ② 連續事件的間隔做成 0／1／2 幀的矩陣（7 個事件 × 7 個 × 3 種間隔 × 四種脈絡）。
//   ③ punch／burn 進行中再 goto（cur* 不含 punch），一路量到 punch 衰減結束。
//   ④ 標題頁（非對決）連發 ys:table／ys:end。
// 用法：node <this> <out.json> [--port=8914] [--new=/js/camera-director.js]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) {
    const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i);
    if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a);
  }
  return { pos, opt };
}

const HARNESS = (newUrl) => `
import * as THREE from 'three';
import { createCameraDirector as N } from '${newUrl}';
window.__camr3 = (async () => {
  const DT = 1 / 60, MS = 1000 / 60;
  let now = 1000;
  performance.now = () => now;
  const DEG = Math.PI / 180;
  // scene-env.js:38-43 的真實開場機位（dist 3.6、tilt 35、yaw 0）＝ camera-director 的 SHOTS.table
  const TILT0 = 35 * DEG, D0 = 3.6;
  const INIT = [0, Math.sin(TILT0) * D0, Math.cos(TILT0) * D0];
  function mk() {
    const cam = { position: new THREE.Vector3(INIT[0], INIT[1], INIT[2]), lookAt() {} };
    const dir = N(cam, [{}, {}, {}, {}]);
    return { cam, dir };
  }
  const fire = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const EV = {
    duel: ['ys:duel', { a: 0, b: 3 }],
    duel2: ['ys:duel', { a: 1, b: 2 }],
    duelEnd: ['ys:duel-end', {}],
    table: ['ys:table', {}],
    reveal: ['ys:reveal', { winner: 0 }],
    end: ['ys:end', {}],
    cancel: ['ys:fx-trait-cancel', {}],
    trait: ['ys:fx-trait', { side: 'B', ms: 900 }],
    punch: ['ys:fx-punch', { power: 1 }],
    burn: ['ys:fx-burn', { side: 'B', unit: 0 }],
  };
  // 一個情境＝全新的 director。prep(ctx) 先把狀態帶到起點，然後 run(ctx) 派受測事件。
  function scenario(prep, run, tailFrames) {
    const { cam, dir } = mk();
    const log = [];
    const ctx = {
      fire: (k) => { const e = EV[k]; fire(e[0], e[1]); },
      step(n) {
        for (let i = 0; i < n; i++) {
          now += MS;
          dir.update(DT, now);
          const p = cam.position;
          log.push([p.x, p.y, p.z, Math.hypot(p.x, p.y, p.z)]);
        }
      },
    };
    // 開場位置也記一筆，這樣第一次 update 的位移量得到（cur* 未寫入的情形靠這一筆）
    log.push([INIT[0], INIT[1], INIT[2], Math.hypot(INIT[0], INIT[1], INIT[2])]);
    prep(ctx);
    const i0 = log.length;
    run(ctx);
    ctx.step(tailFrames || 240);
    let f1 = 0, mx = 0, at = -1, dl = 0;
    for (let i = Math.max(1, i0); i < log.length; i++) {
      const a = log[i], b = log[i - 1];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (i === i0) f1 = d;
      if (d > mx) { mx = d; at = i - i0; }
      dl = Math.max(dl, Math.abs(a[3] - b[3]));
    }
    return { f1: +f1.toFixed(6), max: +mx.toFixed(6), maxAt: at, dLenMax: +dl.toFixed(9) };
  }
  return { scenario, EV: Object.keys(EV), INIT };
})();
`;

async function run(page, url, newUrl) {
  await page.goto(url, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS(newUrl) });
  await page.waitForFunction(() => !!window.__camr3, null, { timeout: 20000 });
  return page.evaluate(async () => {
    const H = await window.__camr3;
    const out = {};
    const S = (key, prep, run, tail) => { out[key] = H.scenario(prep, run, tail); };

    // ── P：事件在**第一次 update 之前**就到（cur* 還沒被任何一幀寫過）。
    // 相機初值＝scene-env 的真實開場機位；f1＝第一次寫入相對開場位置的位移。
    S('P0_control_noEvent', () => {}, () => {});
    S('P1_table_beforeFirstUpdate', () => {}, (c) => c.fire('table'));
    S('P2_end_beforeFirstUpdate', () => {}, (c) => c.fire('end'));
    S('P3_duel_beforeFirstUpdate', () => {}, (c) => c.fire('duel'));
    S('P4_reveal_beforeFirstUpdate', () => {}, (c) => c.fire('reveal'), 300);
    S('P5_duelEnd_beforeFirstUpdate', () => {}, (c) => c.fire('duelEnd'));
    S('P6_cancel_beforeFirstUpdate', () => {}, (c) => c.fire('cancel'));
    S('P7_trait_then_table_beforeFirstUpdate', () => {}, (c) => { c.fire('trait'); c.fire('table'); });
    S('P8_duel_then_table_beforeFirstUpdate', () => {}, (c) => { c.fire('duel'); c.fire('table'); });
    S('P9_duel_1frame_then_table', () => {}, (c) => { c.fire('duel'); c.step(1); c.fire('table'); });
    S('P10_punch_beforeFirstUpdate', () => {}, (c) => c.fire('punch'));

    // ── T：標題頁（非對決、相機停在牌桌機位）連發 ys:table／ys:end。
    S('T1_table_x5_sameFrame', (c) => c.step(90), (c) => { for (let i = 0; i < 5; i++) c.fire('table'); });
    S('T2_table_x5_1frameApart', (c) => c.step(90), (c) => { for (let i = 0; i < 5; i++) { c.fire('table'); c.step(1); } });
    S('T3_end_table_end_1frameApart', (c) => c.step(90), (c) => { c.fire('end'); c.step(1); c.fire('table'); c.step(1); c.fire('end'); });
    S('T4_end_table_sameFrame', (c) => c.step(90), (c) => { c.fire('end'); c.fire('table'); });
    S('T5_end_settle_then_table', (c) => c.step(90), (c) => { c.fire('end'); c.step(120); c.fire('table'); });
    S('T6_reveal_x3_1frameApart', (c) => c.step(90), (c) => { for (let i = 0; i < 3; i++) { c.fire('reveal'); c.step(1); } }, 300);
    S('T7_table_every2frames_x20', (c) => c.step(90), (c) => { for (let i = 0; i < 20; i++) { c.fire('table'); c.step(2); } });
    S('T8_end_every2frames_x20', (c) => c.step(90), (c) => { for (let i = 0; i < 20; i++) { c.fire('end'); c.step(2); } });

    // ── U：punch／burn 進行中再 goto（cur* 不含 punch），量到 punch 衰減結束（PUNCH.ms=420＝26 幀）
    const inDuel = (c) => { c.step(90); c.fire('duel'); c.step(300); };
    for (const [k, ev] of [['table', 'table'], ['reveal', 'reveal'], ['end', 'end'], ['duel2', 'duel2']]) {
      for (const at of [0, 3, 12]) {
        S(`U_punch_then_${k}_at${at}f`, inDuel, (c) => { c.fire('punch'); c.step(at); c.fire(ev); });
        S(`U_burn_then_${k}_at${at}f`, inDuel, (c) => { c.fire('burn'); c.step(at); c.fire(ev); });
      }
    }
    // punch 單獨衰減完（對照：這一條是 v0.34 既有形狀）
    S('U_punch_alone', inDuel, (c) => c.fire('punch'));
    S('U_burn_alone', inDuel, (c) => c.fire('burn'));

    // ── K：連續兩個事件、間隔 0／1／2 幀的矩陣。四種脈絡：
    //    clean＝對決機位已靜止；orbit＝進場 orbit 進行中；fold＝折回段進行中；foldLean＝lean 折回中
    const GOTOS = ['duel', 'duel2', 'duelEnd', 'table', 'reveal', 'end', 'cancel'];
    const ctxs = {
      clean: (c) => { c.step(90); c.fire('duel'); c.step(300); },
      orbit: (c) => { c.step(90); c.fire('duel'); c.step(60); },
      fold: (c) => { c.step(90); c.fire('duel'); c.step(60); c.fire('cancel'); c.step(10); },
      foldLean: (c) => { c.step(90); c.fire('duel'); c.step(300); c.fire('trait'); c.step(6); c.fire('cancel'); c.step(10); },
    };
    for (const cn of Object.keys(ctxs)) {
      for (const a of GOTOS) for (const b of GOTOS) for (const gap of [0, 1, 2]) {
        S(`K_${cn}_${a}__${b}_g${gap}`, ctxs[cn], (c) => { c.fire(a); c.step(gap); c.fire(b); });
      }
    }
    // 三連發（間隔 1 幀）：SKIP 的真實形狀 cancel → duel-end → duel
    S('K3_cancel_duelEnd_duel_g1', ctxs.clean, (c) => { c.fire('cancel'); c.step(1); c.fire('duelEnd'); c.step(1); c.fire('duel'); });
    S('K3_trait_cancel_duelEnd_duel_g1', (c) => { c.step(90); c.fire('duel'); c.step(60); c.fire('trait'); c.step(6); },
      (c) => { c.fire('cancel'); c.step(1); c.fire('duelEnd'); c.step(1); c.fire('duel'); });
    S('K3_cancel_duelEnd_duel_g0', ctxs.clean, (c) => { c.fire('cancel'); c.fire('duelEnd'); c.fire('duel'); });
    // reveal 自動返回（REVEAL_HOLD_MS=1500）到期的那一幀前後有沒有跳
    S('K_revealAutoReturn', ctxs.clean, (c) => { c.fire('reveal'); }, 300);
    S('K_reveal_midFold_autoReturn', ctxs.fold, (c) => { c.fire('reveal'); }, 300);

    return out;
  });
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0];
if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8914);
const newUrl = opt.new || '/js/camera-director.js';

const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errs = [];
  const res = {};
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', (e) => { errs.push('pageerror: ' + String(e)); console.error('[page] ' + String(e)); });
    page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); console.error('[console] ' + m.text()); } });
    res[reduced ? 'reduced' : 'normal'] = await run(page, `http://127.0.0.1:${port}/tests/tools/cam-unit.html`, newUrl);
    await page.close();
  }
  const summary = {};
  for (const mode of ['normal', 'reduced']) {
    const R = res[mode];
    const keys = Object.keys(R);
    const overF1 = keys.filter((k) => R[k].f1 > 0.2).map((k) => `${k} f1=${R[k].f1}`);
    const overMax = keys.filter((k) => R[k].max > 0.2).map((k) => `${k} max=${R[k].max}`);
    let wk = keys[0];
    for (const k of keys) if (R[k].f1 > R[wk].f1) wk = k;
    summary[mode] = { n: keys.length, worst_f1_key: wk, worst_f1: R[wk].f1, over_f1_0p20: overF1, over_max_0p20_count: overMax.length, over_max_0p20: overMax };
  }
  fs.writeFileSync(out, JSON.stringify({ newUrl, summary, errors: errs, res }, null, 1));
  console.log(JSON.stringify({ newUrl, summary, errors: errs.length }, null, 1));
  await browser.close();
} finally { srv.kill(); }
