// 傳說三尊「請神」Playwright 驅動（第 4 卷，凍結檔 L6）
// 用法：node tests/tools/legend-drive.mjs <out.json> [--port=8841] [--seeds=1,2,3,4,5,6] [--root=<靜態根目錄>] [--shots=<png 前綴>]
// 做的事：自起 http.server，用真的瀏覽器把一整局玩完（真人座位每夜燒滿香），錄下
//   ① console error／pageerror／requestfailed
//   ② 是不是真的走到「請走」與「天亮回天」各至少一次
//   ③ 每一次畫面更新後的橫向溢出（844×390 橫式與 390×844 直式各量一輪）
// 走到兩條路各一次就停；一顆種子走不到就換下一顆（真人每夜燒滿，通常第一顆就同時有請走與回天）。
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
const PORT = +(opt.port || 8841);
const SERVE_ROOT = opt.root || ROOT;
const SEEDS = (opt.seeds || '1,2,3,4,5,6,7,8').split(',').map(Number);

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

/* 頁面端：量整頁與幾個關鍵容器的橫向溢出（scrollWidth > clientWidth 即溢出） */
const OVERFLOW = `(() => {
  const rows = [];
  // 自己就是可捲容器（overflow-x:auto/scroll）的不算溢出——那是刻意讓它內部捲，外層版面沒有被撐開。
  // 判準跟 index.html 底部那份「放行名單」同一條：容器自己捲＝合法，撐開祖先＝溢出。
  const push = (sel, el) => { if (!el) return;
    const ox = getComputedStyle(el).overflowX; if (ox === 'auto' || ox === 'scroll') return;
    const o = el.scrollWidth - el.clientWidth;
    if (o > 1) rows.push({ sel, scrollW: el.scrollWidth, clientW: el.clientWidth, over: o }); };
  push('html', document.documentElement);
  push('body', document.body);
  for (const sel of ['#table', '#north', '#shrines', '#felt', '#stage', '#south', '#market', '.incbar', '.preview'])
    document.querySelectorAll(sel).forEach((el) => push(sel, el));
  return rows;
})()`;

const main = async () => {
  const srv = await serve(SERVE_ROOT, PORT);
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const rec = { seeds: [], errors: [], pageerrors: [], requestfailed: [], overflow: [], portraitOverflow: [], taken: 0, dawn: 0, dawnShrines: 0, games: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') rec.errors.push(m.text()); });
    page.on('pageerror', (e) => rec.pageerrors.push(String(e)));
    page.on('requestfailed', (r) => rec.requestfailed.push(r.url() + ' ' + (r.failure() || {}).errorText));
    // 開場三卡（showIntro）把 #mainbtn 停用、只認自己那顆按鈕，會把驅動卡在第 1 夜；
    // 直接把「看過了」的旗標寫進 localStorage，走的是產品自己的 introSeen() 路徑。
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?legend=${opt.legend === '0' ? 0 : 1}`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });

    for (const seed of SEEDS) {
      if (rec.taken > 0 && rec.dawnShrines > 0 && rec.dawn > 0) break;
      rec.seeds.push(seed);
      const g = { seed, nights: 0, clicks: 0, taken: [], dawn: 0, burned: 0, stuck: null, txts: {} };
      // 開一局（真人＝南家，角色固定，避免選角畫面的隨機）；把演出節拍壓到最短
      await page.evaluate((sd) => {
        CFG.T = 1;
        // 對決時間軸的每一段都壓到最短：不壓的話光是「開戰（停用）」那段等 3D／演出就吃掉整個 step 預算
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
            round: S ? S.round : 0, over: !!(S && S.shrines && S.shrines.every(s => !s.open)),
            shrines: S && S.shrines ? S.shrines.map(s => ({ i: s.i, open: s.open, takenBy: s.takenBy })) : null,
            dawn: (S && S.history && S.history.shrineDawn) ? S.history.shrineDawn.length : 0,
            dawnShrines: S && S.shrines ? S.shrines.filter(s => s.dawn).length : 0,
            hasInc: typeof INC !== 'undefined' && !!INC,
            bidding: b && /蓋牌/.test(b.textContent) };
        })()`);
        g.nights = Math.max(g.nights, st.round);
        g.txts[st.txt + (st.dis ? '（停用）' : '')] = (g.txts[st.txt + (st.dis ? '（停用）' : '')] || 0) + 1;
        g.stuck = st.txt + (st.dis ? '（停用）' : '');
        if (st.shrines) g.taken = st.shrines.filter((s) => s.takenBy != null).map((s) => s.i);
        g.dawn = st.dawn;
        const key = st.txt + (st.dis ? '/d' : '');
        if (key !== lastKey) {
          lastKey = key;
          const ov = await page.evaluate(OVERFLOW);
          if (ov.length) rec.overflow.push({ seed, step, txt: st.txt, ov });
        }
        if (st.bidding && st.hasInc) {
          // 每夜對還開著的那一尊燒滿，確保一定會走到「請走」那條路
          await page.evaluate(`(() => { const M = CFG.INC_MAX; for (let k = 0; k < M; k++) incBump(1); })()`);
          g.burned++;
        }
        if (step % 400 === 0 && step) console.log(`    …seed ${seed} step ${step} 第 ${st.round} 夜「${st.txt}${st.dis ? '（停用）' : ''}」`);
        if (st.txt === '再入妖市') break;
        if (!st.dis) { await page.click('#mainbtn'); g.clicks++; stallN = 0; continue; }
        stallN++;
        if (stallN > 25) {
          // #stage 裡自帶按鈕的畫面：異事密封輸入（passEvent／pickEventOpt／confirmEventNum）與開場三卡（__introNext）
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
      // 規則頁也開一次
      await page.evaluate(`(() => { if (typeof openHelp === 'function') openHelp(); })()`);
      await page.waitForTimeout(150);
      const ovH = await page.evaluate(OVERFLOW);
      if (ovH.length) rec.overflow.push({ seed, step: 'help', ov: ovH });
      await page.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
      const fin = await page.evaluate(`(() => { const S = window.__yaoshi.S;
        if (!S.shrines) return { taken: 0, dawnShrines: 0, dawn: 0, round: S.round };
        return { taken: S.shrines.filter(s => s.takenBy != null).length,
                 dawnShrines: S.shrines.filter(s => s.dawn).length,
                 dawn: (S.history && S.history.shrineDawn) ? S.history.shrineDawn.length : 0,
                 round: S.round }; })()`);
      g.taken = fin.taken; g.dawn = fin.dawn; g.dawnShrines = fin.dawnShrines; g.nights = fin.round;
      rec.taken += fin.taken; rec.dawn += fin.dawn; rec.dawnShrines += fin.dawnShrines;
      rec.games.push(g);
      if (opt.shots) await page.screenshot({ path: `${opt.shots}-s${seed}.png` });
    }

    // 手機直式：整頁不得橫向溢出。量在**固定的同一頁**（新開一局、停在出價那一頁）——
    // 拿局末結果畫面跟出價畫面比等於在比兩個不同版面，ON／OFF 對照就沒有意義了。
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
    rec.landscapeFixed = await page.evaluate(OVERFLOW);   // 同一頁的橫式對照（ON／OFF 才比得起來）
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    rec.portraitOverflow = await page.evaluate(OVERFLOW);
    if (opt.shots) await page.screenshot({ path: `${opt.shots}-portrait.png` });
    await ctx.close();
  } finally {
    await browser.close();
    srv.kill();
  }
  fs.writeFileSync(OUT, JSON.stringify(rec, null, 1), 'utf8');
  const okErr = rec.errors.length === 0 && rec.pageerrors.length === 0;
  const okPath = rec.taken > 0 && rec.dawnShrines > 0;
  const okOv = rec.overflow.length === 0 && rec.portraitOverflow.length === 0;
  console.log(`# 請神 Playwright 驅動（844×390 橫式＋390×844 直式）　輸出 ${path.basename(OUT)}`);
  console.log(`- 局數 ${rec.games.length}：` + rec.games.map((g) => `seed ${g.seed}（${g.nights} 夜・請走 ${g.taken} 尊・回天收攤 ${g.dawnShrines} 龕／結清 ${g.dawn} 筆・燒香 ${g.burned} 夜）`).join('；'));
  rec.games.forEach((g) => console.log(`  · seed ${g.seed} 停在「${g.stuck}」　按鈕出現次數 ${JSON.stringify(g.txts)}`));
  console.log(`- console error ${rec.errors.length}、pageerror ${rec.pageerrors.length}、requestfailed ${rec.requestfailed.length} → ${okErr ? '✅' : '❌'}`);
  if (!okErr) { rec.errors.slice(0, 5).forEach((e) => console.log('    error: ' + e)); rec.pageerrors.slice(0, 5).forEach((e) => console.log('    pageerror: ' + e)); }
  console.log(`- 走到「請走」${rec.taken} 次、「天亮回天」收攤 ${rec.dawnShrines} 龕（其中結出階段獎勵 ${rec.dawn} 筆）→ ${okPath ? '✅' : '❌'}`);
  console.log(`- 固定頁對照（同一局同一頁「${rec.portraitAt}」）：橫式 ${JSON.stringify(rec.landscapeFixed)}　直式 ${JSON.stringify(rec.portraitOverflow)}`);
  console.log(`- 橫向溢出：橫式 ${rec.overflow.length} 筆、直式 ${rec.portraitOverflow.length} 筆（直式量在「${rec.portraitAt}」那一頁）→ ${okOv ? '✅' : '❌'}`);
  if (!okOv) [...rec.overflow.slice(0, 5), ...rec.portraitOverflow.slice(0, 5)].forEach((o) => console.log('    ' + JSON.stringify(o)));
  console.log(`- 判定：${okErr && okPath && okOv ? '✅ 通過' : '❌ 未通過'}`);
  process.exit(okErr && okPath && okOv ? 0 : 1);
};
main().catch((e) => { console.error(e); process.exit(2); });
