// 後處理卷 P-4（2026-09-06）：運鏡三段的決定性治具。
// 在同一個頁面裡同時建「新版」與「基準版」兩個 camera-director，餵給它們**完全一樣**的
// 事件序列與 dt，逐幀比兩台相機的位置——基準版看不懂 ys:fx-trait／ys:fx-burn，
// 所以 (新 − 舊) 就是三段偏移量本身，不必在 director 裡開後門吐內部狀態。
//
// 用法：node tests/tools/cam-unit.mjs <out.json> [--port=8875] [--root=<靜態根>]
//                                     [--base=<基準 camera-director.js 路徑>]
//                                     [--new=<受測 camera-director.js 路徑>]  ← 鑑別力反向驗證用
// 驗收對應（docs/experiments/2026-09-06-acceptance-postfx.md P-4）：
//   S1 orbit：orbit 期間逐幀 |Δ camera.position.length()|（驗收 1）
//   S2 歸零＝舊版：orbit／lean／punch 都不在跑時，新舊逐項差（驗收 2）
//   S3 lean：ys:fx-trait 後 200ms 內 yaw 朝出招側偏的符號與量、ms 內回位（驗收 3）
//   S4 SKIP：ys:fx-trait-cancel 的下一幀，新舊逐項差＝0（驗收 4）
//   S5 burn punch：ys:fx-burn 造成的 dist 峰值減量（＝PUNCH.dist×1.5）
//   S6 reduced-motion：整場 (a)(b) no-op（新舊逐項相同），(c) 的 punch 照舊
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
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

const PAGE = `<!doctype html><meta charset="utf-8"><title>cam-unit</title>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.158.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.158.0/examples/jsm/"}}</script>
<body>cam-unit</body>`;

/** 頁面端：兩台 director、固定 dt、決定性推進。以 module script 注入（importmap 才解析得到 'three'）。 */
const HARNESS = (newUrl, baseUrl) => `
import * as THREE from 'three';
import { createCameraDirector as N } from '${newUrl}';
${newUrl === baseUrl ? 'const O = N;' : `import { createCameraDirector as O } from '${baseUrl}';`}
window.__camunit = (async () => {
  const mkCam = () => ({ position: new THREE.Vector3(), lookAt() {} });
  const lanterns = [{}, {}, {}, {}];
  const camN = mkCam(), camO = mkCam();
  // 先建基準版再建新版也行；兩者都掛在 document 上，dispatch 一次兩邊都收得到
  const dirO = O(camO, lanterns);
  const dirN = N(camN, lanterns);
  const DT = 1 / 60, MS = 1000 / 60;
  let now = 1000;
  const log = [];
  const D360 = (d) => ((((d % 360) + 540) % 360) - 180);
  function step(n, tag) {
    for (let i = 0; i < n; i++) {
      now += MS;
      dirO.update(DT, now); dirN.update(DT, now);
      const a = camN.position, b = camO.position;
      log.push({
        t: +(now).toFixed(3), tag: tag || '',
        nx: a.x, ny: a.y, nz: a.z, ox: b.x, oy: b.y, oz: b.z,
        nl: Math.hypot(a.x, a.y, a.z), ol: Math.hypot(b.x, b.y, b.z),
        nyaw: Math.atan2(a.x, a.z) * 180 / Math.PI,
        // yaw 差＝lean+orbit 的純偏移（基準版沒有這兩層）
        dyaw: D360((Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z)) * 180 / Math.PI),
        dmax: Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)),
      });
    }
  }
  const fire = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  return { step, fire, log, mark: (m) => log.push({ mark: m, t: now }), now: () => now };
})();
`;

async function run(page, url, newUrl, baseUrl) {
  await page.goto(url, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS(newUrl, baseUrl) });
  await page.waitForFunction(() => !!window.__camunit, null, { timeout: 20000 })
    .catch((e) => { throw new Error('harness 沒起來（多半是 module 載入失敗）: ' + e.message); });
  return page.evaluate(async () => {
    const H = await window.__camunit;
    const out = {};
    // ── 定場：先走到牌桌機位穩定（t=1、無任何偏移）
    H.step(90, 'settle0');
    out.i0 = H.log.length;
    // ── S1/S2/S5：一場完整的對決（進場 orbit → 招式 → 燒毀 → 收場）
    H.fire('ys:duel', { a: 0, b: 3 });
    out.duelAt = H.log.length;
    H.step(300, 'duel');            // 5.00s：涵蓋 700ms 推進 ＋ 1500ms orbit ＋ 之後的靜止
    out.traitAAt = H.log.length;
    H.fire('ys:fx-trait', { side: 'A', ms: 900 });
    H.step(90, 'traitA');           // 1.50s
    out.traitBAt = H.log.length;
    H.fire('ys:fx-trait', { side: 'B', ms: 900 });
    H.step(90, 'traitB');
    out.burnAt = H.log.length;
    H.fire('ys:fx-burn', { side: 'B', unit: 0, ms: 500 });
    H.step(60, 'burn');             // 1.00s（PUNCH.ms=420）
    // 對照組：power=1 的標準 punch，逐幀取樣位置與 burn 那組完全一樣 → 兩組同幀的 dist 減量比＝力道倍率
    out.refPunchAt = H.log.length;
    H.fire('ys:fx-punch', { power: 1 });
    H.step(60, 'refPunch');
    out.quietAt = H.log.length;
    H.step(60, 'quiet');            // 三層全歸零、基座也到位的一段
    out.endAt = H.log.length;
    H.fire('ys:duel-end', {});
    H.step(120, 'end');
    out.n1 = H.log.length;
    // ── S4：SKIP。刻意用**跟 S1 同一組座位**，這樣 S1 那場「orbit 自然轉完、三層全歸零」的
    // 靜止位置，就是一個獨立於本場的基準點：清零成功的話本場清完要正好落在同一點上。
    H.fire('ys:duel', { a: 0, b: 3 });
    out.duel2At = H.log.length;
    H.step(60, 'duel2');            // 1.00s > 推進 700ms，orbit 還在轉
    out.skipTraitAt = H.log.length;
    H.fire('ys:fx-trait', { side: 'B', ms: 900 });
    H.step(6, 'skipTrait');         // 0.10s：lean 正在最大
    out.cancelAt = H.log.length;
    H.fire('ys:fx-trait-cancel', {});
    H.step(30, 'cancel');           // 清零後的 30 幀
    out.n2 = H.log.length;
    H.fire('ys:duel-end', {});
    H.step(120, 'end2');
    out.log = H.log;
    return out;
  });
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0];
if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8875);
const root = opt.root ? path.resolve(opt.root) : ROOT;
const baseFile = opt.base ? path.resolve(opt.base) : null;
const newUrl = opt.new || '/js/camera-director.js';

const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errs = [];
  const results = {};
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', (e) => { errs.push('pageerror: ' + String(e)); console.error('[page] ' + String(e)); });
    page.on('console', (m) => { if (m.type() === 'error') { errs.push('console: ' + m.text()); console.error('[console] ' + m.text()); } });
    if (baseFile) {
      const body = fs.readFileSync(baseFile, 'utf8');
      await page.route('**/base/camera-director.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body }));
    }
    results[reduced ? 'reduced' : 'normal'] = await run(page, `http://127.0.0.1:${port}/tests/tools/cam-unit.html`, newUrl, baseFile ? '/base/camera-director.js' : '/js/camera-director.js');
    await page.close();
  }

  // ── 判讀 ────────────────────────────────────────────────────────────────
  const R = results.normal, L = R.log;
  const seg = (a, b) => L.slice(a, b);
  const maxOf = (arr, f) => arr.reduce((m, x) => Math.max(m, f(x)), 0);
  // 驗收 1：orbit 期間逐幀 |Δ length|。orbit＝推進到位（700ms＝42 幀）之後那 1500ms（90 幀），
  // 尾巴多留 4 幀讓浮點累加把 orbitU 夾到 1。
  const PUSH_F = Math.ceil(700 / (1000 / 60)); // 42
  const ORBIT_F = Math.ceil(1500 / (1000 / 60)); // 90
  const orb = seg(R.duelAt + PUSH_F, R.duelAt + PUSH_F + ORBIT_F + 4);
  let dLenMax = 0;
  for (let i = 1; i < orb.length; i++) dLenMax = Math.max(dLenMax, Math.abs(orb[i].nl - orb[i - 1].nl));
  // orbit 回位量測用「新版自己的」yaw：拿 orbit 起點／終點跟這一場靜止後的 yaw 比，
  // 這樣不會混進「v0.34 在 t 剛好等於 1 的那一幀不寫入」造成的 0.0024 度固定殘差。
  const settledYaw = L[R.traitAAt - 1].nyaw;
  const orbitStartOffset = L[R.duelAt + PUSH_F].nyaw - settledYaw;
  const orbitEndOffset = L[R.duelAt + PUSH_F + ORBIT_F + 3].nyaw - settledYaw;
  // 驗收 2：三層全歸零時新舊逐項差。凍結條文問的是「對決結束、無 orbit／lean／punch 時」。
  const afterEnd = seg(R.endAt + 100, R.n1);
  const zeroDiff = maxOf(afterEnd, (x) => x.dmax);
  // 另外揭露：對決「進行中」且三層都歸零的那一段。這一段新舊會差 ~1.5e-4，成因不是偏移殘留，
  // 而是 v0.34 的寫入區塊在 t 剛好等於 1 的那一幀就不再執行（凍在前一幀、離目標還差 0.0024 度）；
  // 新版因為 orbit 還在跑而多寫了那一幀，反而正好落在目標上。詳見報告。
  const quiet = seg(R.quietAt, R.endAt);
  const preTrait = seg(R.duelAt + PUSH_F + ORBIT_F + 5, R.traitAAt);
  const zeroDiffDuel = Math.max(maxOf(quiet, (x) => x.dmax), maxOf(preTrait, (x) => x.dmax));
  // 驗收 3：lean 符號與回位
  const leanOf = (from, ms) => {
    const F200 = Math.round(200 / (1000 / 60));
    const w = seg(from, from + F200);
    let best = 0; for (const x of w) if (Math.abs(x.dyaw) > Math.abs(best)) best = x.dyaw;
    const backF = Math.ceil(ms / (1000 / 60)) + 1;
    const back = L[from + backF];
    return { peak200: +best.toFixed(4), atMs: +Math.abs(back.dyaw).toFixed(4), distDrop: +Math.max(...w.map((x) => x.ol - x.nl)).toFixed(4) };
  };
  const leanA = leanOf(R.traitAAt, 900);
  const leanB = leanOf(R.traitBAt, 900);
  // (c) burn punch：拿「新版自己」靜止時當基線，量 burn 與 power=1 對照組的 dist 減量比。
  // 不用 (舊−新)，因為舊版也收 ys:fx-punch，對照組會被抵銷成 0。
  // 量 z 不量 |position|：punch 的橫向微震只加在 x／y 上，z＝cos(yaw)cos(tilt)·dist 與 dist 成正比，
  // 這段 yaw／tilt 都靜止 → z 的減量比就是 dist 的減量比，不摻微震。
  const restZ = L[R.quietAt + 50].nz;
  const dropOf = (from) => +Math.max(...seg(from, from + 40).map((x) => Math.abs(restZ - x.nz))).toFixed(9);
  const burnDrop = dropOf(R.burnAt);
  const refDrop = dropOf(R.refPunchAt);
  const burnRatio = +(burnDrop / refDrop).toFixed(6);
  // 驗收 4：SKIP 後下一幀。基準＝S1 那場自然轉完、三層全歸零的靜止位置（同一組座位、同一支新版）。
  const ref = L[R.traitAAt - 1];
  const skipPeak = +Math.abs(L[R.cancelAt - 1].nyaw - ref.nyaw).toFixed(4);
  const afterCancel = seg(R.cancelAt, R.n2);
  const devFromRef = (x) => Math.max(Math.abs(x.nx - ref.nx), Math.abs(x.ny - ref.ny), Math.abs(x.nz - ref.nz));
  const skipResidual = +maxOf(afterCancel, devFromRef).toFixed(12);
  const skipYawResidual = +maxOf(afterCancel, (x) => Math.abs(x.nyaw - ref.nyaw)).toFixed(12);
  // S6：reduced-motion。(a)(b) no-op → 進場與招式期間新舊逐項相同；(c) burn punch 照舊
  const RR = results.reduced, RL = RR.log;
  const rNoop = Math.max(
    maxOf(RL.slice(RR.duelAt, RR.burnAt), (x) => x.dmax),
    maxOf(RL.slice(RR.duel2At, RR.n2), (x) => x.dmax));
  const rRest = RL[RR.quietAt + 50].nz;
  const rDrop = (from) => +Math.max(...RL.slice(from, from + 40).map((x) => Math.abs(rRest - x.nz))).toFixed(9);
  const rBurn = rDrop(RR.burnAt), rRef = rDrop(RR.refPunchAt);
  const rBurnRatio = +(rBurn / rRef).toFixed(6);

  const verdict = {
    newUrl, base: baseFile || '(same file)',
    'A1_orbit_dLenMax': +dLenMax.toExponential(3),
    'A1_orbit_yaw_start_deg': +orbitStartOffset.toFixed(3),
    'A1_orbit_yaw_end_deg': +orbitEndOffset.toFixed(6),
    'A1_orbit_yaw_swept_deg': +Math.abs(orbitStartOffset - orbitEndOffset).toFixed(3),
    'A1_PASS': dLenMax < 1e-3 && Math.abs(orbitEndOffset) < 1e-6 && Math.abs(orbitStartOffset) > 5,
    'A2_afterDuelEnd_diff': +zeroDiff.toExponential(3),
    'A2_duelSettled_diff（揭露，非凍結條）': +zeroDiffDuel.toExponential(3),
    'A2_PASS': zeroDiff < 1e-6,
    'A3_leanA_side_left': leanA, 'A3_leanB_side_right': leanB,
    'A3_PASS': leanA.peak200 < -5 && leanB.peak200 > 5 && leanA.atMs < 0.5 && leanB.atMs < 0.5,
    'A4_skip_peak_before_deg': skipPeak,
    'A4_skip_residual_pos': skipResidual, 'A4_skip_residual_yaw_deg': skipYawResidual,
    'A4_PASS': skipPeak > 5 && skipResidual < 1e-6 && skipYawResidual < 1e-6,
    'A5_burn_distDrop': burnDrop, 'A5_refPunch_distDrop': refDrop, 'A5_ratio': burnRatio,
    'A5_PASS': Math.abs(burnRatio - 1.5) < 1e-6,
    'A6_reduced_noop_max': +rNoop.toExponential(3), 'A6_reduced_burn_ratio': rBurnRatio,
    'A6_PASS': rNoop === 0 && Math.abs(rBurnRatio - 1.5) < 1e-6,
    errors: errs.length,
  };
  verdict.ALL_PASS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].every((k) => verdict[k + '_PASS']) && errs.length === 0;
  fs.writeFileSync(out, JSON.stringify({ verdict, errors: errs, results }, null, 1));
  console.log(JSON.stringify(verdict, null, 1));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
} finally { srv.kill(); }
