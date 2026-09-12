/* 在【產品頁面】上量開關（`02 §6.1` 第 5 條：驗在對方的接收端）。
 *
 * 為什麼需要這一支：treitfx-preview 治具頁是**直接 import** js/trait-fx.js，走的是 `location.search`
 * 那條退路；產品頁走的是另一條——index.html 把 PW_FX.VOCAB_ON 接在 renderer.js 的模組查詢字串上、
 * 各模組用 import.meta.url 接力傳給 trait-fx.js。治具全綠證明不了產品那條路通。
 *
 * 量法：開 index.html，從 DOM 撈出 renderer.js 的真實 src（連查詢字串），把同一組查詢字串接到
 * trait-fx.js 上再 import 一次——模組快取鍵就是網址，所以拿到的**就是頁面正在用的那一份實例**。
 * 判準（行為，不是字串）：v0.55 的四支示範招 `SHORT[trId] === MOVES[trId]`（短版是完整版的別名，
 * 同一支函式吃 BEAT 比例表）；v0.54 的短版是另寫的一支函式 ⇒ 兩者不相等。
 *
 * 跑法：node docs/experiments/2026-09-12-fxvocab-switch-evidence/page-vocab-probe.mjs [--port=8877]
 * 出口碼：兩種狀態都符合預期 → 0，否則 1。
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const TRAITS = ['eliteSelfCut', 'biteGamble', 'wardImmuneLost', 'hauntLost'];

async function probe(browser, base, query) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${base}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('script[type=module]')).some((s) => /renderer\.js/.test(s.src)), null, { timeout: 30000 });
  const r = await page.evaluate(async (traits) => {
    const src = Array.from(document.querySelectorAll('script[type=module]')).map((s) => s.src).find((u) => /renderer\.js/.test(u));
    const m = await import(src.replace('renderer.js', 'trait-fx.js'));
    const alias = {};
    traits.forEach((t) => { alias[t] = m.TRAIT_MOVES_SHORT[t] === m.TRAIT_MOVES[t]; });
    return { rendererSrc: new URL(src).search, vocabOn: m.FX_VOCAB_ON, moveCount: Object.keys(m.TRAIT_MOVES).length, shortAliasOfFull: alias };
  }, TRAITS);
  await ctx.close();
  return Object.assign(r, { query, errors });
}

const { opt } = parseArgs(process.argv.slice(2));
const port = parseInt(opt.port || '8877', 10);
const srv = await serve(ROOT, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let bad = 0;
try {
  for (const [q, want] of [['', false], ['?fxvocab=0', false], ['?fxvocab=1', true]]) {
    const r = await probe(browser, `http://127.0.0.1:${port}`, q);
    // 0.55（開）＝四支的短版都是完整版的別名；0.54（關）＝四支都不是
    const aliasOK = TRAITS.every((t) => r.shortAliasOfFull[t] === want);
    const ok = r.vocabOn === want && aliasOK && r.moveCount === 30 && r.errors.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} index.html${q || '（不帶參數）'}  renderer${r.rendererSrc}  FX_VOCAB_ON=${r.vocabOn}（預期 ${want}） ` +
      `招數=${r.moveCount} 短版即完整版=${JSON.stringify(r.shortAliasOfFull)} err=${r.errors.length}`);
    r.errors.slice(0, 3).forEach((e) => console.log('   ! ' + e.slice(0, 200)));
  }
} finally { await browser.close(); srv.kill(); }
console.log(`\n${bad ? bad + ' 組不符預期' : '三組全部符合預期'}`);
process.exit(bad ? 1 : 0);
