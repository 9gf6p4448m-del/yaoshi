// 《紙紮夜戰》接線卷（2026-09-05）：用 Playwright 真的把一局玩到對決，錄下 3D 接線的證據。
// 用法：node tests/tools/duel-drive.mjs "<url>" <out.json> [--duels=4] [--root=<靜態根目錄>] [--port=8831]
//                                       [--shots=<png 前綴>] [--no3d] [--loadmax=<ms>]
//   url   例：http://127.0.0.1:8831/index.html?paperwar=1&fxcount=1（埠要跟 --port 一致）
//   --root  http.server 的根目錄（預設＝repo 根；驗鑑別力時給 add71c4 的 worktree）
//   --no3d  擋掉 js/renderer.js（3D 不載）→ 驗 DOM 退路（W-A6）
//   --loadmax  進頁前把 PW_FX.LOAD_MAX_MS 改掉（W-A5 逾時分支用 1）
// 錄的東西（全部落在 out.json）：console／pageerror／requestfailed；每場 ys:duel 的 armies（含 ab）；
// ys:duel-loading 序列；每個 ys:fx-burn 的 handled 與燒完後該尊 visible；lunge 前後勝方的 clip；
// 對決中兩次 animTime 取樣；#duelBeat 首次非空與 FXC.load.readyAt 的時戳；FXC 計數器。
// 依賴：tools/anyCreature/node_modules/playwright（chromium 已裝）；自起 python http.server，用完關掉。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

export function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (const a of argv) {
    const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i);
    if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a);
  }
  return { pos, opt };
}

export async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

/** 頁面端的錄音機：在任何 script 之前掛好事件監聽（addInitScript）。 */
const RECORDER = `(() => {
  const R = window.__rec = { duels: [], loading: [], burns: [], lunges: [], samples: [], beatAt: [], ends: [], marks: {}, moves: [] };
  const now = () => Date.now();
  const figApi = () => { try { return window.__yaoshi3d && window.__yaoshi3d.duelFigures; } catch (e) { return null; } };
  const snap = (side) => { const D = figApi(); if (!D) return []; return D.figuresOf(side).map((f) => ({
    skin: f.skin || 'layered', ab: f.ab === undefined ? null : f.ab, unit: f.unit && f.unit.id,
    anim: f.animTime ? f.animTime() : null, cur: f.current ? f.current() : null, vis: f.group.visible,
    ground: f.groundFx ? f.groundFx() : null })); };
  let cur = null;
  document.addEventListener('ys:duel', (e) => {
    const d = e.detail || {};
    cur = { t: now(), a: d.a, b: d.b, armies: d.armies ? d.armies.map((s) => s.units.map((u) => ({ id: u.id, body: u.body, fac: u.fac, ab: u.ab, hasAb: 'ab' in u }))) : null,
      hasReady: !!(d.ready && typeof d.ready.then === 'function'), loadTotal: d.loadTotal, readyAt: null, firstBeatAt: null, loading: [], samples: [] };
    try { const F = window.__ysFxCount || {}; cur.trait0 = F.trait || 0; cur.traitFig0 = F.traitFig || 0; } catch (e) {} // 卷 C3 T-6：每場招式數＝trait1−trait0
    R.duels.push(cur);
    // detail.ready／loadTotal 是 duel-figures 的接收端在同一次派送裡才填的（本監聽器先註冊、先跑），macrotask 再讀
    cur.arenaEmptyAtDuel = !(document.getElementById('duelArena') || {}).innerHTML; // 審查 H-3：等載入時不得留上一場陣列
    try { cur.programsAtDuel = window.__yaoshi3d.renderer.info.programs.length; } catch (e) { cur.programsAtDuel = null; } // 審查 M-3：燈組進出對決不得重編
    try { cur.programListAtDuel = window.__yaoshi3d.renderer.info.programs.map((p) => p.name + '|' + String(p.cacheKey || '').slice(0, 400)); } catch (e) { cur.programListAtDuel = null; } // 卷 C3 T-5：新編的是哪一支
    setTimeout(() => {
      cur.hasReady = !!(d.ready && typeof d.ready.then === 'function');
      cur.loadTotal = d.loadTotal;
      cur.loadLoaded0 = d.loadLoaded;
      if (cur.hasReady) d.ready.then(() => { cur.readyAt = now(); });
    }, 0);
    // 對決中兩次取樣（W-A3）：進場 1500ms 與 1900ms
    setTimeout(() => { cur.samples.push({ t: now(), A: snap('A'), B: snap('B') }); }, 1500);
    setTimeout(() => { cur.samples.push({ t: now(), A: snap('A'), B: snap('B') }); }, 1900);
    if (!R.marks.lineupAt && d.armies && d.armies.some((s) => s.units.some((u) => u.ab))) R.marks.lineupAt = now() + 1700;
  });
  document.addEventListener('ys:duel-loading', (e) => { const d = e.detail || {}; const row = { t: now(), loaded: d.loaded, total: d.total }; R.loading.push(row); if (cur) cur.loading.push(row); });
  document.addEventListener('ys:fx-lunge', (e) => {
    const d = e.detail || {};
    const side = cur && d.w === cur.a ? 'A' : cur && d.w === cur.b ? 'B' : null;
    const row = { t: now(), w: d.w, l: d.l, side, at40: null, at670: null };
    R.lunges.push(row);
    if (side) {
      setTimeout(() => { row.at40 = snap(side).map((f) => f.cur); }, 40);
      setTimeout(() => { row.at670 = snap(side).map((f) => f.cur); }, 670);
      if (!R.marks.attackAt) R.marks.attackAt = now() + 140;
    }
  });
  document.addEventListener('ys:fx-burn', (e) => {
    const d = e.detail || {};
    const row = { t: now(), side: d.side, unit: d.unit, handled: null, visAfter: null };
    R.burns.push(row);
    setTimeout(() => {
      row.handled = !!d.handled; // 同步派送完 duel-figures 才填的，macrotask 再讀
      if (d.handled && d.done && d.done.then) {
        if (!R.marks.burnAt) R.marks.burnAt = now() + 200; // 燒到一半（BURN_MS 420）才看得到 dissolve
        d.done.then(() => { const D = figApi(); const f = D && D.figureOf(d.side, d.unit); row.visAfter = f ? f.group.visible : 'nofig'; row.doneAt = now(); });
      }
    }, 0);
  });
  // 演出可讀性小卷 C-1／C-4：招式事件派送當下（字幕已寫好）讀 #duelMove 的字與 class、#duel 的捲動高度
  document.addEventListener('ys:fx-trait', (e) => { const d = e.detail || {}; const el = document.getElementById('duelMove'); const du = document.getElementById('duel');
    const Y = window.__yaoshi || {}; const S = Y.S || {}; const seat = cur ? (d.side === 'B' ? cur.b : cur.a) : null;
    const pl = S.players && seat != null ? S.players.find((p) => p.id === seat) : null; const tr = Y.TRAITS ? Y.TRAITS[d.trId] : null;
    // 文字實際落點（Range 量字的框，不是元素框）與兩欄中心：side-A 的字要比置中更靠 dL、side-B 更靠 dR（覆審 H-1）
    let geo = null; try { const line = el && (el.querySelector('.mvline') || el); const rg = document.createRange(); rg.selectNodeContents(line); const tb = rg.getBoundingClientRect();
      const cx = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.left + r.width / 2; };
      geo = { textCx: tb.left + tb.width / 2, dL: cx('dL'), dR: cx('dR'), mid: window.innerWidth / 2 }; } catch (err) { geo = null; }
    R.moves.push({ t: now(), trId: d.trId, side: d.side, text: el ? el.textContent : null, cls: el ? el.className : null, geo,
      expectName: pl ? pl.name : null, expectItem: Y.TRAIT_ITEM ? Y.TRAIT_ITEM[d.trId] : null, expectMove: tr ? tr.name : null, expectDesc: tr ? tr.desc : null,
      scroll: du ? [du.scrollHeight, du.clientHeight] : null }); });
  document.addEventListener('ys:duel-end', () => { R.ends.push(now()); if (cur) { cur.endAt = now(); cur.dur = now() - cur.t; try { const F = window.__ysFxCount || {}; cur.trait1 = F.trait || 0; cur.traitFig1 = F.traitFig || 0; cur.skipped = !!window.__recSkipped; window.__recSkipped = false; } catch (e) {} try { cur.programsAtEnd = window.__yaoshi3d.renderer.info.programs.length; cur.programListAtEnd = window.__yaoshi3d.renderer.info.programs.map((p) => p.name + '|' + String(p.cacheKey || '').slice(0, 400)); setTimeout(() => { try { cur.programsAfterEnd = window.__yaoshi3d.renderer.info.programs.length; } catch (e) {} }, 1500); } catch (e) {} try { cur.load = window.__ysFxCount && window.__ysFxCount.load ? Object.assign({}, window.__ysFxCount.load) : null; } catch (e) { cur.load = null; } } });
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('duelBeat');
    if (!el) return;
    new MutationObserver(() => { if (cur && cur.firstBeatAt == null && el.textContent.trim()) cur.firstBeatAt = now(); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
})();`;

/**
 * 把一局玩到 wantDuels 場對決。回傳 page 端的 __rec ＋ FXC ＋ 錯誤清單。
 * @param opts {duels, shots(png 前綴), onDuel(page, n) 可在每場對決開始時做事}
 */
export async function drive(page, url, opts = {}) {
  const want = opts.duels || 4;
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  await page.addInitScript(RECORDER);
  if (opts.loadmax !== undefined) {
    await page.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{ try{ PW_FX.LOAD_MAX_MS=${Number(opts.loadmax)}; }catch(e){} });`);
  }
  // --skip：skipbtn 一顯示就按（MutationObserver，不靠 250ms 輪詢）——量的才是「按了跳過的對決」，不是「演到一半才按」
  if (opts.skip) await page.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{
    let armed=true; const sk=()=>{ const b=document.getElementById('skipbtn'); if(!b) return; const on=b.style.display!=='none'&&b.offsetParent!==null;
      if(on&&armed){ armed=false; window.__recSkipped=true; b.click(); } else if(!on) armed=true; };
    new MutationObserver(sk).observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','class']}); });`);
  if (opts.no3d) await page.route('**/js/renderer.js*', (route) => route.abort());
  if (opts.noglb) await page.route('**/assets/creatures/*.glb', (route) => route.abort()); // 審查 C-2：GLB 全 404 時對決不得卡死
  await page.goto(url, { waitUntil: 'load' });
  await page.click('button:has-text("單人入市")');
  await page.waitForSelector('#selectScr.on');
  await page.click('#selGrid .rcard');
  await page.click('#selBtn:not([disabled])');

  const t0 = Date.now();
  let duelsSeen = 0;
  let lastText = '';
  const shots = {};
  while (Date.now() - t0 < (opts.timeoutMs || 300000)) {
    const st = await page.evaluate(() => {
      const mb = document.getElementById('mainbtn');
      const ho = document.getElementById('hoBtn');
      const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
      // 舞台上的大按鈕（歡迎導覽的「下一頁／開始入市」等）優先於主鈕
      const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
      const F = window.__ysFxCount || {};
      const R = window.__rec || {};
      const sk = document.getElementById('skipbtn');
      return { mainText: mb ? mb.textContent : '', mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, skipOk: !!sk && sk.style.display !== 'none' && sk.offsetParent !== null, duels: F.duels || 0, marks: R.marks || {}, ndu: (R.duels || []).length };
    });
    duelsSeen = st.ndu;
    if (opts.onDuel && st.ndu > 0 && !shots['__ondu' + st.ndu]) { shots['__ondu' + st.ndu] = true; await opts.onDuel(page, st.ndu); }
    if (opts.shots) {
      for (const k of ['lineupAt', 'attackAt', 'burnAt']) {
        if (st.marks[k] && !shots[k] && Date.now() >= st.marks[k]) {
          shots[k] = true;
          const file = `${opts.shots}-${k.replace('At', '')}.png`;
          await page.screenshot({ path: file });
          shots[k + 'File'] = file;
        }
      }
    }
    if (st.duels >= want && duelsSeen >= want) break;
    if (/再入妖市/.test(st.mainText)) break; // 一局打完了還沒湊到場數：到此為止
    // 卷 C3 T-6 的 SKIP 基準：對決一開始就按跳過（skipbtn 只在演出中顯示）
    if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
    else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
    else if (st.mainOk) {
      lastText = st.mainText;
      await page.click('#mainbtn').catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  const rec = await page.evaluate(() => ({ rec: window.__rec, fxc: window.__ysFxCount || null, ys3d: !!window.__yaoshi3d, gl: window.__yaoshi3d ? window.__yaoshi3d.glName : null, ver: (document.getElementById('verLine') || {}).textContent }));
  return { ...rec, errors: errs, lastMainText: lastText, shots, elapsedMs: Date.now() - t0 };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const [url, out] = pos;
  if (!url || !out) { console.error('need <url> <out.json>'); process.exit(2); }
  const port = Number(opt.port || (url.match(/:(\d+)\//) || [])[1] || 8831);
  const root = opt.root ? path.resolve(opt.root) : ROOT;
  const srv = await serve(root, port);
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const r = await drive(page, url, { duels: Number(opt.duels || 4), shots: opt.shots, no3d: !!opt.no3d, noglb: !!opt.noglb, loadmax: opt.loadmax, skip: !!opt.skip });
    fs.writeFileSync(out, JSON.stringify(r, null, 1));
    const d = r.rec.duels;
    const abOk = d.every((x) => !x.armies || x.armies.every((s) => s.every((u) => u.hasAb)));
    console.log(JSON.stringify({ out, duels: d.length, errors: r.errors.length, ys3d: r.ys3d, abOnAllUnits: abOk,
      burn: r.fxc && r.fxc.burn, burnFig: r.fxc && r.fxc.burnFig, burnDom: r.fxc && r.fxc.burnDom, trait: r.fxc && r.fxc.trait, traitFig: r.fxc && r.fxc.traitFig, load: r.fxc && r.fxc.load, ver: r.ver,
      duelsMs: d.map((x) => [x.dur, (x.trait1 || 0) - (x.trait0 || 0), (x.traitFig1 || 0) - (x.traitFig0 || 0), x.skipped ? 'S' : '']) }));
    if (r.errors.length) console.log(r.errors.slice(0, 10).join('\n'));
    await browser.close();
  } finally { srv.kill(); }
}
