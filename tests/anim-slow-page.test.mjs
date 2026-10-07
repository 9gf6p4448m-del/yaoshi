// v0.62.1 ?handslow／?grabslow 實頁斷言（http.server＋Playwright Chromium 開真的 index.html）：
//   載入後 CFG 的生效值（擺錢節拍、保險絲、GRAB_MS、CURSE_MS、卡片間隔）＝原值×k；3D 層讀到的 window.YS_ANIM_SLOW 同一份；
//   revealGlow 派出去的 ys:reveal-result 帶的 grabMs／curseMs＝生效值（3D 抓取／詛咒時間軸依它縮放，揭盅卡等待也由它推得）；
//   預設（無參數）handslow=1.5／grabslow=1.3、明確帶 1＝原字面值、非法值（0、abc、99、空字串）＝預設（v0.62.2）；每個網址完整載入 0 pageerror。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = 9741;
const BASE = { CHIP_SETTLE_MS: 7000, CHIP_SEAT_STAGGER_MS: 150, CHIP_TAIL_MS: 350, GRAB_MS: 1260, CURSE_MS: 2000, GRAB_CARD_GAP_MS: 90 };
const HANDK = ['CHIP_SETTLE_MS', 'CHIP_SEAT_STAGGER_MS', 'CHIP_TAIL_MS'], GRABK = ['GRAB_MS', 'CURSE_MS', 'GRAB_CARD_GAP_MS'];

test('?handslow／?grabslow：CFG 生效值＝原值×k、3D 讀同一份倍率、reveal-result 帶生效的 grabMs／curseMs；非法值＝1；0 pageerror', { timeout: 300000 }, async () => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const cases = [['', 1.5, 1.3], ['?handslow=1&grabslow=1', 1, 1], ['?handslow=2', 2, 1.3], ['?grabslow=2', 1.5, 2], ['?handslow=2&grabslow=1.5', 2, 1.5], ['?handslow=0&grabslow=0', 1.5, 1.3], ['?handslow=abc&grabslow=abc', 1.5, 1.3], ['?handslow=99&grabslow=99', 1.5, 1.3], ['?handslow=&grabslow=', 1.5, 1.3], ['?handslow=3', 3, 1.3]];
    for (const [q, kh, kg] of cases) {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
      await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`);
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
      await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
      const r = await page.evaluate(() => {
        const S = window.__yaoshi.S, P = S.players, it = S.market[0];
        let d = null; document.addEventListener('ys:reveal-result', (e) => { d = e.detail; }, { once: true });
        revealGlow({ it, winner: { p: P[1], amt: 9, intent: 'buy' }, entries: [{ p: P[1], amt: 9 }, { p: P[3], amt: 5 }] });
        const c = {}; for (const k of ['CHIP_SETTLE_MS', 'CHIP_SEAT_STAGGER_MS', 'CHIP_TAIL_MS', 'GRAB_MS', 'CURSE_MS', 'GRAB_CARD_GAP_MS']) c[k] = CFG[k];
        return { c, slow: window.YS_ANIM_SLOW, grabMs: d && d.grabMs, curseMs: d && d.curseMs };
      });
      await page.waitForTimeout(500);
      await ctx.close();
      const tag = q || '無參數';
      assert.deepEqual(errs, [], `${tag} 應 0 pageerror`);
      assert.deepEqual(r.slow, { hand: kh, grab: kg }, `${tag} 倍率`);
      for (const k of HANDK) assert.equal(r.c[k], Math.round(BASE[k] * kh), `${tag} ${k}`);
      for (const k of GRABK) assert.equal(r.c[k], Math.round(BASE[k] * kg), `${tag} ${k}`);
      assert.equal(r.grabMs, r.c.GRAB_MS, `${tag} reveal-result.grabMs`);
      assert.equal(r.curseMs, r.c.CURSE_MS, `${tag} reveal-result.curseMs`);
    }
  } finally { await browser.close(); srv.kill(); }
});
