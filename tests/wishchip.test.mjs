// v0.65.6 心願標籤實頁斷言（http.server＋Playwright 開真的 index.html，solo、3D 桌 hollow 態、該夜有心願）。
// 驗收條件（動手前凍結於派工 prompt；基準數字見 BASE_HEAD_H，來自改前 origin/main db281fa9 同一支量測碼實測）：
//   A  三個橫向視窗：#feltHead 高度 < 改前；預設心願標籤高度 ≤22px；#feltHead 內不新增第三列（列數≤2）。
//   B  點標籤→完整文案可見且不截斷；展開前後 #feltHead／#felt 高度不變；再點／點別處／6 秒後皆收回。
//   C  熱座交棒重畫（setFeltPrivateContext 連呼叫兩次）後 DOM 只剩一個 .wishbar、且是當前玩家的。
// 對舊版跑同一支：YAOSHI_RENDER_ROOT=<舊版 worktree>（舊版應紅在 A／B 的行為斷言）。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const PORT = 9761;
const VIEWPORTS = [[844, 390], [667, 375], [932, 430]];
/* 改前（origin/main db281fa9）在各視窗、solo seed 1、出價頁的實測 #feltHead 高度（px）；由 YAOSHI_PRINT=1 對舊版印出。 */
const BASE_HEAD_H = { '844x390': 50, '667x375': 92, '932x430': 45 };

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
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

/* 進到「該夜有心願」的出價頁（盯上頁按 pickMark 進入）。 */
async function toBidWithWish(page) {
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  await page.waitForSelector('#table.on');
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { mark: !!b && b.textContent.includes('不盯'), disabled: !b || b.disabled }; });
    if (st.mark) break;
    if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((el) => !el.disabled)?.click());
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'), null, { timeout: 30000 });
  await page.evaluate(() => pickMark(2));
  await page.waitForTimeout(700);
  const has = await page.evaluate(() => !!document.querySelector('#feltHead .wishbar'));
  assert.ok(has, '出價頁 #feltHead 內應有心願條（seed 1、solo）');
}

const HEAD = `(() => {
  const h = document.getElementById('feltHead'), f = document.getElementById('felt');
  const hr = h.getBoundingClientRect(), fr = f.getBoundingClientRect();
  const kids = [...h.children].filter((el) => el.getBoundingClientRect().height > 0 && getComputedStyle(el).position !== 'absolute');
  /* 列數＝垂直區間互相重疊的子元素併成一列（flex 置中對齊時同列子元素的 top 不同，不能直接數 top） */
  const iv = kids.map((el) => { const r = el.getBoundingClientRect(); return [r.top, r.bottom]; }).sort((a, b) => a[0] - b[0]);
  const tops = []; for (const [t, b] of iv) { const last = tops[tops.length - 1]; if (last && t < last[1] - 1) last[1] = Math.max(last[1], b); else tops.push([t, b]); }
  const w = h.querySelector('.wishbar'), wr = w && w.getBoundingClientRect();
  return { headH: hr.height, feltH: fr.height, rows: tops.length, wishH: wr ? wr.height : null, wishText: w ? w.textContent : null,
    chip: !!(w && w.classList.contains('wishchip')) };
})()`;

test('A 三個橫向視窗：標籤 ≤22px、不新增第三列、#feltHead 比改前矮', async () => {
  await withPage(async (page) => {
    await toBidWithWish(page);
    const got = {};
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(500);
      got[`${w}x${h}`] = await page.evaluate(HEAD);
    }
    if (process.env.YAOSHI_PRINT) console.log('MEASURE ' + JSON.stringify(got));
    for (const k of Object.keys(got)) {
      const g = got[k];
      assert.ok(g.wishH !== null && g.wishH <= 22, `${k} 預設心願標籤高度 ${g.wishH} 應 ≤22`);
      assert.ok(g.rows <= 2, `${k} #feltHead 列數 ${g.rows} 應 ≤2（不新增第三列）`);
      assert.ok(g.headH < BASE_HEAD_H[k], `${k} #feltHead 高度 ${g.headH} 應小於改前 ${BASE_HEAD_H[k]}`);
    }
  });
});

test('B 點開完整文案、浮層不改版面高度、三種收回', async () => {
  await withPage(async (page) => {
    await toBidWithWish(page);
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(500);
      const k = `${w}x${h}`;
      const before = await page.evaluate(HEAD);
      const sel = '#feltHead .wishbar';
      /* 用真實座標點擊（不用 locator.click——舊版節點 pointer-events:none 會 timeout，變成旁枝錯誤而不是行為斷言） */
      const tap = async () => { const c = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); await page.mouse.click(c[0], c[1]); };
      const isOpen = () => page.evaluate((s) => { const e = document.querySelector(s); const full = e && e.querySelector('.wishFull'); return !!e && e.classList.contains('open') && !!full && full.getBoundingClientRect().height > 0; }, sel);
      assert.equal(await isOpen(), false, `${k} 預設應收合`);
      await tap();
      assert.equal(await isOpen(), true, `${k} 點標籤後應展開`);
      const open = await page.evaluate((s) => {
        const full = document.querySelector(s + ' .wishFull'), r = full.getBoundingClientRect();
        return { text: full.textContent, sw: full.scrollWidth, cw: full.clientWidth, sh: full.scrollHeight, ch: full.clientHeight, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight };
      }, sel);
      assert.match(open.text, /今夜心願（僅你可見）：.+｜.+/, `${k} 展開後應含名稱與 desc`);
      assert.ok(open.sw <= open.cw && open.sh <= open.ch, `${k} 文案不截斷 sw/cw=${open.sw}/${open.cw} sh/ch=${open.sh}/${open.ch}`);
      assert.ok(open.l >= 0 && open.r <= open.vw && open.b <= open.vh, `${k} 浮層在視窗內 ${JSON.stringify(open)}`);
      const during = await page.evaluate(HEAD);
      assert.equal(during.headH, before.headH, `${k} 展開不得改 #feltHead 高度`);
      assert.equal(during.feltH, before.feltH, `${k} 展開不得改 #felt 高度`);
      await tap(); // 再點收回
      assert.equal(await isOpen(), false, `${k} 再點應收回`);
      await tap();
      assert.equal(await isOpen(), true);
      await page.mouse.click(5, h - 5); // 點別處
      assert.equal(await isOpen(), false, `${k} 點別處應收回`);
      await tap();
      assert.equal(await isOpen(), true);
      await page.waitForTimeout(6300); // 6 秒自動收回
      assert.equal(await isOpen(), false, `${k} 6 秒後應自動收回`);
    }
  });
});

test('C 熱座交棒重畫後只剩當前玩家的心願條', async () => {
  await withPage(async (page) => {
    await toBidWithWish(page);
    const r = await page.evaluate(() => {
      const ids = Object.keys(WISHES);
      const P = window.__yaoshi.S.players;
      P[0].wish = { id: ids[0] }; P[1].wish = { id: ids[1] };
      setFeltPrivateContext(P[0], true);
      setFeltPrivateContext(P[1], true);
      const all = [...document.querySelectorAll('.wishbar')];
      return { n: all.length, inHead: document.querySelectorAll('#feltHead .wishbar').length, text: all.map((e) => e.textContent),
        n0: WISHES[ids[0]].name, n1: WISHES[ids[1]].name };
    });
    assert.equal(r.n, 1, '整頁 .wishbar 只剩一個');
    assert.equal(r.inHead, 1);
    assert.ok(r.text[0].includes(r.n1), '是當前（第二位）玩家的');
    assert.ok(!r.text[0].includes(r.n0), '不殘留上一位玩家的心願名');
  });
});

if (SHOT_DIR) test('截圖', async () => {
  await withPage(async (page) => {
    await toBidWithWish(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(600);
    const base = path.join(SHOT_DIR, process.env.YAOSHI_SHOT_NAME || 'shot');
    await page.screenshot({ path: base + '-collapsed.png' });
    const c = await page.evaluate(() => { const r = document.querySelector('#feltHead .wishbar').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(c[0], c[1]);
    await page.waitForTimeout(300);
    await page.screenshot({ path: base + '-open.png' });
  });
});
