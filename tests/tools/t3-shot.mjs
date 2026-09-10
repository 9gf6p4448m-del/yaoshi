/* Tier 3 大招的**真實路徑**人眼證據（v0.54，R1 覆審 H4）。
 * 用法：node tests/tools/t3-shot.mjs <png 目錄> [--port=9590] [--root=<靜態根>] [--seed=7]
 *
 * 為什麼要另寫一支：一版的 tier 3 交付物（sheet-t3-legend.png／shots-t3/）出自
 * `traitfx-drive --tier=3 --shots=`，那條路走的是 tests/tools/traitfx-preview.html——
 * 那一頁 `grep -c "lbTop\\|lbar"` ＝ 0、也沒有 camera-director（自己一組相機），
 * **不可能**拍到黑條，也拍不到 CINEMA 的低角度仰視。製作人拿去挑的三張圖不是玩家會看到的畫面。
 *
 * 這一支走 index.html 的真實路徑：真的玩到對決中，在對決覆蓋層上派 tier 3 的 ys:fx-trait
 * （camera-director 因此切 CINEMA）＋ pwLetterbox(true)（黑條），三個時間點各截一張全畫面。
 * 出招方不見得是三尊本尊（袋子裡有沒有三尊逼不出來）——**這一組圖驗的是「黑條＋仰視機位＋大招時長」
 * 這三件在真實畫面上長什麼樣**，招式本身的辨識度由 sheet-t1／t2 那組負責。
 * 另外同時輸出「同一幀不開黑條」的對照，人眼一比就知道黑條有沒有效果。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve } from './duel-drive.mjs';
import { msOf, TIER_BASE_MS } from './fx-consts.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright');
})();

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else pos.push(a); }
const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'shots-t3-real');
const port = Number(opt.port || 9590);
const root = opt.root ? path.resolve(opt.root) : ROOT;
const seed = Number(opt.seed || 7);
fs.mkdirSync(outDir, { recursive: true });

const LEGEND_MOVES = ['eliteBlind', 'wardGuardAll', 'hauntAnswer'];
const srv = await serve(root, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const shots = [];
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  /* ★要在對決**演出進行中**截圖★（第一版錯在這裡：drive 跑完之後對決已收場，
     強制把 #duel 叫回來只會拍到「第 N 夜・戰況」總結面板，3D 妖根本不在場）。
     duel-drive 的 onDuel(page, n) 是「每場對決開始時」的掛點，那時 3D 舞台正在演——
     在那裡派 tier 3 的 ys:fx-trait（camera-director 切 CINEMA）＋ pwLetterbox(true)（黑條），
     拍到的才是玩家會看到的畫面。 */
  await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`, {
    duels: 4,
    onDuel: async (pg, n) => {
      if (n !== 2 && n !== 3 && n !== 4) return; // 第 1 場還在載 GLB，從第 2 場起拍
      const trId = LEGEND_MOVES[(n - 2) % LEGEND_MOVES.length];
      for (const withBox of [true, false]) {
        const ms = msOf(3);
        await pg.waitForTimeout(700); // 讓進場 orbit 走完、妖站定
        await pg.evaluate(({ trId, ms, base, withBox }) => {
          window.__yaoshi.pwLetterbox(withBox);
          document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId, side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier: 3, baseMs: base, handled: false, done: null } }));
        }, { trId, ms, base: TIER_BASE_MS, withBox });
        let last = 0;
        for (const frac of [0.2, 0.45, 0.75]) { // 幀位與 contact sheet 一致
          const at = Math.round(ms * frac);
          await pg.waitForTimeout(at - last); last = at;
          const f = path.join(outDir, `${trId}-${Math.round(frac * 100)}${withBox ? '' : '-nobox'}.png`);
          await pg.screenshot({ path: f });
          shots.push(f);
        }
        await pg.evaluate(() => { window.__yaoshi.pwLetterbox(false); document.dispatchEvent(new CustomEvent('ys:fx-trait-cancel', { detail: {} })); });
        await pg.waitForTimeout(600);
      }
    },
  });

  // 收尾：確認畫面回到沒有黑條、沒有 CINEMA 的狀態（不留殘留給下一次量測）
  const clean = await page.evaluate(() => ({
    lbox: ['lbTop', 'lbBot'].map((id) => document.getElementById(id).getBoundingClientRect().height),
    cinema: !!window.__yaoshi3d.director.cinemaOn(),
  }));
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ seed, shots, clean, errors, note: '出招方不是三尊本尊；這組圖驗的是黑條＋CINEMA 仰視機位＋1400ms 在真實畫面上的樣子' }, null, 1));
  console.log(JSON.stringify({ outDir, shots: shots.length, clean, errors: errors.length }));
  process.exit(errors.length === 0 && clean.cinema === false && clean.lbox.every((h) => h === 0) ? 0 : 1);
} finally {
  await browser.close();
  srv.kill();
}
