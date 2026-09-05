// 《紙紮夜戰》接線卷（2026-09-05）：兩種量測。
//   node tests/tools/duel-perf.mjs bounds <out.json> [--port=8832]
//       27 隻逐一在 creature-preview.html 載入，讀正規化後的包圍盒（W-A2）與腳下環境（W-A8）。
//   node tests/tools/duel-perf.mjs perf <out.json> [--port=8833] [--n=8]
//       真實頁面（?paperwar=1）玩到第 2 場對決時，另派一個 8v8 最重 8 隻的合成 ys:duel，
//       等 detail.ready 後量 2.5 秒：renderer 的幀數增量（renderer.info.render.frame）換算 fps、
//       頁面 rAF 中位數、draw calls、GPU 名（W-A7）。量測位置＝js/renderer.js 的 frame()（它每幀 render 一次）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const ALL = ['ashcharm', 'balen', 'bell', 'boartusk', 'boat', 'bow', 'buoy', 'chair', 'eye', 'flag', 'fushou', 'guoyin', 'hairpin', 'nail',
  'pojun', 'raincoat', 'redhat', 'shanshen', 'shield', 'sigui', 'sword', 'thunder', 'tiger_c', 'wangchuan', 'wuying', 'xianji', 'yinyangcoin'];
// 最重 8 隻（GLB 位元組數由大到小；scratchpad/glb-bounds.mjs 量的）
const HEAVY = ['fushou', 'ashcharm', 'wangchuan', 'boartusk', 'shanshen', 'balen', 'yinyangcoin', 'boat'];
const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling' };

const { pos, opt } = parseArgs(process.argv.slice(2));
const [mode, out] = pos;
if (!mode || !out) { console.error('need <bounds|perf> <out.json>'); process.exit(2); }
// --uncap：關掉 vsync 與幀率上限，量的才是「跑得動幾幀」而不是「螢幕更新幾次」（60Hz 桌機 rAF 永遠貼著 60）
const launch = () => chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'].concat(opt.uncap ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []) });

if (mode === 'bounds') {
  const port = Number(opt.port || 8832);
  const srv = await serve(ROOT, port);
  try {
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    const rows = [];
    for (const ab of ALL) {
      await page.goto(`http://127.0.0.1:${port}/tests/tools/creature-preview.html?auto=0&glb=${ab}.glb&fx=0`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__preview && window.__preview.ready, null, { timeout: 60000 });
      await page.evaluate(() => window.__preview.ready);
      const b = await page.evaluate(() => ({ b: window.__preview.bounds(), ground: window.__preview.groundFx(), skin: window.__preview.skin }));
      const h = b.b ? b.b.maxY - b.b.minY : null;
      rows.push({ ab, h: h == null ? null : +h.toFixed(3), minY: b.b ? +b.b.minY.toFixed(3) : null, w: b.b ? +b.b.w.toFixed(2) : null, d: b.b ? +b.b.d.toFixed(2) : null, ground: b.ground, skin: b.skin,
        ok: h != null && h <= 1.2 + 1e-3 && b.b.minY >= -1e-3 });
    }
    // 預覽頁的 ?glb 只吃檔名，buoy 的水面要用 ab=buoy 才掛得上：預覽頁走 makeCreatureFigure({glbUrl}) 沒帶 ab，
    // 所以這裡另外用 setGroundFx 驗「水面掛得上、其餘沒有」——正式路徑的 ab 由 renderer.js 帶，duel-drive 那邊驗。
    fs.writeFileSync(out, JSON.stringify({ rows, errors: errs }, null, 1));
    console.log(rows.map((r) => `${r.ab.padEnd(12)} h=${r.h} minY=${r.minY} w=${r.w} d=${r.d} ${r.ok ? 'OK' : 'FAIL'}`).join('\n'));
    console.log(JSON.stringify({ out, n: rows.length, allOk: rows.every((r) => r.ok), errors: errs.length }));
    await browser.close();
  } finally { srv.kill(); }
} else if (mode === 'perf') {
  const port = Number(opt.port || 8833);
  const N = Number(opt.n || 8);
  const srv = await serve(ROOT, port);
  try {
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    let perf = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
      duels: 2,
      onDuel: async (pg, n) => {
        if (n !== 2) return; // 第 2 場：第 1 場已把 shader 編掉、部分 GLB 進快取
        perf = await pg.evaluate(async ({ heavy, fac, N }) => {
          const Y3 = window.__yaoshi3d;
          const S = window.__yaoshi.S;
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const units = (side) => heavy.slice(0, N).map((ab, i) => ({ id: i, body: 'elite', fac: fac[ab], ab }));
          const det = { a: cur.a, b: cur.b, armies: [{ units: units('A') }, { units: units('B') }] };
          const t0 = performance.now();
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          await det.ready;
          const loadMs = performance.now() - t0;
          // 等所有尊真的現身（aligned＋ready）再開始量
          await new Promise((r) => setTimeout(r, 600));
          const info = Y3.renderer.info;
          const f0 = info.render.frame; const ts = performance.now();
          const raf = []; let last = performance.now();
          await new Promise((resolve) => {
            const tick = (now) => { raf.push(now - last); last = now; if (now - ts < 2500) requestAnimationFrame(tick); else resolve(); };
            requestAnimationFrame(tick);
          });
          const f1 = info.render.frame; const te = performance.now();
          const s = raf.slice(1).sort((a, b) => a - b); const med = s[Math.floor(s.length / 2)];
          const p95 = s[Math.floor(s.length * 0.95)];
          // 整幀的 draw call：autoReset 會讓 info 只留最後一趟（bloom 的合成 pass＝1 call），
          // 改成自己歸零、等一整幀（兩次 rAF 之間）再讀
          info.autoReset = false; info.reset();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const calls = info.render.calls, tris = info.render.triangles, passes = info.render.frame - f1;
          info.autoReset = true;
          const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
          return { loadMs: Math.round(loadMs), rendersPerSec: +((f1 - f0) / ((te - ts) / 1000)).toFixed(1), rafMedianFps: +(1000 / med).toFixed(1), rafP95Ms: +p95.toFixed(1),
            rafFrames: raf.length, drawCallsPerFrame: calls, trianglesPerFrame: tris, renderPassesPerFrame: passes, gl: Y3.glName,
            visible: figs.filter((f) => f.group.visible).length, total: figs.length, skins: figs.map((f) => f.skin).filter((x) => x === 'creature').length };
        }, { heavy: HEAVY, fac: FAC, N });
      },
    });
    fs.writeFileSync(out, JSON.stringify({ perf, errors: r.errors, fxc: r.fxc }, null, 1));
    console.log(JSON.stringify({ out, perf, errors: r.errors.length }));
    if (r.errors.length) console.log(r.errors.slice(0, 10).join('\n'));
    await browser.close();
  } finally { srv.kill(); }
} else if (mode === 'buoy') {
  // W-A8：真實頁面第 1 場對決時派一個含 buoy 的合成 ys:duel，等 ready 後截圖，並讀每尊的 groundFx()
  const port = Number(opt.port || 8838);
  const srv = await serve(opt.root ? path.resolve(opt.root) : ROOT, port) /* --root：量基準版（卷 C3 T-5） */;
  try {
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    let res = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        res = await pg.evaluate(async () => {
          const Y3 = window.__yaoshi3d;
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const det = { a: cur.a, b: cur.b, armies: [
            { units: [{ id: 0, body: 'haunt', fac: 'yinqi', ab: 'buoy' }, { id: 1, body: 'haunt', fac: 'yinqi', ab: 'buoy' }, { id: 2, body: 'haunt', fac: 'yinqi', ab: 'redhat' }] },
            { units: [{ id: 0, body: 'elite', fac: 'xianghuo', ab: 'tiger' }, { id: 1, body: 'elite', fac: 'xianghuo', ab: 'sword' }] } ] };
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          await det.ready;
          await new Promise((r) => setTimeout(r, 1400));
          const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
          // 審查 H-2：水面要在桌面上（桌頂 y=0.15）——量世界座標，不是工廠那側的本地座標
          const V = (o) => { const v = o.getWorldPosition(new (o.position.constructor)()); return +v.y.toFixed(3); };
          return figs.map((f) => { const w = f.group.getObjectByName('ground-water'); return { ab: f.ab, ground: f.groundFx ? f.groundFx() : null, vis: f.group.visible, groupY: +f.group.position.y.toFixed(3), waterY: w ? V(w) : null }; });
        });
        await pg.screenshot({ path: out.replace(/\.json$/, '.png') });
      },
    });
    fs.writeFileSync(out, JSON.stringify({ figs: res, errors: r.errors }, null, 1));
    console.log(JSON.stringify({ out, figs: res, errors: r.errors.length }));
    await browser.close();
  } finally { srv.kill(); }
} else if (mode === 'lineup') {
  // 演出可讀性小卷（2026-09-05）：真實頁面第 1 場對決時派合成 ys:duel（--na／--nb 每邊隻數，預設 8v8 最重 8 隻），
  // 等 ready 後量每一尊的世界座標：離桌心的水平距離（桌面半徑 3.4）、同側兩尊間最小距離、影子半徑；並截圖。
  const port = Number(opt.port || 8839);
  const na = Number(opt.na || 8), nb = Number(opt.nb || 8);
  const srv = await serve(opt.root ? path.resolve(opt.root) : ROOT, port);
  try {
    const browser = await launch();
    const page = await browser.newPage({ viewport: { width: Number(opt.w || 844), height: Number(opt.h || 390) }, deviceScaleFactor: 2 });
    let res = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
      duels: 1,
      onDuel: async (pg, n) => {
        if (n !== 1) return;
        res = await pg.evaluate(async ({ heavy, fac, na, nb, lunge, unitsA, unitsB }) => {
          const Y3 = window.__yaoshi3d;
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const mk = (k, i) => ({ id: i, body: i % 3 === 0 ? 'elite' : i % 3 === 1 ? 'swarm' : 'ward', fac: fac[heavy[k % heavy.length]], ab: heavy[k % heavy.length] });
          // 用「不在真對決裡」的兩個座位：ys:fx-lunge 的 w/l 對不上就不會推（push=0），量到的才是靜態站位
          const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
          const parseUnits = (spec) => spec ? spec.split(',').map((s, i) => { const [ab, body] = s.split(':'); return { id: i, body: body || 'elite', fac: fac[ab] || 'zuling', ab }; }) : null;
          const det = { a: others[0], b: others[1], armies: [
            { units: parseUnits(unitsA) || Array.from({ length: na }, (_, i) => mk(i, i)) },
            { units: parseUnits(unitsB) || Array.from({ length: nb }, (_, i) => mk(i + 3, i)) } ] };
          document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
          await det.ready;
          await new Promise((r) => setTimeout(r, 1400));
          // --lunge=P：對合成座位派兩個方向的撞擊（A 勝再 B 勝），之後 700ms 內逐幀取樣，R-2 看撞擊中的最大 r（覆審 H-3：撞擊會把最外尊推出去）
          const samples = [];
          if (lunge > 0) {
            const shoot = async (w, l) => { document.dispatchEvent(new CustomEvent('ys:fx-lunge', { detail: { w, l, power: lunge } })); const t0 = performance.now();
              while (performance.now() - t0 < 700) { await new Promise((r) => requestAnimationFrame(r)); samples.push(['A', 'B'].map((s) => Y3.duelFigures.figuresOf(s).filter((f) => f.group.visible).map((f) => { const p = f.group.position; return [p.x, p.z, f.shadow.scale.x * (f.shadow.geometry.parameters ? f.shadow.geometry.parameters.radius : 0.42)]; }))); } };
            await shoot(others[0], others[1]); await shoot(others[1], others[0]);
            await new Promise((r) => setTimeout(r, 900));
          }
          // 「站在紅色區塊外」的量法：腳點（含影子半徑往外側推）投影到螢幕，要落在桌面頂（八邊形、半徑 3.4、y=0.15）
          // 投影後的多邊形內；另量兩側沿「畫面右」方向有沒有交錯（A 的最右 vs B 的最左）
          const cam = Y3.camera; cam.updateMatrixWorld(); const V3 = cam.position.constructor;
          const proj = (x, y, z) => { const v = new V3(x, y, z).project(cam); return [v.x, v.y]; };
          const poly = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; return proj(Math.cos(a) * 3.4, 0.15, Math.sin(a) * 3.4); });
          const inPoly = ([px, py]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) c = !c; } return c; };
          const az = Math.atan2(cam.position.x, cam.position.z); const right = [Math.cos(az), -Math.sin(az)];
          const out = { A: [], B: [] };
          for (const s of ['A', 'B']) {
            // 只算看得見的尊：真對決的 ys:fx-burn 會打到合成名冊的同 id 單位，被燒掉隱藏的那尊位置停住不更新（實測 4v4 minPair 0.201 就是它）
            const figs = Y3.duelFigures.figuresOf(s).filter((f) => f.group.visible);
            const pts = figs.map((f) => { const p = f.group.position; const foot = f.shadow.scale.x * (f.shadow.geometry.parameters ? f.shadow.geometry.parameters.radius : 0.42);
              const rr = Math.hypot(p.x, p.z) || 1e-6; const ox = p.x + p.x / rr * foot, oz = p.z + p.z / rr * foot; // 腳印最外緣
              return { ab: f.ab, body: f.unit && f.unit.body, x: +p.x.toFixed(3), z: +p.z.toFixed(3), r: +rr.toFixed(3), foot: +foot.toFixed(3), vis: f.group.visible,
                lat: +(p.x * right[0] + p.z * right[1]).toFixed(3), onTable: inPoly(proj(ox, 0.15, oz)) }; });
            let minD = Infinity;
            for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z));
            out[s] = { n: pts.length, maxR: Math.max(...pts.map((p) => p.r)), minPair: +minD.toFixed(3), offTable: pts.filter((p) => !p.onTable).length, lats: pts.map((p) => p.lat), pts };
          }
          // 交錯：A（畫面左）最右的腳印外緣 vs B（畫面右）最左的腳印外緣
          const aMax = Math.max(...out.A.pts.map((p) => p.lat + p.foot)), bMin = Math.min(...out.B.pts.map((p) => p.lat - p.foot));
          out.gap = +(bMin - aMax).toFixed(3);
          if (samples.length) { // 撞擊中：最大 r（含腳印外緣）、最小兩側間隙
            let maxR = 0, maxEdge = 0, minGap = Infinity;
            for (const fr of samples) { const lats = [[], []]; fr.forEach((sidePts, si) => sidePts.forEach(([x, z, ft]) => { const rr = Math.hypot(x, z); maxR = Math.max(maxR, rr); maxEdge = Math.max(maxEdge, rr + ft); lats[si].push([x * right[0] + z * right[1], ft]); }));
              const a = Math.max(...lats[0].map(([l, ft]) => l + ft)), b = Math.min(...lats[1].map(([l, ft]) => l - ft)); minGap = Math.min(minGap, b - a); }
            out.lunge = { power: lunge, frames: samples.length, maxR: +maxR.toFixed(3), maxEdge: +maxEdge.toFixed(3), minGap: +minGap.toFixed(3) };
          }
          return out;
        }, { heavy: HEAVY, fac: FAC, na, nb, lunge: Number(opt.lunge || 0), unitsA: opt.unitsa || null, unitsB: opt.unitsb || null });
        await pg.screenshot({ path: out.replace(/\.json$/, '.png') });
      },
    });
    fs.writeFileSync(out, JSON.stringify({ lineup: res, errors: r.errors }, null, 1));
    console.log(JSON.stringify({ out, A: res && { n: res.A.n, maxR: res.A.maxR, minPair: res.A.minPair, offTable: res.A.offTable }, B: res && { n: res.B.n, maxR: res.B.maxR, minPair: res.B.minPair, offTable: res.B.offTable }, gap: res && res.gap, lunge: res && res.lunge, errors: r.errors.length }));
    await browser.close();
  } finally { srv.kill(); }
} else {
  console.error('mode must be bounds|perf|buoy|lineup');
  process.exit(2);
}
