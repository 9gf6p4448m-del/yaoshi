// UX 檢視 H3＋M3＋M4＋M9 實頁驗收（凍結檔 docs/experiments/2026-10-11-acceptance-h3-affordance.md）。
// http.server＋Playwright Chromium 開真的 index.html，一次只開一個瀏覽器。
// 基準對照：YAOSHI_RENDER_ROOT=<db281fa9 的 worktree> 可對舊版 index.html 跑同一份測試（V1：須紅在行為斷言）。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_H3_PORT || 9761);
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const SIZES = [[844, 390], [667, 375], [932, 430]];

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

/** 開一個頁面走到第 1 夜出價頁（窄籤出現、3D 載好）。fn(page, errs)。 */
async function withMarket(size, fn, { stake = false } = {}) {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  /* 伺服器要真的聽了才開頁（ERR_CONNECTION_REFUSED 的教訓）：輪詢到能連為止，最多 15 秒 */
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console:' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.waitForFunction(() => !!document.getElementById('mainbtn'), null, { timeout: 30000 });
    if (stake) await page.evaluate(() => { S.nightRule = NIGHTRULES.yabao; });
    await page.evaluate(() => { if (S.marks && S.marks[ACTIVE] === undefined) pickMark(null); else showMarket(); });
    await page.waitForFunction(() => document.querySelectorAll('.railTabs button').length >= 2, null, { timeout: 30000 });
    await page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    await page.waitForTimeout(800);
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

const rectOf = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }; }, sel);
const tabRects = (page) => page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => { const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)); }));

for (const size of SIZES) {
  test(`H3-a ${size.join('×')}：窄籤含 ›、點過變實心（seen＋底色改變）、別枚不變、不超出欄寬`, { timeout: 150000 }, async () => {
    await withMarket(size, async (page) => {
      const info = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => {
        const rail = b.closest('.rail') || b.closest('#railW,#railE'), rr = rail.getBoundingClientRect(), r = b.getBoundingClientRect();
        return { arr: (b.querySelector('.tabArr') || {}).textContent || null, h: r.height, overflow: r.right - rr.right > 1 || rr.left - r.left > 1, bg: getComputedStyle(b).backgroundColor, seen: b.classList.contains('seen') };
      }));
      assert.ok(info.length >= 2);
      for (const [i, t] of info.entries()) { assert.ok(t.arr && t.arr.includes('›'), `籤 ${i} 沒有 ›（元素缺失）`); assert.ok(t.h >= 40, `籤 ${i} 高度 ${t.h}`); assert.ok(!t.overflow, `籤 ${i} 超出欄寬`); assert.equal(t.seen, false); }
      await page.click('#railW .railTabs button[data-slot="0"]');
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ bg: getComputedStyle(b).backgroundColor, seen: b.classList.contains('seen'), exp: b.getAttribute('aria-expanded') })));
      assert.equal(after[0].seen, true, '點過的籤沒有 seen');
      assert.equal(after.slice(1).some((a) => a.seen), false, '別枚籤被標成 seen');
      /* 底色改變要與「展開態」無關：把 aria-expanded 拿掉再量（鑑賞中 expanded 本來就會換底色，不能拿它當證據） */
      await page.evaluate(() => document.querySelector('.railTabs button[data-slot="0"]').setAttribute('aria-expanded', 'false'));
      const bgSeen = await page.evaluate(() => getComputedStyle(document.querySelector('.railTabs button[data-slot="0"]')).backgroundColor);
      assert.notEqual(bgSeen, info[0].bg, '點過後底色與點前相同（沒有「實心」變化）');
      assert.equal(info[1].bg, after[1].bg, '沒點過的籤底色變了');
    });
  });
}

test('H3-b 鑑賞頁首次提示：出現 2.0–3.5 秒內消失、不攔事件；同局第二次不出現；換局重置', { timeout: 150000 }, async () => {
  await withMarket([844, 390], async (page) => {
    await page.click('#railW .railTabs button[data-slot="0"]');
    await page.waitForFunction(() => !!document.getElementById('apprHint'), null, { timeout: 2000 }).catch(() => { throw new Error('第一次進鑑賞頁沒有出現 #apprHint（元素缺失）'); });
    const t0 = Date.now();
    const h = await page.evaluate(() => { const e = document.getElementById('apprHint'); return { text: e.textContent, pe: getComputedStyle(e).pointerEvents }; });
    assert.match(h.text, /點空白返回/); assert.match(h.text, /左右滑換件/); assert.equal(h.pe, 'none');
    await page.waitForTimeout(1900);
    assert.equal(await page.evaluate(() => !!document.getElementById('apprHint')), true, '出現不到 2 秒就消失（一閃即逝）');
    await page.waitForFunction(() => !document.getElementById('apprHint'), null, { timeout: 2500 }).catch(() => { throw new Error('提示超過 3.5 秒仍在'); });
    const dur = Date.now() - t0; assert.ok(dur >= 1900 && dur <= 3500 + 300, `提示持續約 ${dur}ms`);
    /* 同局第二次進入：先退出再點另一枚 */
    await page.evaluate(() => closeAppraise());
    await page.waitForTimeout(300);
    await page.click('#railW .railTabs button[data-slot="1"]');
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => !!document.getElementById('apprHint')), false, '同局第二次進入又出現提示');
    /* 換局重置 */
    await page.evaluate(() => { closeAppraise(); window.__yaoshi.newGame('solo', 2, ['qingmian']); });
    await page.evaluate(() => { if (S.marks && S.marks[ACTIVE] === undefined) pickMark(null); else showMarket(); });
    await page.waitForFunction(() => document.querySelectorAll('.railTabs button').length >= 2, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.click('#railW .railTabs button[data-slot="0"]');
    await page.waitForFunction(() => !!document.getElementById('apprHint'), null, { timeout: 2000 }).catch(() => { throw new Error('換局後沒有重新提示'); });
  });
});

for (const size of SIZES) {
  test(`M3 ${size.join('×')}：北列箭頭 ≥14px、收起 ▾ 無旋轉、展開後向上（rotate 180°）`, { timeout: 150000 }, async () => {
    await withMarket(size, async (page) => {
      const a = await page.evaluate(() => { const e = document.querySelector('#north .nsumArr'); const s = getComputedStyle(e); return { fs: parseFloat(s.fontSize), tx: s.transform, t: e.textContent }; });
      assert.ok(a.fs >= 14, `北列箭頭字級 ${a.fs}px`);
      assert.equal(a.t, '▾'); assert.ok(a.tx === 'none' || /^matrix\(1, 0, 0, 1,/.test(a.tx), '收起時箭頭被旋轉：' + a.tx);
      await page.evaluate(() => toggleNorth(true)); await page.waitForTimeout(250);
      const b = await page.evaluate(() => getComputedStyle(document.querySelector('#north .nsumArr')).transform);
      const m = b.match(/matrix\(([^)]+)\)/); assert.ok(m, '展開後無 transform'); const v = m[1].split(',').map(Number);
      assert.ok(v[3] < 0, '展開後箭頭沒有朝上：' + b);
    });
  });
}

test('M3 押寶面板：展開狀態的收起鈕是 ▴、收合狀態的展開箭頭是 ▾', { timeout: 150000 }, async () => {
  await withMarket([844, 390], async (page) => {
    await page.evaluate(() => ybCollapse(false)); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => (document.querySelector('.stakebar .stakeCol') || {}).textContent || null), '▴', '展開面板的收起鈕不是 ▴（或元素缺失）');
    await page.evaluate(() => ybCollapse(true)); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => (document.querySelector('.stakebar.collapsed .stakeArr') || {}).textContent || null), '▾', '收合面板的展開箭頭不是 ▾（或元素缺失）');
  }, { stake: true });
});

for (const size of SIZES) {
  test(`M4 ${size.join('×')}：出價後窄籤有「押 N」、盯上後有 👁、未標的沒有；#felt 與每枚籤矩形不變`, { timeout: 150000 }, async () => {
    await withMarket(size, async (page) => {
      const before = { felt: await rectOf(page, '#felt'), tabs: await tabRects(page), badges: await page.evaluate(() => document.querySelectorAll('.tabbid,.tabmark').length) };
      assert.equal(before.badges, 0);
      /* 真實路徑：開出價視窗 → 改金額 → closeSheet（它只換單張卡、不重畫窄籤；用 showMarket 會掩蓋這個缺口） */
      await page.evaluate(() => { openSheet(0); myBids[0].amt = 3; closeSheet(); });
      await page.waitForTimeout(300);
      const bid = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => (b.querySelector('.tabbid') || {}).textContent || null));
      assert.equal(bid[0], '押 3', '槽 0 窄籤沒有「押 3」：' + JSON.stringify(bid));
      assert.equal(bid.slice(1).filter(Boolean).length, 0, '別槽被標了：' + JSON.stringify(bid));
      const afterBid = { felt: await rectOf(page, '#felt'), tabs: await tabRects(page) };
      const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 0.5);
      assert.ok(same([before.felt.x, before.felt.y, before.felt.w, before.felt.h], [afterBid.felt.x, afterBid.felt.y, afterBid.felt.w, afterBid.felt.h]), '#felt 矩形變了');
      assert.ok(before.tabs.every((t, i) => same(t, afterBid.tabs[i])), '窄籤矩形變了（標記推了版面）');
      await page.evaluate(() => { myBids[0].amt = 0; S.marks = S.marks || {}; S.marks[ACTIVE] = 1; showMarket(); });
      await page.waitForTimeout(300);
      const mk = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => !!b.querySelector('.tabmark')));
      assert.deepEqual(mk.map((v, i) => [i, v]).filter(([, v]) => v).map(([i]) => i), [1], '盯上槽 1 的窄籤標記不對：' + JSON.stringify(mk));
      const afterMk = await tabRects(page);
      assert.ok(before.tabs.every((t, i) => same(t, afterMk[i])), '盯上標記推了窄籤版面');
    });
  });
}

for (const size of [[844, 390], [667, 375]]) {
  test(`M9 ${size.join('×')}：押寶夜面板預設收合、底緣 ≤ 3D 拍品區頂端；展開仍可用；換夜仍預設收合`, { timeout: 150000 }, async () => {
    await withMarket(size, async (page) => {
      const st = await page.evaluate(() => { const e = document.querySelector('.stakebar'); return e ? { collapsed: e.classList.contains('collapsed'), exp: e.getAttribute('aria-expanded'), text: e.textContent } : null; });
      assert.ok(st, '押寶夜沒有 .stakebar（前提不成立）');
      assert.equal(st.collapsed, true, '押寶面板預設不是收合'); assert.match(st.text, /押寶/);
      /* 3D 拍品區頂端：lotNodes 各節點的世界包圍盒 8 角投影到螢幕，取 min top（實測數字） */
      const geo = await page.evaluate(() => {
        const Y = window.__yaoshi3d, cam = Y.camera, nodes = Y.tray.lotNodes(), V = cam.position.constructor, t = new V();
        let top = 1e9, n = 0;
        for (const root of nodes) { root.updateWorldMatrix(true, true); root.traverse((o) => { if (!o.isMesh || !o.geometry) return; for (let p = o; p; p = p.parent) if (!p.visible) return; const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox; for (let i = 0; i < 8; i++) { t.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld).project(cam); if (t.z < -1 || t.z > 1) continue; top = Math.min(top, (1 - t.y) / 2 * innerHeight); n++; } }); }
        const r = document.querySelector('.stakebar').getBoundingClientRect();
        return { lotTop: top, pts: n, barBottom: r.bottom, barTop: r.top };
      });
      assert.ok(geo.pts > 0, '量不到 3D 拍品（前提不成立）');
      assert.ok(geo.barBottom <= geo.lotTop + 0.5, `收合面板底緣 ${geo.barBottom.toFixed(1)} 仍蓋住拍品區頂端 ${geo.lotTop.toFixed(1)}（${JSON.stringify(geo)}）`);
      await page.click('.stakebar.collapsed');
      await page.waitForTimeout(300);
      const open = await page.evaluate(() => ({ stepper: !!document.querySelector('.stakebar .stepper'), type: !!document.querySelector('.stakebar .typebtn'), col: !!document.querySelector('.stakebar .stakeCol'), amt: YB.amt }));
      assert.ok(open.stepper && open.type && open.col, '展開後缺控件：' + JSON.stringify(open));
      await page.evaluate(() => ybBump(1)); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => YB.amt), open.amt + 1, '展開後金額沒有 +1');
      /* 換夜（YB 重建）仍預設收合 */
      await page.evaluate(() => { YB = null; S.nightRule = NIGHTRULES.yabao; pickMark(null); });
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => !!document.querySelector('.stakebar.collapsed')), true, 'YB 重建後沒有預設收合');
    }, { stake: true });
  });
}
