// v0.66.5 連點守衛放寬的實頁驗收（凍結檔 docs/acceptance/2026-11-23-v0.66.5.md）。
// 製作人 iPhone：關掉別人的袋子後馬上點另一席，「按了沒反應 再按第二次」——相位閘在關閉那一下整個畫面吸收 500ms。
// v0.66.5：關掉「只能看的視窗」（袋子、角色卡 ⓘ、規則頁）之後，只擋關閉那一點半徑 100px 內，其他位置馬上可以點。
//   V1  關掉後 150／250／350ms 點座位 2 要打開（4 種視窗 × 按關閉鈕／點背景 × 2 個尺寸）
//   V2  連按關閉鈕兩下（120ms）：第二下照樣被吞——關閉鈕底下多半壓著托盤 1 號格（盯上頁＝公開盯上，不可逆）
//   V2b 點背景關袋子、落點底下是托盤格，連點兩下：盯上頁不得盯上
//   V2c 同上在出價頁：不得打開出價視窗
//   V3  「附近」的邊界：關閉點正上方 0／60／90px 吞、110／160px 放行（?tray3d=0，只量點擊那條路）
//   V4  視窗裡按了別的（自己袋子的「送神回天」）不算關閉：150ms 後點背景照樣被吞、視窗還開著
//   V5  鍵盤（Enter）關掉：沒有座標，照舊整層吸收，150ms 後點座位 2 被吞
//   V6  不是只能看的視窗（供奉詢問）：按「要，繼續供奉」後 150ms 點座位 2 照舊被吞
//   V7  「只能看」的標記只出現在那五個視窗（showBag 三種、showRoleInfo、openHelp），其他視窗一個都沒有
// 基準對照：YAOSHI_RENDER_ROOT=<舊版樹> 對舊版跑同一份（V1、V3 放行那兩點、V7 應紅；其餘舊版就綠）。
// 每一下「應該被吞／應該放行」都先驗量測前提：關閉那一下真的關了、兩下點擊的按下時刻相隔 < 500ms（MAIN_GUARD_MS）。
// 瀏覽器規矩：一次只開一個 chromium；每個情境各開一頁。觸控模擬（iPhone 那條路：pointerdown＋click 都帶座標）。
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_UX0665_PORT || 9778);
const GUARD = 500;   /* MAIN_GUARD_MS（凍結數字）；量測前提用，不從頁面讀——舊版也要能跑 */
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

/* 量測用的掛鉤：window capture 記下每一下點擊（含被相位閘吞掉的），document bubble 只收到沒被吞的；
   動作函式包一層記呼叫（inline onclick 與 trayTap 都是照名字找全域函式，包 window 上那支就攔得到）。 */
const INSTR = () => {
  window.__clk = []; window.__bub = []; window.__calls = [];
  window.addEventListener('click', (e) => window.__clk.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), true);
  document.addEventListener('click', (e) => window.__bub.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), false);
  for (const n of ['showBag', 'showRoleInfo', 'openHelp', 'closeModal', 'pickMark', 'openSheet', 'toggleSfx', 'incBump', 'giveUpLegend', 'toggleFpsDiag']) {
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
/* 視窗最後一顆「只做 closeModal()」的鈕：捲進眼前、回中心點與那一點底下（關掉之後）的托盤格。 */
async function closePoint(page) {
  await page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); bs[bs.length - 1]?.scrollIntoView({ block: 'nearest' }); });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); const b = bs[bs.length - 1]; if (!b) return null; const q = b.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; });
  assert.ok(r, '視窗裡找不到關閉鈕');
  return r;
}
const trayAt = (page, [x, y]) => page.evaluate(([px, py]) => { const T = window.__yaoshi3d?.tray; if (!T) return -1; try { return T.hitTest((px / innerWidth) * 2 - 1, -((py / innerHeight) * 2 - 1)); } catch (e) { return -1; } }, [x, y]);
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
const ACTION = /^(pickMark|openSheet|showBag|showRoleInfo|openHelp|toggleSfx|incBump|giveUpLegend|toggleFpsDiag)\(/;
const OPENERS = {
  '別人的袋子': { sel: '#seat1', fx: 0.35, fy: 0.6, call: 'showBag(1)' },
  '角色卡 ⓘ': { sel: '#seat1 .roleInfoBtn', call: 'showRoleInfo(1)' },
  '規則頁': { sel: '#helpBtn', call: 'openHelp()' },
  '自己的袋子': { sel: '#south button[onclick="showBag(0)"]', call: 'showBag(0)' },
};
async function openBy(page, name) {
  const op = OPENERS[name];
  await tap(page, await pointOf(page, op.sel, op.fx, op.fy));
  await page.waitForTimeout(900);
  const ok = await page.evaluate((c) => document.getElementById('modal').style.display === 'flex' && window.__calls.includes(c), op.call);
  assert.ok(ok, `${name}：點了打不開（${JSON.stringify(await page.evaluate(() => window.__calls))}）`);
}
const SIZES = [[844, 390], [667, 375]];

for (const size of SIZES) {
  test(`V1 ${size.join('×')} 關掉只能看的視窗後 150／250／350ms 點座位 2，要打開座位 2 的袋子`, { timeout: 240000 }, async () => {
    const s = await open({ size });
    try {
      const miss = [], seen = [];
      /* 間隔只到 350ms：點擊本身（觸控派送＋往返）約 40–70ms，450ms 那格實測會被撐到 501／519ms、落到守衛視窗外（基準第一次跑） */
      const seat2 = await pointOf(s.page, '#seat2', 0.35, 0.6);   /* 先算好，兩下之間不再多一次往返 */
      for (const name of Object.keys(OPENERS)) for (const how of ['按關閉鈕', '點背景']) for (const g of [150, 250, 350]) {
        const tag = `${name}／${how}／${g}ms`;
        await reset(s.page);
        await openBy(s.page, name);
        const cp = how === '按關閉鈕' ? await closePoint(s.page) : [s.W - 10, Math.round(s.H / 2)];
        await tap(s.page, cp);
        await s.page.waitForTimeout(g);
        await tap(s.page, seat2);
        await s.page.waitForTimeout(700);
        const r = await snap(s.page);
        assert.ok(r.calls.includes('closeModal()'), `${tag}：量測沒成立——關閉那一下沒有關掉視窗（${JSON.stringify(r.calls)}）`);
        const dt = gapOk(r, 1, 2, tag);
        seen.push(`${tag}=${dt}ms`);
        if (!r.calls.includes('showBag(2)')) miss.push(`${tag}（實際相隔 ${dt}ms）`);
      }
      console.log(`V1 ${size.join('×')} 實際間隔`, seen.join(' '));
      assert.deepEqual(miss, [], `關掉之後點座位 2 被吞了：${miss.join('、')}`);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`V2 ${size.join('×')} 連按關閉鈕兩下（120ms）：第二下照樣被吞，不得點到關閉鈕底下的東西`, { timeout: 120000 }, async () => {
    const s = await open({ size });
    try {
      const bad = [];
      for (const name of Object.keys(OPENERS)) {
        await reset(s.page);
        await openBy(s.page, name);
        const cp = await closePoint(s.page);
        await tap(s.page, cp);
        const under = await trayAt(s.page, cp);
        await s.page.waitForTimeout(120);
        await tap(s.page, cp);
        await s.page.waitForTimeout(700);
        const r = await snap(s.page);
        assert.ok(r.calls.includes('closeModal()'), `${name}：量測沒成立——第一下沒有關掉視窗`);
        const dt = gapOk(r, 1, 2, name);
        const after = r.calls.slice(r.calls.indexOf('closeModal()') + 1).filter((c) => ACTION.test(c));
        const leaked = r.bub.filter((b) => b.t >= r.clk[2].t).length;
        console.log(`V2 ${size.join('×')} ${name}：關閉點 ${cp} 底下托盤格 ${under}、相隔 ${dt}ms、之後的動作 ${JSON.stringify(after)}、第二下送達 ${leaked}、盯上 ${r.mark0}`);
        if (name === '別人的袋子') assert.ok(under >= 0, `量測沒成立：別人袋子的關閉鈕底下不是托盤格（${under}），這一條守的危險不在場`);
        if (after.length || leaked || r.mark0 !== undefined) bad.push(`${name}：動作 ${JSON.stringify(after)}、第二下送達 ${leaked}、盯上 ${r.mark0}`);
      }
      assert.deepEqual(bad, [], `連按關閉鈕的第二下沒被擋住：${bad.join('；')}`);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`V2b ${size.join('×')} 點背景關掉別人的袋子、落點底下是托盤格：連點兩下（120ms）不得盯上`, { timeout: 90000 }, async () => {
    const s = await open({ size });
    try {
      await reset(s.page);
      await openBy(s.page, '別人的袋子');
      const p = await s.page.evaluate(() => {
        const mb = document.getElementById('modalbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, T = window.__yaoshi3d.tray;
        for (let y = H - 8; y > 0; y -= 6) for (let x = 8; x < W; x += 6) {
          if (x >= mb.left - 4 && x <= mb.right + 4 && y >= mb.top - 4 && y <= mb.bottom + 4) continue;
          let i = -1; try { i = T.hitTest((x / W) * 2 - 1, -((y / H) * 2 - 1)); } catch (e) { /* 量不到 */ }
          if (i >= 0 && document.elementFromPoint(x, y) === document.getElementById('modal')) return [x, y, i];
        }
        return null;
      });
      assert.ok(p, '量測沒成立：找不到落在背景上、底下是托盤格的點');
      await tap(s.page, p);
      await s.page.waitForTimeout(120);
      await tap(s.page, p);
      await s.page.waitForTimeout(700);
      const r = await snap(s.page);
      assert.ok(r.calls.includes('closeModal()'), '量測沒成立：第一下沒有關掉視窗');
      const dt = gapOk(r, 1, 2, 'V2b');
      console.log(`V2b ${size.join('×')} 落點 ${p}、相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、盯上 ${r.mark0}`);
      assert.equal(r.mark0, undefined, `第二下替玩家盯上了托盤 ${p[2]} 號格`);
      assert.deepEqual(r.calls.filter((c) => /^(pickMark|openSheet)\(/.test(c)), []);
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });

  test(`V3 ${size.join('×')} 「附近」的邊界：關閉點正上方 0／60／90px 吞、110／160px 放行`, { timeout: 120000 }, async () => {
    const s = await open({ size, query: '?tray3d=0' });
    try {
      const got = {};
      for (const d of [0, 60, 90, 110, 160]) {
        await reset(s.page);
        await openBy(s.page, '別人的袋子');
        const cp = await closePoint(s.page);
        await tap(s.page, cp);
        await s.page.waitForTimeout(150);
        const q = [cp[0], cp[1] - d];
        const under = await s.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : null; }, q);
        await tap(s.page, q);
        await s.page.waitForTimeout(700);
        const r = await snap(s.page);
        assert.ok(r.calls.includes('closeModal()'), `${d}px：量測沒成立——關閉那一下沒有關掉視窗`);
        const dt = gapOk(r, 1, 2, `${d}px`);
        got[d] = r.bub.some((b) => b.t >= r.clk[2].t) ? '放行' : '吞';
        console.log(`V3 ${size.join('×')} ${d}px：落點 ${q} 底下 ${under}、相隔 ${dt}ms → ${got[d]}`);
      }
      assert.deepEqual(got, { 0: '吞', 60: '吞', 90: '吞', 110: '放行', 160: '放行' });
      assert.deepEqual(s.errors, []);
    } finally { await s.close(); }
  });
}

test('V2c 844×390 出價頁：點背景關掉別人的袋子、落點底下是托盤格，連點兩下（120ms）不得打開出價視窗', { timeout: 90000 }, async () => {
  const s = await open({ size: [844, 390] });
  try {
    await driveTo(s.page, /蓋牌/, 'V2c 出價頁');
    await s.page.waitForTimeout(1500);
    await reset(s.page);
    await openBy(s.page, '別人的袋子');
    const p = await s.page.evaluate(() => {
      const mb = document.getElementById('modalbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, T = window.__yaoshi3d.tray;
      for (let y = H - 8; y > 0; y -= 6) for (let x = 8; x < W; x += 6) {
        if (x >= mb.left - 4 && x <= mb.right + 4 && y >= mb.top - 4 && y <= mb.bottom + 4) continue;
        let i = -1; try { i = T.hitTest((x / W) * 2 - 1, -((y / H) * 2 - 1)); } catch (e) { /* 量不到 */ }
        if (i >= 0 && document.elementFromPoint(x, y) === document.getElementById('modal')) return [x, y, i];
      }
      return null;
    });
    assert.ok(p, '量測沒成立：找不到落在背景上、底下是托盤格的點');
    assert.equal(await s.page.evaluate(() => TRAY_PHASE), 'bid', '量測沒成立：不在出價頁');
    await tap(s.page, p);
    await s.page.waitForTimeout(120);
    await tap(s.page, p);
    await s.page.waitForTimeout(700);
    const r = await snap(s.page);
    assert.ok(r.calls.includes('closeModal()'), '量測沒成立：第一下沒有關掉視窗');
    const dt = gapOk(r, 1, 2, 'V2c');
    console.log(`V2c 落點 ${p}、相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、出價視窗 ${r.sheet}`);
    assert.deepEqual(r.calls.filter((c) => /^openSheet\(/.test(c)), [], '第二下打開了出價視窗');
    assert.equal(r.sheet, false);
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test('V4 844×390 自己袋子裡按「送神回天」不算關閉：150ms 後點背景照樣被吞、視窗還開著', { timeout: 90000 }, async () => {
  const s = await open({ size: [844, 390] });
  try {
    await s.page.evaluate(() => { const me = window.__yaoshi.S.players[0]; me.bag.push({ ...LEGENDS[0], legend: true }); });
    await reset(s.page);
    await openBy(s.page, '自己的袋子');
    await s.page.evaluate(() => document.querySelector('#modalbox .tithebtn')?.scrollIntoView({ block: 'nearest' }));
    await s.page.waitForTimeout(200);
    const tb = await s.page.evaluate(() => { const b = document.querySelector('#modalbox .tithebtn'); if (!b) return null; const q = b.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; });
    assert.ok(tb, '量測沒成立：自己的袋子沒有「送神回天」鈕');
    await tap(s.page, tb);
    await s.page.waitForTimeout(150);
    await tap(s.page, [s.W - 10, Math.round(s.H / 2)]);
    await s.page.waitForTimeout(700);
    const r = await snap(s.page);
    assert.equal(r.calls.filter((c) => /^giveUpLegend\(/.test(c)).length, 1, `量測沒成立：送神回天沒有按到一次（${JSON.stringify(r.calls)}）`);
    const dt = gapOk(r, 1, 2, 'V4');
    console.log(`V4 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、視窗 ${r.modal}`);
    assert.equal(r.modal, true, '送神回天之後馬上點背景，視窗被關掉了（視窗裡的切換被當成關閉）');
    assert.ok(!r.calls.slice(r.calls.findIndex((c) => /^giveUpLegend\(/.test(c)) + 1).includes('closeModal()'));
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test('V5 844×390 用鍵盤（Enter）關掉別人的袋子：沒有座標，照舊整層吸收，150ms 後點座位 2 被吞', { timeout: 90000 }, async () => {
  const s = await open({ size: [844, 390] });
  try {
    await reset(s.page);
    await openBy(s.page, '別人的袋子');
    await s.page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); bs[bs.length - 1].focus(); });
    await s.page.keyboard.press('Enter');
    await s.page.waitForTimeout(150);
    await tap(s.page, await pointOf(s.page, '#seat2', 0.35, 0.6));
    await s.page.waitForTimeout(700);
    const r = await snap(s.page);
    assert.ok(r.calls.includes('closeModal()'), `量測沒成立：Enter 沒有關掉視窗（${JSON.stringify(r.calls)}）`);
    assert.ok(r.clk[1] && r.clk[1].x === 0 && r.clk[1].y === 0, `量測沒成立：關閉那一下不是沒有座標的鍵盤點擊（${JSON.stringify(r.clk[1])}）`);
    const dt = gapOk(r, 1, 2, 'V5');
    console.log(`V5 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}`);
    assert.ok(!r.calls.includes('showBag(2)'), '鍵盤關掉之後 150ms 點座位 2 被放行了');
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test('V6 844×390 供奉詢問（不是只能看的視窗）：按「要，繼續供奉」後 150ms 點座位 2 照舊被吞', { timeout: 90000 }, async () => {
  const s = await open({ size: [844, 390] });
  try {
    await driveTo(s.page, /蓋牌/, 'V6 出價頁');
    await s.page.waitForTimeout(1500);
    await reset(s.page);
    await s.page.evaluate(() => {
      const S = window.__yaoshi.S, item = { ...LEGENDS[0], legend: true };
      S.players[0].bag.push(item); S.titheAsk = [{ pid: 0, item: item.n }];
      window.__titheDone = 0; showTitheAsk().then(() => { window.__titheDone = 1; });
    });
    await s.page.waitForTimeout(900);
    await tap(s.page, await pointOf(s.page, '#titheKeep'));
    await s.page.waitForTimeout(150);
    await tap(s.page, await pointOf(s.page, '#seat2', 0.35, 0.6));
    await s.page.waitForTimeout(700);
    const r = await snap(s.page);
    const done = await s.page.evaluate(() => window.__titheDone);
    assert.equal(done, 1, '量測沒成立：「要，繼續供奉」沒有收掉詢問');
    const dt = gapOk(r, 0, 1, 'V6');
    console.log(`V6 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}`);
    assert.ok(!r.calls.includes('showBag(2)'), '供奉詢問收掉之後 150ms 點座位 2 被放行了（非只能看的視窗也被放寬）');
    assert.deepEqual(s.errors, []);
  } finally { await s.close(); }
});

test('V7 「只能看」的標記只出現在五個視窗：showBag 三種、showRoleInfo、openHelp', () => {
  const src = fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8');
  const fnStarts = [...src.matchAll(/\nfunction ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => [m.index, m[1]]);
  /* 任何 HTML 標籤上的 data-viewonly（不限 h2；標籤與屬性要在同一行——註解與判斷式裡的字面不算），歸屬到它所在的頂層函式 */
  const owners = [...src.matchAll(/<[a-zA-Z][a-zA-Z0-9]*\b[^<>\n]*\bdata-viewonly\b/g)].map((m) => { let o = null; for (const [i, n] of fnStarts) { if (i < m.index) o = n; else break; } return o; });
  assert.deepEqual(owners.sort(), ['openHelp', 'showBag', 'showBag', 'showBag', 'showRoleInfo'], `data-viewonly 出現在：${JSON.stringify(owners)}`);
});
