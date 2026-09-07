/* 美術甲卷 A6（2026-09-07）：27 隻 lookdev 一次拍完（同一個瀏覽器逐隻換 ?glb=），給改色調映射前後
   做人眼對照。跑法：node tests/tools/art-a-lookdev.mjs <outdir> [--port=8980] [--phase=idle]
   為什麼不用 creature-shoot.mjs 逐隻叫：那支每次都重開一個 chromium，27 隻要開 27 次。
   這支共用一個瀏覽器與一個 http.server，只換網址。拍完用 tests/tools/art-a-sheet.py 拼 contact sheet。
   注意：它跑的是**本 repo 的** tests/tools/creature-preview.html 與 js/，要拍基準版就在基準版的
   worktree 裡跑這支（不是用 --root，preview 頁的 import 是相對路徑）。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUTDIR = path.resolve(pos[0] || path.join(ROOT, 'lookdev'));
const PORT = Number(opt.port || 8980);
const PHASE = opt.phase || 'idle';

// 27 隻＝assets/creatures/*.glb（與 duel-perf.mjs 的 ALL 同一份名單）
const ALL = ['ashcharm', 'balen', 'bell', 'boartusk', 'boat', 'bow', 'buoy', 'chair', 'eye', 'flag', 'fushou', 'guoyin', 'hairpin', 'nail',
  'pojun', 'raincoat', 'redhat', 'shanshen', 'shield', 'sigui', 'sword', 'thunder', 'tiger_c', 'wangchuan', 'wuying', 'xianji', 'yinyangcoin'];
// 系別只影響邊光顏色；照 index.html 的 POOL 分，量測用固定表就好（分錯只是邊光色不同，兩版一致即可）
const RIM = { ashcharm: 'yinqi', balen: 'zuli', bell: 'xianghu', boartusk: 'zuli', boat: 'yinqi', bow: 'zuli', buoy: 'yinqi',
  chair: 'yinqi', eye: 'yinqi', flag: 'xianghu', fushou: 'xianghu', guoyin: 'yinqi', hairpin: 'yinqi', nail: 'yinqi',
  pojun: 'xianghu', raincoat: 'yinqi', redhat: 'zuli', shanshen: 'zuli', shield: 'zuli', sigui: 'yinqi', sword: 'xianghu',
  thunder: 'xianghu', tiger_c: 'xianghu', wangchuan: 'yinqi', wuying: 'zuli', xianji: 'xianghu', yinyangcoin: 'xianghu' };

fs.mkdirSync(OUTDIR, { recursive: true });
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const out = [];
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  for (const ab of ALL) {
    const file = path.join(OUTDIR, ab + '.png');
    await page.goto(`http://127.0.0.1:${PORT}/tests/tools/creature-preview.html?auto=0&glb=${ab}.glb&light=1&fx=1&rim=${RIM[ab] || 'xianghu'}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__preview && window.__preview.ready, null, { timeout: 60000 });
    await page.evaluate(() => window.__preview.ready);
    await page.evaluate((p) => window.__preview.setPhase(p), PHASE);
    await page.waitForTimeout(1200);
    // 把預覽頁自己那行 HUD 藏掉（n=… 那串），contact sheet 上不要有字
    await page.evaluate(() => { document.querySelectorAll('body *').forEach((e) => { if (e.children.length === 0 && /^n=\d/.test(e.textContent || '')) e.style.display = 'none'; }); });
    await page.screenshot({ path: file });
    out.push(file);
  }
  await browser.close();
  console.log(JSON.stringify({ outdir: OUTDIR, shots: out.length, phase: PHASE, errors: errs.slice(0, 10), errorCount: errs.length }, null, 1));
  process.exit(errs.length === 0 ? 0 : 1);
} finally { srv.kill(); }
