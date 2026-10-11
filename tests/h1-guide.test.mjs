// v0.65.9 H1 引導（甲案）實頁驗收（http.server＋Playwright Chromium 開真的 index.html）。凍結檔：
//   docs/experiments/2026-10-11-acceptance-h1-guide.md（條 1–5；6 舊版用 YAOSHI_RENDER_ROOT=<舊版 worktree> 跑同一份）。
// 1 三尺寸 夜1／夜2 的出價頁與盯上頁都有提示一行、夜3 沒有
// 2 提示出現前後 #felt／#feltHead／#stage 幾何相同，且提示與 3D 拍品外框、座位卡、主鈕面積交集為 0
// 3 鑑賞卷軸上有實體鈕，點擊＝點紙面（賽局狀態逐欄位相同）；667x375 完整可見、elementFromPoint 命中
// 4 規則原文入口與出價入口 class／文字／計算樣式不同
// 5 盯上頁主鈕改次要（底色≠出價頁主鈕、較矮、對比不高於它），功能仍是 pickMark(null)
// 環境：YAOSHI_PW_ROOT（含 node_modules/playwright）、YAOSHI_SHOT_DIR（有設就存截圖）、H1_VPS（逗號分隔，預設三尺寸）。
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { driveToFirst, openGame, waitTrayReady, scr, DRIVE_STEP } from './tools/appraise-c-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.H1_PORT || 9761);
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const ALL = { A: { w: 844, h: 390, safe: [0, 0, 0, 0] }, B: { w: 667, h: 375, safe: [0, 0, 0, 0] }, C: { w: 932, h: 430, safe: [0, 0, 0, 0] } };
const VPS = (process.env.H1_VPS || 'A,B,C').split(',');
const DESTINY = ['water', 'eyes', 'twinTiger', 'godKing'];

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

/* 頁內量測：提示、#felt 幾何（有／無提示各量一次）、與 3D 拍品／座位卡／主鈕的交集 */
const MEAS = () => {
  const $ = (id) => document.getElementById(id);
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const h = $('h1hint');
  const cs = h ? getComputedStyle(h) : null;
  const rect = h ? R(h) : null;
  const text = h ? h.textContent.trim() : '';
  const visible = !!h && cs.display !== 'none' && rect.w > 0 && rect.h > 0 && text.length > 0;
  const geo = () => ({ feltH: R($('felt')).h, headH: R($('feltHead')).h, stageT: R($('stage')).t, scrollH: $('felt').scrollHeight, headT: R($('feltHead')).t });
  const withHint = geo();
  let withoutHint = withHint;
  if (h) { h.style.setProperty('display', 'none', 'important'); withoutHint = geo(); h.style.removeProperty('display'); }
  const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const hits = [];
  if (visible) {
    const Y3 = window.__yaoshi3d, n = window.__yaoshi.S.market.length;
    for (let i = 0; i < n; i++) { const b = Y3 && Y3.tray && Y3.tray.bboxScreen(i); if (b) hits.push({ what: 'lot' + i, area: inter(rect, { l: b.left, t: b.top, r: b.right, b: b.bottom }) }); }
    for (const id of ['westSeat', 'northSeat', 'eastSeat', 'mainbtn']) { const e = $(id); if (e) hits.push({ what: id, area: inter(rect, R(e)) }); }
  }
  const mb = $('mainbtn'), mcs = getComputedStyle(mb);
  return { round: window.__yaoshi.S.round, visible, text, rect, withHint, withoutHint, hits, nLots: hits.filter((x) => x.what.startsWith('lot')).length,
    main: { text: mb.textContent, bg: mcs.backgroundColor, color: mcs.color, h: R(mb).h, w: R(mb).w, weight: mcs.fontWeight, shadow: mcs.boxShadow } };
};

let srv, browser;
const DATA = new Map(); // vp → { rounds:{1:{mark,bid},2:…,3:…}, apprMark, apprBid }

async function driveRounds(page, vpKey) {
  const out = {};
  for (let r = 1; r <= 3; r++) {
    out[r] = {};
    for (let guard = 0; guard < 3; guard++) {
      const cls = await driveToFirst(page, new Set(['mark', 'bid']), 6000);
      if (!cls) { out[r].err = '沒到盯上／出價頁'; return out; }
      const rd = await page.evaluate(() => window.__yaoshi.S.round);
      if (rd !== r) { if (rd > r) { out[r].err = `round 跳到 ${rd}`; return out; } continue; }
      await waitTrayReady(page); await page.waitForTimeout(400);
      const m = await page.evaluate(MEAS);
      if (cls === 'mark') {
        out[r].mark = m;
        if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `${vpKey}-n${r}-mark.png`) });
        await page.evaluate(() => pickMark(null));
        await page.waitForTimeout(500);
        // pickMark 後守衛 500ms 內主鈕被吞；等到出價頁
        for (let i = 0; i < 200 && (await scr(page)) !== 'bid'; i++) await page.waitForTimeout(20);
        if ((await scr(page)) === 'bid') { await page.waitForTimeout(300); out[r].bid = await page.evaluate(MEAS); if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `${vpKey}-n${r}-bid.png`) }); }
      } else {
        out[r].bid = m;
        if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `${vpKey}-n${r}-bid.png`) });
      }
      // 送出這一夜（空標），往下一夜
      await page.waitForTimeout(600);
      for (let i = 0; i < 400; i++) { const c = await scr(page); if (c === 'bid') { await page.evaluate(() => document.getElementById('mainbtn').click()); break; } await page.waitForTimeout(20); }
      break;
    }
  }
  return out;
}

const SNAP = () => {
  const seen = new WeakSet();
  const S = window.__yaoshi.S;
  const st = JSON.stringify(S, (k, v) => { if (typeof v === 'function') return undefined; if (v && typeof v === 'object') { if (seen.has(v)) return '[cyc]'; seen.add(v); } return v; });
  const sh = document.getElementById('sheet');
  return JSON.stringify({ S: st, sheetOpen: !!sh && sh.style.display !== 'none' && sh.style.display !== '', sheetIdx: typeof sheetIdx === 'undefined' ? null : sheetIdx, myBids: typeof myBids === 'undefined' ? null : myBids });
};

/* 開鑑賞並回報卷軸上的鈕與紙面點擊點 */
async function apprProbe(page, phase) {
  const cls = await driveToFirst(page, new Set([phase]), 6000);
  if (!cls) return { err: `沒進到 ${phase} 頁` };
  if (!(await waitTrayReady(page))) return { err: '3D 未就緒' };
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => { const b = document.querySelector('.railTabs button'); return b ? { rail: b.closest('.rail').id, slot: Number(b.dataset.slot) } : null; });
  if (!t) return { err: '沒有窄籤' };
  await page.evaluate(([r, s]) => railTabClick(r, s), [t.rail, t.slot]);
  await page.waitForTimeout(2600);
  const info = await page.evaluate(([rail]) => {
    const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const a = document.querySelector(`#${rail} .asc-act`), f = document.querySelector(`#${rail} .asc-fold`), g = document.querySelector(`#${rail} .asc-gain`);
    const cs = (e) => { if (!e) return null; const c = getComputedStyle(e); return { cls: e.className, text: e.textContent.trim(), bg: c.backgroundColor, bts: c.borderTopStyle, bbs: c.borderBottomStyle, display: c.display }; };
    const ra = a ? R(a) : null;
    let hit = null;
    if (ra) { const e = document.elementFromPoint((ra.l + ra.r) / 2, (ra.t + ra.b) / 2); hit = !!e && (e === a || a.contains(e)); }
    const inWin = ra ? ra.l >= 0 && ra.t >= 0 && ra.r <= innerWidth && ra.b <= innerHeight : false;
    return { act: cs(a), fold: cs(f), rectAct: ra, hit, inWin, gain: g ? R(g) : null, vw: innerWidth, vh: innerHeight };
  }, [t.rail]);
  return { ...t, ...info };
}
async function clickOf(page, which, phase, info) {
  // which: 'paper'＝點紙面（白話句那一行中心，與既有 appraise-mark-eq 同法）；'act'＝點實體鈕中心
  const box = which === 'act' ? info.rectAct : info.gain;
  if (!box) return { err: '沒有點擊目標' };
  await page.mouse.click((box.l + box.r) / 2, (box.t + box.b) / 2);
  await page.waitForTimeout(700);
  if (phase === 'mark') {
    for (let i = 0; i < 400; i++) { const c = await scr(page); if (c === 'bid') break; await page.evaluate(DRIVE_STEP).catch(() => {}); await page.waitForTimeout(10); }
    await page.waitForTimeout(200);
  } else {
    await page.evaluate(() => { if (typeof bump === 'function') bump(1); });
  }
  return { snap: await page.evaluate(SNAP) };
}

before(async () => {
  const { chromium } = loadPlaywright();
  srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const k of VPS) {
    const d = { rounds: null };
    const { ctx, page } = await openGame(browser, PORT, ALL[k], 'solo', 3, { clock: false, destiny: DESTINY });
    try { d.rounds = await driveRounds(page, k); d.errs = page.__errs; } finally { await ctx.close().catch(() => {}); }
    // 鑑賞卷軸（夜 1）：盯上頁與出價頁各一場新局，紙面點擊 vs 實體鈕點擊兩局比對（只在 A、B 兩尺寸；C 只量存在）
    for (const phase of ['mark', 'bid']) {
      const o = await openGame(browser, PORT, ALL[k], 'solo', 3, { clock: false, destiny: DESTINY });
      try {
        if (phase === 'bid') { const c = await driveToFirst(o.page, new Set(['mark']), 6000); if (c) { await o.page.evaluate(() => pickMark(null)); for (let i = 0; i < 200 && (await scr(o.page)) !== 'bid'; i++) await o.page.waitForTimeout(20); await o.page.waitForTimeout(600); } }
        d['appr_' + phase] = await apprProbe(o.page, phase);
        if (SHOT_DIR && !d['appr_' + phase].err) await o.page.screenshot({ path: path.join(SHOT_DIR, `${k}-n1-${phase}-appraise.png`) });
        if (k === 'A' && !d['appr_' + phase].err && d['appr_' + phase].rectAct) d['click_' + phase + '_act'] = await clickOf(o.page, 'act', phase, d['appr_' + phase]);
      } finally { await o.ctx.close().catch(() => {}); }
      if (k === 'A' && d['appr_' + phase] && !d['appr_' + phase].err) {
        const o2 = await openGame(browser, PORT, ALL[k], 'solo', 3, { clock: false, destiny: DESTINY });
        try {
          if (phase === 'bid') { const c = await driveToFirst(o2.page, new Set(['mark']), 6000); if (c) { await o2.page.evaluate(() => pickMark(null)); for (let i = 0; i < 200 && (await scr(o2.page)) !== 'bid'; i++) await o2.page.waitForTimeout(20); await o2.page.waitForTimeout(600); } }
          const info2 = await apprProbe(o2.page, phase);
          d['click_' + phase + '_paper'] = info2.err ? { err: info2.err } : await clickOf(o2.page, 'paper', phase, info2);
        } finally { await o2.ctx.close().catch(() => {}); }
      }
    }
    DATA.set(k, d);
  }
});
after(async () => { try { await browser?.close(); } catch (e) { /* */ } try { srv?.kill(); } catch (e) { /* */ } });

const each = (fn) => { for (const k of VPS) fn(k, DATA.get(k)); };

test('1 夜1／夜2 的出價頁與盯上頁都有提示一行；夜3 沒有', () => {
  each((k, d) => {
    assert.ok(d.rounds && !d.rounds[1].err, `${k}: 夜1 沒跑到 ${JSON.stringify(d.rounds?.[1]?.err)}`);
    for (const r of [1, 2]) for (const ph of ['mark', 'bid']) {
      const m = d.rounds[r][ph];
      assert.ok(m, `${k} 夜${r} 沒量到 ${ph} 頁`);
      assert.equal(m.visible, true, `${k} 夜${r} ${ph}：提示不可見（text=${JSON.stringify(m.text)} rect=${JSON.stringify(m.rect)}）`);
    }
    for (const ph of ['mark', 'bid']) { const m = d.rounds[3] && d.rounds[3][ph]; if (m) assert.equal(m.visible, false, `${k} 夜3 ${ph}：不該顯示提示`); }
    assert.ok(d.rounds[3] && (d.rounds[3].mark || d.rounds[3].bid), `${k} 夜3 沒量到任何頁（無法證明夜3 沒有）`);
  });
});

test('2 提示出現前後 #felt／#feltHead 幾何相同，且與 3D 拍品、座位卡、主鈕不相交', () => {
  each((k, d) => {
    for (const r of [1, 2]) for (const ph of ['mark', 'bid']) {
      const m = d.rounds[r][ph]; if (!m) continue;
      assert.equal(m.visible, true, `${k} 夜${r} ${ph}：提示不可見，無從量`);
      assert.deepEqual(m.withHint, m.withoutHint, `${k} 夜${r} ${ph}：提示影響了 #felt 幾何`);
      assert.ok(m.nLots >= 1, `${k} 夜${r} ${ph}：量不到任何 3D 拍品外框`);
      for (const h of m.hits) assert.equal(h.area, 0, `${k} 夜${r} ${ph}：提示與 ${h.what} 相交 ${h.area}px²`);
    }
  });
});

test('3 卷軸上有實體鈕；點擊等同點紙面；667x375 完整可見可點', () => {
  each((k, d) => {
    for (const ph of ['mark', 'bid']) {
      const a = d['appr_' + ph];
      assert.ok(a && !a.err, `${k} ${ph}：${a && a.err}`);
      assert.ok(a.act, `${k} ${ph}：卷軸上沒有 .asc-act 鈕`);
      assert.match(a.act.text, ph === 'mark' ? /盯這一件/ : /出價這一件/, `${k} ${ph}：鈕文字不對`);
      assert.equal(a.inWin, true, `${k} ${ph}：鈕沒有完整落在視窗內 ${JSON.stringify(a.rectAct)}`);
      assert.equal(a.hit, true, `${k} ${ph}：鈕中心被別的元素蓋住（elementFromPoint 未命中）`);
    }
    if (k === 'A') for (const ph of ['mark', 'bid']) {
      const x = d['click_' + ph + '_act'], y = d['click_' + ph + '_paper'];
      assert.ok(x && x.snap && y && y.snap, `${k} ${ph}：沒有可比對的點擊結果 ${JSON.stringify([x && x.err, y && y.err])}`);
      assert.equal(x.snap, y.snap, `${k} ${ph}：點實體鈕與點紙面的賽局狀態不同`);
      const j = JSON.parse(x.snap);
      if (ph === 'bid') { assert.equal(j.sheetOpen, true, '出價視窗沒開'); assert.ok(j.myBids.some((b) => b.amt === 1), 'bump(1) 沒生效（出價金額流程）'); }
      else { const S = JSON.parse(j.S); assert.ok(Object.values(S.marks || {}).some((v) => v !== null && v !== undefined), '盯上沒寫入 S.marks'); }
    }
  });
});

test('4 規則原文入口與出價入口 class、文字、計算樣式皆不同', () => {
  each((k, d) => {
    for (const ph of ['mark', 'bid']) {
      const a = d['appr_' + ph];
      assert.ok(a && a.act && a.fold, `${k} ${ph}：缺入口 ${JSON.stringify([!!a?.act, !!a?.fold])}（規則原文入口只在放不下全文時出現；若為 0 條需換拍品）`);
      assert.notEqual(a.act.cls, a.fold.cls);
      assert.notEqual(a.act.text, a.fold.text);
      assert.notEqual(a.act.bg, a.fold.bg, `${k} ${ph}：兩者底色相同`);
      assert.notEqual(`${a.act.bts}`, 'none');
    }
  });
});

const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const alpha = (c) => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 ? m[3] : 1; };
test('5 盯上頁主鈕「不盯任何一件」是次要樣式；功能不變', () => {
  each((k, d) => {
    const mk = d.rounds[1].mark, bd = d.rounds[1].bid;
    assert.ok(mk && bd, `${k}: 夜1 缺盯上或出價頁量測`);
    assert.match(mk.main.text, /不盯任何一件/);
    assert.notEqual(mk.main.bg, bd.main.bg, `${k}：盯上頁主鈕底色與出價頁主鈕相同`);
    assert.ok(mk.main.h < bd.main.h, `${k}：盯上頁主鈕沒有比出價頁主鈕矮 ${mk.main.h} vs ${bd.main.h}`);
    assert.ok(alpha(mk.main.bg) < 1 || lum(mk.main.bg) !== lum(bd.main.bg));
    assert.ok(alpha(mk.main.bg) < alpha(bd.main.bg) || Math.abs(lum(mk.main.bg) - lum(mk.main.color)) <= Math.abs(lum(bd.main.bg) - lum(bd.main.color)), `${k}：對比不低於出價頁主鈕`);
    assert.ok(d.rounds[1].bid, `${k}：pickMark(null) 後沒進到出價頁（功能被改）`);
  });
});
