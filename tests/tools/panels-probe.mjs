// v0.59.2 面板 Y 驗收，凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #5–#7。
// 資料來源：包住 window.resolveAuction／resolveBattles（跟 phase2-mock/shoot-panels.mjs 同一種手法），
// 把回傳值留一份給治具直接核對——不讀舊版渲染出來的 HTML 逐字比對（舊版已被取代），
// 而是核對「resolveAuction／resolveBattles 算出來的每一筆，新版 #pnl 面板文字裡都找得到」。
// 用法：node tests/tools/panels-probe.mjs [--root <受測工作樹>] [--out <dir>] [--port N] [--nights N] [--modes solo,hot] [--vps V1,V4]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', HERE));   /* 受測版本的目錄（判紅用：指向舊版工作樹）；治具與 playwright 一律從本樹取 */
const OUT = path.resolve(arg('--out', path.join(HERE, 'docs/experiments/2026-09-28-appraise-panels')));
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

const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

/* 熱座：換人時全屏交棒遮罩蓋在牌桌上，主鈕文字清空但沒有 disabled——不先按「開始出價」（#hoBtn）
   會一直點到遮罩底下的空主鈕，永遠到不了揭盅（09-29 實測：卡在 round 1、handoff 可見、4 人都活著）。
   與 text-fit-probe.mjs／landscape-fit-probe.mjs 的 DRIVE_STEP 同一寫法。 */
const DRIVE_STEP = `(() => {
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
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
/* 卡住時留下畫面狀態（主鈕文字／可按、交棒遮罩、彈窗）——「沒到 reveal-result」要能分辨是局提前結束還是治具不會按 */
const STATE = `(() => { const $ = (id) => document.getElementById(id), vis = (e) => !!e && getComputedStyle(e).display !== 'none';
  const b = $('mainbtn'); return { main: b ? b.textContent.trim() : null, mainDis: b ? b.disabled : null, handoff: vis($('handoff')), hoBtn: $('hoBtn') ? $('hoBtn').textContent : null,
    modal: vis($('modal')), round: window.__yaoshi && window.__yaoshi.S ? window.__yaoshi.S.round : null, alive: window.__yaoshi && window.__yaoshi.S ? window.__yaoshi.S.players.filter((p) => p.alive !== false && !p.dead).length : null }; })()`;
async function drive(page, want, cap = 20000) {
  let idle = 0;
  for (let i = 0; i < cap; i++) {
    await page.waitForTimeout(8);
    const cls = await scr(page);
    if (cls === want) return true;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) { page.__stuck = { why: '看最終結果（局結束）', state: await page.evaluate(STATE) }; return false; }
    idle = r === 1 ? idle + 1 : 0;
    if (idle >= 1500) { page.__stuck = { why: '連續 1500 步沒有可按的東西', state: await page.evaluate(STATE) }; return false; }
  }
  page.__stuck = { why: 'cap', state: await page.evaluate(STATE) };
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

/* #7「捲到底能看到最後一列」加嚴（09-29，自行記錄）：舊量法只比最後一列的矩形在 #pnl 框內，
   不管 #pnl 本身有沒有被底列 HUD 蓋住——舊版戰況面板高上限 70vh 在 V1–V4 會伸到底列後面，
   最後一列被蓋住又不能捲（實測 V4 第 1 夜「壽命 50→47」那列）。改成：捲到底之後，每一個「最後一列」
   （戰況＝最後一段的最後一列；成交總覽＝每一欄的最後一列）中心點的 elementFromPoint 必須落在該列裡面，
   且整列在 #pnl 可視框內。不需要捲動的面板一樣要量。 */
const LAST_VISIBLE = `(() => {
  const el = document.getElementById('pnl'); if (!el) return null;
  const scrollable = el.scrollHeight > el.clientHeight + 2;
  if (scrollable) el.scrollTop = el.scrollHeight;
  const lasts = el.classList.contains('resultStrip')
    ? [...el.querySelectorAll('.pnl-cell')].map((c) => c.lastElementChild)
    : [el.querySelector('.pnl-sec:last-child .pnl-body > :last-child')];
  const pr = el.getBoundingClientRect(), bad = [];
  for (const r0 of lasts) {
    if (!r0) { bad.push('找不到最後一列'); continue; }
    const r = r0.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    /* 蓋在這一列上面的元素（elementsFromPoint 排在這一列之前的）只要有一個不透明（有底色／底圖／是圖片畫布）就算被蓋住；
       透明的容器（例如 #railE 本身，只是一個會吃點擊的空框）不算擋住視線。 */
    /* 整列都要看得到：列的上緣、中線、下緣（各內縮 1.5px）三個點都量 */
    /* 底色透明度：rgb()＝1、rgba(r,g,b,a)＝a、color(srgb r g b / a)（color-mix 的計算值）＝斜線後的 a */
    const bgAlpha = (s) => { if (!s || s === 'transparent') return 0; const i = s.indexOf('('), body = s.slice(i + 1, s.lastIndexOf(')')); if (body.includes('/')) return Number(body.split('/')[1]); const p = body.split(',').map(Number); return /^rgba/.test(s) && p.length > 3 ? p[3] : 1; };
    const opaque = (e) => { const c = getComputedStyle(e); return bgAlpha(c.backgroundColor) > 0.1 || (c.backgroundImage && c.backgroundImage !== 'none') || (c.backdropFilter && c.backdropFilter !== 'none') || /^(IMG|CANVAS|VIDEO)$/.test(e.tagName); };
    let cover = null, miss = false;
    for (const y of [r.top + 1.5, cy, r.bottom - 1.5]) {
      const stack = document.elementsFromPoint(cx, y), at = stack.findIndex((e) => e === r0 || r0.contains(e));
      if (at < 0) { miss = true; cover = cover || stack[0] || null; continue; }
      cover = cover || stack.slice(0, at).find((e) => !e.contains(r0) && opaque(e)) || null;
    }
    const inside = r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1;
    if (!inside || miss || cover) bad.push((r0.textContent || '').trim().slice(0, 20) + ' 被 ' + (cover ? (cover.id || cover.className || cover.tagName) : '-') + ' 蓋住' + (inside ? '' : '／超出面板框'));
  }
  return { scrollable, ok: bad.length === 0, bad };
})()`;
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
      if (!gotReveal) { results.notes.push(`${mode}|${vname} 夜${n} 沒到 reveal-result：${JSON.stringify(page.__stuck)}`); break; }
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
      const lastVisible = await page.evaluate(LAST_VISIBLE);
      run.nights.push({ n, phase: 'reveal', panelFound: !!panelText, safeOk, overflowBad, panelRect, lastVisible, revealCheck });
      const gotNightend = await drive(page, 'night-end');
      if (!gotNightend) { results.notes.push(`${mode}|${vname} 夜${n} 沒到 night-end：${JSON.stringify(page.__stuck)}`); break; }
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
      const lastVisible2 = await page.evaluate(LAST_VISIBLE);
      run.nights.push({ n, phase: 'nightend', panelFound: !!panelText2, safeOk: safeOk2, overflowBad: overflowBad2, scrolledOk, lastVisible: lastVisible2, nightendCheck });
    }
  } catch (e) { results.notes.push(`${mode}|${vname} 例外：${e.message}\n${e.stack}`); }
  finally { results.runs.push(run); await ctx.close().catch(() => {}); }
}

for (const mode of MODES) for (const vname of VPS) await runOne(mode, vname);
await browser.close();
srv.kill();
/* 逐格判定（#5 missing 0、#6 missing 0、#7 safeOk／overflowBad 0／最後一列看得到／需捲動時捲到底看得到）；量不到判紅 */
const fails = []; let cells = 0;
for (const r of results.runs) {
  if (!r.nights.length) { fails.push(`${r.mode}|${r.vp} 量不到（0 夜）`); continue; }
  for (const x of r.nights) {
    cells++;
    const k = `${r.mode}|${r.vp}|夜${x.n}|${x.phase}`, f = [];
    const miss = (x.revealCheck || x.nightendCheck || { missing: ['無檢查'] }).missing;
    if (!x.panelFound) f.push('#pnl 找不到');
    if (miss.length) f.push('missing ' + miss.join('、'));
    if (x.safeOk !== true) f.push('安全區外');
    if (x.overflowBad !== 0) f.push('overflowBad ' + x.overflowBad);
    if (x.phase === 'nightend' && x.scrolledOk === false) f.push('捲到底看不到最後一列');
    if (!x.lastVisible || !x.lastVisible.ok) f.push('最後一列看不到 ' + JSON.stringify(x.lastVisible && x.lastVisible.bad));
    if (f.length) fails.push(`${k} ${f.join('；')}`);
  }
}
results.verdict = { cells, fail: fails.length, nightsPerRun: Object.fromEntries(results.runs.map((r) => [`${r.mode}|${r.vp}`, r.nights.length / 2])), pass: fails.length === 0 && results.runs.length === MODES.length * VPS.length };
results.fails = fails;
const outFile = path.join(OUT, 'panels-raw.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log('寫入', outFile, 'runs', results.runs.length, 'notes', results.notes.length, JSON.stringify(results.verdict));
for (const f of fails.slice(0, 30)) console.log('  ✗', f);
for (const n of results.notes) console.log('  note', n.slice(0, 300));
