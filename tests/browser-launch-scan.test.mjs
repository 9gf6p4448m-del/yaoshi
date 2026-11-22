// 測試開瀏覽器一律走 tests/browser.mjs 的 launchGpu（WebGL 走顯示卡）。
//   ① 掃 tests/*.test.mjs 與它們載入的本地模組（相對路徑 import，一路跟到底）：程式碼裡出現啟動／連線瀏覽器的字樣就紅；
//      例外＝同一行或上一行註記「// 不走顯示卡：<理由>」（理由不得空白）。認的是字樣、不是某一種寫法，換變數名、解構、中括號取用、換行都算。
//   ② 這個判準本身的正反例。③ launchGpu 開出來的頁面，WebGL 繪圖器不是 CPU 模擬。
// 沒涵蓋：測試用子程序呼叫的工具（curse-cam-probe、hand-lot-pen、scene-shot；2026-11-23 查過都帶 d3d11）、字串拼出來的呼叫。
// 環境：YAOSHI_PW_ROOT（含 node_modules/playwright）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.join(HERE, 'browser.mjs');
const L = 'lau' + 'nch', C = 'con' + 'nect'; // 拆開寫：這支檔自己也在被掃的範圍內
const TOKEN = new RegExp(String.raw`\b(?:${L}(?:PersistentContext|Server)?|${C}(?:OverCDP)?)\b`);
const REASON = /\/\/.*不走顯示卡[:：]\s*\S{2,}/;

function violations(src) {
  const lines = src.split(/\r?\n/);
  return lines.flatMap((l, i) => (!TOKEN.test(l) || /^\s*\/\//.test(l) || REASON.test(l) || REASON.test(lines[i - 1] || '') ? [] : [`${i + 1}: ${l.trim().slice(0, 120)}`]));
}

function closure() {
  const seen = new Set(), q = fs.readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(HERE, f));
  while (q.length) {
    const p = q.pop();
    if (seen.has(p) || !fs.existsSync(p)) continue;
    seen.add(p);
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+\.mjs)['"]/g)) q.push(path.resolve(path.dirname(p), m[1]));
  }
  return [...seen];
}

test('測試開瀏覽器一律走 launchGpu，直接啟動要有理由註記', (t) => {
  const files = closure().filter((p) => p !== HELPER);
  const bad = files.flatMap((p) => violations(fs.readFileSync(p, 'utf8')).map((v) => `${path.relative(HERE, p).split(path.sep).join('/')}:${v}`)).sort();
  const users = files.filter((p) => p !== fileURLToPath(import.meta.url) && /\blaunchGpu\(/.test(fs.readFileSync(p, 'utf8')));
  t.diagnostic(`掃 ${files.length} 支檔，用 launchGpu 的 ${users.length} 支`);
  assert.deepEqual(bad, [], `${bad.length} 處直接啟動瀏覽器又沒有理由註記：\n${bad.join('\n')}`);
  assert.ok(users.length > 0, '沒有任何測試在用 launchGpu，掃描沒行使到');
});

test('判準正反例', () => {
  const bad = [`const b = await chromium.${L}();`, `const b = await loadChromium().${L}({ args: [] });`, `const { ${L}: go } = chromium;`, `await chromium['${L}']();`,
    `await pw.chromium\n  .${L}({})`, `await chromium.${L}PersistentContext('x');`, `await chromium.${L}Server();`, `await chromium.${C}OverCDP('x');`, `await chromium.${C}('x');`,
    `// 不走顯示卡：\nawait chromium.${L}();`, `// 不走顯示卡\nawait chromium.${L}();`, `/* x */ await chromium.${L}();`, `// 不走顯示卡：理由在兩行前\n\nawait chromium.${L}();`];
  for (const s of bad) assert.equal(violations(s).length, 1, `該擋沒擋：${s}`);
  const ok = ['const browser = await launchGpu(chromium);', `// 說明：chromium.${L}() 會走 CPU`, `// 不走顯示卡：只在 CPU 繪圖下才量得到\nawait chromium.${L}();`, `await chromium.${L}(); // 不走顯示卡：只在 CPU 繪圖下才量得到`];
  for (const s of ok) assert.deepEqual(violations(s), [], `不該擋卻擋：${s}`);
});

test('launchGpu 開的頁面，WebGL 不是 CPU 模擬', async (t) => {
  const cands = [path.join(HERE, '../tools/anyCreature/package.json'), ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  let pw; for (const c of cands) { try { pw = createRequire(c)('playwright'); break; } catch (e) { /* 下一個 */ } }
  assert.ok(pw, '找不到 playwright（設 YAOSHI_PW_ROOT）');
  const browser = await launchGpu(pw.chromium);
  try {
    const page = await browser.newPage();
    const r = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return g ? String(g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER)) : null; });
    t.diagnostic(`WebGL 繪圖器：${r}`);
    assert.ok(r, '頁面開不出 WebGL2');
    assert.doesNotMatch(r, /SwiftShader|llvmpipe|Basic Render/i, `WebGL 在 CPU 上模擬：${r}`);
  } finally { await browser.close(); }
});
