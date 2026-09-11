/* Tier 3 那一拍的「對決版面幾何」逐值快照（v0.54 收尾版，凍結檔 F5 機械段主條）。
 * 用法：node tests/tools/duel-rects.mjs <out.json> [--port=9558] [--root=<靜態根>] [--seed=7] [--duels=16]
 *
 * 要守的是什麼（使用者 2026-09-11 裁甲、凍結檔 §2.1 修訂七）：
 *   黑邊 letterbox 整支移出本卷，**tier 3 的版面必須與 v0.53 一模一樣**——
 *   1400ms 與 CINEMA 仰視機位可以動鏡頭，但一個 DOM 元素都不准位移、縮放或被裁掉。
 *
 * 為什麼要量 rect 而不是量「黑條蓋到誰」（五輪的教訓，別再走回去）：
 *   R2–R5 四個版本都在「黑條蓋不蓋得到某一組元素」上打轉，而那組元素是**自己列的分母**：
 *   三版量在假版面上、四版漏掉當下真正有字的 #duelMove／#beatLamps、五版量的是 8vh 舊黑條
 *   （真正的黑邊已經變成縮放後 #duel 的邊界＋它自己的 overflow:hidden），一行削掉 19.2% 字幕的
 *   突變照樣全綠。列舉「誰被蓋到」永遠會漏掉下一個元素。
 *   ★改成相等性：把 tier 3 那一拍 **document.body 底下所有可見子孫**的 rect 與 v0.53 基準樹逐值比對★
 *   （r6 HIGH-1 之前掃的是 #duel 的子孫；蓋板型黑邊是 <body> 的直接子節點，那樣掃不到，已改根）。
 *
 *   ★這支量具守得住什麼、守不住什麼（別再寫成「任何手段都抓得到」）★
 *     守得住：**以靜態宣告表達的 DOM 幾何變化**——padding、absolute 挪位、transform: scale、
 *       box-shadow 外框、overflow 變更，以及**多出來／少掉一個可見元素**（含 #duel 之外的蓋板）。
 *     守不住：① **以動畫表達的位移**——讀 rect 前會定格（無限迴圈讀相位 0、有限長度讀終態），
 *       所以「用 keyframes 把畫面縮到 0.8」這種寫法量到的是未縮放的那一格（r6 §2.3 的 A／B 案實測綠）。
 *       ② 顏色、透明度、z-index 造成的**遮擋**——rect 相同但畫面被蓋住，這支量不到。
 *     ⇒ 它是「DOM 幾何與 v0.53 相同」的斷言，不是「畫面與 v0.53 相同」的斷言。
 *
 * 取樣怎麼對齊兩棵樹（相等性斷言的活性證據，02 §6.1 第 1 條）：
 *   錨點＝真實對局裡 `ys:fx-trait` 且 trId 是三尊大招（eliteBlind／wardGuardAll／hauntAnswer）那一刻，
 *   從錨點起算 **+200／+400／+600ms** 各掃一次。三個時點都落在 v0.53 的 900ms 招式視窗內，
 *   也落在 v0.54 的 1400ms 內 ⇒ 兩棵樹在這三點的 DOM 內容相同（下一筆事件都還沒派）。
 *   ★為什麼不取 +800★（實測踩過）：`#actorCard`（出手卡）在錨點後 `PW_FX.ACTOR_CARD_MS=700` 被
 *   `setTimeout` 收掉，+800 這個點只離那個計時器 100ms——機器一忙，收卡的 timeout 晚幾十毫秒，
 *   掃到的元素集合就多／少一組（出手卡＋它的兩個子節點）。實測收尾版 3 個錨點裡剛好有 1 個踩中，
 *   另外 2 個與基準逐值相同 ⇒ 是**計時器邊界的抖動**，不是版面差異。三個時點全部退到 700 之前
 *   （最近的 +600 也留 100ms 餘裕），出手卡在兩棵樹的每一個樣本裡都在場，元素集合因此是決定性的。
 *   錨點之前的事件在兩棵樹裡相對時序也相同（同拍的普通招兩邊都是 900ms），
 *   所以連跳字這種「出生時間相對錨點固定」的動畫元素也對得上。
 *   活性：samples 數必須 >0 且每個樣本掃到的可見元素數 >0，否則「逐值相同」是兩邊一起空。
 *   讀 rect 的那一瞬間把正在跑的動畫定格（`document.getAnimations()`：有限的 finish、無限的 pause 歸零，
 *   兩棵樹對稱），否則量到的是動畫相位不是版面。歸因與「這不會掩蓋 transform:scale 那類靜態宣告」
 *   的理由寫在 __rectScan 上方。
 *
 * 直式（390×844）：#rotateHint 是 position:fixed;inset:0 的蓋板，會讓 drive 點不到按鈕。
 *   **兩棵樹同樣注入** `#rotateHint{display:none!important}`（對稱注入，同 trace-eq --beats 的做法）
 *   讓對決真的演得起來——rotateHint 是 fixed 蓋板，不參與 #duel 的版面計算，藏掉它不改變被測幾何。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function loadChromium() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright').chromium; } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（tools/anyCreature）');
}

/** 三尊大招的 trId。★這一組是錨點，不是判準★——基準樹（v0.53）沒有 tier 欄位，
 *  所以兩邊只能靠 trId 對齊。在新版樹上另外驗「TRAITS 裡 tier===3 的正好是這三支」（assertTier3Ids）。 */
export const TIER3_TRAIT_IDS = ['eliteBlind', 'wardGuardAll', 'hauntAnswer'];

/** 掃描腳本：錨點監聽 + 可見子孫 rect 快照。注入成 addInitScript，兩棵樹同一份。 */
const SCANNER = (ids, sampleMs) => `(() => {
  const IDS = ${JSON.stringify(ids)}, MS = ${JSON.stringify(sampleMs)};
  window.__rects = [];
  let anchorN = 0;
  /* 可見＝display 非 none、visibility 非 hidden、opacity >0.01、且 rect 面積 >0。
     白名單一個都沒有：容器本身也要逐值相同（五版就是靠容器 #duel 自己縮放的）。 */
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.01) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  /* 位置鍵：從 document.body 往下的 childIndex 鏈。用它配對兩棵樹的同一個元素，
     不用 id／class（同一層可能有多個同 class 的欄位，id 也不見得有）。 */
  const keyOf = (el) => {
    const parts = [];
    let n = el;
    while (n && n !== document.body && n.parentNode) { parts.unshift([...n.parentNode.children].indexOf(n)); n = n.parentNode; }
    return parts.join('/');
  };
  const rd = (v) => Math.round(v * 10) / 10;
  /* ★掃描前把「正在跑的動畫」定格★（兩棵樹對稱，同 trace-eq --beats 的注入紀律）。
     為什麼非做不可：rect 若在動畫中途取樣，量到的是「取樣那一瞬間的相位」而不是版面。
     實測有兩個來源，都在 tier 3 那一拍的取樣窗內活著：
       ① CSS 動畫：#beatLamps i.cur 的 lampPulse（.9s infinite alternate，index.html:409-410）。
       ② Web Animations：招式字幕 #duelMove 由 pwRise() 用 el.animate() 播進場
          （translateY(7px) scale(.96) → none，index.html:5120-5126）——**CSS 的 animation:none 關不掉它**。
     沒定格之前，基準樹自己跟自己跑兩次就會紅：第一版只壓 CSS（animation:none;transition:none），
     拍燈那一個元素乾淨了，#duelMove／.mvline／.mvdesc 仍差 0.1–2.2px（同一個中心、寬度 ×0.9958
     ＝進場 scale 還沒跑完）。歸因寫在這裡，處置才對症（02 §6.2：先定位才准處置）。
     ★做法★：document.getAnimations()——有限長度的 finish()（跳到終態），無限循環的 pause() 並把
     currentTime 歸零（固定相位），量完再 play() 放它回去跑。
     ★不會掩蓋要抓的東西★：「#duel.lbox{transform:scale(.80)}」／box-shadow／padding／overflow
     都是靜態宣告，不是動畫，定格之後照樣出現在 rect 上（五版實測仍紅，見報告 F5）。 */
  window.__rectScan = (tag, trId, n) => {
    const duel = document.getElementById('duel');
    if (!duel) return;
    const resume = [];
    try {
      for (const a of document.getAnimations()) {
        try {
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; resume.push(a); }
          else a.finish();
        } catch (e) { /* 個別動畫定格失敗不影響其他的 */ }
      }
    } catch (e) { /* 舊瀏覽器沒有 getAnimations */ }
    void document.body.offsetHeight; // 強制 reflow，讓定格在讀 rect 之前生效
    const els = [];
    const push = (el) => { const r = el.getBoundingClientRect(); els.push({
      k: keyOf(el), tag: el.tagName.toLowerCase(), id: el.id || '', cls: String(el.className || '').slice(0, 40),
      x: rd(r.left), y: rd(r.top), w: rd(r.width), h: rd(r.height),
      t: (el.textContent || '').trim().slice(0, 12) }); };
    /* ★掃描根是 document.body，不是 #duel★（r6 HIGH-1 加嚴）：
       二版 5a1220e 的黑條是 <body> 的直接子節點、跟 #duel 是兄弟（00706e0:index.html:596），
       只掃 #duel 的子孫的話，那種「蓋板型」黑邊一格 rect 都不會動 ⇒ 整組逃得過。
       改成掃 body 的全部可見子孫之後，蓋板自己就是新出現的元素 ⇒ 紅。 */
    const root = document.body;
    push(root);
    root.querySelectorAll('*').forEach((el) => { if (vis(el)) push(el); });
    const cs = getComputedStyle(duel);
    window.__rects.push({ anchor: n, trId, tag, n: els.length,
      duelCls: duel.className, tf: cs.transform, shadow: cs.boxShadow, ovf: cs.overflow,
      scrollH: duel.scrollHeight, clientH: duel.clientHeight, els });
    for (const a of resume) { try { a.play(); } catch (e) {} } // 無限循環的放回去繼續跑
  };
  document.addEventListener('ys:fx-trait', (e) => {
    const d = e.detail || {};
    if (!IDS.includes(d.trId)) return;
    const n = ++anchorN;
    MS.forEach((ms) => setTimeout(() => { try { window.__rectScan('anchor+' + ms, d.trId, n); } catch (err) { /* 收場後元素可能已清 */ } }, ms));
  });
})()`;

/** 在一棵樹（由 url 指向的 http.server）上跑一局，回傳 tier 3 錨點的 rect 快照。 */
export async function collectRects(browser, url, { w, h, duels = 16, sampleMs = [200, 400, 600], timeoutMs = 720000 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ` + String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}x${h} console: ` + m.text()); });
  await page.addInitScript(SCANNER(TIER3_TRAIT_IDS, sampleMs));
  /* 直式的蓋板：兩棵樹同樣注入（對稱），它是 fixed 蓋板不進 #duel 的版面計算 */
  if (h > w) await page.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{ const s=document.createElement('style'); s.textContent='#rotateHint{display:none!important}'; document.head.appendChild(s); });`);
  /* 基準樹每一拍都是 900ms，一局打到第 10 場之後才出得了三尊；drive 預設 5 分鐘會在第三個錨點之前就到期
     （實測橫式只拿到 2 個錨點）。判準要求 ≥3 錨點，所以把上限拉到 12 分鐘——
     **這是讓樣本量達到判準要求，不是放寬判準**（≥3 錨點那一條沒動）。 */
  await drive(page, url, { duels, timeoutMs });
  const got = await page.evaluate(() => ({ rects: window.__rects || [], tiers: (window.__ysFxCount || {}).tiers || null,
    hasTierApi: !!(window.__yaoshi && window.__yaoshi.pwBeatTier) }));
  await ctx.close();
  return { ...got, errors };
}

/** 新版樹專用：TRAITS 裡 tier===3 的那組，必須正好是 TIER3_TRAIT_IDS（錨點不得與實作分岔）。 */
export async function assertTier3Ids(page) {
  const got = await page.evaluate(() => Object.values(window.__yaoshi.TRAITS).filter((t) => (t.tier | 0) === 3).map((t) => t.id).sort());
  const want = [...TIER3_TRAIT_IDS].sort();
  if (got.join(',') !== want.join(',')) throw new Error(`TIER3_TRAIT_IDS 與頁面 TRAITS 分岔：頁面 ${got.join(',')} ≠ 治具 ${want.join(',')}`);
  return got;
}

/**
 * 兩份快照逐值比對。回傳 { same, checked, elsChecked, matchedAnchors, unmatched, diffs }。
 * 配對規則：同 anchor 序號 + 同 tag（anchor+200/400/600，＝ collectRects 的預設 sampleMs）。
 * trId 不同就直接紅（對錯了東西）。
 *
 * ★兩邊錨點數不一定一樣★：新版每一拍比較短，同樣 18 場可能多跑到一個 tier 3 拍；基準樹慢，
 * 有時會先到 drive 的時間上限。**只比對得起來的那些**，比不起來的記進 unmatched（不當差異，
 * 因為「基準沒有這個樣本」不是版面差異）——**活性改由「配對成功的錨點數 ≥3」把關**（見 lbox-probe 的 L10），
 * 這樣既不會因為多跑到一場而假紅，也不會因為兩邊都空而假綠。
 */
export function compareRects(a, b, { maxDiff = 40 } = {}) {
  const diffs = [], unmatched = [];
  const key = (s) => `${s.anchor}|${s.tag}`;
  const mapB = new Map(b.map((s) => [key(s), s]));
  const matched = new Set();
  let checked = 0, elsChecked = 0;
  for (const sa of a) {
    const sb = mapB.get(key(sa));
    if (!sb) { unmatched.push(key(sa)); continue; }
    checked++; matched.add(sa.anchor);
    if (sa.trId !== sb.trId) { diffs.push({ where: key(sa), why: `trId 不同：${sa.trId} vs ${sb.trId}` }); continue; }
    /* #duel 自己的狀態也逐值比（加嚴，自行記錄）：五版是靠 duelCls 多一個 lbox ＋ box-shadow 外框
       ＋ transform:scale 做出黑邊的，這五個欄位任一不同都必須紅。
       ★這五個欄位只量 #duel 本身★——#duel 之外的蓋板由「掃描根＝document.body」那一側擋。 */
    for (const f of ['n', 'duelCls', 'tf', 'shadow', 'ovf', 'scrollH', 'clientH']) {
      /* n ＝這個樣本的可見元素總數（掃描根是 document.body，所以不是「#duel 底下幾個」）；
         其餘五個欄位量的是 #duel 自己。標籤分開寫，免得讀 diff 的人把 n 看成 #duel 的子孫數。 */
      const label = f === 'n' ? '樣本.可見元素數' : `#duel.${f}`;
      if (String(sa[f]) !== String(sb[f])) diffs.push({ where: key(sa), why: `${label}：新 ${sa[f]} ≠ 基準 ${sb[f]}` });
    }
    const mb = new Map(sb.els.map((e) => [e.k, e]));
    for (const ea of sa.els) {
      const eb = mb.get(ea.k);
      if (!eb) { diffs.push({ where: key(sa), el: ea.k, why: `基準沒有這個元素（${ea.tag}#${ea.id}.${ea.cls}）` }); continue; }
      elsChecked++;
      for (const f of ['x', 'y', 'w', 'h']) {
        if (ea[f] !== eb[f]) diffs.push({ where: key(sa), el: ea.k, id: ea.id || ea.cls || ea.tag, txt: ea.t,
          why: `${f}：新 ${ea[f]} ≠ 基準 ${eb[f]}` });
      }
      if (diffs.length > maxDiff) return { same: false, checked, elsChecked, matchedAnchors: matched.size, unmatched, diffs: diffs.slice(0, maxDiff), truncated: true };
    }
    for (const eb of sb.els) if (!sa.els.some((e) => e.k === eb.k)) diffs.push({ where: key(sa), el: eb.k, why: `新版少了這個元素（${eb.tag}#${eb.id}）` });
  }
  return { same: diffs.length === 0, checked, elsChecked, matchedAnchors: matched.size, unmatched, diffs };
}

/* ── CLI ───────────────────────────────────────────────────────────────── */
/* 只有「直接用 node 跑這個檔」才進 CLI；被 import 時（lbox-probe、或 node -e）不得執行。
   不用 argv[1] 比對 import.meta.url——`node -e` 根本沒有 argv[1]。 */
const AS_CLI = !!process.argv[1] && process.argv[1].split('\\').join('/').endsWith('/tests/tools/duel-rects.mjs');
if (AS_CLI) {
  const argv = process.argv.slice(2);
  const pos = [], opt = {};
  const KNOWN = new Set(['port', 'root', 'seed', 'duels']);
  for (const a of argv) {
    const m = a.match(/^--([a-z0-9]+)=(.*)$/i);
    if (m) { if (!KNOWN.has(m[1])) throw new Error(`未知旗標 --${m[1]}（合法：${[...KNOWN].join('/')}）`); opt[m[1]] = m[2]; }
    else pos.push(a);
  }
  const out = pos[0] || path.join(ROOT, 'scratchpad', 'duel-rects.json');
  const port = Number(opt.port || 9558);
  const root = opt.root ? path.resolve(opt.root) : ROOT;
  const seed = opt.seed || '7';
  const duels = Number(opt.duels || 16);

  const srv = await serve(root, port);
  const chromium = loadChromium();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const url = `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`;
  let res;
  try {
    const land = await collectRects(browser, url, { w: 844, h: 390, duels });
    const port2 = await collectRects(browser, url, { w: 390, h: 844, duels });
    res = { root, seed, duels, land, port: port2 };
  } finally {
    await browser.close();
    srv.kill();
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  const sum = (r) => `${r.rects.length} 樣本／${r.rects.reduce((a, s) => a + s.n, 0)} 元素／err ${r.errors.length}`;
  console.log(`duel-rects → ${out}\n  橫式 ${sum(res.land)}\n  直式 ${sum(res.port)}`);
}
