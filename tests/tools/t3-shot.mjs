/* Tier 3 大招的**真實路徑**人眼證據（v0.54，R1 覆審 H4；收尾版依 §2.1 修訂七重寫）。
 * 用法：node tests/tools/t3-shot.mjs <png 目錄> [--port=9590] [--root=<靜態根>] [--seed=7]
 *
 * 為什麼要另寫一支：一版的 tier 3 交付物（sheet-t3-legend.png／shots-t3/）出自
 * `traitfx-drive --tier=3 --shots=`，那條路走的是 tests/tools/traitfx-preview.html——
 * 那一頁沒有 camera-director（自己一組相機），**拍不到 CINEMA 的低角度仰視**。
 * 製作人拿去挑的三張圖不是玩家會看到的畫面。
 *
 * 這一支走 index.html 的真實路徑：真的玩到對決中，在對決覆蓋層上派 tier 3 的 ys:fx-trait
 * （camera-director 因此切 CINEMA），三個時間點各截一張全畫面。
 * 出招方不見得是三尊本尊（袋子裡有沒有三尊逼不出來）——**這一組圖驗的是「仰視機位＋1400ms」
 * 在真實畫面上長什麼樣**，招式本身的辨識度由 sheet-t1／t2 那組負責。
 *
 * ★收尾版的兩處改動★
 *  ① 黑條 letterbox 移出本卷（使用者 2026-09-11 裁甲）⇒ 拿掉 withBox／nobox 那組對照，
 *     每一場只跑一趟。順帶解掉 r5 抓到的「18 張裡有 6 張不是對決畫面」——真因是一場裡塞
 *     兩趟（2×(700+1050+600)≈4.7 秒）比一場對決還長，第二趟開拍時對決早收場了，
 *     拍到的是「第 N 夜・戰況」總結面板。現在一趟 ≈2.35 秒，穩穩落在對決裡面。
 *  ② 「是不是對決畫面」不再靠人眼看：每一張截圖當下同時記 #duel 的 display／.on／
 *     3D 妖在不在場，任何一張不是對決畫面就整支紅（duelOk）。
 * 張數 18＝6 場 × 3 幀位（三支大招各拍兩場）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, serve } from './duel-drive.mjs';
import { msOf, TIER_BASE_MS } from './fx-consts.mjs';
import { loadChromium } from './duel-rects.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const chromium = loadChromium();

const argv = process.argv.slice(2);
const pos = [], opt = {};
const KNOWN = new Set(['port', 'root', 'seed']);
for (const a of argv) {
  const m = a.match(/^--([a-z0-9]+)=(.*)$/i);
  if (m) { if (!KNOWN.has(m[1])) throw new Error(`未知旗標 --${m[1]}（合法：${[...KNOWN].join('/')}）`); opt[m[1]] = m[2]; }
  else pos.push(a);
}
const outDir = pos[0] || path.join(ROOT, 'scratchpad', 'shots-t3-real');
const port = Number(opt.port || 9590);
const root = opt.root ? path.resolve(opt.root) : ROOT;
const seed = Number(opt.seed || 7);
fs.mkdirSync(outDir, { recursive: true });

const LEGEND_MOVES = ['eliteBlind', 'wardGuardAll', 'hauntAnswer'];
const FRACS = [0.2, 0.45, 0.75]; // 幀位與 contact sheet 一致
const FIRST = 2, LAST = 7;       // 第 1 場還在載 GLB，從第 2 場起拍；2..7 ＝ 6 場 ×3 幀 ＝ 18 張
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
     duel-drive 的 onDuel(page, n) 是「每場對決開始時」的掛點，那時 3D 舞台正在演。 */
  await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`, {
    duels: LAST + 1,
    onDuel: async (pg, n) => {
      if (n < FIRST || n > LAST) return;
      const trId = LEGEND_MOVES[(n - FIRST) % LEGEND_MOVES.length];
      const ms = msOf(3);
      await pg.waitForTimeout(700); // 讓進場 orbit 走完、妖站定
      await pg.evaluate(({ trId, ms, base }) => {
        document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId, side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier: 3, cinema: true, baseMs: base, handled: false, done: null } }));
      }, { trId, ms, base: TIER_BASE_MS });
      /* ★幀位要從「派招那一刻」起算，不能用累加的等待★：每張 screenshot（844×390@2）
         本身要花 300–500ms，用 `waitForTimeout(at - last)` 累加下去，第三張實際會落在 2 秒之後
         ——已經超過 1400ms 的招式視窗，CINEMA 早收乾淨了（第一次重拍就是這樣拍到 k=0）。
         改成每次都對齊 t0 + at，遲到就不等（Math.max(0, …)）。 */
      const t0 = Date.now();
      for (const frac of FRACS) {
        const at = Math.round(ms * frac);
        await pg.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
        const f = path.join(outDir, `${trId}-d${n}-${Math.round(frac * 100)}.png`);
        /* ★這一張是不是對決畫面★：#duel 可見、對決覆蓋層 .on 在、3D 舞台有妖在場、CINEMA 作用中 */
        const st = await pg.evaluate(() => {
          const d = document.getElementById('duel');
          const D = window.__yaoshi3d && window.__yaoshi3d.duelFigures;
          let figs = -1;
          try { figs = (D.figuresOf('A').length + D.figuresOf('B').length); } catch (e) { figs = -1; }
          return { disp: d ? getComputedStyle(d).display : 'none', on: d ? d.classList.contains('on') : false,
            figs, cinema: !!window.__yaoshi3d.director.cinemaOn(), k: +window.__yaoshi3d.director.cinemaK().toFixed(3) };
        });
        await pg.screenshot({ path: f });
        shots.push({ file: path.basename(f), trId, duel: n, frac, atMs: Date.now() - t0, ...st,
          duelOk: st.disp !== 'none' && st.on && st.figs > 0 });
      }
      await pg.evaluate(() => document.dispatchEvent(new CustomEvent('ys:fx-trait-cancel', { detail: {} })));
      await pg.waitForTimeout(500);
    },
  });

  // 收尾：確認畫面回到沒有 CINEMA 的狀態（不留殘留給下一次量測）
  const clean = await page.evaluate(() => ({ cinema: !!window.__yaoshi3d.director.cinemaOn() }));
  const duelOk = shots.length === (LAST - FIRST + 1) * FRACS.length && shots.every((s) => s.duelOk);
  const cinemaOk = shots.every((s) => s.cinema);
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ seed, n: shots.length, duelOk, cinemaOk, shots, clean, errors,
    note: '出招方不是三尊本尊；這組圖驗的是 CINEMA 仰視機位＋1400ms 在真實畫面上的樣子（黑條已依 §2.1 修訂七移出本卷）' }, null, 1));
  console.log(JSON.stringify({ outDir, shots: shots.length, duelOk, cinemaOk, clean, errors: errors.length }));
  process.exit(errors.length === 0 && duelOk && cinemaOk && clean.cinema === false ? 0 : 1);
} finally {
  await browser.close();
  srv.kill();
}
