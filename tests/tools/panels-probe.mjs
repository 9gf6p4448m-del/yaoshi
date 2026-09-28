// v0.59.2 面板 Y 驗收，凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #5–#7。
// 資料來源：包住 window.resolveAuction／resolveBattles（跟 phase2-mock/shoot-panels.mjs 同一種手法），
// 把回傳值留一份給治具直接核對——不讀舊版渲染出來的 HTML 逐字比對（舊版已被取代），
// 而是核對「resolveAuction／resolveBattles 算出來的每一筆，新版 #pnl 面板文字裡都找得到」。
// 用法：node tests/tools/panels-probe.mjs [--out <dir>] [--port N] [--nights N] [--modes solo,hot] [--vps V1,V4]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-28-appraise-panels')));
const PORT = Number(arg('--port', 9821));
const SEED = Number(arg('--seed', 3));
const NIGHTS = Number(arg('--nights', 3));
const MODES = arg('--modes', 'solo,hot').split(',');
const VPS = arg('--vps', 'V1,V4').split(',');
fs.mkdirSync(OUT, { recursive: true });

const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
};

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const DRIVE_STEP = `(() => {
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;
const scr = (page) => page.evaluate(() => {
  const $ = (id) => document.getElementById(id);
  const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (/請神/.test(t)) return dis ? 'shrine-run' : (document.querySelector('.resultStrip .big') && /成交總覽/.test(document.querySelector('.resultStrip .big').textContent) ? 'reveal-result' : 'shrine');
  if (/^開戰/.test(t) && !dis) return 'reveal-result';
  if (/進入下一夜|看最終結果/.test(t) && !dis) return 'night-end';
  return 'busy';
});
async function drive(page, want, cap = 20000) {
  for (let i = 0; i < cap; i++) {
    await page.waitForTimeout(8);
    const cls = await scr(page);
    if (cls === want) return true;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return false;
  }
  return false;
}

async function newCtx(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await ctx.addInitScript((safe) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.id = '__safe';
      s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
      document.head.appendChild(s);
    });
  }, vp.safe);
  const page = await ctx.newPage();
  page.__errs = []; page.on('pageerror', (e) => page.__errs.push('pageerror ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 30000 });
  await page.evaluate(() => {
    CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    const ra = window.resolveAuction; window.resolveAuction = function () { const r = ra.apply(this, arguments); window.__pReveal = r; return r; };
    const rb = window.resolveBattles; window.resolveBattles = function () { const r = rb.apply(this, arguments); window.__pBattle = r; return r; };
  });
  return { ctx, page };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
};

// ── #5 檢查：reveal（resolveAuction 回傳的陣列）vs #pnl 面板文字 ──
function checkReveal(reveal, panelText, playersById) {
  const missing = [];
  let winCount = 0, feeCount = 0, poisonCount = 0, passCount = 0;
  for (const r of reveal) {
    if (!r.winner) { passCount++; if (!panelText.includes(r.it.n)) missing.push('流標未見:' + r.it.n); continue; }
    winCount++;
    const w = r.winner, paid = w.cost !== undefined ? w.cost : w.amt;
    if (!panelText.includes(r.it.n)) missing.push('得標拍品名未見:' + r.it.n);
    if (!panelText.includes(String(paid))) missing.push('實付金額未見:' + r.it.n + '=' + paid);
    if (w.intent === 'poison' && w.target != null && !r.poisonBlocked) {
      poisonCount++;
      const tname = playersById[w.target].name;
      if (!panelText.includes(tname) && !panelText.includes('你')) missing.push('毒標目標未見:' + tname);
    }
  }
  // 落標費：每個買家（非得主）在這件上花的 cost 加總，若 >0 應在其欄位某處出現。
  // ★比對用 p.id、不能用物件參考★：revealData 是從 page.evaluate 序列化回來的，winner 與
  // entries 裡同一筆標是兩個不同的物件實字，`e!==r.winner` 恆真，會把得主自己的實付金額也
  // 誤算成一筆「落標費」（產品原碼 resolveAuction 用的是同一份陣列的同一個物件參考，這個地雷
  // 只存在於治具的序列化重建，不是產品行為）。
  const feeByPlayer = {};
  for (const r of reveal) { if (!r.winner) continue; for (const e of r.entries) if (e.p.id !== r.winner.p.id && e.cost) feeByPlayer[e.p.id] = (feeByPlayer[e.p.id] || 0) + e.cost; }
  for (const pid in feeByPlayer) { feeCount++; if (!panelText.includes(String(feeByPlayer[pid]))) missing.push('落標費未見:玩家' + pid + '=' + feeByPlayer[pid]); }
  return { missing, winCount, feeCount, poisonCount, passCount };
}
// ── #6 檢查：{fights,bye,nightly,deaths} vs #pnl 面板文字 ──
function checkNightend(fights, bye, nightly, deaths, panelText, playersById) {
  const missing = [];
  for (const f of fights) {
    if (f.tie) { if (!panelText.includes(f.A.name) || !panelText.includes(f.B.name)) missing.push('平手對決未見:' + f.A.name + '/' + f.B.name); continue; }
    if (!panelText.includes(f.w.name)) missing.push('勝方未見:' + f.w.name);
    if (!panelText.includes(f.l.name)) missing.push('敗方未見:' + f.l.name);
    if (!panelText.includes(String(f.dmg))) missing.push('傷害未見:' + f.w.name + 'vs' + f.l.name + '=' + f.dmg);
  }
  if (bye !== null && !panelText.includes(playersById[bye].name)) missing.push('輪空者未見:' + playersById[bye].name);
  for (const d of (deaths || [])) if (!panelText.includes(d.name)) missing.push('死亡者未見:' + d.name);
  // nightly 心願／天明每一行至少要有一個關鍵數字或角色名出現在面板（寬鬆檢查：抓行內的數字與角色名）
  let wishLines = 0, dawnLines = 0;
  for (const t of nightly) {
    const isWish = /心願/.test(t);
    if (isWish) wishLines++; else dawnLines++;
    const nums = t.match(/\d+/g) || [];
    const hasNum = nums.some((n) => panelText.includes(n));
    const names = Object.values(playersById).map((p) => p.name).filter((n) => t.includes(n));
    const hasName = names.some((n) => panelText.includes(n)) || /你的|你 /.test(t);
    if (!hasNum && !hasName && !panelText.includes(t.replace(/^\S+\s/, '').slice(0, 6))) missing.push('nightly 行疑似遺漏:' + t.slice(0, 30));
  }
  return { missing, wishLines, dawnLines, fights: fights.length };
}

const results = { runs: [], notes: [] };
async function runOne(mode, vname) {
  const vp = VP[vname];
  const { ctx, page } = await newCtx(vp);
  const run = { mode, vp: vname, nights: [] };
  try {
    await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
    await pickFirstRole(page);
    if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pickFirstRole(page); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode === 'hot' ? 'hotseat' : 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    for (let n = 0; n < NIGHTS; n++) {
      const gotReveal = await drive(page, 'reveal-result');
      if (!gotReveal) { results.notes.push(`${mode}|${vname} 夜${n} 沒到 reveal-result（局提前結束）`); break; }
      const revealData = await page.evaluate(() => ({
        reveal: window.__pReveal.map((r) => ({ it: { n: r.it.n, f: r.it.f, curse: !!r.it.curse }, winner: r.winner ? { p: { id: r.winner.p.id }, amt: r.winner.amt, cost: r.winner.cost, intent: r.winner.intent, target: r.winner.target } : null, poisonBlocked: !!r.poisonBlocked, entries: r.entries.map((e) => ({ p: { id: e.p.id }, cost: e.cost })) })),
        players: window.__yaoshi.S.players.map((p) => ({ id: p.id, name: p.name })),
      }));
      const playersById = {}; for (const p of revealData.players) playersById[p.id] = p;
      // 修正 entries/winner 的 p 為完整物件（上面只留 id，checkReveal 用 e.p / r.winner.p）
      for (const r of revealData.reveal) { if (r.winner) r.winner.p = playersById[r.winner.p.id]; for (const e of r.entries) e.p = playersById[e.p.id]; }
      const panelText = await page.evaluate(() => { const el = document.getElementById('pnl'); return el ? el.textContent : null; });
      const panelRect = await page.evaluate(() => { const el = document.getElementById('pnl'); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
      const safeOk = await page.evaluate(() => { const el = document.getElementById('pnl'); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(document.documentElement); const sv = (k) => parseFloat(cs.getPropertyValue(k)) || 0; return r.left >= sv('--safe-left') - 1 && r.top >= sv('--safe-top') - 1 && r.right <= innerWidth - sv('--safe-right') + 1 && r.bottom <= innerHeight - sv('--safe-bottom') + 1; });
      const overflowBad = await page.evaluate(() => { const root = document.getElementById('pnl'); if (!root) return null; let bad = 0; for (const e of root.querySelectorAll('*')) { const st = getComputedStyle(e); if (e.scrollWidth > e.clientWidth + 1 && st.overflowX !== 'visible' && st.display !== 'none') bad++; } return bad; });
      const revealCheck = panelText ? checkReveal(revealData.reveal, panelText, playersById) : { missing: ['#pnl 找不到（reveal）'] };
      run.nights.push({ n, phase: 'reveal', panelFound: !!panelText, safeOk, overflowBad, panelRect, revealCheck });
      const gotNightend = await drive(page, 'night-end');
      if (!gotNightend) { results.notes.push(`${mode}|${vname} 夜${n} 沒到 night-end`); break; }
      const battleData = await page.evaluate(() => ({
        bye: window.__pBattle.bye,
        nightly: window.__pBattle.nightly,
        deaths: (window.__pBattle.deaths || []).map((d) => ({ id: d.id, name: d.name })),
        fights: window.__pBattle.fights.map((f) => ({ A: { id: f.A.id, name: f.A.name }, B: { id: f.B.id, name: f.B.name }, tie: !!f.tie, w: f.w ? { id: f.w.id, name: f.w.name } : null, l: f.l ? { id: f.l.id, name: f.l.name } : null, dmg: f.dmg })),
        players: window.__yaoshi.S.players.map((p) => ({ id: p.id, name: p.name })),
      }));
      const playersById2 = {}; for (const p of battleData.players) playersById2[p.id] = p;
      const panelText2 = await page.evaluate(() => { const el = document.getElementById('pnl'); return el ? el.textContent : null; });
      const safeOk2 = await page.evaluate(() => { const el = document.getElementById('pnl'); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(document.documentElement); const sv = (k) => parseFloat(cs.getPropertyValue(k)) || 0; return r.left >= sv('--safe-left') - 1 && r.top >= sv('--safe-top') - 1 && r.right <= innerWidth - sv('--safe-right') + 1 && r.bottom <= innerHeight - sv('--safe-bottom') + 1; });
      const overflowDetail2 = await page.evaluate(() => { const root = document.getElementById('pnl'); if (!root) return null; const out = []; for (const e of root.querySelectorAll('*')) { const st = getComputedStyle(e); if (e.scrollWidth > e.clientWidth + 1 && st.overflowX !== 'visible' && st.display !== 'none') out.push({ cls: e.className, sw: e.scrollWidth, cw: e.clientWidth, ox: st.overflowX, tt: st.textOverflow, ws: st.whiteSpace, txt: (e.textContent||'').slice(0,40) }); } return out; });
      const overflowBad2 = overflowDetail2 ? overflowDetail2.length : null;
      // 可捲動時捲到底能看到最後一列（#7）
      const scrolledOk = await page.evaluate(() => {
        const el = document.getElementById('pnl'); if (!el) return null;
        const scrollable = el.scrollHeight > el.clientHeight + 2;
        if (!scrollable) return 'no-scroll-needed';
        el.scrollTop = el.scrollHeight;
        const last = el.querySelector('.pnl-sec:last-child .pnl-row:last-child, .pnl-sec:last-child .pnl-whisper:last-child');
        if (!last) return 'no-last-row-found';
        const r = last.getBoundingClientRect(), pr = el.getBoundingClientRect();
        return r.bottom <= pr.bottom + 2 && r.top >= pr.top - 2;
      });
      const nightendCheck = panelText2 ? checkNightend(battleData.fights, battleData.bye, battleData.nightly, battleData.deaths, panelText2, playersById2) : { missing: ['#pnl 找不到（nightend）'] };
      run.nights.push({ n, phase: 'nightend', panelFound: !!panelText2, safeOk: safeOk2, overflowBad: overflowBad2, scrolledOk, nightendCheck });
    }
  } catch (e) { results.notes.push(`${mode}|${vname} 例外：${e.message}\n${e.stack}`); }
  finally { results.runs.push(run); await ctx.close().catch(() => {}); }
}

for (const mode of MODES) for (const vname of VPS) await runOne(mode, vname);
await browser.close();
srv.kill();
const outFile = path.join(OUT, 'panels-raw.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log('寫入', outFile, 'runs', results.runs.length, 'notes', results.notes.length);
