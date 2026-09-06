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
//   S6 reduced-motion：整場 (a)(b) no-op（新舊逐項相同），(c) 依 M-3 改成也 no-op
//   S7 清除偏移的單幀位移（2026-09-06 修復卷新增，第 1 輪覆審 H-1／M-1）：
//      orbit／lean 進行中收到 duel-end／trait-cancel／table／reveal／end／duel 時，
//      事件當幀相對前一幀的相機位移必須 ≤ MAX_FRAME_STEP。修前 2.41（36.8°）／0.50。
//      X 開頭那兩格是 v0.34 既有、本卷未動的路徑（goto 的 from=上一個 target、punch 歸零），
//      只揭露不斷言——它們新舊逐值相同，拿來當「這支治具量得到大跳」的反面對照。
//   S8 lean 期間 |Δ camera.position.length()|（第 1 輪覆審 M-2）：|position| 恆等於 dist，
//      而它正是 duel-figures.js:467 camStable 的閘門，lean 不得動它。
//   S9 reduced-motion 下 ys:fx-burn 完全不動相機（第 1 輪覆審 M-3）。
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
  const DT = 1 / 60, MS = 1000 / 60;
  let now = 1000;
  // director 的 REVEAL_HOLD_MS 排程讀的是 performance.now()，而治具餵給 update() 的是合成時鐘。
  // 兩把尺不同源時（治具幾毫秒真實時間內推完幾萬毫秒合成時間），ys:reveal 的自動返回會在
  // 「下一幀」就到期，量到的是治具假象不是導演行為。把 performance.now 綁到同一把尺才量得準。
  performance.now = () => now;
  const dirO = O(camO, lanterns);
  const dirN = N(camN, lanterns);
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
    H.step(120, 'cancel');          // 清零後的 120 幀（2.00s；涵蓋折回段 ＋ 之後的靜止段）
    out.n2 = H.log.length;
    H.fire('ys:duel-end', {});
    H.step(120, 'end2');

    // ── S7：清除偏移那一幀的位移。量法照覆審探針 cam-edge.mjs：
    // 「事件當幀寫進去的位置」與「事件前最後一幀」的距離，就是畫面上看得到的瞬移。
    out.edge = {};
    const jump = (i0, key) => {
      const dN = (i) => { const a = H.log[i], p = H.log[i - 1]; return Math.hypot(a.nx - p.nx, a.ny - p.ny, a.nz - p.nz); };
      const dO = (i) => { const a = H.log[i], p = H.log[i - 1]; return Math.hypot(a.ox - p.ox, a.oy - p.oy, a.oz - p.oz); };
      const to = H.log.length;
      let m5n = 0, mn = 0, mo = 0, at = -1;
      for (let i = i0; i < to; i++) {
        if (dN(i) > mn) { mn = dN(i); at = i - i0; }
        mo = Math.max(mo, dO(i));
        if (i < i0 + 5) m5n = Math.max(m5n, dN(i));
      }
      out.edge[key] = {
        f1_new: +dN(i0).toFixed(6), f1_old: +dO(i0).toFixed(6),
        max5_new: +m5n.toFixed(6), max_new: +mn.toFixed(6), maxAtFrame: at, max_old: +mo.toFixed(6),
      };
    };
    let i0;
    // E1 orbit 進行中收 duel-end（＝2.2 秒內按 SKIP 的出貨路徑）
    H.step(120, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:duel-end', {}); H.step(120, 'e');
    jump(i0, 'E1_duelEnd_during_orbit');
    // E2 orbit 進行中收 ys:fx-trait-cancel（doSkip 的清場，index.html:1744）
    H.step(120, 'e'); H.fire('ys:duel', { a: 1, b: 2 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:fx-trait-cancel', {}); H.step(120, 'e');
    jump(i0, 'E2_traitCancel_during_orbit');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
    // E3 orbit 進行中收 ys:table
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:table', {}); H.step(120, 'e');
    jump(i0, 'E3_table_during_orbit');
    // E4 lean 峰值時收 duel-end
    H.step(60, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(6, 'e');
    i0 = H.log.length; H.fire('ys:duel-end', {}); H.step(120, 'e');
    jump(i0, 'E4_duelEnd_during_lean');
    // E5 lean 峰值時收 ys:table
    H.step(60, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    H.fire('ys:fx-trait', { side: 'A', ms: 900 }); H.step(6, 'e');
    i0 = H.log.length; H.fire('ys:table', {}); H.step(120, 'e');
    jump(i0, 'E5_table_during_lean');
    // E6 lean 峰值時收 ys:fx-trait-cancel
    H.step(60, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(6, 'e');
    i0 = H.log.length; H.fire('ys:fx-trait-cancel', {}); H.step(120, 'e');
    jump(i0, 'E6_traitCancel_during_lean');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
    // E7 orbit 進行中收 ys:reveal
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:reveal', { winner: 0 }); H.step(60, 'e');
    jump(i0, 'E7_reveal_during_orbit');
    H.step(180, 'e');
    // E8 orbit 進行中收 ys:end
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:end', {}); H.step(150, 'e');
    jump(i0, 'E8_end_during_orbit');
    // E9 orbit 進行中再來一個 ys:duel（出貨不可達，但 edge-shot／faction-sheet 治具會走）
    H.step(60, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:duel', { a: 1, b: 2 }); H.step(120, 'e');
    jump(i0, 'E9_duel_during_orbit');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
    // X1／X2：v0.34 既有、本卷未動的路徑（goto 的 from=上一個 target、punch 歸零），新舊逐值相同。
    // 只揭露不斷言；X2（punch 峰值時 duel-end，0.4160）順便當反面對照——修好之後 E1–E9 全部
    // ≤ 門檻而 X2 仍在門檻之上，代表這支量測不是恆小、門檻不是恆真。
    i0 = H.log.length; H.fire('ys:duel-end', {}); H.fire('ys:duel', { a: 1, b: 2 }); H.step(120, 'e');
    jump(i0, 'X1_duelEnd_then_duel_sameFrame');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    H.fire('ys:fx-punch', { power: 1 }); H.step(3, 'e');
    i0 = H.log.length; H.fire('ys:duel-end', {}); H.step(120, 'e');
    jump(i0, 'X2_punchPeak_duelEnd');

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
  // 驗收 4：SKIP 之後的殘留。基準＝S1 那場自然轉完、三層全歸零的靜止位置（同一組座位、同一支新版）。
  // 量測窗＝「折回段（最長 CLEAR_MS_MAX 700ms）跑完之後」到本場結束；折回段本身由 A7 逐幀盯著
  // （每一幀 ≤ MAX_FRAME_STEP），不是沒人看的空窗。修復卷前的實作是瞬間清零，量測窗從 cancel 的
  // 下一幀起算就等價；改成平滑折回之後，殘留只有在折回結束後量才有意義（見報告的凍結條說明）。
  const CLEAR_F = Math.ceil(700 / (1000 / 60)) + 4; // CLEAR_MS_MAX 折回 ＋ 4 幀讓浮點把 t 夾到 1
  const ref = L[R.traitAAt - 1];
  const skipPeak = +Math.abs(L[R.cancelAt - 1].nyaw - ref.nyaw).toFixed(4);
  const afterCancel = seg(R.cancelAt + CLEAR_F, R.n2);
  const devFromRef = (x) => Math.max(Math.abs(x.nx - ref.nx), Math.abs(x.ny - ref.ny), Math.abs(x.nz - ref.nz));
  const skipResidual = +maxOf(afterCancel, devFromRef).toFixed(12);
  const skipYawResidual = +maxOf(afterCancel, (x) => Math.abs(x.nyaw - ref.nyaw)).toFixed(12);
  // 揭露：cancel 當幀起算的殘留（舊窗口）。折回段還在跑，所以這個值不再是 0，是設計上的。
  const skipResidualAtCancel = +maxOf(seg(R.cancelAt, R.n2), devFromRef).toFixed(6);
  // S6：reduced-motion。(a)(b) no-op → 進場與招式期間新舊逐項相同；(c) burn punch 照舊
  const RR = results.reduced, RL = RR.log;
  const rNoop = Math.max(
    maxOf(RL.slice(RR.duelAt, RR.burnAt), (x) => x.dmax),
    maxOf(RL.slice(RR.duel2At, RR.n2), (x) => x.dmax));
  const rRest = RL[RR.quietAt + 50].nz;
  const rDrop = (from) => +Math.max(...RL.slice(from, from + 40).map((x) => Math.abs(rRest - x.nz))).toFixed(9);
  const rBurn = rDrop(RR.burnAt), rRef = rDrop(RR.refPunchAt);
  const rBurnRatio = +(rBurn / rRef).toFixed(6);
  // reduced-motion 下 ys:fx-burn 是否真的不動相機：拿基準版當對照最乾淨——v0.34 的 director
  // 根本沒有 ys:fx-burn 監聽器，所以「新版也 no-op」＝燒毀那一段新舊逐項相同（恆等於 0）。
  // 用 (新−舊) 而不是「位移是否為 0」，是因為後者會混進 v0.34 在 t 剛好等於 1 那一幀不寫入
  // 造成的 8.2e-5 固定殘差（同 A2 揭露那一項），那與燒毀無關。
  const rBurnNoop = maxOf(RL.slice(RR.burnAt, RR.refPunchAt), (x) => x.dmax);

  // 驗收 A7：清除偏移那一幀的位移上限。0.20 的來源＝同場景平滑補間的既有最大單幀位移 0.152624
  // （cam-edge.json 的 S0/max_old）留一點餘裕；修復前 E1／E2 是 2.407、E4／E5 是 0.504。
  const MAX_FRAME_STEP = 0.2;
  const E = R.edge;
  // E1–E8：整段（清除當幀 ＋ 折回段 ＋ 接手的基座補間）逐幀都要 ≤ 門檻。
  // E9 只查前 5 幀：它的量測窗裡含一段 v0.34 就有的 180° duel→duel 基座擺盪（新 0.8256／
  // 舊 0.8191，maxAtFrame 20），那是既有運鏡速度不是清除造成的瞬移，不在本次修復範圍。
  const EKEYS = ['E1_duelEnd_during_orbit', 'E2_traitCancel_during_orbit', 'E3_table_during_orbit',
    'E4_duelEnd_during_lean', 'E5_table_during_lean', 'E6_traitCancel_during_lean',
    'E7_reveal_during_orbit', 'E8_end_during_orbit'];
  const worstOf = (k) => (k === 'E9_duel_during_orbit' ? Math.max(E[k].f1_new, E[k].max5_new) : E[k].max_new);
  const ALLK = EKEYS.concat(['E9_duel_during_orbit']);
  const edgeWorst = ALLK.reduce((m, k) => Math.max(m, worstOf(k)), 0);
  const edgeWorstKey = ALLK.reduce((b, k) => (worstOf(k) > worstOf(b) ? k : b), ALLK[0]);
  // 驗收 A8：lean 期間 |Δ camera.position.length()|。|position| 恆等於 dist，所以這一條就是
  // 「lean 不得動 dist」。起點取 ys:fx-trait 的當幀（與前一幀比），偏移一上來就會被抓到。
  const lenStep = (from, to) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(L[i].nl - L[i - 1].nl)); return m; };
  const leanLenMax = Math.max(lenStep(R.traitAAt, R.traitBAt), lenStep(R.traitBAt, R.burnAt));

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
    'A4_residual_from_cancel_frame（揭露：折回段在內）': skipResidualAtCancel,
    'A4_PASS': skipPeak > 5 && skipResidual < 1e-6 && skipYawResidual < 1e-6,
    'A5_burn_distDrop': burnDrop, 'A5_refPunch_distDrop': refDrop, 'A5_ratio': burnRatio,
    'A5_PASS': Math.abs(burnRatio - 1.5) < 1e-6,
    'A6_reduced_noop_max': +rNoop.toExponential(3), 'A6_reduced_burn_noop': +rBurnNoop.toExponential(3),
    'A6_reduced_burn_drop（揭露：含 v0.34 的 8.2e-5 固定殘差）': rBurn,
    'A6_reduced_refPunch_drop': rRef, 'A6_reduced_burn_ratio': rBurnRatio,
    // (c) 依 M-3 改判：reduced-motion 下 ys:fx-burn 必須與「沒有這個監聽器的 v0.34」逐項相同，
    // 同時 ys:fx-punch 這條既有路徑要照舊會動——不然「不動」可能只是治具沒餵到事件。
    'A6_PASS': rNoop === 0 && rBurnNoop === 0 && rRef > 0.1,
    'A7_clear_frameStep_max': +edgeWorst.toFixed(6), 'A7_clear_frameStep_worst': edgeWorstKey,
    'A7_limit': MAX_FRAME_STEP, 'A7_edge': E,
    'A7_PASS': ALLK.every((k) => worstOf(k) <= MAX_FRAME_STEP && E[k].f1_new <= MAX_FRAME_STEP),
    'A8_lean_dLenMax': +leanLenMax.toExponential(3),
    'A8_PASS': leanLenMax < 1e-3,
    'A9_reduced_burn_noop': +rBurnNoop.toExponential(3), 'A9_reduced_refPunch_drop': rRef,
    'A9_PASS': rBurnNoop === 0 && rRef > 0.1,
    errors: errs.length,
  };
  verdict.ALL_PASS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'].every((k) => verdict[k + '_PASS']) && errs.length === 0;
  fs.writeFileSync(out, JSON.stringify({ verdict, errors: errs, results }, null, 1));
  console.log(JSON.stringify(verdict, null, 1));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
} finally { srv.kill(); }
