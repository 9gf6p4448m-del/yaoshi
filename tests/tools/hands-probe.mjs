/* 席位之手 階段二 2a：實頁探針（凍結 #B1 draw call／面數、#C1 HUD／hitTest／實頁蒙皮不穿入、#C2 P/L、#C6 ys:mark-slam、
   A2 遺留的「確實走 creature-figures 管線」）＋截圖。
   一律走產品自己的事件（document 上派 ys:bid／ys:mark／ys:reveal-result，與 index.html 的 fx3d 同一條路），
   不直接呼叫 props，不翻 instance count（02 §6.1 第 3 條）。
   跑法：node tests/tools/hands-probe.mjs [--root=<樹>] [--out=<json>] [--shots=<資料夾>] [--port=8977] [--layouts=L,P]
   退出碼：所有閘門項 pass ⇒ 0。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = opt.root ? path.resolve(opt.root) : HERE;
const PORT = Number(opt.port || 8977);
const SHOTS = opt.shots ? path.resolve(HERE, opt.shots) : null;
const LAYOUTS = String(opt.layouts || 'L,P').split(',');
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const report = { root: ROOT, layouts: {}, gates: {} };
let browser;
try {
  /* uncapped：headless 不關 vsync 時 rAF 會被節流到 ~1fps，動作量不到中間態（實測）。 */
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  for (const lay of LAYOUTS) report.layouts[lay] = await runLayout(lay);
} finally { await browser?.close(); server.kill(); }

/* ── 閘門彙總 ── */
const L = report.layouts;
const all = (fn) => Object.values(L).every(fn);
report.gates = {
  B1_drawCallDelta_le4: all((x) => x.drawCalls.delta <= 4 && x.drawCalls.handsVisible === 4),
  B1_trisPerHand_le2500: all((x) => x.drawCalls.trisPerHand <= 2500),
  pipeline_creatureFigures: all((x) => x.pipeline.glbRequests === 1 && x.pipeline.glbCached === true && x.pipeline.shared !== null),
  C1_noPenetration_realSkin: all((x) => x.penetration.hits === 0 && x.penetration.framesWithHands > 20),
  C1_hitTestUnchanged: all((x) => x.hitTest.samples > 0 && x.hitTest.diffs === 0),
  C1_idleNotOverHUD: all((x) => x.hud.afterRetract.statesIdle && x.hud.afterRetract.visibleHands === 0 && x.hud.afterRetract.overlaps === 0),
  C6_slamFromToken: all((x) => x.slam.events === 4 && x.slam.eventsMatchLanding),
  noPageErrors: all((x) => x.errors.length === 0),
};
report.pass = Object.values(report.gates).every(Boolean);
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ gates: report.gates, pass: report.pass, summary: Object.fromEntries(Object.entries(L).map(([k, x]) => [k, { drawCalls: x.drawCalls, pen: x.penetration, hit: x.hitTest, hud: x.hud.afterRetract, hudDuringAction: x.hud.duringAction, slam: x.slam, pipeline: x.pipeline, errors: x.errors.slice(0, 3) }])) }, null, 1));
process.exit(report.pass ? 0 : 1);

async function runLayout(lay) {
  const vp = lay === 'L' ? { width: 852, height: 393 } : { width: 393, height: 852 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [], glbReq = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { if (/hand_r\.glb/.test(r.url())) glbReq.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  let ready = false;
  for (let i = 0; i < 400 && !ready; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) { ready = true; break; }
    /* 直式整片被 #rotateHint 蓋住，真實點擊會被攔：改用 el.click()（同 props-probe 的做法；量的是 3D 版面）。 */
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click());
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  if (!ready) throw new Error(lay + '：沒走到第 1 夜盯上頁');
  if (lay === 'P') await page.addStyleTag({ content: '#rotateHint{display:none !important}' });
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; await t.loaded(); await t.hands.ready(); t.props.clearRound(); t.hands.clear(); });
  /* 頁內工具：只讀量測（不改場景） */
  await page.evaluate(() => {
    const Y = window.__yaoshi3d, cam = Y.camera, V3 = Y.camera.position.constructor;
    const M4 = Y.camera.matrixWorld.constructor;
    window.__hp = {
      ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })),
      frames: (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }),
      calls: async () => { const info = Y.renderer.info; info.autoReset = false; info.reset(); await window.__hp.frames(2); const c = info.render.calls / 2, t = info.render.triangles / 2; info.autoReset = true; return { calls: c, tris: t }; },
      handMeshes: () => { const out = []; Y.tray.hands.group.children.forEach((h) => { if (!h.visible) return; h.traverse((o) => { if (o.isSkinnedMesh) out.push([h.name, o]); }); }); return out; },
      verts: (mesh) => { const v = new V3(), out = []; mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count; for (let i = 0; i < n; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); out.push(v.clone()); } return out; },
      screenBox: (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { const q = p.clone().project(cam); if (q.z > 1) continue; const x = (q.x + 1) * innerWidth / 2, y = (1 - q.y) * innerHeight / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; },
      hud: () => ['#north', '#westSeat', '#eastSeat', '#railW', '#railE', '#feltHead', '#south', '#helpBtn', '#skipbtn'].flatMap((s) => {
        const el = document.querySelector(s); if (!el || !el.getClientRects().length) return [];
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return [];
        let hidden = false; for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') hidden = true; }
        if (hidden) return [];
        const b = el.getBoundingClientRect(); return b.width && b.height ? [{ sel: s, x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }] : [];
      }),
      /* 錢與令牌的實際實例體積（props 的 InstancedMesh 矩陣＋幾何尺寸），手的真實蒙皮頂點不得落在其中 */
      penetration: () => {
        const P = Y.tray.props.group, chips = P.getObjectByName('prop-chips'), toks = P.getObjectByName('prop-tokens');
        const m = new M4(), vols = [];
        for (let i = 0; i < chips.count; i++) { chips.getMatrixAt(i, m); vols.push(['chip', m.clone().invert()]); }
        for (let i = 0; i < toks.count; i++) { toks.getMatrixAt(i, m); vols.push(['token', m.clone().invert()]); }
        const R = 0.072, T = 0.024, W = 0.075, H = 0.095, TT = 0.050, EPS = 1e-6; let hits = 0; const where = [];
        for (const [name, mesh] of window.__hp.handMeshes()) for (const p of window.__hp.verts(mesh)) for (const [k, inv] of vols) {
          const l = p.clone().applyMatrix4(inv);
          const inside = k === 'chip' ? Math.hypot(l.x, l.z) < R - EPS && Math.abs(l.y) < T / 2 - EPS
            : Math.abs(l.x) < W - EPS && Math.abs(l.z) < H - EPS && l.y > -TT / 2 + EPS && l.y < TT / 2 + 0.028 - EPS;
          if (inside) { hits++; if (where.length < 3) where.push([name, k]); break; }
        }
        /* 第三輪：信物（各席 relic-* 網格的本地包圍盒）也納入取樣；只看手上看得見的頂點（bind z ≥ −0.80，袖布已隱去的不算） */
        const relics = P.children.filter((o) => /^relic-/.test(o.name)).map((o) => { o.geometry.computeBoundingBox(); return [o.name, o.matrixWorld.clone().invert(), o.geometry.boundingBox]; });
        let relicHits = 0;
        for (const [name, mesh] of window.__hp.handMeshes()) {
          const pos = mesh.geometry.attributes.position, vs = window.__hp.verts(mesh);
          vs.forEach((p, i) => { if (pos.getZ(i) < -0.80) return; for (const [rn, inv, b] of relics) { if (b.containsPoint(p.clone().applyMatrix4(inv))) { relicHits++; if (where.length < 3) where.push([name, rn]); break; } } });
        }
        return { hits: hits + relicHits, relicHits, where };
      },
    };
  });
  const out = { viewport: vp, errors };

  /* ── #C6：四枚令牌各拍一次，ys:mark-slam 事件數＝4，且每一個都落在「令牌 t 剛到 1」的那一幀 ── */
  out.slam = await page.evaluate(async () => {
    const Y = window.__yaoshi3d, P = Y.tray.props; const log = [];
    const onSlam = (e) => log.push({ slot: e.detail.slot, landed: [0, 1, 2, 3].filter((s) => { const t = P.tokenAt(s); return t && t.t >= 1; }).length });
    document.addEventListener('ys:mark-slam', onSlam);
    for (let s = 0; s < 4; s++) window.__hp.ev('ys:mark', { seat: s, slot: s });
    let handsSeen = 0;
    for (let i = 0; i < 400; i++) { await window.__hp.frames(1); if (window.__hp.handMeshes().length) handsSeen++; if (log.length >= 4 && !window.__hp.handMeshes().length) break; }
    document.removeEventListener('ys:mark-slam', onSlam);
    /* 事件當下「已落地的令牌數」應逐一遞增（1,2,3,4 或同幀合併時跳號但不倒退）——代表事件跟著真正的落地走 */
    const ok = log.length === 4 && log.every((x, i) => x.landed >= 1 && (i === 0 || x.landed >= log[i - 1].landed));
    return { events: log.length, log, eventsMatchLanding: ok, handsSeenFrames: handsSeen };
  });

  /* ── #B1 draw call／面數：四隻手凍結在場上 vs 全收，同一桌面狀態下的差 ── */
  out.drawCalls = await page.evaluate(async () => {
    const Y = window.__yaoshi3d, H = Y.tray.hands;
    Y.tray.props.clearRound(); H.clear();
    for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) window.__hp.ev('ys:bid', { seat: s, slot: k, amount: a });
    /* 第三輪：起手時手避讓信物（錢一離開信物手才上場），所以等到四隻都在場才凍結 */
    for (let i = 0; i < 60 && H.stats().visible.length < 4; i++) await window.__hp.frames(1);
    H.setFrozen(true);
    await new Promise((r) => setTimeout(r, 900)); // 錢落定；手凍在推的姿勢（仍可見）
    const on = await window.__hp.calls(); const vis = H.stats().visible.length;
    H.finish(); await window.__hp.frames(2);
    const off = await window.__hp.calls();
    H.setFrozen(false);
    return { handsVisible: vis, callsWithHands: on.calls, callsWithout: off.calls, delta: on.calls - off.calls, trisDelta: on.tris - off.tris, trisPerHand: H.stats().trisPerHand };
  });

  /* ── 管線：同一顆 GLB 一個網路請求、在 creature-figures 的 glbCache 裡、shareSkeletons 有回報 ── */
  out.pipeline = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/js\/creature-figures\.js/.test(n));
    const cf = await import(url); // 同一個 URL ⇒ 同一個模組實例（同一份 glbCache）
    const st = window.__yaoshi3d.tray.hands.stats();
    return { moduleUrl: url.replace(location.origin, ''), glbCached: cf.glbCached(st.url), shared: st.shared, skeletons: st.skeletons, materials: st.materials };
  });
  out.pipeline.glbRequests = glbReq.length;

  /* ── #C1 實頁蒙皮不穿入＋HUD（動作中只記錄；收手後為閘門）＋hitTest 不變（U2） ── */
  const cycle = async (label, fire, frames = 3000) => page.evaluate(async ({ label, fire, frames }) => {
    const Y = window.__yaoshi3d, H = Y.tray.hands;
    let hits = 0, where = [], withHands = 0, hudHit = 0; const hudRects = window.__hp.hud();
    for (const [n, d] of fire) window.__hp.ev(n, d);
    /* 視窗以「牆鐘時間」計（uncapped 下幀率 350～650 不等，按幀數截斷會在動作做完前就停——實測 rake 撞到 260 幀上限）。 */
    const t0 = performance.now();
    for (let i = 0; i < 100000 && performance.now() - t0 < frames; i++) {
      await window.__hp.frames(1);
      const ms = window.__hp.handMeshes(); if (!ms.length) { if (i > 5) break; continue; }
      withHands++;
      if (i % 3 === 0) { const p = window.__hp.penetration(); hits += p.hits; if (p.where.length && where.length < 3) where.push(...p.where); }
      for (const [, mesh] of ms) { const b = window.__hp.screenBox(window.__hp.verts(mesh)); if (hudRects.some((r) => b.x0 < r.x1 && b.x1 > r.x0 && b.y0 < r.y1 && b.y1 > r.y0)) { hudHit++; break; } }
    }
    return { label, hits, where, withHands, hudOverlapFrames: hudHit };
  }, { label, fire, frames });
  const pen = [];
  pen.push(await cycle('push', [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 12]].map(([s, k, a]) => ['ys:bid', { seat: s, slot: k, amount: a }])));
  await page.evaluate(() => { window.__yaoshi3d.tray.props.clearRound(); window.__yaoshi3d.tray.hands.clear(); });
  pen.push(await cycle('push-same-slot', [0, 1, 2, 3].map((s) => ['ys:bid', { seat: s, slot: 1, amount: 2 + s * 2 }])));
  pen.push(await cycle('slam', [0, 1, 2, 3].map((s) => ['ys:mark', { seat: s, slot: 1 }])));
  pen.push(await cycle('rake', [['ys:reveal-result', { slot: 1, winner: 2 }]]));
  out.penetration = { hits: pen.reduce((a, x) => a + x.hits, 0), framesWithHands: pen.reduce((a, x) => a + x.withHands, 0), cycles: pen };
  out.hud = {
    duringAction: pen.map((x) => ({ label: x.label, framesWithHands: x.withHands, framesOverlappingHUD: x.hudOverlapFrames })),
    afterRetract: await page.evaluate(async () => {
      /* 等所有動作狀態歸零（上限 4 秒）再多跑 20 幀才量：量的是「收手之後」，不是動作中途。 */
      const t0 = performance.now();
      while (window.__yaoshi3d.tray.hands.stats().state.some(Boolean) && performance.now() - t0 < 4000) await window.__hp.frames(1);
      await window.__hp.frames(20);
      const rects = window.__hp.hud(), ms = window.__hp.handMeshes();
      let overlaps = 0; for (const [, mesh] of ms) { const b = window.__hp.screenBox(window.__hp.verts(mesh)); if (rects.some((r) => b.x0 < r.x1 && b.x1 > r.x0 && b.y0 < r.y1 && b.y1 > r.y0)) overlaps++; }
      return { visibleHands: ms.length, overlaps, waitedMs: Math.round(performance.now() - t0), statesIdle: !window.__yaoshi3d.tray.hands.stats().state.some(Boolean), hudRects: rects.map((r) => r.sel) };
    }),
  };

  /* hitTest：四隻手凍在場上時，在每隻手的螢幕投影框內取格點問 tray.hitTest；收手後同一組格點再問一次，必須逐點相同。 */
  out.hitTest = await page.evaluate(async () => {
    const Y = window.__yaoshi3d, H = Y.tray.hands;
    Y.tray.props.clearRound(); H.clear();
    for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) window.__hp.ev('ys:bid', { seat: s, slot: k, amount: a });
    for (let i = 0; i < 60 && H.stats().visible.length < 4; i++) await window.__hp.frames(1);
    H.setFrozen(true); await window.__hp.frames(30);
    const pts = [];
    for (const [, mesh] of window.__hp.handMeshes()) {
      const b = window.__hp.screenBox(window.__hp.verts(mesh));
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
        const x = b.x0 + (b.x1 - b.x0) * i / 8, y = b.y0 + (b.y1 - b.y0) * j / 8;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        pts.push([x / innerWidth * 2 - 1, 1 - y / innerHeight * 2]);
      }
    }
    const withHands = pts.map(([u, v]) => Y.tray.hitTest(u, v));
    const handsVisible = H.stats().visible.length;
    /* 對照組在同一個同步區段內取：把四隻手整組抬到 100 單位高再問一次（射線不看 visible，只能搬走；
       同步做完再放回，中間沒有任何一幀，鏡頭與托盤都不會動）。 */
    const g = H.group, y0 = g.position.y; g.position.y = y0 + 100; g.updateMatrixWorld(true);
    const without = pts.map(([u, v]) => Y.tray.hitTest(u, v));
    g.position.y = y0; g.updateMatrixWorld(true);
    H.finish(); H.setFrozen(false); await window.__hp.frames(2);
    const diffs = withHands.filter((x, i) => x !== without[i]).length;
    return { samples: pts.length, handsVisible, diffs, hitSlotsWithHands: [...new Set(withHands)].sort() };
  });

  /* ── 截圖（#6）：推／拍／收各一張，手凍在動作中段 ── */
  if (SHOTS) {
    const shoot = async (name, prep, fire, waitMs) => {
      await page.evaluate(async ({ prep, fire, waitMs }) => {
        const Y = window.__yaoshi3d, H = Y.tray.hands;
        H.setFrozen(false); H.finish();
        for (const [n, d] of prep) window.__hp.ev(n, d);
        if (prep.length) await new Promise((r) => setTimeout(r, 1300));
        for (const [n, d] of fire) window.__hp.ev(n, d);
        await new Promise((r) => setTimeout(r, waitMs)); H.setFrozen(true); await window.__hp.frames(3);
      }, { prep, fire, waitMs });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `${lay}-${name}.jpg`), type: 'jpeg', quality: 72, scale: 'css' });
    };
    /* 直式：產品本來就整片蓋 #rotateHint、直式 HUD 不是設計中的畫面；截圖照 props-probe 的慣例把 DOM 全藏，只看 3D。 */
    if (lay === 'P') await page.addStyleTag({ content: 'body > *:not(canvas):not(#vignette){visibility:hidden !important}' });
    await page.evaluate(() => { window.__yaoshi3d.tray.props.clearRound(); window.__yaoshi3d.tray.hands.clear(); });
    await shoot('push', [], [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]].map(([s, k, a]) => ['ys:bid', { seat: s, slot: k, amount: a }]), 170);
    await page.evaluate(() => { window.__yaoshi3d.tray.props.clearRound(); window.__yaoshi3d.tray.hands.clear(); });
    await shoot('slam', [], [0, 1, 2, 3].map((s) => ['ys:mark', { seat: s, slot: (s + 1) % 4 }]), 300);
    await page.evaluate(() => { window.__yaoshi3d.tray.props.clearRound(); window.__yaoshi3d.tray.hands.clear(); });
    await shoot('rake', [0, 1, 2, 3].map((s) => ['ys:bid', { seat: s, slot: 2, amount: 3 + s * 2 }]), [['ys:reveal-result', { slot: 2, winner: 3 }]], 420);
    await page.evaluate(() => { const H = window.__yaoshi3d.tray.hands; H.setFrozen(false); H.finish(); });
  }
  await ctx.close();
  return out;
}
