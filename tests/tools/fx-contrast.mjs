// L3 對比閘門的凍幀 A/B 治具（v0.55 招式可辨性卷，凍結檔 `2026-09-11-acceptance-fx-legibility.md` L3）。
//
// 用法：node tests/tools/fx-contrast.mjs <輸出目錄> [--only=trId,trId] [--tier=2] [--port=8845] [--dt=16.6667]
//
// 量什麼：**徽記／拖尾／印記在暗紅桌面＋紫夜空上到底看不看得見**。
// 為什麼不用色票算 ΔE：加色混合＋bloom 之後畫面上的顏色不等於色票值——那是重建的模型，不是真實路徑
// （ART_BIBLE §10.4）。所以一律凍幀拍 A/B 差圖。
//
// 作法（沿用 tests/tools/outline-probe.mjs `width` 模式的手法：**同一次載入、同一格畫面**）：
//   1. 走 traitfx-preview.html 逐幀步進到 BEAT[tier].travel 的中點 → 時間軸自然就凍住了（治具不用 rAF）；
//   2. render() 後截圖 A（徽記可見）；
//   3. `__tfx.fxVis(false)` 只把 emblem/trail/mark 切成 invisible，**其餘一切不動**，同一格 render() 再截圖 B；
//   4. 還原 visible，把兩張圖交給 tests/tools/fx-contrast-metrics.py 算面積與 CIE76 ΔE 中位數。
//
// 判定（門檻在 metrics 那一支，這裡只負責取樣）：特效像素 ≥ 全畫面 0.8% 且 ΔE 中位 ≥ 28。
// 活性：`fxVis` 回傳被切到的物件數，**0 就直接判紅**——那代表這一招根本沒有新語彙，
//       兩張圖會逐位元組相同、差圖面積 0，而「0 < 0.8%」看起來像單純沒過，實際是量錯了對象。
//
// ★量測位置（`02 §6.1` 第 5 條，報告要照抄）★：治具頁的場景＝js/scene-env.js 的真實牌桌
// （TABLE_COLOR 0x6b3418、ENV.SKY_STOPS 夜紫天）＋對決機位，但 **bloom threshold 是 0.5，
// 產品 js/renderer.js 是 0.7**。門檻低＝亮部萃取更早介入＝更容易爆白，所以在這裡過是**保守**的
// （產品端只會更不白）。要量產品端那一格要走 duel-drive 的真實對決場景，那是批 1–3 的正式 L3。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';
import { casesFromIndex } from './traitfx-drive.mjs';
import { BEAT } from '../../js/trait-fx/vocab.js';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const FIRE_AT = 12;
const VIEW = { width: 720, height: 405 }; // 與 traitfx-drive 同一個視窗尺寸（面積百分比才可比）

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function shoot(browser, base, c, opt, outDir) {
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier);
  const dt = parseFloat(opt.dt || (1000 / 60));
  const beat = BEAT[tier];
  // 凍幀點＝travel 中點（凍結檔 L3 第 1 步寫死，不得逐招調）
  const atMs = (beat.travel[0] + beat.travel[1]) / 2;
  const atFrame = Math.max(1, Math.round(atMs / dt));

  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${dt}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 });
  await page.evaluate(() => window.__tfx.ready);
  // ★HUD 一定要藏★：治具頁左上角那行 debug 文字寫著招名與 ab（'eliteSelfCut xianjixl ready …'），
  //   不藏就等於在盲讀材料上直接印答案（批 0 第一版真的印出去了，a11.png 六格全帶）。
  await page.addStyleTag({ content: '#hud{display:none!important}' });
  const bloomCfg = await page.evaluate(() => window.__tfx.bloomCfg());
  await page.evaluate((n) => window.__tfx.stepA(n), FIRE_AT + 2);
  await page.evaluate(() => window.__tfx.resetB());
  await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  await page.evaluate((n) => window.__tfx.stepB(n), atFrame);
  // ── 這一格之後不再步進：時間軸凍住，A 與 B 之間只有 visible 一個變數 ──
  await page.evaluate(() => window.__tfx.render());
  const fileA = path.join(outDir, `${c.trait}-A.png`);
  await page.screenshot({ path: fileA });
  const hidden = await page.evaluate(() => window.__tfx.fxVis(false));
  await page.evaluate(() => window.__tfx.render());
  const fileB = path.join(outDir, `${c.trait}-B.png`);
  await page.screenshot({ path: fileB });
  await page.evaluate(() => window.__tfx.fxVis(true)); // 還原（同一頁不再用，但不留副作用）
  const sig = await page.evaluate(() => window.__tfx.sig());
  await ctx.close();
  return { trait: c.trait, ab: c.ab, tier, ms, atMs, atFrame, handled: fired.handled, hidden, fileA, fileB, bloomCfg, errors, meshes: sig ? sig.meshes : null };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'fx-contrast');
  const port = parseInt(opt.port || '8845', 10);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assertPageConsts(pageConstsFromHtml(html));
  let cases = casesFromIndex(html);
  if (opt.only) { const s = new Set(String(opt.only).split(',')); cases = cases.filter((c) => s.has(c.trait)); }
  if (!cases.length) throw new Error('--only 篩掉了全部的招');
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const out = [];
  try {
    for (const c of cases) {
      const r = await shoot(browser, `http://127.0.0.1:${port}`, c, opt, outDir);
      out.push(r);
      console.log(`${r.hidden > 0 && r.handled && !r.errors.length ? ' ok ' : 'FAIL'} ${c.trait.padEnd(16)} t${r.tier} 凍在 ${r.atMs}ms(第 ${r.atFrame} 幀) 切掉 ${r.hidden} 個特效物件 handled=${r.handled} err=${r.errors.length}`);
      r.errors.slice(0, 2).forEach((e) => console.log('   ! ' + e.slice(0, 180)));
    }
  } finally { await browser.close(); srv.kill(); }
  const meta = path.join(outDir, 'shots.json');
  fs.writeFileSync(meta, JSON.stringify({ view: VIEW, cases: out }, null, 1));
  console.log(`\n${out.length} 套 · ${meta}\n接著跑：python tests/tools/fx-contrast-metrics.py ${path.relative(ROOT, outDir)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
