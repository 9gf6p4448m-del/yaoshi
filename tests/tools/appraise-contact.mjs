// v0.59.2 凍結 #9：改前／改後並排 contact sheet 用的原始截圖（鑑賞頁西/東籤各一、成交總覽、戰況）
// ＋鑑賞進場到返回的連續截圖（≥6 幀）。只負責拍照存檔，不判定；比對留給人眼／報告文字。
// 跑法：node tests/tools/appraise-contact.mjs [--tag head|base] [--port N] [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const TAG = arg('--tag', 'head');
const PORT = Number(arg('--port', 9851));
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-28-appraise-panels/contact')));
fs.mkdirSync(OUT, { recursive: true });
const IS_BASE = TAG === 'base';

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
/* --root：服務別的工作樹（例如基準 86e4676 的 base592），治具本身仍用本 repo 這一份 */
const SERVE = path.resolve(arg('--root', ROOT));
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SERVE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
if (!IS_BASE) await ctx.clock.install(); // 丙案：揭幕逐幀用假時鐘推進（時間照常流動，直到 pauseAt）
await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 30000 });
await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 90000 }).catch(() => {});
await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
await page.evaluate(() => startEntry('solo'));
await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
await page.waitForTimeout(80);
await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
const DRIVE_STEP = `(() => {
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;
async function driveTo(want, cap = 20000) {
  for (let i = 0; i < cap; i++) {
    await page.waitForTimeout(8);
    const cls = await page.evaluate(() => { const b = document.getElementById('mainbtn'); const t = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (/不盯任何一件/.test(t)) return 'mark'; if (/^蓋牌/.test(t) && !dis) return 'bid';
      if (/請神/.test(t)) return dis ? 'shrine-run' : (document.querySelector('.resultStrip .big') && /成交總覽/.test(document.querySelector('.resultStrip .big').textContent) ? 'reveal-result' : 'shrine');
      if (/^開戰/.test(t) && !dis) return 'reveal-result';
      if (/進入下一夜|看最終結果/.test(t) && !dis) return 'night-end';
      return 'busy'; });
    if (cls === want) return true;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return false;
  }
  return false;
}
await driveTo('bid');
await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(200);

if (!IS_BASE) {
  // 鑑賞頁：西籤
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
  const west = tabs.find((t) => t.rail === 'railW'), east = tabs.find((t) => t.rail === 'railE');
  // 丙案（09-29）：真的滑鼠點籤，假時鐘逐幀推進，拍燒符揭幕→照妖鏡浮現→穩定→點空白返回（凍結 #9 修訂：燒符揭幕連續 ≥6 幀）
  const tabAt = (t) => page.evaluate(([r, s]) => { const b = document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]'); const q = b.getBoundingClientRect(); return { x: (q.left + q.right) / 2, y: (q.top + q.bottom) / 2 }; }, [t.rail, t.slot]);
  const blank = () => page.evaluate(() => { const W = innerWidth, H = innerHeight; for (let fy = 0.92; fy > 0.1; fy -= 0.06) for (const fx of [0.5, 0.45, 0.55, 0.4, 0.6]) { const e = document.elementFromPoint(W * fx, H * fy); if (e && e.id === 'appraiseDim') return { x: W * fx, y: H * fy }; } return null; });
  const FR = [0, 80, 160, 260, 360, 460, 560, 660, 760, 860, 960, 1060];
  const shoot = async (t, name) => {
    for (const pad of [250, 800, 2000, 5000]) { const now = await page.evaluate(() => Date.now()); try { await page.clock.pauseAt(now + pad); break; } catch (e) { if (!/past/.test(e.message)) throw e; } }
    const c = await tabAt(t); await page.mouse.click(c.x, c.y);
    let last = 0;
    if (name === 'west') for (const [k, ms] of FR.entries()) { await page.clock.runFor(ms - last); last = ms; await page.screenshot({ path: path.join(OUT, `${TAG}-appraise-enter-f${String(k).padStart(2, '0')}-${ms}ms.png`) }); }
    await page.clock.runFor(1300 - last);
    await page.clock.resume(); await page.waitForTimeout(1200); // 題字淡入（CSS 真實時間）
    await page.screenshot({ path: path.join(OUT, `${TAG}-appraise-${name}.png`) });
    const b = await blank(); if (b) await page.mouse.click(b.x, b.y);
    await page.waitForTimeout(600);
    if (name === 'west') await page.screenshot({ path: path.join(OUT, `${TAG}-appraise-return.png`) });
  };
  await shoot(west, 'west');
  if (east) await shoot(east, 'east');
} else {
  // 基準 86e4676：開卡停靠（selectRailPage）西籤／東籤各一
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
  const west = tabs.find((t) => t.rail === 'railW'), east = tabs.find((t) => t.rail === 'railE');
  await page.evaluate(([r, s]) => selectRailPage(r, s), [west.rail, west.slot]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${TAG}-appraise-west.png`) });
  await page.evaluate(([r]) => closeRailCard(r), [west.rail]);
  await page.waitForTimeout(300);
  if (east) {
    await page.evaluate(([r, s]) => selectRailPage(r, s), [east.rail, east.slot]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${TAG}-appraise-east.png`) });
    await page.evaluate(([r]) => closeRailCard(r), [east.rail]);
    await page.waitForTimeout(300);
  }
}

// 成交總覽／戰況
await driveTo('reveal-result');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, `${TAG}-reveal-panel.png`) });
await driveTo('night-end');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, `${TAG}-nightend-panel.png`) });

await browser.close();
srv.kill();
console.log('寫入 contact 截圖到', OUT, 'tag=', TAG);
