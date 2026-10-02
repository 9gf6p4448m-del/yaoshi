/* v0.59.7 修訂 5 條件 12–15 量測（由獨立驗收者的 verify-hr/hole-probe.mjs 複製；信物判準、換邊計數、節流效能段原樣，另加：
   ⑤ 條件 13：A→B→A 在 10 幀內來回的次數（aba10）
   ⑥ 條件 14：每隻手袖管「畫面內、桌面以上」的投影長度（px）、是否壓到拍品外框；舊手（95f621db）量前臂看得到那段的投影長度（px）
   原說明：
   node hole-probe.mjs --root=<樹> [--vp=844x390] [--q=handreal=0] [--seed=101] [--throttle=4] [--port=8996] [--out=x.json] [--natural=1]
   ① 幾何：每幀量 可見袖管頂點（i≥arm[0]、alpha≥0.5）是否落在 信物（relic-*）本地包圍盒、拍品節點世界 AABB（寬鬆上界）、錢／令牌實例體積內
   ② 袖管換邊：每隻手可見期間 stats().arms[seat].edge 的切換次數
   ③ 效能（另一段、CPU 節流 throttle 倍）：rAF 間隔、每幀 onBeforeRender（袖管重鋪）累計耗時、hands.update 耗時
   ④ 記憶體：連開 3 局後 renderer.info.memory.geometries／textures 與 JS heap */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root), [W, H] = String(opt.vp || '844x390').split('x').map(Number), PORT = Number(opt.port || 8996), SEED = Number(opt.seed || 101);
const THR = Number(opt.throttle || 4);
const { chromium } = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../../tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

async function driveUntil(page, re, maxSteps = 4000) {
  const src = re.source;
  for (let i = 0; i < maxSteps; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
      const b = document.getElementById('mainbtn'); const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return 1;
      if (b && !dis) { b.click(); return 0; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') { const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; } const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; } }
      if (b && dis) { const els = [...document.querySelectorAll('#stage button')]; const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled); if (sb) { sb.click(); return 0; } }
      return 0; })()`);
    if (r) return true;
  }
  return false;
}

const out = { root: ROOT, vp: [W, H], q: opt.q || '', seed: SEED, throttle: THR, errs: [] };
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') out.errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(async ({ sd, md, pk }) => {
    window.__yaoshi.newGame(md, sd, pk);
    const T = window.__yaoshi3d.tray; await T.loaded(); await T.hands.ready();
  }, { sd: SEED, md: opt.mode || 'solo', pk: String(opt.picks || 'qingmian').split(',') });
  await driveUntil(page, /不盯任何一件/);
  out.mem0 = await page.evaluate(() => { const R = window.__yaoshi3d.renderer; return { geos: R.info.memory.geometries, tex: R.info.memory.textures, real: window.__yaoshi3d.tray.hands.stats().real }; });

  /* ①② 幾何與換邊（不節流） */
  await page.evaluate(async () => {
    const THREE = await import('three');
    const Y = window.__yaoshi3d, T = Y.tray, Hd = T.hands, P = T.props.group;
    const hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })), wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), box = new THREE.Box3();
    const res = window.__hole = { frames: 0, nearClipFrames: 0, rearOnScreenFrames: 0, rearOnScreenEx: [], phase: 'script', nights: {}, handFrames: 0, relicHitFrames: 0, relicHitVerts: 0, relicWhere: {}, itemAabbFrames: 0, chipHitFrames: 0, edgeFlips: [0, 0, 0, 0], edgeSeq: [[], [], [], []], sleeveVerts: null, real: Hd.stats().real };
    const last = [null, null, null, null], lastF = [-9, -9, -9, -9]; res.consecFlips = [0, 0, 0, 0]; res.relicShots = [];
    res.aba10 = [0, 0, 0, 0]; res.abaEx = []; const sw = [[], [], [], []]; // 每席換邊紀錄 [幀, 從, 到]
    res.len = { seats: [[], [], [], []], over: [0, 0, 0, 0], itemOverlap: [0, 0, 0, 0] }; res.relicFramesDetail = [];
    const Wpx = Y.renderer.domElement.clientWidth, Hpx = Y.renderer.domElement.clientHeight, tableY = T.props.tableY();
    const sample = () => {
      if (res.stop) return; res.frames++;
      const st = Hd.stats();
      const holders = Hd.group.children.filter((h) => h.visible);
      if (holders.length) { /* 修訂 5：舊手（無寫實）也進來量前臂投影長度（其餘量測在 real 之後才做） */
        Y.scene.updateMatrixWorld(true);
        const relics = P.children.filter((o) => /^relic-/.test(o.name) && o.visible).map((o) => { o.geometry.computeBoundingBox(); return [o.name, o.matrixWorld.clone().invert(), o.geometry.boundingBox]; });
        const chips = P.getObjectByName('prop-chips'), toks = P.getObjectByName('prop-tokens'); const vols = [];
        for (let i = 0; i < chips.count; i++) { chips.getMatrixAt(i, m4); vols.push(['chip', m4.clone().invert()]); }
        for (let i = 0; i < toks.count; i++) { toks.getMatrixAt(i, m4); vols.push(['token', m4.clone().invert()]); }
        const items = [0, 1, 2, 3].map((i) => { const s = T.nodeOf ? T.nodeOf(i) : null; return s; }).filter(Boolean);
        let relicHit = false, itemHit = false, chipHit = false;
        for (const h of holders) {
          res.handFrames++;
          const seat = +h.name.split('-')[1];
          const e = st.arms && st.arms[seat] ? st.arms[seat].edge : null;
          if (e && last[seat] && e !== last[seat]) { const L = sw[seat]; const pv = L[L.length - 1]; if (pv && pv[2] === last[seat] && pv[1] === e && res.frames - pv[0] <= 10) { res.aba10[seat]++; if (res.abaEx.length < 8) res.abaEx.push({ seat, f: res.frames, seq: pv[1] + '>' + pv[2] + '>' + e }); } L.push([res.frames, last[seat], e]); }
          if (e && last[seat] && e !== last[seat]) { res.edgeFlips[seat]++; if (res.edgeSeq[seat].length < 12) res.edgeSeq[seat].push(last[seat] + '>' + e + '@' + window.__yaoshi.S.round); }
          if (e && last[seat] && e !== last[seat] && lastF[seat] === res.frames - 1) res.consecFlips[seat]++;
          if (e) { last[seat] = e; lastF[seat] = res.frames; }
          let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
          const g = mesh.geometry, real = g.userData.real;
          /* ⑥ 投影長度：寫實＝袖管各圈中心（畫面內、桌面以上）折線長；舊手＝前臂看得到那段（alpha≥0.5、z≤袖口）從袖口圈到最後端的投影距離 */
          { const pos0 = g.attributes.position, col0 = g.attributes.color, toPx = (w) => { const n = w.clone().project(Y.camera); return { x: (n.x + 1) / 2 * Wpx, y: (1 - n.y) / 2 * Hpx, on: Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1 && n.z <= 1, w }; };
            let L = 0, over = false;
            if (g.userData.armRing) { const AR = g.userData.armRing, boxes = (st.itemBoxes || []); let pv = null;
              for (let i = 0; i <= AR.segs; i++) { if (col0.getW(AR.start + i * AR.sides) < 0.5) break; const c = new THREE.Vector3(); for (let j = 0; j < AR.sides; j++) { v.fromBufferAttribute(pos0, AR.start + i * AR.sides + j); mesh.applyBoneTransform(AR.start + i * AR.sides + j, v); c.add(v); } c.multiplyScalar(1 / AR.sides).applyMatrix4(mesh.matrixWorld);
                const pp = toPx(c), ok = pp.on && c.y > tableY - 0.01; if (pv && ok && pv.ok) L += Math.hypot(pp.x - pv.x, pp.y - pv.y);
                if (ok && i >= 2) { const n = c.clone().project(Y.camera); if (boxes.some((r) => n.x > r.x0 && n.x < r.x1 && n.y > r.y0 && n.y < r.y1)) over = true; }
                pv = { x: pp.x, y: pp.y, ok }; } }
            else { let zA = -1e9, zB = 1e9; const vs = []; for (let i = 0; i < Math.min(819, pos0.count); i++) { if (col0.itemSize === 4 && col0.getW(i) < 0.5) continue; const z = pos0.getZ(i); if (z > -0.08) continue; vs.push(i); if (z > zA) zA = z; if (z < zB) zB = z; }
              const cen = (pick) => { const c = new THREE.Vector3(); let n = 0; for (const i of vs) if (pick(pos0.getZ(i))) { v.fromBufferAttribute(pos0, i); mesh.applyBoneTransform(i, v); c.add(v); n++; } return c.multiplyScalar(1 / (n || 1)).applyMatrix4(mesh.matrixWorld); };
              if (vs.length) { const a = toPx(cen((z) => z >= zA - 0.04)), b = toPx(cen((z) => z <= zB + 0.04)); L = Math.hypot(a.x - b.x, a.y - b.y); } }
            res.len.seats[seat].push(+L.toFixed(1)); if (over) res.len.itemOverlap[seat]++; }
          if (!real) continue;
          const pos = g.attributes.position, col = g.attributes.color;
          mesh.skeleton.update();
          let nSleeve = 0;
          for (let i = real.arm[0]; i < pos.count; i++) {
            if (col.itemSize === 4 && col.getW(i) < 0.5) continue; nSleeve++;
            v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld);
            for (const [rn, inv, b] of relics) if (b.containsPoint(v.clone().applyMatrix4(inv))) { relicHit = true; res.relicHitVerts++; res.relicWhere[seat + ':' + rn] = (res.relicWhere[seat + ':' + rn] || 0) + 1; break; }
            for (const [k, inv] of vols) { const l = v.clone().applyMatrix4(inv);
              const inside = k === 'chip' ? Math.hypot(l.x, l.z) < 0.072 && Math.abs(l.y) < 0.012 : Math.abs(l.x) < 0.075 && Math.abs(l.z) < 0.095 && l.y > -0.025 && l.y < 0.053;
              if (inside) { chipHit = true; break; } }
          }
          res.sleeveVerts = nSleeve;
          const cam = Y.camera, vm = cam.matrixWorldInverse; let nc = 0;
          for (let i = real.arm[0]; i < pos.count; i++) { if (col.itemSize === 4 && col.getW(i) < 0.5) continue; v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld).applyMatrix4(vm); if (-v.z < cam.near * 1.05) nc++; }
          if (nc) res.nearClipFrames++;
          const AR = g.userData.armRing;
          if (AR) { let lastR = 0; for (let i = 0; i <= AR.segs; i++) if (col.getW(AR.start + i * AR.sides) >= 0.5) lastR = i; let on = 0;
            for (let j = 0; j < AR.sides; j++) { v.fromBufferAttribute(pos, AR.start + lastR * AR.sides + j); mesh.applyBoneTransform(AR.start + lastR * AR.sides + j, v); v.applyMatrix4(mesh.matrixWorld).project(cam); if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z >= -1 && v.z <= 1) on++; }
            if (on) { res.rearOnScreenFrames++; if (res.rearOnScreenEx.length < 5) res.rearOnScreenEx.push({ seat, on, night: window.__yaoshi.S.round, phase: res.phase }); } }
          res.nights[window.__yaoshi.S.round] = (res.nights[window.__yaoshi.S.round] || 0) + 1;
        }
        if (relicHit && res.relicShots.length < 3 && res.frames % 4 === 0) { Y.renderer.render(Y.scene, Y.camera); res.relicShots.push(Y.renderer.domElement.toDataURL('image/png')); }
        if (relicHit && res.relicFramesDetail.length < 40) res.relicFramesDetail.push({ f: res.frames, night: window.__yaoshi.S.round, phase: res.phase, where: Object.keys(res.relicWhere).slice(-2) });
        if (relicHit) res.relicHitFrames++; if (chipHit) res.chipHitFrames++;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    for (let k = 0; k < 4; k++) {
      for (let s = 0; s < 4; s++) hp('ys:bid', { seat: s, slot: (k + s) % 4, amount: 3 + s * 2 });
      await wait(900);
      for (let s = 0; s < 4; s++) hp('ys:mark', { seat: s, slot: (k + s) % 4 });
      await wait(900);
      hp('ys:reveal-result', { slot: k, winner: k % 4 });
      await wait(1200);
    }
    res.phase = 'natural';
  });
  if (opt.natural) { out.naturalEnded = await driveUntil(page, /看最終結果/, 20000); }
  out.geo = await page.evaluate(() => { window.__hole.stop = true; return window.__hole; });

  /* ③ 效能：CPU 節流下同一段腳本，量 rAF 間隔與袖管重鋪耗時 */
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR });
  out.perf = await page.evaluate(async () => {
    const Y = window.__yaoshi3d, T = Y.tray, Hd = T.hands;
    const hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })), wait = (ms) => new Promise((r) => setTimeout(r, ms));
    T.props.clearRound(); Hd.clear();
    let armMs = 0, updMs = 0; const frames = []; let lastT = performance.now(), stop = false, handVisFrames = 0;
    Hd.group.children.forEach((h) => h.traverse((o) => { if (o.isSkinnedMesh && o.onBeforeRender) { const f = o.onBeforeRender; o.onBeforeRender = function (...a) { const t0 = performance.now(); f.apply(this, a); armMs += performance.now() - t0; }; } }));
    const upd = Hd.update; Hd.update = function (...a) { const t0 = performance.now(); const r = upd.apply(this, a); updMs += performance.now() - t0; return r; };
    const tick = (t) => { if (stop) return; const vis = Hd.group.children.some((h) => h.visible); frames.push({ dt: t - lastT, arm: armMs, upd: updMs, vis }); if (vis) handVisFrames++; armMs = 0; updMs = 0; lastT = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    for (let k = 0; k < 4; k++) {
      for (let s = 0; s < 4; s++) hp('ys:bid', { seat: s, slot: (k + s) % 4, amount: 3 + s * 2 });
      await wait(900);
      for (let s = 0; s < 4; s++) hp('ys:mark', { seat: s, slot: (k + s) % 4 });
      await wait(900);
      hp('ys:reveal-result', { slot: k, winner: k % 4 });
      await wait(1200);
    }
    stop = true; Hd.update = upd;
    const vis = frames.filter((f) => f.vis).slice(2), q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2) : null; };
    return { framesVis: vis.length, dt_p50: q(vis.map((f) => f.dt), 0.5), dt_p95: q(vis.map((f) => f.dt), 0.95), arm_p50: q(vis.map((f) => f.arm), 0.5), arm_p95: q(vis.map((f) => f.arm), 0.95), upd_p50: q(vis.map((f) => f.upd), 0.5), upd_p95: q(vis.map((f) => f.upd), 0.95) };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  /* ④ 記憶體：再開 3 局 */
  out.mem = [];
  for (let i = 0; i < 3; i++) {
    out.mem.push(await page.evaluate(async ({ sd, md, pk }) => {
      window.__yaoshi.newGame('solo', sd, ['qingmian']); const T = window.__yaoshi3d.tray; await T.loaded(); await T.hands.ready();
      for (let s = 0; s < 4; s++) document.dispatchEvent(new CustomEvent('ys:bid', { detail: { seat: s, slot: s, amount: 5 } }));
      await new Promise((r) => setTimeout(r, 1500));
      if (window.gc) window.gc();
      const R = window.__yaoshi3d.renderer; return { geos: R.info.memory.geometries, tex: R.info.memory.textures, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
    }, { sd: SEED + 1 + i }));
  }
} catch (e) { out.fatal = String(e && e.stack || e); }
finally { await browser?.close(); server.kill(); }
if (out.geo && out.geo.relicShots) { out.geo.relicShots.forEach((u, i) => fs.writeFileSync(path.resolve(`${opt.shotprefix || 'relic-shot'}-${W}-${i}.png`), Buffer.from(u.split(',')[1], 'base64'))); out.geo.relicShots = out.geo.relicShots.length; }
if (out.geo && out.geo.len) { /* 逐幀長度太大，存摘要 */ }
if (opt.out) fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out, null, 1));
const g = out.geo || {};
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; }, p95 = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length * 0.95)] : null; };
const lenSum = g.len ? g.len.seats.map((a, i) => ({ seat: i, n: a.length, median: med(a), p95: p95(a), max: a.length ? Math.max(...a) : null, itemOverlapFrames: g.len.itemOverlap[i] })) : null;
if (opt.out) { const o2 = JSON.parse(fs.readFileSync(path.resolve(opt.out), 'utf8')); o2.lenSummary = lenSum; fs.writeFileSync(path.resolve(opt.out), JSON.stringify(o2, null, 1)); }
console.log(JSON.stringify({ aba10: g.aba10, abaEx: g.abaEx, lenSummary: lenSum, relicFramesDetail: (g.relicFramesDetail || []).slice(0, 5) }));
console.log(JSON.stringify({ vp: out.vp, q: out.q, real: g.real, frames: g.frames, handFrames: g.handFrames, sleeveVerts: g.sleeveVerts, relicHitFrames: g.relicHitFrames, relicHitVerts: g.relicHitVerts, relicWhere: g.relicWhere, sleeveChipHitFrames: g.chipHitFrames, edgeFlips: g.edgeFlips, consecFlips: g.consecFlips, nearClipFrames: g.nearClipFrames, rearOnScreenFrames: g.rearOnScreenFrames, rearEx: g.rearOnScreenEx, nights: g.nights, naturalEnded: out.naturalEnded, edgeSeq: g.edgeSeq, perf: out.perf, mem0: out.mem0, mem: out.mem, errs: out.errs.slice(0, 3), fatal: out.fatal }));
