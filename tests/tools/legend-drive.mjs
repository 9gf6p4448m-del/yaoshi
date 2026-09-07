// 請神 2.0「神債暗標」Playwright 驅動（凍結檔 docs/experiments/2026-09-07-acceptance-legend-v2.md G6／G11）
// 用法：node tests/tools/legend-drive.mjs <out.json> [--port=8841] [--seeds=1,2,3,4,5,6] [--root=<靜態根目錄>]
//                                          [--shots=<png 前綴>] [--legend=0] [--burn=0]
//   --burn=0  真人整局不燒香（要走到「天亮回天」得留一座龕沒被請走）
//   --legend=0  關掉整個請神機制（量橫向溢出的對照組）；不帶 --legend＝完全不帶 query，走 CFG 預設（v0.44 起＝開）
// 做的事：自起 http.server，用真的瀏覽器把一整局玩完（真人座位每夜燒滿香），錄下
//   ① console error／pageerror／requestfailed
//   ② 是不是真的走到「請走」「回天」「落空的階段獎勵」各至少一次（G6）
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
// 覆審 L7：這一顆種子拿到傳說之後會按一次「送神回天」，把 releaseLegend 的真人路徑走過
const GIVEUP_SEED = +(opt.giveup || SEEDS[1] || SEEDS[0]);
/* G6 直向（凍結檔 §2.1 修訂四**二版**，使用者裁定 G6 甲）：
   --base=<json>＝基準版各格的溢出值（`felt-probe.mjs --json=` 對基準 index.html 量出來的那一份）；
   --slack=<px>＝神龕列展開成兩列的高度寬限（預設 52）。沒帶 --base 就沒有基準可比，一律不算通過。 */
const BASE_V = opt.base && fs.existsSync(opt.base) ? JSON.parse(fs.readFileSync(opt.base, 'utf8')) : {};
const BASE_SLACK = +(opt.slack || 52);

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

/* 頁面端：量整頁與幾個關鍵容器的橫向溢出（scrollWidth > clientWidth 即溢出），
   外加 #felt 的**直向**溢出——凍結檔 §2.1 修訂四（使用者裁定加嚴）：
   844×390 第 1～3 夜的出價頁與盯上頁，`#felt.scrollHeight − clientHeight` 必須 ≤ 0。
   基準 69df086 是 0，本分支在收成一列／卡面精簡之前實測 47／77 紅。 */
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

/* #felt 的直向溢出（G6 §2.1 修訂四）：#felt 是 overflow-y:auto，捲得動不代表看得到——
   844×390 這個尺寸下把市集卡的部隊預覽整行推到看不見，就是版面沒放下。 */
const VOVERFLOW = `(() => {
  const f = document.getElementById('felt');
  if (!f) return null;
  return { scrollH: f.scrollHeight, clientH: f.clientHeight, over: f.scrollHeight - f.clientHeight };
})()`;

const main = async () => {
  const srv = await serve(SERVE_ROOT, PORT);
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const rec = { seeds: [], errors: [], pageerrors: [], requestfailed: [], overflow: [], voverflow: [], vrows: [], portraitOverflow: [], taken: 0, dawn: 0, dawnShrines: 0, rewards: 0, games: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') rec.errors.push(m.text()); });
    page.on('pageerror', (e) => rec.pageerrors.push(String(e)));
    page.on('requestfailed', (r) => rec.requestfailed.push(r.url() + ' ' + (r.failure() || {}).errorText));
    // 開場三卡（showIntro）把 #mainbtn 停用、只認自己那顆按鈕，會把驅動卡在第 1 夜；
    // 直接把「看過了」的旗標寫進 localStorage，走的是產品自己的 introSeen() 路徑。
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    // v0.44 起 CFG.LEGEND_ON 預設 true：不帶 --legend 就完全不帶 query，走產品自己的預設（凍結檔 A0-b）
    const q = opt.legend === undefined ? '' : `?legend=${opt.legend === '0' ? 0 : 1}`;
    await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`, { waitUntil: 'load' });
    rec.legendOn = await page.evaluate(`(() => CFG.LEGEND_ON)()`);
    rec.shrineEl = await page.evaluate(`(() => !!document.getElementById('shrines'))()`);
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });

    for (const seed of SEEDS) {
      // --all：不提早收工，把 --seeds 給的每一顆都跑完（凍結檔 G6 的「seeds ≥6」照字面走）
      if (!opt.all && rec.taken > 0 && rec.dawnShrines > 0 && rec.dawn > 0) break;
      rec.seeds.push(seed);
      const g = { seed, nights: 0, clicks: 0, taken: [], dawn: 0, burned: 0, stuck: null, txts: {}, shrineEl: null, incEl: null };
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
        if (g.shrineEl === null) g.shrineEl = await page.evaluate(`(() => !!document.getElementById('shrines'))()`);
        if (g.incEl === null && st.bidding) g.incEl = await page.evaluate(`(() => !!document.querySelector('.incbar'))()`);
        g.txts[st.txt + (st.dis ? '（停用）' : '')] = (g.txts[st.txt + (st.dis ? '（停用）' : '')] || 0) + 1;
        g.stuck = st.txt + (st.dis ? '（停用）' : '');
        if (st.shrines) g.taken = st.shrines.filter((s) => s.takenBy != null).map((s) => s.i);
        g.dawn = st.dawn;
        const key = st.txt + (st.dis ? '/d' : '');
        if (key !== lastKey) {
          lastKey = key;
          const ov = await page.evaluate(OVERFLOW);
          if (ov.length) rec.overflow.push({ seed, step, txt: st.txt, ov });
          // 直向（凍結檔 §2.1 修訂四**二版**，使用者裁定 G6 甲）：只在第 1～3 夜的出價頁與盯上頁取樣；
          // **第 1 夜的每一頁必須是 0**，其餘頁只要不比基準同格＋BASE_SLACK（神龕列展開的高度）差。
          // 判定所需的基準值由 --base=<json> 帶進來（felt-probe 對基準版量的那一份）；沒帶就只印不判。
          if (st.round >= 1 && st.round <= 3 && !st.dis && /蓋牌|不盯任何一件/.test(st.txt)) {
            const vo = await page.evaluate(VOVERFLOW);
            rec.vsamples = (rec.vsamples || 0) + 1;
            const key = `${seed}|${st.round}|${/蓋牌/.test(st.txt) ? '出價' : '盯上'}`;
            const base = BASE_V[key];
            const cap = (st.round === 1) ? 0 : ((base == null ? 0 : base) + BASE_SLACK);
            rec.vrows.push({ key, over: vo ? vo.over : null, base: base == null ? null : base, cap });
            if (vo && vo.over > cap) rec.voverflow.push({ seed, round: st.round, txt: st.txt, cap, base, ...vo });
          }
        }
        // --burn=0：真人整局不燒香（要走到「天亮回天」那條路就得有龕沒被請走，
        // 真人每夜燒滿的話三龕通常在第 4 夜前就被清空，回天永遠碰不到）
        // 覆審 L7：六顆種子挑一顆（--giveup=<seed>，預設第 2 顆）在拿到傳說之後按一次袋子面板的
        // 「送神回天」，讓 releaseLegend 的 refund=false 那條路徑在**真瀏覽器**裡走過一次。
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
        if (st.bidding && st.hasInc && opt.burn !== '0') {
          // 每夜對還開著的那一尊燒滿，確保一定會走到「請走」那條路
          await page.evaluate(`(() => { const M = CFG.INC_MAX; for (let k = 0; k < M; k++) incBump(1); })()`);
          g.burned++;
        }
        if (step % 400 === 0 && step) console.log(`    …seed ${seed} step ${step} 第 ${st.round} 夜「${st.txt}${st.dis ? '（停用）' : ''}」`);
        if (st.txt === '再入妖市') break;
        // 供奉危急提示（請神 2.0 §二 6）：那是 #modal 上的兩顆鈕，#mainbtn 這時是停用的，
        // 不處理的話驅動會卡死在「開戰（停用）」。一律按「要，繼續供奉」＝與 headless 的預設同一條路。
        const ask = await page.evaluate(`(() => { const m = document.getElementById('modal');
          if (!m || getComputedStyle(m).display === 'none') return 0;
          const k = document.getElementById('titheKeep'); if (!k) return 0; k.click(); return 1; })()`);
        if (ask) { g.titheAsk = (g.titheAsk || 0) + 1; rec.titheAsk = (rec.titheAsk || 0) + 1; stallN = 0; continue; }
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
        // 落空者的階段獎勵：逐夜 history 的 shrine.rewards ＋ 天亮收攤那一批（G6 要各走到一次）
        let rw = (S.history && S.history.shrineDawn) ? S.history.shrineDawn.length : 0;
        if (S.history && S.history.nights) for (const n of S.history.nights)
          if (n.shrine && n.shrine.rewards) rw += n.shrine.rewards.length;
        return { taken: S.shrines.filter(s => s.takenBy != null).length,
                 dawnShrines: S.shrines.filter(s => s.dawn).length,
                 dawn: (S.history && S.history.shrineDawn) ? S.history.shrineDawn.length : 0,
                 rewards: rw, round: S.round }; })()`);
      g.taken = fin.taken; g.dawn = fin.dawn; g.dawnShrines = fin.dawnShrines; g.rewards = fin.rewards; g.nights = fin.round;
      rec.taken += fin.taken; rec.dawn += fin.dawn; rec.dawnShrines += fin.dawnShrines; rec.rewards += fin.rewards;
      rec.games.push(g);
      if (opt.shots) await page.screenshot({ path: `${opt.shots}-s${seed}.png` });
      // G11 人眼：袋子面板（部隊預覽）各拍一張；量的是它會不會在 844×390 撐出橫向溢出
      if (opt.shots) {
        await page.evaluate(`(() => { if (typeof showBag === 'function') showBag(0); })()`);
        await page.waitForTimeout(150);
        const ovB = await page.evaluate(OVERFLOW);
        if (ovB.length) rec.overflow.push({ seed, step: 'bag', ov: ovB });
        await page.screenshot({ path: `${opt.shots}-bag-s${seed}.png` });
        await page.evaluate(`(() => { if (typeof closeModal === 'function') closeModal(); })()`);
      }
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
    // ── 覆審 M1：熱座交棒時，上一位的密封燒香列不得留在 DOM ──
    // 熱座才有交棒畫面（solo 不會叫 showHandoff），所以另開一局 hotseat 走到「蓋牌，交給下一位」那一下。
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
                   incbar: document.querySelectorAll('#stage .incbar').length }; })()`);
        if (st.handoff) {
          hs.handoffShown = true;
          if (hs.sawIncbar && hs.incbarAtHandoff === null) hs.incbarAtHandoff = st.incbar; // 交棒當下還剩幾個燒香列
          await page.click('#hoBtn');
          continue;
        }
        if (/蓋牌/.test(st.txt)) {
          if (st.incbar > 0) hs.sawIncbar = true;
          await page.evaluate(`(() => { if (typeof incBump === 'function') { incBump(1); incBump(1); } })()`);
          await page.click('#mainbtn');
          if (hs.sawIncbar) {  // 交卷之後立刻量：這一下就是 showHandoff 把畫面蓋起來的時候
            await page.waitForTimeout(60);
            const now = await page.evaluate(`(() => { const ho = document.getElementById('handoff');
              return { handoff: !!(ho && getComputedStyle(ho).display !== 'none'),
                       incbar: document.querySelectorAll('#stage .incbar').length }; })()`);
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
    if (opt.shots) await page.screenshot({ path: `${opt.shots}-portrait.png` });
    await ctx.close();
  } finally {
    await browser.close();
    srv.kill();
  }
  fs.writeFileSync(OUT, JSON.stringify(rec, null, 1), 'utf8');
  const okErr = rec.errors.length === 0 && rec.pageerrors.length === 0;
  const okPath = rec.taken > 0 && rec.dawnShrines > 0 && rec.rewards > 0;
  const okOv = rec.overflow.length === 0 && rec.portraitOverflow.length === 0;
  const okVert = rec.voverflow.length === 0 && (rec.vsamples || 0) > 0 && Object.keys(BASE_V).length > 0;
  console.log(`# 請神 Playwright 驅動（844×390 橫式＋390×844 直式）　輸出 ${path.basename(OUT)}`);
  console.log(`- 局數 ${rec.games.length}：` + rec.games.map((g) => `seed ${g.seed}（${g.nights} 夜・請走 ${g.taken} 尊・回天收攤 ${g.dawnShrines} 龕／結清 ${g.dawn} 筆・燒香 ${g.burned} 夜）`).join('；'));
  rec.games.forEach((g) => console.log(`  · seed ${g.seed} 停在「${g.stuck}」　按鈕出現次數 ${JSON.stringify(g.txts)}`));
  if (rec.hotseat) {
    const h = rec.hotseat;
    const ok = h.sawIncbar && h.handoffShown && h.incbarAtHandoff === 0;
    console.log(`- 覆審 M1 熱座交棒：出價頁看得到燒香列＝${h.sawIncbar}、交棒畫面出現＝${h.handoffShown}、交棒當下 #stage .incbar 個數＝${h.incbarAtHandoff} → ${ok ? '✅' : '❌'}`);
  }
  console.log(`- CFG.LEGEND_ON=${rec.legendOn}　神龕列 #shrines 開頁時存在？${rec.shrineEl}　逐局（神龕列／燒香列）：` + rec.games.map((g) => `seed ${g.seed} ${g.shrineEl}/${g.incEl}`).join('；'));
  console.log(`- 供奉危急提示（#modal「壽命危急，繼續供奉？」）出現並按「要」的次數：${rec.titheAsk || 0}`);
  console.log(`- 袋子面板「送神回天」在真瀏覽器按下的次數（覆審 L7，seed ${GIVEUP_SEED}）：${rec.giveUp || 0} ${(rec.giveUp || 0) > 0 ? '✅' : '⚠️ 那一局沒請到傳說，這條沒走到'}`);
  console.log(`- console error ${rec.errors.length}、pageerror ${rec.pageerrors.length}、requestfailed ${rec.requestfailed.length} → ${okErr ? '✅' : '❌'}`);
  if (!okErr) { rec.errors.slice(0, 5).forEach((e) => console.log('    error: ' + e)); rec.pageerrors.slice(0, 5).forEach((e) => console.log('    pageerror: ' + e)); }
  console.log(`- 走到「請走」${rec.taken} 次、「回天」${rec.dawnShrines} 龕、「落空的階段獎勵」${rec.rewards} 筆 → ${okPath ? '✅' : '❌'}`);
  console.log(`- 固定頁對照（同一局同一頁「${rec.portraitAt}」）：橫式 ${JSON.stringify(rec.landscapeFixed)}　直式 ${JSON.stringify(rec.portraitOverflow)}`);
  console.log(`- 橫向溢出：橫式 ${rec.overflow.length} 筆、直式 ${rec.portraitOverflow.length} 筆（直式量在「${rec.portraitAt}」那一頁）→ ${okOv ? '✅' : '❌'}`);
  if (!okOv) [...rec.overflow.slice(0, 5), ...rec.portraitOverflow.slice(0, 5)].forEach((o) => console.log('    ' + JSON.stringify(o)));
  console.log(`- **直向**（#felt scrollHeight − clientHeight；§2.1 修訂四二版：第 1 夜每頁＝0、其餘頁 ≤ 基準同格＋${BASE_SLACK}px）：`
    + `取樣 ${rec.vsamples || 0} 次、超標 ${rec.voverflow.length} 次`
    + `${Object.keys(BASE_V).length ? '' : '（**沒帶 --base=，沒有基準可比 ⇒ 不算通過**）'} → ${okVert ? '✅' : '❌'}`);
  rec.vrows.forEach((r) => console.log(`    ${r.key}：本卷 ${r.over}　基準 ${r.base == null ? '—' : r.base}　上限 ${r.cap} ${r.over != null && r.over <= r.cap ? '✅' : '❌'}`));
  console.log(`- 判定：${okErr && okPath && okOv && okVert ? '✅ 通過' : '❌ 未通過'}`);
  process.exit(okErr && okPath && okOv && okVert ? 0 : 1);
};
main().catch((e) => { console.error(e); process.exit(2); });
