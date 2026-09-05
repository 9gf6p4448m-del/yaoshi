// R-4：n≤2 的站位在治具頁（固定時鐘、無撞擊）逐尊比對 fae1eec 與 HEAD
import { spawn } from 'node:child_process'; import path from 'node:path'; import { createRequire } from 'node:module';
const ROOT = 'C:/Users/shung/OneDrive/桌面/妖市';
const WT = 'C:/Users/shung/AppData/Local/Temp/claude/C--Users-shung/a574cc02-369d-476d-be7d-e8afa377240a/scratchpad/wt033';
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json')); const { chromium } = req('playwright');
const cases = [['1v1', 1, 'sword:elite:xianghuo:1'], ['2v2', 2, 'boat:swarm:zuling:1,sword:elite:xianghuo:1'], ['2v1', 2, 'sword:elite:xianghuo:1'], ['1v2', 1, 'boat:swarm:zuling:2']];
async function serve(root, port) { const s = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 900)); return s; }
// 治具頁沒把 duelFigures 掛到 window：改用 stepA 後的 snapshot 差（同一頁兩根不同 root 比不了）→ 直接在頁內讀 figs 的 group.position
async function positions(root, port, count, foe) {
  const srv = await serve(root, port); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const p = await b.newPage({ viewport: { width: 720, height: 405 } });
    await p.goto(`http://127.0.0.1:${port}/tests/tools/traitfx-preview.html?trait=eliteOpenShot&ab=bow&body=elite&fac=zuling&count=${count}&foe=${foe}&bloom=0`);
    await p.waitForFunction(() => !!window.__tfx); await p.evaluate(() => window.__tfx.ready);
    await p.evaluate(() => window.__tfx.stepA(30));
    return await p.evaluate(() => window.__tfx.positions ? window.__tfx.positions() : null);
  } finally { await b.close(); srv.kill(); }
}
for (const [tag, count, foe] of cases) {
  const a = await positions(WT, 8951, count, foe); const c = await positions(ROOT, 8952, count, foe);
  if (!a || !c) { console.log(tag, 'positions() 不存在', !!a, !!c); continue; }
  let m = 0; a.forEach((p, i) => { const q = c[i]; if (q) m = Math.max(m, Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z)); });
  console.log(tag, 'n', a.length, c.length, 'maxΔ', m.toFixed(5));
}
