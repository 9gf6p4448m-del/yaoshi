// v0.65.9 H1 補量：(a) 提示 #h1hint 與桌上裝飾道具（table-props 群組內每個 mesh 的螢幕外框）的交集面積；
// (b) 鑑賞卷軸「有／無 .asc-act」的鏡子半徑 appraiseLayout().r 與 .asc 高度。純量測，不改狀態。
// 用法：node tests/tools/h1-hint-props-probe.mjs [--root <served root>] [--out <json>]
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { driveToFirst, openGame, waitTrayReady, scr } from './appraise-c-lib.mjs';
const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', HERE)); const OUT = arg('--out', 'D:/yaoshi-out/h1-guide/probe.json'); const PORT = 9771;
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const VPS = { A: { w: 844, h: 390, safe: [0, 0, 0, 0] }, B: { w: 667, h: 375, safe: [0, 0, 0, 0] }, C: { w: 932, h: 430, safe: [0, 0, 0, 0] } };
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const PROPS = async () => {
  const THREE = await import('three'); const Y = window.__yaoshi3d; const g = Y.scene.getObjectByName('table-props'); if (!g) return { err: 'no table-props' };
  const W = innerWidth, H = innerHeight, out = [];
  g.updateMatrixWorld(true);
  g.traverse((o) => { if (!(o.isMesh || o.isInstancedMesh) || !o.visible) return; let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (!v) return;
    const box = new THREE.Box3().setFromObject(o); if (box.isEmpty()) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const t = new THREE.Vector3();
    for (let i = 0; i < 8; i++) { t.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(Y.camera); const px = (t.x * .5 + .5) * W, py = (1 - (t.y * .5 + .5)) * H; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const parent = o.parent && o.parent.name; out.push({ name: o.name || parent || o.type, l: x0, t: y0, r: x1, b: y1 }); });
  const h = document.getElementById('h1hint').getBoundingClientRect();
  const hits = out.map((b) => ({ name: b.name, area: Math.max(0, Math.min(h.right, b.r) - Math.max(h.left, b.l)) * Math.max(0, Math.min(h.bottom, b.b) - Math.max(h.top, b.t)) })).filter((x) => x.area > 0);
  return { n: out.length, hint: { l: h.left, t: h.top, r: h.right, b: h.bottom }, hits };
};
const res = {};
try {
  for (const [k, vp] of Object.entries(VPS)) {
    res[k] = {};
    for (const phase of ['mark', 'bid']) {
      const { ctx, page } = await openGame(browser, PORT, vp, 'solo', 3, { clock: false, destiny: ['water', 'eyes', 'twinTiger', 'godKing'] });
      try {
        if (phase === 'bid') { await driveToFirst(page, new Set(['mark']), 6000); await page.evaluate(() => pickMark(null)); for (let i = 0; i < 200 && (await scr(page)) !== 'bid'; i++) await page.waitForTimeout(20); await page.waitForTimeout(600); }
        else await driveToFirst(page, new Set(['mark']), 6000);
        await waitTrayReady(page); await page.waitForTimeout(500);
        const props = await page.evaluate(PROPS);
        const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
        const mir = [];
        for (const t of tabs) {
          await page.evaluate(([r, s]) => railTabClick(r, s), [t.rail, t.slot]); await page.waitForTimeout(2200);
          mir.push({ ...t, ...(await page.evaluate(() => {
            const el = document.querySelector('.asc'); if (!el) return { err: 'no asc' };
            const act = el.querySelector('.asc-act'); const m = () => ({ r: appraiseLayout().r, ascH: el.getBoundingClientRect().height, cls: el.className });
            const withAct = m(); let without = null;
            if (act) { act.style.setProperty('display', 'none', 'important'); appraiseFitScroll(); without = m(); act.style.removeProperty('display'); appraiseFitScroll(); }
            return { withAct, without, actInTags: !!(act && act.parentElement.classList.contains('asc-tags')) };
          })) });
        }
        res[k][phase] = { props, mir };
      } finally { await ctx.close().catch(() => {}); }
    }
  }
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
