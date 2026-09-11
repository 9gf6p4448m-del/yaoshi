// 請神 3.0「香火池」Playwright 驅動（凍結檔 docs/experiments/2026-09-10-acceptance-legend-v3.md H6／H11）
// 用法：node tests/tools/legend-drive.mjs <out.json> [--port=9511] [--seeds=1,2,3,4,5,6] [--root=<靜態根目錄>]
//                                          [--shots=<png 前綴>] [--legend=0] [--burn=0] [--all]
//                                          [--base=<felt-probe 對基準量的 json>] [--slack=52]
//                                          [--sel=<橫向溢出選擇器清單>] [--taps] [--tapsonly]
//                                          [--tapseeds=1,3] [--taprounds=3] [--tapbase=<基準 json>] [--tapout=<json>]
//   --sel=      橫向溢出量哪些容器（**收斂**：#market 退役、#railW／#railE 上線之後不逐支複製選擇器，改吃這個旗標）
//   --taps      觸控命中回歸（掏空卷 v0.55a 凍結檔 T5）：對第 1～3 夜出價頁與盯上頁的**每一個** `#table [onclick]`
//               各 tap 一次，驗「這一 tap 有沒有讓對應的處理函式被呼叫」，並驗 #tray 沒有吃掉任何一個
//   --tapsonly  只跑 --taps／--t3d／--modal／--handoff 那幾段（量基準時用，不必把整局玩完）
//   --modal     R1-CRITICAL-1：真的打開袋子／三席 ⓘ／說明四種面板，在 #helpBtn 矩形上取樣 elementFromPoint
//               五點全部必須落在 #modal 裡（--modalout=<json> 落明細）
//   --handoff   R1-HIGH-1：熱座封一筆「押 2」→ 蓋牌 → 交棒畫面出現當下，牌桌上私有徽章殘留必須 0
//   --t3d       kill switch 雙向（T1）＋直式蓋板 computed 值（T6）；--t3dout=<json> 落明細、--t6base=<基準 json> 逐項對照
//   --burn=0    真人整局不燒香（對照組）
//   --legend=0  關掉整個請神機制（量橫向溢出的對照組）；不帶 --legend＝完全不帶 query，走 CFG 預設（＝開）
//   --all       不提早收工，把 --seeds 給的每一顆都跑完（凍結檔 H6 的「seeds ≥6」照字面走）
// 做的事：自起 http.server，用真的瀏覽器把一整局玩完（真人座位每夜燒滿香），錄下
//   ① console error／pageerror／requestfailed
//   ② H6 的三條路徑各至少一次：**請走**、**真人選尊視窗出現並選擇**、**落空保留**（請神夜落空者下一夜 h 仍在）
//   ③ 每一次畫面更新後的橫向溢出（844×390 橫式與 390×844 直式各量一輪）
//   ④ #felt 的**直向**溢出（第 1 夜每頁＝0、其餘頁 ≤ 基準同格＋--slack）
// ★3.0 與 2.0 的差別★：沒有「尊→夜」也沒有「落空的階段獎勵」，所以舊版判定用的 rewards 這一格退場，
// 換成「落空保留」——那才是 3.0 真正要走到的新路徑。回天改列**記錄項**（凍結檔 H6 沒有要求它）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
/* worktree 裡沒有 tools/（那是主 repo 的目錄），所以往上找到第一個裝了 playwright 的地方 */
function loadChromium() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fs.existsSync(c)) return createRequire(c)('playwright').chromium;
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
}
const argv = process.argv.slice(2);
const opt = {};
const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'legend-drive.json');
const PORT = +(opt.port || 9511);
const SERVE_ROOT = opt.root || ROOT;
const SEEDS = (opt.seeds || '1,2,3,4,5,6,7,8').split(',').map(Number);
// 這一顆種子拿到傳說之後會按一次「送神回天」，把 releaseLegend 的真人路徑走過
const GIVEUP_SEED = +(opt.giveup || SEEDS[1] || SEEDS[0]);
/* H6 直向（門檻沿用 2.0 凍結檔 §2.1 修訂四二版）：
   --base=<json>＝基準版各格的溢出值（`felt-probe.mjs --json=` 對基準 index.html 量出來的那一份）；
   --slack=<px>＝香火榜／待請卡展開的高度寬限（預設 52）。沒帶 --base 就沒有基準可比，一律不算通過。 */
const BASE_V = opt.base && fs.existsSync(opt.base) ? JSON.parse(fs.readFileSync(opt.base, 'utf8')) : {};
const BASE_SLACK = +(opt.slack || 52);
/* 橫向溢出的選擇器清單（掏空卷 v0.55a 凍結檔 T4 的 12 個＋兩個舊容器當加嚴）。
   `#market` 這個 id 在掏空頁退役 ⇒ 清單改吃 --sel（收斂），不逐支治具各寫一份新選擇器。
   清單裡查不到的選擇器自然跳過（基準版沒有 #railW／掏空版沒有 #market，同一份清單兩邊都跑得動）。 */
const SEL_LIST = String(opt.sel || '#table,#north,#shrines,.incboard,.shcards,#felt,#stage,#south,#railW,#railE,.incbar,.preview,#market,.legendPicks')
  .split(',').map((x) => x.trim()).filter(Boolean);
/* --taps（T5）：tap 掃描用的種子與夜數。預設 1,3 ×第 1～3 夜——與 felt-probe 的 --seeds=1,3 同一組，
   而且 seed 1 第 3 夜是押寶夜（#stage 裡有 stepper）⇒ 這一組才驗得到「#tray 有沒有壓住 #felt 裡的可點元素」。 */
const TAP_SEEDS = String(opt.tapseeds || '1,3').split(',').map(Number);
const TAP_ROUNDS = +(opt.taprounds || 3);
const TAP_BASE = opt.tapbase && fs.existsSync(opt.tapbase) ? JSON.parse(fs.readFileSync(opt.tapbase, 'utf8')) : null;
const TAP_OUT = opt.tapout || null;

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

/* 頁面端：量整頁與幾個關鍵容器的橫向溢出（scrollWidth > clientWidth 即溢出）。
   自己就是可捲容器（overflow-x:auto/scroll）的不算溢出——那是刻意讓它內部捲，外層版面沒有被撐開。 */
const OVERFLOW = `(() => {
  const rows = [];
  const push = (sel, el) => { if (!el) return;
    const ox = getComputedStyle(el).overflowX; if (ox === 'auto' || ox === 'scroll') return;
    const o = el.scrollWidth - el.clientWidth;
    if (o > 1) rows.push({ sel, scrollW: el.scrollWidth, clientW: el.clientWidth, over: o }); };
  push('html', document.documentElement);
  push('body', document.body);
  for (const sel of __SELS__)
    document.querySelectorAll(sel).forEach((el) => push(sel, el));
  return rows;
})()`.replace('__SELS__', JSON.stringify(SEL_LIST));

/* #felt 的直向溢出：#felt 是 overflow-y:auto，捲得動不代表看得到——
   844×390 這個尺寸下把市集卡的部隊預覽整行推到看不見，就是版面沒放下。 */
const VOVERFLOW = `(() => {
  const f = document.getElementById('felt');
  if (!f) return null;
  return { scrollH: f.scrollHeight, clientH: f.clientHeight, over: f.scrollHeight - f.clientHeight };
})()`;

/* ===== T5 觸控命中回歸（掏空卷 v0.55a）=====
   做法（凍結檔 T5 的字面）：在第 1～3 夜的出價頁與盯上頁，對**每一個** `#table [onclick]` 元素各 tap 一次，
   記錄「這一 tap 有沒有讓對應的處理函式被呼叫」。
   ★量的是「點得到嗎」，不是「元素還在嗎」★——所以：
   ① 用 `page.touchscreen.tap(x,y)` 打在元素中心的**座標**上，真的走瀏覽器的命中測試（#tray 蓋住就會被它吃掉）
   ② 在頁面端把每個 onclick 用到的全域函式換成計數 proxy ⇒ tap 完全不改遊戲狀態，掃描順序不影響結果
   ③ 同時數 `trayTap` 被呼叫幾次：tap 落在既有可點元素上時必須是 0（#tray 不得吃掉別人的事件）
   基準（v0.53）由同一支治具跑一次產生清單（--tapout），新版用 --tapbase 帶進來逐項比對。 */
const TAP_INSTALL = `(() => {
  const els=[...document.querySelectorAll('#table [onclick]')];
  const names=new Set(['trayTap']);
  els.forEach(e=>{ const a=e.getAttribute('onclick')||'';
    (a.match(/([A-Za-z_$][\\w$]*)\\s*\\(/g)||[]).forEach(m=>names.add(m.replace(/\\s*\\($/,''))); });
  window.__tapCount={}; window.__tapArgs={}; window.__tapOrig={};
  const stubbed=[];
  /* 0.56a 二版（覆審 MEDIUM-2）：計數之外把**第一個引數**也記下來。
     177 個可測元素裡 48 個是拍品卡，四張卡共用同一支處理函式（pickMark／openSheet／ybToggle）——
     只數「函式被呼叫」的話，兩張卡疊在一起或左右側欄順序錯掉仍然會綠。記了引數才分得出哪一張。 */
  names.forEach(n=>{ if(typeof window[n]==='function'){ window.__tapOrig[n]=window[n];
    window[n]=function(){ window.__tapCount[n]=(window.__tapCount[n]||0)+1;
      (window.__tapArgs[n]=window.__tapArgs[n]||[]).push(arguments.length?String(arguments[0]):''); }; stubbed.push(n); } });
  return stubbed;
})()`;
const TAP_RESTORE = `(() => { const o=window.__tapOrig||{}; Object.keys(o).forEach(n=>{ window[n]=o[n]; }); return 1; })()`;
const TAP_ENUM = `(() => {
  const stub=new Set(Object.keys(window.__tapOrig||{}));
  return [...document.querySelectorAll('#table [onclick]')].map(e=>{
    const r=e.getBoundingClientRect();
    const a=e.getAttribute('onclick')||'';
    const cand=(a.match(/([A-Za-z_$][\\w$]*)\\s*\\(/g)||[]).map(m=>m.replace(/\\s*\\($/,'')).filter(n=>stub.has(n));
    const fn=cand[0]||null;
    /* onclick 屬性裡那支函式的**字面第一引數**（例：openSheet(2) ⇒ "2"、showBag(0) ⇒ "0"）。
       取不到（沒有引數、或引數是運算式）就記 null，那一格只驗「有沒有被呼叫」。 */
    let want=null;
    if(fn){ const mm=a.match(new RegExp(fn.replace(/[$]/g,'\\\\$')+'\\\\(\\\\s*([^,)]*)'));
      if(mm){ const raw=(mm[1]||'').trim().replace(/^['"]|['"]$/g,''); want=/^-?\\d+$/.test(raw)?raw:(raw===''?null:raw); } }
    return { sig:(e.id||(e.className||'').toString().trim()||e.tagName)+'::'+a.replace(/\\s+/g,' ').slice(0,40),
      expect:fn, want:want, x:+(r.left+r.width/2).toFixed(1), y:+(r.top+r.height/2).toFixed(1),
      w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      /* dis＝產品自己把它停用了（例：燒香列的「−」在 amt=0 時 disabled）——停用的鈕本來就不該有反應，
         基準版同樣打不中，所以它不進「可測集合」；但停用狀態本身要記下來比對，
         免得新版把某顆本來點得到的鈕變成停用而靜默消失在分母裡。 */
      dis: e.disabled===true,
      vis: r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden' };
  });
})()`;

/* ===== T1 kill switch 雙向＋T6 直式蓋板行為（掏空卷 v0.55a）=====
   T1：`?table3d=0` 四項全是 v0.53 的值、預設（不帶旗標）四項全反——**只驗開不驗關＝反向探針**（02 §6.1 第 1 條），
       所以兩邊都量，而且量的是 computed 值與實際的 DOM 內容，不是「旗標有沒有被讀到」。
   T6：390×844 下量 computed 值（#rotateHint display／#table 欄寬／.rail display／#table 橫向溢出／#felt 的毛玻璃），
       --t6base= 帶基準版同一組值逐項比對——只截圖看「有沒有蓋住」是看不出蓋板底下版面爆掉的。 */
const T3D_SNAP = `(() => {
  const g=(el,p)=>el?getComputedStyle(el)[p]:'(absent)';
  const t=document.getElementById('table'), f=document.getElementById('felt');
  const rw=document.getElementById('railW'), re=document.getElementById('railE');
  return {
    cols: g(t,'gridTemplateColumns'),
    hollow: !!(f && f.classList.contains('hollow')),
    trayDisplay: g(document.getElementById('tray'),'display'),
    railW: rw?rw.childElementCount:'(absent)',
    railE: re?re.childElementCount:'(absent)',
    marketCards: document.querySelectorAll('#market .mcard').length,
    railCards: document.querySelectorAll('.rail .mcard').length,
    rotateHint: g(document.getElementById('rotateHint'),'display'),
    railDisplay: g(rw,'display'),
    feltBackdrop: g(f,'backdropFilter'),
    tableOverX: t?(t.scrollWidth-t.clientWidth):null
  };
})()`;

async function snapAt(browser, port, query) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(() => { CFG.T = 1;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 800; i++) {
    await page.waitForTimeout(12);
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn');
      return { t:b?b.textContent:'', d:b?b.disabled:true }; })()`);
    if (/蓋牌/.test(st.t) && !st.d) break;
    if (!st.d) await page.click('#mainbtn');
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e) e.click(); })()`);
  }
  await page.waitForTimeout(150);
  const land = await page.evaluate(T3D_SNAP);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const port2 = await page.evaluate(T3D_SNAP);
  await ctx.close();
  return { landscape: land, portrait: port2, errors: errs };
}

async function runT3d(browser, port) {
  const off = await snapAt(browser, port, '?table3d=0');
  const on = await snapAt(browser, port, '');
  return { off, on };
}

/* ===== CRITICAL-1（覆審 R1）：`#modal` 面板開著時，`#helpBtn` 不得贏得那一塊的命中測試 =====
   為什麼 T5 看不到這件事：T5 的計數 proxy 把 `showBag`／`showRoleInfo`／`openHelp` 換成空函式 ⇒
   整輪 tap 掃描裡**面板一次都沒真的打開過**；而且 T4／T5 只量 `#table` 內，`#modal` 不在任何一條的範圍。
   所以這一支**真的把面板打開**，再在 `#helpBtn` 自己的矩形上取樣 `elementFromPoint`：
   五個點（中心＋四角內縮 2px）**每一個都必須落在 `#modal` 裡**（`closest('#modal')` 非 null）。
   基準 v0.53 天生成立（`#felt` 的 backdrop-filter 建立堆疊環境，把 helpBtn 的 z-index:25 關在裡面）。 */
const MODAL_SAMPLE = `((label) => {
  const hb=document.getElementById('helpBtn'), m=document.getElementById('modal'), mb=document.getElementById('modalbox');
  const r=hb?hb.getBoundingClientRect():null, mr=mb?mb.getBoundingClientRect():null;
  const open=!!(m && getComputedStyle(m).display !== 'none');
  const pts=[];
  if(r && r.width>0){
    const cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
    [[cx,cy],[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]].forEach(([x,y])=>{
      const el=document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,x)),Math.max(0,Math.min(innerHeight-1,y)));
      pts.push({ x:+x.toFixed(1), y:+y.toFixed(1),
        el: el ? (el.id || (el.className||'').toString().trim().slice(0,24) || el.tagName) : '(null)',
        inModal: !!(el && el.closest && el.closest('#modal')) });
    });
  }
  const ov = (r && mr) ? { x:+Math.max(0,Math.min(r.right,mr.right)-Math.max(r.left,mr.left)).toFixed(1),
                           y:+Math.max(0,Math.min(r.bottom,mr.bottom)-Math.max(r.top,mr.top)).toFixed(1) } : null;
  return { label, open, helpBtnVisible: !!(r && r.width>0),
    helpRect: r?[+r.left.toFixed(1),+r.right.toFixed(1),+r.top.toFixed(1),+r.bottom.toFixed(1)]:null,
    modalboxRect: mr?[+mr.left.toFixed(1),+mr.right.toFixed(1),+mr.top.toFixed(1),+mr.bottom.toFixed(1)]:null,
    overlap: ov, pts };
})`;

async function runModal(browser, port) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(() => { CFG.T = 1;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 900; i++) {
    await page.waitForTimeout(12);
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn');
      return { t:b?b.textContent:'', d:b?b.disabled:true }; })()`);
    if (/蓋牌/.test(st.t) && !st.d) break;
    if (!st.d) await page.click('#mainbtn');
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e) e.click(); })()`);
  }
  await page.waitForTimeout(150);
  const rows = [];
  /* 四種走 #modal 的面板：袋子、三席的角色資訊 ⓘ、說明。#sheet／#review 是 z-index 30，不在這一條的範圍。 */
  const opens = [['袋子 showBag(1)', 'showBag(1)'], ['角色資訊 showRoleInfo(1)', 'showRoleInfo(1)'],
    ['角色資訊 showRoleInfo(2)', 'showRoleInfo(2)'], ['角色資訊 showRoleInfo(3)', 'showRoleInfo(3)'],
    ['說明 openHelp()', 'openHelp()']];
  rows.push(await page.evaluate(`(${MODAL_SAMPLE})('（沒開面板：對照組）')`));
  for (const [label, call] of opens) {
    await page.evaluate(`(() => { ${call}; })()`);
    await page.waitForTimeout(120);
    rows.push(await page.evaluate(`(${MODAL_SAMPLE})(${JSON.stringify(label)})`));
    await page.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
    await page.waitForTimeout(60);
  }
  await ctx.close();
  return { rows, pageerrors: errs };
}

/* ===== HIGH-1（覆審 R1）：熱座交棒的「雙保險」清場對掏空頁也要有效 =====
   走真實路徑：熱座開局 → 出價頁 → `openSheet(0)` 封一筆「押 2」 → 按蓋牌 → 交棒畫面出現的那一刻，
   牌桌上**任何一顆私有徽章都不許留著**（`#table .mybid,.pickbox,.wishbar,.stakebar,.incbar`）。
   掏空之後卡片在 `#railW`／`#railE`，舊的 `#stage ` 前綴一顆都不命中 ⇒ 這一支就是守它的。 */
async function runHandoff(browser, port, query) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html${query || ''}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(() => { CFG.T = 1;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__yaoshi.newGame('hotseat', 5, ['qingmian', 'hongyi']); });
  const COUNT = `(() => {
    const sel='#table .wishbar,#table .stakebar,#table .incbar,#table .mybid,#table .pickbox,#south .incbar';
    const all=[...document.querySelectorAll(sel)];
    const vis=all.filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0 && r.height>0; });
    const ho=document.getElementById('handoff');
    return { handoff: !!(ho && getComputedStyle(ho).display !== 'none'),
      total: all.length, visible: vis.length,
      where: all.map(e=>{ const p=e.closest('#railW,#railE,#stage,#south,#northPrev,#northShr');
        return (p?p.id:'?')+':'+(e.className||'').toString().split(' ')[0]+'="'+(e.textContent||'').trim().slice(0,6)+'"'; }) };
  })()`;
  const rec = { query: query || '（預設・掏空）', sealedIn: null, atHandoff: null, sealedCount: null, pageerrors: errs, reached: false };
  for (let i = 0; i < 1200; i++) {
    await page.waitForTimeout(12);
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const ho=document.getElementById('handoff');
      return { t:b?b.textContent:'', d:b?b.disabled:true, handoff: !!(ho && getComputedStyle(ho).display !== 'none') }; })()`);
    /* 熱座在**進入出價之前**就會先出現一次交棒畫面（showHandoff(ACTIVE, startBidUI)）。
       那一次還沒有人封標，量它等於什麼都沒驗——所以封標之前遇到的交棒一律按掉、繼續走。 */
    if (st.handoff) {
      if (rec.sealedIn === null) { await page.click('#hoBtn'); await page.waitForTimeout(60); continue; }
      rec.atHandoff = await page.evaluate(COUNT); rec.reached = true; break;
    }
    if (/蓋牌/.test(st.t) && !st.d && rec.sealedIn === null) {
      // 第一位真人封一筆「押 2」（走真實 UI：開出價視窗 → 兩次 +1 → 確定）
      await page.evaluate(`(() => { openSheet(0); bump(1); bump(1); closeSheet(); })()`);
      await page.waitForTimeout(80);
      const seal = await page.evaluate(`(() => { const b=document.querySelector('#table .mybid');
        return b ? { where:(b.closest('#railW,#railE,#stage')||{}).id||'?', txt:(b.textContent||'').trim() } : null; })()`);
      rec.sealedIn = seal;
      rec.sealedCount = await page.evaluate(`(() => document.querySelectorAll('#table .mybid').length)()`);
      await page.click('#mainbtn');
      await page.waitForTimeout(120);
      const now = await page.evaluate(COUNT);
      if (now.handoff) { rec.atHandoff = now; rec.reached = true; break; }
      continue;
    }
    if (!st.d) await page.click('#mainbtn');
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e) e.click(); })()`);
  }
  await ctx.close();
  return rec;
}

async function runTaps(browser, port) {
  const rec = { rows: [], trayTaps: 0, pages: 0, stubbed: null };
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  for (const seed of TAP_SEEDS) {
    await page.evaluate((sd) => { CFG.T = 1;
      const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
      window.__yaoshi.newGame('solo', sd, ['qingmian']); }, seed);
    const seen = {};
    for (let i = 0; i < 2000; i++) {
      await page.waitForTimeout(12);
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S;
        return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0 }; })()`);
      if (st.r > TAP_ROUNDS) break;
      const isBid = /蓋牌/.test(st.t), isMark = /不盯任何一件/.test(st.t);
      const key = `${st.r}|${isBid ? '出價' : '盯上'}`;
      if (!st.d && (isBid || isMark) && !seen[key]) {
        seen[key] = 1;
        rec.pages++;
        rec.stubbed = await page.evaluate(TAP_INSTALL);
        const els = await page.evaluate(TAP_ENUM);
        for (const el of els) {
          if (!el.vis || el.dis) { rec.rows.push({ key: `${seed}|${key}|${el.sig}`, vis: el.vis, dis: el.dis, hit: null, expect: el.expect }); continue; }
          await page.evaluate('(() => { window.__tapCount = {}; window.__tapArgs = {}; })()');
          await page.touchscreen.tap(Math.max(1, Math.min(843, el.x)), Math.max(1, Math.min(389, el.y)));
          await page.waitForTimeout(25);
          const cnt = await page.evaluate('(() => window.__tapCount || {})()');
          const args = await page.evaluate('(() => window.__tapArgs || {})()');
          const called = !!(el.expect && (cnt[el.expect] | 0) > 0);
          /* 0.56a 二版（覆審 MEDIUM-2）：帶字面引數的元素（.mcard → openSheet(i)／pickMark(i)／ybToggle(i)、
             座位 → showBag(id)）要**引數也對**才算命中——不然四張卡全部誤判成同一張也會綠。 */
          const gotArg = (el.want != null && args[el.expect]) ? args[el.expect][0] : null;
          const argOk = (el.want == null) ? true : (gotArg === el.want);
          const hit = called && argOk;
          const tray = cnt.trayTap | 0;
          rec.trayTaps += tray;
          if (el.want != null && called && !argOk) rec.argMiss = (rec.argMiss || 0) + 1;
          rec.rows.push({ key: `${seed}|${key}|${el.sig}`, vis: true, dis: false, hit, called, expect: el.expect,
            want: el.want, gotArg, tray, got: Object.keys(cnt).join(',') });
        }
        await page.evaluate(TAP_RESTORE);
      }
      if (!st.d) await page.click('#mainbtn');
      else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e) e.click(); })()`);
    }
  }
  await ctx.close();
  return rec;
}

const main = async () => {
  const srv = await serve(SERVE_ROOT, PORT);
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const rec = { seeds: [], errors: [], pageerrors: [], requestfailed: [], overflow: [], voverflow: [], vrows: [],
    portraitOverflow: [], taken: 0, dawn: 0, dawnShrines: 0, skips: 0, picks: 0, carry: 0, carryEg: [], games: [] };
  try {
    if (opt.t3d) rec.t3d = await runT3d(browser, PORT);
    if (opt.modal) rec.modal = await runModal(browser, PORT);
    /* 兩條路都跑（三版，覆審 R2 列為未確認）：掏空版（卡片在 #railW／#railE）與 `?table3d=0`（卡片在 #stage 的 #market）。
       清場選擇器是同一份 `#table ` 前綴，兩條路都要證明它有效。 */
    if (opt.handoff) rec.handoff2 = [await runHandoff(browser, PORT, ''), await runHandoff(browser, PORT, '?table3d=0')];
    if (opt.taps) rec.taps = await runTaps(browser, PORT);
    if (!opt.tapsonly) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') rec.errors.push(m.text()); });
    page.on('pageerror', (e) => rec.pageerrors.push(String(e)));
    page.on('requestfailed', (r) => rec.requestfailed.push(r.url() + ' ' + (r.failure() || {}).errorText));
    // 開場三卡（showIntro）把 #mainbtn 停用、只認自己那顆按鈕，會把驅動卡在第 1 夜；
    // 直接把「看過了」的旗標寫進 localStorage，走的是產品自己的 introSeen() 路徑。
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const q = opt.legend === undefined ? '' : `?legend=${opt.legend === '0' ? 0 : 1}`;
    await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`, { waitUntil: 'load' });
    rec.version = await page.evaluate(`(() => VERSION)()`);
    rec.legendOn = await page.evaluate(`(() => CFG.LEGEND_ON)()`);
    rec.shrineNights = await page.evaluate(`(() => CFG.SHRINE_NIGHTS)()`);
    rec.shrineEl = await page.evaluate(`(() => !!document.getElementById('shrines'))()`);
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });

    for (const seed of SEEDS) {
      if (!opt.all && rec.taken > 0 && rec.picks > 0 && rec.carry > 0) break;
      rec.seeds.push(seed);
      const g = { seed, nights: 0, clicks: 0, taken: [], dawn: 0, burned: 0, stuck: null, txts: {},
        shrineEl: null, incEl: null, boardEl: null, picked: [], poolByRound: {}, skips: 0 };
      // 開一局（真人＝南家，角色固定，避免選角畫面的隨機）；把演出節拍壓到最短
      await page.evaluate((sd) => {
        CFG.T = 1;
        const F = window.__yaoshi.PW_FX;
        for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
        window.__yaoshi.newGame('solo', sd, ['qingmian']);
      }, seed);
      let lastKey = null, stallN = 0;
      for (let step = 0; step < 2600; step++) {
        await page.waitForTimeout(12);
        const st = await page.evaluate(`(() => {
          const b = document.getElementById('mainbtn');
          const S = window.__yaoshi.S;
          return { txt: b ? b.textContent : '', dis: b ? b.disabled : true,
            round: S ? S.round : 0,
            shrines: S && S.shrines ? S.shrines.map(s => ({ i: s.i, open: s.open, takenBy: s.takenBy, dawn: !!s.dawn })) : null,
            pool: S && S.incPool ? [...S.incPool] : null,
            skips: (S && S.shrineStat) ? (S.shrineStat.skip | 0) : 0,
            dawnShrines: S && S.shrines ? S.shrines.filter(s => s.dawn).length : 0,
            hasInc: typeof INC !== 'undefined' && !!INC,
            bidding: b && /蓋牌/.test(b.textContent) };
        })()`);
        g.nights = Math.max(g.nights, st.round);
        if (g.shrineEl === null) g.shrineEl = await page.evaluate(`(() => !!document.getElementById('shrines'))()`);
        if (g.boardEl === null) g.boardEl = await page.evaluate(`(() => !!document.querySelector('.incboard') && document.querySelectorAll('.shcard').length)()`);
        if (g.incEl === null && st.bidding) g.incEl = await page.evaluate(`(() => !!document.querySelector('.incbar'))()`);
        g.txts[st.txt + (st.dis ? '（停用）' : '')] = (g.txts[st.txt + (st.dis ? '（停用）' : '')] || 0) + 1;
        g.stuck = st.txt + (st.dis ? '（停用）' : '');
        if (st.shrines) g.taken = st.shrines.filter((s) => s.takenBy != null).map((s) => s.i);
        // 香火池逐夜快照（同一夜會被後來的值覆寫 ⇒ 留下的是那一夜結束時的值）：H6「落空保留」的素材
        if (st.pool && st.round) g.poolByRound[st.round] = st.pool;
        g.skips = st.skips;
        const key = st.txt + (st.dis ? '/d' : '');
        if (key !== lastKey) {
          lastKey = key;
          const ov = await page.evaluate(OVERFLOW);
          if (ov.length) rec.overflow.push({ seed, step, txt: st.txt, ov });
          // 直向：只在第 1～3 夜的出價頁與盯上頁取樣；**第 1 夜的每一頁必須是 0**，
          // 其餘頁只要不比基準同格＋BASE_SLACK 差。基準由 --base=<json> 帶進來；沒帶就只印不判。
          if (st.round >= 1 && st.round <= 3 && !st.dis && /蓋牌|不盯任何一件/.test(st.txt)) {
            const vo = await page.evaluate(VOVERFLOW);
            rec.vsamples = (rec.vsamples || 0) + 1;
            const vkey = `${seed}|${st.round}|${/蓋牌/.test(st.txt) ? '出價' : '盯上'}`;
            /* --base= 的鍵：felt-probe 單容器時是 `seed|round|page`、多容器時是 `#felt|seed|round|page`，兩種都吃 */
            const base = (BASE_V[vkey] !== undefined) ? BASE_V[vkey] : BASE_V['#felt|' + vkey];
            const cap = (st.round === 1) ? 0 : ((base == null ? 0 : base) + BASE_SLACK);
            const judged = (base != null);
            rec.vrows.push({ key: vkey, over: vo ? vo.over : null, base: base == null ? null : base, cap, judged });
            if (judged && vo && vo.over > cap) rec.voverflow.push({ seed, round: st.round, txt: st.txt, cap, base, ...vo });
          }
        }
        // 覆審沿用：六顆種子挑一顆在拿到傳說之後按一次袋子面板的「送神回天」，
        // 讓 releaseLegend 的 refund=false 那條路徑在**真瀏覽器**裡走過一次。
        if (seed === GIVEUP_SEED && !g.gaveUp && st.bidding) {
          const done = await page.evaluate(`(() => {
            const S = window.__yaoshi.S; const me = S.players[0];
            if (!me.bag.some(x => x.legend)) return 0;
            showBag(0);
            const b = document.querySelector('#modalbox .tithebtn');
            if (!b) { closeModal(); return 0; }
            b.click(); closeModal(); return 1;
          })()`);
          if (done) { g.gaveUp = 1; rec.giveUp = (rec.giveUp || 0) + 1; }
        }
        /* H7 人眼關鍵單張（只在第一顆種子拍）：第 1 夜的出價頁、請神夜**前一夜**的出價頁。
           兩張都要看得到「香火榜一行＋三尊待請卡」在中央面板法寶卡正上方——
           前一夜那張是 wide（拆成兩列、卡上多印招式名），第 1 夜那張是 slim（擠成一列）。 */
        if (opt.shots && seed === SEEDS[0] && st.bidding && !st.dis) {
          const pre = (rec.shrineNights || [4])[0] - 1;
          if (st.round === 1 && !rec.shotN1) { rec.shotN1 = 1; await page.screenshot({ path: `${opt.shots}-n1.png` }); }
          if (st.round === pre && !rec.shotPre) { rec.shotPre = 1; await page.screenshot({ path: `${opt.shots}-pre.png` }); }
        }
        if (st.bidding && st.hasInc && opt.burn !== '0') {
          // 每夜燒滿，確保一定會走到「請走」與「真人選尊視窗」那條路
          await page.evaluate(`(() => { const M = CFG.INC_MAX; for (let k = 0; k < M; k++) incBump(1); })()`);
          g.burned++;
        }
        if (step % 400 === 0 && step) console.log(`    …seed ${seed} step ${step} 第 ${st.round} 夜「${st.txt}${st.dis ? '（停用）' : ''}」`);
        if (st.txt === '再入妖市') break;
        // ★真人選尊視窗（請神 3.0 §二 3）★：#modal 上是三張 .legendPick 卡，#mainbtn 這時停用。
        // 刻意挑**第二張**（不是第一張）——那正好不是 AI 規則在空袋時會挑的那一尊，
        // 所以「玩家挑的真的被採用」這件事才驗得到（只有一張時就挑那一張）。
        if (opt.shots && !rec.shotPick) {
          const up = await page.evaluate(`(() => { const m = document.getElementById('modal');
            return !!(m && getComputedStyle(m).display !== 'none' && document.querySelector('#modalbox .legendPick')); })()`);
          if (up) { rec.shotPick = 1; await page.screenshot({ path: `${opt.shots}-pick.png` }); }
        }
        const pick = await page.evaluate(`(() => {
          const m = document.getElementById('modal');
          if (!m || getComputedStyle(m).display === 'none') return null;
          const bs = [...document.querySelectorAll('#modalbox .legendPick')];
          if (!bs.length) return null;
          const k = bs.length > 1 ? 1 : 0;
          const oc = bs[k].getAttribute('onclick') || '';
          const mm = oc.match(/legendPick\\((\\d+)\\)/);
          const idx = mm ? +mm[1] : null;
          bs[k].click();
          return { idx, n: bs.length };
        })()`);
        if (pick) {
          g.picked.push(pick);
          rec.picks++;
          // 立刻驗：玩家點的那一尊真的記在自己名下（南家＝座位 0）
          await page.waitForTimeout(40);
          const okPick = await page.evaluate(`(() => { const S = window.__yaoshi.S;
            return S.shrines[${pick.idx}] ? S.shrines[${pick.idx}].takenBy : null; })()`);
          if (okPick !== 0) rec.pickMismatch = (rec.pickMismatch || 0) + 1;
          stallN = 0; continue;
        }
        // 供奉危急提示：那是 #modal 上的兩顆鈕，#mainbtn 這時是停用的，
        // 不處理的話驅動會卡死。一律按「要，繼續供奉」＝與 headless 的預設同一條路。
        const ask = await page.evaluate(`(() => { const m = document.getElementById('modal');
          if (!m || getComputedStyle(m).display === 'none') return 0;
          const k = document.getElementById('titheKeep'); if (!k) return 0; k.click(); return 1; })()`);
        if (ask) { g.titheAsk = (g.titheAsk || 0) + 1; rec.titheAsk = (rec.titheAsk || 0) + 1; stallN = 0; continue; }
        if (!st.dis) { await page.click('#mainbtn'); g.clicks++; stallN = 0; continue; }
        stallN++;
        if (stallN > 25) {
          // #stage 裡自帶按鈕的畫面：異事密封輸入與開場三卡
          const hit = await page.evaluate(`(() => {
            const els = [...document.querySelectorAll('#stage button')];
            const b = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || ''))
                   || els.find((e) => !e.disabled);
            if (!b) return null; b.click(); return b.textContent.slice(0, 20);
          })()`);
          if (hit) { g.clicks++; g.stageClicks = (g.stageClicks || 0) + 1; }
          stallN = 0;
        }
      }
      // 局末：看回顧（會渲染請神列與回天列，是另一段 DOM，順便驗 0 error）
      await page.evaluate(`(() => { if (typeof showReview === 'function') showReview(); })()`);
      await page.waitForTimeout(200);
      const ovR = await page.evaluate(OVERFLOW);
      if (ovR.length) rec.overflow.push({ seed, step: 'review', ov: ovR });
      await page.evaluate(`(() => { if (typeof closeReview === 'function') closeReview(); })()`);
      await page.evaluate(`(() => { if (typeof openHelp === 'function') openHelp(); })()`);
      await page.waitForTimeout(150);
      const ovH = await page.evaluate(OVERFLOW);
      if (ovH.length) rec.overflow.push({ seed, step: 'help', ov: ovH });
      await page.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
      const fin = await page.evaluate(`(() => { const S = window.__yaoshi.S;
        if (!S.shrines) return { taken: 0, dawnShrines: 0, dawn: 0, round: S.round, skips: 0 };
        return { taken: S.shrines.filter(s => s.takenBy != null).length,
                 dawnShrines: S.shrines.filter(s => s.dawn).length,
                 dawn: (S.history && S.history.shrineDawn) ? S.history.shrineDawn.length : 0,
                 skips: (S.shrineStat ? (S.shrineStat.skip | 0) : 0),
                 round: S.round }; })()`);
      g.taken = fin.taken; g.dawn = fin.dawn; g.dawnShrines = fin.dawnShrines; g.nights = fin.round; g.skips = fin.skips;
      // ★H6 落空保留★：請神夜 r 結束時 h>0 的人，到第 r+1 夜結束時 h 仍 ≥ 原值（沒被歸零、沒被結清）
      (rec.shrineNights || []).forEach((r) => {
        const a = g.poolByRound[r], b = g.poolByRound[r + 1];
        if (!a || !b) return;
        a.forEach((v, i) => {
          if (v > 0 && b[i] >= v) { rec.carry++; if (rec.carryEg.length < 6) rec.carryEg.push({ seed, round: r, pid: i, h: v, next: b[i] }); }
        });
      });
      rec.taken += fin.taken; rec.dawn += fin.dawn; rec.dawnShrines += fin.dawnShrines; rec.skips += fin.skips;
      rec.games.push(g);
      if (opt.shots) await page.screenshot({ path: `${opt.shots}-s${seed}.png` });
      // H11 人眼：袋子面板（部隊預覽）各拍一張；量的是它會不會在 844×390 撐出橫向溢出
      if (opt.shots) {
        await page.evaluate(`(() => { if (typeof showBag === 'function') showBag(0); })()`);
        await page.waitForTimeout(150);
        const ovB = await page.evaluate(OVERFLOW);
        if (ovB.length) rec.overflow.push({ seed, step: 'bag', ov: ovB });
        await page.screenshot({ path: `${opt.shots}-bag-s${seed}.png` });
        await page.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
      }
    }

    // 手機直式：整頁不得橫向溢出。量在**固定的同一頁**（新開一局、停在出價那一頁）。
    await page.evaluate(`(() => { CFG.T = 1;
      const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
      window.__yaoshi.newGame('solo', 1, ['qingmian']); })()`);
    for (let k = 0; k < 300; k++) {
      await page.waitForTimeout(30);
      const st = await page.evaluate(`(() => { const b = document.getElementById('mainbtn');
        return { txt: b ? b.textContent : '', dis: b ? b.disabled : true }; })()`);
      if (/蓋牌/.test(st.txt)) break;
      if (!st.dis) await page.click('#mainbtn');
    }
    rec.portraitAt = await page.evaluate(`(() => (document.getElementById('mainbtn')||{}).textContent`+`)()`);
    // ── 熱座交棒時，上一位的密封燒香列不得留在 DOM ──
    if (opt.legend !== '0') {
      await page.evaluate(`(() => { CFG.T = 1;
        const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
        window.__yaoshi.newGame('hotseat', 5, ['qingmian', 'hongyi']); })()`);
      const hs = { sawIncbar: false, handoffShown: false, incbarAtHandoff: null, steps: 0 };
      for (let k = 0; k < 400; k++) {
        await page.waitForTimeout(20);
        hs.steps = k;
        const st = await page.evaluate(`(() => {
          const ho = document.getElementById('handoff');
          const b = document.getElementById('mainbtn');
          return { handoff: !!(ho && getComputedStyle(ho).display !== 'none'),
                   txt: b ? b.textContent : '', dis: b ? b.disabled : true,
                   incbar: document.querySelectorAll('#stage .incbar,#south .incbar').length }; })()`);
        if (st.handoff) {
          hs.handoffShown = true;
          if (hs.sawIncbar && hs.incbarAtHandoff === null) hs.incbarAtHandoff = st.incbar;
          await page.click('#hoBtn');
          continue;
        }
        if (/蓋牌/.test(st.txt)) {
          if (st.incbar > 0) hs.sawIncbar = true;
          await page.evaluate(`(() => { if (typeof incBump === 'function') { incBump(1); incBump(1); } })()`);
          await page.click('#mainbtn');
          if (hs.sawIncbar) {
            await page.waitForTimeout(60);
            const now = await page.evaluate(`(() => { const ho = document.getElementById('handoff');
              return { handoff: !!(ho && getComputedStyle(ho).display !== 'none'),
                       incbar: document.querySelectorAll('#stage .incbar,#south .incbar').length }; })()`);
            if (now.handoff) { hs.handoffShown = true; hs.incbarAtHandoff = now.incbar; break; }
          }
          continue;
        }
        if (!st.dis) await page.click('#mainbtn');
      }
      rec.hotseat = hs;
    }
    rec.landscapeFixed = await page.evaluate(OVERFLOW);   // 同一頁的橫式對照（ON／OFF 才比得起來）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    rec.portraitOverflow = await page.evaluate(OVERFLOW);
    // 直式蓋板行為不變：#rotateHint 蓋住整片、#shrines 收起來
    rec.portraitCover = await page.evaluate(`(() => {
      const rh = document.getElementById('rotateHint');
      const sh = document.getElementById('shrines');
      return { rotateHint: !!(rh && getComputedStyle(rh).display !== 'none'),
               shrinesHidden: !sh || getComputedStyle(sh).display === 'none' }; })()`);
    if (opt.shots) await page.screenshot({ path: `${opt.shots}-portrait.png` });
    await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  fs.writeFileSync(OUT, JSON.stringify(rec, null, 1), 'utf8');
  const okErr = rec.errors.length === 0 && rec.pageerrors.length === 0 && rec.requestfailed.length === 0;
  const okPath = rec.taken > 0 && rec.picks > 0 && rec.carry > 0 && !rec.pickMismatch;
  const okOv = rec.overflow.length === 0 && rec.portraitOverflow.length === 0;
  const okVert = rec.voverflow.length === 0 && (rec.vsamples || 0) > 0 && Object.keys(BASE_V).length > 0;
  const okCover = !!(rec.portraitCover && rec.portraitCover.rotateHint && rec.portraitCover.shrinesHidden);
  const okHot = !rec.hotseat || (rec.hotseat.sawIncbar && rec.hotseat.handoffShown && rec.hotseat.incbarAtHandoff === 0);
  /* R1-CRITICAL-1：#modal 開著時 #helpBtn 不得贏得命中測試 */
  let okModal = true;
  if (opt.modal) {
    const m = rec.modal || { rows: [] };
    if (opt.modalout) fs.writeFileSync(opt.modalout, JSON.stringify(m, null, 1), 'utf8');
    const panels = m.rows.filter((r) => r.open);
    const bad = panels.filter((r) => !r.pts.length || r.pts.some((p) => !p.inModal));
    okModal = panels.length >= 5 && bad.length === 0 && (m.pageerrors || []).length === 0;
    console.log(`- **R1-CRITICAL-1 面板遮擋**（真的打開袋子／三席 ⓘ／說明，在 #helpBtn 矩形上取樣 5 點 elementFromPoint）：`
      + `開了 ${panels.length} 種面板、取樣 ${panels.reduce((a, r) => a + r.pts.length, 0)} 點，`
      + `**沒落在 #modal 裡的面板 ${bad.length} 種** → ${okModal ? '✅' : '❌'}`);
    m.rows.forEach((r) => console.log(`    ${r.open ? '面板開著' : '（對照）'} ${r.label}：`
      + `helpBtn ${r.helpRect ? r.helpRect.join('/') : '—'}　modalbox ${r.modalboxRect ? r.modalboxRect.join('/') : '—'}`
      + `　重疊 ${r.overlap ? r.overlap.x + '×' + r.overlap.y : '—'}`
      + `　elementFromPoint ${r.pts.map((p) => p.el + (p.inModal ? '✅' : '❌')).join(' ')}`));
    if (opt.modalout) console.log('    明細 → ' + opt.modalout);
  }
  /* R1-HIGH-1：熱座交棒時牌桌上不得留下上一位的私有徽章 */
  let okHandoff2 = true;
  if (opt.handoff) {
    const runs = [].concat(rec.handoff2 || []);
    /* ★活性斷言 `sealedCount > 0`★（三版，覆審 R2 MEDIUM-A）：只要求「殘留 0」是**歸零斷言**，
       `openSheet/bump/closeSheet` 任何一支改名或改語意都會讓這一輪根本沒封出徽章、殘留自然是 0 ⇒ 恆綠。
       所以判定式綁上「這一輪真的封出過一顆 .mybid」（`02 §6.1` 第 1 條：歸零斷言要另附活性證據）。 */
    okHandoff2 = runs.length > 0 && runs.every((h) => h.reached && h.atHandoff && h.atHandoff.total === 0
      && (h.sealedCount | 0) > 0 && (h.pageerrors || []).length === 0);
    console.log(`- **R1-HIGH-1 熱座交棒清場**（封一筆「押 2」→ 蓋牌 → 交棒畫面出現當下；掏空與 ?table3d=0 兩條路都跑）：`
      + ` → ${okHandoff2 ? '✅' : '❌'}`);
    runs.forEach((h) => {
      console.log(`    ${h.query}：封在 ${h.sealedIn ? h.sealedIn.where + ' 的「' + h.sealedIn.txt + '」' : '（沒封到）'}`
        + `　**封標後 #table .mybid ${h.sealedCount}（活性斷言：必須 >0）**`
        + `　交棒當下殘留 **${h.atHandoff ? h.atHandoff.total : '—'}** 個（看得見 ${h.atHandoff ? h.atHandoff.visible : '—'}）`);
      if (h.atHandoff && h.atHandoff.total) console.log('        殘留：' + h.atHandoff.where.join('　'));
    });
  }
  /* T1／T6 判定 */
  let okT1 = true, okT6 = true;
  if (opt.t3d) {
    const t = rec.t3d;
    if (opt.t3dout) fs.writeFileSync(opt.t3dout, JSON.stringify(t, null, 1), 'utf8');
    const off = t.off.landscape, on = t.on.landscape;
    const c120 = (s) => /^120px .* 120px$/.test(s);
    const c168 = (s) => /^168px .* 168px$/.test(s);
    const offOK = { cols: c120(off.cols), hollow: off.hollow === false, tray: off.trayDisplay === 'none' || off.trayDisplay === '(absent)',
      rails: off.railW === 0 && off.railE === 0, market: off.marketCards === 4 };
    const onOK = { cols: c168(on.cols), hollow: on.hollow === true, tray: on.trayDisplay === 'block',
      rails: on.railW > 0 && on.railE > 0, market: on.marketCards === 0 && on.railCards === 4 };
    okT1 = Object.values(offOK).every(Boolean) && Object.values(onOK).every(Boolean);
    console.log(`- **T1 kill switch 雙向**：`);
    console.log(`    ?table3d=0　cols=${off.cols}｜hollow=${off.hollow}｜#tray display=${off.trayDisplay}｜#railW/#railE 子元素=${off.railW}/${off.railE}｜#market .mcard=${off.marketCards} → ${Object.values(offOK).every(Boolean) ? '✅' : '❌ ' + JSON.stringify(offOK)}`);
    console.log(`    預設　　　　cols=${on.cols}｜hollow=${on.hollow}｜#tray display=${on.trayDisplay}｜#railW/#railE 子元素=${on.railW}/${on.railE}｜#market .mcard=${on.marketCards}（側欄 .mcard=${on.railCards}） → ${Object.values(onOK).every(Boolean) ? '✅' : '❌ ' + JSON.stringify(onOK)}`);
    /* T6：直式（390×844）逐項；有 --t6base 就跟基準逐項比對 */
    const p = t.on.portrait;
    const T6KEYS = ['rotateHint', 'cols', 'railDisplay', 'tableOverX', 'feltBackdrop'];
    const selfOK = p.rotateHint === 'flex' && c120(p.cols) && (p.railDisplay === 'none' || p.railDisplay === '(absent)') && p.tableOverX === 0;
    let baseCmp = null;
    if (opt.t6base && fs.existsSync(opt.t6base)) {
      const b = JSON.parse(fs.readFileSync(opt.t6base, 'utf8'));
      const bp = (b.on || b.off).portrait;
      baseCmp = T6KEYS.map((k) => ({ k, base: bp[k], now: p[k], same: String(bp[k]) === String(p[k]) }))
        .filter((r) => !(r.k === 'railDisplay' && r.base === '(absent)' && r.now === 'none'));   /* 基準版沒有 .rail，語意等價於 none */
    }
    okT6 = selfOK && (!baseCmp || baseCmp.every((r) => r.same));
    console.log(`- **T6 直式蓋板行為**（390×844）：#rotateHint=${p.rotateHint}｜cols=${p.cols}｜.rail display=${p.railDisplay}｜#table 橫向溢出=${p.tableOverX}｜#felt backdrop-filter=${p.feltBackdrop} → ${selfOK ? '✅' : '❌'}`);
    if (baseCmp) console.log(`    對基準逐項：` + baseCmp.map((r) => `${r.k} ${r.same ? '＝' : `❌ 基準 ${r.base} → 現在 ${r.now}`}`).join('　'));
    else console.log(`    （沒帶 --t6base=，只驗自己這一版的四項，不做逐項對照）`);
    if (opt.t3dout) console.log('    T1／T6 明細 → ' + opt.t3dout);
  }
  /* T5：基準清單的每一格都要在新版存在且命中；tap 在既有可點元素上時 trayTap 一次都不許被呼叫。
     沒帶 --tapbase（＝量基準那一次）就退回「自己這一版每一格都命中」。 */
  let okTaps = true, tapMiss = [], tapLost = [];
  if (opt.taps) {
    const t = rec.taps || { rows: [], trayTaps: 0 };
    if (TAP_OUT) fs.writeFileSync(TAP_OUT, JSON.stringify(t, null, 1), 'utf8');
    const testable = (r) => r.vis && !r.dis;   /* 可測集合＝看得見且產品沒把它停用 */
    const byKey = {}; t.rows.forEach((r) => { byKey[r.key] = r; });
    if (TAP_BASE) {
      TAP_BASE.rows.filter(testable).forEach((b) => {
        const n = byKey[b.key];
        if (!n || !testable(n)) tapLost.push(b.key);
        else if (!n.hit) tapMiss.push(b.key);
      });
    } else {
      t.rows.filter((r) => testable(r) && !r.hit).forEach((r) => tapMiss.push(r.key));
    }
    okTaps = t.rows.length > 0 && t.trayTaps === 0 && tapMiss.length === 0 && tapLost.length === 0 && !t.argMiss;
    const visN = t.rows.filter(testable).length;
    const baseVisN = TAP_BASE ? TAP_BASE.rows.filter(testable).length : null;
    console.log(`- **T5 觸控命中**（每個 #table [onclick] 各 tap 一次，第 1～${TAP_ROUNDS} 夜出價頁與盯上頁，seeds ${TAP_SEEDS.join(',')}）：`
      + `掃了 ${t.pages} 頁、可測元素 ${visN} 個（基準 ${baseVisN == null ? '—（本次即基準）' : baseVisN} 個；`
      + `另有停用 ${t.rows.filter((r) => r.dis).length} 個、隱藏 ${t.rows.filter((r) => !r.vis).length} 個不計）`
      + `　命中 ${t.rows.filter((r) => testable(r) && r.hit).length}／${visN}`
      + `　基準清單漏掉 ${tapLost.length} 個、沒命中 ${tapMiss.length} 個`
      + `　其中**驗了字面引數**的 ${t.rows.filter((r) => testable(r) && r.want != null).length} 個、引數對不上 ${t.argMiss || 0} 個`
      + `　**trayTap 被呼叫 ${t.trayTaps} 次**（必須 0） → ${okTaps ? '✅' : '❌'}`);
    if (tapLost.length) console.log('    基準有、新版量不到：' + tapLost.slice(0, 12).join('　'));
    if (tapMiss.length) console.log('    沒命中：' + tapMiss.slice(0, 12).join('　'));
    if (TAP_OUT) console.log('    tap 明細 → ' + TAP_OUT);
  }
  console.log(`# 請神 3.0 Playwright 驅動（844×390 橫式＋390×844 直式）　VERSION ${rec.version}　輸出 ${path.basename(OUT)}`);
  console.log(`- 局數 ${rec.games.length}：` + rec.games.map((g) => `seed ${g.seed}（${g.nights} 夜・請走 ${g.taken} 尊・回天 ${g.dawnShrines} 尊・沒人有資格 ${g.skips} 夜・燒香 ${g.burned} 夜）`).join('；'));
  rec.games.forEach((g) => console.log(`  · seed ${g.seed} 停在「${g.stuck}」　真人選尊 ${JSON.stringify(g.picked)}　按鈕出現次數 ${JSON.stringify(g.txts)}`));
  if (rec.hotseat) {
    const h = rec.hotseat;
    console.log(`- 熱座交棒：出價頁看得到燒香列＝${h.sawIncbar}、交棒畫面出現＝${h.handoffShown}、交棒當下 (#stage,#south) .incbar 個數＝${h.incbarAtHandoff} → ${okHot ? '✅' : '❌'}`);
  }
  console.log(`- CFG.LEGEND_ON=${rec.legendOn}　香火榜 #shrines／.incboard＋待請卡：` + rec.games.map((g) => `seed ${g.seed} ${g.shrineEl}/${g.boardEl} 張`).join('；') + `　燒香列：` + rec.games.map((g) => `${g.incEl}`).join(','));
  console.log(`- 供奉危急提示出現並按「要」的次數：${rec.titheAsk || 0}；袋子面板「送神回天」按下次數（seed ${GIVEUP_SEED}）：${rec.giveUp || 0}`);
  console.log(`- console error ${rec.errors.length}、pageerror ${rec.pageerrors.length}、requestfailed ${rec.requestfailed.length} → ${okErr ? '✅' : '❌'}`);
  if (!okErr) { rec.errors.slice(0, 5).forEach((e) => console.log('    error: ' + e)); rec.pageerrors.slice(0, 5).forEach((e) => console.log('    pageerror: ' + e)); rec.requestfailed.slice(0, 5).forEach((e) => console.log('    requestfailed: ' + e)); }
  console.log(`- **H6 三條路徑**：走到「請走」${rec.taken} 次／「**真人選尊視窗**出現並選擇」${rec.picks} 次（點的那一尊沒對上：${rec.pickMismatch || 0}）／「**落空保留**」${rec.carry} 人次 → ${okPath ? '✅' : '❌'}`);
  console.log(`    落空保留樣本：${JSON.stringify(rec.carryEg)}`);
  console.log(`- 記錄項（不判）：回天 ${rec.dawnShrines} 尊、局末結清 ${rec.dawn} 筆、沒人有資格的請神夜 ${rec.skips} 次`);
  console.log(`- 固定頁對照（同一局同一頁「${rec.portraitAt}」）：橫式 ${JSON.stringify(rec.landscapeFixed)}　直式 ${JSON.stringify(rec.portraitOverflow)}`);
  console.log(`- 直式蓋板行為：#rotateHint 顯示＝${rec.portraitCover && rec.portraitCover.rotateHint}、#shrines 收起＝${rec.portraitCover && rec.portraitCover.shrinesHidden} → ${okCover ? '✅' : '❌'}`);
  console.log(`- 橫向溢出：橫式 ${rec.overflow.length} 筆、直式 ${rec.portraitOverflow.length} 筆 → ${okOv ? '✅' : '❌'}`);
  if (!okOv) [...rec.overflow.slice(0, 5), ...rec.portraitOverflow.slice(0, 5)].forEach((o) => console.log('    ' + JSON.stringify(o)));
  console.log(`- **直向**（#felt scrollHeight − clientHeight；第 1 夜每頁＝0、其餘頁 ≤ 基準同格＋${BASE_SLACK}px）：`
    + `取樣 ${rec.vsamples || 0} 次、超標 ${rec.voverflow.length} 次`
    + `${Object.keys(BASE_V).length ? '' : '（**沒帶 --base=，沒有基準可比 ⇒ 不算通過**）'} → ${okVert ? '✅' : '❌'}`);
  rec.vrows.forEach((r) => console.log(`    ${r.key}：本卷 ${r.over}　基準 ${r.base == null ? '—' : r.base}　上限 ${r.cap}`
    + ` ${r.judged ? (r.over != null && r.over <= r.cap ? '✅' : '❌') : '（無基準・只印不判）'}`));
  const all = opt.tapsonly ? (okTaps && okT1 && okT6 && okModal && okHandoff2)
    : (okErr && okPath && okOv && okVert && okCover && okHot && okTaps && okT1 && okT6 && okModal && okHandoff2);
  console.log(`- 判定：${all ? '✅ 通過' : '❌ 未通過'}`);
  process.exit(all ? 0 : 1);
};
main().catch((e) => { console.error(e); process.exit(2); });
