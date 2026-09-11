// 相位閘＋供奉視窗卡死——紅／綠迴圈探針（v0.53.4，2026-09-11）
// 用法：node tests/tools/phase-gate-probe.mjs [--port=9701] [--seed=1] [--page=index.html] [--json=<out>]
//       node tests/tools/phase-gate-probe.mjs --mutate      ← 突變驗紅（見下）
//   --page=<檔名>  要驗的頁面（相對 repo 根）。對照舊版：`git show 8d8360c:index.html > old-8d8360c.html`
//
// 凍結檔：docs/experiments/2026-09-11-acceptance-phase-gate.md
// 兩個危險的效果：
//   甲 await 的 promise 永不 resolve ⇒ 整局卡死（showTitheAsk 少了 showLegendPick 那道背景保險）
//   乙 第二下落在「使用者還沒看過的互動面」上——**第二下是依座標落地的**，相位一換，
//      同一個座標底下常常已經是別的東西，v0.53.3 那道只掛在 #mainbtn 上的守衛連武裝都沒有。
// 檢查：
//   C1 供奉視窗點背景 ⇒ promise ≤1s 內 resolve、局照常走
//   C2 連按兩下「🕯️ 請神」⇒ 仍在真人選尊視窗、legendPick 沒被叫成 null
//   C3 熱座連按兩下交棒鈕 #hoBtn ⇒ 沒有任何 .mcard 被盯上（S.marks[ACTIVE] 仍 undefined）
//   C4 活性：solo 走到第 2 夜末不卡、熱座兩席都出得了價、audioWake 在被吞掉的那一下也收得到
//
// ★一律用真滑鼠座標（page.mouse.click）★：這一卷守的就是「第二下打到座標底下的東西」，
// b.click() 走的是 id、繞過 hit-test，量不到 C2／C3 要量的現象（v0.53.3 覆審 Q4-1 指出的缺口）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fs.existsSync(c)) return createRequire(c)('playwright').chromium;
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
}
const argv = process.argv.slice(2);
const opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = +(opt.port || 9701);
const SEED = +(opt.seed || 1);
const PAGE = opt.page || 'index.html';
const GAP_FAST = 120;   /* 快按兩下的間隔（凍結：不得為了過而調大） */
const TITHE_MS = 1000;  /* C1：點背景之後 promise 必須在這個時間內 resolve（凍結） */

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

const ST = `(() => {
  const b = document.getElementById('mainbtn');
  const S = window.__yaoshi.S;
  const m = document.getElementById('modal');
  return { txt: b ? b.textContent : '', dis: b ? b.disabled : true,
    round: S ? S.round : 0, active: (typeof ACTIVE !== 'undefined') ? ACTIVE : null,
    marks: (S && S.marks) ? JSON.stringify(S.marks) : null,
    shrines: (S && S.shrines) ? JSON.stringify(S.shrines.map(s => s.takenBy === undefined ? null : s.takenBy)) : null,
    modalOn: !!(m && getComputedStyle(m).display !== 'none'),
    picks: document.querySelectorAll('#modalbox .legendPick').length,
    wakes: window.__wakes | 0,
    phaseAgo: (typeof PHASE_AT === 'number') ? Math.round(performance.now() - PHASE_AT) : null };
})()`;

/* 推到「文字符合 re、且按鈕可按」為止。讀狀態與點擊在同一次 evaluate 裡原子完成。 */
async function driveUntil(page, re, tag, path) {
  const src = re.source;
  for (let i = 0; i < 1200; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0, handoff: 1 }; }
      const b = document.getElementById('mainbtn');
      const S = window.__yaoshi.S;
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0, clicked: 1, txt, round: S ? S.round : 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0, modal: 1 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0, modal: 2 }; }
      }
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || ''))
                || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0, stage: 1 }; }
      }
      return { hit: 0 };
    })()`);
    if (r.hit) return await page.evaluate(ST);
    if (r.clicked) path.push(`${r.round}|${r.txt}`);
  }
  throw new Error(`driveUntil 卡住（${tag}），最後畫面：` + JSON.stringify(await page.evaluate(ST)));
}

/* 主鈕現在有連點守衛，治具跑得比人快、常撞在視窗內被吞掉 ⇒ 按到畫面真的變了為止。
   只讓**驅動**可靠，判準一格沒動（真正卡死由 C4 抓）。 */
async function clickMainUntilTakes(page, tag) {
  const b0 = await page.evaluate(ST);
  for (let i = 0; i < 40; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) b.click(); })()`);
    await page.waitForTimeout(60);
    const s = await page.evaluate(ST).catch(() => null);
    if (!s) return null;
    const ho = await page.evaluate(`(() => { const h = document.getElementById('handoff');
      return !!(h && getComputedStyle(h).display !== 'none'); })()`).catch(() => false);
    if (ho || s.txt !== b0.txt || s.dis !== b0.dis || s.active !== b0.active) return s;
  }
  throw new Error(`clickMainUntilTakes 沒生效（${tag}）`);
}

/* 推到「真人選尊視窗」出現為止（不去點它） */
async function driveUntilPick(page, tag, path) {
  for (let i = 0; i < 2500; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const m = document.getElementById('modal');
      const up = !!(m && getComputedStyle(m).display !== 'none' && document.querySelectorAll('#modalbox .legendPick').length);
      if (up) return { hit: 1 };
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0 }; }
      const b = document.getElementById('mainbtn');
      const S = window.__yaoshi.S;
      if (b && !b.disabled) { b.click(); return { hit: 0, clicked: 1, txt: b.textContent, round: S ? S.round : 0 }; }
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0 }; }
      }
      if (b && b.disabled) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || ''))
                || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0 }; }
      }
      return { hit: 0 };
    })()`);
    if (r.hit) return await page.evaluate(ST);
    if (r.clicked) path.push(`${r.round}|${r.txt}`);
  }
  throw new Error(`driveUntilPick 卡住（${tag}）`);
}

let ROUNDS_DEFAULT = 0, SHRINE_NIGHTS_DEFAULT = null;
async function newGame(page, seed, opts) {
  const o = opts || {};
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(({ sd, mode, roles, sn, rd, dftR, dftS }) => {
    CFG.T = 1;
    CFG.ROUNDS = rd || dftR;
    CFG.SHRINE_NIGHTS = sn || dftS;
    const F = window.__yaoshi.PW_FX;
    for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    /* ★包住真的 audioWake★（不是另外在 document 上加 listener——那會被相位閘的
       stopImmediatePropagation 擋掉，正好量不到「被吞掉的那一下有沒有補叫 audioWake」這件事） */
    if (!window.__wakeHooked) { window.__wakes = 0; const o = window.audioWake;
      window.audioWake = function () { window.__wakes++; return o.apply(this, arguments); }; window.__wakeHooked = 1; }
    /* ★直接量「這一下有沒有被吞」★：相位閘在 document 的 capture 用 stopImmediatePropagation，
       所以**被吞掉的點擊不會**走到這個 bubble 監聽。有進來＝沒被吞，並且留下按下時刻，
       可以事後算出「第二下距武裝幾毫秒」——判準因此不必猜，量測沒落進視窗時就重跑（不是改判準）。 */
    if (!window.__clkHooked) { window.__clicks = [];
      document.addEventListener('click', (e) => { window.__clicks.push(Math.round(e.timeStamp)); }, false);
      window.__clkHooked = 1; }
    window.__clicks = [];
    window.__yaoshi.newGame(mode, sd, roles);
  }, { sd: seed, mode: o.mode || 'solo', roles: o.roles || ['qingmian'], sn: o.shrineNights || null,
       rd: o.rounds || 0, dftR: ROUNDS_DEFAULT, dftS: SHRINE_NIGHTS_DEFAULT });
}

async function centerOf(page, sel) {
  const box = await page.locator(sel).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/* ═════ C1：供奉視窗點背景，promise 必須 resolve ═════
   直接把一筆 S.titheAsk 塞進去再呼叫 showTitheAsk()——那是產品自己的入口（startBattle:5653 呼叫的同一支），
   只是省掉「把某人壽命打到危急」那段鋪陳。用 window 旗標記錄 promise 有沒有 resolve。 */
async function caseTitheBackdrop(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /蓋牌/, 'C1 出價畫面', rec.path);
  /* 讓真人手上有一尊傳說（供奉提示的前提），再排一筆待問 */
  const setup = await page.evaluate(`(() => {
    const S = window.__yaoshi.S; const me = S.players[0];
    const L = (typeof LEGENDS !== 'undefined') ? LEGENDS[0] : null;
    if (!L) return { ok: 0, why: 'no LEGENDS' };
    const item = { ...L, legend: true };
    me.bag.push(item);
    S.titheAsk = [{ pid: 0, item: item.n }];
    window.__titheDone = 0;
    window.__titheT0 = performance.now();
    showTitheAsk().then(() => { window.__titheDone = 1; window.__titheMs = Math.round(performance.now() - window.__titheT0); });
    return { ok: 1, item: item.n };
  })()`);
  rec.setup = setup;
  await page.waitForTimeout(150);
  rec.modalUp = await page.evaluate(`(() => { const m = document.getElementById('modal');
    return !!(m && getComputedStyle(m).display !== 'none' && document.getElementById('titheKeep')); })()`);
  /* 點 #modal 的背景（左上角區域，一定不在 #modalbox 上）
     ★計時原點要在「點下去」那一刻★：凍結檔寫的是「點完背景 ⇒ promise ≤1s 內 resolve」，
     從 showTitheAsk() 被呼叫起算會把治具自己的 round-trip 也算進去（實測 1161ms＝假紅）。 */
  await page.evaluate(`(() => { window.__titheT0 = performance.now(); })()`);
  await page.mouse.click(8, 8);
  await page.waitForTimeout(TITHE_MS + 200);
  rec.after = await page.evaluate(`(() => ({ done: window.__titheDone | 0, ms: window.__titheMs || null,
    modalOn: (() => { const m = document.getElementById('modal'); return !!(m && getComputedStyle(m).display !== 'none'); })() }))()`);
  /* 再確認局還走得動（不卡死） */
  try { const st = await driveUntil(page, /請神|開戰|蓋牌|不盯/, 'C1 局仍可推進', rec.path); rec.alive = true; rec.state = st.txt; }
  catch (e) { rec.alive = false; rec.stuck = String(e.message).slice(0, 160); }
  return rec;
}

/* ═════ C1b：★走 startBattle 真的在 await 的那條路★（覆審 F7）
   C1 是直接呼叫 showTitheAsk() ——那是**重建的模型**，不是危險效果（`await` 解不開 ⇒ 整局卡死）發生的路徑。
   這一條讓提示視窗**自己跳出來**：真人第 1 夜請到一尊，把壽命調到危急門檻
   （`life - INC_TITHE <= TITHE_WARN` 且 `>= 1` ⇒ 4），夜末 settleTithe 就會把它排進 S.titheAsk，
   夜末流程的 `await showTitheAsk()`（index.html:5713）於是停在那裡等。
   然後**真滑鼠**點 #modal 背景——局必須在 TITHE_MS 內走到夜末畫面（舊版會永遠停住）。 */
async function caseTitheRealPath(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed, { shrineNights: [1] });
  /* 第 1 夜燒滿香 ⇒ 真人香火最高 ⇒ 會跳真人選尊視窗 */
  await driveUntil(page, /蓋牌/, 'C1b 第 1 夜出價', rec.path);
  await page.evaluate(`(() => { const M = CFG.INC_MAX; for (let k = 0; k < M; k++) incBump(1); })()`);
  /* 推到選尊視窗，等守衛視窗過去再選（真人讀三張卡本來就不只 500ms） */
  await driveUntilPick(page, 'C1b 選尊視窗', rec.path);
  await page.waitForTimeout(700);
  for (let i = 0; i < 20; i++) {
    const done = await page.evaluate(`(() => { const bs=[...document.querySelectorAll('#modalbox .legendPick')];
      if (!bs.length) return 1; bs[0].click(); return 0; })()`);
    if (done) break;
    await page.waitForTimeout(80);
  }
  rec.gotLegend = await page.evaluate(`(() => window.__yaoshi.S.players[0].bag.some(x => x.legend))()`);
  /* ★把門檻抬高，而不是把壽命壓低★：壓低壽命（life=4）會讓真人在結算戰裡直接戰死、局提早結束，
     驅動反而按到「再入妖市」把頁面重載（實測踩過）。抬高 CFG.TITHE_WARN 只是**為了走到這條路**，
     不動任何判定門檻——settleTithe 的條件是 `life-t<=TITHE_WARN 且 life-t>=1`。 */
  rec.warnSet = await page.evaluate(`(() => { CFG.TITHE_WARN = 999; return CFG.TITHE_WARN; })()`);
  /* 推到夜末——提示視窗會自己跳出來（#mainbtn 這時是停用的，driveUntil 會按 titheKeep，所以不能用它） */
  let up = false;
  for (let i = 0; i < 900; i++) {
    up = await page.evaluate(`(() => { const m=document.getElementById('modal');
      return !!(m && getComputedStyle(m).display !== 'none' && document.getElementById('titheKeep')); })()`).catch(() => false);
    if (up) break;
    /* ★不要按到「再入妖市」★：那是 location.reload()，會把 context 打掉。 */
    await page.evaluate(`(() => { const b=document.getElementById('mainbtn');
      if (b && !b.disabled && !/再入妖市/.test(b.textContent)) b.click();
      const els=[...document.querySelectorAll('#stage button')];
      const sb=els.find(e=>/passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick')||''));
      if (b && b.disabled && sb) sb.click(); })()`).catch(() => {});
    await page.waitForTimeout(25);
  }
  rec.askedByItself = up;
  if (!up) return rec;
  await page.waitForTimeout(700);           /* 讓上一下點擊的守衛視窗過去 */
  const t0 = Date.now();
  await page.mouse.click(8, 8);             /* 真滑鼠點 #modal 背景 */
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(ST);
    if (/進入下一夜|看最終結果/.test(st.txt) && !st.dis) { rec.freedMs = Date.now() - t0; rec.endTxt = st.txt; break; }
    await page.waitForTimeout(50);
  }
  rec.final = await page.evaluate(ST);
  return rec;
}

/* ═════ C2：連按兩下「🕯️ 請神」 ═════ */
async function caseShrineDoubleTap(page, seed) {
  const rec = { path: [] };
  /* 請神夜提前到第 1 夜，純粹為了走到那個視窗（不動任何判定門檻） */
  await newGame(page, seed, { shrineNights: [1] });
  /* 每夜燒滿香，確保真人是香火最高者、會跳出真人選尊視窗 */
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(ST);
    if (/蓋牌/.test(st.txt) && !st.dis) { await page.evaluate(`(() => { const M = CFG.INC_MAX; for (let k = 0; k < M; k++) incBump(1); })()`); break; }
    await page.evaluate(`(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) b.click(); })()`);
    await page.waitForTimeout(20);
  }
  const pt = await centerOf(page, '#mainbtn');
  /* 推到「🕯️ 請神」那一頁（按鈕可按），然後真滑鼠快按兩下 */
  await driveUntil(page, /請神/, 'C2 請神鈕', rec.path);
  rec.before = await page.evaluate(ST);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(GAP_FAST);
  rec.wakesBefore2nd = (await page.evaluate(ST)).wakes;
  await page.mouse.click(pt.x, pt.y).catch(() => {});
  await page.waitForTimeout(300);
  rec.after = await page.evaluate(ST);
  rec.gap = await page.evaluate(`(() => ({ clicks: window.__clicks.slice(),
    phaseAt: (typeof PHASE_AT === 'number') ? Math.round(PHASE_AT) : null })) ()`).catch(() => null);
  /* C5：被吞掉的那一下，audioWake 仍然要被叫到（iOS 解鎖音訊靠它） */
  rec.wakesAfter2nd = rec.after.wakes;
  /* 收尾：把視窗關掉讓後面的案例乾淨（等守衛視窗過了再點） */
  await page.waitForTimeout(700);
  await page.evaluate(`(() => { const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) bs[0].click(); })()`);
  return rec;
}

/* ═════ C3：熱座連按兩下交棒鈕 #hoBtn ═════
   ★落點要先掃出來，不能想當然點正中心★：危險的是「第二下落在交棒鈕底下**那張法寶卡**上」，
   而 #hoBtn 的面積只有一部分蓋在 .mcard 上（正中心實測就不是）。
   所以先跑一次乾跑：按下交棒鈕之後，在 #hoBtn 的矩形內逐點 elementFromPoint，
   找出第一個會落在「有 pickMark(...) 的元素」上的座標；再重開一局，用那個座標快按兩下。
   這一步只是把探針對準真正危險的落點，不改任何判準。 */
async function scanHandoffHotspot(page, seed) {
  await newGame(page, seed, { mode: 'hotseat', roles: ['qingmian', 'hongyi'] });
  for (let i = 0; i < 200; i++) {
    const up = await page.evaluate(`(() => { const h = document.getElementById('handoff');
      return !!(h && getComputedStyle(h).display !== 'none'); })()`);
    if (up) break;
    await page.waitForTimeout(20);
  }
  const box = await page.locator('#hoBtn').boundingBox();
  if (!box) return null;
  await page.evaluate(`(() => document.getElementById('hoBtn').click())()`);
  await page.waitForTimeout(250);
  /* ★注意 boundingBox() 給的是 width/height，不是 w/h★（第一版解構錯，迴圈整個沒跑、掃不到落點） */
  return await page.evaluate(({ x, y, width, height }) => {
    for (let dy = 2; dy < height - 2; dy += 4) {
      for (let dx = 2; dx < width - 2; dx += 4) {
        const el = document.elementFromPoint(x + dx, y + dy);
        if (!el) continue;
        const hit = el.closest('[onclick*="pickMark"]');
        if (hit) return { x: x + dx, y: y + dy, onclick: hit.getAttribute('onclick'), cls: el.className };
      }
    }
    return null;
  }, box);
}
async function caseHandoffDoubleTap(page, seed, hotspot) {
  const rec = { path: [], hotspot };
  await newGame(page, seed, { mode: 'hotseat', roles: ['qingmian', 'hongyi'] });
  for (let i = 0; i < 200; i++) {
    const up = await page.evaluate(`(() => { const h = document.getElementById('handoff');
      return !!(h && getComputedStyle(h).display !== 'none'); })()`);
    if (up) break;
    await page.waitForTimeout(20);
  }
  rec.handoffUp = await page.evaluate(`(() => { const h = document.getElementById('handoff');
    return !!(h && getComputedStyle(h).display !== 'none'); })()`);
  const pt = hotspot || await centerOf(page, '#hoBtn');
  rec.before = await page.evaluate(ST);
  /* ★兩下之間不做任何跨行程取樣★：每一次 Node↔瀏覽器往返都可能卡在主執行緒後面，
     實測會把「間隔 120ms」撐過 500ms 視窗而忽紅忽綠（第一下確實有武裝，30～179ms 都量到過）。
     要的診斷改成事後從 window.__clicks 算。 */
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(GAP_FAST);
  await page.mouse.click(pt.x, pt.y).catch(() => {});
  await page.waitForTimeout(300);
  rec.after = await page.evaluate(ST);
  rec.gap = await page.evaluate(`(() => ({ clicks: window.__clicks.slice(),
    phaseAt: (typeof PHASE_AT === 'number') ? Math.round(PHASE_AT) : null })) ()`).catch(() => null);
  /* 第二下若生效，它會落在 .mcard 上 ⇒ S.marks[ACTIVE] 從 undefined 變成一個數字 */
  rec.markedAfter = await page.evaluate(`(() => { const S = window.__yaoshi.S;
    return (S && S.marks) ? (S.marks[ACTIVE] === undefined ? 'undefined' : String(S.marks[ACTIVE])) : null; })()`);
  return rec;
}

/* ═════ C6：★正常的重複操作不得被誤吞★（覆審 F4／F5／F9 指出的證據缺口）
   相位閘是全域單值，任何一次誤判都會凍結**整個畫面** 500ms。而 C4 用的是合成點擊（clientX/Y=0），
   由建構上被閘的座標守衛放行 ⇒ **整組驗收裡原本沒有任何一條在守「閘不吃正常的第一下」**。
   這一條用**真滑鼠座標**連按燒香「＋」三下（每下間隔 150ms），INC.amt 必須真的到 3。
   燒香是每一夜都要做、而且要連按的核心操作，最能代表這一類。 */
async function caseRepeatTaps(page, seed) {
  const rec = { path: [], taps: [] };
  await newGame(page, seed);
  await driveUntil(page, /蓋牌/, 'C6 出價畫面', rec.path);
  const has = await page.evaluate(`(() => document.querySelectorAll('.incbar button').length)()`);
  rec.incBtns = has;
  if (has < 2) return rec;
  const cap = await page.evaluate(`(() => Math.min(CFG.INC_MAX, incCap(S.players[ACTIVE])))()`);
  rec.cap = cap;
  for (let k = 0; k < Math.min(3, cap); k++) {
    /* 每一下都重新量位置：按下去之後版面會位移（那正是 F4 的成因） */
    const box = await page.evaluate(`(() => { const bs=[...document.querySelectorAll('.incbar button')];
      if (bs.length < 2) return null; const r = bs[1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, dis: bs[1].disabled }; })()`);
    if (!box || box.dis) { rec.taps.push({ k, skipped: true }); break; }
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(150);
    const amt = await page.evaluate(`(() => (typeof INC !== 'undefined' && INC) ? INC.amt : null)()`);
    rec.taps.push({ k, amt });
  }
  rec.finalAmt = await page.evaluate(`(() => (typeof INC !== 'undefined' && INC) ? INC.amt : null)()`);
  return rec;
}

/* ═════ C4：活性 ═════ */
async function caseLiveness(page, seed) {
  const rec = { path: [] };
  await newGame(page, seed);
  await driveUntil(page, /進入下一夜|看最終結果/, 'C4 第 1 夜末', rec.path);
  await driveUntil(page, /蓋牌/, 'C4 第 2 夜出價', rec.path);
  const st = await driveUntil(page, /進入下一夜|看最終結果/, 'C4 第 2 夜末', rec.path);
  rec.round = st.round;
  /* 熱座兩席都要出得了價 */
  await newGame(page, seed, { mode: 'hotseat', roles: ['qingmian', 'hongyi'] });
  const seats = new Set();
  for (let k = 0; k < 2; k++) {
    const b = await driveUntil(page, /蓋牌/, `C4 熱座第 ${k + 1} 席`, rec.path);
    seats.add(b.active);
    await clickMainUntilTakes(page, `熱座第 ${k + 1} 席交卷`);
  }
  rec.seats = [...seats];
  rec.wakes = (await page.evaluate(ST)).wakes;
  return rec;
}

/* ★量測沒落進視窗就重跑，落進去了就一翻兩瞪眼★（`02 §6.2`：先歸因再處置）
   波動來源已歸清楚＝**治具的跨行程往返**（第一下每次都有武裝，30～179ms 都量到過；
   撐過 500ms 視窗的那幾次是 Node↔瀏覽器往返卡在主執行緒後面）。所以重試的是
   「把第二下送進視窗內」這個**前置條件**，不是重試一個已經失敗的判準。
   判準怎麼知道有沒有落進視窗：被相位閘吞掉的點擊**不會**進到 window.__clicks（capture 那層
   stopImmediatePropagation 擋掉了）——所以「__clicks 裡出現了第二下」本身就表示沒被吞，
   這時再用它的 timeStamp 減 PHASE_AT，就知道是「閘漏了」還是「治具太慢、根本沒測到」。 */
function gapVerdict(rec, guardMs) {
  const g = rec.gap;
  if (!g || g.phaseAt == null) return { measured: false };
  const t2 = g.clicks.length ? g.clicks[g.clicks.length - 1] : null;
  if (t2 == null) return { measured: true, swallowed: true };   /* 兩下都沒進來＝都被吞 */
  return { measured: true, swallowed: false, gapMs: t2 - g.phaseAt, inWindow: (t2 - g.phaseAt) < guardMs };
}
async function withGoodGap(runCase, page, seed, guardMs, extra) {
  let last = null;
  for (let k = 0; k < 3; k++) {
    const r = await runCase(page, seed, extra);
    last = r; r.attempts = k + 1;
    const v = gapVerdict(r, guardMs);
    r.gapInfo = v;
    /* 被吞（第二下沒進 __clicks）＝量到了；沒被吞但落在視窗內＝也量到了（那是真失敗）；
       沒被吞又落在視窗外＝治具太慢，換一局重來。 */
    if (!v.measured || v.swallowed || v.inWindow) return r;
  }
  last.gapMissed = true;
  return last;
}

const main = async () => {
  const srv = await serve(ROOT, PORT);
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const out = { page: PAGE, seed: SEED, errors: [], pageerrors: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
    page.on('pageerror', (e) => out.pageerrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/${PAGE}`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
    out.version = await page.evaluate(`(() => VERSION)()`);
    out.guardMs = await page.evaluate(`(() => (typeof MAIN_GUARD_MS === 'number') ? MAIN_GUARD_MS : null)()`);
    out.hasPhaseGate = await page.evaluate(`(() => typeof PHASE_AT === 'number')()`);
    ROUNDS_DEFAULT = await page.evaluate(`(() => CFG.ROUNDS)()`);
    SHRINE_NIGHTS_DEFAULT = await page.evaluate(`(() => CFG.SHRINE_NIGHTS.slice())()`);

    out.c1 = await caseTitheBackdrop(page, SEED);
    out.c1b = await caseTitheRealPath(page, SEED);
    out.c2 = await withGoodGap(caseShrineDoubleTap, page, SEED, out.guardMs);
    out.hotspot = await scanHandoffHotspot(page, SEED);
    out.c3 = await withGoodGap(caseHandoffDoubleTap, page, SEED, out.guardMs, out.hotspot);
    out.c4 = await caseLiveness(page, SEED);
    out.c6 = await caseRepeatTaps(page, SEED);

    const c1 = out.c1, c1b = out.c1b, c2 = out.c2, c3 = out.c3, c4 = out.c4;
    out.checks = {
      /* ★「局仍可推進」那一條拿掉了★（覆審 F7）：它在第一圈就會因為 #mainbtn 還寫著「蓋牌開標」而成立＝恆真。
         這一條現在只宣稱它真的量到的東西：**直接呼叫 showTitheAsk() 時，點背景會讓 promise 在 TITHE_MS 內 resolve**。
         「startBattle 的 await 真的解得開、局不卡死」由走真實路徑的 C1b 負責。 */
      C1_tithe_backdrop_resolves: { pass: c1.modalUp === true && c1.after.done === 1 && c1.after.ms != null && c1.after.ms <= TITHE_MS,
        視窗有跳: c1.modalUp, promise已resolve: !!c1.after.done, 耗時ms: c1.after.ms },
      /* 真實路徑：提示視窗自己跳出來（夜末 await showTitheAsk），點背景後局必須在 TITHE_MS 內往下走 */
      C1b_tithe_realpath_unblocks: { pass: c1b.gotLegend === true && c1b.askedByItself === true
          && c1b.freedMs != null && c1b.freedMs <= TITHE_MS,
        真人有請到尊: c1b.gotLegend, 視窗自己跳出來: c1b.askedByItself,
        點背景後解開耗時ms: c1b.freedMs == null ? '沒解開（卡死）' : c1b.freedMs, 解開後停在: c1b.endTxt || (c1b.final && c1b.final.txt) },
      C2_shrine_pick_survives: { pass: !c2.gapMissed && c2.after.modalOn === true && c2.after.picks > 0 && c2.after.shrines === c2.before.shrines,
        量測: JSON.stringify(c2.gapInfo) + (c2.attempts > 1 ? `・第 ${c2.attempts} 次量到` : ''),
        第二下後還在選尊視窗: c2.after.modalOn, 選項張數: c2.after.picks,
        尊的歸屬: `${c2.before.shrines} → ${c2.after.shrines}` },
      /* hotspot=null 代表掃不到危險落點 ⇒ 這次量測沒成立，直接紅（不讓它因為點到空白而偷偷綠） */
      C3_handoff_no_stray_mark: { pass: !c3.gapMissed && !!out.hotspot && c3.handoffUp === true && c3.markedAfter === 'undefined',
        量測: JSON.stringify(c3.gapInfo) + (c3.attempts > 1 ? `・第 ${c3.attempts} 次量到` : ''),
        交棒遮罩有出現: c3.handoffUp, 危險落點: out.hotspot ? `${Math.round(out.hotspot.x)},${Math.round(out.hotspot.y)} → ${out.hotspot.onclick}` : '掃不到（量測失敗）',
        第二下後的盯上: c3.markedAfter, marks: c3.after.marks },
      /* 被吞掉的那一下也要叫到 audioWake（相位閘用 stopImmediatePropagation，不補叫就會斷掉 iOS 解鎖） */
      C5_audiowake_survives: { pass: out.hasPhaseGate === false || (c2.wakesAfter2nd === c2.wakesBefore2nd + 1),
        第二下前: c2.wakesBefore2nd, 第二下後: c2.wakesAfter2nd,
        說明: out.hasPhaseGate === false ? '舊版沒有相位閘，本條不適用' : '被吞掉的那一下必須 +1' },
      /* 純活性：solo 走得到第 2 夜末、熱座兩席都出得了價。★audioWake 那一條拆到 C5★——
         它在沒有相位閘的版本上不可能成立（計數是包在 phaseSwallow 補叫的那一支上），
         留在 C4 會讓「活性」這條在兩版之間不可比。C5 仍然逐條在守它，且 M1 突變體實測會紅。 */
      /* 真座標連按燒香「＋」三下，每一下都要生效（相位閘誤判會靜靜吞掉第 2、3 下） */
      C6_repeat_taps_all_land: { pass: out.c6.incBtns >= 2 && out.c6.finalAmt === Math.min(3, out.c6.cap || 0),
        燒香上限: out.c6.cap, 逐下結果: JSON.stringify(out.c6.taps), 最後的INC: out.c6.finalAmt },
      C4_liveness: { pass: c4.round >= 2 && c4.seats.length === 2,
        solo走到第幾夜: c4.round, 熱座兩席: JSON.stringify(c4.seats), audioWake次數: c4.wakes },
    };
    out.pass = Object.values(out.checks).every((x) => x.pass) && out.pageerrors.length === 0;
  } catch (e) {
    out.fatal = String((e && e.stack) || e);
    out.pass = false;
  } finally {
    await browser.close();
    srv.kill();
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 2));
  console.log(`page=${out.page} VERSION=${out.version} MAIN_GUARD_MS=${out.guardMs} 相位閘=${out.hasPhaseGate ? '有' : '無'}`);
  if (out.fatal) console.log('FATAL ' + out.fatal.split('\n').slice(0, 3).join(' / '));
  for (const [k, v] of Object.entries(out.checks || {})) console.log(`  ${v.pass ? '綠 PASS' : '紅 FAIL'} ${k}  ${JSON.stringify(v)}`);
  if (out.pageerrors.length) console.log('  pageerror: ' + out.pageerrors.slice(0, 3).join(' | '));
  console.log(out.pass ? '★ 全綠 PASS' : '★ 有紅 FAIL');
  process.exit(out.pass ? 0 : 1);
};

/* ---- 突變驗紅：兩個「只刪一行」的副本（原檔全程唯讀） ---- */
function runChild(page, port) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), `--page=${page}`, `--port=${port}`, `--seed=${SEED}`],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    p.stdout.on('data', (d) => { buf += d; });
    p.on('close', (code) => res({ code, out: buf }));
  });
}
const mutate = async () => {
  const txt = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const src = txt.split(/(?<=\n)/);
  const cut = (needle, tag) => {
    const i = src.findIndex((l) => l.includes(needle));
    if (i < 0) throw new Error(`找不到要刪的那一行（${tag}）：` + needle);
    const c = src.slice(); const gone = c[i].trim(); c.splice(i, 1);
    return { out: c.join(''), gone };
  };
  /* ★四個突變體，兩兩守住閘的兩半★（覆審 F6／F8：原本只有 M1／M2，只覆蓋「吞」那一半；
     「偵測」那一半——sigAt 與武裝時機——沒有任何突變體在守，那正是誤吞／漏武裝會出現的地方） */
  const m1 = cut('<MAIN_GUARD_MS){ phaseSwallow(e); return; }', 'M1 相位閘的吞');
  const m2 = cut('tk.addEventListener("click",onBgTithe)', 'M2 供奉視窗的背景保險');
  const m4 = cut('try{ audioWake(); }catch(_){}', 'M4 被吞那一下補叫 audioWake');
  /* M3：讓 sigAt 恆回不同字串 ⇒ 每一下點擊都被判成相位切換、整個畫面永遠在吸收
     ⇒ 正常的重複操作（C6 連按燒香）必須紅。守的是「偵測不得過度武裝」。 */
  const m3src = src.slice();
  const j3 = m3src.findIndex((l) => l.includes('return (el.id||"")+"|"'));
  if (j3 < 0) throw new Error('找不到 sigAt 的 return 那一行');
  const gone3 = m3src[j3].trim();
  m3src[j3] = '    return String(Math.random());\n';
  const f1 = 'old-mut-nophasegate.html', f2 = 'old-mut-notithebg.html',
        f3 = 'old-mut-sigalways.html', f4 = 'old-mut-nowake.html';
  fs.writeFileSync(path.join(ROOT, f1), m1.out, 'utf8');
  fs.writeFileSync(path.join(ROOT, f2), m2.out, 'utf8');
  fs.writeFileSync(path.join(ROOT, f3), m3src.join(''), 'utf8');
  fs.writeFileSync(path.join(ROOT, f4), m4.out, 'utf8');
  let ok = false;
  try {
    console.log('M1 刪掉：' + m1.gone.slice(0, 55) + '\nM2 刪掉：' + m2.gone.slice(0, 55)
      + '\nM3 改掉：' + gone3.slice(0, 45) + ' → return String(Math.random());'
      + '\nM4 刪掉：' + m4.gone.slice(0, 55) + '\n');
    const r1 = await runChild(f1, PORT + 60);
    const r2 = await runChild(f2, PORT + 61);
    const r3 = await runChild(f3, PORT + 62);
    const r4 = await runChild(f4, PORT + 63);
    const red = (r, k) => new RegExp('紅 FAIL ' + k).test(r.out);
    const c2 = red(r1, 'C2_shrine_pick_survives'), c3 = red(r1, 'C3_handoff_no_stray_mark');
    const c1 = red(r2, 'C1_tithe_backdrop_resolves');
    const c6 = red(r3, 'C6_repeat_taps_all_land');
    const c5 = red(r4, 'C5_audiowake_survives');
    for (const [tag, r] of [['M1', r1], ['M2', r2], ['M3', r3], ['M4', r4]])
      console.log(r.out.split('\n').filter((l) => /紅 FAIL|★/.test(l)).map((l) => `  ${tag} ` + l.trim()).join('\n'));
    ok = c2 && c3 && c1 && c6 && c5;
    console.log(JSON.stringify({ mode: 'mutate',
      M1: { mutation: '刪掉相位閘的吞', expect: 'C2/C3 紅', got: { C2: c2 ? '紅 ✅' : '沒紅 ❌', C3: c3 ? '紅 ✅' : '沒紅 ❌' } },
      M2: { mutation: '刪掉 showTitheAsk 的背景保險', expect: 'C1 紅', got: c1 ? '紅 ✅' : '沒紅 ❌' },
      M3: { mutation: 'sigAt 恆變（偵測過度武裝）', expect: 'C6 紅', got: c6 ? '紅 ✅' : '沒紅 ❌' },
      M4: { mutation: '刪掉被吞那一下補叫的 audioWake', expect: 'C5 紅', got: c5 ? '紅 ✅' : '沒紅 ❌' },
      verdict: ok ? '突變驗紅 ✅' : '突變沒驗紅 ❌（這組綠燈不可信）' }));
  } finally {
    /* 原檔沒動過，「還原」＝刪掉暫存突變體。★清完才 exit★ */
    for (const x of [f1, f2, f3, f4]) fs.rmSync(path.join(ROOT, x), { force: true });
  }
  process.exit(ok ? 0 : 1);
};

if (opt.mutate) mutate(); else main();
