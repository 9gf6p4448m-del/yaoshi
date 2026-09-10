// 請神 3.0「香火池」Playwright 驅動（凍結檔 docs/experiments/2026-09-10-acceptance-legend-v3.md H6／H11）
// 用法：node tests/tools/legend-drive.mjs <out.json> [--port=9511] [--seeds=1,2,3,4,5,6] [--root=<靜態根目錄>]
//                                          [--shots=<png 前綴>] [--legend=0] [--burn=0] [--all]
//                                          [--base=<felt-probe 對基準量的 json>] [--slack=52]
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
  for (const sel of ['#table', '#north', '#shrines', '.incboard', '.shcards', '#felt', '#stage', '#south', '#market', '.incbar', '.preview', '.legendPicks'])
    document.querySelectorAll(sel).forEach((el) => push(sel, el));
  return rows;
})()`;

/* #felt 的直向溢出：#felt 是 overflow-y:auto，捲得動不代表看得到——
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
  const rec = { seeds: [], errors: [], pageerrors: [], requestfailed: [], overflow: [], voverflow: [], vrows: [],
    portraitOverflow: [], taken: 0, dawn: 0, dawnShrines: 0, skips: 0, picks: 0, carry: 0, carryEg: [], games: [] };
  try {
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
            const base = BASE_V[vkey];
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
  const all = okErr && okPath && okOv && okVert && okCover && okHot;
  console.log(`- 判定：${all ? '✅ 通過' : '❌ 未通過'}`);
  process.exit(all ? 0 : 1);
};
main().catch((e) => { console.error(e); process.exit(2); });
