// v0.65.7 H2＋M1 實頁驗收（凍結檔 docs/experiments/2026-10-11-h2-cards/acceptance-h2.md）。
// http.server＋Playwright Chromium 開真的 index.html，一個瀏覽器、一個頁面，依序量測；全部是行為斷言（rect／elementFromPoint／可見性／文字）。
//   #1 三尺寸（844×390、667×375、932×430）下：教學卡 4 頁、全部 8 種異事輸入頁、局末卡、夜行錄章末卡（過關＋未過關），
//      每顆可點動作鈕的 getBoundingClientRect 完整落在 #felt 可視矩形內，且 elementFromPoint(鈕中心) 命中該鈕。量的是「捲到頂的初始狀態」。
//   #2 #felt 可捲時：存在可見的「▾ 還有」；捲到底後不可見；不可捲時不顯示。
//   #3 異事輸入頁 #mainbtn 不含「進入下一夜」。
//   #4 M1：交卷後（夜末）與局末，#budget 不含「壽命 N」。
// 基準對照：YAOSHI_RENDER_ROOT=<舊版 worktree> 對舊版 index.html 跑同一份（舊版應紅在 #1／#2／#3／#4 的行為斷言）。
// 瀏覽器規矩：一次只開一個 chromium；本檔只開一個。YAOSHI_SHOT_DIR=<目錄> 時另存每個畫面的截圖。
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_H2_PORT || 9761);
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const SIZES = [[844, 390], [667, 375], [932, 430]];

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}

/* 頁內量測：卡內每顆可見按鈕 → rect 是否完整在 #felt 內、中心點是否命中；另量 #felt 可捲狀態與「▾ 還有」可見性。 */
const MEASURE = `(() => {
  const felt = document.getElementById('felt'), fr = felt.getBoundingClientRect(), T = 0.5;
  const card = document.querySelector('#stage .stageCard');
  const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const btns = card ? [...card.querySelectorAll('button')].filter(vis) : [];
  const rows = btns.map((b) => {
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return { text: (b.textContent || '').trim().slice(0, 14), inside: r.top >= fr.top - T && r.bottom <= fr.bottom + T && r.left >= fr.left - T && r.right <= fr.right + T,
      bottomOver: +(r.bottom - fr.bottom).toFixed(1), hit: !!top && (top === b || b.contains(top) || top.contains(b) && top !== document.body && top.tagName !== 'HTML' && top.id !== 'felt') };
  });
  const hints = card ? [...card.querySelectorAll('.moreHint')] : [];
  const hintVisible = () => hints.some((h) => vis(h));
  const scrollable = felt.scrollHeight - felt.clientHeight > 4;
  const out = { n: btns.length, rows, scrollable, hintCount: hints.length, hintTop: hintVisible(), feltH: Math.round(fr.height), scrollH: felt.scrollHeight, mainbtn: document.getElementById('mainbtn').textContent, budget: (document.getElementById('budget') || {}).textContent || '' };
  felt.scrollTop = felt.scrollHeight; felt.dispatchEvent(new Event('scroll'));
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => { out.hintBottom = hintVisible(); felt.scrollTop = 0; felt.dispatchEvent(new Event('scroll')); res(out); })));
})()`;

let srv, browser, RES = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  const { chromium } = loadPlaywright();
  srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await wait(900);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  const shot = async (name) => { if (SHOT_DIR) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); } };
  const measure = async (key, name) => { await wait(450); RES[key] = await page.evaluate(MEASURE); await shot(name || key.replace(/[^\w-]/g, '_')); };
  RES.errs = errs;

  for (const [w, h] of SIZES) {
    const sz = `${w}x${h}`;
    await page.setViewportSize({ width: w, height: h }); await wait(300);
    /* 教學卡 4 頁（沒看過教學的新局） */
    await page.evaluate(() => { try { localStorage.removeItem('yaoshi_intro_v1'); } catch (e) {} window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await wait(500);
    for (let k = 0; k < 4; k++) {
      await measure(`intro${k + 1}@${sz}`);
      if (k < 3) await page.evaluate(() => window.__introNext && window.__introNext());
    }
    await page.evaluate(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    /* 全部異事的輸入頁 */
    const evIds = await page.evaluate(() => Object.keys(EVENTS));
    for (const id of evIds) {
      await page.evaluate((i) => { window.__yaoshi.newGame('solo', 1, ['qingmian']); startEventUI(EVENTS[i]); }, id);
      await measure(`event-${id}@${sz}`);
    }
    /* 局末卡（常規局）：先讓底列有出價摘要，再直接 endGame（我方壽命設 0，對應報告「大字 0」） */
    await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await wait(600);
    await page.evaluate(() => { const S = window.__yaoshi.S; myBids[0] = { amt: 5, type: 'cons', intent: 'keep', target: null }; updateBudget(); S.players[0].life = 0; S.players[0].alive = false; endGame(); });
    await measure(`end@${sz}`);
    /* 夜行錄章末卡：過關（讀殘卷）與未過關（再挑戰） */
    for (const mode of ['pass', 'fail']) {
      await page.evaluate((m) => {
        window.__yaoshi.newGame('solo', 1, ['hongyi'], { chapter: 1 });
        const Y = window.__yaoshi, S = Y.S, ch = Y.nwChapter(S.chapter);
        const me = S.players.find((p) => !p.ai), boss = S.players.find((p) => p.ai && p.roleId === ch.boss);
        if (m === 'pass') { boss.alive = false; boss.life = 0; me.alive = true; me.life = Math.max(me.life, 5); } else { me.alive = false; me.life = 0; }
        endGame();
      }, mode);
      await measure(`nwend-${mode}@${sz}`);
    }
  }
  /* M1 夜末：交卷後底列 */
  await page.setViewportSize({ width: 844, height: 390 }); await wait(300);
  await page.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  await wait(700);
  RES.m1Before = await page.evaluate(() => { myBids[0] = { amt: 5, type: 'cons', intent: 'keep', target: null }; updateBudget(); return document.getElementById('budget').textContent; });
  RES.m1After = await page.evaluate(() => { submitHumanBids(); return { text: document.getElementById('budget').textContent, life: window.__yaoshi.S.players[0].life }; });
  await wait(300);
  RES.errs = errs;
});

after(async () => { try { await browser?.close(); } catch (e) { /* */ } try { srv?.kill(); } catch (e) { /* */ } });

const keys = (re) => Object.keys(RES).filter((k) => re.test(k));

test('#1 三尺寸下每個畫面的動作鈕完整落在 #felt 內且中心點命中該鈕', () => {
  const bad = [];
  for (const k of keys(/@/)) {
    const r = RES[k];
    if (!r.n) { bad.push(`${k}: 找不到任何可見按鈕`); continue; }
    r.rows.forEach((b) => { if (!b.inside || !b.hit) bad.push(`${k}「${b.text}」inside=${b.inside}（超出底緣 ${b.bottomOver}px）hit=${b.hit}`); });
  }
  assert.equal(keys(/@/).length, 3 * (4 + 8 + 1 + 2), '量測畫面數（3 尺寸×(教學4＋異事8＋局末1＋章末2)）');
  assert.deepEqual(bad, [], `鈕被切掉或被蓋住：\n${bad.join('\n')}`);
});

test('#2 卡片可捲時有「▾ 還有」，捲到底後消失；不可捲時不顯示', () => {
  const bad = [];
  let scrollableN = 0;
  for (const k of keys(/@/)) {
    const r = RES[k];
    if (r.scrollable) { scrollableN++; if (!r.hintTop) bad.push(`${k}: 可捲（scrollH ${r.scrollH} > feltH ${r.feltH}）但沒有可見的「▾ 還有」（元素數 ${r.hintCount}）`); if (r.hintBottom) bad.push(`${k}: 捲到底後提示仍可見`); }
    else if (r.hintTop) bad.push(`${k}: 不可捲卻顯示提示`);
  }
  assert.ok(scrollableN > 0, '活性：至少要有一個畫面真的可捲（否則這條沒被行使過）');
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('#3 異事輸入頁主鈕不留「進入下一夜」', () => {
  const bad = keys(/^event-/).filter((k) => /進入下一夜/.test(RES[k].mainbtn));
  assert.equal(keys(/^event-.*@844x390$/).length, 8);
  assert.deepEqual(bad, [], `主鈕字殘留：${bad.map((k) => k + '=' + RES[k].mainbtn).join('；')}`);
});

test('#4 M1：交卷後（夜末）與局末，底列不含「壽命 N」', () => {
  assert.match(RES.m1Before, /壽命\s*\d+/, '活性：交卷前底列確有「壽命 N」');
  assert.ok(!/壽命\s*\d+/.test(RES.m1After.text), `交卷後底列殘留：${RES.m1After.text}`);
  const endBad = keys(/^end@/).filter((k) => /壽命\s*\d+/.test(RES[k].budget));
  assert.deepEqual(endBad, [], `局末底列殘留：${endBad.map((k) => RES[k].budget).join('；')}`);
});

test('頁面無未捕捉錯誤', () => { assert.deepEqual(RES.errs, []); });
