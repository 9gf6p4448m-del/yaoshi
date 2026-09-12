// 盲讀材料產生器（v0.55 招式可辨性卷，凍結檔 `2026-09-11-acceptance-fx-legibility.md` L4／L4-pre、Q12）。
//
// 用法：node tests/tools/blindread-sheet.mjs <輸出目錄> [--only=trId,..] [--tiers=1,2] [--seed=20260912]
//                                            [--port=8846] [--label] [--dt=16.6667]
//
// 規格（Q12，**訂完即凍結，不得逐招調**）：
//   一支招一張圖，**6 幀 2×3 排列、每格 780×360、總圖 1560×1080**（0.54 那版是 3 格 × 370px）。
//   長邊 1560 的理由：讀者端讀圖有長邊上限，超過會被縮、格內細節反而更差。
//   幀位寫死在本檔的 FRAME_AT——在 BEAT[tier] 的
//     windup 中點／travel 起／travel 中／travel 末／react 起／react 末。
//   「travel 末」與「react 起」在 BEAT 上是**同一個瞬間**（例如 tier 1 都是 180ms），
//   所以各自往自己那一段內縮 5%／15%，六格才不會有兩格一模一樣。這是規格的一部分，不是逐招微調。
//
// 匿名：短版（tier 1）與完整版（tier 2）混洗成匿名編號、去招名、遮代號；
//   對應表寫進 `<輸出目錄>/mapping-HIDDEN.json`，**讀者不得看**。
//   輸出檔名就是匿名編號（`a01.png`…），檔名裡沒有任何招的資訊。
//   `--label` 只給修者自己看（會在圖上壓招名與 tier），**產給讀者的材料一律不要帶這個旗標**。
//
// 這一支自己驅動 traitfx-preview.html 截圖，不吃 traitfx-drive 的 --shots：
//   幀位必須寫死在本檔（凍結檔 L4「寫死在 blindread-sheet.mjs，不得逐招調」），
//   而 traitfx-drive 的三格截圖點是它自己那一套（0.54 的 20%／45%／75%），兩者不共用。
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

/** ★凍結：六格的幀位★（BEAT[tier] 內的相對位置，逐招一律相同） */
export const FRAME_AT = [
  { seg: 'windup', f: 0.50 }, // windup 中點
  { seg: 'travel', f: 0.00 }, // travel 起
  { seg: 'travel', f: 0.50 }, // travel 中
  { seg: 'travel', f: 0.95 }, // travel 末（往內縮 5%，否則與下一格同一個瞬間）
  { seg: 'react', f: 0.15 }, // react 起（往內縮 15%，同上）
  { seg: 'react', f: 0.95 }, // react 末
];
export const CELL = { w: 780, h: 360 };
export const SHEET = { w: CELL.w * 2, h: CELL.h * 3 }; // 1560×1080
// ★L4-pre 第 1 輪（2026-09-12）判材料無效後修正★：截圖視口必須是玩家的 CSS 視口（手機橫式 844×390，同 duel-drive），
// 超取樣用 deviceScaleFactor 2（1688×780 → 縮進 780×360 格）。原本「視口拉到 1560×720 再縮半」拍到的不是玩家看到的畫面：
// js/duel-figures.js realign() 把人偶縮放到固定 CSS 像素高，視口高一倍、人偶像素高不變 → 人偶佔畫面高從 50% 腰斬成 24%，
// 已知可辨的虎姑婆指甲在那份材料上兩位讀者皆「認不出」（實測：720×405／844×390／844×390@2x 皆 47–55%，1560×720 為 24%）。
const SHOT = { width: 844, height: 390 }; // CSS 視口＝手機橫式（不得改成 2× 像素視口，理由見上）
const SHOT_DSF = 2; // 超取樣倍率：像素緩衝 1688×780
const FIRE_AT = 12;
// --proto=tigerA|tigerB|tigerC（虎爺印原型卷 2026-09-12）：**純轉送**給治具頁；
// 幀位（FRAME_AT）、格寬、視口、匿名混洗一律不動——那些才是這支治具的判準。
let PROTO = '';

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}
/** 決定性洗牌（同一個 seed 每次一樣，重跑材料不會換編號） */
function lcg(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** 這一 tier 的六個幀號（嚴格遞增；260ms 只有 ~16 幀，撞號就往後推一格） */
export function framesOf(tier, dt) {
  const b = beatOf(tier, msOf(tier));
  const out = [];
  let prev = 0;
  for (const p of FRAME_AT) {
    const [a, z] = b[p.seg];
    const ms = a + (z - a) * p.f;
    const n = Math.max(prev + 1, Math.max(1, Math.round(ms / dt)));
    out.push({ ms: +ms.toFixed(1), n });
    prev = n;
  }
  return out;
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function shootOne(browser, base, c, tier, dt, tmpDir) {
  const ms = msOf(tier);
  const frames = framesOf(tier, dt);
  const ctx = await browser.newContext({ viewport: SHOT, deviceScaleFactor: SHOT_DSF });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const url = `${base}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}&count=${c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${dt}${PROTO ? '&proto=' + PROTO : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 });
  await page.evaluate(() => window.__tfx.ready);
  // ★HUD 一定要藏★：治具頁左上角那行 debug 文字寫著招名與 ab（'eliteSelfCut xianjixl ready …'），
  //   不藏就等於在盲讀材料上直接印答案（批 0 第一版真的印出去了，a11.png 六格全帶）。
  await page.addStyleTag({ content: '#hud{display:none!important}' });
  await page.evaluate((n) => window.__tfx.stepA(n), FIRE_AT + 2);
  await page.evaluate(() => window.__tfx.resetB());
  await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  const files = [];
  let at = 0;
  for (let i = 0; i < frames.length; i++) {
    const step = frames[i].n - at;
    if (step > 0) await page.evaluate((n) => window.__tfx.stepB(n), step);
    at = frames[i].n;
    await page.evaluate(() => window.__tfx.render());
    const f = path.join(tmpDir, `${c.trait}-t${tier}-${i}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  await ctx.close();
  return { trait: c.trait, ab: c.ab, tier, ms, frames, files, handled: fired.handled, errors };
}

async function compose(browser, shot, outFile, label) {
  const imgs = shot.files.map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`);
  const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#000;width:${SHEET.w}px;height:${SHEET.h}px;overflow:hidden}
.g{display:grid;grid-template-columns:${CELL.w}px ${CELL.w}px;grid-template-rows:${CELL.h}px ${CELL.h}px ${CELL.h}px;width:${SHEET.w}px;height:${SHEET.h}px}
.g div{position:relative;width:${CELL.w}px;height:${CELL.h}px;overflow:hidden}
img{width:${CELL.w}px;height:${CELL.h}px;display:block;object-fit:cover}
.t{position:absolute;left:6px;top:4px;color:#ff0;font:16px/1.2 monospace;text-shadow:0 0 3px #000}
</style><div class="g">${imgs.map((d, i) => `<div><img src="${d}">${label ? `<div class="t">${label} · #${i + 1} ${shot.frames[i].ms}ms</div>` : ''}</div>`).join('')}</div>`;
  const tmp = outFile + '.html';
  fs.writeFileSync(tmp, html, 'utf8');
  const pg = await browser.newPage({ viewport: { width: SHEET.w, height: SHEET.h } });
  await pg.goto('file:///' + tmp.replace(/\\/g, '/'));
  await pg.screenshot({ path: outFile, clip: { x: 0, y: 0, width: SHEET.w, height: SHEET.h } });
  await pg.close();
  fs.unlinkSync(tmp);
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'blindread');
  const port = parseInt(opt.port || '8846', 10);
  const dt = parseFloat(opt.dt || (1000 / 60));
  const seed = parseInt(opt.seed || '20260912', 10);
  const tiers = String(opt.tiers || '1,2').split(',').map((x) => parseInt(x, 10));
  PROTO = String(opt.proto || '');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assertPageConsts(pageConstsFromHtml(html));
  let cases = casesFromIndex(html).filter((c) => !c.legend);
  if (opt.only) { const s = new Set(String(opt.only).split(',')); cases = cases.filter((c) => s.has(c.trait)); }
  if (!cases.length) throw new Error('--only 篩掉了全部的招');
  const tmpDir = path.join(outDir, '_frames');
  fs.mkdirSync(tmpDir, { recursive: true });

  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const shots = [];
  try {
    for (const c of cases) {
      for (const t of tiers) {
        const s = await shootOne(browser, `http://127.0.0.1:${port}`, c, t, dt, tmpDir);
        shots.push(s);
        console.log(`  拍 ${c.trait.padEnd(16)} t${t} 幀 ${s.frames.map((f) => f.n).join(',')} handled=${s.handled} err=${s.errors.length}`);
        s.errors.slice(0, 2).forEach((e) => console.log('   ! ' + e.slice(0, 160)));
      }
    }
    // 混洗成匿名編號（短版與完整版打散在同一組編號裡，讀者看不出哪張是短版）
    const rnd = lcg(seed);
    const order = shuffle(shots.map((_, i) => i), rnd);
    const mapping = [];
    for (let k = 0; k < order.length; k++) {
      const s = shots[order[k]];
      const code = 'a' + String(k + 1).padStart(2, '0');
      const out = path.join(outDir, code + '.png');
      await compose(browser, s, out, opt.label ? `${s.trait} t${s.tier}` : null);
      mapping.push({ code, trait: s.trait, ab: s.ab, tier: s.tier, ms: s.ms, frames: s.frames.map((f) => f.n), file: path.relative(ROOT, out).replace(/\\/g, '/') });
      console.log(`  ${code}.png ← ${s.trait} t${s.tier}`);
    }
    fs.writeFileSync(path.join(outDir, 'mapping-HIDDEN.json'), JSON.stringify({
      seed, tiers, dt, shot: { ...SHOT, deviceScaleFactor: SHOT_DSF }, cell: CELL, sheet: SHEET, frameAt: FRAME_AT, labelled: !!opt.label, mapping,
    }, null, 1));
  } finally { await browser.close(); srv.kill(); }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n${shots.length} 張 · ${outDir} · 對應表 mapping-HIDDEN.json（讀者不得看）`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
