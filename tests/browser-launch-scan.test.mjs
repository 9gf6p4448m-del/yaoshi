// 測試開瀏覽器一律走 tests/browser.mjs 的 launchGpu（WebGL 走顯示卡）。
//   ① 掃 tests/*.test.mjs 與它們用到的 tests/、tools/ 內腳本，程式碼裡出現啟動／連線瀏覽器的字樣就紅。認的是字樣、不是某一種寫法。
//      例外：測試檔註記「// 不走顯示卡：<理由>」（同一行尾端，或上一整行）；測試以外的腳本，啟動那一行的參數裡自己帶 d3d11。
//      跟檔：測試檔裡任何寫到的腳本路徑都跟（import、變數載入、子程序、只寫檔名都算）；其他腳本只跟含 import／from／require／new URL 的那幾行。
//      註解以外的文字（字串、區塊註解）提到那幾個字被誤擋時，換個說法即可。
//   ② browser.mjs 只准有那一行啟動，逐字相同（要改旗標就連這裡一起改）。③ 判準正反例 ④ 跟檔正反例（治具樹）。
//   ⑤ launchGpu 開出來的頁面，WebGL 繪圖器不是 CPU 模擬（只在 Windows 驗：旗標是 D3D11）。
// 沒涵蓋：字串拼出來的路徑、省略副檔名的 require、測試以外的腳本把路徑寫在別行或再開子程序叫的腳本、playwright 以外的套件、直接執行瀏覽器程式。
// 環境：YAOSHI_PW_ROOT（含 node_modules/playwright）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF), ROOT = path.join(HERE, '..');
const HELPER = path.join(HERE, 'browser.mjs');
const rel = (p, root = ROOT) => path.relative(path.join(root, 'tests'), p).split(path.sep).join('/');
const noExt = (s) => s.replace(/\.\w+$/, '');
const L = 'lau' + 'nch', C = 'con' + 'nect'; // 拆開寫：這支檔自己也在被掃的範圍內
const TOKEN = new RegExp(String.raw`\b${L}(?:PersistentContext|Server)?\b|\b${C}OverCDP\b|\b(?:chromium|firefox|webkit)\.${C}\b`);
const TOOL_GPU = new RegExp(String.raw`\.${L}\(\{\s*args:\s*\[[^\]]*'--use-angle=d3d11'[^\]]*\]\s*\}\)`);
const NOTE = /\/\/\s*不走顯示卡[:：]\s*\S.{5,}$/;
const HELPER_LINE = `export const launchGpu = (chromium) => chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });`;
// 不帶旗標、但只有右邊那支測試提到，而且它只測「參數被拒」、沒走到開瀏覽器
const KNOWN = new Map([['tools/market-card-readability', 'tool-options.test.mjs']]);

function violations(src, isTest = true) {
  const lines = src.split(/\r?\n/).map((l) => l.trimEnd());
  return lines.flatMap((l, i) => {
    if (!TOKEN.test(l) || /^\s*\/\//.test(l)) return [];
    if (isTest ? NOTE.test(l) || (/^\s*\/\//.test(lines[i - 1] || '') && NOTE.test(lines[i - 1])) : TOOL_GPU.test(l) && !/'--disable-gpu'/.test(l)) return [];
    return [`${i + 1}: ${l.trim().slice(0, 120)}`];
  });
}

/** 測試檔與它們用到的腳本 → Map<檔, 提到它的檔（相對 tests/）>。 */
function closure(root = ROOT) {
  const T = path.join(root, 'tests');
  const inScope = (f) => [T, path.join(root, 'tools')].some((d) => f.startsWith(d + path.sep)) && !f.includes(`${path.sep}node_modules${path.sep}`) && fs.existsSync(f);
  const byName = new Map();
  for (const f of fs.readdirSync(T, { recursive: true })) if (/\.(?:mjs|cjs|js)$/.test(f)) byName.set(path.basename(f), [...(byName.get(path.basename(f)) || []), path.join(T, f)]);
  const q = fs.readdirSync(T).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(T, f)), refs = new Map(q.map((p) => [p, new Set()]));
  while (q.length) {
    const p = q.pop();
    for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const code = l.replace(/(^|\s)\/\/.*$/, '');
      if (!p.endsWith('.test.mjs') && !/\b(?:import|require|createRequire|new URL)\b|\bfrom\s*['"`]/.test(code)) continue;
      for (const m of code.match(/[\w.@/-]+\.(?:mjs|cjs|js)\b/g) || []) {
        const n = m.replace(/^\/+/, '');
        const hit = [path.dirname(p), T, path.join(T, 'tools'), root].map((b) => path.resolve(b, n)).find(inScope);
        for (const t of hit ? [hit] : n.includes('/') ? [] : byName.get(n) || []) {
          if (!refs.has(t)) { refs.set(t, new Set()); q.push(t); }
          refs.get(t).add(rel(p, root));
        }
      }
    }
  }
  return refs;
}

test('測試開瀏覽器一律走 launchGpu，直接啟動要有理由註記', (t) => {
  const refs = closure(), files = [...refs.keys()];
  const known = (p) => KNOWN.has(noExt(rel(p))) && [...refs.get(p)].every((r) => r === KNOWN.get(noExt(rel(p))));
  const bad = files.filter((p) => p !== HELPER && !known(p))
    .flatMap((p) => violations(fs.readFileSync(p, 'utf8'), p.endsWith('.test.mjs')).map((v) => `${rel(p)}:${v}`)).sort();
  const tests = files.filter((p) => p.endsWith('.test.mjs') && p !== SELF).map((p) => [rel(p), fs.readFileSync(p, 'utf8')]);
  const users = tests.filter(([, s]) => /\blaunchGpu\(/.test(s)), noted = tests.filter(([, s]) => s.split(/\r?\n/).some((l) => NOTE.test(l)));
  t.diagnostic(`掃 ${files.length} 支檔，用 launchGpu 的測試 ${users.length} 支，有理由註記的 ${noted.length} 支：${noted.map(([f]) => f).join(' ')}`);
  assert.deepEqual(bad, [], `${bad.length} 處直接啟動瀏覽器又沒有理由註記：\n${bad.join('\n')}`);
  assert.ok(users.length > 0, '沒有任何測試在用 launchGpu，掃描沒行使到');
  const got = new Set(files.map((p) => noExt(rel(p)))); // 真樹抽查：靜態 import、子程序、只寫檔名、變數載入、第二跳 import、第二跳 pathToFileURL
  for (const n of ['tools/appraise-c-lib', 'tools/curse-cam-probe', 'tools/scene-shot', 'tools/l1e-event-action-adapter', 'tools/duel-drive', 'tools/grab-probe']) assert.ok(got.has(n), `跟檔漏了 ${n}`);
});

test('browser.mjs 只有一行啟動，逐字相同', () => {
  const lines = fs.readFileSync(HELPER, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*\/\//.test(l));
  assert.deepEqual(lines, [HELPER_LINE], 'browser.mjs 的程式碼跟這裡記的不一樣（改旗標或加出口要連這條一起改）');
});

test('判準正反例', () => {
  const bad = [`const b = await chromium.${L}();`, `const b = await loadChromium().${L}({ args: [] });`, `const { ${L}: go } = chromium;`, `await chromium['${L}']();`,
    `await pw.chromium\n  .${L}({})`, `await chromium.${L}PersistentContext('x');`, `await chromium.${L}Server();`, `await chromium.${C}OverCDP('x');`, `await chromium.${C}('x');`,
    `const b = await chromium.${L}({ args: ['--use-angle=d3d11'] });`, // 測試檔裡自己帶旗標也不行：一律走共用函式
    `// 不走顯示卡：\nawait chromium.${L}();`, `// 不走顯示卡\nawait chromium.${L}();`, `// 不走顯示卡：xx        \nawait chromium.${L}();`, `/* x */ await chromium.${L}();`,
    `// 不走顯示卡：理由寫在兩行之前\n\nawait chromium.${L}();`, `await a(); // 不走顯示卡：理由在上一行的行尾\nawait chromium.${L}();`];
  for (const s of bad) assert.equal(violations(s).length, 1, `該擋沒擋：${s}`);
  const ok = ['const browser = await launchGpu(chromium);', `// 說明：chromium.${L}() 會走 CPU`, `osc.${C}(gain);`,
    `// 不走顯示卡：只在 CPU 繪圖下才量得到\nawait chromium.${L}();`, `await chromium.${L}(); // 不走顯示卡：只在 CPU 繪圖下才量得到`];
  for (const s of ok) assert.deepEqual(violations(s), [], `不該擋卻擋：${s}`);
  const toolBad = [`await chromium.${L}();`, `await chromium.${L}(); // 原本帶 '--use-angle=d3d11'`, `await chromium.${L}(cond ? { args: ['--use-angle=d3d11'] } : {});`,
    `await chromium.${L}({ args: ['--use-angle=d3d11', '--disable-gpu'] });`, `// 不走顯示卡：工具檔不認這種註記\nawait chromium.${L}();`];
  for (const s of toolBad) assert.equal(violations(s, false).length, 1, `工具檔該擋沒擋：${s}`);
  for (const s of [`await chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11', '--disable-gpu-vsync'] });`, `const b=await chromium.${L}({args:['--use-angle=d3d11']});`]) assert.deepEqual(violations(s, false), [], `工具檔不該擋卻擋：${s}`);
});

test('跟檔正反例', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaoshi-scan-'));
  try {
    const put = (f, s) => { const p = path.join(dir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
    const yes = ['tests/zz-static.mjs', 'tests/tools/zz-var.mjs', 'tests/tools/zz-furl.mjs', 'tests/zz-plain.js', 'tests/zz-query.mjs', 'tests/zz-tick.mjs', 'tests/zz-url.mjs', 'tests/zz-req.cjs',
      'tests/tools/zz-spawn.mjs', 'tests/tools/zz-slash.mjs', 'tests/tools/sub/zz-deep.mjs', 'tools/zz-out.mjs', 'tests/zz-hop2.mjs', 'tests/tools/zz-hop2b.mjs'];
    const no = ['tests/tools/zz-comment.mjs', 'tests/tools/zz-usage.mjs', 'tools/node_modules/zz-dep.mjs', 'js/zz-product.js'];
    for (const f of [...yes, ...no]) put(f, '');
    put('tests/zz-a.test.mjs', ["import './zz-static.mjs';", "const v = './tools/zz-var.mjs';", 'await import(v);', "await import(pathToFileURL(path.join(ROOT, 'tests/tools/zz-furl.mjs')).href);",
      "import './zz-plain.js';", "await import('./zz-query.mjs?v=1');", 'await import(`./zz-tick.mjs`);', "new URL('./zz-url.mjs', import.meta.url);", "createRequire(import.meta.url)('./zz-req.cjs');",
      'spawn(process.execPath, [`${ROOT}/tests/tools/zz-spawn.mjs`]);', "spawn(process.execPath, [HERE + '/tools/zz-slash.mjs']);", "spawn(process.execPath, [path.join(HERE, 'tools', 'sub', 'zz-deep.mjs')]);",
      "import '../tools/zz-out.mjs';", '// 說明：另見 ./tools/zz-comment.mjs', "import '../tools/node_modules/zz-dep.mjs';", "import '../js/zz-product.js';"].join('\n'));
    put('tests/zz-static.mjs', ["export * from './zz-hop2.mjs';", "await import(pathToFileURL(path.join(HERE, 'tools/zz-hop2b.mjs')).href);", "const usage = 'node tests/tools/zz-usage.mjs';"].join('\n'));
    const got = [...closure(dir).keys()].map((p) => path.relative(dir, p).split(path.sep).join('/')).sort();
    assert.deepEqual(got, ['tests/zz-a.test.mjs', ...yes].sort());
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('launchGpu 開的頁面，WebGL 不是 CPU 模擬', { skip: process.platform === 'win32' ? false : 'D3D11 只在 Windows' }, async (t) => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
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
