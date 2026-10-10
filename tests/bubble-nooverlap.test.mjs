// 對話泡不得遮住牌桌中央資訊（夜規則橫幅 #feltHead「朔月｜陰氣拍…」、出價鈕／金額／拍品名等）實頁斷言。
// http.server＋Playwright Chromium 開真的 index.html，844x390 橫式、出價階段、12 夜逐夜（含朔月夜與各規則夜）、
// 北／西／東三席**同時**顯示 8 字與 40 字長句（最壞情況）。行為斷言＝量到的幾何，不是看 CSS 原文：
//   N1 橫幅（#feltHead）每一行實際文字（Range.getClientRects，逐文字節點）與三顆泡 getBoundingClientRect 的交集面積＝0。
//   N2 同條件下泡與底列出價鈕／金額／出價合計／主鈕文字與鈕的外框、桌中央其他可見文字（#felt／#stage／#market 內，扣橫幅）交集＝0。
//   N3 泡完整在視窗內、字級 14px、不截字（文字 Range 外框完全在泡外框內；不用 scrollWidth——它會把 ::before 小飾／::after 尾巴算進去而恆報超出）；
//      尾巴（::after 三角形）的外框與該席座位卡 rect 距離≤24px，且尾巴凸出方向朝向該席（量 computed 的邊框與偏移，不是看 class）。
// 活性：每夜都要真的量到橫幅文字行（>0 行、總面積>0）且泡 show；朔月夜橫幅文字須含「朔月」。
// 基準對照：YAOSHI_RENDER_ROOT=<舊版 worktree> 可對舊版 index.html 跑同一份測試（b891f6d2 應紅在 N1 交集>0）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
import net from 'node:net';
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const NIGHTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TEXT8 = '看我的厲害吧哈哈'; // 8 字
const TEXT14 = '各位客官這口價我跟定了'.padEnd(14, '啦').slice(0, 14);
assert.equal(Array.from(TEXT14).length, 14);
const TEXT19 = '各位客官這口價我跟定了不放手啦啦啦啦啦啦'.slice(0, 19);
assert.equal(Array.from(TEXT19).length, 19);
const TEXT40 = '這是一句四十字的最壞情況長對白用來檢查三席泡同時出現時會不會遮住牌桌中央的夜規則橫幅文字行啦'.slice(0, 40);
assert.equal(Array.from(TEXT8).length, 8);
assert.equal(Array.from(TEXT40).length, 40);

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
    const served = await (await fetch(`http://127.0.0.1:${PORT}/index.html`)).text();
    assert.equal(served, fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8'), '伺服器回的 index.html 不是 SRV_ROOT 的那份（埠被別的伺服器佔用？）');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { document.getElementById('mainbtn').click(); }); // 盯上宣告 → 出價階段
    await page.waitForTimeout(1500);
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

/* 頁內：切到第 N 夜（只換 S.round／S.nightRule 後重畫座位與橫幅，不碰任何對白或亂數邏輯）、三席同時說 txt，量全部幾何。 */
const MEASURE = `(async ({ N, txt }) => {
  SKIP = false; S.round = N; S.nightRule = ruleForRound(N); renderSeats();
  const RL = ['qingmian','hongyi','duanshou','shoujing','hunter','xiaonv','lvshan','zutou','dangpu','luzhu']; [1,2,3].forEach((id) => { document.getElementById('bub' + id).dataset.role = RL[(N + id * 3) % 10]; }); /* 每夜輪換角色造型（祖靈內距較高，最壞情況要量到） */
  [1, 2, 3].forEach((id) => say(id, txt));
  await new Promise((r) => setTimeout(r, 450));
  const R = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const lines = (root, skip) => { const out = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement;
      if (p.closest('.bubble') || (skip && p.closest(skip))) continue;
      const cs = getComputedStyle(p); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) if (q.width > 0 && q.height > 0) out.push({ ...R(q), s: n.textContent.trim().slice(0, 16) }); }
    return out; };
  const banner = lines(document.getElementById('feltHead'));
  const center = [...lines(document.getElementById('felt'), '#feltHead'), ...lines(document.getElementById('railW')), ...lines(document.getElementById('railE')), ...lines(document.getElementById('budget')), ...lines(document.getElementById('mainbtn'))];
  const boxes = [...document.querySelectorAll('#budget button, #budget .stepper, #mainbtn, #railW .railTabs button, #railE .railTabs button, #helpBtn')].filter((e) => e.getClientRects().length).map((e) => ({ ...R(e.getBoundingClientRect()), s: (e.id || e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 6) }));
  const bubbles = [1, 2, 3].map((id) => { const b = document.getElementById('bub' + id), cs = getComputedStyle(b), r = b.getBoundingClientRect();
    const seat = b.closest('.seat').getBoundingClientRect();
    const a = getComputedStyle(b, '::after');
    const bw = [a.borderTopWidth, a.borderRightWidth, a.borderBottomWidth, a.borderLeftWidth].map(parseFloat);
    const bc = [a.borderTopColor, a.borderRightColor, a.borderBottomColor, a.borderLeftColor];
    const tw = bw[1] + bw[3], th = bw[0] + bw[2];
    const pl = r.left + parseFloat(cs.borderLeftWidth), pt = r.top + parseFloat(cs.borderTopWidth), pr = r.right - parseFloat(cs.borderRightWidth);
    const x0 = a.left !== 'auto' ? pl + parseFloat(a.left) : pr - parseFloat(a.right) - tw;
    const y0 = pt + parseFloat(a.top) + parseFloat(a.marginTop || 0);
    return { id, show: b.classList.contains('show'), fs: parseFloat(cs.fontSize), box: R(r), seat: R(seat), tail: { l: x0, t: y0, r: x0 + tw, b: y0 + th, bw, bc },
      txt: (() => { const rg = document.createRange(); rg.selectNodeContents(b); const q = rg.getBoundingClientRect(); return R(q); })(), vw: innerWidth, vh: innerHeight }; });
  return { rule: S.nightRule ? S.nightRule.name : null, bannerText: banner.map((x) => x.s).join('|'), banner, center, boxes, bubbles };
})`;

const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const fmt = (x) => `${Math.round(x.l)},${Math.round(x.t)},${Math.round(x.r)},${Math.round(x.b)}`;

async function sweep(page, txt, label) {
  const all = [];
  for (const N of NIGHTS) {
    const m = await page.evaluate(`(${MEASURE})(${JSON.stringify({ N, txt })})`);
    m.N = N; all.push(m);
    if (SHOT_DIR && N === 1) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `bubble-nooverlap-${label}-844x390.png`) }); }
  }
  return all;
}

for (const [label, txt] of [['len8', TEXT8], ['len14', TEXT14], ['len19', TEXT19], ['len40', TEXT40]]) {
  test(`N1 ${label} 三席同時：泡與夜規則橫幅每行文字交集面積＝0（12 夜）`, { timeout: 240000 }, async () => {
    await withPage(async (page, errs) => {
      const all = await sweep(page, txt, label);
      const bad = []; let maxBanner = 0;
      for (const m of all) {
        // 活性：橫幅文字行真的被量到、泡真的顯示
        assert.ok(m.banner.length > 0 && m.banner.reduce((s, x) => s + (x.r - x.l) * (x.b - x.t), 0) > 0, `第 ${m.N} 夜沒量到橫幅文字行`);
        assert.ok(m.bubbles.every((b) => b.show), `第 ${m.N} 夜有泡沒顯示`);
        if (m.N === 1) assert.ok(m.bannerText.includes('朔月'), `第 1 夜橫幅文字應含朔月：${m.bannerText}`);
        maxBanner = Math.max(maxBanner, ...m.banner.map((x) => x.r));
        for (const b of m.bubbles) for (const ln of m.banner) { const a = area(b.box, ln); if (a > 0) bad.push(`第 ${m.N} 夜(${m.rule}) 泡${b.id}[${fmt(b.box)}] ∩ 橫幅「${ln.s}」[${fmt(ln)}] = ${a.toFixed(0)}px²`); }
      }
      console.log(`N1 ${label} 橫幅文字最右緣 x=${Math.round(maxBanner)}；夜規則：${all.map((m) => m.N + ':' + m.rule).join(' ')}`);
      assert.equal(bad.length, 0, `泡遮住橫幅文字 ${bad.length} 處（交集面積>0）：\n` + bad.slice(0, 12).join('\n'));
      assert.deepEqual(errs, []);
    });
  });

  test(`N2 ${label} 三席同時：泡與出價鈕／金額／出價合計／主鈕／桌中央其他文字交集＝0（12 夜）`, { timeout: 240000 }, async () => {
    await withPage(async (page, errs) => {
      const all = await sweep(page, txt, label);
      const bad = [];
      for (const m of all) {
        assert.ok(m.center.length > 0 && m.boxes.length > 0, `第 ${m.N} 夜沒量到中央資訊／出價鈕`);
        assert.ok(m.center.some((x) => x.r < 120) && m.center.some((x) => x.l > 720), `第 ${m.N} 夜沒量到西／東側欄卡文字`);
        assert.ok(m.boxes.filter((x) => x.r < 130 || x.l > 710).length >= 2, `第 ${m.N} 夜沒量到側欄分頁按鈕框`);
        for (const b of m.bubbles) for (const x of [...m.center, ...m.boxes]) { const a = area(b.box, x); if (a > 0) bad.push(`第 ${m.N} 夜 泡${b.id}[${fmt(b.box)}] ∩ 「${x.s}」[${fmt(x)}] = ${a.toFixed(0)}px²`); }
      }
      assert.equal(bad.length, 0, `泡遮住中央資訊 ${bad.length} 處：\n` + bad.slice(0, 12).join('\n'));
      assert.deepEqual(errs, []);
    });
  });

  test(`N3 ${label} 三席同時：泡在視窗內、14px、不截字、尾巴朝向該席且距座位卡≤24px（12 夜）`, { timeout: 240000 }, async () => {
    await withPage(async (page, errs) => {
      const all = await sweep(page, txt, label);
      const bad = [];
      for (const m of all) for (const b of m.bubbles) {
        const x = b.box;
        if (!(x.l >= 0 && x.t >= 0 && x.r <= b.vw && x.b <= b.vh)) bad.push(`第 ${m.N} 夜 泡${b.id} 超出視窗 [${fmt(x)}]`);
        if (b.fs < 14) bad.push(`第 ${m.N} 夜 泡${b.id} 字級 ${b.fs}`);
        if (b.txt.l < x.l - 0.5 || b.txt.r > x.r + 0.5 || b.txt.t < x.t - 0.5 || b.txt.b > x.b + 0.5) bad.push(`第 ${m.N} 夜 泡${b.id} 文字超出泡外框 txt[${fmt(b.txt)}] box[${fmt(x)}]`);
        const t = b.tail, s = b.seat;
        const gx = Math.max(0, Math.max(s.l - t.r, t.l - s.r)), gy = Math.max(0, Math.max(s.t - t.b, t.t - s.b));
        const dist = Math.hypot(gx, gy);
        if (dist > 24) bad.push(`第 ${m.N} 夜 泡${b.id} 尾巴離座位卡 ${dist.toFixed(1)}px>24`);
        // 尾巴凸出方向：尾巴中心須落在泡外框的某一側外，且座位卡中心在泡中心的同一側
        const tcx = (t.l + t.r) / 2, tcy = (t.t + t.b) / 2, bcx = (x.l + x.r) / 2, bcy = (x.t + x.b) / 2, scx = (s.l + s.r) / 2, scy = (s.t + s.b) / 2;
        const side = tcy < x.t ? 'up' : tcy > x.b ? 'down' : tcx < x.l ? 'left' : tcx > x.r ? 'right' : 'inside';
        const ok = { up: scy < bcy, down: scy > bcy, left: scx < bcx, right: scx > bcx, inside: false }[side];
        if (!ok) bad.push(`第 ${m.N} 夜 泡${b.id} 尾巴凸出方向 ${side} 與座位卡方位不符 tail[${fmt(t)}] seat[${fmt(s)}]`);
        if (!t.bc.some((c, i) => t.bw[i] > 0 && c !== 'rgba(0, 0, 0, 0)')) bad.push(`第 ${m.N} 夜 泡${b.id} 尾巴沒有可見邊`);
      }
      assert.equal(bad.length, 0, `N3 違反 ${bad.length} 處：\n` + bad.slice(0, 12).join('\n'));
      assert.deepEqual(errs, []);
    });
  });
}
