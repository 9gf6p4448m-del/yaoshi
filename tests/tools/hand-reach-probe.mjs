/* 手的伸展範圍（REACH）量測：node 版真 props＋真 hands（同 tests/hand-fixture.mjs），1/60 秒步進。
   用法：node tests/tools/hand-reach-probe.mjs [--json=<out>] [--layout=L]
   ① slam：四席×四槽，單席拍令牌，落地後逐幀取手（袖口邊以前）真實蒙皮頂點 vs 令牌 3D AABB，記最小 3D 間距 gap3（公尺）與是否相交。
   ② 碰撞計數：四席同時拍（槽 = (席+shift)%4，shift 0..3）＋同時擺錢，逐幀數「手 AABB × 別席手 AABB」「手 AABB × 別槽令牌／別槽錢柱」的相交幀數。
   也可 import：measureSlam()／measureCollisions()。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THREE, M, loadProps, loadHands, LAYOUTS } from '../hand-fixture.mjs';
const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 60, NAME = ['南', '北', '西', '東'];
const TK = { W: 0.075, H: 0.095, T: 0.05 };
async function rig(layout) {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS[layout]);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready();
  parent.updateMatrixWorld(true);
  return { parent, props, hands };
}
const step = (r) => { r.props.update(DT); r.hands.update(DT); r.parent.updateMatrixWorld(true); };
const v = new THREE.Vector3();
/** 某席手（看得見的部分，袖口邊以前）的世界 AABB；不可見回 null。 */
function handBox(r, seat) {
  const h = r.hands.group.children[seat]; if (!h || !h.visible) return null;
  let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); if (!mesh) return null;
  mesh.skeleton.update(); const P = mesh.geometry.attributes.position;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < P.count; i++) {
    if (P.getZ(i) < M.HAND.SLEEVE.CUFF_TO) continue;
    mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
    if (v.x < mn[0]) mn[0] = v.x; if (v.y < mn[1]) mn[1] = v.y; if (v.z < mn[2]) mn[2] = v.z;
    if (v.x > mx[0]) mx[0] = v.x; if (v.y > mx[1]) mx[1] = v.y; if (v.z > mx[2]) mx[2] = v.z;
  }
  return { mn, mx, mesh };
}
function handVerts(r, seat) {
  const b = handBox(r, seat); if (!b) return null;
  const P = b.mesh.geometry.attributes.position, out = [];
  for (let i = 0; i < P.count; i++) { if (P.getZ(i) < M.HAND.SLEEVE.CUFF_TO) continue; b.mesh.getVertexPosition(i, v); v.applyMatrix4(b.mesh.matrixWorld); out.push([v.x, v.y, v.z]); }
  return out;
}
const gap3 = (pts, mn, mx) => { let g = 1e9; for (const p of pts) g = Math.min(g, Math.hypot(Math.max(0, mn[0] - p[0], p[0] - mx[0]), Math.max(0, mn[1] - p[1], p[1] - mx[1]), Math.max(0, mn[2] - p[2], p[2] - mx[2]))); return g; };
export async function measureSlam({ layout = 'L', seats = [0, 1, 2, 3], slots = [0, 1, 2, 3] } = {}) {
  const r = await rig(layout), out = [];
  for (const seat of seats) for (const slot of slots) {
    r.props.clearRound(); r.hands.clear(); for (let i = 0; i < 12; i++) step(r);
    r.props.mark(seat, slot); r.hands.mark(seat, slot);
    let best = 1e9, landed = false, n = 0;
    for (let i = 0; i < 60 * 4; i++) {
      step(r); const tk = r.props.tokenAt(seat); if (!tk || tk.t < 1) continue; landed = true; n++;
      const pts = handVerts(r, seat); if (!pts) continue;
      const g = r.props.group || r.parent; const mn = [tk.x - TK.W, tk.y - TK.T / 2, tk.z - TK.H], mx = [tk.x + TK.W, tk.y + TK.T / 2, tk.z + TK.H];
      best = Math.min(best, gap3(pts, mn, mx));
    }
    out.push({ seat, slot, gap3: landed ? +best.toFixed(4) : null });
  }
  r.hands.dispose(); r.props.dispose(); return out;
}
/** 進場首幀：手第一個可見幀，看得見的頂點（袖口邊以前）落在托盤布面矩形（平面 |x|≤hw、|z−tz|≤hd）內的個數與最大入布深度（公尺）。
 *  0＝首幀整隻手都在布面外（從托盤外緣進場）；北席全放寬原本首幀在盤中（頂點數 >0）。 */
export async function measureEntry({ layout = 'L', seats = [0, 1, 2, 3], slots = [0, 1, 2, 3] } = {}) {
  const r = await rig(layout), out = [], T = M.HAND.TRAY[layout], tz = r.props.trayZ();
  for (const seat of seats) for (const slot of slots) {
    r.props.clearRound(); r.hands.clear(); for (let i = 0; i < 12; i++) step(r);
    r.props.mark(seat, slot); r.hands.mark(seat, slot);
    let row = null;
    for (let i = 0; i < 60 * 4 && !row; i++) {
      step(r); const pts = handVerts(r, seat); if (!pts) continue; // 手第一個可見的幀（不等令牌 t≥1：手上場的時機由手導演自己決定）
      let inside = 0, deep = 0;
      for (const p of pts) { const dx = T.hw - Math.abs(p[0]), dz = T.hd - Math.abs(p[2] - tz); if (dx > 0 && dz > 0) { inside++; deep = Math.max(deep, Math.min(dx, dz)); } }
      row = { seat, slot, inside, total: pts.length, deep: +deep.toFixed(4), frame: i };
    }
    out.push(row || { seat, slot, inside: null });
  }
  r.hands.dispose(); r.props.dispose(); return out;
}
/** 兩隻手（看得見的蒙皮頂點，每 STRIDE 個取 1）之間的最小頂點距離（公尺）：AABB 相交是粗篩，這個才是「手真的碰到手」。 */
const STRIDE = 6;
const handMin = (r, a, b) => { const A = handVerts(r, a), B = handVerts(r, b); if (!A || !B) return null; let m = 1e9;
  for (let i = 0; i < A.length; i += STRIDE) for (let j = 0; j < B.length; j += STRIDE) { const dx = A[i][0] - B[j][0], dy = A[i][1] - B[j][1], dz = A[i][2] - B[j][2], d = dx * dx + dy * dy + dz * dz; if (d < m) m = d; }
  return Math.sqrt(m); };
/** 拍令牌全程（進場→接觸→收手）逐幀「看得見的蒙皮頂點」單幀位移（公尺，同一頂點相鄰兩幀的距離最大值）。
 *  entryMax＝手第一個可見幀起 ENTRY_FRAMES 幀內（進場滑行）；afterMax＝其後（停留＋收手）。覆審 F1：收手一轉成 retract 就換界線時，手單幀瞬移 0.4–0.9 m（基準 5c91bdc7 最大 0.13 m）。 */
export async function measureJump({ layout = 'L', seats = [0, 1, 2, 3], slots = [0, 1, 2, 3], entryFrames = 26 } = {}) {
  const r = await rig(layout), out = [];
  for (const seat of seats) for (const slot of slots) {
    r.props.clearRound(); r.hands.clear(); for (let i = 0; i < 12; i++) step(r);
    r.props.mark(seat, slot); r.hands.mark(seat, slot);
    let prev = null, first = null, entryMax = 0, afterMax = 0, afterAt = -1, vis = 0;
    for (let i = 0; i < 60 * 4; i++) {
      step(r); const pts = handVerts(r, seat);
      if (!pts) { prev = null; continue; }
      if (first === null) first = i; vis++;
      if (prev && prev.length === pts.length) {
        let m = 0; for (let k = 0; k < pts.length; k += 3) m = Math.max(m, Math.hypot(pts[k][0] - prev[k][0], pts[k][1] - prev[k][1], pts[k][2] - prev[k][2]));
        if (i - first < entryFrames) entryMax = Math.max(entryMax, m); else if (m > afterMax) { afterMax = m; afterAt = i - first; }
      }
      prev = pts;
    }
    out.push({ seat, slot, entryMax: +entryMax.toFixed(4), afterMax: +afterMax.toFixed(4), afterAt, visFrames: vis });
  }
  r.hands.dispose(); r.props.dispose(); return out;
}
const boxHit = (a, b) => a.mn[0] < b.mx[0] && a.mx[0] > b.mn[0] && a.mn[1] < b.mx[1] && a.mx[1] > b.mn[1] && a.mn[2] < b.mx[2] && a.mx[2] > b.mn[2];
export async function measureCollisions({ layout = 'L' } = {}) {
  const r = await rig(layout);
  /* 令牌拍下接觸窗口（修訂1，同 hands-occlusion）：該席令牌落地起 0.66 秒（寫死）。hhOut＝兩隻手都不在窗口內的手×手 AABB 相交幀數（窗口外，門檻原值）。 */
  let land = {}, n = 0; const WIN = Math.ceil(0.66 * 60); // 寫死 0.66 s（覆審 F3：不從受測實作的 ENTRY_MAX 讀入）；node 版手速倍率＝1
  const inWin = (s) => land[s] !== undefined && n >= land[s] && n <= land[s] + WIN; let hh = 0, hhOut = 0, hhMesh = 0, hhMin = 1e9, ho = 0, live = 0, ph = 'bid', sh = 0; const where = {}, detail = {};
  for (let shift = 0; shift < 4; shift++) {
    sh = shift; ph = 'bid';
    r.props.clearRound(); r.hands.clear(); land = {}; n = 0;
    for (let s = 0; s < 4; s++) { r.props.bid(s, (s + shift) % 4, 4); r.hands.bid(s, (s + shift) % 4, 4); }
    const phase = (k) => { for (let i = 0; i < k; i++) { step(r); n++; for (let q = 0; q < 4; q++) { const tk = r.props.tokenAt(q); if (tk && tk.t >= 1 && land[q] === undefined) land[q] = n; } check(); } };
    const check = () => {
      const bx = [0, 1, 2, 3].map((s) => handBox(r, s)); live += bx.filter(Boolean).length;
      for (let a = 0; a < 4; a++) { if (!bx[a]) continue;
        for (let b = a + 1; b < 4; b++) if (bx[b] && boxHit(bx[a], bx[b])) { hh++; if (!inWin(a) && !inWin(b)) hhOut++; { const dm = handMin(r, a, b); if (dm !== null) { hhMin = Math.min(hhMin, dm); if (dm < 0.01) hhMesh++; } } where[`hh${a}${b}`] = (where[`hh${a}${b}`] || 0) + 1; const k = `s${sh}-${ph}-hh${a}${b}`; detail[k] = (detail[k] || 0) + 1; }
        const own = (a + shift) % 4;
        for (const o of r.props.handObstacles()) {
          const isTok = o.hx !== undefined; if (isTok) { /* 令牌：別席的令牌（同槽或別槽都算別人的東西） */ }
          const ob = isTok ? { mn: [o.x - o.hx, (o.bottom ?? 0), o.z - o.hz], mx: [o.x + o.hx, o.top, o.z + o.hz] } : { mn: [o.x - o.r, 0, o.z - o.r], mx: [o.x + o.r, o.top, o.z + o.r] };
          if (!isTok && Math.abs(0) > 1) continue;
          // 自己的錢柱（自己席位同槽）不算：由距離排除——手推自己的錢柱必然貼著它
          const st = r.props.stackAt(a, own); if (!isTok && st && Math.abs(st.x - o.x) < 1e-6 && Math.abs(st.z - o.z) < 1e-6) continue;
          const tkA = r.props.tokenAt(a); if (isTok && tkA && Math.abs(tkA.x - o.x) < 1e-6 && Math.abs(tkA.z - o.z) < 1e-6) continue;
          if (boxHit(bx[a], ob)) { ho++; where[`ho${a}`] = (where[`ho${a}`] || 0) + 1; }
        }
      }
    };
    phase(200); ph = 'mark';
    for (let s = 0; s < 4; s++) { r.props.mark(s, (s + shift) % 4); r.hands.mark(s, (s + shift) % 4); }
    phase(240);
  }
  r.hands.dispose(); r.props.dispose(); return { handHand: hh, handHandOutWindow: hhOut, handHandMesh: hhMesh, handHandMinDist: +hhMin.toFixed(4), handObstacle: ho, liveHandFrames: live, where, detail };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const layout = arg('layout') || 'L';
  const slam = await measureSlam({ layout }), entry = await measureEntry({ layout }), jump = await measureJump({ layout }), col = await measureCollisions({ layout });
  console.log('slam gap3(m) 席×槽'); for (const s of [0, 1, 2, 3]) console.log(NAME[s], slam.filter((x) => x.seat === s).map((x) => (x.gap3 ?? 'NA').toString().padStart(7)).join(' '));
  console.log('進場首幀在托盤布面內的頂點數（席×槽）'); for (const s of [0, 1, 2, 3]) console.log(NAME[s], entry.filter((x) => x.seat === s).map((x) => (x.inside ?? 'NA').toString().padStart(7)).join(' '));
  console.log('單幀頂點位移 (進場內最大｜其後最大，m)'); for (const s of [0, 1, 2, 3]) console.log(NAME[s], jump.filter((x) => x.seat === s).map((x) => `${x.entryMax.toFixed(2)}|${x.afterMax.toFixed(2)}`.padStart(11)).join(' '));
  console.log('collisions', JSON.stringify({ ...col, detail: undefined })); if (process.env.DETAIL) console.log(JSON.stringify(col.detail));
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ slam, entry, jump, col }, null, 1));
  process.exit(0);
}
