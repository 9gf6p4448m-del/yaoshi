// 關掉只能看的視窗後的托盤距離與「逐件開標中」（凍結檔 docs/acceptance/2026-11-24-view-gate-edges.md）。
// 補 v0.66.5 驗收的三個盲點（只改測試，產品不動）：
//   W1  盯上頁：點背景關掉別人的袋子，120ms 後點半徑內「不同的一點」、那一點關掉後最上層是 #tray → 不得盯上（Codex yaoshi-v0.66.5-r1 F1）
//   W1c 出價頁：同上 → 不得打開出價視窗
//   W2  托盤的距離邊界：按關閉鈕關掉別人的袋子，150ms 後點托盤，距離 50–70／80–95px 不收、105–125／150–175px 收（fresh opus 覆審 MEDIUM）
//   W3  「逐件開標中」真實關窗：同一點、上 60px 吞；座位 2 放行（Codex F2；?tray3d=0，只量點擊那一層）
// 每一格先驗量測前提（關閉那一下真的關了、兩下按下時刻相隔 < 500ms、第二下那一點關掉後最上層是什麼），
// 「吞」的格子另驗活性：守衛過期後再點同一點，托盤要收到（W1／W2）或要冒泡（W3）——證明危險在場、沒收到是守衛擋的。
// 基準對照：YAOSHI_RENDER_ROOT=<改壞樹> 換產品（改壞版本見凍結檔附錄）。瀏覽器規矩：一次只開一個 chromium；每個情境各開一頁。
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_VGE_PORT || 9782);
const GUARD = 500;   /* MAIN_GUARD_MS（凍結數字）；量測前提用，不從頁面讀 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}

let srv, browser;
before(async () => {
  const { chromium } = loadPlaywright();
  srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await wait(900);
  browser = await launchGpu(chromium);
});
after(async () => { await browser?.close(); srv?.kill(); });

/* 量測掛鉤（與 ux-0665 相同）：window capture 記每一下點擊（含被相位閘吞掉的），document bubble 只收到沒被吞的；
   動作函式包一層記呼叫（inline onclick 與 trayTap 都照名字找全域函式，包 window 上那支就攔得到）。 */
const INSTR = () => {
  window.__clk = []; window.__bub = []; window.__calls = [];
  window.addEventListener('click', (e) => window.__clk.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), true);
  document.addEventListener('click', (e) => window.__bub.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), false);
  for (const n of ['showBag', 'showRoleInfo', 'openHelp', 'closeModal', 'pickMark', 'openSheet']) {
    const o = window[n]; if (typeof o !== 'function') continue;
    window[n] = function () { window.__calls.push(`${n}(${[...arguments].map((a) => JSON.stringify(a)).join(',')})`); return o.apply(this, arguments); };
  }
};
async function open({ size = [844, 390], query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕 */ } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`);
  await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi && (window.__yaoshi3d.tray || /tray3d=0/.test(location.search)), null, { timeout: 60000 });
  await page.evaluate(INSTR);
  await page.evaluate(() => window.__yaoshi.newGame('solo', 3, ['qingmian']));
  await page.waitForFunction(() => document.getElementById('seat2') && TRAY_PHASE === 'mark', null, { timeout: 30000 });
  await page.waitForTimeout(4000);   /* 開局的模型下載與相位切換都過去，量的是穩定畫面上的點擊 */
  return { page, errors, W: size[0], H: size[1], close: () => ctx.close() };
}
/* 推到主鈕文字符合為止（用 el.click()：沒有座標的不可信事件，相位閘不武裝也不吞）。 */
async function driveTo(page, re, tag) {
  for (let i = 0; i < 900; i++) {
    const hit = await page.evaluate((src) => {
      const b = document.getElementById('mainbtn');
      if (b && !b.disabled && new RegExp(src).test(b.textContent)) return true;
      if (b && !b.disabled && document.getElementById('modal').style.display !== 'flex') b.click();
      return false;
    }, re.source);
    if (hit) return;
    await page.waitForTimeout(30);
  }
  throw new Error(`${tag}：主鈕一直沒有變成 ${re}`);
}
const tap = (page, [x, y]) => page.touchscreen.tap(x, y);
async function pointOf(page, sel, fx = 0.5, fy = 0.5) {
  const r = await page.locator(sel).first().boundingBox();
  assert.ok(r, `找不到 ${sel}`);
  return [Math.round(r.x + r.width * fx), Math.round(r.y + r.height * fy)];
}
/* 視窗裡最後一顆字樣是「關閉」的鈕（照文字找、不照 onclick 找——K5 那種接錯 onclick 的也要找得到）：捲進眼前、回中心點 */
async function closePoint(page) {
  const pick = () => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => /關閉/.test(b.textContent || '')); return bs[bs.length - 1] || null; };
  await page.evaluate(`(${pick})()?.scrollIntoView({ block: 'nearest' })`);
  await page.waitForTimeout(200);
  const r = await page.evaluate(`(() => { const b = (${pick})(); if (!b) return null; const q = b.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; })()`);
  assert.ok(r, '量測沒成立：視窗裡找不到「關閉」鈕');
  return r;
}
/* 沒有視窗時：最上層是 #tray、3D 也命中托盤格的點（4px 格）——第二下要點的候選。
   周圍 16px（上下左右與四個斜角）最上層也都要是 #tray：Chrome 的觸控點擊會吸附到附近可點的元素
   （探針 tmp/vge/w2probe.log：667×375 挑到心願標籤底邊外 1px 的 (268,92)，pointerdown／click 3／3 打到 .wishchip、
   click 座標被移到 (268,86)），托盤根本收不到這一下——這種點量不到托盤守衛。 */
const NEAR = 16;
const trayPoints = (page) => page.evaluate((near) => {
  const W = innerWidth, H = innerHeight, T = window.__yaoshi3d?.tray, out = [];
  if (!T) return out;
  for (let y = 4; y < H; y += 4) for (let x = 4; x < W; x += 4) {
    const isTray = (px, py) => { const e = document.elementFromPoint(px, py); return !!(e && (e.id === 'tray' || e.closest?.('#tray'))); };
    if (!isTray(x, y)) continue;
    let clean = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (!isTray(x + dx * near, y + dy * near)) { clean = false; break; }
    if (!clean) continue;
    let i = -1; try { i = T.hitTest((x / W) * 2 - 1, -((y / H) * 2 - 1)); } catch (err) { /* 量不到 */ }
    if (i >= 0) out.push([x, y, i]);
  }
  return out;
}, NEAR);
/* 視窗開著時：落在背景（#modal 本身、框外 4px）的點——點了會關窗 */
const bgPoints = (page) => page.evaluate(() => {
  const mb = document.getElementById('modalbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, out = [];
  for (let y = 4; y < H; y += 4) for (let x = 4; x < W; x += 4) {
    if (x >= mb.left - 4 && x <= mb.right + 4 && y >= mb.top - 4 && y <= mb.bottom + 4) continue;
    if (document.elementFromPoint(x, y) === document.getElementById('modal')) out.push([x, y]);
  }
  return out;
});
/* 現在這一點的最上層是不是 #tray、命中哪一格（-1＝不是托盤） */
const trayTopAt = (page, [x, y]) => page.evaluate(([px, py]) => {
  const e = document.elementFromPoint(px, py); if (!e || !(e.id === 'tray' || e.closest?.('#tray'))) return -1;
  try { return window.__yaoshi3d.tray.hitTest((px / innerWidth) * 2 - 1, -((py / innerHeight) * 2 - 1)); } catch (err) { return -1; }
}, [x, y]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
async function reset(page) {
  await page.evaluate(() => { if (document.getElementById('modal').style.display === 'flex') closeModal(); });
  await page.waitForTimeout(700);   /* 上一輪武裝的守衛（不論哪一種）都過期 */
  await page.evaluate(() => { window.__clk.length = 0; window.__bub.length = 0; window.__calls.length = 0; });
}
const snap = (page) => page.evaluate(() => ({ calls: window.__calls.slice(), clk: window.__clk.slice(), bub: window.__bub.slice(),
  modal: document.getElementById('modal').style.display === 'flex', h2: document.querySelector('#modalbox h2')?.textContent || '',
  mark0: window.__yaoshi.S.marks ? window.__yaoshi.S.marks[0] : undefined, sheet: (() => { const s = document.getElementById('sheet'); return !!(s && s.style.display && s.style.display !== 'none'); })() }));
/* 量測前提：第 i、j 下點擊（window capture 的順序）都派送了，而且按下時刻相隔 < 500ms，才算量在守衛視窗裡。 */
function gapOk(r, i, j, tag) {
  assert.ok(r.clk.length > j, `${tag}：量測沒成立——只收到 ${r.clk.length} 下點擊（${JSON.stringify(r.clk)}）`);
  const dt = Math.round(r.clk[j].t - r.clk[i].t);
  assert.ok(dt < GUARD, `${tag}：量測沒成立——兩下相隔 ${dt}ms，不在 ${GUARD}ms 的守衛視窗裡`);
  return dt;
}
async function openOthersBag(page, tag) {
  await tap(page, await pointOf(page, '#seat1', 0.35, 0.6));
  await page.waitForTimeout(900);
  const ok = await page.evaluate(() => document.getElementById('modal').style.display === 'flex' && window.__calls.includes('showBag(1)'));
  assert.ok(ok, `${tag}：量測沒成立——點座位 1 打不開別人的袋子（${JSON.stringify(await page.evaluate(() => window.__calls))}）`);
}
const afterClose = (calls) => calls.slice(calls.indexOf('closeModal()') + 1);
const SIZES = [[844, 390], [667, 375]];

for (const size of SIZES) for (const kind of ['盯上頁', '出價頁']) {
  const id = kind === '盯上頁' ? 'W1' : 'W1c';
  const act = kind === '盯上頁' ? 'pickMark' : 'openSheet';
  test(`${id} ${size.join('×')} ${kind}：點背景關掉別人的袋子，120ms 後點半徑內另一點的托盤 → 不得${kind === '盯上頁' ? '盯上' : '打開出價視窗'}`, { timeout: 120000 }, async () => {
    const s = await open({ size });
    try {
      if (kind === '出價頁') { await driveTo(s.page, /蓋牌/, `${id} 出價頁`); await s.page.waitForTimeout(1500); }
      assert.equal(await s.page.evaluate(() => TRAY_PHASE), kind === '盯上頁' ? 'mark' : 'bid', `量測沒成立：不在${kind}`);
      await reset(s.page);
      const A = await trayPoints(s.page);
      assert.ok(A.length > 0, '量測沒成立：沒有視窗時找不到最上層是 #tray 的托盤點');
      await openOthersBag(s.page, id);
      const B = await bgPoints(s.page);
      let best = null;
      for (const p of B) for (const q of A) { const d = dist(p, q); if (d >= 30 && d <= 90 && (!best || Math.abs(d - 60) < Math.abs(best[2] - 60))) best = [p, q, d]; }
      assert.ok(best, '量測沒成立：找不到背景點與 30–90px 內托盤點的配對');
      const [P1, P2, d] = best;
      await tap(s.page, P1);
      const topBefore = await trayTopAt(s.page, P2);   /* 關掉之後、第二下之前：這一點最上層要是托盤那一格 */
      await s.page.waitForTimeout(120);
      await tap(s.page, P2);
      await s.page.waitForTimeout(700);
      const r = await snap(s.page);
      assert.ok(r.calls.includes('closeModal()'), `${id}：量測沒成立——點背景那一下沒有關掉視窗（${JSON.stringify(r.calls)}）`);
      const dt = gapOk(r, 1, 2, id);
      assert.equal(topBefore, P2[2], `${id}：量測沒成立——關掉之後、第二下之前，那一點最上層不是托盤 ${P2[2]} 號格（${topBefore}）`);
      const top = await trayTopAt(s.page, P2);
      assert.equal(top, P2[2], `${id}：量測沒成立——關掉之後第二下那一點最上層不是托盤 ${P2[2]} 號格（${top}）`);
      const leaked = afterClose(r.calls).filter((c) => /^(pickMark|openSheet)\(/.test(c));
      console.log(`${id} ${size.join('×')}：背景 ${P1} → 托盤 ${P2}（${Math.round(d)}px）、相隔 ${dt}ms、之後的動作 ${JSON.stringify(leaked)}、盯上 ${r.mark0}、出價視窗 ${r.sheet}`);
      assert.deepEqual(leaked, [], `第二下落在半徑內的托盤 ${P2[2]} 號格，被收下了`);
      if (kind === '盯上頁') assert.equal(r.mark0, undefined, `第二下替玩家盯上了托盤 ${r.mark0} 號格`);
      else assert.equal(r.sheet, false, '第二下打開了出價視窗');
      /* 活性：守衛過期（已等 700ms）後再點同一點，托盤要收到——證明這一點的危險在場、剛才沒收到是守衛擋的 */
      await tap(s.page, P2);
      await s.page.waitForTimeout(700);
      const live = await s.page.evaluate(() => window.__calls.slice());
      assert.ok(live.includes(`${act}(${P2[2]})`), `${id}：量測沒成立——守衛過期後點 ${P2} 托盤也沒收到（${JSON.stringify(live)}），這一點的危險不在場`);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}

const BANDS = [[50, 70, 60, '不收'], [80, 95, 88, '不收'], [105, 125, 115, '收'], [150, 175, 162, '收']];
for (const size of SIZES) for (const [lo, hi, mid, want] of BANDS) {
  test(`W2 ${size.join('×')} 托盤的距離邊界：按關閉鈕關掉別人的袋子，150ms 後點 ${lo}–${hi}px 外的托盤 → ${want}`, { timeout: 120000 }, async () => {
    const s = await open({ size });
    try {
      await reset(s.page);
      const A = await trayPoints(s.page);
      assert.ok(A.length > 0, '量測沒成立：沒有視窗時找不到最上層是 #tray 的托盤點');
      await openOthersBag(s.page, 'W2');
      const cp = await closePoint(s.page);
      let q = null;
      for (const c of A) { const d = dist(cp, c); if (d >= lo && d <= hi && (!q || Math.abs(d - mid) < Math.abs(dist(cp, q) - mid))) q = c; }
      assert.ok(q, `量測沒成立：關閉點 ${cp} 的 ${lo}–${hi}px 內找不到托盤點`);
      await tap(s.page, cp);
      const topBefore = await trayTopAt(s.page, q);   /* 關掉之後、第二下之前 */
      await s.page.waitForTimeout(150);
      await tap(s.page, q);
      await s.page.waitForTimeout(700);
      const r = await snap(s.page);
      assert.ok(r.calls.includes('closeModal()'), `W2：量測沒成立——按關閉那一下沒有關掉視窗（${JSON.stringify(r.calls)}）`);
      const dt = gapOk(r, 1, 2, 'W2');
      assert.equal(topBefore, q[2], `W2：量測沒成立——關掉之後、第二下之前，${q} 最上層不是托盤 ${q[2]} 號格（${topBefore}）`);
      if (want === '不收') {   /* 收下之後盯上會換畫面（667×375 那一點被蓋住），事後量只在沒有動作的帶做 */
        const top = await trayTopAt(s.page, q);
        assert.equal(top, q[2], `W2：量測沒成立——關掉之後 ${q} 最上層不是托盤 ${q[2]} 號格（${top}）`);
      }
      const picked = afterClose(r.calls).filter((c) => /^pickMark\(/.test(c));
      const underNow = await s.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : null; }, q);
      console.log(`W2 ${size.join('×')} ${lo}–${hi}px：關閉點 ${cp} → 托盤 ${q}（${Math.round(dist(cp, q))}px）、第二下之前最上層 ${topBefore}、相隔 ${dt}ms、之後的盯上 ${JSON.stringify(picked)}、現在那一點底下 ${underNow}`);
      if (want === '收') {
        assert.deepEqual(picked, [`pickMark(${q[2]})`], `關閉點 ${Math.round(dist(cp, q))}px 外點托盤，應該收下卻被擋了`);
      } else {
        assert.deepEqual(picked, [], `關閉點 ${Math.round(dist(cp, q))}px 內點托盤，被收下了`);
        await tap(s.page, q);
        await s.page.waitForTimeout(700);
        const live = await s.page.evaluate(() => window.__calls.slice());
        assert.ok(live.includes(`pickMark(${q[2]})`), `W2：量測沒成立——守衛過期後點 ${q} 托盤也沒收到（${JSON.stringify(live)}）`);
      }
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}

for (const size of SIZES) {
  test(`W3 ${size.join('×')} 「逐件開標中」關掉後：同一點、上 60px 吞，座位 2 放行`, { timeout: 180000 }, async () => {
    const s = await open({ size, query: '?tray3d=0' });
    try {
      await driveTo(s.page, /蓋牌/, 'W3 出價頁');
      await s.page.waitForTimeout(1500);
      await s.page.evaluate(() => document.getElementById('mainbtn').click());   /* 蓋牌開標（不可信點擊，相位閘不武裝） */
      await s.page.waitForFunction(() => REVEAL_ANIMATING && !document.getElementById('mainbtn').disabled && /開標 ▸/.test(document.getElementById('mainbtn').textContent), null, { timeout: 90000 });
      const seat1 = await pointOf(s.page, '#seat1', 0.35, 0.6), seat2 = await pointOf(s.page, '#seat2', 0.35, 0.6);
      const got = {};
      for (const trial of ['同一點', '上 60px', '座位 2']) {
        await reset(s.page);
        assert.equal(await s.page.evaluate(() => REVEAL_ANIMATING), true, `${trial}：量測沒成立——開標演出已經結束`);
        await tap(s.page, seat1);
        await s.page.waitForTimeout(900);
        const opened = await s.page.evaluate(() => ({ h2: document.querySelector('#modalbox h2')?.textContent || '', calls: window.__calls.slice() }));
        assert.ok(opened.h2 === '逐件開標中' && opened.calls.includes('showBag(1)'), `${trial}：量測沒成立——點座位 1 打開的不是「逐件開標中」（${JSON.stringify(opened)}）`);
        const cp = await closePoint(s.page);
        await tap(s.page, cp);
        const closed = await s.page.evaluate(() => document.getElementById('modal').style.display !== 'flex');
        assert.ok(closed, `${trial}：「逐件開標中」按「關閉」，視窗沒有關掉`);
        await s.page.waitForTimeout(150);
        const q = trial === '同一點' ? cp : trial === '上 60px' ? [cp[0], cp[1] - 60] : seat2;
        await tap(s.page, q);
        await s.page.waitForTimeout(700);
        const r = await snap(s.page);
        const dt = gapOk(r, 1, 2, trial);
        const bubbled = r.bub.some((b) => b.t >= r.clk[2].t);
        got[trial] = trial === '座位 2' ? (bubbled && r.calls.includes('showBag(2)') ? '放行' : '吞') : (bubbled ? '放行' : '吞');
        console.log(`W3 ${size.join('×')} ${trial}：關閉點 ${cp} → ${q}（${Math.round(dist(cp, q))}px）、相隔 ${dt}ms → ${got[trial]}、呼叫 ${JSON.stringify(r.calls)}`);
        if (trial !== '座位 2' && got[trial] === '吞') {
          /* 活性：守衛過期後再點同一點要冒泡——「沒冒泡」是守衛擋的，不是那個元素本來就不冒泡 */
          const n = r.bub.length;
          await tap(s.page, q);
          await s.page.waitForTimeout(300);
          const nb = await s.page.evaluate(() => window.__bub.length);
          assert.ok(nb > n, `${trial}：量測沒成立——守衛過期後點 ${q} 也沒冒泡，量不到守衛`);
        }
      }
      assert.deepEqual(got, { 同一點: '吞', '上 60px': '吞', '座位 2': '放行' });
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}
