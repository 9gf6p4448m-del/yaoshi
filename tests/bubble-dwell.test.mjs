// v0.65.3 對白泡放慢（試玩回饋「對白出現的很快，都看不清楚」）實頁斷言（http.server＋Playwright Chromium 開真的 index.html）：
//   A 停留＝SKIP?300:clamp(1800+250*字數,3500,6500)ms（8 字＝3800：t=3700 仍 show、t=3900 已收；1 字＝3500、30 字＝6500；SKIP＝300）
//   B 同席連說兩句：舊計時器取消，第二句在舊計時器到期後（t=2.4s）仍 show 且是第二句文字
//   C renderSeats() 後未到期的泡仍 show 且文字相同（重畫後仍在）；到期後重畫不補回
//   D 字級 ≥14px；西／東泡可換行；844x390 橫式三席（北西東）長句泡的 getBoundingClientRect 都在視窗內（並截圖）
// 基準對照：YAOSHI_RENDER_ROOT=<舊版 worktree> 可對舊版 index.html 跑同一份測試。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = 9747;
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}

async function withPage(fn) {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console:' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.waitForTimeout(1500);
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

test('A 停留時長：8 字＝3800ms（3700 仍在、3900 已收）、1 字＝3500、30 字＝6500、SKIP＝300', { timeout: 120000 }, async () => {
  await withPage(async (page, errs) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      SKIP = false;
      const cases = [[1, '八個字的句子啊啊'], [2, '短'], [3, '長'.repeat(30)]];
      const out = {};
      const t0 = performance.now();
      cases.forEach(([id, txt]) => {
        const b = document.getElementById('bub' + id);
        b.classList.remove('show');
        const o = new MutationObserver(() => { if (!b.classList.contains('show') && out[id].gone == null) out[id].gone = performance.now() - t0; });
        out[id] = { len: Array.from(txt).length, gone: null, at3700: null, at3900: null };
        o.observe(b, { attributes: true, attributeFilter: ['class'] });
        say(id, txt);
      });
      setTimeout(() => { cases.forEach(([id]) => { out[id].at3700 = document.getElementById('bub' + id).classList.contains('show'); }); }, 3700);
      setTimeout(() => { cases.forEach(([id]) => { out[id].at3900 = document.getElementById('bub' + id).classList.contains('show'); }); }, 3900);
      setTimeout(() => resolve(out), 7300);
    }));
    console.log('A', JSON.stringify(r));
    const near = (v, want) => v != null && v >= want - 60 && v <= want + 250;
    assert.equal(r[1].len, 8);
    assert.ok(near(r[1].gone, 3800), `8 字應 ~3800ms 後收，實際 ${r[1].gone}`);
    assert.equal(r[1].at3700, true, '8 字 t=3700 應仍在');
    assert.equal(r[1].at3900, false, '8 字 t=3900 應已收');
    assert.ok(near(r[2].gone, 3500), `1 字應 ~3500ms 後收，實際 ${r[2].gone}`);
    assert.ok(near(r[3].gone, 6500), `30 字應 ~6500ms 後收，實際 ${r[3].gone}`);
    const sk = await page.evaluate(() => new Promise((resolve) => {
      SKIP = true; const t0 = performance.now(); const b = document.getElementById('bub1');
      say(1, '跳過時很快'); const was = b.classList.contains('show');
      const iv = setInterval(() => { if (!b.classList.contains('show')) { clearInterval(iv); SKIP = false; resolve({ was, ms: performance.now() - t0 }); } }, 10);
    }));
    console.log('A-SKIP', JSON.stringify(sk));
    assert.equal(sk.was, true); assert.ok(sk.ms >= 250 && sk.ms <= 600, `SKIP 應 ~300ms，實際 ${sk.ms}`);
    assert.deepEqual(errs, []);
  });
});

test('B 同席連說：舊計時器取消，第二句在舊計時器到期後（t=2.4s）仍在', { timeout: 60000 }, async () => {
  await withPage(async (page) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      SKIP = false; const b = document.getElementById('bub2'); const out = {};
      say(2, '甲甲甲甲');
      setTimeout(() => say(2, '乙乙乙乙'), 1000);
      setTimeout(() => { out.at2400 = { show: b.classList.contains('show'), text: b.textContent }; }, 2400);
      setTimeout(() => { out.at4300 = { show: b.classList.contains('show'), text: b.textContent }; }, 4300); /* 第二句 t=1000+3500=4500 才收 */
      setTimeout(() => { out.at5000 = { show: b.classList.contains('show') }; resolve(out); }, 5000);
    }));
    console.log('B', JSON.stringify(r));
    assert.deepEqual(r.at2400, { show: true, text: '乙乙乙乙' });
    assert.deepEqual(r.at4300, { show: true, text: '乙乙乙乙' });
    assert.equal(r.at5000.show, false);
  });
});

test('C renderSeats() 後未到期的泡仍顯示同一文字；到期後重畫不補回', { timeout: 60000 }, async () => {
  await withPage(async (page) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      SKIP = false; const out = {};
      say(3, '丙丙丙丙丙');
      renderSeats();
      let b = document.getElementById('bub3');
      out.immediate = { show: b.classList.contains('show'), text: b.textContent };
      setTimeout(() => { renderSeats(); b = document.getElementById('bub3'); out.at1500 = { show: b.classList.contains('show'), text: b.textContent }; }, 1500);
      setTimeout(() => { renderSeats(); b = document.getElementById('bub3'); out.expired = { show: b.classList.contains('show'), text: b.textContent }; resolve(out); }, 4000); /* 5 字＝3500ms 已過 */
    }));
    console.log('C', JSON.stringify(r));
    assert.deepEqual(r.immediate, { show: true, text: '丙丙丙丙丙' });
    assert.deepEqual(r.at1500, { show: true, text: '丙丙丙丙丙' });
    assert.equal(r.expired.show, false); assert.equal(r.expired.text, '');
  });
});

test('D 字級≥14px、西／東泡可換行、844x390 三席長句泡都在視窗內', { timeout: 60000 }, async () => {
  await withPage(async (page) => {
    await page.evaluate(() => { SKIP = false; [1, 2, 3].forEach((id) => say(id, '這是一句比較長的對白，用來檢查泡會不會衝出視窗邊緣。')); });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => [1, 2, 3].map((id) => {
      const b = document.getElementById('bub' + id), cs = getComputedStyle(b), r = b.getBoundingClientRect();
      return { id, fs: parseFloat(cs.fontSize), ws: cs.whiteSpace, l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, show: b.classList.contains('show') };
    }));
    console.log('D', JSON.stringify(m));
    for (const x of m) {
      assert.ok(x.show); assert.ok(x.fs >= 14, `seat ${x.id} 字級 ${x.fs}`);
      assert.ok(x.l >= 0 && x.t >= 0 && x.r <= x.w && x.b <= x.h, `seat ${x.id} 泡超出視窗 ${JSON.stringify(x)}`);
    }
    for (const x of m.filter((q) => q.id !== 1)) assert.notEqual(x.ws, 'nowrap', `seat ${x.id} 應可換行`);
    if (SHOT_DIR) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, 'bubble-844x390-all.png') }); }
  });
});

test('G 新局清泡：上一局的泡不會補到新局同座位（含 newGame 換章路徑）', { timeout: 60000 }, async () => {
  await withPage(async (page, errs) => {
    const r = await page.evaluate(() => new Promise((resolve) => {
      SKIP = false; const out = {};
      say(2, '上一局的台詞');
      window.__yaoshi.newGame('solo', 7, ['qingmian']);
      setTimeout(() => {
        const b = document.getElementById('bub2'); out.after = { show: b.classList.contains('show'), text: b.textContent };
        say(2, '上一局的台詞二');
        try { window.__yaoshi.newGame('solo', 8, ['qingmian'], { chapter: 1 }); out.chapterOk = true; } catch (e) { out.chapterOk = String(e); }
        setTimeout(() => { const c = document.getElementById('bub2'); out.afterChapter = { show: c.classList.contains('show'), text: c.textContent }; resolve(out); }, 800);
      }, 800);
    }));
    console.log('G', JSON.stringify(r));
    assert.deepEqual(r.after, { show: false, text: '' });
    assert.equal(r.chapterOk, true);
    assert.deepEqual(r.afterChapter, { show: false, text: '' });
    assert.deepEqual(errs, []);
  });
});
