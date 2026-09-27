// v0.59.1 開卡停靠＋Yuji Boku 字型卷，凍結 #4：收集所有會以 Yuji Boku 顯示的字元。
// 做法＝(A) 全矩陣實際渲染：驅動多個種子的 solo／hot／nw1/2/3 整局，逐畫面收 17 個明體角色（同凍結 #3、
// 沿用 visual-polish-p2-judge.mjs 的 SERIF 清單）的 textContent；(B) 靜態資料掃描：CFG/ROLES/市集池/心願池/
// 詛咒池/夜行錄章名等會進入這些角色的字串，直接從原始碼字面 grep，不靠隨機種子跑不跑得到。
// 兩邊字元集合聯集後，逐字查 Yuji Boku 字檔 cmap（fonttools）——查表本身在另一支 Python 腳本做。
// 用法：node tests/tools/glyph-harvest.mjs --seeds 1,2,3,4,5 --out <dir>
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SEEDS = arg('--seeds', '1,2,3,4,5').split(',').map(Number);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-27-card-dock-font')));
const PORT = Number(arg('--port', 9661));
fs.mkdirSync(OUT, { recursive: true });

const SERIF = ['#titleScr h1', '#titleScr .bigbtn', '.stageCard .big', '#stage h2', '#review h2', '.mcard .nm', '.railTabs button', '.rcard .rnm', '.seat .nm', '#myDir', '#myLife', '#myPow', '.stakebar .amt', '.incamt', '#mainbtn', '.nwCard h3', '#nwScr h2', '.endrank'];

/* 最小 __tf.screen()，抄自 visual-polish-probe.mjs（同一支治具家族），只取本腳本用到的那一個方法。 */
const PAGE_LIB = String.raw`
window.__tf = {
  screen(){
    const $ = (id) => document.getElementById(id);
    const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
    if (on('review')) return 'review';
    if (on('duel')) return 'duel';
    if (on('sheet')) return 'bag';
    if (on('modal')) {
      if (document.querySelector('#modalbox .legendPick')) return 'shrine-pick';
      if ($('titheKeep')) return 'tithe';
      return 'modal:' + ((document.querySelector('#modalbox h2') || {}).textContent || '').slice(0, 8);
    }
    if (on('handoff')) return 'handoff';
    const nw = $('nwScr'); if (nw && nw.classList.contains('on')) return 'nw-' + nw.dataset.view;
    const sel = $('selectScr'); if (sel && sel.classList.contains('on')) return 'select';
    if (on('titleScr')) return 'title';
    if (!on('table')) return 'none';
    const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
    const sb = [...document.querySelectorAll('#stage button')];
    if (sb.some((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || ''))) return 'event';
    if (/不盯任何一件/.test(t)) return 'mark';
    if (/^蓋牌/.test(t) && !dis) return 'bid';
    if (/下一件拍品|查看成交總覽/.test(t)) return 'reveal';
    if (/請神/.test(t)) return dis ? 'shrine-run' : 'shrine';
    if (/^開戰/.test(t) && !dis) return 'reveal-result';
    if (/進入下一夜|看最終結果/.test(t) && !dis) return 'night-end';
    if (/前往拍賣/.test(t) && !dis) return 'event-result';
    if (/再入妖市|回章節選單/.test(t)) return 'end';
    if (/^蓋牌/.test(t) && dis) return 'reveal';
    return 'busy:' + t.slice(0, 8);
  },
};
`;
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const chars = new Set();
const samples = {}; // char -> {sel, text}
function harvest(sel, txt) {
  if (!txt) return;
  for (const ch of [...txt]) {
    if (/[\s\u0000-\u001f]/.test(ch)) continue;
    if (!chars.has(ch)) { chars.add(ch); samples[ch] = { sel, text: txt.slice(0, 24) }; }
  }
}

const scr = (page) => page.evaluate(() => window.__tf.screen());
const round = (page) => page.evaluate(() => (window.__yaoshi && window.__yaoshi.S && window.__yaoshi.S.round) || 0);
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

async function harvestScreen(page) {
  const out = await page.evaluate((SERIF) => SERIF.map((s) => [s, [...document.querySelectorAll(s)].map((e) => e.textContent || '')]), SERIF);
  for (const [sel, texts] of out) for (const t of texts) harvest(sel, t);
  // 拍品卡窄籤：逐籤點開（同 p2 #2 手法），收 .railTabs button 與展開卡 .mcard .nm 全文
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: b.dataset.slot })));
  for (const t of tabs) {
    await page.evaluate(([r, s]) => { const b = document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]'); if (b) b.click(); }, [t.rail, t.slot]);
    await page.waitForTimeout(60);
    const txt = await page.evaluate((s) => { const c = document.getElementById('mc' + s); return c ? (c.querySelector('.nm') || {}).textContent || '' : ''; }, t.slot);
    harvest('.mcard .nm(rail)', txt);
  }
}

async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await ctx.addInitScript(PAGE_LIB);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__tf', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  return { ctx, page };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
};

async function drive(page, stopAtEnd) {
  let last = null;
  for (let i = 0; i < 20000; i++) {
    await page.waitForTimeout(6);
    const cls = await scr(page);
    if (cls !== last) {
      last = cls;
      if (!/^busy|^none/.test(cls)) await harvestScreen(page);
      if (cls === 'bid') {
        for (const fn of ['showBag(0)', 'showRoleInfo(1)', 'openHelp()']) {
          await page.evaluate(fn); await page.waitForTimeout(100);
          await harvestScreen(page);
          await page.evaluate(() => { if (typeof closeSheet === 'function') closeSheet(); closeModal(); });
          await page.waitForTimeout(60);
        }
        last = null; continue;
      }
    }
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return;
  }
}

async function runSolo(seed) {
  const { ctx, page } = await newCtx();
  try {
    await harvestScreen(page);
    await page.evaluate((m) => startEntry(m), 'solo');
    await pickFirstRole(page);
    await harvestScreen(page);
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [seed, 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    await drive(page);
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /再入妖市/.test(document.getElementById('mainbtn').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(150);
    await harvestScreen(page);
    await page.evaluate(() => showReview()); await page.waitForTimeout(150);
    await harvestScreen(page);
  } finally { await ctx.close(); }
}

async function runNw(ch) {
  const { ctx, page } = await newCtx();
  try {
    await page.evaluate(() => startEntry('nightwalk'));
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu');
    await page.waitForTimeout(100);
    await harvestScreen(page);
    const ok = await page.evaluate((c) => { const cards = [...document.querySelectorAll('.nwCard')]; const t = cards.find((x) => !x.classList.contains('locked') && x.dataset.ch == c); if (t) { t.click(); return true; } return false; }, ch);
    if (!ok) return;
    await page.waitForTimeout(150);
    await harvestScreen(page);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1, null, { timeout: 15000 }).catch(() => {});
    await drive(page);
  } finally { await ctx.close(); }
}

for (const sd of SEEDS) { console.error('[glyph] solo seed', sd); await runSolo(sd); }
for (const ch of [1, 2, 3]) { console.error('[glyph] nw', ch); await runNw(ch).catch((e) => console.error('nw' + ch + ' 失敗（不阻斷）：', e.message)); }

await browser.close();
srv.kill();

// (B) 靜態資料 grep：從原始碼直接抓會進入這 17 類角色的字面字串池。
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const poolRe = /\bn:"([^"]*)"/g; // 市集拍品／法寶池、詛咒池等常見寫法 n:"XXX"
let m;
while ((m = poolRe.exec(src))) harvest('static n:"..."', m[1]);
const nameRe = /\bname:"([^"]*)"/g;
while ((m = nameRe.exec(src))) harvest('static name:"..."', m[1]);
const rnRe = /\brn:"([^"]*)"/g;
while ((m = rnRe.exec(src))) harvest('static rn:"..."', m[1]);
const nwTitleRe = /title:"([^"]*)"/g;
while ((m = nwTitleRe.exec(src))) harvest('static nw title:"..."', m[1]);

fs.writeFileSync(path.join(OUT, 'glyph-chars.json'), JSON.stringify({ n: chars.size, chars: [...chars], samples }, null, 1));
console.log('字元數', chars.size, '→', path.join(OUT, 'glyph-chars.json'));
