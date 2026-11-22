// 測試開瀏覽器一律走 tests/browser.mjs 的 launchGpu（WebGL 走顯示卡）。
//   ① 掃 tests/*.test.mjs 與它們用到的 tests/ 內腳本（測試檔裡寫到的腳本路徑——import、變數載入、子程序都算；那些腳本再照 import 跟到底），
//      程式碼裡出現啟動／連線瀏覽器的字樣就紅。例外要註記「// 不走顯示卡：<理由>」，寫在同一行尾端或上一整行；
//      測試以外的腳本那一行自己帶 d3d11 旗標也算過。認的是字樣、不是某一種寫法，換變數名、解構、中括號取用、換行都算。
//      註解或字串裡提到那幾個字被誤擋時，換個說法即可。
//   ② browser.mjs 只准有那一行啟動，逐字相同（要改旗標就連這裡一起改）。③ 判準與「跟到哪些檔」的正反例。
//   ④ launchGpu 開出來的頁面，WebGL 繪圖器不是 CPU 模擬（只在 Windows 驗：旗標是 D3D11）。
// 沒涵蓋：路徑或字樣用字串拼出來的、腳本再開子程序叫的腳本、playwright 以外的套件、直接執行瀏覽器程式。
// 環境：YAOSHI_PW_ROOT（含 node_modules/playwright）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF);
const HELPER = path.join(HERE, 'browser.mjs');
const rel = (p) => path.relative(HERE, p).split(path.sep).join('/');
const L = 'lau' + 'nch', C = 'con' + 'nect'; // 拆開寫：這支檔自己也在被掃的範圍內（檔名不帶副檔名也是同一個理由）
const TOKEN = new RegExp(String.raw`\b${L}(?:PersistentContext|Server)?\b|\b${C}OverCDP\b|\b(?:chromium|firefox|webkit)\.${C}\b`);
const NOTE = /\/\/\s*不走顯示卡[:：]\s*\S.{5,}$/;
const HELPER_LINE = `export const launchGpu = (chromium) => chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });`;
// 已知不帶旗標、但測試不會走到開瀏覽器的工具
const KNOWN = new Map([['tools/market-card-readability', 'tool-options 只測參數被拒，還沒開瀏覽器就結束']]);

function violations(src, isTest = true) {
  const lines = src.split(/\r?\n/);
  return lines.flatMap((l, i) => {
    if (!TOKEN.test(l) || /^\s*\/\//.test(l) || NOTE.test(l)) return [];
    const prev = lines[i - 1] || '';
    if (/^\s*\/\//.test(prev) && NOTE.test(prev)) return [];
    if (!isTest && /--use-angle=d3d11/.test(l)) return [];
    return [`${i + 1}: ${l.trim().slice(0, 120)}`];
  });
}

function closure() {
  const seen = new Set(), q = fs.readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(HERE, f));
  while (q.length) {
    const p = q.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    const src = fs.readFileSync(p, 'utf8');
    const names = p.endsWith('.test.mjs')
      ? src.split(/\r?\n/).flatMap((l) => l.replace(/(^|\s)\/\/.*$/, '').match(/[\w.@/-]+\.(?:mjs|cjs|js)\b/g) || [])
      : [...src.matchAll(/(?:from|import|require)\s*\(?\s*['"`](\.{1,2}\/[^'"`?]+\.(?:mjs|cjs|js))/g)].map((m) => m[1]);
    for (const n of names) {
      const t = [path.dirname(p), HERE, path.join(HERE, 'tools'), path.join(HERE, '..')].map((b) => path.resolve(b, n)).find((f) => f.startsWith(HERE + path.sep) && fs.existsSync(f));
      if (t) q.push(t);
    }
  }
  return [...seen];
}

test('測試開瀏覽器一律走 launchGpu，直接啟動要有理由註記', (t) => {
  const files = closure();
  const bad = files.filter((p) => p !== HELPER && !KNOWN.has(rel(p).replace(/\.\w+$/, '')))
    .flatMap((p) => violations(fs.readFileSync(p, 'utf8'), p.endsWith('.test.mjs')).map((v) => `${rel(p)}:${v}`)).sort();
  const tests = files.filter((p) => p.endsWith('.test.mjs') && p !== SELF).map((p) => [rel(p), fs.readFileSync(p, 'utf8')]);
  const users = tests.filter(([, s]) => /\blaunchGpu\(/.test(s)), noted = tests.filter(([, s]) => s.split(/\r?\n/).some((l) => NOTE.test(l)));
  t.diagnostic(`掃 ${files.length} 支檔，用 launchGpu 的測試 ${users.length} 支，有理由註記的 ${noted.length} 支：${noted.map(([f]) => f).join(' ')}`);
  assert.deepEqual(bad, [], `${bad.length} 處直接啟動瀏覽器又沒有理由註記：\n${bad.join('\n')}`);
  assert.ok(users.length > 0, '沒有任何測試在用 launchGpu，掃描沒行使到');
  // 跟檔的四條路各挑一支真檔：靜態 import、子程序的完整路徑、path.join 只寫檔名、變數載入
  const got = new Set(files.map((p) => rel(p).replace(/\.\w+$/, '')));
  for (const n of ['tools/appraise-c-lib', 'tools/curse-cam-probe', 'tools/scene-shot', 'tools/l1e-event-action-adapter']) assert.ok(got.has(n), `跟檔漏了 ${n}`);
});

test('browser.mjs 只有一行啟動，逐字相同', () => {
  const lines = fs.readFileSync(HELPER, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*\/\//.test(l));
  assert.deepEqual(lines, [HELPER_LINE], 'browser.mjs 的程式碼跟這裡記的不一樣（改旗標或加出口要連這條一起改）');
});

test('判準正反例', () => {
  const bad = [`const b = await chromium.${L}();`, `const b = await loadChromium().${L}({ args: [] });`, `const { ${L}: go } = chromium;`, `await chromium['${L}']();`,
    `await pw.chromium\n  .${L}({})`, `await chromium.${L}PersistentContext('x');`, `await chromium.${L}Server();`, `await chromium.${C}OverCDP('x');`, `await chromium.${C}('x');`,
    `const b = await chromium.${L}({ args: ['--use-angle=d3d11'] });`, // 測試檔裡自己帶旗標也不行：一律走共用函式
    `// 不走顯示卡：\nawait chromium.${L}();`, `// 不走顯示卡\nawait chromium.${L}();`, `// 不走顯示卡：xx\nawait chromium.${L}();`, `/* x */ await chromium.${L}();`,
    `// 不走顯示卡：理由寫在兩行之前\n\nawait chromium.${L}();`, `await a(); // 不走顯示卡：理由在上一行的行尾\nawait chromium.${L}();`];
  for (const s of bad) assert.equal(violations(s).length, 1, `該擋沒擋：${s}`);
  const ok = ['const browser = await launchGpu(chromium);', `// 說明：chromium.${L}() 會走 CPU`, `osc.${C}(gain);`,
    `// 不走顯示卡：只在 CPU 繪圖下才量得到\nawait chromium.${L}();`, `await chromium.${L}(); // 不走顯示卡：只在 CPU 繪圖下才量得到`];
  for (const s of ok) assert.deepEqual(violations(s), [], `不該擋卻擋：${s}`);
  assert.deepEqual(violations(`await chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11'] });`, false), [], '測試以外的腳本自己帶旗標應放行');
  assert.equal(violations(`await chromium.${L}();`, false).length, 1, '測試以外的腳本裸啟動應擋');
});

test('launchGpu 開的頁面，WebGL 不是 CPU 模擬', { skip: process.platform === 'win32' ? false : 'D3D11 只在 Windows' }, async (t) => {
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
