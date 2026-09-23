// A3 聲音卷 凍結 #6①（2026-09-18）：四支新音在遊戲裡真的接了線。
// headless Chromium 載真正的 index.html（本機 http.server），在任何 script 之前用 addInitScript 攔 window.YS_SFX.play
// 記「名稱＋當時的夜次＋SKIP 狀態」；seeds 1–3 各自動打完一整局（真人座位由驅動器點主鈕），再對 S.history 比：
//   封標 seal：每夜 ≥1 次（主鈕「蓋牌」那一下）
//   揭盅 reveal：次數 ＝ 該局得標件數（auction[].winnerId!=null）
//   受咒 curse：次數 ＝ auction[] 裡 intent==='poison' 的筆數（得標者意圖＝已塞入；不算 bids[] 層）
//   落籌 chip：出價視窗點「＋」3 次 ＝ 3 次
//   SKIP：跳過期間任何聲部 0 次；?sfx=0：整局 0 次
// 演出時長（CFG.T、PW_FX.*_MS）壓到 1ms 只為跑得動，音效觸發點不依賴時長；賽局 rng 一次都不多耗（trace-eq 另驗）。
// 慣例同 tests/tools/mainbtn-dblclick-probe.mjs（驅動器）與 duel-drive.mjs（serve）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 9612;
const SEEDS = [1, 2, 3];

const HOOK = `(() => {
  let real = null; window.__sfxLog = [];
  Object.defineProperty(window, 'YS_SFX', { configurable: true, get() { return real; }, set(v) {
    real = v;
    if (v && typeof v.play === 'function' && !v.__hooked) {
      const o = v.play;
      v.play = function (name, opts) {
        let round = 0, skip = null;
        try { round = window.__yaoshi && window.__yaoshi.S ? window.__yaoshi.S.round : 0; } catch (e) {}
        try { skip = typeof SKIP !== 'undefined' ? SKIP : null; } catch (e) {}
        window.__sfxLog.push({ name, round, skip });
        return o.call(this, name, opts);
      };
      v.__hooked = 1;
    }
  } });
  try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
})()`;

/* 推到「主鈕文字符合 re 且可按」為止；順手處理交棒／供奉視窗／請神挑尊／異事夜的 #stage 按鈕。
   opts.skipReveals：看到跳過鈕就按（驗 SKIP 期間 0 聲）。 */
const wakeSignals = []; /* SKIP 確實叫醒 PW_WAKE 的夜次（診斷用） */
async function driveUntil(page, re, opts = {}) {
  const src = re.source;
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;
  const skipAttempts = [];
  const bounded = (promise, ms, label) => {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} 超時（${ms}ms）`)), ms); }),
    ]).finally(() => clearTimeout(timer));
  };
  const evaluate = (expression) => bounded(page.evaluate(expression), 30 * 1000, 'Playwright page.evaluate');
  let idleSince = null;
  while (Date.now() < deadline) {
    await bounded(page.waitForTimeout(10), 30 * 1000, 'Playwright page.waitForTimeout');
    const r = await evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0 }; }
      const sk = document.getElementById('skipbtn');
      if (${opts.skipReveals ? 'true' : 'false'} && sk && sk.style.display === 'block' && !sk.disabled) { sk.click(); return { hit: 0 }; }
      const b = document.getElementById('mainbtn');
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0 }; }
      }
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0 }; }
      }
      return { hit: 0, idle: 1 };
    })()`);
    if (r.hit) return { text: r.txt, skipAttempts };
    /* 對決演出在 headless 偶爾醒不來。以真實經過時間量閒置，避免慢速頁面把「300 次輪詢」
       拉成十幾秒；而且只在可見的對決層跳過，不能在開標揭盅等待時截斷揭盅音。 */
    if (r.idle) idleSince ??= Date.now();
    else idleSince = null;
    if (idleSince !== null && Date.now() - idleSince >= 3000) {
      idleSince = Date.now();
      const before = await evaluate(() => {
        const sk = document.getElementById('skipbtn');
        const duel = document.getElementById('duel');
        const duelVisible = duel && getComputedStyle(duel).display !== 'none' && duel.classList.contains('on');
        if (!duelVisible || !sk || sk.style.display !== 'block' || sk.disabled) return null;
        return {
          round: window.__yaoshi.S.round, wakePending: typeof PW_WAKE === 'function',
        };
      });
      if (before) {
        const attempt = await evaluate(() => {
          const sk = document.getElementById('skipbtn');
          const duel = document.getElementById('duel');
          const duelVisible = duel && getComputedStyle(duel).display !== 'none' && duel.classList.contains('on');
          if (!duelVisible || !sk || sk.style.display !== 'block' || sk.disabled) return { clickAttempted: false };
          const wakePending = typeof PW_WAKE === 'function';
          sk.click();
          return {
            clickAttempted: true,
            skipActivated: SKIP === true,
            wakeSignaled: wakePending && typeof PW_WAKE !== 'function',
          };
        });
        if (attempt.clickAttempted) {
          const record = { round: before.round, ...attempt };
          skipAttempts.push(record);
          if (attempt.skipActivated && attempt.wakeSignaled) wakeSignals.push(before.round);
        }
      }
    }
  }
  const state = await evaluate(() => {
    const b = document.getElementById('mainbtn'), sk = document.getElementById('skipbtn'), duel = document.getElementById('duel');
    return {
      text: b?.textContent, disabled: b?.disabled, pending: typeof PENDING === 'function',
      skip: SKIP, skipDisplay: sk?.style.display, reveal: REVEAL_ANIMATING,
      pwWake: typeof PW_WAKE === 'function', round: window.__yaoshi?.S?.round,
      duel: { display: duel ? getComputedStyle(duel).display : null, classes: duel?.className },
      modal: document.getElementById('modal') ? getComputedStyle(document.getElementById('modal')).display : null,
      stage: document.getElementById('stage')?.textContent?.slice(0, 240),
    };
  });
  throw new Error(`driveUntil 超時（${timeoutMs}ms）：${JSON.stringify({ state, skipAttempts, wakeSignals })}`);
}

async function newGame(page, seed, rounds) {
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(({ sd, rd }) => {
    CFG.T = 1; if (rd) CFG.ROUNDS = rd;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__sfxLog.length = 0;
    /* 真人開局一定經過 startEntry→initSfx()（掛按鈕聲部委派、解鎖音訊）；直接呼叫 newGame 跳過了標題頁，
       這裡補叫一次，走的是產品同一支函式，不另寫委派。 */
    initSfx();
    window.__yaoshi.newGame('solo', sd, ['qingmian']);
  }, { sd: seed, rd: rounds || 0 });
}

const summarize = (log) => {
  const c = {}; for (const e of log) c[e.name] = (c[e.name] || 0) + 1; return c;
};

test('凍結 #6①：封標／揭盅／受咒／落籌接線與 SKIP、?sfx=0 靜音', { timeout: 15 * 60 * 1000 }, async (t) => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(HOOK);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const seed of SEEDS) {
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
      await newGame(page, seed);
      const drive = await driveUntil(page, /看最終結果/);
      const { log, nights } = await page.evaluate(() => ({ log: window.__sfxLog.slice(), nights: window.__yaoshi.S.history.nights.map((n) => ({ round: n.round, winners: n.auction.filter((a) => a.winnerId != null).length, poison: n.auction.filter((a) => a.intent === 'poison' && !a.poisonBlocked).length })) }));
      const c = summarize(log);
      const winners = nights.reduce((s, n) => s + n.winners, 0), poison = nights.reduce((s, n) => s + n.poison, 0);
      t.diagnostic(`seed ${seed}: nights ${nights.length} winners ${winners} poison ${poison} skipAttempts ${JSON.stringify(drive.skipAttempts)} wakeSignals ${JSON.stringify(wakeSignals.splice(0))} → ${JSON.stringify(c)}`);
      assert.ok(nights.length > 0 && winners > 0, `seed ${seed} 活性：要有夜次與得標件`);
      for (const n of nights) assert.ok(log.some((e) => e.name === 'seal' && e.round === n.round), `seed ${seed} 第 ${n.round} 夜沒有封標音`);
      assert.equal(c.reveal || 0, winners, `seed ${seed} 揭盅音次數 ≠ 得標件數`);
      assert.equal(c.curse || 0, poison, `seed ${seed} 受咒音次數 ≠ 毒標得標筆數`);
      /* gong 另有紙紮夜戰拍點（PW_BEAT_SFX）在用，總數不能拿來當開市鑼的計數；「揭盅不再播 gong」由
         reveal＝得標件數那條守（舊版 reveal 恆 0）。 */
    }

    /* 落籌：第 1 夜出價視窗點「＋」3 次 */
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await newGame(page, 1);
    await driveUntil(page, /蓋牌/);
    await page.evaluate(() => { window.__sfxLog.length = 0; const card = document.querySelector('#stage .mcard, #market .mcard, .rail .mcard'); if (typeof openSheet === 'function') openSheet(0); else if (card) card.click(); });
    await page.waitForSelector('button[data-sfx="chip"]', { timeout: 5000 });
    for (let i = 0; i < 3; i++) await page.click('button[data-sfx="chip"]');
    const chipLog = await page.evaluate(() => window.__sfxLog.slice());
    assert.equal(chipLog.filter((e) => e.name === 'chip').length, 3, '「＋」三下要三聲落籌，得到 ' + JSON.stringify(summarize(chipLog)));
    assert.equal(chipLog.filter((e) => e.name === 'woodfish').length, 0, '「＋」不該再播木魚');

    /* SKIP：跳過期間 0 聲（兩夜短局，每次開標都按跳過） */
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await newGame(page, 2, 2);
    await driveUntil(page, /看最終結果/, { skipReveals: true });
    const skipLog = await page.evaluate(() => window.__sfxLog.slice());
    const duringSkip = skipLog.filter((e) => e.skip === true);
    assert.ok(skipLog.length > 0, 'SKIP 局仍要有跳過前的聲音（活性）');
    assert.equal(duringSkip.length, 0, 'SKIP 期間不得有任何聲部：' + JSON.stringify(summarize(duringSkip)));

    /* ?sfx=0：整局 0 次 */
    await page.goto(`http://127.0.0.1:${PORT}/index.html?sfx=0`, { waitUntil: 'load' });
    await newGame(page, 3, 2);
    await driveUntil(page, /看最終結果/);
    const muteLog = await page.evaluate(() => window.__sfxLog.slice());
    assert.equal(muteLog.length, 0, '?sfx=0 仍有聲部呼叫：' + JSON.stringify(summarize(muteLog)));

    assert.deepEqual(errors, [], 'pageerror');
  } finally {
    await browser.close();
    srv.kill();
  }
});
