// 《紙紮夜戰》後處理卷 P-1（2026-09-06）：反轉外殼描邊的兩項機械驗收。
//
//   node tests/tools/outline-probe.mjs width <out.json> [--port=8877] [--dists=3.6,4.2] [--ab=nail] [--seed=7]
//       同一尊在數個相機距離上各截兩張（描邊開／關），逐條水平掃描線量「兩張圖差在哪」＝外殼的像素寬。
//       兩張圖來自**同一次載入、同一格畫面**（先派 ys:hitstop 把時間軸凍住，再切 shell.visible），
//       所以差異只可能來自外殼——不是兩次載入之間的粒子動畫。
//       驗收 P-1：dist 3.6 與 4.2 的中位寬度差 ≤30%（--dists 可以再給一組更寬的距離驗鑑別力）。
//
//   node tests/tools/outline-probe.mjs burn <out.json> [--port=8878] [--duels=4] [--seed=7]
//       ① 真的玩 4 場（duel-drive），每個 ys:fx-burn 演完後掃 scene 讀該尊外殼 mesh 的 visible；
//       ② 另派一組合成名冊（6 尊真 3D 妖）逐尊 ys:fx-burn，等 detail.done 後讀 outlines() 的 visible。
//       ① 在真實路徑上取樣但真對決不保證會燒到 3D 妖（空袋的「肉身」走 DOM 退路），②補鑑別力。
//
// 依賴與旗標對齊既有 3D 治具：tools/anyCreature/node_modules/playwright、--use-gl=angle --use-angle=d3d11。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const [mode, out] = pos;
if (!mode || !out) { console.error('need <width|burn> <out.json>'); process.exit(2); }
const launch = () => chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const SEED = Number(opt.seed || 7);

/** 真對決的時間軸還在跑：它的鏡頭 punch／撞擊／收場會動到我要量的東西，量之前一律攔掉。 */
const ALL_BLOCK = ['ys:fx-burn', 'ys:fx-punch', 'ys:fx-lunge', 'ys:fx-impact', 'ys:duel-end', 'ys:table', 'ys:reveal', 'ys:end', 'ys:fx-trait', 'ys:fx-trait-cancel'];
const blockJs = (names) => `${JSON.stringify(names)}
  .forEach((n) => document.addEventListener(n, (ev) => ev.stopImmediatePropagation(), true));`;
const BLOCK_EVENTS = blockJs(ALL_BLOCK);
// burn 模式的合成段要走真實的 ys:fx-burn 路徑，那一條不能被攔（capture 的第一個 listener 一
// stopImmediatePropagation，後面的過濾器就再也收不到了），改由 detail.__probe 自己過濾。
const BLOCK_EXCEPT_BURN = blockJs(ALL_BLOCK.filter((n) => n !== 'ys:fx-burn'));

/**
 * 把兩張 PNG 丟回頁面用 canvas 解碼，逐條水平掃描線量「描邊色像素」的連續長度。
 * 判準是「開描邊之後這一格變得更綠」而不是「兩張圖不一樣」：真對決的時間軸還在跑，
 * 兩張截圖之間 DOM 的拍數字幕會換字（白／金），純比差異會把那幾團字算成很長的一段。
 * 量的那尊固定用陰氣系（描邊綠），綠是全畫面唯一的綠——桌面暗紅、天空夜紫、字白／金。
 */
async function bandWidth(page, onB64, offB64, dpr) {
  return page.evaluate(async ({ a, b, dpr }) => {
    const load = (b64) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/png;base64,' + b64; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const A = px(ia), B = px(ib), W = ia.width, H = ia.height;
    // 只量「外輪廓」那一段：每條掃描線由左邊進來的第一段、由右邊進來的最後一段。
    // 反轉外殼在凹處與硬邊會從本體縫裡透出一堆碎段（那是它的長相，不是線寬），
    // 全母體取中位會被那些碎段佔滿——實測 px 從 2.0 調到 8.0，全母體中位只從 4 動到 5。
    const green = (D, i) => D[i + 1] - Math.max(D[i], D[i + 2]);
    const rows = [];
    let diffPx = 0;
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) {
      const on = new Uint8Array(W);
      let any = -1, last = -1;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        // 門檻 12/255：AA 的殘差進不來，描邊那條（綠 − 紅藍最大值多出幾十）進得來
        if (green(A, i) - green(B, i) > 12) { on[x] = 1; diffPx++; if (any < 0) any = x; last = x; }
      }
      if (any < 0) continue;
      if (any < x0) x0 = any; if (last > x1) x1 = last;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      let l = 0; while (any + l < W && on[any + l]) l++;
      let r = 0; while (last - r >= 0 && on[last - r]) r++;
      rows.push([y, l, r]);
    }
    // 只取縱向中段 60%：頭頂與腳邊的輪廓接近水平，一條水平掃描線會沿著邊走一大段，量到的不是線寬
    const lo = y0 + (y1 - y0) * 0.2, hi = y0 + (y1 - y0) * 0.8;
    const edges = [];
    rows.forEach(([y, l, r]) => { if (y >= lo && y <= hi) edges.push(l, r); });
    edges.sort((p, q) => p - q);
    const q = (f) => (edges.length ? edges[Math.min(edges.length - 1, Math.floor(edges.length * f))] : 0);
    return { w: W, h: H, dpr, diffPx, lines: edges.length / 2, bbox: [x0, y0, x1, y1], bboxW: x1 - x0 + 1, bboxH: y1 - y0 + 1,
      medianDev: q(0.5), p25Dev: q(0.25), p75Dev: q(0.75), meanDev: +(edges.reduce((s, v) => s + v, 0) / Math.max(1, edges.length)).toFixed(2),
      medianCss: +(q(0.5) / dpr).toFixed(2), p75Css: +(q(0.75) / dpr).toFixed(2) };
  }, { a: onB64, b: offB64, dpr });
}

if (mode === 'width') {
  const port = Number(opt.port || 8877);
  const dists = String(opt.dists || '3.6,4.2').split(',').map(Number);
  const ab = String(opt.ab || 'nail');
  const dpr = 2;
  const srv = await serve(ROOT, port);
  try {
    const browser = await launch();
    // 844×390：妖市只有橫持一種版面（index.html:39 直式時整頁蓋上「請把手機轉橫」），P-1 量線寬用正式版面
    const page = await browser.newPage({ viewport: { width: Number(opt.w || 844), height: Number(opt.h || 390) }, deviceScaleFactor: dpr });
    const rows = [];
    let meta = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        meta = await pg.evaluate(async ({ ab, block }) => {
          const Y3 = window.__yaoshi3d;
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b); // 不在真對決裡的座位＝不吃撞擊
          // eslint-disable-next-line no-eval
          eval(block);
          const unit = (i) => ({ id: i, body: 'elite', fac: 'yinqi', ab });
          const det = { a: others[0], b: others[1], armies: [{ units: [unit(0)] }, { units: [unit(0)] }] };
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          // 派完自己這一場之後，真對決後面的 ys:duel 一律攔掉：不然名冊會被換成空袋的「肉身」貼片人形
          document.addEventListener('ys:duel', (ev) => ev.stopImmediatePropagation(), true);
          await det.ready;
          await new Promise((res) => setTimeout(res, 1600));
          document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 120000 } })); // 凍住時間軸，兩張圖只差在外殼
          // DOM 蓋在 canvas 上（拍數字幕、隻數牌）而且它的時間軸不吃 hitstop：兩張截圖之間換字
          // 就會被算成「差異」。用 visibility 藏起來（不是 display）——sceneKind() 與 realign()
          // 讀的是 display 與 getBoundingClientRect，版面一動整場站位就變了。
          [...document.body.children].forEach((el) => { if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden'; });
          const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
          return { figs: figs.length, shells: figs.reduce((s, f) => s + (f.outlines ? f.outlines().length : 0), 0),
            color: figs[0] && figs[0].outlineColor ? figs[0].outlineColor() : null, fov: Y3.camera.fov, innerH: window.innerHeight };
        }, { ab, block: BLOCK_EVENTS });
        for (const dist of dists) {
          await pg.evaluate(async (d) => {
            const cam = window.__yaoshi3d.camera;
            cam.position.setLength(d); // director 的補間跑完就不再寫 camera（camera-director.js:161），設了會留著
            cam.lookAt(0, 0.35, 0);
            await new Promise((r2) => setTimeout(r2, 500)); // 等 duel-figures 的 realign 依新距離重算 pxWorld
          }, dist);
          const on = (await pg.screenshot()).toString('base64');
          await pg.evaluate(() => { const Y3 = window.__yaoshi3d; Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).forEach((f) => (f.outlines ? f.outlines() : []).forEach((s) => { s.visible = false; })); });
          await pg.evaluate(() => new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2))));
          const off = (await pg.screenshot()).toString('base64');
          await pg.evaluate(() => { const Y3 = window.__yaoshi3d; Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).forEach((f) => (f.outlines ? f.outlines() : []).forEach((s) => { s.visible = true; })); });
          const m = await bandWidth(pg, on, off, dpr);
          const camLen = await pg.evaluate(() => window.__yaoshi3d.camera.position.length());
          rows.push({ dist, camLen: +camLen.toFixed(3), ...m });
          fs.writeFileSync(out.replace(/\.json$/, `-d${String(dist).replace('.', '_')}.png`), Buffer.from(on, 'base64'));
        }
      },
    });
    const base = rows[0] ? rows[0].medianDev : 0;
    const spread = rows.length > 1 ? Math.max(...rows.map((x) => x.medianDev)) / Math.max(1, Math.min(...rows.map((x) => x.medianDev))) : 1;
    fs.writeFileSync(out, JSON.stringify({ mode: 'width', ab, seed: SEED, dists, meta, rows, base, spreadRatio: +spread.toFixed(3), errors: r.errors }, null, 1));
    console.log(JSON.stringify({ out, meta, rows: rows.map((x) => ({ dist: x.dist, camLen: x.camLen, medianDev: x.medianDev, medianCss: x.medianCss, diffPx: x.diffPx })), spreadRatio: +spread.toFixed(3), errors: r.errors.length }));
    if (r.errors.length) console.log(r.errors.slice(0, 8).join('\n'));
    await browser.close();
  } finally { srv.kill(); }
} else if (mode === 'burn') {
  const port = Number(opt.port || 8878);
  const srv = await serve(ROOT, port);
  try {
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); // 妖市只有橫持版面
    // ① 真實路徑：每個 ys:fx-burn 演完後掃 scene，讀該尊外殼的 visible（不改 duel-drive 的錄音機，另掛一份）
    await page.addInitScript(`(() => {
      const R = window.__shellRec = { burns: [], scanned: [] };
      const fig = (side, unit) => { try { return window.__yaoshi3d.duelFigures.figureOf(side, unit); } catch (e) { return null; } };
      document.addEventListener('ys:fx-burn', (e) => {
        const d = e.detail || {};
        const row = { side: d.side, unit: d.unit, handled: null, skin: null, shells: null, shellVis: null, groupVis: null };
        R.burns.push(row);
        setTimeout(() => {
          row.handled = !!d.handled;
          const f = fig(d.side, d.unit);
          row.skin = f ? (f.skin || 'layered') : null;
          if (d.handled && d.done && d.done.then) d.done.then(() => {
            const g = fig(d.side, d.unit);
            row.shells = g && g.outlines ? g.outlines().length : null;
            row.shellVis = g && g.outlines ? g.outlines().map((s) => s.visible) : null;
            row.groupVis = g ? g.group.visible : null;
            // 掃整個 scene：名字叫 outline 而且還看得見、又屬於燒完的那一尊 → 就是殘留
            try { let vis = 0; window.__yaoshi3d.scene.traverse((o) => { if (o.name === 'outline' && o.visible) vis++; }); R.scanned.push({ unit: d.unit, side: d.side, sceneOutlinesVisible: vis }); } catch (err) {}
          });
        }, 0);
      });
    })();`);
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${SEED}`, { duels: Number(opt.duels || 4) });
    const real = await page.evaluate(() => window.__shellRec);
    // ② 合成名冊：6 尊真 3D 妖逐尊燒，等 detail.done 後讀外殼
    const synth = await page.evaluate(async ({ block }) => {
      const Y3 = window.__yaoshi3d;
      // eslint-disable-next-line no-eval
      eval(block);
      // ys:fx-burn 例外：block 那一條把它整條攔掉（真對決的時間軸還在跑，它的燒毀會打到合成名冊的同 id），
      // 但本模式就是要走真實的 ys:fx-burn 路徑（duel-figures.onFigBurn → 工廠 burn() → 收起那一尊）。
      // 所以改成只放行自己派的（detail.__probe），其餘照攔。
      document.addEventListener('ys:fx-burn', (ev) => { if (!(ev.detail && ev.detail.__probe)) ev.stopImmediatePropagation(); }, true);
      const ABS = [['bow', 'zuling'], ['sword', 'xianghuo'], ['redhat', 'yinqi'], ['tiger', 'xianghuo'], ['nail', 'yinqi'], ['shield', 'zuling']];
      const mk = (o) => ABS.slice(o, o + 3).map(([ab, fac], i) => ({ id: i, body: 'elite', fac, ab }));
      const det = { a: 0, b: 1, armies: [{ units: mk(0) }, { units: mk(3) }] };
      document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
      await det.ready;
      await new Promise((r2) => setTimeout(r2, 1200));
      const rows = [];
      for (const side of ['A', 'B']) {
        for (const f of Y3.duelFigures.figuresOf(side)) {
          const before = f.outlines().map((s) => s.visible);
          const d = { side, unit: f.unit.id, ms: 320, __probe: true, handled: false, done: null };
          document.dispatchEvent(new CustomEvent('ys:fx-burn', { detail: d }));
          if (d.done && d.done.then) await d.done;
          // duel-figures 是在「演完的下一幀」才把那一尊收起來（update 裡讀 st.done），等三幀再讀
          for (let k = 0; k < 3; k++) await new Promise((r3) => requestAnimationFrame(r3));
          rows.push({ ab: f.ab, side, unit: f.unit.id, handled: !!d.handled, shells: f.outlines().length, visBefore: before.every(Boolean),
            visAfter: f.outlines().map((s) => s.visible), groupVis: f.group.visible });
        }
      }
      let sceneVis = 0;
      Y3.scene.traverse((o) => { if (o.name === 'outline' && o.visible) sceneVis++; });
      return { rows, sceneOutlinesVisible: sceneVis };
    }, { block: BLOCK_EXCEPT_BURN });
    const bad = synth.rows.filter((x) => !x.handled || !x.shells || !x.visBefore || x.visAfter.some(Boolean) || x.groupVis);
    const realBad = (real.burns || []).filter((b) => b.handled && b.shellVis && b.shellVis.some(Boolean));
    fs.writeFileSync(out, JSON.stringify({ mode: 'burn', real, synth, errors: r.errors }, null, 1));
    console.log(JSON.stringify({ out, realBurns: (real.burns || []).length, realHandled: (real.burns || []).filter((b) => b.handled).length, realBad: realBad.length,
      synthBurned: synth.rows.length, synthBad: bad.length, sceneOutlinesVisibleAfter: synth.sceneOutlinesVisible, errors: r.errors.length,
      pass: bad.length === 0 && realBad.length === 0 && r.errors.length === 0 }));
    if (r.errors.length) console.log(r.errors.slice(0, 8).join('\n'));
    await browser.close();
  } finally { srv.kill(); }
} else {
  console.error('mode must be width|burn');
  process.exit(2);
}
