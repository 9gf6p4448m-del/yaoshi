// 近景切鏡卷 批 1（v0.45 二版）P2 的**決定性**補洞治具（審查 MEDIUM-2）。
//
// 為什麼要有這一支：真實路徑上 hit 類切鏡與 fxPunch 同一筆事件觸發，之後每 45–260ms 又一次 punch，
// 排掉 punch 的靜幀常常一幀都不剩（實測 6 次 hit 切鏡有 3 次 quiet=0）；而「把 punch 解析包絡扣掉」
// 的重建被自己的自檢否掉了（非 focus 期間扣完應回 4.2，實測殘差 p95 ≈ 1.0——renderer 會夾 dt、
// hitstop 又把 dt 歸零，導演的內部時鐘跟牆鐘對不起來）。所以曲線形狀改用「同一支 camera-director、
// 固定 dt、只派 focus 不派 punch」的決定性環境驗（作法照 tests/tools/cam-unit.mjs）。
//
// 量三件事，全部對 |camera.position|（＝機位的 dist）：
//   U1 進→停→回：單調（下降段不回頭、上升段不再下探）、最低點 ≤ FOCUS_DIST+0.15、ms 之後回 4.2±0.05
//   U2 ys:fx-focus-end（招式提前收）：發出後 220ms＋2 幀內回到 4.2±0.05
//   U3 ys:fx-trait-cancel（跳過）：同 U2
// 用法：node tests/tools/closeup-cam-unit.mjs <out.json> [--port=8975] [--dir=<camera-director.js 路徑>]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const out = pos[0];
if (!out) { console.error('need <out.json>'); process.exit(2); }
const PORT = Number(opt.port || 8975);
// --dir 可以給 'tests/tools/x.js' 或 '/tests/tools/x.js'：Git Bash 會把開頭的 / 當成路徑前綴改寫
// （實測被改成 C:/Program Files/Git/...），所以這裡自己補斜線，呼叫端不要帶。
const DIR = '/' + String(opt.dir || 'js/camera-director.js').replace(/^\/+/, '');

// three 從本機 node_modules 供應，不連外網（cam-unit.mjs 走 unpkg，這裡刻意不依賴網路）
const PAGE = `<!doctype html><meta charset="utf-8"><title>closeup-cam-unit</title>
<script type="importmap">{"imports":{"three":"/tools/anyCreature/node_modules/three/build/three.module.js"}}</script>
<body>closeup-cam-unit fixture（治具頁，不是遊戲的一部分）</body>`;

const HARNESS = `
import * as THREE from 'three';
import { createCameraDirector } from '${DIR}';
window.__cu2 = (async () => {
  // 虛擬時鐘：導演內部用 performance.now()（onFocus／endFocus 記時戳），update() 收的是外面給的 now。
  // 治具用固定 dt 推進，兩個時鐘要是同一個，否則事件記的時戳跟推進的 now 差好幾秒、包絡一開始就算完了。
  let SIM = 1000;
  performance.now = () => SIM;
  const cam = { position: new THREE.Vector3(), lookAt() {} };
  const dir = createCameraDirector(cam, [{}, {}, {}, {}]);
  const DT = 1 / 60;
  const rec = [];
  const step = (n) => { for (let i = 0; i < n; i++) { SIM += DT * 1000; dir.update(DT, SIM);
    rec.push({ t: SIM, l: Math.hypot(cam.position.x, cam.position.y, cam.position.z) }); } };
  const fire = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  const runs = {};
  const mark = (k) => { runs[k] = rec.length; };

  // 進場：ys:duel 之後推進到 DUEL_SHOT 並讓 orbit 跑完（700+1500ms）
  fire('ys:duel', { a: 0, b: 1 });
  step(140);
  mark('u1');
  fire('ys:fx-focus', { kind: 'hit', side: 'A', actor: 0, foeSide: 'B', target: 0, ms: 650 });
  step(75); // 650+220 ＝ 870ms ≈ 53 幀，多跑一些看它停穩
  mark('u2');
  fire('ys:fx-focus', { kind: 'hit', side: 'A', actor: 0, foeSide: 'B', target: 0, ms: 650 });
  step(18); // 300ms 後招式進來
  fire('ys:fx-focus-end', { why: 'trait' });
  step(20); // 220ms＋2 幀
  mark('u3');
  fire('ys:fx-focus', { kind: 'burn', side: 'A', actor: 0, foeSide: 'B', target: null, ms: 600 });
  step(18);
  fire('ys:fx-trait-cancel', {});
  step(20);
  mark('end');
  return { rec, runs };
})();
`;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

const tmp = path.join(ROOT, 'tests', 'tools', '.closeup-cam-unit.page.html');
fs.writeFileSync(tmp, PAGE);
const srv = await serve(ROOT, PORT);
try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/tests/tools/.closeup-cam-unit.page.html`, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS });
  try {
    await page.waitForFunction(() => !!window.__cu2, null, { timeout: 20000 });
  } catch (e) {
    console.error('harness 沒起來；頁面錯誤：', errs.length ? errs.join(' | ') : '(無)');
    throw e;
  }
  const data = await page.evaluate(async () => await window.__cu2);
  await browser.close();

  const { rec, runs } = data;
  const DUEL = 4.2, FOCUS = 2.6;
  const seg = (a, b) => rec.slice(a, b);
  const mono = (s, tol) => { let rev = 0, phase = 'down';
    for (let k = 1; k < s.length; k++) { const dv = s[k].l - s[k - 1].l;
      if (phase === 'down' && dv > tol) phase = 'up'; else if (phase === 'up' && dv < -tol) rev++; }
    return rev; };
  const U1 = seg(runs.u1, runs.u2);
  const U2 = seg(runs.u2, runs.u3);
  const U3 = seg(runs.u3, runs.end);
  const res = {
    U1: { frames: U1.length, min: +Math.min(...U1.map((s) => s.l)).toFixed(4), rev: mono(U1, 1e-6),
      backAt: +U1[U1.length - 1].l.toFixed(4),
      // 650+220＝870ms ＝ 53 幀之後就該停在 4.2
      back870: +Math.abs(U1[Math.min(U1.length - 1, 53)].l - DUEL).toFixed(4) },
    U2: { frames: U2.length, min: +Math.min(...U2.map((s) => s.l)).toFixed(4), rev: mono(U2, 1e-6),
      backAfterEnd: +Math.abs(U2[U2.length - 1].l - DUEL).toFixed(4) },
    U3: { frames: U3.length, min: +Math.min(...U3.map((s) => s.l)).toFixed(4), rev: mono(U3, 1e-6),
      backAfterCancel: +Math.abs(U3[U3.length - 1].l - DUEL).toFixed(4) },
    errors: errs,
  };
  res.PASS = res.U1.min <= FOCUS + 0.15 && res.U1.rev === 0 && res.U1.back870 <= 0.05
    && res.U2.rev === 0 && res.U2.backAfterEnd <= 0.05
    && res.U3.rev === 0 && res.U3.backAfterCancel <= 0.05 && errs.length === 0;
  fs.writeFileSync(out, JSON.stringify({ res, rec }, null, 1));
  console.log(JSON.stringify(res, null, 1));
  if (!res.PASS) process.exitCode = 1;
} finally { srv.kill(); fs.rmSync(tmp, { force: true }); }
