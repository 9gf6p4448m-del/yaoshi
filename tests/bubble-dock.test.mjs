// v0.65.5 對白泡「固定停靠」實頁斷言（取代 tests/bubble-nooverlap.test.mjs 的「掛座位旁」做法；驗收條件凍結檔 acceptance-yaoshi-bubble-dock.md）。
// http.server（動態埠、輪詢等就緒、比對回傳的 index.html 就是 SRV_ROOT 那份）＋Playwright Chromium 開真的 index.html。
// 「真流程」：只點 #mainbtn／事件鈕（卡住才點事件面板按鈕），不改 S.round；玩到第 1、3、4、7 夜，在 出價／揭盅／事件 各階段取樣
// （對決階段 #duel z-index:40 蓋住座位層，泡本來就看不到，不取樣）。每次取樣讓北／西／東三席同時說 8／14／19 字（≥844 寬再加西／東 40 字）：
//   P1 位置：泡 rect 完全落在該視窗的對應停靠矩形內（西＝左欄卡下方、東＝右欄卡下方、北＝底列上方中央橫帶；667 窄橫式北泡＝北席自家座位卡內）。
//   P2 零交集：泡 rect ∩（所有可見 DOM 文字的 Range rect、按鈕、？鈕、側欄卡外框、座位卡外框、底列外框）面積＝0
//      （667 北泡疊在自家座位卡內，北席座位卡的文字與外框不計）。
//   P3 辨識：泡的 ::after 小標內容＝data-who＝「方位・角色名」且與該席實際角色名一致，小標文字寬不超出泡內容寬（不截字）；角色色邊仍在（D）。
//   P4 14px、整顆在視窗內、pointer-events:none、泡內文字 Range 完全在泡外框內（不截字）。
// 40 字（北席不列硬條件）：西／東在 ≥844 寬須零交集且不截字。
// 基準對照：YAOSHI_RENDER_ROOT=<018e950d 的 worktree> 跑同一份測試（舊版應紅在 P1 不在停靠矩形／P2 交集>0／P3 沒有小標）。
// 截圖：YAOSHI_SHOT_DIR=<目錄>（每視窗每夜的出價階段 19 字一張）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const TARGET_NIGHTS = [1, 3, 4, 7];
const TEXTS = { 8: '看我的厲害吧哈哈', 14: '各位客官這口價我跟定了啦啦啦', 19: '各位客官這口價我跟定了不放手啦啦啦啦啦啦', 40: '這是一句四十字的最壞情況長對白用來檢查泡會不會遮住牌桌上的文字區或按鈕或卡片啦啦啦啦' };
for (const [n, t] of Object.entries(TEXTS)) { TEXTS[n] = Array.from(t).slice(0, +n).join(''); assert.equal(Array.from(TEXTS[n]).length, +n, `測試句 ${n} 字長度不對`); }

// 停靠矩形（妖市3 量測：真流程第 1/3/4/7 夜聯集後的穩定空白；l,t,r,b）
const VIEWPORTS = [
  { w: 844, h: 390, W: [0, 202, 205, 324], E: [639, 202, 844, 324], N: [205, 275, 639, 324] },
  { w: 852, h: 393, W: [0, 202, 209, 327], E: [643, 202, 852, 327], N: [209, 275, 643, 327] },
  { w: 932, h: 430, W: [0, 202, 249, 364], E: [683, 202, 932, 364], N: [249, 275, 683, 364] },
  { w: 667, h: 375, W: [0, 202, 172, 309], E: [495, 202, 667, 309], N: null }, // 北＝自家座位卡內
];

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

async function withPage(vp, fn) {
  const { chromium } = loadPlaywright();
  const port = await freePort();
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}/index.html`;
  const want = fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8');
  let served = null; // 輪詢等就緒，並確認回來的是 SRV_ROOT 那份
  for (let i = 0; i < 60 && served === null; i++) { try { const r = await fetch(url); if (r.ok) served = await r.text(); } catch (e) { /* 還沒起來 */ } if (served === null) await new Promise((r) => setTimeout(r, 250)); }
  assert.ok(served !== null, '伺服器 15 秒內沒起來');
  assert.equal(served, want, '伺服器回的 index.html 不是 SRV_ROOT 的那份（埠被別的伺服器佔用？）');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(url);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 90000 });
    await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
    await page.waitForTimeout(1500);
    await fn(page, errs);
  } finally { await browser.close(); srv.kill(); }
}

/* 頁內：三席同時說 txt，量泡與所有「別人」的幾何。 */
const SAMPLE = `(async ({ txt, narrow }) => {
  SKIP = false;
  const RL = ['qingmian','hongyi','duanshou','shoujing','hunter','xiaonv','lvshan','zutou','dangpu','luzhu'];
  [1, 2, 3].forEach((id) => { const b = document.getElementById('bub' + id); b.dataset.role = RL[(S.round + id * 3) % 10]; say(id, txt); }); // 輪換造型（祖靈內距較高）
  await new Promise((r) => setTimeout(r, 160));
  const R = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const hidden = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return true; } return false; };
  const on = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  const others = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const p = n.parentElement; if (!p || p.closest('.bubble,script,style,noscript') || hidden(p)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const q of rg.getClientRects()) if (on(q)) others.push({ ...R(q), k: 'txt', own: !!p.closest('#northSeat'), s: n.textContent.trim().slice(0, 14) }); }
  for (const e of document.querySelectorAll('button,[onclick],input,select,.roleInfoBtn,#helpBtn')) { if (e.closest('.bubble') || hidden(e)) continue; const r = e.getBoundingClientRect();
    if (on(r) && r.width < innerWidth * 0.98) others.push({ ...R(r), k: 'btn', own: !!e.closest('#northSeat'), s: (e.id || e.textContent.trim()).slice(0, 12) }); }
  const box = (sel, k) => document.querySelectorAll(sel).forEach((e) => { if (hidden(e)) return; const r = e.getBoundingClientRect(); if (on(r)) others.push({ ...R(r), k, own: !!e.closest('#northSeat'), s: (e.id || String(e.className)).slice(0, 14) }); });
  box('#northSeat .seat,#westSeat .seat,#eastSeat .seat', 'seatbox'); box('#railW>*,#railE>*', 'railbox'); box('#south', 'south');
  const seatRect = (id) => R(document.getElementById(['', 'northSeat', 'westSeat', 'eastSeat'][id]).querySelector('.seat').getBoundingClientRect());
  const cv = document.createElement('canvas').getContext('2d');
  const bubbles = [1, 2, 3].map((id) => { const b = document.getElementById('bub' + id), cs = getComputedStyle(b), r = b.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(b); const tr = rg.getBoundingClientRect();
    const a = getComputedStyle(b, '::after'); const label = a.content.replace(/^"|"$/g, '');
    cv.font = 'bold ' + a.fontSize + ' ' + a.fontFamily; const lw = cv.measureText(label).width + parseFloat(a.letterSpacing || 0) * Array.from(label).length;
    const inner = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    return { id, show: b.classList.contains('show'), fs: parseFloat(cs.fontSize), pe: cs.pointerEvents, box: R(r), txt: R(tr), who: b.dataset.who || '', label, labelDisplay: a.display, lw, inner,
      expectWho: ['', '北', '西', '東'][id] + '・' + S.players[id].name, bl: cs.borderLeftColor, br: cs.borderRightColor, seat: seatRect(id), vw: innerWidth, vh: innerHeight }; });
  return { bubbles, others };
})`;

const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const fmt = (x) => `${Math.round(x.l)},${Math.round(x.t)},${Math.round(x.r)},${Math.round(x.b)}`;
const inside = (a, c, eps = 0.5) => a.l >= c[0] - eps && a.t >= c[1] - eps && a.r <= c[2] + eps && a.b <= c[3] + eps;

function judge(vp, ctxLabel, len, m, bad) {
  const narrow = vp.w <= 760;
  const dock = { 1: vp.N, 2: vp.W, 3: vp.E };
  for (const b of m.bubbles) {
    const tag = `${ctxLabel} ${len}字 泡${b.id}[${fmt(b.box)}]`;
    if (len === 40 && b.id === 1) continue; // 北 40 字不列硬條件（真實台詞最長 19 字）
    if (!b.show) bad.push(`${tag} 沒顯示`);
    // P1
    const d = dock[b.id] || [b.seat.l, b.seat.t, b.seat.r, b.seat.b];
    if (!inside(b.box, d)) bad.push(`${tag} P1 不在停靠矩形 [${d}] 座位卡[${fmt(b.seat)}]`);
    // P2
    for (const o of m.others) { if (narrow && b.id === 1 && o.own) continue; const a = area(b.box, o); if (a > 0) bad.push(`${tag} P2 ∩ ${o.k}「${o.s}」[${fmt(o)}] = ${a.toFixed(0)}px²`); }
    // P3
    if (!(narrow && b.id === 1)) {
      if (b.who !== b.expectWho) bad.push(`${tag} P3 小標 data-who「${b.who}」≠「${b.expectWho}」`);
      if (b.label !== b.who || b.labelDisplay === 'none') bad.push(`${tag} P3 ::after 沒顯示小標（content「${b.label}」display ${b.labelDisplay}）`);
      else if (b.lw > b.inner + 0.5) bad.push(`${tag} P3 小標被截（寬 ${b.lw.toFixed(1)} > 內容寬 ${b.inner.toFixed(1)}）`);
    }
    if (b.bl === 'rgba(0, 0, 0, 0)' || b.br === 'rgba(0, 0, 0, 0)') bad.push(`${tag} P3 角色色邊不見`);
    // P4
    if (b.fs < 14) bad.push(`${tag} P4 字級 ${b.fs}`);
    if (b.pe !== 'none') bad.push(`${tag} P4 pointer-events ${b.pe}`);
    if (!(b.box.l >= 0 && b.box.t >= 0 && b.box.r <= b.vw && b.box.b <= b.vh)) bad.push(`${tag} P4 超出視窗`);
    if (b.txt.l < b.box.l - 0.5 || b.txt.r > b.box.r + 0.5 || b.txt.t < b.box.t - 0.5 || b.txt.b > b.box.b + 0.5) bad.push(`${tag} P4 文字超出泡外框 txt[${fmt(b.txt)}]`);
  }
}

for (const vp of VIEWPORTS) {
  test(`P1–P4 ${vp.w}x${vp.h} 真流程第 1/3/4/7 夜 出價／揭盅／事件：三席同時 8／14／19 字（西／東另 40 字）固定停靠、零交集`, { timeout: 1500000 }, async () => {
    await withPage(vp, async (page, errs) => {
      const bad = []; const cover = {}; const shot = {};
      let last = '', stuck = 0, lastSample = 0, skips = 0; const t0 = Date.now(); const bidHold = {};
      for (let i = 0; i < 3000 && Date.now() - t0 < 1300000; i++) {
        const st = await page.evaluate(() => {
          const m = document.getElementById('mainbtn'), d = document.getElementById('duel'), sk = document.getElementById('skipbtn');
          const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
          const sb = [...document.querySelectorAll('#stage button, #modal button')].filter((x) => vis(x) && !x.disabled).length;
          return { r: S.round, ev: (eventForRound(S.round) || {}).name || '', m: m.textContent.trim(), dis: m.disabled, duel: !!vis(d), skip: !!vis(sk), sb, rev: !!REVEAL_ANIMATING };
        });
        if (st.r > 7) break;
        const key = JSON.stringify(st); if (key !== last) { last = key; stuck = 0; } else stuck++;
        const phase = st.duel ? '對決' : st.rev ? '揭盅' : (/蓋牌開標/.test(st.m) && !st.dis) ? '出價' : (st.sb && st.ev) ? '事件' : null;
        const tgt = TARGET_NIGHTS.includes(st.r);
        if (tgt && phase && phase !== '對決' && Date.now() - lastSample > (phase === '出價' ? 300 : 650)) {
          const lens = vp.w >= 844 ? [8, 14, 19, 40] : [8, 14, 19];
          for (const len of lens) {
            const m = await page.evaluate(`(${SAMPLE})(${JSON.stringify({ txt: TEXTS[len] })})`);
            // 40 字只量西／東（北不列硬條件，但仍讓三席同時顯示以取最壞情況）
            judge(vp, `第${st.r}夜/${phase}`, len, m, bad);
            if (len === 19 && SHOT_DIR && phase === '出價' && !shot[st.r]) { shot[st.r] = 1; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `dock-${vp.w}x${vp.h}-n${st.r}-bid.png`) }); }
          }
          const ck = st.r + '/' + phase; cover[ck] = (cover[ck] || 0) + 1; lastSample = Date.now();
        }
        if (phase === '出價' && tgt && (bidHold[st.r] = (bidHold[st.r] || 0) + 1) < 4) { await page.waitForTimeout(300); continue; }
        if (!st.dis && !st.duel) await page.click('#mainbtn', { timeout: 3000 }).catch(() => {});
        else if (st.sb && stuck > 3) await page.evaluate(() => { const x = [...document.querySelectorAll('#stage button, #modal button')].find((y) => y.getClientRects().length && !y.disabled); x && x.click(); });
        else if (stuck > 120 && st.skip) { await page.click('#skipbtn').catch(() => {}); skips++; stuck = 0; }
        await page.waitForTimeout(200);
      }
      console.log(`${vp.w}x${vp.h} 取樣覆蓋 ${JSON.stringify(cover)} 按跳過 ${skips}`);
      for (const n of TARGET_NIGHTS) for (const ph of ['出價', '揭盅']) assert.ok(cover[n + '/' + ph] > 0, `第 ${n} 夜沒取到 ${ph} 階段樣本（覆蓋 ${JSON.stringify(cover)}）`);
      assert.equal(bad.length, 0, `${bad.length} 處違反（前 15 筆）：\n` + [...new Set(bad)].slice(0, 15).join('\n'));
      assert.deepEqual(errs, []);
    });
  });
}
