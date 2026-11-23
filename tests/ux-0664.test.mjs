// v0.66.4 三項介面修正的實頁驗收（凍結檔 docs/acceptance/2026-11-23-v0.66.4.md）。
//   M2：不是請神夜、今夜也沒有人真的燒到香 → 成交總覽的主鈕直接是「開戰」，一按就開打；其餘夜照舊先「🕯️ 請神」。
//       判斷式 shrineHasNews() 另用 headless 對結算結果逐筆對照（同一個狀態：說「有」⇔ 結算真的有東西可看；呼叫它不動狀態、不改設定、不耗亂數）。
//       真滑鼠連按：「查看成交總覽 ▸」120ms 連按停在總覽；安靜夜「開戰」120ms 連按只結算一次。
//   M5：規則頁第一節就是「🏮 目標」，音訊診斷與效能資訊鈕移到全部規則之後、關閉鈕之前；切換效能資訊後鈕還在眼前。
//   M6：別人的袋子上那行公開戰力＝牌桌座位上同一串「N 隻・血 M」（舊規則的戰力數字只在 PAPERWAR_ON=false 時用）。
// 基準對照：YAOSHI_RENDER_ROOT=<舊版樹> 對舊版跑同一份（a、j、M5、M6 應紅在行為斷言；b–g、i 舊版就綠）。
// 瀏覽器規矩：一次只開一個 chromium；每個情境各開一頁。YAOSHI_SHOT_DIR=<目錄> 時另存截圖。
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';
import { loadGame } from './tools/load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_UX0664_PORT || 9777);
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}

let srv, browser;
before(async () => {
  const { chromium } = loadPlaywright();
  srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await wait(900);
  browser = await launchGpu(chromium);
});
after(async () => { await browser?.close(); srv?.kill(); });

async function open({ size = [844, 390], query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕 */ } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  return { page, errors, close: () => ctx.close() };
}
async function shot(page, name) { if (!SHOT_DIR) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) }); }

/* 開一局、關掉等待、數兩支結算被叫幾次，並照情境改好狀態（都在出價之前）。 */
const START = ({ seed, prep }) => {
  CFG.T = 1;
  for (const k of Object.keys(window.__yaoshi.PW_FX)) if (/_MS$/.test(k)) window.__yaoshi.PW_FX[k] = 1;
  window.__calls = [];
  for (const n of ['resolveShrines', 'resolveBattles']) {
    const o = window[n];
    window[n] = function () { const r = o.apply(this, arguments); window.__calls.push(n); if (n === 'resolveShrines') window.__shrineOut = JSON.parse(JSON.stringify(r)); return r; };
  }
  if (prep.noAi) window.aiIncense = () => null;
  if (prep.nights) CFG.SHRINE_NIGHTS = prep.nights;
  if (prep.auto !== undefined) { const o = window.hasFlag; window.hasFlag = (p, f) => (f === 'shrineAutoIncense' && p.id === prep.auto) || o(p, f); }
  window.__yaoshi.newGame('solo', seed, ['qingmian']);
};
/* 推到主鈕文字符合為止（連點守衛會吞掉太快的點擊，所以是「按到畫面真的變了」；讀字與按鈕在同一次 evaluate 裡）。 */
async function driveTo(page, re, tag) {
  for (let i = 0; i < 900; i++) {
    const r = await page.evaluate((src) => {
      const b = document.getElementById('mainbtn'), t = b ? b.textContent : '';
      if (b && !b.disabled && new RegExp(src).test(t)) return { hit: true, t };
      if (b && !b.disabled) b.click();
      return { hit: false, t };
    }, re.source);
    if (r.hit) return r.t;
    await page.waitForTimeout(30);
  }
  throw new Error(`${tag}：主鈕一直沒有變成 ${re}（目前「${await page.evaluate(() => document.getElementById('mainbtn')?.textContent)}」）`);
}
/* 真的用滑鼠按主鈕一下（先等守衛視窗過去，節奏跟人一樣）。 */
async function tapMain(page) {
  await page.waitForTimeout(700);
  await page.click('#mainbtn');
}
/* 真滑鼠在同一點連按兩下（先等守衛視窗過去）。落點取主鈕靠右：換字後鈕會變窄、靠右，中心點會落空。回傳第二下按下去之前，手指下是什麼。 */
async function tapTwice(page, gap) {
  await page.waitForTimeout(700);
  const r = await page.locator('#mainbtn').boundingBox();
  const x = r.x + r.width - 18, y = r.y + r.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(gap);
  const hit = await page.evaluate(([px, py]) => {
    const e = document.elementFromPoint(px, py), m = document.getElementById('mainbtn'), on = !!e && !!e.closest('#mainbtn');
    return { onMain: on, live: on && !m.disabled, text: m.textContent, top: e ? (e.id || e.closest('[id]')?.id || e.tagName) : null };
  }, [x, y]);
  await page.mouse.click(x, y);
  return hit;
}
const STATE = () => ({ txt: document.getElementById('mainbtn').textContent, calls: window.__calls.slice(), shz: document.getElementById('shz')?.innerText || '',
  lives: S.players.map((p) => p.life), burn: window.__shrineOut ? window.__shrineOut.burn.map((b) => [b.pid, b.amt]) : null, round: S.round });

/* 走到「本夜成交總覽」（第 1 夜）。plus＝出價時真人自己按一次燒香「＋」。 */
async function toSummary(page, { seed = 7, prep = {}, plus = false }) {
  await page.evaluate(START, { seed, prep });
  await driveTo(page, /蓋牌/, '出價畫面');
  if (plus) {
    const ok = await page.evaluate(() => { const bs = [...document.querySelectorAll('.incbar button')]; if (bs.length < 2 || bs[1].disabled) return false; bs[1].click(); return INC && INC.amt; });
    assert.equal(ok, 1, '真人燒香沒有加到 1（治具沒生效）');
  }
  const txt = await driveTo(page, /請神|開戰/, '成交總覽');
  assert.ok(await page.evaluate(() => !!document.querySelector('#stage .pnl, #stage #pnl, #stage [class*="pnl"]')), '這一頁不是成交總覽面板');
  return txt;
}

/* ---------------- M2 ---------------- */
test('M2-a 安靜夜（非請神夜、沒有人燒香）：主鈕是「開戰」，按一下就開打，不出現請神那一頁', async () => {
  const { page, errors, close } = await open();
  try {
    const txt = await toSummary(page, { prep: { noAi: true } });
    await shot(page, 'm2-quiet-summary');
    assert.equal(txt, '開戰', `安靜夜的主鈕還是「${txt}」`);
    const before_ = await page.evaluate(STATE);
    assert.deepEqual(before_.calls, [], '還沒按就已經結算');
    await tapMain(page);
    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
    const s = await page.evaluate(STATE);
    assert.deepEqual(s.calls, ['resolveShrines', 'resolveBattles'], '結算順序或次數不對（香火段要照跑一次、再開戰）');
    assert.deepEqual(s.burn, [], '安靜夜不該有人燒香（治具沒生效）');
    assert.equal(await page.evaluate(() => !!document.getElementById('shz')), false, '安靜夜不該出現請神那一頁');
    await driveTo(page, /進入下一夜|看最終結果/, '夜末');
    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '同一夜結算了第二次');
    assert.deepEqual(errors, []);
  } finally { await close(); }
});

for (const [id, name, opt, want] of [
  ['b', 'AI 有燒香', { prep: {} }, /燒了/],
  ['c', '請神夜、沒有人燒香', { prep: { noAi: true, nights: [1, 8, 11] } }, /沒有人請得動/],
  ['d', '只有真人燒香', { prep: { noAi: true }, plus: true }, /燒了 1 壽命/],
  ['e', '神王命自動進香', { prep: { noAi: true, auto: 2 } }, /燒了/],
]) {
  test(`M2-${id} ${name}：照舊先「🕯️ 請神」、看得到結果，再「開戰」`, async () => {
    const { page, errors, close } = await open();
    try {
      const txt = await toSummary(page, opt);
      if (id === 'b') await shot(page, 'm2-news-summary');
      assert.equal(txt, '🕯️ 請神', `主鈕是「${txt}」`);
      await tapMain(page);
      await page.waitForFunction(() => { const b = document.getElementById('mainbtn'); return document.getElementById('shz') && b.textContent === '開戰' && !b.disabled; }, null, { timeout: 8000 });
      const s = await page.evaluate(STATE);
      assert.match(s.shz, want, '請神那一頁沒有該有的內容');
      assert.deepEqual(s.calls, ['resolveShrines'], '還沒按開戰就開打');
      await tapMain(page);
      await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
      assert.deepEqual(errors, []);
    } finally { await close(); }
  });
}

test('M2-f 沒開請神（?legend=0）：主鈕照舊是「開戰」', async () => {
  const { page, errors, close } = await open({ query: '?legend=0' });
  try {
    assert.equal(await toSummary(page, { prep: {} }), '開戰');
    await tapMain(page);
    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
    assert.deepEqual(errors, []);
  } finally { await close(); }
});

test('M2-g 停在成交總覽的時候狀態變了（有人的香進來了）：結果照樣攤開，不會被吃掉', async () => {
  const { page, errors, close } = await open();
  try {
    await toSummary(page, { prep: { noAi: true } });
    await page.evaluate(() => { S.incense[1] = { amt: 1 }; });
    await tapMain(page);
    await page.waitForFunction(() => { const b = document.getElementById('mainbtn'); return document.getElementById('shz') && b.textContent === '開戰' && !b.disabled; }, null, { timeout: 8000 });
    const s = await page.evaluate(STATE);
    assert.deepEqual(s.burn, [[1, 1]]);
    assert.match(s.shz, /燒了 1 壽命/, '香火結果沒有攤開');
    assert.deepEqual(s.calls, ['resolveShrines'], '結果還沒看到就開打');
    assert.deepEqual(errors, []);
  } finally { await close(); }
});

test('M2-i 「查看成交總覽 ▸」連按兩下（120ms）：停在總覽，不會直接開打', async () => {
  const { page, errors, close } = await open();
  try {
    await page.evaluate(START, { seed: 7, prep: { noAi: true } });
    await driveTo(page, /蓋牌/, '出價畫面');
    await driveTo(page, /查看成交總覽/, '最後一件');
    const hit = await tapTwice(page, 120);
    console.log('M2-i 第二下落點', JSON.stringify(hit));
    assert.ok(hit.live && /^(🕯️ 請神|開戰)$/.test(hit.text), `第二下沒落在已換字、可按的主鈕上（治具沒打到危險的點）：${JSON.stringify(hit)}`);
    await page.waitForTimeout(1500);
    const s = await page.evaluate(STATE);
    assert.deepEqual(s.calls, [], '連按把總覽跳掉、直接結算了');
    assert.match(s.txt, /^(🕯️ 請神|開戰)$/, `沒有停在成交總覽（主鈕「${s.txt}」）`);
    assert.deepEqual(errors, []);
  } finally { await close(); }
});

test('M2-j 安靜夜的「開戰」連按兩下（120ms）：香火段與開戰各只結算一次，第二下打不到可按的主鈕', async () => {
  const { page, errors, close } = await open();
  try {
    assert.equal(await toSummary(page, { prep: { noAi: true } }), '開戰', '安靜夜的主鈕不是「開戰」');
    const hit = await tapTwice(page, 120);
    console.log('M2-j 第二下落點', JSON.stringify(hit));
    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
    await page.waitForTimeout(800);
    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '連按讓同一夜結算了兩次');
    assert.equal(hit.live, false, `第二下打得到可按的主鈕：${JSON.stringify(hit)}`);
    await driveTo(page, /進入下一夜|看最終結果/, '夜末');
    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '同一夜結算了第二次');
    assert.deepEqual(errors, []);
  } finally { await close(); }
});

test('M2-h shrineHasNews() 與結算結果逐筆一致、不動狀態、不耗亂數（headless：隨機狀態＋整局走訪）', () => {
  const src = fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8');
  const G = loadGame(null, { sourceText: src });
  assert.equal(typeof G.shrineHasNews, 'function', 'shrineHasNews 沒有出口');
  const news = (o) => !!(o && (o.burn.length || o.taken.length || o.dawn.length || o.skip || o.pending));
  let yes = 0, no = 0;
  const check = (tag) => {
    const before_ = JSON.stringify(G.S), cfg = JSON.stringify(G.CFG), o1 = G.S.rng, o2 = G.S.rngUi;
    let draws = 0;
    G.S.rng = () => { draws++; return o1(); };
    if (o2) G.S.rngUi = () => { draws++; return o2(); };
    const said = G.shrineHasNews();
    G.S.rng = o1; if (o2) G.S.rngUi = o2;
    assert.equal(draws, 0, `${tag}：shrineHasNews 耗了 ${draws} 次亂數`);
    assert.equal(JSON.stringify(G.S), before_, `${tag}：shrineHasNews 動到了狀態`);
    assert.equal(JSON.stringify(G.CFG), cfg, `${tag}：shrineHasNews 改了設定`);
    const real = news(G.resolveShrines());
    assert.equal(said, real, `${tag}：說「${said}」但結算是「${real}」`);
    if (real) yes++; else no++;
  };
  const rnd = G.mulberry32(20261123);
  const pick = (n) => Math.floor(rnd() * n);
  const shape = {};
  for (let t = 0; t < 3000; t++) {
    G.makeState('solo', 1 + (t % 200));
    const S = G.S;
    S.round = 1 + pick(12);
    S.players.forEach((p) => {
      p.life = pick(4) === 0 ? pick(3) : 1 + pick(30);
      p.alive = p.life > 0;
      S.incPool[p.id] = pick(9);
      if (pick(3) === 0) G.CHAINS.godKing.requirements.forEach((ab) => p.bag.push({ ...G.POOL.find((x) => x.ab === ab) }));
      const k = pick(4);
      if (k === 1) S.incense[p.id] = null;
      if (k === 2) S.incense[p.id] = { amt: pick(5) };
      if (k === 3) S.incense[p.id] = { amt: 0 };
    });
    S.shrines.forEach((sh) => { const k = pick(4); if (k === 1) { sh.open = false; sh.takenBy = pick(4); } if (k === 2) { sh.open = false; sh.dawn = true; } });
    if (pick(5) === 0) S.shrines.forEach((sh) => { sh.open = false; });
    const key = [G.isShrineNight(S.round) ? '請神夜' : '平常夜', G.openShrines().length ? '有尊' : '沒尊', S.players.some((p) => p.alive && G.hasFlag(p, 'shrineAutoIncense')) ? '有神王' : '沒神王'].join('／');
    shape[key] = (shape[key] || 0) + 1;
    check(`隨機 ${t}`);
  }
  console.log('M2-h 隨機狀態 有／沒有東西可看：', yes, no, JSON.stringify(shape));
  assert.ok(yes >= 300 && no >= 300, `兩種都要走到夠多次：${yes}／${no}`);
  assert.equal(Object.keys(shape).length, 8, `八種組合要都走到：${JSON.stringify(shape)}`);
  /* 整局走訪：在真的結算入口前先問一次，40 局每夜都要對得上，而且整局紀錄與沒問時逐位元組相同 */
  const A = 'function resolveShrines(opts){';
  assert.equal(src.split(A).length, 2, '找不到結算入口（引擎結構變了要更新這支治具）');
  globalThis.__m2walk = [];
  const W = loadGame(null, { sourceText: src.replace(A, 'function resolveShrines(opts){ const said=(CFG.LEGEND_ON&&S.shrines)?shrineHasNews():null; const o=__rs0(opts); if(said!==null) globalThis.__m2walk.push([said,!!(o&&(o.burn.length||o.taken.length||o.dawn.length||o.skip||o.pending)),S.round]); return o; }\nfunction __rs0(opts){') });
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
  assert.equal(JSON.stringify(W.trace(seeds)), JSON.stringify(G.trace(seeds)), '整局裡先問 shrineHasNews 會改變紀錄（耗亂數或動到狀態）');
  const walk = globalThis.__m2walk, bad = walk.filter(([said, real]) => said !== real), yesN = walk.filter(([, r]) => r).length;
  console.log('M2-h 整局走訪 夜數', walk.length, '有／沒有東西可看', yesN, walk.length - yesN);
  assert.deepEqual(bad, [], '整局走訪對不上');
  assert.ok(yesN >= 50 && walk.length - yesN >= 20, `整局走訪兩種都要走到：${yesN}／${walk.length - yesN}`);
});

/* ---------------- M5 ---------------- */
for (const size of [[844, 390], [667, 375]]) {
  test(`M5 規則頁（${size.join('×')}）：開頭就是目標，診斷在最後，切換效能資訊後鈕還在眼前`, async () => {
    const { page, errors, close } = await open({ size });
    try {
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); openHelp(); });
      await page.waitForFunction(() => document.getElementById('modal').style.display === 'flex');
      await shot(page, `m5-help-top-${size[0]}`);
      const m = await page.evaluate(() => {
        const box = document.getElementById('modalbox'), br = box.getBoundingClientRect();
        const titles = [...box.querySelectorAll('div')].filter((d) => d.style.fontWeight === 'bold' && d.style.fontSize === '13px');
        const diag = [...box.querySelectorAll('div')].filter((d) => d.textContent.startsWith('🔧 音訊診斷') && !d.querySelector('div'));
        const tg = document.getElementById('fpsToggle'), close = [...box.querySelectorAll('button')].filter((b) => b.textContent === '關閉');
        const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); // b 在 a 之後
        const r0 = titles[0].getBoundingClientRect();
        return { titles: titles.length, first: titles[0].textContent, firstVisible: r0.top >= br.top && r0.bottom <= br.bottom, nDiag: diag.length, nClose: close.length,
          diagAfterLast: after(titles[titles.length - 1], diag[0]), toggleAfterLast: after(titles[titles.length - 1], tg), closeAfterToggle: after(tg, close[0]),
          firstText: box.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), scrollH: box.scrollHeight, clientH: box.clientHeight };
      });
      console.log(`M5 ${size.join('×')}`, JSON.stringify(m));
      assert.ok(m.titles >= 8, `規則節數 ${m.titles} 太少（治具沒找到節標題）`);
      assert.equal(m.nDiag, 1, '音訊診斷要剛好一份');
      assert.match(m.firstText, /^？ 妖市規則 🏮 目標/, `規則頁開頭不是目標：「${m.firstText}」`);
      assert.ok(m.firstVisible, '打開規則頁第一眼看不到「目標」');
      assert.ok(m.diagAfterLast, '音訊診斷不在最後一節規則之後');
      assert.ok(m.toggleAfterLast, '效能資訊鈕不在最後一節規則之後');
      assert.ok(m.nClose === 1 && m.closeAfterToggle, '診斷要在關閉鈕之前');
      const look = () => page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const b = document.getElementById('modalbox').getBoundingClientRect(), t = document.getElementById('fpsToggle').getBoundingClientRect(), f = document.getElementById('fpsDiag');
        res({ text: document.getElementById('fpsToggle').textContent, inView: t.top >= b.top - 1 && t.bottom <= b.bottom + 1, diag: !!f, diagTopInView: f ? f.getBoundingClientRect().top < b.bottom : null });
      }))));
      await page.locator('#fpsToggle').scrollIntoViewIfNeeded();
      await shot(page, `m5-help-bottom-${size[0]}`);
      const off = await look();
      assert.deepEqual([off.text, off.diag], ['顯示效能資訊', false]);
      await page.click('#fpsToggle');
      const on = await look();
      await shot(page, `m5-help-fps-${size[0]}`);
      assert.deepEqual([on.text, on.diag, on.inView, on.diagTopInView], ['隱藏效能資訊', true, true, true], '打開效能資訊後，鈕或數字不在眼前');
      await page.waitForTimeout(700); // 同一點的鈕剛換字，遊戲的連點守衛會吞掉 500ms 內的第二下（沒改的產品也一樣），等過去再點
      await page.click('#fpsToggle');
      const off2 = await look();
      assert.deepEqual([off2.text, off2.diag, off2.inView], ['顯示效能資訊', false, true], '關掉效能資訊後，鈕不在眼前');
      assert.deepEqual(errors, []);
    } finally { await close(); }
  });
}

/* ---------------- M6 ---------------- */
test('M6 別人的袋子：公開戰力＝座位上同一串「N 隻・血 M」；舊規則（PAPERWAR_ON=false）照舊顯示戰力數字', async () => {
  const { page, errors, close } = await open();
  try {
    await page.evaluate(() => {
      CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']);
      S.players[1].bag.push(...POOL.slice(0, 3).map((x) => ({ ...x })));
      S.players[2].bag.push({ ...POOL[5] });
      renderSeats();
    });
    const rows = [];
    for (const id of [1, 2, 3]) {
      rows.push(await page.evaluate((pid) => {
        showBag(pid);
        const box = document.getElementById('modalbox'), line = [...box.querySelectorAll('p')].map((p) => p.textContent).find((t) => t.startsWith('公開戰力')) || '';
        const seat = document.querySelector(`#seat${pid} .st`).innerText.split('\n').map((t) => t.trim());
        const lineEl = [...box.querySelectorAll('p')].find((p) => p.textContent.startsWith('公開戰力')), cb = [...box.querySelectorAll('button')].find((x) => x.textContent === '關閉');
        const gap = lineEl && cb ? +(cb.getBoundingClientRect().top - lineEl.getBoundingClientRect().bottom).toFixed(1) : null;
        return { pid, line, seat, gap, power: Math.round(power(S.players[pid])), own: canViewPrivateBag(pid) };
      }, id));
      if (id === 1) await shot(page, 'm6-bag');
    }
    console.log('M6', JSON.stringify(rows));
    for (const r of rows) {
      assert.equal(r.own, false, '這一席不該看得到私有袋子（治具沒走到公開分支）');
      const seatForce = r.seat.find((t) => /隻・血/.test(t));
      assert.match(seatForce || '', /^\d+ 隻・血 \d+$/, `座位上沒有兵力：${JSON.stringify(r.seat)}`);
      assert.equal(r.line, `公開戰力：${seatForce}`, `座位 ${r.pid} 的袋子寫「${r.line}」，牌桌座位寫「${seatForce}」`);
    }
    for (const r of rows) assert.ok(r.gap >= 10, `座位 ${r.pid}：公開戰力那行離關閉鈕只有 ${r.gap}px，會被鈕的陰影蓋住（要 ≥10）`);
    assert.notEqual(rows[0].line, rows[2].line, '三席兵力都一樣（治具沒造成差異）');
    const legacy = await page.evaluate(() => { CFG.PAPERWAR_ON = false; showBag(1); return { line: [...document.querySelectorAll('#modalbox p')].map((p) => p.textContent).find((t) => t.startsWith('公開戰力')), power: Math.round(power(S.players[1])) }; });
    assert.equal(legacy.line, `公開戰力：${legacy.power}`);
    assert.deepEqual(errors, []);
  } finally { await close(); }
});
