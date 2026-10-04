/* v0.60.0 得標「手抓回」／詛咒「推過去按住＋紙錢繩」驗收治具（凍結 docs/experiments/2026-10-05-grab-hands/acceptance.md）。
 *
 * node tests/tools/grab-probe.mjs --root=<要量的樹> --modes=award,curse,skip,perf,pixel,hud [--vp=V3] [--out=<目錄>] [--tag=head] [--shots] [--q=<額外網址參數>] [--rounds=5]
 *   --root 預設本檔所在的樹；量 155a7e7f 基準時給基準 worktree（同一支治具、同一組事件）。
 *   一次只開一支瀏覽器；模式依序跑，不並行。
 *
 * 時間：攔下 requestAnimationFrame，以固定 1/60 秒手動推進（決定性；畫面與量測同一幀）。
 * 事件順序照 index.html 開標：ys:bid（擺錢）→ ys:reveal-slot（微距鏡頭，等 812ms）→ ys:reveal-result
 *   → 卡片等待後 ys:reveal-card。卡片等待由頁內讀「這一版」index.html 的同一條公式（新版 GRAB_MS＋GAP、舊版 max(900,T×1.4)）。
 * reveal-result 的 detail 帶 grabMs（新版 index.html 會帶 CFG.GRAB_ON?CFG.GRAB_MS:0；舊版 3D 層不認這個欄位）。
 *
 * 每幀量（全部在真實場景上量，不讀腳本內部）：
 *   法寶節點世界外接盒與螢幕外框、位置；每隻可見手的可見頂點（袖布漸隱 alpha<0.5 的不算）世界座標 →
 *   最低點、落進「非被抓拍品」外接盒的點數、西／東席越中線且不在被抓那件水平外框內又不高於其頂的點數、Palm 骨世界位置；
 *   HUD（#north、#feltHead、#south 與安全區條）與法寶螢幕外框的重疊面積；紙錢繩可見與粗度（px）。
 * 判定器遇「量不到」一律判紅（不記 null 當過）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root || HERE);
const MODES = String(opt.modes || 'award,curse,skip').split(',');
const TAG = opt.tag || (ROOT === HERE ? 'head' : path.basename(ROOT));
const OUT = path.resolve(opt.out || path.join(HERE, 'docs/experiments/2026-10-05-grab-hands/probe-' + TAG));
const PORT = Number(opt.port || 8996);
const EXTRA_Q = opt.q ? String(opt.q) : '';
const ROUNDS = Number(opt.rounds || 5);
const SHOTS = !!opt.shots;
fs.mkdirSync(OUT, { recursive: true });
const VP = { V1: { w: 852, h: 393, safe: [0, 59, 21, 59] }, V2: { w: 932, h: 430, safe: [0, 59, 21, 59] }, V3: { w: 844, h: 390, safe: [0, 47, 21, 47] }, V4: { w: 667, h: 375, safe: [0, 0, 0, 0] }, V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] } };
export const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const progress = (msg) => { fs.appendFileSync(path.join(OUT, 'progress.log'), new Date().toISOString() + ' ' + msg + '\n'); };

/* 情境：一般得標四席（西→槽 2、東→槽 1 都越中線）＋兩件更遠的越線（西→槽 3、東→槽 0）；詛咒兩組（北塞南、西塞東）。 */
export const AWARD = [
  { name: 'S', seat: 0, slot: 1, loser: 1 }, { name: 'N', seat: 1, slot: 2, loser: 0 },
  { name: 'W', seat: 2, slot: 2, loser: 3 }, { name: 'E', seat: 3, slot: 1, loser: 2 },
  { name: 'Wfar', seat: 2, slot: 3, loser: 0, extra: true }, { name: 'Efar', seat: 3, slot: 0, loser: 1, extra: true },
];
export const CURSE = [{ name: 'cNS', seat: 1, slot: 2, target: 0, loser: 3 }, { name: 'cWE', seat: 2, slot: 1, target: 3, loser: 0 }];

const PAGE_LIB = () => {
  window.__gp = {
    async setup(safe) {
      const st = document.createElement('style');
      st.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
      document.head.appendChild(st);
      const T = window.__yaoshi3d.tray;
      for (let i = 0; i < 200; i++) { window.__step0(); if (T.hands.loaded && T.hands.loaded()) break; await new Promise((r) => setTimeout(r, 30)); }
      await T.loaded(); await T.hands.ready();
      window.__base = T.items().map((it) => ({ key: it.key, curse: it.curse, curseKind: it.curseKind, fac: it.fac }));
      window.__tu = null;
      const u0 = T.update; T.update = function (dt) { const t0 = performance.now(); u0.call(T, dt); if (window.__tu) window.__tu.push(performance.now() - t0); };
      window.__step = (n = 1) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 60; const qq = window.__q; window.__q = []; for (const cb of qq) cb(window.__now); } };
      window.__step(3);
      window.__THREE = await import('three');
      window.__rnd = 0; const R0 = Math.random; Math.random = function () { window.__rnd++; return R0.call(Math); }; // 驗收 #1：演出期間 Math.random 呼叫數
    },
    async reset(slot, curse) {
      const T = window.__yaoshi3d.tray;
      T.hands.finish(); T.props.clearRound(); T.hands.clear(); T.setItems([]);
      const list = window.__base.map((x) => Object.assign({}, x));
      if (curse) list[slot] = { key: null, curse: true, curseKind: 'wedding', fac: null };
      T.setItems(list);
      document.getElementById('stage').innerHTML = '';
      document.dispatchEvent(new CustomEvent('ys:reveal-card', { detail: { winner: null } }));
      window.__step(2); await T.loaded(); window.__step(90);
      const xs = T.slotXs();
      window.__nodes = [0, 1, 2, 3].map((i) => { let n = null; T.group.traverse((o) => { if (!n && o.parent === T.group && o.isGroup && o.visible && Math.abs(o.position.x - xs[i]) < 1e-3 && o.name !== 'table-hands' && o.name !== 'curse-rope-group') n = o; }); return n; });
      window.__slot = slot;
      const THREE = window.__THREE, b = new THREE.Box3().setFromObject(window.__nodes[slot]);
      window.__rest = { top: b.max.y, pos: window.__nodes[slot].position.toArray() };
      return { found: window.__nodes.map(Boolean), rest: window.__rest };
    },
    cardWaitMs() { return (typeof CFG !== 'undefined' && CFG.GRAB_ON && CFG.GRAB_MS) ? CFG.GRAB_MS + CFG.GRAB_CARD_GAP_MS : Math.max(900, CFG.T * 1.4); },
    grabMsDetail() { return (typeof CFG !== 'undefined' && CFG.GRAB_ON && CFG.GRAB_MS) ? CFG.GRAB_MS : 0; },
    rect(sel) { const e = document.querySelector(sel); if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return r.width && r.height ? [r.left, r.top, r.right, r.bottom] : null; },
    measure(ctx) {
      const THREE = window.__THREE, Y = window.__yaoshi3d, T = Y.tray, cam = Y.camera, cw = innerWidth, ch = innerHeight;
      const slot = window.__slot, nodes = window.__nodes, node = nodes[slot];
      const tableY = T.props.tableY();
      /* 共用骨架（shareSkeletons）的 boneMatrices 只在 render 時更新：先把每件拍品的世界矩陣與骨架刷到這一幀，再量（否則讀到舊姿勢） */
      for (const n of nodes) if (n) { n.updateMatrixWorld(true); n.traverse((m) => { if (m.isSkinnedMesh) { m.skeleton.update(); m.computeBoundingBox(); } }); }
      const box = (n) => (n && n.visible ? new THREE.Box3().setFromObject(n) : null);
      const others = nodes.map((n, i) => (i === slot ? null : box(n)));
      const proj = (b) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const v = new THREE.Vector3(); for (let k = 0; k < 8; k++) { v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).project(cam); const sx = (v.x + 1) / 2 * cw, sy = (1 - v.y) / 2 * ch; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } return [x0, y0, x1, y1]; };
      const out = { item: null, hands: {}, hud: null, rope: null };
      const ib = box(node);
      /* HUD 判定用「看得見的包圍框」：只取 traverseVisible 的 mesh，蒙皮件依這一幀的骨架姿勢重算外接盒
         （與取景 table-framing.js subjectCorners 同一口徑；Box3.setFromObject 會把隱藏的描邊外殼也算進去）。
         條件 4 的「非被抓拍品包圍盒」仍用 setFromObject（較大＝較嚴）。 */
      const vbox = (n) => { if (!n || !n.visible) return null; const B = new THREE.Box3(), t = new THREE.Box3(); n.updateMatrixWorld(true);
        n.traverseVisible((m) => { if (!m.isMesh || !m.geometry) return; if (m.isSkinnedMesh) { m.computeBoundingBox(); t.copy(m.boundingBox); } else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); t.copy(m.geometry.boundingBox); } if (t.isEmpty()) return; t.applyMatrix4(m.matrixWorld); B.union(t); }); return B.isEmpty() ? null : B; };
      const vb = vbox(node);
      /* 螢幕包圍框＝看得見的每個頂點（蒙皮件套這一幀骨架、Instanced 件逐實例）投影後的外框——精確、獨立於取景程式 */
      const vproj = (n) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, k = 0; const w = new THREE.Vector3(), M = new THREE.Matrix4(), MI = new THREE.Matrix4();
        n.traverseVisible((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return; const P = m.geometry.attributes.position; if (m.isSkinnedMesh) m.skeleton.update();
          const inst = m.isInstancedMesh ? m.count : 1;
          for (let q = 0; q < inst; q++) { if (m.isInstancedMesh) { m.getMatrixAt(q, MI); M.multiplyMatrices(m.matrixWorld, MI); } else M.copy(m.matrixWorld);
            for (let i = 0; i < P.count; i++) { w.fromBufferAttribute(P, i); if (m.isSkinnedMesh) m.applyBoneTransform(i, w); w.applyMatrix4(M).project(cam); const sx = (w.x + 1) / 2 * cw, sy = (1 - w.y) / 2 * ch; if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy; k++; } } });
        return k ? [x0, y0, x1, y1] : null; };
      const sbv = vb ? vproj(node) : null;
      if (ib && vb && sbv) {
        const sb = sbv;
        const huds = [['#north', this.rect('#north')], ['#feltHead', this.rect('#feltHead')], ['#south', this.rect('#south')],
          ['safeL', ctx.safe[3] ? [0, 0, ctx.safe[3], ch] : null], ['safeR', ctx.safe[1] ? [cw - ctx.safe[1], 0, cw, ch] : null], ['safeB', ctx.safe[2] ? [0, ch - ctx.safe[2], cw, ch] : null], ['offscreen', null]];
        const ov = {}; let total = 0;
        for (const [k, r] of huds) { if (!r) continue; const ix = Math.max(0, Math.min(r[2], sb[2]) - Math.max(r[0], sb[0])), iy = Math.max(0, Math.min(r[3], sb[3]) - Math.max(r[1], sb[1])); if (ix * iy > 0) { ov[k] = Math.round(ix * iy); total += ix * iy; } }
        const offArea = (sb[2] - sb[0]) * (sb[3] - sb[1]) - Math.max(0, Math.min(cw, sb[2]) - Math.max(0, sb[0])) * Math.max(0, Math.min(ch, sb[3]) - Math.max(0, sb[1]));
        if (offArea > 0.5) { ov.offscreen = Math.round(offArea); total += offArea; }
        out.item = { pos: node.position.toArray(), box: [ib.min.x, ib.min.y, ib.min.z, ib.max.x, ib.max.y, ib.max.z], vbox: [vb.min.x, vb.min.y, vb.min.z, vb.max.x, vb.max.y, vb.max.z], screen: sb.map((x) => Math.round(x)), screenAABB: proj(vb).map((x) => Math.round(x)), area: Math.round((sb[2] - sb[0]) * (sb[3] - sb[1])) };
        out.hud = { overlapPx: Math.round(total), parts: ov };
      } else out.item = { pos: node ? node.position.toArray() : null, hidden: true };
      const foot = ib ? { x0: ib.min.x, x1: ib.max.x, z0: ib.min.z, z1: ib.max.z } : null;
      const v = new THREE.Vector3();
      for (const holder of T.hands.group.children) {
        if (!holder.visible) continue;
        const seat = +holder.name.split('-')[1]; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
        holder.updateMatrixWorld(true); mesh.skeleton.update();
        const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color;
        let n = 0, minY = 1e9, inOther = 0, mid = 0, maxX = -1e9, minX = 1e9, near = 1e9; const otherSlots = new Set();
        for (let i = 0; i < pos.count; i++) {
          if (col && col.itemSize === 4 && col.getW(i) < 0.5) continue;
          v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); n++;
          if (v.y < minY) minY = v.y; if (v.x > maxX) maxX = v.x; if (v.x < minX) minX = v.x;
          if (vb) { const ex = Math.max(vb.min.x - v.x, 0, v.x - vb.max.x), ey = Math.max(vb.min.y - v.y, 0, v.y - vb.max.y), ez = Math.max(vb.min.z - v.z, 0, v.z - vb.max.z), dd = Math.hypot(ex, ey, ez); if (dd < near) near = dd; }
          others.forEach((b, k) => { if (b && b.containsPoint(v)) { inOther++; otherSlots.add(k); } });
          if ((seat === 2 && v.x > 0) || (seat === 3 && v.x < 0)) {
            const inFoot = foot && v.x >= foot.x0 && v.x <= foot.x1 && v.z >= foot.z0 && v.z <= foot.z1;
            if (!inFoot && !(v.y > window.__rest.top)) mid++;
          }
        }
        const palm = mesh.skeleton.bones.find((b) => b.name === 'Palm'); const pw = new THREE.Vector3(); if (palm) palm.getWorldPosition(pw);
        const pp = pw.clone().project(cam);
        out.hands[seat] = { n, lift: T.hands.liftOf ? +T.hands.liftOf(seat).toFixed(4) : null, why: T.hands.liftWhy ? T.hands.liftWhy(seat) : null, nearItem: +near.toFixed(4), minY: +minY.toFixed(4), inOther, otherSlots: [...otherSlots], midBelowTop: mid, minX: +minX.toFixed(3), maxX: +maxX.toFixed(3), palm: pw.toArray().map((x) => +x.toFixed(4)), palmScreen: [Math.round((pp.x + 1) / 2 * cw), Math.round((1 - pp.y) / 2 * ch)] };
      }
      let rope = null; T.group.traverse((o) => { if (o.name === 'curse-rope-group') rope = o; });
      if (rope) {
        const tube = rope.children.find((c) => c.name === 'curse-rope');
        let vis = rope.visible; for (let p = rope.parent; p; p = p.parent) vis = vis && p.visible;
        out.rope = { visible: vis, geo: tube.geometry.uuid };
        if (vis) {
          /* 粗度：直段中點（局部 z＝LEN/2）沿相機右向量 ±管徑投影的像素距離 */
          const R = (Y.TRAY && Y.TRAY.ROPE) || T.TRAY?.ROPE || { R: 0.011, LEN: 0.18 };
          rope.updateMatrixWorld(true);
          const c = new THREE.Vector3(0, 0.04, (R.LEN || 0.18) / 2).applyMatrix4(rope.matrixWorld);
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), sc = rope.scale.x;
          const a = c.clone().addScaledVector(right, R.R * sc).project(cam), b = c.clone().addScaledVector(right, -R.R * sc).project(cam);
          out.rope.px = +Math.hypot((a.x - b.x) / 2 * cw, (a.y - b.y) / 2 * ch).toFixed(2);
        }
      }
      out.framing = { active: !!(Y.framing && Y.framing.active), fit: !!(Y.framing && Y.framing.fit) };
      out.felt = this.rect('#felt');
      out.grabState = T.grabState ? T.grabState() : null;
      out.handsVisible = T.hands.group.children.filter((h) => h.visible).map((h) => +h.name.split('-')[1]);
      out.tableY = tableY;
      return out;
    },
  };
};

export async function withServer(fn) {
  const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  try { return await fn(); } finally { server.kill(); }
}
export async function openPage(browser, vpName, q) {
  const vp = VP[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  /* 決定性：頁面的 Math.random（煙、火星等環境粒子）換成固定種子的 mulberry32——新舊兩版吃同一串，逐幀像素才可比（#11），
     演出期間的呼叫數也才可比（#1）。不影響引擎：引擎用自己的種子亂數（trace 不碰 Math.random，見 grab-trace-check）。 */
  await ctx.addInitScript(() => { let a = 0x9e3779b9; window.__rndN = 0; Math.random = function () { window.__rndN++; a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  /* 時間從頭就由治具給：rAF 進佇列、時鐘停在 1e9（開局流程中只推「0 秒」的幀——渲染照跑、累積時間不動），
     setup 之後才每步 +1/60 秒。這樣環境動畫（燈籠閃爍、煙）的相位與開局花了多久真實時間無關，新舊兩版逐幀可比。 */
  await ctx.addInitScript(() => { window.__now = 1e9; window.__q = []; window.requestAnimationFrame = (cb) => { window.__q.push(cb); return 0; }; window.__step0 = () => { const qq = window.__q; window.__q = []; for (const cb of qq) cb(window.__now); }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${q ? '?' + q : ''}`);
  await page.waitForFunction(() => { window.__step0(); return window.__yaoshi3d?.tray && window.__yaoshi; }, null, { timeout: 90000, polling: 50 }); // 先等 tray 再開局
  await page.evaluate(() => { CFG.T = 650; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20); await page.evaluate(() => window.__step0());
  }
  await page.evaluate(PAGE_LIB);
  await page.evaluate((safe) => window.__gp.setup(safe), vp.safe);
  return { ctx, page, errs, vp };
}
export const ev = (page, n, d) => page.evaluate(([n, d]) => document.dispatchEvent(new CustomEvent(n, { detail: d })), [n, d]);
export const step = (page, n) => page.evaluate((n) => window.__step(n), n);

/** 跑一個情境：擺錢 → 微距 → 結算 → 逐幀量（與可選連拍）。回 { frames, cardMs, landed… }。 */
async function runScenario(page, vp, sc, isCurse, { shots = false, prefix = '', totalS = 2.0, perf = false, skipAt = null } = {}) {
  const rs = await page.evaluate(([slot, c]) => window.__gp.reset(slot, c), [sc.slot, isCurse]);
  await ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await step(page, 50);
  await ev(page, 'ys:bid', { seat: sc.loser, slot: sc.slot, amount: 4 }); await step(page, 70);
  if (isCurse) { await ev(page, 'ys:bid', { seat: sc.target, slot: (sc.slot + 2) % 4, amount: 3 }); await step(page, 70); }
  await ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await step(page, 49);
  const cardMs = await page.evaluate(() => window.__gp.cardWaitMs());
  const grabMs = await page.evaluate(() => window.__gp.grabMsDetail());
  if (perf) await page.evaluate(() => { window.__tu = []; });
  const rnd0 = await page.evaluate(() => window.__rnd);
  await ev(page, 'ys:reveal-result', { winner: sc.seat, slot: sc.slot, transferTarget: isCurse ? sc.target : null, destroy: false, grabMs, skip: false });
  const frames = []; let cardSent = false, skipped = null; let fi = 0;
  const N = Math.round(totalS * 60);
  for (let f = 0; f <= N; f++) {
    if (f > 0) await step(page, 1);
    const tms = Math.round(f * 1000 / 60);
    if (!cardSent && tms >= cardMs) { await ev(page, 'ys:reveal-card', { winner: sc.seat }); cardSent = tms; }
    if (skipAt !== null && skipped === null && tms >= skipAt) {
      const before = perf ? null : await page.evaluate((safe) => window.__gp.measure({ safe }), vp.safe);
      await ev(page, 'ys:fx-trait-cancel', {}); await step(page, 1);
      const after = await page.evaluate((safe) => window.__gp.measure({ safe }), vp.safe);
      skipped = { atMs: tms, before, after };
      break;
    }
    if (!perf) {
      const m = await page.evaluate((safe) => window.__gp.measure({ safe }), vp.safe);
      frames.push({ f, tms, ...m });
      if (shots && f % 6 === 0) { await page.screenshot({ path: path.join(OUT, `${prefix}${sc.name}-${String(fi).padStart(2, '0')}-${String(tms).padStart(4, '0')}ms.png`) }); fi++; }
    }
  }
  const tu = perf ? await page.evaluate(() => { const a = window.__tu.slice(); window.__tu = null; return a; }) : null;
  const randomCalls = (await page.evaluate(() => window.__rnd)) - rnd0;
  return { randomCalls, scenario: sc, isCurse, rest: rs.rest, found: rs.found, cardMs, grabMs, cardSentMs: cardSent, frames, skipped, tu };
}

/* ── 判定器（純函式；量不到判紅）─────────────────────────────────── */
const SEAT_XZ = [[0, 1.22], [0, -1.92], [-1.38, 0.98], [1.36, 1.06]];
export function judgeAward(run) {
  const fr = run.frames, sc = run.scenario, out = { name: sc.name, seat: sc.seat, slot: sc.slot };
  const p0 = run.rest.pos;
  const moving = fr.findIndex((x) => x.item && x.item.pos && Math.hypot(x.item.pos[0] - p0[0], x.item.pos[1] - p0[1], x.item.pos[2] - p0[2]) > 1e-3);
  /* 終點＝最後一幀（含已隱藏）的位置；落定＝此後位置都在終點 2mm 內的最早一幀 */
  const fin = fr[fr.length - 1]?.item?.pos;
  let landed = null;
  if (fin && moving >= 0) for (let i = fr.length - 1; i >= moving; i--) { const p = fr[i].item.pos; if (!p || Math.hypot(p[0] - fin[0], p[1] - fin[1], p[2] - fin[2]) > 0.002) { landed = fr[i + 1] ? fr[i + 1].tms : null; break; } }
  out.landedMs = landed; out.movedFromMs = moving >= 0 ? fr[moving].tms : null;
  out.timeOK = landed !== null && landed <= 1300;
  /* 掙扎：從開始移動到落定，法寶（世界座標）相對「席位→法寶原位」這條直線的側向位移，扣掉頭尾連線（去掉平移）之後，
     正負峰交替 ≥2 次且振幅 > 0.002。舊版拋物線沿直線飛 ⇒ 側向恆 0 ⇒ 紅；拿掉掙扎 ⇒ 只剩平滑路徑 ⇒ 紅。量不到（沒移動／沒落定）判紅。 */
  const [sx, sz] = SEAT_XZ[sc.seat]; const dx = p0[0] - sx, dz = p0[2] - sz, l = Math.hypot(dx, dz) || 1, lx = dz / l, lz = -dx / l;
  const rel = [];
  if (moving >= 0 && landed !== null) for (const x of fr) { if (x.tms < fr[moving].tms || x.tms > landed) continue; if (!x.item.pos) { rel.push(null); continue; } rel.push((x.item.pos[0] - p0[0]) * lx + (x.item.pos[2] - p0[2]) * lz); }
  const ok = rel.filter((x) => x !== null);
  let peaks = 0, amp = 0;
  if (ok.length >= 5 && ok.length === rel.length) {
    const n = ok.length - 1, d = ok.map((x, i) => x - (ok[0] + (ok[n] - ok[0]) * i / n)); let sign = 0;
    for (let i = 1; i < d.length - 1; i++) { const isMax = d[i] > d[i - 1] && d[i] >= d[i + 1], isMin = d[i] < d[i - 1] && d[i] <= d[i + 1]; if ((isMax || isMin) && Math.abs(d[i]) > 0.002) { const sg = Math.sign(d[i]); if (sg !== sign) { peaks++; sign = sg; } amp = Math.max(amp, Math.abs(d[i])); } }
  }
  out.struggle = { samples: rel.length, missing: rel.length - ok.length, alternatingPeaks: peaks, amp: +amp.toFixed(4) };
  out.struggleOK = peaks >= 2 && amp > 0;
  out.pass2 = out.timeOK && out.struggleOK;
  Object.assign(out, judgeCommon(run, moving, landed));
  return out;
}
/** 條件 3／4／5／7 的共用量：held＝開始移動 → 落定。 */
function judgeCommon(run, moving, landed) {
  const fr = run.frames, sc = run.scenario, o = {};
  const held = moving >= 0 && landed !== null ? fr.filter((x) => x.tms >= fr[moving].tms && x.tms <= landed) : [];
  o.heldFrames = held.length;
  const hudBad = held.filter((x) => !x.hud || x.hud.overlapPx > 0);
  o.hud = { frames: held.length, badFrames: hudBad.length, first: hudBad[0] ? { tms: hudBad[0].tms, parts: hudBad[0].hud && hudBad[0].hud.parts } : null };
  o.pass3 = held.length > 0 && hudBad.length === 0;
  /* 條件 4 判在「抓取類的手」上（得標席；詛咒的施放者與受害者）：敗方扒回（rake）屬條件 5 凍結為與 155a7e7f 逐幀相等的舊動作，
     它的穿入另列 legacyInOther 照實回報（不計入本條）。量不到（抓取手從沒出現）判紅。 */
  const grabSeat = run.isCurse ? [sc.seat, sc.target] : [sc.seat];
  let inOther = 0, legacy = 0, minY = Infinity, mid = 0, firstIn = null, firstMid = null, gFrames = 0; const minYSeat = {};
  for (const x of fr) { let g = false; for (const s in x.hands) { const h = x.hands[s]; minYSeat[s] = Math.min(minYSeat[s] ?? Infinity, h.minY);
    if (!grabSeat.includes(+s)) { legacy += h.inOther; continue; }
    g = true; inOther += h.inOther; if (h.inOther && !firstIn) firstIn = { tms: x.tms, seat: +s, slots: h.otherSlots, n: h.inOther }; if (h.minY < minY) minY = h.minY;
    if (h.midBelowTop) { mid += h.midBelowTop; if (!firstMid) firstMid = { tms: x.tms, seat: +s, n: h.midBelowTop }; } } if (g) gFrames++; }
  const tableY = fr[0]?.tableY;
  o.hands = { grabHandFrames: gFrames, inOtherItemBox: inOther, firstIn, minY: Number.isFinite(minY) ? +minY.toFixed(4) : null, minYBySeat: minYSeat, tableY, legacyInOther: legacy };
  o.pass4 = gFrames > 0 && inOther === 0 && Number.isFinite(minY) && minY >= tableY;
  o.mid = { belowTopPoints: mid, first: firstMid };
  o.pass5mid = mid === 0;
  /* 條件 7：卡片時間 ≥ 落定；搬運途中法寶與被抓的手（Palm）都在 #felt 掏空窗內 */
  const holderSeat = sc.seat;
  const palmOut = held.filter((x) => { const h = x.hands[holderSeat], f = x.felt; return !h || !f || h.palmScreen[0] < f[0] || h.palmScreen[0] > f[2] || h.palmScreen[1] < f[1] || h.palmScreen[1] > f[3]; });
  o.card = { cardMs: run.cardSentMs, landedMs: landed, ok: landed !== null && run.cardSentMs !== false && run.cardSentMs >= landed };
  o.frame7 = { held: held.length, palmOutsideFelt: palmOut.length, firstOut: palmOut[0] ? palmOut[0].tms : null };
  o.pass7 = o.card.ok && held.length > 0 && palmOut.length === 0 && hudBad.length === 0;
  return o;
}
export function judgeCurse(run) {
  const fr = run.frames, sc = run.scenario, out = { name: sc.name, caster: sc.seat, victim: sc.target, slot: sc.slot };
  const p0 = run.rest.pos;
  const moving = fr.findIndex((x) => x.item && x.item.pos && Math.hypot(x.item.pos[0] - p0[0], x.item.pos[1] - p0[1], x.item.pos[2] - p0[2]) > 1e-3);
  /* 落定＝符紙堆第一次到達「受害者手背上」並停住：從開始移動起，之後連續 6 幀位移 < 2mm 的最早一幀 */
  let landed = null;
  if (moving >= 0) for (let i = moving; i < fr.length - 6; i++) { const p = fr[i].item.pos; if (!p) continue; let still = true; for (let j = 1; j <= 6; j++) { const q = fr[i + j].item.pos; if (!q || Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > 0.002) { still = false; break; } } if (still) { landed = fr[i].tms; break; } }
  out.landedMs = landed; out.timeOK = landed !== null && landed <= 1300;
  /* 施放者＝推的那隻手：開始移動到落定之間，離法寶最近的可見手必須是毒標得標席 */
  const pushers = new Map();
  /* 開始移動到落定之間，每隻手「貼著符紙堆」（可見頂點離其可見外接盒 ≤ 0.01）的幀數；最多的那隻就是推的那隻 */
  if (moving >= 0 && landed !== null) for (const x of fr) { if (x.tms < fr[moving].tms || x.tms > landed || !x.item.pos) continue; for (const s in x.hands) if (x.hands[s].nearItem <= 0.01) pushers.set(+s, (pushers.get(+s) || 0) + 1); }
  const top = [...pushers.entries()].sort((a, b) => b[1] - a[1])[0];
  out.pusher = top ? top[0] : null; out.casterOK = out.pusher === sc.seat;
  /* 被按住階段＝落定 → 施放者手消失；受害者 Palm 抖動：任一軸的高頻分量正負交替峰 ≥2、振幅 > 0.001 */
  /* 被按住階段＝落定之後、施放者的手還貼在符紙堆上（可見頂點離其外接盒 ≤ 0.03）且受害者的手在場的幀 */
  const hold = landed !== null ? fr.filter((x) => x.tms >= landed && x.hands[sc.seat] && x.hands[sc.target] && x.hands[sc.seat].nearItem <= 0.03) : [];
  const vy = hold.map((x) => x.hands[sc.target].palm);
  let trem = { samples: vy.length, peaks: 0, amp: 0 };
  if (vy.length >= 6) {
    for (const axis of [0, 1, 2]) {
      /* 顫抖＝去掉慢速位移（前後 3 幀移動平均）之後剩下的高頻分量 */
      const a = vy.map((p) => p[axis]), d = a.map((x, i) => { const w = a.slice(Math.max(0, i - 3), i + 4); return x - w.reduce((s, y) => s + y, 0) / w.length; }); let pk = 0, sg0 = 0, am = 0;
      for (let i = 1; i < d.length - 1; i++) { if (((d[i] > d[i - 1] && d[i] >= d[i + 1]) || (d[i] < d[i - 1] && d[i] <= d[i + 1])) && Math.abs(d[i]) > 0.001) { const sg = Math.sign(d[i]); if (sg !== sg0) { pk++; sg0 = sg; } am = Math.max(am, Math.abs(d[i])); } }
      if (pk > trem.peaks) trem = { samples: vy.length, peaks: pk, amp: +am.toFixed(4), axis };
    }
  }
  out.tremble = trem; out.trembleOK = trem.peaks >= 2 && trem.amp > 0;
  /* 繩：可見幀 ⊆ 被按住階段；粗度（844 寬）≥3px；幾何 uuid 全程不變（0 次重建） */
  const holdSet = new Set(hold.map((x) => x.tms));
  const ropeVis = fr.filter((x) => x.rope && x.rope.visible);
  const outside = ropeVis.filter((x) => !holdSet.has(x.tms));
  const uuids = new Set(fr.filter((x) => x.rope).map((x) => x.rope.geo));
  const px = ropeVis.map((x) => x.rope.px).filter((x) => x !== undefined);
  out.rope = { visibleFrames: ropeVis.length, holdFrames: hold.length, outsideHold: outside.length, minPx: px.length ? Math.min(...px) : null, geometries: uuids.size };
  /* 出現：至少 12 幀（0.2 秒）可見，且每一幀都落在被按住階段內 */
  out.ropeOK = ropeVis.length >= 12 && hold.length > 0 && outside.length === 0 && px.length > 0 && Math.min(...px) >= 3 && uuids.size === 1;
  Object.assign(out, judgeCommon(Object.assign({}, run, { scenario: Object.assign({}, sc) }), moving, landed));
  out.pass8 = out.timeOK && out.casterOK && out.trembleOK && out.ropeOK;
  return out;
}

async function main() {
  progress(`start root=${ROOT} modes=${MODES} q=${EXTRA_Q}`);
  const results = { root: ROOT, tag: TAG, git: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch (e) { return null; } })(), dirty: (() => { try { return execFileSync('git', ['status', '--short', '--', 'js', 'index.html'], { cwd: ROOT }).toString(); } catch (e) { return null; } })(), modes: {} };
  await withServer(async () => {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
    try {
      for (const mode of MODES) {
        const t0 = Date.now(); progress('mode ' + mode);
        if (mode === 'award' || mode === 'curse') {
          const vpName = opt.vp || 'V3';
          const { ctx, page, errs, vp } = await openPage(browser, vpName, EXTRA_Q);
          const list = mode === 'award' ? AWARD : CURSE, rows = [];
          for (const sc of list) {
            const run = await runScenario(page, vp, sc, mode === 'curse', { shots: SHOTS, prefix: mode + '-' + vpName + '-', totalS: 2.0 });
            const j = mode === 'award' ? judgeAward(run) : judgeCurse(run);
            j.randomCalls = run.randomCalls;
            rows.push(j); fs.writeFileSync(path.join(OUT, `raw-${mode}-${vpName}-${sc.name}.json`), JSON.stringify(run));
            progress(`${mode} ${sc.name} ${JSON.stringify({ landed: j.landedMs, p2: j.pass2, p3: j.pass3, p4: j.pass4, p5: j.pass5mid, p7: j.pass7, p8: j.pass8 })}`);
          }
          results.modes[mode + '-' + vpName] = { rows, errs };
          await ctx.close();
        } else if (mode === 'hud') {
          const rows = [];
          for (const vpName of Object.keys(VP)) {
            const { ctx, page, errs, vp } = await openPage(browser, vpName, EXTRA_Q);
            for (const [list, isC] of [[AWARD, false], [CURSE, true]]) for (const sc of list) {
              const run = await runScenario(page, vp, sc, isC, { totalS: 2.0 });
              const j = isC ? judgeCurse(run) : judgeAward(run);
              rows.push({ vp: vpName, name: sc.name, landedMs: j.landedMs, hud: j.hud, pass3: j.pass3, frame7: j.frame7, card: j.card, pass7: j.pass7, pass4: j.pass4, hands: j.hands, mid: j.mid });
              progress(`hud ${vpName} ${sc.name} p3=${j.pass3} p7=${j.pass7} bad=${j.hud.badFrames}/${j.hud.frames}`);
            }
            rows.push({ vp: vpName, errs });
            await ctx.close();
          }
          results.modes.hud = rows;
        } else if (mode === 'skip') {
          const { ctx, page, errs, vp } = await openPage(browser, 'V3', EXTRA_Q);
          const rows = [];
          const cases = [];
          for (const sc of AWARD.filter((x) => !x.extra)) for (const at of [100, 400, 700, 1000, 1250, 1500]) cases.push([sc, false, at]);
          for (const sc of CURSE) for (const at of [500 /* 推 */, 1100 /* 按住 */, 1450 /* 收手／拖回 */]) cases.push([sc, true, at]);
          for (const [sc, isC, at] of cases) {
            const run = await runScenario(page, vp, sc, isC, { skipAt: at, totalS: 2.0 });
            const b = run.skipped && run.skipped.before, a = run.skipped && run.skipped.after;
            const st = b && b.grabState && b.grabState.find((g) => g.slot === sc.slot);
            const dest = st ? st.dest : null;
            const atEnd = !!(a && dest && a.item && a.item.pos && Math.hypot(a.item.pos[0] - dest.x, a.item.pos[1] - dest.y, a.item.pos[2] - dest.z) < 1e-6);
            const noHands = !!(a && a.handsVisible && a.handsVisible.length === 0);
            const pass = atEnd && noHands;
            rows.push({ name: sc.name, curse: isC, skipAtMs: at, dest, after: a ? { item: a.item, handsVisible: a.handsVisible } : null, atEnd, noHands, pass });
            progress(`skip ${sc.name}@${at} pass=${pass}`);
          }
          results.modes.skip = { rows, errs, pass: rows.length > 0 && rows.every((r) => r.pass) };
          await ctx.close();
        } else if (mode === 'perf') {
          const rounds = [];
          for (let r = 0; r < ROUNDS; r++) {
            const { ctx, page, vp } = await openPage(browser, 'V3', EXTRA_Q);
            const all = [];
            for (const [list, isC] of [[AWARD.filter((x) => !x.extra), false], [CURSE, true]]) for (const sc of list) { const run = await runScenario(page, vp, sc, isC, { perf: true, totalS: 1.8 }); all.push(...run.tu); }
            all.sort((a, b) => a - b);
            rounds.push({ n: all.length, p50: all[Math.floor(all.length * 0.5)], p95: all[Math.floor(all.length * 0.95)], max: all[all.length - 1] });
            progress(`perf round ${r} ${JSON.stringify(rounds[r])}`);
            await ctx.close();
          }
          const p95s = rounds.map((x) => x.p95).sort((a, b) => a - b);
          results.modes.perf = { rounds, medianP95: p95s[Math.floor(p95s.length / 2)] };
        } else if (mode === 'pixel') {
          /* 逐幀像素：同一組事件、每 3 幀一張 PNG，寫到 OUT/pixel-<tag>/；比對由 grab-pixel-diff（下方 --diff）做 */
          const dir = path.join(OUT, 'pixel'); fs.mkdirSync(dir, { recursive: true });
          const { ctx, page, vp } = await openPage(browser, 'V3', EXTRA_Q);
          /* 環境香煙／燈籠火星的 Math.random 消耗會隨 GLB 載入先後交錯而漂（新舊兩版都一樣漂，與抓取無關）：兩邊一律藏起來再比。
             桌面、拍品、錢、令牌、手、繩全數照常入鏡比對。 */
          await page.evaluate(() => { const Y = window.__yaoshi3d; for (const k of ['smoke', 'embers']) if (Y[k] && Y[k].points) { Y[k].points.visible = false; Object.defineProperty(Y[k].points, 'visible', { get: () => false, set() {} }); } });
          let n = 0;
          for (const [list, isC] of [[AWARD.filter((x) => !x.extra), false], [CURSE, true]]) for (const sc of list) {
            await page.evaluate(([slot, c]) => window.__gp.reset(slot, c), [sc.slot, isC]);
            await ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await step(page, 50);
            await ev(page, 'ys:bid', { seat: sc.loser, slot: sc.slot, amount: 4 }); await step(page, 70);
            if (isC) { await ev(page, 'ys:bid', { seat: sc.target, slot: (sc.slot + 2) % 4, amount: 3 }); await step(page, 70); }
            await ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await step(page, 49);
            /* 兩邊送同一份 detail（grabMs 固定 1260）：?grab=0 必須自己關掉，不靠 index.html 不送 */
            await ev(page, 'ys:reveal-result', { winner: sc.seat, slot: sc.slot, transferTarget: isC ? sc.target : null, destroy: false, grabMs: 1260, skip: false });
            for (let f = 0; f <= 108; f += 3) { if (f) await step(page, 3); await page.screenshot({ path: path.join(dir, `${sc.name}-${String(f).padStart(3, '0')}.png`) }); n++; }
          }
          results.modes.pixel = { dir, shots: n };
          await ctx.close();
        }
        progress(`mode ${mode} done ${(Date.now() - t0) / 1000}s`);
      }
    } finally { await browser.close(); }
  });
  fs.writeFileSync(path.join(OUT, 'result-' + MODES.join('_') + '.json'), JSON.stringify(results, null, 1));
  const brief = {};
  for (const k in results.modes) {
    const m = results.modes[k];
    if (Array.isArray(m?.rows)) brief[k] = m.rows.map((r) => ({ rnd: r.randomCalls, n: r.name, landed: r.landedMs, p2: r.pass2, p3: r.pass3, p4: r.pass4, p5mid: r.pass5mid, p7: r.pass7, p8: r.pass8, strug: r.struggle, rope: r.rope, trem: r.tremble, pusher: r.pusher, hudBad: r.hud && r.hud.badFrames, inOther: r.hands && r.hands.inOtherItemBox, minY: r.hands && r.hands.minY, mid: r.mid && r.mid.belowTopPoints, card: r.card }));
    else brief[k] = m;
  }
  console.log(JSON.stringify(brief, null, 1));
  progress('done');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
