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
//   S10 折回段進行中再來 goto 入口（第 2 輪覆審 HIGH）：折回 1/4／2/4／3/4 處各插一次
//      ys:duel／ys:table／ys:reveal（F1–F3），同門檻。修前 2.2655（C4）／2.2662（C6）。
//   S11 SKIP 出貨序列（第 2 輪覆審 HIGH 的可達性）：cancel → 1 幀 → duel-end → 1 幀 → duel（F4）。
//   S12 lean 上升沿（第 2 輪覆審 N-3）：ys:fx-trait 當幀起算（F5）。修前 0.6324。
//      X3／X4 是既有 punch／burn 的上升沿（0.5061／0.7592），只揭露不斷言。
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
    // ── R：同一段機位轉換「**沒有被打斷**」時的逐幀速度。這是 E／F 那些被打斷情境的上限參考：
    // 被打斷的轉換不得比沒被打斷的更快。有些機位轉換本身就比 0.20 快（reveal 只有 550ms，
    // duel→reveal 逐幀 0.247），拿 0.20 當它們的絕對上限等於要求改機位時長，不在本卷範圍。
    H.step(120, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    i0 = H.log.length; H.fire('ys:table', {}); H.step(120, 'e'); jump(i0, 'R1_table_clean');
    H.step(60, 'e'); H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    i0 = H.log.length; H.fire('ys:reveal', { winner: 0 }); H.step(60, 'e'); jump(i0, 'R2_reveal_clean');
    H.step(180, 'e'); // 讓 reveal 的自動返回跑完
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');
    i0 = H.log.length; H.fire('ys:end', {}); H.step(150, 'e'); jump(i0, 'R3_end_clean');
    H.step(60, 'e'); H.fire('ys:table', {}); H.step(120, 'e');
    i0 = H.log.length; H.fire('ys:duel', { a: 0, b: 3 }); H.step(180, 'e'); jump(i0, 'R4_duel_clean');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
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

    // ── S10：折回段**進行中**再來一個 goto 入口（第 2 輪覆審 HIGH）。
    // 第 1 輪的 E1–E9 在派 cancel 之後一律 step 120（2.00s）才發下一件事，整個折回窗（≤700ms
    // ＝42 幀）被跨過去，斷言集裡沒有一格落在折回進行中——這裡就補在 1/4、2/4、3/4 三個點上。
    // 第二場刻意用 {a:0,b:3}（與前一場同 duelYaw）：要量的是「被打斷有沒有跳」，
    // 不是 v0.34 就有的 180° 換場擺盪（那一格是 E9／X1，只揭露不斷言）。
    const foldRace = (at, ev, detail, key) => {
      H.step(60, 'e');
      H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');   // 推進已完成、orbit 轉了 300ms
      H.fire('ys:fx-trait-cancel', {}); H.step(at, 'e');    // 折回開始，走 at 幀
      i0 = H.log.length; H.fire(ev, detail); H.step(180, 'e');
      jump(i0, key);
      H.fire('ys:duel-end', {}); H.step(120, 'e');
    };
    for (const [at, tag] of [[10, 'q1'], [20, 'q2'], [31, 'q3']]) {
      foldRace(at, 'ys:duel', { a: 0, b: 3 }, `F1_duel_midFold_${tag}`);
      foldRace(at, 'ys:table', {}, `F2_table_midFold_${tag}`);
      foldRace(at, 'ys:reveal', { winner: 0 }, `F3_reveal_midFold_${tag}`);
    }

    // ── S11：SKIP 的出貨序列。doSkip（index.html:1744）同步派 ys:fx-trait-cancel，
    // 然後 sleep 全塌成 0ms，playDuel 很快派 ys:duel-end（:4199）、下一場再派 ys:duel。
    // 真實頁面實測 cancel→duel-end 只隔 0.5–16 ms，畫格落進這個縫的比例約 3%–76%
    // （覆審 skip-real.mjs 六次實測）。這裡固定成「各隔 1 幀」＝最容易踩到的排列。
    H.step(60, 'e');
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(6, 'e');
    i0 = H.log.length;
    H.fire('ys:fx-trait-cancel', {}); H.step(1, 'e');
    H.fire('ys:duel-end', {}); H.step(1, 'e');
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(240, 'e');
    jump(i0, 'F4_skipSequence_1frameApart');
    H.fire('ys:duel-end', {}); H.step(120, 'e');

    // ── S12：lean 的上升沿（第 2 輪覆審 N-3）。量測窗從 ys:fx-trait 當幀起算。
    // 同組另外量既有的 punch／burn 上升沿當對照——它們是 v0.34 同族、本卷裁定不改行為。
    H.step(60, 'e');
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(300, 'e');    // 進場與 orbit 都跑完，基座靜止
    i0 = H.log.length; H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(90, 'e');
    jump(i0, 'F5_lean_onset');
    H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:fx-punch', { power: 1 }); H.step(40, 'e');
    jump(i0, 'X3_punch_onset');
    H.step(60, 'e');
    i0 = H.log.length; H.fire('ys:fx-burn', { side: 'B', unit: 0 }); H.step(40, 'e');
    jump(i0, 'X4_burn_onset');
    out.burnOnsetAt = i0;
    H.step(60, 'e');
    H.fire('ys:duel-end', {}); H.step(120, 'e');
    // X5：lean 的上升沿**疊在折回段上**。兩層各自都在門檻內（折回 ≤0.176、上升沿 ≤0.182），
    // 疊起來會超過 0.20——這是兩段合法平滑運動的疊加，不是瞬移（f1 很小）。同一種疊加在
    // punch／burn 上是 0.53／0.79（C1／C2，主對話裁定不改行為），所以這裡只揭露不斷言。
    H.step(60, 'e');
    H.fire('ys:duel', { a: 0, b: 3 }); H.step(60, 'e');
    H.fire('ys:fx-trait-cancel', {}); H.step(10, 'e');
    i0 = H.log.length; H.fire('ys:fx-trait', { side: 'B', ms: 900 }); H.step(90, 'e');
    jump(i0, 'X5_lean_onset_midFold');
    H.fire('ys:duel-end', {}); H.step(120, 'e');

    out.log = H.log;
    return out;
  });
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const out = pos[0];
if (!out) { console.error('need <out.json>'); process.exit(2); }
const port = Number(opt.port || 8875);
const root = opt.root ? path.resolve(opt.root) : ROOT;
// --base 是必要的，不是可選的（第 2 輪覆審 LOW）：沒帶時 O===N，dyaw／dmax 恆為 0，
// A3（lean 方向與量）恆假、ALL_PASS 恆假——輸出一份會被誤讀成「壞掉」的 FAIL 比報錯還糟。
const baseFile = opt.base ? path.resolve(opt.base) : null;
if (!baseFile) {
  console.error('need --base=<基準 camera-director.js 路徑>（通常是 v0.34：git show 5f76adc:js/camera-director.js > <路徑>）');
  console.error('沒有基準版就沒有 (新−舊) 這個量，A3／A6 會恆假，判讀不成立。');
  process.exit(2);
}
if (!fs.existsSync(baseFile)) { console.error('--base 指到的檔不存在：' + baseFile); process.exit(2); }
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
  // 判準（動手前訂下、不隨量到的數字調整）：**每一幀的位移都要 ≤ MAX_FRAME_STEP，除非同一段
  // 機位轉換在「沒被打斷」時本來就跑得那麼快**——0.20 量的是「跳」，不是運鏡本身的速度。
  // 上限＝max(0.20, 對應的 R* 參考)。刻意**不用 max_old**（v0.34 在同一串事件裡的最大值）：
  // v0.34 自己在 duel-end→duel 這種序列上就有 2.746 的瞬移（goto 的 from=上一個 target），
  // 拿它當上限等於允許新版也跳 2.7；R* 量的是乾淨轉換，不含任何瞬移。
  // E9 例外只查前 5 幀：它的窗裡含 v0.34 就有的 180° duel→duel 擺盪（新 0.8256／舊 0.8191），
  // 那是換場的運鏡速度不是清除造成的瞬移；X 開頭的四格是 v0.34 同族路徑，只揭露不斷言。
  const refOf = (k) => E[k].max_new;
  const lim = (...refs) => Math.max(MAX_FRAME_STEP, ...refs.map(refOf));
  const CASE_LIMIT = {
    E1_duelEnd_during_orbit: ['R1_table_clean'],
    E2_traitCancel_during_orbit: [],
    E3_table_during_orbit: ['R1_table_clean'],
    E4_duelEnd_during_lean: ['R1_table_clean'],
    E5_table_during_lean: ['R1_table_clean'],
    E6_traitCancel_during_lean: [],
    E7_reveal_during_orbit: ['R2_reveal_clean'],
    E8_end_during_orbit: ['R3_end_clean'],
    F1_duel_midFold_q1: ['R4_duel_clean'], F1_duel_midFold_q2: ['R4_duel_clean'], F1_duel_midFold_q3: ['R4_duel_clean'],
    F2_table_midFold_q1: ['R1_table_clean'], F2_table_midFold_q2: ['R1_table_clean'], F2_table_midFold_q3: ['R1_table_clean'],
    F3_reveal_midFold_q1: ['R2_reveal_clean'], F3_reveal_midFold_q2: ['R2_reveal_clean'], F3_reveal_midFold_q3: ['R2_reveal_clean'],
    F4_skipSequence_1frameApart: ['R1_table_clean', 'R4_duel_clean'],
    F5_lean_onset: [],
    E9_duel_during_orbit: [],
  };
  const EKEYS = Object.keys(CASE_LIMIT);
  const worstOf = (k) => (k === 'E9_duel_during_orbit' ? Math.max(E[k].f1_new, E[k].max5_new) : E[k].max_new);
  const limitOf = (k) => lim(...CASE_LIMIT[k]);
  const ALLK = EKEYS;
  const edgeWorst = ALLK.reduce((m, k) => Math.max(m, worstOf(k)), 0);
  const edgeWorstKey = ALLK.reduce((b, k) => (worstOf(k) > worstOf(b) ? k : b), ALLK[0]);
  const edgeOver = ALLK.filter((k) => worstOf(k) > limitOf(k) || E[k].f1_new > MAX_FRAME_STEP)
    .map((k) => `${k} ${worstOf(k)} > ${+limitOf(k).toFixed(6)}`);
  // 驗收 A8：lean 期間 |Δ camera.position.length()|。|position| 恆等於 dist，所以這一條就是
  // 「lean 不得動 dist」。起點取 ys:fx-trait 的當幀（與前一幀比），偏移一上來就會被抓到。
  const lenStep = (from, to) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(L[i].nl - L[i - 1].nl)); return m; };
  const leanLenMax = Math.max(lenStep(R.traitAAt, R.traitBAt), lenStep(R.traitBAt, R.burnAt));
  // 同一支尺延伸涵蓋 burn（第 2 輪覆審 MEDIUM）：burn punch 的 dist −0.9 一樣會動
  // camera.position.length()，而它就是 duel-figures.js:467 camStable 的閘門。
  // 主對話裁定**不改這個行為**（punch 同族、v0.34 既有形狀，鎖排法一場只選一次），
  // 所以這裡是**記錄值不是斷言**——但要記在 verdict 裡，不能像修復前那樣被量測窗擋在外面。
  const burnLenMax = lenStep(R.burnAt, R.refPunchAt);
  const punchLenMax = lenStep(R.refPunchAt, R.quietAt);

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
    'A7_limit': MAX_FRAME_STEP, 'A7_over': edgeOver, 'A7_edge': E,
    'A7_refs': { R1_table: refOf('R1_table_clean'), R2_reveal: refOf('R2_reveal_clean'), R3_end: refOf('R3_end_clean'), R4_duel: refOf('R4_duel_clean') },
    'A7_PASS': edgeOver.length === 0,
    'A8_lean_dLenMax': +leanLenMax.toExponential(3),
    'A8_burn_dLenMax（記錄值，非斷言：punch 同族、裁定不改行為）': +burnLenMax.toFixed(5),
    'A8_punch_dLenMax（記錄值，v0.34 既有）': +punchLenMax.toFixed(5),
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
