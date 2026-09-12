// 道具尺寸記錄治具（2026-09-12 招式演出卷，計畫 §7.2 Q5 裁定的那一支）。
//
// 用法：node tests/tools/prop-size.mjs <輸出目錄> [--only=trId,..] [--tier=2] [--port=8873] [--fxvocab=1]
//
// 量什麼：**每尊 figure 的包圍盒高** 對照 **該招道具的峰值尺寸**，輸出成表。
// 規則是「單件道具的世界尺寸 ≤ 施招本體高的 1/2」（ART_BIBLE §10.2、語彙檔 §A3），
// 在批 1 之前沒有任何治具量得出「施招本體高」，於是 Q5 裁定：**補這支治具，但只當記錄項、不擋批**
// ——現在就訂一個沒量過的門檻，等於訂一條可能恆真或恆假的線（`02 §6.1` 第 6 條）。
// 所以本支 **永遠 exit 0**（除非治具自己壞掉：頁面錯誤、招沒接、量不到 figure），
// 超標的列只在表上標 `OVER`，等 9 支的實測分布出來再決定門檻要不要進 P 閘。
//
// ★「記錄項」不等於「規則失效」（語彙檔 §A3 的 read-back 消歧第 1 條）★：
// 實作者仍要目測遵守，明顯超過就是違規要自己抓；這張表是給製作人看分布用的，不是放行證明。
//
// 量測位置：走 tests/tools/traitfx-preview.html（同 traitfx-drive／fx-contrast 那條路），
// 逐幀步進整支演出，每幀讀 `__tfx.propSizes()`，取全程峰值。**不開 bloom、不截圖**——
// 量的是場景圖裡的世界座標尺寸，與畫面後製無關。
//
// 群體道具（InstancedMesh）量的是 `unit`＝單件幾何 × 最大實例縮放，不是整群的包圍盒：
// 整群包圍盒量到的是「這一群散得多開」，拿它去比 1/2 會把每一支群體招都判成超標。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { msOf, TIER_BASE_MS, assertPageConsts, pageConstsFromHtml } from './fx-consts.mjs';
import { casesFromIndex, fxvocabQ } from './traitfx-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature 或設 NODE_PATH');
})();

const FIRE_AT = 12;
const LIMIT = 0.5; // 記錄用的參考線＝本體高的 1/2（§A3）。**不是閘門**，只決定表上標不標 OVER。
/** 規則管的是「**道具**」。腳下語彙（香火的貼桌陣 ring／disc、祖靈的光柱、陰氣的暗斑）與拖尾
 *  不在 §A3 的約束裡——貼桌陣本來就該比本體寬（它是「腳下那一圈」），拿 1/2 去比它一定超標，
 *  連它一起算會讓這張表的 OVER 欄失去意義。非道具的列照樣輸出（欄位 `type`），只是不進 OVER 統計。 */
const IS_PROP = /^(emblem:|mark:|prop:)/;

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, opt };
}

async function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  return srv;
}

async function measure(page, c, tier, ms, dt, vq, port) {
  const url = `http://127.0.0.1:${port}/tests/tools/traitfx-preview.html?trait=${c.trait}&ab=${c.ab}&body=${c.body}&fac=${c.fac}`
    + `&count=${c.count}&ms=${ms}&tier=${tier}&base=${TIER_BASE_MS}&dt=${dt}&bloom=0${vq}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__tfx, null, { timeout: 30000 });
  await page.evaluate(() => window.__tfx.ready);
  await page.evaluate((n) => window.__tfx.stepA(n), FIRE_AT + 2);
  await page.evaluate(() => window.__tfx.resetB());
  await page.evaluate((n) => window.__tfx.stepB(n), FIRE_AT);
  const fired = await page.evaluate(() => window.__tfx.fire());
  if (!fired.handled) return { handled: false };
  const N = Math.ceil(ms / dt) + 4;
  const peak = new Map(); // kind → { unit, max, atFrame }
  let figH = 0, foeH = 0, figN = 0;
  for (let i = 0; i < N; i++) {
    const s = await page.evaluate(() => window.__tfx.propSizes());
    // 「施招本體高」＝**出招方**（preview 頁的 fire 一律 side:'A'）那一側最高的那尊；對面另外記，不混在一起
    s.figs.forEach((f) => { if (f.side === 'A') { if (f.h > figH) figH = f.h; } else if (f.h > foeH) foeH = f.h; });
    figN = Math.max(figN, s.figs.filter((f) => f.side === 'A').length);
    s.props.forEach((p) => {
      let cur = peak.get(p.kind);
      if (!cur) { cur = { unit: -1, max: 0, w: 0, h: 0, d: 0, inst: p.inst, at: i, all: [] }; peak.set(p.kind, cur); }
      cur.all.push(p.unit); // 全程樣本：峰值常常是「彈出來」那一兩幀的過衝，中位數才代表這件道具平常多大
      if (p.unit > cur.unit) { cur.unit = p.unit; cur.w = p.w; cur.h = p.h; cur.d = p.d; cur.at = i; }
      if (p.max > cur.max) cur.max = p.max;
    });
    await page.evaluate((n) => window.__tfx.stepB(n), 1);
  }
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? +b[b.length >> 1].toFixed(4) : 0; };
  return { handled: true, figH, foeH, figN, props: Array.from(peak.entries()).map(([kind, v]) => Object.assign({ kind, p50: med(v.all), frames: v.all.length }, v)) };
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'prop-size');
  const port = parseInt(opt.port || '8873', 10);
  const tier = parseInt(opt.tier || '2', 10);
  const ms = msOf(tier);
  const dt = 1000 / 60;
  const only = opt.only ? String(opt.only).split(',').map((s) => s.trim()).filter(Boolean) : null;
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assertPageConsts(pageConstsFromHtml(html));
  const vq = fxvocabQ(opt);
  let cases = casesFromIndex(html);
  if (only) cases = cases.filter((c) => only.includes(c.trait));
  if (!cases.length) throw new Error('沒有要量的招（--only 的 trId 不在 index.html 的 POOL 裡？）');

  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(ROOT, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errors = [];
  const rows = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    for (const c of cases) {
      const r = await measure(page, c, tier, ms, dt, vq, port);
      if (!r.handled) { errors.push(`${c.trait}: 3D 舞台沒接這一招（handled=false）`); continue; }
      if (!r.figH) { errors.push(`${c.trait}: 量不到任何 figure 的包圍盒（figN=${r.figN}）`); continue; }
      r.props.forEach((p) => {
        const isProp = IS_PROP.test(p.kind);
        rows.push({
          trait: c.trait, fac: c.fac, body: c.body, tier,
          figH: r.figH, foeH: r.foeH, figN: r.figN, kind: p.kind, type: isProp ? 'prop' : 'other', inst: p.inst,
          unit: p.unit, p50: p.p50, frames: p.frames, groupMax: p.max, w: p.w, h: p.h, d: p.d, atFrame: p.at,
          ratio: +(p.unit / r.figH).toFixed(3), ratio50: +(p.p50 / r.figH).toFixed(3), over: isProp && p.unit / r.figH > LIMIT,
        });
      });
    }
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }

  const tsv = ['trait\tfac\ttier\tfigH\tkind\ttype\tinst\tunit\tratio\tp50\tratio50\tover\tgroupMax\tatFrame\tframes']
    .concat(rows.map((r) => [r.trait, r.fac, r.tier, r.figH, r.kind, r.type, r.inst ? 'inst' : '-', r.unit, r.ratio, r.p50, r.ratio50, r.over ? 'OVER' : '', r.groupMax, r.atFrame, r.frames].join('\t')));
  const jsonPath = path.join(outDir, `prop-size-t${tier}.json`);
  const tsvPath = path.join(outDir, `prop-size-t${tier}.tsv`);
  fs.writeFileSync(jsonPath, JSON.stringify({ tier, ms, limit: LIMIT, cases: cases.length, errors, rows }, null, 1));
  fs.writeFileSync(tsvPath, tsv.join('\n') + '\n');
  console.log(tsv.join('\n'));
  const props = rows.filter((r) => r.type === 'prop');
  console.log(`\n參考線 ratio ≤ ${LIMIT}（§A3，**記錄項不擋批**）：` +
    `道具 ${props.filter((r) => r.over).length}／${props.length} 列超過` +
    `（另有 ${rows.length - props.length} 列是腳下語彙／拖尾，不在這條規則的範圍）。errors=${errors.length}`);
  errors.forEach((e) => console.log('  ! ' + e));
  console.log(`${tsvPath}\n${jsonPath}`);
  // 治具自己壞掉才判紅（頁面錯誤／招沒接／量不到 figure）；尺寸超標一律不影響 exit code
  process.exit(errors.length ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(3); });
