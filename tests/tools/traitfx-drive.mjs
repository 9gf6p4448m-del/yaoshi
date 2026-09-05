// 卷 C3（2026-09-05）：27 套招式演出的機械驗收（T-1／T-2／T-3／T-4③／T-7／T-8）＋ 三格截圖。
// 用法：node tests/tools/traitfx-drive.mjs <out.json> [--only=trId,trId] [--reduced] [--throw] [--cancel=15]
//                                            [--shots=<png 目錄>] [--port=8841] [--ms=900] [--nobloom] [--block=<ab>]
//   --block=<ab>  擋掉那一顆 GLB（T-4 ②）：擋到出招方→該套必須退回 fallback（handled=false）；擋到對面→照演、不炸
//   出招方名冊由 index.html 的 POOL 反查（唯一事實來源，不另抄一份）：trait → {ab|m, body, count, fac}
//   每套：pass A（不出招）錄 N 幀 → resetB → 第 FIRE_AT 幀出招 → pass B 逐幀比 Δ
//   判定（寫進 out.json 的 verdict）：
//     handled     3D 舞台接了（--throw／缺編舞時應為 false）
//     alive       出招後到演完之間任一幀 Δ>EPS 或 mesh>0 或 burst（活性）
//     restored    演完（active==0）之後所有幀 Δ<EPS、mesh==0、wrapped==0（歸零）
//     within      演完的幀 ≤ FIRE_AT + ceil(ms×2/16.67)+2（保險絲之內）
//     reducedOK   --reduced 時 Δ 全程 <EPS（骨骼／model 位移全免），mesh 或 burst 仍可有
// 依賴：tools/anyCreature/node_modules/playwright；自起 python http.server。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const EPS = 1e-3;
const FIRE_AT = 12; // 第幾幀出招（前面幾幀讓 idle 站穩）
const DT_MS = 1000 / 60;

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

/** 從 index.html 的 POOL 反查 27 個 trait 的出招方名冊 */
export function casesFromIndex(html) {
  const out = [];
  const re = /\{n:"([^"]+)",(?:m:"([a-z_]+)",)?f:"([a-z]+)",p:-?\d+,(?:ab:"([a-z_]+)",)?d:"[^"]*",unit:\{body:"([a-z]+)",count:(\d+),atk:\d+,hp:\d+,trait:"([A-Za-z0-9]+)"\}\}/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1], ab: m[4] || m[2], fac: m[3], body: m[5], count: parseInt(m[6], 10), trait: m[7] });
  return out;
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function runCase(browser, base, c, opt) {
  const ms = parseInt(opt.ms || '900', 10);
  const N = FIRE_AT + Math.ceil((ms * 2) / DT_MS) + 20; // 保險絲之後再多錄 20 幀看歸零
  const ctx = await browser.newContext({ viewport: { width: 720, height: 405 }, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${c.count}&ms=${ms}${opt.throw ? '&throw=1' : ''}${opt.nobloom ? '&bloom=0' : ''}`;
  if (opt.block) await page.route(`**/assets/creatures/${opt.block}.glb`, (route) => route.abort());
  await page.goto(url, { waitUntil: 'load' });
  // module script 有 top-level await（CDN 的 three ＋ 動態 import），load 之後才慢慢評估完
  try { await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 }); }
  catch (e) { throw new Error(`__tfx 沒出現：${errors.join(' | ').slice(0, 600)}`); }
  await page.evaluate(() => window.__tfx.ready);
  const nA = await page.evaluate((n) => window.__tfx.stepA(n), N);
  await page.evaluate(() => window.__tfx.resetB());
  const programs0 = await page.evaluate(() => window.__tfx.render());
  const progList0 = await page.evaluate(() => window.__tfx.programList());
  const pre = await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  const frames = pre.slice();
  const shots = [];
  const shotAt = [8, 22, 36]; // 出招後 ~130／370／600ms 各一格
  let stepped = 0;
  const cancelAt = opt.cancel ? parseInt(opt.cancel, 10) : -1;
  const plan = [];
  const marks = [...shotAt, ...(cancelAt > 0 ? [cancelAt] : [])].sort((a, b) => a - b);
  for (const m of marks) { if (m > stepped) { plan.push({ n: m - stepped, mark: m }); stepped = m; } }
  plan.push({ n: N - FIRE_AT - stepped, mark: null });
  for (const p of plan) {
    if (p.n > 0) frames.push(...await page.evaluate((n) => window.__tfx.stepB(n), p.n));
    if (p.mark !== null && shotAt.includes(p.mark) && opt.shots) {
      await page.evaluate(() => window.__tfx.render());
      const file = path.join(opt.shots, `${c.trait}-${p.mark}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
    if (p.mark === cancelAt) await page.evaluate(() => window.__tfx.cancel());
  }
  const programs1 = await page.evaluate(() => window.__tfx.render());
  const progList1 = await page.evaluate(() => window.__tfx.programList());
  const pool0 = progList0.slice();
  const newPrograms = progList1.filter((x) => { const i = pool0.indexOf(x); if (i >= 0) { pool0.splice(i, 1); return false; } return true; });
  const sig = await page.evaluate(() => window.__tfx.sig());
  const moves = await page.evaluate(() => window.__tfx.moves);
  const softGl = await page.evaluate(() => window.__tfx.softGl);
  const stats = await page.evaluate(() => window.__tfx.stats());
  await ctx.close();

  const after = frames.filter((f) => f.i >= FIRE_AT);
  const endIdx = after.findIndex((f) => f.active === 0);
  const endFrame = endIdx >= 0 ? after[endIdx].i : -1;
  const during = endIdx >= 0 ? after.slice(0, endIdx) : after;
  const tail = endIdx >= 0 ? after.slice(endIdx) : [];
  const maxD = Math.max(0, ...after.map((f) => (Number.isFinite(f.d) ? f.d : 0)));
  const alive = during.some((f) => f.d > EPS || f.mesh > 0 || f.burst);
  const restored = tail.length > 0 && tail.every((f) => f.d < EPS && f.mesh === 0 && f.wrapped === 0);
  const fuseFrames = Math.ceil((ms * 2) / DT_MS) + 2;
  const within = endFrame >= 0 && endFrame <= FIRE_AT + fuseFrames;
  const reducedOK = !opt.reduced || after.every((f) => !(f.d > EPS));
  const verdict = { handled: fired.handled, hasMove: fired.hasMove, alive, restored, within, reducedOK, endFrame, maxD: +maxD.toFixed(4), errors: errors.length, programsGrew: programs1 - programs0 };
  const blockActor = opt.block && String(opt.block) === c.ab;
  verdict.blocked = opt.block || null;
  if (opt.throw || blockActor) verdict.pass = !fired.handled && restored && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else if (cancelAt > 0) verdict.pass = fired.handled && endFrame >= 0 && endFrame <= FIRE_AT + cancelAt + 1 && restored && errors.length === 0;
  else if (opt.block) verdict.pass = fired.handled && alive && restored && within && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else verdict.pass = fired.handled && alive && restored && within && reducedOK && errors.length === 0 && programs1 - programs0 === 0;
  return { case: c, url, nA, fired, verdict, sig, stats, errors, shots, moves, softGl, newPrograms, frames: frames.map((f) => [f.i, f.d, f.mesh, f.burst ? 1 : 0, f.active, f.wrapped]) };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const out = pos[0] || path.join(ROOT, 'scratchpad', 'traitfx-run.json');
  const port = parseInt(opt.port || '8841', 10);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  let cases = casesFromIndex(html);
  if (cases.length !== 27) console.warn(`POOL 反查到 ${cases.length} 套（預期 27）`);
  if (opt.only) { const set = new Set(String(opt.only).split(',')); cases = cases.filter((c) => set.has(c.trait)); }
  if (opt.shots) fs.mkdirSync(opt.shots, { recursive: true });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const c of cases) {
      const t0 = Date.now();
      const r = await runCase(browser, `http://127.0.0.1:${port}`, c, opt);
      r.ms = Date.now() - t0;
      results.push(r);
      const v = r.verdict;
      console.log(`${v.pass ? 'PASS' : 'FAIL'} ${c.trait.padEnd(16)} ${c.ab.padEnd(12)} handled=${v.handled} alive=${v.alive} restored=${v.restored} within=${v.within} end=${v.endFrame} maxD=${v.maxD} err=${v.errors} prog+${v.programsGrew} sig=${r.sig ? r.sig.bones.length + 'b/' + r.sig.meshes.join('+') + (r.sig.target ? '/T' : '') : '-'} ${r.ms}ms`);
      if (r.errors.length) r.errors.slice(0, 3).forEach((e) => console.log('   ! ' + e.slice(0, 200)));
      if (r.newPrograms && r.newPrograms.length) r.newPrograms.forEach((e) => console.log('   +program ' + e));
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  // T-1：27 個 trId 與編舞表集合相等；T-3：簽章兩兩不同
  const moves = results.length ? results[results.length - 1].moves || [] : [];
  const allCases = casesFromIndex(html).map((c) => c.trait);
  const t1 = { missing: allCases.filter((t) => !moves.includes(t)), extra: moves.filter((t) => !allCases.includes(t)) };
  const sigs = results.filter((r) => r.sig).map((r) => `${r.sig.bones.join(',')}|${r.sig.meshes.join(',')}|${r.sig.target}`);
  const dupSig = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  const summary = { total: results.length, pass: results.filter((r) => r.verdict.pass).length, dupSignatures: dupSig.length, t1, softGl: results.length ? results[0].softGl : null, opts: opt };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ summary, results }, null, 1));
  console.log(`\n${summary.pass}/${summary.total} pass · 重複簽章 ${dupSig.length} · ${out}`);
  void moves;
}

main().catch((e) => { console.error(e); process.exit(1); });
