// L3 對比閘門的凍幀 A/B 治具（v0.55 招式可辨性卷，凍結檔 `2026-09-11-acceptance-fx-legibility.md` L3）。
//
// 用法：node tests/tools/fx-contrast.mjs <輸出目錄> [--only=trId,trId] [--tier=2] [--port=8845] [--dt=16.6667]
//                                        [--seed=7] [--bthr=<只給反向實驗的 bloom threshold 覆寫>]
//                                        [--nobloom]（治具頁 ?bloom=0，只給反證守衛用）
//                                        [--allow-nobloom]（★放行「根本沒有 bloom」的量測位置，summary 標紅★）
//
// 量什麼：**徽記／拖尾／印記在暗紅桌面＋紫夜空上到底看不看得見**。
// 為什麼不用色票算 ΔE：加色混合＋bloom 之後畫面上的顏色不等於色票值——那是重建的模型，不是真實路徑
// （ART_BIBLE §10.4）。所以一律凍幀拍 A/B 差圖。
//
// 作法（沿用 tests/tools/outline-probe.mjs `width` 模式的手法：**同一次載入、同一格畫面**）：
//   1. 走 traitfx-preview.html 逐幀步進到 BEAT[tier].travel 的中點 → 時間軸自然就凍住了（治具不用 rAF）；
//   2. render() 後截圖 A（徽記可見）；
//   3. `__tfx.fxVis(false)` 只把 emblem/trail/mark 切成 invisible，**其餘一切不動**，同一格 render() 再截圖 B；
//   4. 還原 visible，把兩張圖交給 tests/tools/fx-contrast-metrics.py 算面積與 CIE76 ΔE 中位數。
//
// 判定（門檻在 metrics 那一支，這裡只負責取樣）：特效像素 ≥ 全畫面 0.8% 且 ΔE 中位 ≥ 28。
// 活性：`fxVis` 回傳被切到的物件數，**0 就直接判紅**——那代表這一招根本沒有新語彙，
//       兩張圖會逐位元組相同、差圖面積 0，而「0 < 0.8%」看起來像單純沒過，實際是量錯了對象。
//
// ★量測位置（`02 §6.1` 第 5 條，報告要照抄）★：治具頁的場景＝js/scene-env.js 的真實牌桌
// （TABLE_COLOR 0x6b3418、ENV.SKY_STOPS 夜紫天）＋對決機位。**視口 844×390 @2x**（＝使用者手機的
// CSS 尺寸與 DPR，同 blindread-sheet.mjs 的理由：治具視口 ≠ 玩家視口就會量錯人物佔比）、
// **bloom 五個參數逐一對齊產品 js/renderer.js 的 `BLOOM`**（本檔每次跑都解析那個檔，
// 與治具頁回報的 **live** bloomCfg 逐鍵比對，不一致當場 throw）、**seed 記進 shots.json**。
// ★覆審 r2 N4★：守衛不再只在「有 bloom」時才生效——`bloomCfg().on !== true`（`?bloom=0`、
// SwiftShader／軟體 GL）一律 throw，要在那種環境跑就明確帶 `--allow-nobloom`，
// 屆時 `shots.json`／metrics summary 都會帶 `nobloom:true` 紅字，那一跑不得當成 L3 通過。
// 另外 `--bthr=` 只跳過 **threshold 這一鍵**的比對，其餘四鍵照比（舊版一帶上就五鍵全跳過）。
//
// ★「治具 bloom 門檻低＝保守」這句宣稱已刪（覆審 r1 H4）★：它沒有實測支持，而且方向是反的。
// 雙向實測（覆審 r1 §3 H4，四支示範招、只改 threshold 0.5→0.7）：
//   wardImmuneLost 2.2795% → 1.5051%（−34%）／eliteSelfCut 1.189% → 1.189%
//   biteGamble 2.4174% → 2.4126%／hauntLost 2.6241% → 2.6241%
// bloom 門檻低＝徽記的光暈擴散到更多像素 ⇒ 差圖**面積被高估**，對 ΔE 也許保守，對面積不是。
//
// ★L3 canary 的程序（凍結檔 L3；覆審 r3 N12 之後改打共同入口）★
//   把 js/trait-fx/vocab.js 的 `ICON._resolve(kind, tableName, dflt)` 整支換成 `_resolve() { return 0.02; }`，
//   跑同一組參數，用到徽記的招**必須全部判紅**（面積跌破 0.8%）。跑完 `git checkout -- js/trait-fx/vocab.js`。
//   ★為什麼是 `_resolve` 而不是 `sizeOf()`（覆審 r3 N12）★：`markSizeOf`（印記）與有覆寫的
//   `flatSizeOf`（貼桌陣）都不經過 `sizeOf`，canary 打 `sizeOf()` 對 `ICON.markByKind`（seal 0.20）與
//   `ICON.flatByKind`（hat 0.20）**完全打不到**——主視覺是印記或貼桌陣的招在 canary 下照樣綠。
//   `_resolve` 是三張表的共同出口，一行蓋三表；`tests/fxvocab.test.mjs` 有一條測試在釘這件事。
//
// ★徽記尺寸鎖（覆審 r3 N11）★：本檔每一套都讀回 `__tfx.stats()` 的 `sizeViolations`／`iconMade`／
//   `iconLocked`，違規 >0 或 `iconLocked !== iconMade` 一律判 FAIL 並寫進 shots.json——
//   繞過 ICON 表直接寫 `mesh.scale` 在執行期會被 throw，但 tween 的 try/catch 會吃掉它，只能靠記帳看見。
//
// 本批量的仍是**治具棚**（bloom 與視口已對齊產品），**不是 duel-drive 的真實對決場景**——
// 凍結檔 L3 要求的那一格（走 duel-drive、演該招、派 ys:hitstop）是批 1–3 的正式 L3。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';
import { casesFromIndex } from './traitfx-drive.mjs';
import { beatOf } from '../../js/trait-fx/vocab.js';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const FIRE_AT = 12;
/* 視口＝使用者手機那一格（CSS 844×390、DPR 2），同 tests/tools/blindread-sheet.mjs。
   ★為什麼不留 720×405（覆審 r1 H3）★：L4-pre 第 1 輪的教訓就是「治具視口 ≠ 玩家視口」——
   duel-figures 的人偶是**固定 CSS 像素高**（FIG.pixelH 176），視口高一倍佔比就腰斬，
   於是同一招在治具上佔的畫面比例和玩家看到的不是同一件事。面積門檻是「佔全畫面的百分比」，
   量錯視口就等於量錯門檻。★改視口會改 area_pct 的絕對值，舊值不可跨視口比對★。 */
const VIEW = { width: 844, height: 390, deviceScaleFactor: 2 };
const DEFAULT_SEED = 7; // 治具頁 ?seed= 的預設；實際值由頁面回報（__tfx.seed），不靠這裡宣稱

/** 產品對決場景真正用的 bloom 參數＝js/renderer.js 的 `BLOOM` 字面值（唯一來源，本檔不另抄一份）。 */
function productBloom(root) {
  const src = fs.readFileSync(path.join(root, 'js/renderer.js'), 'utf8');
  const m = src.match(/const BLOOM = \{([^}]*)\}/);
  if (!m) throw new Error('js/renderer.js 裡找不到 `const BLOOM = {...}`：量測位置的來源沒了，不准往下跑');
  const out = {};
  for (const kv of m[1].split(',')) {
    const p = kv.split(':');
    if (p.length !== 2) continue;
    out[p[0].trim()] = parseFloat(p[1]);
  }
  for (const k of ['strength', 'threshold', 'knee', 'radius', 'scale']) {
    if (!Number.isFinite(out[k])) throw new Error(`js/renderer.js 的 BLOOM 少了 ${k}`);
  }
  return out;
}

function parseArgs(argv) {
  const pos = []; const opt = {};
  // 旗標名允許帶 `-`（--allow-nobloom），鍵一律去掉 `-`（→ allownobloom）
  for (const a of argv) { const m = a.match(/^--([a-z0-9-]+)(?:=(.*))?$/i); if (m) opt[m[1].replace(/-/g, '')] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function shoot(browser, base, c, opt, outDir) {
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier);
  const dt = parseFloat(opt.dt || (1000 / 60));
  const beat = beatOf(tier, ms);
  // 凍幀點＝travel 中點（凍結檔 L3 第 1 步寫死，不得逐招調）
  const atMs = (beat.travel[0] + beat.travel[1]) / 2;
  const atFrame = Math.max(1, Math.round(atMs / dt));

  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const seed = parseInt(opt.seed || String(DEFAULT_SEED), 10);
  // bloom 覆寫鉤：只給「證明 bloomCfg() 真的讀 live 值」的反向實驗用；帶了就跳過與產品的比對。
  const bOver = opt.bthr === undefined ? '' : `&bthr=${opt.bthr}`;
  const noB = opt.nobloom ? '&bloom=0' : ''; // 只給「反證守衛真的會擋」用
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${dt}&seed=${seed}${bOver}${noB}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 });
  await page.evaluate(() => window.__tfx.ready);
  // ★HUD 一定要藏★：治具頁左上角那行 debug 文字寫著招名與 ab（'eliteSelfCut xianjixl ready …'），
  //   不藏就等於在盲讀材料上直接印答案（批 0 第一版真的印出去了，a11.png 六格全帶）。
  await page.addStyleTag({ content: '#hud{display:none!important}' });
  const bloomCfg = await page.evaluate(() => window.__tfx.bloomCfg());
  const pageSeed = await page.evaluate(() => window.__tfx.seed);
  /* ★量測位置的守衛（覆審 r1 H3／H4）★：治具頁回報的 **live** bloom 必須與產品 js/renderer.js
     的 BLOOM 逐鍵相同。差一個數字，L3 的綠燈就與玩家看到的畫面脫鉤——L4-pre 第 1 輪同一個坑。
     只有明確帶 --bthr=（反向實驗）時才放行不一致。 */
  /* ★覆審 r2 N4：守衛擋真貨、放行替身★
     舊版的條件是 `if (bloomCfg.on && …)`——「參數差一個數字」會被擋，「整條 bloom 不在」
     （`?bloom=0`、SwiftShader／軟體 GL 的 SOFT_GL）反而**靜默放行**，照樣印 `pass 4`。
     那是同一個坑的反面：量測位置根本不是玩家的畫面，綠燈與待驗行為脫鉤。
     現在 `bloomCfg.on !== true` 一律 throw，除非明確帶 `--allow-nobloom`（那時 summary 標紅）。 */
  if (bloomCfg.on !== true) {
    if (!opt.allownobloom) {
      throw new Error('量測位置沒有 bloom（治具頁回報 bloomCfg().on=false：?bloom=0 或軟體 GL 的 SOFT_GL）。'
        + 'L3 的門檻是「玩家畫面上的佔比」，沒有 bloom 的畫面不是那個位置——'
        + '要在這種環境下跑就明確加 --allow-nobloom（summary 會標 nobloom:true，結果不得當成 L3 通過）');
    }
    console.log('★★ --allow-nobloom：這一跑沒有 bloom，量的不是產品的量測位置，不得當成 L3 通過 ★★');
  } else {
    /* `--bthr=` 是 threshold 的反向實驗鉤：**只跳過 threshold 這一鍵**，其餘四鍵照比
       （舊版一帶上就五鍵全跳過＝反向實驗順手把整面守衛也拆了）。 */
    const skip = opt.bthr === undefined ? [] : ['threshold'];
    const bad = Object.keys(opt.product).filter((k) => !skip.includes(k) && bloomCfg[k] !== opt.product[k]);
    if (bad.length) {
      throw new Error(`治具 bloom 與產品 js/renderer.js 的 BLOOM 分岔：${bad.map((k) => `${k} 治具 ${bloomCfg[k]} vs 產品 ${opt.product[k]}`).join('／')}`);
    }
  }
  await page.evaluate((n) => window.__tfx.stepA(n), FIRE_AT + 2);
  await page.evaluate(() => window.__tfx.resetB());
  await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  await page.evaluate((n) => window.__tfx.stepB(n), atFrame);
  // ── 這一格之後不再步進：時間軸凍住，A 與 B 之間只有 visible 一個變數 ──
  await page.evaluate(() => window.__tfx.render());
  const fileA = path.join(outDir, `${c.trait}-A.png`);
  await page.screenshot({ path: fileA });
  const hidden = await page.evaluate(() => window.__tfx.fxVis(false));
  await page.evaluate(() => window.__tfx.render());
  const fileB = path.join(outDir, `${c.trait}-B.png`);
  await page.screenshot({ path: fileB });
  await page.evaluate(() => window.__tfx.fxVis(true)); // 還原（同一頁不再用，但不留副作用）
  const sig = await page.evaluate(() => window.__tfx.sig());
  // M3：program 數改成實測（凍結檔 L8「材質模板固定 3 支、全部預熱」與 Q10「program 2→3」的對照）
  const programs = await page.evaluate(() => window.__tfx.programs());
  const programList = await page.evaluate(() => window.__tfx.programList());
  const matPrograms = await page.evaluate(() => window.__tfx.matPrograms());
  // N11：徽記尺寸鎖的執行期記帳（violations>0 或 locked!==made ⇒ 這一套判 FAIL）
  const st = await page.evaluate(() => window.__tfx.stats());
  const sizeGuard = { violations: st ? (st.sizeViolations | 0) : -1, made: st ? (st.iconMade | 0) : -1, locked: st ? (st.iconLocked | 0) : -1,
    audits: st ? (st.sizeAudits | 0) : -1, msg: st ? (st.sizeViolationMsg || null) : null, worldRange: st ? (st.sizeWorldRange || null) : null,
    tweenErrors: st ? (st.tweenErrors | 0) : -1, tweenErrorMsg: st ? (st.tweenErrorMsg || null) : null };
  /* 三態（r4 MEDIUM-2）：L3 每一套都是「用到徽記的招」，所以 made===0 在這支治具裡**就是 fail**
     ——凍幀量的就是徽記，沒有徽記代表這一格量錯了對象（與 hidden===0 同一個道理）。 */
  const sizeState = !st ? 'fail' : sizeGuard.made === 0 ? 'fail'
    : (sizeGuard.violations === 0 && sizeGuard.locked === sizeGuard.made && sizeGuard.audits > 0 && sizeGuard.tweenErrors === 0) ? 'ok' : 'fail';
  const sizeOK = sizeState === 'ok';
  await ctx.close();
  return { trait: c.trait, ab: c.ab, tier, ms, atMs, atFrame, seed: pageSeed, handled: fired.handled, hidden, fileA, fileB, bloomCfg, programs, programList, matPrograms, sizeGuard, sizeState, sizeOK, errors, meshes: sig ? sig.meshes : null };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'fx-contrast');
  const port = parseInt(opt.port || '8845', 10);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assertPageConsts(pageConstsFromHtml(html));
  let cases = casesFromIndex(html);
  if (opt.only) { const s = new Set(String(opt.only).split(',')); cases = cases.filter((c) => s.has(c.trait)); }
  if (!cases.length) throw new Error('--only 篩掉了全部的招');
  fs.mkdirSync(outDir, { recursive: true });
  opt.product = productBloom(ROOT); // 量測位置的權威：產品 js/renderer.js 的 BLOOM
  console.log(`量測位置：視口 ${VIEW.width}×${VIEW.height}@${VIEW.deviceScaleFactor}x · seed ${opt.seed || DEFAULT_SEED} · 產品 bloom ${JSON.stringify(opt.product)}${opt.bthr === undefined ? '' : ` · ★--bthr=${opt.bthr} 覆寫（只跳過 threshold 這一鍵的比對，其餘四鍵照比）★`}${opt.allownobloom ? ' · ★--allow-nobloom★' : ''}`);
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const out = [];
  try {
    for (const c of cases) {
      const r = await shoot(browser, `http://127.0.0.1:${port}`, c, opt, outDir);
      out.push(r);
      console.log(`${r.hidden > 0 && r.handled && r.sizeOK && !r.errors.length ? ' ok ' : 'FAIL'} ${c.trait.padEnd(16)} t${r.tier} 凍在 ${r.atMs}ms(第 ${r.atFrame} 幀) 切掉 ${r.hidden} 個特效物件 handled=${r.handled} size=${r.sizeState}(${r.sizeGuard.violations}v/${r.sizeGuard.locked}of${r.sizeGuard.made}/${r.sizeGuard.audits}a) err=${r.errors.length}`);
      if (r.sizeGuard.msg) console.log('   ! ' + String(r.sizeGuard.msg).slice(0, 220));
      if (r.sizeGuard.tweenErrorMsg) console.log('   ! tween 安靜死掉：' + String(r.sizeGuard.tweenErrorMsg).slice(0, 220));
      r.errors.slice(0, 2).forEach((e) => console.log('   ! ' + e.slice(0, 180)));
    }
  } finally { await browser.close(); srv.kill(); }
  const meta = path.join(outDir, 'shots.json');
  // N4：沒有 bloom 的那一跑要在 summary 上留紅字，不能只在 stdout 一閃而過
  const nobloom = out.some((r) => !r.bloomCfg || r.bloomCfg.on !== true);
  // N11：整跑的尺寸鎖彙總（made===0 ⇒ 這一跑沒量到，不得當成通過）
  const sizeGuard = out.reduce((a, r) => ({ violations: a.violations + Math.max(0, r.sizeGuard.violations), made: a.made + Math.max(0, r.sizeGuard.made), locked: a.locked + Math.max(0, r.sizeGuard.locked), audits: a.audits + Math.max(0, r.sizeGuard.audits) }), { violations: 0, made: 0, locked: 0, audits: 0 });
  sizeGuard.measured = sizeGuard.made > 0;
  sizeGuard.failed = out.filter((r) => r.sizeState !== 'ok').map((r) => r.trait);
  fs.writeFileSync(meta, JSON.stringify({ view: VIEW, seed: out.length ? out[0].seed : null, productBloom: opt.product, bthrOverride: opt.bthr === undefined ? null : parseFloat(opt.bthr), nobloom, sizeGuard, cases: out }, null, 1));
  console.log(`徽記世界尺寸斷言：違規 ${sizeGuard.violations} 次／鎖上 ${sizeGuard.locked} of 產出 ${sizeGuard.made}／稽核 ${sizeGuard.audits} 次`
    + `${sizeGuard.measured ? '' : '　★未量到★'}${sizeGuard.failed.length ? '　fail：' + sizeGuard.failed.join(' ') : ''}`);
  if (sizeGuard.failed.length) { console.log('★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★'); process.exitCode = 1; }
  console.log(`\n${out.length} 套 · ${meta}${nobloom ? '\n★★ nobloom:true —— 這份量測沒有 bloom，不是產品的量測位置，不得當成 L3 通過 ★★' : ''}`);
  console.log(`接著跑：python tests/tools/fx-contrast-metrics.py ${path.relative(ROOT, outDir)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
