// 卷 C3（2026-09-05）：27 套招式演出的機械驗收（T-1／T-2／T-3／T-4③／T-7／T-8）＋ 三格截圖。
// 用法：node tests/tools/traitfx-drive.mjs <out.json> [--only=trId,trId] [--reduced] [--throw] [--cancel=15] [--count=8] [--dt=50]
//                                            [--shots=<png 目錄>] [--port=8841] [--tier=2] [--nobloom] [--block=<ab>]
//                                            [--sigdump=<sig 序列檔>] [--root=<靜態根目錄>]
// --root  http.server 的根目錄與 index.html 的來源（預設＝repo 根）。照 duel-drive.mjs:5 的寫法補的
//         （覆審 r2 N3）：--sigdump 要拿來當「js/trait-fx* 有沒有被動到」的等價證據，就得能對
//         **基準樹**跑同一支治具（基準 SHA 的治具本身沒有 --sigdump，只能由本樹的治具去跑它的靜態檔）。
//         用法：git worktree add --detach <路徑> <基準SHA>（或 git archive 解出來），再 --root=<路徑>。
// v0.54 三級視覺分級（凍結檔 F2／F10）：
//   --tier=1  27 支專屬短版（260ms）。case 集合排除三尊（它們恆 tier 3）。
//   --tier=2  27 支完整版（900ms）＋三尊完整版：與 v0.53 的回歸對照。
//   --tier=3  三尊大招（1400ms）。
//   時長一律由 tests/tools/fx-consts.mjs 取（--ms 已移除），並與 index.html 的 PW_FX 逐鍵比對。
//   --block=<ab>  擋掉那一顆 GLB（T-4 ②）：擋到出招方→該套必須退回 fallback（handled=false）；擋到對面→照演、不炸
//   出招方名冊由 index.html 的 POOL 反查（唯一事實來源，不另抄一份）：trait → {ab|m, body, count, fac}
//   每套：pass A（不出招）錄 N 幀 → resetB → 第 FIRE_AT 幀出招 → pass B 逐幀比 Δ
//   判定（寫進 out.json 的 verdict）：
//     handled     3D 舞台接了（--throw／缺編舞時應為 false）
//     alive       出招後到演完之間任一幀 Δ>EPS 或 mesh>0 或 burst（活性）
//     restored    演完（active==0）之後所有幀 Δ<EPS、mesh==0、wrapped==0（歸零）
//     within      演完的幀 ≤ FIRE_AT + ceil(ms×2/16.67)+2（保險絲之內）
//     reducedOK   --reduced 時 Δ 全程 <EPS（骨骼／model 位移全免），mesh 或 burst 仍可有
//     msOK        頁面實際跑的 run.ms 等於 fx-consts 的 msOf(tier)（防「--tier=1 其實還在跑 900」）
//     rateOK      run.maxRate ≤1.0（tier 1 專用：短版必須原生塞進 260ms，不得靠加速硬擠）
//     actionsOK   非 flinch 的補間條數 ≥2（F10：防「只剩一個閃光」的偷懶短版）
//     fillOK      sig.horizon >= run.ms * 0.85（R1 覆審 M1：擋「演完之後乾等」——一版三尊的
//                 horizon 只有 929／1067／1013 對 run.ms 1400，最後三分之一畫面上沒東西在動，
//                 而 clean／onTime／within 全是上界，一條都擋不住）
// 依賴：tools/anyCreature/node_modules/playwright；自起 python http.server。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
/* R2 覆審 N8：worktree 裡沒有 tools/（那是主 repo 的目錄），硬寫一條路會直接 MODULE_NOT_FOUND。
   同 repo 的 duel-drive／lbox-probe／t3-shot／pace-ab 都有兩段候選路徑，這兩支補齊。 */
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const EPS = 1e-3;
const FIRE_AT = 12; // 第幾幀出招（前面幾幀讓 idle 站穩）
let DT_MS = 1000 / 60; // --dt=<ms> 覆寫（治具頁同步吃 &dt=）

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

/** 從 index.html 的 POOL 反查 27 個 trait 的出招方名冊 */
export function casesFromIndex(html) {
  const out = [];
  const re = /\{n:"([^"]+)",(?:m:"([a-z_]+)",)?f:"([a-z]+)",p:-?\d+,(?:ab:"([a-z_]+)",)?d:"[^"]*",unit:\{body:"([a-z]+)",count:(\d+),atk:\d+,hp:\d+,trait:"([A-Za-z0-9]+)"\}\}/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: m[1], ab: m[4] || m[2], fac: m[3], body: m[5], count: parseInt(m[6], 10), trait: m[7] });
  // 傳說三尊（2026-09-07 美術卷）：LEGENDS 的欄位順序與 POOL 不同（legend:true 夾在 p 與 m 之間），
  // 上面那條 regex 抓不到。它們的 GLB 名＝m（沒有 ab），三招也要走同一組機械驗收。
  // ★v0.54 修：請神 2.0（2026-09-07）在 d 與 unit 之間插了一整段 eff:{...hooks...}，舊 regex 從那天起
  //   一套都抓不到（跑起來只印一行「LEGENDS 反查到 0 套」的 warn，三尊靜默漏測近一個月）。
  //   改成不假設 d 與 unit 相鄰：從 legend:true 起，非貪婪吃到第一個 unit:{...}。★
  const reL = /\{n:"([^"]+)",f:"([a-z]+)",p:-?\d+,legend:true,m:"([a-z_]+)",[\s\S]*?unit:\{body:"([a-z]+)",count:(\d+),atk:\d+,hp:\d+,trait:"([A-Za-z0-9]+)"\}\}/g;
  while ((m = reL.exec(html))) out.push({ name: m[1], ab: m[3], fac: m[2], body: m[4], count: parseInt(m[5], 10), trait: m[6], legend: true });
  return out;
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function runCase(browser, base, c, opt) {
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier); // 唯一來源＝fx-consts.mjs（已與頁面 PW_FX 逐鍵比對過）
  const N = FIRE_AT + Math.ceil((ms * 2) / DT_MS) + 20; // 保險絲之後再多錄 20 幀看歸零
  const ctx = await browser.newContext({ viewport: { width: 720, height: 405 }, reducedMotion: opt.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${opt.count || c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${DT_MS}${opt.throw ? '&throw=1' : ''}${opt.nobloom ? '&bloom=0' : ''}`;
  if (opt.block) await page.route(`**/assets/creatures/${opt.block}.glb`, (route) => route.abort());
  await page.goto(url, { waitUntil: 'load' });
  // module script 有 top-level await（CDN 的 three ＋ 動態 import），load 之後才慢慢評估完
  try { await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 }); }
  catch (e) { throw new Error(`__tfx 沒出現：${errors.join(' | ').slice(0, 600)}`); }
  await page.evaluate(() => window.__tfx.ready);
  const nA = await page.evaluate((n) => window.__tfx.stepA(n), N);
  await page.evaluate(() => window.__tfx.resetB());
  const programs0 = await page.evaluate(() => window.__tfx.render());
  const progList0 = await page.evaluate(() => window.__tfx.programList());
  const pre = await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  const frames = pre.slice();
  const shots = [];
  // 出招後三格：**依這一 tier 的時長按比例換算幀**（v0.54）。以前寫死 8／22／36，
  // 那是 900ms 的 20%／45%／75%；tier 1 只有 260ms（≈16 幀），22／36 兩格會落在演完之後，
  // contact sheet 就會拍到三張空畫面——「看不出是哪一招」的假象來自截圖點，不是短版本身。
  const shotAt = [0.2, 0.45, 0.75].map((f) => Math.max(1, Math.round((ms * f) / DT_MS)));
  let stepped = 0;
  const cancelAt = opt.cancel ? parseInt(opt.cancel, 10) : -1;
  const plan = [];
  const marks = [...shotAt, ...(cancelAt > 0 ? [cancelAt] : [])].sort((a, b) => a - b);
  for (const m of marks) { if (m > stepped) { plan.push({ n: m - stepped, mark: m }); stepped = m; } }
  plan.push({ n: N - FIRE_AT - stepped, mark: null });
  for (const p of plan) {
    if (p.n > 0) frames.push(...await page.evaluate((n) => window.__tfx.stepB(n), p.n));
    if (p.mark !== null && shotAt.includes(p.mark) && opt.shots) {
      await page.evaluate(() => window.__tfx.render());
      const file = path.join(opt.shots, `${c.trait}-${p.mark}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
    if (p.mark === cancelAt) await page.evaluate(() => window.__tfx.cancel());
  }
  const programs1 = await page.evaluate(() => window.__tfx.render());
  const progList1 = await page.evaluate(() => window.__tfx.programList());
  const pool0 = progList0.slice();
  const newPrograms = progList1.filter((x) => { const i = pool0.indexOf(x); if (i >= 0) { pool0.splice(i, 1); return false; } return true; });
  const sig = await page.evaluate(() => window.__tfx.sig());
  const moves = await page.evaluate(() => window.__tfx.moves);
  const softGl = await page.evaluate(() => window.__tfx.softGl);
  const stats = await page.evaluate(() => window.__tfx.stats());
  await ctx.close();

  const after = frames.filter((f) => f.i >= FIRE_AT);
  const endIdx = after.findIndex((f) => f.active === 0);
  const endFrame = endIdx >= 0 ? after[endIdx].i : -1;
  const during = endIdx >= 0 ? after.slice(0, endIdx) : after;
  const tail = endIdx >= 0 ? after.slice(endIdx) : [];
  const maxD = Math.max(0, ...after.map((f) => (Number.isFinite(f.d) ? f.d : 0)));
  const alive = during.some((f) => f.d > EPS || f.mesh > 0 || f.burst);
  const restored = tail.length > 0 && tail.every((f) => f.d < EPS && f.mesh === 0 && f.wrapped === 0);
  const fuseFrames = Math.ceil((ms * 2) / DT_MS) + 2;
  const within = endFrame >= 0 && endFrame <= FIRE_AT + fuseFrames;
  // 覆審 HIGH-1：演出必須在 TRAIT_MS 內收工（index 只等這麼久），不是只在保險絲內
  const onTime = endFrame >= 0 && endFrame <= FIRE_AT + Math.ceil(ms / DT_MS) + 2;
  const reducedOK = !opt.reduced || after.every((f) => !(f.d > EPS));
  // 演出可讀性小卷 C-2：燈組在出招後 ≤9 幀（150ms）內位移 ≥0.5，收工後 ≤9 幀回到 <0.05
  const rigEarly = after.slice(0, 10).some((f) => f.rig >= 0.5);
  const rigBack = endIdx >= 0 ? after.slice(endIdx + 9).every((f) => f.rig < 0.05) : false;
  const focus = fired.handled ? rigEarly && rigBack : true;
  // 覆審第 3 輪 M-1：stats 要進判定——收工時還有沒演完的（cut）或撞保險絲（fused）都算紅
  const clean = !!stats && stats.cut === 0 && stats.fused === 0;
  // v0.54 F2／F10：run.ms 必須真的是這個 tier 的時長（防「--tier=1 其實還在跑 900」的假綠）、
  // 短版不得靠加速擠進去（maxRate ≤1.0）、時間軸至少兩條非 flinch 的動作。
  // sig 是 null（招式沒演成／沒收工）時三項一律不通過——不拿 null 當通過。
  const msOK = !!sig && sig.ms === ms && sig.tier === tier;
  const rateOK = !!sig && sig.maxRate <= 1.0;
  const acts = sig ? sig.acts : 0;
  const actionsOK = acts >= 2;
  // R1 M1：時間軸要真的填滿這個 tier 的預算，不能演完之後乾等（sig 為 null 一律不過）
  const fill = sig ? sig.horizon / ms : 0;
  const fillOK = !!sig && fill >= 0.85;
  /* ★M1（覆審 r1）：react 是不是量在出招方自己身上★
     js/trait-fx.js 的 evalPhases 註解②：「場上只有他一個人時就量他自己」（不這樣寫這條會恆假）。
     凍結檔 L2 的假綠清單要求「增益招的 react 量在**受益方**身上」，所以 solo 的那一格
     **不算在條文指定的情境下驗過**——它不是紅，是「這一格沒有證據」。
     治具的解法：對自益招（獻祭刀 eliteSelfCut 在 POOL 的 count=1）用 --count=2 再跑一次，
     場上有隊友時 react 就會量在受益方身上（reactSolo=false）。 */
  const reactClaim = sig && sig.phaseDetail ? sig.phaseDetail.find((c) => c.name === 'react') : null;
  const reactSolo = reactClaim ? !!reactClaim.solo : null;
  const verdict = { handled: fired.handled, hasMove: fired.hasMove, alive, restored, within, onTime, clean, reducedOK, focus, tier, ms, msOK, rateOK, acts, actionsOK, horizon: sig ? sig.horizon : null, fill: +fill.toFixed(3), fillOK, endFrame, maxD: +maxD.toFixed(4), errors: errors.length, programsGrew: programs1 - programs0, reactSolo };
  const blockActor = opt.block && String(opt.block) === c.ab;
  verdict.blocked = opt.block || null;
  if (opt.throw || blockActor) verdict.pass = !fired.handled && restored && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else if (cancelAt > 0) verdict.pass = fired.handled && endFrame >= 0 && endFrame <= FIRE_AT + cancelAt + 1 && restored && errors.length === 0;
  else if (opt.block) verdict.pass = fired.handled && alive && restored && within && errors.filter((e) => !/\.glb|Failed to load resource|ERR_FAILED/.test(e)).length === 0;
  else {
    // rateOK／actionsOK 是「短版原生合身」的門檻，只對 tier 1 納入 pass：
    // tier 2 的完整版在滿編錯開時本來就會被 run.rate 等比加速（v0.53 既有設計，rateMax 2.2）。
    /* ★R3 覆審 H-3★：一版把 rateOK 的適用範圍從「30 套」縮到「tier 1 的 27 套」，
       而被排除的那 3 套**恰好就是唯一 rate >1.0 的 3 套**（三尊在 tier 3 是 1.04–1.06）
       ——那是 02 §2.1 的「縮小實際跑到的範圍」＝移動及格線。現在改成：
       **tier 1 與 tier 3 都驗 `rate ≤1.0`**（凍結檔 F2 的字面），三尊的時間軸已原生壓進 1400ms；
       tier 2 的完整版在滿編錯開時本來就會被等比加速（v0.53 既有行為，rateMax 2.2，L4 已記錄）
       ⇒ tier 2 只把 maxRate 印出來當記錄，不進 pass。
       actionsOK（F10 的「≥2 個非 flinch 動作」）仍只約束 tier 1 的短版。 */
    const shortOK = (tier === 1 ? (rateOK && actionsOK) : true) && (tier === 3 ? rateOK : true);
    // fillOK 對每個 tier 都要求：短版填滿 260、完整版填滿 900、大招填滿 1400
    verdict.pass = fired.handled && alive && restored && within && onTime && clean && reducedOK && focus && msOK && shortOK && fillOK && errors.length === 0 && programs1 - programs0 === 0;
  }
  return { case: c, url, nA, fired, verdict, sig, stats, errors, shots, moves, softGl, newPrograms, frames: frames.map((f) => [f.i, f.d, f.mesh, f.burst ? 1 : 0, f.active, f.wrapped, f.rig]) };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const out = pos[0] || path.join(ROOT, 'scratchpad', 'traitfx-run.json');
  const port = parseInt(opt.port || '8841', 10);
  if (opt.dt) DT_MS = Math.max(1, Math.min(100, parseFloat(opt.dt) || DT_MS));
  const root = opt.root ? path.resolve(opt.root) : ROOT; // 覆審 r2 N3：靜態根目錄可指到基準樹
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error(`--root=${root} 底下沒有 index.html`);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tier = parseInt(opt.tier || '2', 10);
  // F1：治具與頁面的常數分岔就當場停（不是印個 warn 繼續跑）
  assertPageConsts(pageConstsFromHtml(html));
  let cases = casesFromIndex(html);
  const poolN = cases.filter((c) => !c.legend).length;
  // 反查不到就是 regex 又與資料表分岔了（2026-09-07 的 eff:{} 讓三尊靜默漏測近一個月）——
  // 這種「少測幾套」的失敗一定要紅，不能只印 warn。
  if (poolN !== 27) throw new Error(`POOL 反查到 ${poolN} 套（預期 27）：casesFromIndex 的 regex 與 index.html 分岔了`);
  if (cases.length - poolN !== 3) throw new Error(`LEGENDS 反查到 ${cases.length - poolN} 套（預期 3）：casesFromIndex 的 regex 與 index.html 分岔了`);
  // tier 1＝27 支專屬短版（三尊恆 tier 3，不在此列）；tier 3＝三尊大招；tier 2＝全部 30 套（回歸對照）
  if (!opt.only) {
    if (tier === 1) cases = cases.filter((c) => !c.legend);
    else if (tier === 3) cases = cases.filter((c) => c.legend);
  }
  if (opt.only) { const set = new Set(String(opt.only).split(',')); cases = cases.filter((c) => set.has(c.trait)); }
  if (opt.shots) fs.mkdirSync(opt.shots, { recursive: true });
  const srv = await serve(root, port);
  if (root !== ROOT) console.log(`★--root=${root}（靜態檔與 index.html 都從這裡取；治具程式仍是本樹的）★`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const c of cases) {
      const t0 = Date.now();
      const r = await runCase(browser, `http://127.0.0.1:${port}`, c, opt);
      r.ms = Date.now() - t0;
      results.push(r);
      const v = r.verdict;
      console.log(`${v.pass ? 'PASS' : 'FAIL'} ${c.trait.padEnd(16)} ${c.ab.padEnd(12)} t${v.tier}/${v.ms}ms msOK=${v.msOK} rate=${r.sig ? r.sig.maxRate : '-'} fill=${v.fill} acts=${v.acts} handled=${v.handled} alive=${v.alive} restored=${v.restored} onTime=${v.onTime} clean=${v.clean} focus=${v.focus} end=${v.endFrame} maxD=${v.maxD} err=${v.errors} prog+${v.programsGrew} sig=${r.sig ? r.sig.bones.length + 'b/' + r.sig.meshes.join('+') + (r.sig.target ? '/T' : '') : '-'} ${r.ms}ms`);
      if (r.errors.length) r.errors.slice(0, 3).forEach((e) => console.log('   ! ' + e.slice(0, 200)));
      if (r.newPrograms && r.newPrograms.length) r.newPrograms.forEach((e) => console.log('   +program ' + e));
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  // T-1：27 個 trId 與編舞表集合相等；T-3：簽章兩兩不同
  const moves = results.length ? results[results.length - 1].moves || [] : [];
  const allCases = casesFromIndex(html).map((c) => c.trait);
  const t1 = { missing: allCases.filter((t) => !moves.includes(t)), extra: moves.filter((t) => !allCases.includes(t)) };
  const sigs = results.filter((r) => r.sig).map((r) => `${r.sig.bones.join(',')}|${r.sig.meshes.join(',')}|${r.sig.target}`);
  const dupSig = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  // F10 的表：逐招印非 flinch 的動作數（＜2 就是偷懶短版）
  const actsTable = results.map((r) => ({ trait: r.case.trait, acts: r.verdict.acts, ok: r.verdict.actionsOK, maxRate: r.sig ? r.sig.maxRate : null, runMs: r.sig ? r.sig.ms : null, horizon: r.verdict.horizon, fill: r.verdict.fill }));
  // M1：react 量在出招方自己身上的那幾套（solo）＝「未在條文情境下驗證」，逐套列名
  const soloReact = results.filter((r) => r.verdict.reactSolo === true).map((r) => r.case.trait);
  const summary = { total: results.length, pass: results.filter((r) => r.verdict.pass).length, dupSignatures: dupSig.length, t1, softGl: results.length ? results[0].softGl : null, tier, ms: msOf(tier), actsTable, soloReact, opts: opt };
  console.log(`\nF10 動作數（非 flinch 的 tween／fly／fade／grow）：` + actsTable.map((a) => `${a.trait}=${a.acts}${a.ok ? '' : '✗'}`).join(' '));
  if (soloReact.length) {
    console.log(`\n★M1 未在條文情境下驗證（react 量在出招方自己身上，場上只有他一個人）：${soloReact.join(' ')}`);
    console.log('  自益招要量在受益方身上，請另跑一次 --only=<trId> --count=2（凍結檔 L2 假綠清單第 3 條）');
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  /* ★H1（覆審 r1）：--sigdump=<檔>★
     L5 的 trace-eq 只抽 index.html 的第一個 <script> 在 node 裡跑，**完全不載入 js/**，
     所以本批 index.html 零 diff ⇒ 那條「逐位元組相等」恆真，證明不了 js/trait-fx* 有沒有被動到。
     這支 dump 把每套的簽章（骨骼／spawn 物／徽記 kind／三段）正規化成一行，
     批 1–3 可以用 `diff` 直接比出「哪一套的演出真的變了」——那才是對 js/ 有鑑別力的等價證據。 */
  if (opt.sigdump) {
    const TAB = '\t';
    const lines = results.map((r) => {
      const g = r.sig;
      if (!g) return r.case.trait + TAB + 'NO_SIG';
      const ph = (g.phaseDetail || []).map((c) => `${c.name}:${c.ok ? 1 : 0}${c.solo ? '(solo)' : ''}`).join(',');
      return [r.case.trait, `tier=${g.tier}`, `ms=${g.ms}`, `bones=${(g.bones || []).join('+')}`,
        `meshes=${(g.meshes || []).join('+')}`, `target=${g.target ? 1 : 0}`, `phases=${ph}`,
        `acts=${g.acts}`, `horizon=${g.horizon}`, `maxRate=${g.maxRate}`].join(TAB);
    });
    fs.mkdirSync(path.dirname(opt.sigdump), { recursive: true });
    fs.writeFileSync(opt.sigdump, lines.sort().join('\n') + '\n');
    console.log(`sig 序列 → ${opt.sigdump}（${lines.length} 行；批 1–3 用 diff 比這份，不要只比 trace-eq）`);
  }
  fs.writeFileSync(out, JSON.stringify({ summary, results }, null, 1));
  console.log(`\n${summary.pass}/${summary.total} pass · 重複簽章 ${dupSig.length} · ${out}`);
  void moves;
}

// 被別的腳本 import（traitfx-sheet.mjs 借 casesFromIndex）時不要跑 main
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
