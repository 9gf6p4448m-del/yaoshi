/* Tier 3 的黑條 letterbox 與 CINEMA 機位「只在 tier 3 出現」的機械斷言（v0.54，凍結檔 F5 機械段）。
 * 用法：node tests/tools/lbox-probe.mjs <out.json> [--port=9552] [--root=<靜態根>]
 *
 * 三件事一起驗（正反都要，02 §6.1 第 1 條）：
 *   L1 反面（tier 1／2 一個 CINEMA 幀都不該有）：派 tier 1 與 tier 2 的 ys:fx-trait，
 *      逐幀取樣 director.cinemaOn()，全程必須 false。
 *   L2 正面（tier 3 真的會出現）：派 tier 3 的 ys:fx-trait，cinemaOn() 必須在 ms 內為 true，
 *      並在 ms+outMs 之後回到 false（不會卡住）。
 *   L3 黑條 DOM：pwLetterbox(true) 之後 #lbTop／#lbBot 的實際高度 >0，
 *      pwLetterbox(false) 之後回到 0；正式頁面初始狀態必須是 0（沒人開就不存在）。
 *
 * 為什麼不靠真實對局：一局裡有沒有 tier 3 取決於袋子裡有沒有三尊，逼不出來；
 * 真實對局那一半由 duel-drive 的 FXC.tiers 與 MutationObserver 覆蓋（見報告 F5）。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, LETTERBOX_IDS } from './fx-consts.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright');
})();

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else pos.push(a); }
const out = pos[0] || path.join(ROOT, 'scratchpad', 'lbox-probe.json');
const port = Number(opt.port || 9552);
const root = opt.root ? path.resolve(opt.root) : ROOT;

const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const res = {};
try {
  await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window.__yaoshi3d && window.__yaoshi3d.director), null, { timeout: 30000 });

  // L3：黑條 DOM 的初始狀態與開關能力
  res.L3 = await page.evaluate((ids) => {
    const h = () => ids.map((id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().height : -1; });
    const before = h();
    window.__yaoshi.pwLetterbox(true);
    const onCls = ids.map((id) => document.getElementById(id).classList.contains('on'));
    window.__yaoshi.pwLetterbox(false);
    const offCls = ids.map((id) => document.getElementById(id).classList.contains('on'));
    return { before, onCls, offCls, exists: ids.every((id) => !!document.getElementById(id)) };
  }, LETTERBOX_IDS);
  // CSS transition 要時間才長出來：開著等 400ms 再量真實高度
  res.L3.onHeight = await page.evaluate(async (ids) => {
    window.__yaoshi.pwLetterbox(true);
    await new Promise((r) => setTimeout(r, 400));
    const v = ids.map((id) => document.getElementById(id).getBoundingClientRect().height);
    window.__yaoshi.pwLetterbox(false);
    await new Promise((r) => setTimeout(r, 400));
    const back = ids.map((id) => document.getElementById(id).getBoundingClientRect().height);
    return { open: v, back };
  }, LETTERBOX_IDS);

  /* L4：黑條是 DOM，不得增加 draw call（凍結檔 F6）。
     ★為什麼不比「新版 vs 基準」的 duel-perf 數字★：那個量測在**基準自己身上**就會在
     926～960 之間跳（實測 base 926／960／926，new 924／964／962／960，兩組分布重疊），
     波動來源是每局袋子不同→場上妖的種類不同→mesh 數不同，屬於輸入資料的自然波動。
     用它判「有沒有 +1」沒有鑑別力。改成**同一頁面、同一場景、同一幀**只切黑條：
     開與關的 renderer.info.render.calls 必須逐值相同——這才是決定性的對照。 */
  res.L4 = await page.evaluate(async () => {
    const R = window.__yaoshi3d.renderer;
    const frame = () => new Promise((r) => requestAnimationFrame(() => r({ calls: R.info.render.calls, tris: R.info.render.triangles })));
    window.__yaoshi.pwLetterbox(false);
    await frame(); const off = await frame();
    window.__yaoshi.pwLetterbox(true);
    await frame(); const on = await frame();
    window.__yaoshi.pwLetterbox(false);
    await frame(); const off2 = await frame();
    return { off, on, off2 };
  });

  // L1／L2：對每個 tier 派一次 ys:fx-trait，逐幀取樣 cinemaOn()
  const probe = async (tier, ms) => page.evaluate(async ({ tier, ms, base }) => {
    const D = window.__yaoshi3d.director;
    const samples = [];
    document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId: 'probe', side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier, baseMs: base, handled: false, done: null } }));
    const t0 = performance.now();
    // 取樣到 ms + 600（涵蓋 CINEMA 的 outMs 320 ＋ 餘裕），每 ~16ms 一筆
    while (performance.now() - t0 < ms + 600) {
      samples.push({ t: Math.round(performance.now() - t0), on: !!D.cinemaOn(), k: +D.cinemaK().toFixed(3) });
      await new Promise((r) => requestAnimationFrame(r));
    }
    return samples;
  }, { tier, ms, base: TIER_BASE_MS });

  for (const tier of [1, 2, 3]) {
    const ms = msOf(tier);
    const s = await probe(tier, ms);
    const onCount = s.filter((x) => x.on).length;
    const maxK = Math.max(0, ...s.map((x) => x.k));
    const during = s.filter((x) => x.t <= ms);
    const tail = s.filter((x) => x.t > ms + 400);
    res['tier' + tier] = {
      ms, samples: s.length, onCount, maxK,
      onDuring: during.filter((x) => x.on).length,
      onAtTail: tail.filter((x) => x.on).length,
    };
    await page.waitForTimeout(500); // 讓上一次完全收乾淨再測下一個
  }
} finally {
  await ctx.close();
  await browser.close();
  srv.kill();
}

// 判定
const v = {
  // L1：tier 1／2 期間 CINEMA 一幀都不准出現（凍結檔 F5「CINEMA 僅 tier 3」）
  L1: res.tier1.onCount === 0 && res.tier2.onCount === 0,
  // L2：tier 3 期間必須真的出現（正面），而且結束後會收乾淨（不卡住）
  L2: res.tier3.onDuring > 0 && res.tier3.maxK > 0.9 && res.tier3.onAtTail === 0,
  // L3：黑條初始高度 0、開了之後 >0、關了回到 0
  L3: res.L3.exists && res.L3.before.every((h) => h === 0)
    && res.L3.onHeight.open.every((h) => h > 0) && res.L3.onHeight.back.every((h) => h === 0),
  // L4：黑條開關不得動到 draw call／三角形數（它是 DOM，不進 renderer）
  L4: res.L4.on.calls === res.L4.off.calls && res.L4.on.calls === res.L4.off2.calls
    && res.L4.on.tris === res.L4.off.tris,
  errors: errors.length,
};
v.PASS = v.L1 && v.L2 && v.L3 && v.L4 && errors.length === 0;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ verdict: v, res, errors }, null, 1));
console.log(JSON.stringify({ verdict: v, tier1: res.tier1, tier2: res.tier2, tier3: res.tier3, lbox: res.L3, draws: res.L4 }));
console.log(`VERDICT L1=${v.L1 ? 'PASS' : 'FAIL'} L2=${v.L2 ? 'PASS' : 'FAIL'} L3=${v.L3 ? 'PASS' : 'FAIL'} L4=${v.L4 ? 'PASS' : 'FAIL'} err=${errors.length} → ${v.PASS ? 'PASS' : 'FAIL'}`);
process.exit(v.PASS ? 0 : 1);
